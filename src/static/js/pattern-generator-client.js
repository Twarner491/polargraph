/**
 * Client-side pattern generator for Polargraph
 * Generates various algorithmic patterns using turtle graphics
 */

class PatternGenerator {
    constructor(settings = DEFAULT_SETTINGS) {
        this.settings = { ...DEFAULT_SETTINGS, ...settings };
    }
    
    static GENERATORS = {
        spiral: {
            name: 'Spiral',
            description: 'Archimedean spiral',
            options: {
                turns: { type: 'float', default: 10, min: 1, max: 50 },
                spacing: { type: 'float', default: 5, min: 1, max: 20 }
            }
        },
        spirograph: {
            name: 'Spirograph',
            description: 'Classic spirograph patterns',
            options: {
                R: { type: 'float', default: 100, min: 10, max: 300 },
                r: { type: 'float', default: 60, min: 5, max: 150 },
                d: { type: 'float', default: 80, min: 5, max: 200 },
                revolutions: { type: 'int', default: 10, min: 1, max: 100 }
            }
        },
        lissajous: {
            name: 'Lissajous',
            description: 'Lissajous curves',
            options: {
                a: { type: 'int', default: 3, min: 1, max: 20 },
                b: { type: 'int', default: 4, min: 1, max: 20 },
                delta: { type: 'float', default: 90, min: 0, max: 180 },
                size: { type: 'float', default: 200, min: 50, max: 500 }
            }
        },
        maze: {
            name: 'Maze',
            description: 'Rectangular maze using recursive backtracking',
            options: {
                rows: { type: 'int', default: 20, min: 5, max: 50 },
                cols: { type: 'int', default: 20, min: 5, max: 50 },
                cell_size: { type: 'float', default: 15, min: 5, max: 40 }
            }
        },
        dragon: {
            name: 'Dragon Curve',
            description: 'Dragon curve fractal',
            options: {
                iterations: { type: 'int', default: 12, min: 1, max: 16 },
                size: { type: 'float', default: 3, min: 1, max: 10 }
            }
        },
        hilbert: {
            name: 'Hilbert Curve',
            description: 'Space-filling Hilbert curve',
            options: {
                order: { type: 'int', default: 5, min: 1, max: 7 },
                size: { type: 'float', default: 400, min: 100, max: 800 }
            }
        },
        tree: {
            name: 'Fractal Tree',
            description: 'Recursive branching tree',
            options: {
                depth: { type: 'int', default: 8, min: 1, max: 12 },
                trunk_length: { type: 'float', default: 100, min: 20, max: 200 },
                angle: { type: 'float', default: 25, min: 10, max: 45 },
                ratio: { type: 'float', default: 0.7, min: 0.5, max: 0.9 }
            }
        },
        hexagons: {
            name: 'Hexagon Grid',
            description: 'Tessellating hexagon pattern',
            options: {
                size: { type: 'float', default: 20, min: 5, max: 50 },
                rows: { type: 'int', default: 10, min: 3, max: 30 },
                cols: { type: 'int', default: 10, min: 3, max: 30 }
            }
        },
        flowfield: {
            name: 'Flow Field',
            description: 'Perlin noise flow field',
            options: {
                lines: { type: 'int', default: 200, min: 50, max: 1000 },
                length: { type: 'int', default: 50, min: 10, max: 200 },
                scale: { type: 'float', default: 0.01, min: 0.001, max: 0.1 }
            }
        },
        border: {
            name: 'Border',
            description: 'Simple rectangular border',
            options: {
                margin: { type: 'float', default: 10, min: 0, max: 50 }
            }
        },
        text: {
            name: 'Text',
            description: 'Single-line text using vector font',
            options: {
                text: { type: 'string', default: 'Hello World' },
                size: { type: 'float', default: 50, min: 10, max: 200 }
            }
        },
        sonakinatography: {
            name: 'Sonakinatography',
            description: 'Channa Horwitz\'s Sonakinatography system - rule-based generative compositions',
            options: {
                algorithm: {
                    type: 'select',
                    label: 'Algorithm',
                    default: 'sequential_progression',
                    options: [
                        { value: 'sequential_progression', label: 'Sequential Progression' },
                        { value: 'full_sequence', label: 'Full Sequence Repetition' },
                        { value: 'rotations', label: 'Sequence Rotations' },
                        { value: 'palindrome', label: 'Reversal Palindrome' },
                        { value: 'canon', label: 'Canon Layering' },
                        { value: 'moire', label: 'Moiré Angle Pairs' },
                        { value: 'fade_out', label: 'Fade Out Sequence' },
                        { value: 'language', label: 'Language Combinations' },
                        { value: 'inversion', label: 'Numeric Inversion' },
                        { value: 'cross_sections', label: '3D Cross-Sections' },
                        { value: 'time_structure', label: 'Time Structure Composition' },
                        { value: 'color_blend_grid', label: 'Color Blend Grid' },
                        { value: 'prismatic_diagonal', label: 'Prismatic Diagonal' },
                        { value: 'duration_lines', label: 'Duration Lines (8 Circle)' }
                    ]
                },
                palette: {
                    type: 'select',
                    label: 'Color Palette',
                    default: 'rainbow',
                    options: [
                        { value: 'rainbow', label: 'Rainbow (8 colors)' },
                        { value: 'monochrome', label: 'Monochrome (black only)' },
                        { value: 'primary', label: 'Primary (red, yellow, blue)' },
                        { value: 'warm', label: 'Warm (red, orange, yellow, pink)' },
                        { value: 'cool', label: 'Cool (blue, green, purple)' },
                        { value: 'earth', label: 'Earth (brown, orange, green)' },
                        { value: 'sunset', label: 'Sunset (red, orange, yellow, pink, purple)' },
                        { value: 'ocean', label: 'Ocean (blue, green, purple)' }
                    ]
                },
                source_text: { type: 'string', label: 'Source Text (optional)', default: '' },
                grid_cell_size: { type: 'float', label: 'Cell Size (mm)', default: 15, min: 8, max: 30 },
                grid_height: { type: 'int', label: 'Grid Height (beats)', default: 50, min: 20, max: 100 },
                drawing_mode: {
                    type: 'select',
                    label: 'Drawing Mode',
                    default: 'hatching',
                    options: [
                        { value: 'hatching', label: 'Hatching' },
                        { value: 'blocks', label: 'Blocks' },
                        { value: 'lines', label: 'Lines' }
                    ]
                },
                draw_grid: { type: 'bool', label: 'Draw Grid', default: false },
                starting_entity: { type: 'int', label: 'Starting Entity', default: 1, min: 1, max: 8 },
                rotation_count: { type: 'int', label: 'Rotation Count', default: 8, min: 1, max: 8 },
                voices: { type: 'int', label: 'Voices (Canon)', default: 3, min: 2, max: 6 },
                offset_beats: { type: 'int', label: 'Offset Beats', default: 8, min: 1, max: 24 },
                entity_1: { type: 'int', label: 'Entity 1 (Moiré)', default: 3, min: 1, max: 8 },
                entity_2: { type: 'int', label: 'Entity 2 (Moiré)', default: 7, min: 1, max: 8 },
                fade_steps: { type: 'int', label: 'Fade Steps', default: 4, min: 1, max: 10 },
                combination_size: { type: 'int', label: 'Combination Size', default: 3, min: 2, max: 5 },
                num_slices: { type: 'int', label: 'Cross-Section Slices', default: 6, min: 2, max: 12 },
                hatch_density: { type: 'float', label: 'Hatch Density', default: 1.0, min: 0.3, max: 3.0 },
                num_instruments: { type: 'int', label: 'Instruments (Time Structure)', default: 4, min: 1, max: 8 },
                blend_grid_size: { type: 'int', label: 'Blend Grid Size', default: 8, min: 4, max: 12 },
                diagonal_width: { type: 'int', label: 'Diagonal Width', default: 40, min: 20, max: 80 },
                num_duration_rows: { type: 'int', label: 'Duration Rows', default: 4, min: 1, max: 8 }
            }
        },
        gpent: {
            name: 'GPenT',
            description: 'Generative Pen-trained Transformer - AI-powered art generation',
            options: {
                inspiration: { type: 'string', label: 'Inspiration', default: '', placeholder: 'Optional' }
            },
            serverOnly: true  // GPenT requires server API call
        },
        dcode: {
            name: 'dcode',
            description: 'Text to polargraph G-code via Stable Diffusion',
            options: {
                prompt: { type: 'string', label: 'Prompt', default: '', placeholder: 'Describe what to draw...' },
                temperature: { type: 'float', label: 'Temperature', default: 0.5, min: 0.3, max: 1.2, step: 0.1, collapsible: true },
                max_tokens: { type: 'int', label: 'Max Tokens', default: 2048, min: 256, max: 2048, step: 256, collapsible: true },
                diffusion_steps: { type: 'int', label: 'Diffusion Steps', default: 35, min: 20, max: 50, step: 5, collapsible: true },
                guidance: { type: 'float', label: 'Guidance', default: 10.0, min: 5.0, max: 20.0, step: 0.5, collapsible: true },
                seed: { type: 'string', label: 'Seed', default: '-1', placeholder: '-1 for random', collapsible: true }
            },
            serverOnly: true  // dcode requires HuggingFace Space API call
        },
        slimemold: {
            name: 'Slime Mold',
            description: 'Physarum polycephalum simulation - organic network patterns',
            options: {
                agents: { type: 'int', label: 'Number of Agents', default: 2000, min: 100, max: 10000 },
                iterations: { type: 'int', label: 'Simulation Steps', default: 200, min: 50, max: 1000 },
                sensor_angle: { type: 'float', label: 'Sensor Angle', default: 45, min: 10, max: 90 },
                sensor_distance: { type: 'float', label: 'Sensor Distance', default: 9, min: 3, max: 30 },
                turn_angle: { type: 'float', label: 'Turn Angle', default: 45, min: 10, max: 90 },
                step_size: { type: 'float', label: 'Step Size', default: 1, min: 0.5, max: 5 },
                decay: { type: 'float', label: 'Trail Decay', default: 0.9, min: 0.5, max: 0.99, step: 0.01 },
                deposit: { type: 'float', label: 'Deposit Amount', default: 5, min: 1, max: 20 },
                draw_trails: { type: 'bool', label: 'Draw Trail Network', default: true },
                draw_agents: { type: 'bool', label: 'Draw Agent Paths', default: false }
            }
        },
        geodataweaving: {
            name: 'Geodata Weaving',
            description: 'Weaving patterns generated from geographic coordinates',
            options: {
                location_map: { type: 'map', label: 'Select Location' },
                threads: { type: 'int', label: 'Number of Threads', default: 64, min: 16, max: 128 },
                shafts: { type: 'int', label: 'Number of Shafts', default: 4, min: 2, max: 8 },
                pattern_rows: { type: 'int', label: 'Pattern Rows', default: 64, min: 16, max: 128 },
                cell_size: { type: 'float', label: 'Cell Size (mm)', default: 3, min: 1, max: 10 },
                draw_threading: { type: 'bool', label: 'Draw Threading', default: true },
                draw_treadling: { type: 'bool', label: 'Draw Treadling', default: true },
                draw_tieup: { type: 'bool', label: 'Draw Tie-up', default: true },
                draw_drawdown: { type: 'bool', label: 'Draw Drawdown', default: true }
            }
        },
        poetryclouds: {
            name: 'Poetry Clouds',
            description: 'Clouds formed from text characters using Perlin noise',
            options: {
                text_size: { type: 'float', label: 'Letter Size (mm)', default: 8, min: 3, max: 20 },
                cloud_threshold: { type: 'float', label: 'Cloud Threshold (higher=sparser)', default: 0.55, min: 0.3, max: 0.8, step: 0.05 },
                noise_scale: { type: 'float', label: 'Cloud Scale', default: 0.008, min: 0.003, max: 0.03, step: 0.001 },
                seed: { type: 'int', label: 'Random Seed', default: -1, min: -1, max: 9999 },
                custom_text: { type: 'string', label: 'Custom Text (optional)', default: '', placeholder: 'Leave empty for random letters' },
                uppercase: { type: 'bool', label: 'Uppercase Only', default: true }
            }
        },
        geometricpattern: {
            name: 'Geometric Pattern',
            description: 'Recursive grid of geometric shapes - stars, circles, crowns, diamonds, and more',
            options: {
                columns: { type: 'int', label: 'Grid Columns', default: 4, min: 2, max: 8 },
                rows: { type: 'int', label: 'Grid Rows', default: 5, min: 2, max: 10 },
                phase: { type: 'float', label: 'Animation Phase', default: 0.5, min: 0, max: 1, step: 0.05 },
                seed: { type: 'int', label: 'Random Seed', default: -1, min: -1, max: 9999 },
                recursion_depth: { type: 'int', label: 'Max Recursion', default: 2, min: 0, max: 3 },
                min_cell_size: { type: 'float', label: 'Min Cell Size (mm)', default: 40, min: 20, max: 100 },
                draw_grid: { type: 'bool', label: 'Draw Grid Lines', default: true }
            }
        },
        glow: {
            name: 'Glow',
            description: 'Fluid particle flow - generate each color layer separately',
            options: {
                color_profile: { type: 'select', label: 'Color Profile', default: 'rainbow', options: [
                    { value: 'rainbow', label: 'Rainbow (7 layers)' },
                    { value: 'warm', label: 'Warm (3 layers)' },
                    { value: 'cool', label: 'Cool (3 layers)' },
                    { value: 'monochrome', label: 'Monochrome (1 layer)' },
                    { value: 'primary', label: 'Primary (3 layers)' },
                    { value: 'pastel', label: 'Pastels (5 layers)' }
                ]},
                particles: { type: 'int', label: 'Number of Particles', default: 500, min: 50, max: 2000 },
                iterations: { type: 'int', label: 'Simulation Steps', default: 200, min: 50, max: 500 },
                noise_scale: { type: 'float', label: 'Noise Scale', default: 0.01, min: 0.001, max: 0.05, step: 0.005 },
                flow_cell_size: { type: 'int', label: 'Flow Cell Size', default: 10, min: 5, max: 30 },
                max_speed: { type: 'float', label: 'Max Speed', default: 1.3, min: 0.5, max: 5, step: 0.1 },
                seed: { type: 'int', label: 'Random Seed', default: -1, min: -1, max: 9999 },
                circular_bounds: { type: 'bool', label: 'Circular Bounds', default: true },
                draw_trails: { type: 'bool', label: 'Draw Trails (vs Points)', default: true }
            }
        },
        randompoetry: {
            name: 'Random Poetry',
            description: 'Scattered poetic words from famous authors',
            options: {
                word_preset: { type: 'select', label: 'Word Source', default: 'dickinson', options: [
                    { value: 'dickinson', label: 'Emily Dickinson' },
                    { value: 'shakespeare', label: 'Shakespeare' },
                    { value: 'poe', label: 'Edgar Allan Poe' },
                    { value: 'whitman', label: 'Walt Whitman' },
                    { value: 'romantic', label: 'Romantic Era' },
                    { value: 'nature', label: 'Nature Words' },
                    { value: 'cosmic', label: 'Cosmic/Space' },
                    { value: 'gothic', label: 'Gothic' },
                    { value: 'zen', label: 'Zen/Eastern' }
                ]},
                word_count: { type: 'int', label: 'Number of Words', default: 25, min: 5, max: 100 },
                min_size: { type: 'float', label: 'Min Text Size (mm)', default: 8, min: 3, max: 30 },
                max_size: { type: 'float', label: 'Max Text Size (mm)', default: 25, min: 10, max: 60 },
                seed: { type: 'int', label: 'Random Seed', default: -1, min: -1, max: 9999 },
                custom_words: { type: 'string', label: 'Custom Words (comma-separated)', default: '', placeholder: 'Overrides preset' },
                uppercase: { type: 'bool', label: 'Uppercase', default: false }
            }
        },
        gameoflife: {
            name: 'Game of Life',
            description: "Conway's Game of Life cellular automaton - simulates generations and plots the result",
            options: {
                cell_size: { type: 'float', label: 'Cell Size (mm)', default: 8, min: 2, max: 30 },
                generations: { type: 'int', label: 'Generations to Simulate', default: 50, min: 1, max: 500 },
                initial_density: { type: 'float', label: 'Initial Alive Density', default: 0.4, min: 0.1, max: 0.9, step: 0.05 },
                seed: { type: 'int', label: 'Random Seed', default: -1, min: -1, max: 9999 },
                draw_grid: { type: 'bool', label: 'Draw Grid Lines', default: false },
                fill_cells: { type: 'bool', label: 'Fill Alive Cells', default: true },
                show_history: { type: 'bool', label: 'Show Generation History', default: false }
            }
        },
        zenpots: {
            name: 'Zen Pots',
            description: 'Pottery shapes with flowers and stippled dot patterns',
            options: {
                pot_count: { type: 'int', label: 'Number of Pots', default: 12, min: 3, max: 20 },
                pot_color: { type: 'select', label: 'Pot & Ground Color', default: 'terracotta', options: [
                    { value: 'terracotta', label: 'Terracotta (Orange/Brown)' },
                    { value: 'earth', label: 'Earth Tones (Brown)' },
                    { value: 'slate', label: 'Slate (Blue/Gray)' },
                    { value: 'clay', label: 'Natural Clay (Pink/Tan)' },
                    { value: 'ceramic', label: 'Ceramic (Blue)' },
                    { value: 'rustic', label: 'Rustic (Red/Brown)' },
                    { value: 'modern', label: 'Modern (Black)' },
                    { value: 'vintage', label: 'Vintage (Purple)' }
                ]},
                flower_style: { type: 'select', label: 'Flower Style', default: 'branches', options: [
                    { value: 'branches', label: 'Branches with Berries' },
                    { value: 'minimal', label: 'Minimal Twigs' },
                    { value: 'full', label: 'Full Blooms' },
                    { value: 'mixed', label: 'Mixed (Random Variety)' },
                    { value: 'none', label: 'No Flowers' }
                ]},
                flower_color: { type: 'select', label: 'Flower & Branch Color', default: 'forest', options: [
                    { value: 'forest', label: 'Forest Green' },
                    { value: 'spring', label: 'Spring (Pink/Green)' },
                    { value: 'autumn', label: 'Autumn (Orange/Red)' },
                    { value: 'lavender', label: 'Lavender (Purple)' },
                    { value: 'wildflower', label: 'Wildflower (Mixed)' },
                    { value: 'tropical', label: 'Tropical (Yellow/Green)' },
                    { value: 'berry', label: 'Berry (Red/Pink)' },
                    { value: 'ink', label: 'Ink (Black)' }
                ]},
                flower_density: { type: 'float', label: 'Flower Density', default: 0.5, min: 0.1, max: 1.0, step: 0.1 },
                dot_density: { type: 'float', label: 'Pot Dot Density', default: 0.4, min: 0.1, max: 1.0, step: 0.1 },
                seed: { type: 'int', label: 'Random Seed', default: -1, min: -1, max: 9999 },
                draw_ground: { type: 'bool', label: 'Draw Ground Line', default: true }
            }
        },
        bezier: {
            name: 'Bezier Curves',
            description: 'Beautiful flowing bezier curves with customizable anchor and control points',
            options: {
                curve_count: { type: 'int', label: 'Number of Curves', default: 10, min: 1, max: 50 },
                curve_spread: { type: 'float', label: 'Curve Spread', default: 20, min: 5, max: 100 },
                control_variation: { type: 'float', label: 'Control Point Variation', default: 0.5, min: 0, max: 1, step: 0.1 },
                curve_style: { type: 'select', label: 'Style', default: 'flowing', options: [
                    { value: 'flowing', label: 'Flowing' },
                    { value: 'random', label: 'Random' },
                    { value: 'parallel', label: 'Parallel' },
                    { value: 'radial', label: 'Radial' },
                    { value: 'wave', label: 'Wave' }
                ]},
                segments: { type: 'int', label: 'Curve Smoothness', default: 30, min: 10, max: 100 },
                seed: { type: 'int', label: 'Random Seed', default: -1, min: -1, max: 9999 },
                show_control_points: { type: 'bool', label: 'Show Control Points', default: false }
            }
        },
        noise: {
            name: 'Perlin Noise',
            description: 'Grid of shapes sized by Perlin noise values - organic halftone effect',
            options: {
                grid_spacing: { type: 'int', label: 'Grid Spacing', default: 15, min: 5, max: 40 },
                noise_scale_x: { type: 'float', label: 'X Noise Scale', default: 0.015, min: 0.005, max: 0.1, step: 0.005 },
                noise_scale_y: { type: 'float', label: 'Y Noise Scale', default: 0.02, min: 0.005, max: 0.1, step: 0.005 },
                offset: { type: 'int', label: 'Noise Offset', default: 0, min: 0, max: 1000 },
                min_size_ratio: { type: 'float', label: 'Min Size Ratio', default: 0.1, min: 0.0, max: 0.9, step: 0.1 },
                shape: { type: 'select', label: 'Shape Type', default: 'circle', options: [
                    { value: 'circle', label: 'Circle' },
                    { value: 'square', label: 'Square' },
                    { value: 'diamond', label: 'Diamond' },
                    { value: 'cross', label: 'Cross' },
                    { value: 'line', label: 'Line' }
                ]},
                seed: { type: 'int', label: 'Random Seed', default: -1, min: -1, max: 9999 },
                invert_noise: { type: 'bool', label: 'Invert Noise', default: false }
            }
        },
        kaleidoscope: {
            name: 'Kaleidoscope',
            description: 'Symmetrical patterns with rotational and reflective symmetry',
            options: {
                symmetry: { type: 'int', label: 'Symmetry Sections', default: 6, min: 2, max: 24 },
                pattern: { type: 'select', label: 'Pattern Type', default: 'curves', options: [
                    { value: 'curves', label: 'Curves' },
                    { value: 'lines', label: 'Lines' },
                    { value: 'spirals', label: 'Spirals' },
                    { value: 'petals', label: 'Petals' },
                    { value: 'geometric', label: 'Geometric' }
                ]},
                complexity: { type: 'int', label: 'Pattern Complexity', default: 8, min: 3, max: 30 },
                radius: { type: 'float', label: 'Radius (%)', default: 80, min: 20, max: 100 },
                inner_radius: { type: 'float', label: 'Inner Radius (%)', default: 10, min: 0, max: 50 },
                seed: { type: 'int', label: 'Random Seed', default: -1, min: -1, max: 9999 },
                reflect: { type: 'bool', label: 'Mirror Reflections', default: true }
            }
        },
        colorfuldots: {
            name: 'Colorful Dots',
            description: 'Halftone-style color separation - generates all layers automatically',
            options: {
                color_mode: { type: 'select', label: 'Color Mode', default: 'cmyk', options: [
                    { value: 'cmyk', label: 'CMYK (4 layers)' },
                    { value: 'rgb', label: 'RGB (3 layers)' },
                    { value: 'primary', label: 'Primary RYB (3 layers)' },
                    { value: 'warm', label: 'Warm (3 layers)' },
                    { value: 'cool', label: 'Cool (3 layers)' }
                ]},
                grid_spacing: { type: 'int', label: 'Grid Spacing', default: 15, min: 8, max: 40 },
                max_dot_size: { type: 'float', label: 'Max Dot Size', default: 12, min: 5, max: 30 },
                layer_offset: { type: 'int', label: 'Layer Offset', default: 4, min: 1, max: 12 },
                num_circles: { type: 'int', label: 'Source Circles', default: 30, min: 5, max: 100 },
                circle_min: { type: 'float', label: 'Circle Min Size', default: 30, min: 10, max: 100 },
                circle_max: { type: 'float', label: 'Circle Max Size', default: 80, min: 30, max: 200 },
                seed: { type: 'int', label: 'Random Seed', default: -1, min: -1, max: 9999 }
            }
        },
        interlockings: {
            name: 'Interlockings',
            description: 'Rotating parallel line layers - each layer a different color for moiré effects',
            options: {
                num_layers: { type: 'int', label: 'Number of Layers', default: 6, min: 2, max: 16 },
                lines_per_layer: { type: 'int', label: 'Lines Per Layer', default: 30, min: 10, max: 80 },
                line_spacing: { type: 'float', label: 'Line Spacing (mm)', default: 5, min: 2, max: 15 },
                center_offset: { type: 'float', label: 'Center Offset (%)', default: 10, min: 0, max: 30 },
                seed: { type: 'int', label: 'Random Seed', default: -1, min: -1, max: 9999 }
            }
        },
        sudokucartography: {
            name: 'Sudoku Cartography',
            description: 'Visualize Sudoku solver algorithm path as bezier curves - cartographic art from computation',
            options: {
                initial_cells: { type: 'int', label: 'Initial Clues', default: 17, min: 10, max: 30 },
                curve_tension: { type: 'float', label: 'Curve Tension', default: 50, min: 10, max: 150 },
                draw_grid: { type: 'bool', label: 'Draw Grid', default: false },
                draw_path: { type: 'bool', label: 'Draw Solution Path', default: false },
                seed: { type: 'int', label: 'Random Seed', default: -1, min: -1, max: 9999 },
                max_checks: { type: 'int', label: 'Max Checks to Draw', default: 500, min: 50, max: 2000 }
            }
        }
    };
    
    listGenerators() {
        // Return generators sorted alphabetically by name
        const generators = Object.entries(PatternGenerator.GENERATORS).map(([id, v]) => ({ id, ...v }));
        return generators.sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()));
    }
    
    getWorkArea() {
        return {
            left: this.settings.limit_left,
            right: this.settings.limit_right,
            top: this.settings.limit_top,
            bottom: this.settings.limit_bottom,
            width: this.settings.limit_right - this.settings.limit_left,
            height: this.settings.limit_top - this.settings.limit_bottom
        };
    }
    
    generate(generator, options = {}) {
        const methodName = `_generate_${generator}`;
        if (typeof this[methodName] !== 'function') {
            throw new Error(`Unknown generator: ${generator}`);
        }
        
        const result = this[methodName](options);
        
        // Check if multi-layer result (Sonakinatography)
        if (result.multiLayer && result.layers) {
            // Fit each layer's turtle to work area
            const workArea = this.getWorkArea();
            const margin = 20;
            
            // Calculate combined bounds across all layers
            let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
            result.layers.forEach(layer => {
                if (layer.turtle) {
                    const bounds = layer.turtle.getBounds();
                    if (bounds.width > 0) {
                        minX = Math.min(minX, bounds.minX);
                        minY = Math.min(minY, bounds.minY);
                        maxX = Math.max(maxX, bounds.maxX);
                        maxY = Math.max(maxY, bounds.maxY);
                    }
                }
            });
            
            // Calculate uniform scale and offset for all layers
            if (minX !== Infinity) {
                const sourceWidth = maxX - minX;
                const sourceHeight = maxY - minY;
                const targetWidth = (workArea.right - margin) - (workArea.left + margin);
                const targetHeight = (workArea.top - margin) - (workArea.bottom + margin);
                
                const scale = Math.min(targetWidth / sourceWidth, targetHeight / sourceHeight);
                const sourceCx = (minX + maxX) / 2;
                const sourceCy = (minY + maxY) / 2;
                const targetCx = (workArea.left + workArea.right) / 2;
                const targetCy = (workArea.bottom + workArea.top) / 2;
                
                // Apply same transform to all layers
                result.layers.forEach(layer => {
                    if (layer.turtle) {
                        layer.turtle.translate(-sourceCx, -sourceCy);
                        layer.turtle.scale(scale, scale);
                        layer.turtle.translate(targetCx, targetCy);
                        layer.paths = layer.turtle.getPaths();
                    }
                });
            }
            
            return result;
        }
        
        // Standard single turtle
        const workArea = this.getWorkArea();
        const margin = 20;
        result.fitToBounds(
            workArea.left + margin,
            workArea.bottom + margin,
            workArea.right - margin,
            workArea.top - margin
        );
        
        return result;
    }
    
    _generate_spiral(options) {
        const turtle = new Turtle();
        
        const turns = options.turns || 10;
        const spacing = options.spacing || 5;
        
        const stepsPerTurn = 72;
        const totalSteps = Math.floor(turns * stepsPerTurn);
        
        for (let i = 0; i < totalSteps; i++) {
            const angle = 2 * Math.PI * i / stepsPerTurn;
            const r = spacing * i / stepsPerTurn;
            
            const x = r * Math.cos(angle);
            const y = r * Math.sin(angle);
            
            if (i === 0) {
                turtle.jumpTo(x, y);
            } else {
                turtle.moveTo(x, y);
            }
        }
        
        return turtle;
    }
    
    _generate_spirograph(options) {
        const turtle = new Turtle();
        
        const R = options.R || 100;
        const r = options.r || 60;
        const d = options.d || 80;
        const revolutions = options.revolutions || 10;
        
        const steps = 1000 * revolutions;
        
        for (let i = 0; i <= steps; i++) {
            const t = 2 * Math.PI * revolutions * i / steps;
            
            const x = (R - r) * Math.cos(t) + d * Math.cos((R - r) / r * t);
            const y = (R - r) * Math.sin(t) - d * Math.sin((R - r) / r * t);
            
            if (i === 0) {
                turtle.jumpTo(x, y);
            } else {
                turtle.moveTo(x, y);
            }
        }
        
        return turtle;
    }
    
    _generate_lissajous(options) {
        const turtle = new Turtle();
        
        const a = options.a || 3;
        const b = options.b || 4;
        const delta = (options.delta || 90) * Math.PI / 180;
        const size = options.size || 200;
        
        const steps = 1000;
        
        for (let i = 0; i <= steps; i++) {
            const t = 2 * Math.PI * i / steps;
            const x = size * Math.sin(a * t + delta);
            const y = size * Math.sin(b * t);
            
            if (i === 0) {
                turtle.jumpTo(x, y);
            } else {
                turtle.moveTo(x, y);
            }
        }
        
        return turtle;
    }
    
    _generate_maze(options) {
        const turtle = new Turtle();
        
        const rows = options.rows || 20;
        const cols = options.cols || 20;
        const cellSize = options.cell_size || 15;
        
        // Initialize grid
        const visited = Array(rows).fill(null).map(() => Array(cols).fill(false));
        const walls = {
            h: Array(rows + 1).fill(null).map(() => Array(cols).fill(true)),
            v: Array(rows).fill(null).map(() => Array(cols + 1).fill(true))
        };
        
        // Recursive backtracking
        const stack = [[0, 0]];
        visited[0][0] = true;
        
        while (stack.length > 0) {
            const [row, col] = stack[stack.length - 1];
            const neighbors = [];
            
            const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
            for (const [dr, dc] of dirs) {
                const nr = row + dr;
                const nc = col + dc;
                if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && !visited[nr][nc]) {
                    neighbors.push([nr, nc, dr, dc]);
                }
            }
            
            if (neighbors.length > 0) {
                const [nr, nc, dr, dc] = neighbors[Math.floor(Math.random() * neighbors.length)];
                
                if (dr === -1) walls.h[row][col] = false;
                else if (dr === 1) walls.h[row + 1][col] = false;
                else if (dc === -1) walls.v[row][col] = false;
                else if (dc === 1) walls.v[row][col + 1] = false;
                
                visited[nr][nc] = true;
                stack.push([nr, nc]);
            } else {
                stack.pop();
            }
        }
        
        // Draw walls
        const offsetX = -cols * cellSize / 2;
        const offsetY = -rows * cellSize / 2;
        
        // Horizontal walls
        for (let row = 0; row <= rows; row++) {
            for (let col = 0; col < cols; col++) {
                if (walls.h[row][col]) {
                    const x1 = offsetX + col * cellSize;
                    const y1 = offsetY + row * cellSize;
                    const x2 = x1 + cellSize;
                    turtle.drawLine(x1, y1, x2, y1);
                }
            }
        }
        
        // Vertical walls
        for (let row = 0; row < rows; row++) {
            for (let col = 0; col <= cols; col++) {
                if (walls.v[row][col]) {
                    const x1 = offsetX + col * cellSize;
                    const y1 = offsetY + row * cellSize;
                    const y2 = y1 + cellSize;
                    turtle.drawLine(x1, y1, x1, y2);
                }
            }
        }
        
        return turtle;
    }
    
    _generate_dragon(options) {
        const turtle = new Turtle();
        
        const iterations = options.iterations || 12;
        const size = options.size || 3;
        
        // Build L-system string
        let s = 'FX';
        const rules = { 'X': 'X+YF+', 'Y': '-FX-Y' };
        
        for (let i = 0; i < iterations; i++) {
            let ns = '';
            for (const c of s) {
                ns += rules[c] || c;
            }
            s = ns;
        }
        
        // Draw
        turtle.jumpTo(0, 0);
        turtle.setAngle(0);
        
        for (const c of s) {
            if (c === 'F') {
                turtle.forward(size);
            } else if (c === '+') {
                turtle.turnRight(90);
            } else if (c === '-') {
                turtle.turnLeft(90);
            }
        }
        
        return turtle;
    }
    
    _generate_hilbert(options) {
        const turtle = new Turtle();
        
        const order = options.order || 5;
        const size = options.size || 400;
        
        const step = size / (Math.pow(2, order) - 1);
        
        const hilbert = (level, angle) => {
            if (level === 0) return;
            
            turtle.turn(-angle);
            hilbert(level - 1, -angle);
            turtle.forward(step);
            turtle.turn(angle);
            hilbert(level - 1, angle);
            turtle.forward(step);
            hilbert(level - 1, angle);
            turtle.turn(angle);
            turtle.forward(step);
            hilbert(level - 1, -angle);
            turtle.turn(-angle);
        };
        
        turtle.jumpTo(-size/2, -size/2);
        turtle.setAngle(0);
        
        hilbert(order, 90);
        
        return turtle;
    }
    
    _generate_tree(options) {
        const turtle = new Turtle();
        
        const depth = options.depth || 8;
        const trunkLength = options.trunk_length || 100;
        const angle = options.angle || 25;
        const ratio = options.ratio || 0.7;
        
        const branch = (length, level) => {
            if (level === 0 || length < 2) return;
            
            turtle.forward(length);
            
            turtle.turnLeft(angle);
            branch(length * ratio, level - 1);
            
            turtle.turnRight(2 * angle);
            branch(length * ratio, level - 1);
            
            turtle.turnLeft(angle);
            turtle.forward(-length);
        };
        
        turtle.jumpTo(0, -200);
        turtle.setAngle(90);
        
        branch(trunkLength, depth);
        
        return turtle;
    }
    
    _generate_hexagons(options) {
        const turtle = new Turtle();
        
        const size = options.size || 20;
        const rows = options.rows || 10;
        const cols = options.cols || 10;
        
        const w = size * 2;
        const h = size * Math.sqrt(3);
        
        const offsetX = -cols * w * 0.75 / 2;
        const offsetY = -rows * h / 2;
        
        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                const cx = offsetX + col * w * 0.75;
                const cy = offsetY + row * h + (col % 2 ? h / 2 : 0);
                
                for (let i = 0; i < 6; i++) {
                    const angle = Math.PI / 3 * i;
                    const x = cx + size * Math.cos(angle);
                    const y = cy + size * Math.sin(angle);
                    
                    if (i === 0) {
                        turtle.jumpTo(x, y);
                    } else {
                        turtle.moveTo(x, y);
                    }
                }
                
                turtle.moveTo(cx + size, cy);
            }
        }
        
        return turtle;
    }
    
    _generate_flowfield(options) {
        const turtle = new Turtle();
        
        const numLines = options.lines || 200;
        const lineLength = options.length || 50;
        const scale = options.scale || 0.01;
        
        const workArea = this.getWorkArea();
        const margin = 50;
        
        const noise = (x, y) => {
            return Math.sin(x * 0.1) * Math.cos(y * 0.1) +
                   Math.sin(x * 0.05 + y * 0.05) * 0.5;
        };
        
        for (let i = 0; i < numLines; i++) {
            let x = workArea.left + margin + Math.random() * (workArea.width - 2 * margin);
            let y = workArea.bottom + margin + Math.random() * (workArea.height - 2 * margin);
            
            turtle.jumpTo(x, y);
            
            for (let j = 0; j < lineLength; j++) {
                const angle = noise(x * scale, y * scale) * 2 * Math.PI;
                
                x += Math.cos(angle) * 3;
                y += Math.sin(angle) * 3;
                
                if (x < workArea.left || x > workArea.right ||
                    y < workArea.bottom || y > workArea.top) {
                    break;
                }
                
                turtle.moveTo(x, y);
            }
        }
        
        return turtle;
    }
    
    _generate_border(options) {
        const turtle = new Turtle();
        
        const margin = options.margin || 10;
        const workArea = this.getWorkArea();
        
        const x1 = workArea.left + margin;
        const y1 = workArea.bottom + margin;
        const x2 = workArea.right - margin;
        const y2 = workArea.top - margin;
        
        turtle.drawRect(x1, y1, x2 - x1, y2 - y1);
        
        return turtle;
    }
    
    _generate_text(options) {
        const turtle = new Turtle();
        
        const text = options.text || 'Hello World';
        const size = options.size || 50;
        
        // Single-stroke font
        const FONT = {
            'A': [[[0, 0], [0.5, 1], [1, 0]], [[0.2, 0.4], [0.8, 0.4]]],
            'B': [[[0, 0], [0, 1], [0.7, 1], [0.8, 0.9], [0.8, 0.6], [0.7, 0.5], [0, 0.5]], 
                  [[0.7, 0.5], [0.9, 0.4], [0.9, 0.1], [0.8, 0], [0, 0]]],
            'C': [[[1, 0.2], [0.8, 0], [0.2, 0], [0, 0.2], [0, 0.8], [0.2, 1], [0.8, 1], [1, 0.8]]],
            'D': [[[0, 0], [0, 1], [0.6, 1], [0.9, 0.8], [1, 0.5], [0.9, 0.2], [0.6, 0], [0, 0]]],
            'E': [[[1, 0], [0, 0], [0, 1], [1, 1]], [[0, 0.5], [0.7, 0.5]]],
            'F': [[[0, 0], [0, 1], [1, 1]], [[0, 0.5], [0.7, 0.5]]],
            'G': [[[1, 0.8], [0.8, 1], [0.2, 1], [0, 0.8], [0, 0.2], [0.2, 0], [0.8, 0], [1, 0.2], [1, 0.5], [0.5, 0.5]]],
            'H': [[[0, 0], [0, 1]], [[1, 0], [1, 1]], [[0, 0.5], [1, 0.5]]],
            'I': [[[0.3, 0], [0.7, 0]], [[0.5, 0], [0.5, 1]], [[0.3, 1], [0.7, 1]]],
            'J': [[[0, 0.2], [0.2, 0], [0.6, 0], [0.8, 0.2], [0.8, 1]]],
            'K': [[[0, 0], [0, 1]], [[1, 1], [0, 0.5], [1, 0]]],
            'L': [[[0, 1], [0, 0], [1, 0]]],
            'M': [[[0, 0], [0, 1], [0.5, 0.5], [1, 1], [1, 0]]],
            'N': [[[0, 0], [0, 1], [1, 0], [1, 1]]],
            'O': [[[0.2, 0], [0, 0.2], [0, 0.8], [0.2, 1], [0.8, 1], [1, 0.8], [1, 0.2], [0.8, 0], [0.2, 0]]],
            'P': [[[0, 0], [0, 1], [0.8, 1], [1, 0.8], [1, 0.6], [0.8, 0.5], [0, 0.5]]],
            'Q': [[[0.2, 0], [0, 0.2], [0, 0.8], [0.2, 1], [0.8, 1], [1, 0.8], [1, 0.2], [0.8, 0], [0.2, 0]], [[0.6, 0.3], [1, 0]]],
            'R': [[[0, 0], [0, 1], [0.8, 1], [1, 0.8], [1, 0.6], [0.8, 0.5], [0, 0.5]], [[0.5, 0.5], [1, 0]]],
            'S': [[[1, 0.8], [0.8, 1], [0.2, 1], [0, 0.8], [0, 0.6], [0.2, 0.5], [0.8, 0.5], [1, 0.4], [1, 0.2], [0.8, 0], [0.2, 0], [0, 0.2]]],
            'T': [[[0, 1], [1, 1]], [[0.5, 1], [0.5, 0]]],
            'U': [[[0, 1], [0, 0.2], [0.2, 0], [0.8, 0], [1, 0.2], [1, 1]]],
            'V': [[[0, 1], [0.5, 0], [1, 1]]],
            'W': [[[0, 1], [0.25, 0], [0.5, 0.5], [0.75, 0], [1, 1]]],
            'X': [[[0, 0], [1, 1]], [[0, 1], [1, 0]]],
            'Y': [[[0, 1], [0.5, 0.5], [1, 1]], [[0.5, 0.5], [0.5, 0]]],
            'Z': [[[0, 1], [1, 1], [0, 0], [1, 0]]],
            '0': [[[0.2, 0], [0, 0.2], [0, 0.8], [0.2, 1], [0.8, 1], [1, 0.8], [1, 0.2], [0.8, 0], [0.2, 0]], [[0.2, 0.2], [0.8, 0.8]]],
            '1': [[[0.3, 0.8], [0.5, 1], [0.5, 0]], [[0.2, 0], [0.8, 0]]],
            '2': [[[0, 0.8], [0.2, 1], [0.8, 1], [1, 0.8], [1, 0.6], [0, 0], [1, 0]]],
            '3': [[[0, 0.8], [0.2, 1], [0.8, 1], [1, 0.8], [1, 0.6], [0.8, 0.5], [0.5, 0.5]], [[0.8, 0.5], [1, 0.4], [1, 0.2], [0.8, 0], [0.2, 0], [0, 0.2]]],
            '4': [[[0.8, 0], [0.8, 1], [0, 0.3], [1, 0.3]]],
            '5': [[[1, 1], [0, 1], [0, 0.5], [0.8, 0.5], [1, 0.4], [1, 0.2], [0.8, 0], [0.2, 0], [0, 0.2]]],
            '6': [[[1, 0.8], [0.8, 1], [0.2, 1], [0, 0.8], [0, 0.2], [0.2, 0], [0.8, 0], [1, 0.2], [1, 0.4], [0.8, 0.5], [0, 0.5]]],
            '7': [[[0, 1], [1, 1], [0.3, 0]]],
            '8': [[[0.5, 0.5], [0.2, 0.5], [0, 0.7], [0, 0.8], [0.2, 1], [0.8, 1], [1, 0.8], [1, 0.7], [0.8, 0.5], [0.5, 0.5]], 
                  [[0.5, 0.5], [0.2, 0.5], [0, 0.3], [0, 0.2], [0.2, 0], [0.8, 0], [1, 0.2], [1, 0.3], [0.8, 0.5]]],
            '9': [[[0, 0.2], [0.2, 0], [0.8, 0], [1, 0.2], [1, 0.8], [0.8, 1], [0.2, 1], [0, 0.8], [0, 0.6], [0.2, 0.5], [1, 0.5]]],
            '.': [[[0.4, 0.1], [0.6, 0.1], [0.6, 0], [0.4, 0], [0.4, 0.1]]],
            ',': [[[0.5, 0.15], [0.5, 0], [0.3, -0.15]]],
            '!': [[[0.5, 1], [0.5, 0.3]], [[0.5, 0.1], [0.5, 0]]],
            '?': [[[0, 0.8], [0.2, 1], [0.8, 1], [1, 0.8], [1, 0.6], [0.5, 0.4], [0.5, 0.2]], [[0.5, 0.1], [0.5, 0]]],
            '-': [[[0.2, 0.5], [0.8, 0.5]]],
            ':': [[[0.5, 0.7], [0.5, 0.6]], [[0.5, 0.3], [0.5, 0.2]]]
        };
        
        const letterWidth = size * 0.7;
        const totalWidth = text.length * letterWidth;
        let x = -totalWidth / 2;
        const y = -size / 2;
        
        for (const char of text.toUpperCase()) {
            if (char === ' ') {
                x += letterWidth * 0.5;
                continue;
            }
            
            const strokes = FONT[char];
            if (strokes) {
                for (const stroke of strokes) {
                    if (stroke.length >= 2) {
                        const [px, py] = stroke[0];
                        turtle.jumpTo(x + px * size * 0.6, y + py * size);
                        for (let i = 1; i < stroke.length; i++) {
                            const [px2, py2] = stroke[i];
                            turtle.moveTo(x + px2 * size * 0.6, y + py2 * size);
                        }
                    }
                }
            }
            
            x += letterWidth;
        }
        
        return turtle;
    }
    
    // =========================================================================
    // GEOMETRIC PATTERN - Recursive grid of geometric shapes
    // Based on "Padrão Geométrico" p5.js sketch
    // =========================================================================
    
    _generate_geometricpattern(options) {
        const turtle = new Turtle();
        
        const columns = options.columns || 4;
        const rows = options.rows || 5;
        const phase = options.phase || 0.5;
        const seed = options.seed || 42;
        const maxRecursion = options.recursion_depth || 2;
        const minCellSize = options.min_cell_size || 40;
        const drawGrid = options.draw_grid !== false;
        
        const workArea = this.getWorkArea();
        const margin = 20;
        
        const width = workArea.width - 2 * margin;
        const height = workArea.height - 2 * margin;
        const startX = workArea.left + margin;
        const startY = workArea.bottom + margin;
        
        // Initialize seeded random
        this._geoSeed = seed;
        
        // Movement differential for phase offset per cell
        this._geoMoveDiff = 0;
        
        // Draw the recursive grid
        this._drawGeoGrid(turtle, startX, startY, columns, rows, width, phase, maxRecursion, minCellSize, drawGrid, 0);
        
        return turtle;
    }
    
    /**
     * Seeded random for geometric pattern
     */
    _geoRandom() {
        const x = Math.sin(this._geoSeed++) * 10000;
        return x - Math.floor(x);
    }
    
    /**
     * Draw recursive geometric grid
     */
    _drawGeoGrid(turtle, xStart, yStart, colCount, rowCount, totalWidth, phase, maxRecursion, minCellSize, drawGrid, depth) {
        const cellSize = totalWidth / colCount;
        
        for (let j = 0; j < rowCount; j++) {
            for (let i = 0; i < colCount; i++) {
                const x = xStart + i * cellSize;
                const y = yStart + j * cellSize;
                
                // Draw cell border
                if (drawGrid) {
                    turtle.drawRect(x, y, cellSize, cellSize);
                }
                
                // Calculate phase with differential
                const movement = Math.sin(phase * Math.PI * 2 + this._geoMoveDiff * 0.3);
                const mappedMovement = (movement + 1) / 2; // Map -1..1 to 0..1
                
                // Select shape type (0-5, with 5+ being recursive)
                const selector = Math.floor(this._geoRandom() * 9);
                
                if (selector === 0) {
                    // Star
                    const outerRadius = cellSize / 2 - 5;
                    const innerRadius = outerRadius * mappedMovement * 0.6 + outerRadius * 0.2;
                    const pointsOptions = [4, 6, 8, 10, 12, 14, 16, 18];
                    const points = pointsOptions[Math.floor(this._geoRandom() * 8)];
                    this._drawStar(turtle, x + cellSize / 2, y + cellSize / 2, innerRadius, outerRadius, points);
                } else if (selector === 1) {
                    // Circle
                    const diameter = (this._geoRandom() * cellSize / 2 + cellSize / 2) * mappedMovement;
                    if (diameter > 5) {
                        turtle.drawCircle(x + cellSize / 2, y + cellSize / 2, diameter / 2, 32);
                    }
                } else if (selector === 2) {
                    // Double Crown
                    const pointsOptions = [3, 5, 7, 9, 11, 13];
                    const points = pointsOptions[Math.floor(this._geoRandom() * 6)];
                    const pointsHeight = 0.2 + mappedMovement * 0.6;
                    this._drawDoubleCrown(turtle, x, y, cellSize, cellSize, points, pointsHeight);
                } else if (selector === 3) {
                    // Axe (Machado)
                    const shaftWidth = 0.2 + mappedMovement * 0.6;
                    this._drawAxe(turtle, x, y, cellSize, cellSize, shaftWidth);
                } else if (selector === 4) {
                    // Diamond (Losango)
                    const opening = (0.4 + this._geoRandom() * 0.6) * mappedMovement;
                    this._drawDiamond(turtle, x, y, cellSize, cellSize, opening);
                } else if (selector >= 5 && cellSize > minCellSize && depth < maxRecursion) {
                    // Recursive grid
                    this._drawGeoGrid(turtle, x, y, 2, 2, cellSize, phase, maxRecursion, minCellSize, drawGrid, depth + 1);
                } else {
                    // Default: concentric squares
                    const layers = 3 + Math.floor(this._geoRandom() * 3);
                    for (let l = 0; l < layers; l++) {
                        const inset = (l + 1) * cellSize / (layers * 2 + 1) * mappedMovement;
                        if (cellSize - inset * 2 > 2) {
                            turtle.drawRect(x + inset, y + inset, cellSize - inset * 2, cellSize - inset * 2);
                        }
                    }
                }
                
                this._geoMoveDiff++;
            }
        }
    }
    
    /**
     * Draw a multi-pointed star
     */
    _drawStar(turtle, cx, cy, innerRadius, outerRadius, points) {
        const step = Math.PI * 2 / points;
        
        for (let i = 0; i < points; i++) {
            const ang = step * i - Math.PI / 2;
            const innerX = cx + Math.cos(ang) * innerRadius;
            const innerY = cy + Math.sin(ang) * innerRadius;
            const outerX = cx + Math.cos(ang + step / 2) * outerRadius;
            const outerY = cy + Math.sin(ang + step / 2) * outerRadius;
            
            if (i === 0) {
                turtle.jumpTo(innerX, innerY);
            } else {
                turtle.moveTo(innerX, innerY);
            }
            turtle.moveTo(outerX, outerY);
        }
        // Close the star
        const firstInnerX = cx + Math.cos(-Math.PI / 2) * innerRadius;
        const firstInnerY = cy + Math.sin(-Math.PI / 2) * innerRadius;
        turtle.moveTo(firstInnerX, firstInnerY);
    }
    
    /**
     * Draw a double crown (zigzag top and bottom)
     */
    _drawDoubleCrown(turtle, x, y, width, height, points, heightRatio) {
        const pointsHeight = height * heightRatio / 2;
        const pointsSpacing = width / (points - 1);
        
        // Top zigzag (going right)
        for (let i = 0; i < points; i++) {
            const px = x + i * pointsSpacing;
            const py = (i % 2 !== 0) ? y + pointsHeight : y;
            
            if (i === 0) {
                turtle.jumpTo(px, py);
            } else {
                turtle.moveTo(px, py);
            }
        }
        
        // Bottom zigzag (going left)
        for (let i = 0; i < points; i++) {
            const px = (x + width) - i * pointsSpacing;
            const py = (i % 2 !== 0) ? y + height - pointsHeight : y + height;
            turtle.moveTo(px, py);
        }
        
        // Close
        turtle.moveTo(x, y);
    }
    
    /**
     * Draw an axe shape (machado)
     */
    _drawAxe(turtle, x, y, width, height, shaftWidthRatio) {
        const shaftWidth = width * shaftWidthRatio / 2;
        
        turtle.jumpTo(x, y);
        turtle.moveTo(x + shaftWidth, y + shaftWidth);
        turtle.moveTo(x + shaftWidth, y);
        turtle.moveTo(x + width - shaftWidth, y);
        turtle.moveTo(x + width - shaftWidth, y + shaftWidth);
        turtle.moveTo(x + width, y);
        turtle.moveTo(x + width, y + height);
        turtle.moveTo(x + width - shaftWidth, y + height - shaftWidth);
        turtle.moveTo(x + width - shaftWidth, y + height);
        turtle.moveTo(x + shaftWidth, y + height);
        turtle.moveTo(x + shaftWidth, y + height - shaftWidth);
        turtle.moveTo(x, y + height);
        turtle.moveTo(x, y);
    }
    
    /**
     * Draw a diamond/rhombus shape (losango)
     */
    _drawDiamond(turtle, x, y, width, height, openingRatio) {
        const openingWidth = width * openingRatio / 2;
        
        turtle.jumpTo(x + openingWidth, y + height / 2);
        turtle.moveTo(x + width / 2, y);
        turtle.moveTo(x + width - openingWidth, y + height / 2);
        turtle.moveTo(x + width / 2, y + height);
        turtle.moveTo(x + openingWidth, y + height / 2);
    }
    
    // =========================================================================
    // POETRY CLOUDS - Text-based cloud patterns using Perlin noise
    // Based on "The Poetry Clouds" by Kyle Geske (stungeye.com)
    // =========================================================================
    
    _generate_poetryclouds(options) {
        const turtle = new Turtle();
        
        const textSize = options.text_size || 8;
        const cloudThreshold = options.cloud_threshold || 0.55;
        const noiseScale = options.noise_scale || 0.008;
        let seed = options.seed;
        if (seed === undefined || seed === -1) {
            seed = Math.floor(Math.random() * 9999);
        }
        const customText = options.custom_text || '';
        const uppercase = options.uppercase !== false;
        
        const workArea = this.getWorkArea();
        const margin = 20;
        
        // Grid of text positions
        const gridStep = textSize * 1.2;
        
        const startX = workArea.left + margin;
        const endX = workArea.right - margin;
        const startY = workArea.bottom + margin;
        const endY = workArea.top - margin;
        
        // Calculate grid dimensions
        const nx = Math.floor((endX - startX) / gridStep) + 1;
        const ny = Math.floor((endY - startY) / gridStep) + 1;
        
        // Generate noise field using Gaussian-blurred random values (matching server)
        const noiseField = this._generateCloudNoiseField(nx, ny, seed, noiseScale);
        
        // Character index for custom text
        let charIndex = 0;
        
        for (let i = 0; i < nx; i++) {
            for (let j = 0; j < ny; j++) {
                const x = startX + i * gridStep;
                const y = startY + j * gridStep;
                
                // Sample from pre-generated noise field
                const n = noiseField[j * nx + i];
                
                // Only draw text where noise exceeds threshold (cloud areas)
                if (n < cloudThreshold) continue;
                
                // Get letter for this position
                let letter;
                if (customText) {
                    letter = customText[charIndex % customText.length];
                    charIndex++;
                } else {
                    letter = this._getLetterForCoordinate(x, y);
                }
                
                if (uppercase) {
                    letter = letter.toUpperCase();
                }
                
                // Draw the letter using vector font
                this._drawVectorLetter(turtle, letter, x, y, textSize * 0.8);
            }
        }
        
        return turtle;
    }
    
    /**
     * Generate cloud-like noise field matching the server's Gaussian-blurred approach
     */
    _generateCloudNoiseField(nx, ny, seed, noiseScale) {
        // Seeded random
        let rngState = seed;
        const seededRandom = () => {
            rngState = (rngState * 1103515245 + 12345) & 0x7fffffff;
            return rngState / 0x7fffffff;
        };
        
        // Create a higher resolution grid for smoothing
        const scale = 4;
        const hx = nx * scale;
        const hy = ny * scale;
        
        // Generate random field
        const randomField = new Array(hx * hy);
        for (let i = 0; i < hx * hy; i++) {
            randomField[i] = seededRandom();
        }
        
        // Apply simple box blur (simulating Gaussian blur)
        const blurRadius = Math.max(3, Math.floor(noiseScale * 400));
        const blurred = this._boxBlur2D(randomField, hx, hy, blurRadius);
        
        // Downsample and normalize
        const result = new Array(nx * ny);
        let min = Infinity, max = -Infinity;
        
        for (let j = 0; j < ny; j++) {
            for (let i = 0; i < nx; i++) {
                const hi = Math.min(i * scale, hx - 1);
                const hj = Math.min(j * scale, hy - 1);
                const val = blurred[hj * hx + hi];
                result[j * nx + i] = val;
                min = Math.min(min, val);
                max = Math.max(max, val);
            }
        }
        
        // Normalize to 0-1
        const range = max - min || 1;
        for (let i = 0; i < result.length; i++) {
            result[i] = (result[i] - min) / range;
        }
        
        return result;
    }
    
    /**
     * Simple 2D box blur
     */
    _boxBlur2D(data, width, height, radius) {
        const result = new Array(data.length);
        
        // Horizontal pass
        const temp = new Array(data.length);
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                let sum = 0, count = 0;
                for (let dx = -radius; dx <= radius; dx++) {
                    const nx = x + dx;
                    if (nx >= 0 && nx < width) {
                        sum += data[y * width + nx];
                        count++;
                    }
                }
                temp[y * width + x] = sum / count;
            }
        }
        
        // Vertical pass
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                let sum = 0, count = 0;
                for (let dy = -radius; dy <= radius; dy++) {
                    const ny = y + dy;
                    if (ny >= 0 && ny < height) {
                        sum += temp[ny * width + x];
                        count++;
                    }
                }
                result[y * width + x] = sum / count;
            }
        }
        
        return result;
    }
    
    /**
     * Simple seeded random number generator
     */
    _seededRandom(seed) {
        const x = Math.sin(seed) * 10000;
        return x - Math.floor(x);
    }
    
    /**
     * Initialize Perlin noise with seed - matches p5.js implementation
     */
    _initNoise(seed) {
        this._noiseSeed = seed;
        // p5.js uses 4096 precomputed perlin values
        this._perlinSize = 4096;
        this._perlinOctaves = 4;
        this._perlinAmpFalloff = 0.5;
        
        // Generate seeded random values
        this._perlin = new Array(this._perlinSize + 1);
        for (let i = 0; i < this._perlinSize + 1; i++) {
            this._perlin[i] = this._seededRandom(seed + i * 1000);
        }
    }
    
    /**
     * Scaled cosine for smooth interpolation (matches p5.js)
     */
    _scaledCosine(i) {
        return 0.5 * (1.0 - Math.cos(i * Math.PI));
    }
    
    /**
     * 2D Perlin noise matching p5.js noise() function
     */
    _perlinNoise(x, y) {
        if (!this._perlin) {
            this._initNoise(0);
        }
        
        // Ensure positive coordinates
        if (x < 0) x = -x;
        if (y < 0) y = -y;
        
        let xi = Math.floor(x);
        let yi = Math.floor(y);
        let xf = x - xi;
        let yf = y - yi;
        
        let r = 0.0;
        let ampl = 0.5;
        
        for (let o = 0; o < this._perlinOctaves; o++) {
            // Wrap indices
            let of = xi + (yi << 4);  // PERLIN_YWRAP = 16
            
            const rxf = this._scaledCosine(xf);
            const ryf = this._scaledCosine(yf);
            
            // Sample noise at 4 corners and interpolate
            let n1 = this._perlin[of & (this._perlinSize - 1)];
            n1 += rxf * (this._perlin[(of + 1) & (this._perlinSize - 1)] - n1);
            let n2 = this._perlin[(of + 16) & (this._perlinSize - 1)];  // PERLIN_YWRAP = 16
            n2 += rxf * (this._perlin[(of + 16 + 1) & (this._perlinSize - 1)] - n2);
            n1 += ryf * (n2 - n1);
            
            r += n1 * ampl;
            ampl *= this._perlinAmpFalloff;
            xi <<= 1;
            xf *= 2;
            yi <<= 1;
            yf *= 2;
            
            if (xf >= 1.0) {
                xi += 1;
                xf -= 1;
            }
            if (yf >= 1.0) {
                yi += 1;
                yf -= 1;
            }
        }
        
        return r;
    }
    
    /**
     * Get a deterministic letter for a coordinate (hash function)
     */
    _getLetterForCoordinate(x, y) {
        const hash = (x + y) * Math.sin(x * y * 0.01);
        const index = Math.abs(Math.floor(hash * 1000)) % 26;
        return String.fromCharCode(65 + index); // A-Z
    }
    
    /**
     * Draw a single letter using vector strokes
     */
    _drawVectorLetter(turtle, char, x, y, size) {
        // Single-stroke vector font (same as text generator)
        const FONT = {
            'A': [[[0, 0], [0.5, 1], [1, 0]], [[0.2, 0.4], [0.8, 0.4]]],
            'B': [[[0, 0], [0, 1], [0.7, 1], [0.8, 0.9], [0.8, 0.6], [0.7, 0.5], [0, 0.5]], 
                  [[0.7, 0.5], [0.9, 0.4], [0.9, 0.1], [0.8, 0], [0, 0]]],
            'C': [[[1, 0.2], [0.8, 0], [0.2, 0], [0, 0.2], [0, 0.8], [0.2, 1], [0.8, 1], [1, 0.8]]],
            'D': [[[0, 0], [0, 1], [0.6, 1], [0.9, 0.8], [1, 0.5], [0.9, 0.2], [0.6, 0], [0, 0]]],
            'E': [[[1, 0], [0, 0], [0, 1], [1, 1]], [[0, 0.5], [0.7, 0.5]]],
            'F': [[[0, 0], [0, 1], [1, 1]], [[0, 0.5], [0.7, 0.5]]],
            'G': [[[1, 0.8], [0.8, 1], [0.2, 1], [0, 0.8], [0, 0.2], [0.2, 0], [0.8, 0], [1, 0.2], [1, 0.5], [0.5, 0.5]]],
            'H': [[[0, 0], [0, 1]], [[1, 0], [1, 1]], [[0, 0.5], [1, 0.5]]],
            'I': [[[0.3, 0], [0.7, 0]], [[0.5, 0], [0.5, 1]], [[0.3, 1], [0.7, 1]]],
            'J': [[[0, 0.2], [0.2, 0], [0.6, 0], [0.8, 0.2], [0.8, 1]]],
            'K': [[[0, 0], [0, 1]], [[1, 1], [0, 0.5], [1, 0]]],
            'L': [[[0, 1], [0, 0], [1, 0]]],
            'M': [[[0, 0], [0, 1], [0.5, 0.5], [1, 1], [1, 0]]],
            'N': [[[0, 0], [0, 1], [1, 0], [1, 1]]],
            'O': [[[0.2, 0], [0, 0.2], [0, 0.8], [0.2, 1], [0.8, 1], [1, 0.8], [1, 0.2], [0.8, 0], [0.2, 0]]],
            'P': [[[0, 0], [0, 1], [0.8, 1], [1, 0.8], [1, 0.6], [0.8, 0.5], [0, 0.5]]],
            'Q': [[[0.2, 0], [0, 0.2], [0, 0.8], [0.2, 1], [0.8, 1], [1, 0.8], [1, 0.2], [0.8, 0], [0.2, 0]], [[0.6, 0.3], [1, 0]]],
            'R': [[[0, 0], [0, 1], [0.8, 1], [1, 0.8], [1, 0.6], [0.8, 0.5], [0, 0.5]], [[0.5, 0.5], [1, 0]]],
            'S': [[[1, 0.8], [0.8, 1], [0.2, 1], [0, 0.8], [0, 0.6], [0.2, 0.5], [0.8, 0.5], [1, 0.4], [1, 0.2], [0.8, 0], [0.2, 0], [0, 0.2]]],
            'T': [[[0, 1], [1, 1]], [[0.5, 1], [0.5, 0]]],
            'U': [[[0, 1], [0, 0.2], [0.2, 0], [0.8, 0], [1, 0.2], [1, 1]]],
            'V': [[[0, 1], [0.5, 0], [1, 1]]],
            'W': [[[0, 1], [0.25, 0], [0.5, 0.5], [0.75, 0], [1, 1]]],
            'X': [[[0, 0], [1, 1]], [[0, 1], [1, 0]]],
            'Y': [[[0, 1], [0.5, 0.5], [1, 1]], [[0.5, 0.5], [0.5, 0]]],
            'Z': [[[0, 1], [1, 1], [0, 0], [1, 0]]],
            ' ': []
        };
        
        const upperChar = char.toUpperCase();
        const strokes = FONT[upperChar];
        
        if (!strokes || strokes.length === 0) return;
        
        const scale = size;
        
        for (const stroke of strokes) {
            if (stroke.length >= 2) {
                const [px, py] = stroke[0];
                turtle.jumpTo(x + px * scale, y + py * scale);
                for (let i = 1; i < stroke.length; i++) {
                    const [px2, py2] = stroke[i];
                    turtle.moveTo(x + px2 * scale, y + py2 * scale);
                }
            }
        }
    }
    
    // =========================================================================
    // GLOW - Fluid particle flow driven by Perlin noise flowfield
    // Inspired by "Glow" sketch - knowledge fluidity visualization
    // =========================================================================
    
    _generate_glow(options) {
        const colorProfile = options.color_profile || 'rainbow';
        const numParticles = options.particles || 500;
        const iterations = options.iterations || 200;
        const noiseInc = options.noise_scale || 0.01;
        const flowScale = options.flow_cell_size || 10;
        const maxSpeed = options.max_speed || 1.3;
        let seed = options.seed;
        if (seed === undefined || seed === -1) {
            seed = Math.floor(Math.random() * 999999);
        }
        const circularBounds = options.circular_bounds || false;
        const drawTrails = options.draw_trails !== false;
        
        // Color profile configurations
        const colorConfigs = {
            'rainbow': { colors: ['red', 'orange', 'yellow', 'green', 'blue', 'purple', 'pink'] },
            'warm': { colors: ['red', 'orange', 'yellow'] },
            'cool': { colors: ['blue', 'green', 'purple'] },
            'monochrome': { colors: ['black'] },
            'primary': { colors: ['red', 'yellow', 'blue'] },
            'pastel': { colors: ['pink', 'yellow', 'green', 'blue', 'purple'] }
        };
        
        const config = colorConfigs[colorProfile] || colorConfigs['rainbow'];
        const numLayers = config.colors.length;
        
        const workArea = this.getWorkArea();
        const margin = 20;
        
        const width = workArea.width - 2 * margin;
        const height = workArea.height - 2 * margin;
        const startX = workArea.left + margin;
        const startY = workArea.bottom + margin;
        const centerX = startX + width / 2;
        const centerY = startY + height / 2;
        const circleRadius = Math.min(width, height) / 2 * 0.8;
        
        // Initialize noise with seed
        this._initNoise(seed);
        
        // Seeded random for particle positions
        let rngState = seed;
        const seededRandom = () => {
            rngState = (rngState * 1103515245 + 12345) & 0x7fffffff;
            return rngState / 0x7fffffff;
        };
        
        // Flow field grid
        const cols = Math.floor(width / flowScale);
        const rows = Math.floor(height / flowScale);
        const flowfield = new Array(cols * rows);
        
        // Create particles - assign each to a layer
        const particles = [];
        for (let i = 0; i < numParticles; i++) {
            let px, py;
            if (circularBounds && seededRandom() > 0.8) {
                let attempts = 0;
                do {
                    px = startX + seededRandom() * width;
                    py = startY + seededRandom() * height;
                    attempts++;
                } while (this._dist(centerX, centerY, px, py) >= circleRadius && attempts < 100);
            } else {
                px = startX + seededRandom() * width;
                py = startY + seededRandom() * height;
            }
            
            particles.push({
                x: px,
                y: py,
                prevX: px,
                prevY: py,
                vx: 0,
                vy: 0,
                layerIdx: i % numLayers,  // Distribute across layers
                paths: [[[px, py]]]  // Array of path segments
            });
        }
        
        // Simulate flowfield
        let zoff = 0;
        
        for (let iter = 0; iter < iterations; iter++) {
            // Update flowfield
            let yoff = 0;
            for (let y = 0; y < rows; y++) {
                let xoff = 0;
                for (let x = 0; x < cols; x++) {
                    const index = x + y * cols;
                    const angle = this._perlinNoise(xoff, yoff) * Math.PI * 4;
                    flowfield[index] = {
                        x: Math.cos(angle),
                        y: Math.sin(angle)
                    };
                    xoff += noiseInc;
                }
                yoff += noiseInc;
            }
            zoff += 0.0005;
            
            // Update particles
            for (const p of particles) {
                const gridX = Math.floor((p.x - startX) / flowScale);
                const gridY = Math.floor((p.y - startY) / flowScale);
                
                if (gridX >= 0 && gridX < cols && gridY >= 0 && gridY < rows) {
                    const index = gridX + gridY * cols;
                    const force = flowfield[index];
                    
                    if (force) {
                        p.vx += force.x;
                        p.vy += force.y;
                        
                        const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
                        if (speed > maxSpeed) {
                            p.vx = (p.vx / speed) * maxSpeed;
                            p.vy = (p.vy / speed) * maxSpeed;
                        }
                        
                        p.prevX = p.x;
                        p.prevY = p.y;
                        p.x += p.vx;
                        p.y += p.vy;
                        
                        // Add to current path
                        if (drawTrails) {
                            p.paths[p.paths.length - 1].push([p.x, p.y]);
                        }
                        
                        // Handle bounds - start new path segment on wrap
                        let wrapped = false;
                        if (circularBounds) {
                            if (this._dist(centerX, centerY, p.x, p.y) > circleRadius) {
                                let attempts = 0;
                                do {
                                    p.x = startX + seededRandom() * width;
                                    p.y = startY + seededRandom() * height;
                                    attempts++;
                                } while (this._dist(centerX, centerY, p.x, p.y) >= circleRadius && attempts < 100);
                                wrapped = true;
                            }
                        } else {
                            if (p.x > startX + width) { p.x = startX; wrapped = true; }
                            if (p.x < startX) { p.x = startX + width; wrapped = true; }
                            if (p.y > startY + height) { p.y = startY; wrapped = true; }
                            if (p.y < startY) { p.y = startY + height; wrapped = true; }
                        }
                        
                        if (wrapped) {
                            p.vx = 0;
                            p.vy = 0;
                            p.paths.push([[p.x, p.y]]);
                        }
                    }
                }
            }
        }
        
        // Create layer turtles and draw particles
        const layers = [];
        
        for (let layerIdx = 0; layerIdx < numLayers; layerIdx++) {
            const turtle = new Turtle();
            
            // Draw all particles belonging to this layer
            for (const p of particles) {
                if (p.layerIdx === layerIdx) {
                    if (drawTrails) {
                        for (const pathSeg of p.paths) {
                            if (pathSeg.length > 1) {
                                this._drawGlowPath(turtle, pathSeg);
                            }
                        }
                    } else {
                        turtle.jumpTo(p.x - 0.5, p.y);
                        turtle.moveTo(p.x + 0.5, p.y);
                    }
                }
            }
            
            const paths = turtle.getPaths();
            if (paths.length > 0) {
                layers.push({
                    name: `Glow (${config.colors[layerIdx].charAt(0).toUpperCase() + config.colors[layerIdx].slice(1)})`,
                    color: config.colors[layerIdx],
                    paths: paths
                });
            }
        }
        
        return { multiLayer: true, layers: layers };
    }
    
    /**
     * Draw a particle trail path
     */
    _drawGlowPath(turtle, path) {
        if (path.length < 2) return;
        
        turtle.jumpTo(path[0][0], path[0][1]);
        for (let i = 1; i < path.length; i++) {
            turtle.moveTo(path[i][0], path[i][1]);
        }
    }
    
    /**
     * Calculate distance between two points
     */
    _dist(x1, y1, x2, y2) {
        const dx = x2 - x1;
        const dy = y2 - y1;
        return Math.sqrt(dx * dx + dy * dy);
    }
    
    // =========================================================================
    // RANDOM POETRY - Scattered words in random positions and sizes
    // Inspired by Emily Dickinson's poetic vocabulary
    // =========================================================================
    
    _generate_randompoetry(options) {
        const turtle = new Turtle();
        
        const wordPreset = options.word_preset || 'dickinson';
        const wordCount = options.word_count || 25;
        const minSize = options.min_size || 8;
        const maxSize = options.max_size || 25;
        let seed = options.seed;
        if (seed === undefined || seed === -1) {
            seed = Math.floor(Math.random() * 999999);
        }
        const customWords = options.custom_words || '';
        const uppercase = options.uppercase || false;
        
        const workArea = this.getWorkArea();
        const margin = 30;
        
        // Word presets from various poetic traditions
        const wordPresets = {
            dickinson: [
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
            shakespeare: [
                'love', 'heart', 'soul', 'fate', 'fortune', 'death', 'life', 'time',
                'beauty', 'youth', 'age', 'truth', 'honor', 'shame', 'pride', 'folly',
                'crown', 'throne', 'king', 'queen', 'prince', 'lord', 'lady', 'knight',
                'sword', 'blood', 'war', 'peace', 'victory', 'defeat', 'revenge',
                'rose', 'summer', 'winter', 'spring', 'tempest', 'storm', 'sea',
                'dream', 'sleep', 'wake', 'night', 'day', 'dawn', 'dusk', 'star',
                'ghost', 'spirit', 'shadow', 'grave', 'tomb', 'heaven', 'hell',
                'kiss', 'embrace', 'parting', 'sorrow', 'joy', 'tears', 'laughter',
                'fair', 'foul', 'sweet', 'bitter', 'gentle', 'cruel', 'noble', 'vile'
            ],
            poe: [
                'raven', 'nevermore', 'midnight', 'darkness', 'shadow', 'sorrow',
                'dream', 'nightmare', 'tomb', 'grave', 'death', 'dying', 'decay',
                'ghost', 'phantom', 'specter', 'wraith', 'haunted', 'horror', 'terror',
                'heart', 'beating', 'silence', 'whisper', 'scream', 'madness', 'sanity',
                'crimson', 'ebony', 'velvet', 'purple', 'pallid', 'ghastly', 'grim',
                'chamber', 'door', 'window', 'floor', 'corridor', 'wall', 'ceiling',
                'lost', 'forgotten', 'memory', 'lenore', 'evermore', 'forlorn',
                'night', 'moon', 'stars', 'darkness', 'lamplight', 'candle', 'flame'
            ],
            whitman: [
                'america', 'democracy', 'freedom', 'liberty', 'union', 'nation',
                'grass', 'leaves', 'tree', 'oak', 'lilac', 'bloom', 'blossom',
                'body', 'electric', 'soul', 'spirit', 'flesh', 'bone', 'blood',
                'song', 'sing', 'chant', 'voice', 'cry', 'call', 'shout', 'whisper',
                'open', 'road', 'journey', 'travel', 'wander', 'roam', 'explore',
                'sea', 'ocean', 'wave', 'shore', 'ship', 'sail', 'voyage', 'captain',
                'sun', 'moon', 'stars', 'sky', 'earth', 'cosmos', 'universe', 'infinite',
                'love', 'comrade', 'friend', 'brother', 'sister', 'child', 'mother'
            ],
            romantic: [
                'beauty', 'sublime', 'nature', 'passion', 'imagination', 'emotion',
                'wanderer', 'pilgrim', 'solitary', 'lonely', 'melancholy', 'reverie',
                'mountain', 'valley', 'river', 'lake', 'forest', 'meadow', 'moor',
                'moonlight', 'starlight', 'twilight', 'dawn', 'dusk', 'midnight',
                'nightingale', 'skylark', 'raven', 'dove', 'eagle', 'swan', 'owl',
                'rose', 'lily', 'violet', 'daffodil', 'primrose', 'willow', 'oak',
                'love', 'desire', 'longing', 'yearning', 'ecstasy', 'agony', 'rapture',
                'dream', 'vision', 'phantom', 'spirit', 'ghost', 'muse', 'inspiration'
            ],
            nature: [
                'mountain', 'river', 'ocean', 'forest', 'meadow', 'valley', 'canyon',
                'sunrise', 'sunset', 'moonrise', 'starlight', 'aurora', 'rainbow',
                'oak', 'pine', 'willow', 'birch', 'maple', 'cedar', 'redwood', 'fern',
                'eagle', 'hawk', 'owl', 'raven', 'sparrow', 'heron', 'swan', 'butterfly',
                'wolf', 'bear', 'deer', 'fox', 'rabbit', 'otter', 'salmon', 'moth',
                'rain', 'snow', 'mist', 'fog', 'frost', 'dew', 'thunder', 'lightning',
                'spring', 'summer', 'autumn', 'winter', 'bloom', 'harvest', 'wild'
            ],
            cosmic: [
                'cosmos', 'universe', 'galaxy', 'nebula', 'supernova', 'quasar', 'pulsar',
                'star', 'sun', 'moon', 'planet', 'asteroid', 'comet', 'meteor', 'orbit',
                'light', 'dark', 'void', 'abyss', 'infinite', 'eternal', 'vast', 'endless',
                'space', 'time', 'dimension', 'warp', 'quantum', 'singularity', 'horizon',
                'stellar', 'celestial', 'astral', 'lunar', 'solar', 'galactic', 'cosmic',
                'explore', 'discover', 'voyage', 'journey', 'drift', 'float', 'orbit'
            ],
            gothic: [
                'darkness', 'shadow', 'gloom', 'midnight', 'twilight', 'dusk', 'moonless',
                'castle', 'dungeon', 'tower', 'crypt', 'tomb', 'catacomb', 'labyrinth',
                'ghost', 'phantom', 'specter', 'wraith', 'apparition', 'haunted', 'cursed',
                'blood', 'bone', 'skull', 'corpse', 'shroud', 'coffin', 'grave', 'funeral',
                'raven', 'bat', 'spider', 'serpent', 'wolf', 'owl', 'crow', 'moth',
                'storm', 'thunder', 'lightning', 'tempest', 'howling', 'wailing', 'moaning'
            ],
            zen: [
                'silence', 'stillness', 'peace', 'calm', 'serenity', 'tranquil', 'quiet',
                'breath', 'breathing', 'inhale', 'exhale', 'flow', 'release', 'let',
                'mind', 'awareness', 'presence', 'moment', 'now', 'here', 'being',
                'water', 'river', 'stream', 'rain', 'dew', 'mist', 'cloud', 'wave',
                'mountain', 'stone', 'pebble', 'sand', 'garden', 'bamboo', 'lotus', 'cherry',
                'moon', 'sun', 'sky', 'wind', 'leaf', 'blossom', 'autumn', 'spring',
                'path', 'way', 'journey', 'step', 'walk', 'sit', 'stand', 'bow',
                'empty', 'full', 'nothing', 'everything', 'one', 'whole', 'unity'
            ]
        };
        
        // Use custom words if provided, otherwise use preset
        let words;
        if (customWords.trim()) {
            words = customWords.split(',').map(w => w.trim()).filter(w => w.length > 0);
        } else {
            words = wordPresets[wordPreset] || wordPresets.dickinson;
        }
        
        // Seed random
        this._initNoise(seed);
        let rngState = seed;
        const seededRandom = () => {
            rngState = (rngState * 1103515245 + 12345) & 0x7fffffff;
            return rngState / 0x7fffffff;
        };
        
        const startX = workArea.left + margin;
        const endX = workArea.right - margin;
        const startY = workArea.bottom + margin;
        const endY = workArea.top - margin;
        const rangeX = endX - startX;
        const rangeY = endY - startY;
        
        // Draw scattered words
        for (let i = 0; i < wordCount; i++) {
            // Random position
            const x = startX + seededRandom() * rangeX;
            const y = startY + seededRandom() * rangeY;
            
            // Random size
            const size = minSize + seededRandom() * (maxSize - minSize);
            
            // Random word
            const wordIndex = Math.floor(seededRandom() * words.length);
            let word = words[wordIndex];
            
            if (uppercase) {
                word = word.toUpperCase();
            }
            
            // Draw the word
            this._drawWord(turtle, word, x, y, size);
        }
        
        return turtle;
    }
    
    /**
     * Draw a complete word using vector letters
     */
    _drawWord(turtle, word, x, y, size) {
        const letterSpacing = size * 0.7;
        let currentX = x;
        
        for (const char of word) {
            this._drawVectorLetter(turtle, char, currentX, y, size);
            currentX += letterSpacing;
        }
    }
    
    // =========================================================================
    // GAME OF LIFE - Conway's cellular automaton
    // =========================================================================
    
    _generate_gameoflife(options) {
        const turtle = new Turtle();
        
        const cellSize = options.cell_size || 8;
        const generations = options.generations || 50;
        const initialDensity = options.initial_density || 0.4;
        const seed = options.seed || 42;
        const drawGrid = options.draw_grid || false;
        const fillCells = options.fill_cells !== false;
        const showHistory = options.show_history || false;
        
        const workArea = this.getWorkArea();
        const margin = 10;
        
        const startX = workArea.left + margin;
        const startY = workArea.bottom + margin;
        const width = workArea.width - 2 * margin;
        const height = workArea.height - 2 * margin;
        
        const columnCount = Math.floor(width / cellSize);
        const rowCount = Math.floor(height / cellSize);
        
        // Seeded random
        let rngState = seed;
        const seededRandom = () => {
            rngState = (rngState * 1103515245 + 12345) & 0x7fffffff;
            return rngState / 0x7fffffff;
        };
        
        // Initialize current and next cell grids
        let currentCells = [];
        let nextCells = [];
        
        for (let col = 0; col < columnCount; col++) {
            currentCells[col] = [];
            nextCells[col] = [];
            for (let row = 0; row < rowCount; row++) {
                // Random initial state based on density
                currentCells[col][row] = seededRandom() < initialDensity ? 1 : 0;
                nextCells[col][row] = 0;
            }
        }
        
        // Track cell history if showing history
        const history = showHistory ? [this._copyGrid(currentCells, columnCount, rowCount)] : null;
        
        // Run simulation for N generations
        for (let gen = 0; gen < generations; gen++) {
            // Calculate next generation
            for (let col = 0; col < columnCount; col++) {
                for (let row = 0; row < rowCount; row++) {
                    // Wrap-around neighbors
                    const left = (col - 1 + columnCount) % columnCount;
                    const right = (col + 1) % columnCount;
                    const above = (row - 1 + rowCount) % rowCount;
                    const below = (row + 1) % rowCount;
                    
                    // Count living neighbors
                    const neighbors = 
                        currentCells[left][above] +
                        currentCells[col][above] +
                        currentCells[right][above] +
                        currentCells[left][row] +
                        currentCells[right][row] +
                        currentCells[left][below] +
                        currentCells[col][below] +
                        currentCells[right][below];
                    
                    // Rules of Life
                    if (neighbors < 2 || neighbors > 3) {
                        // Dies from under/overpopulation
                        nextCells[col][row] = 0;
                    } else if (neighbors === 3) {
                        // Birth
                        nextCells[col][row] = 1;
                    } else {
                        // Survives
                        nextCells[col][row] = currentCells[col][row];
                    }
                }
            }
            
            // Swap grids
            const temp = currentCells;
            currentCells = nextCells;
            nextCells = temp;
            
            if (showHistory) {
                history.push(this._copyGrid(currentCells, columnCount, rowCount));
            }
        }
        
        // Draw the result
        if (drawGrid) {
            // Draw grid lines
            for (let col = 0; col <= columnCount; col++) {
                const x = startX + col * cellSize;
                turtle.jumpTo(x, startY);
                turtle.moveTo(x, startY + rowCount * cellSize);
            }
            for (let row = 0; row <= rowCount; row++) {
                const y = startY + row * cellSize;
                turtle.jumpTo(startX, y);
                turtle.moveTo(startX + columnCount * cellSize, y);
            }
        }
        
        // Draw alive cells
        if (showHistory && history) {
            // Draw all generations with fading (older = lighter pattern)
            const step = Math.max(1, Math.floor(history.length / 10));
            for (let g = 0; g < history.length; g += step) {
                const grid = history[g];
                const opacity = (g + 1) / history.length;
                this._drawLifeCells(turtle, grid, columnCount, rowCount, startX, startY, cellSize, fillCells, opacity);
            }
        } else {
            // Draw final state
            this._drawLifeCells(turtle, currentCells, columnCount, rowCount, startX, startY, cellSize, fillCells, 1);
        }
        
        return turtle;
    }
    
    /**
     * Copy a 2D grid
     */
    _copyGrid(grid, cols, rows) {
        const copy = [];
        for (let col = 0; col < cols; col++) {
            copy[col] = [];
            for (let row = 0; row < rows; row++) {
                copy[col][row] = grid[col][row];
            }
        }
        return copy;
    }
    
    /**
     * Draw Game of Life cells
     */
    _drawLifeCells(turtle, grid, cols, rows, startX, startY, cellSize, fill, density) {
        for (let col = 0; col < cols; col++) {
            for (let row = 0; row < rows; row++) {
                if (grid[col][row] === 1) {
                    const x = startX + col * cellSize;
                    const y = startY + row * cellSize;
                    
                    if (fill) {
                        // Fill with hatching based on density
                        const hatchSpacing = cellSize / (2 + density * 3);
                        for (let h = hatchSpacing; h < cellSize; h += hatchSpacing) {
                            turtle.jumpTo(x + h, y);
                            turtle.moveTo(x + h, y + cellSize);
                        }
                    }
                    // Draw cell border
                    turtle.drawRect(x, y, cellSize, cellSize);
                }
            }
        }
    }
    
    // =========================================================================
    // ZEN POTS - Pottery shapes with stippled dot aesthetic
    // Inspired by the OpenProcessing pottery challenge
    // =========================================================================
    
    _generate_zenpots(options) {
        /**
         * Generate pottery shapes with flowers and stippled dot patterns.
         * Returns multi-layer output with separate layers for ground, pots, and flowers.
         */
        const potCount = options.pot_count || 12;
        const dotDensity = options.dot_density || 0.4;
        const flowerStyle = options.flower_style || 'branches';
        const flowerDensity = options.flower_density || 0.5;
        const potColorTheme = options.pot_color || 'terracotta';
        const flowerColorTheme = options.flower_color || 'forest';
        let seed = options.seed;
        if (seed === undefined || seed === -1) {
            seed = Math.floor(Math.random() * 999999);
        }
        const drawGround = options.draw_ground !== false;
        
        // Color mappings for pots/ground
        const potColors = {
            'terracotta': { pot: 'orange', ground: 'brown' },
            'earth': { pot: 'brown', ground: 'brown' },
            'slate': { pot: 'blue', ground: 'blue' },
            'clay': { pot: 'pink', ground: 'brown' },
            'ceramic': { pot: 'blue', ground: 'brown' },
            'rustic': { pot: 'red', ground: 'brown' },
            'modern': { pot: 'black', ground: 'black' },
            'vintage': { pot: 'purple', ground: 'brown' }
        };
        
        // Color mappings for flowers
        const flowerColors = {
            'forest': 'green',
            'spring': 'pink',
            'autumn': 'orange',
            'lavender': 'purple',
            'wildflower': 'pink',
            'tropical': 'yellow',
            'berry': 'red',
            'ink': 'black'
        };
        
        const potTheme = potColors[potColorTheme] || potColors['terracotta'];
        const flowerPenColor = flowerColors[flowerColorTheme] || 'green';
        
        const workArea = this.getWorkArea();
        const padding = Math.min(workArea.width, workArea.height) * 0.1;
        
        const startX = workArea.left + padding;
        const endX = workArea.right - padding;
        const baseY = workArea.bottom + padding + (workArea.height - 2 * padding) * 0.2;
        const availableWidth = endX - startX;
        const potWidth = availableWidth / potCount;
        
        // Seeded random
        let rngState = seed;
        const seededRandom = () => {
            rngState = (rngState * 1103515245 + 12345) & 0x7fffffff;
            return rngState / 0x7fffffff;
        };
        
        // Pre-calculate pot data for consistent placement across layers
        const potData = [];
        for (let i = 0; i < potCount; i++) {
            const potCenterX = startX + (i + 0.5) * potWidth;
            const potBaseY = baseY;
            const potRadius = potWidth * 0.4;
            const minH = 0.4 + seededRandom() * 0.3;
            const maxH = 1.5 + seededRandom() * 0.5;
            const potHeight = potWidth * (minH + seededRandom() * (maxH - minH));
            const hasFlower = flowerStyle !== 'none' && seededRandom() < flowerDensity + 0.3;
            potData.push({
                x: potCenterX,
                y: potBaseY,
                radius: potRadius,
                height: potHeight,
                hasFlower: hasFlower
            });
        }
        
        const layers = [];
        
        // Layer 1: Ground
        if (drawGround) {
            const groundTurtle = new Turtle();
            let groundRng = seed + 500;
            const groundRandom = () => {
                groundRng = (groundRng * 1103515245 + 12345) & 0x7fffffff;
                return groundRng / 0x7fffffff;
            };
            
            groundTurtle.jumpTo(startX - padding * 0.5, baseY);
            groundTurtle.moveTo(endX + padding * 0.5, baseY);
            
            const groundDots = Math.floor(availableWidth * dotDensity * 3);
            for (let i = 0; i < groundDots; i++) {
                const dx = startX + groundRandom() * availableWidth;
                const dy = baseY - groundRandom() * padding * 0.4;
                groundTurtle.jumpTo(dx - 0.2, dy);
                groundTurtle.moveTo(dx + 0.2, dy);
            }
            
            layers.push({
                name: `Zen Pots (Ground - ${potColorTheme.charAt(0).toUpperCase() + potColorTheme.slice(1)})`,
                color: potTheme.ground,
                paths: groundTurtle.getPaths()
            });
        }
        
        // Layer 2: Pots
        const potsTurtle = new Turtle();
        rngState = seed;
        for (let i = 0; i < potCount * 4; i++) seededRandom();
        
        for (const pd of potData) {
            this._drawZenPot(potsTurtle, pd.x, pd.y, pd.radius, pd.height, seededRandom, dotDensity, false);
        }
        
        layers.push({
            name: `Zen Pots (Pots - ${potColorTheme.charAt(0).toUpperCase() + potColorTheme.slice(1)})`,
            color: potTheme.pot,
            paths: potsTurtle.getPaths()
        });
        
        // Layer 3: Flowers
        if (flowerStyle !== 'none') {
            rngState = seed + 1000;
            
            // Wildflower creates multiple colored layers
            if (flowerColorTheme === 'wildflower') {
                const wildflowerColors = ['green', 'pink', 'purple', 'red', 'orange', 'yellow'];
                const flowerTurtles = {};
                wildflowerColors.forEach(c => flowerTurtles[c] = new Turtle());
                
                for (const pd of potData) {
                    if (pd.hasFlower) {
                        const topY = pd.y + pd.height;
                        // Pick random color for this flower
                        const flowerColor = wildflowerColors[Math.floor(seededRandom() * wildflowerColors.length)];
                        // Pick style (or use specified, with 'mixed' choosing randomly)
                        let actualStyle = flowerStyle;
                        if (flowerStyle === 'mixed') {
                            const styles = ['branches', 'minimal', 'full'];
                            actualStyle = styles[Math.floor(seededRandom() * styles.length)];
                        }
                        this._drawZenFlower(flowerTurtles[flowerColor], pd.x, topY, pd.radius, pd.height * 0.6, seededRandom, actualStyle, flowerDensity);
                    }
                }
                
                for (const color of wildflowerColors) {
                    const paths = flowerTurtles[color].getPaths();
                    if (paths.length > 0) {
                        layers.push({
                            name: `Zen Pots (Flowers - ${color.charAt(0).toUpperCase() + color.slice(1)})`,
                            color: color,
                            paths: paths
                        });
                    }
                }
            } else {
                // Single color flowers
                const flowersTurtle = new Turtle();
                
                for (const pd of potData) {
                    if (pd.hasFlower) {
                        const topY = pd.y + pd.height;
                        // Pick style (or use specified, with 'mixed' choosing randomly)
                        let actualStyle = flowerStyle;
                        if (flowerStyle === 'mixed') {
                            const styles = ['branches', 'minimal', 'full'];
                            actualStyle = styles[Math.floor(seededRandom() * styles.length)];
                        }
                        this._drawZenFlower(flowersTurtle, pd.x, topY, pd.radius, pd.height * 0.6, seededRandom, actualStyle, flowerDensity);
                    }
                }
                
                layers.push({
                    name: `Zen Pots (Flowers - ${flowerColorTheme.charAt(0).toUpperCase() + flowerColorTheme.slice(1)})`,
                    color: flowerPenColor,
                    paths: flowersTurtle.getPaths()
                });
            }
        }
        
        return { multiLayer: true, layers: layers };
    }
    
    /**
     * Draw flower/branch arrangements coming out of a pot
     */
    _drawZenFlower(turtle, centerX, topY, potRadius, maxHeight, rng, style, density) {
        const branchCount = Math.floor(3 + rng() * 5 * density);
        
        if (style === 'branches') {
            // Organic branches with berries - natural flowing curves
            for (let b = 0; b < branchCount; b++) {
                // Base position varies across pot opening
                const startX = centerX + (rng() - 0.5) * potRadius * 0.5;
                
                // Natural upward angle with slight lean
                const baseAngle = (70 + rng() * 40) * Math.PI / 180;
                const lean = rng() > 0.5 ? 1 : -1;
                const branchLength = maxHeight * (0.6 + rng() * 0.5);
                
                // Draw organic curved main branch
                const segments = 12;
                const points = [{ x: startX, y: topY }];
                turtle.jumpTo(startX, topY);
                
                // Create natural curve with bezier-like progression
                const curveStrength = (rng() - 0.3) * 8 * lean;
                
                for (let i = 1; i <= segments; i++) {
                    const t = i / segments;
                    // Natural S-curve with gravity effect
                    const curve = curveStrength * Math.sin(t * Math.PI * 0.8);
                    const droop = t * t * 2;  // Slight droop at the end
                    
                    const bx = startX + Math.sin(baseAngle) * branchLength * t * lean + curve;
                    const by = topY + Math.cos(baseAngle * 0.6) * branchLength * t - droop;
                    
                    turtle.moveTo(bx, by);
                    points.push({ x: bx, y: by });
                }
                
                // Add sub-branches with berries at natural intervals
                const subBranchCount = Math.floor(4 + rng() * 8 * density);
                for (let j = 0; j < subBranchCount; j++) {
                    // Position along main branch (more toward outer half)
                    const t = 0.25 + rng() * 0.7;
                    const idx = Math.floor(t * (points.length - 1));
                    if (idx < 1 || idx >= points.length) continue;
                    
                    const p = points[idx];
                    
                    // Sub-branch angles out from main branch
                    const subLean = rng() > 0.5 ? 1 : -1;
                    const subAngle = baseAngle * lean + subLean * (0.3 + rng() * 0.6);
                    const subLength = maxHeight * 0.06 * (0.6 + rng() * 0.8);
                    
                    // Draw curved sub-branch (twig)
                    turtle.jumpTo(p.x, p.y);
                    const midX = p.x + Math.sin(subAngle) * subLength * 0.5;
                    const midY = p.y + Math.cos(subAngle * 0.5) * subLength * 0.5;
                    turtle.moveTo(midX, midY);
                    
                    const endX = p.x + Math.sin(subAngle) * subLength;
                    const endY = p.y + Math.cos(subAngle * 0.4) * subLength;
                    turtle.moveTo(endX, endY);
                    
                    // Berry cluster at end of twig
                    const berryCount = 1 + Math.floor(rng() * 3);
                    for (let k = 0; k < berryCount; k++) {
                        const berryOffsetX = (rng() - 0.5) * 2.5;
                        const berryOffsetY = (rng() - 0.5) * 2.5;
                        const berryRadius = 1.2 + rng() * 1.8;
                        const bx = endX + berryOffsetX;
                        const by = endY + berryOffsetY;
                        // Draw berry as filled circle
                        turtle.drawCircle(bx, by, berryRadius, 10);
                        if (rng() > 0.5) {
                            turtle.drawCircle(bx, by, berryRadius * 0.5, 6);
                        }
                    }
                }
            }
        } else if (style === 'minimal') {
            // Elegant simple twigs with sparse leaves
            for (let b = 0; b < branchCount; b++) {
                const startX = centerX + (rng() - 0.5) * potRadius * 0.4;
                const lean = rng() > 0.5 ? 1 : -1;
                const angle = (75 + rng() * 30) * Math.PI / 180 * lean;
                const length = maxHeight * (0.4 + rng() * 0.5);
                
                // Curved main stem
                turtle.jumpTo(startX, topY);
                const curve = (rng() - 0.5) * 6;
                
                const segments = 6;
                const points = [];
                for (let i = 1; i <= segments; i++) {
                    const t = i / segments;
                    const cx = startX + Math.sin(angle) * length * t + curve * Math.sin(t * Math.PI);
                    const cy = topY + length * t * 0.8;
                    turtle.moveTo(cx, cy);
                    points.push({ x: cx, y: cy });
                }
                
                // Sparse leaf-like offshoots
                const leafCount = 2 + Math.floor(rng() * 4 * density);
                for (let k = 0; k < leafCount && k < points.length; k++) {
                    const p = points[k];
                    
                    // Simple leaf stroke
                    const leafAngle = angle + (k % 2 === 0 ? 1 : -1) * (0.4 + rng() * 0.4);
                    const leafLen = length * 0.08 * (0.5 + rng());
                    
                    turtle.jumpTo(p.x, p.y);
                    const lx = p.x + Math.sin(leafAngle) * leafLen;
                    const ly = p.y + Math.cos(leafAngle) * leafLen * 0.4;
                    turtle.moveTo(lx, ly);
                }
            }
        } else if (style === 'full') {
            // Full blooming flowers with organic stems
            for (let b = 0; b < branchCount; b++) {
                const startX = centerX + (rng() - 0.5) * potRadius * 0.4;
                const lean = rng() > 0.5 ? 1 : -1;
                const stemLength = maxHeight * (0.5 + rng() * 0.4);
                
                // Organic curved stem
                const curve = (rng() - 0.3) * 10 * lean;
                
                turtle.jumpTo(startX, topY);
                const segments = 8;
                for (let i = 1; i <= segments; i++) {
                    const t = i / segments;
                    const cx = startX + curve * Math.sin(t * Math.PI * 0.7);
                    const cy = topY + stemLength * t;
                    turtle.moveTo(cx, cy);
                }
                
                const endX = startX + curve * Math.sin(Math.PI * 0.7);
                const endY = topY + stemLength;
                
                // Flower head with layered petals
                const petalCount = 5 + Math.floor(rng() * 4);
                const outerRadius = 5 + rng() * 7;
                
                // Outer petals
                for (let p = 0; p < petalCount; p++) {
                    const petalAngle = (p / petalCount) * Math.PI * 2 + rng() * 0.2;
                    // Draw petal as two curves meeting at a point
                    const px = endX + Math.cos(petalAngle) * outerRadius;
                    const py = endY + Math.sin(petalAngle) * outerRadius * 0.7;
                    
                    // Petal shape - curved edges
                    turtle.jumpTo(endX, endY);
                    const ctrlAngle = petalAngle + 0.3;
                    const ctrlX = endX + Math.cos(ctrlAngle) * outerRadius * 0.6;
                    const ctrlY = endY + Math.sin(ctrlAngle) * outerRadius * 0.5;
                    turtle.moveTo(ctrlX, ctrlY);
                    turtle.moveTo(px, py);
                    
                    const ctrlAngle2 = petalAngle - 0.3;
                    const ctrlX2 = endX + Math.cos(ctrlAngle2) * outerRadius * 0.6;
                    const ctrlY2 = endY + Math.sin(ctrlAngle2) * outerRadius * 0.5;
                    turtle.moveTo(ctrlX2, ctrlY2);
                    turtle.moveTo(endX, endY);
                }
                
                // Inner details (stamens)
                const stamenCount = 3 + Math.floor(rng() * 4);
                for (let s = 0; s < stamenCount; s++) {
                    const sAngle = (s / stamenCount) * Math.PI * 2 + rng() * 0.5;
                    const sLen = outerRadius * 0.35 * (0.7 + rng() * 0.3);
                    const sx = endX + Math.cos(sAngle) * sLen;
                    const sy = endY + Math.sin(sAngle) * sLen * 0.6;
                    
                    turtle.jumpTo(endX, endY);
                    turtle.moveTo(sx, sy);
                    // Small dot at end
                    turtle.drawCircle(sx, sy, 0.8, 6);
                }
                
                // Center circle
                turtle.drawCircle(endX, endY, outerRadius * 0.2, 10);
            }
        }
    }
    
    /**
     * Draw a single zen pot with easing curves
     */
    _drawZenPot(turtle, centerX, baseY, maxRadius, height, rng, dotDensity, outlineOnly) {
        // Generate pot profile using random easing curves
        const segments = 30;
        const profile = [];
        
        // Random easing function selection
        const easeType = Math.floor(rng() * 5);
        const bulgePos = 0.2 + rng() * 0.5; // Where the widest part is
        const neckPos = 0.7 + rng() * 0.2;  // Where neck narrows
        const baseWidth = 0.3 + rng() * 0.4;
        const neckWidth = 0.2 + rng() * 0.3;
        const lipWidth = 0.3 + rng() * 0.4;
        const hasLip = rng() > 0.3;
        
        for (let i = 0; i <= segments; i++) {
            const t = i / segments;
            let radius;
            
            if (t < bulgePos) {
                // Base to bulge
                const localT = t / bulgePos;
                const eased = this._potEase(localT, easeType);
                radius = baseWidth + (1 - baseWidth) * eased;
            } else if (t < neckPos) {
                // Bulge to neck
                const localT = (t - bulgePos) / (neckPos - bulgePos);
                const eased = this._potEase(localT, (easeType + 1) % 5);
                radius = 1 - (1 - neckWidth) * eased;
            } else {
                // Neck to lip
                const localT = (t - neckPos) / (1 - neckPos);
                if (hasLip) {
                    radius = neckWidth + (lipWidth - neckWidth) * Math.sin(localT * Math.PI);
                } else {
                    radius = neckWidth + (lipWidth - neckWidth) * localT * 0.5;
                }
            }
            
            profile.push({
                y: baseY + t * height,
                radius: radius * maxRadius
            });
        }
        
        // Draw left side of pot
        turtle.jumpTo(centerX - profile[0].radius, profile[0].y);
        for (let i = 1; i < profile.length; i++) {
            turtle.moveTo(centerX - profile[i].radius, profile[i].y);
        }
        
        // Draw rim
        const topY = profile[profile.length - 1].y;
        const topRadius = profile[profile.length - 1].radius;
        turtle.moveTo(centerX + topRadius, topY);
        
        // Draw right side of pot (going down)
        for (let i = profile.length - 2; i >= 0; i--) {
            turtle.moveTo(centerX + profile[i].radius, profile[i].y);
        }
        
        // Close bottom
        turtle.moveTo(centerX - profile[0].radius, profile[0].y);
        
        // Add stipple dots for texture
        if (!outlineOnly) {
            const dotCount = height * maxRadius * dotDensity * 0.5;
            
            for (let d = 0; d < dotCount; d++) {
                const t = rng();
                const profileIdx = Math.floor(t * (profile.length - 1));
                const nextIdx = Math.min(profileIdx + 1, profile.length - 1);
                
                // Interpolate radius
                const localT = t * (profile.length - 1) - profileIdx;
                const r = profile[profileIdx].radius * (1 - localT) + profile[nextIdx].radius * localT;
                const y = profile[profileIdx].y * (1 - localT) + profile[nextIdx].y * localT;
                
                // Random position within pot at this height
                const angle = rng() * Math.PI; // Only front half
                const distFromCenter = rng() * r * 0.9;
                const dx = Math.cos(angle) * distFromCenter * (rng() > 0.5 ? 1 : -1);
                
                // Draw tiny mark
                turtle.jumpTo(centerX + dx - 0.2, y);
                turtle.moveTo(centerX + dx + 0.2, y);
            }
            
            // Add some horizontal texture lines
            const lineCount = Math.floor(3 + rng() * 5);
            for (let l = 0; l < lineCount; l++) {
                const t = 0.1 + rng() * 0.7;
                const profileIdx = Math.floor(t * (profile.length - 1));
                const r = profile[profileIdx].radius * 0.95;
                const y = profile[profileIdx].y;
                
                // Partial arc line
                const startAngle = rng() * 0.3;
                const endAngle = 0.7 + rng() * 0.3;
                
                turtle.jumpTo(centerX - r * (1 - startAngle * 2), y);
                turtle.moveTo(centerX + r * (endAngle * 2 - 1), y);
            }
        }
    }
    
    /**
     * Easing functions for pot profiles
     */
    _potEase(t, type) {
        switch (type) {
            case 0: // Ease in quad
                return t * t;
            case 1: // Ease out quad
                return 1 - (1 - t) * (1 - t);
            case 2: // Ease in out sine
                return -(Math.cos(Math.PI * t) - 1) / 2;
            case 3: // Ease out cubic
                return 1 - Math.pow(1 - t, 3);
            case 4: // Ease in out quad
                return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
            default:
                return t;
        }
    }
    
    // =========================================================================
    // BEZIER CURVES - Beautiful flowing bezier curves
    // =========================================================================
    
    _generate_bezier(options) {
        const turtle = new Turtle();
        
        const curveCount = options.curve_count || 10;
        const curveSpread = options.curve_spread || 20;
        const controlVariation = options.control_variation || 0.5;
        const curveStyle = options.curve_style || 'flowing';
        const segments = options.segments || 30;
        const seed = options.seed || 42;
        const showControlPoints = options.show_control_points || false;
        
        const workArea = this.getWorkArea();
        const margin = 20;
        
        const startX = workArea.left + margin;
        const endX = workArea.right - margin;
        const startY = workArea.bottom + margin;
        const endY = workArea.top - margin;
        const width = endX - startX;
        const height = endY - startY;
        const centerX = startX + width / 2;
        const centerY = startY + height / 2;
        
        // Seeded random
        let rngState = seed;
        const seededRandom = () => {
            rngState = (rngState * 1103515245 + 12345) & 0x7fffffff;
            return rngState / 0x7fffffff;
        };
        
        // Generate curves based on style
        for (let i = 0; i < curveCount; i++) {
            const t = i / Math.max(1, curveCount - 1);
            const offset = (i - curveCount / 2) * curveSpread;
            
            let p0, p1, p2, p3; // Start, Control1, Control2, End
            
            switch (curveStyle) {
                case 'flowing':
                    // Flowing curves from top-left to bottom-right
                    p0 = { x: startX + offset * 0.5, y: endY - Math.abs(offset) };
                    p1 = { 
                        x: startX + width * 0.3 + seededRandom() * width * 0.2 * controlVariation, 
                        y: startY + height * 0.2 + seededRandom() * height * 0.3 * controlVariation 
                    };
                    p2 = { 
                        x: startX + width * 0.6 + seededRandom() * width * 0.2 * controlVariation, 
                        y: endY - height * 0.2 - seededRandom() * height * 0.3 * controlVariation 
                    };
                    p3 = { x: endX - offset * 0.3, y: startY + height * 0.7 + offset * 0.02 };
                    break;
                    
                case 'random':
                    // Fully random bezier curves
                    p0 = { x: startX + seededRandom() * width, y: startY + seededRandom() * height };
                    p1 = { x: startX + seededRandom() * width, y: startY + seededRandom() * height };
                    p2 = { x: startX + seededRandom() * width, y: startY + seededRandom() * height };
                    p3 = { x: startX + seededRandom() * width, y: startY + seededRandom() * height };
                    break;
                    
                case 'parallel':
                    // Parallel curves from left to right
                    const yPos = startY + (i + 0.5) * height / curveCount;
                    const wave = Math.sin(t * Math.PI * 2) * height * 0.1 * controlVariation;
                    p0 = { x: startX, y: yPos };
                    p1 = { x: startX + width * 0.33, y: yPos + wave + (seededRandom() - 0.5) * curveSpread };
                    p2 = { x: startX + width * 0.67, y: yPos - wave + (seededRandom() - 0.5) * curveSpread };
                    p3 = { x: endX, y: yPos };
                    break;
                    
                case 'radial':
                    // Curves radiating from center
                    const angle = (i / curveCount) * Math.PI * 2;
                    const radius = Math.min(width, height) * 0.4;
                    p0 = { x: centerX, y: centerY };
                    p1 = { 
                        x: centerX + Math.cos(angle + 0.3) * radius * 0.4, 
                        y: centerY + Math.sin(angle + 0.3) * radius * 0.4 
                    };
                    p2 = { 
                        x: centerX + Math.cos(angle - 0.3) * radius * 0.7, 
                        y: centerY + Math.sin(angle - 0.3) * radius * 0.7 
                    };
                    p3 = { 
                        x: centerX + Math.cos(angle) * radius * (0.8 + seededRandom() * 0.4 * controlVariation), 
                        y: centerY + Math.sin(angle) * radius * (0.8 + seededRandom() * 0.4 * controlVariation) 
                    };
                    break;
                    
                case 'wave':
                    // Stacked wave curves
                    const baseY = startY + (i + 0.5) * height / curveCount;
                    const amplitude = height / curveCount * 0.8 * (0.5 + seededRandom() * controlVariation);
                    p0 = { x: startX, y: baseY };
                    p1 = { x: startX + width * 0.25, y: baseY + amplitude };
                    p2 = { x: startX + width * 0.75, y: baseY - amplitude };
                    p3 = { x: endX, y: baseY };
                    break;
                    
                default:
                    p0 = { x: startX, y: centerY + offset };
                    p1 = { x: centerX - width * 0.2, y: endY };
                    p2 = { x: centerX + width * 0.2, y: startY };
                    p3 = { x: endX, y: centerY - offset };
            }
            
            // Draw the bezier curve
            this._drawBezierCurve(turtle, p0, p1, p2, p3, segments);
            
            // Optionally show control points
            if (showControlPoints) {
                // Draw control point handles
                turtle.jumpTo(p0.x, p0.y);
                turtle.moveTo(p1.x, p1.y);
                turtle.jumpTo(p3.x, p3.y);
                turtle.moveTo(p2.x, p2.y);
                
                // Draw small circles at control points
                const cpRadius = 2;
                turtle.drawCircle(p0.x, p0.y, cpRadius, 8);
                turtle.drawCircle(p1.x, p1.y, cpRadius, 8);
                turtle.drawCircle(p2.x, p2.y, cpRadius, 8);
                turtle.drawCircle(p3.x, p3.y, cpRadius, 8);
            }
        }
        
        return turtle;
    }
    
    /**
     * Draw a cubic bezier curve using De Casteljau's algorithm
     */
    _drawBezierCurve(turtle, p0, p1, p2, p3, segments) {
        turtle.jumpTo(p0.x, p0.y);
        
        for (let i = 1; i <= segments; i++) {
            const t = i / segments;
            const point = this._bezierPoint(p0, p1, p2, p3, t);
            turtle.moveTo(point.x, point.y);
        }
    }
    
    /**
     * Calculate a point on a cubic bezier curve
     */
    _bezierPoint(p0, p1, p2, p3, t) {
        const t2 = t * t;
        const t3 = t2 * t;
        const mt = 1 - t;
        const mt2 = mt * mt;
        const mt3 = mt2 * mt;
        
        return {
            x: mt3 * p0.x + 3 * mt2 * t * p1.x + 3 * mt * t2 * p2.x + t3 * p3.x,
            y: mt3 * p0.y + 3 * mt2 * t * p1.y + 3 * mt * t2 * p2.y + t3 * p3.y
        };
    }
    
    // =========================================================================
    // PERLIN NOISE - Grid of shapes sized by noise values
    // =========================================================================
    
    _generate_noise(options) {
        const turtle = new Turtle();
        
        const gridGap = options.grid_spacing || 15;
        const xScale = options.noise_scale_x || 0.015;
        const yScale = options.noise_scale_y || 0.02;
        const offset = options.offset || 0;
        const minSizeRatio = options.min_size_ratio !== undefined ? options.min_size_ratio : 0.1;
        const shape = options.shape || 'circle';
        let seed = options.seed;
        if (seed === undefined || seed === -1) {
            seed = Math.floor(Math.random() * 999999);
        }
        const invert = options.invert_noise || false;
        
        const workArea = this.getWorkArea();
        const margin = gridGap;
        
        const startX = workArea.left + margin;
        const endX = workArea.right - margin;
        const startY = workArea.bottom + margin;
        const endY = workArea.top - margin;
        
        // Initialize Perlin noise with seed
        this._initNoise(seed);
        
        // Calculate size range
        const maxSize = gridGap * 0.9;
        const minSize = maxSize * minSizeRatio;
        const sizeRange = maxSize - minSize;
        
        // Loop through grid
        for (let x = startX + gridGap / 2; x < endX; x += gridGap) {
            for (let y = startY + gridGap / 2; y < endY; y += gridGap) {
                // Calculate noise value using scaled and offset coordinates
                let noiseValue = this._perlinNoise((x + offset) * xScale, (y + offset) * yScale);
                
                // Invert if requested
                if (invert) {
                    noiseValue = 1 - noiseValue;
                }
                
                // Map noise value to size range
                const size = minSize + noiseValue * sizeRange;
                
                if (size > 0.5) {
                    this._drawNoiseShape(turtle, x, y, size, shape);
                }
            }
        }
        
        return turtle;
    }
    
    /**
     * Draw a shape for the noise grid
     */
    _drawNoiseShape(turtle, x, y, size, shape) {
        const halfSize = size / 2;
        
        switch (shape) {
            case 'circle':
                turtle.drawCircle(x, y, halfSize, Math.max(8, Math.floor(size * 2)));
                break;
                
            case 'square':
                turtle.drawRect(x - halfSize, y - halfSize, size, size);
                break;
                
            case 'diamond':
                turtle.jumpTo(x, y - halfSize);
                turtle.moveTo(x + halfSize, y);
                turtle.moveTo(x, y + halfSize);
                turtle.moveTo(x - halfSize, y);
                turtle.moveTo(x, y - halfSize);
                break;
                
            case 'cross':
                // Horizontal line
                turtle.jumpTo(x - halfSize, y);
                turtle.moveTo(x + halfSize, y);
                // Vertical line
                turtle.jumpTo(x, y - halfSize);
                turtle.moveTo(x, y + halfSize);
                break;
                
            case 'line':
                // Vertical line with height based on size
                turtle.jumpTo(x, y - halfSize);
                turtle.moveTo(x, y + halfSize);
                break;
                
            default:
                turtle.drawCircle(x, y, halfSize, 16);
        }
    }
    
    // =========================================================================
    // KALEIDOSCOPE - Symmetrical patterns with rotational symmetry
    // =========================================================================
    
    _generate_kaleidoscope(options) {
        const turtle = new Turtle();
        
        const symmetry = options.symmetry || 6;
        const pattern = options.pattern || 'curves';
        const complexity = options.complexity || 8;
        const radiusPct = options.radius || 80;
        const innerRadiusPct = options.inner_radius || 10;
        const seed = options.seed || 42;
        const reflect = options.reflect !== false;
        
        const workArea = this.getWorkArea();
        const centerX = workArea.left + workArea.width / 2;
        const centerY = workArea.bottom + workArea.height / 2;
        const maxRadius = Math.min(workArea.width, workArea.height) / 2 * (radiusPct / 100);
        const minRadius = maxRadius * (innerRadiusPct / 100);
        
        const angleStep = (Math.PI * 2) / symmetry;
        
        // Seeded random
        let rngState = seed;
        const seededRandom = () => {
            rngState = (rngState * 1103515245 + 12345) & 0x7fffffff;
            return rngState / 0x7fffffff;
        };
        
        // Generate base pattern points (one wedge)
        const basePattern = this._generateKaleidoscopePattern(pattern, complexity, maxRadius, minRadius, angleStep, seededRandom);
        
        // Draw the pattern with symmetry
        for (let i = 0; i < symmetry; i++) {
            const rotation = i * angleStep;
            
            // Draw the pattern rotated
            this._drawRotatedPattern(turtle, basePattern, centerX, centerY, rotation);
            
            // Draw the reflected pattern if enabled
            if (reflect) {
                this._drawRotatedPattern(turtle, basePattern, centerX, centerY, rotation, true);
            }
        }
        
        return turtle;
    }
    
    /**
     * Generate base pattern for one kaleidoscope wedge
     */
    _generateKaleidoscopePattern(pattern, complexity, maxRadius, minRadius, wedgeAngle, rng) {
        const paths = [];
        
        switch (pattern) {
            case 'curves':
                // Bezier curves within the wedge
                for (let i = 0; i < complexity; i++) {
                    const r1 = minRadius + rng() * (maxRadius - minRadius);
                    const r2 = minRadius + rng() * (maxRadius - minRadius);
                    const a1 = rng() * wedgeAngle * 0.9;
                    const a2 = rng() * wedgeAngle * 0.9;
                    
                    const path = [];
                    const segments = 20;
                    for (let t = 0; t <= segments; t++) {
                        const tt = t / segments;
                        const r = r1 + (r2 - r1) * tt + Math.sin(tt * Math.PI) * (rng() - 0.5) * maxRadius * 0.3;
                        const a = a1 + (a2 - a1) * tt;
                        path.push({ x: Math.cos(a) * r, y: Math.sin(a) * r });
                    }
                    paths.push(path);
                }
                break;
                
            case 'lines':
                // Straight lines within the wedge
                for (let i = 0; i < complexity; i++) {
                    const r1 = minRadius + rng() * (maxRadius - minRadius);
                    const r2 = minRadius + rng() * (maxRadius - minRadius);
                    const a1 = rng() * wedgeAngle * 0.9;
                    const a2 = rng() * wedgeAngle * 0.9;
                    
                    paths.push([
                        { x: Math.cos(a1) * r1, y: Math.sin(a1) * r1 },
                        { x: Math.cos(a2) * r2, y: Math.sin(a2) * r2 }
                    ]);
                }
                break;
                
            case 'spirals':
                // Spiral arms
                for (let i = 0; i < Math.min(complexity, 5); i++) {
                    const path = [];
                    const startR = minRadius + rng() * (maxRadius - minRadius) * 0.3;
                    const turns = 0.5 + rng() * 1.5;
                    const segments = 30;
                    
                    for (let t = 0; t <= segments; t++) {
                        const tt = t / segments;
                        const r = startR + (maxRadius - startR) * tt;
                        const a = tt * turns * wedgeAngle;
                        path.push({ x: Math.cos(a) * r, y: Math.sin(a) * r });
                    }
                    paths.push(path);
                }
                break;
                
            case 'petals':
                // Petal/leaf shapes
                for (let i = 0; i < complexity; i++) {
                    const path = [];
                    const petalLength = minRadius + rng() * (maxRadius - minRadius) * 0.8;
                    const petalWidth = rng() * wedgeAngle * 0.4;
                    const baseAngle = rng() * wedgeAngle * 0.5;
                    const segments = 20;
                    
                    for (let t = 0; t <= segments; t++) {
                        const tt = t / segments;
                        const r = minRadius + petalLength * Math.sin(tt * Math.PI);
                        const a = baseAngle + (tt - 0.5) * petalWidth;
                        path.push({ x: Math.cos(a) * r, y: Math.sin(a) * r });
                    }
                    paths.push(path);
                }
                break;
                
            case 'geometric':
                // Geometric shapes (triangles, polygons)
                for (let i = 0; i < complexity; i++) {
                    const sides = 3 + Math.floor(rng() * 4);
                    const r = minRadius + rng() * (maxRadius - minRadius) * 0.6;
                    const centerA = rng() * wedgeAngle * 0.7;
                    const centerR = minRadius + rng() * (maxRadius - minRadius) * 0.5;
                    const cx = Math.cos(centerA) * centerR;
                    const cy = Math.sin(centerA) * centerR;
                    const shapeSize = r * 0.3;
                    
                    const path = [];
                    for (let s = 0; s <= sides; s++) {
                        const a = (s / sides) * Math.PI * 2 + rng() * 0.5;
                        path.push({
                            x: cx + Math.cos(a) * shapeSize,
                            y: cy + Math.sin(a) * shapeSize
                        });
                    }
                    paths.push(path);
                }
                break;
        }
        
        return paths;
    }
    
    /**
     * Draw a pattern rotated around center
     */
    _drawRotatedPattern(turtle, paths, cx, cy, rotation, reflect = false) {
        for (const path of paths) {
            if (path.length < 2) continue;
            
            let firstPoint = true;
            for (const point of path) {
                let x = point.x;
                let y = point.y;
                
                // Reflect if needed (flip Y)
                if (reflect) {
                    y = -y;
                }
                
                // Rotate
                const cos = Math.cos(rotation);
                const sin = Math.sin(rotation);
                const rx = x * cos - y * sin;
                const ry = x * sin + y * cos;
                
                // Translate to center
                const fx = cx + rx;
                const fy = cy + ry;
                
                if (firstPoint) {
                    turtle.jumpTo(fx, fy);
                    firstPoint = false;
                } else {
                    turtle.moveTo(fx, fy);
                }
            }
        }
    }
    
    // =========================================================================
    // COLORFUL DOTS - CMYK-style halftone with offset layers
    // =========================================================================
    
    _generate_colorfuldots(options) {
        const colorMode = options.color_mode || 'cmyk';
        const gridSpacing = options.grid_spacing || 15;
        const maxDotSize = options.max_dot_size || 12;
        const layerOffset = options.layer_offset || 4;
        const numCircles = options.num_circles || 30;
        const circleMin = options.circle_min || 30;
        const circleMax = options.circle_max || 80;
        let seed = options.seed;
        if (seed === undefined || seed === -1) {
            seed = Math.floor(Math.random() * 999999);
        }
        
        const workArea = this.getWorkArea();
        const margin = gridSpacing * 2;
        
        const startX = workArea.left + margin;
        const endX = workArea.right - margin;
        const startY = workArea.bottom + margin;
        const endY = workArea.top - margin;
        const width = endX - startX;
        const height = endY - startY;
        
        // Seeded random - generate circles once
        let rngState = seed;
        const seededRandom = () => {
            rngState = (rngState * 1103515245 + 12345) & 0x7fffffff;
            return rngState / 0x7fffffff;
        };
        
        // Color mode configurations
        const colorConfigs = {
            'cmyk': { count: 4, names: ['Cyan', 'Magenta', 'Yellow', 'Key'], colors: ['teal', 'pink', 'yellow', 'black'] },
            'rgb': { count: 3, names: ['Red', 'Green', 'Blue'], colors: ['red', 'green', 'blue'] },
            'primary': { count: 3, names: ['Red', 'Yellow', 'Blue'], colors: ['red', 'yellow', 'blue'] },
            'warm': { count: 3, names: ['Red', 'Orange', 'Yellow'], colors: ['red', 'orange', 'yellow'] },
            'cool': { count: 3, names: ['Blue', 'Teal', 'Purple'], colors: ['blue', 'teal', 'purple'] }
        };
        
        const config = colorConfigs[colorMode] || colorConfigs['cmyk'];
        const numLayers = config.count;
        
        // Generate source circles with random RGB colors
        const circles = [];
        const minR = Math.min(width, height) * (circleMin / 100);
        const maxR = Math.min(width, height) * (circleMax / 100);
        
        for (let i = 0; i < numCircles; i++) {
            circles.push({
                x: startX + seededRandom() * width,
                y: startY + seededRandom() * height,
                r: minR + seededRandom() * (maxR - minR),
                color: {
                    r: Math.floor(seededRandom() * 255),
                    g: Math.floor(seededRandom() * 255),
                    b: Math.floor(seededRandom() * 255)
                }
            });
        }
        
        // Generate all layers
        const layers = [];
        
        for (let layerIdx = 0; layerIdx < numLayers; layerIdx++) {
            const turtle = new Turtle();
            
            // Calculate offset for this layer
            const layerAngle = (layerIdx / numLayers) * 2 * Math.PI + Math.PI / 6;
            const ox = Math.cos(layerAngle) * layerOffset;
            const oy = Math.sin(layerAngle) * layerOffset;
            
            // Process grid points
            for (let y = startY + gridSpacing / 2; y < endY; y += gridSpacing) {
                for (let x = startX + gridSpacing / 2; x < endX; x += gridSpacing) {
                    // Sample color at this point
                    const rgb = this._sampleColorAtPoint(x, y, circles, seededRandom);
                    
                    // Convert RGB to CMYK
                    const cmyk = this._rgbToCmyk(rgb.r, rgb.g, rgb.b);
                    
                    let intensity;
                    if (colorMode === 'cmyk') {
                        const channels = [cmyk.c, cmyk.m, cmyk.y, cmyk.k];
                        intensity = channels[layerIdx];
                    } else if (colorMode === 'rgb') {
                        intensity = [rgb.r / 255, rgb.g / 255, rgb.b / 255][layerIdx];
                    } else if (colorMode === 'primary') {
                        const rInt = rgb.r / 255;
                        const yInt = Math.min(rgb.r, rgb.g) / 255;
                        const bInt = rgb.b / 255;
                        intensity = [rInt, yInt, bInt][layerIdx];
                    } else if (colorMode === 'warm') {
                        intensity = [rgb.r / 255, (rgb.r * 0.5 + rgb.g * 0.5) / 255, rgb.g / 255][layerIdx];
                    } else if (colorMode === 'cool') {
                        intensity = [rgb.b / 255, (rgb.g * 0.5 + rgb.b * 0.5) / 255, (rgb.r * 0.3 + rgb.b * 0.7) / 255][layerIdx];
                    } else {
                        intensity = cmyk.c;
                    }
                    
                    const dotSize = intensity * maxDotSize;
                    if (dotSize > 0.8) {
                        turtle.drawCircle(x + ox, y + oy, dotSize / 2, Math.max(6, Math.floor(dotSize)));
                    }
                }
            }
            
            const paths = turtle.getPaths();
            if (paths.length > 0) {
                layers.push({
                    name: `Colorful Dots (${config.names[layerIdx]})`,
                    color: config.colors[layerIdx],
                    paths: paths
                });
            }
        }
        
        return { multiLayer: true, layers: layers };
    }
    
    /**
     * Sample color at a point from overlapping circles
     */
    _sampleColorAtPoint(x, y, circles, rng) {
        let r = 255, g = 255, b = 255; // White background (no CMYK)
        
        for (const circle of circles) {
            const dist = Math.sqrt((x - circle.x) ** 2 + (y - circle.y) ** 2);
            if (dist < circle.r) {
                // Smooth blend based on distance - stronger near center
                const t = 1 - (dist / circle.r);
                const blend = t * t; // Quadratic falloff for smoother edges
                r = r * (1 - blend) + circle.color.r * blend;
                g = g * (1 - blend) + circle.color.g * blend;
                b = b * (1 - blend) + circle.color.b * blend;
            }
        }
        
        return { r, g, b };
    }
    
    /**
     * Convert RGB to CMYK
     */
    _rgbToCmyk(r, g, b) {
        const r1 = r / 255;
        const g1 = g / 255;
        const b1 = b / 255;
        
        const k = Math.min(1 - r1, 1 - g1, 1 - b1);
        
        if (k === 1) {
            return { c: 0, m: 0, y: 0, k: 1 };
        }
        
        const c = (1 - r1 - k) / (1 - k);
        const m = (1 - g1 - k) / (1 - k);
        const y = (1 - b1 - k) / (1 - k);
        
        return { c, m, y, k };
    }
    
    // =========================================================================
    // INTERLOCKINGS - Overlapping line patterns for moiré effects
    // Inspired by Arden Schager's rotating polygon line patterns
    // =========================================================================
    
    _generate_interlockings(options) {
        /**
         * Generate rotating parallel line layers that create moiré interference patterns.
         * Based on p5.js Interlockings by Arden Schager.
         * Returns multi-layer output with cycling colors.
         */
        const numLayers = options.num_layers || 6;
        const linesPerLayer = options.lines_per_layer || 30;
        const lineSpacing = options.line_spacing || 5;
        const centerOffsetPct = options.center_offset || 10;
        let seed = options.seed;
        if (seed === undefined || seed === -1) {
            seed = Math.floor(Math.random() * 999999);
        }
        
        // Color scheme cycling through rainbow
        const layerColors = ['red', 'orange', 'yellow', 'green', 'blue', 'purple', 'pink', 'teal'];
        
        const workArea = this.getWorkArea();
        const width = workArea.width;
        const height = workArea.height;
        const centerX = workArea.left + width / 2;
        const centerY = workArea.bottom + height / 2;
        const diagonal = Math.sqrt(width * width + height * height);
        
        // Center offset radius (each layer's center rotates around the main center)
        const centerOffsetRadius = Math.min(width, height) * (centerOffsetPct / 100);
        
        const layers = [];
        
        // Each layer gets an evenly distributed angle
        for (let layerIdx = 0; layerIdx < numLayers; layerIdx++) {
            const turtle = new Turtle();
            
            // Calculate layer angle - distribute evenly across 180 degrees
            const layerAngle = (layerIdx / numLayers) * Math.PI;
            
            // Calculate layer center offset (rotates in a circle)
            const t = layerIdx / numLayers;
            const offsetX = centerOffsetRadius * Math.cos(t * 2 * Math.PI);
            const offsetY = centerOffsetRadius * Math.sin(t * 2 * Math.PI);
            const layerCenterX = centerX + offsetX;
            const layerCenterY = centerY + offsetY;
            
            // Direction vectors for this angle
            const cosA = Math.cos(layerAngle);
            const sinA = Math.sin(layerAngle);
            
            // Perpendicular direction (for spacing lines)
            const perpX = -sinA;
            const perpY = cosA;
            
            // Calculate total span of lines
            const totalSpan = linesPerLayer * lineSpacing;
            const startOffset = -totalSpan / 2;
            
            for (let lineIdx = 0; lineIdx < linesPerLayer; lineIdx++) {
                // Perpendicular offset for this line
                const perpOffset = startOffset + lineIdx * lineSpacing;
                
                // Calculate line center
                const lineCenterX = layerCenterX + perpX * perpOffset;
                const lineCenterY = layerCenterY + perpY * perpOffset;
                
                // Extend line in both directions along the angle
                const halfLen = diagonal * 0.7;
                const x1 = lineCenterX - cosA * halfLen;
                const y1 = lineCenterY - sinA * halfLen;
                const x2 = lineCenterX + cosA * halfLen;
                const y2 = lineCenterY + sinA * halfLen;
                
                // Clip to work area
                const clipped = this._clipLineToWorkArea(x1, y1, x2, y2, workArea);
                if (!clipped) continue;
                
                turtle.jumpTo(clipped.x1, clipped.y1);
                turtle.moveTo(clipped.x2, clipped.y2);
            }
            
            const paths = turtle.getPaths();
            if (paths.length > 0) {
                const colorIdx = layerIdx % layerColors.length;
                layers.push({
                    name: `Interlockings (Layer ${layerIdx + 1} - ${layerColors[colorIdx].charAt(0).toUpperCase() + layerColors[colorIdx].slice(1)})`,
                    color: layerColors[colorIdx],
                    paths: paths
                });
            }
        }
        
        return { multiLayer: true, layers: layers };
    }
    
    /**
     * Clip a line to the work area
     */
    _clipLineToWorkArea(x1, y1, x2, y2, workArea) {
        // Cohen-Sutherland line clipping
        const INSIDE = 0, LEFT = 1, RIGHT = 2, BOTTOM = 4, TOP = 8;
        
        const computeCode = (x, y) => {
            let code = INSIDE;
            if (x < workArea.left) code |= LEFT;
            else if (x > workArea.right) code |= RIGHT;
            if (y < workArea.bottom) code |= BOTTOM;
            else if (y > workArea.top) code |= TOP;
            return code;
        };
        
        let code1 = computeCode(x1, y1);
        let code2 = computeCode(x2, y2);
        
        while (true) {
            if (!(code1 | code2)) {
                return { x1, y1, x2, y2 };
            } else if (code1 & code2) {
                return null;
            } else {
                const codeOut = code1 ? code1 : code2;
                let x, y;
                
                if (codeOut & TOP) {
                    x = x1 + (x2 - x1) * (workArea.top - y1) / (y2 - y1);
                    y = workArea.top;
                } else if (codeOut & BOTTOM) {
                    x = x1 + (x2 - x1) * (workArea.bottom - y1) / (y2 - y1);
                    y = workArea.bottom;
                } else if (codeOut & RIGHT) {
                    y = y1 + (y2 - y1) * (workArea.right - x1) / (x2 - x1);
                    x = workArea.right;
                } else {
                    y = y1 + (y2 - y1) * (workArea.left - x1) / (x2 - x1);
                    x = workArea.left;
                }
                
                if (codeOut === code1) {
                    x1 = x; y1 = y;
                    code1 = computeCode(x1, y1);
                } else {
                    x2 = x; y2 = y;
                    code2 = computeCode(x2, y2);
                }
            }
        }
    }
    
    /**
     * Draw a wavy line
     */
    _drawWavyLine(turtle, x1, y1, x2, y2, amplitude, wavelength, rng) {
        const dx = x2 - x1;
        const dy = y2 - y1;
        const len = Math.sqrt(dx * dx + dy * dy);
        const segments = Math.max(10, Math.floor(len / 2));
        
        // Perpendicular direction
        const perpX = -dy / len;
        const perpY = dx / len;
        
        const phase = rng() * Math.PI * 2;
        
        for (let i = 0; i <= segments; i++) {
            const t = i / segments;
            const baseX = x1 + dx * t;
            const baseY = y1 + dy * t;
            
            // Wave offset
            const wave = Math.sin(t * len / wavelength * Math.PI * 2 + phase) * amplitude;
            const px = baseX + perpX * wave;
            const py = baseY + perpY * wave;
            
            if (i === 0) {
                turtle.jumpTo(px, py);
            } else {
                turtle.moveTo(px, py);
            }
        }
    }
    
    /**
     * Draw a dashed line
     */
    _drawDashedLine(turtle, x1, y1, x2, y2, dashLength, gapLength) {
        const dx = x2 - x1;
        const dy = y2 - y1;
        const len = Math.sqrt(dx * dx + dy * dy);
        const unitX = dx / len;
        const unitY = dy / len;
        
        let pos = 0;
        let drawing = true;
        
        while (pos < len) {
            const segLen = drawing ? dashLength : gapLength;
            const endPos = Math.min(pos + segLen, len);
            
            if (drawing) {
                const startX = x1 + unitX * pos;
                const startY = y1 + unitY * pos;
                const endX = x1 + unitX * endPos;
                const endY = y1 + unitY * endPos;
                
                turtle.jumpTo(startX, startY);
                turtle.moveTo(endX, endY);
            }
            
            pos = endPos;
            drawing = !drawing;
        }
    }
    
    // =========================================================================
    // SUDOKU CARTOGRAPHY - Visualize solver algorithm path
    // Based on graph theory visualization by xladn0
    // =========================================================================
    
    _generate_sudokucartography(options) {
        const turtle = new Turtle();
        
        const initialCells = options.initial_cells || 17;
        const curveTension = options.curve_tension || 50;
        const drawGrid = options.draw_grid || false;
        const drawPath = options.draw_path || false;
        const seed = options.seed || 42;
        const maxChecks = options.max_checks || 500;
        
        const workArea = this.getWorkArea();
        const margin = 20;
        const size = Math.min(workArea.width, workArea.height) - 2 * margin;
        const startX = workArea.left + (workArea.width - size) / 2;
        const startY = workArea.bottom + (workArea.height - size) / 2;
        const cellSize = size / 9;
        
        // Seeded random
        let rngState = seed;
        const seededRandom = () => {
            rngState = (rngState * 1103515245 + 12345) & 0x7fffffff;
            return rngState / 0x7fffffff;
        };
        
        // Generate Sudoku grid
        const grid = Array.from({ length: 9 }, () => Array(9).fill(0));
        const checkedCells = [];
        const solutionPath = [];
        
        // Place initial clues
        let placed = 0;
        let attempts = 0;
        while (placed < initialCells && attempts < 1000) {
            const row = Math.floor(seededRandom() * 9);
            const col = Math.floor(seededRandom() * 9);
            const num = Math.floor(seededRandom() * 9) + 1;
            
            if (grid[row][col] === 0 && this._sudokuIsSafe(grid, row, col, num)) {
                grid[row][col] = num;
                placed++;
            }
            attempts++;
        }
        
        // Solve and track checked cells
        this._sudokuSolve(grid, checkedCells, solutionPath);
        
        // Draw grid if requested
        if (drawGrid) {
            for (let i = 0; i <= 9; i++) {
                const lineX = startX + i * cellSize;
                const lineY = startY + i * cellSize;
                
                // Vertical line
                turtle.jumpTo(lineX, startY);
                turtle.moveTo(lineX, startY + size);
                
                // Horizontal line
                turtle.jumpTo(startX, lineY);
                turtle.moveTo(startX + size, lineY);
            }
        }
        
        // Draw solution path if requested
        if (drawPath && solutionPath.length > 1) {
            const firstCell = solutionPath[0];
            turtle.jumpTo(
                startX + (firstCell[1] + 0.5) * cellSize,
                startY + (firstCell[0] + 0.5) * cellSize
            );
            for (let i = 1; i < solutionPath.length; i++) {
                const cell = solutionPath[i];
                turtle.moveTo(
                    startX + (cell[1] + 0.5) * cellSize,
                    startY + (cell[0] + 0.5) * cellSize
                );
            }
        }
        
        // Draw checked cells as bezier curves (main visualization)
        const limitedChecks = checkedCells.slice(0, maxChecks);
        
        for (let i = 1; i < limitedChecks.length; i++) {
            const [prevRow, prevCol] = limitedChecks[i - 1];
            const [row, col] = limitedChecks[i];
            
            const x1 = startX + (prevCol + 0.5) * cellSize;
            const y1 = startY + (prevRow + 0.5) * cellSize;
            const x2 = startX + (col + 0.5) * cellSize;
            const y2 = startY + (row + 0.5) * cellSize;
            
            // Draw bezier curve
            this._drawBezierCurve(turtle, 
                { x: x1, y: y1 },
                { x: x1 + curveTension, y: y1 },
                { x: x2 - curveTension, y: y2 },
                { x: x2, y: y2 },
                20
            );
        }
        
        return turtle;
    }
    
    /**
     * Check if placing num at grid[row][col] is safe
     */
    _sudokuIsSafe(grid, row, col, num) {
        // Check row
        for (let j = 0; j < 9; j++) {
            if (grid[row][j] === num) return false;
        }
        
        // Check column
        for (let i = 0; i < 9; i++) {
            if (grid[i][col] === num) return false;
        }
        
        // Check 3x3 subgrid
        const startRow = row - (row % 3);
        const startCol = col - (col % 3);
        for (let i = 0; i < 3; i++) {
            for (let j = 0; j < 3; j++) {
                if (grid[startRow + i][startCol + j] === num) return false;
            }
        }
        
        return true;
    }
    
    /**
     * Solve Sudoku using backtracking, tracking checked cells
     */
    _sudokuSolve(grid, checkedCells, solutionPath) {
        // Find empty cell
        let emptyCell = null;
        for (let i = 0; i < 9 && !emptyCell; i++) {
            for (let j = 0; j < 9 && !emptyCell; j++) {
                if (grid[i][j] === 0) {
                    emptyCell = [i, j];
                }
            }
        }
        
        if (!emptyCell) return true; // Solved
        
        const [row, col] = emptyCell;
        solutionPath.push([row, col]);
        
        for (let num = 1; num <= 9; num++) {
            // Track row check
            checkedCells.push([row, num - 1]);
            
            // Track column check
            checkedCells.push([num - 1, col]);
            
            // Track subgrid check
            const startRow = row - (row % 3);
            const startCol = col - (col % 3);
            checkedCells.push([startRow + Math.floor((num - 1) / 3), startCol + ((num - 1) % 3)]);
            
            if (this._sudokuIsSafe(grid, row, col, num)) {
                grid[row][col] = num;
                
                if (this._sudokuSolve(grid, checkedCells, solutionPath)) {
                    return true;
                }
                
                grid[row][col] = 0; // Backtrack
            }
        }
        
        solutionPath.pop();
        return false;
    }
    
    // =========================================================================
    // GEODATA WEAVING - Weaving patterns from geographic coordinates
    // Based on the concept by the p5.js weaving community
    // =========================================================================
    
    _generate_geodataweaving(options) {
        const turtle = new Turtle();
        
        const latitude = options.latitude || 37.7749;  // San Francisco default
        const longitude = options.longitude || -122.4194;
        const nbThreads = options.threads || 64;
        const nbShafts = options.shafts || 4;
        const patternRows = options.pattern_rows || 64;
        const cellSize = options.cell_size || 3;
        const drawThreading = options.draw_threading !== false;
        const drawTreadling = options.draw_treadling !== false;
        const drawTieup = options.draw_tieup !== false;
        const drawDrawdown = options.draw_drawdown !== false;
        
        // Convert coordinates to weaving pattern
        const fixedLat = this._mapRange(latitude, -90, 90, 0, 180);
        const fixedLong = this._mapRange(longitude, -180, 180, 0, 360);
        
        // Remove decimals and get large integers
        const latInt = Math.round(fixedLat * 10000000);
        const longInt = Math.round(fixedLong * 10000000);
        
        // Convert to base N (number of shafts)
        const latBaseN = this._toBaseN(latInt, nbShafts);
        const longBaseN = this._toBaseN(longInt, nbShafts);
        
        // Create mirrored sequences for symmetry
        const latMirror = [...latBaseN, ...[...latBaseN].reverse()];
        const longMirror = [...longBaseN, ...[...longBaseN].reverse()];
        
        // Generate threading pattern (which shaft each thread goes through)
        const threading = [];
        for (let i = 0; i < nbThreads; i++) {
            threading[i] = latMirror[i % latMirror.length];
        }
        
        // Generate treadling pattern (which treadle for each row)
        const treadling = [];
        for (let i = 0; i < patternRows; i++) {
            treadling[i] = longMirror[i % longMirror.length];
        }
        
        // Create straight tie-up (diagonal)
        const tieup = [];
        for (let i = 0; i < nbShafts; i++) {
            tieup[i] = [];
            for (let j = 0; j < nbShafts; j++) {
                tieup[i][j] = (i === j);
            }
        }
        
        // Calculate drawdown
        const drawdown = [];
        for (let row = 0; row < patternRows; row++) {
            drawdown[row] = [];
            const treadle = treadling[row];
            for (let col = 0; col < nbThreads; col++) {
                const shaft = threading[col];
                // Check if this combination produces a mark
                drawdown[row][col] = tieup[treadle] && tieup[treadle][shaft];
            }
        }
        
        // Layout dimensions
        const gutterSize = cellSize;
        const threadingHeight = nbShafts * cellSize;
        const tieupWidth = nbShafts * cellSize;
        const drawdownWidth = nbThreads * cellSize;
        const drawdownHeight = patternRows * cellSize;
        
        // Calculate total width and height
        const totalWidth = drawdownWidth + gutterSize + tieupWidth;
        const totalHeight = threadingHeight + gutterSize + drawdownHeight;
        
        // Center offset
        const offsetX = -totalWidth / 2;
        const offsetY = -totalHeight / 2;
        
        // Draw Threading (top section, above drawdown)
        if (drawThreading) {
            const threadingY = offsetY + totalHeight - threadingHeight;
            for (let col = 0; col < nbThreads; col++) {
                const shaft = threading[col];
                const x = offsetX + col * cellSize;
                const y = threadingY + (nbShafts - 1 - shaft) * cellSize;
                this._drawWeavingCell(turtle, x, y, cellSize);
            }
            // Draw grid outline
            turtle.drawRect(offsetX, threadingY, drawdownWidth, threadingHeight);
        }
        
        // Draw Tie-up (top-right corner)
        if (drawTieup) {
            const tieupX = offsetX + drawdownWidth + gutterSize;
            const tieupY = offsetY + totalHeight - threadingHeight;
            for (let i = 0; i < nbShafts; i++) {
                for (let j = 0; j < nbShafts; j++) {
                    if (tieup[i][j]) {
                        const x = tieupX + i * cellSize;
                        const y = tieupY + (nbShafts - 1 - j) * cellSize;
                        this._drawWeavingCell(turtle, x, y, cellSize);
                    }
                }
            }
            // Draw grid outline
            turtle.drawRect(tieupX, tieupY, tieupWidth, threadingHeight);
        }
        
        // Draw Treadling (right section, beside drawdown)
        if (drawTreadling) {
            const treadlingX = offsetX + drawdownWidth + gutterSize;
            const treadlingY = offsetY;
            for (let row = 0; row < patternRows; row++) {
                const treadle = treadling[row];
                const x = treadlingX + treadle * cellSize;
                const y = treadlingY + (patternRows - 1 - row) * cellSize;
                this._drawWeavingCell(turtle, x, y, cellSize);
            }
            // Draw grid outline
            turtle.drawRect(treadlingX, treadlingY, tieupWidth, drawdownHeight);
        }
        
        // Draw Drawdown (main pattern)
        if (drawDrawdown) {
            for (let row = 0; row < patternRows; row++) {
                for (let col = 0; col < nbThreads; col++) {
                    if (drawdown[row][col]) {
                        const x = offsetX + col * cellSize;
                        const y = offsetY + (patternRows - 1 - row) * cellSize;
                        this._drawWeavingCell(turtle, x, y, cellSize);
                    }
                }
            }
            // Draw grid outline
            turtle.drawRect(offsetX, offsetY, drawdownWidth, drawdownHeight);
        }
        
        return turtle;
    }
    
    _drawWeavingCell(turtle, x, y, size) {
        // Fill cell with diagonal hatching for visibility
        const spacing = size / 3;
        for (let i = 0; i <= 2; i++) {
            const offset = i * spacing;
            turtle.drawLine(x + offset, y, x + size, y + size - offset);
            if (i > 0) {
                turtle.drawLine(x, y + offset, x + size - offset, y + size);
            }
        }
    }
    
    _mapRange(value, inMin, inMax, outMin, outMax) {
        return (value - inMin) * (outMax - outMin) / (inMax - inMin) + outMin;
    }
    
    _toBaseN(number, base) {
        if (number === 0) return [0];
        const digits = [];
        let n = Math.abs(number);
        while (n > 0) {
            digits.unshift(n % base);
            n = Math.floor(n / base);
        }
        return digits;
    }
    
    // =========================================================================
    // SLIME MOLD (Physarum) SIMULATION
    // Based on Jeff Jones' algorithm for Physarum transport networks
    // =========================================================================
    
    _generate_slimemold(options) {
        const turtle = new Turtle();
        
        const numAgents = options.agents || 2000;
        const iterations = options.iterations || 200;
        const sensorAngle = (options.sensor_angle || 45) * Math.PI / 180;
        const sensorDistance = options.sensor_distance || 9;
        const turnAngle = (options.turn_angle || 45) * Math.PI / 180;
        const stepSize = options.step_size || 1;
        const decay = options.decay || 0.9;
        const deposit = options.deposit || 5;
        const drawTrails = options.draw_trails !== false;
        const drawAgents = options.draw_agents || false;
        
        const workArea = this.getWorkArea();
        const margin = 30;
        const width = Math.floor((workArea.width - 2 * margin) / 2);
        const height = Math.floor((workArea.height - 2 * margin) / 2);
        
        // Trail map - stores pheromone concentration
        const trailMap = new Float32Array(width * height);
        
        // Agents with position, heading, and path history
        class Mold {
            constructor(x, y) {
                this.x = x;
                this.y = y;
                this.heading = Math.random() * Math.PI * 2;
                this.path = [[x, y]];
            }
            
            sense(offsetAngle) {
                const angle = this.heading + offsetAngle;
                const sx = Math.round(this.x + Math.cos(angle) * sensorDistance);
                const sy = Math.round(this.y + Math.sin(angle) * sensorDistance);
                
                if (sx >= 0 && sx < width && sy >= 0 && sy < height) {
                    return trailMap[sy * width + sx];
                }
                return 0;
            }
            
            update() {
                // Sense in three directions
                const front = this.sense(0);
                const left = this.sense(sensorAngle);
                const right = this.sense(-sensorAngle);
                
                // Turn based on sensor readings
                if (front > left && front > right) {
                    // Continue forward
                } else if (front < left && front < right) {
                    // Random turn
                    this.heading += (Math.random() < 0.5 ? 1 : -1) * turnAngle;
                } else if (left < right) {
                    // Turn right
                    this.heading -= turnAngle;
                } else if (right < left) {
                    // Turn left
                    this.heading += turnAngle;
                }
                
                // Move forward
                const newX = this.x + Math.cos(this.heading) * stepSize;
                const newY = this.y + Math.sin(this.heading) * stepSize;
                
                // Wrap around boundaries
                this.x = ((newX % width) + width) % width;
                this.y = ((newY % height) + height) % height;
                
                // Record path
                this.path.push([this.x, this.y]);
                
                // Deposit pheromone
                const ix = Math.floor(this.x);
                const iy = Math.floor(this.y);
                if (ix >= 0 && ix < width && iy >= 0 && iy < height) {
                    trailMap[iy * width + ix] += deposit;
                }
            }
        }
        
        // Initialize agents in center with some randomness
        const agents = [];
        const centerX = width / 2;
        const centerY = height / 2;
        const spawnRadius = Math.min(width, height) / 4;
        
        for (let i = 0; i < numAgents; i++) {
            const angle = Math.random() * Math.PI * 2;
            const radius = Math.random() * spawnRadius;
            const x = centerX + Math.cos(angle) * radius;
            const y = centerY + Math.sin(angle) * radius;
            agents.push(new Mold(x, y));
        }
        
        // Run simulation
        for (let step = 0; step < iterations; step++) {
            // Update all agents
            for (const agent of agents) {
                agent.update();
            }
            
            // Decay and diffuse trail map
            for (let i = 0; i < trailMap.length; i++) {
                trailMap[i] *= decay;
            }
            
            // Simple blur for diffusion (every 10 steps to save computation)
            if (step % 10 === 0) {
                const temp = new Float32Array(trailMap.length);
                for (let y = 1; y < height - 1; y++) {
                    for (let x = 1; x < width - 1; x++) {
                        const idx = y * width + x;
                        temp[idx] = (
                            trailMap[idx] * 0.5 +
                            trailMap[idx - 1] * 0.125 +
                            trailMap[idx + 1] * 0.125 +
                            trailMap[idx - width] * 0.125 +
                            trailMap[idx + width] * 0.125
                        );
                    }
                }
                for (let i = 0; i < trailMap.length; i++) {
                    if (temp[i] > 0) trailMap[i] = temp[i];
                }
            }
        }
        
        // Convert trail map to paths using marching squares for contours
        if (drawTrails) {
            const threshold = 2; // Minimum trail intensity to draw
            const contourLevels = [5, 15, 30, 50]; // Multiple contour levels
            
            for (const level of contourLevels) {
                this._traceContours(turtle, trailMap, width, height, level, workArea, margin);
            }
        }
        
        // Draw agent paths (subsampled for performance)
        if (drawAgents) {
            const sampleRate = Math.max(1, Math.floor(numAgents / 200)); // Draw ~200 agent paths
            
            for (let i = 0; i < agents.length; i += sampleRate) {
                const agent = agents[i];
                if (agent.path.length > 2) {
                    const offsetX = workArea.left + margin;
                    const offsetY = workArea.bottom + margin;
                    
                    // Subsample path points
                    const pathSample = Math.max(1, Math.floor(agent.path.length / 50));
                    
                    for (let j = 0; j < agent.path.length; j += pathSample) {
                        const [x, y] = agent.path[j];
                        const px = offsetX + x * 2;
                        const py = offsetY + y * 2;
                        
                        if (j === 0) {
                            turtle.jumpTo(px, py);
                        } else {
                            turtle.moveTo(px, py);
                        }
                    }
                }
            }
        }
        
        return turtle;
    }
    
    /**
     * Trace contour lines using a simplified marching squares approach
     */
    _traceContours(turtle, map, width, height, level, workArea, margin) {
        const offsetX = workArea.left + margin;
        const offsetY = workArea.bottom + margin;
        const visited = new Set();
        
        // Sample the map at regular intervals to find contour starting points
        const gridStep = 4;
        
        for (let y = 0; y < height - 1; y += gridStep) {
            for (let x = 0; x < width - 1; x += gridStep) {
                const idx = y * width + x;
                const key = `${x},${y}`;
                
                if (visited.has(key)) continue;
                
                // Check if this cell crosses the threshold
                const val = map[idx];
                const valRight = x + 1 < width ? map[idx + 1] : 0;
                const valDown = y + 1 < height ? map[idx + width] : 0;
                
                const above = val >= level;
                const rightAbove = valRight >= level;
                const downAbove = valDown >= level;
                
                // If there's a transition, trace a short line segment
                if (above !== rightAbove || above !== downAbove) {
                    visited.add(key);
                    
                    // Draw a small line segment at this location
                    const px = offsetX + x * 2;
                    const py = offsetY + y * 2;
                    
                    // Determine line direction based on gradient
                    const gradX = valRight - val;
                    const gradY = valDown - val;
                    const gradMag = Math.sqrt(gradX * gradX + gradY * gradY) + 0.001;
                    
                    // Draw perpendicular to gradient (along contour)
                    const perpX = -gradY / gradMag * 3;
                    const perpY = gradX / gradMag * 3;
                    
                    turtle.drawLine(px - perpX, py - perpY, px + perpX, py + perpY);
                }
            }
        }
    }
    
    // =========================================================================
    // SONAKINATOGRAPHY SYSTEM - Channa Horwitz (1968-2013)
    // =========================================================================
    
    /**
     * Sonakinatography generator
     * Implements Channa Horwitz's rule-based notation system
     * Returns multi-layer output with each entity (1-8) as a separate color layer
     */
    _generate_sonakinatography(options) {
        const algorithm = options.algorithm || 'sequential_progression';
        const cellSize = options.grid_cell_size || 15;
        const gridHeight = options.grid_height || 50;
        const drawingMode = options.drawing_mode || 'hatching';
        const drawGrid = options.draw_grid || false;
        const startingEntity = options.starting_entity || 1;
        const rotationCount = options.rotation_count || 8;
        const voices = options.voices || 3;
        const offsetBeats = options.offset_beats || 8;
        const entity1 = options.entity_1 || 3;
        const entity2 = options.entity_2 || 7;
        const fadeSteps = options.fade_steps || 4;
        const combinationSize = options.combination_size || 3;
        const numSlices = options.num_slices || 6;
        const hatchDensity = options.hatch_density || 1.0;
        const sourceText = options.source_text || '';
        const numInstruments = options.num_instruments || 4;
        const blendGridSize = options.blend_grid_size || 8;
        const diagonalWidth = options.diagonal_width || 40;
        const numDurationRows = options.num_duration_rows || 4;
        
        // Convert source text to sequence if provided
        const textSequence = sourceText.trim() ? this._textToSequence(sourceText) : null;
        
        const gridWidth = 8; // Fixed by Sonakinatography system
        const palette = options.palette || 'rainbow';
        
        // Define color palettes (using only available pen colors: brown, black, blue, green, purple, pink, red, orange, yellow)
        const PALETTES = {
            rainbow: ['brown', 'blue', 'green', 'purple', 'pink', 'red', 'orange', 'yellow'],
            monochrome: ['black', 'black', 'black', 'black', 'black', 'black', 'black', 'black'],
            primary: ['red', 'yellow', 'blue', 'red', 'yellow', 'blue', 'red', 'yellow'],
            warm: ['red', 'orange', 'yellow', 'pink', 'red', 'orange', 'yellow', 'pink'],
            cool: ['blue', 'green', 'purple', 'blue', 'green', 'purple', 'blue', 'green'],
            earth: ['brown', 'orange', 'green', 'brown', 'orange', 'green', 'brown', 'orange'],
            sunset: ['red', 'orange', 'yellow', 'pink', 'purple', 'red', 'orange', 'yellow'],
            ocean: ['blue', 'green', 'purple', 'blue', 'green', 'purple', 'blue', 'green']
        };
        
        const entityColors = PALETTES[palette] || PALETTES.rainbow;
        const entityNames = ['Beat 1', 'Beat 2', 'Beat 3', 'Beat 4', 'Beat 5', 'Beat 6', 'Beat 7', 'Beat 8'];
        
        // Create a turtle for each entity (1-8) plus grid
        const entityTurtles = {};
        for (let i = 1; i <= 8; i++) {
            entityTurtles[i] = new Turtle();
        }
        const gridTurtle = new Turtle();
        
        // Calculate grid dimensions in drawing units
        const totalWidth = gridWidth * cellSize;
        const totalHeight = gridHeight * cellSize;
        
        // Origin offset to center the composition
        const originX = -totalWidth / 2;
        const originY = -totalHeight / 2;
        
        // Hatching angles per entity (1-8) - more variety
        const entityAngles = [30, 50, 70, 90, 110, 130, 150, 170];
        // Hatching spacing per entity - scaled by hatch density
        const baseSpacing = [0.6, 0.8, 1.0, 1.2, 1.4, 1.6, 1.8, 2.0];
        const entitySpacing = baseSpacing.map(s => s / hatchDensity);
        
        // Draw optional grid lines to grid turtle (black)
        if (drawGrid) {
            this._drawSonaGrid(gridTurtle, originX, originY, gridWidth, gridHeight, cellSize);
        }
        
        // Dispatch to specific algorithm (passing entity turtles)
        const ctx = { entityTurtles, originX, originY, cellSize, gridHeight, gridWidth, drawingMode, entityAngles, entitySpacing, hatchDensity };
        
        switch (algorithm) {
            case 'sequential_progression':
                this._sonaSequentialProgressionMulti(ctx, startingEntity, textSequence);
                break;
            case 'full_sequence':
                this._sonaFullSequenceMulti(ctx, startingEntity, textSequence);
                break;
            case 'rotations':
                this._sonaRotationsMulti(ctx, rotationCount, textSequence);
                break;
            case 'palindrome':
                this._sonaPalindromeMulti(ctx, startingEntity, textSequence);
                break;
            case 'canon':
                this._sonaCanonMulti(ctx, voices, offsetBeats, startingEntity, textSequence);
                break;
            case 'moire':
                this._sonaMoireMulti(ctx, gridWidth, entity1, entity2);
                break;
            case 'fade_out':
                this._sonaFadeOutMulti(ctx, fadeSteps, startingEntity, textSequence);
                break;
            case 'language':
                this._sonaLanguageMulti(ctx, gridWidth, combinationSize);
                break;
            case 'inversion':
                this._sonaInversionMulti(ctx, startingEntity, textSequence);
                break;
            case 'cross_sections':
                this._sonaCrossSectionsMulti(ctx, numSlices, textSequence);
                break;
            case 'time_structure':
                this._sonaTimeStructureMulti(ctx, numInstruments, textSequence);
                break;
            case 'color_blend_grid':
                this._sonaColorBlendGridMulti(ctx, blendGridSize, hatchDensity);
                break;
            case 'prismatic_diagonal':
                this._sonaPrismaticDiagonalMulti(ctx, diagonalWidth, textSequence);
                break;
            case 'duration_lines':
                this._sonaDurationLinesMulti(ctx, numDurationRows, textSequence);
                break;
            default:
                this._sonaCrossSectionsMulti(ctx, numSlices);
                break;
        }
        
        // Build layers array
        const layers = [];
        
        // Add grid layer first (if it has content)
        if (gridTurtle.getPaths().length > 0) {
            layers.push({
                name: 'Grid',
                color: 'black',
                turtle: gridTurtle,
                paths: gridTurtle.getPaths()
            });
        }
        
        // Add entity layers
        for (let i = 1; i <= 8; i++) {
            const paths = entityTurtles[i].getPaths();
            if (paths.length > 0) {
                layers.push({
                    name: entityNames[i - 1],
                    color: entityColors[i - 1],
                    turtle: entityTurtles[i],
                    paths: paths
                });
            }
        }
        
        return { multiLayer: true, layers };
    }
    
    // Text to sequence conversion
    _textToSequence(text) {
        // Convert text to a sequence of numbers 1-8
        // A/a=1, B/b=2, ... H/h=8, I/i=1, etc.
        const sequence = [];
        for (const char of text) {
            if (/[a-zA-Z]/.test(char)) {
                const num = ((char.toUpperCase().charCodeAt(0) - 65) % 8) + 1;
                sequence.push(num);
            }
        }
        return sequence;
    }
    
    // Multi-layer versions of algorithms
    _sonaSequentialProgressionMulti(ctx, startingEntity = 1, textSequence = null) {
        // If text sequence provided, use text-driven pattern
        if (textSequence) {
            this._sonaTextDrivenPattern(ctx, textSequence, 'sequential');
            return;
        }
        
        // Sequential progression - cascading columns with progressive entity range
        let y = 0;
        
        // Build up from starting entity
        for (let step = startingEntity; step <= 8; step++) {
            for (let entity = startingEntity; entity <= step; entity++) {
                if (y + entity > ctx.gridHeight) return;
                const x = entity - 1;
                this._drawEntityBlockMulti(ctx, x, y, entity, entity);
            }
            y += step;
        }
        
        // Continue with full sequence
        while (y < ctx.gridHeight) {
            for (let entity = startingEntity; entity <= 8; entity++) {
                if (y + entity > ctx.gridHeight) return;
                const x = entity - 1;
                this._drawEntityBlockMulti(ctx, x, y, entity, entity);
            }
            y += 8 - startingEntity + 1;
        }
    }
    
    _sonaFullSequenceMulti(ctx, startingEntity = 1, textSequence = null) {
        if (textSequence) {
            this._sonaTextDrivenPattern(ctx, textSequence, 'full_sequence');
            return;
        }
        
        // Full sequence repetition - repeating all entities vertically
        let y = 0;
        
        while (y < ctx.gridHeight) {
            for (let entity = startingEntity; entity <= 8; entity++) {
                if (y + entity > ctx.gridHeight) return;
                const x = entity - 1;
                this._drawEntityBlockMulti(ctx, x, y, entity, entity);
            }
            // Advance by the height of the tallest entity
            y += 8;
        }
    }
    
    _sonaRotationsMulti(ctx, rotationCount = 8, textSequence = null) {
        // Sequence rotations - circular permutations of the base sequence
        let baseSequence;
        if (textSequence && textSequence.length >= 8) {
            baseSequence = textSequence.slice(0, 8);
        } else {
            baseSequence = [1, 2, 3, 4, 5, 6, 7, 8];
        }
        let y = 0;
        
        for (let rotation = 0; rotation < rotationCount; rotation++) {
            const rotated = [...baseSequence.slice(rotation), ...baseSequence.slice(0, rotation)];
            let rowMaxHeight = 0;
            
            for (let pos = 0; pos < 8; pos++) {
                const entity = rotated[pos % rotated.length];
                if (y + entity > ctx.gridHeight) return;
                this._drawEntityBlockMulti(ctx, pos, y, entity, entity);
                rowMaxHeight = Math.max(rowMaxHeight, entity);
            }
            
            y += rowMaxHeight + 1; // Add 1 beat gap between rotations
        }
    }
    
    _sonaPalindromeMulti(ctx, startingEntity = 1, textSequence = null) {
        // Reversal palindrome - forward and reverse sequences
        let forward;
        if (textSequence) {
            forward = textSequence.slice(0, 8);
        } else {
            forward = [];
            for (let i = startingEntity; i <= 8; i++) forward.push(i);
        }
        const reverse = [...forward].reverse();
        let y = 0;
        let toggle = true;
        
        while (y < ctx.gridHeight) {
            const sequence = toggle ? forward : reverse;
            let rowMaxHeight = 0;
            
            for (let pos = 0; pos < sequence.length; pos++) {
                const entity = sequence[pos];
                if (y + entity > ctx.gridHeight) return;
                this._drawEntityBlockMulti(ctx, pos, y, entity, entity);
                rowMaxHeight = Math.max(rowMaxHeight, entity);
            }
            
            y += rowMaxHeight + 1;
            toggle = !toggle;
        }
    }
    
    _sonaCanonMulti(ctx, voices, offsetBeats, startingEntity = 1) {
        // Canon layering - multiple overlapping voices with offset starts
        for (let voice = 0; voice < voices; voice++) {
            let y = voice * offsetBeats;
            
            // First, build up the progression
            for (let step = startingEntity; step <= 8; step++) {
                for (let entity = startingEntity; entity <= step; entity++) {
                    if (y + entity > ctx.gridHeight) break;
                    // Shift x position by voice to create separation
                    const x = (entity - 1 + voice) % 8;
                    this._drawEntityBlockMulti(ctx, x, y, entity, entity);
                }
                y += step;
                if (y >= ctx.gridHeight) break;
            }
            
            // Then continue with full sequence
            while (y < ctx.gridHeight) {
                for (let entity = startingEntity; entity <= 8; entity++) {
                    if (y + entity > ctx.gridHeight) break;
                    const x = (entity - 1 + voice) % 8;
                    this._drawEntityBlockMulti(ctx, x, y, entity, entity);
                }
                y += 8 - startingEntity + 1;
            }
        }
    }
    
    _sonaMoireMulti(ctx, gridWidth, entity1, entity2) {
        // Moiré angle pairs - interference patterns from two line sets
        const angles = [0, 22.5, 45, 67.5, 90, 112.5, 135, 157.5];
        
        const angle1 = angles[entity1 - 1];
        const angle2 = angles[entity2 - 1];
        
        // Spacing is proportional to entity number (higher = wider spacing)
        const spacing1 = ctx.cellSize * (entity1 / 3);
        const spacing2 = ctx.cellSize * (entity2 / 3);
        
        const width = gridWidth * ctx.cellSize;
        const height = ctx.gridHeight * ctx.cellSize;
        
        // Draw two overlapping sets of parallel lines
        this._drawParallelLines(ctx.entityTurtles[entity1], ctx.originX, ctx.originY, width, height, angle1, spacing1);
        this._drawParallelLines(ctx.entityTurtles[entity2], ctx.originX, ctx.originY, width, height, angle2, spacing2);
    }
    
    _sonaFadeOutMulti(ctx, fadeSteps, startingEntity = 1, textSequence = null) {
        // Fade out - progressively removes entities over time
        if (textSequence) {
            this._sonaTextDrivenFade(ctx, textSequence, fadeSteps);
            return;
        }
        
        let y = 0;
        let iteration = 0;
        let currentStart = startingEntity;
        
        while (y < ctx.gridHeight && currentStart <= 8) {
            // Draw current row
            let rowMaxHeight = 0;
            
            for (let entity = currentStart; entity <= 8; entity++) {
                if (y + entity > ctx.gridHeight) return;
                const x = entity - 1;
                this._drawEntityBlockMulti(ctx, x, y, entity, entity);
                rowMaxHeight = Math.max(rowMaxHeight, entity);
            }
            
            y += rowMaxHeight + 1;
            iteration++;
            
            // Every fadeSteps iterations, remove an entity
            if (iteration % fadeSteps === 0) {
                currentStart++;
            }
        }
    }
    
    _sonaLanguageMulti(ctx, gridWidth, combinationSize) {
        // For Language, we use entity turtles for each shape type
        const combos = this._getCombinations([0, 1, 2, 3, 4, 5, 6, 7], combinationSize);
        const combosPerRow = gridWidth;
        const shapeSize = ctx.cellSize * 0.8;
        
        combos.forEach((combo, index) => {
            const row = Math.floor(index / combosPerRow);
            const col = index % combosPerRow;
            
            const cx = ctx.originX + (col + 0.5) * ctx.cellSize * (gridWidth / combosPerRow);
            const cy = ctx.originY + (row + 0.5) * ctx.cellSize * 2;
            
            if (cy + shapeSize > ctx.originY + ctx.gridHeight * ctx.cellSize) return;
            
            combo.forEach((shapeIdx, i) => {
                const offsetX = (i - (combo.length - 1) / 2) * shapeSize * 0.3;
                const turtle = ctx.entityTurtles[shapeIdx + 1];
                const shapes = [
                    this._drawShapeRect.bind(this),
                    this._drawShapeTriangle.bind(this),
                    this._drawShapeCircle.bind(this),
                    this._drawShapeDiamond.bind(this),
                    this._drawShapeHexagon.bind(this),
                    this._drawShapePentagon.bind(this),
                    this._drawShapeStar.bind(this),
                    this._drawShapeCross.bind(this)
                ];
                shapes[shapeIdx](turtle, cx + offsetX, cy, shapeSize / combo.length);
            });
        });
    }
    
    _sonaInversionMulti(ctx, startingEntity = 1, textSequence = null) {
        // Numeric inversion - base and inverted (9-N) sequences side by side
        let base;
        if (textSequence) {
            base = textSequence.slice(0, 8);
        } else {
            base = [];
            for (let i = startingEntity; i <= 8; i++) base.push(i);
        }
        const inverted = base.map(n => 9 - n);
        const halfWidth = 4;
        let y = 0;
        let toggle = true;
        
        while (y < ctx.gridHeight) {
            let rowMaxHeight = 0;
            
            if (toggle) {
                // Left half: base, Right half: inverted
                for (let pos = 0; pos < Math.min(halfWidth, base.length); pos++) {
                    const entity = base[pos];
                    if (y + entity > ctx.gridHeight) break;
                    this._drawEntityBlockMulti(ctx, pos, y, entity, entity);
                    rowMaxHeight = Math.max(rowMaxHeight, entity);
                }
                for (let pos = 0; pos < Math.min(halfWidth, inverted.length); pos++) {
                    const entity = inverted[pos];
                    if (y + entity > ctx.gridHeight) break;
                    this._drawEntityBlockMulti(ctx, pos + halfWidth, y, entity, entity);
                    rowMaxHeight = Math.max(rowMaxHeight, entity);
                }
            } else {
                // Left half: inverted, Right half: base
                const invertedSecondHalf = inverted.length > halfWidth ? inverted.slice(halfWidth) : inverted;
                const baseSecondHalf = base.length > halfWidth ? base.slice(halfWidth) : base;
                for (let pos = 0; pos < invertedSecondHalf.length; pos++) {
                    const entity = invertedSecondHalf[pos];
                    if (y + entity > ctx.gridHeight) break;
                    this._drawEntityBlockMulti(ctx, pos, y, entity, entity);
                    rowMaxHeight = Math.max(rowMaxHeight, entity);
                }
                for (let pos = 0; pos < baseSecondHalf.length; pos++) {
                    const entity = baseSecondHalf[pos];
                    if (y + entity > ctx.gridHeight) break;
                    this._drawEntityBlockMulti(ctx, pos + halfWidth, y, entity, entity);
                    rowMaxHeight = Math.max(rowMaxHeight, entity);
                }
            }
            
            y += rowMaxHeight + 1;
            toggle = !toggle;
        }
    }
    
    _sonaCrossSectionsMulti(ctx, numSlices = 6, textSequence = null) {
        // 3D cross-sections - multiple slices through the sequence space
        if (numSlices < 1) numSlices = 1;
        const sliceSpacing = Math.max(1, Math.floor(ctx.gridHeight / numSlices));
        
        // Use text sequence if provided
        const sequence = textSequence ? textSequence.slice(0, 8) : [1, 2, 3, 4, 5, 6, 7, 8];
        
        for (let slice = 0; slice < numSlices; slice++) {
            const yOffset = slice * sliceSpacing;
            let y = yOffset;
            
            for (let i = 0; i < sequence.length; i++) {
                const entity = sequence[i];
                if (y + entity > ctx.gridHeight) break;
                // Rotate x position by slice index for visual separation
                const x = (i + slice) % 8;
                this._drawEntityBlockMulti(ctx, x, y, entity, entity);
                y += entity;
            }
        }
    }
    
    // New algorithms based on Horwitz's various series
    _sonaTimeStructureMulti(ctx, numInstruments = 4, textSequence = null) {
        // Time Structure Composition - vertical lines with colored blocks at beat positions
        const cellSize = ctx.cellSize;
        const trackWidth = (8 * cellSize) / numInstruments;
        
        // Generate events
        let events = [];
        if (textSequence) {
            events = textSequence.map((entity, i) => ({
                inst: i % numInstruments,
                entity: entity,
                beat: i
            }));
        } else {
            let beat = 0;
            for (let i = 0; i < ctx.gridHeight / 2; i++) {
                for (let inst = 0; inst < numInstruments; inst++) {
                    const entity = ((beat + inst) % 8) + 1;
                    events.push({ inst, entity, beat });
                    beat += Math.floor(entity / 2) + 1;
                    if (beat >= ctx.gridHeight) break;
                }
                if (beat >= ctx.gridHeight) break;
            }
        }
        
        // Draw vertical track lines
        for (let inst = 0; inst < numInstruments; inst++) {
            const xCenter = ctx.originX + (inst + 0.5) * trackWidth;
            const entity = (inst % 8) + 1;
            const turtle = ctx.entityTurtles[entity];
            turtle.drawLine(xCenter, ctx.originY, xCenter, ctx.originY + ctx.gridHeight * cellSize);
        }
        
        // Draw blocks at event positions
        for (const evt of events) {
            if (evt.beat + evt.entity > ctx.gridHeight) continue;
            const x = (evt.inst * trackWidth / cellSize);
            this._drawEntityBlockMulti(ctx, x, evt.beat, evt.entity, evt.entity);
        }
    }
    
    _sonaColorBlendGridMulti(ctx, gridSize = 8, hatchDensity = 1.0) {
        // Color Blend Grid - NxN grid with dual-color hatching
        const cellSize = ctx.cellSize;
        const spacing = 1.5 / hatchDensity;
        
        for (let row = 0; row < gridSize; row++) {
            for (let col = 0; col < gridSize; col++) {
                // Each cell blends two colors based on position
                const color1 = (row % 8) + 1;
                const color2 = (col % 8) + 1;
                
                const px = ctx.originX + col * cellSize;
                const py = ctx.originY + row * cellSize;
                
                // Draw hatching in first color at one angle
                this._drawHatching(ctx.entityTurtles[color1], px, py, cellSize, cellSize, 45, spacing);
                
                // Draw hatching in second color at perpendicular angle
                this._drawHatching(ctx.entityTurtles[color2], px, py, cellSize, cellSize, 135, spacing);
            }
        }
    }
    
    _sonaPrismaticDiagonalMulti(ctx, diagonalWidth = 40, textSequence = null) {
        // Prismatic Diagonal - rainbow diagonal stripes
        const cellSize = ctx.cellSize;
        const totalWidth = 8 * cellSize;
        const totalHeight = ctx.gridHeight * cellSize;
        const stripeWidth = cellSize * 0.8;
        
        // Number of diagonal stripes to fill the space
        const numStripes = Math.ceil((totalWidth + totalHeight) / stripeWidth) + 1;
        
        for (let stripeIdx = 0; stripeIdx < numStripes; stripeIdx++) {
            // Determine entity/color based on stripe position
            let entity;
            if (textSequence) {
                entity = textSequence[stripeIdx % textSequence.length];
            } else {
                entity = (stripeIdx % 8) + 1;
            }
            
            const turtle = ctx.entityTurtles[entity];
            
            // Calculate diagonal line positions (top-left to bottom-right)
            const offset = stripeIdx * stripeWidth - totalHeight;
            
            // Draw diagonal stripe as series of parallel lines
            for (let sub = 0; sub < stripeWidth / 2; sub++) {
                let x1 = ctx.originX + offset + sub;
                let y1 = ctx.originY + totalHeight;
                let x2 = ctx.originX + offset + totalHeight + sub;
                let y2 = ctx.originY;
                
                // Clip to bounds
                if (x1 < ctx.originX) {
                    y1 = y1 - (ctx.originX - x1);
                    x1 = ctx.originX;
                }
                if (x2 > ctx.originX + totalWidth) {
                    y2 = y2 + (x2 - (ctx.originX + totalWidth));
                    x2 = ctx.originX + totalWidth;
                }
                
                if (x1 < ctx.originX + totalWidth && x2 > ctx.originX) {
                    if (y1 > ctx.originY && y2 < ctx.originY + totalHeight) {
                        turtle.drawLine(x1, y1, x2, y2);
                    }
                }
            }
        }
    }
    
    _sonaDurationLinesMulti(ctx, numRows = 4, textSequence = null) {
        // Duration Lines (8 Circle) - horizontal notation with rectangles
        const cellSize = ctx.cellSize;
        const rowHeight = ctx.gridHeight * cellSize / numRows;
        
        for (let row = 0; row < numRows; row++) {
            const yCenter = ctx.originY + (row + 0.5) * rowHeight;
            
            // Determine sequence for this row
            let sequence;
            if (textSequence) {
                const startIdx = row * 12;
                sequence = textSequence.slice(startIdx, startIdx + 12);
                if (sequence.length === 0) sequence = textSequence.slice(0, 12);
            } else {
                const base = [1, 2, 3, 4, 5, 6, 7, 8];
                const rotated = [...base.slice(row % 8), ...base.slice(0, row % 8)];
                sequence = [...rotated, ...rotated.slice(0, 4)]; // Extend to 12
            }
            
            // Draw horizontal track line
            const firstEntity = sequence[0] || 1;
            const firstTurtle = ctx.entityTurtles[firstEntity];
            firstTurtle.drawLine(ctx.originX, yCenter, ctx.originX + 8 * cellSize, yCenter);
            
            // Draw duration rectangles
            let x = ctx.originX;
            const rectHeight = rowHeight * 0.4;
            
            for (const duration of sequence) {
                const d = Math.max(1, Math.min(8, duration));
                const rectWidth = d * cellSize * 0.4;
                
                const turtle = ctx.entityTurtles[d];
                turtle.drawRect(x, yCenter - rectHeight / 2, rectWidth, rectHeight);
                
                x += rectWidth + cellSize * 0.2;
                if (x > ctx.originX + 8 * cellSize) break;
            }
        }
    }
    
    _sonaTextDrivenPattern(ctx, textSequence, patternType = 'sequential') {
        // Draw a pattern driven by the text sequence
        let y = 0;
        let x = 0;
        
        for (let i = 0; i < textSequence.length; i++) {
            const entity = textSequence[i];
            if (y + entity > ctx.gridHeight) {
                x = (x + 1) % 8;
                y = 0;
            }
            if (y + entity > ctx.gridHeight) break;
            
            this._drawEntityBlockMulti(ctx, x, y, entity, entity);
            y += entity;
        }
    }
    
    _sonaTextDrivenFade(ctx, textSequence, fadeSteps) {
        // Text-driven pattern with progressive fade
        let y = 0;
        let iteration = 0;
        let minEntity = 1;
        
        for (const entity of textSequence) {
            if (entity < minEntity) continue;
            if (y + entity > ctx.gridHeight) break;
            
            const x = entity - 1;
            this._drawEntityBlockMulti(ctx, x, y, entity, entity);
            y += entity;
            iteration++;
            
            if (iteration % fadeSteps === 0) {
                minEntity++;
                if (minEntity > 8) break;
            }
        }
    }
    
    /**
     * Draw an entity block to the appropriate entity turtle
     */
    _drawEntityBlockMulti(ctx, x, y, duration, entity) {
        const turtle = ctx.entityTurtles[entity];
        const px = ctx.originX + x * ctx.cellSize;
        const py = ctx.originY + y * ctx.cellSize;
        const width = ctx.cellSize;
        const height = duration * ctx.cellSize;
        
        if (ctx.drawingMode === 'lines') {
            const cx = px + width / 2;
            turtle.drawLine(cx, py, cx, py + height);
        } else if (ctx.drawingMode === 'blocks') {
            turtle.drawRect(px, py, width, height);
            const fillSpacing = 1.5;
            for (let fy = fillSpacing; fy < height; fy += fillSpacing) {
                turtle.drawLine(px, py + fy, px + width, py + fy);
            }
        } else {
            // Hatching mode
            const angle = ctx.entityAngles[entity - 1];
            const spacing = ctx.entitySpacing[entity - 1];
            this._drawHatching(turtle, px, py, width, height, angle, spacing);
        }
    }
    
    /**
     * Draw the underlying grid structure
     */
    _drawSonaGrid(turtle, originX, originY, gridWidth, gridHeight, cellSize) {
        // Vertical lines
        for (let x = 0; x <= gridWidth; x++) {
            const px = originX + x * cellSize;
            turtle.drawLine(px, originY, px, originY + gridHeight * cellSize);
        }
        // Horizontal lines
        for (let y = 0; y <= gridHeight; y++) {
            const py = originY + y * cellSize;
            turtle.drawLine(originX, py, originX + gridWidth * cellSize, py);
        }
    }
    
    /**
     * Draw an entity block at grid position
     * @param x - grid x (0-7)
     * @param y - grid y (beat position)
     * @param duration - number of beats (1-8)
     * @param entity - entity number (1-8)
     */
    _drawEntityBlock(turtle, originX, originY, cellSize, x, y, duration, entity, mode, angles, spacings) {
        const px = originX + x * cellSize;
        const py = originY + y * cellSize;
        const width = cellSize;
        const height = duration * cellSize;
        
        if (mode === 'lines') {
            // Simple vertical line spanning the duration
            const cx = px + width / 2;
            turtle.drawLine(cx, py, cx, py + height);
        } else if (mode === 'blocks') {
            // Draw filled rectangle outline (plotter approximation)
            turtle.drawRect(px, py, width, height);
            // Add internal fill lines
            const fillSpacing = 1.5;
            for (let fy = fillSpacing; fy < height; fy += fillSpacing) {
                turtle.drawLine(px, py + fy, px + width, py + fy);
            }
        } else {
            // Hatching mode (default)
            const angle = angles[entity - 1];
            const spacing = spacings[entity - 1];
            this._drawHatching(turtle, px, py, width, height, angle, spacing);
        }
    }
    
    /**
     * Fill a rectangle with parallel hatching lines
     */
    _drawHatching(turtle, x, y, width, height, angleDeg, spacing) {
        const angleRad = angleDeg * Math.PI / 180;
        const cos = Math.cos(angleRad);
        const sin = Math.sin(angleRad);
        
        // Calculate the diagonal length needed to cover the rectangle
        const diagonal = Math.sqrt(width * width + height * height);
        const numLines = Math.ceil(diagonal / spacing) * 2;
        
        // Generate lines perpendicular to the angle
        const centerX = x + width / 2;
        const centerY = y + height / 2;
        
        for (let i = -numLines; i <= numLines; i++) {
            const offset = i * spacing;
            
            // Line perpendicular to angle, offset by spacing
            const perpX = Math.cos(angleRad + Math.PI / 2) * offset;
            const perpY = Math.sin(angleRad + Math.PI / 2) * offset;
            
            // Start and end points along the angle direction
            const startX = centerX + perpX - cos * diagonal;
            const startY = centerY + perpY - sin * diagonal;
            const endX = centerX + perpX + cos * diagonal;
            const endY = centerY + perpY + sin * diagonal;
            
            // Clip to rectangle bounds
            const clipped = this._clipLineToRect(startX, startY, endX, endY, x, y, x + width, y + height);
            if (clipped) {
                turtle.drawLine(clipped.x1, clipped.y1, clipped.x2, clipped.y2);
            }
        }
    }
    
    /**
     * Clip a line to a rectangle using Cohen-Sutherland algorithm
     */
    _clipLineToRect(x1, y1, x2, y2, minX, minY, maxX, maxY) {
        const INSIDE = 0, LEFT = 1, RIGHT = 2, BOTTOM = 4, TOP = 8;
        
        const computeCode = (x, y) => {
            let code = INSIDE;
            if (x < minX) code |= LEFT;
            else if (x > maxX) code |= RIGHT;
            if (y < minY) code |= BOTTOM;
            else if (y > maxY) code |= TOP;
            return code;
        };
        
        let code1 = computeCode(x1, y1);
        let code2 = computeCode(x2, y2);
        
        while (true) {
            if (!(code1 | code2)) {
                return { x1, y1, x2, y2 };
            } else if (code1 & code2) {
                return null;
            } else {
                const codeOut = code1 ? code1 : code2;
                let x, y;
                
                if (codeOut & TOP) {
                    x = x1 + (x2 - x1) * (maxY - y1) / (y2 - y1);
                    y = maxY;
                } else if (codeOut & BOTTOM) {
                    x = x1 + (x2 - x1) * (minY - y1) / (y2 - y1);
                    y = minY;
                } else if (codeOut & RIGHT) {
                    y = y1 + (y2 - y1) * (maxX - x1) / (x2 - x1);
                    x = maxX;
                } else {
                    y = y1 + (y2 - y1) * (minX - x1) / (x2 - x1);
                    x = minX;
                }
                
                if (codeOut === code1) {
                    x1 = x; y1 = y;
                    code1 = computeCode(x1, y1);
                } else {
                    x2 = x; y2 = y;
                    code2 = computeCode(x2, y2);
                }
            }
        }
    }
    
    // =========================================================================
    // ALGORITHM 1: Sequential Progression
    // =========================================================================
    _sonaSequentialProgression(turtle, originX, originY, cellSize, gridHeight, mode, angles, spacings) {
        let y = 0;
        
        for (let step = 1; step <= 8; step++) {
            for (let entity = 1; entity <= step; entity++) {
                if (y + entity > gridHeight) return;
                
                const x = entity - 1;
                this._drawEntityBlock(turtle, originX, originY, cellSize, x, y, entity, entity, mode, angles, spacings);
            }
            // Advance y by the sum of durations in this step
            y += (step * (step + 1)) / 2 > 8 ? 8 : step;
        }
        
        // Continue pattern to fill grid
        while (y < gridHeight) {
            for (let entity = 1; entity <= 8; entity++) {
                if (y + entity > gridHeight) return;
                
                const x = entity - 1;
                this._drawEntityBlock(turtle, originX, originY, cellSize, x, y, entity, entity, mode, angles, spacings);
            }
            y += 8;
        }
    }
    
    // =========================================================================
    // ALGORITHM 2: Full Sequence Repetition
    // =========================================================================
    _sonaFullSequence(turtle, originX, originY, cellSize, gridHeight, mode, angles, spacings) {
        let y = 0;
        
        while (y < gridHeight) {
            for (let entity = 1; entity <= 8; entity++) {
                if (y + entity > gridHeight) return;
                
                const x = entity - 1;
                this._drawEntityBlock(turtle, originX, originY, cellSize, x, y, entity, entity, mode, angles, spacings);
            }
            // Advance by the maximum duration (8 beats)
            y += 8;
        }
    }
    
    // =========================================================================
    // ALGORITHM 3: Sequence Rotations
    // =========================================================================
    _sonaRotations(turtle, originX, originY, cellSize, gridHeight, mode, angles, spacings) {
        const baseSequence = [1, 2, 3, 4, 5, 6, 7, 8];
        let y = 0;
        
        for (let rotation = 0; rotation < 8; rotation++) {
            // Rotate the sequence
            const rotated = [...baseSequence.slice(rotation), ...baseSequence.slice(0, rotation)];
            
            for (let pos = 0; pos < 8; pos++) {
                const entity = rotated[pos];
                if (y + entity > gridHeight) return;
                
                this._drawEntityBlock(turtle, originX, originY, cellSize, pos, y, entity, entity, mode, angles, spacings);
            }
            
            // Advance by maximum duration in this rotation
            y += Math.max(...rotated) + 2; // Add spacing between rotations
        }
    }
    
    // =========================================================================
    // ALGORITHM 4: Reversal Palindrome
    // =========================================================================
    _sonaPalindrome(turtle, originX, originY, cellSize, gridHeight, mode, angles, spacings) {
        const forward = [1, 2, 3, 4, 5, 6, 7, 8];
        const reverse = [8, 7, 6, 5, 4, 3, 2, 1];
        let y = 0;
        
        // Draw forward sequence
        for (let pos = 0; pos < 8; pos++) {
            const entity = forward[pos];
            if (y + entity > gridHeight) return;
            
            this._drawEntityBlock(turtle, originX, originY, cellSize, pos, y, entity, entity, mode, angles, spacings);
        }
        y += 8 + 2; // Max duration plus spacing
        
        // Draw center gap
        y += 2;
        
        // Draw reverse sequence
        for (let pos = 0; pos < 8; pos++) {
            const entity = reverse[pos];
            if (y + entity > gridHeight) return;
            
            this._drawEntityBlock(turtle, originX, originY, cellSize, pos, y, entity, entity, mode, angles, spacings);
        }
        y += 8 + 2;
        
        // Continue with interleaved pattern
        while (y < gridHeight) {
            for (let pos = 0; pos < 8; pos++) {
                const entity = forward[pos];
                if (y + entity > gridHeight) return;
                this._drawEntityBlock(turtle, originX, originY, cellSize, pos, y, entity, entity, mode, angles, spacings);
            }
            y += 8 + 2;
            
            for (let pos = 0; pos < 8; pos++) {
                const entity = reverse[pos];
                if (y + entity > gridHeight) return;
                this._drawEntityBlock(turtle, originX, originY, cellSize, pos, y, entity, entity, mode, angles, spacings);
            }
            y += 8 + 2;
        }
    }
    
    // =========================================================================
    // ALGORITHM 5: Canon Layering
    // =========================================================================
    _sonaCanon(turtle, originX, originY, cellSize, gridHeight, mode, angles, spacings, voices, offsetBeats) {
        // Draw multiple overlapping sequences with different start offsets
        for (let voice = 0; voice < voices; voice++) {
            let y = voice * offsetBeats;
            
            // Sequential progression for each voice
            for (let step = 1; step <= 8; step++) {
                for (let entity = 1; entity <= step; entity++) {
                    if (y + entity > gridHeight) break;
                    
                    const x = (entity - 1 + voice) % 8; // Offset horizontally per voice
                    this._drawEntityBlock(turtle, originX, originY, cellSize, x, y, entity, entity, mode, angles, spacings);
                }
                y += step;
                if (y >= gridHeight) break;
            }
            
            // Continue pattern
            while (y < gridHeight) {
                for (let entity = 1; entity <= 8; entity++) {
                    if (y + entity > gridHeight) break;
                    
                    const x = (entity - 1 + voice) % 8;
                    this._drawEntityBlock(turtle, originX, originY, cellSize, x, y, entity, entity, mode, angles, spacings);
                }
                y += 8;
            }
        }
    }
    
    // =========================================================================
    // ALGORITHM 6: Moiré Angle Pairs
    // =========================================================================
    _sonaMoire(turtle, originX, originY, cellSize, gridWidth, gridHeight, entity1, entity2) {
        // 8 fundamental angles
        const angles = [0, 22.5, 45, 67.5, 90, 112.5, 135, 157.5];
        
        const angle1 = angles[entity1 - 1];
        const angle2 = angles[entity2 - 1];
        
        // Spacing based on entity number
        const spacing1 = cellSize * (entity1 / 4);
        const spacing2 = cellSize * (entity2 / 4);
        
        const width = gridWidth * cellSize;
        const height = gridHeight * cellSize;
        
        // Draw first set of parallel lines
        this._drawParallelLines(turtle, originX, originY, width, height, angle1, spacing1);
        
        // Draw second set of parallel lines
        this._drawParallelLines(turtle, originX, originY, width, height, angle2, spacing2);
    }
    
    /**
     * Draw parallel lines across a rectangle at a given angle
     */
    _drawParallelLines(turtle, x, y, width, height, angleDeg, spacing) {
        const angleRad = angleDeg * Math.PI / 180;
        const cos = Math.cos(angleRad);
        const sin = Math.sin(angleRad);
        
        const diagonal = Math.sqrt(width * width + height * height);
        const numLines = Math.ceil(diagonal / spacing) * 2;
        
        const centerX = x + width / 2;
        const centerY = y + height / 2;
        
        for (let i = -numLines; i <= numLines; i++) {
            const offset = i * spacing;
            
            const perpX = Math.cos(angleRad + Math.PI / 2) * offset;
            const perpY = Math.sin(angleRad + Math.PI / 2) * offset;
            
            const startX = centerX + perpX - cos * diagonal;
            const startY = centerY + perpY - sin * diagonal;
            const endX = centerX + perpX + cos * diagonal;
            const endY = centerY + perpY + sin * diagonal;
            
            const clipped = this._clipLineToRect(startX, startY, endX, endY, x, y, x + width, y + height);
            if (clipped) {
                turtle.drawLine(clipped.x1, clipped.y1, clipped.x2, clipped.y2);
            }
        }
    }
    
    // =========================================================================
    // ALGORITHM 7: Fade Out Sequence
    // =========================================================================
    _sonaFadeOut(turtle, originX, originY, cellSize, gridHeight, mode, angles, spacings, fadeSteps) {
        let y = 0;
        let iteration = 0;
        
        while (y < gridHeight) {
            // Calculate how many entities to remove
            const entitiesToRemove = Math.floor(iteration / fadeSteps);
            const startEntity = Math.min(entitiesToRemove + 1, 8);
            
            if (startEntity > 8) break; // All entities faded
            
            for (let entity = startEntity; entity <= 8; entity++) {
                if (y + entity > gridHeight) return;
                
                const x = entity - 1;
                
                // Reduce hatching density as we fade
                const fadeMultiplier = 1 + (iteration / fadeSteps) * 0.5;
                const adjustedSpacings = spacings.map(s => s * fadeMultiplier);
                
                this._drawEntityBlock(turtle, originX, originY, cellSize, x, y, entity, entity, mode, angles, adjustedSpacings);
            }
            
            // Advance based on remaining entities
            const maxDuration = 8 - startEntity + 1;
            y += maxDuration + 1;
            iteration++;
        }
    }
    
    // =========================================================================
    // ALGORITHM 8: Language Combinations
    // =========================================================================
    _sonaLanguage(turtle, originX, originY, cellSize, gridWidth, gridHeight, combinationSize) {
        // 8 primitive shapes (as functions)
        const shapes = [
            (t, cx, cy, size) => this._drawShapeRect(t, cx, cy, size),
            (t, cx, cy, size) => this._drawShapeTriangle(t, cx, cy, size),
            (t, cx, cy, size) => this._drawShapeCircle(t, cx, cy, size),
            (t, cx, cy, size) => this._drawShapeDiamond(t, cx, cy, size),
            (t, cx, cy, size) => this._drawShapeHexagon(t, cx, cy, size),
            (t, cx, cy, size) => this._drawShapePentagon(t, cx, cy, size),
            (t, cx, cy, size) => this._drawShapeStar(t, cx, cy, size),
            (t, cx, cy, size) => this._drawShapeCross(t, cx, cy, size)
        ];
        
        // Generate all C(8, k) combinations
        const combinations = this._getCombinations([0, 1, 2, 3, 4, 5, 6, 7], combinationSize);
        
        // Layout combinations in a grid
        const combosPerRow = gridWidth;
        const shapeSize = cellSize * 0.8;
        
        combinations.forEach((combo, index) => {
            const row = Math.floor(index / combosPerRow);
            const col = index % combosPerRow;
            
            const cx = originX + (col + 0.5) * cellSize * (gridWidth / combosPerRow);
            const cy = originY + (row + 0.5) * cellSize * 2;
            
            if (cy + shapeSize > originY + gridHeight * cellSize) return;
            
            // Draw each shape in the combination
            combo.forEach((shapeIndex, i) => {
                const offsetX = (i - (combo.length - 1) / 2) * shapeSize * 0.3;
                shapes[shapeIndex](turtle, cx + offsetX, cy, shapeSize / combo.length);
            });
        });
    }
    
    /**
     * Generate all k-combinations of an array
     */
    _getCombinations(arr, k) {
        const result = [];
        
        const combine = (start, combo) => {
            if (combo.length === k) {
                result.push([...combo]);
                return;
            }
            
            for (let i = start; i < arr.length; i++) {
                combo.push(arr[i]);
                combine(i + 1, combo);
                combo.pop();
            }
        };
        
        combine(0, []);
        return result;
    }
    
    // Shape primitives for Language algorithm
    _drawShapeRect(t, cx, cy, size) {
        const half = size / 2;
        t.drawRect(cx - half, cy - half, size, size);
    }
    
    _drawShapeTriangle(t, cx, cy, size) {
        const half = size / 2;
        t.jumpTo(cx, cy + half);
        t.moveTo(cx - half, cy - half);
        t.moveTo(cx + half, cy - half);
        t.moveTo(cx, cy + half);
    }
    
    _drawShapeCircle(t, cx, cy, size) {
        t.drawCircle(cx, cy, size / 2, 24);
    }
    
    _drawShapeDiamond(t, cx, cy, size) {
        const half = size / 2;
        t.jumpTo(cx, cy + half);
        t.moveTo(cx + half, cy);
        t.moveTo(cx, cy - half);
        t.moveTo(cx - half, cy);
        t.moveTo(cx, cy + half);
    }
    
    _drawShapeHexagon(t, cx, cy, size) {
        const radius = size / 2;
        for (let i = 0; i < 6; i++) {
            const angle = Math.PI / 3 * i - Math.PI / 2;
            const x = cx + Math.cos(angle) * radius;
            const y = cy + Math.sin(angle) * radius;
            if (i === 0) t.jumpTo(x, y);
            else t.moveTo(x, y);
        }
        t.moveTo(cx + Math.cos(-Math.PI / 2) * radius, cy + Math.sin(-Math.PI / 2) * radius);
    }
    
    _drawShapePentagon(t, cx, cy, size) {
        const radius = size / 2;
        for (let i = 0; i < 5; i++) {
            const angle = Math.PI * 2 / 5 * i - Math.PI / 2;
            const x = cx + Math.cos(angle) * radius;
            const y = cy + Math.sin(angle) * radius;
            if (i === 0) t.jumpTo(x, y);
            else t.moveTo(x, y);
        }
        t.moveTo(cx + Math.cos(-Math.PI / 2) * radius, cy + Math.sin(-Math.PI / 2) * radius);
    }
    
    _drawShapeStar(t, cx, cy, size) {
        const outerR = size / 2;
        const innerR = outerR * 0.4;
        for (let i = 0; i < 10; i++) {
            const angle = Math.PI / 5 * i - Math.PI / 2;
            const r = i % 2 === 0 ? outerR : innerR;
            const x = cx + Math.cos(angle) * r;
            const y = cy + Math.sin(angle) * r;
            if (i === 0) t.jumpTo(x, y);
            else t.moveTo(x, y);
        }
        t.moveTo(cx + Math.cos(-Math.PI / 2) * outerR, cy + Math.sin(-Math.PI / 2) * outerR);
    }
    
    _drawShapeCross(t, cx, cy, size) {
        const third = size / 3;
        const half = size / 2;
        // Vertical bar
        t.drawRect(cx - third / 2, cy - half, third, size);
        // Horizontal bar
        t.drawRect(cx - half, cy - third / 2, size, third);
    }
    
    // =========================================================================
    // ALGORITHM 9: Numeric Inversion
    // =========================================================================
    _sonaInversion(turtle, originX, originY, cellSize, gridHeight, mode, angles, spacings) {
        const base = [1, 2, 3, 4, 5, 6, 7, 8];
        const inverted = base.map(n => 9 - n); // [8, 7, 6, 5, 4, 3, 2, 1]
        let y = 0;
        
        // Interleaved pattern - base and inverted side by side
        while (y < gridHeight) {
            // Draw base sequence on left half
            for (let pos = 0; pos < 4; pos++) {
                const entity = base[pos];
                if (y + entity > gridHeight) break;
                this._drawEntityBlock(turtle, originX, originY, cellSize, pos, y, entity, entity, mode, angles, spacings);
            }
            
            // Draw inverted sequence on right half
            for (let pos = 0; pos < 4; pos++) {
                const entity = inverted[pos];
                if (y + entity > gridHeight) break;
                this._drawEntityBlock(turtle, originX, originY, cellSize, pos + 4, y, entity, entity, mode, angles, spacings);
            }
            
            y += 8 + 2; // Max duration plus gap
            
            // Swap: inverted on left, base on right
            for (let pos = 0; pos < 4; pos++) {
                const entity = inverted[pos + 4];
                if (y + entity > gridHeight) break;
                this._drawEntityBlock(turtle, originX, originY, cellSize, pos, y, entity, entity, mode, angles, spacings);
            }
            
            for (let pos = 0; pos < 4; pos++) {
                const entity = base[pos + 4];
                if (y + entity > gridHeight) break;
                this._drawEntityBlock(turtle, originX, originY, cellSize, pos + 4, y, entity, entity, mode, angles, spacings);
            }
            
            y += 8 + 2;
        }
    }
    
    // =========================================================================
    // ALGORITHM 10: 3D Cross-Sections
    // =========================================================================
    _sonaCrossSections(turtle, originX, originY, cellSize, gridHeight, mode, angles, spacings) {
        const numSlices = 6;
        const sliceSpacing = Math.floor(gridHeight / numSlices);
        
        for (let slice = 0; slice < numSlices; slice++) {
            const yOffset = slice * sliceSpacing;
            let y = yOffset;
            
            for (let entity = 1; entity <= 8; entity++) {
                if (y + entity > gridHeight) break;
                
                // Rotate position per slice for 3D effect
                const x = (entity - 1 + slice) % 8;
                this._drawEntityBlock(turtle, originX, originY, cellSize, x, y, entity, entity, mode, angles, spacings);
                
                y += entity;
            }
        }
    }
}

// Export
window.PatternGenerator = PatternGenerator;

