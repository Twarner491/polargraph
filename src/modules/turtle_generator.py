"""
Turtle graphics pattern generators.
Implements various algorithmic patterns (spirograph, maze, fractals, etc.)
"""

import math
import random
from typing import Dict, List, Any, Tuple

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
                        {'value': 'monochrome', 'label': 'Monochrome (black only)'},
                        {'value': 'primary', 'label': 'Primary (red, yellow, blue)'},
                        {'value': 'warm', 'label': 'Warm (red, orange, yellow, pink)'},
                        {'value': 'cool', 'label': 'Cool (blue, green, purple)'},
                        {'value': 'earth', 'label': 'Earth (brown, orange, green)'},
                        {'value': 'sunset', 'label': 'Sunset (red, orange, yellow, pink, purple)'},
                        {'value': 'ocean', 'label': 'Ocean (blue, green, purple)'}
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
        },
        'gpent': {
            'name': 'GPenT',
            'description': 'Generative Pen-trained Transformer - AI-powered art generation',
            'options': {
                'inspiration': {'type': 'string', 'label': 'Inspiration', 'default': '', 'placeholder': 'Optional'}
            }
        },
        'dcode': {
            'name': 'dcode',
            'description': 'Text to polargraph G-code via Stable Diffusion',
            'options': {
                'prompt': {'type': 'string', 'label': 'Prompt', 'default': '', 'placeholder': 'Describe what to draw...'},
                'temperature': {'type': 'float', 'label': 'Temperature', 'default': 0.5, 'min': 0.3, 'max': 1.2, 'step': 0.1, 'collapsible': True},
                'max_tokens': {'type': 'int', 'label': 'Max Tokens', 'default': 2048, 'min': 256, 'max': 2048, 'step': 256, 'collapsible': True},
                'diffusion_steps': {'type': 'int', 'label': 'Diffusion Steps', 'default': 35, 'min': 20, 'max': 50, 'step': 5, 'collapsible': True},
                'guidance': {'type': 'float', 'label': 'Guidance', 'default': 10.0, 'min': 5.0, 'max': 20.0, 'step': 0.5, 'collapsible': True},
                'seed': {'type': 'string', 'label': 'Seed', 'default': '-1', 'placeholder': '-1 for random', 'collapsible': True}
            }
        },
        'slimemold': {
            'name': 'Slime Mold',
            'description': 'Physarum polycephalum simulation - organic network patterns',
            'options': {
                'agents': {'type': 'int', 'label': 'Number of Agents', 'default': 2000, 'min': 100, 'max': 10000},
                'iterations': {'type': 'int', 'label': 'Simulation Steps', 'default': 200, 'min': 50, 'max': 1000},
                'sensor_angle': {'type': 'float', 'label': 'Sensor Angle', 'default': 45, 'min': 10, 'max': 90},
                'sensor_distance': {'type': 'float', 'label': 'Sensor Distance', 'default': 9, 'min': 3, 'max': 30},
                'turn_angle': {'type': 'float', 'label': 'Turn Angle', 'default': 45, 'min': 10, 'max': 90},
                'step_size': {'type': 'float', 'label': 'Step Size', 'default': 1, 'min': 0.5, 'max': 5},
                'decay': {'type': 'float', 'label': 'Trail Decay', 'default': 0.9, 'min': 0.5, 'max': 0.99, 'step': 0.01},
                'deposit': {'type': 'float', 'label': 'Deposit Amount', 'default': 5, 'min': 1, 'max': 20},
                'draw_trails': {'type': 'bool', 'label': 'Draw Trail Network', 'default': True},
                'draw_agents': {'type': 'bool', 'label': 'Draw Agent Paths', 'default': False}
            }
        },
        'geodataweaving': {
            'name': 'Geodata Weaving',
            'description': 'Weaving patterns generated from geographic coordinates',
            'options': {
                'location_map': {'type': 'map', 'label': 'Select Location'},
                'threads': {'type': 'int', 'label': 'Number of Threads', 'default': 64, 'min': 16, 'max': 128},
                'shafts': {'type': 'int', 'label': 'Number of Shafts', 'default': 4, 'min': 2, 'max': 8},
                'pattern_rows': {'type': 'int', 'label': 'Pattern Rows', 'default': 64, 'min': 16, 'max': 128},
                'cell_size': {'type': 'float', 'label': 'Cell Size (mm)', 'default': 3, 'min': 1, 'max': 10},
                'draw_threading': {'type': 'bool', 'label': 'Draw Threading', 'default': True},
                'draw_treadling': {'type': 'bool', 'label': 'Draw Treadling', 'default': True},
                'draw_tieup': {'type': 'bool', 'label': 'Draw Tie-up', 'default': True},
                'draw_drawdown': {'type': 'bool', 'label': 'Draw Drawdown', 'default': True}
            }
        },
        'poetryclouds': {
            'name': 'Poetry Clouds',
            'description': 'Clouds formed from text characters using Perlin noise',
            'options': {
                'text_size': {'type': 'float', 'label': 'Letter Size (mm)', 'default': 6, 'min': 3, 'max': 20},
                'cloud_threshold': {'type': 'float', 'label': 'Cloud Threshold (higher=sparser)', 'default': 0.5, 'min': 0.3, 'max': 0.7, 'step': 0.05},
                'noise_scale': {'type': 'float', 'label': 'Cloud Scale', 'default': 0.01, 'min': 0.005, 'max': 0.05, 'step': 0.001},
                'seed': {'type': 'int', 'label': 'Random Seed', 'default': -1, 'min': -1, 'max': 9999},
                'custom_text': {'type': 'string', 'label': 'Custom Text (optional)', 'default': '', 'placeholder': 'Leave empty for random letters'},
                'uppercase': {'type': 'bool', 'label': 'Uppercase Only', 'default': True}
            }
        },
        'geometricpattern': {
            'name': 'Geometric Pattern',
            'description': 'Recursive grid of geometric shapes - stars, circles, crowns, diamonds, and more',
            'options': {
                'columns': {'type': 'int', 'label': 'Grid Columns', 'default': 4, 'min': 2, 'max': 8},
                'rows': {'type': 'int', 'label': 'Grid Rows', 'default': 5, 'min': 2, 'max': 10},
                'phase': {'type': 'float', 'label': 'Animation Phase', 'default': 0.5, 'min': 0, 'max': 1, 'step': 0.05},
                'seed': {'type': 'int', 'label': 'Random Seed', 'default': -1, 'min': -1, 'max': 9999},
                'recursion_depth': {'type': 'int', 'label': 'Max Recursion', 'default': 2, 'min': 0, 'max': 3},
                'min_cell_size': {'type': 'float', 'label': 'Min Cell Size (mm)', 'default': 40, 'min': 20, 'max': 100},
                'draw_grid': {'type': 'bool', 'label': 'Draw Grid Lines', 'default': True}
            }
        },
        'glow': {
            'name': 'Glow',
            'description': 'Fluid particle flow field - generate each color layer separately',
            'options': {
                'color_profile': {'type': 'select', 'label': 'Color Profile', 'default': 'rainbow', 'options': [
                    {'value': 'rainbow', 'label': 'Rainbow (7 layers)'},
                    {'value': 'warm', 'label': 'Warm (3 layers)'},
                    {'value': 'cool', 'label': 'Cool (3 layers)'},
                    {'value': 'monochrome', 'label': 'Monochrome (1 layer)'},
                    {'value': 'primary', 'label': 'Primary (3 layers)'},
                    {'value': 'pastel', 'label': 'Pastels (5 layers)'}
                ]},
                'particles': {'type': 'int', 'label': 'Number of Particles', 'default': 500, 'min': 50, 'max': 2000},
                'iterations': {'type': 'int', 'label': 'Simulation Steps', 'default': 200, 'min': 50, 'max': 500},
                'noise_scale': {'type': 'float', 'label': 'Noise Scale', 'default': 0.01, 'min': 0.001, 'max': 0.05, 'step': 0.001},
                'flow_cell_size': {'type': 'int', 'label': 'Flow Cell Size', 'default': 10, 'min': 5, 'max': 30},
                'max_speed': {'type': 'float', 'label': 'Max Speed', 'default': 1.3, 'min': 0.5, 'max': 5, 'step': 0.1},
                'seed': {'type': 'int', 'label': 'Random Seed', 'default': -1, 'min': -1, 'max': 9999},
                'circular_bounds': {'type': 'bool', 'label': 'Circular Bounds', 'default': True},
                'draw_trails': {'type': 'bool', 'label': 'Draw Trails', 'default': True}
            }
        },
        'randompoetry': {
            'name': 'Random Poetry',
            'description': 'Scattered poetic words from famous authors',
            'options': {
                'word_preset': {'type': 'select', 'label': 'Word Source', 'default': 'dickinson', 'options': [
                    {'value': 'dickinson', 'label': 'Emily Dickinson'},
                    {'value': 'shakespeare', 'label': 'Shakespeare'},
                    {'value': 'poe', 'label': 'Edgar Allan Poe'},
                    {'value': 'whitman', 'label': 'Walt Whitman'},
                    {'value': 'romantic', 'label': 'Romantic Era'},
                    {'value': 'nature', 'label': 'Nature Words'},
                    {'value': 'cosmic', 'label': 'Cosmic/Space'},
                    {'value': 'gothic', 'label': 'Gothic'},
                    {'value': 'zen', 'label': 'Zen/Eastern'}
                ]},
                'word_count': {'type': 'int', 'label': 'Word Count', 'default': 30, 'min': 5, 'max': 100},
                'min_size': {'type': 'float', 'label': 'Min Text Size', 'default': 10, 'min': 5, 'max': 30},
                'max_size': {'type': 'float', 'label': 'Max Text Size', 'default': 40, 'min': 15, 'max': 80},
                'seed': {'type': 'int', 'label': 'Random Seed', 'default': -1, 'min': -1, 'max': 9999},
                'custom_words': {'type': 'string', 'label': 'Custom Words (comma sep)', 'default': '', 'placeholder': 'Overrides preset'},
                'uppercase': {'type': 'bool', 'label': 'Uppercase', 'default': False}
            }
        },
        'gameoflife': {
            'name': 'Game of Life',
            'description': "Conway's Game of Life cellular automaton",
            'options': {
                'cell_size': {'type': 'float', 'label': 'Cell Size (mm)', 'default': 8, 'min': 3, 'max': 20},
                'generations': {'type': 'int', 'label': 'Generations to Run', 'default': 50, 'min': 1, 'max': 200},
                'initial_density': {'type': 'float', 'label': 'Initial Alive %', 'default': 0.3, 'min': 0.1, 'max': 0.7, 'step': 0.05},
                'seed': {'type': 'int', 'label': 'Random Seed', 'default': -1, 'min': -1, 'max': 9999},
                'draw_grid': {'type': 'bool', 'label': 'Draw Grid Lines', 'default': True},
                'fill_alive': {'type': 'bool', 'label': 'Fill Alive Cells', 'default': True},
                'show_history': {'type': 'bool', 'label': 'Show All Generations', 'default': False}
            }
        },
        'zenpots': {
            'name': 'Zen Pots',
            'description': 'Pottery shapes with flowers and dot-stroke aesthetic',
            'options': {
                'pot_count': {'type': 'int', 'label': 'Number of Pots', 'default': 12, 'min': 3, 'max': 20},
                'pot_color': {'type': 'select', 'label': 'Pot & Ground Color', 'default': 'terracotta', 'options': [
                    {'value': 'terracotta', 'label': 'Terracotta (Orange/Brown)'},
                    {'value': 'earth', 'label': 'Earth Tones (Brown)'},
                    {'value': 'slate', 'label': 'Slate (Blue/Gray)'},
                    {'value': 'clay', 'label': 'Natural Clay (Pink/Tan)'},
                    {'value': 'ceramic', 'label': 'Ceramic (Blue)'},
                    {'value': 'rustic', 'label': 'Rustic (Red/Brown)'},
                    {'value': 'modern', 'label': 'Modern (Black)'},
                    {'value': 'vintage', 'label': 'Vintage (Purple)'}
                ]},
                'flower_style': {'type': 'select', 'label': 'Flower Style', 'default': 'branches', 'options': [
                    {'value': 'branches', 'label': 'Branches with Berries'},
                    {'value': 'minimal', 'label': 'Minimal Twigs'},
                    {'value': 'full', 'label': 'Full Blooms'},
                    {'value': 'mixed', 'label': 'Mixed (Random Variety)'},
                    {'value': 'none', 'label': 'No Flowers'}
                ]},
                'flower_color': {'type': 'select', 'label': 'Flower & Branch Color', 'default': 'forest', 'options': [
                    {'value': 'forest', 'label': 'Forest Green'},
                    {'value': 'spring', 'label': 'Spring (Pink/Green)'},
                    {'value': 'autumn', 'label': 'Autumn (Orange/Red)'},
                    {'value': 'lavender', 'label': 'Lavender (Purple)'},
                    {'value': 'wildflower', 'label': 'Wildflower (Mixed)'},
                    {'value': 'tropical', 'label': 'Tropical (Yellow/Green)'},
                    {'value': 'berry', 'label': 'Berry (Red/Pink)'},
                    {'value': 'ink', 'label': 'Ink (Black)'}
                ]},
                'flower_density': {'type': 'float', 'label': 'Flower Density', 'default': 0.5, 'min': 0.1, 'max': 1.0, 'step': 0.1},
                'dot_density': {'type': 'float', 'label': 'Pot Dot Density', 'default': 0.4, 'min': 0.1, 'max': 1.0, 'step': 0.1},
                'seed': {'type': 'int', 'label': 'Random Seed', 'default': -1, 'min': -1, 'max': 9999},
                'draw_ground': {'type': 'bool', 'label': 'Draw Ground Line', 'default': True}
            }
        },
        'bezier': {
            'name': 'Bezier',
            'description': 'Bezier curves with customizable control points',
            'options': {
                'num_curves': {'type': 'int', 'label': 'Number of Curves', 'default': 10, 'min': 1, 'max': 50},
                'curve_spread': {'type': 'float', 'label': 'Curve Spread', 'default': 100, 'min': 20, 'max': 300},
                'control_variation': {'type': 'float', 'label': 'Control Point Variation', 'default': 50, 'min': 10, 'max': 200},
                'style': {'type': 'select', 'label': 'Style', 'default': 'flowing', 'options': [
                    {'value': 'flowing', 'label': 'Flowing'},
                    {'value': 'random', 'label': 'Random'},
                    {'value': 'parallel', 'label': 'Parallel'},
                    {'value': 'radial', 'label': 'Radial'},
                    {'value': 'wave', 'label': 'Wave'}
                ]},
                'smoothness': {'type': 'int', 'label': 'Curve Smoothness', 'default': 50, 'min': 10, 'max': 100},
                'seed': {'type': 'int', 'label': 'Random Seed', 'default': -1, 'min': -1, 'max': 9999},
                'show_controls': {'type': 'bool', 'label': 'Show Control Points', 'default': False}
            }
        },
        'noise': {
            'name': 'Noise',
            'description': 'Perlin noise-based dot grid',
            'options': {
                'grid_spacing': {'type': 'int', 'label': 'Grid Spacing', 'default': 15, 'min': 5, 'max': 40},
                'noise_scale_x': {'type': 'float', 'label': 'X Noise Scale', 'default': 0.015, 'min': 0.005, 'max': 0.1, 'step': 0.005},
                'noise_scale_y': {'type': 'float', 'label': 'Y Noise Scale', 'default': 0.02, 'min': 0.005, 'max': 0.1, 'step': 0.005},
                'offset': {'type': 'int', 'label': 'Noise Offset', 'default': 0, 'min': 0, 'max': 1000},
                'min_size_ratio': {'type': 'float', 'label': 'Min Size Ratio', 'default': 0.1, 'min': 0.0, 'max': 0.9, 'step': 0.1},
                'shape': {'type': 'select', 'label': 'Shape Type', 'default': 'circle', 'options': [
                    {'value': 'circle', 'label': 'Circle'},
                    {'value': 'square', 'label': 'Square'},
                    {'value': 'diamond', 'label': 'Diamond'},
                    {'value': 'cross', 'label': 'Cross'},
                    {'value': 'line', 'label': 'Line'}
                ]},
                'seed': {'type': 'int', 'label': 'Random Seed', 'default': -1, 'min': -1, 'max': 9999},
                'invert': {'type': 'bool', 'label': 'Invert Noise', 'default': False}
            }
        },
        'kaleidoscope': {
            'name': 'Kaleidoscope',
            'description': 'Symmetrical kaleidoscope patterns',
            'options': {
                'symmetry': {'type': 'int', 'label': 'Symmetry Sections', 'default': 6, 'min': 3, 'max': 16},
                'pattern_type': {'type': 'select', 'label': 'Pattern Type', 'default': 'curves', 'options': [
                    {'value': 'curves', 'label': 'Curves'},
                    {'value': 'lines', 'label': 'Lines'},
                    {'value': 'spirals', 'label': 'Spirals'},
                    {'value': 'petals', 'label': 'Petals'},
                    {'value': 'geometric', 'label': 'Geometric'}
                ]},
                'complexity': {'type': 'int', 'label': 'Pattern Complexity', 'default': 5, 'min': 1, 'max': 15},
                'radius': {'type': 'float', 'label': 'Outer Radius', 'default': 150, 'min': 50, 'max': 300},
                'inner_radius': {'type': 'float', 'label': 'Inner Radius', 'default': 20, 'min': 0, 'max': 100},
                'seed': {'type': 'int', 'label': 'Random Seed', 'default': -1, 'min': -1, 'max': 9999},
                'mirror': {'type': 'bool', 'label': 'Mirror Reflections', 'default': True}
            }
        },
        'colorfuldots': {
            'name': 'Colorful Dots',
            'description': 'Halftone-style patterns with offset colored dots - generate each layer separately',
            'options': {
                'color_mode': {'type': 'select', 'label': 'Color Mode', 'default': 'cmyk', 'options': [
                    {'value': 'cmyk', 'label': 'CMYK (4 layers)'},
                    {'value': 'rgb', 'label': 'RGB (3 layers)'},
                    {'value': 'primary', 'label': 'Primary RYB (3 layers)'},
                    {'value': 'warm', 'label': 'Warm (3 layers)'},
                    {'value': 'cool', 'label': 'Cool (3 layers)'}
                ]},
                'grid_spacing': {'type': 'int', 'label': 'Grid Spacing', 'default': 15, 'min': 8, 'max': 40},
                'max_dot_size': {'type': 'float', 'label': 'Max Dot Size', 'default': 12, 'min': 5, 'max': 30},
                'layer_offset': {'type': 'int', 'label': 'Layer Offset', 'default': 4, 'min': 1, 'max': 12},
                'num_circles': {'type': 'int', 'label': 'Source Circles', 'default': 30, 'min': 5, 'max': 100},
                'circle_min': {'type': 'float', 'label': 'Circle Min Size', 'default': 30, 'min': 10, 'max': 100},
                'circle_max': {'type': 'float', 'label': 'Circle Max Size', 'default': 80, 'min': 30, 'max': 200},
                'seed': {'type': 'int', 'label': 'Random Seed', 'default': -1, 'min': -1, 'max': 9999}
            }
        },
        'interlockings': {
            'name': 'Interlockings',
            'description': 'Rotating parallel line layers that create moiré interference patterns',
            'options': {
                'num_layers': {'type': 'int', 'label': 'Number of Layers', 'default': 6, 'min': 2, 'max': 16},
                'lines_per_layer': {'type': 'int', 'label': 'Lines Per Layer', 'default': 30, 'min': 10, 'max': 80},
                'line_spacing': {'type': 'float', 'label': 'Line Spacing (mm)', 'default': 5, 'min': 2, 'max': 15},
                'center_offset': {'type': 'float', 'label': 'Center Offset (%)', 'default': 10, 'min': 0, 'max': 30},
                'seed': {'type': 'int', 'label': 'Random Seed', 'default': -1, 'min': -1, 'max': 9999}
            }
        },
        'sudokucartography': {
            'name': 'Sudoku Cartography',
            'description': 'Visualizes Sudoku solving algorithm path with bezier curves',
            'options': {
                'initial_clues': {'type': 'int', 'label': 'Initial Clues', 'default': 17, 'min': 10, 'max': 30},
                'curve_tension': {'type': 'float', 'label': 'Curve Tension', 'default': 50, 'min': 10, 'max': 100},
                'draw_grid': {'type': 'bool', 'label': 'Draw Grid', 'default': False},
                'draw_path': {'type': 'bool', 'label': 'Draw Solution Path', 'default': True},
                'seed': {'type': 'int', 'label': 'Random Seed', 'default': -1, 'min': -1, 'max': 9999},
                'max_checks': {'type': 'int', 'label': 'Max Checks to Draw', 'default': 500, 'min': 100, 'max': 2000}
            }
        }
    }
    
    def __init__(self, settings: PlotterSettings):
        self.settings = settings
    
    def _get_seed(self, options: Dict[str, Any], default: int = -1) -> int:
        """Get seed value from options. If -1, generate a truly random seed."""
        import time
        seed = int(options.get('seed', default))
        if seed == -1:
            seed = int(time.time() * 1000) % 999999
        return seed
    
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
    # SLIME MOLD (Physarum) SIMULATION
    # Based on Jeff Jones' algorithm for Physarum transport networks
    # =========================================================================
    
    def _generate_slimemold(self, options: Dict[str, Any]) -> Turtle:
        """Generate a Physarum polycephalum (slime mold) simulation pattern."""
        import numpy as np
        
        turtle = Turtle()
        
        num_agents = int(options.get('agents', 2000))
        iterations = int(options.get('iterations', 200))
        sensor_angle = math.radians(options.get('sensor_angle', 45))
        sensor_distance = options.get('sensor_distance', 9)
        turn_angle = math.radians(options.get('turn_angle', 45))
        step_size = options.get('step_size', 1)
        decay = options.get('decay', 0.9)
        deposit = options.get('deposit', 5)
        draw_trails = options.get('draw_trails', True)
        draw_agents = options.get('draw_agents', False)
        
        work_area = self.settings.get_work_area()
        margin = 30
        width = int((work_area['right'] - work_area['left'] - 2 * margin) / 2)
        height = int((work_area['top'] - work_area['bottom'] - 2 * margin) / 2)
        
        # Trail map - stores pheromone concentration
        trail_map = np.zeros((height, width), dtype=np.float32)
        
        # Agent state: x, y, heading
        agents_x = np.zeros(num_agents, dtype=np.float32)
        agents_y = np.zeros(num_agents, dtype=np.float32)
        agents_heading = np.random.random(num_agents) * 2 * math.pi
        
        # Agent paths for drawing
        agent_paths = [[] for _ in range(num_agents)]
        
        # Initialize agents in center with some randomness
        center_x = width / 2
        center_y = height / 2
        spawn_radius = min(width, height) / 4
        
        init_angles = np.random.random(num_agents) * 2 * math.pi
        init_radii = np.random.random(num_agents) * spawn_radius
        agents_x = center_x + np.cos(init_angles) * init_radii
        agents_y = center_y + np.sin(init_angles) * init_radii
        
        # Record initial positions
        for i in range(num_agents):
            agent_paths[i].append((agents_x[i], agents_y[i]))
        
        # Run simulation
        for step in range(iterations):
            # Sense in three directions for all agents
            for i in range(num_agents):
                x, y, heading = agents_x[i], agents_y[i], agents_heading[i]
                
                # Sense front
                sx = int(x + math.cos(heading) * sensor_distance) % width
                sy = int(y + math.sin(heading) * sensor_distance) % height
                front = trail_map[sy, sx] if 0 <= sx < width and 0 <= sy < height else 0
                
                # Sense left
                left_angle = heading + sensor_angle
                sx = int(x + math.cos(left_angle) * sensor_distance) % width
                sy = int(y + math.sin(left_angle) * sensor_distance) % height
                left = trail_map[sy, sx] if 0 <= sx < width and 0 <= sy < height else 0
                
                # Sense right
                right_angle = heading - sensor_angle
                sx = int(x + math.cos(right_angle) * sensor_distance) % width
                sy = int(y + math.sin(right_angle) * sensor_distance) % height
                right = trail_map[sy, sx] if 0 <= sx < width and 0 <= sy < height else 0
                
                # Turn based on sensor readings
                if front > left and front > right:
                    pass  # Continue forward
                elif front < left and front < right:
                    # Random turn
                    agents_heading[i] += (1 if random.random() < 0.5 else -1) * turn_angle
                elif left < right:
                    agents_heading[i] -= turn_angle  # Turn right
                elif right < left:
                    agents_heading[i] += turn_angle  # Turn left
                
                # Move forward
                new_x = x + math.cos(agents_heading[i]) * step_size
                new_y = y + math.sin(agents_heading[i]) * step_size
                
                # Wrap around boundaries
                agents_x[i] = new_x % width
                agents_y[i] = new_y % height
                
                # Record path
                agent_paths[i].append((agents_x[i], agents_y[i]))
                
                # Deposit pheromone
                ix = int(agents_x[i])
                iy = int(agents_y[i])
                if 0 <= ix < width and 0 <= iy < height:
                    trail_map[iy, ix] += deposit
            
            # Decay trail map
            trail_map *= decay
            
            # Simple blur for diffusion (every 10 steps)
            if step % 10 == 0:
                from scipy.ndimage import uniform_filter
                trail_map = uniform_filter(trail_map, size=3)
        
        offset_x = work_area['left'] + margin
        offset_y = work_area['bottom'] + margin
        
        # Convert trail map to paths using contour tracing
        if draw_trails:
            self._trace_slime_contours(turtle, trail_map, width, height, offset_x, offset_y)
        
        # Draw agent paths (subsampled for performance)
        if draw_agents:
            sample_rate = max(1, num_agents // 200)  # Draw ~200 agent paths
            
            for i in range(0, num_agents, sample_rate):
                path = agent_paths[i]
                if len(path) > 2:
                    # Subsample path points
                    path_sample = max(1, len(path) // 50)
                    
                    for j in range(0, len(path), path_sample):
                        x, y = path[j]
                        px = offset_x + x * 2
                        py = offset_y + y * 2
                        
                        if j == 0:
                            turtle.jump_to(px, py)
                        else:
                            turtle.move_to(px, py)
        
        return turtle
    
    def _trace_slime_contours(self, turtle: Turtle, trail_map, width: int, height: int, 
                               offset_x: float, offset_y: float):
        """Trace contour lines from the trail map."""
        import numpy as np
        
        contour_levels = [5, 15, 30, 50]
        grid_step = 4
        
        for level in contour_levels:
            visited = set()
            
            for y in range(0, height - 1, grid_step):
                for x in range(0, width - 1, grid_step):
                    key = (x, y)
                    if key in visited:
                        continue
                    
                    # Check if this cell crosses the threshold
                    val = float(trail_map[y, x])
                    val_right = float(trail_map[y, x + 1]) if x + 1 < width else 0.0
                    val_down = float(trail_map[y + 1, x]) if y + 1 < height else 0.0
                    
                    above = val >= level
                    right_above = val_right >= level
                    down_above = val_down >= level
                    
                    # If there's a transition, trace a short line segment
                    if above != right_above or above != down_above:
                        visited.add(key)
                        
                        px = float(offset_x + x * 2)
                        py = float(offset_y + y * 2)
                        
                        # Determine line direction based on gradient
                        grad_x = val_right - val
                        grad_y = val_down - val
                        grad_mag = math.sqrt(grad_x * grad_x + grad_y * grad_y) + 0.001
                        
                        # Draw perpendicular to gradient (along contour)
                        perp_x = float(-grad_y / grad_mag * 3)
                        perp_y = float(grad_x / grad_mag * 3)
                        
                        turtle.draw_line(px - perp_x, py - perp_y, px + perp_x, py + perp_y)
    
    # =========================================================================
    # GEODATA WEAVING - Weaving patterns from geographic coordinates
    # =========================================================================
    
    def _generate_geodataweaving(self, options: Dict[str, Any]) -> Turtle:
        """Generate a weaving pattern from geographic coordinates."""
        turtle = Turtle()
        
        latitude = float(options.get('latitude', 37.7749))  # San Francisco default
        longitude = float(options.get('longitude', -122.4194))
        nb_threads = int(options.get('threads', 64))
        nb_shafts = int(options.get('shafts', 4))
        pattern_rows = int(options.get('pattern_rows', 64))
        cell_size = float(options.get('cell_size', 3))
        draw_threading = options.get('draw_threading', True)
        draw_treadling = options.get('draw_treadling', True)
        draw_tieup = options.get('draw_tieup', True)
        draw_drawdown = options.get('draw_drawdown', True)
        
        # Convert coordinates to weaving pattern
        fixed_lat = self._map_range(latitude, -90, 90, 0, 180)
        fixed_long = self._map_range(longitude, -180, 180, 0, 360)
        
        # Remove decimals and get large integers
        lat_int = round(fixed_lat * 10000000)
        long_int = round(fixed_long * 10000000)
        
        # Convert to base N (number of shafts)
        lat_base_n = self._to_base_n(lat_int, nb_shafts)
        long_base_n = self._to_base_n(long_int, nb_shafts)
        
        # Create mirrored sequences for symmetry
        lat_mirror = lat_base_n + list(reversed(lat_base_n))
        long_mirror = long_base_n + list(reversed(long_base_n))
        
        # Generate threading pattern (which shaft each thread goes through)
        threading = []
        for i in range(nb_threads):
            threading.append(lat_mirror[i % len(lat_mirror)])
        
        # Generate treadling pattern (which treadle for each row)
        treadling = []
        for i in range(pattern_rows):
            treadling.append(long_mirror[i % len(long_mirror)])
        
        # Create straight tie-up (diagonal)
        tieup = [[i == j for j in range(nb_shafts)] for i in range(nb_shafts)]
        
        # Calculate drawdown
        drawdown = []
        for row in range(pattern_rows):
            drawdown_row = []
            treadle = treadling[row]
            for col in range(nb_threads):
                shaft = threading[col]
                # Check if this combination produces a mark
                drawdown_row.append(tieup[treadle][shaft] if treadle < nb_shafts and shaft < nb_shafts else False)
            drawdown.append(drawdown_row)
        
        # Layout dimensions
        gutter_size = cell_size
        threading_height = nb_shafts * cell_size
        tieup_width = nb_shafts * cell_size
        drawdown_width = nb_threads * cell_size
        drawdown_height = pattern_rows * cell_size
        
        # Calculate total width and height
        total_width = drawdown_width + gutter_size + tieup_width
        total_height = threading_height + gutter_size + drawdown_height
        
        # Center offset
        offset_x = -total_width / 2
        offset_y = -total_height / 2
        
        # Draw Threading (top section, above drawdown)
        if draw_threading:
            threading_y = offset_y + total_height - threading_height
            for col in range(nb_threads):
                shaft = threading[col]
                x = offset_x + col * cell_size
                y = threading_y + (nb_shafts - 1 - shaft) * cell_size
                self._draw_weaving_cell(turtle, x, y, cell_size)
            # Draw grid outline
            turtle.draw_rect(offset_x, threading_y, drawdown_width, threading_height)
        
        # Draw Tie-up (top-right corner)
        if draw_tieup:
            tieup_x = offset_x + drawdown_width + gutter_size
            tieup_y = offset_y + total_height - threading_height
            for i in range(nb_shafts):
                for j in range(nb_shafts):
                    if tieup[i][j]:
                        x = tieup_x + i * cell_size
                        y = tieup_y + (nb_shafts - 1 - j) * cell_size
                        self._draw_weaving_cell(turtle, x, y, cell_size)
            # Draw grid outline
            turtle.draw_rect(tieup_x, tieup_y, tieup_width, threading_height)
        
        # Draw Treadling (right section, beside drawdown)
        if draw_treadling:
            treadling_x = offset_x + drawdown_width + gutter_size
            treadling_y = offset_y
            for row in range(pattern_rows):
                treadle = treadling[row]
                x = treadling_x + treadle * cell_size
                y = treadling_y + (pattern_rows - 1 - row) * cell_size
                self._draw_weaving_cell(turtle, x, y, cell_size)
            # Draw grid outline
            turtle.draw_rect(treadling_x, treadling_y, tieup_width, drawdown_height)
        
        # Draw Drawdown (main pattern)
        if draw_drawdown:
            for row in range(pattern_rows):
                for col in range(nb_threads):
                    if drawdown[row][col]:
                        x = offset_x + col * cell_size
                        y = offset_y + (pattern_rows - 1 - row) * cell_size
                        self._draw_weaving_cell(turtle, x, y, cell_size)
            # Draw grid outline
            turtle.draw_rect(offset_x, offset_y, drawdown_width, drawdown_height)
        
        return turtle
    
    def _draw_weaving_cell(self, turtle: Turtle, x: float, y: float, size: float):
        """Fill a weaving cell with diagonal hatching."""
        spacing = size / 3
        for i in range(3):
            offset = i * spacing
            turtle.draw_line(x + offset, y, x + size, y + size - offset)
            if i > 0:
                turtle.draw_line(x, y + offset, x + size - offset, y + size)
    
    def _map_range(self, value: float, in_min: float, in_max: float, out_min: float, out_max: float) -> float:
        """Map a value from one range to another."""
        return (value - in_min) * (out_max - out_min) / (in_max - in_min) + out_min
    
    def _to_base_n(self, number: int, base: int) -> list:
        """Convert a number to a list of digits in base N."""
        if number == 0:
            return [0]
        digits = []
        n = abs(number)
        while n > 0:
            digits.insert(0, n % base)
            n = n // base
        return digits
    
    # =========================================================================
    # POETRY CLOUDS - Text-based cloud patterns using Perlin noise
    # Based on "The Poetry Clouds" by Kyle Geske (stungeye.com)
    # =========================================================================
    
    def _generate_poetryclouds(self, options: Dict[str, Any]) -> Turtle:
        """Generate cloud patterns made of text characters using Perlin noise.
        
        Based on "The Poetry Clouds" by Kyle Geske (stungeye.com)
        """
        turtle = Turtle()
        
        text_size = float(options.get('text_size', 6))
        cloud_threshold = float(options.get('cloud_threshold', 0.5))
        noise_scale = float(options.get('noise_scale', 0.01))
        seed = options.get('seed', -1)
        if seed == -1:
            seed = random.randint(1, 9999)
        custom_text = options.get('custom_text', '')
        uppercase = options.get('uppercase', True)
        
        # Initialize Perlin noise with seed
        self._init_perlin(seed)
        
        work_area = self.settings.get_work_area()
        margin = 20
        
        # Grid step based on text size (like cloudPixelScale in original)
        grid_step = text_size * 1.2
        
        start_x = work_area['left'] + margin
        end_x = work_area['right'] - margin
        start_y = work_area['bottom'] + margin
        end_y = work_area['top'] - margin
        
        # Character index for custom text
        char_index = 0
        
        # Loop through grid positions like original p5.js
        x = start_x
        while x <= end_x:
            y = start_y
            while y <= end_y:
                # Sample Perlin noise at this position (like p5.js noise() function)
                n = self._perlin_noise_2d(x * noise_scale, y * noise_scale)
                
                # Skip if below cloud threshold (like original: if (n < cloudCutOff) continue)
                if n < cloud_threshold:
                    y += grid_step
                    continue
                
                # Get letter for this position
                if custom_text:
                    letter = custom_text[char_index % len(custom_text)]
                    char_index += 1
                else:
                    # Use deterministic letter based on position
                    letter = self._get_letter_for_coordinate(x, y)
                
                if uppercase:
                    letter = letter.upper()
                
                # Draw the letter using vector font
                self._draw_vector_letter(turtle, letter, x, y, text_size * 0.8)
                
                y += grid_step
            x += grid_step
        
        return turtle
    
    def _get_letter_for_coordinate(self, x: float, y: float) -> str:
        """Get a deterministic letter for a coordinate using a hash function."""
        hash_val = (x + y) * math.sin(x * y * 0.01)
        index = abs(int(hash_val * 1000)) % 26
        return chr(65 + index)  # A-Z
    
    def _draw_vector_letter(self, turtle: Turtle, char: str, x: float, y: float, size: float):
        """Draw a single letter using vector strokes."""
        # Single-stroke vector font
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
        }
        
        upper_char = char.upper()
        strokes = FONT.get(upper_char)
        
        if not strokes:
            return
        
        for stroke in strokes:
            if len(stroke) >= 2:
                px, py = stroke[0]
                turtle.jump_to(x + px * size, y + py * size)
                for px2, py2 in stroke[1:]:
                    turtle.move_to(x + px2 * size, y + py2 * size)
    
    # =========================================================================
    # GEOMETRIC PATTERN - Recursive grid of geometric shapes
    # Based on "Padrão Geométrico" p5.js sketch
    # =========================================================================
    
    def _generate_geometricpattern(self, options: Dict[str, Any]) -> Turtle:
        """Generate recursive grid of geometric shapes."""
        turtle = Turtle()
        
        columns = int(options.get('columns', 4))
        rows = int(options.get('rows', 5))
        phase = float(options.get('phase', 0.5))
        seed = self._get_seed(options)
        max_recursion = int(options.get('recursion_depth', 2))
        min_cell_size = float(options.get('min_cell_size', 40))
        draw_grid = options.get('draw_grid', True)
        
        work_area = self.settings.get_work_area()
        margin = 20
        
        width = work_area['right'] - work_area['left'] - 2 * margin
        height = work_area['top'] - work_area['bottom'] - 2 * margin
        start_x = work_area['left'] + margin
        start_y = work_area['bottom'] + margin
        
        # Initialize seeded random state
        self._geo_seed = seed
        self._geo_move_diff = 0
        
        # Draw the recursive grid
        self._draw_geo_grid(turtle, start_x, start_y, columns, rows, width, phase, max_recursion, min_cell_size, draw_grid, 0)
        
        return turtle
    
    def _geo_random(self) -> float:
        """Seeded random for geometric pattern."""
        x = math.sin(self._geo_seed) * 10000
        self._geo_seed += 1
        return x - math.floor(x)
    
    def _draw_geo_grid(self, turtle: Turtle, x_start: float, y_start: float, col_count: int, row_count: int,
                       total_width: float, phase: float, max_recursion: int, min_cell_size: float, 
                       draw_grid: bool, depth: int):
        """Draw recursive geometric grid."""
        cell_size = total_width / col_count
        
        for j in range(row_count):
            for i in range(col_count):
                x = x_start + i * cell_size
                y = y_start + j * cell_size
                
                # Draw cell border
                if draw_grid:
                    turtle.draw_rect(x, y, cell_size, cell_size)
                
                # Calculate phase with differential
                movement = math.sin(phase * math.pi * 2 + self._geo_move_diff * 0.3)
                mapped_movement = (movement + 1) / 2  # Map -1..1 to 0..1
                
                # Select shape type
                selector = int(self._geo_random() * 9)
                
                if selector == 0:
                    # Star
                    outer_radius = cell_size / 2 - 5
                    inner_radius = outer_radius * mapped_movement * 0.6 + outer_radius * 0.2
                    points_options = [4, 6, 8, 10, 12, 14, 16, 18]
                    points = points_options[int(self._geo_random() * 8)]
                    self._draw_geo_star(turtle, x + cell_size / 2, y + cell_size / 2, inner_radius, outer_radius, points)
                elif selector == 1:
                    # Circle
                    diameter = (self._geo_random() * cell_size / 2 + cell_size / 2) * mapped_movement
                    if diameter > 5:
                        turtle.draw_circle(x + cell_size / 2, y + cell_size / 2, diameter / 2, 32)
                elif selector == 2:
                    # Double Crown
                    points_options = [3, 5, 7, 9, 11, 13]
                    points = points_options[int(self._geo_random() * 6)]
                    points_height = 0.2 + mapped_movement * 0.6
                    self._draw_geo_double_crown(turtle, x, y, cell_size, cell_size, points, points_height)
                elif selector == 3:
                    # Axe
                    shaft_width = 0.2 + mapped_movement * 0.6
                    self._draw_geo_axe(turtle, x, y, cell_size, cell_size, shaft_width)
                elif selector == 4:
                    # Diamond
                    opening = (0.4 + self._geo_random() * 0.6) * mapped_movement
                    self._draw_geo_diamond(turtle, x, y, cell_size, cell_size, opening)
                elif selector >= 5 and cell_size > min_cell_size and depth < max_recursion:
                    # Recursive grid
                    self._draw_geo_grid(turtle, x, y, 2, 2, cell_size, phase, max_recursion, min_cell_size, draw_grid, depth + 1)
                else:
                    # Default: concentric squares
                    layers = 3 + int(self._geo_random() * 3)
                    for l in range(layers):
                        inset = (l + 1) * cell_size / (layers * 2 + 1) * mapped_movement
                        if cell_size - inset * 2 > 2:
                            turtle.draw_rect(x + inset, y + inset, cell_size - inset * 2, cell_size - inset * 2)
                
                self._geo_move_diff += 1
    
    def _draw_geo_star(self, turtle: Turtle, cx: float, cy: float, inner_radius: float, outer_radius: float, points: int):
        """Draw a multi-pointed star."""
        step = math.pi * 2 / points
        
        for i in range(points):
            ang = step * i - math.pi / 2
            inner_x = cx + math.cos(ang) * inner_radius
            inner_y = cy + math.sin(ang) * inner_radius
            outer_x = cx + math.cos(ang + step / 2) * outer_radius
            outer_y = cy + math.sin(ang + step / 2) * outer_radius
            
            if i == 0:
                turtle.jump_to(inner_x, inner_y)
            else:
                turtle.move_to(inner_x, inner_y)
            turtle.move_to(outer_x, outer_y)
        
        # Close the star
        first_inner_x = cx + math.cos(-math.pi / 2) * inner_radius
        first_inner_y = cy + math.sin(-math.pi / 2) * inner_radius
        turtle.move_to(first_inner_x, first_inner_y)
    
    def _draw_geo_double_crown(self, turtle: Turtle, x: float, y: float, width: float, height: float, 
                                points: int, height_ratio: float):
        """Draw a double crown (zigzag top and bottom)."""
        points_height = height * height_ratio / 2
        points_spacing = width / (points - 1) if points > 1 else width
        
        # Top zigzag
        for i in range(points):
            px = x + i * points_spacing
            py = y + points_height if i % 2 != 0 else y
            
            if i == 0:
                turtle.jump_to(px, py)
            else:
                turtle.move_to(px, py)
        
        # Bottom zigzag
        for i in range(points):
            px = (x + width) - i * points_spacing
            py = y + height - points_height if i % 2 != 0 else y + height
            turtle.move_to(px, py)
        
        # Close
        turtle.move_to(x, y)
    
    def _draw_geo_axe(self, turtle: Turtle, x: float, y: float, width: float, height: float, shaft_width_ratio: float):
        """Draw an axe shape (machado)."""
        shaft_width = width * shaft_width_ratio / 2
        
        turtle.jump_to(x, y)
        turtle.move_to(x + shaft_width, y + shaft_width)
        turtle.move_to(x + shaft_width, y)
        turtle.move_to(x + width - shaft_width, y)
        turtle.move_to(x + width - shaft_width, y + shaft_width)
        turtle.move_to(x + width, y)
        turtle.move_to(x + width, y + height)
        turtle.move_to(x + width - shaft_width, y + height - shaft_width)
        turtle.move_to(x + width - shaft_width, y + height)
        turtle.move_to(x + shaft_width, y + height)
        turtle.move_to(x + shaft_width, y + height - shaft_width)
        turtle.move_to(x, y + height)
        turtle.move_to(x, y)
    
    def _draw_geo_diamond(self, turtle: Turtle, x: float, y: float, width: float, height: float, opening_ratio: float):
        """Draw a diamond/rhombus shape."""
        opening_width = width * opening_ratio / 2
        
        turtle.jump_to(x + opening_width, y + height / 2)
        turtle.move_to(x + width / 2, y)
        turtle.move_to(x + width - opening_width, y + height / 2)
        turtle.move_to(x + width / 2, y + height)
        turtle.move_to(x + opening_width, y + height / 2)
    
    # =========================================================================
    # GLOW - Fluid particle flow driven by Perlin noise flowfield
    # Inspired by "Glow" sketch - knowledge fluidity visualization
    # =========================================================================
    
    def _generate_glow(self, options: Dict[str, Any]):
        """Generate fluid particle trails driven by Perlin noise flowfield.
        
        Returns multi-layer output with particles colored by layer.
        """
        color_profile = options.get('color_profile', 'rainbow')
        num_particles = int(options.get('particles', 500))
        iterations = int(options.get('iterations', 200))
        noise_inc = float(options.get('noise_scale', 0.01))
        flow_scale = float(options.get('flow_cell_size', 10))
        max_speed = float(options.get('max_speed', 1.3))
        seed = self._get_seed(options)
        circular_bounds = options.get('circular_bounds', False)
        draw_trails = options.get('draw_trails', True)
        
        # Initialize Perlin noise
        self._init_perlin(seed)
        
        # Color profile configurations
        layer_configs = {
            'rainbow': {'colors': ['red', 'orange', 'yellow', 'green', 'blue', 'purple', 'pink']},
            'warm': {'colors': ['red', 'orange', 'yellow']},
            'cool': {'colors': ['blue', 'green', 'purple']},
            'monochrome': {'colors': ['black']},
            'primary': {'colors': ['red', 'yellow', 'blue']},
            'pastel': {'colors': ['pink', 'yellow', 'green', 'blue', 'purple']}
        }
        
        config = layer_configs.get(color_profile, layer_configs['rainbow'])
        num_layers = len(config['colors'])
        
        work_area = self.settings.get_work_area()
        margin = 20
        
        width = work_area['right'] - work_area['left'] - 2 * margin
        height = work_area['top'] - work_area['bottom'] - 2 * margin
        start_x = work_area['left'] + margin
        start_y = work_area['bottom'] + margin
        center_x = start_x + width / 2
        center_y = start_y + height / 2
        circle_radius = min(width, height) / 2 * 0.8
        
        # Initialize seeded random
        import random as rnd
        rnd.seed(seed)
        
        # Initialize Perlin noise
        self._init_perlin(seed)
        
        # Flow field grid
        cols = int(width / flow_scale) if flow_scale > 0 else 1
        rows = int(height / flow_scale) if flow_scale > 0 else 1
        flowfield = [None] * (cols * rows)
        
        # Create particles with layer assignments
        particles = []
        for i in range(num_particles):
            if circular_bounds:
                # Random position in circle
                for _ in range(100):
                    px = start_x + rnd.random() * width
                    py = start_y + rnd.random() * height
                    if math.sqrt((px - center_x)**2 + (py - center_y)**2) < circle_radius:
                        break
            else:
                px = start_x + rnd.random() * width
                py = start_y + rnd.random() * height
            
            # Assign particle to a layer
            particle_layer = i % num_layers
            
            particles.append({
                'x': px, 'y': py,
                'vx': 0, 'vy': 0,
                'path': [(px, py)],
                'layer': particle_layer
            })
        
        # Create layer turtles for multi-layer output
        layer_turtles = [Turtle() for _ in range(num_layers)]
        
        # Simulation
        zoff = 0
        
        for _ in range(iterations):
            # Update flowfield
            yoff = 0
            for y in range(rows):
                xoff = 0
                for x in range(cols):
                    index = x + y * cols
                    n = self._perlin_noise_3d(xoff, yoff, zoff)
                    angle = n * math.pi * 4
                    flowfield[index] = (math.cos(angle), math.sin(angle))
                    xoff += noise_inc
                yoff += noise_inc
            zoff += 0.0005
            
            # Update particles
            for p in particles:
                grid_x = int((p['x'] - start_x) / flow_scale)
                grid_y = int((p['y'] - start_y) / flow_scale)
                
                if 0 <= grid_x < cols and 0 <= grid_y < rows:
                    index = grid_x + grid_y * cols
                    force = flowfield[index]
                    
                    if force:
                        p['vx'] += force[0]
                        p['vy'] += force[1]
                        
                        # Limit velocity
                        speed = math.sqrt(p['vx']**2 + p['vy']**2)
                        if speed > max_speed:
                            p['vx'] = (p['vx'] / speed) * max_speed
                            p['vy'] = (p['vy'] / speed) * max_speed
                        
                        p['x'] += p['vx']
                        p['y'] += p['vy']
                        
                        if draw_trails:
                            p['path'].append((p['x'], p['y']))
                        
                        # Handle bounds
                        if circular_bounds:
                            dist = math.sqrt((p['x'] - center_x)**2 + (p['y'] - center_y)**2)
                            if dist > circle_radius:
                                # Reset inside circle
                                for _ in range(100):
                                    p['x'] = start_x + rnd.random() * width
                                    p['y'] = start_y + rnd.random() * height
                                    if math.sqrt((p['x'] - center_x)**2 + (p['y'] - center_y)**2) < circle_radius:
                                        break
                                p['vx'] = p['vy'] = 0
                                # Draw path to the correct layer turtle
                                if draw_trails and len(p['path']) > 1:
                                    self._draw_glow_path(layer_turtles[p['layer']], p['path'])
                                p['path'] = [(p['x'], p['y'])]
                        else:
                            # Wrap around edges
                            wrapped = False
                            if p['x'] > start_x + width:
                                p['x'] = start_x
                                wrapped = True
                            if p['x'] < start_x:
                                p['x'] = start_x + width
                                wrapped = True
                            if p['y'] > start_y + height:
                                p['y'] = start_y
                                wrapped = True
                            if p['y'] < start_y:
                                p['y'] = start_y + height
                                wrapped = True
                            
                            if wrapped:
                                # Draw path to the correct layer turtle
                                if draw_trails and len(p['path']) > 1:
                                    self._draw_glow_path(layer_turtles[p['layer']], p['path'])
                                p['path'] = [(p['x'], p['y'])]
        
        # Draw final paths grouped by layer
        for p in particles:
            layer_turtle = layer_turtles[p['layer']]
            if draw_trails and len(p['path']) > 1:
                self._draw_glow_path(layer_turtle, p['path'])
            elif not draw_trails:
                layer_turtle.jump_to(p['x'] - 0.5, p['y'])
                layer_turtle.move_to(p['x'] + 0.5, p['y'])
        
        # Build multi-layer output
        layers = []
        for i, layer_turtle in enumerate(layer_turtles):
            layers.append({
                'name': f'Glow ({config["colors"][i].capitalize()})',
                'color': config['colors'][i],
                'turtle': layer_turtle
            })
        
        return {'multiLayer': True, 'layers': layers}
    
    def _draw_glow_path(self, turtle: Turtle, path: List[Tuple[float, float]]):
        """Draw a particle trail path."""
        if len(path) < 2:
            return
        turtle.jump_to(path[0][0], path[0][1])
        for pt in path[1:]:
            turtle.move_to(pt[0], pt[1])
    
    # =========================================================================
    # RANDOM POETRY - Scattered words in random positions and sizes
    # Inspired by Emily Dickinson's poetic vocabulary
    # =========================================================================
    
    def _generate_randompoetry(self, options: Dict[str, Any]) -> Turtle:
        """Generate scattered poetry words in random positions and sizes."""
        turtle = Turtle()
        
        word_count = int(options.get('word_count', 25))
        min_size = float(options.get('min_size', 8))
        max_size = float(options.get('max_size', 25))
        seed = self._get_seed(options)
        custom_words = options.get('custom_words', '')
        uppercase = options.get('uppercase', False)
        
        work_area = self.settings.get_work_area()
        margin = 30
        word_preset = options.get('word_preset', 'dickinson')
        
        # Word presets from various poetic traditions
        word_presets = {
            'dickinson': [
                'hope', 'soul', 'death', 'immortal', 'eternity', 'heaven', 'light',
                'bird', 'feathers', 'sing', 'dawn', 'noon', 'sunset', 'night',
                'bee', 'clover', 'garden', 'rose', 'daisy', 'bloom', 'petal',
                'storm', 'wind', 'thunder', 'lightning', 'rain', 'snow', 'frost',
                'heart', 'pain', 'grief', 'joy', 'bliss', 'despair', 'longing',
                'silence', 'solitude', 'shadow', 'whisper', 'dream', 'slumber',
                'truth', 'beauty', 'wonder', 'mystery', 'secret', 'vision',
                'sky', 'stars', 'moon', 'sun', 'earth', 'sea', 'fly', 'soar',
                'wild', 'gentle', 'still', 'bright', 'pale', 'sweet', 'bitter',
                'love', 'life', 'faith', 'grace', 'peace', 'fire', 'flame', 'glow'
            ],
            'shakespeare': [
                'love', 'heart', 'soul', 'fate', 'fortune', 'death', 'life', 'time',
                'beauty', 'youth', 'age', 'truth', 'honor', 'shame', 'pride', 'folly',
                'crown', 'throne', 'king', 'queen', 'prince', 'lord', 'lady', 'knight',
                'sword', 'blood', 'war', 'peace', 'victory', 'defeat', 'revenge',
                'rose', 'summer', 'winter', 'spring', 'tempest', 'storm', 'sea',
                'dream', 'sleep', 'wake', 'night', 'day', 'dawn', 'dusk', 'star',
                'ghost', 'spirit', 'shadow', 'grave', 'tomb', 'heaven', 'hell',
                'kiss', 'embrace', 'parting', 'sorrow', 'joy', 'tears', 'laughter',
                'fair', 'foul', 'sweet', 'bitter', 'gentle', 'cruel', 'noble', 'vile',
                'hence', 'wherefore', 'thou', 'thee', 'thy', 'hath', 'doth', 'forsooth'
            ],
            'poe': [
                'raven', 'nevermore', 'midnight', 'darkness', 'shadow', 'sorrow',
                'dream', 'nightmare', 'tomb', 'grave', 'death', 'dying', 'decay',
                'ghost', 'phantom', 'specter', 'haunted', 'horror', 'terror', 'fear',
                'heart', 'beating', 'silence', 'whisper', 'scream', 'madness', 'sanity',
                'crimson', 'ebony', 'velvet', 'purple', 'pallid', 'ghastly', 'grim',
                'chamber', 'door', 'window', 'floor', 'ceiling', 'wall', 'corridor',
                'lost', 'forgotten', 'memory', 'lenore', 'nevermore', 'evermore',
                'night', 'moon', 'stars', 'darkness', 'lamplight', 'candle', 'flame',
                'lonely', 'solitude', 'weary', 'weak', 'forgotten', 'forlorn', 'forsaken',
                'tapping', 'rapping', 'knocking', 'creaking', 'moaning', 'groaning'
            ],
            'whitman': [
                'america', 'democracy', 'freedom', 'liberty', 'union', 'nation',
                'grass', 'leaves', 'tree', 'oak', 'lilac', 'bloom', 'blossom',
                'body', 'electric', 'soul', 'spirit', 'flesh', 'bone', 'blood',
                'song', 'sing', 'chant', 'voice', 'cry', 'call', 'shout', 'whisper',
                'open', 'road', 'journey', 'travel', 'wander', 'roam', 'explore',
                'sea', 'ocean', 'wave', 'shore', 'ship', 'sail', 'voyage', 'captain',
                'sun', 'moon', 'stars', 'sky', 'earth', 'cosmos', 'universe', 'infinite',
                'love', 'comrade', 'friend', 'brother', 'sister', 'child', 'mother',
                'life', 'death', 'birth', 'grow', 'decay', 'eternal', 'immortal',
                'contain', 'multitudes', 'myself', 'celebrate', 'embrace', 'accept'
            ],
            'romantic': [
                'beauty', 'sublime', 'nature', 'passion', 'imagination', 'emotion',
                'wanderer', 'pilgrim', 'solitary', 'lonely', 'melancholy', 'reverie',
                'mountain', 'valley', 'river', 'lake', 'forest', 'meadow', 'moor',
                'moonlight', 'starlight', 'twilight', 'dawn', 'dusk', 'midnight',
                'nightingale', 'skylark', 'raven', 'dove', 'eagle', 'swan', 'owl',
                'rose', 'lily', 'violet', 'daffodil', 'primrose', 'willow', 'oak',
                'love', 'desire', 'longing', 'yearning', 'ecstasy', 'agony', 'rapture',
                'dream', 'vision', 'phantom', 'spirit', 'ghost', 'muse', 'inspiration',
                'freedom', 'liberty', 'revolution', 'rebellion', 'defiance', 'glory',
                'ancient', 'ruin', 'castle', 'abbey', 'tomb', 'monument', 'legend'
            ],
            'nature': [
                'mountain', 'river', 'ocean', 'forest', 'meadow', 'valley', 'canyon',
                'sunrise', 'sunset', 'moonrise', 'starlight', 'aurora', 'rainbow',
                'oak', 'pine', 'willow', 'birch', 'maple', 'cedar', 'redwood', 'fern',
                'eagle', 'hawk', 'owl', 'raven', 'sparrow', 'heron', 'swan', 'hummingbird',
                'wolf', 'bear', 'deer', 'fox', 'rabbit', 'otter', 'salmon', 'butterfly',
                'rain', 'snow', 'mist', 'fog', 'frost', 'dew', 'thunder', 'lightning',
                'spring', 'summer', 'autumn', 'winter', 'bloom', 'harvest', 'dormant',
                'stone', 'boulder', 'pebble', 'sand', 'clay', 'moss', 'lichen', 'mushroom',
                'stream', 'waterfall', 'pond', 'marsh', 'tide', 'wave', 'current', 'rapids',
                'wild', 'ancient', 'eternal', 'pristine', 'untamed', 'vast', 'serene'
            ],
            'cosmic': [
                'cosmos', 'universe', 'galaxy', 'nebula', 'supernova', 'quasar', 'pulsar',
                'star', 'sun', 'moon', 'planet', 'asteroid', 'comet', 'meteor', 'orbit',
                'light', 'dark', 'void', 'abyss', 'infinite', 'eternal', 'vast', 'endless',
                'space', 'time', 'dimension', 'warp', 'quantum', 'singularity', 'horizon',
                'stellar', 'celestial', 'astral', 'lunar', 'solar', 'galactic', 'cosmic',
                'explore', 'discover', 'voyage', 'journey', 'drift', 'float', 'orbit',
                'birth', 'death', 'creation', 'destruction', 'expansion', 'collapse',
                'matter', 'energy', 'gravity', 'radiation', 'particle', 'wave', 'field',
                'alien', 'unknown', 'mystery', 'wonder', 'awe', 'sublime', 'transcendent',
                'constellation', 'aurora', 'eclipse', 'zenith', 'nadir', 'equinox', 'solstice'
            ],
            'gothic': [
                'darkness', 'shadow', 'gloom', 'midnight', 'twilight', 'dusk', 'moonless',
                'castle', 'dungeon', 'tower', 'crypt', 'tomb', 'catacomb', 'labyrinth',
                'ghost', 'phantom', 'specter', 'wraith', 'apparition', 'haunted', 'cursed',
                'blood', 'bone', 'skull', 'corpse', 'shroud', 'coffin', 'grave', 'funeral',
                'raven', 'bat', 'spider', 'serpent', 'wolf', 'owl', 'crow', 'moth',
                'storm', 'thunder', 'lightning', 'tempest', 'howling', 'wailing', 'moaning',
                'fear', 'terror', 'horror', 'dread', 'anguish', 'despair', 'madness',
                'secret', 'forbidden', 'ancient', 'cursed', 'damned', 'doomed', 'eternal',
                'velvet', 'crimson', 'ebony', 'ivory', 'silver', 'obsidian', 'pallid',
                'whisper', 'scream', 'silence', 'echo', 'footstep', 'creak', 'rattle'
            ],
            'zen': [
                'silence', 'stillness', 'peace', 'calm', 'serenity', 'tranquil', 'quiet',
                'breath', 'breathing', 'inhale', 'exhale', 'flow', 'release', 'let',
                'mind', 'awareness', 'presence', 'moment', 'now', 'here', 'being',
                'water', 'river', 'stream', 'rain', 'dew', 'mist', 'cloud', 'wave',
                'mountain', 'stone', 'pebble', 'sand', 'garden', 'bamboo', 'lotus', 'cherry',
                'moon', 'sun', 'sky', 'wind', 'leaf', 'blossom', 'autumn', 'spring',
                'path', 'way', 'journey', 'step', 'walk', 'sit', 'stand', 'bow',
                'empty', 'full', 'nothing', 'everything', 'one', 'whole', 'unity',
                'simple', 'plain', 'humble', 'gentle', 'soft', 'strong', 'flexible',
                'tea', 'bowl', 'bell', 'incense', 'candle', 'mat', 'cushion', 'robe'
            ]
        }
        
        # Use custom words if provided, otherwise use preset
        if custom_words and custom_words.strip():
            words = [w.strip() for w in custom_words.split(',') if w.strip()]
        else:
            words = word_presets.get(word_preset, word_presets['dickinson'])
        
        # Seed random
        import random as rnd
        rnd.seed(seed)
        
        start_x = work_area['left'] + margin
        end_x = work_area['right'] - margin
        start_y = work_area['bottom'] + margin
        end_y = work_area['top'] - margin
        range_x = end_x - start_x
        range_y = end_y - start_y
        
        # Draw scattered words
        for i in range(word_count):
            # Random position
            x = start_x + rnd.random() * range_x
            y = start_y + rnd.random() * range_y
            
            # Random size
            size = min_size + rnd.random() * (max_size - min_size)
            
            # Random word
            word = rnd.choice(words)
            
            if uppercase:
                word = word.upper()
            
            # Draw the word
            self._draw_word(turtle, word, x, y, size)
        
        return turtle
    
    def _draw_word(self, turtle: Turtle, word: str, x: float, y: float, size: float):
        """Draw a complete word using vector letters."""
        letter_spacing = size * 0.7
        current_x = x
        
        for char in word:
            self._draw_vector_letter(turtle, char, current_x, y, size)
            current_x += letter_spacing
    
    # =========================================================================
    # GAME OF LIFE - Conway's cellular automaton
    # =========================================================================
    
    def _generate_gameoflife(self, options: Dict[str, Any]) -> Turtle:
        """Generate Conway's Game of Life cellular automaton."""
        turtle = Turtle()
        
        cell_size = float(options.get('cell_size', 8))
        generations = int(options.get('generations', 50))
        initial_density = float(options.get('initial_density', 0.4))
        seed = self._get_seed(options)
        draw_grid = options.get('draw_grid', False)
        fill_cells = options.get('fill_cells', True)
        show_history = options.get('show_history', False)
        
        work_area = self.settings.get_work_area()
        margin = 10
        
        start_x = work_area['left'] + margin
        start_y = work_area['bottom'] + margin
        width = work_area['right'] - work_area['left'] - 2 * margin
        height = work_area['top'] - work_area['bottom'] - 2 * margin
        
        column_count = int(width / cell_size)
        row_count = int(height / cell_size)
        
        # Seeded random
        import random as rnd
        rnd.seed(seed)
        
        # Initialize grids
        current_cells = [[0] * row_count for _ in range(column_count)]
        next_cells = [[0] * row_count for _ in range(column_count)]
        
        # Random initial state
        for col in range(column_count):
            for row in range(row_count):
                current_cells[col][row] = 1 if rnd.random() < initial_density else 0
        
        # Track history if needed
        history = [self._copy_life_grid(current_cells, column_count, row_count)] if show_history else None
        
        # Run simulation
        for gen in range(generations):
            for col in range(column_count):
                for row in range(row_count):
                    # Wrap-around neighbors
                    left = (col - 1 + column_count) % column_count
                    right = (col + 1) % column_count
                    above = (row - 1 + row_count) % row_count
                    below = (row + 1) % row_count
                    
                    # Count neighbors
                    neighbors = (
                        current_cells[left][above] +
                        current_cells[col][above] +
                        current_cells[right][above] +
                        current_cells[left][row] +
                        current_cells[right][row] +
                        current_cells[left][below] +
                        current_cells[col][below] +
                        current_cells[right][below]
                    )
                    
                    # Rules of Life
                    if neighbors < 2 or neighbors > 3:
                        next_cells[col][row] = 0
                    elif neighbors == 3:
                        next_cells[col][row] = 1
                    else:
                        next_cells[col][row] = current_cells[col][row]
            
            # Swap grids
            current_cells, next_cells = next_cells, current_cells
            
            if show_history:
                history.append(self._copy_life_grid(current_cells, column_count, row_count))
        
        # Draw grid lines
        if draw_grid:
            for col in range(column_count + 1):
                x = start_x + col * cell_size
                turtle.jump_to(x, start_y)
                turtle.move_to(x, start_y + row_count * cell_size)
            for row in range(row_count + 1):
                y = start_y + row * cell_size
                turtle.jump_to(start_x, y)
                turtle.move_to(start_x + column_count * cell_size, y)
        
        # Draw cells
        if show_history and history:
            step = max(1, len(history) // 10)
            for g in range(0, len(history), step):
                grid = history[g]
                density = (g + 1) / len(history)
                self._draw_life_cells(turtle, grid, column_count, row_count, start_x, start_y, cell_size, fill_cells, density)
        else:
            self._draw_life_cells(turtle, current_cells, column_count, row_count, start_x, start_y, cell_size, fill_cells, 1.0)
        
        return turtle
    
    def _copy_life_grid(self, grid: List[List[int]], cols: int, rows: int) -> List[List[int]]:
        """Copy a 2D grid."""
        return [[grid[col][row] for row in range(rows)] for col in range(cols)]
    
    def _draw_life_cells(self, turtle: Turtle, grid: List[List[int]], cols: int, rows: int,
                         start_x: float, start_y: float, cell_size: float, fill: bool, density: float):
        """Draw Game of Life cells."""
        for col in range(cols):
            for row in range(rows):
                if grid[col][row] == 1:
                    x = start_x + col * cell_size
                    y = start_y + row * cell_size
                    
                    if fill:
                        # Hatch fill based on density
                        hatch_spacing = cell_size / (2 + density * 3)
                        h = hatch_spacing
                        while h < cell_size:
                            turtle.jump_to(x + h, y)
                            turtle.move_to(x + h, y + cell_size)
                            h += hatch_spacing
                    
                    # Draw border
                    turtle.draw_rect(x, y, cell_size, cell_size)
    
    # =========================================================================
    # ZEN POTS - Pottery shapes with stippled dot aesthetic
    # Inspired by the OpenProcessing pottery challenge
    # =========================================================================
    
    def _generate_zenpots(self, options: Dict[str, Any]):
        """Generate pottery shapes with flowers and stippled dot patterns.
        
        Returns multi-layer output: ground, pots, and flowers as separate layers.
        """
        pot_count = int(options.get('pot_count', 12))
        dot_density = float(options.get('dot_density', 0.4))
        flower_style = options.get('flower_style', 'branches')
        flower_density = float(options.get('flower_density', 0.5))
        pot_color_theme = options.get('pot_color', 'terracotta')
        flower_color_theme = options.get('flower_color', 'forest')
        seed = self._get_seed(options)
        draw_ground = options.get('draw_ground', True)
        
        # Color mappings for pots/ground
        pot_colors = {
            'terracotta': {'pot': 'orange', 'ground': 'brown'},
            'earth': {'pot': 'brown', 'ground': 'brown'},
            'slate': {'pot': 'blue', 'ground': 'blue'},
            'clay': {'pot': 'pink', 'ground': 'brown'},
            'ceramic': {'pot': 'blue', 'ground': 'brown'},
            'rustic': {'pot': 'red', 'ground': 'brown'},
            'modern': {'pot': 'black', 'ground': 'black'},
            'vintage': {'pot': 'purple', 'ground': 'brown'}
        }
        
        # Color mappings for flowers
        flower_colors = {
            'forest': 'green',
            'spring': 'pink',
            'autumn': 'orange',
            'lavender': 'purple',
            'wildflower': 'pink',
            'tropical': 'yellow',
            'berry': 'red',
            'ink': 'black'
        }
        
        pot_theme = pot_colors.get(pot_color_theme, pot_colors['terracotta'])
        flower_pen_color = flower_colors.get(flower_color_theme, 'green')
        
        work_area = self.settings.get_work_area()
        padding = min(work_area['right'] - work_area['left'], 
                     work_area['top'] - work_area['bottom']) * 0.1
        
        start_x = work_area['left'] + padding
        end_x = work_area['right'] - padding
        base_y = work_area['bottom'] + padding + (work_area['top'] - work_area['bottom'] - 2 * padding) * 0.2
        available_width = end_x - start_x
        pot_width = available_width / pot_count
        
        # Seeded random
        import random as rnd
        rnd.seed(seed)
        
        # Store pot data for consistent flower placement across layers
        pot_data = []
        for i in range(pot_count):
            pot_center_x = start_x + (i + 0.5) * pot_width
            pot_base_y = base_y
            pot_radius = pot_width * 0.4
            min_h = 0.4 + rnd.random() * 0.3
            max_h = 1.5 + rnd.random() * 0.5
            pot_height = pot_width * (min_h + rnd.random() * (max_h - min_h))
            has_flower = flower_style != 'none' and rnd.random() < flower_density + 0.3
            pot_data.append({
                'x': pot_center_x,
                'y': pot_base_y,
                'radius': pot_radius,
                'height': pot_height,
                'has_flower': has_flower
            })
        
        layers = []
        
        # Layer 1: Ground
        if draw_ground:
            ground_turtle = Turtle()
            rnd.seed(seed + 500)
            ground_turtle.jump_to(start_x - padding * 0.5, base_y)
            ground_turtle.move_to(end_x + padding * 0.5, base_y)
            
            ground_dots = int(available_width * dot_density * 3)
            for _ in range(ground_dots):
                dx = start_x + rnd.random() * available_width
                dy = base_y - rnd.random() * padding * 0.4
                ground_turtle.jump_to(dx - 0.2, dy)
                ground_turtle.move_to(dx + 0.2, dy)
            
            layers.append({
                'name': f'Zen Pots (Ground - {pot_color_theme.capitalize()})',
                'color': pot_theme['ground'],
                'turtle': ground_turtle
            })
        
        # Layer 2: Pots
        pots_turtle = Turtle()
        rnd.seed(seed)
        for _ in range(pot_count * 4):
            rnd.random()
        
        for pd in pot_data:
            self._draw_zen_pot(pots_turtle, pd['x'], pd['y'], pd['radius'], pd['height'], rnd, dot_density, False)
        
        layers.append({
            'name': f'Zen Pots (Pots - {pot_color_theme.capitalize()})',
            'color': pot_theme['pot'],
            'turtle': pots_turtle
        })
        
        # Layer 3: Flowers
        if flower_style != 'none':
            rnd.seed(seed + 1000)
            
            # Wildflower creates multiple colored layers
            if flower_color_theme == 'wildflower':
                wildflower_colors = ['green', 'pink', 'purple', 'red', 'orange', 'yellow']
                flower_turtles = {color: Turtle() for color in wildflower_colors}
                
                for pd in pot_data:
                    if pd['has_flower']:
                        top_y = pd['y'] + pd['height']
                        # Pick random color for this flower
                        flower_color = wildflower_colors[int(rnd.random() * len(wildflower_colors))]
                        # Pick style (or use specified, with 'mixed' choosing randomly)
                        actual_style = flower_style
                        if flower_style == 'mixed':
                            styles = ['branches', 'minimal', 'full']
                            actual_style = styles[int(rnd.random() * len(styles))]
                        self._draw_zen_flower(flower_turtles[flower_color], pd['x'], top_y, pd['radius'], pd['height'] * 0.6, rnd, actual_style, flower_density)
                
                for color in wildflower_colors:
                    if flower_turtles[color].get_paths():
                        layers.append({
                            'name': f'Zen Pots (Flowers - {color.capitalize()})',
                            'color': color,
                            'turtle': flower_turtles[color]
                        })
            else:
                # Single color flowers
                flowers_turtle = Turtle()
                
                for pd in pot_data:
                    if pd['has_flower']:
                        top_y = pd['y'] + pd['height']
                        # Pick style (or use specified, with 'mixed' choosing randomly)
                        actual_style = flower_style
                        if flower_style == 'mixed':
                            styles = ['branches', 'minimal', 'full']
                            actual_style = styles[int(rnd.random() * len(styles))]
                        self._draw_zen_flower(flowers_turtle, pd['x'], top_y, pd['radius'], pd['height'] * 0.6, rnd, actual_style, flower_density)
                
                layers.append({
                    'name': f'Zen Pots (Flowers - {flower_color_theme.capitalize()})',
                    'color': flower_pen_color,
                    'turtle': flowers_turtle
                })
        
        return {'multiLayer': True, 'layers': layers}
    
    def _draw_zen_pot_dummy(self, rnd, height):
        """Consume random numbers to keep sync without drawing."""
        # Match the random calls in _draw_zen_pot
        rnd.random()  # ease_type
        rnd.random()  # bulge_pos
        rnd.random()  # neck_pos
        rnd.random()  # base_width
        rnd.random()  # neck_width
        rnd.random()  # lip_width
        rnd.random()  # has_lip
    
    def _draw_zen_pot(self, turtle: Turtle, center_x: float, base_y: float, max_radius: float, 
                      height: float, rnd, dot_density: float, outline_only: bool):
        """Draw a single zen pot with easing curves."""
        segments = 30
        profile = []
        
        # Random pot shape parameters
        ease_type = int(rnd.random() * 5)
        bulge_pos = 0.2 + rnd.random() * 0.5
        neck_pos = 0.7 + rnd.random() * 0.2
        base_width = 0.3 + rnd.random() * 0.4
        neck_width = 0.2 + rnd.random() * 0.3
        lip_width = 0.3 + rnd.random() * 0.4
        has_lip = rnd.random() > 0.3
        
        for i in range(segments + 1):
            t = i / segments
            
            if t < bulge_pos:
                local_t = t / bulge_pos
                eased = self._pot_ease(local_t, ease_type)
                radius = base_width + (1 - base_width) * eased
            elif t < neck_pos:
                local_t = (t - bulge_pos) / (neck_pos - bulge_pos)
                eased = self._pot_ease(local_t, (ease_type + 1) % 5)
                radius = 1 - (1 - neck_width) * eased
            else:
                local_t = (t - neck_pos) / (1 - neck_pos)
                if has_lip:
                    radius = neck_width + (lip_width - neck_width) * math.sin(local_t * math.pi)
                else:
                    radius = neck_width + (lip_width - neck_width) * local_t * 0.5
            
            profile.append({
                'y': base_y + t * height,
                'radius': radius * max_radius
            })
        
        # Draw left side
        turtle.jump_to(center_x - profile[0]['radius'], profile[0]['y'])
        for i in range(1, len(profile)):
            turtle.move_to(center_x - profile[i]['radius'], profile[i]['y'])
        
        # Draw rim
        top_radius = profile[-1]['radius']
        turtle.move_to(center_x + top_radius, profile[-1]['y'])
        
        # Draw right side (going down)
        for i in range(len(profile) - 2, -1, -1):
            turtle.move_to(center_x + profile[i]['radius'], profile[i]['y'])
        
        # Close bottom
        turtle.move_to(center_x - profile[0]['radius'], profile[0]['y'])
        
        # Add stipple dots
        if not outline_only:
            dot_count = int(height * max_radius * dot_density * 0.5)
            
            for _ in range(dot_count):
                t = rnd.random()
                profile_idx = int(t * (len(profile) - 1))
                next_idx = min(profile_idx + 1, len(profile) - 1)
                
                local_t = t * (len(profile) - 1) - profile_idx
                r = profile[profile_idx]['radius'] * (1 - local_t) + profile[next_idx]['radius'] * local_t
                y = profile[profile_idx]['y'] * (1 - local_t) + profile[next_idx]['y'] * local_t
                
                angle = rnd.random() * math.pi
                dist_from_center = rnd.random() * r * 0.9
                dx = math.cos(angle) * dist_from_center * (1 if rnd.random() > 0.5 else -1)
                
                turtle.jump_to(center_x + dx - 0.2, y)
                turtle.move_to(center_x + dx + 0.2, y)
            
            # Horizontal texture lines
            line_count = int(3 + rnd.random() * 5)
            for _ in range(line_count):
                t = 0.1 + rnd.random() * 0.7
                profile_idx = int(t * (len(profile) - 1))
                r = profile[profile_idx]['radius'] * 0.95
                y = profile[profile_idx]['y']
                
                start_angle = rnd.random() * 0.3
                end_angle = 0.7 + rnd.random() * 0.3
                
                turtle.jump_to(center_x - r * (1 - start_angle * 2), y)
                turtle.move_to(center_x + r * (end_angle * 2 - 1), y)
    
    def _pot_ease(self, t: float, ease_type: int) -> float:
        """Easing functions for pot profiles."""
        if ease_type == 0:  # Ease in quad
            return t * t
        elif ease_type == 1:  # Ease out quad
            return 1 - (1 - t) * (1 - t)
        elif ease_type == 2:  # Ease in out sine
            return -(math.cos(math.pi * t) - 1) / 2
        elif ease_type == 3:  # Ease out cubic
            return 1 - pow(1 - t, 3)
        elif ease_type == 4:  # Ease in out quad
            return 2 * t * t if t < 0.5 else 1 - pow(-2 * t + 2, 2) / 2
        return t
    
    def _draw_zen_flower(self, turtle: Turtle, center_x: float, top_y: float, 
                         pot_radius: float, max_height: float, rnd, style: str, density: float):
        """Draw organic flower/branch arrangements coming out of a pot."""
        branch_count = int(3 + rnd.random() * 5 * density)
        
        if style == 'branches':
            # Organic branches with berries - natural flowing curves
            for b in range(branch_count):
                # Base position varies across pot opening
                start_x = center_x + (rnd.random() - 0.5) * pot_radius * 0.5
                start_y = top_y
                
                # Natural upward angle with slight lean
                base_angle = math.radians(70 + rnd.random() * 40)
                lean = 1 if rnd.random() > 0.5 else -1
                branch_length = max_height * (0.6 + rnd.random() * 0.5)
                
                # Draw organic curved main branch
                segments = 12
                points = [(start_x, start_y)]
                turtle.jump_to(start_x, start_y)
                
                # Create natural curve with bezier-like progression
                curve_strength = (rnd.random() - 0.3) * 8 * lean
                taper = 0.02 + rnd.random() * 0.03  # Branch tapers as it grows
                
                for i in range(1, segments + 1):
                    t = i / segments
                    # Natural S-curve with gravity effect
                    curve = curve_strength * math.sin(t * math.pi * 0.8)
                    droop = t * t * 2  # Slight droop at the end
                    
                    bx = start_x + math.sin(base_angle) * branch_length * t * lean + curve
                    by = start_y + math.cos(base_angle * 0.6) * branch_length * t - droop
                    
                    turtle.move_to(bx, by)
                    points.append((bx, by))
                
                # Add sub-branches with berries at natural intervals
                sub_branch_count = int(4 + rnd.random() * 8 * density)
                for j in range(sub_branch_count):
                    # Position along main branch (more toward outer half)
                    t = 0.25 + rnd.random() * 0.7
                    idx = int(t * (len(points) - 1))
                    if idx < 1 or idx >= len(points):
                        continue
                    
                    px, py = points[idx]
                    
                    # Sub-branch angles out from main branch
                    sub_lean = 1 if rnd.random() > 0.5 else -1
                    sub_angle = base_angle * lean + sub_lean * (0.3 + rnd.random() * 0.6)
                    sub_length = max_height * 0.06 * (0.6 + rnd.random() * 0.8)
                    
                    # Draw curved sub-branch (twig)
                    turtle.jump_to(px, py)
                    mid_x = px + math.sin(sub_angle) * sub_length * 0.5
                    mid_y = py + math.cos(sub_angle * 0.5) * sub_length * 0.5
                    turtle.move_to(mid_x, mid_y)
                    
                    end_x = px + math.sin(sub_angle) * sub_length
                    end_y = py + math.cos(sub_angle * 0.4) * sub_length
                    turtle.move_to(end_x, end_y)
                    
                    # Berry cluster at end of twig
                    berry_count = 1 + int(rnd.random() * 3)
                    for _ in range(berry_count):
                        berry_offset_x = (rnd.random() - 0.5) * 2.5
                        berry_offset_y = (rnd.random() - 0.5) * 2.5
                        berry_radius = 1.2 + rnd.random() * 1.8
                        bx = end_x + berry_offset_x
                        by = end_y + berry_offset_y
                        # Draw berry as filled circle (concentric circles for density)
                        turtle.draw_circle(bx, by, berry_radius, 10)
                        if rnd.random() > 0.5:
                            turtle.draw_circle(bx, by, berry_radius * 0.5, 6)
                    
        elif style == 'minimal':
            # Elegant simple twigs with sparse leaves
            for _ in range(branch_count):
                start_x = center_x + (rnd.random() - 0.5) * pot_radius * 0.4
                lean = 1 if rnd.random() > 0.5 else -1
                angle = math.radians(75 + rnd.random() * 30) * lean
                length = max_height * (0.4 + rnd.random() * 0.5)
                
                # Curved main stem
                turtle.jump_to(start_x, top_y)
                curve = (rnd.random() - 0.5) * 6
                
                segments = 6
                points = []
                for i in range(1, segments + 1):
                    t = i / segments
                    cx = start_x + math.sin(angle) * length * t + curve * math.sin(t * math.pi)
                    cy = top_y + length * t * 0.8
                    turtle.move_to(cx, cy)
                    points.append((cx, cy))
                
                # Sparse leaf-like offshoots
                leaf_count = 2 + int(rnd.random() * 4 * density)
                for k in range(leaf_count):
                    if k >= len(points):
                        continue
                    px, py = points[k]
                    
                    # Simple leaf stroke
                    leaf_angle = angle + (1 if k % 2 == 0 else -1) * (0.4 + rnd.random() * 0.4)
                    leaf_len = length * 0.08 * (0.5 + rnd.random())
                    
                    turtle.jump_to(px, py)
                    lx = px + math.sin(leaf_angle) * leaf_len
                    ly = py + math.cos(leaf_angle) * leaf_len * 0.4
                    turtle.move_to(lx, ly)
                    
        elif style == 'full':
            # Full blooming flowers with organic stems
            for _ in range(branch_count):
                start_x = center_x + (rnd.random() - 0.5) * pot_radius * 0.4
                lean = 1 if rnd.random() > 0.5 else -1
                stem_length = max_height * (0.5 + rnd.random() * 0.4)
                
                # Organic curved stem
                curve = (rnd.random() - 0.3) * 10 * lean
                
                turtle.jump_to(start_x, top_y)
                segments = 8
                for i in range(1, segments + 1):
                    t = i / segments
                    cx = start_x + curve * math.sin(t * math.pi * 0.7)
                    cy = top_y + stem_length * t
                    turtle.move_to(cx, cy)
                
                end_x = start_x + curve * math.sin(math.pi * 0.7)
                end_y = top_y + stem_length
                
                # Flower head with layered petals
                petal_count = 5 + int(rnd.random() * 4)
                outer_radius = 5 + rnd.random() * 7
                inner_radius = outer_radius * 0.6
                
                # Outer petals
                for p in range(petal_count):
                    petal_angle = (p / petal_count) * math.pi * 2 + rnd.random() * 0.2
                    # Draw petal as two curves meeting at a point
                    px = end_x + math.cos(petal_angle) * outer_radius
                    py = end_y + math.sin(petal_angle) * outer_radius * 0.7
                    
                    # Petal shape - curved edges
                    turtle.jump_to(end_x, end_y)
                    ctrl_angle = petal_angle + 0.3
                    ctrl_x = end_x + math.cos(ctrl_angle) * outer_radius * 0.6
                    ctrl_y = end_y + math.sin(ctrl_angle) * outer_radius * 0.5
                    turtle.move_to(ctrl_x, ctrl_y)
                    turtle.move_to(px, py)
                    
                    ctrl_angle2 = petal_angle - 0.3
                    ctrl_x2 = end_x + math.cos(ctrl_angle2) * outer_radius * 0.6
                    ctrl_y2 = end_y + math.sin(ctrl_angle2) * outer_radius * 0.5
                    turtle.move_to(ctrl_x2, ctrl_y2)
                    turtle.move_to(end_x, end_y)
                
                # Inner details (stamens)
                stamen_count = 3 + int(rnd.random() * 4)
                for s in range(stamen_count):
                    s_angle = (s / stamen_count) * math.pi * 2 + rnd.random() * 0.5
                    s_len = outer_radius * 0.35 * (0.7 + rnd.random() * 0.3)
                    sx = end_x + math.cos(s_angle) * s_len
                    sy = end_y + math.sin(s_angle) * s_len * 0.6
                    
                    turtle.jump_to(end_x, end_y)
                    turtle.move_to(sx, sy)
                    # Small dot at end
                    turtle.draw_circle(sx, sy, 0.8, 6)
                
                # Center circle
                turtle.draw_circle(end_x, end_y, outer_radius * 0.2, 10)
    
    # =========================================================================
    # BEZIER CURVES - Beautiful flowing bezier curves
    # =========================================================================
    
    def _generate_bezier(self, options: Dict[str, Any]) -> Turtle:
        """Generate beautiful flowing bezier curves."""
        turtle = Turtle()
        
        curve_count = int(options.get('curve_count', 10))
        curve_spread = float(options.get('curve_spread', 20))
        control_variation = float(options.get('control_variation', 0.5))
        curve_style = options.get('curve_style', 'flowing')
        segments = int(options.get('segments', 30))
        seed = self._get_seed(options)
        show_control_points = options.get('show_control_points', False)
        
        work_area = self.settings.get_work_area()
        margin = 20
        
        start_x = work_area['left'] + margin
        end_x = work_area['right'] - margin
        start_y = work_area['bottom'] + margin
        end_y = work_area['top'] - margin
        width = end_x - start_x
        height = end_y - start_y
        center_x = start_x + width / 2
        center_y = start_y + height / 2
        
        import random as rnd
        rnd.seed(seed)
        
        for i in range(curve_count):
            t = i / max(1, curve_count - 1)
            offset = (i - curve_count / 2) * curve_spread
            
            if curve_style == 'flowing':
                p0 = (start_x + offset * 0.5, end_y - abs(offset))
                p1 = (start_x + width * 0.3 + rnd.random() * width * 0.2 * control_variation,
                      start_y + height * 0.2 + rnd.random() * height * 0.3 * control_variation)
                p2 = (start_x + width * 0.6 + rnd.random() * width * 0.2 * control_variation,
                      end_y - height * 0.2 - rnd.random() * height * 0.3 * control_variation)
                p3 = (end_x - offset * 0.3, start_y + height * 0.7 + offset * 0.02)
                
            elif curve_style == 'random':
                p0 = (start_x + rnd.random() * width, start_y + rnd.random() * height)
                p1 = (start_x + rnd.random() * width, start_y + rnd.random() * height)
                p2 = (start_x + rnd.random() * width, start_y + rnd.random() * height)
                p3 = (start_x + rnd.random() * width, start_y + rnd.random() * height)
                
            elif curve_style == 'parallel':
                y_pos = start_y + (i + 0.5) * height / curve_count
                wave = math.sin(t * math.pi * 2) * height * 0.1 * control_variation
                p0 = (start_x, y_pos)
                p1 = (start_x + width * 0.33, y_pos + wave + (rnd.random() - 0.5) * curve_spread)
                p2 = (start_x + width * 0.67, y_pos - wave + (rnd.random() - 0.5) * curve_spread)
                p3 = (end_x, y_pos)
                
            elif curve_style == 'radial':
                angle = (i / curve_count) * math.pi * 2
                radius = min(width, height) * 0.4
                p0 = (center_x, center_y)
                p1 = (center_x + math.cos(angle + 0.3) * radius * 0.4,
                      center_y + math.sin(angle + 0.3) * radius * 0.4)
                p2 = (center_x + math.cos(angle - 0.3) * radius * 0.7,
                      center_y + math.sin(angle - 0.3) * radius * 0.7)
                p3 = (center_x + math.cos(angle) * radius * (0.8 + rnd.random() * 0.4 * control_variation),
                      center_y + math.sin(angle) * radius * (0.8 + rnd.random() * 0.4 * control_variation))
                
            elif curve_style == 'wave':
                base_y = start_y + (i + 0.5) * height / curve_count
                amplitude = height / curve_count * 0.8 * (0.5 + rnd.random() * control_variation)
                p0 = (start_x, base_y)
                p1 = (start_x + width * 0.25, base_y + amplitude)
                p2 = (start_x + width * 0.75, base_y - amplitude)
                p3 = (end_x, base_y)
                
            else:
                p0 = (start_x, center_y + offset)
                p1 = (center_x - width * 0.2, end_y)
                p2 = (center_x + width * 0.2, start_y)
                p3 = (end_x, center_y - offset)
            
            # Draw the curve
            self._draw_bezier_curve(turtle, p0, p1, p2, p3, segments)
            
            # Show control points if requested
            if show_control_points:
                turtle.jump_to(p0[0], p0[1])
                turtle.move_to(p1[0], p1[1])
                turtle.jump_to(p3[0], p3[1])
                turtle.move_to(p2[0], p2[1])
                
                for p in [p0, p1, p2, p3]:
                    turtle.draw_circle(p[0], p[1], 2, 8)
        
        return turtle
    
    def _draw_bezier_curve(self, turtle: Turtle, p0: Tuple[float, float], p1: Tuple[float, float],
                           p2: Tuple[float, float], p3: Tuple[float, float], segments: int):
        """Draw a cubic bezier curve."""
        turtle.jump_to(p0[0], p0[1])
        
        for i in range(1, segments + 1):
            t = i / segments
            point = self._bezier_point(p0, p1, p2, p3, t)
            turtle.move_to(point[0], point[1])
    
    def _bezier_point(self, p0: Tuple[float, float], p1: Tuple[float, float],
                      p2: Tuple[float, float], p3: Tuple[float, float], t: float) -> Tuple[float, float]:
        """Calculate a point on a cubic bezier curve."""
        t2 = t * t
        t3 = t2 * t
        mt = 1 - t
        mt2 = mt * mt
        mt3 = mt2 * mt
        
        x = mt3 * p0[0] + 3 * mt2 * t * p1[0] + 3 * mt * t2 * p2[0] + t3 * p3[0]
        y = mt3 * p0[1] + 3 * mt2 * t * p1[1] + 3 * mt * t2 * p2[1] + t3 * p3[1]
        return (x, y)
    
    # =========================================================================
    # PERLIN NOISE - Grid of shapes sized by noise values
    # =========================================================================
    
    def _generate_noise(self, options: Dict[str, Any]) -> Turtle:
        """Generate grid of shapes sized by Perlin noise values."""
        turtle = Turtle()
        
        grid_gap = float(options.get('grid_spacing', 15))
        x_scale = float(options.get('noise_scale_x', 0.015))
        y_scale = float(options.get('noise_scale_y', 0.02))
        offset = float(options.get('offset', 0))
        min_size_ratio = float(options.get('min_size_ratio', 0.1))  # 0-1 ratio
        shape = options.get('shape', 'circle')
        seed = self._get_seed(options)
        invert = options.get('invert_noise', False)
        
        work_area = self.settings.get_work_area()
        margin = grid_gap
        
        start_x = work_area['left'] + margin
        end_x = work_area['right'] - margin
        start_y = work_area['bottom'] + margin
        end_y = work_area['top'] - margin
        
        # Initialize Perlin noise with seed
        self._init_perlin(seed)
        
        # Maximum shape size is most of the grid cell
        max_size = grid_gap * 0.9
        min_size = max_size * min_size_ratio
        size_range = max_size - min_size
        
        # Loop through grid
        x = start_x + grid_gap / 2
        while x < end_x:
            y = start_y + grid_gap / 2
            while y < end_y:
                # Calculate noise value using scaled coordinates
                # Add offset for variation, noise returns 0-1
                noise_val = self._perlin_noise_2d((x + offset) * x_scale, (y + offset) * y_scale)
                
                if invert:
                    noise_val = 1 - noise_val
                
                # Map noise value to size range
                size = min_size + noise_val * size_range
                
                if size > 0.5:
                    self._draw_noise_shape(turtle, x, y, size, shape)
                
                y += grid_gap
            x += grid_gap
        
        return turtle
    
    def _draw_noise_shape(self, turtle: Turtle, x: float, y: float, size: float, shape: str):
        """Draw a shape for the noise grid."""
        half_size = size / 2
        
        if shape == 'circle':
            segments = max(8, int(size * 2))
            turtle.draw_circle(x, y, half_size, segments)
            
        elif shape == 'square':
            turtle.draw_rect(x - half_size, y - half_size, size, size)
            
        elif shape == 'diamond':
            turtle.jump_to(x, y - half_size)
            turtle.move_to(x + half_size, y)
            turtle.move_to(x, y + half_size)
            turtle.move_to(x - half_size, y)
            turtle.move_to(x, y - half_size)
            
        elif shape == 'cross':
            turtle.jump_to(x - half_size, y)
            turtle.move_to(x + half_size, y)
            turtle.jump_to(x, y - half_size)
            turtle.move_to(x, y + half_size)
            
        elif shape == 'line':
            turtle.jump_to(x, y - half_size)
            turtle.move_to(x, y + half_size)
            
        else:
            turtle.draw_circle(x, y, half_size, 16)
    
    # =========================================================================
    # KALEIDOSCOPE - Symmetrical patterns with rotational symmetry
    # =========================================================================
    
    def _generate_kaleidoscope(self, options: Dict[str, Any]) -> Turtle:
        """Generate kaleidoscope patterns with rotational symmetry."""
        turtle = Turtle()
        
        symmetry = int(options.get('symmetry', 6))
        pattern = options.get('pattern', 'curves')
        complexity = int(options.get('complexity', 8))
        radius_pct = float(options.get('radius', 80))
        inner_radius_pct = float(options.get('inner_radius', 10))
        seed = self._get_seed(options)
        reflect = options.get('reflect', True)
        
        work_area = self.settings.get_work_area()
        center_x = work_area['left'] + (work_area['right'] - work_area['left']) / 2
        center_y = work_area['bottom'] + (work_area['top'] - work_area['bottom']) / 2
        width = work_area['right'] - work_area['left']
        height = work_area['top'] - work_area['bottom']
        max_radius = min(width, height) / 2 * (radius_pct / 100)
        min_radius = max_radius * (inner_radius_pct / 100)
        
        angle_step = (math.pi * 2) / symmetry
        
        import random as rnd
        rnd.seed(seed)
        
        # Generate base pattern
        base_pattern = self._generate_kaleidoscope_pattern(pattern, complexity, max_radius, min_radius, angle_step, rnd)
        
        # Draw with symmetry
        for i in range(symmetry):
            rotation = i * angle_step
            self._draw_rotated_pattern(turtle, base_pattern, center_x, center_y, rotation, False)
            if reflect:
                self._draw_rotated_pattern(turtle, base_pattern, center_x, center_y, rotation, True)
        
        return turtle
    
    def _generate_kaleidoscope_pattern(self, pattern: str, complexity: int, max_radius: float, 
                                        min_radius: float, wedge_angle: float, rnd) -> List[List[Dict]]:
        """Generate base pattern for one kaleidoscope wedge."""
        paths = []
        
        if pattern == 'curves':
            for _ in range(complexity):
                r1 = min_radius + rnd.random() * (max_radius - min_radius)
                r2 = min_radius + rnd.random() * (max_radius - min_radius)
                a1 = rnd.random() * wedge_angle * 0.9
                a2 = rnd.random() * wedge_angle * 0.9
                
                path = []
                segments = 20
                for t in range(segments + 1):
                    tt = t / segments
                    r = r1 + (r2 - r1) * tt + math.sin(tt * math.pi) * (rnd.random() - 0.5) * max_radius * 0.3
                    a = a1 + (a2 - a1) * tt
                    path.append({'x': math.cos(a) * r, 'y': math.sin(a) * r})
                paths.append(path)
                
        elif pattern == 'lines':
            for _ in range(complexity):
                r1 = min_radius + rnd.random() * (max_radius - min_radius)
                r2 = min_radius + rnd.random() * (max_radius - min_radius)
                a1 = rnd.random() * wedge_angle * 0.9
                a2 = rnd.random() * wedge_angle * 0.9
                
                paths.append([
                    {'x': math.cos(a1) * r1, 'y': math.sin(a1) * r1},
                    {'x': math.cos(a2) * r2, 'y': math.sin(a2) * r2}
                ])
                
        elif pattern == 'spirals':
            for _ in range(min(complexity, 5)):
                path = []
                start_r = min_radius + rnd.random() * (max_radius - min_radius) * 0.3
                turns = 0.5 + rnd.random() * 1.5
                segments = 30
                
                for t in range(segments + 1):
                    tt = t / segments
                    r = start_r + (max_radius - start_r) * tt
                    a = tt * turns * wedge_angle
                    path.append({'x': math.cos(a) * r, 'y': math.sin(a) * r})
                paths.append(path)
                
        elif pattern == 'petals':
            for _ in range(complexity):
                path = []
                petal_length = min_radius + rnd.random() * (max_radius - min_radius) * 0.8
                petal_width = rnd.random() * wedge_angle * 0.4
                base_angle = rnd.random() * wedge_angle * 0.5
                segments = 20
                
                for t in range(segments + 1):
                    tt = t / segments
                    r = min_radius + petal_length * math.sin(tt * math.pi)
                    a = base_angle + (tt - 0.5) * petal_width
                    path.append({'x': math.cos(a) * r, 'y': math.sin(a) * r})
                paths.append(path)
                
        elif pattern == 'geometric':
            for _ in range(complexity):
                sides = 3 + int(rnd.random() * 4)
                r = min_radius + rnd.random() * (max_radius - min_radius) * 0.6
                center_a = rnd.random() * wedge_angle * 0.7
                center_r = min_radius + rnd.random() * (max_radius - min_radius) * 0.5
                cx = math.cos(center_a) * center_r
                cy = math.sin(center_a) * center_r
                shape_size = r * 0.3
                
                path = []
                for s in range(sides + 1):
                    a = (s / sides) * math.pi * 2 + rnd.random() * 0.5
                    path.append({'x': cx + math.cos(a) * shape_size, 'y': cy + math.sin(a) * shape_size})
                paths.append(path)
        
        return paths
    
    def _draw_rotated_pattern(self, turtle: Turtle, paths: List[List[Dict]], 
                               cx: float, cy: float, rotation: float, reflect: bool):
        """Draw a pattern rotated around center."""
        cos_r = math.cos(rotation)
        sin_r = math.sin(rotation)
        
        for path in paths:
            if len(path) < 2:
                continue
            
            first_point = True
            for point in path:
                x = point['x']
                y = point['y']
                
                if reflect:
                    y = -y
                
                rx = x * cos_r - y * sin_r
                ry = x * sin_r + y * cos_r
                
                fx = cx + rx
                fy = cy + ry
                
                if first_point:
                    turtle.jump_to(fx, fy)
                    first_point = False
                else:
                    turtle.move_to(fx, fy)
    
    # =========================================================================
    # COLORFUL DOTS - CMYK-style halftone with offset layers
    # =========================================================================
    
    def _generate_colorfuldots(self, options: Dict[str, Any]):
        """Generate halftone-style dots - outputs all layers for pen plotting."""
        color_mode = options.get('color_mode', 'cmyk')
        grid_spacing = float(options.get('grid_spacing', 15))
        max_dot_size = float(options.get('max_dot_size', 12))
        layer_offset = float(options.get('layer_offset', 4))
        num_circles = int(options.get('num_circles', 30))
        circle_min = float(options.get('circle_min', 30))
        circle_max = float(options.get('circle_max', 80))
        seed = self._get_seed(options)
        
        work_area = self.settings.get_work_area()
        margin = grid_spacing * 2
        
        start_x = work_area['left'] + margin
        end_x = work_area['right'] - margin
        start_y = work_area['bottom'] + margin
        end_y = work_area['top'] - margin
        width = end_x - start_x
        height = end_y - start_y
        
        import random as rnd
        rnd.seed(seed)
        
        # Color mode configurations
        color_configs = {
            'cmyk': {'names': ['Cyan', 'Magenta', 'Yellow', 'Black'], 'colors': ['green', 'pink', 'yellow', 'black']},
            'rgb': {'names': ['Red', 'Green', 'Blue'], 'colors': ['red', 'green', 'blue']},
            'primary': {'names': ['Red', 'Yellow', 'Blue'], 'colors': ['red', 'yellow', 'blue']},
            'warm': {'names': ['Red', 'Orange', 'Yellow'], 'colors': ['red', 'orange', 'yellow']},
            'cool': {'names': ['Blue', 'Teal', 'Purple'], 'colors': ['blue', 'green', 'purple']}
        }
        
        config = color_configs.get(color_mode, color_configs['cmyk'])
        num_layers = len(config['names'])
        
        # Generate source circles with random RGB colors
        circles = []
        min_r = min(width, height) * (circle_min / 100)
        max_r = min(width, height) * (circle_max / 100)
        
        for _ in range(num_circles):
            circles.append({
                'x': start_x + rnd.random() * width,
                'y': start_y + rnd.random() * height,
                'r': min_r + rnd.random() * (max_r - min_r),
                'color': {
                    'r': int(rnd.random() * 255),
                    'g': int(rnd.random() * 255),
                    'b': int(rnd.random() * 255)
                }
            })
        
        layers = []
        
        # Generate each layer
        for layer_index in range(num_layers):
            layer_turtle = Turtle()
            
            # Calculate offset for this layer (different angle for each layer)
            layer_angle = (layer_index / num_layers) * 2 * math.pi + math.pi / 6
            ox = math.cos(layer_angle) * layer_offset
            oy = math.sin(layer_angle) * layer_offset
            
            # Process grid - draw dots based on color separation
            y = start_y + grid_spacing / 2
            while y < end_y:
                x = start_x + grid_spacing / 2
                while x < end_x:
                    rgb = self._sample_color_at_point(x, y, circles)
                    cmyk = self._rgb_to_cmyk(rgb['r'], rgb['g'], rgb['b'])
                    
                    if color_mode == 'cmyk':
                        channels = [cmyk['c'], cmyk['m'], cmyk['y'], cmyk['k']]
                        intensity = channels[layer_index]
                    elif color_mode == 'rgb':
                        intensity = [rgb['r'] / 255, rgb['g'] / 255, rgb['b'] / 255][layer_index]
                    elif color_mode == 'primary':
                        r_int = rgb['r'] / 255
                        y_int = min(rgb['r'], rgb['g']) / 255
                        b_int = rgb['b'] / 255
                        intensity = [r_int, y_int, b_int][layer_index]
                    elif color_mode == 'warm':
                        intensity = [rgb['r'] / 255, (rgb['r'] * 0.5 + rgb['g'] * 0.5) / 255, rgb['g'] / 255][layer_index]
                    elif color_mode == 'cool':
                        intensity = [rgb['b'] / 255, (rgb['g'] * 0.5 + rgb['b'] * 0.5) / 255, (rgb['r'] * 0.3 + rgb['b'] * 0.7) / 255][layer_index]
                    else:
                        intensity = cmyk['c']
                    
                    dot_size = intensity * max_dot_size
                    if dot_size > 0.8:
                        layer_turtle.draw_circle(x + ox, y + oy, dot_size / 2, max(6, int(dot_size)))
                    
                    x += grid_spacing
                y += grid_spacing
            
            layers.append({
                'name': f'Colorful Dots ({config["names"][layer_index]})',
                'color': config['colors'][layer_index],
                'turtle': layer_turtle
            })
        
        return {'multiLayer': True, 'layers': layers}
    
    def _color_layer_intensity(self, sample_rgb: Dict, layer_color: tuple) -> float:
        """Calculate how much of a layer color is in the sample."""
        sr, sg, sb = sample_rgb['r'] / 255, sample_rgb['g'] / 255, sample_rgb['b'] / 255
        lr, lg, lb = layer_color[0] / 255, layer_color[1] / 255, layer_color[2] / 255
        
        # Dot product similarity normalized
        dot = sr * lr + sg * lg + sb * lb
        mag_s = math.sqrt(sr*sr + sg*sg + sb*sb) + 0.001
        mag_l = math.sqrt(lr*lr + lg*lg + lb*lb) + 0.001
        
        similarity = dot / (mag_s * mag_l)
        brightness = (sr + sg + sb) / 3
        
        return max(0, min(1, similarity * brightness))
    
    def _sample_color_at_point(self, x: float, y: float, circles: List[Dict]) -> Dict:
        """Sample color at a point from overlapping circles with strong blending."""
        r, g, b = 255, 255, 255  # White background (no CMYK)
        
        for circle in circles:
            dist = math.sqrt((x - circle['x']) ** 2 + (y - circle['y']) ** 2)
            if dist < circle['r']:
                # Smooth blend based on distance - stronger near center
                t = 1 - (dist / circle['r'])
                blend = t * t  # Quadratic falloff for smoother edges
                r = r * (1 - blend) + circle['color']['r'] * blend
                g = g * (1 - blend) + circle['color']['g'] * blend
                b = b * (1 - blend) + circle['color']['b'] * blend
        
        return {'r': r, 'g': g, 'b': b}
    
    def _rgb_to_cmyk(self, r: float, g: float, b: float) -> Dict:
        """Convert RGB to CMYK."""
        r1 = r / 255
        g1 = g / 255
        b1 = b / 255
        
        k = min(1 - r1, 1 - g1, 1 - b1)
        
        if k == 1:
            return {'c': 0, 'm': 0, 'y': 0, 'k': 1}
        
        c = (1 - r1 - k) / (1 - k)
        m = (1 - g1 - k) / (1 - k)
        y = (1 - b1 - k) / (1 - k)
        
        return {'c': c, 'm': m, 'y': y, 'k': k}
    
    # =========================================================================
    # INTERLOCKINGS - Overlapping line patterns for moiré effects
    # Inspired by Arden Schager's rotating polygon line patterns
    # =========================================================================
    
    def _generate_interlockings(self, options: Dict[str, Any]):
        """Generate rotating parallel line layers that create moiré interference patterns.
        
        Returns multi-layer output - each layer has a different color for pen plotting.
        """
        num_layers = int(options.get('num_layers', 6))
        lines_per_layer = int(options.get('lines_per_layer', 30))
        line_spacing = float(options.get('line_spacing', 5))
        center_offset_pct = float(options.get('center_offset', 10))
        seed = self._get_seed(options)
        
        work_area = self.settings.get_work_area()
        width = work_area['right'] - work_area['left']
        height = work_area['top'] - work_area['bottom']
        center_x = work_area['left'] + width / 2
        center_y = work_area['bottom'] + height / 2
        diagonal = math.sqrt(width * width + height * height)
        
        # Center offset radius (each layer's center rotates around the main center)
        center_offset_radius = min(width, height) * (center_offset_pct / 100)
        
        # Color palette for layers
        layer_colors = ['red', 'orange', 'yellow', 'green', 'blue', 'purple', 'pink', 'brown']
        
        layers = []
        
        # Each layer gets an evenly distributed angle
        for layer_idx in range(num_layers):
            layer_turtle = Turtle()
            
            # Calculate layer angle - distribute evenly across 180 degrees
            layer_angle = (layer_idx / num_layers) * math.pi
            
            # Calculate layer center offset (rotates in a circle)
            t = layer_idx / num_layers
            offset_x = center_offset_radius * math.cos(t * 2 * math.pi)
            offset_y = center_offset_radius * math.sin(t * 2 * math.pi)
            layer_center_x = center_x + offset_x
            layer_center_y = center_y + offset_y
            
            # Direction vectors for this angle
            cos_a = math.cos(layer_angle)
            sin_a = math.sin(layer_angle)
            
            # Perpendicular direction (for spacing lines)
            perp_x = -sin_a
            perp_y = cos_a
            
            # Calculate how many lines we need to cover the diagonal
            total_span = lines_per_layer * line_spacing
            start_offset = -total_span / 2
            
            for line_idx in range(lines_per_layer):
                # Perpendicular offset for this line
                perp_offset = start_offset + line_idx * line_spacing
                
                # Calculate line endpoints extending beyond the work area
                line_center_x = layer_center_x + perp_x * perp_offset
                line_center_y = layer_center_y + perp_y * perp_offset
                
                # Extend line in both directions along the angle
                half_len = diagonal * 0.7
                x1 = line_center_x - cos_a * half_len
                y1 = line_center_y - sin_a * half_len
                x2 = line_center_x + cos_a * half_len
                y2 = line_center_y + sin_a * half_len
                
                # Clip to work area
                clipped = self._clip_line_to_work_area(x1, y1, x2, y2, work_area)
                if clipped is None:
                    continue
                
                layer_turtle.jump_to(clipped['x1'], clipped['y1'])
                layer_turtle.move_to(clipped['x2'], clipped['y2'])
            
            # Add layer with color
            color = layer_colors[layer_idx % len(layer_colors)]
            layers.append({
                'name': f'Interlockings Layer {layer_idx + 1}',
                'color': color,
                'turtle': layer_turtle
            })
        
        return {'multiLayer': True, 'layers': layers}
    
    def _clip_line_to_work_area(self, x1: float, y1: float, x2: float, y2: float, 
                                 work_area: Dict) -> Dict:
        """Cohen-Sutherland line clipping."""
        INSIDE, LEFT, RIGHT, BOTTOM, TOP = 0, 1, 2, 4, 8
        
        def compute_code(x, y):
            code = INSIDE
            if x < work_area['left']: code |= LEFT
            elif x > work_area['right']: code |= RIGHT
            if y < work_area['bottom']: code |= BOTTOM
            elif y > work_area['top']: code |= TOP
            return code
        
        code1 = compute_code(x1, y1)
        code2 = compute_code(x2, y2)
        
        while True:
            if not (code1 | code2):
                return {'x1': x1, 'y1': y1, 'x2': x2, 'y2': y2}
            elif code1 & code2:
                return None
            else:
                code_out = code1 if code1 else code2
                
                if code_out & TOP:
                    x = x1 + (x2 - x1) * (work_area['top'] - y1) / (y2 - y1) if y2 != y1 else x1
                    y = work_area['top']
                elif code_out & BOTTOM:
                    x = x1 + (x2 - x1) * (work_area['bottom'] - y1) / (y2 - y1) if y2 != y1 else x1
                    y = work_area['bottom']
                elif code_out & RIGHT:
                    y = y1 + (y2 - y1) * (work_area['right'] - x1) / (x2 - x1) if x2 != x1 else y1
                    x = work_area['right']
                else:
                    y = y1 + (y2 - y1) * (work_area['left'] - x1) / (x2 - x1) if x2 != x1 else y1
                    x = work_area['left']
                
                if code_out == code1:
                    x1, y1 = x, y
                    code1 = compute_code(x1, y1)
                else:
                    x2, y2 = x, y
                    code2 = compute_code(x2, y2)
    
    def _draw_wavy_line(self, turtle: Turtle, x1: float, y1: float, x2: float, y2: float,
                        amplitude: float, wavelength: float, rnd):
        """Draw a wavy line."""
        dx = x2 - x1
        dy = y2 - y1
        length = math.sqrt(dx * dx + dy * dy)
        if length < 0.1:
            return
        
        segments = max(10, int(length / 2))
        perp_x = -dy / length
        perp_y = dx / length
        phase = rnd.random() * math.pi * 2
        
        for i in range(segments + 1):
            t = i / segments
            base_x = x1 + dx * t
            base_y = y1 + dy * t
            
            wave = math.sin(t * length / wavelength * math.pi * 2 + phase) * amplitude
            px = base_x + perp_x * wave
            py = base_y + perp_y * wave
            
            if i == 0:
                turtle.jump_to(px, py)
            else:
                turtle.move_to(px, py)
    
    def _draw_dashed_line(self, turtle: Turtle, x1: float, y1: float, x2: float, y2: float,
                          dash_length: float, gap_length: float):
        """Draw a dashed line."""
        dx = x2 - x1
        dy = y2 - y1
        length = math.sqrt(dx * dx + dy * dy)
        if length < 0.1:
            return
        
        unit_x = dx / length
        unit_y = dy / length
        
        pos = 0
        drawing = True
        
        while pos < length:
            seg_len = dash_length if drawing else gap_length
            end_pos = min(pos + seg_len, length)
            
            if drawing:
                start_x = x1 + unit_x * pos
                start_y = y1 + unit_y * pos
                end_x = x1 + unit_x * end_pos
                end_y = y1 + unit_y * end_pos
                
                turtle.jump_to(start_x, start_y)
                turtle.move_to(end_x, end_y)
            
            pos = end_pos
            drawing = not drawing
    
    # =========================================================================
    # SUDOKU CARTOGRAPHY - Visualize solver algorithm path
    # Based on graph theory visualization by xladn0
    # =========================================================================
    
    def _generate_sudokucartography(self, options: Dict[str, Any]) -> Turtle:
        """Generate Sudoku solver path visualization."""
        turtle = Turtle()
        
        initial_cells = int(options.get('initial_cells', 17))
        curve_tension = float(options.get('curve_tension', 50))
        draw_grid = options.get('draw_grid', False)
        draw_path = options.get('draw_path', False)
        seed = self._get_seed(options)
        max_checks = int(options.get('max_checks', 500))
        
        work_area = self.settings.get_work_area()
        margin = 20
        width = work_area['right'] - work_area['left']
        height = work_area['top'] - work_area['bottom']
        size = min(width, height) - 2 * margin
        start_x = work_area['left'] + (width - size) / 2
        start_y = work_area['bottom'] + (height - size) / 2
        cell_size = size / 9
        
        import random as rnd
        rnd.seed(seed)
        
        # Generate grid
        grid = [[0] * 9 for _ in range(9)]
        checked_cells = []
        solution_path = []
        
        # Place initial clues
        placed = 0
        attempts = 0
        while placed < initial_cells and attempts < 1000:
            row = rnd.randint(0, 8)
            col = rnd.randint(0, 8)
            num = rnd.randint(1, 9)
            
            if grid[row][col] == 0 and self._sudoku_is_safe(grid, row, col, num):
                grid[row][col] = num
                placed += 1
            attempts += 1
        
        # Solve
        self._sudoku_solve(grid, checked_cells, solution_path)
        
        # Draw grid
        if draw_grid:
            for i in range(10):
                line_x = start_x + i * cell_size
                line_y = start_y + i * cell_size
                
                turtle.jump_to(line_x, start_y)
                turtle.move_to(line_x, start_y + size)
                
                turtle.jump_to(start_x, line_y)
                turtle.move_to(start_x + size, line_y)
        
        # Draw solution path
        if draw_path and len(solution_path) > 1:
            first = solution_path[0]
            turtle.jump_to(start_x + (first[1] + 0.5) * cell_size,
                          start_y + (first[0] + 0.5) * cell_size)
            for cell in solution_path[1:]:
                turtle.move_to(start_x + (cell[1] + 0.5) * cell_size,
                              start_y + (cell[0] + 0.5) * cell_size)
        
        # Draw checked cells as bezier curves
        limited = checked_cells[:max_checks]
        
        for i in range(1, len(limited)):
            prev_row, prev_col = limited[i - 1]
            row, col = limited[i]
            
            x1 = start_x + (prev_col + 0.5) * cell_size
            y1 = start_y + (prev_row + 0.5) * cell_size
            x2 = start_x + (col + 0.5) * cell_size
            y2 = start_y + (row + 0.5) * cell_size
            
            self._draw_bezier_curve(turtle, 
                                    (x1, y1), 
                                    (x1 + curve_tension, y1),
                                    (x2 - curve_tension, y2),
                                    (x2, y2), 20)
        
        return turtle
    
    def _sudoku_is_safe(self, grid: List[List[int]], row: int, col: int, num: int) -> bool:
        """Check if placing num at grid[row][col] is safe."""
        # Check row
        if num in grid[row]:
            return False
        
        # Check column
        for i in range(9):
            if grid[i][col] == num:
                return False
        
        # Check 3x3 subgrid
        start_row = row - (row % 3)
        start_col = col - (col % 3)
        for i in range(3):
            for j in range(3):
                if grid[start_row + i][start_col + j] == num:
                    return False
        
        return True
    
    def _sudoku_solve(self, grid: List[List[int]], checked_cells: List, solution_path: List) -> bool:
        """Solve Sudoku using backtracking."""
        # Find empty cell
        empty_cell = None
        for i in range(9):
            for j in range(9):
                if grid[i][j] == 0:
                    empty_cell = (i, j)
                    break
            if empty_cell:
                break
        
        if not empty_cell:
            return True
        
        row, col = empty_cell
        solution_path.append((row, col))
        
        for num in range(1, 10):
            # Track checks
            checked_cells.append((row, num - 1))
            checked_cells.append((num - 1, col))
            start_row = row - (row % 3)
            start_col = col - (col % 3)
            checked_cells.append((start_row + (num - 1) // 3, start_col + (num - 1) % 3))
            
            if self._sudoku_is_safe(grid, row, col, num):
                grid[row][col] = num
                
                if self._sudoku_solve(grid, checked_cells, solution_path):
                    return True
                
                grid[row][col] = 0
        
        solution_path.pop()
        return False
    
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
        
        # Define color palettes (using only available pen colors: brown, black, blue, green, purple, pink, red, orange, yellow)
        PALETTES = {
            'rainbow': ['brown', 'blue', 'green', 'purple', 'pink', 'red', 'orange', 'yellow'],
            'monochrome': ['black', 'black', 'black', 'black', 'black', 'black', 'black', 'black'],
            'primary': ['red', 'yellow', 'blue', 'red', 'yellow', 'blue', 'red', 'yellow'],
            'warm': ['red', 'orange', 'yellow', 'pink', 'red', 'orange', 'yellow', 'pink'],
            'cool': ['blue', 'green', 'purple', 'blue', 'green', 'purple', 'blue', 'green'],
            'earth': ['brown', 'orange', 'green', 'brown', 'orange', 'green', 'brown', 'orange'],
            'sunset': ['red', 'orange', 'yellow', 'pink', 'purple', 'red', 'orange', 'yellow'],
            'ocean': ['blue', 'green', 'purple', 'blue', 'green', 'purple', 'blue', 'green']
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

    # ===== HELPER METHODS FOR NEW GENERATORS =====
    
    def _init_perlin(self, seed: int = 0):
        """Initialize Perlin noise with p5.js-compatible implementation."""
        import random
        import math
        
        # p5.js uses 4096 precomputed perlin values
        self._perlin_size = 4096
        self._perlin_octaves = 4
        self._perlin_amp_falloff = 0.5
        
        random.seed(seed)
        self._perlin = [random.random() for _ in range(self._perlin_size + 1)]
        
        # Also create permutation table for 3D noise
        perm = list(range(256))
        random.shuffle(perm)
        self._perlin_perm = perm + perm  # Double it for easy wrapping
    
    def _scaled_cosine(self, i: float) -> float:
        """Scaled cosine for smooth interpolation (matches p5.js)."""
        import math
        return 0.5 * (1.0 - math.cos(i * math.pi))
    
    def _perlin_noise_2d(self, x: float, y: float) -> float:
        """2D Perlin noise matching p5.js noise() function."""
        if not hasattr(self, '_perlin'):
            self._init_perlin(0)
        
        # Ensure positive coordinates
        if x < 0:
            x = -x
        if y < 0:
            y = -y
        
        xi = int(x)
        yi = int(y)
        xf = x - xi
        yf = y - yi
        
        r = 0.0
        ampl = 0.5
        
        for _ in range(self._perlin_octaves):
            # Wrap indices
            of = xi + (yi << 4)  # PERLIN_YWRAP = 16, but we simulate it
            
            rxf = self._scaled_cosine(xf)
            ryf = self._scaled_cosine(yf)
            
            # Sample noise at 4 corners and interpolate
            n1 = self._perlin[of & (self._perlin_size - 1)]
            n1 += rxf * (self._perlin[(of + 1) & (self._perlin_size - 1)] - n1)
            n2 = self._perlin[(of + 16) & (self._perlin_size - 1)]  # PERLIN_YWRAP = 16
            n2 += rxf * (self._perlin[(of + 16 + 1) & (self._perlin_size - 1)] - n2)
            n1 += ryf * (n2 - n1)
            
            r += n1 * ampl
            ampl *= self._perlin_amp_falloff
            xi <<= 1
            xf *= 2
            yi <<= 1
            yf *= 2
            
            if xf >= 1.0:
                xi += 1
                xf -= 1
            if yf >= 1.0:
                yi += 1
                yf -= 1
        
        return r
    
    def _perlin_noise(self, x: float, y: float) -> float:
        """Alias for _perlin_noise_2d."""
        return self._perlin_noise_2d(x, y)
    
    def _perlin_fade(self, t: float) -> float:
        """Fade function for Perlin noise (6t^5 - 15t^4 + 10t^3)."""
        return t * t * t * (t * (t * 6 - 15) + 10)
    
    def _perlin_lerp(self, a: float, b: float, t: float) -> float:
        """Linear interpolation."""
        return a + t * (b - a)
    
    def _perlin_grad(self, hash_val: int, x: float, y: float, z: float) -> float:
        """Calculate gradient based on hash value."""
        h = hash_val & 15
        u = x if h < 8 else y
        v = y if h < 4 else (x if h == 12 or h == 14 else z)
        return (u if (h & 1) == 0 else -u) + (v if (h & 2) == 0 else -v)
    
    def _perlin_noise_3d(self, x: float, y: float, z: float) -> float:
        """3D Perlin noise."""
        if not hasattr(self, '_perlin_perm'):
            self._init_perlin(0)
        
        xi = int(x) & 255
        yi = int(y) & 255
        zi = int(z) & 255
        xf = x - int(x)
        yf = y - int(y)
        zf = z - int(z)
        
        u = self._perlin_fade(xf)
        v = self._perlin_fade(yf)
        w = self._perlin_fade(zf)
        
        p = self._perlin_perm
        aaa = p[p[p[xi] + yi] + zi]
        aba = p[p[p[xi] + yi + 1] + zi]
        aab = p[p[p[xi] + yi] + zi + 1]
        abb = p[p[p[xi] + yi + 1] + zi + 1]
        baa = p[p[p[xi + 1] + yi] + zi]
        bba = p[p[p[xi + 1] + yi + 1] + zi]
        bab = p[p[p[xi + 1] + yi] + zi + 1]
        bbb = p[p[p[xi + 1] + yi + 1] + zi + 1]
        
        x1 = self._perlin_lerp(self._perlin_grad(aaa, xf, yf, zf), self._perlin_grad(baa, xf - 1, yf, zf), u)
        x2 = self._perlin_lerp(self._perlin_grad(aba, xf, yf - 1, zf), self._perlin_grad(bba, xf - 1, yf - 1, zf), u)
        y1 = self._perlin_lerp(x1, x2, v)
        
        x1 = self._perlin_lerp(self._perlin_grad(aab, xf, yf, zf - 1), self._perlin_grad(bab, xf - 1, yf, zf - 1), u)
        x2 = self._perlin_lerp(self._perlin_grad(abb, xf, yf - 1, zf - 1), self._perlin_grad(bbb, xf - 1, yf - 1, zf - 1), u)
        y2 = self._perlin_lerp(x1, x2, v)
        
        return (self._perlin_lerp(y1, y2, w) + 1) / 2
    
    def _draw_text_at(self, turtle: Turtle, text: str, x: float, y: float, size: float):
        """Draw text at a specific position using single-stroke font."""
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
            ' ': []
        }
        
        letter_width = size * 0.7
        curr_x = x
        
        for char in text.upper():
            strokes = FONT.get(char, [])
            for stroke in strokes:
                if len(stroke) >= 2:
                    px, py = stroke[0]
                    turtle.jump_to(curr_x + px * size * 0.6, y + py * size)
                    for px, py in stroke[1:]:
                        turtle.move_to(curr_x + px * size * 0.6, y + py * size)
            curr_x += letter_width * (0.5 if char == ' ' else 1)

