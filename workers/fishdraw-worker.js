/**
 * Fish Draw Cloudflare Worker
 * Generates procedural fish drawings
 * Full port from https://github.com/LingDong-/fishdraw
 */

// ============================================================================
// Seeded Random Number Generator
// ============================================================================

class SeededRandom {
    constructor(seed) {
        this.state = seed >>> 0 || 1;
    }

    next() {
        this.state ^= this.state << 13;
        this.state ^= this.state >>> 17;
        this.state ^= this.state << 5;
        return (this.state >>> 0) / 4294967296;
    }

    random() {
        return this.next();
    }

    // Triangular distribution
    triangular(min, mode, max) {
        const u = this.random();
        const fc = (mode - min) / (max - min);
        if (u < fc) {
            return min + Math.sqrt(u * (max - min) * (mode - min));
        } else {
            return max - Math.sqrt((1 - u) * (max - min) * (max - mode));
        }
    }

    choice(arr) {
        return arr[Math.floor(this.random() * arr.length)];
    }

    randint(min, max) {
        return Math.floor(this.random() * (max - min + 1)) + min;
    }
}

// ============================================================================
// Perlin Noise
// ============================================================================

class PerlinNoise {
    constructor(seed = 0) {
        this.rng = new SeededRandom(seed);
        this.p = new Array(512);
        const perm = Array.from({length: 256}, (_, i) => i);

        for (let i = 255; i > 0; i--) {
            const j = Math.floor(this.rng.random() * (i + 1));
            [perm[i], perm[j]] = [perm[j], perm[i]];
        }

        for (let i = 0; i < 512; i++) {
            this.p[i] = perm[i & 255];
        }
    }

    fade(t) {
        return t * t * t * (t * (t * 6 - 15) + 10);
    }

    lerp(a, b, t) {
        return a + t * (b - a);
    }

    grad(hash, x, y) {
        const h = hash & 3;
        const u = h < 2 ? x : y;
        const v = h < 2 ? y : x;
        return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
    }

    noise(x, y = 0) {
        const X = Math.floor(x) & 255;
        const Y = Math.floor(y) & 255;

        x -= Math.floor(x);
        y -= Math.floor(y);

        const u = this.fade(x);
        const v = this.fade(y);

        const A = this.p[X] + Y;
        const B = this.p[X + 1] + Y;

        return this.lerp(
            this.lerp(this.grad(this.p[A], x, y), this.grad(this.p[B], x - 1, y), u),
            this.lerp(this.grad(this.p[A + 1], x, y - 1), this.grad(this.p[B + 1], x - 1, y - 1), u),
            v
        );
    }
}

// ============================================================================
// Geometry Utilities
// ============================================================================

const PI = Math.PI;

function dist(p1, p2) {
    const dx = p2[0] - p1[0];
    const dy = p2[1] - p1[1];
    return Math.sqrt(dx * dx + dy * dy);
}

function lerp(a, b, t) {
    return a + (b - a) * t;
}

function lerp2d(a, b, t) {
    return [lerp(a[0], b[0], t), lerp(a[1], b[1], t)];
}

function getBbox(points) {
    if (!points.length) return [0, 0, 0, 0];
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const [x, y] of points) {
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
    }
    return [minX, minY, maxX, maxY];
}

function ptInPoly(point, polygon) {
    let inside = false;
    const x = point[0], y = point[1];

    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        const xi = polygon[i][0], yi = polygon[i][1];
        const xj = polygon[j][0], yj = polygon[j][1];

        if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) {
            inside = !inside;
        }
    }
    return inside;
}

// Point to segment distance for line clipping
function ptSegDist(pt, a, b) {
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const lenSq = dx * dx + dy * dy;

    if (lenSq === 0) return dist(pt, a);

    let t = ((pt[0] - a[0]) * dx + (pt[1] - a[1]) * dy) / lenSq;
    t = Math.max(0, Math.min(1, t));

    const proj = [a[0] + t * dx, a[1] + t * dy];
    return dist(pt, proj);
}

// ============================================================================
// Curve Utilities
// ============================================================================

function catmullRomPoint(p0, p1, p2, p3, t) {
    const t2 = t * t;
    const t3 = t2 * t;

    const x = 0.5 * ((2 * p1[0]) +
               (-p0[0] + p2[0]) * t +
               (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 +
               (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3);

    const y = 0.5 * ((2 * p1[1]) +
               (-p0[1] + p2[1]) * t +
               (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 +
               (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3);

    return [x, y];
}

function catmullRomSpline(points, segmentsPerCurve = 10) {
    if (points.length < 2) return [...points];
    if (points.length === 2) return [...points];

    const result = [];
    const extended = [points[0], ...points, points[points.length - 1]];

    for (let i = 1; i < extended.length - 2; i++) {
        const p0 = extended[i - 1];
        const p1 = extended[i];
        const p2 = extended[i + 1];
        const p3 = extended[i + 2];

        for (let j = 0; j < segmentsPerCurve; j++) {
            const t = j / segmentsPerCurve;
            result.push(catmullRomPoint(p0, p1, p2, p3, t));
        }
    }

    result.push(points[points.length - 1]);
    return result;
}

function circlePoints(cx, cy, radius, segments = 32) {
    const points = [];
    for (let i = 0; i <= segments; i++) {
        const angle = (2 * PI * i) / segments;
        points.push([cx + radius * Math.cos(angle), cy + radius * Math.sin(angle)]);
    }
    return points;
}

function resample(polyline, step) {
    if (polyline.length < 2) return [...polyline];

    const result = [polyline[0]];
    let remaining = step;

    for (let i = 1; i < polyline.length; i++) {
        const prev = polyline[i - 1];
        const curr = polyline[i];
        let segLen = dist(prev, curr);

        if (segLen < 1e-10) continue;

        let pos = prev;
        while (remaining <= dist(pos, curr)) {
            const t = remaining / dist(pos, curr);
            const newPt = lerp2d(pos, curr, t);
            result.push(newPt);
            pos = newPt;
            remaining = step;
        }
        remaining -= dist(pos, curr);
    }

    if (dist(result[result.length - 1], polyline[polyline.length - 1]) > step * 0.1) {
        result.push(polyline[polyline.length - 1]);
    }

    return result;
}

// Simple line clipping to polygon (returns segments inside polygon)
function clipPolyline(polyline, polygon) {
    const result = [];
    let currentSegment = [];

    for (const point of polyline) {
        if (ptInPoly(point, polygon)) {
            currentSegment.push(point);
        } else {
            if (currentSegment.length >= 2) {
                result.push(currentSegment);
            }
            currentSegment = [];
        }
    }

    if (currentSegment.length >= 2) {
        result.push(currentSegment);
    }

    return result;
}

// ============================================================================
// Fish Name Generator
// ============================================================================

const GENUS_PREFIXES = ['Pseu', 'Neo', 'Pro', 'Para', 'Eu', 'Mega', 'Micro', 'Macro', 'Poly', 'Mono', 'Hemi', 'Tri'];
const GENUS_ROOTS = ['ichthy', 'pter', 'cephal', 'branch', 'stom', 'derm', 'pod', 'gnath', 'rhynch', 'dont', 'cheil', 'ophr'];
const GENUS_SUFFIXES = ['us', 'is', 'os', 'a', 'um', 'es', 'ax', 'ix', 'ops', 'ias', 'ys', 'on'];

const SPECIES_PREFIXES = ['longi', 'brevi', 'lati', 'angust', 'magn', 'parv', 'nigr', 'alb', 'rub', 'vir', 'flav', 'caeru'];
const SPECIES_ROOTS = ['cauda', 'pinn', 'squam', 'later', 'ventr', 'dors', 'rostr', 'ocul', 'line', 'macula', 'gutta', 'fascia'];
const SPECIES_SUFFIXES = ['us', 'is', 'atus', 'ensis', 'oides', 'formis', 'alis', 'inus', 'icus', 'eus', 'ius', 'ilis'];

function generateFishName(rng) {
    const genus = rng.choice(GENUS_PREFIXES) + rng.choice(GENUS_ROOTS) + rng.choice(GENUS_SUFFIXES);
    const species = rng.choice(SPECIES_PREFIXES) + rng.choice(SPECIES_ROOTS) + rng.choice(SPECIES_SUFFIXES);

    return genus.charAt(0).toUpperCase() + genus.slice(1) + ' ' + species.toLowerCase();
}

// ============================================================================
// Fish Parameter Generation
// ============================================================================

function generateParams(rng) {
    return {
        bodyCurveType: rng.choice([0, 1]),
        bodyCurveAmount: rng.triangular(0.5, 0.85, 0.98),
        bodyLength: rng.triangular(200, 300, 420),
        bodyHeight: rng.triangular(45, 80, 150),

        scaleType: rng.choice([0, 1, 2, 3]),
        patternType: rng.choice([0, 1, 2, 3, 4]),

        hasDorsal: rng.random() > 0.1,
        hasPectoral: rng.random() > 0.05,
        hasPelvic: rng.random() > 0.3,
        hasAnal: rng.random() > 0.2,
        hasFinlet: rng.random() > 0.85,
        hasAdipose: rng.random() > 0.9,
        hasTail: true,

        dorsalStart: rng.triangular(0.1, 0.2, 0.4),
        dorsalEnd: rng.triangular(0.5, 0.7, 0.9),
        dorsalHeight: rng.triangular(30, 60, 120),
        dorsalTexture: rng.random() > 0.3,

        pectoralStart: rng.triangular(0.15, 0.25, 0.35),
        pectoralLength: rng.triangular(30, 50, 80),
        pectoralAngle: rng.triangular(-0.6, -0.3, 0.1),

        pelvicStart: rng.triangular(0.35, 0.45, 0.55),
        pelvicLength: rng.triangular(15, 30, 50),

        analStart: rng.triangular(0.4, 0.55, 0.7),
        analEnd: rng.triangular(0.7, 0.8, 0.95),
        analHeight: rng.triangular(15, 30, 50),

        tailType: rng.choice([0, 1, 2]),
        tailLength: rng.triangular(40, 60, 100),
        tailSpread: rng.triangular(0.5, 0.8, 1.2),

        eyeSize: rng.triangular(8, 15, 25),
        eyePos: rng.triangular(0.1, 0.15, 0.25),
        mouthSize: rng.triangular(0.15, 0.3, 0.5),
        mouthOpen: rng.triangular(0, 0.2, 0.5),
        hasTeeth: rng.random() > 0.8,
        hasWhisker: rng.random() > 0.9,

        bodyStripeCount: rng.randint(3, 8),
        bodySpotCount: rng.randint(5, 20),
        bodyTextureDensity: rng.triangular(0.5, 1.0, 1.5),
    };
}

// ============================================================================
// Fish Generator Class
// ============================================================================

class FishGenerator {
    constructor(params, seed) {
        this.params = params;
        this.rng = new SeededRandom(seed);
        this.noise = new PerlinNoise(seed);

        this.curveTop = [];
        this.curveBottom = [];
        this.outline = [];
        this.polylines = [];
    }

    generate() {
        this._generateBodyCurves();
        this._generateBodyOutline();
        this._generateBodyTexture();
        this._generateFins();
        this._generateHead();
        return this.polylines;
    }

    _generateBodyCurves() {
        const n = 32;
        const p = this.params;
        const length = p.bodyLength;
        const height = p.bodyHeight;
        const amount = p.bodyCurveAmount;

        this.curveTop = [];
        this.curveBottom = [];

        for (let i = 0; i < n; i++) {
            const t = i / (n - 1);
            const x = (t - 0.5) * length;

            let yFactor, yTop, yBottom;

            if (p.bodyCurveType === 0) {
                // Smooth sine-based body
                yFactor = Math.sin(t * PI) * lerp(0.5, 1.0, this.noise.noise(t * 2, 1));
                yTop = height * (amount * yFactor + (1 - amount));
                yBottom = -height * (amount * yFactor + (1 - amount));
            } else {
                // Bean-shaped body
                yFactor = Math.sin(t * PI) * (1 - 0.3 * Math.sin(t * PI * 2));
                yTop = height * yFactor * amount;
                yBottom = -height * yFactor * amount * 0.8;
            }

            this.curveTop.push([x, yTop]);
            this.curveBottom.push([x, yBottom]);
        }
    }

    _generateBodyOutline() {
        this.outline = [...this.curveTop, ...this.curveBottom.slice().reverse()];
    }

    _generateBodyTexture() {
        const p = this.params;

        // Add body outline
        this.polylines.push([...this.curveTop]);
        this.polylines.push([...this.curveBottom].reverse());

        const scaleType = p.scaleType;

        if (scaleType === 0) {
            this._generateScales();
        } else if (scaleType === 1) {
            this._generateStripes();
        } else if (scaleType === 2) {
            this._generateSpots();
        } else {
            this._generateHatching();
        }
    }

    _generateScales() {
        const p = this.params;
        const density = p.bodyTextureDensity;
        const bbox = getBbox(this.outline);
        const [minX, minY, maxX, maxY] = bbox;
        const scaleSize = 12 / density;

        let y = minY + scaleSize;
        let row = 0;

        while (y < maxY - scaleSize) {
            let x = minX + scaleSize + (row % 2) * scaleSize * 0.5;
            while (x < maxX - scaleSize) {
                if (ptInPoly([x, y], this.outline)) {
                    const scale = this._drawScale(x, y, scaleSize * 0.8);
                    const clipped = clipPolyline(scale, this.outline);
                    this.polylines.push(...clipped);
                }
                x += scaleSize;
            }
            y += scaleSize * 0.6;
            row++;
        }
    }

    _drawScale(cx, cy, radius) {
        const points = [];
        const segments = 12;
        for (let i = 0; i <= segments; i++) {
            const t = i / segments;
            const angle = PI * 0.3 + t * PI * 0.4;
            const x = cx + radius * Math.cos(angle) * 0.8;
            const y = cy + radius * Math.sin(angle) - radius * 0.3;
            points.push([x, y]);
        }
        return points;
    }

    _generateStripes() {
        const p = this.params;
        const count = p.bodyStripeCount;
        const bbox = getBbox(this.outline);
        const [minX, minY, maxX, maxY] = bbox;
        const stripeWidth = (maxX - minX) / (count + 1);

        for (let i = 0; i < count; i++) {
            const x = minX + stripeWidth * (i + 1);
            const stripe = [[x, minY - 10], [x, maxY + 10]];

            const clipped = clipPolyline(resample(stripe, 5), this.outline);
            for (const line of clipped) {
                if (line.length >= 2) {
                    const wavy = line.map((pt, j) => [
                        pt[0] + this.noise.noise(pt[1] * 0.1, i) * 3,
                        pt[1]
                    ]);
                    if (wavy.length >= 2) {
                        this.polylines.push(wavy);
                    }
                }
            }
        }
    }

    _generateSpots() {
        const p = this.params;
        const count = p.bodySpotCount;
        const bbox = getBbox(this.outline);
        const [minX, minY, maxX, maxY] = bbox;

        for (let i = 0; i < count; i++) {
            const x = minX + this.rng.random() * (maxX - minX);
            const y = minY + this.rng.random() * (maxY - minY);

            if (ptInPoly([x, y], this.outline)) {
                const radius = 3 + this.rng.random() * 5;
                const spot = circlePoints(x, y, radius, 12);
                this.polylines.push(spot);
            }
        }
    }

    _generateHatching() {
        const p = this.params;
        const density = p.bodyTextureDensity;
        const bbox = getBbox(this.outline);
        const [minX, minY, maxX, maxY] = bbox;
        const step = 8 / density;
        const angle = PI / 4;

        const start = minX + minY;
        const end = maxX + maxY;
        let pos = start;

        while (pos < end) {
            const x1 = pos;
            const y1 = minY - 10;
            const x2 = pos - (maxY - minY + 20) * Math.tan(angle);
            const y2 = maxY + 10;

            const line = [[x1, y1], [x2, y2]];
            const clipped = clipPolyline(line, this.outline);
            this.polylines.push(...clipped);

            pos += step;
        }
    }

    _generateFins() {
        const p = this.params;

        if (p.hasDorsal) this._generateDorsalFin();
        if (p.hasPectoral) this._generatePectoralFin();
        if (p.hasPelvic) this._generatePelvicFin();
        if (p.hasAnal) this._generateAnalFin();
        if (p.hasTail) this._generateTail();
    }

    _generateDorsalFin() {
        const p = this.params;
        const startT = p.dorsalStart;
        const endT = p.dorsalEnd;
        const height = p.dorsalHeight;

        const nTop = this.curveTop.length;
        const startIdx = Math.floor(startT * nTop);
        const endIdx = Math.floor(endT * nTop);

        if (startIdx >= endIdx) return;

        const base = this.curveTop.slice(startIdx, endIdx + 1);
        const finOutline = [base[0]];

        for (let i = 0; i < base.length; i++) {
            const t = i / base.length;
            const profile = Math.pow(Math.sin(t * PI), 0.5);
            const h = height * profile * (0.8 + 0.4 * this.noise.noise(t * 3, 0));
            finOutline.push([base[i][0], base[i][1] + h]);
        }

        finOutline.push(base[base.length - 1]);
        this.polylines.push(finOutline);

        // Add fin rays
        if (p.dorsalTexture) {
            const numRays = Math.max(3, Math.floor(base.length / 3));
            for (let i = 0; i < numRays; i++) {
                const t = (i + 0.5) / numRays;
                const idx = Math.floor(t * (base.length - 1));
                const basePt = base[Math.min(idx, base.length - 1)];
                const topPt = finOutline[Math.min(idx + 1, finOutline.length - 2)];
                this.polylines.push([basePt, topPt]);
            }
        }
    }

    _generatePectoralFin() {
        const p = this.params;
        const posT = p.pectoralStart;
        const length = p.pectoralLength;
        const angle = p.pectoralAngle;

        const n = this.curveBottom.length;
        const idx = Math.floor(posT * n);
        const attachPt = this.curveBottom[Math.min(idx, n - 1)];

        const fin = this._generateFinShape(attachPt, length, angle, 0.6);
        this.polylines.push(fin);
    }

    _generatePelvicFin() {
        const p = this.params;
        const posT = p.pelvicStart;
        const length = p.pelvicLength;

        const n = this.curveBottom.length;
        const idx = Math.floor(posT * n);
        const attachPt = this.curveBottom[Math.min(idx, n - 1)];

        const fin = this._generateFinShape(attachPt, length, -0.5, 0.4);
        this.polylines.push(fin);
    }

    _generateAnalFin() {
        const p = this.params;
        const startT = p.analStart;
        const endT = p.analEnd;
        const height = p.analHeight;

        const n = this.curveBottom.length;
        const startIdx = Math.floor(startT * n);
        const endIdx = Math.floor(endT * n);

        if (startIdx >= endIdx) return;

        const base = this.curveBottom.slice(startIdx, endIdx + 1);
        const finOutline = [base[0]];

        for (let i = 0; i < base.length; i++) {
            const t = i / base.length;
            const profile = Math.pow(Math.sin(t * PI), 0.7);
            const h = height * profile;
            finOutline.push([base[i][0], base[i][1] - h]);
        }

        finOutline.push(base[base.length - 1]);
        this.polylines.push(finOutline);
    }

    _generateTail() {
        const p = this.params;
        const tailType = p.tailType;
        const length = p.tailLength;
        const spread = p.tailSpread;

        const topPt = this.curveTop[this.curveTop.length - 1];
        const bottomPt = this.curveBottom[this.curveBottom.length - 1];
        const centerY = (topPt[1] + bottomPt[1]) / 2;
        const backX = topPt[0];

        if (tailType === 0) {
            this._generateForkedTail(backX, centerY, topPt[1], bottomPt[1], length, spread);
        } else if (tailType === 1) {
            this._generateRoundedTail(backX, centerY, topPt[1], bottomPt[1], length);
        } else {
            this._generatePointedTail(backX, centerY, topPt[1], bottomPt[1], length);
        }
    }

    _generateForkedTail(x, cy, yTop, yBottom, length, spread) {
        const upper = [
            [x, yTop],
            [x + length * 0.3, yTop + (yTop - cy) * spread * 0.3],
            [x + length * 0.7, yTop + (yTop - cy) * spread * 0.6],
            [x + length, yTop + (yTop - cy) * spread],
        ];

        const lower = [
            [x, yBottom],
            [x + length * 0.3, yBottom + (yBottom - cy) * spread * 0.3],
            [x + length * 0.7, yBottom + (yBottom - cy) * spread * 0.6],
            [x + length, yBottom + (yBottom - cy) * spread],
        ];

        const upperSmooth = catmullRomSpline(upper, 8);
        const lowerSmooth = catmullRomSpline(lower, 8);

        // Center notch
        const centerNotch = [[x + length * 0.4, cy]];

        const tail = [...upperSmooth, ...centerNotch.reverse(), ...lowerSmooth.reverse()];
        this.polylines.push(tail);

        // Tail rays
        const numRays = 5;
        for (let i = 0; i < numRays; i++) {
            const t = (i + 0.5) / numRays;
            const startY = lerp(yTop, yBottom, t);
            const endY = lerp(yTop + (yTop - cy) * spread, yBottom + (yBottom - cy) * spread, t);
            this.polylines.push([[x, startY], [x + length * 0.9, endY]]);
        }
    }

    _generateRoundedTail(x, cy, yTop, yBottom, length) {
        const points = [];
        const segments = 16;

        for (let i = 0; i <= segments; i++) {
            const t = i / segments;
            const angle = -PI / 2 + t * PI;
            const px = x + length * Math.cos(angle) * 0.5 + length * 0.5;
            const py = cy + (yTop - yBottom) * 0.5 * Math.sin(angle);
            points.push([px, py]);
        }

        const tail = [[x, yTop], ...points, [x, yBottom]];
        this.polylines.push(tail);
    }

    _generatePointedTail(x, cy, yTop, yBottom, length) {
        const tail = [[x, yTop], [x + length, cy], [x, yBottom]];
        const smooth = catmullRomSpline(tail, 8);
        this.polylines.push(smooth);
    }

    _generateFinShape(attach, length, angle, widthRatio) {
        const [cx, cy] = attach;
        const endX = cx + length * Math.cos(angle);
        const endY = cy + length * Math.sin(angle);

        const perpAngle = angle + PI / 2;
        const halfWidth = length * widthRatio * 0.5;

        const fin = [
            [cx, cy],
            [cx + halfWidth * 0.3 * Math.cos(perpAngle), cy + halfWidth * 0.3 * Math.sin(perpAngle)],
            [endX + halfWidth * Math.cos(perpAngle), endY + halfWidth * Math.sin(perpAngle)],
            [endX, endY],
            [endX - halfWidth * Math.cos(perpAngle), endY - halfWidth * Math.sin(perpAngle)],
            [cx - halfWidth * 0.3 * Math.cos(perpAngle), cy - halfWidth * 0.3 * Math.sin(perpAngle)],
            [cx, cy]
        ];

        return catmullRomSpline(fin, 6);
    }

    _generateHead() {
        const p = this.params;

        const headX = this.curveTop[0][0];
        const centerY = (this.curveTop[0][1] + this.curveBottom[0][1]) / 2;

        // Eye
        const eyeOffsetX = p.bodyLength * p.eyePos;
        const eyeX = headX + eyeOffsetX;
        const eyeY = centerY + p.bodyHeight * 0.2;
        const eyeSize = p.eyeSize;

        // Eye outline
        const eye = circlePoints(eyeX, eyeY, eyeSize, 16);
        this.polylines.push(eye);

        // Pupil
        const pupil = circlePoints(eyeX + eyeSize * 0.15, eyeY, eyeSize * 0.5, 12);
        this.polylines.push(pupil);

        // Mouth
        const mouthY = centerY - p.bodyHeight * 0.1;
        const mouthLength = p.bodyLength * p.mouthSize;
        const mouthOpen = p.mouthOpen;

        if (mouthOpen > 0.1) {
            const mouthTop = [[headX - 5, mouthY + mouthOpen * 10], [headX + mouthLength * 0.5, mouthY + mouthOpen * 5]];
            const mouthBottom = [[headX - 5, mouthY - mouthOpen * 10], [headX + mouthLength * 0.5, mouthY - mouthOpen * 5]];
            this.polylines.push(mouthTop);
            this.polylines.push(mouthBottom);
        } else {
            const mouth = [[headX - 5, mouthY], [headX + mouthLength, mouthY + 2]];
            this.polylines.push(mouth);
        }

        // Gill line
        const gillX = headX + p.bodyLength * 0.15;
        const gillTopY = centerY + p.bodyHeight * 0.6;
        const gillBottomY = centerY - p.bodyHeight * 0.4;
        const gill = [[gillX, gillTopY], [gillX + 5, centerY], [gillX, gillBottomY]];
        const gillSmooth = catmullRomSpline(gill, 6);
        this.polylines.push(gillSmooth);
    }
}

// ============================================================================
// Main Fish Function
// ============================================================================

function generateFish(seed) {
    const rng = new SeededRandom(seed);
    const params = generateParams(rng);

    const generator = new FishGenerator(params, seed);
    const polylines = generator.generate();

    // Center the fish
    const allPoints = polylines.flat();
    if (allPoints.length > 0) {
        const bbox = getBbox(allPoints);
        const cx = (bbox[0] + bbox[2]) / 2;
        const cy = (bbox[1] + bbox[3]) / 2;

        return polylines.map(poly => poly.map(p => [p[0] - cx, p[1] - cy]));
    }

    return polylines;
}

// ============================================================================
// Worker Handler
// ============================================================================

export default {
    async fetch(request, env) {
        // Handle CORS preflight
        if (request.method === 'OPTIONS') {
            return new Response(null, {
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'POST, OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type',
                },
            });
        }

        if (request.method !== 'POST') {
            return new Response('Method not allowed', { status: 405 });
        }

        try {
            const body = await request.json();
            let seed = body.seed;
            let fishName = body.fish_name || '';

            // Generate seed from name or use random
            if (fishName) {
                seed = 0;
                for (let i = 0; i < fishName.length; i++) {
                    seed = ((seed << 5) - seed + fishName.charCodeAt(i)) | 0;
                }
                seed = Math.abs(seed);
            } else if (seed === undefined || seed === null || seed === -1) {
                seed = Math.floor(Math.random() * 1000000);
            }

            // Generate fish name if not provided
            const rng = new SeededRandom(seed);
            if (!fishName) {
                fishName = generateFishName(rng);
            }

            // Generate the fish
            const polylines = generateFish(seed);

            // Convert polylines to the format expected by the client
            const paths = polylines.map(line =>
                line.map(p => ({ x: p[0], y: p[1] }))
            );

            return new Response(JSON.stringify({
                success: true,
                paths: paths,
                name: fishName,
                seed: seed
            }), {
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                }
            });

        } catch (error) {
            return new Response(JSON.stringify({
                success: false,
                error: error.message
            }), {
                status: 500,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                }
            });
        }
    }
};
