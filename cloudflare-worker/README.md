# GPenT Cloudflare Worker

This worker proxies GPenT requests to the Gemini API, allowing the public polargraph site to use AI-powered generation.

## Setup

1. **Install Wrangler CLI:**
   ```bash
   npm install -g wrangler
   ```

2. **Login to Cloudflare:**
   ```bash
   wrangler login
   ```

3. **Deploy the worker:**
   ```bash
   cd cloudflare-worker
   wrangler deploy
   ```

4. **Set the Gemini API key as a secret:**
   ```bash
   wrangler secret put GEMINI_API_KEY
   ```
   Then paste your API key when prompted.

5. **Note the worker URL** (e.g., `https://gpent-proxy.your-subdomain.workers.dev`)

6. **Update build_static.py:**
   ```python
   GPENT_WORKER_URL = "https://gpent-proxy.your-subdomain.workers.dev"
   ```

7. **Rebuild the static site:**
   ```bash
   python build_static.py
   git add -A && git commit -m "Enable GPenT on public site" && git push
   ```

## How it works

1. The static site sends a POST request to the worker with inspiration keywords
2. The worker calls the Gemini API with the system prompt
3. Gemini returns a JSON array of pattern commands
4. The worker parses and returns the commands
5. The static site generates each pattern locally using PatternGenerator
