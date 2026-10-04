#!/usr/bin/env python3
"""Habitual end-to-end QA (Playwright, headless chromium).

Run: python3 tests/e2e.py            (builds first if dist/Habitual.html is missing)
Screenshots: scratch/qa/<mode>-<step>.png
Exit code 0 = all green.
"""
import os
import re
import sys
import json
import traceback
from playwright.sync_api import sync_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PREVIEW = os.path.join(ROOT, "dist", "Habitual.html")
SHOTS = os.path.join(ROOT, "scratch", "qa")
URL = "file://" + PREVIEW

MODES = [
    # name, viewport, scheme
    ("l390", (390, 844), "light"),
    ("d390", (390, 844), "dark"),
    ("l360", (360, 740), "light"),
    ("d360", (360, 740), "dark"),
    ("l1280", (1280, 800), "light"),
]
QUIZ_COMBOS = [
    {"vibe": "creative", "place": "indoor", "social": "solo", "budget": "50", "time": "low"},
    {"vibe": "active", "place": "outdoor", "social": "group", "budget": "150", "time": "mid"},
    {"vibe": "relaxing", "place": "either", "social": "either", "budget": "0", "time": "high"},
    {"vibe": "technical", "place": "indoor", "social": "either", "budget": "999", "time": "mid"},
    {"vibe": "social", "place": "outdoor", "social": "group", "budget": "0", "time": "low"},
]
CUSTOM_NAME = "<b>Clay & \"Glaze\" 'n' more</b>"   # 40 chars max in engine; this is 36

FAILS = []
CHECKS = {"n": 0}


def fail(mode, where, msg):
    FAILS.append(f"[{mode}] {where}: {msg}")
    print(f"  FAIL [{mode}] {where}: {msg}")


def expect(cond, mode, where, msg):
    CHECKS["n"] += 1
    if not cond:
        fail(mode, where, msg)
    return cond


# --------------------------------------------------------------------------- page-level audits
AUDIT_JS = r"""
() => {
  const out = { problems: [] };
  const vw = window.innerWidth;
  out.scrollW = document.documentElement.scrollWidth;
  if (out.scrollW > vw) out.problems.push('horizontal overflow: scrollWidth ' + out.scrollW + ' > ' + vw);
  const txt = document.body.innerText;
  const bad = txt.match(/\bundefined\b|\bNaN\b|\bnull\b|\[object|Infinity/);
  if (bad) out.problems.push('bad token in text: "' + bad[0] + '" near "' + txt.substr(Math.max(0, bad.index - 30), 70).replace(/\n/g,' | ') + '"');
  const vis = el => { const r = el.getBoundingClientRect(); const cs = getComputedStyle(el);
    if (el.closest('details:not([open])') && !el.closest('summary')) return false; // collapsed disclosure content
    return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none'; };
  // accessible names
  document.querySelectorAll('button, [role=button], a[href]').forEach(b => {
    if (!vis(b)) return;
    let name = (b.getAttribute('aria-label') || '').trim() || (b.innerText || '').trim() || (b.getAttribute('title') || '').trim();
    const lb = b.getAttribute('aria-labelledby');
    if (!name && lb) name = lb.split(/\s+/).map(id => (document.getElementById(id) || {}).textContent || '').join(' ').trim();
    if (!name) out.problems.push('button without accessible name: ' + b.outerHTML.slice(0, 120));
  });
  // tap targets for primary controls
  const sel = '.btn, .icon-btn, .back-btn, .nav-btn, .chip[data-action], .tiny-btn, .dc-opt, .dc-tile, .seg > button, .dc-choice, .list-row[data-action], .hc-body, .cm-ev-main, .cm-today-top, input, select, textarea';
  document.querySelectorAll(sel).forEach(b => {
    if (!vis(b)) return;
    if (b.closest('.rw') == null && document.querySelector('.rw')) return; // overlay up: skip background
    const r = b.getBoundingClientRect();
    if (r.height < 40 - 0.5 || r.width < 40 - 0.5)
      out.problems.push('small tap target ' + Math.round(r.width) + 'x' + Math.round(r.height) + ': ' + (b.innerText || b.getAttribute('aria-label') || b.className).trim().slice(0, 40));
  });
  // clipped text: element whose content overflows a non-visible overflow box
  document.querySelectorAll('#app-main *, #overlay-root *, #app-nav *').forEach(el => {
    if (!vis(el) || el.closest('[aria-hidden="true"]')) return;
    if (el.matches('.sr-only, .dc-hscroll, svg, svg *, canvas, input, textarea, select, .rw-card, .heat-grid, .heat-wrap')) return;
    const cs = getComputedStyle(el);
    if (cs.overflowX === 'visible' && cs.overflowY === 'visible') return;
    if (!(el.innerText || '').trim()) return; // image frames (avatars) crop on purpose; only text can be clipped
    if (el.scrollWidth > el.clientWidth + 1 && cs.overflowX !== 'auto' && cs.overflowX !== 'scroll')
      out.problems.push('text clipped horizontally in ' + el.tagName + '.' + el.className + ' "' + (el.innerText||'').slice(0,40) + '"');
  });
  // text overflowing its parent card/row horizontally (visually spilling)
  document.querySelectorAll('#app-main .screen').forEach(scr => {
    const sr = scr.getBoundingClientRect();
    scr.querySelectorAll('*').forEach(el => {
      if (!vis(el) || el.closest('[aria-hidden="true"]') || el.closest('.dc-hscroll') || el.closest('svg')) return;
      const r = el.getBoundingClientRect();
      if (r.right > Math.max(sr.right, vw) + 1) out.problems.push('element spills past screen edge: ' + el.tagName + '.' + el.className + ' right=' + Math.round(r.right));
    });
  });
  // images/icons broken
  document.querySelectorAll('img').forEach(i => {
    const r = i.getBoundingClientRect();
    if (i.loading === 'lazy' && !i.complete && (r.bottom < 0 || r.top > innerHeight)) return; // not loaded yet: off screen
    if (!i.complete || !i.naturalWidth) out.problems.push('broken img');
  });
  return out;
}
"""

NAV_CLEAR_JS = r"""
() => {
  const nav = document.getElementById('app-nav');
  if (!nav || nav.hidden) return { nav: false };
  const navTop0 = nav.getBoundingClientRect().top;
  // mid-scroll: sticky things inside main must sit above the nav
  window.scrollTo(0, Math.max(0, (document.documentElement.scrollHeight - innerHeight) / 2));
  const stuck = [...document.querySelectorAll('#app-main *')].filter(el => getComputedStyle(el).position === 'sticky')
    .map(el => ({ b: el.getBoundingClientRect().bottom, c: el.className })).filter(x => x.b > navTop0 + 0.5);
  window.scrollTo(0, document.documentElement.scrollHeight);
  const navTop = nav.getBoundingClientRect().top;
  const main = document.getElementById('app-main');
  let maxBottom = 0, who = '';
  main.querySelectorAll('*').forEach(el => {
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    if (r.width === 0 || r.height === 0 || cs.visibility === 'hidden' || cs.position === 'fixed') return;
    if (el.closest('[aria-hidden="true"]')) return;
    if (el.closest('svg') && el.tagName.toLowerCase() !== 'svg') return;
    if (r.bottom > maxBottom) { maxBottom = r.bottom; who = el.tagName + '.' + el.className + ' "' + (el.innerText || '').slice(0, 30) + '"'; }
  });
  // last interactive element
  const inter = [...main.querySelectorAll('button, input, select, textarea, a[href]')].filter(el => {
    const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0; });
  const last = inter[inter.length - 1];
  const lr = last ? last.getBoundingClientRect() : null;
  return { nav: true, stuck, navTop, maxBottom, who, lastBottom: lr ? lr.bottom : null,
           lastName: last ? (last.innerText || last.getAttribute('aria-label') || '').trim().slice(0, 40) : null,
           gap: navTop - maxBottom };
}
"""


class Ctx:
    def __init__(self, browser, mode, viewport, scheme):
        self.mode = mode
        self.context = browser.new_context(viewport={"width": viewport[0], "height": viewport[1]},
                                           color_scheme=scheme, device_scale_factor=1)
        # No network here: serve an empty stylesheet for Google Fonts so it never errors.
        self.context.route(re.compile(r"https://fonts\.(googleapis|gstatic)\.com/.*"),
                           lambda route: route.fulfill(status=200, content_type="text/css", body=""))
        # three.js (Me tab and celebrations) comes from jsDelivr. Serve an empty script so the 3D
        # character stays unloaded and the 2D fallbacks run, without network errors.
        self.context.route(re.compile(r"https://cdn\.jsdelivr\.net/.*"),
                           lambda route: route.fulfill(status=200, content_type="application/javascript", body=""))
        self.page = self.context.new_page()
        self.errors = []
        self.page.on("console", self._on_console)
        self.page.on("pageerror", lambda e: self.errors.append("pageerror: " + str(e)))
        self.shots = 0

    def _on_console(self, msg):
        t = msg.text
        if msg.type == "error" and "fonts.g" not in t:
            self.errors.append("console.error: " + t)
        if msg.type == "warning" and "[Habitual]" in t:
            self.errors.append("console.warn: " + t)

    def fresh(self):
        self.page.goto(URL)
        self.page.evaluate("() => { localStorage.clear(); }")
        self.page.goto(URL)
        self.page.wait_for_selector("#app-main .screen")

    def js(self, expr, arg=None):
        return self.page.evaluate(expr, arg) if arg is not None else self.page.evaluate(expr)

    def screen(self):
        c = self.js("() => SQUI.current()")
        return c and c["name"]

    def click(self, selector, nth=0):
        loc = self.page.locator(selector)
        loc.nth(nth).scroll_into_view_if_needed()
        loc.nth(nth).click()
        self.page.wait_for_timeout(30)

    def audit(self, step, shot=True, nav_check=True):
        m = self.mode
        self.page.wait_for_timeout(60)
        res = self.js(AUDIT_JS)
        for p in res["problems"]:
            fail(m, step, p)
        CHECKS["n"] += 1
        if self.errors:
            for e in self.errors:
                fail(m, step, e)
            self.errors.clear()
        if shot:
            ov = self.js("() => !!document.querySelector('.rw')")
            if ov:
                self.page.wait_for_timeout(900)   # let the XP count-up finish
            self.page.screenshot(path=os.path.join(SHOTS, f"{m}-{step}.png"), full_page=not ov)
        if nav_check and not self.js("() => !!document.querySelector('.rw')"):
            r = self.js(NAV_CLEAR_JS)
            if r["nav"]:
                expect(not r["stuck"], m, step, f"sticky element behind nav mid-scroll: {r['stuck']}")
                expect(r["maxBottom"] <= r["navTop"] + 0.5, m, step,
                       f"content hidden behind nav: bottom {r['maxBottom']:.0f} > navTop {r['navTop']:.0f} ({r['who']})")
                if r["lastBottom"] is not None:
                    expect(r["lastBottom"] <= r["navTop"] + 0.5, m, step,
                           f"last control '{r['lastName']}' under nav ({r['lastBottom']:.0f} > {r['navTop']:.0f})")
                if shot:
                    self.page.screenshot(path=os.path.join(SHOTS, f"{m}-{step}-bottom.png"))
            self.js("() => window.scrollTo(0,0)")

    # reward overlay ---------------------------------------------------------
    def overlay_xp(self):
        self.page.wait_for_selector(".rw", timeout=3000)
        lab = self.page.locator(".rw-xp").get_attribute("aria-label") or ""
        mm = re.search(r"(\d+)", lab)
        return int(mm.group(1)) if mm else 0

    def close_overlay(self, how="button"):
        self.page.wait_for_selector(".rw")
        if how == "button":
            self.page.click("[data-rw-close]")
        elif how == "esc":
            self.page.keyboard.press("Escape")
        else:  # backdrop: click near the top-left corner, outside the card
            self.page.mouse.click(4, 4)
        self.page.wait_for_selector(".rw", state="detached", timeout=3000)

    def close_any_overlay(self):
        if self.js("() => !!document.querySelector('.rw')"):
            self.close_overlay()

    def close(self):
        self.context.close()


# --------------------------------------------------------------------------- flows
def money_parse(s):
    s = s.strip().replace(",", "")
    if s.lower().startswith("free"):
        return (0, 0)
    nums = [int(x) for x in re.findall(r"\d+", s)]
    if len(nums) == 1:
        return (nums[0], nums[0])
    return (nums[0], nums[1])


def flow_quiz(c, combo):
    m = c.mode
    c.fresh()
    expect(c.screen() == "welcome", m, "quiz", "fresh start should be welcome")
    expect(c.js("() => document.getElementById('app-nav').hidden"), m, "welcome", "nav visible on welcome")
    c.audit("01-welcome")
    c.click(".dc-welcome [data-action=quiz]")
    for i, qid in enumerate(["vibe", "place", "social", "budget", "time"]):
        expect(c.screen() == "quiz", m, "quiz", f"expected quiz step {i}")
        if i == 0 or i == 3:
            c.audit(f"02-quiz{i+1}")
        c.click(f".dc-opt[data-v='{combo[qid]}']")
    expect(c.screen() == "results", m, "quiz", "did not land on results")
    n = c.page.locator(".dc-match").count()
    expect(n == 3, m, "results", f"{n} match cards, expected 3")
    # results agree with engine
    names = c.page.locator(".dc-match .h2").all_inner_texts()
    eng = c.js("() => SQ.match(SQ.state.user.quiz).map(x => x.hobby.name)")
    expect(names == eng, m, "results", f"cards {names} != engine {eng}")
    c.audit("03-results")
    first_id = c.page.locator(".dc-match [data-action=pack]").first.get_attribute("data-id")
    c.click(".dc-match [data-action=pack]")
    expect(c.screen() == "pack", m, "pack", "not on pack")
    c.audit("04-pack")
    for tier in ["free", "budget", "stepup"]:
        c.click(f".dc-seg [data-tier={tier}]")
        prices = [money_parse(t) for t in c.page.locator(".dc-items .dc-price").all_inner_texts()]
        lo = sum(p[0] for p in prices); hi = sum(p[1] for p in prices)
        tot = money_parse(c.page.locator(".dc-total-n").inner_text())
        seg = money_parse(c.page.locator(f".dc-seg [data-tier={tier}] .dc-seg-n").inner_text())
        expect(tot == (lo, hi), m, "pack-" + tier, f"total {tot} != sum of items {(lo, hi)}")
        expect(seg == tot, m, "pack-" + tier, f"segment label {seg} != total {tot}")
        expect(c.page.locator(f".dc-seg [data-tier={tier}]").get_attribute("aria-selected") == "true", m, "pack-" + tier, "tier not selected")
        if tier == "free":
            c.audit("05-pack-free", nav_check=False)
    c.click("[data-action=startpack]")
    c.page.wait_for_timeout(50)
    if c.js("() => !!document.querySelector('.rw')"):
        c.audit("06-pack-reward", nav_check=False)
        c.close_overlay("button")
    expect(c.screen() == "hobby", m, "start", f"after Start landed on {c.screen()}")
    expect(not c.js("() => document.getElementById('app-nav').hidden"), m, "start", "nav hidden after start")
    expect(c.js("() => SQ.state.onboarded") is True, m, "start", "not onboarded")
    tr = c.js("() => SQ.state.tracked.map(t => [t.hobbyId, t.viaStarter, t.goal])")
    expect(tr == [[first_id, True, 2]], m, "start", f"tracked {tr}")
    c.audit("07-hobby-new")
    # back from here must not drop the user back into onboarding
    c.js("() => SQUI.back()")
    expect(c.screen() not in ("welcome", "quiz"), m, "start-back", f"back after onboarding went to {c.screen()}")
    c.click("#app-nav [data-nav=today]")
    cards = c.page.locator(".hc .hc-name").all_inner_texts()
    want = c.js(f"() => SQ.getHobby('{first_id}').name")
    expect(cards == [want], m, "today", f"today cards {cards} != [{want}]")
    c.audit("08-today-one")
    # Discover tab after onboarding: pack CTA must clear the nav
    c.click("#app-nav [data-nav=discover]")
    expect(c.page.locator(".dc-cube").count() == 4, m, "discover", "discover should show four hobby tiles")
    c.audit("09-discover")
    c.click(".dc-discover [data-action=pack][data-id=tennis]")
    c.audit("10-pack-onboarded")
    c.click("#app-nav [data-nav=discover]")
    c.page.fill("[data-role=discover-form] [name=hobby]", "Pottery")
    c.click("[data-role=discover-form] button[type=submit]")
    expect(c.page.locator(".dc-cube").count() == 4, m, "discover-search", "search changed the four-tile layout")
    expect("Pottery" in c.page.locator(".dc-cube").first.inner_text(), m, "discover-search", "searched hobby did not replace first tile")
    c.audit("11-discover-search")


def goal_of_card(c, i):
    t = c.page.locator(".hc").nth(i).locator(".hc-progress .small").inner_text()
    mm = re.search(r"(\d+)\s+of\s+(\d+)", t)
    return (int(mm.group(1)), int(mm.group(2)))


def flow_pick_today(c):
    m = c.mode
    c.fresh()
    c.click(".dc-welcome [data-action=pick]")
    expect(c.screen() == "pick", m, "pick", "not on pick")
    c.audit("12-pick")
    c.click(".dc-tile[data-id=running]")
    c.click(".dc-tile[data-id=chess]")
    c.click("[data-action=openown]")
    c.page.fill("[data-role=own-name]", CUSTOM_NAME)
    c.page.select_option("[data-role=own-cat]", "relaxing")
    c.audit("13-pick-form")
    c.click("[data-role=own-form] button[type=submit]")
    cid = c.js("() => SQ.state.custom[0] && SQ.state.custom[0].id")
    expect(cid is not None, m, "pick", "custom hobby not created")
    # goals: running 2->4, chess 2->1, custom 2->3
    for _ in range(2):
        c.click(".dc-goal [data-id=running][data-d='1']")
    c.click(".dc-goal [data-id=chess][data-d='-1']")
    expect(c.page.locator(".dc-goal [data-id=chess][data-d='-1']").is_disabled(), m, "pick", "chess minus not disabled at 1")
    c.click(f".dc-goal [data-id='{cid}'][data-d='1']")
    names_in_goals = c.page.locator(".dc-goal .dc-row-name").all_inner_texts()
    expect(CUSTOM_NAME in names_in_goals, m, "pick", f"custom name not literal in goals: {names_in_goals}")
    expect(c.page.locator("#app-main b").count() == 0, m, "pick", "custom name rendered as HTML")
    c.audit("14-pick-selected", nav_check=False)
    c.click("[data-action=start]")
    c.page.wait_for_timeout(50)
    if c.js("() => !!document.querySelector('.rw')"):
        c.audit("15-pick-reward", nav_check=False)
        c.close_overlay("esc")
    expect(c.screen() == "today", m, "pick", f"after start on {c.screen()}")
    c.js("() => SQUI.back()")
    expect(c.screen() not in ("welcome", "pick"), m, "pick-back", f"back after onboarding went to {c.screen()}")
    c.click("#app-nav [data-nav=today]")
    names = c.page.locator(".hc .hc-name").all_inner_texts()
    expect(names == ["Running", "Chess", CUSTOM_NAME], m, "today", f"cards {names}")
    goals = [goal_of_card(c, i)[1] for i in range(3)]
    expect(goals == [4, 1, 3], m, "today", f"goals {goals} expected [4,1,3]")
    expect(c.page.locator("#app-main b").count() == 0, m, "today", "custom name rendered as HTML on today")
    c.audit("16-today")

    # ---- tiny wins with every close method; also listener-leak check
    for _ in range(4):
        c.js("() => SQUI.refresh()")
    for i, how in [(0, "button"), (1, "esc"), (2, "backdrop")]:
        before = goal_of_card(c, i)
        n0 = c.js("() => SQ.state.sessions.length")
        xp0 = c.js("() => SQ.state.user.xp")
        c.click(".hc .tiny-btn", nth=i)
        got = c.overlay_xp()
        exp = 10 + (50 if before[0] + 1 == before[1] else 0)
        expect(got == exp, m, f"tiny{i}", f"overlay +{got} XP, expected +{exp}")
        expect(c.js("() => SQ.state.sessions.length") == n0 + 1, m, f"tiny{i}", "tiny win logged more/less than once (listener leak?)")
        expect(c.js("() => SQ.state.user.xp") == xp0 + exp, m, f"tiny{i}", "user xp mismatch")
        if i == 1:
            c.audit("17-reward-tiny-goal", nav_check=False)
            ov_names = c.page.locator(".rw").inner_text()
            expect("Weekly goal hit" in ov_names, m, "tiny1", "breakdown missing goal line")
        c.close_overlay(how)
        after = goal_of_card(c, i)
        expect(after[0] == before[0] + 1, m, f"tiny{i}", f"week count {before[0]} -> {after[0]}")
        # focus returns into the page, not lost
        expect(c.js("() => document.activeElement && document.activeElement !== document.body"), m, f"tiny{i}", "focus lost after closing overlay")
    expect(c.page.locator("#app-main b").count() == 0, m, "today", "custom name rendered as HTML after tiny wins")

    # ---- custom hobby screen escaping + achievements naming
    c.click(".hc-body", nth=2)
    expect(c.screen() == "hobby", m, "custom-hobby", "not on hobby")
    expect(CUSTOM_NAME in c.page.locator(".hb-name").inner_text(), m, "custom-hobby", "name not literal")
    expect(c.page.locator("#app-main b").count() == 0, m, "custom-hobby", "custom name rendered as HTML")
    c.click(".ms-row", nth=0)
    c.close_overlay()
    c.click("[data-action=log]")
    expect(CUSTOM_NAME in c.page.locator(".lg-head h1").inner_text(), m, "custom-log", "name not literal on log")
    c.click("[data-action=back]")
    c.click("#app-nav [data-nav=me]")
    c.click("[data-action=achievements]")
    expect(c.page.locator("#app-main b").count() == 0, m, "custom-ach", "custom name as HTML in achievements")
    expect(CUSTOM_NAME in c.page.locator("#app-main").inner_text(), m, "custom-ach", "custom name missing in achievements")
    c.click("#app-nav [data-nav=community]")
    c.audit("18-community-custom")
    expect(c.page.locator("#app-main b").count() == 0, m, "custom-comm", "custom name as HTML in community")
    # A custom hobby has no sample events; search must safely show an empty state.
    c.click('[data-action="category"][data-v="all"]')
    c.page.locator("#cm-search").fill(CUSTOM_NAME)
    expect(c.page.locator(".cm-empty").count() == 1, m, "custom-comm", "missing empty search state")
    c.audit("19-community-filter-custom")
    c.page.locator("#cm-search").fill("")
    c.click("#app-nav [data-nav=discover]")
    expect(c.page.locator("#app-main b").count() == 0, m, "custom-disc", "custom name as HTML in discover")
    c.audit("20-discover-pairs")


def ob_profile(c, name="Sam Rivera", email="sam@example.com", city="Newark", country="United States"):
    m = c.mode
    # The splash moves on by itself after a moment; tap it if it is still showing.
    if c.page.locator("[data-action=ob-splash]").count():
        expect(c.page.locator(".ob-splash .ob-wordmark").inner_text() == "Habitual", m, "profile", "first run should open on the Habitual splash")
        c.click("[data-action=ob-splash]")
    c.page.wait_for_selector(".ob-option")
    expect(c.page.locator(".ob-option").count() == 2, m, "profile", "two character options expected")
    labels = c.page.locator(".ob-option-label").all_inner_texts()
    expect(labels == ["Option 1", "Option 2"], m, "profile", f"character options should be neutral: {labels}")
    expect(c.page.locator("[data-action=ob-char-go]").is_disabled(), m, "profile", "Continue before choosing a character")
    c.click(".ob-option", nth=1)
    c.click("[data-action=ob-char-go]")
    expect(c.js("() => SQ.state.user.character") == "avatar1", m, "profile", "chosen character not saved")
    expect("5 quick questions" in c.page.locator("#app-main").inner_text(), m, "profile", "intro bubble missing")
    c.click("[data-action=ob-intro-go]")
    expect(c.page.locator('.ob-guide .cm-mii[data-character="avatar1"]').count() == 1, m, "profile", "the chosen character should ask the questions")
    expect("How would you like us to call you?" in c.page.locator("#app-main").inner_text(), m, "profile", "first run should ask for a name first")
    c.click("[data-role=ob-q] button[type=submit]")
    expect(c.page.locator("[data-role=ob-err]").is_visible(), m, "profile", "empty name accepted")
    c.page.fill("input[name=name]", name)
    c.click("[data-role=ob-q] button[type=submit]")
    expect("What’s your email?" in c.page.locator("#app-main").inner_text() and name.split(" ")[0] in c.page.locator(".ob-say").inner_text(), m, "profile", "email question missing")
    c.page.fill("input[name=email]", "not-an-email")
    c.click("[data-role=ob-q] button[type=submit]")
    expect(c.page.locator("[data-role=ob-err]").is_visible(), m, "profile", "invalid email accepted")
    c.page.fill("input[name=email]", email)
    c.click("[data-role=ob-q] button[type=submit]")
    expect("Where are you based?" in c.page.locator("#app-main").inner_text(), m, "profile", "location question missing")
    expect(c.page.locator(".ob-ring").count() == 1, m, "profile", "progress ring missing")
    c.page.fill("input[name=city]", city)
    c.page.fill("input[name=country]", country)
    c.click("[data-role=ob-q] button[type=submit]")
    u = c.js("() => SQ.state.user")
    expect(u.get("name") == name and u.get("email") == email and u.get("location") == {"city": city, "country": country},
           m, "profile", f"profile not saved: {u}")


def ob_add(c, name, tier):
    c.page.fill("[data-role=ob-name]", name)
    c.click(f".ob-level[data-tier={tier}]")
    c.click("[data-role=ob-form] button[type=submit]")


def flow_skip_onboarding(c):
    m = c.mode
    c.fresh()
    ob_profile(c)
    c.click("[data-action=ob-continue]")
    expect("Want to start a new hobby?" in c.page.locator("#app-main").inner_text(), m, "skip", "skip did not ask about new hobbies")
    c.click("[data-action=ob-yes]")
    expect(c.screen() == "discover", m, "skip", "Yes did not open Discover")
    expect(c.js("() => SQ.state.onboarded") is True, m, "skip", "skipping should finish onboarding")
    c.fresh()
    ob_profile(c, name="Jo")
    ob_add(c, "Tennis", "advanced")
    c.click("[data-action=ob-continue]")
    c.close_any_overlay()
    c.click("[data-action=ob-no]")
    expect(c.screen() == "today", m, "level-task", "No did not open Today")
    expect("Jo" in c.page.locator(".td-greet").inner_text(), m, "level-task", "Today should greet the user by name")
    nxt = c.page.locator(".td-next").inner_text()
    expect("advanced task" in nxt.lower() and "30" in nxt, m, "level-task", f"Up next should be an advanced task: {nxt!r}")
    expect(c.page.locator(".hc .sc-stars, .hc-tier").count() == 0, m, "level-task", "skill level should show on Me, not on Today cards")
    c.audit("05-today-level-task")


def flow_simple_discovery(c, place):
    m = c.mode
    c.fresh()
    expect(c.screen() == "pick", m, "first-run", "fresh start should ask for current hobbies")
    expect(c.js("() => document.getElementById('app-nav').hidden"), m, "first-run", "navigation should stay hidden during first-run selection")
    ob_profile(c)
    c.audit("00-profile-done", nav_check=False)
    expect("What hobbies do you already do?" in c.page.locator("#app-main").inner_text(), m, "first-run", "first-run question missing")
    expect(c.page.locator(".dc-tree-item, .dc-tile").count() == 0, m, "first-run", "first run should ask, not list hobby options")
    ob_add(c, "Guitar", "beginner")
    c.click("[data-action=ob-continue]")
    c.close_any_overlay()
    expect(c.screen() == "pick" and "Want to start a new hobby?" in c.page.locator("#app-main").inner_text(), m, "first-run", "new-hobby question missing")
    c.click("[data-action=ob-no]")
    expect(c.screen() == "today", m, "first-run", "selection did not open Today")
    expect(c.page.locator(".hc .hc-name").all_inner_texts() == ["Guitar"], m, "first-run", "selected hobby missing from Today")
    c.audit("01-today-with-hobby")
    c.click("#app-nav [data-nav=discover]")
    expect(c.screen() == "discover", m, "discover-tree", "Discover tab did not open")
    expect(c.page.locator('[data-role="discover-search"]').count() == 1, m, "discover-tree", "search bar missing")
    expect(c.page.locator('[data-action="quiz"]').count() == 0 and c.page.locator(".dc-opt").count() == 0,
           m, "discover-tree", "questionnaire is still exposed")
    expect(c.page.locator(".bl-cat").count() == 4, m, "discover-blobs", "four category blobs expected")
    expect(c.page.locator(".bl-mine").count() == 1, m, "discover-blobs", "My hobbies blob missing")
    expect(c.page.locator(".bl-mine [data-role=mine-count]").inner_text().strip() == "1", m, "discover-blobs", "My hobbies should hold the one picked hobby")
    expect(c.page.locator(".bl-hobby").count() == 0, m, "discover-blobs", "hobbies should stay hidden until a blob opens")
    c.audit("02-discover-blobs")
    c.page.locator('.bl-cat[data-cat="music"] .bl-face').evaluate("el => el.click()")
    c.page.wait_for_timeout(500)
    expect(c.page.locator(".bl-cat.is-open").get_attribute("data-cat") == "music", m, "discover-open", "music blob did not open")
    expect(c.page.locator(".bl-hobby").count() >= 4, m, "discover-open", "music hobbies missing")
    expect(c.page.locator('.bl-hobby.is-mine[data-key="guitar"]').count() == 1, m, "discover-open", "tracked guitar should be marked")
    c.page.fill('[data-role="discover-search"]', "tennis")
    expect(c.page.locator(".bl-search.is-open .bl-hobby").count() == 1, m, "discover-search", "search did not find one hobby")
    expect(c.page.locator(".bl-search.is-open .bl-hobby").get_attribute("data-key") == "tennis", m, "discover-search", "search returned wrong hobby")
    c.page.fill('[data-role="discover-search"]', "")
    c.page.locator('.bl-cat[data-cat="athletic"] .bl-face').evaluate("el => el.click()")
    c.page.wait_for_timeout(500)
    c.page.locator('.bl-hobby[data-key="crossfit"]').evaluate("el => el.click()")
    expect(c.page.locator(".bl-sheet").count() == 1, m, "discover-sheet", "hobby info sheet did not open")
    c.page.wait_for_selector(".bl-sheet .bl-guide-note")
    expect(c.page.locator(".bl-sheet .bl-basics li").count() >= 2, m, "discover-sheet", "offline gear basics missing")
    expect(c.page.locator('.bl-sheet a[href*="google.com/search"], .bl-sheet a[href*="youtube.com/results"]').count() == 0,
           m, "discover-sheet", "sheet should not link open searches")
    c.audit("03-discover-sheet", nav_check=False)
    c.page.keyboard.press("Escape")
    expect(c.page.locator(".bl-sheet").count() == 0, m, "discover-sheet", "Escape did not close the sheet")
    emoji = c.js("() => /[\\u{1F300}-\\u{1FAFF}\\u{2600}-\\u{27BF}]/u.test(document.querySelector('.bl-stage').innerText)")
    expect(not emoji, m, "discover-icons", "discover blobs should use icons, not emojis")
    # Drag CrossFit into My hobbies.
    src = c.page.locator('.bl-hobby[data-key="crossfit"] .bl-hobby-dot').bounding_box()
    dst = c.page.locator(".bl-mine .bl-face").bounding_box()
    sx, sy = src["x"] + src["width"] / 2, src["y"] + src["height"] / 2
    tx, ty = dst["x"] + dst["width"] / 2, dst["y"] + dst["height"] / 2
    c.page.mouse.move(sx, sy)
    c.page.mouse.down()
    c.page.mouse.move(tx, ty, steps=12)
    c.page.mouse.up()
    c.page.wait_for_timeout(800)
    c.close_any_overlay()
    expect(c.js("() => SQ.state.tracked.some(t => SQ.getHobby(t.hobbyId).name === 'CrossFit')") is True, m, "discover-drag", "dragging CrossFit into My hobbies did not add it")
    expect(c.page.locator(".bl-mine [data-role=mine-count]").inner_text().strip() == "2", m, "discover-drag", "My hobbies count did not update")
    expect(c.page.locator('.bl-hobby.is-mine[data-key="crossfit"]').count() == 1, m, "discover-drag", "added hobby not marked in its blob")
    expect(c.page.locator(".bl-sheet").count() == 0, m, "discover-drag", "a drag should not open the info sheet")
    # A drag that ends outside the blob adds nothing.
    src = c.page.locator('.bl-hobby[data-key="soccer"] .bl-hobby-dot').bounding_box()
    c.page.mouse.move(src["x"] + 20, src["y"] + 20)
    c.page.mouse.down()
    c.page.mouse.move(src["x"] + 70, src["y"] + 40, steps=6)
    c.page.mouse.up()
    c.page.wait_for_timeout(500)
    expect(c.js("() => SQ.isTracked('soccer')") is False, m, "discover-drag", "dropping outside My hobbies added a hobby")
    expect(c.page.locator(".bl-ghost").count() == 0, m, "discover-drag", "drag ghost left behind")
    # Keyboard / no-drag path still works.
    c.page.locator('.bl-hobby[data-key="pilates"]').evaluate("el => el.click()")
    c.page.locator('.bl-sheet [data-sheet="add"]').click()
    c.page.wait_for_timeout(800)
    c.close_any_overlay()
    expect(c.js("() => SQ.state.tracked.some(t => SQ.getHobby(t.hobbyId).name === 'Pilates')") is True, m, "discover-add", "Add without dragging did not add Pilates")
    c.audit("04-discover-added")


def flow_simple_pick_today(c):
    m = c.mode
    c.fresh()
    expect(c.screen() == "pick", m, "simple-pick", "fresh start did not ask for current hobbies")
    ob_profile(c, name="Alex")
    c.audit("12-pick-question", nav_check=False)
    for name in ["Running", "Journaling", "Sewing"]:
        ob_add(c, name, "new")
    expect(c.page.locator(".ob-bubble .ob-badge").count() == 3, m, "simple-pick", "added hobbies not shown on the My hobbies bubble")
    expect(c.page.locator(".ob-bubble .ob-badge .sq-badge").count() == 3, m, "simple-pick", "hobby badges missing")
    c.click(".ob-badge [data-action=ob-remove]", nth=2)
    expect(c.page.locator(".ob-bubble .ob-badge").count() == 2, m, "simple-pick", "remove did not work")
    ob_add(c, "Sewing", "new")
    c.audit("13-pick-selected", nav_check=False)
    c.click("[data-action=ob-continue]")
    c.close_any_overlay()
    expect(c.js("() => SQ.skill('running') && SQ.skill('running').tier") == "new", m, "simple-pick", "expertise not saved")
    c.click("[data-action=ob-no]")
    expect(c.screen() == "today", m, "simple-pick", "picker did not open Today")
    names = c.page.locator(".hc .hc-name").all_inner_texts()
    expect(names == ["Running", "Journaling", "Sewing"], m, "simple-pick", f"tracked cards {names}")
    c.audit("16-today")
    for i, how in [(0, "button"), (1, "esc"), (2, "backdrop")]:
        n0 = c.js("() => SQ.state.sessions.length")
        c.click(".hc .tiny-btn", nth=i)
        expect(c.overlay_xp() in (10, 60), m, f"tiny{i}", "unexpected tiny-win XP")
        c.close_overlay(how)
        expect(c.js("() => SQ.state.sessions.length") == n0 + 1, m, f"tiny{i}", "tiny win not logged once")
    c.click("#app-nav [data-nav=community]")
    c.audit("18-community")
    c.click("#app-nav [data-nav=discover]")
    c.audit("20-discover-place")


def flow_hobby(c):
    """Uses state from flow_pick_today (Running goal 4, Chess, custom)."""
    m = c.mode
    c.click("#app-nav [data-nav=today]")
    c.click(".hc-body", nth=0)   # Running
    expect(c.screen() == "hobby", m, "hobby", "not on hobby")
    hid = c.js("() => SQUI.current().params.id")
    c.audit("21-hobby")
    # stepper bounds
    for _ in range(9):
        b = c.page.locator("[data-action=goal][data-d='-1']")
        if b.is_disabled():
            break
        b.click()
    expect(c.js(f"() => SQ.state.tracked.find(t => t.hobbyId==='{hid}').goal") == 1, m, "stepper", "min goal not 1")
    expect(c.page.locator("[data-action=goal][data-d='-1']").is_disabled(), m, "stepper", "minus not disabled at 1")
    for _ in range(9):
        b = c.page.locator("[data-action=goal][data-d='1']")
        if b.is_disabled():
            break
        b.click()
    expect(c.js(f"() => SQ.state.tracked.find(t => t.hobbyId==='{hid}').goal") == 7, m, "stepper", "max goal not 7")
    expect(c.page.locator("[data-action=goal][data-d='1']").is_disabled(), m, "stepper", "plus not disabled at 7")
    # keyboard focus survives a stepper refresh
    c.page.locator("[data-action=goal][data-d='-1']").focus()
    c.page.keyboard.press("Enter")
    foc = c.js("() => document.activeElement && document.activeElement.getAttribute('data-action')")
    expect(foc == "goal", m, "stepper", f"focus lost after stepper refresh (active={foc})")
    # set goal to (this week + 2) so the second log below hits it
    week = c.js(f"() => SQ.hobbyStats('{hid}').sessionsThisWeek")
    c.js(f"() => {{ SQ.setGoal('{hid}', {min(7, week + 2)}); SQUI.refresh(); }}")
    # milestone: reward + idempotent
    xp0 = c.js("() => SQ.state.user.xp")
    c.click(".ms-row", nth=1)
    expect(c.overlay_xp() == 40, m, "milestone", "milestone overlay not +40")
    c.audit("22-reward-milestone", nav_check=False)
    c.close_overlay()
    c.page.locator(".ms-row").nth(1).click(force=True)   # aria-disabled now; force the tap anyway
    c.page.wait_for_timeout(150)
    expect(not c.js("() => !!document.querySelector('.rw')"), m, "milestone", "second tick showed reward")
    expect(c.js("() => SQ.state.user.xp") == xp0 + 40, m, "milestone", "milestone double-awarded")
    # heat map
    expect(c.page.locator(".heat-c").count() == 84, m, "heat", f"{c.page.locator('.heat-c').count()} heat cells")
    expect(c.page.locator(".heat-c.today").count() == 1, m, "heat", "today cell missing")
    # log each size
    for size, base in [("tiny", 10), ("regular", 25), ("big", 50)]:
        pre = c.js(f"""() => {{ const s = SQ.hobbyStats('{hid}'); const wk = SQ.weekKey(SQ.today());
            const hit = SQ.state.sessions.some(x => x.hobbyId==='{hid}' && SQ.weekKey(x.date)===wk && x.xp - ({{tiny:10,regular:25,big:50}})[x.size] >= 50);
            return {{cb: s.inComeback, week: s.sessionsThisWeek, goal: s.goal, hit, recent: s.recent.length}}; }}""")
        exp = base + (20 if pre["cb"] else 0) + (50 if (not pre["hit"] and pre["week"] + 1 == pre["goal"]) else 0)
        nrec = c.page.locator("section:has(h2:text('Recent sessions')) .list-row").count()
        c.click("[data-action=log]")
        expect(c.screen() == "log", m, "log", "not on log")
        c.click(f"[data-action=size][data-size={size}]")
        c.click("[data-action=min][data-m='20']")
        c.page.fill("#lg-note", f"note <i>{size}</i> & \"q\"")
        if size == "tiny":
            c.audit("23-log", nav_check=False)
        lbl = c.page.locator("[data-action=save]").inner_text()
        expect(f"+{base}" in lbl, m, "log-" + size, f"save label '{lbl}'")
        c.click("[data-action=save]")
        got = c.overlay_xp()
        expect(got == exp, m, "log-" + size, f"overlay +{got}, expected +{exp} ({pre})")
        if size == "regular":
            c.audit("24-reward-log", nav_check=False)
        c.close_overlay()
        expect(c.screen() == "hobby", m, "log-" + size, f"after save on {c.screen()}")
        n2 = c.page.locator("section:has(h2:text('Recent sessions')) .list-row").count()
        expect(n2 == min(8, nrec + 1), m, "recent-" + size, f"recent rows {nrec} -> {n2}")
        expect(c.page.locator("#app-main i").filter(has_text=size).count() == 0, m, "log-" + size, "note rendered as HTML")
    last = c.js(f"() => SQ.hobbyStats('{hid}').recent[0]")
    expect(last["minutes"] == 20 and last["size"] == "big", m, "log", f"last session {last}")
    c.audit("25-hobby-after-logs")
    # stop tracking: two-step
    c.click("[data-action=stop]")
    expect(c.page.locator(".confirm-box").count() == 1, m, "stop", "no confirm box")
    c.audit("26-hobby-stop-confirm")
    c.click("[data-action=stop-no]")
    expect(c.page.locator(".confirm-box").count() == 0, m, "stop", "confirm did not cancel")
    expect(c.js(f"() => SQ.isTracked('{hid}')"), m, "stop", "cancel untracked anyway")
    c.click("[data-action=stop]")
    c.click("[data-action=stop-yes]")
    expect(c.screen() == "today", m, "stop", "stop-yes did not go to today")
    expect(not c.js(f"() => SQ.isTracked('{hid}')"), m, "stop", "still tracked")
    expect(c.page.locator(".hc").count() == 2, m, "stop", "today card count after stop")
    # re-track: earned milestone stays done (no second +40)
    c.js(f"() => SQUI.go('hobby', {{id: '{hid}'}})")
    c.click("[data-action=track]")
    c.close_any_overlay()
    expect(c.page.locator(".ms-row.done").count() == 1, m, "retrack", "milestone not restored after re-tracking")
    c.js("() => SQUI.go('today', {}, {reset: true})")


def flow_demo_community(c):
    m = c.mode
    c.fresh()
    c.js("() => { SQ.seedDemo(); SQUI.go('today', {}, {reset:true}); }")
    expect(c.screen() == "today", m, "demo", "demo did not land on today")
    cards = c.page.locator(".hc").all_inner_texts()
    draw = [t for t in cards if t.startswith("Painting")]
    expect(draw and "Comeback" in draw[0], m, "demo", "painting card lacks comeback badge")
    c.audit("30-today-demo")
    # listener leak on today: refresh several times, one click = one session
    for _ in range(5):
        c.js("() => SQUI.refresh()")
    n0 = c.js("() => SQ.state.sessions.length")
    di = [i for i, t in enumerate(cards) if t.startswith("Painting")][0]
    c.click(".hc .tiny-btn", nth=di)
    xp = c.overlay_xp()
    expect(xp == 30, m, "demo-comeback", f"comeback tiny win +{xp}, expected +30")
    expect("Comeback bonus" in c.page.locator(".rw").inner_text(), m, "demo-comeback", "no comeback line")
    c.audit("31-reward-comeback", nav_check=False)
    c.close_overlay("backdrop")
    expect(c.js("() => SQ.state.sessions.length") == n0 + 1, m, "leak", "one tap logged multiple sessions")
    # Me screen on a long page
    c.click("#app-nav [data-nav=me]")
    c.audit("32-me")
    c.click("[data-action=achievements]")
    c.audit("33-achievements")
    c.click("#app-nav [data-nav=community]")
    expect(c.screen() == "community", m, "community", "not on community")
    c.audit("34-community")
    expect(c.page.locator('[data-action="category"][data-v="going"][aria-pressed="true"]').count() == 1, m, "community", "Going is not the default tab")
    # RSVP toggle on an upcoming row (All events, so cancelling keeps the card on screen)
    c.click('[data-action="category"][data-v="all"]')
    btn = c.page.locator(".cm-ev .cm-rsvp").first
    eid = btn.get_attribute("data-id")
    was = c.js(f"() => SQ.state.rsvps.includes('{eid}')")
    btn.click()
    expect(c.js(f"() => SQ.state.rsvps.includes('{eid}')") != was, m, "rsvp", "rsvp did not toggle")
    expect(c.page.locator(f".cm-ev .cm-rsvp[data-id='{eid}']").first.get_attribute("aria-pressed") == ("false" if was else "true"), m, "rsvp", "aria-pressed not updated")
    c.page.locator(f".cm-ev .cm-rsvp[data-id='{eid}']").first.click()
    expect(c.js(f"() => SQ.state.rsvps.includes('{eid}')") == was, m, "rsvp", "rsvp did not toggle back")
    # check-in was removed from the app: no check-in buttons anywhere
    expect(c.page.locator(".cm-checkin, [data-action=checkin]").count() == 0, m, "checkin", "check-in button still shown")
    # an event not RSVPd -> detail
    c.page.locator(".cm-ev .cm-ev-main").nth(1).click()
    expect(c.screen() == "event", m, "event2", "not on event")
    c.audit("37-event")
    def going_n():
        return int(re.search(r"(\d+) going", c.page.locator(".cm-cap").inner_text()).group(1))
    g0 = going_n(); was = c.page.locator(".cm-actions [data-action=rsvp]").get_attribute("aria-pressed") == "true"
    c.click(".cm-actions [data-action=rsvp]")
    expect(going_n() == g0 + (-1 if was else 1), m, "event-rsvp", f"going count {g0} -> {going_n()} after toggling rsvp")
    c.audit("37b-event-toggled")
    c.click("[data-action=open-group]")
    expect(c.screen() == "group", m, "group", "not on group")
    expect(c.page.locator(".cm-caught").count() == 1, m, "group", "no caught-up block")
    c.audit("38-group")
    c.click(".cm-caught [data-action=go-today]")
    expect(c.screen() == "today", m, "group", "caught-up button did not go to today")
    # Back from every screen
    for scr, params in [("today", {}), ("hobby", {"id": "running"}), ("log", {"id": "running"}), ("me", {}),
                        ("achievements", {}), ("welcome", {}), ("pick", {}), ("quiz", {}), ("results", {}),
                        ("pack", {"id": "tennis"}), ("discover", {}), ("community", {}), ("group", {"hobbyId": "tennis"}),
                        ("member", {"id": "ev-tennis-1"}), ("event", {"id": "ev-tennis-1"}), ("hobby", {"id": "nope"}), ("event", {"id": "nope"}),
                        ("group", {"hobbyId": "nope"}), ("pack", {"id": "nope"}), ("log", {"id": "tennis"})]:
        c.js(f"() => SQUI.go('{scr}', {json.dumps(params)})")
        expect(c.screen() == scr, m, "back", f"go({scr}) failed")
        expect(c.page.locator("#app-main .screen").count() >= 1, m, "back", f"{scr} rendered nothing")
        b = c.page.locator("#app-main [data-action=back]")
        if b.count():
            b.first.click()
        else:
            c.js("() => SQUI.back()")
        for _ in range(12):
            c.js("() => SQUI.back()")
        expect(c.screen() == "today", m, "back", f"back chain from {scr} ended on {c.screen()}")
        expect(c.page.locator("#app-main .screen").count() >= 1, m, "back", f"blank after back from {scr}")
    if c.errors:
        for e in c.errors:
            fail(m, "back", e)
        c.errors.clear()
    # reload mid-flow: state persists
    c.click("#app-nav [data-nav=today]")
    before = c.js("() => JSON.stringify({x: SQ.state.user.xp, s: SQ.state.sessions.length, t: SQ.state.tracked.map(t=>t.hobbyId)})")
    c.page.reload()
    c.page.wait_for_selector("#app-main .screen")
    expect(c.screen() == "today", m, "reload", f"after reload on {c.screen()}")
    after = c.js("() => JSON.stringify({x: SQ.state.user.xp, s: SQ.state.sessions.length, t: SQ.state.tracked.map(t=>t.hobbyId)})")
    expect(before == after, m, "reload", f"state changed {before} -> {after}")
    c.audit("39-today-reloaded", shot=False)


def flow_me(c):
    m = c.mode
    c.click("#app-nav [data-nav=me]")
    lst = c.js("() => SQ.achievementsList()")
    unlocked = sum(1 for a in lst if a["unlocked"])
    txt = c.page.locator("[data-action=achievements]").inner_text()
    expect(f"{unlocked} of {len(lst)}" in txt.replace("\n", " "), m, "me", f"'{txt}' vs {unlocked}/{len(lst)}")
    c.click("[data-action=achievements]")
    n_all = c.page.locator(".ach").count()
    n_locked = c.page.locator(".ach.locked").count()
    expect(n_all == len(lst) and n_all - n_locked == unlocked, m, "ach", f"tiles {n_all}/{n_all-n_locked} vs {len(lst)}/{unlocked}")
    c.click("[data-action=back]")
    expect(c.screen() == "me", m, "ach", "back from achievements not to me")
    # nudge
    c.page.fill("#me-nudge", "07:15")
    c.click("[data-action=nudge]")
    expect(c.js("() => SQ.state.user.nudgeTime") == "07:15", m, "me", "nudge not saved")
    # theme
    for t, attr in [("dark", "dark"), ("light", "light"), ("system", None)]:
        c.click(f"[data-action=theme][data-t={t}]")
        expect(c.js("() => document.documentElement.getAttribute('data-theme')") == attr, m, "theme", f"{t} -> {attr}")
        expect(c.page.locator(f"[data-action=theme][data-t={t}]").get_attribute("aria-checked") == "true", m, "theme", f"{t} not checked")
        if t == "dark" and c.mode == "l390":
            c.audit("40-me-forced-dark")
    # reset two-step
    c.click("[data-action=reset]")
    expect(c.page.locator(".confirm-box").count() == 1, m, "reset", "no confirm")
    c.audit("41-me-reset-confirm")
    c.click("[data-action=reset-no]")
    expect(c.js("() => SQ.state.onboarded") is True, m, "reset", "cancel reset wiped")
    c.click("[data-action=reset]")
    c.click("[data-action=reset-yes]")
    expect(c.screen() == "pick", m, "reset", f"reset went to {c.screen()}")
    expect(c.js("() => SQ.state.onboarded") is False and c.js("() => SQ.state.tracked.length") == 0, m, "reset", "state not reset")
    c.page.reload()
    c.page.wait_for_selector("#app-main .screen")
    expect(c.screen() == "pick", m, "reset-reload", "reset did not return to first-run picker")
    # Check the locked community state with no tracked hobbies.
    c.js("() => { SQ.state.onboarded = true; SQ.save(); SQUI.go('community', {}, {reset:true}); }")
    c.audit("42-community-locked")


def flow_research(c):
    m = c.mode
    c.fresh()
    c.js("() => { SQ.seedDemo(); SQUI.go('discover', {}, {reset:true}); }")
    result = {
        "hobby": "Pickleball", "category": "active", "overview": "A beginner-friendly paddle sport.",
        "location": "United States", "currency": "USD", "budget": 150, "cached": False,
        "researchedAt": "2026-10-03T12:00:00.000Z",
        "equipment": [{"name": "Paddle", "essential": True, "costLow": 30, "costHigh": 100,
                       "why": "Needed to play.", "buyingTip": "Choose a comfortable grip.",
                       "suggestedOptions": ["Lightweight beginner paddle"]}],
        "totalCost": {"low": 45, "high": 150},
        "firstSteps": [{"title": "Learn the kitchen", "details": "Practice the non-volley-zone rule.", "minutes": 15}],
        "tutorials": [{"title": "Pickleball rules", "format": "video", "provider": "Rules educator",
                       "searchQuery": "beginner pickleball rules", "whatYouLearn": "Scoring and court position."}],
        "safety": ["Warm up before quick lateral movement."], "notes": ["Public courts may have open-play hours."],
        "sources": [{"title": "Beginner guide", "publisher": "example.org", "url": "https://example.org/pickleball"}]
    }
    c.js("payload => { window.fetch = async () => ({ok:true, json:async () => payload}); }", result)
    expect(c.page.locator(".dc-cube").count() == 4, m, "research", "discover should start with four tiles")
    c.page.fill('[data-role="discover-form"] [name="hobby"]', "Pickleball")
    c.click('[data-role="discover-form"] button[type="submit"]')
    expect(c.page.locator(".dc-cube").count() == 4, m, "research", "search should keep four tiles")
    expect("Pickleball" in c.page.locator(".dc-cube").first.inner_text(), m, "research", "search did not replace a tile")
    c.audit("43-discover-four-cubes")
    c.click('.dc-cube[data-action="research"]')
    expect(c.screen() == "research", m, "research", "searched tile did not open research")
    c.page.wait_for_selector(".dc-ai-result")
    expect("Paddle" in c.page.locator(".dc-ai-result").inner_text(), m, "research", "equipment missing")
    expect(c.page.locator(".dc-ai-sources a").get_attribute("href") == "https://example.org/pickleball",
           m, "research", "grounded source missing")
    c.audit("44-research-result")
    c.click('[data-action="trackresearch"]')
    expect(c.screen() == "hobby", m, "research", "tracking researched hobby did not open it")
    expect(c.js("() => SQ.isTracked('custom-pickleball')") is True, m, "research", "researched hobby not tracked")


def run_mode(browser, idx, mode, vp, scheme):
    print(f"== {mode} {vp} {scheme}")
    c = Ctx(browser, mode, vp, scheme)
    try:
        for name, fn in [("quiz", lambda: flow_simple_discovery(c, ["indoor", "outdoor", "either"][idx % 3])),
                         ("pick", lambda: flow_simple_pick_today(c)),
                         ("hobby", lambda: flow_hobby(c)),
                         ("demo", lambda: flow_demo_community(c)),
                         ("me", lambda: flow_me(c)),
                         ("skip", lambda: flow_skip_onboarding(c))]:
            try:
                fn()
            except Exception as e:  # keep going: one broken flow shouldn't hide others
                fail(mode, name, "exception: " + repr(e).splitlines()[0][:300])
                traceback.print_exc()
                c.close_any_overlay() if c.page else None
    finally:
        c.close()


def main():
    if not os.path.exists(PREVIEW):
        os.system(f"cd {ROOT} && python3 build.py")
    os.makedirs(SHOTS, exist_ok=True)
    only = sys.argv[1:]
    with sync_playwright() as p:
        browser = p.chromium.launch()
        for i, (mode, vp, scheme) in enumerate(MODES):
            if only and mode not in only:
                continue
            run_mode(browser, i, mode, vp, scheme)
        browser.close()
    print(f"\n{CHECKS['n']} checks, {len(FAILS)} failures")
    if FAILS:
        seen = set()
        for f in FAILS:
            if f not in seen:
                seen.add(f)
                print(" -", f)
        sys.exit(1)
    print("e2e: all green")


if __name__ == "__main__":
    main()
