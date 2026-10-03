#!/usr/bin/env python3
"""Inline src/ files into one self-contained page: dist/sidequest.html (artifact body, no doctype)
and dist/preview.html (full document for local headless testing). Missing files are skipped."""
import base64
import os

ROOT = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(ROOT, "src")
DIST = os.path.join(ROOT, "dist")
FONTS = ("https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,600;"
         "12..96,800&family=Figtree:wght@400;500;600;700&family=JetBrains+Mono:wght@500;700&display=swap")
CSS = ["shell.css", "discover.css", "community.css", "showcase.css"]
JS = ["data.js", "engine.js", "shell.js", "discover.js", "community.js", "showcase.js", "boot.js"]
MODELS = os.path.join(ROOT, "assets", "models")


def read(name):
    p = os.path.join(SRC, name)
    if not os.path.exists(p):
        print("  (missing)", name)
        return None
    with open(p, encoding="utf-8") as f:
        return f.read()


def main():
    os.makedirs(DIST, exist_ok=True)
    parts = ["<title>Sidequest</title>",
             '<link rel="preconnect" href="https://fonts.googleapis.com">',
             '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>',
             f'<link rel="stylesheet" href="{FONTS}">']
    for c in CSS:
        t = read(c)
        if t is not None:
            parts.append(f"<style data-src=\"{c}\">\n{t}\n</style>")
    parts.append('<div id="app"><main id="app-main"></main><nav id="app-nav" aria-label="Main"></nav></div>')
    parts.append('<div id="overlay-root"></div><div id="toast-root" aria-live="polite"></div>')
    for j in JS:
        t = read(j)
        if t is not None:
            t = t.replace("</script", "<\\/script")
            parts.append(f"<script data-src=\"{j}\">\n{t}\n</script>")
    body = "\n".join(parts)
    with open(os.path.join(DIST, "sidequest.html"), "w", encoding="utf-8") as f:
        f.write(body)
    with open(os.path.join(DIST, "preview.html"), "w", encoding="utf-8") as f:
        f.write('<!doctype html><html><head><meta charset="utf-8">'
                '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">'
                '<style>:root{color-scheme:light}body{margin:0}[hidden]{display:none!important}img{max-width:100%}</style>'
                f'</head><body>{body}</body></html>')
    # Characters ship as script files (base64 GLB) so the showcase can load them even from file://.
    os.makedirs(os.path.join(DIST, "models"), exist_ok=True)
    for f in sorted(os.listdir(MODELS)) if os.path.isdir(MODELS) else []:
        if f.endswith(".glb"):
            with open(os.path.join(MODELS, f), "rb") as g:
                b64 = base64.b64encode(g.read()).decode()
            with open(os.path.join(DIST, "models", f[:-4] + ".js"), "w") as out:
                out.write(f'(window.SQ_MODELS=window.SQ_MODELS||{{}})["{f[:-4]}"]="{b64}";')
    print("built dist/sidequest.html", len(body), "bytes")


if __name__ == "__main__":
    main()
