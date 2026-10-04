#!/usr/bin/env python3
"""Browser test for the built-in hobby plans (src/plans.js) and the Ask Hobitual assistant.

Beginner: crash course (5 videos), Budget and Premium starter kits with buy links and the
cross-verified check mark, and tasks. Intermediate / advanced: tasks only. Today shows a shortcut for
beginners. The assistant's reply is faked in the browser, so no Gemini key is needed.

Run: python3 tests/kit.e2e.py   (builds first if dist/Habitual.html is missing)
"""
import functools
import http.server
import json
import os
import re
import subprocess
import sys
import threading

from playwright.sync_api import sync_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DIST = os.path.join(ROOT, "dist")
failures = []


def check(ok, msg):
    print(("PASS " if ok else "FAIL ") + msg)
    if not ok:
        failures.append(msg)


REPLY = {"reply": "Two cheaper picks and a mixed week.", "level": "beginner",
         "products": [{"brand": "Fender", "name": "CD-60S", "price": 199, "retailer": "", "why": "Often on sale.", "url": None, "linkType": "search",
                       "buyUrl": "https://www.google.com/search?tbm=shop&q=Fender%20CD-60S", "sources": [], "sourceCount": 0, "verified": False}],
         "tasks": [{"title": "Learn G and C", "details": "", "minutes": 10, "why": "", "sources": []},
                   {"title": "Strum along to a slow song", "details": "", "minutes": 15, "why": "", "sources": []}]}


def main():
    if not os.path.exists(os.path.join(DIST, "Habitual.html")):
        subprocess.check_call([sys.executable, os.path.join(ROOT, "build.py")])
    class Quiet(http.server.SimpleHTTPRequestHandler):
        def log_message(self, *args):
            pass
    server = http.server.ThreadingHTTPServer(("127.0.0.1", 0), functools.partial(Quiet, directory=DIST))
    threading.Thread(target=server.serve_forever, daemon=True).start()
    asked = []
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page(viewport={"width": 390, "height": 844})
        page.route(re.compile(r"https://(fonts\.(googleapis|gstatic)|cdn\.jsdelivr|i\.ytimg)\.(com|net)/.*"), lambda r: r.fulfill(status=200, body=""))
        page.route("**/api/assistant", lambda r: (asked.append(json.loads(r.request.post_data)), r.fulfill(status=200, content_type="application/json", body=json.dumps(REPLY))))
        errors = []
        page.on("pageerror", lambda e: errors.append(str(e)))
        page.goto(f"http://127.0.0.1:{server.server_port}/Habitual.html")
        page.wait_for_timeout(400)
        plans = page.evaluate("SQ_PLANS")
        page.evaluate("SQ.seedDemo(); SQ.setSkill('guitar', 'beginner'); SQ.setSkill('running', 'intermediate'); SQUI.go('today')")
        page.wait_for_timeout(300)
        check(page.locator('.hc-plan[data-id="guitar"]').count() == 1, "Today shows a crash course & starter kit shortcut for a beginner")
        check(page.locator('.hc-plan[data-id="running"]').count() == 0, "no shortcut for an intermediate hobby")
        check(page.locator(".hc", has_text="Guitar").locator(".tw-l").inner_text() in [t["title"] for t in plans["guitar"]["tasks"]["beginner"]], "Today's guitar task comes from the researched beginner tasks")
        page.click('.hc-plan[data-id="guitar"]')
        page.wait_for_timeout(400)
        kit = page.locator('[data-role="kit"]')
        course = kit.locator(".plan-course")
        check(course.count() == 1 and course.get_attribute("open") is None, "the crash course starts collapsed")
        course.locator("summary").click()
        check(course.locator(".bl-video").count() == 5 and course.locator(".bl-video").first.is_visible(), "tapping it shows 5 videos")
        check(all("youtube.com/watch?v=" in (a.get_attribute("href") or "") for a in course.locator(".bl-video").all()), "crash course videos link to YouTube")
        check(kit.locator(".kit-prod").count() == 0, "the starter kit is not listed on the page itself")
        check(page.locator(".hb-tasks li").count() == len(plans["guitar"]["tasks"]["beginner"]) and page.locator(".ladder:not(.hb-tasks)").count() == 0, "Your tasks replaces the tiny-win ladder")
        check("next task" in page.locator(".hb-next").inner_text().lower(), "the next step is a task")

        # Starter kits sheet
        kit.locator('[data-open="kit"]').click()
        page.wait_for_timeout(300)
        sheet = page.locator(".plan-sheet-wrap")
        check(sheet.count() == 1 and sheet.locator('[role="dialog"]').count() == 1, "Starter kits opens a sheet")
        tabs = sheet.locator("[data-tier]")
        check(tabs.count() == 2 and "Budget" in tabs.nth(0).inner_text() and "Premium" in tabs.nth(1).inner_text(), "Budget and Premium starter kits")
        first = sheet.locator('[data-tier-panel="budget"] .kit-prod').first
        check(first.locator(".kit-badge.is-verified").count() == 1, "a product recommended by two sites shows the check mark")
        href = first.locator(".kit-buy").get_attribute("href") or ""
        check(href == plans["guitar"]["gear"]["budget"]["products"][0]["url"] and first.locator(".kit-buy").get_attribute("target") == "_blank", "buy links go to the researched product page in a new tab")
        sheet.locator('[data-tier="premium"]').click()
        check(sheet.locator('[data-tier-panel="premium"]').is_visible() and not sheet.locator('[data-tier-panel="budget"]').is_visible(), "tapping Premium switches kits")
        page.keyboard.press("Escape")
        page.wait_for_timeout(200)
        check(page.locator(".plan-sheet-wrap").count() == 0, "Escape closes the sheet")

        # Assistant sheet
        kit.locator('[data-open="ask"]').click()
        page.wait_for_timeout(300)
        sheet = page.locator(".plan-sheet-wrap")
        sheet.locator("[data-ask]").first.click()
        page.wait_for_timeout(400)
        check(len(asked) == 1 and asked[0]["hobby"] == "Guitar" and asked[0]["level"] == "beginner" and asked[0]["context"]["products"], "the assistant gets the hobby, level and current kit")
        check("Two cheaper picks" in sheet.inner_text() and sheet.locator(".as-bot .kit-prod").count() == 1, "the assistant's reply and products show")
        sheet.locator("[data-use-tasks]").click()
        page.wait_for_timeout(400)
        check(page.locator(".plan-sheet-wrap").count() == 0, "using the tasks closes the sheet")
        check(page.evaluate("SQ.hobbyStats('guitar').nextTinyWin.label") in ("Learn G and C", "Strum along to a slow song"), "Use these as my tasks changes Today's task")
        check("From the assistant" in page.locator(".sq-hobby").inner_text() and page.locator(".hb-tasks li").count() == 2, "Your tasks shows the assistant's tasks")
        page.locator('[data-plan="reset-tasks"]').click()
        page.wait_for_timeout(300)
        check(page.evaluate("SQ.hobbyStats('guitar').nextTinyWin.label") in [t["title"] for t in plans["guitar"]["tasks"]["beginner"]], "going back restores the researched tasks")

        # Intermediate: tasks only
        page.evaluate("SQUI.go('hobby', { id: 'running' })")
        page.wait_for_timeout(300)
        kit = page.locator('[data-role="kit"]')
        check(kit.locator('[data-open="kit"]').count() == 0 and kit.locator(".plan-course").count() == 0, "intermediate gets no starter kit or crash course")
        check(kit.locator('[data-open="ask"]').count() == 1, "intermediate can still ask the assistant")
        check(page.locator(".hb-tasks li").count() == len(plans["running"]["tasks"]["intermediate"]), "intermediate gets its tasks")
        check(page.evaluate("document.documentElement.scrollWidth") <= 390, "no sideways scrolling")
        check(not errors, "no page errors " + "; ".join(errors))
        browser.close()
    server.shutdown()
    print(f"{len(failures)} kit failures" if failures else "kit: all green")
    sys.exit(1 if failures else 0)


if __name__ == "__main__":
    main()
