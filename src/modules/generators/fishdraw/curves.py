# Curve utilities for fish drawing
# Ported from fishdraw.js

import math
from typing import List, Tuple, Callable, Optional

from .geometry import Point, Polyline, dist, pt_seg_dist, lerp2d


def resample(polyline: Polyline, step: float) -> Polyline:
    """
    Resample polyline to have points at regular intervals.
    Uses circle-line intersection for accurate placement.
    """
    if len(polyline) < 2:
        return list(polyline)

    out = [polyline[0]]
    carry = 0.0
    i = 0

    while i < len(polyline) - 1:
        a = polyline[i]
        b = polyline[i + 1]
        d = dist(a, b)

        if d < 1e-10:
            i += 1
            continue

        # Distance available in this segment
        available = d - carry

        if available < step:
            # Move to next segment, carrying the remaining distance
            carry += d
            i += 1
            continue

        # Find point at (step - carry) distance from last output
        last = out[-1]
        remaining = step

        # Walk along segment
        while True:
            seg_dist = dist(last, b)
            if seg_dist < 1e-10:
                break

            if remaining <= seg_dist:
                # Point is on this segment
                t = remaining / seg_dist
                new_pt = lerp2d(last, b, t)
                out.append(new_pt)
                last = new_pt
                remaining = step
            else:
                # Need to continue to next segment
                break

        carry = dist(out[-1], b)
        i += 1

    # Add final point if different from last
    if dist(out[-1], polyline[-1]) > step * 0.1:
        out.append(polyline[-1])

    return out


def approx_poly_dp(polyline: Polyline, epsilon: float) -> Polyline:
    """
    Ramer-Douglas-Peucker polyline simplification.
    Reduces points while maintaining shape within epsilon tolerance.
    """
    if len(polyline) <= 2:
        return list(polyline)

    # Find the point with maximum distance from the line
    dmax = 0.0
    argmax = 0
    for i in range(1, len(polyline) - 1):
        d = pt_seg_dist(polyline[i], polyline[0], polyline[-1])
        if d > dmax:
            dmax = d
            argmax = i

    # If max distance is greater than epsilon, recursively simplify
    if dmax > epsilon:
        # Recursive simplification
        left = approx_poly_dp(polyline[:argmax + 1], epsilon)
        right = approx_poly_dp(polyline[argmax:], epsilon)
        # Concatenate results (avoiding duplicate point)
        return left[:-1] + right
    else:
        # Just return endpoints
        return [polyline[0], polyline[-1]]


def smooth_polyline(polyline: Polyline, iterations: int = 1) -> Polyline:
    """Apply Chaikin corner cutting smoothing."""
    result = list(polyline)

    for _ in range(iterations):
        if len(result) < 3:
            break

        new_result = [result[0]]
        for i in range(len(result) - 1):
            p0 = result[i]
            p1 = result[i + 1]
            # Insert two points at 1/4 and 3/4 of each segment
            q = lerp2d(p0, p1, 0.25)
            r = lerp2d(p0, p1, 0.75)
            new_result.extend([q, r])
        new_result.append(result[-1])
        result = new_result

    return result


def bezier_point(p0: Point, p1: Point, p2: Point, p3: Point, t: float) -> Point:
    """Calculate point on cubic Bezier curve at parameter t."""
    t2 = t * t
    t3 = t2 * t
    mt = 1 - t
    mt2 = mt * mt
    mt3 = mt2 * mt

    x = mt3 * p0[0] + 3 * mt2 * t * p1[0] + 3 * mt * t2 * p2[0] + t3 * p3[0]
    y = mt3 * p0[1] + 3 * mt2 * t * p1[1] + 3 * mt * t2 * p2[1] + t3 * p3[1]

    return (x, y)


def bezier_curve(p0: Point, p1: Point, p2: Point, p3: Point, segments: int = 20) -> Polyline:
    """Generate polyline approximation of cubic Bezier curve."""
    points = []
    for i in range(segments + 1):
        t = i / segments
        points.append(bezier_point(p0, p1, p2, p3, t))
    return points


def quadratic_bezier_point(p0: Point, p1: Point, p2: Point, t: float) -> Point:
    """Calculate point on quadratic Bezier curve at parameter t."""
    mt = 1 - t
    x = mt * mt * p0[0] + 2 * mt * t * p1[0] + t * t * p2[0]
    y = mt * mt * p0[1] + 2 * mt * t * p1[1] + t * t * p2[1]
    return (x, y)


def catmull_rom_point(p0: Point, p1: Point, p2: Point, p3: Point, t: float) -> Point:
    """Calculate point on Catmull-Rom spline at parameter t."""
    t2 = t * t
    t3 = t2 * t

    x = 0.5 * ((2 * p1[0]) +
               (-p0[0] + p2[0]) * t +
               (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 +
               (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3)

    y = 0.5 * ((2 * p1[1]) +
               (-p0[1] + p2[1]) * t +
               (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 +
               (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3)

    return (x, y)


def catmull_rom_spline(points: Polyline, segments_per_curve: int = 10) -> Polyline:
    """Generate smooth spline through control points using Catmull-Rom."""
    if len(points) < 2:
        return list(points)
    if len(points) == 2:
        return list(points)

    result = []

    # Extend endpoints for tangent calculation
    extended = [points[0]] + list(points) + [points[-1]]

    for i in range(1, len(extended) - 2):
        p0 = extended[i - 1]
        p1 = extended[i]
        p2 = extended[i + 1]
        p3 = extended[i + 2]

        for j in range(segments_per_curve):
            t = j / segments_per_curve
            result.append(catmull_rom_point(p0, p1, p2, p3, t))

    # Add final point
    result.append(points[-1])

    return result


def arc_points(cx: float, cy: float, radius: float,
               start_angle: float, end_angle: float,
               segments: int = 20) -> Polyline:
    """Generate polyline approximation of arc."""
    points = []
    for i in range(segments + 1):
        t = i / segments
        angle = start_angle + t * (end_angle - start_angle)
        x = cx + radius * math.cos(angle)
        y = cy + radius * math.sin(angle)
        points.append((x, y))
    return points


def circle_points(cx: float, cy: float, radius: float, segments: int = 32) -> Polyline:
    """Generate polyline approximation of circle."""
    points = arc_points(cx, cy, radius, 0, 2 * math.pi, segments)
    # Close the circle
    if points:
        points[-1] = points[0]
    return points


def ellipse_points(cx: float, cy: float, rx: float, ry: float,
                   rotation: float = 0, segments: int = 32) -> Polyline:
    """Generate polyline approximation of ellipse."""
    cos_r = math.cos(rotation)
    sin_r = math.sin(rotation)
    points = []
    for i in range(segments):
        angle = 2 * math.pi * i / segments
        x = rx * math.cos(angle)
        y = ry * math.sin(angle)
        # Rotate and translate
        px = cx + x * cos_r - y * sin_r
        py = cy + x * sin_r + y * cos_r
        points.append((px, py))
    points.append(points[0])  # Close
    return points


def subdivide_polyline(polyline: Polyline, max_segment_length: float) -> Polyline:
    """Subdivide polyline so no segment is longer than max_segment_length."""
    if len(polyline) < 2:
        return list(polyline)

    result = [polyline[0]]
    for i in range(len(polyline) - 1):
        p0 = polyline[i]
        p1 = polyline[i + 1]
        d = dist(p0, p1)

        if d > max_segment_length:
            n = int(math.ceil(d / max_segment_length))
            for j in range(1, n):
                t = j / n
                result.append(lerp2d(p0, p1, t))

        result.append(p1)

    return result


def jitter_polyline(polyline: Polyline, amount: float,
                    rand_func: Callable[[], float]) -> Polyline:
    """Add random jitter to polyline points."""
    return [
        (p[0] + (rand_func() - 0.5) * 2 * amount,
         p[1] + (rand_func() - 0.5) * 2 * amount)
        for p in polyline
    ]


def get_tangent_angle(polyline: Polyline, index: int) -> float:
    """Get tangent angle at a point on the polyline."""
    if len(polyline) < 2:
        return 0

    if index == 0:
        dx = polyline[1][0] - polyline[0][0]
        dy = polyline[1][1] - polyline[0][1]
    elif index >= len(polyline) - 1:
        dx = polyline[-1][0] - polyline[-2][0]
        dy = polyline[-1][1] - polyline[-2][1]
    else:
        dx = polyline[index + 1][0] - polyline[index - 1][0]
        dy = polyline[index + 1][1] - polyline[index - 1][1]

    return math.atan2(dy, dx)


def get_normal_angle(polyline: Polyline, index: int) -> float:
    """Get normal angle (perpendicular to tangent) at a point."""
    return get_tangent_angle(polyline, index) + math.pi / 2
