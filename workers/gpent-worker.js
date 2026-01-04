/**
 * GPenT Cloudflare Worker Proxy
 * Proxies requests to Gemini API for static site deployment
 * 
 * SETUP:
 * 1. Go to Cloudflare Dashboard → Workers & Pages → Create Application → Create Worker
 * 2. Name it "gpent-proxy"
 * 3. Go to Settings → Variables → Add variable: GEMINI_API_KEY = your_key
 * 4. Edit code, paste this file, Save and Deploy
 * 5. Update GPENT_WORKER_URL in build_static.py with your worker URL
 */

// Available generators and their options (must match actual generators)
const GENERATORS = {
    1: { id: 'spiral', name: 'Spiral', options: ['turns (1-50)', 'spacing (1-20)'] },
    2: { id: 'spirograph', name: 'Spirograph', options: ['R (10-300)', 'r (5-150)', 'd (5-200)', 'revolutions (1-100)'] },
    3: { id: 'lissajous', name: 'Lissajous', options: ['a (1-20)', 'b (1-20)', 'delta (0-180)', 'size (50-500)'] },
    4: { id: 'maze', name: 'Maze', options: ['rows (5-50)', 'cols (5-50)', 'cell_size (5-40)'] },
    5: { id: 'dragon', name: 'Dragon Curve', options: ['iterations (1-16)', 'size (1-10)'] },
    6: { id: 'hilbert', name: 'Hilbert Curve', options: ['order (1-7)', 'size (100-800)'] },
    7: { id: 'tree', name: 'Fractal Tree', options: ['depth (1-12)', 'trunk_length (20-200)', 'angle (10-45)', 'ratio (0.5-0.9)'] },
    8: { id: 'hexagons', name: 'Hexagon Grid', options: ['size (5-50)', 'rows (3-30)', 'cols (3-30)'] },
    9: { id: 'flowfield', name: 'Flow Field', options: ['lines (50-1000)', 'length (10-200)', 'scale (0.001-0.1)'] },
    10: { id: 'border', name: 'Border', options: ['margin (0-50)'] },
    11: { id: 'text', name: 'Text', options: ['text (string)', 'size (10-200)'] },
    12: { id: 'dcode', name: 'dcode (AI Drawing)', options: ['prompt (describe what to draw)'] },
};

const PEN_COLORS = {
    1: { id: 'brown', name: 'Brown', hex: '#544548' },
    2: { id: 'black', name: 'Black', hex: '#3b363c' },
    3: { id: 'blue', name: 'Blue', hex: '#5989e7' },
    4: { id: 'green', name: 'Green', hex: '#3fada9' },
    5: { id: 'purple', name: 'Purple', hex: '#653d7d' },
    6: { id: 'pink', name: 'Pink', hex: '#ee9bb5' },
    7: { id: 'red', name: 'Red', hex: '#f45d4e' },
    8: { id: 'orange', name: 'Orange', hex: '#b06451' },
    9: { id: 'yellow', name: 'Yellow', hex: '#f7a515' },
};

function buildSystemPrompt(keywords = '') {
    const generatorsDesc = Object.entries(GENERATORS)
        .map(([num, g]) => `  ${num}: ${g.name} - options: ${g.options.join(', ')}`)
        .join('\n');

    const colorsDesc = Object.entries(PEN_COLORS)
        .map(([num, c]) => `  ${num}: ${c.name}`)
        .join('\n');

    const inspiration = keywords ? `\nWhispers: "${keywords}"\n` : '';

    return `You control a pen plotter. Canvas: 841mm x 1189mm.
${inspiration}
GENERATORS:
${generatorsDesc}

COLORS:
${colorsDesc}

TRANSFORMS: scale (10-300%), rotation (0-360), offset_x (-400 to 400mm), offset_y (-550 to 550mm)

Respond with JSON array. Say FINISHED when done.
[
  {"thought": "...", "generator": <num>, "options": {}, "color": <num>, "scale": 100, "rotation": 0, "offset_x": 0, "offset_y": 0},
  ...
]
`;
}

function parseCommands(responseText) {
    const commands = [];
    const thoughts = [];

    const jsonMatch = responseText.match(/\[[\s\S]*?\]/);
    if (jsonMatch) {
        try {
            const rawCommands = JSON.parse(jsonMatch[0]);
            for (const cmd of rawCommands) {
                if (typeof cmd === 'object' && cmd.generator) {
                    if (cmd.thought) {
                        thoughts.push(cmd.thought);
                    }

                    const genNum = parseInt(cmd.generator) || 1;
                    cmd.generator_id = GENERATORS[genNum]?.id || 'spiral';

                    const colorNum = parseInt(cmd.color) || 2;
                    cmd.color_id = PEN_COLORS[colorNum]?.id || 'black';

                    commands.push(cmd);
                }
            }
        } catch (e) {
            console.error('JSON parse error:', e);
        }
    }

    return {
        commands,
        thoughts,
        isFinished: responseText.toUpperCase().includes('FINISHED')
    };
}

async function callGemini(apiKey, systemPrompt) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

    const payload = {
        contents: [
            {
                parts: [
                    { text: systemPrompt + "\n\nCreate your artwork now:" }
                ]
            }
        ],
        generationConfig: {
            temperature: 1.0,
            maxOutputTokens: 8192,
        }
    };

    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`Gemini API error: ${response.status} - ${error}`);
    }

    const result = await response.json();

    if (result.candidates && result.candidates.length > 0) {
        const content = result.candidates[0].content || {};
        const parts = content.parts || [];
        if (parts.length > 0) {
            return parts[0].text || '';
        }
    }

    return '';
}

export default {
    async fetch(request, env, ctx) {
        // Handle CORS preflight
        if (request.method === "OPTIONS") {
            return new Response(null, {
                headers: {
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Methods": "POST, OPTIONS",
                    "Access-Control-Allow-Headers": "Content-Type",
                },
            });
        }

        if (request.method !== "POST") {
            return new Response(JSON.stringify({ error: "Method not allowed" }), {
                status: 405,
                headers: { 
                    "Content-Type": "application/json",
                    "Access-Control-Allow-Origin": "*"
                },
            });
        }

        // Get API key from environment
        const apiKey = env.GEMINI_API_KEY;
        if (!apiKey) {
            return new Response(JSON.stringify({ 
                error: "GEMINI_API_KEY not configured in worker" 
            }), {
                status: 500,
                headers: { 
                    "Content-Type": "application/json",
                    "Access-Control-Allow-Origin": "*"
                },
            });
        }

        try {
            const data = await request.json();
            const keywords = data.inspiration || '';

            const systemPrompt = buildSystemPrompt(keywords);
            const responseText = await callGemini(apiKey, systemPrompt);

            const { commands, thoughts, isFinished } = parseCommands(responseText);

            return new Response(JSON.stringify({
                entities: commands,
                thoughts: thoughts,
                is_finished: isFinished,
                raw_response: responseText
            }), {
                headers: { 
                    "Content-Type": "application/json",
                    "Access-Control-Allow-Origin": "*"
                },
            });

        } catch (error) {
            console.error("GPenT Worker Error:", error);
            return new Response(JSON.stringify({ 
                error: error.message 
            }), {
                status: 500,
                headers: { 
                    "Content-Type": "application/json",
                    "Access-Control-Allow-Origin": "*"
                },
            });
        }
    },
};
