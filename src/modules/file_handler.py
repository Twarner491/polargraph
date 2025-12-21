"""
File handling for loading and saving various formats.
Supports SVG, DXF, G-code, and images.
"""

import os
import re
import math
from typing import List, Optional
from xml.etree import ElementTree as ET

from .turtle import Turtle
from .plotter_settings import PlotterSettings


class FileHandler:
    """Handles loading and saving of various file formats."""
    
    def __init__(self, settings: PlotterSettings):
        self.settings = settings
    
    def load_vector(self, filepath: str) -> Turtle:
        """Load a vector file (SVG or DXF)."""
        ext = os.path.splitext(filepath)[1].lower()
        
        if ext == '.svg':
            return self._load_svg(filepath)
        elif ext == '.dxf':
            return self._load_dxf(filepath)
        else:
            raise ValueError(f"Unsupported vector format: {ext}")
    
    def load_gcode(self, filepath: str) -> List[str]:
        """Load a G-code file."""
        with open(filepath, 'r') as f:
            lines = f.readlines()
        
        # Clean and filter lines
        gcode = []
        for line in lines:
            line = line.strip()
            if line and not line.startswith(';'):
                gcode.append(line)
        
        return gcode
    
    def save_gcode(self, gcode: List[str], filepath: str):
        """Save G-code to a file."""
        with open(filepath, 'w') as f:
            f.write('\n'.join(gcode))
    
    def turtle_to_svg(self, turtle: Turtle) -> str:
        """Convert a Turtle to SVG string."""
        bounds = turtle.get_bounds()
        
        # Add padding
        padding = 10
        width = bounds['width'] + 2 * padding
        height = bounds['height'] + 2 * padding
        
        svg_parts = [
            f'<?xml version="1.0" encoding="UTF-8"?>',
            f'<svg xmlns="http://www.w3.org/2000/svg" '
            f'viewBox="{bounds["min_x"] - padding} {-bounds["max_y"] - padding} {width} {height}" '
            f'width="{width}mm" height="{height}mm">'
        ]
        
        for layer in turtle.layers:
            for line in layer.lines:
                if len(line.points) < 2:
                    continue
                
                # Build path data (flip Y for SVG coordinates)
                d = f"M {line.points[0].x} {-line.points[0].y}"
                for point in line.points[1:]:
                    d += f" L {point.x} {-point.y}"
                
                svg_parts.append(
                    f'<path d="{d}" stroke="{layer.color}" '
                    f'stroke-width="{layer.diameter}" fill="none"/>'
                )
        
        svg_parts.append('</svg>')
        return '\n'.join(svg_parts)
    
    def _load_svg(self, filepath: str) -> Turtle:
        """Load an SVG file."""
        turtle = Turtle()
        
        tree = ET.parse(filepath)
        root = tree.getroot()
        
        # Handle namespace
        ns = {'svg': 'http://www.w3.org/2000/svg'}
        if root.tag.startswith('{'):
            ns_end = root.tag.index('}')
            ns['svg'] = root.tag[1:ns_end]
        
        # Parse viewBox for scaling
        viewbox = root.get('viewBox', '0 0 100 100').split()
        vb_x, vb_y, vb_w, vb_h = map(float, viewbox)
        
        # Process paths
        for elem in root.iter():
            tag = elem.tag.split('}')[-1]  # Remove namespace
            
            if tag == 'path':
                d = elem.get('d', '')
                self._parse_svg_path(turtle, d)
            
            elif tag == 'line':
                x1 = float(elem.get('x1', 0))
                y1 = float(elem.get('y1', 0))
                x2 = float(elem.get('x2', 0))
                y2 = float(elem.get('y2', 0))
                turtle.draw_line(x1, -y1, x2, -y2)  # Flip Y
            
            elif tag == 'rect':
                x = float(elem.get('x', 0))
                y = float(elem.get('y', 0))
                w = float(elem.get('width', 0))
                h = float(elem.get('height', 0))
                turtle.draw_rect(x, -y - h, w, h)  # Flip Y
            
            elif tag == 'circle':
                cx = float(elem.get('cx', 0))
                cy = float(elem.get('cy', 0))
                r = float(elem.get('r', 0))
                turtle.draw_circle(cx, -cy, r)  # Flip Y
            
            elif tag == 'polyline' or tag == 'polygon':
                points_str = elem.get('points', '')
                points = self._parse_svg_points(points_str)
                if points:
                    turtle.jump_to(points[0][0], -points[0][1])
                    for px, py in points[1:]:
                        turtle.move_to(px, -py)
                    if tag == 'polygon':
                        turtle.move_to(points[0][0], -points[0][1])
        
        # Center on origin
        turtle.center_on(0, 0)
        
        return turtle
    
    def _parse_svg_path(self, turtle: Turtle, d: str):
        """Parse SVG path data."""
        # Tokenize
        tokens = re.findall(r'[MmLlHhVvCcSsQqTtAaZz]|[-+]?[0-9]*\.?[0-9]+', d)
        
        i = 0
        current_x, current_y = 0, 0
        start_x, start_y = 0, 0
        
        while i < len(tokens):
            cmd = tokens[i]
            
            if cmd in 'Mm':
                relative = cmd == 'm'
                i += 1
                while i < len(tokens) and not tokens[i].isalpha():
                    x = float(tokens[i])
                    y = float(tokens[i + 1])
                    i += 2
                    
                    if relative:
                        current_x += x
                        current_y += y
                    else:
                        current_x, current_y = x, y
                    
                    turtle.jump_to(current_x, -current_y)
                    start_x, start_y = current_x, current_y
            
            elif cmd in 'Ll':
                relative = cmd == 'l'
                i += 1
                while i < len(tokens) and not tokens[i].isalpha():
                    x = float(tokens[i])
                    y = float(tokens[i + 1])
                    i += 2
                    
                    if relative:
                        current_x += x
                        current_y += y
                    else:
                        current_x, current_y = x, y
                    
                    turtle.move_to(current_x, -current_y)
            
            elif cmd in 'Hh':
                relative = cmd == 'h'
                i += 1
                while i < len(tokens) and not tokens[i].isalpha():
                    x = float(tokens[i])
                    i += 1
                    
                    if relative:
                        current_x += x
                    else:
                        current_x = x
                    
                    turtle.move_to(current_x, -current_y)
            
            elif cmd in 'Vv':
                relative = cmd == 'v'
                i += 1
                while i < len(tokens) and not tokens[i].isalpha():
                    y = float(tokens[i])
                    i += 1
                    
                    if relative:
                        current_y += y
                    else:
                        current_y = y
                    
                    turtle.move_to(current_x, -current_y)
            
            elif cmd in 'Zz':
                turtle.move_to(start_x, -start_y)
                current_x, current_y = start_x, start_y
                i += 1
            
            elif cmd in 'Cc':
                # Cubic Bezier - approximate with line segments
                relative = cmd == 'c'
                i += 1
                while i + 5 < len(tokens) and not tokens[i].isalpha():
                    x1 = float(tokens[i])
                    y1 = float(tokens[i + 1])
                    x2 = float(tokens[i + 2])
                    y2 = float(tokens[i + 3])
                    x = float(tokens[i + 4])
                    y = float(tokens[i + 5])
                    i += 6
                    
                    if relative:
                        x1 += current_x; y1 += current_y
                        x2 += current_x; y2 += current_y
                        x += current_x; y += current_y
                    
                    # Approximate with line segments
                    for t in [i/10 for i in range(1, 11)]:
                        bx = (1-t)**3 * current_x + 3*(1-t)**2*t * x1 + 3*(1-t)*t**2 * x2 + t**3 * x
                        by = (1-t)**3 * current_y + 3*(1-t)**2*t * y1 + 3*(1-t)*t**2 * y2 + t**3 * y
                        turtle.move_to(bx, -by)
                    
                    current_x, current_y = x, y
            
            else:
                # Skip unknown commands
                i += 1
    
    def _parse_svg_points(self, points_str: str) -> List[tuple]:
        """Parse SVG points attribute."""
        points = []
        nums = re.findall(r'[-+]?[0-9]*\.?[0-9]+', points_str)
        for i in range(0, len(nums) - 1, 2):
            points.append((float(nums[i]), float(nums[i + 1])))
        return points
    
    def _load_dxf(self, filepath: str) -> Turtle:
        """Load a DXF file (simplified parser)."""
        turtle = Turtle()
        
        with open(filepath, 'r') as f:
            content = f.read()
        
        # Very simplified DXF parsing - handles basic LINE and POLYLINE
        lines = content.split('\n')
        i = 0
        
        while i < len(lines):
            line = lines[i].strip()
            
            if line == 'LINE':
                # Read LINE entity
                x1 = y1 = x2 = y2 = 0
                while i < len(lines) and lines[i].strip() != '0':
                    code = lines[i].strip()
                    i += 1
                    if i >= len(lines):
                        break
                    value = lines[i].strip()
                    
                    if code == '10': x1 = float(value)
                    elif code == '20': y1 = float(value)
                    elif code == '11': x2 = float(value)
                    elif code == '21': y2 = float(value)
                    i += 1
                
                turtle.draw_line(x1, y1, x2, y2)
            
            elif line == 'CIRCLE':
                # Read CIRCLE entity
                cx = cy = r = 0
                while i < len(lines) and lines[i].strip() != '0':
                    code = lines[i].strip()
                    i += 1
                    if i >= len(lines):
                        break
                    value = lines[i].strip()
                    
                    if code == '10': cx = float(value)
                    elif code == '20': cy = float(value)
                    elif code == '40': r = float(value)
                    i += 1
                
                turtle.draw_circle(cx, cy, r)
            
            else:
                i += 1
        
        turtle.center_on(0, 0)
        return turtle

