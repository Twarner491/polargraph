#!/usr/bin/env python3
"""Setup and accuracy guide drawings from the STEP-verified print meshes.

One drawing per wizard step. No captions: the interface writes the real
measured values into the elements marked data-dim. Only illustration assets
are written. No controller access. Uses the same source-coordinate meshes and
versioned top-seam datums as verify_cover_datums.py.
"""
import json
import hashlib
import re
import cairosvg
from shapely.geometry import Polygon
from shapely.ops import unary_union
from render_measurement_guides import (
    LEFT, RIGHT, SHAFT, AXIS_Y, DATUM_BOTTOM, silhouette, shape_path, OUT, ARCHIVE, dk,
)

# STEP planar-wall end, independently checked by verify_cover_datums.py.
OFFSET = 29.67014888431
EDGE = SHAFT + OFFSET
TOP = AXIS_Y + OFFSET
MARK_Y = (TOP + DATUM_BOTTOM) / 2          # center mark: W/2 across, H/2 down
LIMITS = (-420.5, 420.5, 594.5, -594.5)    # default drawing bounds (plotter_settings.py)
SPREAD = .65                               # accuracy points, calibration.js prepareAccuracy

INK = '#%02x%02x%02x' % tuple(dk.INK[:3])
shapes = {side: silhouette(v, f) for side, (v, f) in [('left', LEFT), ('right', RIGHT)]}

# Opacity ladder from the house style: structure, secondary, frame, leader, construction.
A_INK, A_SECOND, A_FRAME, A_LEADER, A_MESH = 1, .5, .43, .24, .13
SCALE = .30
p = lambda xy: (265 + xy[0] * SCALE, 316 - (xy[1] - MARK_Y) * SCALE)


def line(a, b, opacity=A_INK, width=1.5, dashed=False):
    dash = ' stroke-dasharray="4 6"' if dashed else ''
    return f'<path d="M{a[0]:.2f},{a[1]:.2f} L{b[0]:.2f},{b[1]:.2f}" stroke-opacity="{opacity}" stroke-width="{width}"{dash}/>'


def text(xy, words, size=24, anchor='middle', opacity=A_INK, dim=None):
    bind = f' data-dim="{dim}"' if dim else ''
    return (f'<text x="{xy[0]:.2f}" y="{xy[1]:.2f}" fill="{INK}" stroke="none" font-size="{size}" '
            f'text-anchor="{anchor}" fill-opacity="{opacity}"{bind}>{words}</text>')


def dot(xy, r=3.5, hollow=False):
    fill = 'white' if hollow else INK
    return f'<circle cx="{xy[0]:.2f}" cy="{xy[1]:.2f}" r="{r}" fill="{fill}" stroke-width="1.5"/>'


def cross(xy, size=9, opacity=A_INK):
    x, y = xy
    return line((x - size, y), (x + size, y), opacity) + line((x, y - size), (x, y + size), opacity)


def arrowhead(tip, direction, size=9, opacity=A_INK):
    (x, y), (dx, dy) = tip, direction
    a = (x - dx * size - dy * size * .45, y - dy * size + dx * size * .45)
    b = (x - dx * size + dy * size * .45, y - dy * size - dx * size * .45)
    return f'<path d="M{x:.2f},{y:.2f} L{a[0]:.2f},{a[1]:.2f} L{b[0]:.2f},{b[1]:.2f} Z" fill="{INK}" fill-opacity="{opacity}" stroke="none"/>'


def dimension(a, b, label_xy, placeholder, dim, anchor='middle'):
    return line(a, b, width=1.6) + dot(a) + dot(b) + text(label_xy, placeholder, 30, anchor, dim=dim)


def cover(side, project):
    poly = shapes[side]
    parts = [g for g in (poly.geoms if hasattr(poly, 'geoms') else [poly]) if g.area > 4]
    clean = unary_union([Polygon(g.exterior, [r for r in g.interiors if Polygon(r).area > 4]) for g in parts])
    return f'<path d="{shape_path(clean, project)}" stroke-opacity="{A_SECOND}" stroke-width="1.2"/>'


def board():
    s = ''
    for x, y, w, h in [(-623, -775.4, 1246, 1550.8), (-597.6, -750, 1195.2, 1500)]:
        a = p((x, y + h))
        s += f'<rect x="{a[0]:.2f}" y="{a[1]:.2f}" width="{w * SCALE:.2f}" height="{h * SCALE:.2f}" stroke-opacity="{A_FRAME * .5 if w > 1200 else A_FRAME}"/>'
    for side, x in [('left', -SHAFT), ('right', SHAFT)]:
        ax, ay = p((x, AXIS_Y))
        s += cover(side, lambda q, ax=ax, ay=ay, x=x: (ax + (q[0] - x) * SCALE, ay - (q[1] - AXIS_Y) * SCALE))
    return s


def magnifier(source, center, radius, clip_id, body):
    """Faint source ring, leader, and a clipped enlarged view."""
    (sx, sy), (cx, cy) = source, center
    d = ((cx - sx) ** 2 + (cy - sy) ** 2) ** .5
    ux, uy = (cx - sx) / d, (cy - sy) / d
    return (f'<circle cx="{sx:.2f}" cy="{sy:.2f}" r="16" stroke-opacity="{A_LEADER}"/>'
            + f'<circle cx="{cx}" cy="{cy}" r="{radius}" fill="white" stroke="none"/>'
            + line((sx + ux * 16, sy + uy * 16), (cx - ux * radius, cy - uy * radius), A_LEADER, 1)
            + f'<clipPath id="{clip_id}"><circle cx="{cx}" cy="{cy}" r="{radius}"/></clipPath>'
            + f'<g clip-path="url(#{clip_id})">{body}</g>'
            + f'<circle cx="{cx}" cy="{cy}" r="{radius}" stroke-opacity="{A_FRAME}"/>')


def width():
    left, right = p((-EDGE, AXIS_Y + 12)), p((EDGE, AXIS_Y + 12))
    y = 52
    s = board() + line(left, (left[0], y - 8), A_LEADER, 1) + line(right, (right[0], y - 8), A_LEADER, 1)
    s += dimension((left[0], y), (right[0], y), (265, y - 16), 'W', 'w')
    # Enlarged left cover: the tape hooks the outer edge, above the switch bulge.
    cx, cy, k, r = 265, 290, 2.3, 110
    q = lambda v: (cx + 25 + (v[0] + SHAFT) * k, cy - (v[1] - AXIS_Y + 8) * k)
    seam_a, seam_b, hook = q((-EDGE, AXIS_Y + 1)), q((-EDGE, AXIS_Y + 24)), q((-EDGE, AXIS_Y + 12))
    body = (cover('left', q) + line(seam_a, seam_b, width=3)
            + line((cx - r, hook[1]), hook, width=1.6) + dot(hook, 4))
    return s + magnifier(left, (cx, cy), r, 'g-width', body)


def height():
    top, bottom = p((SHAFT, TOP)), p((SHAFT, DATUM_BOTTOM))
    x = 490
    s = board() + line(top, (x + 8, top[1]), A_LEADER, 1) + line(bottom, (x + 8, bottom[1]), A_LEADER, 1)
    s += dimension((x, top[1]), (x, bottom[1]), (x + 16, (top[1] + bottom[1]) / 2 + 9), 'H', 'h', 'start')
    # Enlarged bottom rail: the tape ends on its inner top edge, not the paper or the outer frame.
    cx, cy, k, r = 290, 420, 3, 95
    edge = cy + 12
    rail = (f'<rect x="{cx - r}" y="{edge:.2f}" width="{2 * r}" height="{25.4 * k:.2f}" '
            f'fill="{INK}" fill-opacity=".05" stroke-opacity="{A_FRAME}"/>')
    end = (cx + 30, edge)
    body = rail + line((end[0], cy - r), end, width=1.6) + dot(end, 4)
    return s + magnifier(bottom, (cx, cy), r, 'g-height', body)


def pen_hole(xy):
    return cross(xy, 14) + f'<circle cx="{xy[0]:.2f}" cy="{xy[1]:.2f}" r="7" stroke-width="1.4"/>'


def mark():
    origin, seam_left, seam_top = p((0, MARK_Y)), p((-EDGE, MARK_Y)), p((0, TOP))
    s = board()
    s += line(p((-EDGE, AXIS_Y + 12)), seam_left, A_MESH, 1, True)
    s += line(p((-EDGE, TOP)), p((EDGE, TOP)), A_MESH, 1, True)
    s += line(seam_left, (origin[0] - 14, origin[1]), width=1.6) + dot(seam_left)
    s += line(seam_top, (origin[0], origin[1] - 14), width=1.6) + dot(seam_top)
    s += text(((seam_left[0] + origin[0]) / 2, origin[1] - 14), 'W ÷ 2', 30, dim='w2')
    s += text((origin[0] + 14, (seam_top[1] + origin[1]) / 2 + 9), 'H ÷ 2', 30, 'start', dim='h2')
    return s + pen_hole(origin)


def home():
    origin = p((0, MARK_Y))
    s = board()
    for x in (-SHAFT, SHAFT):
        s += line(p((x, AXIS_Y)), origin, A_LEADER, 1)
    low = origin[1] + 150
    s += line((origin[0] - 8, origin[1] + 24), (origin[0] - 8, low), A_SECOND, 1.4) + arrowhead((origin[0] - 8, low), (0, 1), 9, A_SECOND)
    s += line((origin[0] + 8, low), (origin[0] + 8, origin[1] + 26), width=1.4) + arrowhead((origin[0] + 8, origin[1] + 24), (0, -1))
    s += text((origin[0], low + 30), 'home', 24, opacity=A_SECOND)
    return s + pen_hole(origin)


def accuracy():
    left, right, top, bottom = (v * SPREAD for v in LIMITS)
    points = [(left, top), (0, top), (right, top), (right, 0), (right, bottom), (0, bottom), (left, bottom), (left, 0)]
    validation = {3, 7}
    origin = p((0, MARK_Y))
    s = board()
    s += line(p((-EDGE + 40, MARK_Y)), p((EDGE - 40, MARK_Y)), A_MESH, 1, True)
    s += line(p((0, TOP - 40)), p((0, DATUM_BOTTOM + 40)), A_MESH, 1, True)
    s += arrowhead(p((EDGE - 40, MARK_Y)), (1, 0), 8, A_SECOND) + text(p((EDGE - 40, MARK_Y - 80)), '+x', 24, 'end', A_SECOND)
    s += arrowhead(p((0, TOP - 40)), (0, -1), 8, A_SECOND) + text(p((22, TOP - 70)), '+y', 24, 'start', A_SECOND)
    s += cross(origin, 12)
    for i, (x, y) in enumerate(points):
        c = p((x, MARK_Y + y))
        s += (f'<g data-point="{i}"><circle class="guide-ring" cx="{c[0]:.2f}" cy="{c[1]:.2f}" r="12" '
              f'stroke-width="1.2" opacity="0"/>' + dot(c, 5, i in validation) + '</g>')
    # Measure square from the center mark, X then Y, never the diagonal. Offset like drafting dimensions.
    target = p((right, MARK_Y + top))
    yx, xy = origin[1] + 30, target[0] + 30
    s += line(origin, (origin[0], yx + 6), A_LEADER, 1) + line(target, (xy + 6, target[1]), A_LEADER, 1)
    s += line((target[0], origin[1] + 8), (target[0], yx + 6), A_LEADER, 1) + line((target[0] + 8, origin[1]), (xy + 6, origin[1]), A_LEADER, 1)
    s += line((origin[0], yx), (target[0], yx), width=1.6) + arrowhead((target[0], yx), (1, 0), 8) + arrowhead((origin[0], yx), (-1, 0), 8)
    s += line((xy, origin[1]), (xy, target[1]), width=1.6) + arrowhead((xy, target[1]), (0, -1), 8) + arrowhead((xy, origin[1]), (0, 1), 8)
    s += text(((origin[0] + target[0]) / 2, yx + 28), 'X', 30, dim='x')
    s += text((xy + 12, (origin[1] + target[1]) / 2 + 9), 'Y', 30, 'start', dim='y')
    return s


LABELS = {
    'width': 'Measure W, outside to outside, at the top edges of both motor covers.',
    'height': 'Measure H, from the top of a motor cover down to the inner top edge of the bottom rail.',
    'mark': 'Mark the center: W ÷ 2 from the left cover, H ÷ 2 below the top of the covers.',
    'home': 'The machine homes, then returns to the center mark.',
    'accuracy': 'Eight measurement points. Measure X and Y from the center mark, square to the frame.',
}
DRAWINGS = {'width': width, 'height': height, 'mark': mark, 'home': home, 'accuracy': accuracy}


def svg(kind):
    body = DRAWINGS[kind]()
    # Same frame and scale for every step, so the machine never shifts between steps.
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="-75 0 680 580" role="img" '
            f'aria-label="{LABELS[kind]}"><g fill="none" stroke="{INK}" stroke-linecap="round" '
            f'stroke-linejoin="round" font-family="Palatino, \'Palatino Linotype\', Georgia, serif">{body}</g></svg>')


def fill(out, values):
    """Replace placeholder dimension text, as the interface does at runtime."""
    return re.sub(r'(data-dim="(\w+)">)[^<]*', lambda m: m.group(1) + values.get(m.group(2), ''), out) if values else out


# Teddy's tape readings (docs/calibration/teddy-measurements-20261010.json).
EXAMPLES = {'width': {'w': '44 in'}, 'height': {'h': '57 in'}, 'mark': {'w2': '22 in', 'h2': '28.5 in'}}


if __name__ == '__main__':
    figures = OUT.parents[2] / 'docs/calibration/figures'
    figures.mkdir(exist_ok=True)
    for kind in DRAWINGS:
        out = svg(kind)
        (OUT / f'guide-{kind}.svg').write_text(out)
        example = fill(out, EXAMPLES.get(kind, {})) if kind in EXAMPLES else out
        cairosvg.svg2png(bytestring=example.encode(), write_to=str(figures / f'guide-{kind}.png'),
                         output_height=1200, background_color='white')
    (OUT / 'guide-provenance.json').write_text(json.dumps({
        'version': 3, 'source_mesh': str(ARCHIVE.name),
        'sha256': hashlib.sha256(ARCHIVE.read_bytes()).hexdigest(),
        'datum_offset_mm': OFFSET, 'datum': 'standard-cover-top-seam-v2',
        'projection': 'orthographic XY, uniform scale',
        'note': 'Nominal CAD proportions. Dimension text is filled in by the interface.',
    }, indent=2) + '\n')
