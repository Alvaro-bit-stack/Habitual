/* Sidequest engine: state + game logic. No DOM. Exposes globalThis.SQ only. */
(function () {
  "use strict";

  var G = typeof globalThis !== "undefined" ? globalThis : (typeof window !== "undefined" ? window : this);
  var KEY = "sidequest.v1";
  var SIZE_XP = { tiny: 10, regular: 25, big: 50 };
  var SIZE_LABEL = { tiny: "Tiny win", regular: "Regular session", big: "Big session" };
  var XP = { comeback: 20, goal: 50, milestone: 40, checkin: 60 };
  var CATEGORIES = ["creative", "active", "technical", "social", "relaxing"];
  var STAGES = ["Seed", "Sprout", "Sapling", "Bloom", "Tree"];
  var STATIC_ACH_IDS = ["first_hobby", "first_session", "starter_pack", "tiny_five", "three_hobbies",
    "goal_week_1", "goal_week_4", "comeback", "milestone_1", "milestone_5", "event_1", "event_5", "level_5"];
  // Fallback defs used only if SQ_DATA lacks an id (e.g. tests with a stub).
  var FALLBACK_ACH = {
    first_hobby: ["First step", "Track your first hobby.", "starter"],
    first_session: ["Off the couch", "Log your first session.", "starter"],
    starter_pack: ["Packed and ready", "Start a hobby from a starter pack.", "starter"],
    tiny_five: ["Small but mighty", "Log 5 tiny wins.", "consistency"],
    three_hobbies: ["Juggler", "Track 3 hobbies at once.", "starter"],
    goal_week_1: ["Goal getter", "Hit a weekly goal.", "consistency"],
    goal_week_4: ["Four for four", "Reach a 4-week goal streak.", "consistency"],
    comeback: ["Welcome back", "Log a session after 14+ days away.", "comeback"],
    milestone_1: ["Level up", "Tick your first skill milestone.", "skill"],
    milestone_5: ["Getting good", "Tick 5 skill milestones.", "skill"],
    event_1: ["Showed up", "Check in at your first event.", "social"],
    event_5: ["Regular face", "Check in at 5 events.", "social"],
    level_5: ["Sapling", "Reach player level 5.", "consistency"]
  };

  var state = null;
  var idCounter = 0;

  // ---------------------------------------------------------------- data
  function data() {
    var d = G.SQ_DATA || {};
    return {
      hobbies: Array.isArray(d.hobbies) ? d.hobbies : [],
      achievements: Array.isArray(d.achievements) ? d.achievements : [],
      groups: Array.isArray(d.groups) ? d.groups : [],
      events: Array.isArray(d.events) ? d.events : [],
      quiz: Array.isArray(d.quiz) ? d.quiz : []
    };
  }

  // ---------------------------------------------------------------- dates (local calendar)
  function pad(n) { return (n < 10 ? "0" : "") + n; }
  function fmt(d) { return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); }
  function parts(s) {
    var p = String(s).split("-");
    return [parseInt(p[0], 10), parseInt(p[1], 10), parseInt(p[2], 10)];
  }
  function parseDate(s) { var p = parts(s); return new Date(p[0], p[1] - 1, p[2]); }
  function addDays(s, n) { var p = parts(s); return fmt(new Date(p[0], p[1] - 1, p[2] + n)); }
  function daysBetween(a, b) {
    var x = parts(a), y = parts(b);
    return Math.round((Date.UTC(y[0], y[1] - 1, y[2]) - Date.UTC(x[0], x[1] - 1, x[2])) / 86400000);
  }
  function weekKey(s) {
    var dow = parseDate(s).getDay(); // 0 Sun .. 6 Sat
    return addDays(s, -((dow + 6) % 7));
  }
  function isDateStr(s) { return typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s); }
  function nowDate() {
    var n = SQ._now;
    if (n != null) return new Date(n instanceof Date ? n.getTime() : n);
    return new Date();
  }
  function today() { return fmt(nowDate()); }
  function timeToMinutes(t) {
    var m = /^\s*(\d{1,2}):(\d{2})\s*([AaPp][Mm])?/.exec(String(t || ""));
    if (!m) return 0;
    var h = parseInt(m[1], 10) % 12, min = parseInt(m[2], 10);
    if (!m[3]) h = parseInt(m[1], 10);
    else if (/p/i.test(m[3])) h += 12;
    return h * 60 + min;
  }

  // ---------------------------------------------------------------- state
  function fresh() {
    return {
      version: 1,
      onboarded: false,
      user: { name: "You", xp: 0, nudgeTime: "21:00", quiz: null },
      custom: [],
      tracked: [],
      sessions: [],
      achievements: {},
      rsvps: [],
      checkins: []
    };
  }

  function storage() {
    try {
      if (typeof G.localStorage !== "undefined" && G.localStorage) return G.localStorage;
    } catch (e) { /* access can throw */ }
    return null;
  }

  function normalize(s) {
    if (!s || typeof s !== "object" || s.version !== 1) return null;
    var f = fresh();
    var out = {
      version: 1,
      onboarded: !!s.onboarded,
      user: Object.assign(f.user, (s.user && typeof s.user === "object") ? s.user : {}),
      custom: Array.isArray(s.custom) ? s.custom.filter(function (c) {
        return c && typeof c.id === "string" && typeof c.name === "string";
      }) : [],
      tracked: Array.isArray(s.tracked) ? s.tracked.filter(function (t) {
        return t && typeof t.hobbyId === "string";
      }).map(function (t) {
        return {
          hobbyId: t.hobbyId,
          goal: clampGoal(t.goal),
          xp: typeof t.xp === "number" && isFinite(t.xp) ? t.xp : 0,
          addedAt: isDateStr(t.addedAt) ? t.addedAt : today(),
          viaStarter: !!t.viaStarter,
          milestones: Array.isArray(t.milestones) ? t.milestones.filter(function (m) { return typeof m === "string"; }) : []
        };
      }) : [],
      sessions: Array.isArray(s.sessions) ? s.sessions.filter(function (x) {
        return x && typeof x.hobbyId === "string" && isDateStr(x.date) && SIZE_XP[x.size] != null;
      }) : [],
      achievements: (s.achievements && typeof s.achievements === "object" && !Array.isArray(s.achievements)) ? s.achievements : {},
      rsvps: Array.isArray(s.rsvps) ? s.rsvps.filter(function (x) { return typeof x === "string"; }) : [],
      checkins: Array.isArray(s.checkins) ? s.checkins.filter(function (x) { return typeof x === "string"; }) : []
    };
    if (typeof out.user.xp !== "number" || !isFinite(out.user.xp)) out.user.xp = 0;
    return out;
  }

  function ensure() { if (!state) init(); return state; }

  function init() {
    var loaded = null;
    var st = storage();
    if (st) {
      try {
        var raw = st.getItem(KEY);
        if (raw) loaded = normalize(JSON.parse(raw));
      } catch (e) { loaded = null; }
    }
    state = loaded || fresh();
    return state;
  }

  function save() {
    var st = storage();
    if (!st || !state) return false;
    try { st.setItem(KEY, JSON.stringify(state)); return true; } catch (e) { return false; }
  }

  function reset() { state = fresh(); save(); return state; }

  // ---------------------------------------------------------------- hobbies
  function catalog() { return data().hobbies.slice(); }

  function genericTinyWins(name) {
    return [
      { label: "Do 2 minutes of " + name, minutes: 2 },
      { label: "Do 5 minutes of " + name, minutes: 5 },
      { label: "Spend 10 minutes on " + name, minutes: 10 },
      { label: "Give " + name + " 20 focused minutes", minutes: 20 },
      { label: "Do a 30 minute " + name + " session", minutes: 30 }
    ];
  }
  function genericMilestones() {
    return [
      { id: "m1", label: "Finish your first full session" },
      { id: "m2", label: "Practice three weeks in a row" },
      { id: "m3", label: "Learn one new technique" },
      { id: "m4", label: "Share it with someone" },
      { id: "m5", label: "Complete a project or personal best" }
    ];
  }

  function getHobby(id) {
    var hs = data().hobbies;
    for (var i = 0; i < hs.length; i++) if (hs[i].id === id) return hs[i];
    var c = ensure().custom;
    for (var j = 0; j < c.length; j++) {
      if (c[j].id === id) {
        var cat = c[j].category;
        return {
          id: c[j].id, name: c[j].name, category: cat, vibes: [cat], place: "either", social: "either",
          minBudget: 0, time: "mid", blurb: "Your own hobby.", related: [],
          tinyWins: genericTinyWins(c[j].name), milestones: genericMilestones(),
          starterPack: null, custom: true
        };
      }
    }
    return null;
  }

  function addCustomHobby(name, category) {
    ensure();
    name = String(name == null ? "" : name).trim().slice(0, 40) || "My hobby";
    if (CATEGORIES.indexOf(category) < 0) category = "creative";
    for (var i = 0; i < state.custom.length; i++) {
      if (state.custom[i].name.toLowerCase() === name.toLowerCase()) return state.custom[i].id;
    }
    var slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "hobby";
    var id = "custom-" + slug, n = 2;
    while (getHobby(id)) id = "custom-" + slug + "-" + (n++);
    state.custom.push({ id: id, name: name, category: category });
    save();
    return id;
  }

  function trackedEntry(id) {
    var t = ensure().tracked;
    for (var i = 0; i < t.length; i++) if (t[i].hobbyId === id) return t[i];
    return null;
  }
  function isTracked(id) { return !!trackedEntry(id); }
  function clampGoal(n) {
    n = Math.round(Number(n));
    if (!isFinite(n)) n = 2;
    return Math.max(1, Math.min(7, n));
  }

  // ---------------------------------------------------------------- levels
  function levelFor(xp) {
    xp = Math.max(0, Number(xp) || 0);
    var level = 1, start = 0;
    while (xp >= start + 100 * level) { start += 100 * level; level++; }
    return { level: level, into: xp - start, next: 100 * level };
  }
  function stageFor(level) {
    if (level >= 12) return 4;
    if (level >= 8) return 3;
    if (level >= 5) return 2;
    if (level >= 3) return 1;
    return 0;
  }

  // ---------------------------------------------------------------- sessions helpers
  function sessionsFor(id) {
    return ensure().sessions.filter(function (s) { return s.hobbyId === id; })
      .sort(function (a, b) { return a.date < b.date ? -1 : a.date > b.date ? 1 : (a.ts || 0) - (b.ts || 0); });
  }
  function hasGoalBonus(s) { return (s.xp || 0) - (SIZE_XP[s.size] || 0) >= XP.goal; }

  function weeklyStreak(id, list, goal, addedAt, t) {
    var counts = {};
    list.forEach(function (s) { var k = weekKey(s.date); counts[k] = (counts[k] || 0) + 1; });
    var cur = weekKey(t);
    var stopBefore = weekKey(addedAt || t);
    var streak = 0, forgiven = {};
    if ((counts[cur] || 0) >= goal) streak++;
    var w = addDays(cur, -7);
    while (w >= stopBefore) {
      if ((counts[w] || 0) >= goal) streak++;
      else {
        var month = w.slice(0, 7);
        if (forgiven[month]) break;
        forgiven[month] = true;
      }
      w = addDays(w, -7);
    }
    return streak;
  }

  function computeComeback(list, entry, t) {
    var last = list.length ? list[list.length - 1].date : null;
    var ds = last ? daysBetween(last, t) : null;
    var inCb = ds != null ? ds >= 7 : !!(entry && daysBetween(entry.addedAt, t) >= 7);
    return { daysSince: ds, inComeback: inCb };
  }

  function hobbyStats(id) {
    ensure();
    var h = getHobby(id);
    if (!h) return null;
    var t = today();
    var entry = trackedEntry(id);
    var list = sessionsFor(id);
    var xp = entry ? entry.xp : 0;
    var lv = levelFor(xp);
    var goal = entry ? entry.goal : 0;
    var wk = weekKey(t);
    var counts = {}, byDate = {}, minutes = 0;
    list.forEach(function (s) {
      var k = weekKey(s.date);
      counts[k] = (counts[k] || 0) + 1;
      byDate[s.date] = (byDate[s.date] || 0) + 1;
      if (typeof s.minutes === "number" && isFinite(s.minutes)) minutes += s.minutes;
    });
    var bestWeek = 0;
    Object.keys(counts).forEach(function (k) { if (counts[k] > bestWeek) bestWeek = counts[k]; });
    var cb = computeComeback(list, entry, t);
    var ladder = 0;
    if (list.length && !cb.inComeback) {
      var startIdx = 0;
      for (var i = list.length - 1; i >= 1; i--) {
        if (daysBetween(list[i - 1].date, list[i].date) >= 7) { startIdx = i; break; }
      }
      ladder = Math.min(4, list.length - startIdx);
    }
    var tw = h.tinyWins || [];
    var heat = [];
    for (var d = 83; d >= 0; d--) {
      var ds = addDays(t, -d);
      heat.push({ date: ds, count: byDate[ds] || 0 });
    }
    return {
      level: lv.level, xp: xp, xpIntoLevel: lv.into, xpForNext: lv.next,
      sessionsThisWeek: counts[wk] || 0,
      goal: goal,
      weeklyStreak: entry ? weeklyStreak(id, list, goal, entry.addedAt, t) : 0,
      totalSessions: list.length,
      totalMinutes: minutes,
      bestWeek: bestWeek,
      daysSince: cb.daysSince,
      inComeback: cb.inComeback,
      ladderIndex: ladder,
      nextTinyWin: tw[Math.min(ladder, tw.length - 1)] || null,
      heat: heat,
      recent: list.slice().reverse().slice(0, 20)
    };
  }

  function player() {
    ensure();
    var lv = levelFor(state.user.xp);
    var stage = stageFor(lv.level);
    var perCat = {};
    var wk = weekKey(today()), week = 0;
    state.sessions.forEach(function (s) {
      var h = getHobby(s.hobbyId);
      if (h && h.category) perCat[h.category] = (perCat[h.category] || 0) + 1;
      if (weekKey(s.date) === wk) week++;
    });
    return {
      level: lv.level, xp: state.user.xp, xpIntoLevel: lv.into, xpForNext: lv.next,
      stage: stage, stageName: STAGES[stage],
      accessories: CATEGORIES.filter(function (c) { return (perCat[c] || 0) >= 3; }),
      totalSessions: state.sessions.length,
      weekSessions: week,
      trackedCount: state.tracked.length
    };
  }

  // ---------------------------------------------------------------- achievements
  function achDef(id) {
    var defs = data().achievements;
    for (var i = 0; i < defs.length; i++) {
      if (defs[i].id === id) return { id: id, name: defs[i].name, desc: defs[i].desc, category: defs[i].category };
    }
    if (id.indexOf("skill:") === 0) {
      var p = id.split(":");
      var h = getHobby(p[1]);
      var label = p.slice(2).join(":");
      if (h && h.milestones) h.milestones.forEach(function (m) { if (m.id === label) label = m.label; });
      return { id: id, name: label, desc: "Skill milestone in " + (h ? h.name : p[1]), category: "skill" };
    }
    var f = FALLBACK_ACH[id];
    return f ? { id: id, name: f[0], desc: f[1], category: f[2] } : null;
  }

  function staticIds() {
    var ids = data().achievements.map(function (a) { return a.id; });
    STATIC_ACH_IDS.forEach(function (id) { if (ids.indexOf(id) < 0) ids.push(id); });
    return ids;
  }

  function unlock(id, out) {
    if (state.achievements[id]) return;
    state.achievements[id] = today();
    var d = achDef(id);
    if (d) out.push(d);
  }

  // Evaluate every static achievement from current state. ctx.comeback flags the event-based one.
  function checkAchievements(out, ctx) {
    ctx = ctx || {};
    var tiny = 0, goalHits = 0;
    state.sessions.forEach(function (s) {
      if (s.size === "tiny") tiny++;
      if (hasGoalBonus(s)) goalHits++;
    });
    var skills = Object.keys(state.achievements).filter(function (k) { return k.indexOf("skill:") === 0; }).length;
    var streak4 = state.tracked.some(function (t) {
      return weeklyStreak(t.hobbyId, sessionsFor(t.hobbyId), t.goal, t.addedAt, today()) >= 4;
    });
    var cond = {
      first_hobby: state.tracked.length >= 1,
      three_hobbies: state.tracked.length >= 3,
      starter_pack: state.tracked.some(function (t) { return t.viaStarter; }),
      first_session: state.sessions.length >= 1,
      tiny_five: tiny >= 5,
      goal_week_1: goalHits >= 1,
      goal_week_4: streak4,
      comeback: !!ctx.comeback,
      milestone_1: skills >= 1,
      milestone_5: skills >= 5,
      event_1: state.checkins.length >= 1,
      event_5: state.checkins.length >= 5,
      level_5: levelFor(state.user.xp).level >= 5
    };
    staticIds().forEach(function (id) { if (cond[id]) unlock(id, out); });
    return out;
  }

  function achievementsList() {
    ensure();
    var list = staticIds().map(function (id) {
      var d = achDef(id);
      return { id: id, name: d.name, desc: d.desc, category: d.category, unlocked: state.achievements[id] || null };
    });
    Object.keys(state.achievements).filter(function (k) { return k.indexOf("skill:") === 0; })
      .forEach(function (k) {
        var d = achDef(k);
        list.push({ id: k, name: d.name, desc: d.desc, category: d.category, unlocked: state.achievements[k] });
      });
    return list;
  }

  // ---------------------------------------------------------------- rewards
  function snapshot(hobbyId) {
    var e = hobbyId ? trackedEntry(hobbyId) : null;
    var pl = levelFor(state.user.xp).level;
    return { hobbyLevel: e ? levelFor(e.xp).level : null, playerLevel: pl, stage: stageFor(pl) };
  }
  function makeReward(hobbyId, before, breakdown, newAch, extra) {
    var after = snapshot(hobbyId);
    var xp = 0;
    breakdown.forEach(function (b) { xp += b.xp; });
    return {
      xpGained: xp,
      breakdown: breakdown,
      hobbyId: hobbyId || null,
      hobbyLevelBefore: before.hobbyLevel,
      hobbyLevelAfter: after.hobbyLevel,
      playerLevelBefore: before.playerLevel,
      playerLevelAfter: after.playerLevel,
      stageBefore: before.stage,
      stageAfter: after.stage,
      newAchievements: newAch,
      goalHit: !!(extra && extra.goalHit),
      wasComeback: !!(extra && extra.wasComeback)
    };
  }
  function gainXp(hobbyId, amount) {
    state.user.xp += amount;
    var e = hobbyId ? trackedEntry(hobbyId) : null;
    if (e) e.xp += amount;
  }

  // ---------------------------------------------------------------- mutators
  function addHobby(id, opts) {
    ensure();
    opts = opts || {};
    if (!getHobby(id)) return null;
    var newAch = [];
    if (!isTracked(id)) {
      var prevXp = 0;
      sessionsFor(id).forEach(function (s) { prevXp += s.xp || 0; });
      // Re-tracking: restore milestones already earned (their skill achievements persist) so they
      // can't be ticked and awarded a second time, and carry their XP back onto the hobby.
      var prefix = "skill:" + id + ":";
      var prevMs = Object.keys(state.achievements).filter(function (k) { return k.indexOf(prefix) === 0; })
        .map(function (k) { return k.slice(prefix.length); });
      prevXp += prevMs.length * XP.milestone;
      state.tracked.push({
        hobbyId: id,
        goal: clampGoal(opts.goal == null ? 2 : opts.goal),
        xp: prevXp,
        addedAt: today(),
        viaStarter: !!opts.viaStarter,
        milestones: prevMs
      });
    }
    var before = snapshot(id);
    checkAchievements(newAch);
    save();
    return makeReward(id, before, [], newAch);
  }

  function removeHobby(id) {
    ensure();
    state.tracked = state.tracked.filter(function (t) { return t.hobbyId !== id; });
    save();
  }

  function setGoal(id, n) {
    var e = trackedEntry(id);
    if (!e) return null;
    e.goal = clampGoal(n);
    save();
    return e.goal;
  }

  function logSession(id, opts) {
    ensure();
    opts = opts || {};
    if (!getHobby(id)) return null;
    var preAch = [];
    if (!isTracked(id)) {
      var r0 = addHobby(id, {});
      preAch = r0 ? r0.newAchievements : [];
    }
    var size = SIZE_XP[opts.size] != null ? opts.size : "regular";
    var t = today();
    var entry = trackedEntry(id);
    var list = sessionsFor(id);
    var cb = computeComeback(list, entry, t);
    var lastDate = list.length ? list[list.length - 1].date : null;
    var isComebackAch = lastDate != null && daysBetween(lastDate, t) >= 14;
    var before = snapshot(id);

    var breakdown = [{ label: SIZE_LABEL[size], xp: SIZE_XP[size] }];
    if (cb.inComeback) breakdown.push({ label: "Comeback bonus", xp: XP.comeback });

    var wk = weekKey(t);
    var weekList = list.filter(function (s) { return weekKey(s.date) === wk; });
    var alreadyHit = weekList.some(hasGoalBonus);
    var goalHit = !alreadyHit && weekList.length + 1 === entry.goal;
    if (goalHit) breakdown.push({ label: "Weekly goal hit", xp: XP.goal });

    var total = 0;
    breakdown.forEach(function (b) { total += b.xp; });
    var ts = nowDate().getTime();
    var minutes = opts.minutes == null || opts.minutes === "" ? null : Number(opts.minutes);
    if (minutes != null && (!isFinite(minutes) || minutes < 0)) minutes = null;
    state.sessions.push({
      id: "s" + ts.toString(36) + "-" + (++idCounter).toString(36) + "-" + state.sessions.length.toString(36),
      hobbyId: id, date: t, ts: ts, size: size,
      minutes: minutes, note: opts.note == null ? "" : String(opts.note), xp: total
    });
    gainXp(id, total);
    var newAch = preAch.slice();
    checkAchievements(newAch, { comeback: isComebackAch });
    save();
    return makeReward(id, before, breakdown, newAch, { goalHit: goalHit, wasComeback: cb.inComeback });
  }

  function tickMilestone(id, milestoneId) {
    ensure();
    var e = trackedEntry(id), h = getHobby(id);
    if (!e || !h) return null;
    var m = null;
    (h.milestones || []).forEach(function (x) { if (x.id === milestoneId) m = x; });
    if (!m || e.milestones.indexOf(milestoneId) >= 0) return null;
    var before = snapshot(id);
    e.milestones.push(milestoneId);
    gainXp(id, XP.milestone);
    var newAch = [];
    unlock("skill:" + id + ":" + milestoneId, newAch);
    checkAchievements(newAch);
    save();
    return makeReward(id, before, [{ label: "Skill milestone", xp: XP.milestone }], newAch);
  }

  // ---------------------------------------------------------------- events
  function eventById(id) {
    var ev = data().events;
    for (var i = 0; i < ev.length; i++) if (ev[i].id === id) return ev[i];
    return null;
  }
  function eventDate(ev) { return addDays(today(), ev.dayOffset || 0); }

  function events() {
    ensure();
    var t = today();
    return data().events.map(function (ev, i) {
      var date = eventDate(ev);
      var rsvp = state.rsvps.indexOf(ev.id) >= 0;
      var checkedIn = state.checkins.indexOf(ev.id) >= 0;
      return { e: Object.assign({}, ev, { date: date, rsvp: rsvp, checkedIn: checkedIn,
        canCheckIn: rsvp && !checkedIn && date <= t }), i: i };
    }).sort(function (a, b) {
      if (a.e.date !== b.e.date) return a.e.date < b.e.date ? -1 : 1;
      var d = timeToMinutes(a.e.time) - timeToMinutes(b.e.time);
      return d || a.i - b.i;
    }).map(function (x) { return x.e; });
  }

  function toggleRsvp(eventId) {
    ensure();
    if (!eventById(eventId)) return false;
    var i = state.rsvps.indexOf(eventId);
    if (i >= 0) state.rsvps.splice(i, 1); else state.rsvps.push(eventId);
    save();
    return i < 0;
  }

  function checkIn(eventId) {
    ensure();
    var ev = eventById(eventId);
    if (!ev) return null;
    if (state.rsvps.indexOf(eventId) < 0) return null;
    if (state.checkins.indexOf(eventId) >= 0) return null;
    if (eventDate(ev) > today()) return null;
    var hid = isTracked(ev.hobbyId) ? ev.hobbyId : null;
    var before = snapshot(hid);
    state.checkins.push(eventId);
    gainXp(hid, XP.checkin);
    var newAch = [];
    checkAchievements(newAch);
    save();
    return makeReward(hid, before, [{ label: "Event check-in", xp: XP.checkin }], newAch);
  }

  function communityUnlocked() { return ensure().tracked.length >= 1; }

  // ---------------------------------------------------------------- matching
  var VIBE_LABEL = { creative: "Creative", active: "Active", technical: "Technical", social: "Social", relaxing: "Relaxing" };
  var PLACE_LABEL = { indoor: "Indoors", outdoor: "Outdoors", either: "Indoors or out" };
  var SOCIAL_LABEL = { solo: "Great solo", group: "Done with others", either: "Solo or with friends" };
  var TIME_LABEL = { low: "Fits under 1 hr a week", mid: "Fits 1-3 hrs a week", high: "Rewards 3+ hrs a week" };
  function budgetLabel(b) { return b <= 0 ? "Free to start" : "Under $" + b + " to start"; }

  function match(answers) {
    ensure();
    answers = answers || {};
    var trackedIds = state.tracked.map(function (t) { return t.hobbyId; });
    var budget = answers.budget == null || answers.budget === "" ? null : Number(answers.budget);
    var hs = data().hobbies;
    var scored = [];
    hs.forEach(function (h, idx) {
      if (trackedIds.indexOf(h.id) >= 0) return;
      var score = 0;
      var r = { vibe: null, related: null, budget: null, place: null, social: null, time: null };
      if (answers.vibe && (h.vibes || []).indexOf(answers.vibe) >= 0) {
        score += 3;
        if (h.category === answers.vibe) score += 1;
        r.vibe = VIBE_LABEL[answers.vibe] || answers.vibe;
      }
      if (answers.place && (h.place === answers.place || h.place === "either" || answers.place === "either")) {
        score += 2; r.place = PLACE_LABEL[h.place] || null;
      }
      if (answers.social && (h.social === answers.social || h.social === "either" || answers.social === "either")) {
        score += 2; r.social = SOCIAL_LABEL[h.social] || null;
      }
      if (budget != null && isFinite(budget)) {
        if ((h.minBudget || 0) <= budget) { score += 2; r.budget = budgetLabel(h.minBudget || 0); }
        else score -= 3;
      }
      if (answers.time && h.time === answers.time) { score += 1; r.time = TIME_LABEL[h.time] || null; }
      var rel = null;
      for (var i = 0; i < trackedIds.length && !rel; i++) {
        var th = getHobby(trackedIds[i]);
        if ((h.related || []).indexOf(trackedIds[i]) >= 0 || (th && (th.related || []).indexOf(h.id) >= 0)) rel = th;
      }
      if (rel) { score += 1.5; r.related = "Pairs with " + rel.name; }
      var reasons = [r.vibe, r.related, r.budget, r.place, r.social, r.time].filter(Boolean).slice(0, 3);
      scored.push({ hobby: h, score: score, reasons: reasons, idx: idx });
    });
    scored.sort(function (a, b) { return b.score - a.score || a.idx - b.idx; });
    return scored.slice(0, 3).map(function (s) { return { hobby: s.hobby, score: s.score, reasons: s.reasons }; });
  }

  // ---------------------------------------------------------------- demo
  // Builds history relative to the today() in effect at call time by replaying real API calls
  // with SQ._now set to past moments. Afterwards SQ._now is restored to whatever it was before
  // the call (null in the app; the fake "today" in tests).
  function seedDemo() {
    var prevNow = SQ._now;
    var base = nowDate();
    var T = fmt(base);
    var bp = parts(T);
    var dow = (parseDate(T).getDay() + 6) % 7; // 0 = Monday
    var thisMon = -dow;                         // offset of this week's Monday
    var actions = [];
    function at(offset, hour, fn) { actions.push({ o: offset, h: hour, fn: fn, n: actions.length }); }

    state = fresh();

    // Running: goal 2, added 5 weeks before this week's Monday; Tue + Sat runs each past week.
    at(thisMon - 35, 8, function () { addHobby("running", { goal: 2 }); });
    // Drawing: goal 3, added same day; frequent until 9 days ago.
    at(thisMon - 35, 9, function () { addHobby("drawing", { goal: 3 }); });
    var runMin = [25, 30, 28, 35, 32];
    for (var k = 5; k >= 1; k--) {
      var mon = thisMon - 7 * k;
      (function (k, mon) {
        at(mon + 1, 7, function () { logSession("running", { size: "regular", minutes: runMin[k - 1], note: "" }); });
        at(mon + 5, 8, function () {
          logSession("running", k === 2 ? { size: "big", minutes: 60, note: "Long loop around the park" }
            : { size: "regular", minutes: runMin[(k + 1) % 5], note: "" });
        });
      })(k, mon);
    }
    var runThisWeek = dow === 0 ? 0 : -1;
    at(runThisWeek, dow === 0 ? 7 : 18, function () { logSession("running", { size: "regular", minutes: 30, note: "Easy pace, felt good" }); });
    at(thisMon - 30, 20, function () { tickMilestone("running", firstMilestone("running", 0)); });
    at(thisMon - 12, 20, function () { tickMilestone("running", firstMilestone("running", 1)); });

    var drawOffsets = [-37, -35, -32, -28, -25, -21, -18, -15, -12, -9];
    drawOffsets.forEach(function (o, i) {
      at(Math.max(o, thisMon - 35), 21, function () {
        logSession("drawing", { size: i % 4 === 3 ? "tiny" : "regular", minutes: i % 4 === 3 ? 5 : 30,
          note: i === 0 ? "Sketched the kitchen table" : "" });
      });
    });
    at(-24, 22, function () { tickMilestone("drawing", firstMilestone("drawing", 0)); });

    // Guitar: added 20 days ago via starter pack; 3 tiny wins + 1 regular, last 2 days ago.
    at(-20, 19, function () { addHobby("guitar", { goal: 2, viaStarter: true }); });
    at(-18, 20, function () { logSession("guitar", { size: "tiny", minutes: 5, note: "Tuned it and learned E minor" }); });
    at(-13, 20, function () { logSession("guitar", { size: "tiny", minutes: 5, note: "" }); });
    at(-8, 20, function () { logSession("guitar", { size: "tiny", minutes: 10, note: "" }); });
    at(-2, 20, function () { logSession("guitar", { size: "regular", minutes: 25, note: "Played through two chord changes" }); });

    actions.sort(function (a, b) { return a.o - b.o || a.h - b.h || a.n - b.n; });
    try {
      actions.forEach(function (a) {
        SQ._now = new Date(bp[0], bp[1] - 1, bp[2] + a.o, a.h, 0, 0);
        a.fn();
      });
      // RSVPs: one event today, one later (prefer tracked hobbies).
      SQ._now = base;
      var evs = data().events;
      var trackedIds = ["running", "drawing", "guitar"];
      function pick(pred) {
        var c = evs.filter(function (e) { return pred(e) && trackedIds.indexOf(e.hobbyId) >= 0; });
        if (!c.length) c = evs.filter(pred);
        return c[0] || null;
      }
      var e1 = pick(function (e) { return (e.dayOffset || 0) === 0; });
      var e2 = pick(function (e) { return (e.dayOffset || 0) > 0; });
      if (e1) toggleRsvp(e1.id);
      if (e2) toggleRsvp(e2.id);
    } finally {
      SQ._now = prevNow;
    }
    state.onboarded = true;
    save();
    return state;
  }
  function firstMilestone(id, i) {
    var h = getHobby(id);
    return h && h.milestones && h.milestones[i] ? h.milestones[i].id : "m" + (i + 1);
  }

  // ---------------------------------------------------------------- export
  var SQ = {
    _now: null,
    init: init,
    save: save,
    reset: reset,
    seedDemo: seedDemo,
    today: today,
    getHobby: getHobby,
    catalog: catalog,
    addCustomHobby: addCustomHobby,
    isTracked: isTracked,
    addHobby: addHobby,
    removeHobby: removeHobby,
    setGoal: setGoal,
    logSession: logSession,
    tickMilestone: tickMilestone,
    events: events,
    toggleRsvp: toggleRsvp,
    checkIn: checkIn,
    communityUnlocked: communityUnlocked,
    hobbyStats: hobbyStats,
    player: player,
    levelFor: levelFor,
    match: match,
    achievementsList: achievementsList,
    weekKey: weekKey,
    daysBetween: daysBetween,
    // extras (not in contract, safe to ignore)
    addDays: addDays,
    XP_TABLE: { tiny: 10, regular: 25, big: 50, comeback: 20, goal: 50, milestone: 40, checkin: 60 }
  };
  Object.defineProperty(SQ, "state", { get: function () { return ensure(); }, enumerable: true });
  G.SQ = SQ;
})();
