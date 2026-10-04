#!/usr/bin/env python3
"""Browser test for the Community Hobby search: type to narrow, keyboard and mouse picks,
your-hobbies-only lists on Going / For you, every hobby on All events.

Run: python3 tests/filters.e2e.py   (builds first if dist/Habitual.html is missing)
"""
import os
import re
import subprocess
import sys

from playwright.sync_api import sync_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PAGE = os.path.join(ROOT, "dist", "Habitual.html")
failures = []


def check(ok, msg):
    print(("PASS " if ok else "FAIL ") + msg)
    if not ok:
        failures.append(msg)


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
        page.evaluate('SQ.seedDemo(); SQUI.go("community")')
        page.wait_for_timeout(300)

        def shown():
            return page.evaluate('[...document.querySelectorAll("#cm-hobby-list [role=option]")].filter(l => !l.hidden).map(l => l.innerText)')

        def is_open():
            return not page.evaluate('document.getElementById("cm-hobby-list").hidden')

        page.click("#cm-hobby")
        check(is_open(), "tapping the Hobby field opens the list")
        check(shown() == ["All hobbies", "Running", "Drawing", "Guitar"], "Going lists only your hobbies")
        page.keyboard.press("Escape")
        check(not is_open(), "Escape closes the list")

        page.click('[data-action="category"][data-v="all"]')
        page.click("#cm-hobby")
        check(len(shown()) > 4 and "Tennis" in shown(), "All events lists every hobby to discover")
        page.keyboard.type("ten")
        check(shown() == ["Tennis"], "typing narrows the list")
        page.keyboard.press("Enter")
        page.wait_for_timeout(250)
        check(page.input_value("#cm-hobby") == "Tennis", "Enter picks the match")
        check(not is_open(), "the list closes after a pick")
        hobbies = page.evaluate('[...document.querySelectorAll(".cm-photo-hobby")].map(e => e.innerText)')
        check(hobbies and all(h == "Tennis" for h in hobbies), "only Tennis events are shown")

        page.wait_for_timeout(450)
        page.click("#cm-hobby")
        page.keyboard.type("zzz")
        check(page.evaluate('!document.querySelector(".cm-combo-none").hidden'), "no match shows a message")
        page.keyboard.press("Escape")
        check(page.input_value("#cm-hobby") == "Tennis", "Escape restores the current pick")

        page.click("#cm-hobby")
        page.click('#cm-hobby-list [data-v="chess"]')
        page.wait_for_timeout(250)
        check(page.input_value("#cm-hobby") == "Chess" and not is_open(), "tapping an option picks it")

        page.click(".cm-combo-clear")
        page.wait_for_timeout(250)
        check(page.input_value("#cm-hobby") == "", "the clear button shows all hobbies again")

        page.wait_for_timeout(450)
        page.click("#cm-hobby")
        page.click('#cm-hobby-list [data-v="tennis"]')
        page.wait_for_timeout(250)
        page.click('[data-action="category"][data-v="going"]')
        page.wait_for_timeout(200)
        check(page.input_value("#cm-hobby") == "", "a hobby you don't track is cleared when you switch to Going")
        check(not errors, "no page errors " + "; ".join(errors))
        browser.close()
    print(f"{len(failures)} filter failures" if failures else "filters: all green")
    sys.exit(1 if failures else 0)


if __name__ == "__main__":
    main()
