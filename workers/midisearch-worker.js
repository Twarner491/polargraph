/**
 * MIDI Search Worker
 * Searches BitMidi for MIDI files and proxies downloads
 *
 * Endpoints:
 * - POST /search: Search for MIDI files
 * - POST /download: Download a MIDI file
 */

export default {
    async fetch(request, env, ctx) {
        const url = new URL(request.url);
        const path = url.pathname;

        // Handle CORS preflight
        if (request.method === "OPTIONS") {
            return corsResponse(null);
        }

        // Route requests
        if (request.method === "GET") {
            return corsResponse(JSON.stringify({
                info: "MIDI Search Proxy",
                endpoints: {
                    "/search": "POST with {query: 'song name'}",
                    "/download": "POST with {url: 'midi page url'}"
                }
            }));
        }

        if (request.method !== "POST") {
            return corsResponse(JSON.stringify({ error: "Method not allowed" }), 405);
        }

        try {
            const data = await request.json();

            if (path === "/search" || path === "/" && data.query) {
                return await handleSearch(data);
            } else if (path === "/download" || path === "/" && data.url) {
                return await handleDownload(data);
            } else {
                return corsResponse(JSON.stringify({
                    error: "Unknown endpoint. Use /search or /download"
                }), 400);
            }
        } catch (error) {
            console.error("Worker error:", error);
            return corsResponse(JSON.stringify({
                success: false,
                error: error.message
            }), 500);
        }
    }
};

function corsResponse(body, status = 200, contentType = "application/json") {
    const headers = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
        "Content-Type": contentType
    };

    if (body === null) {
        return new Response(null, { status: 204, headers });
    }

    return new Response(body, { status, headers });
}

async function handleSearch(data) {
    const query = (data.query || "").trim();

    if (!query) {
        return corsResponse(JSON.stringify({
            success: false,
            error: "No search query provided"
        }), 400);
    }

    console.log(`Searching for: ${query}`);

    try {
        // Search BitMidi
        const searchUrl = `https://bitmidi.com/search?q=${encodeURIComponent(query)}`;
        const response = await fetch(searchUrl, {
            headers: {
                "User-Agent": "Mozilla/5.0 (compatible; Polargraph/1.0)",
                "Accept": "text/html"
            }
        });

        if (!response.ok) {
            throw new Error(`BitMidi search failed: ${response.status}`);
        }

        const html = await response.text();
        const results = parseSearchResults(html);

        console.log(`Found ${results.length} results`);

        return corsResponse(JSON.stringify({
            success: true,
            results: results
        }));

    } catch (error) {
        console.error("Search error:", error);
        return corsResponse(JSON.stringify({
            success: false,
            error: `Search failed: ${error.message}`
        }), 500);
    }
}

function parseSearchResults(html) {
    const results = [];

    // Look for MIDI links in the HTML
    // BitMidi format: <a href="/midi/song-name-mid">Song Name</a>
    const linkPattern = /<a[^>]*href="(\/midi\/[^"]+)"[^>]*>([^<]+)<\/a>/gi;
    let match;

    while ((match = linkPattern.exec(html)) !== null && results.length < 10) {
        const href = match[1];
        let title = match[2].trim();

        // Clean up title
        title = title.replace(/\.mid$/i, "").replace(/-/g, " ");

        // Skip if it's a navigation link or too short
        if (title.length < 3 || href.includes("/search") || href.includes("/popular")) {
            continue;
        }

        // Check for duplicates
        const fullUrl = `https://bitmidi.com${href}`;
        if (!results.find(r => r.url === fullUrl)) {
            results.push({
                title: title,
                url: fullUrl,
                source: "BitMidi"
            });
        }
    }

    // Also try to find article/card elements
    // <article><a href="/midi/..."><h3>Title</h3></a></article>
    const articlePattern = /<article[^>]*>[\s\S]*?<a[^>]*href="(\/midi\/[^"]+)"[^>]*>[\s\S]*?<h[123][^>]*>([^<]+)<\/h[123]>/gi;

    while ((match = articlePattern.exec(html)) !== null && results.length < 10) {
        const href = match[1];
        const title = match[2].trim();

        const fullUrl = `https://bitmidi.com${href}`;
        if (!results.find(r => r.url === fullUrl) && title.length > 2) {
            results.push({
                title: title,
                url: fullUrl,
                source: "BitMidi"
            });
        }
    }

    return results;
}

async function handleDownload(data) {
    let midiUrl = (data.url || "").trim();

    if (!midiUrl) {
        return corsResponse(JSON.stringify({
            success: false,
            error: "No URL provided"
        }), 400);
    }

    console.log(`Downloading from: ${midiUrl}`);

    try {
        const headers = {
            "User-Agent": "Mozilla/5.0 (compatible; Polargraph/1.0)",
            "Accept": "*/*"
        };

        // For BitMidi pages, we need to find the actual download link
        if (midiUrl.includes("bitmidi.com") && !midiUrl.endsWith(".mid")) {
            console.log("Fetching BitMidi page to find download link...");

            const pageResponse = await fetch(midiUrl, { headers });
            if (!pageResponse.ok) {
                throw new Error(`Failed to fetch BitMidi page: ${pageResponse.status}`);
            }

            const html = await pageResponse.text();

            // Find download link - look for href ending in .mid
            const downloadMatch = html.match(/href="([^"]*\.mid[^"]*)"/i);
            if (downloadMatch) {
                midiUrl = downloadMatch[1];
                if (!midiUrl.startsWith("http")) {
                    midiUrl = `https://bitmidi.com${midiUrl}`;
                }
                console.log(`Found download link: ${midiUrl}`);
            } else {
                throw new Error("Could not find MIDI download link on page");
            }
        }

        // Download the MIDI file
        const response = await fetch(midiUrl, { headers });
        if (!response.ok) {
            throw new Error(`Failed to download MIDI: ${response.status}`);
        }

        const midiData = await response.arrayBuffer();

        // Verify it's a MIDI file
        const bytes = new Uint8Array(midiData);
        if (bytes.length < 4 ||
            String.fromCharCode(bytes[0], bytes[1], bytes[2], bytes[3]) !== "MThd") {
            throw new Error("Downloaded file is not a valid MIDI file");
        }

        // Return the MIDI data as base64
        const base64 = arrayBufferToBase64(midiData);

        // Extract filename from URL
        const filename = midiUrl.split("/").pop().replace(/[^a-zA-Z0-9._-]/g, "_");

        return corsResponse(JSON.stringify({
            success: true,
            filename: filename,
            midi_data: base64,
            size: midiData.byteLength
        }));

    } catch (error) {
        console.error("Download error:", error);
        return corsResponse(JSON.stringify({
            success: false,
            error: `Download failed: ${error.message}`
        }), 500);
    }
}

function arrayBufferToBase64(buffer) {
    const bytes = new Uint8Array(buffer);
    let binary = "";
    for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}
