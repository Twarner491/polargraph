"""Measured setup and device verification. Never infer geometry from an assumed pose."""

import copy
import math
import re
import threading
import uuid
from contextlib import nullcontext
from datetime import datetime, timezone

from .calibration_geometry import derive_setup_geometry, infer_home_belts_from_net, cartesian_from_belts, COVER_DATUMS


class CalibrationSession:
    def __init__(self, serial, settings, plotting=lambda: False):
        self.serial = serial
        self.settings = settings
        self.plotting = plotting
        self._lock = threading.Lock()
        self._cancelled = threading.Event()
        pending = copy.deepcopy(settings.get('calibration_pending'))
        self._state = {'running': False, 'stage': 'interrupted' if pending else 'idle',
                       'error': 'Previous setup was interrupted. Align the reference and start again.' if pending else None,
                       'result': None, 'requires_restart': bool(pending),
                       'session_id': None}

    @property
    def blocks_motion(self):
        # Do not infer readiness from whether a worker thread currently runs.
        # The human confirmation window still owns the machine reference.
        with self._lock:
            return bool(self._state['running'] or self._state['stage'] not in ('idle', 'saved')
                        or self.settings.get('calibration_pending'))

    def _exclusive_serial(self):
        # SerialHandler's RLock also excludes competing raw/query operations for
        # this entire transaction. App route guards enforce persistent blocking.
        return getattr(self.serial, '_operation_lock', nullcontext())

    def _save(self):
        if self.settings.save() is not True:
            raise RuntimeError('Settings persistence was not confirmed; setup remains pending.')

    def _fail(self, exc):
        with self._lock:
            self._state.update(stage='failed', error=str(exc), requires_restart=True)


    def status(self):
        with self._lock:
            state = copy.deepcopy(self._state)
            state['blocks_motion'] = bool(state['running'] or state['stage'] not in ('idle', 'saved')
                                          or self.settings.get('calibration_pending'))
            return state

    @staticmethod
    def preview(data):
        if not isinstance(data, dict):
            raise ValueError('Setup measurements must be an object.')
        if any(key in data for key in ('left_offset_mm', 'right_offset_mm', 'top_offset_mm', 'anchor_center_x')):
            raise ValueError('This setup uses the selected standard cover datum; custom offsets are not supported.')
        # Older clients described the rear seam. Never reinterpret their inputs
        # using the newer top-seam offset without an explicit datum version.
        datum = data.get('datum', 'standard-cover-rear-seam-v1')
        if not isinstance(datum, str) or datum not in COVER_DATUMS:
            raise ValueError('Unknown cover measurement datum. Refresh Setup wizard.')
        offset = COVER_DATUMS[datum]
        geometry = derive_setup_geometry(data.get('outside_cover_span_mm'), data.get('datum_height_mm'),
            left_offset_mm=offset, right_offset_mm=offset, top_offset_mm=offset,
            datum_profile=datum)
        return {'geometry': geometry, 'measurements': {
            'outside_cover_span_mm': float(data['outside_cover_span_mm']),
            'datum_height_mm': float(data['datum_height_mm']),
        }, 'datum': datum, 'verified': False}

    def _stage(self, stage):
        with self._lock:
            self._state['stage'] = stage

    def start_reference(self, data):
        proposal = self.preview(data)
        if data.get('reference_aligned') is not True:
            raise ValueError('Align the pen axis with the measured center mark first.')
        if data.get('paths_clear') is not True:
            raise ValueError('Confirm the pen is removed and both counterweight paths are clear.')
        with self._lock:
            if self._state['running'] or self.plotting():
                raise ValueError('The machine is busy.')
            if not self.serial.is_connected():
                raise ValueError('Connect to the controller first.')
            self._cancelled.clear()
            self._state = {'running': True, 'stage': 'checking', 'error': None, 'result': None,
                           'requires_restart': False, 'session_id': uuid.uuid4().hex}
        try:
            threading.Thread(target=self._run_reference, args=(proposal,), daemon=True).start()
        except Exception as exc:
            self._fail(exc)
            with self._lock:
                self._state['running'] = False
            raise
        return self.status()

    def cancel(self):
        self._cancelled.set()
        if self.blocks_motion:
            self._fail(RuntimeError('Setup interrupted. Power off, realign the reference, and restart setup.'))

    def _check_cancelled(self):
        if self._cancelled.is_set():
            raise RuntimeError('Setup was interrupted; no further setup commands will be sent.')

    def _command(self, command, timeout=10):
        self._check_cancelled()
        if not self.serial.send_streaming(command, timeout=timeout):
            reason = getattr(self.serial, 'last_error', None) or f'No acknowledgement within {timeout:g} seconds.'
            raise RuntimeError(f'Controller did not confirm acceptance of {command}: {reason}')

    def _barrier(self, timeout=15, *, recovery=False):
        options = {"allow_reference_recovery": True} if recovery else {}
        if not self.serial.wait_until_idle(timeout=timeout, **options):
            raise RuntimeError('Controller did not confirm that motion finished. Position is unverified.')

    def _query(self, command, prefix):
        reply = self.serial.query(command, prefix, timeout=5)
        if reply is None:
            raise RuntimeError(f'No verified reply to {command}.')
        return reply

    def _require_protocol(self, *, recovery=False):
        reply = self._query('M100', 'CALIBRATION_PROTOCOL ')
        if reply.strip() != 'CALIBRATION_PROTOCOL 1':
            raise RuntimeError('Install calibration protocol 1 firmware before running setup.')
        self._barrier(recovery=recovery)

    @staticmethod
    def _numbers(reply, letters):
        values = []
        for letter in letters:
            match = re.search(rf'(?:^|\s){letter}(-?\d+(?:\.\d+)?)(?=\s|$)', reply)
            if not match:
                raise RuntimeError(f'Invalid controller reply: {reply}')
            value = float(match[1])
            if not math.isfinite(value):
                raise RuntimeError('Non-finite controller geometry.')
            values.append(value)
        return values

    def _read_geometry(self):
        steps = self._numbers(self._query('M92', 'M92 '), 'XY')
        belts = self._numbers(self._query('D7', 'D7 '), 'LR')
        raw = self._query('M101', 'M101 ')
        match = re.fullmatch(r'M101 \(([^)]+)\) - \(([^)]+)\)', raw.strip())
        if not match:
            raise RuntimeError(f'Invalid axis geometry reply: {raw}')
        low, high = ([float(x) for x in part.split(',')] for part in match.groups())
        if len(low) != 3 or len(high) != 3 or not all(math.isfinite(x) for x in low + high):
            raise RuntimeError('Invalid axis limits.')
        return {'steps': steps, 'belts': belts, 'low': low, 'high': high}

    @staticmethod
    def switch_position(spacing, anchor_y, left, right):
        return cartesian_from_belts({'motor_spacing': spacing, 'anchor_y': anchor_y}, left, right)

    @staticmethod
    def proposed_area(geometry, left, right):
        """Provisional inner rectangle, not discovered clearance or measured paper.

        Shrink a candidate until its corners fit within declared frame and belt
        limits. If a 30 mm belt reserve is impossible even at the reference,
        return None: geometry setup remains useful, but area needs manual review.
        """
        spacing, anchor = geometry['motor_spacing'], geometry['anchor_y']
        half_width = max(1.0, min(spacing * .4, spacing / 2 - 40))
        top = max(1.0, anchor - max(30, min(180, spacing * .25)))
        top = min(top, anchor * .8)
        bottom = min(-1.0, geometry['datum_bottom'] + min(100, abs(geometry['datum_bottom']) * .2))
        for _ in range(40):
            points = [(x, y) for x in (-half_width, half_width) for y in (bottom, top)]
            if all(math.hypot(x + spacing / 2, anchor - y) <= left - 30
                   and math.hypot(x - spacing / 2, anchor - y) <= right - 30 for x, y in points):
                if half_width < 10 or top - bottom < 20:
                    return None
                return {'left': -half_width, 'right': half_width, 'bottom': bottom, 'top': top}
            half_width *= .85
            top *= .85
            bottom *= .85
        return None

    def _switches_open(self):
        reply = self._query('M119', 'M119')
        if not re.search(r'\bL:open\b', reply) or not re.search(r'\bR:open\b', reply):
            raise RuntimeError('Both switches must be released at the reference marker.')
        return reply

    def _verify_return(self):
        self._barrier(timeout=90)
        position = self._numbers(self._query('M114', 'M114 '), 'XY')
        if any(abs(p) > .05 for p in position):
            raise RuntimeError('Controller did not return to the reference coordinates.')
        self._switches_open()

    @staticmethod
    def _geometry_matches(actual, expected):
        return all(abs(a - b) <= .03 for key in ('steps', 'belts', 'low', 'high')
                   for a, b in zip(actual[key], expected[key]))

    def _run_reference(self, proposal):
        try:
            with self._exclusive_serial():
                self._capture_reference(proposal)
        except Exception as exc:
            self._fail(exc)
        finally:
            with self._lock:
                self._state['running'] = False

    def _capture_reference(self, proposal):
        self._require_protocol(recovery=True)
        before = self._read_geometry()
        # A standard build uses a 200-step motor, 16x microsteps and a 16T GT2 pulley.
        if any(abs(spu - 100) > .01 for spu in before['steps']):
            raise RuntimeError('This setup profile requires 100 steps/mm on both motors.')
        self._switches_open()
        # Record loss of localization BEFORE enabling or moving anything.
        # A restart after the first homing step must never expose normal jog.
        pending = {**proposal, 'previous_controller': before,
                   'session_id': self._state['session_id'], 'stage': 'reference_capture',
                   'physical_clearance_verified': False, 'accuracy_verified': False}
        self.settings.set('calibration_pending', pending)
        self.settings.set('calibrated', False)
        self._save()
        self._stage('homing')
        self._command('M17')
        self._command('G1 F1200 A200')
        self._barrier(recovery=True)
        reference = self.serial.send_capture('G28 R0', 'HOME_REFERENCE ',
                                              'HOME_REFERENCE ', timeout=150)
        self._check_cancelled()
        if reference is None:
            reason = getattr(self.serial, 'last_error', None) or 'No completion reply was received.'
            raise RuntimeError(f'Homing did not finish: {reason} Reference was not captured.')
        if not re.fullmatch(r'HOME_REFERENCE L[0-9]+ R[0-9]+', reference.strip()):
            raise RuntimeError('Malformed or incomplete homing reference reply.')
        net_left, net_right = self._numbers(reference, 'LR')
        if any(n != int(n) or n < 0 for n in (net_left, net_right)):
            raise RuntimeError('Invalid homing step counts.')
        geometry = proposal['geometry']
        belts = infer_home_belts_from_net(geometry, int(net_left), int(net_right))
        left, right = belts['home_belt_left'], belts['home_belt_right']
        x, y = self.switch_position(geometry['motor_spacing'], geometry['anchor_y'], left, right)
        area = self.proposed_area(geometry, left, right)
        candidate = {**proposal, 'home_belt_left': left, 'home_belt_right': right,
                     'home_counts': {'left': int(net_left), 'right': int(net_right)},
                     'work_area': area, 'previous_controller': before,
                     'physical_clearance_verified': False, 'accuracy_verified': False,
                     'work_area_provisional': True, 'session_id': self._state['session_id'],
                     'work_area_note': 'Proposed from frame and belt geometry; paper placement and mechanical clearances still require verification.'}
        # M101 persists limits immediately on this firmware. Record the transition
        # before issuing it, so an interrupted setup cannot appear calibrated.
        self.settings.set('calibration_pending', candidate)
        self.settings.set('calibrated', False)
        self._save()
        self._stage('applying')
        half = geometry['motor_spacing'] / 2
        self._command(f'M101 A0 T{half:.4f} B{-half:.4f}')
        self._command(f'M101 A1 T{geometry["anchor_y"]:.4f} B{geometry["datum_bottom"]:.4f}')
        self._command(f'D7 L{left:.4f} R{right:.4f}')
        self._command('G90')
        self._command(f'G92 X{x:.4f} Y{y:.4f}')
        self._barrier()
        readback = self._read_geometry()
        wanted = [100, 100, left, right, -half, half, geometry['anchor_y'], geometry['datum_bottom']]
        actual = [*readback['steps'], *readback['belts'], readback['low'][0], readback['high'][0],
                  readback['high'][1], readback['low'][1]]
        if any(abs(a - b) > .03 for a, b in zip(actual, wanted)):
            raise RuntimeError('Controller geometry did not match the measured setup.')
        self._stage('returning')
        self._command('G90')
        # bufferLine blocks while feeding a long path through the finite planner
        # queue; firmware emits OK only after all segments have been queued.
        self._command('G0 X0 Y0 F1200 A200', timeout=90)
        self._verify_return()
        candidate['controller_readback'] = readback
        candidate['return_reported'] = True
        self.settings.set('calibration_pending', candidate)
        self._save()
        with self._lock:
            self._state.update(stage='confirm_reference', result=candidate)

    def finish(self, data):
        if not isinstance(data, dict) or data.get('returned_to_mark') is not True:
            raise ValueError('Verify that the pen axis returned to the physical center mark.')
        with self._lock:
            if self._state['running'] or self._state['stage'] != 'confirm_reference' or self.plotting():
                raise ValueError('Complete a reference capture first.')
            if not self.serial.is_connected():
                raise ValueError('Reconnect and repeat setup after connection loss.')
            candidate = copy.deepcopy(self._state['result'])
            self._state.update(running=True, stage='saving')
        try:
            with self._exclusive_serial():
                self._check_cancelled()
                self._require_protocol()
                self._verify_return()
                current = self._read_geometry()
                if not self._geometry_matches(current, candidate['controller_readback']):
                    raise RuntimeError('Controller geometry changed after setup. Repeat the reference capture.')
                self._command('M500')
                self._command('D9')
                self._barrier()
                self._command('M501')
                self._barrier()
                after = self._read_geometry()
                if not self._geometry_matches(after, candidate['controller_readback']):
                    raise RuntimeError('Controller readback changed during persistence. Setup remains pending.')
                # M501 verifies EEPROM reload (including its fixed-point rounding),
                # not a full power cycle; keep reboot evidence distinct.
                candidate.update(reference_verified=True, controller_readback_verified=True,
                                 eeprom_readback_verified=True, persisted_controller_readback=after,
                                 reboot_persistence_verified=False, accuracy_verified=False,
                                 physical_clearance_verified=False)
                geometry = candidate['geometry']
                values = {'motor_spacing': after['high'][0] - after['low'][0], 'motor_y': after['high'][1],
                          'home_belt_left': after['belts'][0], 'home_belt_right': after['belts'][1],
                          'calibration_pending': None, 'calibrated': True,
                          'calibration_date': datetime.now(timezone.utc).isoformat(),
                          'calibration_profile': candidate}
                # No area is also a valid geometry result: preserve previous paper
                # settings until the operator explicitly supplies usable bounds.
                if candidate['work_area'] is not None:
                    values.update({'limit_' + side: value for side, value in candidate['work_area'].items()})
                previous = copy.deepcopy(self.settings.get_all())
                self.settings.update(values)
                try:
                    self._save()
                except Exception:
                    self.settings.update(previous)
                    self.settings.set('calibration_pending', candidate)
                    self.settings.set('calibrated', False)
                    # Prior durable pending snapshot remains authoritative. A
                    # failed disk save must not expose success in memory either.
                    raise
                with self._lock:
                    self._state.update(stage='saved', result=copy.deepcopy(candidate), requires_restart=False)
                return copy.deepcopy(candidate)
        except Exception as exc:
            self._fail(exc)
            raise
        finally:
            with self._lock:
                self._state['running'] = False
