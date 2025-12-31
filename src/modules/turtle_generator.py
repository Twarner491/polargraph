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
        },
        'sonakinatography': {
            'name': 'Sonakinatography',
            'description': "Channa Horwitz's Sonakinatography system - rule-based generative compositions",
            'options': {
                'algorithm': {
                    'type': 'select',
                    'label': 'Algorithm',
                    'default': 'sequential_progression',
                    'options': [
                        {'value': 'sequential_progression', 'label': 'Sequential Progression'},
                        {'value': 'full_sequence', 'label': 'Full Sequence Repetition'},
                        {'value': 'rotations', 'label': 'Sequence Rotations'},
                        {'value': 'palindrome', 'label': 'Reversal Palindrome'},
                        {'value': 'canon', 'label': 'Canon Layering'},
                        {'value': 'moire', 'label': 'Moiré Angle Pairs'},
                        {'value': 'fade_out', 'label': 'Fade Out Sequence'},
                        {'value': 'language', 'label': 'Language Combinations'},
                        {'value': 'inversion', 'label': 'Numeric Inversion'},
                        {'value': 'cross_sections', 'label': '3D Cross-Sections'},
                        {'value': 'time_structure', 'label': 'Time Structure Composition'},
                        {'value': 'color_blend_grid', 'label': 'Color Blend Grid'},
                        {'value': 'prismatic_diagonal', 'label': 'Prismatic Diagonal'},
                        {'value': 'duration_lines', 'label': 'Duration Lines (8 Circle)'}
                    ]
                },
                'palette': {
                    'type': 'select',
                    'label': 'Color Palette',
                    'default': 'rainbow',
                    'options': [
                        {'value': 'rainbow', 'label': 'Rainbow (8 colors)'},
                        {'value': 'monochrome', 'label': 'Monochrome (black)'},
                        {'value': 'primary', 'label': 'Primary (red, yellow, blue)'},
                        {'value': 'warm', 'label': 'Warm (reds, oranges, yellows)'},
                        {'value': 'cool', 'label': 'Cool (blues, greens, purples)'},
                        {'value': 'earth', 'label': 'Earth (browns, greens, ochres)'},
                        {'value': 'pastel', 'label': 'Pastel (soft tones)'},
                        {'value': 'neon', 'label': 'Neon (vibrant)'}
                    ]
                },
                'source_text': {'type': 'string', 'label': 'Source Text (optional)', 'default': ''},
                'grid_cell_size': {'type': 'float', 'label': 'Cell Size (mm)', 'default': 15, 'min': 8, 'max': 30},
                'grid_height': {'type': 'int', 'label': 'Grid Height (beats)', 'default': 50, 'min': 20, 'max': 100},
                'drawing_mode': {
                    'type': 'select',
                    'label': 'Drawing Mode',
                    'default': 'hatching',
                    'options': [
                        {'value': 'hatching', 'label': 'Hatching'},
                        {'value': 'blocks', 'label': 'Blocks'},
                        {'value': 'lines', 'label': 'Lines'}
                    ]
                },
                'draw_grid': {'type': 'bool', 'label': 'Draw Grid', 'default': False},
                'starting_entity': {'type': 'int', 'label': 'Starting Entity', 'default': 1, 'min': 1, 'max': 8},
                'rotation_count': {'type': 'int', 'label': 'Rotation Count', 'default': 8, 'min': 1, 'max': 8},
                'voices': {'type': 'int', 'label': 'Voices (Canon)', 'default': 3, 'min': 2, 'max': 6},
                'offset_beats': {'type': 'int', 'label': 'Offset Beats', 'default': 8, 'min': 1, 'max': 24},
                'entity_1': {'type': 'int', 'label': 'Entity 1 (Moiré)', 'default': 3, 'min': 1, 'max': 8},
                'entity_2': {'type': 'int', 'label': 'Entity 2 (Moiré)', 'default': 7, 'min': 1, 'max': 8},
                'fade_steps': {'type': 'int', 'label': 'Fade Steps', 'default': 4, 'min': 1, 'max': 10},
                'combination_size': {'type': 'int', 'label': 'Combination Size', 'default': 3, 'min': 2, 'max': 5},
                'num_slices': {'type': 'int', 'label': 'Cross-Section Slices', 'default': 6, 'min': 2, 'max': 12},
                'hatch_density': {'type': 'float', 'label': 'Hatch Density', 'default': 1.0, 'min': 0.3, 'max': 3.0},
                'num_instruments': {'type': 'int', 'label': 'Instruments (Time Structure)', 'default': 4, 'min': 1, 'max': 8},
                'blend_grid_size': {'type': 'int', 'label': 'Blend Grid Size', 'default': 8, 'min': 4, 'max': 12},
                'diagonal_width': {'type': 'int', 'label': 'Diagonal Width', 'default': 40, 'min': 20, 'max': 80},
                'num_duration_rows': {'type': 'int', 'label': 'Duration Rows', 'default': 4, 'min': 1, 'max': 8}
            }
        }
    }
    
    def __init__(self, settings: PlotterSettings):
        self.settings = settings
    
    def list_generators(self) -> List[Dict]:
        """List available generators with their options, sorted alphabetically by name."""
        generators = [
            {'id': k, **v}
            for k, v in self.GENERATORS.items()
        ]
        return sorted(generators, key=lambda g: g['name'].lower())
    
    def generate(self, generator: str, options: Dict[str, Any] = None):
        """Generate a pattern. Returns Turtle or dict for multi-layer output."""
        import sys
        options = options or {}
        
        print(f"[TurtleGenerator] generate called: {generator}", file=sys.stderr, flush=True)
        print(f"[TurtleGenerator] options: {options}", file=sys.stderr, flush=True)
        
        generator_method = getattr(self, f'_generate_{generator}', None)
        if generator_method is None:
            raise ValueError(f"Unknown generator: {generator}")
        
        result = generator_method(options)
        print(f"[TurtleGenerator] returned multiLayer={isinstance(result, dict) and result.get('multiLayer')}", file=sys.stderr, flush=True)
        
        # Check if result is multi-layer (Sonakinatography)
        if isinstance(result, dict) and result.get('multiLayer'):
            # Multi-layer results handle their own fitting
            print(f"[TurtleGenerator] Multi-layer result with {len(result.get('layers', []))} layers", file=sys.stderr, flush=True)
            return result
        
        # Standard single turtle - fit to work area
        work_area = self.settings.get_work_area()
        margin = 20
        result.fit_to_bounds(
            work_area['left'] + margin,
            work_area['bottom'] + margin,
            work_area['right'] - margin,
            work_area['top'] - margin
        )
        
        return result
    
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
    
    # =========================================================================
    # SONAKINATOGRAPHY SYSTEM - Channa Horwitz (1968-2013)
    # =========================================================================
    
    def _generate_sonakinatography(self, options: Dict[str, Any]) -> Dict[str, Any]:
        """
        Sonakinatography generator - implements Channa Horwitz's rule-based notation system.
        Returns multi-layer output with each entity (1-8) as a separate color layer.
        """
        import sys
        algorithm = options.get('algorithm', 'sequential_progression')
        cell_size = options.get('grid_cell_size', 15)
        grid_height = int(options.get('grid_height', 50))
        drawing_mode = options.get('drawing_mode', 'hatching')
        draw_grid = options.get('draw_grid', False)
        starting_entity = int(options.get('starting_entity', 1))
        rotation_count = int(options.get('rotation_count', 8))
        voices = int(options.get('voices', 3))
        offset_beats = int(options.get('offset_beats', 8))
        entity_1 = int(options.get('entity_1', 3))
        entity_2 = int(options.get('entity_2', 7))
        fade_steps = int(options.get('fade_steps', 4))
        combination_size = int(options.get('combination_size', 3))
        num_slices = int(options.get('num_slices', 6))
        hatch_density = float(options.get('hatch_density', 1.0))
        source_text = options.get('source_text', '')
        num_instruments = int(options.get('num_instruments', 4))
        blend_grid_size = int(options.get('blend_grid_size', 8))
        diagonal_width = int(options.get('diagonal_width', 40))
        num_duration_rows = int(options.get('num_duration_rows', 4))
        
        # Convert source text to number sequence if provided
        text_sequence = self._text_to_sequence(source_text) if source_text.strip() else None
        
        print(f"[SONA] algorithm={algorithm}, grid_height={grid_height}, drawing_mode={drawing_mode}", file=sys.stderr, flush=True)
        print(f"[SONA] starting_entity={starting_entity}, rotation_count={rotation_count}, voices={voices}", file=sys.stderr, flush=True)
        print(f"[SONA] offset_beats={offset_beats}, entity_1={entity_1}, entity_2={entity_2}", file=sys.stderr, flush=True)
        print(f"[SONA] fade_steps={fade_steps}, num_slices={num_slices}, hatch_density={hatch_density}", file=sys.stderr, flush=True)
        if text_sequence:
            print(f"[SONA] text_sequence (first 20): {text_sequence[:20]}", file=sys.stderr, flush=True)
        
        grid_width = 8  # Fixed by Sonakinatography system
        palette = options.get('palette', 'rainbow')
        
        # Define color palettes
        PALETTES = {
            'rainbow': ['brown', 'blue', 'green', 'purple', 'pink', 'red', 'orange', 'yellow'],
            'monochrome': ['black', 'black', 'black', 'black', 'black', 'black', 'black', 'black'],
            'primary': ['red', 'yellow', 'blue', 'red', 'yellow', 'blue', 'red', 'yellow'],
            'warm': ['#8B0000', '#DC143C', '#FF4500', '#FF6347', '#FF7F50', '#FFA500', '#FFD700', '#FFFF00'],
            'cool': ['#00008B', '#0000CD', '#4169E1', '#1E90FF', '#00CED1', '#20B2AA', '#008B8B', '#006400'],
            'earth': ['#8B4513', '#A0522D', '#CD853F', '#D2691E', '#DEB887', '#808000', '#556B2F', '#6B8E23'],
            'pastel': ['#FFB6C1', '#FFDAB9', '#FFFACD', '#98FB98', '#B0E0E6', '#DDA0DD', '#E6E6FA', '#F0E68C'],
            'neon': ['#FF1493', '#FF00FF', '#00FFFF', '#00FF00', '#FFFF00', '#FF4500', '#FF6347', '#7FFF00']
        }
        
        entity_colors = PALETTES.get(palette, PALETTES['rainbow'])
        entity_names = ['Beat 1', 'Beat 2', 'Beat 3', 'Beat 4', 'Beat 5', 'Beat 6', 'Beat 7', 'Beat 8']
        
        # Create a turtle for each entity (1-8) plus grid
        entity_turtles = {i: Turtle() for i in range(1, 9)}
        grid_turtle = Turtle()
        
        # Calculate grid dimensions in drawing units
        total_width = grid_width * cell_size
        total_height = grid_height * cell_size
        
        # Origin offset to center the composition
        origin_x = -total_width / 2
        origin_y = -total_height / 2
        
        # Hatching angles per entity (1-8) - more variety
        entity_angles = [30, 50, 70, 90, 110, 130, 150, 170]
        # Hatching spacing per entity - scaled by hatch_density
        base_spacings = [0.6, 0.8, 1.0, 1.2, 1.4, 1.6, 1.8, 2.0]
        entity_spacings = [s / hatch_density for s in base_spacings]
        
        # Draw optional grid lines to grid turtle (black)
        if draw_grid:
            self._draw_sona_grid(grid_turtle, origin_x, origin_y, grid_width, grid_height, cell_size)
        
        # Context for multi-layer drawing
        ctx = {
            'entity_turtles': entity_turtles,
            'origin_x': origin_x,
            'origin_y': origin_y,
            'cell_size': cell_size,
            'grid_height': grid_height,
            'grid_width': grid_width,
            'drawing_mode': drawing_mode,
            'entity_angles': entity_angles,
            'entity_spacings': entity_spacings
        }
        
        # Dispatch to specific algorithm (multi-layer versions)
        # If text_sequence is provided, use it to drive the algorithm where applicable
        if algorithm == 'sequential_progression':
            self._sona_sequential_progression_multi(ctx, starting_entity, text_sequence)
        elif algorithm == 'full_sequence':
            self._sona_full_sequence_multi(ctx, starting_entity, text_sequence)
        elif algorithm == 'rotations':
            self._sona_rotations_multi(ctx, rotation_count, text_sequence)
        elif algorithm == 'palindrome':
            self._sona_palindrome_multi(ctx, starting_entity, text_sequence)
        elif algorithm == 'canon':
            self._sona_canon_multi(ctx, voices, offset_beats, starting_entity, text_sequence)
        elif algorithm == 'moire':
            self._sona_moire_multi(ctx, grid_width, entity_1, entity_2)
        elif algorithm == 'fade_out':
            self._sona_fade_out_multi(ctx, fade_steps, starting_entity, text_sequence)
        elif algorithm == 'language':
            self._sona_language_multi(ctx, grid_width, combination_size)
        elif algorithm == 'inversion':
            self._sona_inversion_multi(ctx, starting_entity, text_sequence)
        elif algorithm == 'cross_sections':
            self._sona_cross_sections_multi(ctx, num_slices, text_sequence)
        # New algorithms
        elif algorithm == 'time_structure':
            self._sona_time_structure_multi(ctx, num_instruments, text_sequence)
        elif algorithm == 'color_blend_grid':
            self._sona_color_blend_grid_multi(ctx, blend_grid_size, hatch_density)
        elif algorithm == 'prismatic_diagonal':
            self._sona_prismatic_diagonal_multi(ctx, diagonal_width, text_sequence)
        elif algorithm == 'duration_lines':
            self._sona_duration_lines_multi(ctx, num_duration_rows, text_sequence)
        
        # Build layers array
        layers = []
        
        # Add grid layer first (if it has content)
        if grid_turtle.get_lines():
            # Fit grid to work area
            work_area = self.settings.get_work_area()
            margin = 20
            grid_turtle.fit_to_bounds(
                work_area['left'] + margin, work_area['bottom'] + margin,
                work_area['right'] - margin, work_area['top'] - margin
            )
            layers.append({
                'name': 'Grid',
                'color': 'black',
                'turtle': grid_turtle
            })
        
        # Calculate combined bounds for uniform scaling
        all_points = []
        for i in range(1, 9):
            for line in entity_turtles[i].get_lines():
                all_points.extend([(p.x, p.y) for p in line.points])
        
        if all_points:
            min_x = min(p[0] for p in all_points)
            max_x = max(p[0] for p in all_points)
            min_y = min(p[1] for p in all_points)
            max_y = max(p[1] for p in all_points)
            
            work_area = self.settings.get_work_area()
            margin = 20
            target_left = work_area['left'] + margin
            target_right = work_area['right'] - margin
            target_bottom = work_area['bottom'] + margin
            target_top = work_area['top'] - margin
            
            source_width = max_x - min_x
            source_height = max_y - min_y
            target_width = target_right - target_left
            target_height = target_top - target_bottom
            
            if source_width > 0 and source_height > 0:
                scale = min(target_width / source_width, target_height / source_height)
                source_cx = (min_x + max_x) / 2
                source_cy = (min_y + max_y) / 2
                target_cx = (target_left + target_right) / 2
                target_cy = (target_bottom + target_top) / 2
                
                # Apply same transform to all entity turtles
                for i in range(1, 9):
                    entity_turtles[i].translate(-source_cx, -source_cy)
                    entity_turtles[i].scale(scale, scale)
                    entity_turtles[i].translate(target_cx, target_cy)
        
        # Add entity layers
        for i in range(1, 9):
            if entity_turtles[i].get_lines():
                layers.append({
                    'name': entity_names[i - 1],
                    'color': entity_colors[i - 1],
                    'turtle': entity_turtles[i]
                })
        
        return {'multiLayer': True, 'layers': layers}
    
    # Text to sequence conversion for Sonakinatography
    def _text_to_sequence(self, text: str) -> List[int]:
        """
        Convert text to a sequence of numbers 1-8 for Sonakinatography.
        Uses letter position mod 8 + 1, filtering non-letters.
        A/a=1, B/b=2, ... H/h=8, I/i=1, etc.
        """
        sequence = []
        for char in text:
            if char.isalpha():
                # Convert to 1-8 based on letter position
                num = ((ord(char.upper()) - ord('A')) % 8) + 1
                sequence.append(num)
        return sequence
    
    # Multi-layer versions of algorithms
    def _sona_sequential_progression_multi(self, ctx, starting_entity=1, text_sequence=None):
        """Sequential progression - cascading columns with progressive entity range."""
        # If text_sequence provided, use it to drive the pattern
        if text_sequence:
            self._sona_text_driven_pattern(ctx, text_sequence, 'sequential')
            return
            
        y = 0
        # Build up from starting_entity
        for step in range(starting_entity, 9):
            for entity in range(starting_entity, step + 1):
                if y + entity > ctx['grid_height']:
                    return
                x = entity - 1
                self._draw_entity_block_multi(ctx, x, y, entity, entity)
            y += step
        
        # Continue with full sequence
        while y < ctx['grid_height']:
            for entity in range(starting_entity, 9):
                if y + entity > ctx['grid_height']:
                    return
                x = entity - 1
                self._draw_entity_block_multi(ctx, x, y, entity, entity)
            y += 8 - starting_entity + 1
    
    def _sona_full_sequence_multi(self, ctx, starting_entity=1, text_sequence=None):
        """Full sequence repetition - repeating all entities vertically."""
        if text_sequence:
            self._sona_text_driven_pattern(ctx, text_sequence, 'full_sequence')
            return
            
        y = 0
        while y < ctx['grid_height']:
            for entity in range(starting_entity, 9):
                if y + entity > ctx['grid_height']:
                    return
                x = entity - 1
                self._draw_entity_block_multi(ctx, x, y, entity, entity)
            # Advance by the height of the tallest entity in this row
            y += 8
    
    def _sona_rotations_multi(self, ctx, rotation_count=8, text_sequence=None):
        """Sequence rotations - circular permutations of the base sequence."""
        if text_sequence:
            # Use text sequence to determine rotations
            base_sequence = text_sequence[:8] if len(text_sequence) >= 8 else text_sequence + [1] * (8 - len(text_sequence))
        else:
            base_sequence = [1, 2, 3, 4, 5, 6, 7, 8]
        y = 0
        for rotation in range(rotation_count):
            rotated = base_sequence[rotation:] + base_sequence[:rotation]
            row_max_height = 0
            for pos in range(8):
                entity = rotated[pos % len(rotated)]
                if y + entity > ctx['grid_height']:
                    return
                self._draw_entity_block_multi(ctx, pos, y, entity, entity)
                row_max_height = max(row_max_height, entity)
            y += row_max_height + 1  # Add 1 beat gap between rotations
    
    def _sona_palindrome_multi(self, ctx, starting_entity=1, text_sequence=None):
        """Reversal palindrome - forward and reverse sequences."""
        if text_sequence:
            forward = text_sequence[:8]
        else:
            forward = list(range(starting_entity, 9))
        reverse = list(reversed(forward))
        y = 0
        toggle = True
        while y < ctx['grid_height']:
            sequence = forward if toggle else reverse
            row_max_height = 0
            for pos, entity in enumerate(sequence):
                if y + entity > ctx['grid_height']:
                    return
                self._draw_entity_block_multi(ctx, pos, y, entity, entity)
                row_max_height = max(row_max_height, entity)
            y += row_max_height + 1
            toggle = not toggle
    
    def _sona_canon_multi(self, ctx, voices, offset_beats, starting_entity=1, text_sequence=None):
        """Canon layering - multiple overlapping voices with offset starts."""
        for voice in range(voices):
            y = voice * offset_beats
            # First, build up the progression
            for step in range(starting_entity, 9):
                for entity in range(starting_entity, step + 1):
                    if y + entity > ctx['grid_height']:
                        break
                    # Shift x position by voice to create separation
                    x = (entity - 1 + voice) % 8
                    self._draw_entity_block_multi(ctx, x, y, entity, entity)
                y += step
                if y >= ctx['grid_height']:
                    break
            # Then continue with full sequence
            while y < ctx['grid_height']:
                for entity in range(starting_entity, 9):
                    if y + entity > ctx['grid_height']:
                        break
                    x = (entity - 1 + voice) % 8
                    self._draw_entity_block_multi(ctx, x, y, entity, entity)
                y += 8 - starting_entity + 1
    
    def _sona_moire_multi(self, ctx, grid_width, entity_1, entity_2):
        """Moiré angle pairs - interference patterns from two line sets."""
        # 8 distinct angles for 8 entities
        angles = [0, 22.5, 45, 67.5, 90, 112.5, 135, 157.5]
        angle_1 = angles[entity_1 - 1]
        angle_2 = angles[entity_2 - 1]
        # Spacing is proportional to entity number (higher = wider spacing)
        spacing_1 = ctx['cell_size'] * (entity_1 / 3)
        spacing_2 = ctx['cell_size'] * (entity_2 / 3)
        width = grid_width * ctx['cell_size']
        height = ctx['grid_height'] * ctx['cell_size']
        # Draw two overlapping sets of parallel lines
        self._draw_parallel_lines(ctx['entity_turtles'][entity_1], ctx['origin_x'], ctx['origin_y'], width, height, angle_1, spacing_1)
        self._draw_parallel_lines(ctx['entity_turtles'][entity_2], ctx['origin_x'], ctx['origin_y'], width, height, angle_2, spacing_2)
    
    def _sona_fade_out_multi(self, ctx, fade_steps, starting_entity=1, text_sequence=None):
        """Fade out - progressively removes entities over time."""
        if text_sequence:
            # Use text sequence but fade out entities from it
            self._sona_text_driven_fade(ctx, text_sequence, fade_steps)
            return
            
        y = 0
        iteration = 0
        current_start = starting_entity
        while y < ctx['grid_height'] and current_start <= 8:
            # Draw current row
            row_max_height = 0
            for entity in range(current_start, 9):
                if y + entity > ctx['grid_height']:
                    return
                x = entity - 1
                self._draw_entity_block_multi(ctx, x, y, entity, entity)
                row_max_height = max(row_max_height, entity)
            
            y += row_max_height + 1
            iteration += 1
            
            # Every fade_steps iterations, remove an entity
            if iteration % fade_steps == 0:
                current_start += 1
    
    def _sona_language_multi(self, ctx, grid_width, combination_size):
        from itertools import combinations
        combos = list(combinations(range(8), combination_size))
        combos_per_row = grid_width
        shape_size = ctx['cell_size'] * 0.8
        
        shape_funcs = [
            self._draw_shape_rect,
            self._draw_shape_triangle,
            self._draw_shape_circle,
            self._draw_shape_diamond,
            self._draw_shape_hexagon,
            self._draw_shape_pentagon,
            self._draw_shape_star,
            self._draw_shape_cross
        ]
        
        for index, combo in enumerate(combos):
            row = index // combos_per_row
            col = index % combos_per_row
            cx = ctx['origin_x'] + (col + 0.5) * ctx['cell_size'] * (grid_width / combos_per_row)
            cy = ctx['origin_y'] + (row + 0.5) * ctx['cell_size'] * 2
            if cy + shape_size > ctx['origin_y'] + ctx['grid_height'] * ctx['cell_size']:
                return
            for i, shape_idx in enumerate(combo):
                offset_x = (i - (len(combo) - 1) / 2) * shape_size * 0.3
                turtle = ctx['entity_turtles'][shape_idx + 1]
                shape_funcs[shape_idx](turtle, cx + offset_x, cy, shape_size / len(combo))
    
    def _sona_inversion_multi(self, ctx, starting_entity=1, text_sequence=None):
        """Numeric inversion - base and inverted (9-N) sequences side by side."""
        if text_sequence:
            base = text_sequence[:8]
        else:
            base = list(range(starting_entity, 9))
        inverted = [9 - n for n in base]
        half_width = 4
        y = 0
        toggle = True
        while y < ctx['grid_height']:
            row_max_height = 0
            if toggle:
                # Left half: base, Right half: inverted
                for pos, entity in enumerate(base[:half_width]):
                    if y + entity > ctx['grid_height']:
                        break
                    self._draw_entity_block_multi(ctx, pos, y, entity, entity)
                    row_max_height = max(row_max_height, entity)
                for pos, entity in enumerate(inverted[:half_width]):
                    if y + entity > ctx['grid_height']:
                        break
                    self._draw_entity_block_multi(ctx, pos + half_width, y, entity, entity)
                    row_max_height = max(row_max_height, entity)
            else:
                # Left half: inverted, Right half: base
                for pos, entity in enumerate(inverted[half_width:] if len(inverted) > half_width else inverted):
                    if y + entity > ctx['grid_height']:
                        break
                    self._draw_entity_block_multi(ctx, pos, y, entity, entity)
                    row_max_height = max(row_max_height, entity)
                for pos, entity in enumerate(base[half_width:] if len(base) > half_width else base):
                    if y + entity > ctx['grid_height']:
                        break
                    self._draw_entity_block_multi(ctx, pos + half_width, y, entity, entity)
                    row_max_height = max(row_max_height, entity)
            y += row_max_height + 1
            toggle = not toggle
    
    def _sona_cross_sections_multi(self, ctx, num_slices=6, text_sequence=None):
        """3D cross-sections - multiple slices through the sequence space."""
        if num_slices < 1:
            num_slices = 1
        slice_spacing = max(1, ctx['grid_height'] // num_slices)
        
        # Use text sequence if provided
        sequence = text_sequence[:8] if text_sequence else list(range(1, 9))
        
        for slice_idx in range(num_slices):
            y_offset = slice_idx * slice_spacing
            y = y_offset
            for i, entity in enumerate(sequence):
                if y + entity > ctx['grid_height']:
                    break
                # Rotate x position by slice index for visual separation
                x = (i + slice_idx) % 8
                self._draw_entity_block_multi(ctx, x, y, entity, entity)
                y += entity
    
    # New algorithms inspired by Horwitz's various series
    def _sona_time_structure_multi(self, ctx, num_instruments=4, text_sequence=None):
        """
        Time Structure Composition - vertical lines with colored blocks at beat positions.
        Based on Horwitz's Time Structure Compositions showing instruments as vertical tracks.
        """
        # Use text sequence or random for event placement
        if text_sequence:
            events = [(i % num_instruments, text_sequence[i % len(text_sequence)], i) 
                      for i in range(len(text_sequence))]
        else:
            # Generate systematic events
            events = []
            beat = 0
            for _ in range(ctx['grid_height'] // 2):
                for inst in range(num_instruments):
                    entity = ((beat + inst) % 8) + 1
                    events.append((inst, entity, beat))
                    beat += entity // 2 + 1
                    if beat >= ctx['grid_height']:
                        break
                if beat >= ctx['grid_height']:
                    break
        
        cell_size = ctx['cell_size']
        track_width = (8 * cell_size) / num_instruments
        
        # Draw vertical track lines (thin)
        for inst in range(num_instruments):
            x_center = ctx['origin_x'] + (inst + 0.5) * track_width
            entity = (inst % 8) + 1
            turtle = ctx['entity_turtles'][entity]
            turtle.draw_line(x_center, ctx['origin_y'], 
                           x_center, ctx['origin_y'] + ctx['grid_height'] * cell_size)
        
        # Draw blocks at event positions
        for inst, entity, beat in events:
            if beat + entity > ctx['grid_height']:
                continue
            x = (inst * track_width / cell_size)
            # Draw a small block at the event position
            self._draw_entity_block_multi(ctx, x, beat, entity, entity)
    
    def _sona_color_blend_grid_multi(self, ctx, grid_size=8, hatch_density=1.0):
        """
        Color Blend Grid - an NxN grid where each cell has dual-color hatching.
        Creates blended color effects through overlapping hatched patterns.
        """
        cell_size = ctx['cell_size']
        spacing = 1.5 / hatch_density
        
        for row in range(grid_size):
            for col in range(grid_size):
                # Each cell blends two colors based on position
                color1 = (row % 8) + 1
                color2 = (col % 8) + 1
                
                px = ctx['origin_x'] + col * cell_size
                py = ctx['origin_y'] + row * cell_size
                
                # Draw hatching in first color at one angle
                angle1 = 45
                self._draw_hatching(ctx['entity_turtles'][color1], 
                                  px, py, cell_size, cell_size, angle1, spacing)
                
                # Draw hatching in second color at perpendicular angle
                angle2 = 135
                self._draw_hatching(ctx['entity_turtles'][color2], 
                                  px, py, cell_size, cell_size, angle2, spacing)
    
    def _sona_prismatic_diagonal_multi(self, ctx, diagonal_width=40, text_sequence=None):
        """
        Prismatic Diagonal - rainbow diagonal stripes creating complex patterns.
        Based on Horwitz's prismatic diagonal compositions.
        """
        cell_size = ctx['cell_size']
        total_width = 8 * cell_size
        total_height = ctx['grid_height'] * cell_size
        
        # Create diagonal rainbow stripes
        stripe_width = cell_size * 0.8
        
        # Number of diagonal stripes to fill the space
        num_stripes = int((total_width + total_height) / stripe_width) + 1
        
        for stripe_idx in range(num_stripes):
            # Determine entity/color based on stripe position
            if text_sequence:
                entity = text_sequence[stripe_idx % len(text_sequence)]
            else:
                entity = (stripe_idx % 8) + 1
            
            turtle = ctx['entity_turtles'][entity]
            
            # Calculate diagonal line positions (top-left to bottom-right)
            offset = stripe_idx * stripe_width - total_height
            
            # Draw diagonal stripe as series of parallel lines
            for sub in range(int(stripe_width / 2)):
                x1 = ctx['origin_x'] + offset + sub
                y1 = ctx['origin_y'] + total_height
                x2 = ctx['origin_x'] + offset + total_height + sub
                y2 = ctx['origin_y']
                
                # Clip to bounds
                if x1 < ctx['origin_x']:
                    y1 = y1 - (ctx['origin_x'] - x1)
                    x1 = ctx['origin_x']
                if x2 > ctx['origin_x'] + total_width:
                    y2 = y2 + (x2 - (ctx['origin_x'] + total_width))
                    x2 = ctx['origin_x'] + total_width
                
                if x1 < ctx['origin_x'] + total_width and x2 > ctx['origin_x']:
                    if y1 > ctx['origin_y'] and y2 < ctx['origin_y'] + total_height:
                        turtle.draw_line(x1, y1, x2, y2)
    
    def _sona_duration_lines_multi(self, ctx, num_rows=4, text_sequence=None):
        """
        Duration Lines (8 Circle) - horizontal notation with rectangles of varying widths.
        Rectangle width = duration value (1-8).
        """
        cell_size = ctx['cell_size']
        row_height = ctx['grid_height'] * cell_size / num_rows
        
        for row in range(num_rows):
            y_center = ctx['origin_y'] + (row + 0.5) * row_height
            
            # Determine sequence for this row
            if text_sequence:
                # Use portion of text sequence for this row
                start_idx = row * 12
                sequence = text_sequence[start_idx:start_idx + 12]
                if not sequence:
                    sequence = text_sequence[:12]
            else:
                # Use standard or rotated sequence
                base = [1, 2, 3, 4, 5, 6, 7, 8]
                rotated = base[row % 8:] + base[:row % 8]
                sequence = rotated + rotated[:4]  # Extend to 12 elements
            
            # Draw horizontal line for track
            line_y = y_center
            first_turtle = ctx['entity_turtles'][sequence[0] if sequence else 1]
            first_turtle.draw_line(ctx['origin_x'], line_y, 
                                  ctx['origin_x'] + 8 * cell_size, line_y)
            
            # Draw duration rectangles along the line
            x = ctx['origin_x']
            rect_height = row_height * 0.4
            
            for duration in sequence:
                if duration < 1:
                    duration = 1
                if duration > 8:
                    duration = 8
                    
                rect_width = duration * cell_size * 0.4
                
                turtle = ctx['entity_turtles'][duration]
                # Draw rectangle centered on the line
                turtle.draw_rect(x, line_y - rect_height / 2, rect_width, rect_height)
                
                x += rect_width + cell_size * 0.2  # Add gap between rectangles
                if x > ctx['origin_x'] + 8 * cell_size:
                    break
    
    def _sona_text_driven_pattern(self, ctx, text_sequence, pattern_type='sequential'):
        """Draw a pattern driven by the text sequence."""
        y = 0
        x = 0
        for i, entity in enumerate(text_sequence):
            if y + entity > ctx['grid_height']:
                # Move to next column or wrap
                x = (x + 1) % 8
                y = 0
            if y + entity > ctx['grid_height']:
                break
            self._draw_entity_block_multi(ctx, x, y, entity, entity)
            y += entity
    
    def _sona_text_driven_fade(self, ctx, text_sequence, fade_steps):
        """Text-driven pattern with progressive fade."""
        y = 0
        iteration = 0
        min_entity = 1
        
        for entity in text_sequence:
            if entity < min_entity:
                continue  # Skip faded-out entities
            if y + entity > ctx['grid_height']:
                break
            
            x = entity - 1
            self._draw_entity_block_multi(ctx, x, y, entity, entity)
            y += entity
            iteration += 1
            
            if iteration % fade_steps == 0:
                min_entity += 1
                if min_entity > 8:
                    break
    
    def _draw_entity_block_multi(self, ctx, x, y, duration, entity):
        """Draw an entity block to the appropriate entity turtle."""
        turtle = ctx['entity_turtles'][entity]
        px = ctx['origin_x'] + x * ctx['cell_size']
        py = ctx['origin_y'] + y * ctx['cell_size']
        width = ctx['cell_size']
        height = duration * ctx['cell_size']
        
        if ctx['drawing_mode'] == 'lines':
            cx = px + width / 2
            turtle.draw_line(cx, py, cx, py + height)
        elif ctx['drawing_mode'] == 'blocks':
            turtle.draw_rect(px, py, width, height)
            fill_spacing = 1.5
            fy = fill_spacing
            while fy < height:
                turtle.draw_line(px, py + fy, px + width, py + fy)
                fy += fill_spacing
        else:
            # Hatching mode
            angle = ctx['entity_angles'][entity - 1]
            spacing = ctx['entity_spacings'][entity - 1]
            self._draw_hatching(turtle, px, py, width, height, angle, spacing)
    
    def _draw_sona_grid(self, turtle: Turtle, origin_x: float, origin_y: float, 
                        grid_width: int, grid_height: int, cell_size: float):
        """Draw the underlying grid structure."""
        # Vertical lines
        for x in range(grid_width + 1):
            px = origin_x + x * cell_size
            turtle.draw_line(px, origin_y, px, origin_y + grid_height * cell_size)
        # Horizontal lines
        for y in range(grid_height + 1):
            py = origin_y + y * cell_size
            turtle.draw_line(origin_x, py, origin_x + grid_width * cell_size, py)
    
    def _draw_entity_block(self, turtle: Turtle, origin_x: float, origin_y: float, 
                           cell_size: float, x: int, y: int, duration: int, entity: int,
                           mode: str, angles: List[float], spacings: List[float]):
        """Draw an entity block at grid position."""
        px = origin_x + x * cell_size
        py = origin_y + y * cell_size
        width = cell_size
        height = duration * cell_size
        
        if mode == 'lines':
            # Simple vertical line spanning the duration
            cx = px + width / 2
            turtle.draw_line(cx, py, cx, py + height)
        elif mode == 'blocks':
            # Draw filled rectangle outline
            turtle.draw_rect(px, py, width, height)
            # Add internal fill lines
            fill_spacing = 1.5
            fy = fill_spacing
            while fy < height:
                turtle.draw_line(px, py + fy, px + width, py + fy)
                fy += fill_spacing
        else:
            # Hatching mode (default)
            angle = angles[entity - 1]
            spacing = spacings[entity - 1]
            self._draw_hatching(turtle, px, py, width, height, angle, spacing)
    
    def _draw_hatching(self, turtle: Turtle, x: float, y: float, 
                       width: float, height: float, angle_deg: float, spacing: float):
        """Fill a rectangle with parallel hatching lines."""
        angle_rad = math.radians(angle_deg)
        cos_a = math.cos(angle_rad)
        sin_a = math.sin(angle_rad)
        
        # Calculate the diagonal length needed to cover the rectangle
        diagonal = math.sqrt(width * width + height * height)
        num_lines = int(diagonal / spacing) * 2
        
        # Generate lines perpendicular to the angle
        center_x = x + width / 2
        center_y = y + height / 2
        
        for i in range(-num_lines, num_lines + 1):
            offset = i * spacing
            
            # Line perpendicular to angle, offset by spacing
            perp_x = math.cos(angle_rad + math.pi / 2) * offset
            perp_y = math.sin(angle_rad + math.pi / 2) * offset
            
            # Start and end points along the angle direction
            start_x = center_x + perp_x - cos_a * diagonal
            start_y = center_y + perp_y - sin_a * diagonal
            end_x = center_x + perp_x + cos_a * diagonal
            end_y = center_y + perp_y + sin_a * diagonal
            
            # Clip to rectangle bounds
            clipped = self._clip_line_to_rect(start_x, start_y, end_x, end_y, x, y, x + width, y + height)
            if clipped:
                turtle.draw_line(clipped[0], clipped[1], clipped[2], clipped[3])
    
    def _clip_line_to_rect(self, x1: float, y1: float, x2: float, y2: float,
                           min_x: float, min_y: float, max_x: float, max_y: float):
        """Clip a line to a rectangle using Cohen-Sutherland algorithm."""
        INSIDE, LEFT, RIGHT, BOTTOM, TOP = 0, 1, 2, 4, 8
        
        def compute_code(x, y):
            code = INSIDE
            if x < min_x:
                code |= LEFT
            elif x > max_x:
                code |= RIGHT
            if y < min_y:
                code |= BOTTOM
            elif y > max_y:
                code |= TOP
            return code
        
        code1 = compute_code(x1, y1)
        code2 = compute_code(x2, y2)
        
        while True:
            if not (code1 | code2):
                return (x1, y1, x2, y2)
            elif code1 & code2:
                return None
            else:
                code_out = code1 if code1 else code2
                
                if code_out & TOP:
                    x = x1 + (x2 - x1) * (max_y - y1) / (y2 - y1) if y2 != y1 else x1
                    y = max_y
                elif code_out & BOTTOM:
                    x = x1 + (x2 - x1) * (min_y - y1) / (y2 - y1) if y2 != y1 else x1
                    y = min_y
                elif code_out & RIGHT:
                    y = y1 + (y2 - y1) * (max_x - x1) / (x2 - x1) if x2 != x1 else y1
                    x = max_x
                else:
                    y = y1 + (y2 - y1) * (min_x - x1) / (x2 - x1) if x2 != x1 else y1
                    x = min_x
                
                if code_out == code1:
                    x1, y1 = x, y
                    code1 = compute_code(x1, y1)
                else:
                    x2, y2 = x, y
                    code2 = compute_code(x2, y2)
    
    # Algorithm 1: Sequential Progression
    def _sona_sequential_progression(self, turtle: Turtle, origin_x: float, origin_y: float,
                                      cell_size: float, grid_height: int, mode: str,
                                      angles: List[float], spacings: List[float]):
        y = 0
        
        for step in range(1, 9):
            for entity in range(1, step + 1):
                if y + entity > grid_height:
                    return
                x = entity - 1
                self._draw_entity_block(turtle, origin_x, origin_y, cell_size, x, y, entity, entity, mode, angles, spacings)
            y += step
        
        # Continue pattern to fill grid
        while y < grid_height:
            for entity in range(1, 9):
                if y + entity > grid_height:
                    return
                x = entity - 1
                self._draw_entity_block(turtle, origin_x, origin_y, cell_size, x, y, entity, entity, mode, angles, spacings)
            y += 8
    
    # Algorithm 2: Full Sequence Repetition
    def _sona_full_sequence(self, turtle: Turtle, origin_x: float, origin_y: float,
                            cell_size: float, grid_height: int, mode: str,
                            angles: List[float], spacings: List[float]):
        y = 0
        
        while y < grid_height:
            for entity in range(1, 9):
                if y + entity > grid_height:
                    return
                x = entity - 1
                self._draw_entity_block(turtle, origin_x, origin_y, cell_size, x, y, entity, entity, mode, angles, spacings)
            y += 8
    
    # Algorithm 3: Sequence Rotations
    def _sona_rotations(self, turtle: Turtle, origin_x: float, origin_y: float,
                        cell_size: float, grid_height: int, mode: str,
                        angles: List[float], spacings: List[float]):
        base_sequence = [1, 2, 3, 4, 5, 6, 7, 8]
        y = 0
        
        for rotation in range(8):
            rotated = base_sequence[rotation:] + base_sequence[:rotation]
            
            for pos in range(8):
                entity = rotated[pos]
                if y + entity > grid_height:
                    return
                self._draw_entity_block(turtle, origin_x, origin_y, cell_size, pos, y, entity, entity, mode, angles, spacings)
            
            y += max(rotated) + 2
    
    # Algorithm 4: Reversal Palindrome
    def _sona_palindrome(self, turtle: Turtle, origin_x: float, origin_y: float,
                         cell_size: float, grid_height: int, mode: str,
                         angles: List[float], spacings: List[float]):
        forward = [1, 2, 3, 4, 5, 6, 7, 8]
        reverse = [8, 7, 6, 5, 4, 3, 2, 1]
        y = 0
        
        while y < grid_height:
            for pos in range(8):
                entity = forward[pos]
                if y + entity > grid_height:
                    return
                self._draw_entity_block(turtle, origin_x, origin_y, cell_size, pos, y, entity, entity, mode, angles, spacings)
            y += 10
            
            for pos in range(8):
                entity = reverse[pos]
                if y + entity > grid_height:
                    return
                self._draw_entity_block(turtle, origin_x, origin_y, cell_size, pos, y, entity, entity, mode, angles, spacings)
            y += 10
    
    # Algorithm 5: Canon Layering
    def _sona_canon(self, turtle: Turtle, origin_x: float, origin_y: float,
                    cell_size: float, grid_height: int, mode: str,
                    angles: List[float], spacings: List[float], voices: int, offset_beats: int):
        for voice in range(voices):
            y = voice * offset_beats
            
            for step in range(1, 9):
                for entity in range(1, step + 1):
                    if y + entity > grid_height:
                        break
                    x = (entity - 1 + voice) % 8
                    self._draw_entity_block(turtle, origin_x, origin_y, cell_size, x, y, entity, entity, mode, angles, spacings)
                y += step
                if y >= grid_height:
                    break
            
            while y < grid_height:
                for entity in range(1, 9):
                    if y + entity > grid_height:
                        break
                    x = (entity - 1 + voice) % 8
                    self._draw_entity_block(turtle, origin_x, origin_y, cell_size, x, y, entity, entity, mode, angles, spacings)
                y += 8
    
    # Algorithm 6: Moiré Angle Pairs
    def _sona_moire(self, turtle: Turtle, origin_x: float, origin_y: float,
                    cell_size: float, grid_width: int, grid_height: int,
                    entity_1: int, entity_2: int):
        angles = [0, 22.5, 45, 67.5, 90, 112.5, 135, 157.5]
        
        angle_1 = angles[entity_1 - 1]
        angle_2 = angles[entity_2 - 1]
        
        spacing_1 = cell_size * (entity_1 / 4)
        spacing_2 = cell_size * (entity_2 / 4)
        
        width = grid_width * cell_size
        height = grid_height * cell_size
        
        self._draw_parallel_lines(turtle, origin_x, origin_y, width, height, angle_1, spacing_1)
        self._draw_parallel_lines(turtle, origin_x, origin_y, width, height, angle_2, spacing_2)
    
    def _draw_parallel_lines(self, turtle: Turtle, x: float, y: float,
                             width: float, height: float, angle_deg: float, spacing: float):
        """Draw parallel lines across a rectangle at a given angle."""
        angle_rad = math.radians(angle_deg)
        cos_a = math.cos(angle_rad)
        sin_a = math.sin(angle_rad)
        
        diagonal = math.sqrt(width * width + height * height)
        num_lines = int(diagonal / spacing) * 2
        
        center_x = x + width / 2
        center_y = y + height / 2
        
        for i in range(-num_lines, num_lines + 1):
            offset = i * spacing
            
            perp_x = math.cos(angle_rad + math.pi / 2) * offset
            perp_y = math.sin(angle_rad + math.pi / 2) * offset
            
            start_x = center_x + perp_x - cos_a * diagonal
            start_y = center_y + perp_y - sin_a * diagonal
            end_x = center_x + perp_x + cos_a * diagonal
            end_y = center_y + perp_y + sin_a * diagonal
            
            clipped = self._clip_line_to_rect(start_x, start_y, end_x, end_y, x, y, x + width, y + height)
            if clipped:
                turtle.draw_line(clipped[0], clipped[1], clipped[2], clipped[3])
    
    # Algorithm 7: Fade Out Sequence
    def _sona_fade_out(self, turtle: Turtle, origin_x: float, origin_y: float,
                       cell_size: float, grid_height: int, mode: str,
                       angles: List[float], spacings: List[float], fade_steps: int):
        y = 0
        iteration = 0
        
        while y < grid_height:
            entities_to_remove = iteration // fade_steps
            start_entity = min(entities_to_remove + 1, 8)
            
            if start_entity > 8:
                break
            
            for entity in range(start_entity, 9):
                if y + entity > grid_height:
                    return
                x = entity - 1
                
                fade_mult = 1 + (iteration / fade_steps) * 0.5
                adjusted_spacings = [s * fade_mult for s in spacings]
                
                self._draw_entity_block(turtle, origin_x, origin_y, cell_size, x, y, entity, entity, mode, angles, adjusted_spacings)
            
            max_duration = 8 - start_entity + 1
            y += max_duration + 1
            iteration += 1
    
    # Algorithm 8: Language Combinations
    def _sona_language(self, turtle: Turtle, origin_x: float, origin_y: float,
                       cell_size: float, grid_width: int, grid_height: int, combination_size: int):
        from itertools import combinations
        
        shape_funcs = [
            self._draw_shape_rect,
            self._draw_shape_triangle,
            self._draw_shape_circle,
            self._draw_shape_diamond,
            self._draw_shape_hexagon,
            self._draw_shape_pentagon,
            self._draw_shape_star,
            self._draw_shape_cross
        ]
        
        combos = list(combinations(range(8), combination_size))
        combos_per_row = grid_width
        shape_size = cell_size * 0.8
        
        for index, combo in enumerate(combos):
            row = index // combos_per_row
            col = index % combos_per_row
            
            cx = origin_x + (col + 0.5) * cell_size * (grid_width / combos_per_row)
            cy = origin_y + (row + 0.5) * cell_size * 2
            
            if cy + shape_size > origin_y + grid_height * cell_size:
                return
            
            for i, shape_idx in enumerate(combo):
                offset_x = (i - (len(combo) - 1) / 2) * shape_size * 0.3
                shape_funcs[shape_idx](turtle, cx + offset_x, cy, shape_size / len(combo))
    
    def _draw_shape_rect(self, turtle: Turtle, cx: float, cy: float, size: float):
        half = size / 2
        turtle.draw_rect(cx - half, cy - half, size, size)
    
    def _draw_shape_triangle(self, turtle: Turtle, cx: float, cy: float, size: float):
        half = size / 2
        turtle.jump_to(cx, cy + half)
        turtle.move_to(cx - half, cy - half)
        turtle.move_to(cx + half, cy - half)
        turtle.move_to(cx, cy + half)
    
    def _draw_shape_circle(self, turtle: Turtle, cx: float, cy: float, size: float):
        turtle.draw_circle(cx, cy, size / 2, 24)
    
    def _draw_shape_diamond(self, turtle: Turtle, cx: float, cy: float, size: float):
        half = size / 2
        turtle.jump_to(cx, cy + half)
        turtle.move_to(cx + half, cy)
        turtle.move_to(cx, cy - half)
        turtle.move_to(cx - half, cy)
        turtle.move_to(cx, cy + half)
    
    def _draw_shape_hexagon(self, turtle: Turtle, cx: float, cy: float, size: float):
        radius = size / 2
        for i in range(6):
            angle = math.pi / 3 * i - math.pi / 2
            x = cx + math.cos(angle) * radius
            y = cy + math.sin(angle) * radius
            if i == 0:
                turtle.jump_to(x, y)
            else:
                turtle.move_to(x, y)
        turtle.move_to(cx + math.cos(-math.pi / 2) * radius, cy + math.sin(-math.pi / 2) * radius)
    
    def _draw_shape_pentagon(self, turtle: Turtle, cx: float, cy: float, size: float):
        radius = size / 2
        for i in range(5):
            angle = math.pi * 2 / 5 * i - math.pi / 2
            x = cx + math.cos(angle) * radius
            y = cy + math.sin(angle) * radius
            if i == 0:
                turtle.jump_to(x, y)
            else:
                turtle.move_to(x, y)
        turtle.move_to(cx + math.cos(-math.pi / 2) * radius, cy + math.sin(-math.pi / 2) * radius)
    
    def _draw_shape_star(self, turtle: Turtle, cx: float, cy: float, size: float):
        outer_r = size / 2
        inner_r = outer_r * 0.4
        for i in range(10):
            angle = math.pi / 5 * i - math.pi / 2
            r = outer_r if i % 2 == 0 else inner_r
            x = cx + math.cos(angle) * r
            y = cy + math.sin(angle) * r
            if i == 0:
                turtle.jump_to(x, y)
            else:
                turtle.move_to(x, y)
        turtle.move_to(cx + math.cos(-math.pi / 2) * outer_r, cy + math.sin(-math.pi / 2) * outer_r)
    
    def _draw_shape_cross(self, turtle: Turtle, cx: float, cy: float, size: float):
        third = size / 3
        half = size / 2
        turtle.draw_rect(cx - third / 2, cy - half, third, size)
        turtle.draw_rect(cx - half, cy - third / 2, size, third)
    
    # Algorithm 9: Numeric Inversion
    def _sona_inversion(self, turtle: Turtle, origin_x: float, origin_y: float,
                        cell_size: float, grid_height: int, mode: str,
                        angles: List[float], spacings: List[float]):
        base = [1, 2, 3, 4, 5, 6, 7, 8]
        inverted = [9 - n for n in base]
        y = 0
        
        while y < grid_height:
            for pos in range(4):
                entity = base[pos]
                if y + entity > grid_height:
                    break
                self._draw_entity_block(turtle, origin_x, origin_y, cell_size, pos, y, entity, entity, mode, angles, spacings)
            
            for pos in range(4):
                entity = inverted[pos]
                if y + entity > grid_height:
                    break
                self._draw_entity_block(turtle, origin_x, origin_y, cell_size, pos + 4, y, entity, entity, mode, angles, spacings)
            
            y += 10
            
            for pos in range(4):
                entity = inverted[pos + 4]
                if y + entity > grid_height:
                    break
                self._draw_entity_block(turtle, origin_x, origin_y, cell_size, pos, y, entity, entity, mode, angles, spacings)
            
            for pos in range(4):
                entity = base[pos + 4]
                if y + entity > grid_height:
                    break
                self._draw_entity_block(turtle, origin_x, origin_y, cell_size, pos + 4, y, entity, entity, mode, angles, spacings)
            
            y += 10
    
    # Algorithm 10: 3D Cross-Sections
    def _sona_cross_sections(self, turtle: Turtle, origin_x: float, origin_y: float,
                             cell_size: float, grid_height: int, mode: str,
                             angles: List[float], spacings: List[float]):
        num_slices = 6
        slice_spacing = grid_height // num_slices
        
        for slice_idx in range(num_slices):
            y_offset = slice_idx * slice_spacing
            y = y_offset
            
            for entity in range(1, 9):
                if y + entity > grid_height:
                    break
                x = (entity - 1 + slice_idx) % 8
                self._draw_entity_block(turtle, origin_x, origin_y, cell_size, x, y, entity, entity, mode, angles, spacings)
                y += entity

