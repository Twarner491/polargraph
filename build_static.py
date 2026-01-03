#!/usr/bin/env python3
"""
Build script to generate static documentation from the web interface.
Exports the frontend to the docs/ folder for GitHub Pages.

The static site can optionally connect to a Home Assistant webhook for
remote plotter control via MQTT.
"""

import os
import shutil

SRC_DIR = 'src'
DOCS_DIR = 'docs'

# Set this to your Home Assistant webhook URL for remote access
# Leave empty for local-only mode (connects directly to plotter.local)
HA_WEBHOOK_URL = ""  # e.g., "https://your-ha-instance.duckdns.org/api/webhook/polargraph_command"

# GPenT Cloudflare Worker URL for AI-powered generation on the public site
GPENT_WORKER_URL = "https://gpent-proxy.teddy-557.workers.dev/"


def build():
    """Build static files for documentation."""
    print("Building static documentation...")
    
    # Ensure docs directory exists
    os.makedirs(DOCS_DIR, exist_ok=True)
    os.makedirs(os.path.join(DOCS_DIR, 'static', 'css'), exist_ok=True)
    os.makedirs(os.path.join(DOCS_DIR, 'static', 'js'), exist_ok=True)
    
    # Copy static assets
    static_src = os.path.join(SRC_DIR, 'static')
    static_dst = os.path.join(DOCS_DIR, 'static')
    
    if os.path.exists(static_src):
        for item in os.listdir(static_src):
            src_path = os.path.join(static_src, item)
            dst_path = os.path.join(static_dst, item)
            
            if os.path.isdir(src_path):
                if os.path.exists(dst_path):
                    shutil.rmtree(dst_path)
                shutil.copytree(src_path, dst_path)
            else:
                shutil.copy2(src_path, dst_path)
    
    # Process JavaScript for static build
    js_src = os.path.join(DOCS_DIR, 'static', 'js', 'app.js')
    if os.path.exists(js_src):
        with open(js_src, 'r', encoding='utf-8') as f:
            js_content = f.read()
        
        # Replace the webhook URL placeholder with actual value
        js_content = js_content.replace(
            'var POLARGRAPH_WEBHOOK_URL = "";',
            f'var POLARGRAPH_WEBHOOK_URL = "{HA_WEBHOOK_URL}";'
        )
        
        # Replace GPenT Worker URL placeholder
        js_content = js_content.replace(
            'var GPENT_WORKER_URL = "";',
            f'var GPENT_WORKER_URL = "{GPENT_WORKER_URL}";'
        )
        
        # Force client-side mode for static build
        js_content = js_content.replace(
            "let CLIENT_SIDE_MODE = !!POLARGRAPH_WEBHOOK_URL || window.location.hostname === 'plotter.onethreenine.net' || window.location.protocol === 'file:';",
            "let CLIENT_SIDE_MODE = true; // Static build - always client-side"
        )
        
        with open(js_src, 'w', encoding='utf-8') as f:
            f.write(js_content)
    
    # Generate static index.html
    index_template = os.path.join(SRC_DIR, 'templates', 'index.html')
    index_output = os.path.join(DOCS_DIR, 'index.html')
    
    if os.path.exists(index_template):
        with open(index_template, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Change header title for static site
        content = content.replace(
            '<span class="header-title">plotter.local</span>',
            '<span class="header-title">plotter.onethreenine.net</span>'
        )
        
        # No extra notices needed - status shown in header
        
        with open(index_output, 'w', encoding='utf-8') as f:
            f.write(content)
    
    # Create about page (same content, JS detects /about path)
    about_dir = os.path.join(DOCS_DIR, 'about')
    os.makedirs(about_dir, exist_ok=True)
    about_output = os.path.join(about_dir, 'index.html')
    
    if os.path.exists(index_output):
        with open(index_output, 'r', encoding='utf-8') as f:
            about_content = f.read()
        
        # Update title for about page
        about_content = about_content.replace(
            '<title>polargraph</title>',
            '<title>about polargraph</title>'
        )
        
        with open(about_output, 'w', encoding='utf-8') as f:
            f.write(about_content)
    
    # Ensure CNAME exists
    cname_path = os.path.join(DOCS_DIR, 'CNAME')
    if not os.path.exists(cname_path):
        with open(cname_path, 'w', encoding='utf-8') as f:
            f.write('plotter.onethreenine.net')
    
    print(f"Static files built to {DOCS_DIR}/")
    if HA_WEBHOOK_URL:
        print(f"Remote mode: {HA_WEBHOOK_URL}")
    else:
        print("Demo mode: Set HA_WEBHOOK_URL in build_static.py for remote control")


if __name__ == '__main__':
    build()
