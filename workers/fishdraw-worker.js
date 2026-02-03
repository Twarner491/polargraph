/**
 * Fish Draw Cloudflare Worker
 * Generates procedural fish drawings
 * Ported from https://github.com/LingDong-/fishdraw
 */

// ============================================================================
// Perlin Noise with seeded PRNG
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
}

class PerlinNoise {
    constructor(seed = 0) {
        this.rng = new SeededRandom(seed);
        this.p = new Array(512);
        const perm = Array.from({length: 256}, (_, i) => i);

        // Shuffle
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

    noise2d(x, y) {
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
// Geometry utilities
// ============================================================================

function lerp(a, b, t) {
    return a + (b - a) * t;
}

function dist(p1, p2) {
    const dx = p2[0] - p1[0];
    const dy = p2[1] - p1[1];
    return Math.sqrt(dx * dx + dy * dy);
}

function normalize(v) {
    const len = Math.sqrt(v[0] * v[0] + v[1] * v[1]);
    if (len === 0) return [0, 0];
    return [v[0] / len, v[1] / len];
}

function perpendicular(v) {
    return [-v[1], v[0]];
}

function pointInPolygon(point, polygon) {
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

function resamplePolyline(points, step) {
    if (points.length < 2) return points;

    const result = [points[0]];
    let remaining = step;

    for (let i = 1; i < points.length; i++) {
        const prev = points[i - 1];
        const curr = points[i];
        let segLen = dist(prev, curr);
        let t = 0;

        while (remaining <= segLen) {
            t += remaining / segLen;
            result.push([
                lerp(prev[0], curr[0], t),
                lerp(prev[1], curr[1], t)
            ]);
            segLen = segLen * (1 - remaining / segLen);
            remaining = step;
        }
        remaining -= segLen;
    }

    if (result.length > 0 && dist(result[result.length - 1], points[points.length - 1]) > step * 0.5) {
        result.push(points[points.length - 1]);
    }

    return result;
}

function smoothPolyline(points, iterations = 1) {
    if (points.length < 3) return points;

    let result = [...points];
    for (let iter = 0; iter < iterations; iter++) {
        const smoothed = [result[0]];
        for (let i = 1; i < result.length - 1; i++) {
            smoothed.push([
                (result[i - 1][0] + result[i][0] * 2 + result[i + 1][0]) / 4,
                (result[i - 1][1] + result[i][1] * 2 + result[i + 1][1]) / 4
            ]);
        }
        smoothed.push(result[result.length - 1]);
        result = smoothed;
    }
    return result;
}

// Clip polyline to polygon
function clipPolylineToPolygon(polyline, polygon) {
    const result = [];
    let currentSegment = [];

    for (const point of polyline) {
        if (pointInPolygon(point, polygon)) {
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

const GENUS_PREFIXES = ['Pseu', 'Neo', 'Pro', 'Para', 'Eu', 'Mega', 'Micro', 'Macro', 'Poly', 'Mono'];
const GENUS_ROOTS = ['ichthy', 'pter', 'cephal', 'branch', 'stom', 'derm', 'pod', 'gnath', 'rhynch', 'dont'];
const GENUS_SUFFIXES = ['us', 'is', 'os', 'a', 'um', 'es', 'ax', 'ix', 'ops', 'ias'];

const SPECIES_PREFIXES = ['longi', 'brevi', 'lati', 'angust', 'magn', 'parv', 'nigr', 'alb', 'rub', 'vir'];
const SPECIES_ROOTS = ['cauda', 'pinn', 'squam', 'later', 'ventr', 'dors', 'rostr', 'ocul', 'line', 'macula'];
const SPECIES_SUFFIXES = ['us', 'is', 'atus', 'ensis', 'oides', 'formis', 'alis', 'inus', 'icus', 'eus'];

function generateFishName(rng) {
    const pick = arr => arr[Math.floor(rng.random() * arr.length)];

    const genus = pick(GENUS_PREFIXES) + pick(GENUS_ROOTS) + pick(GENUS_SUFFIXES);
    const species = pick(SPECIES_PREFIXES) + pick(SPECIES_ROOTS) + pick(SPECIES_SUFFIXES);

    return genus.charAt(0).toUpperCase() + genus.slice(1) + ' ' + species.toLowerCase();
}

// ============================================================================
// Fish Generation
// ============================================================================

function generateFishParams(rng) {
    return {
        bodyLength: 200 + rng.random() * 100,
        bodyHeight: 0.3 + rng.random() * 0.3,
        bodyBend: (rng.random() - 0.5) * 0.3,
        headSize: 0.15 + rng.random() * 0.1,
        tailSize: 0.2 + rng.random() * 0.15,
        tailFork: 0.3 + rng.random() * 0.4,
        dorsalHeight: 0.2 + rng.random() * 0.2,
        dorsalStart: 0.2 + rng.random() * 0.2,
        dorsalEnd: 0.5 + rng.random() * 0.2,
        ventralHeight: 0.1 + rng.random() * 0.1,
        pectoralSize: 0.1 + rng.random() * 0.1,
        hasStripes: rng.random() > 0.6,
        hasSpots: rng.random() > 0.7,
        hasScales: rng.random() > 0.3,
        eyeSize: 0.03 + rng.random() * 0.02,
    };
}

function generateFishBody(params, rng) {
    const { bodyLength, bodyHeight, bodyBend, headSize } = params;
    const points = [];
    const steps = 50;

    // Generate body outline
    for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const x = t * bodyLength;

        // Body profile - wider in middle, tapers at ends
        let y = Math.sin(t * Math.PI) * bodyHeight * bodyLength * 0.5;

        // Head shape adjustment
        if (t < headSize) {
            const ht = t / headSize;
            y *= 0.7 + 0.3 * Math.sqrt(ht);
        }

        // Tail taper
        if (t > 0.7) {
            const tt = (t - 0.7) / 0.3;
            y *= 1 - tt * 0.6;
        }

        // Body bend
        const bendOffset = Math.sin(t * Math.PI) * bodyBend * bodyLength;

        points.push([x, y + bendOffset]);
    }

    // Create closed body outline (top and bottom)
    const topPoints = points.map(p => [p[0], p[1]]);
    const bottomPoints = points.map(p => [p[0], -p[1]]).reverse();

    return [...topPoints, ...bottomPoints.slice(1)];
}

function generateFin(startX, startY, length, height, angle, rng) {
    const points = [];
    const steps = 15;

    const cosA = Math.cos(angle);
    const sinA = Math.sin(angle);

    for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const baseX = t * length;
        const baseY = Math.sin(t * Math.PI) * height * (1 - t * 0.3);

        // Add some waviness
        const wave = Math.sin(t * Math.PI * 3) * height * 0.1;

        const x = startX + baseX * cosA - (baseY + wave) * sinA;
        const y = startY + baseX * sinA + (baseY + wave) * cosA;

        points.push([x, y]);
    }

    return points;
}

function generateTail(bodyLength, bodyHeight, params, rng) {
    const { tailSize, tailFork } = params;
    const tailLength = bodyLength * tailSize;
    const tailHeight = bodyLength * bodyHeight * 0.8;

    const lines = [];

    // Upper tail lobe
    const upper = [];
    for (let i = 0; i <= 20; i++) {
        const t = i / 20;
        const x = bodyLength + t * tailLength;
        const y = (1 - t) * tailHeight * 0.2 + t * tailHeight * tailFork;
        upper.push([x, y]);
    }
    lines.push(upper);

    // Lower tail lobe
    const lower = [];
    for (let i = 0; i <= 20; i++) {
        const t = i / 20;
        const x = bodyLength + t * tailLength;
        const y = -((1 - t) * tailHeight * 0.2 + t * tailHeight * tailFork);
        lower.push([x, y]);
    }
    lines.push(lower);

    // Tail rays
    const numRays = 5 + Math.floor(rng.random() * 5);
    for (let i = 0; i < numRays; i++) {
        const t = i / (numRays - 1);
        const startY = lerp(tailHeight * 0.2, -tailHeight * 0.2, t);
        const endY = lerp(tailHeight * tailFork, -tailHeight * tailFork, t);

        lines.push([
            [bodyLength, startY],
            [bodyLength + tailLength, endY]
        ]);
    }

    return lines;
}

function generateScales(body, params, rng, perlin) {
    const lines = [];
    const scaleSize = params.bodyLength * 0.03;
    const rows = Math.floor(params.bodyLength * params.bodyHeight / scaleSize);
    const cols = Math.floor(params.bodyLength / scaleSize);

    for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
            const x = col * scaleSize + (row % 2) * scaleSize * 0.5 + scaleSize;
            const y = (row - rows / 2) * scaleSize * 0.8;

            // Check if inside body
            if (!pointInPolygon([x, y], body)) continue;

            // Scale arc
            const scale = [];
            for (let i = 0; i <= 8; i++) {
                const angle = Math.PI * 0.3 + (i / 8) * Math.PI * 0.4;
                const noise = perlin.noise2d(x * 0.1, y * 0.1) * 0.2;
                const r = scaleSize * (0.8 + noise);
                scale.push([
                    x + Math.cos(angle) * r,
                    y + Math.sin(angle) * r
                ]);
            }
            lines.push(scale);
        }
    }

    return lines;
}

function generateStripes(body, params, rng, perlin) {
    const lines = [];
    const numStripes = 3 + Math.floor(rng.random() * 5);

    for (let i = 0; i < numStripes; i++) {
        const x = params.bodyLength * (0.2 + (i / numStripes) * 0.6);
        const stripe = [];

        for (let y = -params.bodyLength * params.bodyHeight; y <= params.bodyLength * params.bodyHeight; y += 3) {
            const noise = perlin.noise2d(x * 0.05, y * 0.05) * 10;
            stripe.push([x + noise, y]);
        }

        // Clip to body
        const clipped = clipPolylineToPolygon(stripe, body);
        lines.push(...clipped);
    }

    return lines;
}

function generateSpots(body, params, rng, perlin) {
    const lines = [];
    const numSpots = 5 + Math.floor(rng.random() * 10);

    for (let i = 0; i < numSpots; i++) {
        const x = params.bodyLength * (0.15 + rng.random() * 0.7);
        const y = (rng.random() - 0.5) * params.bodyLength * params.bodyHeight * 0.8;

        if (!pointInPolygon([x, y], body)) continue;

        const spotSize = params.bodyLength * (0.02 + rng.random() * 0.03);
        const spot = [];

        for (let j = 0; j <= 12; j++) {
            const angle = (j / 12) * Math.PI * 2;
            const noise = perlin.noise2d(x + j, y) * 0.3;
            const r = spotSize * (0.8 + noise);
            spot.push([x + Math.cos(angle) * r, y + Math.sin(angle) * r]);
        }
        spot.push(spot[0]); // Close the circle

        lines.push(spot);
    }

    return lines;
}

function generateEye(params, rng) {
    const x = params.bodyLength * params.headSize * 0.6;
    const y = params.bodyLength * params.bodyHeight * 0.15;
    const size = params.bodyLength * params.eyeSize;

    const lines = [];

    // Eye outline
    const outline = [];
    for (let i = 0; i <= 20; i++) {
        const angle = (i / 20) * Math.PI * 2;
        outline.push([x + Math.cos(angle) * size, y + Math.sin(angle) * size]);
    }
    lines.push(outline);

    // Pupil
    const pupil = [];
    const pupilSize = size * 0.5;
    for (let i = 0; i <= 12; i++) {
        const angle = (i / 12) * Math.PI * 2;
        pupil.push([x + Math.cos(angle) * pupilSize, y + Math.sin(angle) * pupilSize]);
    }
    lines.push(pupil);

    return lines;
}

function generateFish(seed) {
    const rng = new SeededRandom(seed);
    const perlin = new PerlinNoise(seed);
    const params = generateFishParams(rng);

    const polylines = [];

    // Generate body outline
    const body = generateFishBody(params, rng);
    polylines.push(body);

    // Generate tail
    const tail = generateTail(params.bodyLength, params.bodyHeight, params, rng);
    polylines.push(...tail);

    // Generate dorsal fin
    const dorsalX = params.bodyLength * params.dorsalStart;
    const dorsalY = params.bodyLength * params.bodyHeight * 0.45;
    const dorsalFin = generateFin(
        dorsalX, dorsalY,
        params.bodyLength * (params.dorsalEnd - params.dorsalStart),
        params.bodyLength * params.dorsalHeight,
        -Math.PI * 0.1,
        rng
    );
    polylines.push(dorsalFin);

    // Generate ventral fin
    const ventralFin = generateFin(
        params.bodyLength * 0.5, -params.bodyLength * params.bodyHeight * 0.4,
        params.bodyLength * 0.15,
        params.bodyLength * params.ventralHeight,
        Math.PI * 0.7,
        rng
    );
    polylines.push(ventralFin);

    // Generate pectoral fin
    const pectoralFin = generateFin(
        params.bodyLength * 0.2, 0,
        params.bodyLength * params.pectoralSize,
        params.bodyLength * params.pectoralSize * 0.6,
        Math.PI * 0.3,
        rng
    );
    polylines.push(pectoralFin);

    // Generate eye
    const eye = generateEye(params, rng);
    polylines.push(...eye);

    // Generate textures
    if (params.hasScales) {
        const scales = generateScales(body, params, rng, perlin);
        polylines.push(...scales);
    }

    if (params.hasStripes) {
        const stripes = generateStripes(body, params, rng, perlin);
        polylines.push(...stripes);
    }

    if (params.hasSpots) {
        const spots = generateSpots(body, params, rng, perlin);
        polylines.push(...spots);
    }

    // Center the fish
    const centerX = params.bodyLength / 2;
    const centeredPolylines = polylines.map(line =>
        line.map(p => [p[0] - centerX, p[1]])
    );

    return {
        polylines: centeredPolylines,
        params: params
    };
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
                // Hash the name to get a seed
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
            const fish = generateFish(seed);

            // Convert polylines to the format expected by the client
            const paths = fish.polylines.map(line =>
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
