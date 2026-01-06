/**
 * GPenT Cloudflare Worker - Proxies requests to Gemini API
 * Deploy at: gpent-proxy.teddy-557.workers.dev
 * 
 * Environment variables needed:
 * - GEMINI_API_KEY: Your Gemini API key
 */

// Generator definitions matching gpent.py
const GENERATORS = {
    1: {id: 'spiral', name: 'Spiral', options: ['turns (1-50)', 'spacing (1-20)']},
    2: {id: 'spirograph', name: 'Spirograph', options: ['R (10-300)', 'r (5-150)', 'd (5-200)', 'revolutions (1-100)']},
    3: {id: 'lissajous', name: 'Lissajous', options: ['a (1-20)', 'b (1-20)', 'delta (0-180)', 'size (50-500)']},
    4: {id: 'maze', name: 'Maze', options: ['rows (5-50)', 'cols (5-50)', 'cell_size (5-40)']},
    5: {id: 'dragon', name: 'Dragon Curve', options: ['iterations (1-16)', 'size (1-10)']},
    6: {id: 'hilbert', name: 'Hilbert Curve', options: ['order (1-7)', 'size (100-800)']},
    7: {id: 'tree', name: 'Fractal Tree', options: ['depth (1-12)', 'trunk_length (20-200)', 'angle (10-45)', 'ratio (0.5-0.9)']},
    8: {id: 'hexagons', name: 'Hexagon Grid', options: ['size (5-50)', 'rows (3-30)', 'cols (3-30)']},
    9: {id: 'voronoi', name: 'Voronoi Diagram', options: ['points (5-200)', 'margin (10-100)']},
    10: {id: 'flowfield', name: 'Flow Field', options: ['lines (50-1000)', 'length (10-200)', 'scale (0.001-0.1)']},
    11: {id: 'border', name: 'Border', options: ['margin (0-50)']},
    12: {id: 'text', name: 'Text', options: ['text (string)', 'size (10-200)']},
    13: {id: 'sonakinatography', name: 'Sonakinatography', options: ['algorithm (weave/pulse/spiral/grid/organic)', 'density (0.1-1.0)', 'scale (0.5-3.0)']},
    14: {id: 'slimemold', name: 'Slime Mold', options: ['agents (100-10000)', 'iterations (50-1000)', 'sensor_angle (10-90)', 'sensor_distance (3-30)']},
    15: {id: 'geodataweaving', name: 'Geodata Weaving', options: ['latitude (-90 to 90)', 'longitude (-180 to 180)', 'threads (16-128)', 'shafts (2-8)']},
    16: {id: 'poetryclouds', name: 'Poetry Clouds', options: ['text_size (3-20mm)', 'cloud_threshold (0.3-0.7)', 'noise_scale (0.005-0.05)', 'seed (-1 for random)']},
    17: {id: 'geometricpattern', name: 'Geometric Pattern', options: ['columns (2-8)', 'rows (2-10)', 'seed (-1 for random)']},
    18: {id: 'glow', name: 'Glow (Multi-Color)', options: ['color_profile (rainbow/warm/cool/monochrome/primary/pastel)', 'particles (100-2000)', 'iterations (50-500)']},
    19: {id: 'randompoetry', name: 'Random Poetry', options: ['word_source (dickinson/shakespeare/poe/whitman/romantic/nature/cosmic/gothic/zen)', 'word_count (5-50)']},
    20: {id: 'gameoflife', name: 'Game of Life', options: ['cell_size (5-30mm)', 'generations (10-200)', 'initial_density (0.2-0.6)']},
    21: {id: 'zenpots', name: 'Zen Pots (Multi-Color)', options: ['pot_count (3-20)', 'pot_color (terracotta/earth/slate/clay/ceramic/rustic/modern/vintage)', 'flower_style (branches/minimal/full/mixed/none)', 'flower_color (forest/spring/autumn/lavender/wildflower/tropical/berry/ink)']},
    22: {id: 'bezier', name: 'Bezier Curves', options: ['curve_count (5-50)', 'curve_spread (20-200)', 'style (flowing/random/parallel/radial/wave)']},
    23: {id: 'noise', name: 'Perlin Noise Dots', options: ['grid_spacing (5-30mm)', 'noise_scale_x (0.005-0.05)', 'shape (circle/square/diamond/cross/line)']},
    24: {id: 'kaleidoscope', name: 'Kaleidoscope', options: ['symmetry (4-16)', 'pattern (curves/lines/spirals/petals/geometric)', 'complexity (5-20)']},
    25: {id: 'colorfuldots', name: 'Colorful Dots (CMYK)', options: ['color_mode (cmyk/rgb/primary/warm/cool)', 'grid_spacing (10-30mm)', 'max_dot_size (8-20mm)']},
    26: {id: 'interlockings', name: 'Interlockings (Multi-Color)', options: ['num_layers (4-12)', 'lines_per_layer (20-60)', 'line_spacing (3-10mm)']},
    27: {id: 'sudokucartography', name: 'Sudoku Cartography', options: ['initial_clues (15-25)', 'curve_tension (30-100)', 'draw_grid (true/false)']},
};

const PEN_COLORS = {
    1: {id: 'brown', name: 'Brown'},
    2: {id: 'black', name: 'Black'},
    3: {id: 'blue', name: 'Blue'},
    4: {id: 'green', name: 'Green'},
    5: {id: 'purple', name: 'Purple'},
    6: {id: 'pink', name: 'Pink'},
    7: {id: 'red', name: 'Red'},
    8: {id: 'orange', name: 'Orange'},
    9: {id: 'yellow', name: 'Yellow'},
};

function buildSystemPrompt(keywords) {
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
    
    // Find JSON array in response
    const jsonMatch = responseText.match(/\[[\s\S]*?\]/);
    if (jsonMatch) {
        try {
            const rawCommands = JSON.parse(jsonMatch[0]);
            for (const cmd of rawCommands) {
                if (cmd && typeof cmd === 'object' && 'generator' in cmd) {
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
            console.log('JSON parse error:', e);
        }
    }
    
    return {
        commands,
        thoughts,
        isFinished: responseText.toUpperCase().includes('FINISHED')
    };
}

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
            const keywords = body.keywords || '';
            
            const systemPrompt = buildSystemPrompt(keywords);
            
            // Call Gemini API
            const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${env.GEMINI_API_KEY}`;
            
            const geminiResponse = await fetch(geminiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{
                        parts: [{ text: systemPrompt + '\n\nCreate your artwork now:' }]
                    }],
                    generationConfig: {
                        temperature: 1.0,
                        maxOutputTokens: 8192,
                    }
                })
            });

            if (!geminiResponse.ok) {
                const errorText = await geminiResponse.text();
                return new Response(JSON.stringify({
                    error: `Gemini API error: ${geminiResponse.status}`,
                    details: errorText
                }), {
                    status: 500,
                    headers: {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*',
                    }
                });
            }

            const geminiData = await geminiResponse.json();
            
            let responseText = '';
            if (geminiData.candidates && geminiData.candidates[0]) {
                const content = geminiData.candidates[0].content;
                if (content && content.parts && content.parts[0]) {
                    responseText = content.parts[0].text || '';
                }
            }

            const { commands, thoughts, isFinished } = parseCommands(responseText);

            return new Response(JSON.stringify({
                entities: commands,
                thoughts: thoughts,
                is_finished: isFinished,
                raw_response: responseText
            }), {
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                }
            });

        } catch (error) {
            return new Response(JSON.stringify({
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
