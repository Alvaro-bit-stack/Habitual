#!/usr/bin/env python3
"""Browser test for the Gemini starter kits on the hobby screen: three kits with totals, product
cards with a buy link, the cross-verified check mark, and the sources list.

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
    "gear": {
        "entry": {"label": "Beginner kit", "total": 170, "products": [
            {"brand": "Brooks", "name": "Ghost 16", "price": 140, "retailer": "REI", "why": "Most recommended first shoe.",
             "url": "https://www.rei.com/p", "linkType": "product", "buyUrl": "https://www.rei.com/p",
             "verified": True, "sourceCount": 2, "sources": [src("reddit.com", "page"), src("runnersworld.com", "search")]},
            {"brand": "Nike", "name": "Running shirt", "price": 30, "retailer": "", "why": "",
             "url": None, "linkType": "search", "buyUrl": "https://www.google.com/search?tbm=shop&q=Nike%20Running%20shirt",
             "verified": False, "sourceCount": 1, "sources": [src("reddit.com", "page")]}]},
        "mid": {"label": "Step-up kit", "total": 145, "products": [
            {"brand": "Hoka", "name": "Clifton 9", "price": 145, "retailer": "REI", "why": "", "url": "https://www.rei.com/q", "linkType": "product",
             "buyUrl": "https://www.rei.com/q", "verified": True, "sourceCount": 2, "sources": [src("reddit.com", "page"), src("runrepeat.com", "page")]}]},
        "high": {"label": "Premium kit", "total": 0, "products": []}
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
        page.evaluate("g => { localStorage.setItem('habitual.hobbyGuides.v2', JSON.stringify({ running: { at: Date.now(), guide: g } })); SQ.seedDemo(); SQUI.go('hobby', { id: 'running' }); }", GUIDE)
        page.wait_for_timeout(400)
        kit = page.locator('[data-role="kit"]')
        tabs = kit.locator("[data-tier]")
        check(tabs.count() == 2, "kits with products get a tab (empty Premium is hidden)")
        check("Beginner" in tabs.nth(0).inner_text() and "$170" in tabs.nth(0).inner_text(), "the Beginner tab shows its total")
        cards = kit.locator('[data-tier-panel="entry"] .kit-prod')
        check(cards.count() == 2, "the Beginner kit lists its products")
        check(cards.nth(0).locator(".kit-badge.is-verified").count() == 1 and "2 sites" in cards.nth(0).inner_text(), "a cross-verified product shows the check mark")
        check(cards.nth(1).locator(".kit-badge.is-verified").count() == 0 and "1 source" in cards.nth(1).inner_text(), "a single-source product has no check mark")
        check(cards.nth(0).locator(".kit-buy").get_attribute("href") == "https://www.rei.com/p" and "View at REI" in cards.nth(0).inner_text(), "a verified product page is linked")
        check("google.com/search" in cards.nth(1).locator(".kit-buy").get_attribute("href") and "Find it online" in cards.nth(1).inner_text(), "an unverified link falls back to a shopping search")
        check(cards.nth(0).locator(".kit-buy").get_attribute("target") == "_blank" and "noopener" in cards.nth(0).locator(".kit-buy").get_attribute("rel"), "store links open safely in a new tab")
        cards.nth(0).locator("summary").click()
        check(cards.nth(0).locator(".kit-sources li").count() == 2, "the sources list opens")
        kit.locator('[data-tier="mid"]').click()
        check(kit.locator('[data-tier-panel="mid"]').is_visible() and not kit.locator('[data-tier-panel="entry"]').is_visible(), "tapping Step up switches kits")
        check(page.evaluate("document.documentElement.scrollWidth") <= 390, "no sideways scrolling")
        check(not errors, "no page errors " + "; ".join(errors))
        browser.close()
    print(f"{len(failures)} kit failures" if failures else "kit: all green")
    sys.exit(1 if failures else 0)


if __name__ == "__main__":
    main()
