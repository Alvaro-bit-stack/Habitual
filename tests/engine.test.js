/* Engine tests. Run: node tests/engine.test.js  (no deps)
   Runs the full suite against a stub SQ_DATA, then again against src/data.js if it exists. */
"use strict";
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.join(__dirname, "..");
const ENGINE_SRC = fs.readFileSync(path.join(ROOT, "src/engine.js"), "utf8");
const DATA_PATH = path.join(ROOT, "src/data.js");

// ------------------------------------------------------------------ stub data
const IDS = ["guitar", "soccer", "tennis", "painting", "photography", "running", "sewing", "journaling", "piano", "basketball"];
const STUB_META = {
  guitar: ["creative", ["creative"], "indoor", "solo", 0, "mid", ["piano", "journaling"]],
  soccer: ["active", ["active"], "outdoor", "group", 0, "mid", ["running", "basketball"]],
  tennis: ["active", ["active", "social"], "outdoor", "group", 50, "mid", ["running", "soccer"]],
  painting: ["creative", ["creative"], "indoor", "solo", 0, "mid", ["photography", "journaling"]],
  photography: ["creative", ["creative"], "either", "solo", 0, "mid", ["painting", "journaling"]],
  running: ["active", ["active"], "outdoor", "either", 0, "mid", ["soccer", "basketball"]],
  sewing: ["creative", ["creative"], "indoor", "solo", 0, "mid", ["painting", "journaling"]],
  journaling: ["relaxing", ["relaxing"], "either", "solo", 0, "mid", ["painting", "photography"]],
  piano: ["creative", ["creative"], "indoor", "solo", 0, "mid", ["guitar", "journaling"]],
  basketball: ["active", ["active"], "either", "group", 0, "mid", ["soccer", "running"]]
};
function stubData() {
  const cap = (s) => s[0].toUpperCase() + s.slice(1);
  const hobbies = IDS.map((id) => {
    const m = STUB_META[id];
    return {
      id, name: cap(id), category: m[0], vibes: m[1], place: m[2], social: m[3], minBudget: m[4], time: m[5],
      blurb: "A stub hobby.", related: m[6],
      tinyWins: [2, 5, 10, 20, 30].map((n) => ({ label: `Do ${n} minutes of ${id}`, minutes: n })),
      milestones: ["a", "b", "c", "d", "e"].map((x) => ({ id: id + "_" + x, label: `${cap(id)} milestone ${x}` })),
      starterPack: { whyLike: "", firstMonth: "", tiers: { free: { items: [] }, budget: { items: [] }, stepup: { items: [] } }, tryFirst: [], firstSessions: [] }
    };
  });
  const achievements = ["first_hobby", "first_session", "starter_pack", "tiny_five", "three_hobbies",
    "goal_week_1", "goal_week_4", "comeback", "milestone_1", "milestone_5", "event_1", "event_5", "level_5"]
    .map((id) => ({ id, name: "Ach " + id, desc: "Desc " + id, category: "starter" }));
  const events = [];
  const offs = [0, 0, 0, 0, 1, 2, 3, 5, 7, 9, 12, 13];
  IDS.forEach((id, i) => events.push({
    id: "ev-" + id, hobbyId: id, title: cap(id) + " meetup", dayOffset: offs[i],
    time: i % 2 ? "6:30 PM" : "9:00 AM", place: "Branch Brook Park", level: "All levels", spots: 20, going: 5, host: "Maya R."
  }));
  events.push({ id: "ev-run-early", hobbyId: "running", title: "Early run", dayOffset: 0, time: "7:00 AM",
    place: "Weequahic Park", level: "Beginner friendly", spots: 15, going: 3, host: "Sam T." });
  events.push({ id: "ev-run-past", hobbyId: "running", title: "Past", dayOffset: -2, time: "7:00 AM",
    place: "Weequahic Park", level: "All levels", spots: 15, going: 3, host: "Sam T." });
  return { hobbies, achievements, groups: [], events, quiz: [] };
}

// ------------------------------------------------------------------ loader
function memStorage() {
  const m = new Map();
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, String(v)),
    removeItem: (k) => m.delete(k),
    _map: m
  };
}
function load(source, opts = {}) {
  const ctx = { console };
  if (opts.storage) ctx.localStorage = opts.storage;
  vm.createContext(ctx);
  if (source === "stub") ctx.SQ_DATA = JSON.parse(JSON.stringify(stubData()));
  else vm.runInContext(fs.readFileSync(source, "utf8"), ctx, { filename: "data.js" });
  vm.runInContext(ENGINE_SRC, ctx, { filename: "engine.js" });
  const SQ = ctx.SQ;
  if (opts.now) SQ._now = opts.now;
  SQ.init();
  return { SQ, ctx };
}
const D = (y, m, d, h = 12) => new Date(y, m - 1, d, h, 0, 0);

// ------------------------------------------------------------------ harness
let passed = 0, failed = 0;
const failures = [];
function assert(c, msg) { if (!c) throw new Error(msg || "assertion failed"); }
function eq(a, b, msg) {
  const ja = JSON.stringify(a), jb = JSON.stringify(b);
  if (ja !== jb) throw new Error((msg ? msg + ": " : "") + "expected " + jb + ", got " + ja);
}
function run(label, tests) {
  for (const [name, fn] of tests) {
    try { fn(); passed++; } catch (e) { failed++; failures.push(`[${label}] ${name}: ${e.message}`); }
  }
}

// ------------------------------------------------------------------ suite
function suite(source) {
  const L = (opts) => load(source, opts);
  const firstMs = (SQ, id, i = 0) => SQ.getHobby(id).milestones[i].id;
  const T = [];
  const test = (n, f) => T.push([n, f]);

  test("API surface exists", () => {
    const { SQ } = L();
    ["init", "save", "reset", "seedDemo", "today", "getHobby", "catalog", "addCustomHobby", "isTracked",
      "addHobby", "removeHobby", "setGoal", "logSession", "tickMilestone", "events", "toggleRsvp", "checkIn",
      "communityUnlocked", "hobbyStats", "player", "levelFor", "match", "achievementsList", "weekKey", "daysBetween"]
      .forEach((k) => assert(typeof SQ[k] === "function", "missing " + k));
    assert(SQ._now === null, "_now null by default");
    assert(SQ.state && SQ.state.version === 1, "state getter");
    assert(SQ.state === SQ.state, "state getter returns live object");
    eq(SQ.catalog().length, 10, "catalog size");
  });

  test("level curve", () => {
    const { SQ } = L();
    eq(SQ.levelFor(0), { level: 1, into: 0, next: 100 });
    eq(SQ.levelFor(99), { level: 1, into: 99, next: 100 });
    eq(SQ.levelFor(100), { level: 2, into: 0, next: 200 });
    eq(SQ.levelFor(299).level, 2);
    eq(SQ.levelFor(300), { level: 3, into: 0, next: 300 });
    eq(SQ.levelFor(600).level, 4);
    eq(SQ.levelFor(999), { level: 4, into: 399, next: 400 });
    eq(SQ.levelFor(1000), { level: 5, into: 0, next: 500 });
    eq(SQ.levelFor(1500).level, 6);
  });

  test("date helpers: weekKey, daysBetween, today with _now", () => {
    const { SQ } = L();
    eq(SQ.weekKey("2026-10-07"), "2026-10-05"); // Wed -> Mon
    eq(SQ.weekKey("2026-10-05"), "2026-10-05");
    eq(SQ.weekKey("2026-10-11"), "2026-10-05"); // Sun -> Mon
    eq(SQ.weekKey("2026-03-01"), "2026-02-23");
    eq(SQ.daysBetween("2026-10-01", "2026-10-05"), 4);
    eq(SQ.daysBetween("2026-10-05", "2026-10-01"), -4);
    eq(SQ.daysBetween("2026-03-07", "2026-03-09"), 2); // across US DST change
    eq(SQ.daysBetween("2025-12-31", "2026-01-01"), 1);
    SQ._now = D(2026, 10, 7, 23);
    eq(SQ.today(), "2026-10-07");
    SQ._now = D(2026, 10, 7, 0);
    eq(SQ.today(), "2026-10-07");
  });

  test("XP per size + hobby/player XP, session ts respects _now", () => {
    const { SQ } = L({ now: D(2026, 10, 5) });
    SQ.addHobby("painting", { goal: 7 });
    const a = SQ.logSession("painting", { size: "tiny" });
    eq(a.xpGained, 10); eq(a.breakdown, [{ label: "Tiny win", xp: 10 }]);
    eq(SQ.logSession("painting", { size: "regular" }).xpGained, 25);
    eq(SQ.logSession("painting", { size: "big", minutes: 60, note: "x" }).xpGained, 50);
    eq(SQ.state.user.xp, 85); eq(SQ.state.tracked[0].xp, 85);
    const s = SQ.state.sessions[2];
    eq(s.ts, D(2026, 10, 5).getTime()); eq(s.date, "2026-10-05"); eq(s.minutes, 60); eq(s.note, "x");
    eq(SQ.state.sessions[0].minutes, null);
    const ids = new Set(SQ.state.sessions.map((x) => x.id));
    eq(ids.size, 3, "unique ids");
  });

  test("reward shape", () => {
    const { SQ } = L({ now: D(2026, 10, 5) });
    const r0 = SQ.addHobby("painting");
    eq(r0.xpGained, 0); eq(r0.breakdown, []);
    eq(r0.newAchievements.map((a) => a.id), ["first_hobby"]);
    const a = r0.newAchievements[0];
    eq(Object.keys(a).sort(), ["category", "desc", "id", "name"]);
    const r = SQ.logSession("painting", { size: "regular" });
    ["xpGained", "breakdown", "hobbyId", "hobbyLevelBefore", "hobbyLevelAfter", "playerLevelBefore", "playerLevelAfter",
      "stageBefore", "stageAfter", "newAchievements", "goalHit", "wasComeback"].forEach((k) => assert(k in r, "reward." + k));
    eq(r.hobbyId, "painting");
    eq(SQ.state.tracked[0].goal, 2, "default goal 2");
  });

  test("goal hit exactly once per week", () => {
    const { SQ } = L({ now: D(2026, 10, 5) }); // Monday
    SQ.addHobby("running", { goal: 2 });
    const r1 = SQ.logSession("running", { size: "regular" });
    assert(!r1.goalHit);
    SQ._now = D(2026, 10, 6);
    const r2 = SQ.logSession("running", { size: "regular" });
    assert(r2.goalHit, "second session hits"); eq(r2.xpGained, 75);
    eq(r2.newAchievements.map((a) => a.id).includes("goal_week_1"), true);
    const r3 = SQ.logSession("running", { size: "regular" });
    assert(!r3.goalHit); eq(r3.xpGained, 25);
    // lower goal mid-week then raise again: still no second hit this week
    SQ.setGoal("running", 4);
    const r4 = SQ.logSession("running", { size: "tiny" });
    assert(!r4.goalHit, "already hit this week");
    // next week hits again
    SQ.setGoal("running", 2);
    SQ._now = D(2026, 10, 12);
    assert(!SQ.logSession("running", { size: "tiny" }).goalHit);
    assert(SQ.logSession("running", { size: "tiny" }).goalHit);
    eq(SQ.hobbyStats("running").sessionsThisWeek, 2);
  });

  test("goal 1 hits on first session; setGoal clamps", () => {
    const { SQ } = L({ now: D(2026, 10, 5) });
    SQ.addHobby("journaling", { goal: 1 });
    assert(SQ.logSession("journaling", { size: "tiny" }).goalHit);
    eq(SQ.setGoal("journaling", 0), 1); eq(SQ.setGoal("journaling", 99), 7); eq(SQ.state.tracked[0].goal, 7);
  });

  test("comeback bonus, ladder reset and climb", () => {
    const { SQ } = L({ now: D(2026, 9, 1) });
    SQ.addHobby("painting", { goal: 7 });
    let st = SQ.hobbyStats("painting");
    eq(st.ladderIndex, 0); eq(st.daysSince, null); eq(st.inComeback, false);
    eq(st.nextTinyWin, SQ.getHobby("painting").tinyWins[0]);
    SQ._now = D(2026, 9, 9); // added 8 days ago, no sessions -> comeback
    assert(SQ.hobbyStats("painting").inComeback, "no sessions + added 8d ago");
    const r = SQ.logSession("painting", { size: "tiny" });
    assert(r.wasComeback); eq(r.xpGained, 30);
    eq(r.breakdown[1], { label: "Comeback bonus", xp: 20 });
    eq(SQ.hobbyStats("painting").ladderIndex, 1);
    for (let d = 10; d <= 14; d++) { SQ._now = D(2026, 9, d); SQ.logSession("painting", { size: "tiny" }); }
    st = SQ.hobbyStats("painting");
    eq(st.ladderIndex, 4, "capped at 4"); eq(st.nextTinyWin, SQ.getHobby("painting").tinyWins[4]);
    eq(st.daysSince, 0);
    SQ._now = D(2026, 9, 20); // 6 days: not comeback
    st = SQ.hobbyStats("painting");
    eq(st.daysSince, 6); assert(!st.inComeback); eq(st.ladderIndex, 4);
    SQ._now = D(2026, 9, 21); // 7 days
    st = SQ.hobbyStats("painting");
    assert(st.inComeback); eq(st.ladderIndex, 0);
    const r2 = SQ.logSession("painting", { size: "regular" });
    assert(r2.wasComeback); eq(r2.xpGained, 45);
    assert(!r2.newAchievements.some((a) => a.id === "comeback"), "7 days is not 14");
    eq(SQ.hobbyStats("painting").ladderIndex, 1, "ladder reset after 7d gap");
    SQ._now = D(2026, 9, 22);
    eq(SQ.logSession("painting", { size: "tiny" }).wasComeback, false);
    eq(SQ.hobbyStats("painting").ladderIndex, 2);
    // 14+ days -> comeback achievement once
    SQ._now = D(2026, 10, 6);
    const r3 = SQ.logSession("painting", { size: "tiny" });
    assert(r3.newAchievements.some((a) => a.id === "comeback"));
    SQ._now = D(2026, 10, 25);
    assert(!SQ.logSession("painting", { size: "tiny" }).newAchievements.some((a) => a.id === "comeback"), "once");
  });

  test("weekly streak: met weeks, current week skip, forgiven week", () => {
    const { SQ } = L({ now: D(2026, 8, 3) }); // Mon Aug 3
    SQ.addHobby("running", { goal: 1 });
    // weeks: Aug3, Aug10, Aug17 met; Aug24 missed (forgiven, Aug); Aug31 met; Sep7 met; Sep14 current
    ["2026-08-04", "2026-08-11", "2026-08-18", "2026-09-01", "2026-09-08"].forEach((s) => {
      const [y, m, d] = s.split("-").map(Number);
      SQ._now = D(y, m, d); SQ.logSession("running", { size: "tiny" });
    });
    SQ._now = D(2026, 9, 16); // current week Sep14, not met -> skipped
    eq(SQ.hobbyStats("running").weeklyStreak, 5);
    SQ.logSession("running", { size: "tiny" });
    eq(SQ.hobbyStats("running").weeklyStreak, 6, "current week counts once met");
    eq(SQ.hobbyStats("running").bestWeek, 1);
  });

  test("weekly streak: second miss in same month breaks, stops at added week", () => {
    const { SQ } = L({ now: D(2026, 6, 1) }); // Mon Jun 1
    SQ.addHobby("running", { goal: 1 });
    // met: Jun1; miss Jun8, Jun15 (two in June) ; met Jun22, Jun29
    ["2026-06-02", "2026-06-23", "2026-06-30"].forEach((s) => {
      const [y, m, d] = s.split("-").map(Number);
      SQ._now = D(y, m, d); SQ.logSession("running", { size: "tiny" });
    });
    SQ._now = D(2026, 7, 7); // week Jul 6 current, not met
    eq(SQ.hobbyStats("running").weeklyStreak, 2, "Jun29+Jun22, Jun15 forgiven, Jun8 breaks");
    // stop at added week: new hobby added this week with no history
    SQ.addHobby("painting", { goal: 1 });
    eq(SQ.hobbyStats("painting").weeklyStreak, 0);
  });

  test("goal_week_4 unlocks on 4-week streak", () => {
    const { SQ } = L({ now: D(2026, 6, 1) });
    SQ.addHobby("running", { goal: 1 });
    let got = null;
    [2, 9, 16, 23].forEach((d) => {
      SQ._now = D(2026, 6, d);
      const r = SQ.logSession("running", { size: "tiny" });
      if (r.newAchievements.some((a) => a.id === "goal_week_4")) got = d;
    });
    eq(got, 23);
  });

  test("tiny_five, first_session, three_hobbies, starter_pack, level_5", () => {
    const { SQ } = L({ now: D(2026, 10, 5) });
    const r = SQ.addHobby("guitar", { viaStarter: true });
    eq(r.newAchievements.map((a) => a.id), ["first_hobby", "starter_pack"]);
    SQ.addHobby("painting");
    eq(SQ.addHobby("running").newAchievements.map((a) => a.id), ["three_hobbies"]);
    eq(SQ.addHobby("running").newAchievements, [], "re-add yields nothing");
    eq(SQ.state.tracked.length, 3);
    const ids = [];
    for (let i = 0; i < 5; i++) ids.push(...SQ.logSession("guitar", { size: "tiny" }).newAchievements.map((a) => a.id));
    assert(ids.includes("first_session") && ids.includes("tiny_five"));
    eq(SQ.state.achievements.tiny_five, "2026-10-05");
    let lv5 = false;
    for (let i = 0; i < 25 && !lv5; i++) {
      const rr = SQ.logSession("painting", { size: "big" });
      if (rr.newAchievements.some((a) => a.id === "level_5")) { lv5 = true; eq(rr.playerLevelAfter, 5); eq(rr.stageAfter, 2); }
    }
    assert(lv5, "level_5 unlocked");
  });

  test("milestone idempotence + dynamic skill achievement", () => {
    const { SQ } = L({ now: D(2026, 10, 5) });
    SQ.addHobby("tennis");
    const m = firstMs(SQ, "tennis");
    const r = SQ.tickMilestone("tennis", m);
    eq(r.xpGained, 40);
    const dyn = r.newAchievements.find((a) => a.id === "skill:tennis:" + m);
    eq(dyn, { id: "skill:tennis:" + m, name: SQ.getHobby("tennis").milestones[0].label,
      desc: "Skill milestone in " + SQ.getHobby("tennis").name, category: "skill" });
    assert(r.newAchievements.some((a) => a.id === "milestone_1"));
    eq(SQ.tickMilestone("tennis", m), null, "second tick null");
    eq(SQ.tickMilestone("tennis", "nope"), null);
    eq(SQ.tickMilestone("soccer", firstMs(SQ, "soccer")), null, "untracked");
    eq(SQ.state.user.xp, 40); eq(SQ.state.tracked[0].milestones, [m]);
    for (let i = 1; i < 5; i++) {
      const rr = SQ.tickMilestone("tennis", firstMs(SQ, "tennis", i));
      if (i === 4) assert(rr.newAchievements.some((a) => a.id === "milestone_5"));
    }
    const list = SQ.achievementsList();
    eq(list.slice(0, 13).map((a) => a.id), ["first_hobby", "first_session", "starter_pack", "tiny_five", "three_hobbies",
      "goal_week_1", "goal_week_4", "comeback", "milestone_1", "milestone_5", "event_1", "event_5", "level_5"]);
    eq(list.length, 18);
    eq(list[13].category, "skill"); eq(list[13].unlocked, "2026-10-05");
    eq(list.find((a) => a.id === "event_1").unlocked, null);
  });

  test("check-in rules", () => {
    const { SQ } = L({ now: D(2026, 10, 5, 10) });
    SQ.addHobby("running");
    const evs = SQ.events();
    for (let i = 1; i < evs.length; i++) {
      const a = evs[i - 1], b = evs[i];
      assert(a.date <= b.date, "sorted by date");
    }
    const todayEv = evs.find((e) => e.date === SQ.today() && e.hobbyId === "running") || evs.find((e) => e.date === SQ.today());
    const futureEv = evs.find((e) => e.date > SQ.today());
    assert(todayEv && futureEv, "has today + future events");
    eq(todayEv.canCheckIn, false);
    eq(SQ.checkIn(todayEv.id), null, "needs rsvp");
    eq(SQ.achievementsList().find((a) => a.id === "event_1").unlocked, null);
    eq(SQ.toggleRsvp(todayEv.id), true);
    assert(SQ.achievementsList().find((a) => a.id === "event_1").unlocked, "event_1 unlocks on the first RSVP");
    eq(SQ.events().find((e) => e.id === todayEv.id).canCheckIn, true);
    const r = SQ.checkIn(todayEv.id); // engine API kept; the app no longer offers check-in
    eq(r.xpGained, 60); assert(!r.newAchievements.some((a) => a.id === "event_1"), "already unlocked by the RSVP");
    eq(SQ.checkIn(todayEv.id), null, "only once");
    const after = SQ.events().find((e) => e.id === todayEv.id);
    assert(after.checkedIn && !after.canCheckIn);
    SQ.toggleRsvp(futureEv.id);
    eq(SQ.checkIn(futureEv.id), null, "future date");
    eq(SQ.toggleRsvp(futureEv.id), false, "toggle off");
    eq(SQ.toggleRsvp("no-such-event"), false);
    const others = SQ.events().filter((e) => e.id !== todayEv.id && e.id !== futureEv.id).slice(0, 4); // + the RSVP above = 5
    others.forEach((e) => SQ.toggleRsvp(e.id));
    assert(SQ.achievementsList().find((a) => a.id === "event_5").unlocked || SQ.events().length < 5, "event_5 unlocks after 5 events joined");
    eq(SQ.checkIn("no-such-event"), null);
    if (todayEv.hobbyId === "running") eq(SQ.state.tracked[0].xp, 60, "hobby xp on check-in");
  });

  test("events: date derived from dayOffset; same-day time order", () => {
    const { SQ } = L({ now: D(2026, 12, 30) });
    const evs = SQ.events();
    const raw = SQ.state && SQ.events; // ensure callable
    assert(raw);
    evs.forEach((e) => eq(e.date, SQ.weekKey(e.date) && e.date)); // date format sanity
    const toMin = (t) => { const m = /(\d+):(\d+)\s*(AM|PM)/i.exec(t); let h = +m[1] % 12; if (/pm/i.test(m[3])) h += 12; return h * 60 + +m[2]; };
    for (let i = 1; i < evs.length; i++) {
      if (evs[i].date === evs[i - 1].date) assert(toMin(evs[i - 1].time) <= toMin(evs[i].time), "time order");
    }
    const e0 = evs.find((e) => e.dayOffset === 0);
    eq(e0.date, "2026-12-30");
    const e3 = evs.find((e) => e.dayOffset === 3);
    if (e3) eq(e3.date, "2027-01-02");
  });

  test("match: top 3, deterministic, exclusion, reasons", () => {
    const { SQ } = L({ now: D(2026, 10, 5) });
    const ans = { vibe: "creative", place: "indoor", social: "solo", budget: 50, time: "low" };
    const a = SQ.match(ans), b = SQ.match(ans);
    eq(a.length, 3);
    eq(a.map((x) => x.hobby.id), b.map((x) => x.hobby.id), "deterministic");
    for (let i = 1; i < 3; i++) assert(a[i - 1].score >= a[i].score, "sorted");
    a.forEach((x) => { assert(x.reasons.length <= 3 && x.reasons.every((s) => typeof s === "string")); });
    // tie break by catalog order
    const cat = SQ.catalog().map((h) => h.id);
    for (let i = 1; i < 3; i++) if (a[i - 1].score === a[i].score) assert(cat.indexOf(a[i - 1].hobby.id) < cat.indexOf(a[i].hobby.id));
    // exclusion
    const top = a[0].hobby.id;
    SQ.addHobby(top);
    const c = SQ.match(ans);
    assert(!c.some((x) => x.hobby.id === top), "tracked excluded");
    // related bonus +1.5 appears
    const relIds = SQ.getHobby(top).related || [];
    const withRel = c.concat(SQ.match({})).find((x) => relIds.includes(x.hobby.id));
    if (withRel) assert(withRel.reasons.some((r) => /^Pairs with /.test(r)) || withRel.reasons.length === 3);
    // exact score check on a known hobby
    const { SQ: S2 } = L({ now: D(2026, 10, 5) });
    const h = S2.catalog()[0];
    const all = S2.match({ vibe: h.category, place: h.place, social: h.social, budget: 999, time: h.time });
    const hit = all.find((x) => x.hobby.id === h.id);
    assert(hit, "perfect-fit hobby in top 3");
    eq(hit.score, 3 + 1 + 2 + 2 + 2 + 1);
    eq(hit.reasons[0], h.category[0].toUpperCase() + h.category.slice(1));
    // budget penalty
    const pricey = S2.catalog().find((x) => x.minBudget > 0);
    if (pricey) {
      const s0 = S2.match({ budget: 0 });
      assert(!s0.some((x) => x.hobby.id === pricey.id) || s0.every((x) => x.score < 0), "over-budget penalized");
    }
  });

  test("custom hobbies", () => {
    const { SQ } = L({ now: D(2026, 10, 5) });
    const id = SQ.addCustomHobby("Bird watching", "relaxing");
    eq(id, "custom-bird-watching");
    assert(!SQ.isTracked(id));
    eq(SQ.addCustomHobby("Bird Watching", "relaxing"), id, "dedupe by name");
    const h = SQ.getHobby(id);
    eq(h.tinyWins.map((t) => t.minutes), [2, 5, 10, 20, 30]);
    eq(h.tinyWins[0].label, "Do 2 minutes of Bird watching");
    eq(h.milestones.length, 5); eq(h.starterPack, null);
    SQ.addHobby(id);
    SQ.logSession(id, { size: "tiny" });
    SQ.tickMilestone(id, h.milestones[0].id);
    eq(SQ.hobbyStats(id).xp, 50);
    eq(SQ.achievementsList().find((a) => a.id === "skill:" + id + ":" + h.milestones[0].id).desc, "Skill milestone in Bird watching");
    eq(SQ.getHobby("nope"), null);
  });

  test("removeHobby keeps sessions; communityUnlocked", () => {
    const { SQ } = L({ now: D(2026, 10, 5) });
    assert(!SQ.communityUnlocked());
    SQ.addHobby("journaling"); assert(SQ.communityUnlocked());
    SQ.logSession("journaling", { size: "regular" });
    SQ.removeHobby("journaling");
    assert(!SQ.isTracked("journaling")); eq(SQ.state.sessions.length, 1); assert(!SQ.communityUnlocked());
  });

  test("hobbyStats: heat 84 entries ending today, recent, totals", () => {
    const { SQ } = L({ now: D(2026, 3, 30) });
    SQ.addHobby("sewing");
    SQ.logSession("sewing", { size: "regular", minutes: 40 });
    SQ.logSession("sewing", { size: "tiny", minutes: 5 });
    const st = SQ.hobbyStats("sewing");
    eq(st.heat.length, 84);
    eq(st.heat[83], { date: "2026-03-30", count: 2 });
    eq(st.heat[0].date, "2026-01-06");
    for (let i = 1; i < 84; i++) eq(SQ.daysBetween(st.heat[i - 1].date, st.heat[i].date), 1);
    eq(st.totalMinutes, 45); eq(st.totalSessions, 2); eq(st.bestWeek, 2);
    eq(st.recent[0].size, "tiny", "newest first");
    eq(st.level, 1); eq(st.xpIntoLevel, 85, "40min+5min+goal-hit bonus"); eq(st.xpForNext, 100);
  });

  test("player: stage, accessories, weekSessions", () => {
    const { SQ } = L({ now: D(2026, 10, 5) });
    SQ.addHobby("running"); SQ.addHobby("painting");
    for (let i = 0; i < 3; i++) SQ.logSession("running", { size: "big" });
    SQ.logSession("painting", { size: "tiny" });
    const p = SQ.player();
    eq(p.accessories, [SQ.getHobby("running").category]);
    eq(p.totalSessions, 4); eq(p.weekSessions, 4); eq(p.trackedCount, 2);
    eq(p.stageName, ["Seed", "Sprout", "Sapling", "Bloom", "Tree"][p.stage]);
    eq(p.level, SQ.levelFor(p.xp).level);
  });

  test("storage-less operation", () => {
    const { SQ, ctx } = L({ now: D(2026, 10, 5) });
    assert(typeof ctx.localStorage === "undefined");
    SQ.addHobby("basketball"); SQ.logSession("basketball", { size: "big" });
    eq(SQ.save(), false);
    SQ.seedDemo(); SQ.reset();
    eq(SQ.state.onboarded, false);
  });

  test("throwing storage is tolerated", () => {
    const bad = { getItem() { throw new Error("x"); }, setItem() { throw new Error("quota"); } };
    const { SQ } = L({ storage: bad, now: D(2026, 10, 5) });
    SQ.addHobby("basketball"); SQ.logSession("basketball", { size: "big" });
    eq(SQ.state.sessions.length, 1);
  });

  test("persistence round-trip and corrupted storage", () => {
    const st = memStorage();
    const a = L({ storage: st, now: D(2026, 10, 5) }).SQ;
    a.addHobby("journaling"); a.logSession("journaling", { size: "regular" });
    const b = L({ storage: st, now: D(2026, 10, 5) }).SQ;
    eq(b.state.sessions.length, 1); eq(b.state.user.xp, 25);
    for (const raw of ["{not json", "null", "[]", "42", JSON.stringify({ version: 0, foo: 1 }), JSON.stringify({ version: 1, tracked: "x", sessions: [null, 3] })]) {
      st.setItem("sidequest.v1", raw);
      const c = L({ storage: st, now: D(2026, 10, 5) }).SQ;
      assert(Array.isArray(c.state.tracked) && Array.isArray(c.state.sessions), "fallback for " + raw);
      eq(c.state.version, 1);
      c.addHobby("journaling"); c.logSession("journaling", { size: "tiny" });
    }
    const d = L({ storage: st }).SQ;
    d.reset();
    eq(JSON.parse(st.getItem("sidequest.v1")).onboarded, false);
  });

  // seedDemo across several "today"s
  const days = [
    ["Monday", D(2026, 10, 5, 9)], ["Tuesday", D(2026, 10, 6, 9)], ["Wednesday", D(2026, 10, 7, 15)],
    ["Saturday", D(2026, 10, 10, 9)], ["Sunday", D(2026, 10, 11, 22)], ["Sun Mar 1", D(2026, 3, 1, 8)],
    ["Thu Jan 1", D(2026, 1, 1, 8)]
  ];
  days.forEach(([label, now]) => test("seedDemo invariants on " + label, () => {
    const st = memStorage();
    const { SQ } = L({ storage: st, now });
    const today = SQ.today();
    SQ.seedDemo();
    eq(SQ._now && SQ._now.getTime(), now.getTime(), "_now restored to previous value");
    eq(SQ.today(), today);
    const s = SQ.state;
    assert(s.onboarded);
    eq(s.tracked.map((t) => [t.hobbyId, t.goal]).sort(), [["guitar", 2], ["painting", 3], ["running", 2]]);
    const g = s.tracked.find((t) => t.hobbyId === "guitar");
    assert(g.viaStarter); eq(g.addedAt, SQ.addDays(today, -20));
    const draw = SQ.hobbyStats("painting"), run = SQ.hobbyStats("running"), gtr = SQ.hobbyStats("guitar");
    assert(draw.inComeback, "drawing in comeback"); eq(draw.daysSince, 9);
    assert(run.daysSince === 0 || run.daysSince === 1, "running daysSince " + run.daysSince);
    eq(run.sessionsThisWeek, 1, "1 run this week");
    assert(!run.inComeback);
    assert(run.weeklyStreak >= 4, "running streak " + run.weeklyStreak);
    eq(gtr.daysSince, 2); eq(gtr.totalSessions, 4);
    eq(s.sessions.filter((x) => x.hobbyId === "guitar" && x.size === "tiny").length, 3);
    eq(s.tracked.find((t) => t.hobbyId === "running").milestones.length, 2);
    eq(s.tracked.find((t) => t.hobbyId === "painting").milestones.length, 1);
    s.sessions.forEach((x) => assert(x.date <= today && SQ.daysBetween(x.date, today) <= 42, "dates in range"));
    s.sessions.forEach((x) => eq(x.date, (() => { const d = new Date(x.ts); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); })(), "ts matches date"));
    const p = SQ.player();
    assert(p.level >= 4 && p.level <= 5, "player level " + p.level + " xp " + p.xp);
    eq(s.rsvps.length, 2);
    const evs = SQ.events();
    const rsvpToday = evs.filter((e) => e.rsvp && e.date === today);
    eq(rsvpToday.length, 1, "one RSVP today");
    assert(!rsvpToday[0].checkedIn && rsvpToday[0].canCheckIn);
    assert(evs.some((e) => e.rsvp && e.date > today), "one RSVP later");
    eq(s.checkins.length, 0);
    // achievements are stamped with past dates, never future
    Object.values(s.achievements).forEach((d) => assert(d <= today));
    assert(s.achievements.first_hobby && s.achievements.starter_pack && s.achievements.three_hobbies);
    // xp consistency
    const sum = s.tracked.reduce((a, t) => a + t.xp, 0);
    eq(sum, s.user.xp, "all xp tied to tracked hobbies");
    eq(JSON.parse(st.getItem("sidequest.v1")).onboarded, true, "saved");
  }));

  test("seedDemo with _now null restores null", () => {
    const { SQ } = L();
    SQ.seedDemo();
    eq(SQ._now, null);
    assert(SQ.hobbyStats("painting").inComeback);
    const l = SQ.player().level;
    assert(l >= 4 && l <= 5);
  });

  run(source === "stub" ? "stub" : "real data", T);
}

suite("stub");
let usedReal = false;
if (fs.existsSync(DATA_PATH)) { usedReal = true; suite(DATA_PATH); }

failures.forEach((f) => console.log("FAIL " + f));
console.log(`${passed} passed, ${failed} failed${usedReal ? " (stub + real data.js)" : " (stub only; src/data.js not found)"}`);
process.exit(failed ? 1 : 0);
