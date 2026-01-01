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
        }
    };
    
    listConverters() {
        return Object.entries(ImageConverter.CONVERTERS).map(([id, v]) => ({ id, ...v }));
    }
    
    /**
     * Convert an image to turtle paths
     * @param {HTMLImageElement|ImageData} image - The image to convert
     * @param {string} algorithm - The conversion algorithm
     * @param {Object} options - Algorithm options
     * @returns {Turtle} The generated turtle paths
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
        
        // Draw and get grayscale data
        ctx.drawImage(image, 0, 0, newWidth, newHeight);
        const imageData = ctx.getImageData(0, 0, newWidth, newHeight);
        const grayData = this._toGrayscale(imageData);
        
        const offsetX = -newWidth / 2;
        const offsetY = -newHeight / 2;
        
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
}

// Export
window.ImageConverter = ImageConverter;

