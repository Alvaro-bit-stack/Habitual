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
  function dynTab() { return "discover"; }

  var CAT = { creative: "Creative", active: "Active", technical: "Technical", social: "Social", relaxing: "Relaxing" };
  var PLACE = { indoor: "Indoors", outdoor: "Outdoors", either: "Indoors or out" };
  var SOCIAL = { solo: "Solo", group: "With people", either: "Solo or social" };
  var TIERS = [["free", "Free"], ["budget", "Budget"], ["stepup", "Step-up"]];
  var TRENDING = ["basketball", "tennis", "running", "photography"];

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
  function picture(id, alt, cls) {
    return SQUI.hobbyPicture ? SQUI.hobbyPicture(id, alt || "", cls || "dc-hobby-photo") : glyph(id, 28, cls || "");
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
      research: function (t) { SQUI.go("research", { hobby: t.getAttribute("data-hobby") || "", autorun: t.getAttribute("data-auto") === "1" }); },
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
        '<span class="dc-choice-text"><span class="dc-choice-title">Go to current hobbies</span>' +
        '<span class="dc-choice-sub">Choose from the hobbies already in the app</span></span>' +
        '<span class="dc-chev" aria-hidden="true">' + SQUI.icon("chevron-right", 20) + "</span></button>" +
        '<button type="button" class="card tap dc-choice dc-choice-new" data-action="quiz">' +
        '<span class="dc-choice-ic" aria-hidden="true">' + SQUI.icon("spark", 26) + "</span>" +
        '<span class="dc-choice-text"><span class="dc-choice-title">Discover new hobbies</span>' +
        '<span class="dc-choice-sub">Choose indoors, outdoors, or a mix</span></span>' +
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
        '<button type="button" class="btn block" data-action="research">Research a different hobby</button>' +
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
          '<div class="empty stack"><div>This is one of your own hobbies, so there is no built-in starter pack yet.</div>' +
          '<button type="button" class="btn" data-action="research" data-hobby="' + e(h.name) + '">Research a starter guide</button></div></div>' + cta + "</div>";
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

  // ---------- grounded hobby research ----------
  var researchState = { hobby: "", result: null, error: "" };
  function researchMoney(currency, low, high) {
    low = Number(low) || 0; high = Number(high) || low;
    var a = currency + " " + low.toLocaleString();
    return low === high ? a : a + "–" + high.toLocaleString();
  }
  function safeSourceUrl(value) {
    try { var u = new URL(String(value)); return u.protocol === "https:" ? u.href : ""; } catch (x) { return ""; }
  }
  function renderResearchResult(r) {
    if (!r) return "";
    var total = r.totalCost || { low: 0, high: 0 };
    var equipment = (r.equipment || []).map(function (it) {
      return '<li class="card dc-ai-gear"><div class="row"><span class="dc-row-name">' + e(it.name) + "</span><span class=\"spacer\"></span>" +
        (it.essential ? '<span class="pill-good small">Essential</span>' : '<span class="chip small">Optional</span>') + "</div>" +
        '<div class="num dc-ai-cost">' + e(researchMoney(r.currency, it.costLow, it.costHigh)) + "</div>" +
        (it.why ? '<p>' + e(it.why) + "</p>" : "") +
        (it.buyingTip ? '<p class="small muted"><strong>Buying tip:</strong> ' + e(it.buyingTip) + "</p>" : "") +
        ((it.suggestedOptions || []).length ? '<div class="row">' + it.suggestedOptions.map(function (x) { return '<span class="chip small">' + e(x) + "</span>"; }).join("") + "</div>" : "") +
        "</li>";
    }).join("");
    var steps = (r.firstSteps || []).map(function (s, i) {
      return '<li class="dc-session"><span class="dc-session-n num" aria-hidden="true">' + (i + 1) + "</span>" +
        '<div class="dc-session-body"><div class="dc-row-name">' + e(s.title) + "</div><p>" + e(s.details) + "</p>" +
        (s.minutes ? '<span class="small muted">About ' + e(s.minutes) + " minutes</span>" : "") + "</div></li>";
    }).join("");
    var tutorials = (r.tutorials || []).map(function (t) {
      var yt = "https://www.youtube.com/results?search_query=" + encodeURIComponent(t.searchQuery || t.title);
      var gs = "https://www.google.com/search?q=" + encodeURIComponent(t.searchQuery || t.title);
      return '<li class="card dc-ai-tutorial"><div class="row"><span class="chip small">' + e(t.format) + '</span><span class="small muted">' + e(t.provider) + "</span></div>" +
        '<div class="dc-row-name">' + e(t.title) + "</div><p class=\"small\">" + e(t.whatYouLearn) + "</p>" +
        '<div class="row"><a class="btn sm" href="' + e(yt) + '" target="_blank" rel="noopener noreferrer">Search YouTube</a>' +
        '<a class="btn ghost sm" href="' + e(gs) + '" target="_blank" rel="noopener noreferrer">Search web</a></div></li>';
    }).join("");
    var sources = (r.sources || []).map(function (s) {
      var url = safeSourceUrl(s.url); if (!url) return "";
      return '<li><a href="' + e(url) + '" target="_blank" rel="noopener noreferrer">' + e(s.title || s.publisher || "Source") +
        '</a><span class="small muted">' + e(s.publisher || "") + "</span></li>";
    }).join("");
    var safety = (r.safety || []).map(function (x) { return "<li>" + e(x) + "</li>"; }).join("");
    var notes = (r.notes || []).map(function (x) { return "<li>" + e(x) + "</li>"; }).join("");
    var when = r.researchedAt ? new Date(r.researchedAt).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }) : "recently";
    return '<article class="stack-lg dc-ai-result" aria-live="polite"><header class="stack"><div class="eyebrow">' + (r.grounded ? "Grounded starter guide" : "Gemini starter guide") + '</div>' +
      '<h2 class="h1">' + e(r.hobby) + "</h2><p>" + e(r.overview) + "</p>" +
      (!r.grounded ? '<p class="small muted">Live web sources were unavailable, so treat prices and recommendations as estimates and use the tutorial links below to verify them.</p>' : "") +
      '<div class="row"><span class="chip">' + e(r.location) + '</span><span class="chip">Researched ' + e(when) + "</span>" +
      (r.cached ? '<span class="chip">Cached</span>' : "") + "</div></header>" +
      '<section class="stack"><div class="row"><h3 class="h2">Equipment</h3><span class="spacer"></span><span class="num dc-ai-total">' +
        e(researchMoney(r.currency, total.low, total.high)) + " total</span></div><ul class=\"dc-ai-list\">" + equipment + "</ul></section>" +
      '<section class="stack"><h3 class="h2">First steps</h3><ol class="dc-sessions">' + steps + "</ol></section>" +
      '<section class="stack"><h3 class="h2">Videos and tutorials</h3><p class="small muted">These links run the researched search phrases instead of sending you to an unverified URL.</p>' +
        '<ul class="dc-ai-list">' + tutorials + "</ul></section>" +
      (safety ? '<section class="card dc-ai-callout"><h3 class="h3">Safety</h3><ul>' + safety + "</ul></section>" : "") +
      (notes ? '<section class="stack"><h3 class="h3">Good to know</h3><ul class="dc-ai-notes">' + notes + "</ul></section>" : "") +
      (sources ? '<section class="stack"><h3 class="h3">Grounded sources</h3><p class="small muted">Gemini used these pages for its research. Check important details before buying.</p><ul class="dc-ai-sources">' + sources + "</ul></section>" : "") +
      '<button type="button" class="btn primary block" data-action="trackresearch">Track ' + e(r.hobby) + "</button></article>";
  }
  function researchStatus() {
    if (researchState.error) return '<div class="card dc-ai-error" role="alert"><div class="h3">Research unavailable</div><p>' + e(researchState.error) + "</p></div>";
    return renderResearchResult(researchState.result);
  }
  SQUI.register("research", {
    get tab() { return dynTab(); },
    title: "Research a hobby",
    render: function (params) {
      var requested = params && params.hobby ? String(params.hobby) : "";
      var autorun = !!(params && params.autorun && requested);
      if (requested && requested !== researchState.hobby) researchState = { hobby: requested, result: null, error: "" };
      return '<div class="screen dc-research" data-dc="research"><div class="stack-lg">' + head("Research any hobby", "Gemini-powered") +
        '<div class="card dc-ai-intro"><div class="dc-choice-ic" aria-hidden="true">' + SQUI.icon("search", 24) + "</div>" +
        '<div><div class="h3">A current starter guide</div><p class="small muted">Your hobby, location, experience, and budget are sent to Google Gemini. Do not enter private information. Results can be wrong—verify fit, safety, and prices.</p></div></div>' +
        '<form class="stack dc-ai-form" data-role="research-form"' + (autorun ? " hidden" : "") + '>' +
        '<label class="dc-field"><span>Hobby</span><input class="dc-input" name="hobby" minlength="2" maxlength="60" required placeholder="e.g. Pickleball" value="' + e(researchState.hobby) + '"></label>' +
        '<div class="dc-ai-grid"><label class="dc-field"><span>Location</span><input class="dc-input" name="location" maxlength="80" value="United States"></label>' +
        '<label class="dc-field"><span>Experience</span><select class="dc-input" name="experience"><option value="beginner">Complete beginner</option><option value="some">Tried it before</option><option value="returning">Coming back</option></select></label></div>' +
        '<div class="dc-ai-grid"><label class="dc-field"><span>Maximum budget <span class="muted">(optional)</span></span><input class="dc-input" name="budget" type="number" min="0" max="10000" inputmode="numeric" placeholder="No fixed budget"></label>' +
        '<label class="dc-field"><span>Currency</span><select class="dc-input" name="currency"><option>USD</option><option>CAD</option><option>EUR</option><option>GBP</option><option>AUD</option></select></label></div>' +
        '<button type="submit" class="btn primary block" data-role="research-submit">Research starter guide</button></form>' +
        '<div data-role="research-output">' + researchStatus() + "</div></div></div>";
    },
    mount: function (root, params) {
      var host = bind(root, "[data-dc]", common({
        trackresearch: function () {
          var r = researchState.result; if (!r) return;
          var all = SQ.catalog().concat((SQ.state.custom || []).map(function (c) { return SQ.getHobby(c.id); }).filter(Boolean));
          var h = all.filter(function (x) { return x.name.toLowerCase() === r.hobby.toLowerCase(); })[0];
          var id = h ? h.id : SQ.addCustomHobby(r.hobby, r.category);
          var reward = SQ.isTracked(id) ? null : SQ.addHobby(id, { goal: 2 });
          finishOnboarding();
          SQUI.go("hobby", { id: id }, { reset: true });
          if (reward && reward.newAchievements && reward.newAchievements.length) SQUI.showReward(reward, { title: "Your new sidequest begins" });
        }
      }));
      var form = host.querySelector('[data-role="research-form"]');
      var output = host.querySelector('[data-role="research-output"]');
      form.addEventListener("submit", function (ev) {
        ev.preventDefault();
        var button = form.querySelector('[data-role="research-submit"]');
        var fields = new FormData(form);
        var payload = { hobby: fields.get("hobby"), location: fields.get("location"), experience: fields.get("experience"),
          budget: fields.get("budget"), currency: fields.get("currency") };
        researchState = { hobby: String(payload.hobby || ""), result: null, error: "" };
        button.disabled = true; button.textContent = "Researching…";
        output.innerHTML = '<div class="card dc-ai-loading" role="status"><span class="dc-ai-spinner" aria-hidden="true"></span><div><div class="h3">Researching current sources</div><p class="small muted">This can take up to a minute.</p></div></div>';
        fetch("/api/hobby-research", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) })
          .then(function (res) { return res.json().catch(function () { return {}; }).then(function (body) { if (!res.ok) throw new Error(body.error || "Research request failed."); return body; }); })
          .then(function (result) { researchState.result = result; researchState.error = ""; output.innerHTML = renderResearchResult(result); })
          .catch(function (err) {
            researchState.error = location.protocol === "file:" ? "Run the secure Sidequest server to use Gemini research." : (err && err.message || "Try again in a moment.");
            form.hidden = false;
            output.innerHTML = researchStatus();
          })
          .finally(function () { button.disabled = false; button.textContent = "Research starter guide"; });
      });
      if (params && params.autorun && researchState.hobby && !researchState.result && !researchState.error) {
        setTimeout(function () { if (form.requestSubmit) form.requestSubmit(); else form.querySelector('[data-role="research-submit"]').click(); }, 0);
      }
    }
  });

  // ---------- discover hub ----------
  var DISCOVER_COMMON = ["running", "tennis", "guitar", "painting"];
  var discoverSearch = "";
  function discoverChoices() {
    var common = DISCOVER_COMMON.map(function (id) { return SQ.getHobby(id); }).filter(Boolean);
    if (!discoverSearch) return common.slice(0, 4);
    var q = discoverSearch.toLowerCase();
    var found = catalog().filter(function (h) { return h.name.toLowerCase() === q || h.id === q; })[0] ||
      catalog().filter(function (h) { return h.name.toLowerCase().indexOf(q) >= 0; })[0];
    var first = found || { id: "", name: titleCase(discoverSearch), category: "technical", customResearch: true };
    return [first].concat(common.filter(function (h) { return h.id !== first.id; })).slice(0, 4);
  }
  function discoverCube(h, i) {
    var custom = !!h.customResearch;
    return '<button type="button" class="card tap dc-cube' + (custom ? " dc-cube-searched" : "") + '" data-action="' + (custom ? "research" : "pack") + '"' +
      (custom ? ' data-hobby="' + e(h.name) + '" data-auto="1"' : ' data-id="' + e(h.id) + '"') + ">" +
      '<span class="dc-cube-glyph" aria-hidden="true">' + (custom ? SQUI.icon("search", 30) : SQUI.hobbyIcon(h.id, 34)) + "</span>" +
      '<span class="dc-cube-name">' + e(h.name) + "</span>" +
      '<span class="small muted">' + (custom ? "Your search" : e(CAT[h.category] || h.category)) + "</span>" +
      (i === 0 && discoverSearch ? '<span class="pill-good small">Found</span>' : "") + "</button>";
  }
  SQUI.register("discover", {
    tab: "discover",
    title: "Discover",
    render: function () {
      return '<div class="screen dc-discover" data-dc="discover"><div class="stack-lg">' +
        '<header class="dc-disc-head"><div class="eyebrow">Discover</div><h1 class="h1">Find a new hobby</h1></header>' +
        '<form class="dc-discover-search" data-role="discover-form"><label class="sr-only" for="discover-q">Search for a hobby</label>' +
        '<span aria-hidden="true">' + SQUI.icon("search", 20) + '</span><input id="discover-q" class="dc-input" name="hobby" maxlength="60" placeholder="Search any hobby" value="' + e(discoverSearch) + '">' +
        '<button type="submit" class="btn primary sm">Search</button></form>' +
        '<section class="stack"><div class="row"><h2 class="h3">' + (discoverSearch ? "Your hobby and popular picks" : "Popular hobbies") + '</h2><span class="spacer"></span>' +
        (discoverSearch ? '<button type="button" class="btn ghost sm" data-action="clearsearch">Clear</button>' : "") + "</div>" +
        '<div class="dc-cube-grid">' + discoverChoices().map(discoverCube).join("") + "</div></section>" +
        "</div></div>";
    },
    mount: function (root) {
      var host = bind(root, "[data-dc]", common({ clearsearch: function () { discoverSearch = ""; SQUI.refresh(); } }));
      var form = host.querySelector('[data-role="discover-form"]');
      form.addEventListener("submit", function (ev) {
        ev.preventDefault();
        var value = String(new FormData(form).get("hobby") || "").replace(/\s+/g, " ").trim().slice(0, 60);
        if (!value) return;
        discoverSearch = value;
        SQUI.refresh();
        try { window.scrollTo(0, 0); } catch (x) { /* ignore */ }
      });
    }
  });

  // ---------- focused, low-clutter discovery experience ----------
  var SIMPLE_TREE = [
    { label: "Music", ids: ["guitar", "piano"] },
    { label: "Sports", ids: ["soccer", "tennis", "running", "basketball"] },
    { label: "Creative", ids: ["painting", "photography", "sewing", "journaling"] }
  ];
  var simplePick = [];
  function simpleTreeItem(id) {
    var h = SQ.getHobby(id), on = simplePick.indexOf(id) >= 0, isT = tracked(id);
    if (!h) return "";
    return '<button type="button" class="dc-tree-item' + (on ? " on" : "") + (isT ? " is-tracked" : "") + '" data-action="simple-toggle" data-id="' + e(id) + '" data-name="' + e(h.name.toLowerCase()) + '"' +
      (isT ? " disabled" : ' aria-pressed="' + on + '"') + '><span class="dc-tree-photo">' + picture(id, "", "dc-tree-photo-img") + "</span>" +
      '<span class="dc-tree-name">' + e(h.name) + '</span><span class="dc-tree-check" aria-hidden="true">' + (on ? SQUI.icon("check", 15) : "") + "</span></button>";
  }
  function simplePickButton() {
    var n = simplePick.length;
    return '<button type="button" class="btn primary block" data-action="simple-start"' + (n ? "" : " disabled") + ">" +
      (n ? "Continue with " + n + " " + (n === 1 ? "hobby" : "hobbies") : "Choose a hobby") + "</button>";
  }
  SQUI.register("pick", {
    get tab() { return onboarded() ? "discover" : null; }, title: "Current hobbies",
    render: function () {
      simplePick = [];
      var firstRun = !onboarded();
      var pickHead = firstRun
        ? '<header class="dc-disc-head"><div class="eyebrow">First, tell us what you do</div><h1 class="h1">List your current hobbies</h1></header>'
        : head("Add current hobbies", "Your hobbies");
      return '<div class="screen dc-simple-pick" data-dc="simple-pick"><div class="stack-lg">' +
        pickHead +
        '<label class="dc-search"><span class="dc-search-ic" aria-hidden="true">' + SQUI.icon("search", 18) + '</span><input type="search" class="dc-input" data-role="simple-search" placeholder="Search available hobbies" aria-label="Search available hobbies" autocomplete="off"></label>' +
        '<div class="dc-hobby-tree">' + SIMPLE_TREE.map(function (branch) {
          return '<section class="dc-tree-branch" data-tree-branch><h2 class="eyebrow">' + e(branch.label) + '</h2><div class="dc-tree-line">' +
            branch.ids.map(simpleTreeItem).join("") + "</div></section>";
        }).join("") + '</div><p class="small muted dc-nores" data-role="simple-nores" hidden>No available hobby matches that search.</p></div><div class="dc-cta" data-role="simple-cta">' + simplePickButton() + "</div></div>";
    },
    mount: function (root) {
      var host = bind(root, "[data-dc]", common({
        "simple-toggle": function (t) {
          var id = t.getAttribute("data-id"), i = simplePick.indexOf(id);
          if (i >= 0) simplePick.splice(i, 1); else simplePick.push(id);
          var on = simplePick.indexOf(id) >= 0;
          t.classList.toggle("on", on); t.setAttribute("aria-pressed", on);
          t.querySelector(".dc-tree-check").innerHTML = on ? SQUI.icon("check", 15) : "";
          host.querySelector('[data-role="simple-cta"]').innerHTML = simplePickButton();
        },
        "simple-start": function () {
          if (!simplePick.length) return;
          var rewards = simplePick.map(function (id) { return SQ.isTracked(id) ? null : SQ.addHobby(id, { goal: 2 }); }).filter(Boolean);
          var wasOnboarded = onboarded(); finishOnboarding();
          SQUI.go("today", {}, wasOnboarded ? { replace: true } : { reset: true });
          var reward = mergeRewards(rewards); if (reward) SQUI.showReward(reward, { title: "You're ready" });
        }
      }));
      var search = host.querySelector('[data-role="simple-search"]');
      search.addEventListener("input", function () {
        var term = search.value.trim().toLowerCase(), shown = 0;
        host.querySelectorAll(".dc-tree-item").forEach(function (item) {
          var visible = !term || item.getAttribute("data-name").indexOf(term) >= 0;
          item.hidden = !visible; if (visible) shown += 1;
        });
        host.querySelectorAll("[data-tree-branch]").forEach(function (branch) {
          branch.hidden = !Array.prototype.some.call(branch.querySelectorAll(".dc-tree-item"), function (item) { return !item.hidden; });
        });
        host.querySelector('[data-role="simple-nores"]').hidden = shown > 0;
      });
    }
  });

  function simpleMatch(m) {
    var h = m.hobby;
    return '<button type="button" class="card tap dc-simple-match" data-action="pack" data-id="' + e(h.id) + '">' +
      '<span class="dc-match-photo">' + picture(h.id, "", "dc-match-photo-img") + '</span><span class="dc-cube-name">' + e(h.name) + "</span>" +
      '<span class="small muted">' + e(PLACE[h.place] || h.place) + '</span><span class="num dc-simple-cost">' +
      (tierTotal(h, "free")[1] === 0 ? "Free to try" : e(money(tierTotal(h, "budget")))) + "</span></button>";
  }
  SQUI.register("results", {
    get tab() { return dynTab(); }, title: "Hobby matches",
    render: function () {
      var ans = SQ.state && SQ.state.user && SQ.state.user.quiz;
      var ms = matchesFor(ans);
      return '<div class="screen dc-results" data-dc="results"><div class="stack-lg">' +
        head("Hobbies that fit", ans && ans.place === "indoor" ? "Indoors" : ans && ans.place === "outdoor" ? "Outdoors" : "Indoor and outdoor") +
        (ms.length ? '<div class="dc-simple-match-grid">' + ms.map(simpleMatch).join("") + "</div>" : '<div class="empty">No untracked matches right now.</div>') +
        '<button type="button" class="btn block" data-action="quiz">Choose a different place</button></div></div>';
    },
    mount: function (root) { bind(root, "[data-dc]", common({})); }
  });

  function tutorialLink(t) {
    var url = "https://www.youtube.com/results?search_query=" + encodeURIComponent(t.searchQuery || t.title);
    return '<a class="card tap dc-tutorial-link" href="' + e(url) + '" target="_blank" rel="noopener noreferrer"><span>' + SQUI.icon("play", 20) +
      '</span><span>' + e(t.title) + '</span><span class="spacer"></span>' + SQUI.icon("chevron-right", 18) + "</a>";
  }
  function gearLink(item) {
    var url = "https://www.google.com/search?q=" + encodeURIComponent(item.name + " beginner equipment");
    return '<a class="card tap dc-gear-link" href="' + e(url) + '" target="_blank" rel="noopener noreferrer"><span><strong>' + e(item.name) +
      '</strong><span class="small muted">' + e(money(item.price || [0, 0])) + '</span></span><span class="spacer"></span>' + SQUI.icon("chevron-right", 18) + "</a>";
  }
  SQUI.register("pack", {
    get tab() { return dynTab(); }, title: "Hobby basics",
    render: function (params) {
      packId = params && params.id;
      var h = packId ? SQ.getHobby(packId) : null;
      if (!h || !h.starterPack) return '<div class="screen" data-dc="pack">' + head("Hobby basics") + '<div class="empty">Hobby not found.</div></div>';
      var isT = tracked(h.id), free = h.starterPack.tiers.free.items || [], budget = tierTotal(h, "budget");
      var gearItems = h.starterPack.tiers.budget.items || [];
      return '<div class="screen dc-pack dc-simple-pack" data-dc="pack"><div class="stack-lg"><div class="screen-head">' + backBtn() + "</div>" +
        '<header class="dc-simple-pack-head"><span class="dc-pack-photo">' + picture(h.id, h.name, "dc-pack-photo-img") + '</span><h1 class="h1">' + e(h.name) + "</h1></header>" +
        '<div class="dc-cost-cards"><div class="card"><span class="eyebrow">Can I try it free?</span><strong>Yes</strong><span class="small muted">' + e(free[0] ? free[0].name : "Use what you have") +
        '</span></div><div class="card"><span class="eyebrow">Basic setup</span><strong class="num">' + e(money(budget)) + "</strong></div></div>" +
        '<section class="stack"><div><h2 class="h2">Gear needed</h2><p class="small muted">Open an item to compare current options.</p></div><div class="stack">' + gearItems.map(gearLink).join("") + "</div></section>" +
        '<section class="stack"><h2 class="h2">Intro tutorials</h2><div class="stack">' + (h.tutorials || []).map(tutorialLink).join("") + "</div></section>" +
        '</div><div class="dc-cta"><button type="button" class="btn primary block" data-action="' + (isT ? "open" : "startpack") + '">' +
        (isT ? "Open in tracker" : "Add to current hobbies") + "</button></div></div>";
    },
    mount: function (root) {
      bind(root, "[data-dc]", common({
        open: function () { SQUI.go("hobby", { id: packId }); },
        startpack: function () {
          var wasOnboarded = onboarded(), reward = SQ.addHobby(packId, { goal: 2, viaStarter: true });
          finishOnboarding(); SQUI.go("hobby", { id: packId }, wasOnboarded ? { replace: true } : { reset: true });
          if (reward && reward.newAchievements && reward.newAchievements.length) SQUI.showReward(reward, { title: "Added" });
        }
      }));
    }
  });

  // ---------- discover: hobby blobs ----------
  // Overview: a small "My hobbies" blob in the middle, ringed by glassy category blobs.
  // Tapping a category grows it to fill the screen and pops out its hobbies. Drag a hobby
  // into My hobbies to add it; tap it for a Gemini guide (real gear, videos, community tips).
  var EXTRA = {
    crossfit: { name: "CrossFit", category: "active", place: "indoor", social: "group",
      blurb: "Short, varied full-body workouts, usually done in a class with a coach.",
      free: ["Try a free intro class at a local box", "Follow a bodyweight WOD at home"],
      gear: [["Cross-training shoes", [60, 120]], ["Jump rope", [10, 25]], ["Wrist wraps", [10, 20]]],
      tutorials: [["CrossFit for beginners", "crossfit for complete beginners"], ["Scaling workouts", "how to scale crossfit workouts beginner"], ["Air squat form", "crossfit air squat form tutorial"]] },
    climbing: { name: "Rock Climbing", category: "active", place: "either", social: "either",
      blurb: "Problem-solving on a wall. Bouldering gyms make it easy to start without a partner.",
      free: ["Look for a free first-visit pass at a climbing gym", "Rent shoes before buying"],
      gear: [["Climbing shoes", [70, 130]], ["Chalk bag and chalk", [15, 30]], ["Gym day pass", [18, 30]]],
      tutorials: [["Bouldering basics", "bouldering for beginners first session"], ["Footwork drills", "beginner climbing footwork technique"], ["How to fall safely", "bouldering how to fall safely"]] },
    pilates: { name: "Pilates", category: "active", place: "indoor", social: "either",
      blurb: "Slow, controlled core and posture work you can do on a mat at home.",
      free: ["Follow a free mat class online", "Use a towel or rug as a mat"],
      gear: [["Exercise mat", [20, 40]], ["Resistance band set", [10, 25]]],
      tutorials: [["Pilates for beginners", "20 minute beginner mat pilates"], ["The pilates hundred", "pilates hundred tutorial beginner"], ["Core breathing", "pilates breathing technique beginner"]] },
    yoga: { name: "Yoga", category: "relaxing", place: "indoor", social: "either",
      blurb: "Stretching, strength and breathing in one practice. Ten minutes counts.",
      free: ["Follow a free beginner video", "Try a community class in a park"],
      gear: [["Yoga mat", [20, 45]], ["Yoga block", [8, 15]]],
      tutorials: [["Yoga for complete beginners", "yoga for complete beginners 20 minutes"], ["Sun salutation", "sun salutation step by step beginner"], ["Morning stretch", "10 minute morning yoga beginner"]] },
    swimming: { name: "Swimming", category: "active", place: "either", social: "solo",
      blurb: "Low-impact cardio that works your whole body. Most towns have a public pool.",
      free: ["Use a public pool's open swim hours", "Borrow goggles"],
      gear: [["Swim goggles", [10, 25]], ["Swimsuit", [25, 50]], ["Pool day pass", [3, 10]]],
      tutorials: [["Freestyle breathing", "freestyle swimming breathing beginner"], ["Floating and kicking", "adult beginner swimming kick and float"], ["First lap", "how to swim your first lap beginner"]] },
    cycling: { name: "Cycling", category: "active", place: "outdoor", social: "either",
      blurb: "Explore your area on two wheels. Any working bike is enough to start.",
      free: ["Borrow a bike or use a bike share", "Ride a quiet park loop"],
      gear: [["Helmet", [30, 60]], ["Bike lights", [15, 35]], ["Used bike", [100, 250]]],
      tutorials: [["Bike safety check", "bike safety check before ride beginner"], ["Shifting gears", "how to shift gears on a bike beginner"], ["Riding in traffic", "beginner cycling road safety tips"]] },
    drawing: { name: "Drawing", category: "creative", place: "indoor", social: "solo",
      blurb: "A pencil and paper are all you need. Sketch what's in front of you.",
      free: ["Use printer paper and any pencil", "Draw objects around the house"],
      gear: [["Sketchbook", [8, 18]], ["Graphite pencil set", [8, 15]], ["Eraser", [2, 5]]],
      tutorials: [["Drawing basic shapes", "drawing basics shapes beginner"], ["Shading", "pencil shading techniques beginner"], ["Draw what you see", "observational drawing for beginners"]] },
    pottery: { name: "Pottery", category: "creative", place: "indoor", social: "either",
      blurb: "Shape clay by hand or on a wheel. A drop-in studio class is the easiest way in.",
      free: ["Try air-dry clay at home", "Look for a library or community maker night"],
      gear: [["Air-dry clay", [10, 20]], ["Basic sculpting tools", [8, 15]], ["Intro studio class", [35, 60]]],
      tutorials: [["Pinch pot", "how to make a pinch pot beginner"], ["Coil building", "pottery coil building beginner"], ["Wheel centering", "pottery wheel centering clay beginner"]] },
    knitting: { name: "Knitting", category: "creative", place: "indoor", social: "either",
      blurb: "Two needles and some yarn. Easy to pick up for five minutes at a time.",
      free: ["Borrow needles from a friend or library kit", "Practise with leftover yarn"],
      gear: [["Knitting needles (size 8)", [5, 12]], ["Worsted yarn", [6, 15]]],
      tutorials: [["Cast on", "how to cast on knitting beginner"], ["Knit stitch", "knit stitch for beginners"], ["First scarf", "easy first knitting project scarf"]] },
    drums: { name: "Drums", category: "creative", place: "indoor", social: "either",
      blurb: "Rhythm first. A practice pad and sticks let you start quietly at home.",
      free: ["Tap rhythms on a pillow or book", "Use a free metronome app"],
      gear: [["Drumsticks", [10, 15]], ["Practice pad", [20, 35]]],
      tutorials: [["Hold drumsticks", "how to hold drumsticks beginner"], ["Single stroke roll", "single stroke roll beginner drum lesson"], ["First rock beat", "first rock beat drum lesson beginner"]] },
    singing: { name: "Singing", category: "creative", place: "indoor", social: "either",
      blurb: "Your voice is the instrument. Warm-ups and simple songs get you started.",
      free: ["Sing along to songs you know", "Join a community choir open night"],
      gear: [["Basic USB microphone", [30, 60]], ["Headphones", [15, 30]]],
      tutorials: [["Vocal warm-ups", "vocal warm ups for beginners"], ["Breath support", "singing breath support beginner"], ["Find your range", "how to find your vocal range"]] },
    ukulele: { name: "Ukulele", category: "creative", place: "indoor", social: "solo",
      blurb: "Four strings, small hands-friendly chords, and songs within your first week.",
      free: ["Borrow a ukulele", "Use a free tuner app"],
      gear: [["Soprano ukulele", [35, 70]], ["Clip-on tuner", [8, 15]]],
      tutorials: [["Tune a ukulele", "how to tune a ukulele beginner"], ["First four chords", "ukulele four chords beginner lesson"], ["Strumming pattern", "easy ukulele strumming pattern beginner"]] },
    reading: { name: "Reading", category: "relaxing", place: "either", social: "solo",
      blurb: "Trade a scroll session for a chapter. Libraries make it free.",
      free: ["Get a free library card", "Borrow ebooks with a library app"],
      gear: [["Paperback book", [8, 18]], ["Book light", [10, 20]]],
      tutorials: [["Build a reading habit", "how to build a reading habit"], ["Pick your next book", "how to choose books you'll enjoy"], ["Join a book club", "how to join a book club beginner"]] },
    writing: { name: "Creative Writing", category: "creative", place: "either", social: "solo",
      blurb: "Short stories, poems or scenes. Start with a five-minute prompt.",
      free: ["Write in a notes app", "Try a daily writing prompt"],
      gear: [["Notebook", [5, 15]], ["Craft book", [12, 20]]],
      tutorials: [["Story basics", "creative writing for beginners short story"], ["Writing prompts", "creative writing prompts beginner"], ["Show, don't tell", "show don't tell writing tips"]] },
    chess: { name: "Chess", category: "technical", place: "indoor", social: "either",
      blurb: "A strategy game you can play online in minutes or at a park table.",
      free: ["Play free online games", "Find a library or park chess club"],
      gear: [["Chess set", [15, 35]], ["Beginner chess book", [10, 20]]],
      tutorials: [["How the pieces move", "how chess pieces move beginner"], ["Opening principles", "chess opening principles beginner"], ["Checkmate patterns", "basic checkmate patterns beginner"]] },
    language: { name: "Learning a Language", category: "technical", place: "either", social: "either",
      blurb: "A few minutes a day adds up. Pick a language you'd love to hear in real life.",
      free: ["Use a free language app", "Watch shows with subtitles"],
      gear: [["Phrasebook", [8, 15]], ["Flashcards", [5, 12]]],
      tutorials: [["Where to start", "how to start learning a language beginner"], ["Pronunciation basics", "language pronunciation tips beginners"], ["Daily practice routine", "15 minute language learning routine"]] }
  };
  var CAT_BLURB = {
    guitar: "Chords, strumming and songs you love. Most people play a simple song in the first month.",
    soccer: "Pickup games, passing drills and a lot of running. Easy to join with a ball and a field.",
    tennis: "Rally with a friend at a public court. Racket and balls are the whole kit.",
    painting: "Mix colours and make something you can hang up. Start small with a student set.",
    photography: "Your phone is enough. Learn light and framing on a walk around your block.",
    running: "Walk-run your way up. Comfortable shoes and a free timer are all you need.",
    sewing: "Fix, alter and make clothes. A needle, thread and old fabric get you going.",
    journaling: "A few lines a day to clear your head. Paper and pen, nothing else.",
    piano: "Learn notes and melodies on any keyboard, even a used one.",
    basketball: "Shoot around at a public court or join a pickup game."
  };
  var ICON_KEY = {};
  var CAT_ICON = {
    athletic: '<path d="M13 2.5L5.5 13.5H11l-1 8 7.5-11H12z"/>',
    mind: '<path d="M9 18h6M10 21h4"/><path d="M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z"/>',
    art: '<path d="M12 3a9 9 0 1 0 0 18c1.4 0 2-1 2-2 0-.6-.3-1-.6-1.4-.3-.4-.6-.8-.6-1.4 0-1.1.9-1.7 2-1.7h2.2A4 4 0 0 0 21 11c0-4.4-4-8-9-8z"/><circle cx="7.5" cy="11" r="1.2"/><circle cx="10.5" cy="7" r="1.2"/><circle cx="15" cy="7.5" r="1.2"/>',
    music: '<path d="M9 18V5.5l11-2.5v12.5"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="17.5" cy="15.5" r="2.5"/>',
    mine: '<path d="M12 20.5s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.6a4.3 4.3 0 0 1 7.5 2.7c0 5.6-7.5 10.2-7.5 10.2z"/>',
    search: '<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/>'
  };
  function svgIcon(inner, size, sw) {
    return '<svg class="sq-ic" width="' + size + '" height="' + size + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="' + (sw || 1.7) +
      '" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' + inner + "</svg>";
  }
  function itemIcon(it, size) {
    if (it.own || !it.key) return SQUI.hobbyIcon(it.id, size);
    var k = ICON_KEY[it.key] || it.key;
    return (SQUI.iconSvg && SQUI.iconSvg(k, size, 1.6)) || SQUI.hobbyIcon(it.id || it.key, size);
  }

  var BLOB_CATS = [
    { id: "athletic", label: "Athletic",
      ids: ["running", "soccer", "basketball", "tennis", "crossfit", "climbing", "pilates", "swimming", "cycling"],
      x: 30, y: 19, w: 58, h: 35 },
    { id: "mind", label: "Mind & words",
      ids: ["journaling", "reading", "writing", "chess", "language", "yoga"],
      x: 77, y: 30, w: 46, h: 30 },
    { id: "art", label: "Art",
      ids: ["painting", "drawing", "photography", "sewing", "pottery", "knitting"],
      x: 25, y: 77, w: 52, h: 34 },
    { id: "music", label: "Music",
      ids: ["guitar", "piano", "drums", "singing", "ukulele"],
      x: 75, y: 81, w: 50, h: 33 }
  ];
  var MINE = { x: 52, y: 50, w: 33, h: 21 };
  var blobOpen = null; // null | category id | "mine" | "search"
  var blobSearch = "";

  function blobItem(key) {
    var h = SQ.getHobby(key);
    if (h && !h.custom) {
      var gear = (h.starterPack && h.starterPack.tiers.budget.items) || [];
      return { key: key, id: key, catalog: true, name: h.name, category: h.category,
        place: h.place, social: h.social, blurb: CAT_BLURB[key] || h.blurb || "",
        free: (h.starterPack && h.starterPack.tryFirst) || [], gear: gear.map(function (g) { return [g.name, g.price || [0, 0]]; }) };
    }
    var x = EXTRA[key];
    if (!x) return null;
    var out = { key: key, id: null, catalog: false };
    for (var k in x) out[k] = x[k];
    var lower = x.name.toLowerCase();
    ((SQ.state && SQ.state.custom) || []).forEach(function (c) { if (c.name.toLowerCase() === lower) out.id = c.id; });
    return out;
  }
  function inMine(item) { return !!(item && item.id && tracked(item.id)); }
  function mineItems() {
    return ((SQ.state && SQ.state.tracked) || []).map(function (t) {
      var h = SQ.getHobby(t.hobbyId);
      if (!h) return null;
      var key = CAT_BLURB[h.id] ? h.id : null;
      if (!key) for (var k in EXTRA) if (EXTRA[k].name.toLowerCase() === h.name.toLowerCase()) key = k;
      var item = key ? blobItem(key) : null;
      if (!item) item = { key: null, id: h.id, catalog: false, own: true, name: h.name, category: h.category };
      item.id = h.id;
      return item;
    }).filter(Boolean);
  }
  function allBlobItems() {
    var seen = {}, out = [];
    BLOB_CATS.forEach(function (c) { c.ids.forEach(function (k) { if (!seen[k]) { seen[k] = 1; var it = blobItem(k); if (it) out.push(it); } }); });
    return out;
  }
  function itemsFor(view) {
    if (view === "mine") return mineItems();
    if (view === "search") {
      var q = blobSearch.toLowerCase();
      return allBlobItems().filter(function (it) { return it.name.toLowerCase().indexOf(q) >= 0; });
    }
    var cat = BLOB_CATS.filter(function (c) { return c.id === view; })[0];
    return cat ? cat.ids.map(blobItem).filter(Boolean) : [];
  }
  var ROWS = { 1: [1], 2: [2], 3: [3], 4: [2, 2], 5: [2, 3], 6: [3, 3], 7: [2, 3, 2], 8: [3, 2, 3], 9: [2, 3, 2, 2], 10: [2, 3, 3, 2] };
  function bubbleSpots(n) {
    var rows = ROWS[n] ? ROWS[n].slice() : [];
    if (!rows.length) { for (var left = n; left > 0; left -= 3) rows.push(Math.min(3, left)); }
    var out = [], top = rows.length > 3 ? 27 : rows.length > 2 ? 31 : 38, bottom = rows.length > 3 ? 85 : rows.length > 2 ? 79 : 70;
    rows.forEach(function (count, r) {
      var y = rows.length === 1 ? 54 : top + (bottom - top) * r / (rows.length - 1);
      var xs = count === 3 ? [21, 50, 79] : count === 2 ? [33, 67] : [50];
      xs.forEach(function (x, i) {
        var wob = ((r * 7 + i * 13) % 5 - 2) * 1.2;
        out.push({ x: x + wob, y: y + (count === 3 && i === 1 ? 3 : -1) });
      });
    });
    return out;
  }
  function hobbyBubble(item, spot, i, view) {
    var mine = inMine(item);
    var canDrag = view !== "mine" && !mine;
    return '<button type="button" class="bl-hobby' + (mine ? " is-mine" : "") + (canDrag ? " can-drag" : "") + '" data-action="blob-hobby" data-key="' + e(item.key || "") + '"' +
      (item.id ? ' data-id="' + e(item.id) + '"' : "") + (view === "mine" ? ' data-mine="1"' : "") +
      ' style="--hx:' + spot.x.toFixed(1) + '%;--hy:' + spot.y.toFixed(1) + '%;--i:' + i + '" aria-label="' +
      e(item.name + (mine ? ", in My hobbies" : canDrag ? ". Drag into My hobbies to add, or open for details" : "")) + '">' +
      '<span class="bl-orb bl-hobby-dot" aria-hidden="true">' + itemIcon(item, 28) + (mine ? '<span class="bl-hobby-check">' + SQUI.icon("check", 12) + "</span>" : "") + "</span>" +
      '<span class="bl-hobby-name">' + e(item.name) + "</span></button>";
  }
  function bubblesFor(view) {
    var items = itemsFor(view);
    var spots = bubbleSpots(items.length);
    var html = items.map(function (it, i) { return hobbyBubble(it, spots[i], i, view); }).join("");
    if (view === "search" && !items.length) {
      html = '<button type="button" class="bl-hobby bl-research" data-action="research" data-hobby="' + e(titleCase(blobSearch)) + '" data-auto="1" style="--hx:50%;--hy:52%;--i:0">' +
        '<span class="bl-orb bl-hobby-dot" aria-hidden="true">' + svgIcon(CAT_ICON.search, 26) + '</span><span class="bl-hobby-name">Research “' + e(titleCase(blobSearch)) + '”</span></button>';
    }
    if (view === "mine" && !items.length) html = '<p class="bl-empty">Nothing here yet. Open a blob and drag a hobby in.</p>';
    return html;
  }
  function seedIcons(items) {
    return items.slice(0, 4).map(function (it, i) {
      return it ? '<span class="bl-orb bl-seed" style="--s:' + i + '">' + itemIcon(it, 18) + "</span>" : "";
    }).join("");
  }
  function catBlob(cat, n) {
    var open = blobOpen === cat.id;
    return '<div class="bl-blob bl-cat' + (open ? " is-open" : "") + '" data-cat="' + e(cat.id) + '" style="--x:' + cat.x + '%;--y:' + cat.y + '%;--w:' + cat.w + '%;--h:' + cat.h + '%;--n:' + n + '">' +
      '<button type="button" class="bl-face" data-action="blob-open" data-cat="' + e(cat.id) + '" aria-expanded="' + open + '" aria-label="' + e(cat.label + ", " + cat.ids.length + " hobbies") + '">' +
      '<span class="bl-cat-ic" aria-hidden="true">' + svgIcon(CAT_ICON[cat.id], 22, 1.8) + "</span>" +
      '<span class="bl-label">' + e(cat.label) + '</span><span class="bl-hint">' + cat.ids.length + " hobbies</span>" +
      '<span class="bl-seeds" aria-hidden="true">' + seedIcons(cat.ids.map(blobItem)) + "</span></button>" +
      '<div class="bl-inner" data-role="bubbles">' + (open ? bubblesFor(cat.id) : "") + "</div></div>";
  }
  function mineBlob() {
    var items = mineItems(), open = blobOpen === "mine";
    return '<div class="bl-blob bl-mine' + (open ? " is-open" : "") + (items.length ? "" : " is-empty") + '" data-cat="mine" style="--x:' + MINE.x + '%;--y:' + MINE.y + '%;--w:' + MINE.w + '%;--h:' + MINE.h + '%">' +
      '<button type="button" class="bl-face" data-action="blob-open" data-cat="mine" aria-expanded="' + open + '" aria-label="My hobbies, ' + items.length + '">' +
      '<span class="bl-cat-ic" aria-hidden="true">' + svgIcon(CAT_ICON.mine, 18, 1.8) + "</span>" +
      '<span class="bl-label">My hobbies</span><span class="bl-hint" data-role="mine-count">' + (items.length ? items.length : "Empty") + "</span>" +
      '<span class="bl-seeds" aria-hidden="true">' + seedIcons(items) + "</span></button>" +
      '<span class="bl-drop-hint" aria-hidden="true">Drop to add</span>' +
      '<div class="bl-inner" data-role="bubbles">' + (open ? bubblesFor("mine") : "") + "</div></div>";
  }
  function searchBlob() {
    var open = blobOpen === "search";
    return '<div class="bl-blob bl-search' + (open ? " is-open" : "") + '" data-cat="search" style="--x:50%;--y:46%;--w:10%;--h:8%">' +
      '<div class="bl-face" aria-hidden="true"><span class="bl-label">“' + e(blobSearch) + '”</span></div>' +
      '<div class="bl-inner" data-role="bubbles">' + (open ? bubblesFor("search") : "") + "</div></div>";
  }
  function blobTitle() {
    if (!blobOpen) return "Tap a blob to explore";
    if (blobOpen === "mine") return "My hobbies";
    if (blobOpen === "search") return "Search results";
    return "Drag a hobby into My hobbies";
  }
  function stageHtml() {
    return '<div class="bl-stage' + (blobOpen ? " has-open open-" + blobOpen : "") + '" data-role="stage">' +
      '<div class="bl-backdrop" aria-hidden="true"><i></i><i></i><i></i><i></i></div>' +
      '<div class="bl-field">' + BLOB_CATS.map(catBlob).join("") + searchBlob() + mineBlob() + "</div></div>";
  }

  // ---------- Gemini hobby guide (real products, real videos, community tips) ----------
  var GUIDE_KEY = "habitual.hobbyGuides.v1", GUIDE_TTL = 7 * 24 * 60 * 60 * 1000;
  var guidePending = {};
  function guideStore() {
    try { return JSON.parse(localStorage.getItem(GUIDE_KEY) || "{}") || {}; } catch (x) { return {}; }
  }
  function cachedGuide(name) {
    var row = guideStore()[name.toLowerCase()];
    return row && row.at && Date.now() - row.at < GUIDE_TTL ? row.guide : null;
  }
  function saveGuide(name, guide) {
    try {
      var all = guideStore(), keys = Object.keys(all);
      if (keys.length > 30) keys.sort(function (a, b) { return all[a].at - all[b].at; }).slice(0, keys.length - 30).forEach(function (k) { delete all[k]; });
      all[name.toLowerCase()] = { at: Date.now(), guide: guide };
      localStorage.setItem(GUIDE_KEY, JSON.stringify(all));
    } catch (x) { /* storage optional */ }
  }
  function fetchGuide(name) {
    var hit = cachedGuide(name);
    if (hit) return Promise.resolve(hit);
    if (location.protocol === "file:" || location.hostname.indexOf("claude") >= 0) {
      var off = new Error("offline"); off.offline = true; return Promise.reject(off);
    }
    var k = name.toLowerCase();
    if (!guidePending[k]) {
      guidePending[k] = fetch("/api/hobby-guide", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ hobby: name, location: "United States", currency: "USD" }) })
        .then(function (res) {
          return res.json().catch(function () { return {}; }).then(function (body) {
            if (!res.ok) { var err = new Error(body.error || "Guide request failed."); err.offline = res.status === 404 || res.status === 503; throw err; }
            return body;
          });
        }, function () { var err = new Error("offline"); err.offline = true; throw err; })
        .then(function (g) { saveGuide(name, g); return g; })
        .finally(function () { delete guidePending[k]; });
    }
    return guidePending[k];
  }
  var guideTier = "entry";
  function usd(n) { return n ? "$" + Number(n).toLocaleString() : ""; }
  function productCard(p) {
    var inner = '<span class="bl-prod-main"><strong>' + e((p.brand && p.name.indexOf(p.brand) < 0 ? p.brand + " " : "") + p.name) + "</strong>" +
      (p.why ? '<span class="small muted">' + e(p.why) + "</span>" : "") +
      '<span class="bl-prod-meta">' + (p.price ? '<span class="num bl-prod-price">' + e(usd(p.price)) + "</span>" : "") +
      (p.retailer ? '<span class="small">' + e(p.retailer) + "</span>" : "") + "</span></span>";
    return p.url
      ? '<a class="card tap bl-prod" href="' + e(p.url) + '" target="_blank" rel="noopener noreferrer">' + inner + SQUI.icon("chevron-right", 18) + "</a>"
      : '<div class="card bl-prod">' + inner + "</div>";
  }
  function gearTiers(g) {
    var tiers = [["entry", "Entry level"], ["mid", "Mid tier"], ["high", "High end"]].filter(function (t) { return g.gear && g.gear[t[0]] && g.gear[t[0]].products.length; });
    if (!tiers.length) return "";
    if (!tiers.some(function (t) { return t[0] === guideTier; })) guideTier = tiers[0][0];
    return '<section class="stack"><h3 class="h3">Gear people recommend</h3>' +
      '<div class="seg bl-tier-seg" role="tablist" aria-label="Price range">' + tiers.map(function (t) {
        var on = t[0] === guideTier;
        return '<button type="button" role="tab" class="' + (on ? "on" : "") + '" aria-selected="' + on + '" data-tier="' + t[0] + '">' + t[1] + "</button>";
      }).join("") + "</div>" +
      tiers.map(function (t) {
        return '<div class="stack bl-tier" data-tier-panel="' + t[0] + '"' + (t[0] === guideTier ? "" : " hidden") + ">" + g.gear[t[0]].products.map(productCard).join("") + "</div>";
      }).join("") +
      '<p class="small muted">Picked by Gemini from hobbyist threads and reviews. Prices change, so check before you buy.</p></section>';
  }
  function videoCard(v) {
    return '<a class="card tap bl-video" href="' + e(v.url) + '" target="_blank" rel="noopener noreferrer">' +
      '<span class="bl-video-thumb"><img src="' + e(v.thumbnail) + '" alt="" loading="lazy"><span class="bl-video-play">' + SQUI.icon("play", 22) + "</span></span>" +
      '<span class="bl-video-text"><strong>' + e(v.title) + '</strong><span class="small muted">' + e(v.channel) + "</span>" +
      (v.whatYouLearn ? '<span class="small">' + e(v.whatYouLearn) + "</span>" : "") + "</span></a>";
  }
  function renderGuide(g) {
    var community = (g.community || []).map(function (c) {
      return '<li><span class="dc-tip-ic" aria-hidden="true">' + SQUI.icon("check", 16) + '</span><span>' + e(c.insight) +
        (c.source ? ' <span class="small muted">— ' + (c.url ? '<a href="' + e(c.url) + '" target="_blank" rel="noopener noreferrer">' + e(c.source) + "</a>" : e(c.source)) + "</span>" : "") + "</span></li>";
    }).join("");
    var steps = (g.firstSteps || []).map(function (s, i) {
      return '<li class="dc-session"><span class="dc-session-n num" aria-hidden="true">' + (i + 1) + '</span><div class="dc-session-body"><div class="dc-row-name">' + e(s.title) + "</div><p>" + e(s.details) + "</p></div></li>";
    }).join("");
    var sources = (g.sources || []).slice(0, 8).map(function (s) {
      return '<li><a href="' + e(s.url) + '" target="_blank" rel="noopener noreferrer">' + e(s.title || s.publisher) + "</a></li>";
    }).join("");
    return (g.overview ? '<p class="bl-sheet-blurb">' + e(g.overview) + "</p>" : "") +
      (community ? '<section class="stack"><h3 class="h3">What hobbyists tell beginners</h3><ul class="dc-tips">' + community + "</ul></section>" : "") +
      gearTiers(g) +
      ((g.videos || []).length ? '<section class="stack"><h3 class="h3">Tutorial videos</h3><div class="stack">' + g.videos.map(videoCard).join("") + "</div></section>" : "") +
      (steps ? '<section class="stack"><h3 class="h3">Your first week</h3><ol class="dc-sessions">' + steps + "</ol></section>" : "") +
      (sources ? '<details class="bl-sources"><summary class="small">Sources Gemini read</summary><ul>' + sources + "</ul></details>" : "");
  }
  function guideLoading() {
    return '<div class="card dc-ai-loading" role="status"><span class="dc-ai-spinner" aria-hidden="true"></span><div><div class="h3">Researching with Gemini</div>' +
      '<p class="small muted">Reading Reddit threads, forums and reviews for real gear picks and tutorial videos. This can take up to a minute.</p></div></div>';
  }
  function guideFallback(it, err) {
    var lo = 0, hi = 0;
    (it.gear || []).forEach(function (g) { lo += g[1][0]; hi += g[1][1]; });
    var msg = err && err.offline
      ? "Real product picks and tutorial videos come from Gemini. Run Habitual with its server (node server.js) and a Gemini key to load them."
      : (err && err.message) || "Gemini could not finish the research. Try again in a moment.";
    return '<div class="card bl-guide-note" role="note"><div class="h3">Live guide unavailable</div><p class="small muted">' + e(msg) + "</p>" +
      (err && !err.offline ? '<button type="button" class="btn sm" data-sheet="retry">Try again</button>' : "") + "</div>" +
      ((it.gear || []).length ? '<section class="stack"><h3 class="h3">What you need</h3><ul class="list bl-basics">' + it.gear.map(function (g) {
        return '<li class="list-row"><span class="dc-row-name">' + e(g[0]) + '</span><span class="spacer"></span><span class="num small muted">' + e(money(g[1])) + "</span></li>";
      }).join("") + '</ul><p class="small muted">Typical US prices, about ' + e(money([lo, hi])) + " in total.</p></section>" : "");
  }

  // ---------- hobby info sheet ----------
  var sheetKeys = null;
  function closeBlobSheet() {
    var w = document.querySelector(".bl-sheet-wrap");
    if (w) w.remove();
    if (sheetKeys) { document.removeEventListener("keydown", sheetKeys, true); sheetKeys = null; }
  }
  function blobTags(it) {
    return [
      it.place === "indoor" ? "Indoors" : it.place === "outdoor" ? "Outdoors" : "Indoors or out",
      it.social === "group" ? "With people" : it.social === "solo" ? "Solo" : "Solo or social",
      it.category === "active" ? "Active" : "Low-key"
    ];
  }
  function openBlobSheet(key, id, onAdd) {
    closeBlobSheet();
    var it = (key && blobItem(key)) || mineItems().filter(function (m) { return m.id === id; })[0];
    if (!it) return;
    var mine = inMine(it);
    var wrap = document.createElement("div");
    wrap.className = "bl-sheet-wrap";
    wrap.innerHTML = '<div class="cm-sheet-backdrop" data-close></div>' +
      '<div class="cm-sheet bl-sheet" role="dialog" aria-modal="true" aria-labelledby="bl-sheet-title">' +
      '<div class="cm-sheet-grab" aria-hidden="true"></div>' +
      '<div class="bl-sheet-head"><span class="bl-orb bl-sheet-icon" aria-hidden="true">' + itemIcon(it, 30) + "</span>" +
      '<div class="bl-sheet-titles"><h2 id="bl-sheet-title" class="h2">' + e(it.name) + "</h2>" +
      (it.own ? "" : '<div class="bl-tags">' + blobTags(it).map(function (t) { return '<span class="bl-tag">' + e(t) + "</span>"; }).join("") + "</div>") + "</div>" +
      '<button type="button" class="icon-btn" data-close aria-label="Close">' + SQUI.icon("close", 20) + "</button></div>" +
      (it.blurb ? '<p class="bl-sheet-blurb">' + e(it.blurb) + "</p>" : "") +
      ((it.free || []).length ? '<section class="stack"><h3 class="h3">Free ways to start</h3><ul class="dc-tips">' + it.free.map(function (f) {
        return '<li><span class="dc-tip-ic" aria-hidden="true">' + SQUI.icon("check", 16) + "</span><span>" + e(f) + "</span></li>";
      }).join("") + "</ul></section>" : "") +
      '<div class="stack-lg" data-role="guide">' + guideLoading() + "</div>" +
      '<div class="bl-sheet-cta">' +
      (mine ? '<button type="button" class="btn primary block" data-sheet="open">' + SQUI.icon("check", 18) + " In My hobbies · Open tracker</button>"
        : '<p class="bl-drag-tip">' + svgIcon(CAT_ICON.mine, 16, 1.8) + "<span>Drag it into My hobbies to add it</span></p>" +
          '<button type="button" class="btn ghost block sm" data-sheet="add">Add without dragging</button>') +
      "</div></div>";
    (document.getElementById("overlay-root") || document.body).appendChild(wrap);
    var guideHost = wrap.querySelector('[data-role="guide"]');
    function load() {
      guideHost.innerHTML = guideLoading();
      fetchGuide(it.name).then(function (g) {
        if (wrap.isConnected) guideHost.innerHTML = renderGuide(g);
      }, function (err) {
        if (wrap.isConnected) guideHost.innerHTML = guideFallback(it, err);
      });
    }
    if (!it.own) load(); else guideHost.innerHTML = "";
    var focusBtn = wrap.querySelector("[data-close].icon-btn");
    if (focusBtn) try { focusBtn.focus({ preventScroll: true }); } catch (x) { /* ignore */ }
    sheetKeys = function (ev) { if (ev.key === "Escape") { ev.stopPropagation(); closeBlobSheet(); } };
    document.addEventListener("keydown", sheetKeys, true);
    wrap.addEventListener("click", function (ev) {
      if (ev.target.closest("[data-close]")) { closeBlobSheet(); return; }
      var tier = ev.target.closest("[data-tier]");
      if (tier) {
        guideTier = tier.getAttribute("data-tier");
        wrap.querySelectorAll("[data-tier]").forEach(function (b) { var on = b === tier; b.classList.toggle("on", on); b.setAttribute("aria-selected", on); });
        wrap.querySelectorAll("[data-tier-panel]").forEach(function (p) { p.hidden = p.getAttribute("data-tier-panel") !== guideTier; });
        return;
      }
      var b = ev.target.closest("[data-sheet]");
      if (!b) return;
      var act = b.getAttribute("data-sheet");
      if (act === "add") { closeBlobSheet(); onAdd(it); }
      else if (act === "retry") load();
      else if (act === "open") { closeBlobSheet(); SQUI.go("hobby", { id: it.id }); }
    });
  }
  function addBlobHobby(it) {
    var id = it.catalog ? it.id : (it.id || SQ.addCustomHobby(it.name, it.category));
    if (SQ.isTracked(id)) return { id: id, reward: null };
    var reward = SQ.addHobby(id, { goal: 2, viaStarter: !!it.catalog });
    finishOnboarding();
    return { id: id, reward: reward };
  }

  SQUI.register("discover", {
    tab: "discover", title: "Discover",
    render: function () {
      if (blobOpen === "search" && !blobSearch) blobOpen = null;
      return '<div class="screen dc-discover-home bl-discover" data-dc="discover-blobs">' +
        '<header class="bl-head"><h1 class="h2">Discover</h1>' +
        '<label class="dc-search bl-searchbox"><span class="dc-search-ic" aria-hidden="true">' + SQUI.icon("search", 18) + "</span>" +
        '<input type="search" class="dc-input" data-role="discover-search" placeholder="Search hobbies" aria-label="Search hobbies" autocomplete="off" value="' + e(blobSearch) + '"></label></header>' +
        '<div class="bl-bar"><button type="button" class="btn ghost sm bl-back" data-action="blob-close"' + (blobOpen ? "" : " hidden") + ">" +
        SQUI.icon("chevron-left", 18) + "<span>All blobs</span></button>" +
        '<span class="bl-title" data-role="blob-title" aria-live="polite">' + e(blobTitle()) + "</span></div>" +
        stageHtml() + "</div>";
    },
    mount: function (root) {
      var justDragged = false;
      var host = bind(root, "[data-dc]", common({
        "blob-open": function (t) {
          var cat = t.getAttribute("data-cat");
          setOpen(blobOpen === cat && cat !== "mine" ? null : cat);
        },
        "blob-close": function () { if (blobSearch) { blobSearch = ""; search.value = ""; } setOpen(null); },
        "blob-hobby": function (t) {
          if (justDragged) { justDragged = false; return; }
          var key = t.getAttribute("data-key"), id = t.getAttribute("data-id");
          if (t.getAttribute("data-mine") === "1" && (!key || !blobItem(key))) { SQUI.go("hobby", { id: id }); return; }
          openBlobSheet(key, id, function (item) { dropIntoMine(t, item, null); });
        }
      }));
      var search = host.querySelector('[data-role="discover-search"]');
      function stage() { return host.querySelector('[data-role="stage"]'); }
      function setOpen(view) {
        blobOpen = view;
        var st = stage();
        st.className = "bl-stage" + (view ? " has-open open-" + view : "");
        st.querySelectorAll(".bl-blob").forEach(function (b) {
          var id = b.getAttribute("data-cat"), on = id === view;
          b.classList.toggle("is-open", on);
          var face = b.querySelector("button.bl-face");
          if (face) face.setAttribute("aria-expanded", on);
          var inner = b.querySelector('[data-role="bubbles"]');
          if (on) inner.innerHTML = bubblesFor(id);
          else if (inner.innerHTML) setTimeout(function () { if (!b.classList.contains("is-open")) inner.innerHTML = ""; }, 420);
        });
        if (view === "search") st.querySelector(".bl-search .bl-label").textContent = "“" + blobSearch + "”";
        host.querySelector(".bl-back").hidden = !view;
        host.querySelector('[data-role="blob-title"]').textContent = blobTitle();
      }
      function refreshMine() {
        var items = mineItems(), m = stage().querySelector(".bl-mine");
        m.classList.toggle("is-empty", !items.length);
        m.querySelector('[data-role="mine-count"]').textContent = items.length ? items.length : "Empty";
        m.querySelector(".bl-seeds").innerHTML = seedIcons(items);
        m.querySelector("button.bl-face").setAttribute("aria-label", "My hobbies, " + items.length);
      }
      function gulp() {
        var m = stage().querySelector(".bl-mine");
        m.classList.remove("got-one"); void m.offsetWidth; m.classList.add("got-one");
      }
      function afterAdd(item, res) {
        refreshMine(); gulp();
        var open = stage().querySelector(".bl-blob.is-open [data-role=bubbles]");
        if (open && blobOpen) open.innerHTML = bubblesFor(blobOpen);
        SQUI.toast(item.name + " added to My hobbies");
        if (res.reward && res.reward.newAchievements && res.reward.newAchievements.length) SQUI.showReward(res.reward, { title: item.name + " is in your blob" });
      }
      // Button path (no drag): fly a copy of the bubble into the blob.
      function dropIntoMine(bubble, item) {
        var res = addBlobHobby(item);
        var target = stage().querySelector(".bl-mine .bl-face");
        var dot = bubble && bubble.isConnected && bubble.querySelector(".bl-hobby-dot");
        var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        if (reduce || !dot || !target) { afterAdd(item, res); return; }
        var a = dot.getBoundingClientRect(), b = target.getBoundingClientRect();
        var fly = ghostFor(item, a);
        requestAnimationFrame(function () {
          fly.style.transition = "transform .55s cubic-bezier(.5,0,.3,1), opacity .55s ease-in";
          fly.style.transform = "translate(" + (b.left + b.width / 2 - a.left - a.width / 2) + "px," + (b.top + b.height / 2 - a.top - a.height / 2) + "px) scale(.4)";
          fly.style.opacity = ".15";
        });
        setTimeout(function () { fly.remove(); afterAdd(item, res); }, 560);
      }
      function ghostFor(item, rect) {
        var g = document.createElement("span");
        g.className = "bl-orb bl-ghost";
        g.innerHTML = itemIcon(item, 28);
        g.style.left = rect.left + "px"; g.style.top = rect.top + "px"; g.style.width = rect.width + "px"; g.style.height = rect.height + "px";
        var src = stage().querySelector(".bl-blob.is-open");
        if (src) g.style.setProperty("--tint", getComputedStyle(src).getPropertyValue("--tint"));
        document.body.appendChild(g);
        return g;
      }
      // Drag a hobby bubble into the My hobbies blob to add it.
      var drag = null;
      function overMine(x, y) {
        var r = stage().querySelector(".bl-mine").getBoundingClientRect();
        var cx = r.left + r.width / 2, cy = r.top + r.height / 2;
        var nx = (x - cx) / (r.width / 2 + 28), ny = (y - cy) / (r.height / 2 + 28);
        return nx * nx + ny * ny <= 1;
      }
      host.addEventListener("pointerdown", function (ev) {
        var t = ev.target.closest(".bl-hobby.can-drag");
        if (!t || ev.button > 0) return;
        drag = { el: t, id: ev.pointerId, x0: ev.clientX, y0: ev.clientY, on: false, ghost: null };
      });
      host.addEventListener("pointermove", function (ev) {
        if (!drag || ev.pointerId !== drag.id) return;
        var dx = ev.clientX - drag.x0, dy = ev.clientY - drag.y0;
        if (!drag.on) {
          if (dx * dx + dy * dy < 64) return;
          drag.on = true;
          var item = blobItem(drag.el.getAttribute("data-key"));
          if (!item) { drag = null; return; }
          drag.item = item;
          drag.rect = drag.el.querySelector(".bl-hobby-dot").getBoundingClientRect();
          drag.ghost = ghostFor(item, drag.rect);
          drag.ghost.classList.add("is-dragging");
          drag.el.classList.add("is-lifted");
          stage().classList.add("is-dragging");
          try { drag.el.setPointerCapture(ev.pointerId); } catch (x) { /* ignore */ }
        }
        ev.preventDefault();
        drag.ghost.style.transform = "translate(" + dx + "px," + dy + "px) scale(1.12)";
        var hot = overMine(ev.clientX, ev.clientY);
        if (hot !== drag.hot) { drag.hot = hot; stage().querySelector(".bl-mine").classList.toggle("is-target", hot); }
      });
      function endDrag(ev, cancelled) {
        if (!drag || ev.pointerId !== drag.id) return;
        var d = drag; drag = null;
        if (!d.on) return;
        justDragged = true; setTimeout(function () { justDragged = false; }, 50);
        stage().classList.remove("is-dragging");
        var mineEl = stage().querySelector(".bl-mine");
        mineEl.classList.remove("is-target");
        if (!cancelled && overMine(ev.clientX, ev.clientY)) {
          var res = addBlobHobby(d.item);
          var r = mineEl.querySelector(".bl-face").getBoundingClientRect();
          d.ghost.style.transition = "transform .3s cubic-bezier(.5,0,.3,1), opacity .3s ease-in";
          d.ghost.style.transform = "translate(" + (r.left + r.width / 2 - d.rect.left - d.rect.width / 2) + "px," + (r.top + r.height / 2 - d.rect.top - d.rect.height / 2) + "px) scale(.3)";
          d.ghost.style.opacity = "0";
          setTimeout(function () { d.ghost.remove(); afterAdd(d.item, res); }, 300);
        } else {
          d.ghost.style.transition = "transform .35s cubic-bezier(.3,1.4,.5,1)";
          d.ghost.style.transform = "translate(0,0) scale(1)";
          setTimeout(function () { d.ghost.remove(); d.el.classList.remove("is-lifted"); }, 350);
        }
      }
      host.addEventListener("pointerup", function (ev) { endDrag(ev, false); });
      host.addEventListener("pointercancel", function (ev) { endDrag(ev, true); });
      host.addEventListener("dragstart", function (ev) { if (ev.target.closest && ev.target.closest(".bl-hobby")) ev.preventDefault(); });

      search.addEventListener("input", function () {
        blobSearch = search.value.replace(/\s+/g, " ").trim().slice(0, 60);
        if (blobSearch) {
          if (blobOpen !== "search") setOpen("search");
          else {
            stage().querySelector('.bl-search [data-role="bubbles"]').innerHTML = bubblesFor("search");
            stage().querySelector(".bl-search .bl-label").textContent = "“" + blobSearch + "”";
          }
        } else if (blobOpen === "search") setOpen(null);
      });
    }
  });
})();
