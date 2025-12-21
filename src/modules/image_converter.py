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
    
    def convert(self, filepath: str, algorithm: str, options: Dict[str, Any] = None) -> Turtle:
        """Convert an image using the specified algorithm."""
        options = options or {}
        
        # Load and prepare image
        img = Image.open(filepath).convert('L')  # Convert to grayscale
        
        # Get work area
        work_area = self.settings.get_work_area()
        
        # Resize image to fit work area while maintaining aspect ratio
        img_aspect = img.width / img.height
        work_aspect = work_area['width'] / work_area['height']
        
        if img_aspect > work_aspect:
            # Image is wider
            new_width = int(work_area['width'])
            new_height = int(new_width / img_aspect)
        else:
            # Image is taller
            new_height = int(work_area['height'])
            new_width = int(new_height * img_aspect)
        
        img = img.resize((new_width, new_height), Image.Resampling.LANCZOS)
        img_array = np.array(img)
        
        # Calculate offset to center
        offset_x = -new_width / 2
        offset_y = -new_height / 2
        
        # Convert using selected algorithm
        converter_method = getattr(self, f'_convert_{algorithm}', None)
        if converter_method is None:
            raise ValueError(f"Unknown converter: {algorithm}")
        
        return converter_method(img_array, offset_x, offset_y, options)
    
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

