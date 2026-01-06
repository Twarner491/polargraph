"""
GPenT - Generative Pen-trained Transformer
Gives Gemini AI creative control over the polargraph to create art.
"""

import os
import json
import requests
from typing import Dict, Any, List, Callable

# Load API key from environment
GEMINI_API_KEY = os.environ.get('GEMINI_API_KEY', '')

# Available generators and their options (numbered for easy reference)
# Only generators available on BOTH server and client side
GENERATORS = {
    1: {'id': 'spiral', 'name': 'Spiral', 'options': ['turns (1-50)', 'spacing (1-20)']},
    2: {'id': 'spirograph', 'name': 'Spirograph', 'options': ['R (10-300)', 'r (5-150)', 'd (5-200)', 'revolutions (1-100)']},
    3: {'id': 'lissajous', 'name': 'Lissajous', 'options': ['a (1-20)', 'b (1-20)', 'delta (0-180)', 'size (50-500)']},
    4: {'id': 'maze', 'name': 'Maze', 'options': ['rows (5-50)', 'cols (5-50)', 'cell_size (5-40)']},
    5: {'id': 'dragon', 'name': 'Dragon Curve', 'options': ['iterations (1-16)', 'size (1-10)']},
    6: {'id': 'hilbert', 'name': 'Hilbert Curve', 'options': ['order (1-7)', 'size (100-800)']},
    7: {'id': 'tree', 'name': 'Fractal Tree', 'options': ['depth (1-12)', 'trunk_length (20-200)', 'angle (10-45)', 'ratio (0.5-0.9)']},
    8: {'id': 'hexagons', 'name': 'Hexagon Grid', 'options': ['size (5-50)', 'rows (3-30)', 'cols (3-30)']},
    9: {'id': 'flowfield', 'name': 'Flow Field', 'options': ['lines (50-1000)', 'length (10-200)', 'scale (0.001-0.1)']},
    10: {'id': 'border', 'name': 'Border', 'options': ['margin (0-50)']},
    11: {'id': 'text', 'name': 'Text', 'options': ['text (string)', 'size (10-200)']},
    12: {'id': 'slimemold', 'name': 'Slime Mold', 'options': ['agents (100-10000)', 'iterations (50-1000)', 'sensor_angle (10-90)', 'sensor_distance (3-30)']},
    13: {'id': 'geodataweaving', 'name': 'Geodata Weaving', 'options': ['latitude (-90 to 90)', 'longitude (-180 to 180)', 'threads (16-128)', 'shafts (2-8)']},
    14: {'id': 'poetryclouds', 'name': 'Poetry Clouds', 'options': ['text_size (3-20mm)', 'cloud_threshold (0.3-0.7)', 'noise_scale (0.005-0.05)', 'seed (-1 for random)']},
    15: {'id': 'geometricpattern', 'name': 'Geometric Pattern', 'options': ['columns (2-8)', 'rows (2-10)', 'seed (-1 for random)']},
    16: {'id': 'glow', 'name': 'Glow (Multi-Color)', 'options': ['color_profile (rainbow/warm/cool/monochrome/primary/pastel)', 'particles (100-2000)', 'iterations (50-500)']},
    17: {'id': 'randompoetry', 'name': 'Random Poetry', 'options': ['word_source (dickinson/shakespeare/poe/whitman/romantic/nature/cosmic/gothic/zen)', 'word_count (5-50)']},
    18: {'id': 'gameoflife', 'name': 'Game of Life', 'options': ['cell_size (5-30mm)', 'generations (10-200)', 'initial_density (0.2-0.6)']},
    19: {'id': 'zenpots', 'name': 'Zen Pots (Multi-Color)', 'options': ['pot_count (3-20)', 'pot_color (terracotta/earth/slate/clay/ceramic/rustic/modern/vintage)', 'flower_style (branches/minimal/full/mixed/none)', 'flower_color (forest/spring/autumn/lavender/wildflower/tropical/berry/ink)']},
    20: {'id': 'bezier', 'name': 'Bezier Curves', 'options': ['curve_count (5-50)', 'curve_spread (20-200)', 'curve_style (flowing/random/parallel/radial/wave)']},
    21: {'id': 'noise', 'name': 'Perlin Noise Dots', 'options': ['grid_spacing (5-30mm)', 'noise_scale_x (0.005-0.05)', 'shape (circle/square/diamond/cross/line)']},
    22: {'id': 'kaleidoscope', 'name': 'Kaleidoscope', 'options': ['symmetry (4-16)', 'pattern (curves/lines/spirals/petals/geometric)', 'complexity (5-20)']},
    23: {'id': 'colorfuldots', 'name': 'Colorful Dots (CMYK)', 'options': ['color_mode (cmyk/rgb/primary/warm/cool)', 'grid_spacing (10-30mm)', 'max_dot_size (8-20mm)']},
    24: {'id': 'interlockings', 'name': 'Interlockings (Multi-Color)', 'options': ['num_layers (4-12)', 'lines_per_layer (20-60)', 'line_spacing (3-10mm)']},
    25: {'id': 'sudokucartography', 'name': 'Sudoku Cartography', 'options': ['initial_clues (15-25)', 'curve_tension (30-100)', 'draw_grid (true/false)']},
}

# Available pen colors (numbered)
PEN_COLORS = {
    1: {'id': 'brown', 'name': 'Brown', 'hex': '#544548'},
    2: {'id': 'black', 'name': 'Black', 'hex': '#3b363c'},
    3: {'id': 'blue', 'name': 'Blue', 'hex': '#5989e7'},
    4: {'id': 'green', 'name': 'Green', 'hex': '#3fada9'},
    5: {'id': 'purple', 'name': 'Purple', 'hex': '#653d7d'},
    6: {'id': 'pink', 'name': 'Pink', 'hex': '#ee9bb5'},
    7: {'id': 'red', 'name': 'Red', 'hex': '#f45d4e'},
    8: {'id': 'orange', 'name': 'Orange', 'hex': '#b06451'},
    9: {'id': 'yellow', 'name': 'Yellow', 'hex': '#f7a515'},
}

# Transform options
TRANSFORMS = {
    'scale': {'min': 10, 'max': 300, 'unit': '%'},
    'rotation': {'min': 0, 'max': 360, 'unit': 'degrees'},
    'offset_x': {'min': -400, 'max': 400, 'unit': 'mm'},
    'offset_y': {'min': -550, 'max': 550, 'unit': 'mm'},
}

def build_system_prompt(keywords: str = '') -> str:
    """Build the system prompt that gives Gemini its creative powers."""
    
    generators_desc = "\n".join([
        f"  {num}: {g['name']} - options: {', '.join(g['options'])}"
        for num, g in GENERATORS.items()
    ])
    
    colors_desc = "\n".join([
        f"  {num}: {c['name']}"
        for num, c in PEN_COLORS.items()
    ])
    
    inspiration = ""
    if keywords:
        inspiration = f'\nWhispers: "{keywords}"\n'
    
    return f"""You control a pen plotter. Canvas: 841mm x 1189mm.
{inspiration}
GENERATORS:
{generators_desc}

COLORS:
{colors_desc}

TRANSFORMS: scale (10-300%), rotation (0-360), offset_x (-400 to 400mm), offset_y (-550 to 550mm)

Respond with JSON array. Say FINISHED when done.
[
  {{"thought": "...", "generator": <num>, "options": {{}}, "color": <num>, "scale": 100, "rotation": 0, "offset_x": 0, "offset_y": 0}},
  ...
]
"""


def call_gemini(prompt: str, system_prompt: str) -> str:
    """Call the Gemini API and return the response."""
    if not GEMINI_API_KEY:
        raise ValueError("GEMINI_API_KEY not set in environment")
    
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={GEMINI_API_KEY}"
    
    payload = {
        "contents": [
            {
                "parts": [
                    {"text": system_prompt + "\n\nCreate your artwork now:"}
                ]
            }
        ],
        "generationConfig": {
            "temperature": 1.0,
            "maxOutputTokens": 8192,
        }
    }
    
    response = requests.post(url, json=payload, timeout=60)
    response.raise_for_status()
    
    result = response.json()
    
    if 'candidates' in result and len(result['candidates']) > 0:
        content = result['candidates'][0].get('content', {})
        parts = content.get('parts', [])
        if parts:
            return parts[0].get('text', '')
    
    return ''


def parse_commands(response_text: str) -> List[Dict[str, Any]]:
    """Parse Gemini's response into a list of commands."""
    commands = []
    thoughts = []
    
    # Try to find JSON array in the response
    import re
    
    # Look for JSON array
    json_match = re.search(r'\[[\s\S]*?\]', response_text)
    if json_match:
        try:
            raw_commands = json.loads(json_match.group())
            for cmd in raw_commands:
                if isinstance(cmd, dict) and 'generator' in cmd:
                    # Extract thought for console output
                    if 'thought' in cmd:
                        thoughts.append(cmd['thought'])
                    
                    # Map generator number to ID
                    gen_num = int(cmd.get('generator', 1))
                    if gen_num in GENERATORS:
                        cmd['generator_id'] = GENERATORS[gen_num]['id']
                    else:
                        cmd['generator_id'] = 'spiral'
                    
                    # Map color number to ID
                    color_num = int(cmd.get('color', 2))
                    if color_num in PEN_COLORS:
                        cmd['color_id'] = PEN_COLORS[color_num]['id']
                    else:
                        cmd['color_id'] = 'black'
                    
                    commands.append(cmd)
        except json.JSONDecodeError:
            pass
    
    return commands, thoughts, 'FINISHED' in response_text.upper()


def generate_artwork(keywords: str = '', log_callback: Callable = None) -> Dict[str, Any]:
    """
    Main entry point for GPenT generation.
    Returns a list of entities to be created.
    """
    if log_callback:
        log_callback("GPenT contemplating the canvas...")
    
    system_prompt = build_system_prompt(keywords)
    
    if log_callback:
        log_callback("Summoning creative inspiration...")
    
    try:
        response = call_gemini("Create artwork", system_prompt)
        
        if log_callback:
            log_callback("Processing artistic vision...")
        
        commands, thoughts, is_finished = parse_commands(response)
        
        # Log the chain of thought
        if log_callback and thoughts:
            log_callback("-" * 50)
            log_callback("GPenT Chain of Thought:")
            for i, thought in enumerate(thoughts, 1):
                log_callback(f"  {i}. {thought}")
            log_callback("-" * 50)
        
        if not commands:
            if log_callback:
                log_callback("Warning: No valid commands parsed from response")
                log_callback(f"Raw response: {response[:500]}...")
            return {'entities': [], 'raw_response': response}
        
        if log_callback:
            log_callback(f"GPenT generated {len(commands)} elements")
            if is_finished:
                log_callback("GPenT declares the artwork complete")
        
        return {
            'entities': commands,
            'thoughts': thoughts,
            'is_finished': is_finished,
            'raw_response': response
        }
        
    except Exception as e:
        if log_callback:
            log_callback(f"Error: {str(e)}")
        raise


# For testing
if __name__ == '__main__':
    import sys
    from dotenv import load_dotenv
    load_dotenv()
    
    GEMINI_API_KEY = os.environ.get('GEMINI_API_KEY', '')
    
    def print_log(msg):
        print(msg)
    
    result = generate_artwork(keywords="ocean waves tranquility", log_callback=print_log)
    print(json.dumps(result, indent=2))
