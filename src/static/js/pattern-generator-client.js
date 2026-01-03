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

