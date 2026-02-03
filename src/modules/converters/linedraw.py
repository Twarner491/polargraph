# Linedraw - Image to line drawing converter
# Ported from https://github.com/LingDong-/linedraw

import math
import numpy as np
from typing import List, Tuple, Optional
from PIL import Image, ImageOps, ImageFilter

Polyline = List[Tuple[float, float]]


def find_edges(img: np.ndarray, use_cv2: bool = True) -> np.ndarray:
    """
    Find edges in a grayscale image.

    Args:
        img: Grayscale image as numpy array (0-255)
        use_cv2: Try to use OpenCV if available (faster, better quality)

    Returns:
        Binary edge image (0 or 255)
    """
    if use_cv2:
        try:
            import cv2
            # Gaussian blur to reduce noise
            blurred = cv2.GaussianBlur(img, (3, 3), 0)
            # Canny edge detection
            edges = cv2.Canny(blurred, 100, 200)
            return edges
        except ImportError:
            pass

    # Fallback: Sobel edge detection using PIL/numpy
    pil_img = Image.fromarray(img)

    # Apply Sobel filters
    sobel_x = pil_img.filter(ImageFilter.Kernel(
        (3, 3), [-1, 0, 1, -2, 0, 2, -1, 0, 1], scale=1
    ))
    sobel_y = pil_img.filter(ImageFilter.Kernel(
        (3, 3), [-1, -2, -1, 0, 0, 0, 1, 2, 1], scale=1
    ))

    # Combine gradients
    sx = np.array(sobel_x, dtype=np.float32)
    sy = np.array(sobel_y, dtype=np.float32)
    magnitude = np.sqrt(sx**2 + sy**2)

    # Threshold
    threshold = 50
    edges = (magnitude > threshold).astype(np.uint8) * 255

    return edges


def get_contours(img: np.ndarray, simplify: float = 2.0) -> List[Polyline]:
    """
    Extract contours from an edge image.

    Args:
        img: Grayscale image array
        simplify: Simplification factor (higher = fewer points)

    Returns:
        List of polylines representing contours
    """
    # Find edges
    edges = find_edges(img)

    height, width = edges.shape
    contours = []

    # Get all edge points
    dots = []
    for y in range(height):
        row_dots = []
        for x in range(width):
            if edges[y, x] > 128:
                row_dots.append(x)
        dots.append(row_dots)

    # Connect dots into contours
    visited = set()

    for y in range(height):
        for x in dots[y]:
            if (x, y) in visited:
                continue

            # Start a new contour
            contour = [(x, y)]
            visited.add((x, y))

            # Trace the contour
            cx, cy = x, y
            while True:
                found = False
                # Check 8-connected neighbors
                for dy in [-1, 0, 1]:
                    for dx in [-1, 0, 1]:
                        if dx == 0 and dy == 0:
                            continue
                        nx, ny = cx + dx, cy + dy
                        if 0 <= ny < height and (nx, ny) not in visited:
                            if nx in dots[ny]:
                                contour.append((nx, ny))
                                visited.add((nx, ny))
                                cx, cy = nx, ny
                                found = True
                                break
                    if found:
                        break
                if not found:
                    break

            # Only keep contours with enough points
            if len(contour) >= 3:
                # Simplify contour
                simplified = _simplify_polyline(contour, simplify)
                if len(simplified) >= 2:
                    contours.append(simplified)

    return contours


def _simplify_polyline(points: Polyline, epsilon: float) -> Polyline:
    """Ramer-Douglas-Peucker polyline simplification."""
    if len(points) <= 2:
        return points

    # Find the point with maximum distance from the line
    dmax = 0.0
    index = 0
    end = len(points) - 1

    for i in range(1, end):
        d = _point_line_distance(points[i], points[0], points[end])
        if d > dmax:
            index = i
            dmax = d

    # If max distance is greater than epsilon, recursively simplify
    if dmax > epsilon:
        # Recursive call
        rec_results1 = _simplify_polyline(points[:index + 1], epsilon)
        rec_results2 = _simplify_polyline(points[index:], epsilon)

        # Build result list
        return rec_results1[:-1] + rec_results2
    else:
        return [points[0], points[end]]


def _point_line_distance(point: Tuple[float, float],
                         line_start: Tuple[float, float],
                         line_end: Tuple[float, float]) -> float:
    """Calculate perpendicular distance from point to line segment."""
    x, y = point
    x1, y1 = line_start
    x2, y2 = line_end

    dx = x2 - x1
    dy = y2 - y1

    if dx == 0 and dy == 0:
        return math.sqrt((x - x1)**2 + (y - y1)**2)

    t = ((x - x1) * dx + (y - y1) * dy) / (dx * dx + dy * dy)
    t = max(0, min(1, t))

    proj_x = x1 + t * dx
    proj_y = y1 + t * dy

    return math.sqrt((x - proj_x)**2 + (y - proj_y)**2)


def hatch(img: np.ndarray, hatch_size: int = 16, angle: float = 45,
          cross_hatch: bool = True) -> List[Polyline]:
    """
    Generate hatching lines based on image brightness.

    Darker areas get denser hatching, lighter areas get sparser or no hatching.

    Args:
        img: Grayscale image array (0-255, 0=black, 255=white)
        hatch_size: Size of hatching grid cells
        angle: Angle of primary hatching lines (degrees)
        cross_hatch: Whether to add perpendicular lines for darker areas

    Returns:
        List of hatching polylines
    """
    height, width = img.shape
    lines = []

    # Convert angle to radians
    angle_rad = math.radians(angle)
    cos_a = math.cos(angle_rad)
    sin_a = math.sin(angle_rad)

    # Generate primary hatching lines
    primary_lines = []
    secondary_lines = []

    for y in range(0, height, hatch_size):
        for x in range(0, width, hatch_size):
            # Sample brightness in this cell
            x1, y1 = x, y
            x2, y2 = min(x + hatch_size, width - 1), min(y + hatch_size, height - 1)

            # Get average brightness
            cell = img[y1:y2 + 1, x1:x2 + 1]
            if cell.size == 0:
                continue
            brightness = np.mean(cell)

            # Skip very bright areas
            if brightness > 240:
                continue

            # Cell center
            cx = x + hatch_size / 2
            cy = y + hatch_size / 2

            # Hatching density based on brightness
            # Darker = more lines
            if brightness < 64:
                # Very dark: dense cross-hatch
                density = 4
            elif brightness < 128:
                # Dark: medium cross-hatch
                density = 3
            elif brightness < 192:
                # Medium: sparse cross-hatch
                density = 2
            else:
                # Light: single line
                density = 1

            # Generate hatching lines in this cell
            half_size = hatch_size / 2
            step = hatch_size / density

            for i in range(density):
                offset = -half_size + step / 2 + i * step

                # Primary direction line
                px1 = cx + offset * sin_a - half_size * cos_a
                py1 = cy - offset * cos_a - half_size * sin_a
                px2 = cx + offset * sin_a + half_size * cos_a
                py2 = cy - offset * cos_a + half_size * sin_a

                # Clip to cell bounds
                px1, py1, px2, py2 = _clip_line_to_rect(
                    px1, py1, px2, py2, x, y, x + hatch_size, y + hatch_size
                )

                if px1 is not None:
                    primary_lines.append([(px1, py1), (px2, py2)])

            # Cross-hatching for darker areas
            if cross_hatch and density >= 2:
                perp_angle = angle_rad + math.pi / 2
                cos_p = math.cos(perp_angle)
                sin_p = math.sin(perp_angle)

                cross_density = density - 1
                step = hatch_size / cross_density

                for i in range(cross_density):
                    offset = -half_size + step / 2 + i * step

                    px1 = cx + offset * sin_p - half_size * cos_p
                    py1 = cy - offset * cos_p - half_size * sin_p
                    px2 = cx + offset * sin_p + half_size * cos_p
                    py2 = cy - offset * cos_p + half_size * sin_p

                    px1, py1, px2, py2 = _clip_line_to_rect(
                        px1, py1, px2, py2, x, y, x + hatch_size, y + hatch_size
                    )

                    if px1 is not None:
                        secondary_lines.append([(px1, py1), (px2, py2)])

    # Merge connected lines
    lines = _merge_lines(primary_lines) + _merge_lines(secondary_lines)

    return lines


def _clip_line_to_rect(x1: float, y1: float, x2: float, y2: float,
                       rx1: float, ry1: float, rx2: float, ry2: float
                       ) -> Tuple[Optional[float], ...]:
    """Clip a line segment to a rectangle using Cohen-Sutherland."""
    INSIDE, LEFT, RIGHT, BOTTOM, TOP = 0, 1, 2, 4, 8

    def compute_code(x, y):
        code = INSIDE
        if x < rx1:
            code |= LEFT
        elif x > rx2:
            code |= RIGHT
        if y < ry1:
            code |= BOTTOM
        elif y > ry2:
            code |= TOP
        return code

    code1 = compute_code(x1, y1)
    code2 = compute_code(x2, y2)

    while True:
        if code1 == 0 and code2 == 0:
            return x1, y1, x2, y2
        elif code1 & code2 != 0:
            return None, None, None, None
        else:
            code_out = code1 if code1 != 0 else code2
            if code_out & TOP:
                x = x1 + (x2 - x1) * (ry2 - y1) / (y2 - y1) if y2 != y1 else x1
                y = ry2
            elif code_out & BOTTOM:
                x = x1 + (x2 - x1) * (ry1 - y1) / (y2 - y1) if y2 != y1 else x1
                y = ry1
            elif code_out & RIGHT:
                y = y1 + (y2 - y1) * (rx2 - x1) / (x2 - x1) if x2 != x1 else y1
                x = rx2
            elif code_out & LEFT:
                y = y1 + (y2 - y1) * (rx1 - x1) / (x2 - x1) if x2 != x1 else y1
                x = rx1

            if code_out == code1:
                x1, y1 = x, y
                code1 = compute_code(x1, y1)
            else:
                x2, y2 = x, y
                code2 = compute_code(x2, y2)


def _merge_lines(lines: List[Polyline], tolerance: float = 1.5) -> List[Polyline]:
    """Merge line segments that connect at endpoints."""
    if not lines:
        return []

    merged = []
    used = [False] * len(lines)

    for i in range(len(lines)):
        if used[i]:
            continue

        # Start a new merged line
        current = list(lines[i])
        used[i] = True
        changed = True

        while changed:
            changed = False
            for j in range(len(lines)):
                if used[j]:
                    continue

                line = lines[j]

                # Check if line connects to current
                # End of current to start of line
                if _dist(current[-1], line[0]) < tolerance:
                    current.extend(line[1:])
                    used[j] = True
                    changed = True
                # End of current to end of line (reversed)
                elif _dist(current[-1], line[-1]) < tolerance:
                    current.extend(reversed(line[:-1]))
                    used[j] = True
                    changed = True
                # Start of current to end of line
                elif _dist(current[0], line[-1]) < tolerance:
                    current = list(line[:-1]) + current
                    used[j] = True
                    changed = True
                # Start of current to start of line (reversed)
                elif _dist(current[0], line[0]) < tolerance:
                    current = list(reversed(line[1:])) + current
                    used[j] = True
                    changed = True

        merged.append(current)

    return merged


def _dist(p1: Tuple[float, float], p2: Tuple[float, float]) -> float:
    """Euclidean distance between two points."""
    return math.sqrt((p1[0] - p2[0])**2 + (p1[1] - p2[1])**2)


def sort_lines(lines: List[Polyline]) -> List[Polyline]:
    """
    Sort lines to minimize travel distance between strokes.
    Uses greedy nearest neighbor algorithm.

    Args:
        lines: List of polylines to sort

    Returns:
        Sorted list of polylines
    """
    if not lines:
        return []

    remaining = list(lines)
    sorted_lines = [remaining.pop(0)]

    while remaining:
        current_end = sorted_lines[-1][-1]
        best_idx = 0
        best_dist = float('inf')
        reverse = False

        for i, line in enumerate(remaining):
            # Distance to start of line
            d_start = _dist(current_end, line[0])
            # Distance to end of line (would need to reverse)
            d_end = _dist(current_end, line[-1])

            if d_start < best_dist:
                best_dist = d_start
                best_idx = i
                reverse = False

            if d_end < best_dist:
                best_dist = d_end
                best_idx = i
                reverse = True

        next_line = remaining.pop(best_idx)
        if reverse:
            next_line = list(reversed(next_line))

        sorted_lines.append(next_line)

    return sorted_lines


def linedraw_convert(img: np.ndarray, offset_x: float = 0, offset_y: float = 0,
                     draw_contours: bool = True, draw_hatch: bool = True,
                     contour_simplify: float = 2.0, hatch_size: int = 16,
                     hatch_angle: float = 45, cross_hatch: bool = True,
                     sort: bool = True) -> List[Polyline]:
    """
    Convert an image to line drawing polylines.

    This is the main entry point, combining contour extraction and hatching.

    Args:
        img: Grayscale image array (0-255)
        offset_x: X offset for output coordinates
        offset_y: Y offset for output coordinates
        draw_contours: Whether to extract edge contours
        draw_hatch: Whether to generate hatching
        contour_simplify: Simplification factor for contours
        hatch_size: Size of hatching grid cells
        hatch_angle: Angle of hatching lines
        cross_hatch: Whether to use cross-hatching
        sort: Whether to sort lines for efficient plotting

    Returns:
        List of polylines with coordinates offset
    """
    height, width = img.shape
    lines = []

    # Apply auto-contrast for better edge detection
    pil_img = Image.fromarray(img)
    pil_img = ImageOps.autocontrast(pil_img, cutoff=10)
    img = np.array(pil_img)

    # Extract contours
    if draw_contours:
        contours = get_contours(img, contour_simplify)
        lines.extend(contours)

    # Generate hatching
    if draw_hatch:
        hatch_lines = hatch(img, hatch_size, hatch_angle, cross_hatch)
        lines.extend(hatch_lines)

    # Sort lines for efficient plotting
    if sort and lines:
        lines = sort_lines(lines)

    # Apply offset and flip Y coordinate
    result = []
    for line in lines:
        offset_line = []
        for x, y in line:
            # Flip Y and apply offset
            offset_line.append((x + offset_x, (height - y) + offset_y))
        result.append(offset_line)

    return result
