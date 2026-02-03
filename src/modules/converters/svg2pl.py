# SVG to Polylines converter
# Inspired by https://github.com/LingDong-/svg2pl
# Full SVG path parsing with proper curve discretization

import re
import math
import xml.etree.ElementTree as ET
from typing import List, Tuple, Optional, Dict, Any

Polyline = List[Tuple[float, float]]


def _parse_transform(transform_str: str) -> List[Tuple[str, List[float]]]:
    """
    Parse SVG transform attribute into list of transformations.

    Args:
        transform_str: SVG transform string like "translate(10,20) rotate(45)"

    Returns:
        List of (transform_type, [values])
    """
    transforms = []
    if not transform_str:
        return transforms

    # Match transform functions
    pattern = r'(\w+)\s*\(([^)]*)\)'
    for match in re.finditer(pattern, transform_str):
        name = match.group(1)
        values_str = match.group(2)

        # Parse values (comma or space separated)
        values = [float(v) for v in re.split(r'[\s,]+', values_str.strip()) if v]
        transforms.append((name, values))

    return transforms


def _apply_transforms(point: Tuple[float, float],
                      transforms: List[Tuple[str, List[float]]]) -> Tuple[float, float]:
    """Apply list of transforms to a point."""
    x, y = point

    for transform_type, values in transforms:
        if transform_type == 'translate':
            tx = values[0] if len(values) > 0 else 0
            ty = values[1] if len(values) > 1 else 0
            x, y = x + tx, y + ty

        elif transform_type == 'scale':
            sx = values[0] if len(values) > 0 else 1
            sy = values[1] if len(values) > 1 else sx
            x, y = x * sx, y * sy

        elif transform_type == 'rotate':
            angle = math.radians(values[0]) if len(values) > 0 else 0
            cx = values[1] if len(values) > 1 else 0
            cy = values[2] if len(values) > 2 else 0

            # Translate to origin, rotate, translate back
            x, y = x - cx, y - cy
            cos_a, sin_a = math.cos(angle), math.sin(angle)
            x, y = x * cos_a - y * sin_a, x * sin_a + y * cos_a
            x, y = x + cx, y + cy

        elif transform_type == 'matrix':
            if len(values) >= 6:
                a, b, c, d, e, f = values[:6]
                x, y = a * x + c * y + e, b * x + d * y + f

        elif transform_type == 'skewX':
            angle = math.radians(values[0]) if len(values) > 0 else 0
            x = x + y * math.tan(angle)

        elif transform_type == 'skewY':
            angle = math.radians(values[0]) if len(values) > 0 else 0
            y = y + x * math.tan(angle)

    return x, y


def _bezier_point(p0: Tuple[float, float], p1: Tuple[float, float],
                  p2: Tuple[float, float], p3: Tuple[float, float],
                  t: float) -> Tuple[float, float]:
    """Calculate point on cubic Bezier curve at parameter t."""
    mt = 1 - t
    mt2 = mt * mt
    mt3 = mt2 * mt
    t2 = t * t
    t3 = t2 * t

    x = mt3 * p0[0] + 3 * mt2 * t * p1[0] + 3 * mt * t2 * p2[0] + t3 * p3[0]
    y = mt3 * p0[1] + 3 * mt2 * t * p1[1] + 3 * mt * t2 * p2[1] + t3 * p3[1]

    return x, y


def _quad_bezier_point(p0: Tuple[float, float], p1: Tuple[float, float],
                       p2: Tuple[float, float], t: float) -> Tuple[float, float]:
    """Calculate point on quadratic Bezier curve at parameter t."""
    mt = 1 - t
    x = mt * mt * p0[0] + 2 * mt * t * p1[0] + t * t * p2[0]
    y = mt * mt * p0[1] + 2 * mt * t * p1[1] + t * t * p2[1]
    return x, y


def _arc_to_bezier(x1: float, y1: float, rx: float, ry: float,
                   phi: float, large_arc: bool, sweep: bool,
                   x2: float, y2: float) -> List[Tuple[float, float]]:
    """
    Convert SVG arc to polyline by approximation.

    Args:
        x1, y1: Start point
        rx, ry: Radii
        phi: X-axis rotation (degrees)
        large_arc: Large arc flag
        sweep: Sweep flag
        x2, y2: End point

    Returns:
        List of points approximating the arc
    """
    # Handle degenerate cases
    if rx == 0 or ry == 0:
        return [(x2, y2)]

    rx, ry = abs(rx), abs(ry)
    phi_rad = math.radians(phi)
    cos_phi = math.cos(phi_rad)
    sin_phi = math.sin(phi_rad)

    # Step 1: Compute (x1', y1')
    dx = (x1 - x2) / 2
    dy = (y1 - y2) / 2
    x1p = cos_phi * dx + sin_phi * dy
    y1p = -sin_phi * dx + cos_phi * dy

    # Correct radii if needed
    lambda_sq = (x1p * x1p) / (rx * rx) + (y1p * y1p) / (ry * ry)
    if lambda_sq > 1:
        lambda_val = math.sqrt(lambda_sq)
        rx *= lambda_val
        ry *= lambda_val

    # Step 2: Compute (cx', cy')
    sq = ((rx * rx * ry * ry) - (rx * rx * y1p * y1p) - (ry * ry * x1p * x1p))
    sq /= ((rx * rx * y1p * y1p) + (ry * ry * x1p * x1p))

    if sq < 0:
        sq = 0

    coef = math.sqrt(sq)
    if large_arc == sweep:
        coef = -coef

    cxp = coef * rx * y1p / ry
    cyp = -coef * ry * x1p / rx

    # Step 3: Compute (cx, cy)
    cx = cos_phi * cxp - sin_phi * cyp + (x1 + x2) / 2
    cy = sin_phi * cxp + cos_phi * cyp + (y1 + y2) / 2

    # Step 4: Compute angles
    def angle(ux, uy, vx, vy):
        n = math.sqrt(ux * ux + uy * uy) * math.sqrt(vx * vx + vy * vy)
        if n == 0:
            return 0
        c = (ux * vx + uy * vy) / n
        c = max(-1, min(1, c))
        a = math.acos(c)
        if ux * vy - uy * vx < 0:
            a = -a
        return a

    theta1 = angle(1, 0, (x1p - cxp) / rx, (y1p - cyp) / ry)
    dtheta = angle((x1p - cxp) / rx, (y1p - cyp) / ry,
                   (-x1p - cxp) / rx, (-y1p - cyp) / ry)

    if not sweep and dtheta > 0:
        dtheta -= 2 * math.pi
    elif sweep and dtheta < 0:
        dtheta += 2 * math.pi

    # Generate points
    num_segments = max(1, int(abs(dtheta) / (math.pi / 8)))
    points = []

    for i in range(num_segments + 1):
        t = i / num_segments
        theta = theta1 + t * dtheta

        # Point on unit circle
        px = math.cos(theta)
        py = math.sin(theta)

        # Scale by radii
        px *= rx
        py *= ry

        # Rotate by phi
        x = cos_phi * px - sin_phi * py + cx
        y = sin_phi * px + cos_phi * py + cy

        points.append((x, y))

    return points


def _parse_path_d(d: str) -> List[Polyline]:
    """
    Parse SVG path 'd' attribute into polylines.

    Supports: M, L, H, V, C, S, Q, T, A, Z (and lowercase variants)

    Args:
        d: SVG path data string

    Returns:
        List of polylines
    """
    if not d:
        return []

    polylines = []
    current_path = []

    # Current position
    cx, cy = 0.0, 0.0
    # Start of current subpath (for Z command)
    sx, sy = 0.0, 0.0
    # Previous control point (for S and T commands)
    prev_ctrl = None

    # Tokenize: split on commands while keeping them
    tokens = re.findall(r'[MmZzLlHhVvCcSsQqTtAa]|[-+]?(?:\d*\.\d+|\d+)(?:[eE][-+]?\d+)?', d)

    i = 0
    current_cmd = None
    cmd_is_relative = False

    def get_num():
        nonlocal i
        if i < len(tokens):
            val = float(tokens[i])
            i += 1
            return val
        return 0.0

    while i < len(tokens):
        token = tokens[i]

        # Check if it's a command
        if token in 'MmZzLlHhVvCcSsQqTtAa':
            current_cmd = token.upper()
            cmd_is_relative = token.islower()
            i += 1
        elif current_cmd is None:
            i += 1
            continue

        # Process command
        if current_cmd == 'M':  # Move to
            x = get_num()
            y = get_num()
            if cmd_is_relative:
                x, y = cx + x, cy + y

            # Start new path
            if current_path:
                polylines.append(current_path)
            current_path = [(x, y)]
            cx, cy = x, y
            sx, sy = x, y
            prev_ctrl = None
            # Subsequent coordinates are treated as line-to
            current_cmd = 'L'

        elif current_cmd == 'L':  # Line to
            x = get_num()
            y = get_num()
            if cmd_is_relative:
                x, y = cx + x, cy + y
            current_path.append((x, y))
            cx, cy = x, y
            prev_ctrl = None

        elif current_cmd == 'H':  # Horizontal line
            x = get_num()
            if cmd_is_relative:
                x = cx + x
            current_path.append((x, cy))
            cx = x
            prev_ctrl = None

        elif current_cmd == 'V':  # Vertical line
            y = get_num()
            if cmd_is_relative:
                y = cy + y
            current_path.append((cx, y))
            cy = y
            prev_ctrl = None

        elif current_cmd == 'C':  # Cubic Bezier
            x1, y1 = get_num(), get_num()
            x2, y2 = get_num(), get_num()
            x, y = get_num(), get_num()

            if cmd_is_relative:
                x1, y1 = cx + x1, cy + y1
                x2, y2 = cx + x2, cy + y2
                x, y = cx + x, cy + y

            # Discretize Bezier curve
            segments = 10
            for j in range(1, segments + 1):
                t = j / segments
                pt = _bezier_point((cx, cy), (x1, y1), (x2, y2), (x, y), t)
                current_path.append(pt)

            prev_ctrl = (x2, y2)
            cx, cy = x, y

        elif current_cmd == 'S':  # Smooth cubic Bezier
            x2, y2 = get_num(), get_num()
            x, y = get_num(), get_num()

            if cmd_is_relative:
                x2, y2 = cx + x2, cy + y2
                x, y = cx + x, cy + y

            # First control point is reflection of previous
            if prev_ctrl:
                x1 = 2 * cx - prev_ctrl[0]
                y1 = 2 * cy - prev_ctrl[1]
            else:
                x1, y1 = cx, cy

            segments = 10
            for j in range(1, segments + 1):
                t = j / segments
                pt = _bezier_point((cx, cy), (x1, y1), (x2, y2), (x, y), t)
                current_path.append(pt)

            prev_ctrl = (x2, y2)
            cx, cy = x, y

        elif current_cmd == 'Q':  # Quadratic Bezier
            x1, y1 = get_num(), get_num()
            x, y = get_num(), get_num()

            if cmd_is_relative:
                x1, y1 = cx + x1, cy + y1
                x, y = cx + x, cy + y

            segments = 10
            for j in range(1, segments + 1):
                t = j / segments
                pt = _quad_bezier_point((cx, cy), (x1, y1), (x, y), t)
                current_path.append(pt)

            prev_ctrl = (x1, y1)
            cx, cy = x, y

        elif current_cmd == 'T':  # Smooth quadratic Bezier
            x, y = get_num(), get_num()

            if cmd_is_relative:
                x, y = cx + x, cy + y

            # Control point is reflection of previous
            if prev_ctrl:
                x1 = 2 * cx - prev_ctrl[0]
                y1 = 2 * cy - prev_ctrl[1]
            else:
                x1, y1 = cx, cy

            segments = 10
            for j in range(1, segments + 1):
                t = j / segments
                pt = _quad_bezier_point((cx, cy), (x1, y1), (x, y), t)
                current_path.append(pt)

            prev_ctrl = (x1, y1)
            cx, cy = x, y

        elif current_cmd == 'A':  # Arc
            rx = get_num()
            ry = get_num()
            phi = get_num()
            large_arc = int(get_num()) != 0
            sweep = int(get_num()) != 0
            x, y = get_num(), get_num()

            if cmd_is_relative:
                x, y = cx + x, cy + y

            arc_points = _arc_to_bezier(cx, cy, rx, ry, phi, large_arc, sweep, x, y)
            current_path.extend(arc_points)

            cx, cy = x, y
            prev_ctrl = None

        elif current_cmd == 'Z':  # Close path
            if current_path and (cx != sx or cy != sy):
                current_path.append((sx, sy))
            cx, cy = sx, sy
            prev_ctrl = None

        else:
            # Unknown command, skip
            i += 1

    # Add final path
    if current_path and len(current_path) >= 2:
        polylines.append(current_path)

    return polylines


def _parse_element(elem: ET.Element, transforms: List[Tuple[str, List[float]]],
                   viewbox_scale: Tuple[float, float, float, float]) -> List[Polyline]:
    """
    Parse a single SVG element into polylines.

    Args:
        elem: XML element
        transforms: Accumulated transforms from parent elements
        viewbox_scale: (scale_x, scale_y, offset_x, offset_y) from viewBox

    Returns:
        List of polylines
    """
    polylines = []

    # Get element's transform
    elem_transform = _parse_transform(elem.get('transform', ''))
    all_transforms = transforms + elem_transform

    # Get tag without namespace
    tag = elem.tag.split('}')[-1].lower()

    if tag == 'path':
        d = elem.get('d', '')
        paths = _parse_path_d(d)
        for path in paths:
            transformed = [_apply_transforms(pt, all_transforms) for pt in path]
            polylines.append(transformed)

    elif tag == 'line':
        x1 = float(elem.get('x1', 0))
        y1 = float(elem.get('y1', 0))
        x2 = float(elem.get('x2', 0))
        y2 = float(elem.get('y2', 0))

        p1 = _apply_transforms((x1, y1), all_transforms)
        p2 = _apply_transforms((x2, y2), all_transforms)
        polylines.append([p1, p2])

    elif tag == 'rect':
        x = float(elem.get('x', 0))
        y = float(elem.get('y', 0))
        w = float(elem.get('width', 0))
        h = float(elem.get('height', 0))
        rx = float(elem.get('rx', 0))
        ry = float(elem.get('ry', rx))

        if rx == 0 and ry == 0:
            # Simple rectangle
            corners = [(x, y), (x + w, y), (x + w, y + h), (x, y + h), (x, y)]
            transformed = [_apply_transforms(pt, all_transforms) for pt in corners]
            polylines.append(transformed)
        else:
            # Rounded rectangle - approximate with bezier
            rx = min(rx, w / 2)
            ry = min(ry, h / 2)

            path = []
            # Top edge
            path.append((x + rx, y))
            path.append((x + w - rx, y))
            # Top-right corner
            for pt in _arc_to_bezier(x + w - rx, y, rx, ry, 0, False, True, x + w, y + ry):
                path.append(pt)
            # Right edge
            path.append((x + w, y + h - ry))
            # Bottom-right corner
            for pt in _arc_to_bezier(x + w, y + h - ry, rx, ry, 0, False, True, x + w - rx, y + h):
                path.append(pt)
            # Bottom edge
            path.append((x + rx, y + h))
            # Bottom-left corner
            for pt in _arc_to_bezier(x + rx, y + h, rx, ry, 0, False, True, x, y + h - ry):
                path.append(pt)
            # Left edge
            path.append((x, y + ry))
            # Top-left corner
            for pt in _arc_to_bezier(x, y + ry, rx, ry, 0, False, True, x + rx, y):
                path.append(pt)

            transformed = [_apply_transforms(pt, all_transforms) for pt in path]
            polylines.append(transformed)

    elif tag == 'circle':
        cx = float(elem.get('cx', 0))
        cy = float(elem.get('cy', 0))
        r = float(elem.get('r', 0))

        # Approximate circle with polygon
        segments = 32
        circle = []
        for i in range(segments + 1):
            angle = 2 * math.pi * i / segments
            x = cx + r * math.cos(angle)
            y = cy + r * math.sin(angle)
            circle.append(_apply_transforms((x, y), all_transforms))
        polylines.append(circle)

    elif tag == 'ellipse':
        cx = float(elem.get('cx', 0))
        cy = float(elem.get('cy', 0))
        rx = float(elem.get('rx', 0))
        ry = float(elem.get('ry', 0))

        segments = 32
        ellipse = []
        for i in range(segments + 1):
            angle = 2 * math.pi * i / segments
            x = cx + rx * math.cos(angle)
            y = cy + ry * math.sin(angle)
            ellipse.append(_apply_transforms((x, y), all_transforms))
        polylines.append(ellipse)

    elif tag in ('polyline', 'polygon'):
        points_str = elem.get('points', '')
        # Parse points (space or comma separated)
        nums = [float(n) for n in re.split(r'[\s,]+', points_str.strip()) if n]

        points = []
        for i in range(0, len(nums) - 1, 2):
            pt = _apply_transforms((nums[i], nums[i + 1]), all_transforms)
            points.append(pt)

        if tag == 'polygon' and points:
            points.append(points[0])  # Close polygon

        if len(points) >= 2:
            polylines.append(points)

    # Recurse into child elements
    for child in elem:
        child_polylines = _parse_element(child, all_transforms, viewbox_scale)
        polylines.extend(child_polylines)

    return polylines


def svg_to_polylines(svg_content: str, offset_x: float = 0, offset_y: float = 0,
                     scale: float = 1.0, flip_y: bool = True) -> List[Polyline]:
    """
    Convert SVG content to polylines.

    Args:
        svg_content: SVG file content as string
        offset_x: X offset for output coordinates
        offset_y: Y offset for output coordinates
        scale: Scale factor for output
        flip_y: Whether to flip Y axis (SVG has Y down, plotter has Y up)

    Returns:
        List of polylines
    """
    # Parse SVG
    try:
        root = ET.fromstring(svg_content)
    except ET.ParseError as e:
        raise ValueError(f"Invalid SVG: {e}")

    # Get viewBox for proper scaling
    viewbox = root.get('viewBox', '')
    if viewbox:
        parts = viewbox.split()
        if len(parts) >= 4:
            vb_x, vb_y, vb_w, vb_h = [float(p) for p in parts[:4]]
        else:
            vb_x, vb_y, vb_w, vb_h = 0, 0, 100, 100
    else:
        # Try to get dimensions from width/height
        w = root.get('width', '100')
        h = root.get('height', '100')
        # Remove units
        w = float(re.sub(r'[^\d.]', '', w) or '100')
        h = float(re.sub(r'[^\d.]', '', h) or '100')
        vb_x, vb_y, vb_w, vb_h = 0, 0, w, h

    viewbox_scale = (1, 1, vb_x, vb_y)

    # Parse all elements
    polylines = _parse_element(root, [], viewbox_scale)

    # Apply output transformations
    result = []
    for polyline in polylines:
        transformed = []
        for x, y in polyline:
            # Apply scale
            x = (x - vb_x) * scale
            y = (y - vb_y) * scale

            # Flip Y if needed
            if flip_y:
                y = vb_h * scale - y

            # Apply offset
            x += offset_x
            y += offset_y

            transformed.append((x, y))

        if len(transformed) >= 2:
            result.append(transformed)

    return result


def svg_file_to_polylines(filepath: str, offset_x: float = 0, offset_y: float = 0,
                          scale: float = 1.0, flip_y: bool = True) -> List[Polyline]:
    """
    Convert SVG file to polylines.

    Args:
        filepath: Path to SVG file
        offset_x: X offset for output coordinates
        offset_y: Y offset for output coordinates
        scale: Scale factor
        flip_y: Whether to flip Y axis

    Returns:
        List of polylines
    """
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    return svg_to_polylines(content, offset_x, offset_y, scale, flip_y)
