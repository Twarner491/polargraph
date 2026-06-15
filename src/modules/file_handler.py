"""
File handling for loading and saving various formats.
Supports SVG, DXF, G-code, and images.
"""

import os
import re
import math
from typing import List, Optional, Dict
from xml.etree import ElementTree as ET

from .turtle import Turtle, Point, StrokeLayer
from .converters.svg2pl import (
    svg_to_polylines, _parse_element, _parse_transform, _apply_transforms,
    _parse_path_d, _arc_to_bezier
)
from .plotter_settings import PlotterSettings


# SVG namespace constants
SVG_NS = 'http://www.w3.org/2000/svg'
INKSCAPE_NS = 'http://www.inkscape.org/namespaces/inkscape'
SODIPODI_NS = 'http://sodipodi.sourceforge.net/DTD/sodipodi-0.0.dtd'
XLINK_NS = 'http://www.w3.org/1999/xlink'

# Register namespaces so ET doesn't mangle them on output
ET.register_namespace('', SVG_NS)
ET.register_namespace('inkscape', INKSCAPE_NS)
ET.register_namespace('sodipodi', SODIPODI_NS)
ET.register_namespace('xlink', XLINK_NS)


def _get_element_style(elem: ET.Element) -> Dict[str, str]:
    """Extract style properties from an element's style attribute and direct attributes."""
    styles = {}

    # Parse style attribute
    style_str = elem.get('style', '')
    if style_str:
        for part in style_str.split(';'):
            part = part.strip()
            if ':' in part:
                key, val = part.split(':', 1)
                styles[key.strip()] = val.strip()

    # Direct attributes override style properties
    for attr in ('stroke', 'fill', 'stroke-width', 'stroke-linecap', 'stroke-linejoin',
                 'opacity', 'stroke-opacity', 'display', 'visibility'):
        val = elem.get(attr)
        if val is not None:
            styles[attr] = val

    return styles


def _get_inherited_stroke(elem: ET.Element, root: ET.Element) -> str:
    """Walk up the tree to find the effective stroke color."""
    # Build parent map for traversal
    current = elem
    while current is not None:
        styles = _get_element_style(current)
        stroke = styles.get('stroke')
        if stroke and stroke != 'inherit' and stroke != 'none':
            return stroke
        # Move up - ET doesn't have parent pointers, so we check the root
        if current is root:
            break
        current = None  # Can't traverse up without parent map
    return '#000000'


def _resolve_color(color_str: str) -> str:
    """Resolve SVG color strings (named colors, rgb(), hex) to hex."""
    if not color_str:
        return '#000000'

    color_str = color_str.strip().lower()

    # Already hex
    if color_str.startswith('#'):
        return color_str

    # Named colors (common subset)
    named = {
        'black': '#000000', 'white': '#ffffff', 'red': '#ff0000',
        'green': '#008000', 'blue': '#0000ff', 'yellow': '#ffff00',
        'cyan': '#00ffff', 'magenta': '#ff00ff', 'orange': '#ffa500',
        'purple': '#800080', 'pink': '#ffc0cb', 'brown': '#a52a2a',
        'gray': '#808080', 'grey': '#808080', 'lime': '#00ff00',
        'navy': '#000080', 'teal': '#008080', 'maroon': '#800000',
        'silver': '#c0c0c0', 'olive': '#808000', 'aqua': '#00ffff',
        'fuchsia': '#ff00ff', 'darkred': '#8b0000', 'darkblue': '#00008b',
        'darkgreen': '#006400', 'none': '#000000',
    }
    if color_str in named:
        return named[color_str]

    # rgb(r, g, b)
    m = re.match(r'rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)', color_str)
    if m:
        r, g, b = int(m.group(1)), int(m.group(2)), int(m.group(3))
        return f'#{r:02x}{g:02x}{b:02x}'

    # rgb(r%, g%, b%)
    m = re.match(r'rgb\(\s*([\d.]+)%\s*,\s*([\d.]+)%\s*,\s*([\d.]+)%\s*\)', color_str)
    if m:
        r = int(float(m.group(1)) * 255 / 100)
        g = int(float(m.group(2)) * 255 / 100)
        b = int(float(m.group(3)) * 255 / 100)
        return f'#{r:02x}{g:02x}{b:02x}'

    return '#000000'


def _parse_svg_length(value: str) -> float:
    """Parse SVG length value, stripping units and converting to user units (px at 96dpi)."""
    if not value:
        return 0.0
    value = value.strip()
    # Common unit conversions to px (at 96 DPI)
    unit_factors = {
        'px': 1.0,
        'pt': 96.0 / 72.0,
        'pc': 96.0 / 6.0,
        'mm': 96.0 / 25.4,
        'cm': 96.0 / 2.54,
        'in': 96.0,
        'em': 16.0,  # approximate
        'ex': 8.0,   # approximate
    }
    for unit, factor in unit_factors.items():
        if value.endswith(unit):
            return float(value[:-len(unit)]) * factor
    # No unit or just a number
    return float(re.sub(r'[^\d.\-+eE]', '', value) or '0')


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
        """Load a G-code file, preserving comments for metadata extraction."""
        with open(filepath, 'r', encoding='utf-8', errors='replace') as f:
            lines = f.readlines()

        gcode = []
        for line in lines:
            line = line.strip()
            if line:
                gcode.append(line)

        return gcode

    def save_gcode(self, gcode: List[str], filepath: str):
        """Save G-code to a file."""
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write('\n'.join(gcode))
            f.write('\n')

    def turtle_to_svg(self, turtle: Turtle) -> str:
        """Convert a Turtle to standards-compliant SVG with Inkscape layer support.

        Produces SVG compatible with Adobe Illustrator, Inkscape, CorelDRAW,
        and other vector editors. Each Turtle layer becomes an SVG/Inkscape layer group.
        """
        bounds = turtle.get_bounds()

        padding = 10
        width = bounds['width'] + 2 * padding
        height = bounds['height'] + 2 * padding

        vb_x = bounds['min_x'] - padding
        vb_y = -bounds['max_y'] - padding

        svg_parts = []
        svg_parts.append('<?xml version="1.0" encoding="UTF-8" standalone="no"?>')
        svg_parts.append(
            f'<svg xmlns="http://www.w3.org/2000/svg"'
            f'\n     xmlns:inkscape="{INKSCAPE_NS}"'
            f'\n     xmlns:sodipodi="{SODIPODI_NS}"'
            f'\n     width="{width:.3f}mm"'
            f'\n     height="{height:.3f}mm"'
            f'\n     viewBox="{vb_x:.3f} {vb_y:.3f} {width:.3f} {height:.3f}"'
            f'\n     version="1.1">'
        )

        # Metadata
        svg_parts.append('  <metadata>')
        svg_parts.append('    <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"')
        svg_parts.append('             xmlns:dc="http://purl.org/dc/elements/1.1/">')
        svg_parts.append('      <rdf:Description>')
        svg_parts.append('        <dc:creator>Polargraph</dc:creator>')
        svg_parts.append('      </rdf:Description>')
        svg_parts.append('    </rdf:RDF>')
        svg_parts.append('  </metadata>')

        for layer_idx, layer in enumerate(turtle.layers):
            has_content = any(len(line.points) >= 2 for line in layer.lines)
            if not has_content:
                continue

            layer_name = f"Layer {layer_idx + 1}"
            color_hex = _resolve_color(layer.color)

            # Inkscape-compatible layer group
            svg_parts.append(
                f'  <g inkscape:groupmode="layer"'
                f' inkscape:label="{layer_name}"'
                f' id="layer{layer_idx + 1}"'
                f' stroke="{color_hex}"'
                f' stroke-width="{layer.diameter:.2f}"'
                f' stroke-linecap="round"'
                f' stroke-linejoin="round"'
                f' fill="none">'
            )

            for line in layer.lines:
                if len(line.points) < 2:
                    continue

                # Build path data (flip Y for SVG coordinate system)
                parts = [f'M {line.points[0].x:.3f},{-line.points[0].y:.3f}']
                for point in line.points[1:]:
                    parts.append(f'L {point.x:.3f},{-point.y:.3f}')
                d = ' '.join(parts)

                svg_parts.append(f'    <path d="{d}"/>')

            svg_parts.append('  </g>')

        svg_parts.append('</svg>')
        return '\n'.join(svg_parts)

    def _load_svg(self, filepath: str) -> Turtle:
        """Load an SVG file using the full svg2pl parser for robustness.

        Handles transforms, all path commands (M,L,H,V,C,S,Q,T,A,Z),
        CSS styles, groups, use/defs, and files from Adobe Illustrator,
        Inkscape, CorelDRAW, and other editors.
        """
        with open(filepath, 'r', encoding='utf-8', errors='replace') as f:
            content = f.read()

        try:
            root = ET.fromstring(content)
        except ET.ParseError as e:
            raise ValueError(f"Invalid SVG file: {e}")

        turtle = Turtle()

        # Parse viewBox and document dimensions
        viewbox = root.get('viewBox', '')
        doc_width = root.get('width', '')
        doc_height = root.get('height', '')

        if viewbox:
            parts = viewbox.split()
            if len(parts) >= 4:
                vb_x, vb_y, vb_w, vb_h = [float(p) for p in parts[:4]]
            else:
                vb_x, vb_y, vb_w, vb_h = 0, 0, 100, 100
        else:
            w = _parse_svg_length(doc_width) if doc_width else 100
            h = _parse_svg_length(doc_height) if doc_height else 100
            vb_x, vb_y, vb_w, vb_h = 0, 0, w, h

        # Build parent map for style inheritance
        parent_map = {}
        for parent in root.iter():
            for child in parent:
                parent_map[child] = parent

        # Resolve <use> references by inlining them before processing
        defs = {}
        for elem in root.iter():
            elem_id = elem.get('id')
            if elem_id:
                defs[elem_id] = elem

        # Collect layers: look for Inkscape layer groups, or regular groups, or flat paths
        ns_map = {
            'svg': SVG_NS,
            'inkscape': INKSCAPE_NS,
        }

        def _get_tag(elem):
            """Get tag name without namespace."""
            return elem.tag.split('}')[-1].lower()

        def _get_ns_attr(elem, ns, attr):
            """Get namespaced attribute."""
            return elem.get(f'{{{ns}}}{attr}')

        def _is_inkscape_layer(elem):
            """Check if element is an Inkscape layer group."""
            return (_get_tag(elem) == 'g' and
                    _get_ns_attr(elem, INKSCAPE_NS, 'groupmode') == 'layer')

        def _get_stroke_from_tree(elem):
            """Walk up the element tree to find effective stroke color."""
            current = elem
            while current is not None:
                styles = _get_element_style(current)
                stroke = styles.get('stroke')
                if stroke and stroke not in ('inherit', 'none', 'currentColor'):
                    return _resolve_color(stroke)
                current = parent_map.get(current)
            return '#000000'

        def _get_stroke_width_from_tree(elem):
            """Walk up the element tree to find effective stroke width."""
            current = elem
            while current is not None:
                styles = _get_element_style(current)
                sw = styles.get('stroke-width')
                if sw and sw != 'inherit':
                    return _parse_svg_length(sw)
                current = parent_map.get(current)
            return 1.0

        def _collect_transforms(elem):
            """Collect all transforms from element up to root."""
            transforms = []
            current = elem
            while current is not None:
                t = _parse_transform(current.get('transform', ''))
                if t:
                    transforms = t + transforms  # parent transforms first
                current = parent_map.get(current)
            return transforms

        def _process_element_to_polylines(elem):
            """Process a single SVG element into polylines using svg2pl parser."""
            tag = _get_tag(elem)
            transforms = _collect_transforms(elem)
            polylines = []

            if tag == 'path':
                d = elem.get('d', '')
                if d:
                    paths = _parse_path_d(d)
                    for path in paths:
                        transformed = [_apply_transforms(pt, transforms) for pt in path]
                        if len(transformed) >= 2:
                            polylines.append(transformed)

            elif tag == 'line':
                x1 = float(elem.get('x1', 0))
                y1 = float(elem.get('y1', 0))
                x2 = float(elem.get('x2', 0))
                y2 = float(elem.get('y2', 0))
                p1 = _apply_transforms((x1, y1), transforms)
                p2 = _apply_transforms((x2, y2), transforms)
                polylines.append([p1, p2])

            elif tag == 'rect':
                x = float(elem.get('x', 0))
                y = float(elem.get('y', 0))
                w = float(elem.get('width', 0))
                h = float(elem.get('height', 0))
                rx = float(elem.get('rx', 0))
                ry = float(elem.get('ry', rx))

                if rx == 0 and ry == 0:
                    corners = [(x, y), (x+w, y), (x+w, y+h), (x, y+h), (x, y)]
                    transformed = [_apply_transforms(pt, transforms) for pt in corners]
                    polylines.append(transformed)
                else:
                    rx = min(rx, w/2)
                    ry = min(ry, h/2)
                    path = []
                    path.append((x+rx, y))
                    path.append((x+w-rx, y))
                    for pt in _arc_to_bezier(x+w-rx, y, rx, ry, 0, False, True, x+w, y+ry):
                        path.append(pt)
                    path.append((x+w, y+h-ry))
                    for pt in _arc_to_bezier(x+w, y+h-ry, rx, ry, 0, False, True, x+w-rx, y+h):
                        path.append(pt)
                    path.append((x+rx, y+h))
                    for pt in _arc_to_bezier(x+rx, y+h, rx, ry, 0, False, True, x, y+h-ry):
                        path.append(pt)
                    path.append((x, y+ry))
                    for pt in _arc_to_bezier(x, y+ry, rx, ry, 0, False, True, x+rx, y):
                        path.append(pt)
                    transformed = [_apply_transforms(pt, transforms) for pt in path]
                    polylines.append(transformed)

            elif tag == 'circle':
                cx = float(elem.get('cx', 0))
                cy = float(elem.get('cy', 0))
                r = float(elem.get('r', 0))
                segments = 64
                pts = []
                for i in range(segments + 1):
                    angle = 2 * math.pi * i / segments
                    px = cx + r * math.cos(angle)
                    py = cy + r * math.sin(angle)
                    pts.append(_apply_transforms((px, py), transforms))
                polylines.append(pts)

            elif tag == 'ellipse':
                cx = float(elem.get('cx', 0))
                cy = float(elem.get('cy', 0))
                rx = float(elem.get('rx', 0))
                ry = float(elem.get('ry', 0))
                segments = 64
                pts = []
                for i in range(segments + 1):
                    angle = 2 * math.pi * i / segments
                    px = cx + rx * math.cos(angle)
                    py = cy + ry * math.sin(angle)
                    pts.append(_apply_transforms((px, py), transforms))
                polylines.append(pts)

            elif tag in ('polyline', 'polygon'):
                points_str = elem.get('points', '')
                nums = [float(n) for n in re.split(r'[\s,]+', points_str.strip()) if n]
                pts = []
                for i in range(0, len(nums) - 1, 2):
                    pt = _apply_transforms((nums[i], nums[i+1]), transforms)
                    pts.append(pt)
                if tag == 'polygon' and pts:
                    pts.append(pts[0])
                if len(pts) >= 2:
                    polylines.append(pts)

            elif tag == 'use':
                # Resolve <use> references
                href = elem.get(f'{{{XLINK_NS}}}href') or elem.get('href', '')
                if href.startswith('#'):
                    ref_id = href[1:]
                    ref_elem = defs.get(ref_id)
                    if ref_elem is not None:
                        # Process the referenced element
                        polylines.extend(_process_element_to_polylines(ref_elem))

            return polylines

        def _process_group(group_elem, color='#000000', diameter=1.0):
            """Process all drawable children of a group, creating a layer in turtle."""
            stroke = _get_stroke_from_tree(group_elem)
            sw = _get_stroke_width_from_tree(group_elem)
            if stroke != '#000000':
                color = stroke
            if sw != 1.0:
                diameter = sw

            turtle.set_stroke(color, diameter)

            for child in group_elem:
                tag = _get_tag(child)

                if tag == 'g':
                    if _is_inkscape_layer(child):
                        # Nested Inkscape layer - process as separate layer
                        child_color = _get_stroke_from_tree(child)
                        child_sw = _get_stroke_width_from_tree(child)
                        label = _get_ns_attr(child, INKSCAPE_NS, 'label') or ''
                        _process_group(child, child_color, child_sw)
                    else:
                        _process_group(child, color, diameter)
                elif tag in ('path', 'line', 'rect', 'circle', 'ellipse',
                             'polyline', 'polygon', 'use'):
                    # Get element-specific color
                    elem_color = _get_stroke_from_tree(child)
                    elem_sw = _get_stroke_width_from_tree(child)
                    if elem_color != color or elem_sw != diameter:
                        turtle.set_stroke(elem_color, elem_sw)

                    polylines = _process_element_to_polylines(child)
                    for polyline in polylines:
                        if len(polyline) >= 2:
                            # Flip Y for plotter coordinates (SVG Y-down → plotter Y-up)
                            turtle.jump_to(polyline[0][0], -polyline[0][1])
                            for px, py in polyline[1:]:
                                turtle.move_to(px, -py)

                    # Restore group color
                    if elem_color != color or elem_sw != diameter:
                        turtle.set_stroke(color, diameter)

        # Check for Inkscape layers first
        inkscape_layers = []
        for child in root:
            if _is_inkscape_layer(child):
                inkscape_layers.append(child)

        if inkscape_layers:
            # Process each Inkscape layer as a separate Turtle layer
            for layer_elem in inkscape_layers:
                label = _get_ns_attr(layer_elem, INKSCAPE_NS, 'label') or 'Layer'
                color = _get_stroke_from_tree(layer_elem)
                sw = _get_stroke_width_from_tree(layer_elem)
                _process_group(layer_elem, color, sw)
        else:
            # No Inkscape layers - check for regular groups
            groups = [child for child in root if _get_tag(child) == 'g']

            if groups:
                for group in groups:
                    color = _get_stroke_from_tree(group)
                    sw = _get_stroke_width_from_tree(group)
                    _process_group(group, color, sw)

            # Also process top-level elements not in groups
            for child in root:
                tag = _get_tag(child)
                if tag in ('path', 'line', 'rect', 'circle', 'ellipse',
                           'polyline', 'polygon', 'use'):
                    elem_color = _get_stroke_from_tree(child)
                    elem_sw = _get_stroke_width_from_tree(child)
                    turtle.set_stroke(elem_color, elem_sw)

                    polylines = _process_element_to_polylines(child)
                    for polyline in polylines:
                        if len(polyline) >= 2:
                            turtle.jump_to(polyline[0][0], -polyline[0][1])
                            for px, py in polyline[1:]:
                                turtle.move_to(px, -py)

        # Center on origin
        turtle.center_on(0, 0)

        return turtle

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
