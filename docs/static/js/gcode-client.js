/**
 * Client-side G-code generation for Polargraph
 * Enables full functionality in static/remote mode
 */

// Default plotter settings (matches plotter_settings.py)
const DEFAULT_SETTINGS = {
    machine_width: 1219.2,
    machine_height: 1524.0,
    limit_left: -420.5,
    limit_right: 420.5,
    limit_top: 594.5,
    limit_bottom: -594.5,
    pen_angle_up: 90,
    pen_angle_down: 40,
    feed_rate_travel: 1000,
    feed_rate_draw: 500,
    pen_diameter: 0.8
};

/**
 * Point class
 */
class Point {
    constructor(x = 0, y = 0) {
        this.x = x;
        this.y = y;
    }
    
    distanceTo(other) {
        const dx = this.x - other.x;
        const dy = this.y - other.y;
        return Math.sqrt(dx * dx + dy * dy);
    }
}

/**
 * Line class - a series of points with color/diameter
 */
class Line {
    constructor(color = '#000000', diameter = 1.0) {
        this.points = [];
        this.color = color;
        this.diameter = diameter;
    }
}

/**
 * StrokeLayer class
 */
class StrokeLayer {
    constructor(color = '#000000', diameter = 1.0) {
        this.lines = [];
        this.color = color;
        this.diameter = diameter;
    }
}

/**
 * Turtle graphics class for path generation
 */
class Turtle {
    constructor(color = '#000000', diameter = 1.0) {
        this.layers = [];
        this.position = new Point(0, 0);
        this.angle = 0;
        this.penUp = true;
        this.color = color;
        this.diameter = diameter;
        this._newLayer();
    }
    
    _newLayer() {
        this.layers.push(new StrokeLayer(this.color, this.diameter));
    }
    
    _currentLayer() {
        return this.layers[this.layers.length - 1];
    }
    
    _newLine() {
        const line = new Line(this.color, this.diameter);
        line.points.push(new Point(this.position.x, this.position.y));
        this._currentLayer().lines.push(line);
    }
    
    setStroke(color, diameter) {
        if (this.color !== color || this.diameter !== diameter) {
            this.color = color;
            this.diameter = diameter;
            this._newLayer();
            if (!this.penUp) {
                this._newLine();
            }
        }
    }
    
    penDown() {
        if (this.penUp) {
            this.penUp = false;
            this._newLine();
        }
    }
    
    penUpCmd() {
        this.penUp = true;
    }
    
    moveTo(x, y) {
        this.position.x = x;
        this.position.y = y;
        
        if (!this.penUp) {
            const layer = this._currentLayer();
            if (layer.lines.length > 0) {
                layer.lines[layer.lines.length - 1].points.push(new Point(x, y));
            }
        }
    }
    
    jumpTo(x, y) {
        this.penUpCmd();
        this.position.x = x;
        this.position.y = y;
        this.penDown();
    }
    
    forward(distance) {
        const rad = this.angle * Math.PI / 180;
        const x = this.position.x + Math.cos(rad) * distance;
        const y = this.position.y + Math.sin(rad) * distance;
        this.moveTo(x, y);
    }
    
    backward(distance) {
        this.forward(-distance);
    }
    
    turn(degrees) {
        this.angle += degrees;
    }
    
    turnRight(degrees) {
        this.angle -= degrees;
    }
    
    turnLeft(degrees) {
        this.angle += degrees;
    }
    
    setAngle(degrees) {
        this.angle = degrees;
    }
    
    drawArc(cx, cy, radius, startAngle, endAngle, steps = 36) {
        const delta = (endAngle - startAngle) / steps;
        
        for (let i = 0; i <= steps; i++) {
            const angle = startAngle + delta * i;
            const x = cx + Math.cos(angle) * radius;
            const y = cy + Math.sin(angle) * radius;
            
            if (i === 0) {
                this.jumpTo(x, y);
            } else {
                this.moveTo(x, y);
            }
        }
    }
    
    drawCircle(cx, cy, radius, steps = 36) {
        this.drawArc(cx, cy, radius, 0, 2 * Math.PI, steps);
    }
    
    drawLine(x1, y1, x2, y2) {
        this.jumpTo(x1, y1);
        this.moveTo(x2, y2);
    }
    
    drawRect(x, y, width, height) {
        this.jumpTo(x, y);
        this.moveTo(x + width, y);
        this.moveTo(x + width, y + height);
        this.moveTo(x, y + height);
        this.moveTo(x, y);
    }
    
    // Query methods
    getBounds() {
        let minX = Infinity, minY = Infinity;
        let maxX = -Infinity, maxY = -Infinity;
        
        for (const layer of this.layers) {
            for (const line of layer.lines) {
                for (const point of line.points) {
                    minX = Math.min(minX, point.x);
                    minY = Math.min(minY, point.y);
                    maxX = Math.max(maxX, point.x);
                    maxY = Math.max(maxY, point.y);
                }
            }
        }
        
        if (minX === Infinity) {
            return { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0 };
        }
        
        return {
            minX, minY, maxX, maxY,
            width: maxX - minX,
            height: maxY - minY
        };
    }
    
    getPaths() {
        const paths = [];
        for (const layer of this.layers) {
            for (const line of layer.lines) {
                if (line.points.length >= 2) {
                    paths.push({
                        points: line.points.map(p => ({ x: p.x, y: p.y })),
                        color: layer.color,
                        diameter: layer.diameter
                    });
                }
            }
        }
        return paths;
    }
    
    // Transform methods
    translate(dx, dy) {
        for (const layer of this.layers) {
            for (const line of layer.lines) {
                for (const point of line.points) {
                    point.x += dx;
                    point.y += dy;
                }
            }
        }
    }
    
    scale(sx, sy = null) {
        if (sy === null) sy = sx;
        
        for (const layer of this.layers) {
            for (const line of layer.lines) {
                for (const point of line.points) {
                    point.x *= sx;
                    point.y *= sy;
                }
            }
        }
    }
    
    rotate(degrees) {
        const rad = degrees * Math.PI / 180;
        const cosA = Math.cos(rad);
        const sinA = Math.sin(rad);
        
        for (const layer of this.layers) {
            for (const line of layer.lines) {
                for (const point of line.points) {
                    const x = point.x;
                    const y = point.y;
                    point.x = x * cosA - y * sinA;
                    point.y = x * sinA + y * cosA;
                }
            }
        }
    }
    
    centerOn(cx, cy) {
        const bounds = this.getBounds();
        const currentCx = (bounds.minX + bounds.maxX) / 2;
        const currentCy = (bounds.minY + bounds.maxY) / 2;
        this.translate(cx - currentCx, cy - currentCy);
    }
    
    fitToBounds(left, bottom, right, top, maintainAspect = true) {
        const bounds = this.getBounds();
        
        if (bounds.width === 0 || bounds.height === 0) return;
        
        const targetWidth = right - left;
        const targetHeight = top - bottom;
        
        let sx = targetWidth / bounds.width;
        let sy = targetHeight / bounds.height;
        
        if (maintainAspect) {
            const s = Math.min(sx, sy);
            sx = sy = s;
        }
        
        this.translate(-bounds.minX - bounds.width / 2, -bounds.minY - bounds.height / 2);
        this.scale(sx, sy);
        this.translate((left + right) / 2, (bottom + top) / 2);
    }
}

/**
 * G-code generator - converts Turtle paths to G-code
 */
class GCodeGenerator {
    constructor(settings = DEFAULT_SETTINGS) {
        this.settings = { ...DEFAULT_SETTINGS, ...settings };
    }
    
    turtleToGcode(turtle) {
        const gcode = [];
        
        // Header
        gcode.push('; Generated by Polargraph Web Interface (Client-side)');
        gcode.push('; Makelangelo-compatible G-code');
        gcode.push('');
        gcode.push('G90 ; Absolute positioning');
        gcode.push(`G0 F${this.settings.feed_rate_travel} ; Set travel speed`);
        
        // Pen up to start
        gcode.push(this.getPenUpCommand());
        
        let lastPoint = null;
        let penIsUp = true;
        
        for (const layer of turtle.layers) {
            for (const line of layer.lines) {
                if (line.points.length < 2) continue;
                
                const start = line.points[0];
                
                if (lastPoint === null || this._distance(lastPoint, start) > 0.1) {
                    if (!penIsUp) {
                        gcode.push(this.getPenUpCommand());
                        penIsUp = true;
                    }
                    gcode.push(`G0 X${start.x.toFixed(3)} Y${start.y.toFixed(3)} F${this.settings.feed_rate_travel}`);
                }
                
                if (penIsUp) {
                    gcode.push(this.getPenDownCommand());
                    penIsUp = false;
                }
                
                for (let i = 1; i < line.points.length; i++) {
                    const point = line.points[i];
                    gcode.push(`G1 X${point.x.toFixed(3)} Y${point.y.toFixed(3)} F${this.settings.feed_rate_draw}`);
                }
                
                lastPoint = line.points[line.points.length - 1];
            }
        }
        
        // Footer
        gcode.push('');
        gcode.push('; End of drawing');
        gcode.push(this.getPenUpCommand());
        gcode.push(`G0 X0 Y0 F${this.settings.feed_rate_travel} ; Return home`);
        
        return gcode;
    }
    
    getPenUpCommand() {
        return `G0 Z${this.settings.pen_angle_up} F1000`;
    }
    
    getPenDownCommand() {
        return `G0 Z${this.settings.pen_angle_down} F1000`;
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
    
    _distance(p1, p2) {
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        return Math.sqrt(dx * dx + dy * dy);
    }
}

// Export for use in other modules
window.Turtle = Turtle;
window.GCodeGenerator = GCodeGenerator;
window.DEFAULT_SETTINGS = DEFAULT_SETTINGS;

