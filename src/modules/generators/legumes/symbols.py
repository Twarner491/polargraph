# Musical notation symbols as polylines
# Simplified versions suitable for plotter output

import math
from typing import List, Tuple

Polyline = List[Tuple[float, float]]

# Staff line configuration
LINE_HEIGHT = 9  # Pixels between staff lines
STAFF_LINES = 5  # Number of lines in a staff
NOTE_WIDTH = 12  # Base note width


def scale_symbol(polylines: List[Polyline], scale: float = 1.0,
                 offset_x: float = 0, offset_y: float = 0) -> List[Polyline]:
    """Scale and translate a symbol's polylines."""
    result = []
    for poly in polylines:
        result.append([
            (x * scale + offset_x, y * scale + offset_y)
            for x, y in poly
        ])
    return result


def ellipse(cx: float, cy: float, rx: float, ry: float,
            rotation: float = 0, segments: int = 24) -> Polyline:
    """Generate an ellipse polyline."""
    points = []
    cos_r = math.cos(rotation)
    sin_r = math.sin(rotation)
    for i in range(segments + 1):
        angle = 2 * math.pi * i / segments
        x = rx * math.cos(angle)
        y = ry * math.sin(angle)
        px = cx + x * cos_r - y * sin_r
        py = cy + x * sin_r + y * cos_r
        points.append((px, py))
    return points


# =============================================================================
# Musical Symbol Definitions
# =============================================================================

class SYMBOLS:
    """Container for all musical symbol polyline generators."""

    @staticmethod
    def note_head_whole(x: float, y: float, size: float = 1.0) -> List[Polyline]:
        """Whole note - open ellipse."""
        rx = 4.5 * size
        ry = 3.2 * size
        outer = ellipse(x, y, rx, ry, -0.2)
        inner = ellipse(x, y, rx * 0.5, ry * 0.6, 0.3)
        return [outer, inner]

    @staticmethod
    def note_head_half(x: float, y: float, size: float = 1.0) -> List[Polyline]:
        """Half note - open ellipse with thicker outline."""
        rx = 4.2 * size
        ry = 3.0 * size
        outer = ellipse(x, y, rx, ry, -0.25)
        # Slightly smaller inner for half-filled appearance
        inner = ellipse(x, y, rx * 0.55, ry * 0.5, 0.2)
        return [outer, inner]

    @staticmethod
    def note_head_filled(x: float, y: float, size: float = 1.0) -> List[Polyline]:
        """Filled note head (quarter, eighth, etc.) - filled ellipse."""
        rx = 4.0 * size
        ry = 2.8 * size
        # Create a filled appearance with concentric ellipses
        polys = []
        for i in range(4):
            r = 1 - i * 0.25
            polys.append(ellipse(x, y, rx * r, ry * r, -0.25))
        return polys

    @staticmethod
    def stem(x: float, y_start: float, y_end: float) -> List[Polyline]:
        """Note stem - vertical line."""
        return [[(x, y_start), (x, y_end)]]

    @staticmethod
    def flag_down(x: float, y: float, count: int = 1, size: float = 1.0) -> List[Polyline]:
        """Flags for notes with stems down."""
        polys = []
        spacing = 6 * size
        for i in range(count):
            flag_y = y + i * spacing
            # Curved flag
            flag = [
                (x, flag_y),
                (x + 3 * size, flag_y + 3 * size),
                (x + 6 * size, flag_y + 8 * size),
                (x + 8 * size, flag_y + 12 * size),
            ]
            polys.append(flag)
        return polys

    @staticmethod
    def flag_up(x: float, y: float, count: int = 1, size: float = 1.0) -> List[Polyline]:
        """Flags for notes with stems up."""
        polys = []
        spacing = 6 * size
        for i in range(count):
            flag_y = y - i * spacing
            flag = [
                (x, flag_y),
                (x + 3 * size, flag_y - 3 * size),
                (x + 6 * size, flag_y - 8 * size),
                (x + 8 * size, flag_y - 12 * size),
            ]
            polys.append(flag)
        return polys

    @staticmethod
    def treble_clef(x: float, y: float, size: float = 1.0) -> List[Polyline]:
        """Treble clef (G clef) - simplified vector version."""
        s = size
        # Main spiral part
        clef = [
            (x + 2*s, y - 25*s),
            (x + 0*s, y - 22*s),
            (x - 2*s, y - 15*s),
            (x - 3*s, y - 8*s),
            (x - 2*s, y - 2*s),
            (x + 1*s, y + 3*s),
            (x + 5*s, y + 5*s),
            (x + 8*s, y + 3*s),
            (x + 9*s, y - 2*s),
            (x + 8*s, y - 8*s),
            (x + 5*s, y - 12*s),
            (x + 0*s, y - 12*s),
            (x - 4*s, y - 8*s),
            (x - 5*s, y - 2*s),
            (x - 4*s, y + 5*s),
            (x - 1*s, y + 12*s),
            (x + 3*s, y + 16*s),
            (x + 6*s, y + 14*s),
            (x + 7*s, y + 10*s),
            (x + 5*s, y + 6*s),
            (x + 2*s, y + 4*s),
            (x + 0*s, y + 6*s),
            (x + 0*s, y + 10*s),
            (x + 2*s, y + 13*s),
        ]
        # Tail
        tail = [
            (x + 2*s, y - 25*s),
            (x + 3*s, y - 30*s),
            (x + 2*s, y - 34*s),
            (x + 0*s, y - 36*s),
        ]
        return [clef, tail]

    @staticmethod
    def bass_clef(x: float, y: float, size: float = 1.0) -> List[Polyline]:
        """Bass clef (F clef) - simplified vector version."""
        s = size
        # Main body
        body = [
            (x + 0*s, y + 8*s),
            (x + 2*s, y + 10*s),
            (x + 6*s, y + 10*s),
            (x + 10*s, y + 6*s),
            (x + 11*s, y + 0*s),
            (x + 10*s, y - 6*s),
            (x + 6*s, y - 10*s),
            (x + 2*s, y - 10*s),
            (x + 0*s, y - 8*s),
        ]
        # Two dots
        dot1 = ellipse(x + 14*s, y + 4*s, 1.5*s, 1.5*s)
        dot2 = ellipse(x + 14*s, y - 4*s, 1.5*s, 1.5*s)
        return [body, dot1, dot2]

    @staticmethod
    def sharp(x: float, y: float, size: float = 1.0) -> List[Polyline]:
        """Sharp accidental."""
        s = size
        # Two vertical lines
        v1 = [(x - 2*s, y - 8*s), (x - 2*s, y + 8*s)]
        v2 = [(x + 2*s, y - 8*s), (x + 2*s, y + 8*s)]
        # Two horizontal lines (slightly slanted)
        h1 = [(x - 5*s, y - 3*s), (x + 5*s, y - 1*s)]
        h2 = [(x - 5*s, y + 1*s), (x + 5*s, y + 3*s)]
        return [v1, v2, h1, h2]

    @staticmethod
    def flat(x: float, y: float, size: float = 1.0) -> List[Polyline]:
        """Flat accidental."""
        s = size
        # Vertical stem
        stem = [(x, y - 10*s), (x, y + 5*s)]
        # Loop
        loop = [
            (x, y + 5*s),
            (x + 3*s, y + 3*s),
            (x + 5*s, y - 1*s),
            (x + 4*s, y - 5*s),
            (x + 1*s, y - 7*s),
            (x, y - 5*s),
        ]
        return [stem, loop]

    @staticmethod
    def natural(x: float, y: float, size: float = 1.0) -> List[Polyline]:
        """Natural accidental."""
        s = size
        # Left vertical (partial)
        v1 = [(x - 2*s, y - 8*s), (x - 2*s, y + 2*s)]
        # Right vertical (partial)
        v2 = [(x + 2*s, y - 2*s), (x + 2*s, y + 8*s)]
        # Two horizontal lines
        h1 = [(x - 2*s, y - 3*s), (x + 2*s, y - 1*s)]
        h2 = [(x - 2*s, y + 1*s), (x + 2*s, y + 3*s)]
        return [v1, v2, h1, h2]

    @staticmethod
    def rest_whole(x: float, y: float, size: float = 1.0) -> List[Polyline]:
        """Whole rest - rectangle hanging from line."""
        s = size
        rect = [
            (x - 4*s, y),
            (x + 4*s, y),
            (x + 4*s, y - 4*s),
            (x - 4*s, y - 4*s),
            (x - 4*s, y),
        ]
        return [rect]

    @staticmethod
    def rest_half(x: float, y: float, size: float = 1.0) -> List[Polyline]:
        """Half rest - rectangle sitting on line."""
        s = size
        rect = [
            (x - 4*s, y),
            (x + 4*s, y),
            (x + 4*s, y + 4*s),
            (x - 4*s, y + 4*s),
            (x - 4*s, y),
        ]
        return [rect]

    @staticmethod
    def rest_quarter(x: float, y: float, size: float = 1.0) -> List[Polyline]:
        """Quarter rest - zigzag shape."""
        s = size
        rest = [
            (x + 3*s, y + 10*s),
            (x - 2*s, y + 5*s),
            (x + 2*s, y + 0*s),
            (x - 1*s, y - 3*s),
            (x + 1*s, y - 6*s),
            (x - 2*s, y - 10*s),
            (x + 0*s, y - 12*s),
        ]
        return [rest]

    @staticmethod
    def rest_eighth(x: float, y: float, size: float = 1.0) -> List[Polyline]:
        """Eighth rest."""
        s = size
        stem = [(x + 2*s, y - 6*s), (x - 1*s, y + 6*s)]
        dot = ellipse(x + 2*s, y + 4*s, 2*s, 2*s, segments=12)
        return [stem, dot]

    @staticmethod
    def dot(x: float, y: float, size: float = 1.0) -> List[Polyline]:
        """Augmentation dot."""
        return [ellipse(x, y, 1.5 * size, 1.5 * size, segments=12)]

    @staticmethod
    def staff_lines(x_start: float, x_end: float, y_center: float,
                    line_height: float = LINE_HEIGHT) -> List[Polyline]:
        """Generate the 5 staff lines."""
        lines = []
        half_height = (STAFF_LINES - 1) * line_height / 2
        for i in range(STAFF_LINES):
            y = y_center - half_height + i * line_height
            lines.append([(x_start, y), (x_end, y)])
        return lines

    @staticmethod
    def ledger_line(x: float, y: float, size: float = 1.0) -> List[Polyline]:
        """Ledger line for notes above/below staff."""
        w = 8 * size
        return [[(x - w, y), (x + w, y)]]

    @staticmethod
    def bar_line(x: float, y_top: float, y_bottom: float) -> List[Polyline]:
        """Single bar line."""
        return [[(x, y_top), (x, y_bottom)]]

    @staticmethod
    def double_bar_line(x: float, y_top: float, y_bottom: float,
                        spacing: float = 4) -> List[Polyline]:
        """Double bar line (end of piece)."""
        thin = [(x, y_top), (x, y_bottom)]
        thick = [
            (x + spacing, y_top),
            (x + spacing + 2, y_top),
            (x + spacing + 2, y_bottom),
            (x + spacing, y_bottom),
            (x + spacing, y_top),
        ]
        return [thin, thick]

    @staticmethod
    def time_signature(x: float, y: float, top: int, bottom: int,
                       size: float = 1.0) -> List[Polyline]:
        """Time signature as two numbers."""
        from .hershey_numbers import number_polylines
        top_polys = number_polylines(top, x, y + 9 * size, size)
        bottom_polys = number_polylines(bottom, x, y - 9 * size, size)
        return top_polys + bottom_polys

    @staticmethod
    def beam(x1: float, y1: float, x2: float, y2: float,
             thickness: float = 3) -> List[Polyline]:
        """Beam connecting multiple notes."""
        return [
            [(x1, y1), (x2, y2), (x2, y2 - thickness),
             (x1, y1 - thickness), (x1, y1)]
        ]

    @staticmethod
    def slur(x1: float, y1: float, x2: float, y2: float,
             direction: int = 1, segments: int = 20) -> List[Polyline]:
        """Curved slur/tie between notes."""
        # Bezier control points
        mid_x = (x1 + x2) / 2
        bulge = abs(x2 - x1) * 0.3 * direction

        points = []
        for i in range(segments + 1):
            t = i / segments
            # Quadratic bezier
            px = (1-t)**2 * x1 + 2*(1-t)*t * mid_x + t**2 * x2
            py = (1-t)**2 * y1 + 2*(1-t)*t * (y1 + bulge) + t**2 * y2
            points.append((px, py))
        return [points]
