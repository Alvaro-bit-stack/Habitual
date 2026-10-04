#!/usr/bin/env python3
"""Build Habitual (Ocean design) into one page, dist/Habitual.html, with venue photos and Showcase models."""
import base64
import json
import hashlib
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parent
SRC = ROOT / "src"
DIST = ROOT / "dist"
CSS = ["shell.css", "discover.css", "community.css", "showcase.css", "mobile.css", "ocean.css", "gathering.css"]
JS = ["data.js", "engine.js", "shell.js", "discover.js", "community.js", "showcase.js", "sync-core.js", "cloud.js", "boot.js"]
FONT_URL = "https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@500;700&display=swap"


def venue_script():
    asset_dir = SRC / "assets" / "venues"
    venues = json.loads((asset_dir / "manifest.json").read_text(encoding="utf-8"))
    for venue in venues.values():
        image_path = (asset_dir / venue["file"]).resolve()
        if image_path.parent != asset_dir.resolve():
            raise ValueError("Venue image must be inside src/assets/venues")
        image = image_path.read_bytes()
        if not image.startswith(b"\xff\xd8"):
            raise ValueError("Venue image must be a JPEG")
        venue["src"] = "data:image/jpeg;base64," + base64.b64encode(image).decode("ascii")
    payload = json.dumps(venues, ensure_ascii=True).replace("<", "\\u003c")
    return '<script data-src="venues">globalThis.SQ_VENUES=' + payload + ';</script>'


def avatar_styles():
    # Each character's two sprites are embedded once, rather than once per event/person.
    parts = []
    manifest = json.loads((SRC / "assets" / "avatars" / "manifest.json").read_text())
    for character in manifest["characters"]:
        assets = {}
        for pose in ["idle", "run"]:
            image = (SRC / "assets" / "avatars" / f"{character}-{pose}.png").read_bytes()
            if not image.startswith(b"\x89PNG\r\n\x1a\n"):
                raise ValueError("Avatar sprite must be a PNG")
            assets[pose] = "data:image/png;base64," + base64.b64encode(image).decode("ascii")
        parts.append('.cm-mii[data-character="' + character + '"]{--mii-idle:url("' + assets["idle"] + '");--mii-run:url("' + assets["run"] + '")}')
    return '<style data-src="avatar-sprites">' + "\n".join(parts) + '</style>'


def render(venues):
    parts = ["<title>Habitual</title>",
             '<link rel="preconnect" href="https://fonts.googleapis.com">',
             '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>',
             '<link rel="stylesheet" href="' + FONT_URL + '">']
    for name in CSS:
        parts.append(f'<style data-src="{name}">\n{(SRC / name).read_text(encoding="utf-8-sig")}\n</style>')
    parts.append(avatar_styles())
    parts.append('<div id="app"><main id="app-main"></main><nav id="app-nav" aria-label="Main"></nav></div>')
    parts.append('<div id="overlay-root"></div><div id="toast-root" aria-live="polite"></div>')
    parts.append(venues)
    for name in JS:
        text = (SRC / name).read_text(encoding="utf-8").replace("</script", "<\\/script")
        parts.append(f'<script data-src="{name}">\n{text}\n</script>')
    return "\n".join(parts)


def document(body):
    return ('<!doctype html><html lang="en"><head><meta charset="utf-8">'
            '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">'
            '<meta name="apple-mobile-web-app-capable" content="yes">'
            '<link rel="manifest" href="manifest.webmanifest"><meta name="theme-color" content="#12649c">'
            '<style>body{margin:0}[hidden]{display:none!important}img{max-width:100%}</style>'
            '</head><body>' + body + '</body></html>')


def main():
    DIST.mkdir(exist_ok=True)
    (DIST / "Habitual.html").write_text(document(render(venue_script())), encoding="utf-8")
    # Showcase loads its 3D models from dist/models (works from file:// too).
    (DIST / "models").mkdir(exist_ok=True)
    for model in sorted((ROOT / "assets" / "models").glob("*.glb")):
        b64 = base64.b64encode(model.read_bytes()).decode("ascii")
        (DIST / "models" / (model.stem + ".js")).write_text(
            '(window.SQ_MODELS=window.SQ_MODELS||{})[' + json.dumps(model.stem) + ']="' + b64 + '";', encoding="utf-8")
    for name in ["manifest.webmanifest", "icon.svg", "auth.html"]:
        shutil.copyfile(SRC / name, DIST / name)
    config = ROOT / "cloud-config.json"
    (DIST / "cloud-config.json").write_text(config.read_text(encoding="utf-8") if config.exists() else '{"enabled":false}', encoding="utf-8")
    digest = hashlib.sha256((DIST / "Habitual.html").read_bytes()).hexdigest()[:16]
    (DIST / "sw.js").write_text((SRC / "sw.js").read_text(encoding="utf-8").replace("__BUILD_ID__", digest), encoding="utf-8")
    print("Built dist/Habitual.html (Ocean design, offline shell and optional cloud sync).")


if __name__ == "__main__":
    main()
