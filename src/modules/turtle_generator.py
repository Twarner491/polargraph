"""
Turtle graphics pattern generators.
Implements various algorithmic patterns (spirograph, maze, fractals, etc.)
"""

import math
import random
from typing import Dict, List, Any

from .turtle import Turtle
from .plotter_settings import PlotterSettings


class TurtleGenerator:
    """Generates patterns using turtle graphics."""
    
    GENERATORS = {
        'spiral': {
            'name': 'Spiral',
            'description': 'Archimedean spiral',
            'options': {
                'turns': {'type': 'float', 'default': 10, 'min': 1, 'max': 50},
                'spacing': {'type': 'float', 'default': 5, 'min': 1, 'max': 20}
            }
        },
        'spirograph': {
            'name': 'Spirograph',
            'description': 'Classic spirograph patterns',
            'options': {
                'R': {'type': 'float', 'default': 100, 'min': 10, 'max': 300},
                'r': {'type': 'float', 'default': 60, 'min': 5, 'max': 150},
                'd': {'type': 'float', 'default': 80, 'min': 5, 'max': 200},
                'revolutions': {'type': 'int', 'default': 10, 'min': 1, 'max': 100}
            }
        },
        'lissajous': {
            'name': 'Lissajous',
            'description': 'Lissajous curves',
            'options': {
                'a': {'type': 'int', 'default': 3, 'min': 1, 'max': 20},
                'b': {'type': 'int', 'default': 4, 'min': 1, 'max': 20},
                'delta': {'type': 'float', 'default': 90, 'min': 0, 'max': 180},
                'size': {'type': 'float', 'default': 200, 'min': 50, 'max': 500}
            }
        },
        'maze': {
            'name': 'Maze',
            'description': 'Rectangular maze using recursive backtracking',
            'options': {
                'rows': {'type': 'int', 'default': 20, 'min': 5, 'max': 50},
                'cols': {'type': 'int', 'default': 20, 'min': 5, 'max': 50},
                'cell_size': {'type': 'float', 'default': 15, 'min': 5, 'max': 40}
            }
        },
        'dragon': {
            'name': 'Dragon Curve',
            'description': 'Dragon curve fractal',
            'options': {
                'iterations': {'type': 'int', 'default': 12, 'min': 1, 'max': 16},
                'size': {'type': 'float', 'default': 3, 'min': 1, 'max': 10}
            }
        },
        'hilbert': {
            'name': 'Hilbert Curve',
            'description': 'Space-filling Hilbert curve',
            'options': {
                'order': {'type': 'int', 'default': 5, 'min': 1, 'max': 7},
                'size': {'type': 'float', 'default': 400, 'min': 100, 'max': 800}
            }
        },
        'tree': {
            'name': 'Fractal Tree',
            'description': 'Recursive branching tree',
            'options': {
                'depth': {'type': 'int', 'default': 8, 'min': 1, 'max': 12},
                'trunk_length': {'type': 'float', 'default': 100, 'min': 20, 'max': 200},
                'angle': {'type': 'float', 'default': 25, 'min': 10, 'max': 45},
                'ratio': {'type': 'float', 'default': 0.7, 'min': 0.5, 'max': 0.9}
            }
        },
        'hexagons': {
            'name': 'Hexagon Grid',
            'description': 'Tessellating hexagon pattern',
            'options': {
                'size': {'type': 'float', 'default': 20, 'min': 5, 'max': 50},
                'rows': {'type': 'int', 'default': 10, 'min': 3, 'max': 30},
                'cols': {'type': 'int', 'default': 10, 'min': 3, 'max': 30}
            }
        },
        'voronoi': {
            'name': 'Voronoi',
            'description': 'Random Voronoi diagram',
            'options': {
                'points': {'type': 'int', 'default': 50, 'min': 10, 'max': 200},
                'relax': {'type': 'int', 'default': 2, 'min': 0, 'max': 10}
            }
        },
        'flowfield': {
            'name': 'Flow Field',
            'description': 'Perlin noise flow field',
            'options': {
                'lines': {'type': 'int', 'default': 200, 'min': 50, 'max': 1000},
                'length': {'type': 'int', 'default': 50, 'min': 10, 'max': 200},
                'scale': {'type': 'float', 'default': 0.01, 'min': 0.001, 'max': 0.1}
            }
        },
        'border': {
            'name': 'Border',
            'description': 'Simple rectangular border',
            'options': {
                'margin': {'type': 'float', 'default': 10, 'min': 0, 'max': 50}
            }
        },
        'text': {
            'name': 'Text',
            'description': 'Single-line text using Hershey font',
            'options': {
                'text': {'type': 'string', 'default': 'Hello World'},
                'size': {'type': 'float', 'default': 50, 'min': 10, 'max': 200}
            }
        }
    }
    
    def __init__(self, settings: PlotterSettings):
        self.settings = settings
    
    def list_generators(self) -> List[Dict]:
        """List available generators with their options."""
        return [
            {'id': k, **v}
            for k, v in self.GENERATORS.items()
        ]
    
    def generate(self, generator: str, options: Dict[str, Any] = None) -> Turtle:
        """Generate a pattern."""
        options = options or {}
        
        generator_method = getattr(self, f'_generate_{generator}', None)
        if generator_method is None:
            raise ValueError(f"Unknown generator: {generator}")
        
        turtle = generator_method(options)
        
        # Fit to work area
        work_area = self.settings.get_work_area()
        margin = 20
        turtle.fit_to_bounds(
            work_area['left'] + margin,
            work_area['bottom'] + margin,
            work_area['right'] - margin,
            work_area['top'] - margin
        )
        
        return turtle
    
    def _generate_spiral(self, options: Dict[str, Any]) -> Turtle:
        """Generate an Archimedean spiral."""
        turtle = Turtle()
        
        turns = options.get('turns', 10)
        spacing = options.get('spacing', 5)
        
        steps_per_turn = 72
        total_steps = int(turns * steps_per_turn)
        
        for i in range(total_steps):
            angle = 2 * math.pi * i / steps_per_turn
            r = spacing * i / steps_per_turn
            
            x = r * math.cos(angle)
            y = r * math.sin(angle)
            
            if i == 0:
                turtle.jump_to(x, y)
            else:
                turtle.move_to(x, y)
        
        return turtle
    
    def _generate_spirograph(self, options: Dict[str, Any]) -> Turtle:
        """Generate a spirograph pattern (epitrochoid/hypotrochoid)."""
        turtle = Turtle()
        
        R = options.get('R', 100)  # Outer radius
        r = options.get('r', 60)   # Inner radius
        d = options.get('d', 80)   # Pen distance from center
        revolutions = options.get('revolutions', 10)
        
        steps = 1000 * revolutions
        
        for i in range(steps + 1):
            t = 2 * math.pi * revolutions * i / steps
            
            x = (R - r) * math.cos(t) + d * math.cos((R - r) / r * t)
            y = (R - r) * math.sin(t) - d * math.sin((R - r) / r * t)
            
            if i == 0:
                turtle.jump_to(x, y)
            else:
                turtle.move_to(x, y)
        
        return turtle
    
    def _generate_lissajous(self, options: Dict[str, Any]) -> Turtle:
        """Generate a Lissajous curve."""
        turtle = Turtle()
        
        a = options.get('a', 3)
        b = options.get('b', 4)
        delta = math.radians(options.get('delta', 90))
        size = options.get('size', 200)
        
        steps = 1000
        
        for i in range(steps + 1):
            t = 2 * math.pi * i / steps
            x = size * math.sin(a * t + delta)
            y = size * math.sin(b * t)
            
            if i == 0:
                turtle.jump_to(x, y)
            else:
                turtle.move_to(x, y)
        
        return turtle
    
    def _generate_maze(self, options: Dict[str, Any]) -> Turtle:
        """Generate a maze using recursive backtracking."""
        turtle = Turtle()
        
        rows = options.get('rows', 20)
        cols = options.get('cols', 20)
        cell_size = options.get('cell_size', 15)
        
        # Initialize grid
        visited = [[False] * cols for _ in range(rows)]
        walls = {
            'h': [[True] * cols for _ in range(rows + 1)],  # Horizontal walls
            'v': [[True] * (cols + 1) for _ in range(rows)]  # Vertical walls
        }
        
        # Recursive backtracking
        stack = [(0, 0)]
        visited[0][0] = True
        
        while stack:
            row, col = stack[-1]
            neighbors = []
            
            for dr, dc in [(-1, 0), (1, 0), (0, -1), (0, 1)]:
                nr, nc = row + dr, col + dc
                if 0 <= nr < rows and 0 <= nc < cols and not visited[nr][nc]:
                    neighbors.append((nr, nc, dr, dc))
            
            if neighbors:
                nr, nc, dr, dc = random.choice(neighbors)
                
                # Remove wall
                if dr == -1:
                    walls['h'][row][col] = False
                elif dr == 1:
                    walls['h'][row + 1][col] = False
                elif dc == -1:
                    walls['v'][row][col] = False
                elif dc == 1:
                    walls['v'][row][col + 1] = False
                
                visited[nr][nc] = True
                stack.append((nr, nc))
            else:
                stack.pop()
        
        # Draw walls
        offset_x = -cols * cell_size / 2
        offset_y = -rows * cell_size / 2
        
        # Horizontal walls
        for row in range(rows + 1):
            for col in range(cols):
                if walls['h'][row][col]:
                    x1 = offset_x + col * cell_size
                    y1 = offset_y + row * cell_size
                    x2 = x1 + cell_size
                    turtle.draw_line(x1, y1, x2, y1)
        
        # Vertical walls
        for row in range(rows):
            for col in range(cols + 1):
                if walls['v'][row][col]:
                    x1 = offset_x + col * cell_size
                    y1 = offset_y + row * cell_size
                    y2 = y1 + cell_size
                    turtle.draw_line(x1, y1, x1, y2)
        
        return turtle
    
    def _generate_dragon(self, options: Dict[str, Any]) -> Turtle:
        """Generate a dragon curve fractal."""
        turtle = Turtle()
        
        iterations = options.get('iterations', 12)
        size = options.get('size', 3)
        
        # Build L-system string
        axiom = "FX"
        rules = {'X': 'X+YF+', 'Y': '-FX-Y'}
        
        s = axiom
        for _ in range(iterations):
            ns = ""
            for c in s:
                ns += rules.get(c, c)
            s = ns
        
        # Draw
        turtle.jump_to(0, 0)
        turtle.set_angle(0)
        
        for c in s:
            if c == 'F':
                turtle.forward(size)
            elif c == '+':
                turtle.turn_right(90)
            elif c == '-':
                turtle.turn_left(90)
        
        return turtle
    
    def _generate_hilbert(self, options: Dict[str, Any]) -> Turtle:
        """Generate a Hilbert space-filling curve."""
        turtle = Turtle()
        
        order = options.get('order', 5)
        size = options.get('size', 400)
        
        step = size / (2 ** order - 1)
        
        def hilbert(level, angle):
            if level == 0:
                return
            
            turtle.turn(-angle)
            hilbert(level - 1, -angle)
            turtle.forward(step)
            turtle.turn(angle)
            hilbert(level - 1, angle)
            turtle.forward(step)
            hilbert(level - 1, angle)
            turtle.turn(angle)
            turtle.forward(step)
            hilbert(level - 1, -angle)
            turtle.turn(-angle)
        
        # Start position
        turtle.jump_to(-size/2, -size/2)
        turtle.set_angle(0)
        
        hilbert(order, 90)
        
        return turtle
    
    def _generate_tree(self, options: Dict[str, Any]) -> Turtle:
        """Generate a fractal tree."""
        turtle = Turtle()
        
        depth = options.get('depth', 8)
        trunk_length = options.get('trunk_length', 100)
        angle = options.get('angle', 25)
        ratio = options.get('ratio', 0.7)
        
        def branch(length, level):
            if level == 0 or length < 2:
                return
            
            turtle.forward(length)
            
            turtle.turn_left(angle)
            branch(length * ratio, level - 1)
            
            turtle.turn_right(2 * angle)
            branch(length * ratio, level - 1)
            
            turtle.turn_left(angle)
            turtle.forward(-length)
        
        # Start at bottom center
        turtle.jump_to(0, -200)
        turtle.set_angle(90)
        
        branch(trunk_length, depth)
        
        return turtle
    
    def _generate_hexagons(self, options: Dict[str, Any]) -> Turtle:
        """Generate a hexagon grid."""
        turtle = Turtle()
        
        size = options.get('size', 20)
        rows = options.get('rows', 10)
        cols = options.get('cols', 10)
        
        # Hexagon dimensions
        w = size * 2
        h = size * math.sqrt(3)
        
        offset_x = -cols * w * 0.75 / 2
        offset_y = -rows * h / 2
        
        for row in range(rows):
            for col in range(cols):
                cx = offset_x + col * w * 0.75
                cy = offset_y + row * h + (h / 2 if col % 2 else 0)
                
                # Draw hexagon
                for i in range(6):
                    angle = math.pi / 3 * i
                    x = cx + size * math.cos(angle)
                    y = cy + size * math.sin(angle)
                    
                    if i == 0:
                        turtle.jump_to(x, y)
                    else:
                        turtle.move_to(x, y)
                
                # Close hexagon
                turtle.move_to(cx + size, cy)
        
        return turtle
    
    def _generate_voronoi(self, options: Dict[str, Any]) -> Turtle:
        """Generate a Voronoi diagram (simplified)."""
        turtle = Turtle()
        
        num_points = options.get('points', 50)
        relax_iterations = options.get('relax', 2)
        
        work_area = self.settings.get_work_area()
        margin = 50
        
        # Generate random points
        points = [
            (random.uniform(work_area['left'] + margin, work_area['right'] - margin),
             random.uniform(work_area['bottom'] + margin, work_area['top'] - margin))
            for _ in range(num_points)
        ]
        
        # Simple relaxation (move toward centroid of nearest neighbors)
        for _ in range(relax_iterations):
            new_points = []
            for px, py in points:
                # Find nearby points
                distances = sorted([
                    (math.sqrt((px - qx)**2 + (py - qy)**2), qx, qy)
                    for qx, qy in points if (qx, qy) != (px, py)
                ])[:5]
                
                # Move toward average of midpoints
                avg_x = px
                avg_y = py
                for _, qx, qy in distances:
                    avg_x += (px + qx) / 2
                    avg_y += (py + qy) / 2
                avg_x /= len(distances) + 1
                avg_y /= len(distances) + 1
                
                new_points.append((avg_x, avg_y))
            points = new_points
        
        # Draw edges to nearest neighbors (simplified Voronoi)
        for px, py in points:
            distances = sorted([
                (math.sqrt((px - qx)**2 + (py - qy)**2), qx, qy)
                for qx, qy in points if (qx, qy) != (px, py)
            ])[:3]
            
            for _, qx, qy in distances:
                # Draw perpendicular bisector (simplified)
                mx, my = (px + qx) / 2, (py + qy) / 2
                dx, dy = qy - py, px - qx  # Perpendicular
                length = math.sqrt(dx**2 + dy**2)
                if length > 0:
                    dx, dy = dx / length * 30, dy / length * 30
                    turtle.draw_line(mx - dx, my - dy, mx + dx, my + dy)
        
        return turtle
    
    def _generate_flowfield(self, options: Dict[str, Any]) -> Turtle:
        """Generate a flow field pattern using Perlin-like noise."""
        turtle = Turtle()
        
        num_lines = options.get('lines', 200)
        line_length = options.get('length', 50)
        scale = options.get('scale', 0.01)
        
        work_area = self.settings.get_work_area()
        margin = 50
        
        # Simple noise function
        def noise(x, y):
            return math.sin(x * 0.1) * math.cos(y * 0.1) + \
                   math.sin(x * 0.05 + y * 0.05) * 0.5
        
        for _ in range(num_lines):
            x = random.uniform(work_area['left'] + margin, work_area['right'] - margin)
            y = random.uniform(work_area['bottom'] + margin, work_area['top'] - margin)
            
            turtle.jump_to(x, y)
            
            for _ in range(line_length):
                angle = noise(x * scale, y * scale) * 2 * math.pi
                
                x += math.cos(angle) * 3
                y += math.sin(angle) * 3
                
                # Stay in bounds
                if x < work_area['left'] or x > work_area['right'] or \
                   y < work_area['bottom'] or y > work_area['top']:
                    break
                
                turtle.move_to(x, y)
        
        return turtle
    
    def _generate_border(self, options: Dict[str, Any]) -> Turtle:
        """Generate a simple border rectangle."""
        turtle = Turtle()
        
        margin = options.get('margin', 10)
        work_area = self.settings.get_work_area()
        
        x1 = work_area['left'] + margin
        y1 = work_area['bottom'] + margin
        x2 = work_area['right'] - margin
        y2 = work_area['top'] - margin
        
        turtle.draw_rect(x1, y1, x2 - x1, y2 - y1)
        
        return turtle
    
    def _generate_text(self, options: Dict[str, Any]) -> Turtle:
        """Generate text using simple single-stroke vector font."""
        turtle = Turtle()
        
        text = options.get('text', 'Hello World')
        size = options.get('size', 50)
        
        # Single-stroke font - each letter defined as list of strokes
        # Each stroke is a list of (x, y) points normalized to 0-1
        FONT = {
            'A': [[(0, 0), (0.5, 1), (1, 0)], [(0.2, 0.4), (0.8, 0.4)]],
            'B': [[(0, 0), (0, 1), (0.7, 1), (0.8, 0.9), (0.8, 0.6), (0.7, 0.5), (0, 0.5)], 
                  [(0.7, 0.5), (0.9, 0.4), (0.9, 0.1), (0.8, 0), (0, 0)]],
            'C': [[(1, 0.2), (0.8, 0), (0.2, 0), (0, 0.2), (0, 0.8), (0.2, 1), (0.8, 1), (1, 0.8)]],
            'D': [[(0, 0), (0, 1), (0.6, 1), (0.9, 0.8), (1, 0.5), (0.9, 0.2), (0.6, 0), (0, 0)]],
            'E': [[(1, 0), (0, 0), (0, 1), (1, 1)], [(0, 0.5), (0.7, 0.5)]],
            'F': [[(0, 0), (0, 1), (1, 1)], [(0, 0.5), (0.7, 0.5)]],
            'G': [[(1, 0.8), (0.8, 1), (0.2, 1), (0, 0.8), (0, 0.2), (0.2, 0), (0.8, 0), (1, 0.2), (1, 0.5), (0.5, 0.5)]],
            'H': [[(0, 0), (0, 1)], [(1, 0), (1, 1)], [(0, 0.5), (1, 0.5)]],
            'I': [[(0.3, 0), (0.7, 0)], [(0.5, 0), (0.5, 1)], [(0.3, 1), (0.7, 1)]],
            'J': [[(0, 0.2), (0.2, 0), (0.6, 0), (0.8, 0.2), (0.8, 1)]],
            'K': [[(0, 0), (0, 1)], [(1, 1), (0, 0.5), (1, 0)]],
            'L': [[(0, 1), (0, 0), (1, 0)]],
            'M': [[(0, 0), (0, 1), (0.5, 0.5), (1, 1), (1, 0)]],
            'N': [[(0, 0), (0, 1), (1, 0), (1, 1)]],
            'O': [[(0.2, 0), (0, 0.2), (0, 0.8), (0.2, 1), (0.8, 1), (1, 0.8), (1, 0.2), (0.8, 0), (0.2, 0)]],
            'P': [[(0, 0), (0, 1), (0.8, 1), (1, 0.8), (1, 0.6), (0.8, 0.5), (0, 0.5)]],
            'Q': [[(0.2, 0), (0, 0.2), (0, 0.8), (0.2, 1), (0.8, 1), (1, 0.8), (1, 0.2), (0.8, 0), (0.2, 0)], [(0.6, 0.3), (1, 0)]],
            'R': [[(0, 0), (0, 1), (0.8, 1), (1, 0.8), (1, 0.6), (0.8, 0.5), (0, 0.5)], [(0.5, 0.5), (1, 0)]],
            'S': [[(1, 0.8), (0.8, 1), (0.2, 1), (0, 0.8), (0, 0.6), (0.2, 0.5), (0.8, 0.5), (1, 0.4), (1, 0.2), (0.8, 0), (0.2, 0), (0, 0.2)]],
            'T': [[(0, 1), (1, 1)], [(0.5, 1), (0.5, 0)]],
            'U': [[(0, 1), (0, 0.2), (0.2, 0), (0.8, 0), (1, 0.2), (1, 1)]],
            'V': [[(0, 1), (0.5, 0), (1, 1)]],
            'W': [[(0, 1), (0.25, 0), (0.5, 0.5), (0.75, 0), (1, 1)]],
            'X': [[(0, 0), (1, 1)], [(0, 1), (1, 0)]],
            'Y': [[(0, 1), (0.5, 0.5), (1, 1)], [(0.5, 0.5), (0.5, 0)]],
            'Z': [[(0, 1), (1, 1), (0, 0), (1, 0)]],
            '0': [[(0.2, 0), (0, 0.2), (0, 0.8), (0.2, 1), (0.8, 1), (1, 0.8), (1, 0.2), (0.8, 0), (0.2, 0)], [(0.2, 0.2), (0.8, 0.8)]],
            '1': [[(0.3, 0.8), (0.5, 1), (0.5, 0)], [(0.2, 0), (0.8, 0)]],
            '2': [[(0, 0.8), (0.2, 1), (0.8, 1), (1, 0.8), (1, 0.6), (0, 0), (1, 0)]],
            '3': [[(0, 0.8), (0.2, 1), (0.8, 1), (1, 0.8), (1, 0.6), (0.8, 0.5), (0.5, 0.5)], [(0.8, 0.5), (1, 0.4), (1, 0.2), (0.8, 0), (0.2, 0), (0, 0.2)]],
            '4': [[(0.8, 0), (0.8, 1), (0, 0.3), (1, 0.3)]],
            '5': [[(1, 1), (0, 1), (0, 0.5), (0.8, 0.5), (1, 0.4), (1, 0.2), (0.8, 0), (0.2, 0), (0, 0.2)]],
            '6': [[(1, 0.8), (0.8, 1), (0.2, 1), (0, 0.8), (0, 0.2), (0.2, 0), (0.8, 0), (1, 0.2), (1, 0.4), (0.8, 0.5), (0, 0.5)]],
            '7': [[(0, 1), (1, 1), (0.3, 0)]],
            '8': [[(0.5, 0.5), (0.2, 0.5), (0, 0.7), (0, 0.8), (0.2, 1), (0.8, 1), (1, 0.8), (1, 0.7), (0.8, 0.5), (0.5, 0.5)], 
                  [(0.5, 0.5), (0.2, 0.5), (0, 0.3), (0, 0.2), (0.2, 0), (0.8, 0), (1, 0.2), (1, 0.3), (0.8, 0.5)]],
            '9': [[(0, 0.2), (0.2, 0), (0.8, 0), (1, 0.2), (1, 0.8), (0.8, 1), (0.2, 1), (0, 0.8), (0, 0.6), (0.2, 0.5), (1, 0.5)]],
            '.': [[(0.4, 0.1), (0.6, 0.1), (0.6, 0), (0.4, 0), (0.4, 0.1)]],
            ',': [[(0.5, 0.15), (0.5, 0), (0.3, -0.15)]],
            '!': [[(0.5, 1), (0.5, 0.3)], [(0.5, 0.1), (0.5, 0)]],
            '?': [[(0, 0.8), (0.2, 1), (0.8, 1), (1, 0.8), (1, 0.6), (0.5, 0.4), (0.5, 0.2)], [(0.5, 0.1), (0.5, 0)]],
            '-': [[(0.2, 0.5), (0.8, 0.5)]],
            ':': [[(0.5, 0.7), (0.5, 0.6)], [(0.5, 0.3), (0.5, 0.2)]],
        }
        
        # Calculate total width for centering
        letter_width = size * 0.7
        total_width = len(text) * letter_width
        x = -total_width / 2
        y = -size / 2
        
        for char in text.upper():
            if char == ' ':
                x += letter_width * 0.5
                continue
            
            strokes = FONT.get(char)
            if strokes:
                for stroke in strokes:
                    if len(stroke) >= 2:
                        # First point - jump to it
                        px, py = stroke[0]
                        turtle.jump_to(x + px * size * 0.6, y + py * size)
                        # Draw remaining points
                        for px, py in stroke[1:]:
                            turtle.move_to(x + px * size * 0.6, y + py * size)
            
            x += letter_width
        
        return turtle

