#!/usr/bin/env python3
"""
Build script to generate static documentation from the web interface.
Exports the frontend to the docs/ folder for GitHub Pages.
"""

import os
import shutil

SRC_DIR = 'src'
DOCS_DIR = 'docs'

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
    
    # Generate static index.html (demo mode)
    index_template = os.path.join(SRC_DIR, 'templates', 'index.html')
    index_output = os.path.join(DOCS_DIR, 'index.html')
    
    if os.path.exists(index_template):
        with open(index_template, 'r') as f:
            content = f.read()
        
        # Add demo mode notice
        demo_notice = '''
        <div style="position:fixed;top:0;left:0;right:0;background:#ffc400;color:#000;padding:8px;text-align:center;z-index:9999;font-weight:600;">
            DEMO MODE - Connect a Raspberry Pi for full functionality
        </div>
        '''
        content = content.replace('<body>', f'<body>{demo_notice}')
        
        with open(index_output, 'w') as f:
            f.write(content)
    
    print(f"Static files built to {DOCS_DIR}/")
    print("Deploy to GitHub Pages or serve with any static file server.")

if __name__ == '__main__':
    build()

