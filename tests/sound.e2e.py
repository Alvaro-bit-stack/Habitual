#!/usr/bin/env python3
"""Browser test for sound effects: XP, level-up and achievement cues, and the Me on/off setting.

A fake AudioContext records every note, so the test runs silently and headless.
Run: python3 tests/sound.e2e.py   (builds first if dist/Habitual.html is missing)
"""
import os
import re
import subprocess
import sys

from playwright.sync_api import sync_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PAGE = os.path.join(ROOT, "dist", "Habitual.html")
failures = []

FAKE_AUDIO = """
window.__notes = [];
class FakeParam { setValueAtTime(){} exponentialRampToValueAtTime(){} linearRampToValueAtTime(){} }
class FakeNode { connect(){} }
class FakeOsc extends FakeNode { constructor(){ super(); this.frequency = new FakeParam(); this.type = 'sine'; }
  start(at){ window.__notes.push({ at: at }); } stop(){} }
class FakeGain extends FakeNode { constructor(){ super(); this.gain = new FakeParam(); } }
window.AudioContext = class { constructor(){ this.state = 'running'; this.currentTime = 0; this.destination = new FakeNode(); }
  createOscillator(){ return new FakeOsc(); } createGain(){ return new FakeGain(); } resume(){ return Promise.resolve(); } };
"""


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
        page.set_default_timeout(8000)
        page.route(re.compile(r"https://fonts\.(googleapis|gstatic)\.com/.*"), lambda r: r.fulfill(status=200, content_type="text/css", body=""))
        page.route(re.compile(r"https://cdn\.jsdelivr\.net/.*"), lambda r: r.fulfill(status=200, content_type="application/javascript", body=""))
        page.add_init_script(FAKE_AUDIO)
        errors = []
        page.on("pageerror", lambda e: errors.append(str(e)))
        page.goto("file://" + PAGE)
        page.wait_for_timeout(300)

        def notes():
            return page.evaluate("window.__notes.length")

        def reward(r):
            page.evaluate("window.__notes = []")
            page.evaluate("r => { SQUI.showReward(r); }", r)
            page.wait_for_timeout(100)
            n = notes()
            page.keyboard.press("Escape")
            page.wait_for_timeout(300)
            return n

        page.evaluate("SQ.reset(); SQ.state.onboarded = true; SQ.save(); SQUI.go('today')")
        page.mouse.click(5, 5)  # browsers only start audio after a user gesture
        xp_only = reward({"xpGained": 25, "newAchievements": [], "breakdown": []})
        check(xp_only >= 2, f"earning XP plays the coin chime ({xp_only} notes)")
        lv = reward({"xpGained": 60, "newAchievements": [], "breakdown": [], "playerLevelBefore": 1, "playerLevelAfter": 2})
        check(lv > xp_only, f"a level-up adds a fanfare ({lv} notes vs {xp_only})")
        ach = reward({"xpGained": 0, "newAchievements": [{"id": "first_hobby", "name": "First Step", "desc": "x"}], "breakdown": []})
        check(ach >= 8, f"an achievement plays its arpeggio ({ach} notes)")

        # A real tiny win plays sound through the normal reward.
        page.evaluate("SQ.addHobby('guitar', {goal: 2}); SQUI.go('today')")
        page.wait_for_timeout(200)
        page.evaluate("window.__notes = []")
        page.click('.hc .tiny-btn')
        page.wait_for_timeout(200)
        check(notes() > 0, "logging a tiny win plays a sound")
        page.keyboard.press("Escape")
        page.wait_for_timeout(300)

        # Me → Sound effects: Off silences everything.
        page.evaluate("SQUI.go('me')")
        page.wait_for_timeout(300)
        check(page.locator('[data-action="sound"]').count() == 2, "Me has a Sound effects On/Off setting")
        page.click('[data-action="sound"][data-v="off"]')
        page.wait_for_timeout(100)
        check(page.evaluate("SQ.state.user.sound") is False, "turning sound off is saved")
        off = reward({"xpGained": 40, "newAchievements": [{"id": "x", "name": "X", "desc": ""}], "breakdown": []})
        check(off == 0, f"no sound plays while it is off ({off} notes)")
        page.evaluate("window.__notes = []")
        page.click('[data-action="sound"][data-v="on"]')
        page.wait_for_timeout(100)
        check(page.evaluate("SQ.state.user.sound") is True and notes() > 0, "turning sound back on plays a preview chime")
        check(not errors, "no page errors " + "; ".join(errors))
        browser.close()
    if failures:
        print(f"sound: {len(failures)} failing")
        sys.exit(1)
    print("sound: all green")


if __name__ == "__main__":
    main()
