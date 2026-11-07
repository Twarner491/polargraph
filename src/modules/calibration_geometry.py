"""Pure measured-geometry calculations; never talks to a controller or saves settings.

Coordinate convention: X right, Y up, reference marker at (0, 0). The published
cover datums are versioned: rear seam (legacy) and the exposed top seam of
the drafted wall. Both use nominal CAD offsets; printed/installed parts still have
tolerances. Homing counts describe increasing *gondola-side* belt length on this
build. A capture must end at the final switch touch, before automatic return.
"""
import math
from collections.abc import Mapping


class CalibrationError(ValueError):
    """Input or measurement design cannot support the requested calibration."""


CAD_COVER_OFFSET_MM = 28.5  # Legacy rear seam; existing profiles keep this datum.
CAD_TOP_SEAM_OFFSET_MM = 29.67014888431
COVER_DATUMS = {
    'standard-cover-rear-seam-v1': CAD_COVER_OFFSET_MM,
    'standard-cover-top-seam-v2': CAD_TOP_SEAM_OFFSET_MM,
}
FIT_PARAMETERS = (
    'motor_spacing', 'anchor_y', 'home_belt_left', 'home_belt_right',
    'steps_per_mm_left', 'steps_per_mm_right',
)


def _number(value, name, lower=-20000.0, upper=20000.0):
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        raise CalibrationError(f'{name} must be a finite number in millimeters or stated units')
    result = float(value)
    if not math.isfinite(result) or not lower <= result <= upper:
        raise CalibrationError(f'{name} must be finite and between {lower:g} and {upper:g}')
    return result


def _count(value, name, minimum=0):
    result = _number(value, name, minimum, 100_000_000)
    if result != int(result):
        raise CalibrationError(f'{name} must be a whole number of steps')
    return int(result)


def derive_setup_geometry(outside_cover_span_mm, datum_height_mm, *,
                          left_offset_mm=CAD_COVER_OFFSET_MM,
                          right_offset_mm=CAD_COVER_OFFSET_MM,
                          top_offset_mm=CAD_COVER_OFFSET_MM, datum_profile='rear-straight-cover-seam'):
    """Derive anchors from measured width/height of the datum rectangle.

Height is measured from the selected cover datum to the selected bottom datum;
place the physical reference marker at the midpoint of THIS rectangle. This is
not a paper-bounds inference. H and marker placement cannot come from homing.
Asymmetric offsets are supported without moving the rectangle's reference.
"""
    width = _number(outside_cover_span_mm, 'outside_cover_span_mm', 100, 10000)
    height = _number(datum_height_mm, 'datum_height_mm', 100, 10000)
    lo = _number(left_offset_mm, 'left_offset_mm', 0, 500)
    ro = _number(right_offset_mm, 'right_offset_mm', 0, 500)
    top = _number(top_offset_mm, 'top_offset_mm', 0, 500)
    left, right = -width / 2 + lo, width / 2 - ro
    spacing, anchor_y = right - left, height / 2 - top
    if spacing < 100 or not left < 0 < right or anchor_y <= 0:
        raise CalibrationError('Datum offsets leave no feasible anchors above the reference marker')
    return {
        'motor_spacing': spacing, 'anchor_y': anchor_y,
        'anchor_left_x': left, 'anchor_right_x': right,
        'anchor_center_x': (left + right) / 2,
        'reference_x': 0.0, 'reference_y': 0.0, 'datum_bottom': -height / 2,
        'outside_cover_span_mm': width, 'datum_height_mm': height,
        'left_offset_mm': lo, 'right_offset_mm': ro, 'top_offset_mm': top,
        'datum_profile': datum_profile,
        'verified': False,
    }


def _anchors(geometry):
    if not isinstance(geometry, Mapping):
        raise CalibrationError('geometry must be an object')
    spacing = _number(geometry.get('motor_spacing'), 'motor_spacing', 100, 10000)
    center = _number(geometry.get('anchor_center_x', 0), 'anchor_center_x')
    anchor_y = _number(geometry.get('anchor_y'), 'anchor_y', 0.001, 10000)
    left, right = center - spacing / 2, center + spacing / 2
    for key, expected in (('anchor_left_x', left), ('anchor_right_x', right)):
        if key in geometry and not math.isclose(_number(geometry[key], key), expected, abs_tol=1e-7):
            raise CalibrationError(f'{key} conflicts with motor spacing and anchor center')
    return left, right, anchor_y


def belt_lengths(geometry, x, y):
    """Ideal effective belt lengths at a measured point below level anchors."""
    left, right, top = _anchors(geometry)
    x, y = _number(x, 'x'), _number(y, 'y')
    if y >= top:
        raise CalibrationError('Reference/target must be below the motor anchor line')
    return math.hypot(x - left, top - y), math.hypot(x - right, top - y)


def cartesian_from_belts(geometry, left_length, right_length):
    """Lower circle intersection; rejects impossible or singular belt lengths."""
    left, right, top = _anchors(geometry)
    ll = _number(left_length, 'left_length', 0.001, 20000)
    rr = _number(right_length, 'right_length', 0.001, 20000)
    width = right - left
    if not abs(ll - rr) < width < ll + rr:
        raise CalibrationError('Belt lengths do not form a nondegenerate triangle with the anchors')
    dx = (ll * ll - rr * rr + width * width) / (2 * width)
    yy = ll * ll - dx * dx
    if yy <= 0:
        raise CalibrationError('Belt geometry is singular at the anchor line')
    return left + dx, top - math.sqrt(yy)


def infer_home_belts(geometry, captures, *, steps_per_mm_left=100.0,
                     steps_per_mm_right=100.0, reference_x=0.0, reference_y=0.0):
    """Infer effective final-switch lengths from a known physical reference.

Required capture keys: first_left/right, retouch_left/right, backoff_left/right.
The net outward steps are first - backoff + retouch for EACH side. No default
backoff count is assumed, and no completion or repeatability is inferred here.
The caller must have a completed bounded capture with actual counters, no slip,
and no auto-return before capturing the final switch reference.
"""
    if not isinstance(captures, Mapping):
        raise CalibrationError('captures must contain both complete seek stages and backoff counts')
    net = {}
    for side in ('left', 'right'):
        first = _count(captures.get(f'first_{side}'), f'first_{side}')
        back = _count(captures.get(f'backoff_{side}'), f'backoff_{side}', 1)
        touch = _count(captures.get(f'retouch_{side}'), f'retouch_{side}', 1)
        net[side] = first - back + touch
    return infer_home_belts_from_net(
        geometry, net['left'], net['right'], steps_per_mm_left=steps_per_mm_left,
        steps_per_mm_right=steps_per_mm_right, reference_x=reference_x,
        reference_y=reference_y)


def infer_home_belts_from_net(geometry, left_steps, right_steps, *,
                              steps_per_mm_left=100.0, steps_per_mm_right=100.0,
                              reference_x=0.0, reference_y=0.0):
    """Use completed HOME_REFERENCE net counts from bounded G28 R0 capture.

    This build's positive counts lengthen the gondola-side belt. Firmware
    capability/version and terminal completion must be checked by the caller.
    The pure calculation does not assert machine completion or physical accuracy.
    """
    sl = _number(steps_per_mm_left, 'steps_per_mm_left', 0.1, 100000)
    sr = _number(steps_per_mm_right, 'steps_per_mm_right', 0.1, 100000)
    nl = _count(left_steps, 'left_steps', 1)
    nr = _count(right_steps, 'right_steps', 1)
    ll, rr = belt_lengths(geometry, reference_x, reference_y)
    hl = _number(ll + nl / sl, 'home_belt_left', 0.001, 20000)
    hr = _number(rr + nr / sr, 'home_belt_right', 0.001, 20000)
    switch_x, switch_y = cartesian_from_belts(geometry, hl, hr)
    return {
        'home_belt_left': hl, 'home_belt_right': hr,
        'net_steps_left': nl, 'net_steps_right': nr,
        'steps_per_mm_left': sl, 'steps_per_mm_right': sr,
        'reference_x': float(reference_x), 'reference_y': float(reference_y),
        'switch_x': switch_x, 'switch_y': switch_y, 'verified': False,
    }


def _samples(samples, name):
    if not isinstance(samples, (list, tuple)):
        raise CalibrationError(f'{name} must be a list of measured positions and signed step counts')
    result = []
    for i, sample in enumerate(samples):
        if not isinstance(sample, Mapping):
            raise CalibrationError(f'{name}[{i}] must be an object')
        result.append(tuple(_number(sample.get(key), f'{name}[{i}].{key}',
                                    -100_000_000 if 'steps' in key else -20000,
                                    100_000_000 if 'steps' in key else 20000)
                            for key in ('x', 'y', 'left_steps', 'right_steps')))
    return result


def firmware_persisted_geometry(profile):
    """Project a candidate through AVR float32 parsing and EEPROM hundredths.

    Axis limits are serialized independently. This is a prediction for evaluating
    a candidate, never a substitute for actual M501/controller readback.
    """
    import numpy as np
    def stored(value):
        number = np.float32(float(f'{value:.4f}'))
        return float(np.float32(math.trunc(float(np.float32(number * np.float32(100)))) / 100))
    result = dict(profile)
    center = profile.get('anchor_center_x', 0)
    left = stored(center - profile['motor_spacing'] / 2)
    right = stored(center + profile['motor_spacing'] / 2)
    result.update(motor_spacing=right-left, anchor_center_x=(left+right)/2,
                  anchor_y=stored(profile['anchor_y']))
    for key in ('home_belt_left', 'home_belt_right', 'steps_per_mm_left', 'steps_per_mm_right'):
        result[key] = stored(profile[key])
    return result


def fit_geometry(samples, initial, fit_parameters=None, validation_samples=None, *,
                 max_error_mm=1.0, max_condition=10000.0):
    """Fit effective geometry to independently measured XY and actual step counts.

Each sample is {x, y, left_steps, right_steps}. Steps are signed relative to the
SAME final switch reference: positive lengthens the gondola-side belt. Firmware
commanded XY, model-derived steps, or repeated switch contacts are not independent
measurements. The caller must establish provenance; this pure function cannot.

Default fits spacing, anchor height, and both effective home offsets. Each belt
scale may be fitted only when explicitly requested and the normalized Jacobian
has full rank and acceptable conditioning. Coordinate origin and anchor center
are fixed. Bounds restrict changes to 15% spacing, 20% scales, and 150 mm offsets;
large corrections require a fresh measured setup. Held-out samples are mandatory
for accepted=True. This returns a CANDIDATE, never an applied/verified profile.
"""
    import numpy as np
    from scipy.optimize import least_squares

    if not isinstance(initial, Mapping):
        raise CalibrationError('initial must be a measured geometry profile')
    _anchors(initial)
    fit_parameters = tuple(FIT_PARAMETERS[:4] if fit_parameters is None else fit_parameters)
    if not fit_parameters or len(set(fit_parameters)) != len(fit_parameters) or any(
            p not in FIT_PARAMETERS for p in fit_parameters):
        raise CalibrationError('fit_parameters must contain unique supported parameter names')
    tolerance = _number(max_error_mm, 'max_error_mm', 0.01, 10)
    condition_limit = _number(max_condition, 'max_condition', 1, 1000000)
    base = {p: _number(initial.get(p), p, 0.1 if 'steps_per_mm' in p else 0.001,
                       100000 if 'steps_per_mm' in p else 20000) for p in FIT_PARAMETERS}
    train = _samples(samples, 'samples')
    holdout = _samples([] if validation_samples is None else validation_samples, 'validation_samples')
    n = len(fit_parameters)
    if len(train) < max(4, n) or 2 * len(train) <= n:
        raise CalibrationError('Insufficient independent measured positions for requested parameters')
    if len({(s[0], s[1]) for s in train}) < max(4, n):
        raise CalibrationError('Repeated target positions do not add geometric observability')
    if len({s[:2] for s in holdout}) != len(holdout):
        raise CalibrationError('Validation targets must be distinct physical positions')
    if any(s[:2] in {t[:2] for t in train} for s in holdout):
        raise CalibrationError('Validation targets must be separate from fitting targets')
    center = float(initial.get('anchor_center_x', 0))
    # The reference frame must be held fixed: do not fit XY origin/rotation too.
    def profile(values):
        p = dict(base)
        p.update(zip(fit_parameters, values))
        p['anchor_center_x'] = center
        return p

    x0, lower, upper = [], [], []
    for key in fit_parameters:
        value = base[key]
        change = value * (0.2 if 'steps_per_mm' in key else 0.15) if key == 'motor_spacing' or 'steps_per_mm' in key else 150
        floor = 100 if key == 'motor_spacing' else (0.1 if 'steps_per_mm' in key else 0.001)
        x0.append(value)
        lower.append(max(floor, value - change))
        upper.append(value + change)
    # Reject above-anchor data against all candidate heights, not just the seed.
    min_top = lower[fit_parameters.index('anchor_y')] if 'anchor_y' in fit_parameters else base['anchor_y']
    if any(s[1] >= min_top for s in train + holdout):
        raise CalibrationError('Targets must remain below the anchor line throughout the fit bounds')

    def residual(values):
        p = profile(values)
        left, right = center - p['motor_spacing'] / 2, center + p['motor_spacing'] / 2
        out = []
        for x, y, ls, rs in train:
            out.extend((math.hypot(x - left, p['anchor_y'] - y) - p['home_belt_left'] - ls / p['steps_per_mm_left'],
                        math.hypot(x - right, p['anchor_y'] - y) - p['home_belt_right'] - rs / p['steps_per_mm_right']))
        return np.array(out)

    fit = least_squares(residual, x0, bounds=(lower, upper), x_scale='jac',
                        loss='soft_l1', f_scale=tolerance / 2, max_nfev=3000,
                        ftol=1e-12, xtol=1e-12, gtol=1e-12)
    candidate = profile(fit.x)
    # Evaluate the unweighted physical Jacobian; robust-loss weights must not
    # obscure missing geometric information or make units dominate conditioning.
    jac = np.empty((2 * len(train), n))
    for j, value in enumerate(fit.x):
        step = max(1e-5, abs(value) * 1e-6)
        hi, lo = fit.x.copy(), fit.x.copy()
        hi[j] += step
        lo[j] -= step
        jac[:, j] = (residual(hi) - residual(lo)) / (2 * step)
    norms = np.linalg.norm(jac, axis=0)
    normalized = jac / np.where(norms > 0, norms, 1)
    singular = np.linalg.svd(normalized, compute_uv=False)
    rank = int(np.sum(singular > singular[0] * 1e-8))
    condition = float(singular[0] / singular[-1]) if singular[-1] > 0 else math.inf
    if rank != n or not math.isfinite(condition) or condition > condition_limit:
        raise CalibrationError('Measurement layout cannot reliably identify requested parameters; fix more parameters or measure a wider region')

    def errors(dataset, model=None):
        model = candidate if model is None else model
        rows = []
        for x, y, ls, rs in dataset:
            ll = model['home_belt_left'] + ls / model['steps_per_mm_left']
            rr = model['home_belt_right'] + rs / model['steps_per_mm_right']
            px, py = cartesian_from_belts(model, ll, rr)
            rows.append({'x': x, 'y': y, 'dx_mm': px - x, 'dy_mm': py - y,
                         'error_mm': math.hypot(px - x, py - y)})
        return {'samples': rows, 'count': len(rows),
                'rms_mm': math.sqrt(sum(r['error_mm'] ** 2 for r in rows) / len(rows)) if rows else None,
                'max_mm': max((r['error_mm'] for r in rows), default=None)}
    training, validation = errors(train), errors(holdout)
    reasons = []
    if not fit.success:
        reasons.append('Solver did not converge')
    if any(abs(v - lo) < (hi - lo) * 1e-4 or abs(hi - v) < (hi - lo) * 1e-4
           for v, lo, hi in zip(fit.x, lower, upper)):
        reasons.append('Fit reached a parameter bound; recheck physical setup')
    if training['max_mm'] > tolerance:
        reasons.append('Fitting targets exceed the requested Cartesian error tolerance')
    if len(holdout) < 2:
        reasons.append('At least two independent held-out targets are required')
    elif validation['max_mm'] > tolerance:
        reasons.append('Independent validation exceeds the requested Cartesian error tolerance')
    persisted = firmware_persisted_geometry(candidate)
    persisted_training, persisted_validation = errors(train, persisted), errors(holdout, persisted)
    if persisted_training['max_mm'] > tolerance or (persisted_validation['max_mm'] is not None and persisted_validation['max_mm'] > tolerance):
        reasons.append('Predicted EEPROM precision exceeds the Cartesian error tolerance')
    return {'baseline': errors(train + holdout, dict(base, anchor_center_x=center)),
            'candidate': candidate, 'persisted_candidate': persisted,
            'persisted_training': persisted_training, 'persisted_validation': persisted_validation,
            'fit_parameters': list(fit_parameters),
            'accepted': not reasons, 'verified': False, 'reasons': reasons,
            'jacobian_rank': rank, 'normalized_condition': condition,
            'training': training, 'validation': validation, 'max_error_mm': tolerance,
            'tested_region': {'left': min(s[0] for s in train + holdout),
                              'right': max(s[0] for s in train + holdout),
                              'bottom': min(s[1] for s in train + holdout),
                              'top': max(s[1] for s in train + holdout)}}
