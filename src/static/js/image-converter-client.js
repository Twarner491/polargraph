/**
 * Client-side image to path converter for Polargraph
 * Converts raster images to vector paths using various algorithms
 */

class ImageConverter {
    constructor(settings = DEFAULT_SETTINGS) {
        this.settings = { ...DEFAULT_SETTINGS, ...settings };
    }
    
    static CONVERTERS = {
        spiral: {
            name: 'Spiral',
            description: 'Converts image to a continuous spiral pattern',
            options: {
                step_size: { type: 'float', default: 2.0, min: 0.5, max: 10 },
                to_corners: { type: 'bool', default: false }
            }
        },
        crosshatch: {
            name: 'Crosshatch',
            description: 'Creates crosshatch lines based on image darkness',
            options: {
                angle: { type: 'float', default: 45, min: 0, max: 180 },
                step_size: { type: 'float', default: 2.0, min: 0.5, max: 10 },
                passes: { type: 'int', default: 4, min: 1, max: 8 }
            }
        },
        pulse: {
            name: 'Pulse Lines',
            description: 'Horizontal lines with amplitude based on darkness',
            options: {
                step_size: { type: 'float', default: 3.0, min: 1, max: 10 },
                amplitude: { type: 'float', default: 5.0, min: 1, max: 20 }
            }
        },
        squares: {
            name: 'Concentric Squares',
            description: 'Nested squares based on image brightness',
            options: {
                box_size: { type: 'float', default: 8.0, min: 2, max: 20 },
                cutoff: { type: 'int', default: 128, min: 0, max: 255 }
            }
        },
        wander: {
            name: 'Random Walk',
            description: 'Random wandering lines following dark areas',
            options: {
                step_size: { type: 'float', default: 1.0, min: 0.5, max: 5 },
                turns: { type: 'int', default: 5000, min: 100, max: 50000 }
            }
        },
        trace: {
            name: 'Trace Outline',
            description: 'Traces object outlines with optional fill pattern',
            options: {
                trace_mode: {
                    type: 'select',
                    default: 'outline',
                    label: 'Trace Mode',
                    options: [
                        { value: 'outline', label: 'Outline (Single Color)' },
                        { value: 'multicolor', label: 'Multi-Color (8 Pens)' },
                        { value: 'tricolor', label: 'Tri-Color (3 Pens)' }
                    ]
                },
                threshold: { type: 'int', default: 128, min: 0, max: 255, label: 'Edge Threshold' },
                fill_enabled: { type: 'bool', default: false, label: 'Fill Objects' },
                fill_pattern: {
                    type: 'select',
                    default: 'horizontal',
                    label: 'Fill Pattern',
                    options: [
                        { value: 'horizontal', label: 'Horizontal Lines' },
                        { value: 'vertical', label: 'Vertical Lines' },
                        { value: 'diagonal', label: 'Diagonal Lines' },
                        { value: 'crosshatch', label: 'Crosshatch' }
                    ]
                },
                fill_density: { type: 'float', default: 50, min: 10, max: 100, label: 'Fill Density (%)' }
            }
        },
        cmyk: {
            name: 'CMYK Halftone',
            description: 'Full color reproduction using CMYK separation',
            options: {
                method: {
                    type: 'select',
                    default: 'dither',
                    label: 'Halftone Method',
                    options: [
                        { value: 'dither', label: 'Floyd-Steinberg' },
                        { value: 'crosshatch', label: 'Crosshatch' },
                        { value: 'horizontal', label: 'Horizontal Lines' },
                        { value: 'dots', label: 'Dot Pattern' }
                    ]
                },
                density: { type: 'float', default: 50, min: 10, max: 100, label: 'Line Density (%)' },
                white_threshold: { type: 'int', default: 250, min: 200, max: 255, label: 'Paper White Threshold' }
            }
        }
    };
    
    listConverters() {
        return Object.entries(ImageConverter.CONVERTERS).map(([id, v]) => ({ id, ...v }));
    }
    
    // Pen colors for color trace modes
    static PEN_COLORS = {
        brown:  { r: 84, g: 69, b: 72 },
        black:  { r: 59, g: 54, b: 60 },
        blue:   { r: 89, g: 137, b: 231 },
        green:  { r: 63, g: 173, b: 169 },
        purple: { r: 101, g: 61, b: 125 },
        pink:   { r: 238, g: 155, b: 181 },
        red:    { r: 244, g: 93, b: 78 },
        orange: { r: 176, g: 100, b: 81 },
        yellow: { r: 247, g: 165, b: 21 }
    };
    
    static MULTICOLOR_PENS = ['red', 'orange', 'yellow', 'green', 'blue', 'purple', 'pink', 'brown'];
    static TRICOLOR_PENS = ['red', 'blue', 'yellow'];
    static CMYK_PENS = { cyan: 'blue', magenta: 'pink', yellow: 'yellow', black: 'black' };
    
    /**
     * Convert an image to turtle paths
     * @param {HTMLImageElement|ImageData} image - The image to convert
     * @param {string} algorithm - The conversion algorithm
     * @param {Object} options - Algorithm options
     * @returns {Turtle|Object} The generated turtle paths or multi-layer result
     */
    async convert(image, algorithm, options = {}) {
        // Get image data from canvas
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // Get work area
        const workArea = {
            left: this.settings.limit_left,
            right: this.settings.limit_right,
            top: this.settings.limit_top,
            bottom: this.settings.limit_bottom,
            width: this.settings.limit_right - this.settings.limit_left,
            height: this.settings.limit_top - this.settings.limit_bottom
        };
        
        // Calculate target size
        const imgAspect = image.width / image.height;
        const workAspect = workArea.width / workArea.height;
        
        let newWidth, newHeight;
        if (imgAspect > workAspect) {
            newWidth = Math.floor(workArea.width);
            newHeight = Math.floor(newWidth / imgAspect);
        } else {
            newHeight = Math.floor(workArea.height);
            newWidth = Math.floor(newHeight * imgAspect);
        }
        
        canvas.width = newWidth;
        canvas.height = newHeight;
        
        // Draw and get image data
        ctx.drawImage(image, 0, 0, newWidth, newHeight);
        const imageData = ctx.getImageData(0, 0, newWidth, newHeight);
        const grayData = this._toGrayscale(imageData);
        
        const offsetX = -newWidth / 2;
        const offsetY = -newHeight / 2;
        
        // For color modes (CMYK, color trace), use RGB image data
        if (algorithm === 'cmyk') {
            return this._convert_cmyk(imageData, grayData, newWidth, newHeight, offsetX, offsetY, options);
        }
        if (algorithm === 'trace' && options.trace_mode && options.trace_mode !== 'outline') {
            return this._convert_trace_color(imageData, grayData, newWidth, newHeight, offsetX, offsetY, options);
        }
        
        // Convert using selected algorithm
        const methodName = `_convert_${algorithm}`;
        if (typeof this[methodName] !== 'function') {
            throw new Error(`Unknown converter: ${algorithm}`);
        }
        
        return this[methodName](grayData, newWidth, newHeight, offsetX, offsetY, options);
    }
    
    _toGrayscale(imageData) {
        const data = imageData.data;
        const gray = new Uint8Array(imageData.width * imageData.height);
        
        for (let i = 0; i < gray.length; i++) {
            const r = data[i * 4];
            const g = data[i * 4 + 1];
            const b = data[i * 4 + 2];
            gray[i] = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
        }
        
        return gray;
    }
    
    _sample(gray, w, h, x, y, offsetX, offsetY) {
        const ix = Math.floor(x - offsetX);
        const iy = Math.floor(h - 1 - (y - offsetY));
        
        if (ix >= 0 && ix < w && iy >= 0 && iy < h) {
            return gray[iy * w + ix];
        }
        return 255;
    }
    
    _convert_spiral(gray, w, h, offsetX, offsetY, options) {
        const turtle = new Turtle();
        
        const stepSize = options.step_size || 2.0;
        const toCorners = options.to_corners || false;
        
        const cx = offsetX + w / 2;
        const cy = offsetY + h / 2;
        
        let maxR;
        if (toCorners) {
            maxR = Math.sqrt((w/2)**2 + (h/2)**2);
        } else {
            maxR = Math.min(w, h) / 2;
        }
        
        let r = maxR;
        const toolDiameter = stepSize;
        
        while (r > toolDiameter) {
            const circumference = 2 * Math.PI * r;
            const steps = Math.floor(circumference / toolDiameter);
            
            for (let i = 0; i < steps; i++) {
                const p = i / steps;
                const angle = 2 * Math.PI * p;
                const r1 = r - toolDiameter * p;
                
                const fx = Math.cos(angle) * r1;
                const fy = Math.sin(angle) * r1;
                
                const x = cx + fx;
                const y = cy + fy;
                
                const ix = Math.floor(fx + w/2);
                const iy = Math.floor(h/2 - fy);
                
                if (ix >= 0 && ix < w && iy >= 0 && iy < h) {
                    const brightness = gray[iy * w + ix];
                    const level = 128 + 64 * Math.sin(angle * 4);
                    
                    if (brightness < level) {
                        turtle.penDown();
                    } else {
                        turtle.penUpCmd();
                    }
                } else {
                    turtle.penUpCmd();
                }
                
                turtle.moveTo(x, y);
            }
            
            r -= toolDiameter;
        }
        
        return turtle;
    }
    
    _convert_crosshatch(gray, w, h, offsetX, offsetY, options) {
        const turtle = new Turtle();
        
        const stepSize = options.step_size || 2.0;
        const passes = options.passes || 4;
        const baseAngle = options.angle || 45;
        
        const maxLen = Math.sqrt(w**2 + h**2);
        
        for (let passNum = 0; passNum < passes; passNum++) {
            const angle = (baseAngle + 180 * passNum / passes) * Math.PI / 180;
            const dx = Math.cos(angle);
            const dy = Math.sin(angle);
            
            const level = 255 * (1 + passNum) / (passes + 1);
            
            for (let a = -maxLen; a < maxLen; a += stepSize) {
                const px = dx * a;
                const py = dy * a;
                
                const x0 = px - dy * maxLen + offsetX + w/2;
                const y0 = py + dx * maxLen + offsetY + h/2;
                const x1 = px + dy * maxLen + offsetX + w/2;
                const y1 = py - dx * maxLen + offsetY + h/2;
                
                this._convertAlongLine(turtle, gray, w, h, x0, y0, x1, y1, stepSize, level, offsetX, offsetY);
            }
        }
        
        return turtle;
    }
    
    _convertAlongLine(turtle, gray, w, h, x0, y0, x1, y1, stepSize, cutoff, offsetX, offsetY) {
        const dx = x1 - x0;
        const dy = y1 - y0;
        const dist = Math.sqrt(dx*dx + dy*dy);
        
        if (dist < stepSize) return;
        
        const steps = Math.floor(dist / stepSize);
        
        for (let i = 0; i <= steps; i++) {
            const t = i / steps;
            const x = x0 + dx * t;
            const y = y0 + dy * t;
            
            const brightness = this._sample(gray, w, h, x, y, offsetX, offsetY);
            
            if (brightness < cutoff) {
                if (turtle.penUp) {
                    turtle.jumpTo(x, y);
                } else {
                    turtle.moveTo(x, y);
                }
            } else {
                if (!turtle.penUp) {
                    turtle.penUpCmd();
                }
                turtle.position.x = x;
                turtle.position.y = y;
            }
        }
    }
    
    _convert_pulse(gray, w, h, offsetX, offsetY, options) {
        const turtle = new Turtle();
        
        const stepSize = options.step_size || 3.0;
        const maxAmplitude = options.amplitude || 5.0;
        
        let row = 0;
        let y = offsetY;
        
        while (y < offsetY + h) {
            let xRange;
            if (row % 2 === 0) {
                xRange = [];
                for (let x = offsetX; x < offsetX + w; x++) xRange.push(x);
            } else {
                xRange = [];
                for (let x = offsetX + w; x > offsetX; x--) xRange.push(x);
            }
            
            let first = true;
            for (const x of xRange) {
                const ix = Math.floor(x - offsetX);
                const iy = Math.floor(h - 1 - (y - offsetY));
                
                if (ix >= 0 && ix < w && iy >= 0 && iy < h) {
                    const brightness = gray[iy * w + ix];
                    const amplitude = maxAmplitude * (255 - brightness) / 255;
                    const wave = Math.sin(x * 0.5) * amplitude;
                    const py = y + wave;
                    
                    if (first) {
                        turtle.jumpTo(x, py);
                        first = false;
                    } else {
                        turtle.moveTo(x, py);
                    }
                }
            }
            
            y += stepSize;
            row++;
        }
        
        return turtle;
    }
    
    _convert_squares(gray, w, h, offsetX, offsetY, options) {
        const turtle = new Turtle();
        
        const boxSize = options.box_size || 8.0;
        const cutoff = options.cutoff || 128;
        
        const halfBox = boxSize / 2;
        
        let y = offsetY + halfBox;
        let row = 0;
        
        while (y < offsetY + h - halfBox) {
            let xIter;
            if (row % 2 === 0) {
                xIter = [];
                for (let x = offsetX + halfBox; x < offsetX + w - halfBox; x += boxSize) xIter.push(x);
            } else {
                xIter = [];
                for (let x = offsetX + w - halfBox; x > offsetX + halfBox; x -= boxSize) xIter.push(x);
            }
            
            for (const x of xIter) {
                const brightness = this._sample(gray, w, h, x, y, offsetX, offsetY);
                
                if (brightness < cutoff) {
                    const size = halfBox * (cutoff - brightness) / cutoff;
                    
                    if (size > 0.5) {
                        turtle.jumpTo(x - size, y - size);
                        turtle.moveTo(x + size, y - size);
                        turtle.moveTo(x + size, y + size);
                        turtle.moveTo(x - size, y + size);
                        turtle.moveTo(x - size, y - size);
                    }
                }
            }
            
            y += boxSize;
            row++;
        }
        
        return turtle;
    }
    
    _convert_wander(gray, w, h, offsetX, offsetY, options) {
        const turtle = new Turtle();
        
        const stepSize = options.step_size || 1.0;
        const maxTurns = options.turns || 5000;
        
        let x = offsetX + w / 2;
        let y = offsetY + h / 2;
        let angle = Math.random() * 2 * Math.PI;
        
        turtle.jumpTo(x, y);
        
        for (let i = 0; i < maxTurns; i++) {
            const brightness = this._sample(gray, w, h, x, y, offsetX, offsetY);
            
            const turnAmount = (brightness / 255.0) * Math.PI / 2;
            angle += (Math.random() - 0.5) * turnAmount;
            
            let nx = x + Math.cos(angle) * stepSize;
            let ny = y + Math.sin(angle) * stepSize;
            
            if (nx < offsetX || nx > offsetX + w) {
                angle = Math.PI - angle;
                nx = x + Math.cos(angle) * stepSize;
            }
            if (ny < offsetY || ny > offsetY + h) {
                angle = -angle;
                ny = y + Math.sin(angle) * stepSize;
            }
            
            x = nx;
            y = ny;
            
            if (this._sample(gray, w, h, x, y, offsetX, offsetY) < 200) {
                if (turtle.penUp) {
                    turtle.jumpTo(x, y);
                } else {
                    turtle.moveTo(x, y);
                }
            } else {
                turtle.penUpCmd();
                turtle.position.x = x;
                turtle.position.y = y;
            }
        }
        
        return turtle;
    }
    
    _convert_trace(gray, w, h, offsetX, offsetY, options) {
        const turtle = new Turtle();
        
        const threshold = options.threshold || 128;
        const fillEnabled = options.fill_enabled || false;
        const fillPattern = options.fill_pattern || 'horizontal';
        const fillDensity = options.fill_density || 50;
        
        // Create binary mask (objects are dark areas)
        const binary = new Uint8Array(w * h);
        for (let i = 0; i < gray.length; i++) {
            binary[i] = gray[i] < threshold ? 1 : 0;
        }
        
        // Draw outline using edge-following scan lines (no cross-gap connections)
        this._drawOutlineSegments(turtle, binary, w, h, offsetX, offsetY);
        
        // Fill if enabled
        if (fillEnabled) {
            this._fillShape(turtle, binary, w, h, offsetX, offsetY, fillPattern, fillDensity);
        }
        
        return turtle;
    }
    
    _isEdgePixel(binary, x, y, w, h) {
        if (binary[y * w + x] !== 1) return false;
        
        // Check 4-connectivity neighbors
        const neighbors = [[1, 0], [-1, 0], [0, 1], [0, -1]];
        for (const [dx, dy] of neighbors) {
            const nx = x + dx;
            const ny = y + dy;
            if (nx < 0 || nx >= w || ny < 0 || ny >= h || binary[ny * w + nx] === 0) {
                return true;
            }
        }
        return false;
    }
    
    _drawOutlineSegments(turtle, binary, w, h, offsetX, offsetY) {
        // Draw horizontal edge segments
        for (let row = 0; row < h; row++) {
            let inEdge = false;
            let startX = null;
            
            for (let col = 0; col < w; col++) {
                const isEdge = this._isEdgePixel(binary, col, row, w, h);
                
                if (isEdge) {
                    if (!inEdge) {
                        inEdge = true;
                        startX = col;
                    }
                } else {
                    if (inEdge) {
                        // Draw segment from startX to col-1
                        const x1 = startX + offsetX;
                        const x2 = (col - 1) + offsetX;
                        const y = (h - 1 - row) + offsetY;
                        
                        if (x2 > x1) {
                            turtle.jumpTo(x1, y);
                            turtle.moveTo(x2, y);
                        }
                        inEdge = false;
                    }
                }
            }
            
            if (inEdge) {
                const x1 = startX + offsetX;
                const x2 = (w - 1) + offsetX;
                const y = (h - 1 - row) + offsetY;
                if (x2 > x1) {
                    turtle.jumpTo(x1, y);
                    turtle.moveTo(x2, y);
                }
            }
        }
        
        // Draw vertical edge segments
        for (let col = 0; col < w; col++) {
            let inEdge = false;
            let startY = null;
            
            for (let row = 0; row < h; row++) {
                const isEdge = this._isEdgePixel(binary, col, row, w, h);
                
                if (isEdge) {
                    if (!inEdge) {
                        inEdge = true;
                        startY = row;
                    }
                } else {
                    if (inEdge) {
                        const x = col + offsetX;
                        const y1 = (h - 1 - startY) + offsetY;
                        const y2 = (h - 1 - (row - 1)) + offsetY;
                        
                        if (Math.abs(y2 - y1) > 1) {
                            turtle.jumpTo(x, y1);
                            turtle.moveTo(x, y2);
                        }
                        inEdge = false;
                    }
                }
            }
            
            if (inEdge) {
                const x = col + offsetX;
                const y1 = (h - 1 - startY) + offsetY;
                const y2 = offsetY;
                if (Math.abs(y2 - y1) > 1) {
                    turtle.jumpTo(x, y1);
                    turtle.moveTo(x, y2);
                }
            }
        }
    }
    
    _fillShape(turtle, binary, w, h, offsetX, offsetY, pattern, density) {
        // Calculate line spacing based on density
        const spacing = Math.max(2, Math.floor(100 / density * 3));
        
        if (pattern === 'horizontal') {
            this._fillHorizontal(turtle, binary, w, h, offsetX, offsetY, spacing);
        } else if (pattern === 'vertical') {
            this._fillVertical(turtle, binary, w, h, offsetX, offsetY, spacing);
        } else if (pattern === 'diagonal') {
            this._fillDiagonal(turtle, binary, w, h, offsetX, offsetY, spacing);
        } else if (pattern === 'crosshatch') {
            this._fillHorizontal(turtle, binary, w, h, offsetX, offsetY, spacing);
            this._fillVertical(turtle, binary, w, h, offsetX, offsetY, spacing);
        }
    }
    
    _fillHorizontal(turtle, binary, w, h, offsetX, offsetY, spacing) {
        for (let row = 0; row < h; row += spacing) {
            // Collect all segments in this row
            let inShape = false;
            let startX = null;
            
            for (let col = 0; col < w; col++) {
                if (binary[row * w + col] === 1) {
                    if (!inShape) {
                        inShape = true;
                        startX = col;
                    }
                } else {
                    if (inShape) {
                        // End of a segment - draw it
                        const x1 = startX + offsetX;
                        const x2 = (col - 1) + offsetX;
                        const y = (h - 1 - row) + offsetY;
                        
                        if (x2 > x1) {
                            turtle.jumpTo(x1, y);
                            turtle.moveTo(x2, y);
                        }
                        inShape = false;
                    }
                }
            }
            
            // Handle segment ending at edge
            if (inShape) {
                const x1 = startX + offsetX;
                const x2 = (w - 1) + offsetX;
                const y = (h - 1 - row) + offsetY;
                if (x2 > x1) {
                    turtle.jumpTo(x1, y);
                    turtle.moveTo(x2, y);
                }
            }
        }
    }
    
    _fillVertical(turtle, binary, w, h, offsetX, offsetY, spacing) {
        for (let col = 0; col < w; col += spacing) {
            let inShape = false;
            let startY = null;
            
            for (let row = 0; row < h; row++) {
                if (binary[row * w + col] === 1) {
                    if (!inShape) {
                        inShape = true;
                        startY = row;
                    }
                } else {
                    if (inShape) {
                        // End of segment - draw it
                        const x = col + offsetX;
                        const y1 = (h - 1 - startY) + offsetY;
                        const y2 = (h - 1 - (row - 1)) + offsetY;
                        
                        if (Math.abs(y2 - y1) > 1) {
                            turtle.jumpTo(x, y1);
                            turtle.moveTo(x, y2);
                        }
                        inShape = false;
                    }
                }
            }
            
            if (inShape) {
                const x = col + offsetX;
                const y1 = (h - 1 - startY) + offsetY;
                const y2 = offsetY;
                if (Math.abs(y2 - y1) > 1) {
                    turtle.jumpTo(x, y1);
                    turtle.moveTo(x, y2);
                }
            }
        }
    }
    
    _fillDiagonal(turtle, binary, w, h, offsetX, offsetY, spacing) {
        const angle = 45;
        const rad = angle * Math.PI / 180;
        const cosA = Math.cos(rad);
        const sinA = Math.sin(rad);
        
        const maxDist = Math.floor(Math.sqrt(w * w + h * h));
        
        for (let d = -maxDist; d < maxDist; d += spacing) {
            let inShape = false;
            let startPt = null;
            let lastValidPt = null;
            
            for (let t = -maxDist; t < maxDist; t++) {
                const px = Math.floor(d * cosA - t * sinA + w / 2);
                const py = Math.floor(d * sinA + t * cosA + h / 2);
                
                if (px >= 0 && px < w && py >= 0 && py < h) {
                    if (binary[py * w + px] === 1) {
                        if (!inShape) {
                            inShape = true;
                            startPt = [px, py];
                        }
                        lastValidPt = [px, py];
                    } else {
                        if (inShape && startPt && lastValidPt) {
                            // Draw segment
                            const [x1, y1] = startPt;
                            const [x2, y2] = lastValidPt;
                            const dx1 = x1 + offsetX;
                            const dy1 = (h - 1 - y1) + offsetY;
                            const dx2 = x2 + offsetX;
                            const dy2 = (h - 1 - y2) + offsetY;
                            
                            if (Math.abs(dx2 - dx1) > 1 || Math.abs(dy2 - dy1) > 1) {
                                turtle.jumpTo(dx1, dy1);
                                turtle.moveTo(dx2, dy2);
                            }
                        }
                        inShape = false;
                        startPt = null;
                        lastValidPt = null;
                    }
                } else {
                    if (inShape && startPt && lastValidPt) {
                        const [x1, y1] = startPt;
                        const [x2, y2] = lastValidPt;
                        const dx1 = x1 + offsetX;
                        const dy1 = (h - 1 - y1) + offsetY;
                        const dx2 = x2 + offsetX;
                        const dy2 = (h - 1 - y2) + offsetY;
                        
                        if (Math.abs(dx2 - dx1) > 1 || Math.abs(dy2 - dy1) > 1) {
                            turtle.jumpTo(dx1, dy1);
                            turtle.moveTo(dx2, dy2);
                        }
                    }
                    inShape = false;
                    startPt = null;
                    lastValidPt = null;
                }
            }
            
            // Handle segment at end
            if (inShape && startPt && lastValidPt) {
                const [x1, y1] = startPt;
                const [x2, y2] = lastValidPt;
                const dx1 = x1 + offsetX;
                const dy1 = (h - 1 - y1) + offsetY;
                const dx2 = x2 + offsetX;
                const dy2 = (h - 1 - y2) + offsetY;
                
                if (Math.abs(dx2 - dx1) > 1 || Math.abs(dy2 - dy1) > 1) {
                    turtle.jumpTo(dx1, dy1);
                    turtle.moveTo(dx2, dy2);
                }
            }
        }
    }
    
    // =========================================================================
    // Color Trace Methods (Multi-layer output)
    // =========================================================================
    
    _convert_trace_color(imageData, gray, w, h, offsetX, offsetY, options) {
        const traceMode = options.trace_mode || 'multicolor';
        const threshold = options.threshold || 128;
        const fillEnabled = options.fill_enabled || false;
        const fillPattern = options.fill_pattern || 'horizontal';
        const fillDensity = options.fill_density || 50;
        
        if (traceMode === 'multicolor') {
            return this._traceMulticolor(imageData, gray, w, h, offsetX, offsetY,
                                         threshold, fillEnabled, fillPattern, fillDensity);
        } else if (traceMode === 'tricolor') {
            return this._traceTricolor(imageData, gray, w, h, offsetX, offsetY,
                                       threshold, fillEnabled, fillPattern, fillDensity);
        } else if (traceMode === 'cmyk_dither') {
            return this._traceCmykDither(imageData, gray, w, h, offsetX, offsetY,
                                         threshold, fillDensity);
        } else if (traceMode === 'cmyk_crosshatch') {
            return this._traceCmykCrosshatch(imageData, gray, w, h, offsetX, offsetY,
                                             threshold, fillDensity);
        }
        
        // Fallback to outline
        return this._convert_trace(gray, w, h, offsetX, offsetY, options);
    }
    
    _findClosestPen(r, g, b, penList) {
        let minDist = Infinity;
        let closest = penList[0];
        
        for (const pen of penList) {
            const pc = ImageConverter.PEN_COLORS[pen];
            const dist = (r - pc.r)**2 + (g - pc.g)**2 + (b - pc.b)**2;
            if (dist < minDist) {
                minDist = dist;
                closest = pen;
            }
        }
        
        return closest;
    }
    
    _rgbToCmyk(r, g, b) {
        const rNorm = r / 255;
        const gNorm = g / 255;
        const bNorm = b / 255;
        
        const k = 1 - Math.max(rNorm, gNorm, bNorm);
        if (k === 1) return { c: 0, m: 0, y: 0, k: 1 };
        
        const c = (1 - rNorm - k) / (1 - k);
        const m = (1 - gNorm - k) / (1 - k);
        const y = (1 - bNorm - k) / (1 - k);
        
        return { c, m, y, k };
    }
    
    _isWhitePixel(r, g, b, threshold = 240) {
        // Check if pixel is close to white (paper background)
        return r >= threshold && g >= threshold && b >= threshold;
    }
    
    _traceMulticolor(imageData, gray, w, h, offsetX, offsetY,
                     threshold, fillEnabled, fillPattern, fillDensity) {
        const data = imageData.data;
        const whiteThresh = Math.max(threshold, 240);
        
        // Create mask for each color
        const colorMasks = {};
        for (const pen of ImageConverter.MULTICOLOR_PENS) {
            colorMasks[pen] = new Uint8Array(w * h);
        }
        
        // Assign each pixel to closest pen color
        for (let row = 0; row < h; row++) {
            for (let col = 0; col < w; col++) {
                const idx = (row * w + col) * 4;
                const r = data[idx];
                const g = data[idx + 1];
                const b = data[idx + 2];
                
                // Skip white/near-white pixels (paper background)
                if (this._isWhitePixel(r, g, b, whiteThresh)) continue;
                
                const closest = this._findClosestPen(r, g, b, ImageConverter.MULTICOLOR_PENS);
                colorMasks[closest][row * w + col] = 1;
            }
        }
        
        // Create layers
        const layers = [];
        for (const pen of ImageConverter.MULTICOLOR_PENS) {
            const mask = colorMasks[pen];
            if (!mask.some(v => v === 1)) continue;
            
            const turtle = new Turtle();
            
            // Reshape mask for outline drawing
            this._drawOutlineFromMask(turtle, mask, w, h, offsetX, offsetY);
            
            if (fillEnabled) {
                this._fillFromMask(turtle, mask, w, h, offsetX, offsetY, fillPattern, fillDensity);
            }
            
            if (turtle.getPaths().length > 0) {
                layers.push({
                    name: `Trace (${pen.charAt(0).toUpperCase() + pen.slice(1)})`,
                    color: pen,
                    turtle: turtle
                });
            }
        }
        
        return { multiLayer: true, layers };
    }
    
    _traceTricolor(imageData, gray, w, h, offsetX, offsetY,
                   threshold, fillEnabled, fillPattern, fillDensity) {
        const data = imageData.data;
        const whiteThresh = Math.max(threshold, 240);
        
        const colorMasks = {};
        for (const pen of ImageConverter.TRICOLOR_PENS) {
            colorMasks[pen] = new Uint8Array(w * h);
        }
        
        for (let row = 0; row < h; row++) {
            for (let col = 0; col < w; col++) {
                const idx = (row * w + col) * 4;
                const r = data[idx];
                const g = data[idx + 1];
                const b = data[idx + 2];
                
                // Skip white/near-white pixels (paper background)
                if (this._isWhitePixel(r, g, b, whiteThresh)) continue;
                
                const closest = this._findClosestPen(r, g, b, ImageConverter.TRICOLOR_PENS);
                colorMasks[closest][row * w + col] = 1;
            }
        }
        
        const layers = [];
        for (const pen of ImageConverter.TRICOLOR_PENS) {
            const mask = colorMasks[pen];
            if (!mask.some(v => v === 1)) continue;
            
            const turtle = new Turtle();
            this._drawOutlineFromMask(turtle, mask, w, h, offsetX, offsetY);
            
            if (fillEnabled) {
                this._fillFromMask(turtle, mask, w, h, offsetX, offsetY, fillPattern, fillDensity);
            }
            
            if (turtle.getPaths().length > 0) {
                layers.push({
                    name: `Trace (${pen.charAt(0).toUpperCase() + pen.slice(1)})`,
                    color: pen,
                    turtle: turtle
                });
            }
        }
        
        return { multiLayer: true, layers };
    }
    
    _traceCmykDither(imageData, gray, w, h, offsetX, offsetY, threshold, fillDensity) {
        const data = imageData.data;
        const whiteThresh = Math.max(threshold, 240);
        
        // Convert to CMYK channels
        const cmyk = {
            cyan: new Float32Array(w * h),
            magenta: new Float32Array(w * h),
            yellow: new Float32Array(w * h),
            black: new Float32Array(w * h)
        };
        
        for (let row = 0; row < h; row++) {
            for (let col = 0; col < w; col++) {
                const idx = (row * w + col) * 4;
                const r = data[idx];
                const g = data[idx + 1];
                const b = data[idx + 2];
                
                // Skip white/near-white pixels (paper background)
                if (this._isWhitePixel(r, g, b, whiteThresh)) continue;
                
                const { c, m, y, k } = this._rgbToCmyk(r, g, b);
                const i = row * w + col;
                cmyk.cyan[i] = c;
                cmyk.magenta[i] = m;
                cmyk.yellow[i] = y;
                cmyk.black[i] = k;
            }
        }
        
        // Apply Floyd-Steinberg dithering to each channel
        const dithered = {};
        for (const channel of ['cyan', 'magenta', 'yellow', 'black']) {
            dithered[channel] = this._floydSteinbergDither(cmyk[channel], w, h);
        }
        
        const spacing = Math.max(2, Math.floor(100 / fillDensity * 3));
        
        const layers = [];
        for (const [cmykChannel, pen] of Object.entries(ImageConverter.CMYK_PENS)) {
            const mask = dithered[cmykChannel];
            if (!mask.some(v => v === 1)) continue;
            
            const turtle = new Turtle();
            
            // Draw horizontal segments
            for (let row = 0; row < h; row += spacing) {
                let inSegment = false;
                let startX = null;
                
                for (let col = 0; col < w; col++) {
                    if (mask[row * w + col] === 1) {
                        if (!inSegment) {
                            inSegment = true;
                            startX = col;
                        }
                    } else {
                        if (inSegment) {
                            const x1 = startX + offsetX;
                            const x2 = (col - 1) + offsetX;
                            const y = (h - 1 - row) + offsetY;
                            if (x2 > x1) {
                                turtle.jumpTo(x1, y);
                                turtle.moveTo(x2, y);
                            }
                            inSegment = false;
                        }
                    }
                }
                
                if (inSegment) {
                    const x1 = startX + offsetX;
                    const x2 = (w - 1) + offsetX;
                    const y = (h - 1 - row) + offsetY;
                    if (x2 > x1) {
                        turtle.jumpTo(x1, y);
                        turtle.moveTo(x2, y);
                    }
                }
            }
            
            if (turtle.getPaths().length > 0) {
                layers.push({
                    name: `CMYK (${cmykChannel.charAt(0).toUpperCase() + cmykChannel.slice(1)})`,
                    color: pen,
                    turtle: turtle
                });
            }
        }
        
        return { multiLayer: true, layers };
    }
    
    _floydSteinbergDither(channel, w, h) {
        const result = new Uint8Array(w * h);
        const data = new Float32Array(channel);
        
        for (let row = 0; row < h; row++) {
            for (let col = 0; col < w; col++) {
                const i = row * w + col;
                const oldVal = data[i];
                const newVal = oldVal > 0.5 ? 1 : 0;
                result[i] = newVal;
                const error = oldVal - newVal;
                
                if (col + 1 < w) data[i + 1] += error * 7 / 16;
                if (row + 1 < h) {
                    if (col > 0) data[(row + 1) * w + col - 1] += error * 3 / 16;
                    data[(row + 1) * w + col] += error * 5 / 16;
                    if (col + 1 < w) data[(row + 1) * w + col + 1] += error * 1 / 16;
                }
            }
        }
        
        return result;
    }
    
    _traceCmykCrosshatch(imageData, gray, w, h, offsetX, offsetY, threshold, fillDensity) {
        const data = imageData.data;
        const whiteThresh = Math.max(threshold, 240);
        
        // Convert to CMYK channels
        const cmyk = {
            cyan: new Float32Array(w * h),
            magenta: new Float32Array(w * h),
            yellow: new Float32Array(w * h),
            black: new Float32Array(w * h)
        };
        
        for (let row = 0; row < h; row++) {
            for (let col = 0; col < w; col++) {
                const idx = (row * w + col) * 4;
                const r = data[idx];
                const g = data[idx + 1];
                const b = data[idx + 2];
                
                // Skip white/near-white pixels (paper background)
                if (this._isWhitePixel(r, g, b, whiteThresh)) continue;
                
                const { c, m, y, k } = this._rgbToCmyk(r, g, b);
                const i = row * w + col;
                cmyk.cyan[i] = c;
                cmyk.magenta[i] = m;
                cmyk.yellow[i] = y;
                cmyk.black[i] = k;
            }
        }
        
        const baseSpacing = Math.max(3, Math.floor(100 / fillDensity * 4));
        const angles = { cyan: 15, magenta: 75, yellow: 0, black: 45 };
        
        const layers = [];
        for (const [cmykChannel, pen] of Object.entries(ImageConverter.CMYK_PENS)) {
            const channelData = cmyk[cmykChannel];
            
            // Skip only if channel is completely empty
            let maxVal = 0;
            for (let i = 0; i < channelData.length; i++) {
                if (channelData[i] > maxVal) maxVal = channelData[i];
            }
            if (maxVal < 0.001) continue;
            
            const turtle = new Turtle();
            const angle = angles[cmykChannel];
            
            this._drawIntensityCrosshatch(turtle, channelData, w, h, offsetX, offsetY, baseSpacing, angle);
            
            if (turtle.getPaths().length > 0) {
                layers.push({
                    name: `CMYK (${cmykChannel.charAt(0).toUpperCase() + cmykChannel.slice(1)})`,
                    color: pen,
                    turtle: turtle
                });
            }
        }
        
        return { multiLayer: true, layers };
    }
    
    _drawIntensityCrosshatch(turtle, intensity, w, h, offsetX, offsetY, baseSpacing, angle) {
        const rad = angle * Math.PI / 180;
        const cosA = Math.cos(rad);
        const sinA = Math.sin(rad);
        
        const maxDist = Math.floor(Math.sqrt(w * w + h * h));
        
        // 4x4 ordered dithering matrix (Bayer) for proper halftone effect
        const ditherMatrix = [
            [0.0, 0.5, 0.125, 0.625],
            [0.75, 0.25, 0.875, 0.375],
            [0.1875, 0.6875, 0.0625, 0.5625],
            [0.9375, 0.4375, 0.8125, 0.3125]
        ];
        
        for (let d = -maxDist; d < maxDist; d += baseSpacing) {
            let inSegment = false;
            let startPt = null;
            let lastPt = null;
            
            for (let t = -maxDist; t < maxDist; t++) {
                const px = Math.floor(d * cosA - t * sinA + w / 2);
                const py = Math.floor(d * sinA + t * cosA + h / 2);
                
                if (px >= 0 && px < w && py >= 0 && py < h) {
                    const ink = intensity[py * w + px];
                    // Use ordered dithering - even low ink values get some representation
                    const threshold = ditherMatrix[py % 4][px % 4];
                    const draw = ink > threshold;
                    
                    if (draw) {
                        if (!inSegment) {
                            inSegment = true;
                            startPt = [px, py];
                        }
                        lastPt = [px, py];
                    } else {
                        if (inSegment && startPt && lastPt) {
                            const [x1, y1] = startPt;
                            const [x2, y2] = lastPt;
                            const dx1 = x1 + offsetX;
                            const dy1 = (h - 1 - y1) + offsetY;
                            const dx2 = x2 + offsetX;
                            const dy2 = (h - 1 - y2) + offsetY;
                            
                            if (Math.abs(dx2 - dx1) > 1 || Math.abs(dy2 - dy1) > 1) {
                                turtle.jumpTo(dx1, dy1);
                                turtle.moveTo(dx2, dy2);
                            }
                        }
                        inSegment = false;
                        startPt = null;
                        lastPt = null;
                    }
                } else {
                    if (inSegment && startPt && lastPt) {
                        const [x1, y1] = startPt;
                        const [x2, y2] = lastPt;
                        const dx1 = x1 + offsetX;
                        const dy1 = (h - 1 - y1) + offsetY;
                        const dx2 = x2 + offsetX;
                        const dy2 = (h - 1 - y2) + offsetY;
                        
                        if (Math.abs(dx2 - dx1) > 1 || Math.abs(dy2 - dy1) > 1) {
                            turtle.jumpTo(dx1, dy1);
                            turtle.moveTo(dx2, dy2);
                        }
                    }
                    inSegment = false;
                    startPt = null;
                    lastPt = null;
                }
            }
            
            if (inSegment && startPt && lastPt) {
                const [x1, y1] = startPt;
                const [x2, y2] = lastPt;
                const dx1 = x1 + offsetX;
                const dy1 = (h - 1 - y1) + offsetY;
                const dx2 = x2 + offsetX;
                const dy2 = (h - 1 - y2) + offsetY;
                
                if (Math.abs(dx2 - dx1) > 1 || Math.abs(dy2 - dy1) > 1) {
                    turtle.jumpTo(dx1, dy1);
                    turtle.moveTo(dx2, dy2);
                }
            }
        }
    }
    
    _drawOutlineFromMask(turtle, mask, w, h, offsetX, offsetY) {
        // Helper to check if pixel is edge
        const isEdge = (col, row) => {
            if (mask[row * w + col] !== 1) return false;
            const neighbors = [[1, 0], [-1, 0], [0, 1], [0, -1]];
            for (const [dx, dy] of neighbors) {
                const nx = col + dx;
                const ny = row + dy;
                if (nx < 0 || nx >= w || ny < 0 || ny >= h || mask[ny * w + nx] === 0) {
                    return true;
                }
            }
            return false;
        };
        
        // Draw horizontal segments
        for (let row = 0; row < h; row++) {
            let inEdge = false;
            let startX = null;
            
            for (let col = 0; col < w; col++) {
                if (isEdge(col, row)) {
                    if (!inEdge) {
                        inEdge = true;
                        startX = col;
                    }
                } else {
                    if (inEdge) {
                        const x1 = startX + offsetX;
                        const x2 = (col - 1) + offsetX;
                        const y = (h - 1 - row) + offsetY;
                        if (x2 > x1) {
                            turtle.jumpTo(x1, y);
                            turtle.moveTo(x2, y);
                        }
                        inEdge = false;
                    }
                }
            }
            
            if (inEdge) {
                const x1 = startX + offsetX;
                const x2 = (w - 1) + offsetX;
                const y = (h - 1 - row) + offsetY;
                if (x2 > x1) {
                    turtle.jumpTo(x1, y);
                    turtle.moveTo(x2, y);
                }
            }
        }
        
        // Draw vertical segments
        for (let col = 0; col < w; col++) {
            let inEdge = false;
            let startY = null;
            
            for (let row = 0; row < h; row++) {
                if (isEdge(col, row)) {
                    if (!inEdge) {
                        inEdge = true;
                        startY = row;
                    }
                } else {
                    if (inEdge) {
                        const x = col + offsetX;
                        const y1 = (h - 1 - startY) + offsetY;
                        const y2 = (h - 1 - (row - 1)) + offsetY;
                        if (Math.abs(y2 - y1) > 1) {
                            turtle.jumpTo(x, y1);
                            turtle.moveTo(x, y2);
                        }
                        inEdge = false;
                    }
                }
            }
            
            if (inEdge) {
                const x = col + offsetX;
                const y1 = (h - 1 - startY) + offsetY;
                const y2 = offsetY;
                if (Math.abs(y2 - y1) > 1) {
                    turtle.jumpTo(x, y1);
                    turtle.moveTo(x, y2);
                }
            }
        }
    }
    
    _fillFromMask(turtle, mask, w, h, offsetX, offsetY, pattern, density) {
        const spacing = Math.max(2, Math.floor(100 / density * 3));
        
        if (pattern === 'horizontal' || pattern === 'crosshatch') {
            for (let row = 0; row < h; row += spacing) {
                let inShape = false;
                let startX = null;
                
                for (let col = 0; col < w; col++) {
                    if (mask[row * w + col] === 1) {
                        if (!inShape) {
                            inShape = true;
                            startX = col;
                        }
                    } else {
                        if (inShape) {
                            const x1 = startX + offsetX;
                            const x2 = (col - 1) + offsetX;
                            const y = (h - 1 - row) + offsetY;
                            if (x2 > x1) {
                                turtle.jumpTo(x1, y);
                                turtle.moveTo(x2, y);
                            }
                            inShape = false;
                        }
                    }
                }
                
                if (inShape) {
                    const x1 = startX + offsetX;
                    const x2 = (w - 1) + offsetX;
                    const y = (h - 1 - row) + offsetY;
                    if (x2 > x1) {
                        turtle.jumpTo(x1, y);
                        turtle.moveTo(x2, y);
                    }
                }
            }
        }
        
        if (pattern === 'vertical' || pattern === 'crosshatch') {
            for (let col = 0; col < w; col += spacing) {
                let inShape = false;
                let startY = null;
                
                for (let row = 0; row < h; row++) {
                    if (mask[row * w + col] === 1) {
                        if (!inShape) {
                            inShape = true;
                            startY = row;
                        }
                    } else {
                        if (inShape) {
                            const x = col + offsetX;
                            const y1 = (h - 1 - startY) + offsetY;
                            const y2 = (h - 1 - (row - 1)) + offsetY;
                            if (Math.abs(y2 - y1) > 1) {
                                turtle.jumpTo(x, y1);
                                turtle.moveTo(x, y2);
                            }
                            inShape = false;
                        }
                    }
                }
                
                if (inShape) {
                    const x = col + offsetX;
                    const y1 = (h - 1 - startY) + offsetY;
                    const y2 = offsetY;
                    if (Math.abs(y2 - y1) > 1) {
                        turtle.jumpTo(x, y1);
                        turtle.moveTo(x, y2);
                    }
                }
            }
        }
        
        if (pattern === 'diagonal') {
            // Simplified diagonal fill
            const maxDist = Math.floor(Math.sqrt(w * w + h * h));
            const angle = 45 * Math.PI / 180;
            const cosA = Math.cos(angle);
            const sinA = Math.sin(angle);
            
            for (let d = -maxDist; d < maxDist; d += spacing) {
                let inShape = false;
                let startPt = null;
                let lastPt = null;
                
                for (let t = -maxDist; t < maxDist; t++) {
                    const px = Math.floor(d * cosA - t * sinA + w / 2);
                    const py = Math.floor(d * sinA + t * cosA + h / 2);
                    
                    if (px >= 0 && px < w && py >= 0 && py < h) {
                        if (mask[py * w + px] === 1) {
                            if (!inShape) {
                                inShape = true;
                                startPt = [px, py];
                            }
                            lastPt = [px, py];
                        } else {
                            if (inShape && startPt && lastPt) {
                                const [x1, y1] = startPt;
                                const [x2, y2] = lastPt;
                                const dx1 = x1 + offsetX;
                                const dy1 = (h - 1 - y1) + offsetY;
                                const dx2 = x2 + offsetX;
                                const dy2 = (h - 1 - y2) + offsetY;
                                
                                if (Math.abs(dx2 - dx1) > 1 || Math.abs(dy2 - dy1) > 1) {
                                    turtle.jumpTo(dx1, dy1);
                                    turtle.moveTo(dx2, dy2);
                                }
                            }
                            inShape = false;
                            startPt = null;
                            lastPt = null;
                        }
                    }
                }
                
                if (inShape && startPt && lastPt) {
                    const [x1, y1] = startPt;
                    const [x2, y2] = lastPt;
                    const dx1 = x1 + offsetX;
                    const dy1 = (h - 1 - y1) + offsetY;
                    const dx2 = x2 + offsetX;
                    const dy2 = (h - 1 - y2) + offsetY;
                    
                    if (Math.abs(dx2 - dx1) > 1 || Math.abs(dy2 - dy1) > 1) {
                        turtle.jumpTo(dx1, dy1);
                        turtle.moveTo(dx2, dy2);
                    }
                }
            }
        }
    }
    
    // =========================================================================
    // Full Image CMYK Converter
    // =========================================================================
    
    _convert_cmyk(imageData, gray, w, h, offsetX, offsetY, options) {
        const data = imageData.data;
        const method = options.method || 'dither';
        const density = options.density || 50;
        const whiteThresh = options.white_threshold || 250;
        
        // Convert entire image to CMYK (flip Y to correct orientation)
        const cmyk = {
            cyan: new Float32Array(w * h),
            magenta: new Float32Array(w * h),
            yellow: new Float32Array(w * h),
            black: new Float32Array(w * h)
        };
        
        for (let row = 0; row < h; row++) {
            // Flip vertically: image row 0 = top, but we draw y+ = up
            const srcRow = h - 1 - row;
            for (let col = 0; col < w; col++) {
                const idx = (srcRow * w + col) * 4;
                const r = data[idx];
                const g = data[idx + 1];
                const b = data[idx + 2];
                
                // Skip pure white (paper)
                if (r >= whiteThresh && g >= whiteThresh && b >= whiteThresh) continue;
                
                const { c, m, y, k } = this._rgbToCmyk(r, g, b);
                const i = row * w + col;
                cmyk.cyan[i] = c;
                cmyk.magenta[i] = m;
                cmyk.yellow[i] = y;
                cmyk.black[i] = k;
            }
        }
        
        // Route to appropriate method
        if (method === 'dither') {
            return this._cmykDither(cmyk, w, h, offsetX, offsetY, density);
        } else if (method === 'crosshatch') {
            return this._cmykCrosshatch(cmyk, w, h, offsetX, offsetY, density);
        } else if (method === 'horizontal') {
            return this._cmykHorizontal(cmyk, w, h, offsetX, offsetY, density);
        } else if (method === 'dots') {
            return this._cmykDots(cmyk, w, h, offsetX, offsetY, density);
        } else {
            return this._cmykDither(cmyk, w, h, offsetX, offsetY, density);
        }
    }
    
    _cmykDither(cmyk, w, h, offsetX, offsetY, density) {
        const dithered = {};
        for (const channel of ['cyan', 'magenta', 'yellow', 'black']) {
            dithered[channel] = this._floydSteinbergDither(cmyk[channel], w, h);
        }
        
        const spacing = Math.max(1, Math.floor(100 / density * 2));
        const layers = [];
        
        for (const [cmykChannel, pen] of Object.entries(ImageConverter.CMYK_PENS)) {
            const mask = dithered[cmykChannel];
            if (!mask.some(v => v === 1)) continue;
            
            const turtle = new Turtle();
            
            for (let row = 0; row < h; row += spacing) {
                let inSegment = false;
                let startX = null;
                
                for (let col = 0; col < w; col++) {
                    if (mask[row * w + col] === 1) {
                        if (!inSegment) {
                            inSegment = true;
                            startX = col;
                        }
                    } else {
                        if (inSegment) {
                            const x1 = startX + offsetX;
                            const x2 = (col - 1) + offsetX;
                            const y = row + offsetY;
                            if (x2 >= x1) {
                                turtle.jumpTo(x1, y);
                                turtle.moveTo(x2, y);
                            }
                            inSegment = false;
                        }
                    }
                }
                
                if (inSegment) {
                    const x1 = startX + offsetX;
                    const x2 = (w - 1) + offsetX;
                    const y = row + offsetY;
                    if (x2 >= x1) {
                        turtle.jumpTo(x1, y);
                        turtle.moveTo(x2, y);
                    }
                }
            }
            
            if (turtle.getPaths().length > 0) {
                layers.push({
                    name: `CMYK (${cmykChannel.charAt(0).toUpperCase() + cmykChannel.slice(1)})`,
                    color: pen,
                    turtle: turtle
                });
            }
        }
        
        return { multiLayer: true, layers };
    }
    
    _cmykCrosshatch(cmyk, w, h, offsetX, offsetY, density) {
        const baseSpacing = Math.max(2, Math.floor(100 / density * 3));
        const angles = { cyan: 15, magenta: 75, yellow: 0, black: 45 };
        const layers = [];
        
        for (const [cmykChannel, pen] of Object.entries(ImageConverter.CMYK_PENS)) {
            const channelData = cmyk[cmykChannel];
            
            let maxVal = 0;
            for (let i = 0; i < channelData.length; i++) {
                if (channelData[i] > maxVal) maxVal = channelData[i];
            }
            if (maxVal < 0.001) continue;
            
            const turtle = new Turtle();
            const angle = angles[cmykChannel];
            
            this._drawCmykCrosshatchLines(turtle, channelData, w, h, offsetX, offsetY, baseSpacing, angle);
            
            if (turtle.getPaths().length > 0) {
                layers.push({
                    name: `CMYK (${cmykChannel.charAt(0).toUpperCase() + cmykChannel.slice(1)})`,
                    color: pen,
                    turtle: turtle
                });
            }
        }
        
        return { multiLayer: true, layers };
    }
    
    _cmykHorizontal(cmyk, w, h, offsetX, offsetY, density) {
        const spacing = Math.max(2, Math.floor(100 / density * 3));
        const ditherMatrix = [
            [0.0, 0.5, 0.125, 0.625],
            [0.75, 0.25, 0.875, 0.375],
            [0.1875, 0.6875, 0.0625, 0.5625],
            [0.9375, 0.4375, 0.8125, 0.3125]
        ];
        const layers = [];
        
        for (const [cmykChannel, pen] of Object.entries(ImageConverter.CMYK_PENS)) {
            const channel = cmyk[cmykChannel];
            
            let maxVal = 0;
            for (let i = 0; i < channel.length; i++) {
                if (channel[i] > maxVal) maxVal = channel[i];
            }
            if (maxVal < 0.001) continue;
            
            const turtle = new Turtle();
            
            for (let row = 0; row < h; row += spacing) {
                let inSegment = false;
                let startX = null;
                
                for (let col = 0; col < w; col++) {
                    const ink = channel[row * w + col];
                    const threshold = ditherMatrix[row % 4][col % 4];
                    
                    if (ink > threshold) {
                        if (!inSegment) {
                            inSegment = true;
                            startX = col;
                        }
                    } else {
                        if (inSegment) {
                            const x1 = startX + offsetX;
                            const x2 = (col - 1) + offsetX;
                            const y = row + offsetY;
                            if (x2 >= x1) {
                                turtle.jumpTo(x1, y);
                                turtle.moveTo(x2, y);
                            }
                            inSegment = false;
                        }
                    }
                }
                
                if (inSegment) {
                    const x1 = startX + offsetX;
                    const x2 = (w - 1) + offsetX;
                    const y = row + offsetY;
                    if (x2 >= x1) {
                        turtle.jumpTo(x1, y);
                        turtle.moveTo(x2, y);
                    }
                }
            }
            
            if (turtle.getPaths().length > 0) {
                layers.push({
                    name: `CMYK (${cmykChannel.charAt(0).toUpperCase() + cmykChannel.slice(1)})`,
                    color: pen,
                    turtle: turtle
                });
            }
        }
        
        return { multiLayer: true, layers };
    }
    
    _cmykDots(cmyk, w, h, offsetX, offsetY, density) {
        const spacing = Math.max(2, Math.floor(100 / density * 3));
        const dotSize = Math.max(0.5, spacing / 4);
        const ditherMatrix = [
            [0.0, 0.5, 0.125, 0.625],
            [0.75, 0.25, 0.875, 0.375],
            [0.1875, 0.6875, 0.0625, 0.5625],
            [0.9375, 0.4375, 0.8125, 0.3125]
        ];
        const layers = [];
        
        for (const [cmykChannel, pen] of Object.entries(ImageConverter.CMYK_PENS)) {
            const channel = cmyk[cmykChannel];
            
            let maxVal = 0;
            for (let i = 0; i < channel.length; i++) {
                if (channel[i] > maxVal) maxVal = channel[i];
            }
            if (maxVal < 0.001) continue;
            
            const turtle = new Turtle();
            
            for (let row = 0; row < h; row += spacing) {
                for (let col = 0; col < w; col += spacing) {
                    const ink = channel[row * w + col];
                    const threshold = ditherMatrix[row % 4][col % 4];
                    
                    if (ink > threshold) {
                        const x = col + offsetX;
                        const y = row + offsetY;
                        turtle.jumpTo(x, y);
                        turtle.moveTo(x + dotSize, y);
                    }
                }
            }
            
            if (turtle.getPaths().length > 0) {
                layers.push({
                    name: `CMYK (${cmykChannel.charAt(0).toUpperCase() + cmykChannel.slice(1)})`,
                    color: pen,
                    turtle: turtle
                });
            }
        }
        
        return { multiLayer: true, layers };
    }
    
    _drawCmykCrosshatchLines(turtle, intensity, w, h, offsetX, offsetY, baseSpacing, angle) {
        const rad = angle * Math.PI / 180;
        const cosA = Math.cos(rad);
        const sinA = Math.sin(rad);
        const maxDist = Math.floor(Math.sqrt(w * w + h * h)) + baseSpacing;
        
        const ditherMatrix = [
            [0.0, 0.5, 0.125, 0.625],
            [0.75, 0.25, 0.875, 0.375],
            [0.1875, 0.6875, 0.0625, 0.5625],
            [0.9375, 0.4375, 0.8125, 0.3125]
        ];
        
        // Draw lines perpendicular to angle
        for (let d = -maxDist; d < maxDist; d += baseSpacing) {
            let inSegment = false;
            let startPt = null;
            let lastPt = null;
            
            // Sample along the line
            for (let t = -maxDist; t < maxDist; t++) {
                // Calculate position along line perpendicular to angle
                const px = Math.floor(w / 2 + d * cosA + t * sinA);
                const py = Math.floor(h / 2 + d * sinA - t * cosA);
                
                if (px >= 0 && px < w && py >= 0 && py < h) {
                    const ink = intensity[py * w + px];
                    const threshold = ditherMatrix[py % 4][px % 4];
                    const draw = ink > threshold;
                    
                    if (draw) {
                        if (!inSegment) {
                            inSegment = true;
                            startPt = { x: px, y: py };
                        }
                        lastPt = { x: px, y: py };
                    } else {
                        if (inSegment && startPt && lastPt) {
                            turtle.jumpTo(startPt.x + offsetX, startPt.y + offsetY);
                            turtle.moveTo(lastPt.x + offsetX, lastPt.y + offsetY);
                        }
                        inSegment = false;
                        startPt = null;
                        lastPt = null;
                    }
                } else {
                    if (inSegment && startPt && lastPt) {
                        turtle.jumpTo(startPt.x + offsetX, startPt.y + offsetY);
                        turtle.moveTo(lastPt.x + offsetX, lastPt.y + offsetY);
                    }
                    inSegment = false;
                    startPt = null;
                    lastPt = null;
                }
            }
            
            // Handle end of line
            if (inSegment && startPt && lastPt) {
                turtle.jumpTo(startPt.x + offsetX, startPt.y + offsetY);
                turtle.moveTo(lastPt.x + offsetX, lastPt.y + offsetY);
            }
        }
    }
}

// Export
window.ImageConverter = ImageConverter;

