#!/usr/bin/env python3
"""Browser test for the Today header: your character, level, and the "Up next" pick for today.

Run: python3 tests/today.e2e.py   (builds first if dist/Habitual.html is missing)
Set SHOTS=<dir> to also save screenshots.
"""
import os
import re
import subprocess
import sys

from playwright.sync_api import sync_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PAGE = os.path.join(ROOT, "dist", "Habitual.html")
SHOTS = os.environ.get("SHOTS")
failures = []


def check(ok, msg):
    print(("PASS " if ok else "FAIL ") + msg)
    if not ok:
        failures.append(msg)


def shot(page, name):
    if SHOTS:
        page.screenshot(path=os.path.join(SHOTS, name + ".png"))


def main():
    if not os.path.exists(PAGE):
        subprocess.check_call([sys.executable, os.path.join(ROOT, "build.py")])
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page(viewport={"width": 390, "height": 844})
        page.route(re.compile(r"https://fonts\.(googleapis|gstatic)\.com/.*"), lambda r: r.fulfill(status=200, content_type="text/css", body=""))
        page.route(re.compile(r"https://cdn\.jsdelivr\.net/.*"), lambda r: r.fulfill(status=200, content_type="application/javascript", body=""))
        errors = []
        page.on("pageerror", lambda e: errors.append(str(e)))
        page.goto("file://" + PAGE)
        page.wait_for_timeout(300)

        # Fresh player: no hobbies yet
        page.evaluate('SQ.reset && SQ.reset(); SQ.state.onboarded = true; SQ.state.user.character = "adrian"; SQ.save(); SQUI.go("today")')
        page.wait_for_timeout(200)
        check(page.locator(".td-card .cm-mii[data-character=adrian]").count() == 1, "the header shows the character you picked")
        check(page.locator('.td-next [data-action="pick"]').count() == 1, "with no hobbies, Up next points to choosing one")
        shot(page, "today-empty")

        # Demo player mid-week
        page.evaluate('SQ.seedDemo(); SQ.state.user.character = "alvaro"; SQ.save(); SQUI.go("today")')
        page.wait_for_timeout(200)
        check(page.locator(".td-card .cm-mii[data-character=alvaro]").count() == 1, "switching character updates the header")
        check(page.locator(".td-mascot").count() == 0, "the old Sprout header is gone")
        go = page.locator('.td-next [data-action="tiny"]')
        check(go.count() == 1, "Up next offers one thing to do today")
        shot(page, "today-demo")
        before = page.evaluate("SQ.state.sessions.length")
        hid = go.get_attribute("data-id")
        go.click()
        page.wait_for_timeout(400)
        check(page.evaluate("SQ.state.sessions.length") == before + 1, "tapping Up next logs that session")
        check(page.evaluate(f'SQ.state.sessions[SQ.state.sessions.length - 1].hobbyId') == hid, "it logs the suggested hobby")
        page.keyboard.press("Escape")
        page.wait_for_timeout(600)
        page.evaluate('document.querySelectorAll(".reward-overlay, .sq-reward").forEach(e => e.remove()); SQUI.go("today")')
        page.wait_for_timeout(200)
        shot(page, "today-after")
        check(page.evaluate("document.documentElement.scrollWidth") <= 390, "no sideways scrolling")
        check(not errors, "no page errors " + "; ".join(errors))
        browser.close()
    print(f"{len(failures)} today failures" if failures else "today: all green")
    sys.exit(1 if failures else 0)


if __name__ == "__main__":
    main()
