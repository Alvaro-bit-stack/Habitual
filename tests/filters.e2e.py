#!/usr/bin/env python3
"""Browser test for the Community filters and sharing: Hobby search (type to narrow, keyboard and
mouse picks, your hobbies vs every hobby), Level filter, location search, and the share sheet.

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
        check(shown() == ["All hobbies", "Running", "Painting", "Guitar Playing"], "Going lists only your hobbies")
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
        page.click('#cm-hobby-list [data-v="journaling"]')
        page.wait_for_timeout(250)
        check(page.input_value("#cm-hobby") == "Journaling" and not is_open(), "tapping an option picks it")

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
        # Level filter
        page.click('[data-action="category"][data-v="all"]')
        page.wait_for_timeout(150)
        check(page.locator("#cm-level").count() == 1, "All events has a Level filter")
        page.click("#cm-level")
        check(page.get_attribute("#cm-level", "aria-expanded") == "true", "the Level button opens its list")
        page.click('#cm-level-list [data-v="experienced"]')
        page.wait_for_timeout(200)
        tags = page.evaluate('[...document.querySelectorAll(".cm-photo-tag")].map(e => e.innerText.trim())')
        check(tags and all(t in ("Experienced", "All levels", "You’re going", "Checked in") for t in tags), "Experienced shows experienced and all-levels events")
        page.click('[data-action="category"][data-v="going"]')
        page.wait_for_timeout(150)
        check(page.locator("#cm-level").count() == 0, "Going has no Level filter")

        # Location search
        page.click('[data-action="category"][data-v="all"]')
        page.click('[data-action="category"][data-v="all"]')
        page.wait_for_timeout(150)
        page.click("#cm-level")
        check(page.locator("#cm-level-list [role=option]").count() == 4, "Level offers Any, Beginner, Intermediate and Experienced")
        page.click('#cm-level-list [data-v="intermediate"]')
        page.wait_for_timeout(200)
        tags = page.evaluate('[...document.querySelectorAll(".cm-photo-tag")].map(e => e.innerText.trim())')
        check("Intermediate" in tags and all(t in ("Intermediate", "All levels", "You’re going", "Checked in") for t in tags), "Intermediate shows intermediate and all-levels events")
        page.wait_for_timeout(450)
        page.click("#cm-level")
        page.click('#cm-level-list [data-v=""]')
        page.wait_for_timeout(150)
        # When menu: keyboard
        page.focus("#cm-when")
        page.keyboard.press("Enter")
        page.keyboard.press("ArrowDown")
        page.keyboard.press("Enter")
        page.wait_for_timeout(200)
        check(page.inner_text("#cm-when") == "Today" and page.get_attribute("#cm-when", "aria-expanded") == "false", "When picks with arrows and Enter, then closes")
        page.wait_for_timeout(450)
        page.click("#cm-when")
        page.click('#cm-when-list [data-v="upcoming"]')
        page.wait_for_timeout(150)
        page.fill("#cm-search", "branch brook")
        page.wait_for_timeout(150)
        places = page.evaluate('[...document.querySelectorAll(".cm-event-place")].map(e => e.innerText.trim())')
        check(places and all("Branch Brook" in p for p in places), "search finds events by location")
        page.fill("#cm-search", "")

        # Share sheet
        page.context.grant_permissions(["clipboard-read", "clipboard-write"])
        first = page.locator('.cm-feed-event button[data-action="share-event"]').first
        eid = first.get_attribute("data-id")
        first.click()
        page.wait_for_timeout(300)
        check(page.locator('.cm-share-sheet [role="dialog"]').count() == 1, "the share button opens a share sheet")
        href = page.get_attribute(".cm-sheet-text", "href") or ""
        check(href.startswith("sms:") and "Habitual" in page.inner_text("#cm-invite-text"), "Text a friend opens Messages with the invite filled in")
        page.click("[data-copy]")
        page.wait_for_timeout(150)
        clip = page.evaluate("navigator.clipboard.readText()")
        check("Found it on Habitual" in clip, "Copy invite copies the invite text")
        page.locator("[data-send]").nth(0).click()
        page.wait_for_timeout(100)
        check(page.locator("[data-send]").nth(0).is_disabled() and "Sent" in page.locator("[data-send]").nth(0).inner_text(), "Send in Habitual marks the person as sent")
        page.keyboard.press("Escape")
        page.wait_for_timeout(100)
        check(page.locator(".cm-share-sheet").count() == 0, "Escape closes the share sheet")
        check(page.evaluate("document.activeElement.getAttribute('data-action')") == "share-event", "focus returns to the share button")
        page.evaluate(f'SQUI.go("event", {{id: "{eid}"}})')
        page.wait_for_timeout(200)
        check("Shared with" in page.inner_text("#app-main"), "the event screen remembers who you shared with")
        page.reload()
        page.wait_for_timeout(300)
        page.evaluate(f'SQUI.go("event", {{id: "{eid}"}})')
        page.wait_for_timeout(200)
        check("Shared with" in page.inner_text("#app-main"), "shares survive a reload")
        check(page.evaluate("document.documentElement.scrollWidth") <= 390, "no sideways scrolling")
        check(not errors, "no page errors " + "; ".join(errors))
        browser.close()
    print(f"{len(failures)} filter failures" if failures else "filters: all green")
    sys.exit(1 if failures else 0)


if __name__ == "__main__":
    main()
