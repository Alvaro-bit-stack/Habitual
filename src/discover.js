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
  // ---------- current hobbies: one question at a time ----------
  // 1. "What hobbies do you already do?" Type a hobby, pick your level, add another or skip.
  // 2. First run only: "Want to start a new hobby?" Yes opens Discover, No opens Today.
  var LEVELS = [
    ["beginner", "Beginner", "Know the basics"],
    ["intermediate", "Intermediate", "Comfortable, still improving"],
    ["advanced", "Advanced", "Years in, chasing hard skills"]
  ];
  var OB = null; // { list: [{name, tier}], tier, step }
  function resolveHobby(name) {
    var q = name.toLowerCase().replace(/\s+/g, " ").trim();
    var list = catalog();
    var hit = list.filter(function (h) { return h.name.toLowerCase() === q || h.id === q; })[0] ||
      list.filter(function (h) { return q.indexOf(h.id) >= 0 || h.name.toLowerCase().indexOf(q) >= 0 && q.length >= 4; })[0];
    if (hit) return hit.id;
    var extraKey = null;
    for (var k in EXTRA) if (EXTRA[k].name.toLowerCase() === q || k === q) extraKey = k;
    var label = extraKey ? EXTRA[extraKey].name : titleCase(name.replace(/\s+/g, " ").trim()).slice(0, 40);
    var cat = extraKey ? EXTRA[extraKey].category : "creative";
    return SQ.addCustomHobby(label, cat);
  }
  function obLevelSeg(sel) {
    return '<div class="ob-levels" role="radiogroup" aria-label="Your level">' + LEVELS.map(function (l) {
      var on = l[0] === sel;
      return '<button type="button" role="radio" class="ob-level' + (on ? " on" : "") + '" aria-checked="' + on + '" data-action="ob-level" data-tier="' + l[0] + '">' +
        '<span class="ob-level-t">' + l[1] + '</span><span class="ob-level-s">' + l[2] + "</span></button>";
    }).join("") + "</div>";
  }
  // Which built-in or known hobby a typed name means, without creating anything yet.
  function previewHobby(name) {
    var q = name.toLowerCase().replace(/\s+/g, " ").trim();
    var hit = catalog().filter(function (h) { return h.name.toLowerCase() === q || h.id === q; })[0] ||
      catalog().filter(function (h) { return q.indexOf(h.id) >= 0 || h.name.toLowerCase().indexOf(q) >= 0 && q.length >= 4; })[0];
    if (hit) return { id: hit.id, name: hit.name, category: hit.category };
    for (var k in EXTRA) if (EXTRA[k].name.toLowerCase() === q || k === q) return { id: null, name: EXTRA[k].name, category: EXTRA[k].category };
    return { id: null, name: titleCase(name.replace(/\s+/g, " ").trim()).slice(0, 40), category: "creative" };
  }
  // First run: splash, pick a guide character, a short intro, then five questions the guide asks.
  var splashTimer = null;
  var FIRST_RUN_STEPS = ["splash", "character", "intro", "name", "email", "location", "hobbies", "next"];
  var QUESTION_STEPS = ["name", "email", "location", "hobbies", "next"];
  var GUIDES = ["adrian", "avatar1"]; // shown as "Option 1" / "Option 2"
  function guideId() {
    var c = SQ.state && SQ.state.user && SQ.state.user.character;
    return GUIDES.indexOf(c) >= 0 || c ? c : GUIDES[0];
  }
  function mii(id, size, cls) {
    return '<span class="cm-mii ' + (cls || "") + '" data-character="' + e(id) + '" style="--mii-size:' + size + 'px" aria-hidden="true"></span>';
  }
  function guideSays(text, big) {
    return '<div class="ob-guide' + (big ? " is-big" : "") + '">' + mii(guideId(), big ? 170 : 118, "ob-guide-mii") +
      '<div class="ob-say" role="heading" aria-level="1">' + text + "</div></div>";
  }
  function progressRing(step) {
    var i = QUESTION_STEPS.indexOf(step);
    if (i < 0 || onboarded()) return "";
    var frac = (i + 1) / QUESTION_STEPS.length, c = 2 * Math.PI * 13;
    return '<span class="ob-ring" role="progressbar" aria-label="Question ' + (i + 1) + " of " + QUESTION_STEPS.length + '" aria-valuemin="1" aria-valuemax="' + QUESTION_STEPS.length + '" aria-valuenow="' + (i + 1) + '">' +
      '<svg viewBox="0 0 32 32" width="32" height="32"><circle cx="16" cy="16" r="13" class="ob-ring-bg"/><circle cx="16" cy="16" r="13" class="ob-ring-fg" stroke-dasharray="' +
      (c * frac).toFixed(1) + " " + c.toFixed(1) + '"/></svg></span>';
  }
  function obShell(step, inner, cta) {
    var canBack = onboarded() || FIRST_RUN_STEPS.indexOf(step) > 1;
    return '<div class="screen ob" data-dc="onboard" data-step="' + step + '"><div class="stack-lg">' +
      ((canBack || progressRing(step)) ? '<div class="ob-top">' + (canBack ? backBtn() : "") + progressRing(step) + "</div>" : "") +
      inner + "</div>" + (cta ? '<div class="dc-cta ob-cta">' + cta + "</div>" : "") + "</div>";
  }
  function obQuestion(step, say, fields, cta) {
    return obShell(step, guideSays(say) +
      '<form class="stack ob-q" data-role="ob-q" novalidate>' + fields + '<p class="small dc-err" data-role="ob-err" hidden></p>' +
      '<button type="submit" class="btn primary block ob-go">' + (cta || "Continue") + "</button></form>", "");
  }
  function splashStep() {
    return '<div class="screen ob-splash" data-dc="onboard" data-step="splash"><button type="button" class="ob-splash-hit" data-action="ob-splash" aria-label="Start">' +
      '<span class="ob-splash-art" aria-hidden="true"><span class="ob-trail"></span>' + mii(guideId(), 180, "ob-flyer") + "</span>" +
      '<span class="ob-wordmark">Habitual</span><span class="ob-tagline">Trade the scroll for something you love</span></button></div>';
  }
  function characterStep() {
    var cur = SQ.state.user.character;
    return obShell("character", '<header class="ob-head ob-center"><h1 class="h1">Choose your character</h1><p class="muted">They’ll guide you through setup and cheer you on.</p></header>' +
      '<div class="ob-options" role="radiogroup" aria-label="Character">' + GUIDES.map(function (id, i) {
        var on = cur === id;
        return '<button type="button" role="radio" aria-checked="' + on + '" class="ob-option' + (on ? " on" : "") + '" data-action="ob-char" data-id="' + id + '">' +
          mii(id, 150) + '<span class="ob-option-label">Option ' + (i + 1) + "</span></button>";
      }).join("") + "</div>",
      '<button type="button" class="btn primary block ob-go" data-action="ob-char-go"' + (GUIDES.indexOf(cur) >= 0 ? "" : " disabled") + ">Continue</button>");
  }
  function introStep() {
    return obShell("intro", '<div class="ob-intro">' + '<div class="ob-say ob-say-up" role="heading" aria-level="1">Just <strong>5 quick questions</strong> and you’ll be ready for your next hobby!</div>' +
      mii(guideId(), 190, "ob-guide-mii ob-wave") + "</div>",
      '<button type="button" class="btn primary block ob-go" data-action="ob-intro-go">Continue</button>');
  }
  function profileStep(step) {
    var u = (SQ.state && SQ.state.user) || {};
    if (step === "name") {
      var nm = u.name && u.name !== "You" ? u.name : "";
      return obQuestion(step, "How would you like us to call you?",
        '<label class="dc-field"><span class="sr-only">Name</span><input class="dc-input ob-big-input" name="name" maxlength="40" autocomplete="name" placeholder="Your name" value="' + e(nm) + '"></label>');
    }
    var first = String(u.name || "").split(" ")[0];
    if (step === "email") {
      return obQuestion(step, "Nice to meet you" + (first ? ", " + e(first) : "") + "! What’s your email?",
        '<label class="dc-field"><span class="sr-only">Email</span><input class="dc-input ob-big-input" name="email" type="email" inputmode="email" maxlength="120" autocomplete="email" placeholder="you@example.com" value="' + e(u.email || "") + '"></label>' +
        '<p class="small muted ob-note">Used for your account. Never shown to other people.</p>');
    }
    var loc = u.location || {};
    return obQuestion(step, "Where are you based? I’ll find events and groups near you.",
      '<div class="ob-two"><label class="dc-field"><span class="small muted">City</span><input class="dc-input" name="city" maxlength="60" autocomplete="address-level2" placeholder="e.g. Newark" value="' + e(loc.city || "") + '"></label>' +
      '<label class="dc-field"><span class="small muted">Country</span><input class="dc-input" name="country" maxlength="60" autocomplete="country-name" placeholder="e.g. United States" value="' + e(loc.country || "") + '"></label></div>');
  }
  function saveProfile(step, form) {
    var f = new FormData(form), u = SQ.state.user;
    function clean(v, n) { return String(v || "").replace(/\s+/g, " ").trim().slice(0, n); }
    if (step === "name") {
      var name = clean(f.get("name"), 40);
      if (!name) return "Type your name to continue.";
      u.name = name;
    } else if (step === "email") {
      var email = clean(f.get("email"), 120).toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return "Enter a valid email, like you@example.com.";
      u.email = email;
    } else {
      var city = clean(f.get("city"), 60), country = clean(f.get("country"), 60);
      if (!city || !country) return "Add both your city and country.";
      u.location = { city: city, country: country };
    }
    SQ.save();
    return "";
  }
  // Hobbies the user adds sit as glossy icons on top of the My hobbies bubble.
  function obBubble() {
    var n = OB.list.length, spots = bubbleSpots(n);
    var badges = OB.list.map(function (it, i) {
      var p = previewHobby(it.name), lv = LEVELS.filter(function (l) { return l[0] === it.tier; })[0];
      return '<div class="ob-badge' + (i === OB.fresh ? " is-new" : "") + '" style="--hx:' + spots[i].x.toFixed(1) + "%;--hy:" + spots[i].y.toFixed(1) + '%">' +
        '<span class="ob-badge-icon">' + SQUI.hobbyBadge(p.id, p) + "</span>" +
        '<span class="ob-badge-name">' + e(p.name) + '</span><span class="ob-badge-lv">' + e(lv ? lv[1] : "") + "</span>" +
        '<button type="button" class="ob-badge-x" data-action="ob-remove" data-i="' + i + '" aria-label="Remove ' + e(p.name) + '">' + SQUI.icon("close", 14) + "</button></div>";
    }).join("");
    return '<div class="ob-stage">' +
      '<div class="ob-bubble' + (n ? " has-items" : "") + '" aria-label="My hobbies, ' + n + '"><span class="ob-bubble-label">' + svgIcon(CAT_ICON.mine, 18, 1.8) + "<span>My hobbies</span></span>" +
      (n ? "" : '<span class="ob-bubble-empty">Add a hobby below and it lands here</span>') + badges + "</div></div>";
  }
  function obHobbiesStep() {
    var first = !onboarded(), n = OB.list.length;
    var inner = (first ? guideSays("What hobbies do you already do? Add each one with your level.")
      : '<header class="ob-head"><div class="eyebrow">Your hobbies</div><h1 class="h1">What hobbies do you already do?</h1><p class="muted">Add each one with your level.</p></header>') +
      obBubble() +
      '<form class="card ob-form stack" data-role="ob-form" novalidate>' +
      '<label class="dc-field"><span class="small muted">Hobby</span><input class="dc-input" data-role="ob-name" maxlength="40" placeholder="e.g. Guitar" autocomplete="off" enterkeyhint="done"></label>' +
      '<div class="stack"><span class="small muted">Your level</span>' + obLevelSeg(OB.tier) + "</div>" +
      '<p class="small dc-err" data-role="ob-err" hidden></p>' +
      '<button type="submit" class="btn block">' + SQUI.icon("plus", 18) + (n ? "Add another hobby" : "Add hobby") + "</button></form>";
    var cta = n ? '<button type="button" class="btn primary block" data-action="ob-continue">Continue with ' + n + " " + (n === 1 ? "hobby" : "hobbies") + "</button>"
      : '<button type="button" class="btn block" data-action="ob-continue">' + (first ? "I don’t have any yet, skip" : "Cancel") + "</button>";
    return obShell("hobbies", inner, cta);
  }
  function obNextStep() {
    var n = ((SQ.state && SQ.state.tracked) || []).length;
    return obShell("next", guideSays((n ? "You’re all set! " : "No problem! ") + "Want to start a new hobby?") +
      '<div class="stack ob-choices">' +
      '<button type="button" class="card tap dc-choice" data-action="ob-yes"><span class="dc-choice-ic" aria-hidden="true">' + SQUI.icon("compass", 26) + "</span>" +
      '<span class="dc-choice-text"><span class="dc-choice-title">Yes, show me hobbies</span><span class="dc-choice-sub">Explore by category in Discover</span></span>' +
      '<span class="dc-chev" aria-hidden="true">' + SQUI.icon("chevron-right", 20) + "</span></button>" +
      '<button type="button" class="card tap dc-choice" data-action="ob-no"><span class="dc-choice-ic" aria-hidden="true">' + SQUI.icon("sun", 26) + "</span>" +
      '<span class="dc-choice-text"><span class="dc-choice-title">Not now</span><span class="dc-choice-sub">' + (n ? "Go to Today and start on your tasks" : "Go to Today") + "</span></span>" +
      '<span class="dc-chev" aria-hidden="true">' + SQUI.icon("chevron-right", 20) + "</span></button></div>", "");
  }
  SQUI.register("pick", {
    get tab() { return null; }, title: "Your hobbies",
    render: function (params) {
      var step = (params && params.step) || (onboarded() ? "hobbies" : "splash");
      if (step === "splash") return splashStep();
      if (step === "character") return characterStep();
      if (step === "intro") return introStep();
      if (step === "next") return obNextStep();
      if (step !== "hobbies") return profileStep(step);
      if (!OB) OB = { list: [], tier: "beginner", fresh: -1 };
      return obHobbiesStep();
    },
    mount: function (root, params) {
      var step = (params && params.step) || (onboarded() ? "hobbies" : "splash");
      var idx = FIRST_RUN_STEPS.indexOf(step);
      function goStep(next) { SQUI.go("pick", { step: next }, { replace: true }); }
      var host = bind(root, "[data-dc]", common({
        back: function () {
          if (!onboarded() && idx > 1) { goStep(FIRST_RUN_STEPS[idx - 1]); return; }
          OB = null; SQUI.back();
        },
        "ob-splash": function () { if (splashTimer) { clearTimeout(splashTimer); splashTimer = null; } goStep("character"); },
        "ob-char": function (t) {
          SQ.state.user.character = t.getAttribute("data-id"); SQ.save();
          host.querySelectorAll(".ob-option").forEach(function (b) { var on = b === t; b.classList.toggle("on", on); b.setAttribute("aria-checked", on); });
          var go = host.querySelector('[data-action="ob-char-go"]'); if (go) go.disabled = false;
        },
        "ob-char-go": function () { goStep("intro"); },
        "ob-intro-go": function () { goStep("name"); },
        "ob-level": function (t) {
          OB.tier = t.getAttribute("data-tier");
          host.querySelectorAll(".ob-level").forEach(function (b) { var on = b === t; b.classList.toggle("on", on); b.setAttribute("aria-checked", on); });
        },
        "ob-remove": function (t) { OB.list.splice(Number(t.getAttribute("data-i")), 1); OB.fresh = -1; SQUI.refresh(); },
        "ob-continue": function () {
          var first = !onboarded();
          var rewards = [];
          OB.list.forEach(function (it) {
            var id = resolveHobby(it.name);
            if (!id) return;
            if (!SQ.isTracked(id)) rewards.push(SQ.addHobby(id, { goal: it.tier === "advanced" ? 4 : it.tier === "intermediate" ? 3 : 2 }));
            SQ.setSkill(id, it.tier);
            ensureTasks(id, SQ.getHobby(id) ? SQ.getHobby(id).name : it.name, it.tier);
          });
          finishOnboarding();
          OB = null;
          var r = mergeRewards(rewards.filter(Boolean));
          if (first) SQUI.go("pick", { step: "next" }, { reset: true });
          else SQUI.go("today", {}, { replace: true });
          if (r) SQUI.showReward(r, { title: "You're on the board" });
        },
        "ob-yes": function () { OB = null; SQUI.go("discover", {}, { reset: true }); },
        "ob-no": function () { OB = null; SQUI.go("today", {}, { reset: true }); }
      }));
      if (step === "splash") {
        splashTimer = setTimeout(function () {
          splashTimer = null;
          var cur = SQUI.current && SQUI.current();
          if (cur && cur.name === "pick" && (!cur.params || !cur.params.step || cur.params.step === "splash")) goStep("character");
        }, 1800);
        return;
      }
      var q = host.querySelector('[data-role="ob-q"]');
      if (q) {
        var firstInput = q.querySelector("input");
        if (firstInput) try { firstInput.focus({ preventScroll: true }); } catch (x) { /* ignore */ }
        q.addEventListener("submit", function (ev) {
          ev.preventDefault();
          var msg = saveProfile(step, q), err = q.querySelector('[data-role="ob-err"]');
          if (msg) { err.hidden = false; err.textContent = msg; return; }
          SQUI.go("pick", { step: FIRST_RUN_STEPS[idx + 1] }, { replace: true });
        });
        return;
      }
      var form = host.querySelector('[data-role="ob-form"]');
      if (!form) return;
      var input = form.querySelector('[data-role="ob-name"]');
      form.addEventListener("submit", function (ev) {
        ev.preventDefault();
        var name = (input.value || "").replace(/\s+/g, " ").trim().slice(0, 40);
        var err = form.querySelector('[data-role="ob-err"]');
        if (!name) { err.hidden = false; err.textContent = "Type a hobby first."; input.focus(); return; }
        var label = previewHobby(name).name.toLowerCase();
        if (OB.list.some(function (x) { return previewHobby(x.name).name.toLowerCase() === label; })) { err.hidden = false; err.textContent = "You already added " + name + "."; return; }
        OB.list.push({ name: name, tier: OB.tier });
        OB.fresh = OB.list.length - 1;
        SQUI.refresh();
        var again = document.querySelector('[data-role="ob-name"]');
        if (again) try { again.focus({ preventScroll: true }); } catch (x) { /* ignore */ }
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
  // Same glossy icons as the Today hobby cards.
  function itemIcon(it, size) {
    if (SQUI.hobbyBadge) return SQUI.hobbyBadge(it.id || it.key, { name: it.name, category: it.category });
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
      '<div class="bl-field">' + BLOB_CATS.map(catBlob).join("") + searchBlob() + mineBlob() + "</div></div>";
  }

  // ---------- Gemini hobby guide ----------
  // Beginner: a crash course (5 YouTube videos), a budget and a premium starter kit, and tasks.
  // Intermediate / advanced: tasks only. Guides are cached per hobby and level for a week.
  var GUIDE_KEY = "habitual.hobbyGuides.v3", GUIDE_TTL = 7 * 24 * 60 * 60 * 1000;
  var GUIDE_LEVELS = [["beginner", "Beginner"], ["intermediate", "Intermediate"], ["advanced", "Advanced"]];
  function guideLevel(tier) { return tier === "intermediate" || tier === "advanced" ? tier : "beginner"; }
  function guideKey(name, level) { return name.toLowerCase() + "|" + guideLevel(level); }
  var guidePending = {};
  function guideStore() {
    try { return JSON.parse(localStorage.getItem(GUIDE_KEY) || "{}") || {}; } catch (x) { return {}; }
  }
  function cachedGuide(name, level) {
    var row = guideStore()[guideKey(name, level)];
    return row && row.at && Date.now() - row.at < GUIDE_TTL ? row.guide : null;
  }
  function saveGuide(name, level, guide) {
    try {
      var all = guideStore(), keys = Object.keys(all);
      if (keys.length > 30) keys.sort(function (a, b) { return all[a].at - all[b].at; }).slice(0, keys.length - 30).forEach(function (k) { delete all[k]; });
      all[guideKey(name, level)] = { at: Date.now(), guide: guide };
      localStorage.setItem(GUIDE_KEY, JSON.stringify(all));
    } catch (x) { /* storage optional */ }
  }
  function fetchGuide(name, level) {
    level = guideLevel(level);
    var hit = cachedGuide(name, level);
    if (hit) return Promise.resolve(hit);
    if (location.protocol === "file:" || location.hostname.indexOf("claude") >= 0) {
      var off = new Error("offline"); off.offline = true; return Promise.reject(off);
    }
    var k = guideKey(name, level);
    if (!guidePending[k]) {
      guidePending[k] = fetch("/api/hobby-guide", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ hobby: name, level: level, location: "United States", currency: "USD" }) })
        .then(function (res) {
          return res.json().catch(function () { return {}; }).then(function (body) {
            if (!res.ok) { var err = new Error(body.error || "Guide request failed."); err.offline = res.status === 404 || !body.error; throw err; }
            return body;
          });
        }, function () { var err = new Error("offline"); err.offline = true; throw err; })
        .then(function (g) { saveGuide(name, level, g); return g; })
        .finally(function () { delete guidePending[k]; });
    }
    return guidePending[k];
  }
  var guideTier = "budget";
  // Researched tasks become the hobby's tasks on Today when it is tracked at that level.
  function applyGuideTasks(id, level, g) {
    if (!id || !g || !(g.tasks || []).length || !SQ.setSkillTasks) return;
    SQ.setSkillTasks(id, guideLevel(level), g.tasks.map(function (t) { return { label: t.title, minutes: t.minutes, why: t.why }; }));
  }
  function ensureTasks(id, name, level) {
    fetchGuide(name, level).then(function (g) { applyGuideTasks(id, level, g); if (SQUI.current && SQUI.current().name === "today") SQUI.refresh(); }, function () { /* tasks fall back to built-in ones */ });
  }
  function usd(n) { return n ? "$" + Number(n).toLocaleString() : ""; }
  var KITS = [["budget", "Budget", "The cheapest sensible way to start"], ["premium", "Premium", "A more premium start with gear that lasts"]];
  function verifyBadge(p) {
    var n = p.sourceCount || 0;
    if (p.verified) return '<span class="kit-badge is-verified">' + SQUI.icon("check", 13) + "Cross-verified · " + n + " sites</span>";
    return '<span class="kit-badge">' + (n ? "1 source" : "No sources confirmed") + "</span>";
  }
  function sourceList(p) {
    var list = p.sources || [];
    if (!list.length) return "";
    return '<details class="kit-sources"><summary>Sources (' + list.length + ")</summary><ul>" + list.map(function (src) {
      return '<li><span class="kit-src-ic" aria-hidden="true">' + SQUI.icon("check", 12) + '</span><a href="' + e(src.url) + '" target="_blank" rel="noopener noreferrer">' +
        "<strong>" + e(src.site) + "</strong> " + e(src.title && src.title !== src.site ? src.title : "") + "</a>" +
        '<span class="small muted">' + (src.how === "page" ? "Names this product" : "Found by Gemini search") + "</span></li>";
    }).join("") + "</ul></details>";
  }
  function productCard(p) {
    var name = (p.brand && p.name.indexOf(p.brand) < 0 ? p.brand + " " : "") + p.name;
    var buy = p.buyUrl || p.url;
    var buyLabel = p.linkType === "product" || (p.url && !p.linkType) ? "View at " + (p.retailer || "store") : "Find it online";
    return '<article class="card kit-prod">' +
      '<div class="kit-prod-top"><strong class="kit-prod-name">' + e(name) + "</strong>" + (p.price ? '<span class="num kit-prod-price">' + e(usd(p.price)) + "</span>" : "") + "</div>" +
      (p.why ? '<p class="small muted kit-prod-why">' + e(p.why) + "</p>" : "") +
      '<div class="kit-prod-foot">' + verifyBadge(p) +
      (buy ? '<a class="btn sm kit-buy" href="' + e(buy) + '" target="_blank" rel="noopener noreferrer">' + e(buyLabel) + SQUI.icon("chevron-right", 16) + "</a>" : "") + "</div>" +
      sourceList(p) + "</article>";
  }
  function gearTiers(g) {
    var kits = KITS.filter(function (t) { return g.gear && g.gear[t[0]] && g.gear[t[0]].products.length; });
    if (!kits.length) return "";
    if (!kits.some(function (t) { return t[0] === guideTier; })) guideTier = kits[0][0];
    function total(t) { var k = g.gear[t[0]]; return k.total || k.products.reduce(function (n, p) { return n + (p.price || 0); }, 0); }
    return '<section class="stack kit"><div><h3 class="h3">Starter kit</h3><p class="small muted">Gemini read reviews, Reddit threads and forums and picked real products, so you don’t have to.</p></div>' +
      '<div class="seg kit-seg kit-seg-2" role="tablist" aria-label="Starter kit">' + kits.map(function (t) {
        var on = t[0] === guideTier;
        return '<button type="button" role="tab" class="' + (on ? "on" : "") + '" aria-selected="' + on + '" data-tier="' + t[0] + '"><span>' + t[1] + "</span>" +
          (total(t) ? '<span class="num kit-seg-total">' + e(usd(total(t))) + "</span>" : "") + "</button>";
      }).join("") + "</div>" +
      kits.map(function (t) {
        var k = g.gear[t[0]], ver = k.products.filter(function (p) { return p.verified; }).length;
        return '<div class="stack kit-panel" data-tier-panel="' + t[0] + '"' + (t[0] === guideTier ? "" : " hidden") + ">" +
          '<div class="kit-summary"><div><strong>' + e(t[1]) + " start</strong><span class=\"small muted\">" + e(t[2]) + "</span></div>" +
          (total(t) ? '<div class="kit-total"><span class="num">' + e(usd(total(t))) + '</span><span class="small muted">' + k.products.length + " item" + (k.products.length === 1 ? "" : "s") + "</span></div>" : "") + "</div>" +
          k.products.map(productCard).join("") +
          '<p class="small muted">' + ver + " of " + k.products.length + " pick" + (k.products.length === 1 ? "" : "s") + " cross-verified</p></div>";
      }).join("") +
      '<p class="small muted kit-note"><span class="kit-badge is-verified">' + SQUI.icon("check", 13) + "Cross-verified</span> means at least two independent sites (not the store) recommend that exact product. Prices change, so check before you buy.</p></section>";
  }
  function bindKitTabs(host) {
    if (!host || host.__kitTabs) return;
    host.__kitTabs = true;
    host.addEventListener("click", function (ev) {
      var tier = ev.target.closest && ev.target.closest("[data-tier]");
      if (!tier || !host.contains(tier)) return;
      guideTier = tier.getAttribute("data-tier");
      host.querySelectorAll("[data-tier]").forEach(function (b) { var on = b === tier; b.classList.toggle("on", on); b.setAttribute("aria-selected", on); });
      host.querySelectorAll("[data-tier-panel]").forEach(function (pn) { pn.hidden = pn.getAttribute("data-tier-panel") !== guideTier; });
    });
  }
  function videoCard(v) {
    return '<a class="card tap bl-video" href="' + e(v.url) + '" target="_blank" rel="noopener noreferrer">' +
      '<span class="bl-video-thumb"><img src="' + e(v.thumbnail) + '" alt="" loading="lazy"><span class="bl-video-play">' + SQUI.icon("play", 22) + "</span></span>" +
      '<span class="bl-video-text"><strong>' + e(v.title) + '</strong><span class="small muted">' + e(v.channel) + "</span>" +
      (v.whatYouLearn ? '<span class="small">' + e(v.whatYouLearn) + "</span>" : "") + "</span></a>";
  }
  function tasksSection(g) {
    var lv = guideLevel(g.level);
    var items = (g.tasks || []).map(function (t, i) {
      var srcs = (t.sources || []).map(function (src) {
        return '<a href="' + e(src.url) + '" target="_blank" rel="noopener noreferrer">' + e(src.site || src.title) + "</a>";
      }).join(" · ");
      return '<li class="dc-session plan-task"><span class="dc-session-n num" aria-hidden="true">' + (i + 1) + '</span><div class="dc-session-body">' +
        '<div class="plan-task-top"><span class="dc-row-name">' + e(t.title) + '</span><span class="num small muted">' + e(t.minutes) + " min</span></div>" +
        (t.details ? "<p>" + e(t.details) + "</p>" : "") +
        (t.why ? '<p class="small muted plan-why">' + e(t.why) + "</p>" : "") +
        (srcs ? '<p class="small plan-src">' + SQUI.icon("check", 12) + srcs + "</p>" : "") + "</div></li>";
    }).join("");
    if (!items) return "";
    return '<section class="stack"><div><h3 class="h3">Tasks for ' + (lv === "beginner" ? "beginners" : lv === "intermediate" ? "intermediate players" : "advanced players") + "</h3>" +
      '<p class="small muted">What people at this level say actually worked for them. These become your tasks on Today.</p></div><ol class="dc-sessions">' + items + "</ol></section>";
  }
  function crashCourse(g) {
    var vids = g.crashCourse || [];
    if (guideLevel(g.level) !== "beginner" || !vids.length) return "";
    return '<section class="stack"><div><h3 class="h3">Crash course: how to get started</h3><p class="small muted">' + vids.length + " beginner videos, in order.</p></div>" +
      '<div class="stack">' + vids.map(videoCard).join("") + "</div></section>";
  }
  function renderGuide(g) {
    var beginner = guideLevel(g.level) === "beginner";
    return (g.overview ? '<p class="bl-sheet-blurb">' + e(g.overview) + "</p>" : "") +
      (beginner ? crashCourse(g) + gearTiers(g) : "") + tasksSection(g);
  }
  function guideLoading() {
    return '<div class="card dc-ai-loading" role="status"><span class="dc-ai-spinner" aria-hidden="true"></span><div><div class="h3">Researching with Gemini</div>' +
      '<p class="small muted">Reading Reddit threads, forums and reviews and checking every source. This can take up to a minute.</p></div></div>';
  }
  function guideFallback(it, err, level) {
    if (guideLevel(level) !== "beginner") it = { gear: [] };
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

  // The hobby screen shows the same starter kit for hobbies you track.
  SQUI.hobbyPlan = function (host, id) {
    var h = SQ.getHobby(id);
    if (!host || !h) return;
    var sk = SQ.skill && SQ.skill(id), level = guideLevel(sk && sk.tier);
    bindKitTabs(host);
    host.innerHTML = guideLoading();
    fetchGuide(h.name, level).then(function (g) {
      if (sk && !(sk.tasks || []).length) applyGuideTasks(id, level, g);
      if (host.isConnected) host.innerHTML = renderGuide(g);
    }, function (err) {
      if (!host.isConnected) return;
      host.innerHTML = '<div class="card bl-guide-note" role="note"><div class="h3">' + (level === "beginner" ? "Crash course and starter kit" : "Your tasks") + '</div><p class="small muted">' +
        e(err && err.offline ? "These come from Gemini. Run Habitual with its server (node server.js) and a Gemini key to load them." : (err && err.message) || "Gemini could not finish the research. Try again in a moment.") + "</p></div>";
    });
  };

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
  var sheetLevel = "beginner";
  function levelPicker(level) {
    return '<div class="plan-level"><span class="small muted">Your level</span><div class="seg" role="radiogroup" aria-label="Your level">' + GUIDE_LEVELS.map(function (l) {
      var on = l[0] === level;
      return '<button type="button" role="radio" class="' + (on ? "on" : "") + '" aria-checked="' + on + '" data-level="' + l[0] + '">' + l[1] + "</button>";
    }).join("") + "</div></div>";
  }
  function openBlobSheet(key, id, onAdd) {
    closeBlobSheet();
    var it = (key && blobItem(key)) || mineItems().filter(function (m) { return m.id === id; })[0];
    if (!it) return;
    var mine = inMine(it);
    var have = it.id && SQ.skill && SQ.skill(it.id);
    if (have) sheetLevel = guideLevel(have.tier);
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
      levelPicker(sheetLevel) +
      '<div class="stack-lg" data-role="guide">' + guideLoading() + "</div>" +
      '<div class="bl-sheet-cta">' +
      (mine ? '<button type="button" class="btn primary block" data-sheet="open">' + SQUI.icon("check", 18) + " In My hobbies · Open tracker</button>"
        : '<p class="bl-drag-tip">' + svgIcon(CAT_ICON.mine, 16, 1.8) + "<span>Drag it into My hobbies to add it</span></p>" +
          '<button type="button" class="btn ghost block sm" data-sheet="add">Add without dragging</button>') +
      "</div></div>";
    (document.getElementById("overlay-root") || document.body).appendChild(wrap);
    var guideHost = wrap.querySelector('[data-role="guide"]');
    bindKitTabs(guideHost);
    function load() {
      guideHost.innerHTML = guideLoading();
      var level = sheetLevel;
      fetchGuide(it.name, level).then(function (g) {
        if (wrap.isConnected && level === sheetLevel) guideHost.innerHTML = renderGuide(g);
      }, function (err) {
        if (wrap.isConnected && level === sheetLevel) guideHost.innerHTML = guideFallback(it, err, level);
      });
    }
    if (!it.own) load(); else guideHost.innerHTML = "";
    var focusBtn = wrap.querySelector("[data-close].icon-btn");
    if (focusBtn) try { focusBtn.focus({ preventScroll: true }); } catch (x) { /* ignore */ }
    sheetKeys = function (ev) { if (ev.key === "Escape") { ev.stopPropagation(); closeBlobSheet(); } };
    document.addEventListener("keydown", sheetKeys, true);
    wrap.addEventListener("click", function (ev) {
      if (ev.target.closest("[data-close]")) { closeBlobSheet(); return; }
      if (ev.target.closest("[data-tier]")) return;
      var lv = ev.target.closest("[data-level]");
      if (lv) {
        sheetLevel = lv.getAttribute("data-level");
        wrap.querySelectorAll("[data-level]").forEach(function (x) { var on = x === lv; x.classList.toggle("on", on); x.setAttribute("aria-checked", on); });
        if (!it.own) load();
        return;
      }
      var b = ev.target.closest("[data-sheet]");
      if (!b) return;
      var act = b.getAttribute("data-sheet");
      if (act === "add") { closeBlobSheet(); it.level = sheetLevel; onAdd(it); }
      else if (act === "retry") load();
      else if (act === "open") { closeBlobSheet(); SQUI.go("hobby", { id: it.id }); }
    });
  }
  // Adding a hobby saves the level you picked (Beginner when dragged in) and loads that level's tasks.
  function addBlobHobby(it) {
    var id = it.catalog ? it.id : (it.id || SQ.addCustomHobby(it.name, it.category));
    if (SQ.isTracked(id)) return { id: id, reward: null };
    var reward = SQ.addHobby(id, { goal: 2, viaStarter: !!it.catalog });
    var level = guideLevel(it.level || "beginner");
    if (SQ.setSkill && !(SQ.skill(id) && SQ.skill(id).tier === level)) SQ.setSkill(id, level);
    ensureTasks(id, it.name, level);
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
      var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      // Burst a blob like a soap bubble: droplets fly out from its rim while it fades.
      function popBlob(b) {
        if (reduceMotion) return;
        var st = stage(), sr = st.getBoundingClientRect(), r = b.getBoundingClientRect();
        var cx = r.left - sr.left + r.width / 2, cy = r.top - sr.top + r.height / 2;
        var tint = getComputedStyle(b).getPropertyValue("--tint");
        for (var i = 0; i < 12; i++) {
          var a = (Math.PI * 2 * i) / 12 + Math.random() * .4;
          var d = document.createElement("i");
          d.className = "bl-drop";
          var size = 5 + Math.random() * 8;
          d.style.cssText = "left:" + (cx + Math.cos(a) * r.width / 2 - size / 2) + "px;top:" + (cy + Math.sin(a) * r.height / 2 - size / 2) + "px;width:" + size + "px;height:" + size +
            "px;--dx:" + (Math.cos(a) * (26 + Math.random() * 30)) + "px;--dy:" + (Math.sin(a) * (26 + Math.random() * 30)) + "px;--tint:" + tint;
          st.appendChild(d);
          setTimeout(function (el) { el.remove(); }.bind(null, d), 650);
        }
      }
      function setOpen(view) {
        var was = blobOpen;
        blobOpen = view;
        var st = stage();
        st.querySelectorAll(".bl-blob").forEach(function (b) {
          var id = b.getAttribute("data-cat");
          if (id === "mine" || id === "search") return;
          if (view && id !== view && !was) popBlob(b);
          if (!view && was) { b.classList.add("reform"); setTimeout(function () { b.classList.remove("reform"); }, 650); }
        });
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
