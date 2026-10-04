#!/usr/bin/env python3
"""Browser test for the Gemini plan on the hobby screen: a beginner gets Budget and Premium kits with
totals, product cards with a buy link, the cross-verified check mark, sources and tasks; other levels get tasks only.

Run: python3 tests/kit.e2e.py   (builds first if dist/Habitual.html is missing)
The guide is preloaded into the browser cache in the server's response shape, so no Gemini key is needed.
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


def src(site, how):
    return {"site": site, "url": "https://" + site + "/thread", "title": site, "how": how}


GUIDE = {
    "hobby": "Running", "overview": "", "currency": "USD", "community": [], "videos": [], "firstSteps": [], "sources": [],
    "level": "beginner", "crashCourse": [], "tasks": [{"title": "Walk-run 20 minutes", "details": "", "minutes": 20, "why": "Most new runners on r/running started this way.", "sources": [{"site": "reddit.com", "url": "https://www.reddit.com/r/running"}]}],
    "gear": {
        "budget": {"label": "Budget start", "total": 170, "products": [
            {"brand": "Brooks", "name": "Ghost 16", "price": 140, "retailer": "REI", "why": "Most recommended first shoe.",
             "url": "https://www.rei.com/p", "linkType": "product", "buyUrl": "https://www.rei.com/p",
             "verified": True, "sourceCount": 2, "sources": [src("reddit.com", "page"), src("runnersworld.com", "search")]},
            {"brand": "Nike", "name": "Running shirt", "price": 30, "retailer": "", "why": "",
             "url": None, "linkType": "search", "buyUrl": "https://www.google.com/search?tbm=shop&q=Nike%20Running%20shirt",
             "verified": False, "sourceCount": 1, "sources": [src("reddit.com", "page")]}]},
        "premium": {"label": "Premium start", "total": 145, "products": [
            {"brand": "Hoka", "name": "Clifton 9", "price": 145, "retailer": "REI", "why": "", "url": "https://www.rei.com/q", "linkType": "product",
             "buyUrl": "https://www.rei.com/q", "verified": True, "sourceCount": 2, "sources": [src("reddit.com", "page"), src("runrepeat.com", "page")]}]}
    }
}


def main():
    if not os.path.exists(PAGE):
        subprocess.check_call([sys.executable, os.path.join(ROOT, "build.py")])
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page(viewport={"width": 390, "height": 844})
        page.route(re.compile(r"https://(fonts\.(googleapis|gstatic)|cdn\.jsdelivr)\.(com|net)/.*"), lambda r: r.fulfill(status=200, body=""))
        errors = []
        page.on("pageerror", lambda e: errors.append(str(e)))
        page.goto("file://" + PAGE)
        page.wait_for_timeout(300)
        page.evaluate("g => { localStorage.setItem('habitual.hobbyGuides.v3', JSON.stringify({ 'running|beginner': { at: Date.now(), guide: g } })); SQ.seedDemo(); SQ.setSkill('running', 'beginner'); SQUI.go('hobby', { id: 'running' }); }", GUIDE)
        page.wait_for_timeout(400)
        kit = page.locator('[data-role="kit"]')
        tabs = kit.locator("[data-tier]")
        check(tabs.count() == 2, "a beginner gets a Budget and a Premium kit")
        check("Budget" in tabs.nth(0).inner_text() and "$170" in tabs.nth(0).inner_text(), "the Budget tab shows its total")
        cards = kit.locator('[data-tier-panel="budget"] .kit-prod')
        check(cards.count() == 2, "the Budget kit lists its products")
        check(cards.nth(0).locator(".kit-badge.is-verified").count() == 1 and "2 sites" in cards.nth(0).inner_text(), "a cross-verified product shows the check mark")
        check(cards.nth(1).locator(".kit-badge.is-verified").count() == 0 and "1 source" in cards.nth(1).inner_text(), "a single-source product has no check mark")
        check(cards.nth(0).locator(".kit-buy").get_attribute("href") == "https://www.rei.com/p" and "View at REI" in cards.nth(0).inner_text(), "a verified product page is linked")
        check("google.com/search" in cards.nth(1).locator(".kit-buy").get_attribute("href") and "Find it online" in cards.nth(1).inner_text(), "an unverified link falls back to a shopping search")
        check(cards.nth(0).locator(".kit-buy").get_attribute("target") == "_blank" and "noopener" in cards.nth(0).locator(".kit-buy").get_attribute("rel"), "store links open safely in a new tab")
        cards.nth(0).locator("summary").click()
        check(cards.nth(0).locator(".kit-sources li").count() == 2, "the sources list opens")
        kit.locator('[data-tier="premium"]').click()
        check(kit.locator('[data-tier-panel="premium"]').is_visible() and not kit.locator('[data-tier-panel="budget"]').is_visible(), "tapping Premium switches kits")
        check(kit.locator(".plan-task").count() == 1 and "Walk-run" in kit.inner_text(), "a beginner also sees tasks")
        check(page.evaluate("SQ.hobbyStats('running').nextTinyWin.label") == "Walk-run 20 minutes", "the researched task becomes the hobby's task on Today")

        # Intermediate: tasks only
        mid = dict(GUIDE, level="intermediate", gear={}, crashCourse=[])
        page.evaluate("g => { const all = JSON.parse(localStorage.getItem('habitual.hobbyGuides.v3')); all['running|intermediate'] = { at: Date.now(), guide: g }; localStorage.setItem('habitual.hobbyGuides.v3', JSON.stringify(all)); SQ.setSkill('running', 'intermediate'); SQUI.go('hobby', { id: 'running' }); }", mid)
        page.wait_for_timeout(300)
        check(kit.locator(".kit, [data-tier]").count() == 0 and kit.locator(".plan-task").count() == 1, "intermediate gets tasks only, no starter kit")
        check("Crash course" not in kit.inner_text(), "intermediate gets no crash course")
        check(page.evaluate("document.documentElement.scrollWidth") <= 390, "no sideways scrolling")
        check(not errors, "no page errors " + "; ".join(errors))
        browser.close()
    print(f"{len(failures)} kit failures" if failures else "kit: all green")
    sys.exit(1 if failures else 0)


if __name__ == "__main__":
    main()
