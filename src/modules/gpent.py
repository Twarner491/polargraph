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
GENERATORS = {
    1: {'id': 'spiral', 'name': 'Spiral', 'options': ['turns (1-50)', 'spacing (1-20)']},
    2: {'id': 'spirograph', 'name': 'Spirograph', 'options': ['R (10-300)', 'r (5-150)', 'd (5-200)', 'revolutions (1-100)']},
    3: {'id': 'lissajous', 'name': 'Lissajous', 'options': ['a (1-20)', 'b (1-20)', 'delta (0-180)', 'size (50-500)']},
    4: {'id': 'maze', 'name': 'Maze', 'options': ['rows (5-50)', 'cols (5-50)', 'cell_size (5-40)']},
    5: {'id': 'dragon', 'name': 'Dragon Curve', 'options': ['iterations (1-16)', 'size (1-10)']},
    6: {'id': 'hilbert', 'name': 'Hilbert Curve', 'options': ['order (1-7)', 'size (1-20)']},
    7: {'id': 'sierpinski', 'name': 'Sierpinski Triangle', 'options': ['order (1-8)', 'size (50-500)']},
    8: {'id': 'tree', 'name': 'Fractal Tree', 'options': ['depth (1-12)', 'angle (10-60)', 'ratio (0.5-0.9)']},
    9: {'id': 'star', 'name': 'Star', 'options': ['points (3-20)', 'outer_radius (50-300)', 'inner_radius (20-150)']},
    10: {'id': 'grid', 'name': 'Grid', 'options': ['rows (2-30)', 'cols (2-30)', 'spacing (5-50)']},
    11: {'id': 'circles', 'name': 'Concentric Circles', 'options': ['count (2-30)', 'spacing (5-30)']},
    12: {'id': 'waves', 'name': 'Waves', 'options': ['rows (2-20)', 'amplitude (10-100)', 'frequency (1-10)']},
    13: {'id': 'rose', 'name': 'Rose Curve', 'options': ['n (1-12)', 'd (1-12)', 'size (50-300)']},
    14: {'id': 'polygon', 'name': 'Polygon', 'options': ['sides (3-12)', 'size (50-300)']},
    15: {'id': 'noise', 'name': 'Perlin Flow', 'options': ['lines (10-200)', 'steps (10-200)', 'scale (0.001-0.05)']},
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
        f"  {num}: {c['name']} ({c['hex']})"
        for num, c in PEN_COLORS.items()
    ])
    
    keyword_instruction = ""
    if keywords:
        keyword_instruction = f"""
INSPIRATION WHISPERS: "{keywords}"
Let these words subtly influence your creative choices - the patterns you select, 
the colors you choose, the way forms interact. Don't be literal; let them be 
unconscious threads woven through your composition.
"""
    
    return f"""You are GPenT - a Generative Pen-trained Transformer. You are an AI artist 
with direct control over a polargraph pen plotter. Your canvas is approximately 841mm x 1189mm (A0 paper).

You will create a complete work of generative art by issuing a series of commands.
Each command generates a pattern, assigns it a color, and positions it on the canvas.

AVAILABLE GENERATORS (use number):
{generators_desc}

AVAILABLE PEN COLORS (use number):
{colors_desc}

TRANSFORMS:
- scale: {TRANSFORMS['scale']['min']}-{TRANSFORMS['scale']['max']}% (100 = original size)
- rotation: {TRANSFORMS['rotation']['min']}-{TRANSFORMS['rotation']['max']} degrees
- offset_x: {TRANSFORMS['offset_x']['min']} to {TRANSFORMS['offset_x']['max']} mm (horizontal position)
- offset_y: {TRANSFORMS['offset_y']['min']} to {TRANSFORMS['offset_y']['max']} mm (vertical position)

{keyword_instruction}

YOUR CREATIVE PROCESS:
1. Think about what you want to create - consider composition, balance, rhythm, contrast
2. Issue commands to build your artwork layer by layer
3. Use color thoughtfully - create harmonies or intentional tensions
4. Consider how forms will overlap and interact
5. When you feel the piece is complete, say "FINISHED"

COMMAND FORMAT - respond with a JSON array of commands:
[
  {{
    "thought": "your artistic reasoning for this element",
    "generator": <number>,
    "options": {{"option_name": value, ...}},
    "color": <number>,
    "scale": <percent>,
    "rotation": <degrees>,
    "offset_x": <mm>,
    "offset_y": <mm>
  }},
  ...more commands...
]

After your commands array, you may add "FINISHED" on a new line when the artwork is complete.

Be bold. Be creative. Create something beautiful and unexpected.
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
        log_callback("🎨 GPenT is contemplating the canvas...")
    
    system_prompt = build_system_prompt(keywords)
    
    if log_callback:
        log_callback("🤔 Summoning creative inspiration...")
    
    try:
        response = call_gemini("Create artwork", system_prompt)
        
        if log_callback:
            log_callback("💭 Processing artistic vision...")
        
        commands, thoughts, is_finished = parse_commands(response)
        
        # Log the chain of thought
        if log_callback and thoughts:
            log_callback("═" * 50)
            log_callback("🧠 GPenT's Chain of Thought:")
            for i, thought in enumerate(thoughts, 1):
                log_callback(f"  {i}. {thought}")
            log_callback("═" * 50)
        
        if not commands:
            if log_callback:
                log_callback("⚠️ No valid commands parsed from response")
                log_callback(f"Raw response: {response[:500]}...")
            return {'entities': [], 'raw_response': response}
        
        if log_callback:
            log_callback(f"✅ GPenT generated {len(commands)} elements")
            if is_finished:
                log_callback("🎉 GPenT declares the artwork FINISHED!")
        
        return {
            'entities': commands,
            'thoughts': thoughts,
            'is_finished': is_finished,
            'raw_response': response
        }
        
    except Exception as e:
        if log_callback:
            log_callback(f"❌ Error: {str(e)}")
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
