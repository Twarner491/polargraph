# Simple number rendering for time signatures
# Uses simplified vector font similar to Hershey

from typing import List, Tuple

Polyline = List[Tuple[float, float]]


# Number stroke definitions (normalized to 0-1 range, 0 at bottom)
NUMBER_STROKES = {
    '0': [
        [(0.2, 0), (0, 0.2), (0, 0.8), (0.2, 1), (0.8, 1), (1, 0.8), (1, 0.2), (0.8, 0), (0.2, 0)]
    ],
    '1': [
        [(0.3, 0.8), (0.5, 1), (0.5, 0)],
        [(0.2, 0), (0.8, 0)]
    ],
    '2': [
        [(0, 0.8), (0.2, 1), (0.8, 1), (1, 0.8), (1, 0.6), (0, 0), (1, 0)]
    ],
    '3': [
        [(0, 0.8), (0.2, 1), (0.8, 1), (1, 0.8), (0.8, 0.5), (0.5, 0.5)],
        [(0.8, 0.5), (1, 0.3), (1, 0.2), (0.8, 0), (0.2, 0), (0, 0.2)]
    ],
    '4': [
        [(0.8, 0), (0.8, 1), (0, 0.3), (1, 0.3)]
    ],
    '5': [
        [(1, 1), (0, 1), (0, 0.5), (0.8, 0.5), (1, 0.3), (1, 0.2), (0.8, 0), (0.2, 0), (0, 0.2)]
    ],
    '6': [
        [(0.8, 1), (0.2, 1), (0, 0.8), (0, 0.2), (0.2, 0), (0.8, 0), (1, 0.2), (1, 0.4), (0.8, 0.5), (0, 0.5)]
    ],
    '7': [
        [(0, 1), (1, 1), (0.4, 0)]
    ],
    '8': [
        [(0.5, 0.5), (0.2, 0.5), (0, 0.7), (0, 0.8), (0.2, 1), (0.8, 1), (1, 0.8), (1, 0.7), (0.8, 0.5), (0.5, 0.5)],
        [(0.5, 0.5), (0.2, 0.5), (0, 0.3), (0, 0.2), (0.2, 0), (0.8, 0), (1, 0.2), (1, 0.3), (0.8, 0.5), (0.5, 0.5)]
    ],
    '9': [
        [(1, 0.5), (0.2, 0.5), (0, 0.6), (0, 0.8), (0.2, 1), (0.8, 1), (1, 0.8), (1, 0.2), (0.8, 0), (0.2, 0)]
    ]
}


def number_polylines(num: int, x: float, y: float, size: float = 1.0) -> List[Polyline]:
    """
    Generate polylines for a number at given position.

    Args:
        num: The number to render (0-99 supported)
        x: Center x position
        y: Center y position
        size: Scale factor
    """
    digits = str(num)
    num_digits = len(digits)

    # Character dimensions
    char_width = 10 * size
    char_height = 14 * size
    char_spacing = 2 * size

    # Calculate total width
    total_width = num_digits * char_width + (num_digits - 1) * char_spacing

    # Start position (centered)
    start_x = x - total_width / 2

    result = []

    for i, digit in enumerate(digits):
        char_x = start_x + i * (char_width + char_spacing)
        char_y = y - char_height / 2

        strokes = NUMBER_STROKES.get(digit, [])
        for stroke in strokes:
            poly = []
            for px, py in stroke:
                # Transform from normalized to actual coordinates
                actual_x = char_x + px * char_width
                actual_y = char_y + py * char_height
                poly.append((actual_x, actual_y))
            result.append(poly)

    return result


def text_polylines(text: str, x: float, y: float, size: float = 1.0) -> List[Polyline]:
    """
    Generate polylines for simple text (numbers only for now).

    Args:
        text: The text to render
        x: Start x position
        y: Center y position
        size: Scale factor
    """
    result = []

    for char in text:
        if char.isdigit():
            result.extend(number_polylines(int(char), x, y, size))
            x += 12 * size  # Advance cursor

    return result
