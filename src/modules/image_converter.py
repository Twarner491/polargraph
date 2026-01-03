"""
Image to path converters.
Implements various algorithms to convert raster images to vector paths.
"""

import math
from typing import Dict, List, Any
from PIL import Image
import numpy as np

from .turtle import Turtle
from .plotter_settings import PlotterSettings


class ImageConverter:
    """Converts images to Turtle paths using various algorithms."""
    
    CONVERTERS = {
        'spiral': {
            'name': 'Spiral',
            'description': 'Converts image to a continuous spiral pattern',
            'options': {
                'step_size': {'type': 'float', 'default': 2.0, 'min': 0.5, 'max': 10},
                'to_corners': {'type': 'bool', 'default': False}
            }
        },
        'crosshatch': {
            'name': 'Crosshatch',
            'description': 'Creates crosshatch lines based on image darkness',
            'options': {
                'angle': {'type': 'float', 'default': 45, 'min': 0, 'max': 180},
                'step_size': {'type': 'float', 'default': 2.0, 'min': 0.5, 'max': 10},
                'passes': {'type': 'int', 'default': 4, 'min': 1, 'max': 8}
            }
        },
        'pulse': {
            'name': 'Pulse Lines',
            'description': 'Horizontal lines with amplitude based on darkness',
            'options': {
                'step_size': {'type': 'float', 'default': 3.0, 'min': 1, 'max': 10},
                'amplitude': {'type': 'float', 'default': 5.0, 'min': 1, 'max': 20}
            }
        },
        'stipple': {
            'name': 'Stipple',
            'description': 'Weighted Voronoi stippling',
            'options': {
                'dots': {'type': 'int', 'default': 2000, 'min': 100, 'max': 10000},
                'iterations': {'type': 'int', 'default': 50, 'min': 10, 'max': 200}
            }
        },
        'squares': {
            'name': 'Concentric Squares',
            'description': 'Nested squares based on image brightness',
            'options': {
                'box_size': {'type': 'float', 'default': 8.0, 'min': 2, 'max': 20},
                'cutoff': {'type': 'int', 'default': 128, 'min': 0, 'max': 255}
            }
        },
        'wander': {
            'name': 'Random Walk',
            'description': 'Random wandering lines following dark areas',
            'options': {
                'step_size': {'type': 'float', 'default': 1.0, 'min': 0.5, 'max': 5},
                'turns': {'type': 'int', 'default': 5000, 'min': 100, 'max': 50000}
            }
        },
        'trace': {
            'name': 'Trace Outline',
            'description': 'Traces object outlines with optional fill pattern',
            'options': {
                'trace_mode': {
                    'type': 'select',
                    'default': 'outline',
                    'label': 'Trace Mode',
                    'options': [
                        {'value': 'outline', 'label': 'Outline (Single Color)'},
                        {'value': 'multicolor', 'label': 'Multi-Color (8 Pens)'},
                        {'value': 'tricolor', 'label': 'Tri-Color (3 Pens)'}
                    ]
                },
                'threshold': {'type': 'int', 'default': 128, 'min': 0, 'max': 255, 'label': 'Edge Threshold'},
                'fill_enabled': {'type': 'bool', 'default': False, 'label': 'Fill Objects'},
                'fill_pattern': {
                    'type': 'select',
                    'default': 'horizontal',
                    'label': 'Fill Pattern',
                    'options': [
                        {'value': 'horizontal', 'label': 'Horizontal Lines'},
                        {'value': 'vertical', 'label': 'Vertical Lines'},
                        {'value': 'diagonal', 'label': 'Diagonal Lines'},
                        {'value': 'crosshatch', 'label': 'Crosshatch'}
                    ]
                },
                'fill_density': {'type': 'float', 'default': 50, 'min': 10, 'max': 100, 'label': 'Fill Density (%)'}
            }
        },
        'halftone': {
            'name': 'Halftone',
            'description': 'Full color reproduction using color separation',
            'options': {
                'color_mode': {
                    'type': 'select',
                    'default': 'cmyk',
                    'label': 'Color Mode',
                    'options': [
                        {'value': 'cmyk', 'label': 'CMYK'},
                        {'value': 'rgb', 'label': 'RGB'},
                        {'value': 'grayscale', 'label': 'Grayscale'},
                        {'value': 'monotone', 'label': 'Monotone'},
                        {'value': 'duotone', 'label': 'Duotone'},
                        {'value': 'primary', 'label': 'Primary (RYB)'},
                        {'value': 'warm_cool', 'label': 'Warm/Cool'}
                    ]
                },
                'mono_color': {
                    'type': 'select',
                    'default': 'blue',
                    'label': 'Monotone Color',
                    'options': [
                        {'value': 'black', 'label': 'Black'},
                        {'value': 'blue', 'label': 'Blue'},
                        {'value': 'red', 'label': 'Red'},
                        {'value': 'green', 'label': 'Green'},
                        {'value': 'purple', 'label': 'Purple'},
                        {'value': 'pink', 'label': 'Pink'},
                        {'value': 'orange', 'label': 'Orange'},
                        {'value': 'yellow', 'label': 'Yellow'},
                        {'value': 'brown', 'label': 'Brown'}
                    ]
                },
                'duo_color_dark': {
                    'type': 'select',
                    'default': 'blue',
                    'label': 'Duotone Dark',
                    'options': [
                        {'value': 'black', 'label': 'Black'},
                        {'value': 'blue', 'label': 'Blue'},
                        {'value': 'red', 'label': 'Red'},
                        {'value': 'green', 'label': 'Green'},
                        {'value': 'purple', 'label': 'Purple'},
                        {'value': 'pink', 'label': 'Pink'},
                        {'value': 'orange', 'label': 'Orange'},
                        {'value': 'yellow', 'label': 'Yellow'},
                        {'value': 'brown', 'label': 'Brown'}
                    ]
                },
                'duo_color_light': {
                    'type': 'select',
                    'default': 'orange',
                    'label': 'Duotone Light',
                    'options': [
                        {'value': 'black', 'label': 'Black'},
                        {'value': 'blue', 'label': 'Blue'},
                        {'value': 'red', 'label': 'Red'},
                        {'value': 'green', 'label': 'Green'},
                        {'value': 'purple', 'label': 'Purple'},
                        {'value': 'pink', 'label': 'Pink'},
                        {'value': 'orange', 'label': 'Orange'},
                        {'value': 'yellow', 'label': 'Yellow'},
                        {'value': 'brown', 'label': 'Brown'}
                    ]
                },
                'method': {
                    'type': 'select',
                    'default': 'dither',
                    'label': 'Halftone Method',
                    'options': [
                        {'value': 'dither', 'label': 'Floyd-Steinberg'},
                        {'value': 'crosshatch', 'label': 'Crosshatch'},
                        {'value': 'horizontal', 'label': 'Horizontal Lines'},
                        {'value': 'dots', 'label': 'Dot Pattern'}
                    ]
                },
                'density': {'type': 'float', 'default': 50, 'min': 10, 'max': 100, 'label': 'Line Density (%)'},
                'white_threshold': {'type': 'int', 'default': 250, 'min': 200, 'max': 255, 'label': 'Paper White Threshold'}
            }
        }
    }
    
    def __init__(self, settings: PlotterSettings):
        self.settings = settings
    
    def list_converters(self) -> List[Dict]:
        """List available converters with their options."""
        return [
            {'id': k, **v}
            for k, v in self.CONVERTERS.items()
        ]
    
    def convert(self, filepath: str, algorithm: str, options: Dict[str, Any] = None):
        """Convert an image using the specified algorithm.
        
        Returns either a Turtle object or a dict with 'layers' for multi-layer output.
        """
        options = options or {}
        
        # Load and prepare image (grayscale for most algorithms)
        img_gray = Image.open(filepath).convert('L')
        
        # Get work area
        work_area = self.settings.get_work_area()
        
        # Resize image to fit work area while maintaining aspect ratio
        img_aspect = img_gray.width / img_gray.height
        work_aspect = work_area['width'] / work_area['height']
        
        if img_aspect > work_aspect:
            # Image is wider
            new_width = int(work_area['width'])
            new_height = int(new_width / img_aspect)
        else:
            # Image is taller
            new_height = int(work_area['height'])
            new_width = int(new_height * img_aspect)
        
        img_gray = img_gray.resize((new_width, new_height), Image.Resampling.LANCZOS)
        gray_array = np.array(img_gray)
        
        # Calculate offset to center
        offset_x = -new_width / 2
        offset_y = -new_height / 2
        
        # For color modes (trace color, halftone), load RGB image
        if algorithm == 'halftone' or \
           (algorithm == 'trace' and options.get('trace_mode', 'outline') != 'outline'):
            img_rgb = Image.open(filepath).convert('RGB')
            img_rgb = img_rgb.resize((new_width, new_height), Image.Resampling.LANCZOS)
            rgb_array = np.array(img_rgb)
            
            if algorithm == 'halftone':
                return self._convert_halftone(gray_array, rgb_array, offset_x, offset_y, options)
            else:
                return self._convert_trace_color(gray_array, rgb_array, offset_x, offset_y, options)
        
        # Convert using selected algorithm
        converter_method = getattr(self, f'_convert_{algorithm}', None)
        if converter_method is None:
            raise ValueError(f"Unknown converter: {algorithm}")
        
        return converter_method(gray_array, offset_x, offset_y, options)
    
    def _sample(self, img: np.ndarray, x: float, y: float, offset_x: float, offset_y: float) -> int:
        """Sample image at a point (image coordinates)."""
        # Convert from drawing coordinates to image coordinates
        ix = int(x - offset_x)
        iy = int(img.shape[0] - 1 - (y - offset_y))  # Flip Y
        
        if 0 <= ix < img.shape[1] and 0 <= iy < img.shape[0]:
            return int(img[iy, ix])
        return 255  # White outside bounds
    
    def _convert_spiral(self, img: np.ndarray, offset_x: float, offset_y: float, 
                        options: Dict[str, Any]) -> Turtle:
        """Spiral conversion - draws a continuous spiral modulated by image darkness."""
        turtle = Turtle()
        
        step_size = options.get('step_size', 2.0)
        to_corners = options.get('to_corners', False)
        
        h, w = img.shape
        cx, cy = offset_x + w / 2, offset_y + h / 2
        
        if to_corners:
            max_r = math.sqrt((w/2)**2 + (h/2)**2)
        else:
            max_r = min(w, h) / 2
        
        r = max_r
        tool_diameter = step_size
        
        while r > tool_diameter:
            circumference = 2 * math.pi * r
            steps = int(circumference / tool_diameter)
            
            for i in range(steps):
                p = i / steps
                angle = 2 * math.pi * p
                r1 = r - tool_diameter * p
                
                fx = math.cos(angle) * r1
                fy = math.sin(angle) * r1
                
                x = cx + fx
                y = cy + fy
                
                # Check if within image bounds
                ix = int(fx + w/2)
                iy = int(h/2 - fy)
                
                if 0 <= ix < w and 0 <= iy < h:
                    brightness = img[iy, ix]
                    # Multi-pass levels
                    level = 128 + 64 * math.sin(angle * 4)
                    
                    if brightness < level:
                        turtle.pen_down()
                    else:
                        turtle.pen_up_cmd()
                else:
                    turtle.pen_up_cmd()
                
                turtle.move_to(x, y)
            
            r -= tool_diameter
        
        return turtle
    
    def _convert_crosshatch(self, img: np.ndarray, offset_x: float, offset_y: float,
                            options: Dict[str, Any]) -> Turtle:
        """Crosshatch conversion - parallel lines at angles based on darkness."""
        turtle = Turtle()
        
        step_size = options.get('step_size', 2.0)
        passes = options.get('passes', 4)
        base_angle = options.get('angle', 45)
        
        h, w = img.shape
        max_len = math.sqrt(w**2 + h**2)
        
        for pass_num in range(passes):
            angle = math.radians(base_angle + 180 * pass_num / passes)
            dx = math.cos(angle)
            dy = math.sin(angle)
            
            level = 255 * (1 + pass_num) / (passes + 1)
            
            for a in np.arange(-max_len, max_len, step_size):
                # Line perpendicular to angle
                px = dx * a
                py = dy * a
                
                # Line endpoints
                x0 = px - dy * max_len + offset_x + w/2
                y0 = py + dx * max_len + offset_y + h/2
                x1 = px + dy * max_len + offset_x + w/2
                y1 = py - dx * max_len + offset_y + h/2
                
                self._convert_along_line(turtle, img, x0, y0, x1, y1, 
                                         step_size, level, offset_x, offset_y)
        
        return turtle
    
    def _convert_along_line(self, turtle: Turtle, img: np.ndarray,
                            x0: float, y0: float, x1: float, y1: float,
                            step_size: float, cutoff: float,
                            offset_x: float, offset_y: float):
        """Draw along a line, raising/lowering pen based on image brightness."""
        dx = x1 - x0
        dy = y1 - y0
        dist = math.sqrt(dx*dx + dy*dy)
        
        if dist < step_size:
            return
        
        steps = int(dist / step_size)
        pen_was_down = not turtle.pen_up
        
        for i in range(steps + 1):
            t = i / steps
            x = x0 + dx * t
            y = y0 + dy * t
            
            brightness = self._sample(img, x, y, offset_x, offset_y)
            
            if brightness < cutoff:
                if turtle.pen_up:
                    turtle.jump_to(x, y)
                else:
                    turtle.move_to(x, y)
            else:
                if not turtle.pen_up:
                    turtle.pen_up_cmd()
                # Update position for pen-up travel
                turtle.position.x = x
                turtle.position.y = y
    
    def _convert_pulse(self, img: np.ndarray, offset_x: float, offset_y: float,
                       options: Dict[str, Any]) -> Turtle:
        """Pulse line conversion - horizontal lines with amplitude based on darkness."""
        turtle = Turtle()
        
        step_size = options.get('step_size', 3.0)
        max_amplitude = options.get('amplitude', 5.0)
        
        h, w = img.shape
        
        row = 0
        y = offset_y
        
        while y < offset_y + h:
            # Alternate direction
            if row % 2 == 0:
                x_range = np.arange(offset_x, offset_x + w, 1)
            else:
                x_range = np.arange(offset_x + w, offset_x, -1)
            
            first = True
            for x in x_range:
                # Sample brightness
                ix = int(x - offset_x)
                iy = int(h - 1 - (y - offset_y))
                
                if 0 <= ix < w and 0 <= iy < h:
                    brightness = img[iy, ix]
                    # Darker = more amplitude
                    amplitude = max_amplitude * (255 - brightness) / 255
                    
                    # Sine wave modulation
                    wave = math.sin(x * 0.5) * amplitude
                    py = y + wave
                    
                    if first:
                        turtle.jump_to(x, py)
                        first = False
                    else:
                        turtle.move_to(x, py)
            
            y += step_size
            row += 1
        
        return turtle
    
    def _convert_squares(self, img: np.ndarray, offset_x: float, offset_y: float,
                         options: Dict[str, Any]) -> Turtle:
        """Concentric squares based on image brightness."""
        turtle = Turtle()
        
        box_size = options.get('box_size', 8.0)
        cutoff = options.get('cutoff', 128)
        
        h, w = img.shape
        half_box = box_size / 2
        
        y = offset_y + half_box
        row = 0
        
        while y < offset_y + h - half_box:
            if row % 2 == 0:
                x_iter = np.arange(offset_x + half_box, offset_x + w - half_box, box_size)
            else:
                x_iter = np.arange(offset_x + w - half_box, offset_x + half_box, -box_size)
            
            for x in x_iter:
                # Sample center brightness
                brightness = self._sample(img, x, y, offset_x, offset_y)
                
                if brightness < cutoff:
                    # Calculate box size based on darkness
                    size = half_box * (cutoff - brightness) / cutoff
                    
                    if size > 0.5:
                        # Draw concentric squares
                        turtle.jump_to(x - size, y - size)
                        turtle.move_to(x + size, y - size)
                        turtle.move_to(x + size, y + size)
                        turtle.move_to(x - size, y + size)
                        turtle.move_to(x - size, y - size)
            
            y += box_size
            row += 1
        
        return turtle
    
    def _convert_stipple(self, img: np.ndarray, offset_x: float, offset_y: float,
                         options: Dict[str, Any]) -> Turtle:
        """Weighted Voronoi stippling."""
        turtle = Turtle()
        
        num_dots = options.get('dots', 2000)
        iterations = options.get('iterations', 50)
        
        h, w = img.shape
        
        # Invert image (darker = higher density)
        density = 255 - img
        density = density.astype(float) / 255.0
        
        # Initialize random points weighted by density
        points = self._weighted_sample_points(density, num_dots)
        
        # Lloyd relaxation (simplified)
        for _ in range(min(iterations, 20)):  # Limit iterations for speed
            points = self._lloyd_relax(points, density, w, h)
        
        # Draw dots as small circles
        for px, py in points:
            x = px + offset_x
            y = (h - py) + offset_y  # Flip Y
            
            # Draw small dot
            turtle.jump_to(x, y)
            turtle.move_to(x + 0.3, y)
        
        return turtle
    
    def _weighted_sample_points(self, density: np.ndarray, num_points: int) -> List[tuple]:
        """Sample points weighted by density."""
        h, w = density.shape
        
        # Normalize density to probability distribution
        probs = density.flatten()
        probs = probs / probs.sum()
        
        # Sample indices
        indices = np.random.choice(len(probs), size=num_points, p=probs)
        
        # Convert to coordinates
        points = []
        for idx in indices:
            y = idx // w
            x = idx % w
            # Add small random offset
            points.append((x + np.random.random() - 0.5, y + np.random.random() - 0.5))
        
        return points
    
    def _lloyd_relax(self, points: List[tuple], density: np.ndarray, 
                     w: int, h: int) -> List[tuple]:
        """Simple Lloyd relaxation step."""
        # This is a simplified version - full Voronoi would be more accurate
        new_points = []
        
        for px, py in points:
            # Sample neighborhood and move toward center of mass
            samples = []
            for _ in range(10):
                ox = px + (np.random.random() - 0.5) * 10
                oy = py + (np.random.random() - 0.5) * 10
                
                if 0 <= int(ox) < w and 0 <= int(oy) < h:
                    weight = density[int(oy), int(ox)]
                    samples.append((ox, oy, weight))
            
            if samples:
                total_weight = sum(s[2] for s in samples) + 0.001
                new_x = sum(s[0] * s[2] for s in samples) / total_weight
                new_y = sum(s[1] * s[2] for s in samples) / total_weight
                new_points.append((new_x, new_y))
            else:
                new_points.append((px, py))
        
        return new_points
    
    def _convert_wander(self, img: np.ndarray, offset_x: float, offset_y: float,
                        options: Dict[str, Any]) -> Turtle:
        """Random walk that follows dark areas."""
        turtle = Turtle()
        
        step_size = options.get('step_size', 1.0)
        max_turns = options.get('turns', 5000)
        
        h, w = img.shape
        
        # Start at center
        x = offset_x + w / 2
        y = offset_y + h / 2
        angle = np.random.random() * 2 * math.pi
        
        turtle.jump_to(x, y)
        
        for _ in range(max_turns):
            # Sample current brightness
            brightness = self._sample(img, x, y, offset_x, offset_y)
            
            # Darker areas = straighter lines
            turn_amount = (brightness / 255.0) * math.pi / 2
            angle += (np.random.random() - 0.5) * turn_amount
            
            # Move
            nx = x + math.cos(angle) * step_size
            ny = y + math.sin(angle) * step_size
            
            # Bounce off edges
            if nx < offset_x or nx > offset_x + w:
                angle = math.pi - angle
                nx = x + math.cos(angle) * step_size
            if ny < offset_y or ny > offset_y + h:
                angle = -angle
                ny = y + math.sin(angle) * step_size
            
            x, y = nx, ny
            
            if self._sample(img, x, y, offset_x, offset_y) < 200:
                # Draw in dark areas
                if turtle.pen_up:
                    turtle.jump_to(x, y)
                else:
                    turtle.move_to(x, y)
            else:
                # Skip light areas
                turtle.pen_up_cmd()
                turtle.position.x = x
                turtle.position.y = y
        
        return turtle
    
    def _convert_trace(self, img: np.ndarray, offset_x: float, offset_y: float,
                       options: Dict[str, Any]) -> Turtle:
        """Trace object outlines with optional fill pattern."""
        turtle = Turtle()
        
        threshold = options.get('threshold', 128)
        fill_enabled = options.get('fill_enabled', False)
        fill_pattern = options.get('fill_pattern', 'horizontal')
        fill_density = options.get('fill_density', 50)
        
        h, w = img.shape
        
        # Create binary mask (objects are dark areas)
        binary = (img < threshold).astype(np.uint8)
        
        # Draw outline using edge-following scan lines (no cross-gap connections)
        self._draw_outline_segments(turtle, binary, w, h, offset_x, offset_y)
        
        # Fill if enabled
        if fill_enabled:
            self._fill_shape(turtle, binary, w, h, offset_x, offset_y, 
                            fill_pattern, fill_density)
        
        return turtle
    
    def _is_edge_pixel(self, binary: np.ndarray, x: int, y: int, w: int, h: int) -> bool:
        """Check if a pixel is on the edge of a shape."""
        if binary[y, x] != 1:
            return False
        
        # Check 4-connectivity neighbors
        neighbors = [(1, 0), (-1, 0), (0, 1), (0, -1)]
        for dx, dy in neighbors:
            nx, ny = x + dx, y + dy
            if nx < 0 or nx >= w or ny < 0 or ny >= h or binary[ny, nx] == 0:
                return True
        return False
    
    def _draw_outline_segments(self, turtle: Turtle, binary: np.ndarray,
                               w: int, h: int, offset_x: float, offset_y: float):
        """Draw outline as separate segments without connecting across gaps."""
        # Draw horizontal edge segments
        for row in range(h):
            in_edge = False
            start_x = None
            
            for col in range(w):
                is_edge = self._is_edge_pixel(binary, col, row, w, h)
                
                if is_edge:
                    if not in_edge:
                        in_edge = True
                        start_x = col
                else:
                    if in_edge:
                        # Draw segment from start_x to col-1
                        x1 = start_x + offset_x
                        x2 = (col - 1) + offset_x
                        y = (h - 1 - row) + offset_y
                        
                        if x2 > x1:
                            turtle.jump_to(x1, y)
                            turtle.move_to(x2, y)
                        in_edge = False
            
            if in_edge:
                x1 = start_x + offset_x
                x2 = (w - 1) + offset_x
                y = (h - 1 - row) + offset_y
                if x2 > x1:
                    turtle.jump_to(x1, y)
                    turtle.move_to(x2, y)
        
        # Draw vertical edge segments
        for col in range(w):
            in_edge = False
            start_y = None
            
            for row in range(h):
                is_edge = self._is_edge_pixel(binary, col, row, w, h)
                
                if is_edge:
                    if not in_edge:
                        in_edge = True
                        start_y = row
                else:
                    if in_edge:
                        x = col + offset_x
                        y1 = (h - 1 - start_y) + offset_y
                        y2 = (h - 1 - (row - 1)) + offset_y
                        
                        if abs(y2 - y1) > 1:
                            turtle.jump_to(x, y1)
                            turtle.move_to(x, y2)
                        in_edge = False
            
            if in_edge:
                x = col + offset_x
                y1 = (h - 1 - start_y) + offset_y
                y2 = offset_y
                if abs(y2 - y1) > 1:
                    turtle.jump_to(x, y1)
                    turtle.move_to(x, y2)
    
    def _fill_shape(self, turtle: Turtle, binary: np.ndarray, 
                    w: int, h: int, offset_x: float, offset_y: float,
                    pattern: str, density: float):
        """Fill the binary mask with the specified pattern."""
        # Calculate line spacing based on density (higher density = closer lines)
        spacing = max(2, int(100 / density * 3))
        
        if pattern == 'horizontal':
            self._fill_horizontal(turtle, binary, w, h, offset_x, offset_y, spacing)
        elif pattern == 'vertical':
            self._fill_vertical(turtle, binary, w, h, offset_x, offset_y, spacing)
        elif pattern == 'diagonal':
            self._fill_diagonal(turtle, binary, w, h, offset_x, offset_y, spacing, 45)
        elif pattern == 'crosshatch':
            self._fill_horizontal(turtle, binary, w, h, offset_x, offset_y, spacing)
            self._fill_vertical(turtle, binary, w, h, offset_x, offset_y, spacing)
    
    def _fill_horizontal(self, turtle: Turtle, binary: np.ndarray,
                         w: int, h: int, offset_x: float, offset_y: float, spacing: int):
        """Fill with horizontal lines - each segment is separate."""
        for row in range(0, h, spacing):
            in_shape = False
            start_x = None
            
            for col in range(w):
                if binary[row, col] == 1:
                    if not in_shape:
                        in_shape = True
                        start_x = col
                else:
                    if in_shape:
                        # End of segment - draw it
                        x1 = start_x + offset_x
                        x2 = (col - 1) + offset_x
                        y = (h - 1 - row) + offset_y
                        
                        if x2 > x1:
                            turtle.jump_to(x1, y)
                            turtle.move_to(x2, y)
                        in_shape = False
            
            # Handle segment ending at edge
            if in_shape:
                x1 = start_x + offset_x
                x2 = (w - 1) + offset_x
                y = (h - 1 - row) + offset_y
                if x2 > x1:
                    turtle.jump_to(x1, y)
                    turtle.move_to(x2, y)
    
    def _fill_vertical(self, turtle: Turtle, binary: np.ndarray,
                       w: int, h: int, offset_x: float, offset_y: float, spacing: int):
        """Fill with vertical lines - each segment is separate."""
        for col in range(0, w, spacing):
            in_shape = False
            start_y = None
            
            for row in range(h):
                if binary[row, col] == 1:
                    if not in_shape:
                        in_shape = True
                        start_y = row
                else:
                    if in_shape:
                        # End of segment - draw it
                        x = col + offset_x
                        y1 = (h - 1 - start_y) + offset_y
                        y2 = (h - 1 - (row - 1)) + offset_y
                        
                        if abs(y2 - y1) > 1:
                            turtle.jump_to(x, y1)
                            turtle.move_to(x, y2)
                        in_shape = False
            
            if in_shape:
                x = col + offset_x
                y1 = (h - 1 - start_y) + offset_y
                y2 = offset_y
                if abs(y2 - y1) > 1:
                    turtle.jump_to(x, y1)
                    turtle.move_to(x, y2)
    
    def _fill_diagonal(self, turtle: Turtle, binary: np.ndarray,
                       w: int, h: int, offset_x: float, offset_y: float, 
                       spacing: int, angle: float):
        """Fill with diagonal lines - each segment is separate."""
        rad = math.radians(angle)
        cos_a = math.cos(rad)
        sin_a = math.sin(rad)
        
        # Calculate the range of diagonal lines needed
        max_dist = int(math.sqrt(w**2 + h**2))
        
        for d in range(-max_dist, max_dist, spacing):
            in_shape = False
            start_pt = None
            last_valid_pt = None
            
            # Sample along the diagonal line
            for t in range(-max_dist, max_dist, 1):
                px = int(d * cos_a - t * sin_a + w/2)
                py = int(d * sin_a + t * cos_a + h/2)
                
                if 0 <= px < w and 0 <= py < h:
                    if binary[py, px] == 1:
                        if not in_shape:
                            in_shape = True
                            start_pt = (px, py)
                        last_valid_pt = (px, py)
                    else:
                        if in_shape and start_pt and last_valid_pt:
                            # Draw segment
                            x1, y1 = start_pt
                            x2, y2 = last_valid_pt
                            dx1 = x1 + offset_x
                            dy1 = (h - 1 - y1) + offset_y
                            dx2 = x2 + offset_x
                            dy2 = (h - 1 - y2) + offset_y
                            
                            if abs(dx2 - dx1) > 1 or abs(dy2 - dy1) > 1:
                                turtle.jump_to(dx1, dy1)
                                turtle.move_to(dx2, dy2)
                        in_shape = False
                        start_pt = None
                        last_valid_pt = None
                else:
                    if in_shape and start_pt and last_valid_pt:
                        x1, y1 = start_pt
                        x2, y2 = last_valid_pt
                        dx1 = x1 + offset_x
                        dy1 = (h - 1 - y1) + offset_y
                        dx2 = x2 + offset_x
                        dy2 = (h - 1 - y2) + offset_y
                        
                        if abs(dx2 - dx1) > 1 or abs(dy2 - dy1) > 1:
                            turtle.jump_to(dx1, dy1)
                            turtle.move_to(dx2, dy2)
                    in_shape = False
                    start_pt = None
                    last_valid_pt = None
            
            # Handle segment at end
            if in_shape and start_pt and last_valid_pt:
                x1, y1 = start_pt
                x2, y2 = last_valid_pt
                dx1 = x1 + offset_x
                dy1 = (h - 1 - y1) + offset_y
                dx2 = x2 + offset_x
                dy2 = (h - 1 - y2) + offset_y
                
                if abs(dx2 - dx1) > 1 or abs(dy2 - dy1) > 1:
                    turtle.jump_to(dx1, dy1)
                    turtle.move_to(dx2, dy2)
    
    # =========================================================================
    # Color Trace Methods (Multi-layer output)
    # =========================================================================
    
    # Available pen colors (RGB values)
    PEN_COLORS = {
        'brown':  (84, 69, 72),
        'black':  (59, 54, 60),
        'blue':   (89, 137, 231),
        'green':  (63, 173, 169),
        'purple': (101, 61, 125),
        'pink':   (238, 155, 181),
        'red':    (244, 93, 78),
        'orange': (176, 100, 81),
        'yellow': (247, 165, 21)
    }
    
    # Predefined color sets for different modes
    MULTICOLOR_PENS = ['red', 'orange', 'yellow', 'green', 'blue', 'purple', 'pink', 'brown']
    TRICOLOR_PENS = ['red', 'blue', 'yellow']
    CMYK_PENS = {
        'cyan': 'blue',
        'magenta': 'pink', 
        'yellow': 'yellow',
        'black': 'black'
    }
    
    def _convert_trace_color(self, gray: np.ndarray, rgb: np.ndarray,
                             offset_x: float, offset_y: float,
                             options: Dict[str, Any]) -> Dict:
        """Convert image using color trace modes - returns multi-layer output."""
        trace_mode = options.get('trace_mode', 'multicolor')
        threshold = options.get('threshold', 128)
        fill_enabled = options.get('fill_enabled', False)
        fill_pattern = options.get('fill_pattern', 'horizontal')
        fill_density = options.get('fill_density', 50)
        
        h, w = gray.shape
        
        if trace_mode == 'multicolor':
            return self._trace_multicolor(rgb, gray, w, h, offset_x, offset_y,
                                          threshold, fill_enabled, fill_pattern, fill_density)
        elif trace_mode == 'tricolor':
            return self._trace_tricolor(rgb, gray, w, h, offset_x, offset_y,
                                        threshold, fill_enabled, fill_pattern, fill_density)
        elif trace_mode == 'cmyk_dither':
            return self._trace_cmyk_dither(rgb, gray, w, h, offset_x, offset_y,
                                           threshold, fill_density)
        elif trace_mode == 'cmyk_crosshatch':
            return self._trace_cmyk_crosshatch(rgb, gray, w, h, offset_x, offset_y,
                                               threshold, fill_density)
        else:
            # Fallback to outline
            turtle = Turtle()
            binary = (gray < threshold).astype(np.uint8)
            self._draw_outline_segments(turtle, binary, w, h, offset_x, offset_y)
            return turtle
    
    def _find_closest_pen(self, r: int, g: int, b: int, pen_list: List[str]) -> str:
        """Find the closest pen color to the given RGB value."""
        min_dist = float('inf')
        closest = pen_list[0]
        
        for pen in pen_list:
            pr, pg, pb = self.PEN_COLORS[pen]
            dist = (r - pr)**2 + (g - pg)**2 + (b - pb)**2
            if dist < min_dist:
                min_dist = dist
                closest = pen
        
        return closest
    
    def _rgb_to_cmyk(self, r: int, g: int, b: int) -> tuple:
        """Convert RGB (0-255) to CMYK (0-1)."""
        r_norm = r / 255.0
        g_norm = g / 255.0
        b_norm = b / 255.0
        
        k = 1 - max(r_norm, g_norm, b_norm)
        if k == 1:
            return (0, 0, 0, 1)
        
        c = (1 - r_norm - k) / (1 - k)
        m = (1 - g_norm - k) / (1 - k)
        y = (1 - b_norm - k) / (1 - k)
        
        return (c, m, y, k)
    
    def _is_white_pixel(self, r: int, g: int, b: int, threshold: int = 240) -> bool:
        """Check if a pixel is close to white (paper background)."""
        return r >= threshold and g >= threshold and b >= threshold
    
    def _trace_multicolor(self, rgb: np.ndarray, gray: np.ndarray,
                          w: int, h: int, offset_x: float, offset_y: float,
                          threshold: int, fill_enabled: bool,
                          fill_pattern: str, fill_density: float) -> Dict:
        """Multi-color trace - map each pixel to closest of 8 pen colors."""
        # White threshold for background detection
        white_thresh = max(threshold, 240)
        
        # Create a mask for each pen color
        color_masks = {pen: np.zeros((h, w), dtype=np.uint8) for pen in self.MULTICOLOR_PENS}
        
        # For each pixel, find closest pen color and mark in that mask
        for row in range(h):
            for col in range(w):
                r, g, b = rgb[row, col]
                # Skip white/near-white pixels (paper background)
                if self._is_white_pixel(r, g, b, white_thresh):
                    continue
                
                closest = self._find_closest_pen(r, g, b, self.MULTICOLOR_PENS)
                color_masks[closest][row, col] = 1
        
        # Create layers
        layers = []
        for pen in self.MULTICOLOR_PENS:
            mask = color_masks[pen]
            if np.sum(mask) == 0:
                continue  # Skip empty layers
            
            turtle = Turtle()
            
            # Draw outlines for this color
            self._draw_outline_segments(turtle, mask, w, h, offset_x, offset_y)
            
            # Fill if enabled
            if fill_enabled:
                self._fill_shape(turtle, mask, w, h, offset_x, offset_y,
                                fill_pattern, fill_density)
            
            if turtle.get_paths():  # Only add if there are paths
                layers.append({
                    'name': f'Trace ({pen.capitalize()})',
                    'color': pen,
                    'turtle': turtle
                })
        
        return {'layers': layers}
    
    def _trace_tricolor(self, rgb: np.ndarray, gray: np.ndarray,
                        w: int, h: int, offset_x: float, offset_y: float,
                        threshold: int, fill_enabled: bool,
                        fill_pattern: str, fill_density: float) -> Dict:
        """Tri-color trace - map each pixel to closest of 3 primary colors."""
        # White threshold for background detection
        white_thresh = max(threshold, 240)
        
        # Create a mask for each pen color
        color_masks = {pen: np.zeros((h, w), dtype=np.uint8) for pen in self.TRICOLOR_PENS}
        
        # For each pixel, find closest pen color
        for row in range(h):
            for col in range(w):
                r, g, b = rgb[row, col]
                # Skip white/near-white pixels (paper background)
                if self._is_white_pixel(r, g, b, white_thresh):
                    continue
                
                closest = self._find_closest_pen(r, g, b, self.TRICOLOR_PENS)
                color_masks[closest][row, col] = 1
        
        # Create layers
        layers = []
        for pen in self.TRICOLOR_PENS:
            mask = color_masks[pen]
            if np.sum(mask) == 0:
                continue
            
            turtle = Turtle()
            self._draw_outline_segments(turtle, mask, w, h, offset_x, offset_y)
            
            if fill_enabled:
                self._fill_shape(turtle, mask, w, h, offset_x, offset_y,
                                fill_pattern, fill_density)
            
            if turtle.get_paths():
                layers.append({
                    'name': f'Trace ({pen.capitalize()})',
                    'color': pen,
                    'turtle': turtle
                })
        
        return {'layers': layers}
    
    def _trace_cmyk_dither(self, rgb: np.ndarray, gray: np.ndarray,
                           w: int, h: int, offset_x: float, offset_y: float,
                           threshold: int, fill_density: float) -> Dict:
        """CMYK dithering - Floyd-Steinberg dithering for each CMYK channel."""
        # White threshold - pixels with all RGB > this are treated as paper
        white_thresh = max(threshold, 240)
        
        # Convert entire image to CMYK
        cmyk = np.zeros((h, w, 4), dtype=np.float32)
        for row in range(h):
            for col in range(w):
                r, g, b = rgb[row, col]
                # Skip only pure white/near-white pixels (paper background)
                if self._is_white_pixel(r, g, b, white_thresh):
                    continue
                cmyk[row, col] = self._rgb_to_cmyk(r, g, b)
        
        # Apply Floyd-Steinberg dithering to each channel
        dithered = {}
        for idx, channel in enumerate(['cyan', 'magenta', 'yellow', 'black']):
            channel_data = cmyk[:, :, idx].copy()
            dithered[channel] = self._floyd_steinberg_dither(channel_data)
        
        # Calculate spacing based on density
        spacing = max(2, int(100 / fill_density * 3))
        
        # Create layers for each CMYK channel
        layers = []
        for cmyk_channel, pen in self.CMYK_PENS.items():
            mask = dithered[cmyk_channel]
            if np.sum(mask) == 0:
                continue
            
            turtle = Turtle()
            
            # Draw dithered points as horizontal line segments
            for row in range(0, h, spacing):
                in_segment = False
                start_x = None
                
                for col in range(w):
                    if mask[row, col] == 1:
                        if not in_segment:
                            in_segment = True
                            start_x = col
                    else:
                        if in_segment:
                            x1 = start_x + offset_x
                            x2 = (col - 1) + offset_x
                            y = (h - 1 - row) + offset_y
                            if x2 > x1:
                                turtle.jump_to(x1, y)
                                turtle.move_to(x2, y)
                            in_segment = False
                
                if in_segment:
                    x1 = start_x + offset_x
                    x2 = (w - 1) + offset_x
                    y = (h - 1 - row) + offset_y
                    if x2 > x1:
                        turtle.jump_to(x1, y)
                        turtle.move_to(x2, y)
            
            if turtle.get_paths():
                layers.append({
                    'name': f'CMYK ({cmyk_channel.capitalize()})',
                    'color': pen,
                    'turtle': turtle
                })
        
        return {'layers': layers}
    
    def _floyd_steinberg_dither(self, channel: np.ndarray) -> np.ndarray:
        """Apply Floyd-Steinberg dithering to a single channel (0-1 float)."""
        h, w = channel.shape
        result = np.zeros((h, w), dtype=np.uint8)
        data = channel.copy()
        
        for row in range(h):
            for col in range(w):
                old_val = data[row, col]
                new_val = 1 if old_val > 0.5 else 0
                result[row, col] = new_val
                error = old_val - new_val
                
                # Distribute error to neighbors
                if col + 1 < w:
                    data[row, col + 1] += error * 7 / 16
                if row + 1 < h:
                    if col > 0:
                        data[row + 1, col - 1] += error * 3 / 16
                    data[row + 1, col] += error * 5 / 16
                    if col + 1 < w:
                        data[row + 1, col + 1] += error * 1 / 16
        
        return result
    
    def _trace_cmyk_crosshatch(self, rgb: np.ndarray, gray: np.ndarray,
                               w: int, h: int, offset_x: float, offset_y: float,
                               threshold: int, fill_density: float) -> Dict:
        """CMYK crosshatch - each CMYK channel drawn with crosshatch at angle/density."""
        # White threshold - pixels with all RGB > this are treated as paper
        white_thresh = max(threshold, 240)
        
        # Convert image to CMYK
        cmyk = np.zeros((h, w, 4), dtype=np.float32)
        for row in range(h):
            for col in range(w):
                r, g, b = rgb[row, col]
                # Skip only pure white/near-white pixels (paper background)
                if self._is_white_pixel(r, g, b, white_thresh):
                    continue
                cmyk[row, col] = self._rgb_to_cmyk(r, g, b)
        
        # Base spacing from density
        base_spacing = max(3, int(100 / fill_density * 4))
        
        # Define angles for each channel (creates color mixing effect)
        angles = {
            'cyan': 15,
            'magenta': 75,
            'yellow': 0,
            'black': 45
        }
        
        layers = []
        for cmyk_channel, pen in self.CMYK_PENS.items():
            channel_data = cmyk[:, :, list(self.CMYK_PENS.keys()).index(cmyk_channel)]
            
            # Skip only if channel is completely empty
            if np.max(channel_data) < 0.001:
                continue
            
            turtle = Turtle()
            angle = angles[cmyk_channel]
            
            # Draw crosshatch lines based on channel intensity
            self._draw_intensity_crosshatch(turtle, channel_data, w, h,
                                           offset_x, offset_y, base_spacing, angle)
            
            if turtle.get_paths():
                layers.append({
                    'name': f'CMYK ({cmyk_channel.capitalize()})',
                    'color': pen,
                    'turtle': turtle
                })
        
        return {'layers': layers}
    
    def _draw_intensity_crosshatch(self, turtle: Turtle, intensity: np.ndarray,
                                   w: int, h: int, offset_x: float, offset_y: float,
                                   base_spacing: int, angle: float):
        """Draw crosshatch lines where intensity determines line density."""
        rad = math.radians(angle)
        cos_a = math.cos(rad)
        sin_a = math.sin(rad)
        
        max_dist = int(math.sqrt(w**2 + h**2))
        
        for d in range(-max_dist, max_dist, base_spacing):
            in_segment = False
            start_pt = None
            last_pt = None
            
            for t in range(-max_dist, max_dist, 1):
                px = int(d * cos_a - t * sin_a + w/2)
                py = int(d * sin_a + t * cos_a + h/2)
                
                if 0 <= px < w and 0 <= py < h:
                    ink = intensity[py, px]
                    # Use ordered dithering pattern - threshold varies by position
                    # This creates halftone-like patterns where even low ink values get representation
                    dither_matrix = [
                        [0.0, 0.5, 0.125, 0.625],
                        [0.75, 0.25, 0.875, 0.375],
                        [0.1875, 0.6875, 0.0625, 0.5625],
                        [0.9375, 0.4375, 0.8125, 0.3125]
                    ]
                    threshold = dither_matrix[py % 4][px % 4]
                    draw = ink > threshold
                    
                    if draw:
                        if not in_segment:
                            in_segment = True
                            start_pt = (px, py)
                        last_pt = (px, py)
                    else:
                        if in_segment and start_pt and last_pt:
                            x1, y1 = start_pt
                            x2, y2 = last_pt
                            dx1 = x1 + offset_x
                            dy1 = (h - 1 - y1) + offset_y
                            dx2 = x2 + offset_x
                            dy2 = (h - 1 - y2) + offset_y
                            
                            if abs(dx2 - dx1) > 1 or abs(dy2 - dy1) > 1:
                                turtle.jump_to(dx1, dy1)
                                turtle.move_to(dx2, dy2)
                        in_segment = False
                        start_pt = None
                        last_pt = None
                else:
                    if in_segment and start_pt and last_pt:
                        x1, y1 = start_pt
                        x2, y2 = last_pt
                        dx1 = x1 + offset_x
                        dy1 = (h - 1 - y1) + offset_y
                        dx2 = x2 + offset_x
                        dy2 = (h - 1 - y2) + offset_y
                        
                        if abs(dx2 - dx1) > 1 or abs(dy2 - dy1) > 1:
                            turtle.jump_to(dx1, dy1)
                            turtle.move_to(dx2, dy2)
                    in_segment = False
                    start_pt = None
                    last_pt = None
            
            # Handle end of line
            if in_segment and start_pt and last_pt:
                x1, y1 = start_pt
                x2, y2 = last_pt
                dx1 = x1 + offset_x
                dy1 = (h - 1 - y1) + offset_y
                dx2 = x2 + offset_x
                dy2 = (h - 1 - y2) + offset_y
                
                if abs(dx2 - dx1) > 1 or abs(dy2 - dy1) > 1:
                    turtle.jump_to(dx1, dy1)
                    turtle.move_to(dx2, dy2)
    
    # =========================================================================
    # Full Image Halftone Converter
    # =========================================================================
    
    # Color mode definitions
    COLOR_MODES = {
        'cmyk': {
            'channels': ['cyan', 'magenta', 'yellow', 'black'],
            'pens': {'cyan': 'blue', 'magenta': 'pink', 'yellow': 'yellow', 'black': 'black'},
            'angles': {'cyan': 15, 'magenta': 75, 'yellow': 0, 'black': 45}
        },
        'rgb': {
            'channels': ['red', 'green', 'blue'],
            'pens': {'red': 'red', 'green': 'green', 'blue': 'blue'},
            'angles': {'red': 15, 'green': 75, 'blue': 45}
        },
        'grayscale': {
            'channels': ['black'],
            'pens': {'black': 'black'},
            'angles': {'black': 45}
        },
        'primary': {
            'channels': ['red', 'yellow', 'blue'],
            'pens': {'red': 'red', 'yellow': 'yellow', 'blue': 'blue'},
            'angles': {'red': 15, 'yellow': 0, 'blue': 75}
        },
        'warm_cool': {
            'channels': ['warm', 'cool'],
            'pens': {'warm': 'orange', 'cool': 'blue'},
            'angles': {'warm': 30, 'cool': 60}
        }
    }
    
    def _convert_halftone(self, gray: np.ndarray, rgb: np.ndarray,
                          offset_x: float, offset_y: float,
                          options: Dict[str, Any]) -> Dict:
        """Convert full image using selected halftone method and color mode."""
        h, w = gray.shape
        color_mode = options.get('color_mode', 'cmyk')
        method = options.get('method', 'dither')
        density = options.get('density', 50)
        white_thresh = options.get('white_threshold', 250)
        
        # Flip image vertically to correct orientation
        rgb_flipped = np.flipud(rgb)
        gray_flipped = np.flipud(gray)
        
        # Handle monotone and duotone with user-selected colors
        if color_mode == 'monotone':
            mono_color = options.get('mono_color', 'blue')
            channels = ['tone']
            pens = {'tone': mono_color}
            angles = {'tone': 45}
        elif color_mode == 'duotone':
            duo_dark = options.get('duo_color_dark', 'blue')
            duo_light = options.get('duo_color_light', 'orange')
            channels = ['dark', 'light']
            pens = {'dark': duo_dark, 'light': duo_light}
            angles = {'dark': 45, 'light': 135}
        else:
            # Get color mode config from predefined modes
            mode_config = self.COLOR_MODES.get(color_mode, self.COLOR_MODES['cmyk'])
            channels = mode_config['channels']
            pens = mode_config['pens']
            angles = mode_config['angles']
        
        # Convert image to channel data based on color mode
        channel_data = {}
        for channel in channels:
            channel_data[channel] = np.zeros((h, w), dtype=np.float32)
        
        for row in range(h):
            for col in range(w):
                r, g, b = rgb_flipped[row, col]
                # Skip pure white (paper)
                if r >= white_thresh and g >= white_thresh and b >= white_thresh:
                    continue
                
                if color_mode == 'cmyk':
                    c, m, y, k = self._rgb_to_cmyk(r, g, b)
                    channel_data['cyan'][row, col] = c
                    channel_data['magenta'][row, col] = m
                    channel_data['yellow'][row, col] = y
                    channel_data['black'][row, col] = k
                elif color_mode == 'rgb':
                    channel_data['red'][row, col] = r / 255.0
                    channel_data['green'][row, col] = g / 255.0
                    channel_data['blue'][row, col] = b / 255.0
                elif color_mode == 'grayscale':
                    channel_data['black'][row, col] = 1.0 - (gray_flipped[row, col] / 255.0)
                elif color_mode == 'monotone':
                    # Single channel based on luminance
                    channel_data['tone'][row, col] = 1.0 - (gray_flipped[row, col] / 255.0)
                elif color_mode == 'duotone':
                    # Split into dark (shadows) and light (highlights)
                    lum = gray_flipped[row, col] / 255.0
                    # Dark channel: stronger in shadows
                    channel_data['dark'][row, col] = 1.0 - lum
                    # Light channel: stronger in midtones/highlights
                    channel_data['light'][row, col] = min(lum * 2, 1.0) * (1.0 - lum * 0.5)
                elif color_mode == 'primary':
                    # RYB approximation from RGB
                    channel_data['red'][row, col] = r / 255.0
                    channel_data['yellow'][row, col] = min(r, g) / 255.0
                    channel_data['blue'][row, col] = b / 255.0
                elif color_mode == 'warm_cool':
                    # Warm = red/orange contribution, Cool = blue contribution
                    channel_data['warm'][row, col] = max(r - b, 0) / 255.0
                    channel_data['cool'][row, col] = max(b - r, 0) / 255.0
        
        # Route to appropriate method
        if method == 'dither':
            return self._halftone_dither(channel_data, channels, pens, w, h, offset_x, offset_y, density)
        elif method == 'crosshatch':
            return self._halftone_crosshatch(channel_data, channels, pens, angles, w, h, offset_x, offset_y, density)
        elif method == 'horizontal':
            return self._halftone_horizontal(channel_data, channels, pens, w, h, offset_x, offset_y, density)
        elif method == 'dots':
            return self._halftone_dots(channel_data, channels, pens, w, h, offset_x, offset_y, density)
        else:
            return self._halftone_dither(channel_data, channels, pens, w, h, offset_x, offset_y, density)
    
    def _halftone_dither(self, channel_data: Dict, channels: List, pens: Dict,
                         w: int, h: int, offset_x: float, offset_y: float, density: float) -> Dict:
        """Floyd-Steinberg dithering for halftone."""
        # Apply dithering to each channel
        dithered = {}
        for channel in channels:
            dithered[channel] = self._floyd_steinberg_dither(channel_data[channel].copy())
        
        spacing = max(1, int(100 / density * 2))
        
        layers = []
        for channel in channels:
            mask = dithered[channel]
            if np.sum(mask) == 0:
                continue
            
            turtle = Turtle()
            
            for row in range(0, h, spacing):
                in_segment = False
                start_x = None
                
                for col in range(w):
                    if mask[row, col] == 1:
                        if not in_segment:
                            in_segment = True
                            start_x = col
                    else:
                        if in_segment:
                            x1 = start_x + offset_x
                            x2 = (col - 1) + offset_x
                            y = row + offset_y
                            if x2 >= x1:
                                turtle.jump_to(x1, y)
                                turtle.move_to(x2, y)
                            in_segment = False
                
                if in_segment:
                    x1 = start_x + offset_x
                    x2 = (w - 1) + offset_x
                    y = row + offset_y
                    if x2 >= x1:
                        turtle.jump_to(x1, y)
                        turtle.move_to(x2, y)
            
            if turtle.get_paths():
                layers.append({
                    'name': channel.capitalize(),
                    'color': pens[channel],
                    'turtle': turtle
                })
        
        return {'layers': layers}
    
    def _halftone_crosshatch(self, channel_data: Dict, channels: List, pens: Dict, angles: Dict,
                             w: int, h: int, offset_x: float, offset_y: float, density: float) -> Dict:
        """Crosshatch at screen angles for halftone."""
        base_spacing = max(2, int(100 / density * 3))
        
        layers = []
        for channel in channels:
            data = channel_data[channel]
            
            if np.max(data) < 0.001:
                continue
            
            turtle = Turtle()
            angle = angles[channel]
            
            self._draw_halftone_crosshatch_lines(turtle, data, w, h,
                                                  offset_x, offset_y, base_spacing, angle)
            
            if turtle.get_paths():
                layers.append({
                    'name': channel.capitalize(),
                    'color': pens[channel],
                    'turtle': turtle
                })
        
        return {'layers': layers}
    
    def _halftone_horizontal(self, channel_data: Dict, channels: List, pens: Dict,
                             w: int, h: int, offset_x: float, offset_y: float, density: float) -> Dict:
        """Horizontal lines with varying density for halftone."""
        spacing = max(2, int(100 / density * 3))
        
        dither_matrix = [
            [0.0, 0.5, 0.125, 0.625],
            [0.75, 0.25, 0.875, 0.375],
            [0.1875, 0.6875, 0.0625, 0.5625],
            [0.9375, 0.4375, 0.8125, 0.3125]
        ]
        
        layers = []
        for channel in channels:
            data = channel_data[channel]
            
            if np.max(data) < 0.001:
                continue
            
            turtle = Turtle()
            
            for row in range(0, h, spacing):
                in_segment = False
                start_x = None
                
                for col in range(w):
                    ink = data[row, col]
                    threshold = dither_matrix[row % 4][col % 4]
                    
                    if ink > threshold:
                        if not in_segment:
                            in_segment = True
                            start_x = col
                    else:
                        if in_segment:
                            x1 = start_x + offset_x
                            x2 = (col - 1) + offset_x
                            y = row + offset_y
                            if x2 >= x1:
                                turtle.jump_to(x1, y)
                                turtle.move_to(x2, y)
                            in_segment = False
                
                if in_segment:
                    x1 = start_x + offset_x
                    x2 = (w - 1) + offset_x
                    y = row + offset_y
                    if x2 >= x1:
                        turtle.jump_to(x1, y)
                        turtle.move_to(x2, y)
            
            if turtle.get_paths():
                layers.append({
                    'name': channel.capitalize(),
                    'color': pens[channel],
                    'turtle': turtle
                })
        
        return {'layers': layers}
    
    def _halftone_dots(self, channel_data: Dict, channels: List, pens: Dict,
                       w: int, h: int, offset_x: float, offset_y: float, density: float) -> Dict:
        """Dot pattern for halftone."""
        spacing = max(2, int(100 / density * 3))
        dot_size = max(0.5, spacing / 4)
        
        dither_matrix = [
            [0.0, 0.5, 0.125, 0.625],
            [0.75, 0.25, 0.875, 0.375],
            [0.1875, 0.6875, 0.0625, 0.5625],
            [0.9375, 0.4375, 0.8125, 0.3125]
        ]
        
        layers = []
        for channel in channels:
            data = channel_data[channel]
            
            if np.max(data) < 0.001:
                continue
            
            turtle = Turtle()
            
            for row in range(0, h, spacing):
                for col in range(0, w, spacing):
                    ink = data[row, col]
                    threshold = dither_matrix[row % 4][col % 4]
                    
                    if ink > threshold:
                        x = col + offset_x
                        y = row + offset_y
                        turtle.jump_to(x, y)
                        turtle.move_to(x + dot_size, y)
            
            if turtle.get_paths():
                layers.append({
                    'name': channel.capitalize(),
                    'color': pens[channel],
                    'turtle': turtle
                })
        
        return {'layers': layers}
    
    def _draw_halftone_crosshatch_lines(self, turtle: Turtle, intensity: np.ndarray,
                                         w: int, h: int, offset_x: float, offset_y: float,
                                         base_spacing: int, angle: float):
        """Draw crosshatch lines with ordered dithering for halftone."""
        rad = math.radians(angle)
        cos_a = math.cos(rad)
        sin_a = math.sin(rad)
        
        # Calculate line range to cover entire image
        max_dist = int(math.sqrt(w**2 + h**2)) + base_spacing
        
        dither_matrix = [
            [0.0, 0.5, 0.125, 0.625],
            [0.75, 0.25, 0.875, 0.375],
            [0.1875, 0.6875, 0.0625, 0.5625],
            [0.9375, 0.4375, 0.8125, 0.3125]
        ]
        
        # Draw lines perpendicular to angle
        for d in range(-max_dist, max_dist, base_spacing):
            in_segment = False
            start_pt = None
            last_pt = None
            
            # Sample along the line
            for t in range(-max_dist, max_dist, 1):
                # Calculate position along line perpendicular to angle
                px = int(w/2 + d * cos_a + t * sin_a)
                py = int(h/2 + d * sin_a - t * cos_a)
                
                if 0 <= px < w and 0 <= py < h:
                    ink = intensity[py, px]
                    threshold = dither_matrix[py % 4][px % 4]
                    draw = ink > threshold
                    
                    if draw:
                        if not in_segment:
                            in_segment = True
                            start_pt = (px, py)
                        last_pt = (px, py)
                    else:
                        if in_segment and start_pt and last_pt:
                            x1, y1 = start_pt
                            x2, y2 = last_pt
                            turtle.jump_to(x1 + offset_x, y1 + offset_y)
                            turtle.move_to(x2 + offset_x, y2 + offset_y)
                        in_segment = False
                        start_pt = None
                        last_pt = None
                else:
                    if in_segment and start_pt and last_pt:
                        x1, y1 = start_pt
                        x2, y2 = last_pt
                        turtle.jump_to(x1 + offset_x, y1 + offset_y)
                        turtle.move_to(x2 + offset_x, y2 + offset_y)
                    in_segment = False
                    start_pt = None
                    last_pt = None
            
            # Handle end of line
            if in_segment and start_pt and last_pt:
                x1, y1 = start_pt
                x2, y2 = last_pt
                turtle.jump_to(x1 + offset_x, y1 + offset_y)
                turtle.move_to(x2 + offset_x, y2 + offset_y)

