"""
Turtle graphics implementation for path generation.
Based on the Makelangelo Turtle class.
"""

import math
from typing import List, Tuple, Dict, Optional
from dataclasses import dataclass, field


@dataclass
class Point:
    """A 2D point."""
    x: float = 0.0
    y: float = 0.0
    
    def distance_to(self, other: 'Point') -> float:
        dx = self.x - other.x
        dy = self.y - other.y
        return math.sqrt(dx * dx + dy * dy)
    
    def to_tuple(self) -> Tuple[float, float]:
        return (self.x, self.y)


@dataclass
class Line:
    """A line segment with color."""
    points: List[Point] = field(default_factory=list)
    color: str = '#000000'
    diameter: float = 1.0


@dataclass
class StrokeLayer:
    """A layer of strokes with the same color and diameter."""
    lines: List[Line] = field(default_factory=list)
    color: str = '#000000'
    diameter: float = 1.0


class Turtle:
    """
    Turtle graphics implementation.
    Commands: penUp, penDown, moveTo, jumpTo, forward, turn, etc.
    """
    
    def __init__(self, color: str = '#000000', diameter: float = 1.0):
        self.layers: List[StrokeLayer] = []
        self.position = Point(0, 0)
        self.angle = 0.0  # Degrees, 0 = right/east
        self.pen_up = True
        self.color = color
        self.diameter = diameter
        
        # Create initial layer
        self._new_layer()
    
    def _new_layer(self):
        """Create a new stroke layer."""
        self.layers.append(StrokeLayer(
            lines=[],
            color=self.color,
            diameter=self.diameter
        ))
    
    def _current_layer(self) -> StrokeLayer:
        """Get the current stroke layer."""
        return self.layers[-1]
    
    def _new_line(self):
        """Start a new line in the current layer."""
        line = Line(points=[Point(self.position.x, self.position.y)],
                    color=self.color, diameter=self.diameter)
        self._current_layer().lines.append(line)
    
    def set_stroke(self, color: str, diameter: float):
        """Set the pen color and diameter."""
        if self.color != color or self.diameter != diameter:
            self.color = color
            self.diameter = diameter
            self._new_layer()
            if not self.pen_up:
                self._new_line()
    
    def pen_down(self):
        """Lower the pen."""
        if self.pen_up:
            self.pen_up = False
            self._new_line()
    
    def pen_up_cmd(self):
        """Raise the pen."""
        self.pen_up = True
    
    def move_to(self, x: float, y: float):
        """Move to an absolute position."""
        self.position.x = x
        self.position.y = y
        
        if not self.pen_up:
            layer = self._current_layer()
            if layer.lines:
                layer.lines[-1].points.append(Point(x, y))
    
    def jump_to(self, x: float, y: float):
        """Jump to a position (pen up, move, pen down)."""
        self.pen_up_cmd()
        self.position.x = x
        self.position.y = y
        self.pen_down()  # Always lower pen after jump
    
    def forward(self, distance: float):
        """Move forward in the current direction."""
        rad = math.radians(self.angle)
        x = self.position.x + math.cos(rad) * distance
        y = self.position.y + math.sin(rad) * distance
        self.move_to(x, y)
    
    def backward(self, distance: float):
        """Move backward."""
        self.forward(-distance)
    
    def turn(self, degrees: float):
        """Turn by a relative amount (positive = counter-clockwise)."""
        self.angle += degrees
    
    def turn_right(self, degrees: float):
        """Turn right (clockwise)."""
        self.angle -= degrees
    
    def turn_left(self, degrees: float):
        """Turn left (counter-clockwise)."""
        self.angle += degrees
    
    def set_angle(self, degrees: float):
        """Set absolute angle."""
        self.angle = degrees
    
    def draw_arc(self, cx: float, cy: float, radius: float, 
                 start_angle: float, end_angle: float, steps: int = 36):
        """Draw an arc."""
        if steps <= 0:
            steps = 36
        
        delta = (end_angle - start_angle) / steps
        
        for i in range(steps + 1):
            angle = start_angle + delta * i
            x = cx + math.cos(angle) * radius
            y = cy + math.sin(angle) * radius
            
            if i == 0:
                self.jump_to(x, y)
            else:
                self.move_to(x, y)
    
    def draw_circle(self, cx: float, cy: float, radius: float, steps: int = 36):
        """Draw a circle."""
        self.draw_arc(cx, cy, radius, 0, 2 * math.pi, steps)
    
    def draw_line(self, x1: float, y1: float, x2: float, y2: float):
        """Draw a line from (x1, y1) to (x2, y2)."""
        self.jump_to(x1, y1)
        self.move_to(x2, y2)
    
    def draw_rect(self, x: float, y: float, width: float, height: float):
        """Draw a rectangle."""
        self.jump_to(x, y)
        self.move_to(x + width, y)
        self.move_to(x + width, y + height)
        self.move_to(x, y + height)
        self.move_to(x, y)
    
    # ========================================================================
    # Query methods
    # ========================================================================
    
    def get_bounds(self) -> Dict[str, float]:
        """Get the bounding box of all paths."""
        min_x = float('inf')
        min_y = float('inf')
        max_x = float('-inf')
        max_y = float('-inf')
        
        for layer in self.layers:
            for line in layer.lines:
                for point in line.points:
                    min_x = min(min_x, point.x)
                    min_y = min(min_y, point.y)
                    max_x = max(max_x, point.x)
                    max_y = max(max_y, point.y)
        
        if min_x == float('inf'):
            return {'min_x': 0, 'min_y': 0, 'max_x': 0, 'max_y': 0, 'width': 0, 'height': 0}
        
        return {
            'min_x': min_x,
            'min_y': min_y,
            'max_x': max_x,
            'max_y': max_y,
            'width': max_x - min_x,
            'height': max_y - min_y
        }
    
    def count_points(self) -> int:
        """Count total points."""
        total = 0
        for layer in self.layers:
            for line in layer.lines:
                total += len(line.points)
        return total
    
    def count_lines(self) -> int:
        """Count total line segments."""
        total = 0
        for layer in self.layers:
            for line in layer.lines:
                total += max(0, len(line.points) - 1)
        return total
    
    def get_draw_distance(self) -> float:
        """Get total drawing distance."""
        total = 0.0
        for layer in self.layers:
            for line in layer.lines:
                for i in range(len(line.points) - 1):
                    total += line.points[i].distance_to(line.points[i + 1])
        return total
    
    def get_travel_distance(self) -> float:
        """Get total travel distance (pen up moves)."""
        total = 0.0
        last_point = None
        
        for layer in self.layers:
            for line in layer.lines:
                if line.points and last_point:
                    total += last_point.distance_to(line.points[0])
                if line.points:
                    last_point = line.points[-1]
        
        return total
    
    def get_paths(self) -> List[Dict]:
        """Get all paths as a list of dictionaries for JSON serialization."""
        paths = []
        
        for layer in self.layers:
            for line in layer.lines:
                if len(line.points) >= 2:
                    paths.append({
                        'points': [{'x': p.x, 'y': p.y} for p in line.points],
                        'color': layer.color,
                        'diameter': layer.diameter
                    })
        
        return paths
    
    def get_lines(self) -> List:
        """Get all lines as raw Line objects (for internal use)."""
        lines = []
        for layer in self.layers:
            for line in layer.lines:
                if len(line.points) >= 2:
                    lines.append(line)
        return lines
    
    def has_content(self) -> bool:
        """Check if the turtle has any drawn content."""
        for layer in self.layers:
            for line in layer.lines:
                if len(line.points) >= 2:
                    return True
        return False
    
    # ========================================================================
    # Transform methods
    # ========================================================================
    
    def translate(self, dx: float, dy: float):
        """Translate all paths."""
        for layer in self.layers:
            for line in layer.lines:
                for point in line.points:
                    point.x += dx
                    point.y += dy
    
    def scale(self, sx: float, sy: float = None):
        """Scale all paths."""
        if sy is None:
            sy = sx
        
        for layer in self.layers:
            for line in layer.lines:
                for point in line.points:
                    point.x *= sx
                    point.y *= sy
    
    def rotate(self, degrees: float):
        """Rotate all paths around the origin."""
        rad = math.radians(degrees)
        cos_a = math.cos(rad)
        sin_a = math.sin(rad)
        
        for layer in self.layers:
            for line in layer.lines:
                for point in line.points:
                    x = point.x
                    y = point.y
                    point.x = x * cos_a - y * sin_a
                    point.y = x * sin_a + y * cos_a
    
    def center_on(self, cx: float, cy: float):
        """Center the drawing on a point."""
        bounds = self.get_bounds()
        current_cx = (bounds['min_x'] + bounds['max_x']) / 2
        current_cy = (bounds['min_y'] + bounds['max_y']) / 2
        self.translate(cx - current_cx, cy - current_cy)
    
    def fit_to_bounds(self, left: float, bottom: float, right: float, top: float, 
                      maintain_aspect: bool = True):
        """Scale and translate to fit within bounds."""
        bounds = self.get_bounds()
        
        if bounds['width'] == 0 or bounds['height'] == 0:
            return
        
        target_width = right - left
        target_height = top - bottom
        
        sx = target_width / bounds['width']
        sy = target_height / bounds['height']
        
        if maintain_aspect:
            s = min(sx, sy)
            sx = sy = s
        
        # Center on origin, scale, then move to target center
        self.translate(-bounds['min_x'] - bounds['width'] / 2,
                       -bounds['min_y'] - bounds['height'] / 2)
        self.scale(sx, sy)
        self.translate((left + right) / 2, (bottom + top) / 2)

