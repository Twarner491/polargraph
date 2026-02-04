/**
 * dcode Cloudflare Worker Proxy
 * Proxies requests to the HuggingFace dcode Space (Gradio 5.x with ZeroGPU)
 *
 * Handles:
 * - Space wake-up when sleeping
 * - ZeroGPU warmup retries
 * - Gradio 5.x queue-based API
 */

const DCODE_SPACE_URL = "https://twarner-dcode.hf.space";
const HUGGINGFACE_SPACE_URL = "https://huggingface.co/spaces/twarner/dcode";

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

        // Debug/status endpoint
        if (request.method === "GET") {
            // Check if space is awake
            let spaceStatus = "unknown";
            try {
                const healthResp = await fetch(`${DCODE_SPACE_URL}/gradio_api/info`, {
                    method: "GET",
                    signal: AbortSignal.timeout(5000)
                });
                spaceStatus = healthResp.ok ? "awake" : "sleeping";
            } catch (e) {
                spaceStatus = "sleeping or unreachable";
            }

            return jsonResponse({
                info: "dcode proxy",
                space: DCODE_SPACE_URL,
                status: spaceStatus,
                usage: "POST with {prompt, temperature?, max_tokens?, diffusion_steps?, guidance?, seed?}",
                note: "If space is sleeping, first request will wake it up (takes ~30s)"
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

            // First, check if space is awake and wake it if needed
            const awake = await ensureSpaceAwake();
            if (!awake) {
                return jsonResponse({
                    success: false,
                    error: `dcode space is waking up. Please try again in 30 seconds, or visit ${HUGGINGFACE_SPACE_URL} to wake it manually.`,
                    waking: true
                }, 503);
            }

            // Try up to 3 times (ZeroGPU can fail on first attempt while warming up)
            let lastError = null;
            for (let attempt = 1; attempt <= 3; attempt++) {
                console.log(`Attempt ${attempt}/3...`);
                try {
                    const result = await callGradioAPI(inputs);
                    return jsonResponse({ success: true, gcode: result.gcode, svg: result.svg });
                } catch (e) {
                    lastError = e;
                    console.log(`Attempt ${attempt} failed: ${e.message}`);

                    // If it's a ZeroGPU quota error, don't retry
                    if (e.message.includes("quota") || e.message.includes("exceeded")) {
                        break;
                    }

                    if (attempt < 3) {
                        // Wait before retry (give ZeroGPU time to warm up)
                        await sleep(5000);
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

/**
 * Check if the HuggingFace space is awake and try to wake it if not
 */
async function ensureSpaceAwake() {
    try {
        // Try to reach the Gradio API info endpoint
        const resp = await fetch(`${DCODE_SPACE_URL}/gradio_api/info`, {
            method: "GET",
            signal: AbortSignal.timeout(10000)
        });

        if (resp.ok) {
            console.log("Space is awake");
            return true;
        }

        // Space might be sleeping, try to wake it by hitting the main page
        console.log("Space not responding, attempting to wake...");
        await fetch(DCODE_SPACE_URL, {
            method: "GET",
            signal: AbortSignal.timeout(5000)
        }).catch(() => {});

        // Give it a moment
        await sleep(2000);

        // Check again
        const resp2 = await fetch(`${DCODE_SPACE_URL}/gradio_api/info`, {
            method: "GET",
            signal: AbortSignal.timeout(10000)
        });

        return resp2.ok;

    } catch (e) {
        console.log("Space check failed:", e.message);
        // Try to wake it anyway
        await fetch(DCODE_SPACE_URL, { method: "GET" }).catch(() => {});
        return false;
    }
}

/**
 * Call the Gradio API using the /call endpoint (Gradio 5.x named endpoints)
 */
async function callGradioAPI(inputs) {
    // Try the /gradio_api/call/generate endpoint (Gradio 5.x named endpoints)
    console.log("Calling /gradio_api/call/generate...");
    const callResp = await fetch(`${DCODE_SPACE_URL}/gradio_api/call/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: inputs }),
        signal: AbortSignal.timeout(30000)
    });

    if (!callResp.ok) {
        const text = await callResp.text();
        if (callResp.status === 503 || text.includes("sleeping") || text.includes("loading")) {
            throw new Error("Space is sleeping or loading. Please try again in a moment.");
        }
        // Fall back to queue API if /call fails
        console.log("Call API failed, trying queue API...");
        return await callGradioQueueAPI(inputs);
    }

    const callResult = await callResp.json();
    console.log("Got event_id:", callResult.event_id);

    if (!callResult.event_id) {
        throw new Error("No event_id returned from /call/generate");
    }

    // Poll for results
    console.log("Fetching result...");
    const resultResp = await fetch(`${DCODE_SPACE_URL}/gradio_api/call/generate/${callResult.event_id}`, {
        headers: { "Accept": "text/event-stream" },
        signal: AbortSignal.timeout(120000)
    });

    if (!resultResp.ok) {
        throw new Error(`Result fetch failed: ${resultResp.status}`);
    }

    const sseText = await resultResp.text();
    console.log("SSE response length:", sseText.length);

    // Parse SSE to find the data line
    for (const line of sseText.split('\n')) {
        if (line.startsWith('data:')) {
            try {
                const data = JSON.parse(line.substring(5).trim());
                if (Array.isArray(data) && data.length >= 1) {
                    console.log("Success! Got result.");
                    return { gcode: data[0], svg: data.length > 1 ? data[1] : null };
                }
            } catch (e) {
                // Continue looking
            }
        }
    }

    throw new Error("No valid result in SSE response");
}

/**
 * Fallback: Call the Gradio API using queue-based approach
 */
async function callGradioQueueAPI(inputs) {
    const sessionHash = generateSessionHash();

    // Step 1: Join the queue
    console.log("Joining queue...");
    const joinResp = await fetch(`${DCODE_SPACE_URL}/gradio_api/queue/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            data: inputs,
            fn_index: 0,
            session_hash: sessionHash
        }),
        signal: AbortSignal.timeout(30000)
    });

    if (!joinResp.ok) {
        const text = await joinResp.text();

        // Check for sleeping space
        if (joinResp.status === 503 || text.includes("sleeping") || text.includes("loading")) {
            throw new Error("Space is sleeping or loading. Please try again in a moment.");
        }

        throw new Error(`Queue join failed: ${joinResp.status} - ${text.substring(0, 200)}`);
    }

    const joinResult = await joinResp.json();
    console.log("Joined queue, event_id:", joinResult.event_id);

    // Step 2: Poll for results using SSE
    console.log("Waiting for result...");
    const dataResp = await fetch(
        `${DCODE_SPACE_URL}/gradio_api/queue/data?session_hash=${sessionHash}`,
        {
            headers: { "Accept": "text/event-stream" },
            signal: AbortSignal.timeout(120000)  // 2 minute timeout for generation
        }
    );

    if (!dataResp.ok) {
        throw new Error(`Queue data failed: ${dataResp.status}`);
    }

    const sseText = await dataResp.text();
    console.log("SSE response length:", sseText.length);

    // Parse SSE events
    const lines = sseText.split('\n');
    let lastProgress = "";

    for (const line of lines) {
        if (!line.startsWith('data: ')) continue;

        try {
            const event = JSON.parse(line.substring(6));

            // Log progress updates
            if (event.msg === 'progress' && event.progress_data) {
                const progress = event.progress_data[0];
                if (progress && progress.desc !== lastProgress) {
                    lastProgress = progress.desc;
                    console.log("Progress:", progress.desc);
                }
            }

            // Handle completion
            if (event.msg === 'process_completed') {
                if (event.success === false) {
                    // Extract error message
                    let errorMsg = "Generation failed";
                    if (event.output?.error) {
                        errorMsg = event.output.error;
                    } else if (typeof event.output === 'string') {
                        errorMsg = event.output;
                    }

                    // Check for ZeroGPU specific errors
                    if (errorMsg.includes("ZeroGPU") || errorMsg.includes("GPU")) {
                        throw new Error("ZeroGPU is busy. Please try again in a moment.");
                    }

                    throw new Error(errorMsg);
                }

                // Extract successful result
                if (event.output?.data && Array.isArray(event.output.data) && event.output.data.length >= 1) {
                    console.log("Success! Got result.");
                    return {
                        gcode: event.output.data[0],
                        svg: event.output.data.length > 1 ? event.output.data[1] : null
                    };
                }

                throw new Error("Invalid response format from space");
            }

            // Handle errors
            if (event.msg === 'process_generating' && event.success === false) {
                throw new Error(event.output?.error || "Generation failed during processing");
            }

        } catch (e) {
            // Re-throw our own errors
            if (e.message.includes("ZeroGPU") ||
                e.message.includes("Generation failed") ||
                e.message.includes("Invalid response") ||
                e.message.includes("Space is")) {
                throw e;
            }
            // JSON parse error, continue to next line
        }
    }

    throw new Error("No completion event received. The space may have timed out.");
}
