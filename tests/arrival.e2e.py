#!/usr/bin/env python3
"""Browser test for the Community arrival: tapping "I'm going" drops your character in from above
the card, lands it in the "You" slot with sparks, then hands over to the slot's sprite.

Run: python3 tests/arrival.e2e.py   (builds first if dist/Habitual.html is missing)
three.js is stubbed out, so this covers the 2D drop; the 3D drop uses the same slot and callbacks.
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


def open_community(browser, reduced=False):
    ctx = browser.new_context(viewport={"width": 390, "height": 844}, reduced_motion="reduce" if reduced else "no-preference")
    ctx.route(re.compile(r"https://fonts\.(googleapis|gstatic)\.com/.*"), lambda r: r.fulfill(status=200, content_type="text/css", body=""))
    ctx.route(re.compile(r"https://cdn\.jsdelivr\.net/.*"), lambda r: r.fulfill(status=200, content_type="application/javascript", body=""))
    page = ctx.new_page()
    errors = []
    page.on("pageerror", lambda e: errors.append(str(e)))
    page.goto("file://" + PAGE)
    page.wait_for_timeout(400)
    page.evaluate('SQ.seedDemo(); SQUI.go("community")')
    page.click('[data-action="category"][data-v="all"]')
    page.click('[data-action="category"][data-v="all"]')
    page.wait_for_timeout(300)
    eid = page.evaluate("""(() => {
      const b = [...document.querySelectorAll('button[data-action="rsvp"]')].find(b => /I.m going/.test(b.innerText));
      window.scrollTo(0, b.closest('li').getBoundingClientRect().top + scrollY - 250);
      return b.getAttribute('data-id');
    })()""")
    return ctx, page, eid, errors


def slot_state(page, eid):
    return page.evaluate("""id => {
      const li = document.querySelector('[data-action="rsvp"][data-id="' + id + '"]').closest('li');
      const you = li.querySelector('.cm-you');
      const layer = document.querySelector('.cm-drop-layer');
      return { cls: you ? you.className : null, drops: layer ? layer.querySelectorAll('.cm-drop').length : 0,
               sparks: layer ? layer.querySelectorAll('.cm-spark, .cm-spark-ring, .cm-spark-flash').length : 0,
               dropTop: layer && layer.querySelector('.cm-drop') ? layer.querySelector('.cm-drop').getBoundingClientRect().top : null,
               cardTop: li.getBoundingClientRect().top,
               youCount: li.querySelectorAll('.cm-you').length };
    }""", eid)


def main():
    if not os.path.exists(PAGE):
        subprocess.check_call([sys.executable, os.path.join(ROOT, "build.py")])
    with sync_playwright() as p:
        browser = p.chromium.launch()

        ctx, page, eid, errors = open_community(browser)
        page.click(f'button[data-action="rsvp"][data-id="{eid}"]')
        page.wait_for_timeout(60)
        s = slot_state(page, eid)
        check(s["youCount"] == 1, "RSVP adds exactly one You slot")
        check("cm-arriving" in (s["cls"] or ""), "the You slot stays hidden while the character drops in")
        check(s["drops"] == 1, "one falling character is drawn above the page")
        check(s["dropTop"] is not None and s["dropTop"] < s["cardTop"], "the fall starts above the card")
        page.wait_for_timeout(560)
        s = slot_state(page, eid)
        check(s["sparks"] > 0, "sparks burst on landing")
        check("cm-landed" in (s["cls"] or "") or "cm-arriving" not in (s["cls"] or ""), "the You label shows once landed")
        page.wait_for_timeout(1200)
        s = slot_state(page, eid)
        check("cm-arriving" not in s["cls"], "the slot's sprite takes over after landing")
        check(s["drops"] == 0 and s["sparks"] == 0, "the falling character and sparks are cleaned up")
        page.evaluate("SQUI.refresh()")
        page.wait_for_timeout(100)
        check(slot_state(page, eid)["drops"] == 0, "an ordinary refresh does not replay the drop")
        check(not errors, "no page errors " + "; ".join(errors))
        ctx.close()

        ctx, page, eid, errors = open_community(browser, reduced=True)
        page.click(f'button[data-action="rsvp"][data-id="{eid}"]')
        page.wait_for_timeout(60)
        s = slot_state(page, eid)
        check("cm-arriving" not in s["cls"] and s["drops"] == 0 and s["sparks"] == 0,
              "reduced motion: the character simply appears, no fall or sparks")
        ctx.close()
        browser.close()
    print(f"{len(failures)} arrival failures" if failures else "arrival: all green")
    sys.exit(1 if failures else 0)


if __name__ == "__main__":
    main()
