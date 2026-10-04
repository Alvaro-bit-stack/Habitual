// Validates src/data.js against CONTRACT.md section 1. Run: node tests/data.check.js
const assert = require("assert");
const path = require("path");
require(path.join(__dirname, "..", "src", "data.js"));
const D = globalThis.SQ_DATA;
let fails = 0;
function check(name, fn) { try { fn(); } catch (e) { fails++; console.error("FAIL " + name + ": " + e.message); } }

const IDS = ["guitar","soccer","tennis","painting","photography","running","sewing","journaling","piano","basketball"];
const VIBES = ["creative","active","technical","social","relaxing"];
const ACH = ["first_hobby","first_session","starter_pack","tiny_five","three_hobbies","goal_week_1","goal_week_4","comeback","milestone_1","milestone_5","event_1","event_5","level_5"];
const ACH_CATS = ["starter","consistency","comeback","skill","social"];
const str = (v) => typeof v === "string" && v.trim().length > 0;
const sumLo = (items) => items.reduce((s, i) => s + i.price[0], 0);

check("top-level keys", () => assert.deepStrictEqual(Object.keys(D).sort(), ["achievements","events","groups","hobbies","quiz"]));
check("hobby ids", () => assert.deepStrictEqual(D.hobbies.map(h => h.id), IDS));

D.hobbies.forEach(h => {
  const p = "hobby " + h.id;
  check(p + " basics", () => {
    assert(str(h.name));
    assert(VIBES.includes(h.category));
    assert(Array.isArray(h.vibes) && h.vibes.includes(h.category) && h.vibes.every(v => VIBES.includes(v)));
    assert(["indoor","outdoor","either"].includes(h.place));
    assert(["solo","group","either"].includes(h.social));
    assert([0,50,150].includes(h.minBudget));
    assert(["low","mid","high"].includes(h.time));
    assert(typeof h.blurb === "string" && h.blurb.length < 110, "blurb length " + h.blurb.length);
    assert(h.related.length >= 2 && h.related.length <= 3 && h.related.every(r => IDS.includes(r) && r !== h.id));
  });
  check(p + " tinyWins", () => {
    assert.strictEqual(h.tinyWins.length, 5);
    h.tinyWins.forEach(t => assert(str(t.label) && typeof t.minutes === "number"));
    assert(h.tinyWins[0].minutes >= 2 && h.tinyWins[0].minutes <= 5);
    for (let i = 1; i < 5; i++) assert(h.tinyWins[i].minutes >= h.tinyWins[i-1].minutes, "not ascending");
  });
  check(p + " milestones", () => {
    assert.strictEqual(h.milestones.length, 5);
    assert.strictEqual(new Set(h.milestones.map(m => m.id)).size, 5);
    h.milestones.forEach(m => assert(str(m.id) && str(m.label)));
  });
  const sp = h.starterPack;
  check(p + " starterPack", () => {
    assert(typeof sp.whyLike === "string" && typeof sp.firstMonth === "string");
    ["free","budget","stepup"].forEach(t => {
      const items = sp.tiers[t].items;
      assert(Array.isArray(items) && items.length >= 1);
      if (t !== "free") assert(items.length >= 2 && items.length <= 5, t + " count");
      items.forEach(i => {
        assert(str(i.name) && str(i.reason));
        assert(Array.isArray(i.price) && i.price.length === 2 && i.price[0] >= 0 && i.price[1] >= i.price[0]);
      });
    });
    assert(sp.tryFirst.length >= 2 && sp.tryFirst.length <= 3 && sp.tryFirst.every(str));
    assert.strictEqual(sp.firstSessions.length, 3);
    sp.firstSessions.forEach(s => assert(str(s.title) && str(s.detail) && str(s.tinyVersion)));
    assert.strictEqual(h.tutorials.length, 3);
    h.tutorials.forEach(t => assert(str(t.title) && str(t.searchQuery) && str(t.format)));
  });
  check(p + " budget consistency", () => {
    assert(sp.tiers.free.items.every(i => i.price[0] === 0 && i.price[1] === 0), "free tier not free");
    const lo = sumLo(sp.tiers.budget.items);
    if (h.minBudget === 50) assert(lo < 50, "budget lo " + lo);
    if (h.minBudget === 150) assert(lo >= 50 && lo < 150, "budget lo " + lo);
  });
});

check("social constraints", () => {
  const g = id => D.hobbies.find(h => h.id === id).social;
  assert.strictEqual(g("tennis"), "group"); assert.strictEqual(g("soccer"), "group"); assert.strictEqual(g("basketball"), "group");
});

check("achievements", () => {
  assert.deepStrictEqual(D.achievements.map(a => a.id), ACH);
  D.achievements.forEach(a => assert(str(a.name) && str(a.desc) && ACH_CATS.includes(a.category)));
});

check("groups", () => {
  assert.strictEqual(D.groups.length, 10);
  assert.deepStrictEqual(D.groups.map(g => g.hobbyId).sort(), IDS.slice().sort());
  D.groups.forEach(g => {
    assert(str(g.name) && Number.isInteger(g.members) && g.members > 0);
    assert(g.posts.length >= 3 && g.posts.length <= 4, g.hobbyId + " posts");
    g.posts.forEach(p => assert(str(p.author) && str(p.text) && Number.isInteger(p.daysAgo) && p.daysAgo >= 0 && str(p.sessionLabel)));
  });
});

check("events", () => {
  const E = D.events;
  assert(E.length >= 16 && E.length <= 20, "count " + E.length);
  assert.strictEqual(new Set(E.map(e => e.id)).size, E.length, "unique ids");
  assert(E.filter(e => e.dayOffset === 0).length >= 4, "today events");
  assert(new Set(E.map(e => e.hobbyId)).size >= 10, "spread");
  E.forEach(e => {
    assert(IDS.includes(e.hobbyId), e.id);
    assert(Number.isInteger(e.dayOffset) && e.dayOffset >= 0 && e.dayOffset <= 13, e.id);
    assert(/^(1[0-2]|[1-9]):[0-5]\d (AM|PM)$/.test(e.time), e.id + " time");
    assert(str(e.title) && str(e.place));
    assert(["Beginner friendly","All levels","Intermediate","Experienced"].includes(e.level));
    assert(Number.isInteger(e.spots) && Number.isInteger(e.going) && e.spots > e.going && e.going >= 0, e.id + " spots");
    assert(/^[A-Z][a-z]+ [A-Z]\.$/.test(e.host), e.id + " host");
  });
});

check("quiz", () => {
  const Q = D.quiz;
  assert.deepStrictEqual(Q.map(q => q.id), ["place"]);
  const vals = q => q.options.map(o => o.value);
  assert.deepStrictEqual(vals(Q[0]), ["indoor","outdoor","either"]);
  assert.deepStrictEqual(Q.map(q => q.prompt), ["Where would you like to do your hobby?"]);
  Q.forEach(q => q.options.forEach(o => assert(str(o.label) && str(o.hint))));
});

check("no emoji", () => {
  const m = JSON.stringify(D).match(/\p{Extended_Pictographic}/gu);
  assert(!m, "found: " + (m || []).join(" "));
});

// Place coverage: each choice should yield at least three matching hobbies.
check("quiz coverage", () => {
  for (const pl of ["indoor","outdoor","either"]) {
    const matches = D.hobbies.filter(h => h.place === pl || h.place === "either" || pl === "either");
    assert(matches.length >= 3, pl + " has only " + matches.length);
  }
});

if (fails) { console.error(fails + " check(s) failed"); process.exit(1); }
console.log("data.check: all checks passed (" + D.hobbies.length + " hobbies, " + D.achievements.length + " achievements, " + D.groups.length + " groups, " + D.events.length + " events, " + D.quiz.length + " quiz questions)");
