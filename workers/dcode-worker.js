/**
 * dcode Cloudflare Worker Proxy
 * Proxies requests to the HuggingFace dcode Space for static site deployment
 * 
 * SETUP:
 * 1. Go to Cloudflare Dashboard → Workers & Pages → Create Application → Create Worker
 * 2. Name it "dcode-proxy" 
 * 3. Deploy, then edit code and paste this file
 * 4. Save and Deploy
 * 5. Update DCODE_WORKER_URL in build_static.py with your worker URL
 */

const DCODE_SPACE_URL = "https://twarner-dcode.hf.space";

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

        try {
            const data = await request.json();
            const prompt = data.prompt || '';
            const temperature = parseFloat(data.temperature) || 0.5;
            const max_tokens = parseInt(data.max_tokens) || 2048;
            const diffusion_steps = parseInt(data.diffusion_steps) || 35;
            const guidance = parseFloat(data.guidance) || 10.0;
            const seed = parseInt(data.seed) || -1;

            if (!prompt.trim()) {
                return new Response(JSON.stringify({ 
                    success: false, 
                    error: "Prompt is required" 
                }), {
                    status: 400,
                    headers: { 
                        "Content-Type": "application/json",
                        "Access-Control-Allow-Origin": "*"
                    },
                });
            }

            // Use Gradio's queue API for long-running tasks
            // Step 1: Join the queue
            const joinResponse = await fetch(`${DCODE_SPACE_URL}/call/generate`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    data: [prompt, temperature, max_tokens, diffusion_steps, guidance, seed]
                }),
            });

            if (!joinResponse.ok) {
                throw new Error(`Failed to join queue: ${joinResponse.status}`);
            }

            const joinResult = await joinResponse.json();
            const eventId = joinResult.event_id;

            if (!eventId) {
                throw new Error("No event_id returned from queue join");
            }

            // Step 2: Poll for result using SSE endpoint
            const resultResponse = await fetch(`${DCODE_SPACE_URL}/call/generate/${eventId}`, {
                method: "GET",
                headers: { "Accept": "text/event-stream" },
            });

            if (!resultResponse.ok) {
                throw new Error(`Failed to get result: ${resultResponse.status}`);
            }

            // Parse SSE response
            const sseText = await resultResponse.text();
            const lines = sseText.split('\n');
            
            let gcode = null;
            let svg = null;
            let error = null;

            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    const dataStr = line.substring(6);
                    try {
                        const eventData = JSON.parse(dataStr);
                        if (Array.isArray(eventData) && eventData.length >= 2) {
                            gcode = eventData[0];
                            svg = eventData[1];
                        } else if (eventData.error) {
                            error = eventData.error;
                        }
                    } catch (e) {
                        // Not JSON, might be progress update
                    }
                }
            }

            if (error) {
                throw new Error(error);
            }

            if (!gcode) {
                throw new Error("No G-code in response");
            }

            return new Response(JSON.stringify({ 
                success: true, 
                gcode: gcode,
                svg: svg 
            }), {
                headers: { 
                    "Content-Type": "application/json",
                    "Access-Control-Allow-Origin": "*"
                },
            });

        } catch (error) {
            console.error("dcode Worker Error:", error);
            return new Response(JSON.stringify({ 
                success: false, 
                error: `dcode error: ${error.message}. The space may be sleeping - visit ${DCODE_SPACE_URL} to wake it.`
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
