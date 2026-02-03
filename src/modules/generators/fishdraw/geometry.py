# Geometry utilities for fish drawing
# Ported from fishdraw.js

import math
from typing import List, Tuple, Optional, Dict, Any

Point = Tuple[float, float]
Polyline = List[Point]


def dist(p0: Point, p1: Point) -> float:
    """Calculate distance between two points."""
    return math.sqrt((p1[0] - p0[0]) ** 2 + (p1[1] - p0[1]) ** 2)


def lerp(a: float, b: float, t: float) -> float:
    """Linear interpolation between a and b."""
    return a + (b - a) * t


def lerp2d(p0: Point, p1: Point, t: float) -> Point:
    """Linear interpolation between two points."""
    return (lerp(p0[0], p1[0], t), lerp(p0[1], p1[1], t))


def get_bbox(points: Polyline) -> Tuple[float, float, float, float]:
    """Get bounding box of points: (min_x, min_y, max_x, max_y)."""
    if not points:
        return (0, 0, 0, 0)
    xs = [p[0] for p in points]
    ys = [p[1] for p in points]
    return (min(xs), min(ys), max(xs), max(ys))


def pt_seg_dist(p: Point, a: Point, b: Point) -> float:
    """Calculate distance from point p to line segment ab."""
    px, py = p
    ax, ay = a
    bx, by = b

    dx = bx - ax
    dy = by - ay
    d2 = dx * dx + dy * dy

    if d2 == 0:
        return dist(p, a)

    t = max(0, min(1, ((px - ax) * dx + (py - ay) * dy) / d2))
    proj_x = ax + t * dx
    proj_y = ay + t * dy

    return dist(p, (proj_x, proj_y))


def seg_isect(
    p0x: float, p0y: float, p1x: float, p1y: float,
    q0x: float, q0y: float, q1x: float, q1y: float,
    is_ray: bool = False
) -> Optional[Dict[str, Any]]:
    """
    Calculate intersection between two line segments.
    Returns None if no intersection, otherwise dict with t, s, xy, side.
    """
    d0x = p1x - p0x
    d0y = p1y - p0y
    d1x = q1x - q0x
    d1y = q1y - q0y

    vc = d0x * d1y - d0y * d1x
    if abs(vc) < 1e-10:
        return None

    vcr = 1.0 / vc
    q0x_p0x = q0x - p0x
    q0y_p0y = q0y - p0y

    t = (q0x_p0x * d1y - q0y_p0y * d1x) * vcr
    s = (q0x_p0x * d0y - q0y_p0y * d0x) * vcr

    eps = 1e-10
    if t >= -eps and (is_ray or t < 1 + eps) and s >= -eps and s < 1 + eps:
        return {
            't': t,
            's': s,
            'xy': (p0x + t * d0x, p0y + t * d0y),
            'side': 1 if vc > 0 else -1
        }
    return None


def seg_isect_poly(
    p0x: float, p0y: float, p1x: float, p1y: float,
    polygon: Polyline,
    is_ray: bool = False
) -> List[Dict[str, Any]]:
    """Find all intersections between a segment and a polygon."""
    isects = []
    for i in range(len(polygon)):
        j = (i + 1) % len(polygon)
        q0x, q0y = polygon[i]
        q1x, q1y = polygon[j]
        isect = seg_isect(p0x, p0y, p1x, p1y, q0x, q0y, q1x, q1y, is_ray)
        if isect:
            isect['i'] = i
            isects.append(isect)
    isects.sort(key=lambda x: x['t'])
    return isects


def pt_in_poly(p: Point, polygon: Polyline) -> bool:
    """Test if point is inside polygon using ray casting."""
    x, y = p
    inside = False
    n = len(polygon)
    j = n - 1
    for i in range(n):
        xi, yi = polygon[i]
        xj, yj = polygon[j]
        if ((yi > y) != (yj > y)) and (x < (xj - xi) * (y - yi) / (yj - yi) + xi):
            inside = not inside
        j = i
    return inside


def clip(polyline: Polyline, polygon: Polyline) -> Dict[str, List[Polyline]]:
    """
    Clip a polyline against a polygon.
    Returns dict with 'true' (inside) and 'false' (outside) polyline lists.
    """
    if len(polyline) < 2:
        return {'true': [], 'false': []}

    # Determine if first point is inside
    first_inside = pt_in_poly(polyline[0], polygon)
    out = {'true': [[]], 'false': [[]]}
    io = first_inside

    for i in range(len(polyline) - 1):
        p0 = polyline[i]
        p1 = polyline[i + 1]

        isects = seg_isect_poly(p0[0], p0[1], p1[0], p1[1], polygon, False)

        out[str(io).lower()][len(out[str(io).lower()]) - 1].append(p0)

        for isect in isects:
            out[str(io).lower()][len(out[str(io).lower()]) - 1].append(isect['xy'])
            io = not io
            out[str(io).lower()].append([isect['xy']])

    # Add last point
    out[str(io).lower()][len(out[str(io).lower()]) - 1].append(polyline[-1])

    # Clean up empty polylines
    out['true'] = [p for p in out['true'] if len(p) >= 2]
    out['false'] = [p for p in out['false'] if len(p) >= 2]

    return out


def clip_multi(polylines: List[Polyline], polygon: Polyline) -> Dict[str, List[Polyline]]:
    """Clip multiple polylines against a polygon."""
    result = {'true': [], 'false': []}
    for polyline in polylines:
        clipped = clip(polyline, polygon)
        result['true'].extend(clipped['true'])
        result['false'].extend(clipped['false'])
    return result


def trsl_poly(polygon: Polyline, dx: float, dy: float) -> Polyline:
    """Translate polygon by (dx, dy)."""
    return [(p[0] + dx, p[1] + dy) for p in polygon]


def scale_poly(polygon: Polyline, sx: float, sy: Optional[float] = None) -> Polyline:
    """Scale polygon by (sx, sy). If sy is None, use sx for both."""
    if sy is None:
        sy = sx
    return [(p[0] * sx, p[1] * sy) for p in polygon]


def rotate_poly(polygon: Polyline, angle: float, cx: float = 0, cy: float = 0) -> Polyline:
    """Rotate polygon around (cx, cy) by angle (radians)."""
    cos_a = math.cos(angle)
    sin_a = math.sin(angle)
    result = []
    for p in polygon:
        dx = p[0] - cx
        dy = p[1] - cy
        result.append((
            cx + dx * cos_a - dy * sin_a,
            cy + dx * sin_a + dy * cos_a
        ))
    return result


def poly_area(polygon: Polyline) -> float:
    """Calculate signed area of polygon (positive = CCW)."""
    n = len(polygon)
    if n < 3:
        return 0
    area = 0
    j = n - 1
    for i in range(n):
        area += (polygon[j][0] + polygon[i][0]) * (polygon[j][1] - polygon[i][1])
        j = i
    return area / 2


def poly_centroid(polygon: Polyline) -> Point:
    """Calculate centroid of polygon."""
    n = len(polygon)
    if n == 0:
        return (0, 0)
    if n == 1:
        return polygon[0]
    if n == 2:
        return ((polygon[0][0] + polygon[1][0]) / 2, (polygon[0][1] + polygon[1][1]) / 2)

    cx, cy = 0, 0
    area = 0
    j = n - 1
    for i in range(n):
        x0, y0 = polygon[j]
        x1, y1 = polygon[i]
        cross = x0 * y1 - x1 * y0
        area += cross
        cx += (x0 + x1) * cross
        cy += (y0 + y1) * cross
        j = i

    area *= 3
    if abs(area) < 1e-10:
        return ((polygon[0][0] + polygon[n // 2][0]) / 2,
                (polygon[0][1] + polygon[n // 2][1]) / 2)

    return (cx / area, cy / area)


def offset_polyline(polyline: Polyline, offset: float) -> Polyline:
    """Offset a polyline perpendicular to its direction."""
    if len(polyline) < 2:
        return polyline

    result = []
    for i in range(len(polyline)):
        if i == 0:
            dx = polyline[1][0] - polyline[0][0]
            dy = polyline[1][1] - polyline[0][1]
        elif i == len(polyline) - 1:
            dx = polyline[-1][0] - polyline[-2][0]
            dy = polyline[-1][1] - polyline[-2][1]
        else:
            dx = polyline[i + 1][0] - polyline[i - 1][0]
            dy = polyline[i + 1][1] - polyline[i - 1][1]

        length = math.sqrt(dx * dx + dy * dy)
        if length > 0:
            nx = -dy / length
            ny = dx / length
        else:
            nx, ny = 0, 0

        result.append((polyline[i][0] + nx * offset, polyline[i][1] + ny * offset))

    return result


def polyline_length(polyline: Polyline) -> float:
    """Calculate total length of polyline."""
    length = 0
    for i in range(len(polyline) - 1):
        length += dist(polyline[i], polyline[i + 1])
    return length
