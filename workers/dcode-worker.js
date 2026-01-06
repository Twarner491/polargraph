/**
 * dcode Cloudflare Worker Proxy
 * Proxies requests to the HuggingFace dcode Space (Gradio 5.9.1)
 */

const DCODE_SPACE_URL = "https://twarner-dcode.hf.space";

export default {
    async fetch(request, env, ctx) {
        // Handle CORS preflight
        if (request.method === "OPTIONS") {
            return new Response(null, {
                headers: {
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
                    "Access-Control-Allow-Headers": "Content-Type",
                },
            });
        }

        // Debug endpoint
        if (request.method === "GET") {
            return jsonResponse({ 
                info: "dcode proxy",
                space: DCODE_SPACE_URL,
                usage: "POST with {prompt, temperature?, max_tokens?, diffusion_steps?, guidance?, seed?}"
            });
        }

        if (request.method !== "POST") {
            return jsonResponse({ error: "Method not allowed" }, 405);
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
                return jsonResponse({ success: false, error: "Prompt is required" }, 400);
            }

            const inputs = [prompt, temperature, max_tokens, diffusion_steps, guidance, seed];
            
            // Try up to 3 times (ZeroGPU can fail on first attempt while warming up)
            let lastError = null;
            for (let attempt = 1; attempt <= 3; attempt++) {
                console.log(`Attempt ${attempt}/3...`);
                try {
                    const result = await callGradio5API(inputs);
                    return jsonResponse({ success: true, gcode: result.gcode, svg: result.svg });
                } catch (e) {
                    lastError = e;
                    console.log(`Attempt ${attempt} failed: ${e.message}`);
                    if (attempt < 3) {
                        // Wait before retry (give ZeroGPU time to warm up)
                        await sleep(3000);
                    }
                }
            }
            
            throw lastError;

        } catch (error) {
            console.error("dcode error:", error.message);
            return jsonResponse({ 
                success: false, 
                error: error.message
            }, 500);
        }
    },
};

function jsonResponse(data, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: { 
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*"
        },
    });
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function generateSessionHash() {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let hash = '';
    for (let i = 0; i < 11; i++) {
        hash += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return hash;
}

async function callGradio5API(inputs) {
    const sessionHash = generateSessionHash();
    
    // Step 1: Join the queue via /gradio_api/queue/join
    console.log("Step 1: Joining queue...");
    const joinResp = await fetch(`${DCODE_SPACE_URL}/gradio_api/queue/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            data: inputs,
            fn_index: 0,
            session_hash: sessionHash
        })
    });
    
    if (!joinResp.ok) {
        const text = await joinResp.text();
        throw new Error(`Queue join failed: ${joinResp.status} - ${text.substring(0, 100)}`);
    }
    
    const joinResult = await joinResp.json();
    console.log("Joined queue, event_id:", joinResult.event_id);
    
    // Step 2: Get result from /gradio_api/queue/data
    console.log("Step 2: Fetching result...");
    const dataResp = await fetch(
        `${DCODE_SPACE_URL}/gradio_api/queue/data?session_hash=${sessionHash}`,
        { headers: { "Accept": "text/event-stream" } }
    );
    
    if (!dataResp.ok) {
        throw new Error(`Queue data failed: ${dataResp.status}`);
    }
    
    const sseText = await dataResp.text();
    console.log("SSE response length:", sseText.length);
    
    // Parse SSE events
    const lines = sseText.split('\n');
    
    for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        
        try {
            const event = JSON.parse(line.substring(6));
            console.log("Event:", event.msg);
            
            if (event.msg === 'process_completed') {
                // Check for failure
                if (event.success === false) {
                    const errorMsg = event.output?.error || event.title || "ZeroGPU failed to process. Try again.";
                    throw new Error(errorMsg);
                }
                
                // Extract data
                if (event.output?.data && Array.isArray(event.output.data) && event.output.data.length >= 2) {
                    console.log("Success! Got gcode.");
                    return { 
                        gcode: event.output.data[0], 
                        svg: event.output.data[1] 
                    };
                }
                
                throw new Error("Invalid response format from space");
            }
        } catch (e) {
            if (e.message.includes("ZeroGPU") || e.message.includes("Invalid response")) {
                throw e;
            }
            // JSON parse error, continue
        }
    }
    
    throw new Error("No completion event received from space");
}
