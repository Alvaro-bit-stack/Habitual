/* Habitual — DISCOVER: welcome fork, hobby picker, quiz, results, starter packs, discover hub. */
(function () {
  if (typeof window === "undefined" || typeof document === "undefined") return;
  var SQUI = window.SQUI, SQ = globalThis.SQ, D = globalThis.SQ_DATA;
  if (!SQUI || !SQ || !D) return;

  // ---------- helpers ----------
  function e(s) { return SQUI.esc(s == null ? "" : String(s)); }
  function onboarded() { try { return !!(SQ.state && SQ.state.onboarded); } catch (x) { return false; } }
  // Screens reachable both during onboarding (nav hidden) and after (Discover tab).
  // `tab` is a getter so the shell reads the right value at navigation time.
  function dynTab() { return onboarded() ? "discover" : null; }

  var CAT = { creative: "Creative", active: "Active", technical: "Technical", social: "Social", relaxing: "Relaxing" };
  var PLACE = { indoor: "Indoors", outdoor: "Outdoors", either: "Indoors or out" };
  var SOCIAL = { solo: "Solo", group: "With people", either: "Solo or social" };
  var TIERS = [["free", "Free"], ["budget", "Budget"], ["stepup", "Step-up"]];
  var TRENDING = ["bouldering", "chess", "gardening", "photography"];

  function tierTotal(h, tier) {
    var t = h && h.starterPack && h.starterPack.tiers && h.starterPack.tiers[tier];
    var lo = 0, hi = 0;
    ((t && t.items) || []).forEach(function (it) {
      var p = it.price || [0, 0];
      lo += Number(p[0]) || 0; hi += Number(p[1]) || 0;
    });
    return [lo, hi];
  }
  function money(r) { return SQUI.money(r); }
  function startCost(h) {
    var r = tierTotal(h, "budget");
    return r[0] === 0 && r[1] === 0 ? "Free to start" : "Start for " + money(r);
  }
  function catalog() { try { return SQ.catalog() || []; } catch (x) { return D.hobbies || []; } }
  function tracked(id) { try { return SQ.isTracked(id); } catch (x) { return false; } }
  function backBtn(label) {
    return '<button type="button" class="back-btn" data-action="back" aria-label="' + e(label || "Back") + '">' +
      SQUI.icon("chevron-left", 22) + "</button>";
  }
  function head(title, eyebrow) {
    return '<div class="screen-head">' + backBtn() +
      '<div class="dc-head-text">' + (eyebrow ? '<div class="eyebrow">' + e(eyebrow) + "</div>" : "") +
      '<h1 class="h2">' + e(title) + "</h1></div></div>";
  }
  function glyph(id, size, cls) {
    return '<span class="dc-glyph ' + (cls || "") + '" aria-hidden="true">' + SQUI.hobbyIcon(id, size || 24) + "</span>";
  }
  function hobbyRow(h, extra) {
    return '<button type="button" class="list-row dc-row" data-action="pack" data-id="' + e(h.id) + '">' +
      glyph(h.id, 22, "sm") +
      '<span class="dc-row-main"><span class="dc-row-name">' + e(h.name) + "</span>" +
      '<span class="small muted">' + e(extra != null ? extra : (CAT[h.category] || h.category) + " · " + startCost(h)) + "</span></span>" +
      (tracked(h.id) ? '<span class="pill-good small">Tracking</span>' : "") +
      '<span class="dc-chev" aria-hidden="true">' + SQUI.icon("chevron-right", 18) + "</span></button>";
  }
  // Bind one delegated click handler on the screen's own wrapper (fresh element each render),
  // so repeated mounts on a persistent #app-main never stack listeners.
  function bind(root, sel, handlers) {
    var el = root.querySelector(sel) || root;
    el.addEventListener("click", function (ev) {
      var t = ev.target.closest("[data-action]");
      if (!t || !el.contains(t) || t.disabled) return;
      var fn = handlers[t.getAttribute("data-action")];
      if (fn) { ev.preventDefault(); fn(t, ev); }
    });
    return el;
  }
  function common(extra) {
    var h = {
      back: function () { SQUI.back(); },
      pack: function (t) { SQUI.go("pack", { id: t.getAttribute("data-id") }); },
      quiz: function () { SQUI.go("quiz"); },
      pick: function () { SQUI.go("pick"); },
      results: function () { SQUI.go("results"); }
    };
    for (var k in extra) h[k] = extra[k];
    return h;
  }
  function mergeRewards(list) {
    var achs = [], seen = {};
    list.forEach(function (r) {
      ((r && r.newAchievements) || []).forEach(function (a) {
        if (a && !seen[a.id]) { seen[a.id] = 1; achs.push(a); }
      });
    });
    if (!achs.length) return null;
    var base = list[list.length - 1] || {};
    var out = {};
    for (var k in base) out[k] = base[k];
    out.newAchievements = achs;
    out.xpGained = out.xpGained || 0;
    out.breakdown = out.breakdown || [];
    return out;
  }
  function finishOnboarding() {
    if (!SQ.state.onboarded) { SQ.state.onboarded = true; }
    SQ.save();
  }

  // ---------- welcome ----------
  SQUI.register("welcome", {
    tab: null,
    title: "Welcome",
    render: function () {
      return '<div class="screen dc-welcome" data-dc="welcome">' +
        '<div class="dc-hero">' +
        '<div class="dc-trail" aria-hidden="true"></div>' +
        '<div class="dc-mascot">' + SQUI.mascot(0, { mood: "happy", size: 112 }) + "</div>" +
        '<div class="eyebrow dc-brand-eyebrow">Your next chapter starts small</div>' +
        '<h1 class="dc-brand">Habitual</h1>' +
        '<p class="dc-promise">Trade ten minutes of scrolling for something you actually like doing.</p>' +
        "</div>" +
        '<div class="stack dc-fork">' +
        '<button type="button" class="card tap dc-choice" data-action="pick">' +
        '<span class="dc-choice-ic" aria-hidden="true">' + SQUI.icon("leaf", 26) + "</span>" +
        '<span class="dc-choice-text"><span class="dc-choice-title">I already have hobbies</span>' +
        '<span class="dc-choice-sub">Track them, get back into them, level up</span></span>' +
        '<span class="dc-chev" aria-hidden="true">' + SQUI.icon("chevron-right", 20) + "</span></button>" +
        '<button type="button" class="card tap dc-choice dc-choice-new" data-action="quiz">' +
        '<span class="dc-choice-ic" aria-hidden="true">' + SQUI.icon("spark", 26) + "</span>" +
        '<span class="dc-choice-text"><span class="dc-choice-title">Find a new hobby</span>' +
        '<span class="dc-choice-sub">5 quick questions, then everything you need to start</span></span>' +
        '<span class="dc-chev" aria-hidden="true">' + SQUI.icon("chevron-right", 20) + "</span></button>" +
        "</div>" +
        '<div class="dc-welcome-foot"><button type="button" class="btn ghost dc-link" data-action="demo">Explore with sample data</button>' +
        '<p class="small muted">No account needed. Everything stays on this device.</p></div>' +
        "</div>";
    },
    mount: function (root) {
      bind(root, "[data-dc]", common({
        demo: function () { SQ.seedDemo(); SQUI.go("today", {}, { reset: true }); }
      }));
    }
  });

  // ---------- pick ----------
  var P = null; // picker state, reset each time the screen is entered
  function pickHobbies() {
    var list = catalog().slice();
    var cat = {};
    list.forEach(function (h) { cat[h.id] = 1; });
    ((SQ.state && SQ.state.custom) || []).forEach(function (c) {
      if (cat[c.id]) return;
      var h = SQ.getHobby(c.id) || c;
      if (tracked(c.id) && P.added.indexOf(c.id) < 0) return; // already-tracked customs live in the tracker
      list.push({ id: c.id, name: h.name || c.name, category: h.category || c.category, custom: true });
    });
    return list;
  }
  function pickTile(h) {
    var isT = tracked(h.id), on = P.sel.indexOf(h.id) >= 0;
    var hide = P.q && h.name.toLowerCase().indexOf(P.q) < 0;
    return '<button type="button" class="dc-tile' + (on ? " on" : "") + (isT ? " is-tracked" : "") + '"' +
      ' data-action="toggle" data-id="' + e(h.id) + '" data-name="' + e(h.name.toLowerCase()) + '"' +
      (isT ? " disabled" : ' aria-pressed="' + on + '"') + (hide ? " hidden" : "") + ">" +
      '<span class="dc-tile-ic" aria-hidden="true">' + SQUI.hobbyIcon(h.id, 26) + "</span>" +
      '<span class="dc-tile-name">' + e(h.name) + "</span>" +
      (isT ? '<span class="dc-tile-tag">Tracking</span>' :
        on ? '<span class="dc-tile-check" aria-hidden="true">' + SQUI.icon("check", 14) + "</span>" :
          (h.custom ? '<span class="dc-tile-tag">Your own</span>' : "")) +
      "</button>";
  }
  function pickGrid() { return pickHobbies().map(pickTile).join(""); }
  function pickGoals() {
    if (!P.sel.length) return '<p class="small muted dc-goal-empty">Tap the hobbies you do. You will set a weekly goal for each.</p>';
    return '<div class="eyebrow">Weekly goals</div><div class="list dc-goals">' + P.sel.map(function (id) {
      var h = SQ.getHobby(id) || { id: id, name: id };
      var g = P.goals[id] || 2;
      return '<div class="list-row dc-goal">' + glyph(id, 20, "sm") +
        '<span class="dc-row-main"><span class="dc-row-name">' + e(h.name) + '</span><span class="small muted">times a week</span></span>' +
        '<span class="dc-stepper" role="group" aria-label="' + e(h.name) + ' times a week">' +
        '<button type="button" class="icon-btn" data-action="goal" data-id="' + e(id) + '" data-d="-1" aria-label="Fewer"' + (g <= 1 ? " disabled" : "") + ">&minus;</button>" +
        '<span class="num dc-goal-n" aria-live="polite">' + g + "</span>" +
        '<button type="button" class="icon-btn" data-action="goal" data-id="' + e(id) + '" data-d="1" aria-label="More"' + (g >= 7 ? " disabled" : "") + ">+</button>" +
        "</span></div>";
    }).join("") + "</div>";
  }
  function pickCta() {
    var n = P.sel.length;
    return '<button type="button" class="btn primary block" data-action="start"' + (n ? "" : " disabled") + ">" +
      (n ? "Start tracking " + n + " " + (n === 1 ? "hobby" : "hobbies") : "Pick at least one hobby") + "</button>";
  }
  SQUI.register("pick", {
    get tab() { return dynTab(); },
    title: "Your hobbies",
    render: function () {
      P = { sel: [], goals: {}, q: "", added: [], formOpen: false };
      return '<div class="screen dc-pick" data-dc="pick"><div class="stack-lg">' +
        head("Which hobbies do you already do?", onboarded() ? "Add hobbies" : "Get started") +
        '<label class="dc-search"><span class="dc-search-ic" aria-hidden="true">' + SQUI.icon("search", 18) + "</span>" +
        '<input type="search" class="dc-input" data-role="q" placeholder="Search hobbies" aria-label="Search hobbies" autocomplete="off"></label>' +
        '<div class="dc-grid" data-role="grid">' + pickGrid() + "</div>" +
        '<p class="small muted dc-nores" data-role="nores" hidden>No match in the catalog. Add it as your own below.</p>' +
        '<div class="dc-own" data-role="own">' + ownForm() + "</div>" +
        '<div class="stack" data-role="goals">' + pickGoals() + "</div>" +
        "</div>" +
        '<div class="dc-cta" data-role="cta">' + pickCta() + "</div></div>";
    },
    mount: function (root) {
      var el = bind(root, "[data-dc]", common({
        toggle: function (t) {
          var id = t.getAttribute("data-id"), i = P.sel.indexOf(id);
          if (i >= 0) P.sel.splice(i, 1); else { P.sel.push(id); if (!P.goals[id]) P.goals[id] = 2; }
          redraw();
        },
        goal: function (t) {
          var id = t.getAttribute("data-id");
          P.goals[id] = Math.max(1, Math.min(7, (P.goals[id] || 2) + Number(t.getAttribute("data-d"))));
          q("goals").innerHTML = pickGoals();
          var b = q("goals").querySelector('[data-id="' + id + '"][data-d="' + t.getAttribute("data-d") + '"]');
          if (b && !b.disabled) b.focus();
        },
        openown: function () {
          P.formOpen = true; q("own").innerHTML = ownForm();
          var inp = q("own").querySelector('[data-role="own-name"]');
          if (inp) { inp.value = P.q ? titleCase(P.q) : ""; inp.focus(); }
        },
        cancelown: function () { P.formOpen = false; q("own").innerHTML = ownForm(); },
        start: function () {
          if (!P.sel.length) return;
          var rewards = [];
          P.sel.forEach(function (id) {
            if (!SQ.isTracked(id)) rewards.push(SQ.addHobby(id, { goal: P.goals[id] || 2 }));
            else SQ.setGoal(id, P.goals[id] || 2);
          });
          var wasOnboarded = onboarded();
          finishOnboarding();
          var r = mergeRewards(rewards);
          // Leaving onboarding: drop welcome/pick from history so Back never returns to the fork.
          SQUI.go("today", {}, wasOnboarded ? { replace: true } : { reset: true });
          if (r) SQUI.showReward(r, { title: "You're on the board" });
        }
      }));
      function q(role) { return el.querySelector('[data-role="' + role + '"]'); }
      function redraw() {
        q("grid").innerHTML = pickGrid();
        q("goals").innerHTML = pickGoals();
        q("cta").innerHTML = pickCta();
        applyFilter();
      }
      function applyFilter() {
        var any = false;
        q("grid").querySelectorAll(".dc-tile").forEach(function (b) {
          var show = !P.q || b.getAttribute("data-name").indexOf(P.q) >= 0;
          b.hidden = !show; if (show) any = true;
        });
        q("nores").hidden = any;
      }
      q("q").addEventListener("input", function (ev) {
        P.q = ev.target.value.trim().toLowerCase(); applyFilter();
      });
      el.addEventListener("submit", function (ev) {
        var f = ev.target.closest('[data-role="own-form"]');
        if (!f) return;
        ev.preventDefault();
        var nameEl = f.querySelector('[data-role="own-name"]');
        var name = (nameEl.value || "").trim().replace(/\s+/g, " ").slice(0, 40);
        var err = f.querySelector('[data-role="own-err"]');
        if (!name) { err.hidden = false; err.textContent = "Give it a name first."; nameEl.focus(); return; }
        var lower = name.toLowerCase();
        var existing = pickHobbies().filter(function (h) { return h.name.toLowerCase() === lower; })[0];
        var id = existing ? existing.id : SQ.addCustomHobby(name, f.querySelector('[data-role="own-cat"]').value);
        if (tracked(id)) { err.hidden = false; err.textContent = "You already track " + name + "."; return; }
        if (P.added.indexOf(id) < 0) P.added.push(id);
        if (P.sel.indexOf(id) < 0) { P.sel.push(id); P.goals[id] = P.goals[id] || 2; }
        P.formOpen = false; P.q = "";
        q("q").value = "";
        q("own").innerHTML = ownForm();
        redraw();
        SQUI.toast(name + " added");
      });
    }
  });
  function titleCase(s) { return s.replace(/\b\w/g, function (c) { return c.toUpperCase(); }); }
  function ownForm() {
    if (!P || !P.formOpen) {
      return '<button type="button" class="btn ghost dc-add-own" data-action="openown">' + SQUI.icon("plus", 18) +
        "<span>Add your own hobby</span></button>";
    }
    return '<form class="card dc-own-form stack" data-role="own-form" novalidate>' +
      '<div class="h3">Add your own</div>' +
      '<label class="dc-field"><span class="small muted">Name</span>' +
      '<input class="dc-input" data-role="own-name" maxlength="40" placeholder="e.g. Pottery" autocomplete="off"></label>' +
      '<label class="dc-field"><span class="small muted">Closest vibe</span>' +
      '<select class="dc-input" data-role="own-cat">' + Object.keys(CAT).map(function (k) {
        return '<option value="' + k + '">' + CAT[k] + "</option>";
      }).join("") + "</select></label>" +
      '<p class="small dc-err" data-role="own-err" hidden></p>' +
      '<div class="row"><button type="submit" class="btn primary">Add and select</button>' +
      '<button type="button" class="btn ghost" data-action="cancelown">Cancel</button></div></form>';
  }

  // ---------- quiz ----------
  var QA = {};
  SQUI.register("quiz", {
    tab: null,
    title: "Find a hobby",
    render: function (params) {
      var qs = D.quiz || [];
      var step = params && typeof params.step === "number" ? params.step : -1;
      if (step < 0) { // fresh entry: start over, but remember previous picks as highlights
        var prev = SQ.state && SQ.state.user && SQ.state.user.quiz;
        QA = {}; if (prev) for (var k in prev) QA[k] = prev[k];
        step = 0;
      }
      step = Math.max(0, Math.min(qs.length - 1, step));
      var q = qs[step];
      if (!q) return '<div class="screen" data-dc="quiz">' + head("Find a hobby") + '<div class="empty">Quiz unavailable.</div></div>';
      var pct = Math.round(((step + 1) / qs.length) * 100);
      return '<div class="screen dc-quiz" data-dc="quiz" data-step="' + step + '">' +
        '<div class="screen-head">' + backBtn(step ? "Previous question" : "Back") +
        '<div class="dc-head-text"><div class="eyebrow num">' + (step + 1) + " of " + qs.length + "</div></div>" +
        '<div class="spacer"></div></div>' +
        '<div class="progress dc-quiz-progress" role="progressbar" aria-valuemin="1" aria-valuemax="' + qs.length +
        '" aria-valuenow="' + (step + 1) + '" aria-label="Question ' + (step + 1) + " of " + qs.length + '">' +
        '<div class="progress-bar" style="width:' + pct + '%"></div></div>' +
        '<h1 class="h1 dc-quiz-q">' + e(q.prompt) + "</h1>" +
        '<div class="stack dc-opts">' + q.options.map(function (o) {
          var on = QA[q.id] !== undefined && String(QA[q.id]) === String(o.value);
          return '<button type="button" class="dc-opt' + (on ? " on" : "") + '" data-action="answer" data-v="' + e(o.value) + '" aria-pressed="' + on + '">' +
            '<span class="dc-opt-text"><span class="dc-opt-label">' + e(o.label) + "</span>" +
            (o.hint ? '<span class="dc-opt-hint">' + e(o.hint) + "</span>" : "") + "</span>" +
            '<span class="dc-opt-dot" aria-hidden="true">' + (on ? SQUI.icon("check", 16) : "") + "</span></button>";
        }).join("") + "</div></div>";
    },
    mount: function (root) {
      var wrap = root.querySelector("[data-dc]");
      var step = Number(wrap && wrap.getAttribute("data-step")) || 0;
      var qs = D.quiz || [];
      bind(root, "[data-dc]", {
        back: function () {
          if (step > 0) SQUI.go("quiz", { step: step - 1 }, { replace: true });
          else SQUI.back();
        },
        answer: function (t) {
          var q = qs[step], raw = t.getAttribute("data-v");
          var opt = q.options.filter(function (o) { return String(o.value) === raw; })[0];
          QA[q.id] = opt ? opt.value : raw;
          wrap.querySelectorAll(".dc-opt").forEach(function (b) { b.classList.toggle("on", b === t); });
          if (step < qs.length - 1) {
            SQUI.go("quiz", { step: step + 1 }, { replace: true });
          } else {
            var ans = {};
            qs.forEach(function (qq) { if (QA[qq.id] !== undefined) ans[qq.id] = QA[qq.id]; });
            SQ.state.user.quiz = ans; SQ.save();
            SQUI.go("results", {}, { replace: true });
          }
        }
      });
    }
  });

  // ---------- results ----------
  function matchesFor(ans) { try { return ans ? SQ.match(ans) || [] : []; } catch (x) { return []; } }
  function matchCard(m, i) {
    var h = m.hobby;
    return '<article class="card dc-match">' +
      '<div class="dc-match-top">' + glyph(h.id, 30, "lg") +
      '<div class="dc-match-title"><div class="eyebrow">Match ' + (i + 1) + "</div>" +
      '<h2 class="h2">' + e(h.name) + "</h2></div></div>" +
      ((m.reasons && m.reasons.length) ? '<div class="row dc-chips">' + m.reasons.map(function (r) {
        return '<span class="chip">' + e(r) + "</span>";
      }).join("") + "</div>" : "") +
      '<p class="dc-blurb">' + e(h.blurb) + "</p>" +
      '<div class="dc-match-foot"><span class="dc-cost-wrap"><span class="dc-cost"><span class="small muted">' + (tierTotal(h, "budget")[1] ? "Start for" : "") + "</span> " +
      '<span class="num dc-cost-n">' + e(tierTotal(h, "budget")[1] ? money(tierTotal(h, "budget")) : "Free to start") + "</span></span>" +
      (tierTotal(h, "budget")[1] && !tierTotal(h, "free")[1] ? '<span class="small muted">or $0 with the free route</span>' : "") + "</span>" +
      '<button type="button" class="btn primary sm" data-action="pack" data-id="' + e(h.id) + '">See starter pack</button></div>' +
      "</article>";
  }
  SQUI.register("results", {
    get tab() { return dynTab(); },
    title: "Your matches",
    render: function () {
      var ans = SQ.state && SQ.state.user && SQ.state.user.quiz;
      var ms = matchesFor(ans);
      var nTracked = (SQ.state && SQ.state.tracked || []).length;
      var body;
      if (!ans) {
        body = '<div class="empty stack"><div class="h3">No answers yet</div><p class="muted">Five quick questions and we will line up three hobbies that fit.</p>' +
          '<button type="button" class="btn primary" data-action="quiz">Take the quiz</button></div>';
      } else if (!ms.length) {
        body = '<div class="empty stack"><div class="h3">You track everything we have</div><p class="muted">Browse the full list below or add your own hobby.</p></div>';
      } else {
        body = '<div class="stack">' + ms.map(matchCard).join("") + "</div>";
      }
      return '<div class="screen dc-results" data-dc="results"><div class="stack-lg">' +
        head("Your top 3", "Based on your answers") +
        (ans && nTracked ? '<p class="small muted dc-note">' + SQUI.icon("leaf", 16) + "<span>Matches skip what you already track and lean toward hobbies that pair with them.</span></p>" : "") +
        body +
        (ans ? '<button type="button" class="btn block" data-action="quiz">Retake quiz</button>' : "") +
        '<section class="stack"><h2 class="h3">Browse all hobbies</h2><div class="list">' +
        catalog().map(function (h) { return hobbyRow(h); }).join("") + "</div></section>" +
        "</div></div>";
    },
    mount: function (root) { bind(root, "[data-dc]", common({})); }
  });

  // ---------- pack ----------
  var packTier = "budget", packId = null;
  function packItems(h) {
    var t = (h.starterPack.tiers[packTier] || { items: [] });
    var tot = tierTotal(h, packTier);
    var label = TIERS.filter(function (x) { return x[0] === packTier; })[0][1];
    return '<ul class="list dc-items">' + (t.items || []).map(function (it) {
      return '<li class="list-row dc-item"><span class="dc-row-main"><span class="dc-row-name">' + e(it.name) + "</span>" +
        '<span class="small muted">' + e(it.reason) + "</span></span>" +
        '<span class="num dc-price">' + e(money(it.price || [0, 0])) + "</span></li>";
    }).join("") + "</ul>" +
      '<div class="dc-total" aria-live="polite"><span class="dc-total-label">Total to start<span class="small muted">' + e(label) + " kit</span></span>" +
      '<span class="num dc-total-n">' + e(money(tot)) + "</span></div>";
  }
  SQUI.register("pack", {
    get tab() { return dynTab(); },
    title: "Starter pack",
    render: function (params) {
      var id = params && params.id;
      if (id !== packId) { packId = id; packTier = "budget"; }
      var h = id ? SQ.getHobby(id) : null;
      if (!h) {
        return '<div class="screen" data-dc="pack">' + head("Starter pack") +
          '<div class="empty">That hobby could not be found.</div></div>';
      }
      var sp = h.starterPack;
      var isT = tracked(h.id);
      var chips = '<div class="row dc-chips"><span class="chip">' + SQUI.icon(h.category, 14) + " " + e(CAT[h.category] || h.category) + "</span>" +
        (h.place ? '<span class="chip">' + e(PLACE[h.place] || h.place) + "</span>" : "") +
        (h.social ? '<span class="chip">' + e(SOCIAL[h.social] || h.social) + "</span>" : "") + "</div>";
      var top = '<header class="dc-pack-head">' + glyph(h.id, 40, "xl") +
        '<div class="eyebrow">Starter pack</div><h1 class="h1">' + e(h.name) + "</h1>" +
        (h.blurb ? '<p class="dc-blurb">' + e(h.blurb) + "</p>" : "") + chips + "</header>";
      var cta = '<div class="dc-cta"><button type="button" class="btn primary block" data-action="' + (isT ? "open" : "startpack") + '">' +
        (isT ? "Open in tracker" : "Start " + e(h.name)) + "</button></div>";
      if (!sp) {
        return '<div class="screen dc-pack" data-dc="pack" data-id="' + e(h.id) + '"><div class="stack-lg">' +
          '<div class="screen-head">' + backBtn() + "</div>" + top +
          '<div class="empty">This is one of your own hobbies, so there is no starter pack for it yet.</div></div>' + cta + "</div>";
      }
      var budgetTot = tierTotal(h, "budget");
      return '<div class="screen dc-pack" data-dc="pack" data-id="' + e(h.id) + '"><div class="stack-lg">' +
        '<div class="screen-head">' + backBtn() + '<div class="spacer"></div>' +
        (isT ? '<span class="pill-good small">Tracking</span>' : "") + "</div>" +
        top +
        '<div class="dc-glance">' +
        '<div><span class="eyebrow">Budget start</span><span class="num dc-glance-n">' + e(money(budgetTot)) + "</span></div>" +
        '<div><span class="eyebrow">Free route</span><span class="num dc-glance-n">' + e(money(tierTotal(h, "free"))) + "</span></div>" +
        "</div>" +
        '<section class="stack"><h2 class="h3">Why you\'ll like it</h2><p>' + e(sp.whyLike) + "</p></section>" +
        '<section class="stack"><h2 class="h3">Your first month</h2><p>' + e(sp.firstMonth) + "</p></section>" +
        '<section class="stack"><div class="row"><h2 class="h3">Gear</h2><span class="spacer"></span>' +
        '<span class="small muted">Pick how you want to start</span></div>' +
        '<div class="seg dc-seg" role="tablist" aria-label="Gear tier">' + TIERS.map(function (t) {
          var on = t[0] === packTier;
          return '<button type="button" role="tab" class="' + (on ? "on" : "") + '" aria-selected="' + on + '" data-action="tier" data-tier="' + t[0] + '">' +
            '<span>' + t[1] + '</span><span class="num dc-seg-n">' + e(money(tierTotal(h, t[0]))) + "</span></button>";
        }).join("") + "</div>" +
        '<div data-role="items">' + packItems(h) + "</div>" +
        '<p class="small muted dc-pricenote"><span class="eyebrow">Note</span> Prices are typical US ranges, checked Oct 2026.</p></section>' +
        ((sp.tryFirst && sp.tryFirst.length) ? '<section class="stack"><h2 class="h3">Try before you buy</h2><ul class="dc-tips">' +
          sp.tryFirst.map(function (t) { return '<li><span class="dc-tip-ic" aria-hidden="true">' + SQUI.icon("check", 16) + "</span><span>" + e(t) + "</span></li>"; }).join("") +
          "</ul></section>" : "") +
        ((sp.firstSessions && sp.firstSessions.length) ? '<section class="stack"><h2 class="h3">Your first 3 sessions</h2><ol class="dc-sessions">' +
          sp.firstSessions.map(function (s, i) {
            return '<li class="dc-session"><span class="dc-session-n num" aria-hidden="true">' + (i + 1) + "</span>" +
              '<div class="dc-session-body"><div class="dc-row-name">' + e(s.title) + "</div>" +
              "<p>" + e(s.detail) + "</p>" +
              (s.tinyVersion ? '<p class="small dc-tiny"><strong>Tiny version:</strong> ' + e(s.tinyVersion) + "</p>" : "") +
              "</div></li>";
          }).join("") + "</ol></section>" : "") +
        "</div>" + cta + "</div>";
    },
    mount: function (root, params) {
      var el = bind(root, "[data-dc]", common({
        tier: function (t) {
          packTier = t.getAttribute("data-tier");
          el.querySelectorAll(".dc-seg button").forEach(function (b) {
            var on = b === t; b.classList.toggle("on", on); b.setAttribute("aria-selected", on);
          });
          var h = SQ.getHobby(packId);
          el.querySelector('[data-role="items"]').innerHTML = packItems(h);
        },
        open: function () { SQUI.go("hobby", { id: packId }); },
        startpack: function () {
          var id = packId;
          if (!SQ.isTracked(id)) {
            var wasOnboarded = onboarded();
            var r = SQ.addHobby(id, { goal: 2, viaStarter: true });
            finishOnboarding();
            // From onboarding, start fresh history (Back from the hobby goes to Today, not the quiz).
            SQUI.go("hobby", { id: id }, wasOnboarded ? { replace: true } : { reset: true });
            if (r && r.newAchievements && r.newAchievements.length) {
              var h = SQ.getHobby(id);
              SQUI.showReward(r, { title: "Your " + (h ? h.name : "new") + " hobby journey begins" });
            } else {
              SQUI.toast("Tracking " + (SQ.getHobby(id) || { name: "it" }).name);
            }
          } else {
            SQUI.go("hobby", { id: id });
          }
        }
      }));
    }
  });

  // ---------- discover hub ----------
  SQUI.register("discover", {
    tab: "discover",
    title: "Discover",
    render: function () {
      var st = SQ.state || {};
      var ans = st.user && st.user.quiz;
      var ms = matchesFor(ans);
      var trackedIds = (st.tracked || []).map(function (t) { return t.hobbyId; });
      var pairs = [], seen = {};
      trackedIds.forEach(function (tid) {
        var th = SQ.getHobby(tid);
        ((th && th.related) || []).forEach(function (rid) {
          if (seen[rid] || trackedIds.indexOf(rid) >= 0) return;
          var rh = SQ.getHobby(rid);
          if (rh) { seen[rid] = 1; pairs.push({ h: rh, from: th.name }); }
        });
      });
      pairs = pairs.slice(0, 4);
      var trend = TRENDING.map(function (id) { return SQ.getHobby(id); }).filter(Boolean);

      return '<div class="screen dc-discover" data-dc="discover"><div class="stack-lg">' +
        '<header class="dc-disc-head"><div class="eyebrow">Discover</div><h1 class="h1">Find something new</h1>' +
        '<p class="muted">Every hobby here comes with a starter pack: what to buy, what to skip, and your first three sessions.</p></header>' +
        '<button type="button" class="card tap dc-choice dc-choice-new" data-action="quiz">' +
        '<span class="dc-choice-ic" aria-hidden="true">' + SQUI.icon("spark", 24) + "</span>" +
        '<span class="dc-choice-text"><span class="dc-choice-title">' + (ans ? "Retake the quiz" : "Take the 5-question quiz") + "</span>" +
        '<span class="dc-choice-sub">' + (ans ? "Changed your mind? Get three fresh matches." : "Get three hobbies that fit your time, budget and vibe.") + "</span></span>" +
        '<span class="dc-chev" aria-hidden="true">' + SQUI.icon("chevron-right", 20) + "</span></button>" +
        (ms.length ? '<section class="stack"><div class="row"><h2 class="h3">Your last matches</h2><span class="spacer"></span>' +
          '<button type="button" class="btn ghost sm" data-action="results">See all</button></div>' +
          '<div class="dc-hscroll">' + ms.map(function (m) { return miniCard(m.hobby, (m.reasons || []).slice(0, 2).join(" · ")); }).join("") + "</div></section>" : "") +
        (pairs.length ? '<section class="stack"><h2 class="h3">Pairs with what you do</h2><div class="list">' +
          pairs.map(function (p) { return hobbyRow(p.h, "Pairs with " + p.from + " · " + startCost(p.h)); }).join("") + "</div></section>" : "") +
        '<section class="stack"><div class="row"><h2 class="h3">Trending near you</h2><span class="spacer"></span><span class="chip dc-sample">Sample</span></div>' +
        '<div class="dc-hscroll">' + trend.map(function (h) { return miniCard(h, CAT[h.category] || ""); }).join("") + "</div></section>" +
        '<section class="stack"><h2 class="h3">Browse all ' + catalog().length + "</h2><div class=\"list\">" +
        catalog().map(function (h) { return hobbyRow(h); }).join("") + "</div></section>" +
        '<button type="button" class="btn block" data-action="pick">' + SQUI.icon("plus", 18) + "<span>Add a hobby you already do</span></button>" +
        "</div></div>";
    },
    mount: function (root) { bind(root, "[data-dc]", common({})); }
  });
  function miniCard(h, sub) {
    return '<button type="button" class="card tap dc-mini" data-action="pack" data-id="' + e(h.id) + '">' +
      glyph(h.id, 26, "") + '<span class="dc-row-name">' + e(h.name) + "</span>" +
      '<span class="small muted">' + e(sub) + "</span>" +
      '<span class="num small dc-mini-cost">' + e(startCost(h)) + "</span></button>";
  }
})();
