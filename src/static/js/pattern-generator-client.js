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
        }
    };
    
    listGenerators() {
        return Object.entries(PatternGenerator.GENERATORS).map(([id, v]) => ({ id, ...v }));
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
        
        const turtle = this[methodName](options);
        
        // Fit to work area
        const workArea = this.getWorkArea();
        const margin = 20;
        turtle.fitToBounds(
            workArea.left + margin,
            workArea.bottom + margin,
            workArea.right - margin,
            workArea.top - margin
        );
        
        return turtle;
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
}

// Export
window.PatternGenerator = PatternGenerator;

