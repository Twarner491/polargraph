/**
 * GPenT Cloudflare Worker
 * Proxies requests to Gemini API for the public polargraph site
 * 
 * Deploy: wrangler deploy
 * Set secret: wrangler secret put GEMINI_API_KEY
 */

// Available generators (must match gpent.py)
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
};

const PEN_COLORS = {
  1: { id: 'brown', name: 'Brown' },
  2: { id: 'black', name: 'Black' },
  3: { id: 'blue', name: 'Blue' },
  4: { id: 'green', name: 'Green' },
  5: { id: 'purple', name: 'Purple' },
  6: { id: 'pink', name: 'Pink' },
  7: { id: 'red', name: 'Red' },
  8: { id: 'orange', name: 'Orange' },
  9: { id: 'yellow', name: 'Yellow' },
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
          if (cmd.thought) thoughts.push(cmd.thought);

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

  const isFinished = responseText.toUpperCase().includes('FINISHED');
  return { commands, thoughts, isFinished };
}

async function callGemini(apiKey, keywords) {
  const systemPrompt = buildSystemPrompt(keywords);

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: systemPrompt + '\n\nCreate your artwork now:' }] }],
        generationConfig: { temperature: 1.0, maxOutputTokens: 8192 },
      }),
    }
  );

  if (!response.ok) {
    throw new Error(`Gemini API error: ${response.status}`);
  }

  const result = await response.json();
  if (result.candidates?.[0]?.content?.parts?.[0]?.text) {
    return result.candidates[0].content.parts[0].text;
  }
  return '';
}

export default {
  async fetch(request, env) {
    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    // Handle preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    if (request.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    try {
      const { keywords = '' } = await request.json();
      const logs = [];

      logs.push('GPenT contemplating the canvas...');
      logs.push('Summoning creative inspiration...');

      const responseText = await callGemini(env.GEMINI_API_KEY, keywords);

      logs.push('Processing artistic vision...');

      const { commands, thoughts, isFinished } = parseCommands(responseText);

      if (thoughts.length > 0) {
        logs.push('-'.repeat(50));
        logs.push('GPenT Chain of Thought:');
        thoughts.forEach((t, i) => logs.push(`  ${i + 1}. ${t}`));
        logs.push('-'.repeat(50));
      }

      if (commands.length === 0) {
        logs.push('Warning: No valid commands parsed');
        return new Response(
          JSON.stringify({ success: true, commands: [], logs, isFinished: false }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      logs.push(`GPenT generated ${commands.length} elements`);
      if (isFinished) logs.push('GPenT declares the artwork complete');

      return new Response(
        JSON.stringify({ success: true, commands, logs, isFinished }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } catch (error) {
      return new Response(
        JSON.stringify({ success: false, error: error.message, logs: [`Error: ${error.message}`] }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  },
};
