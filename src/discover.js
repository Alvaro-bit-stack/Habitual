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

  var HOBBY_EMOJI = {
    guitar: "🎸", soccer: "⚽", tennis: "🎾", painting: "🎨", photography: "📷",
    running: "👟", sewing: "🧵", journaling: "📓", piano: "🎹", basketball: "🏀"
  };
  var HOBBY_TOPIC = {
    soccer: "sports", tennis: "sports", running: "sports", basketball: "sports",
    guitar: "music", piano: "music",
    painting: "art", photography: "art", sewing: "art",
    journaling: "writing"
  };
  var TOPICS = {
    sports: { label: "Sports & movement", hint: "Active · group + solo" },
    music: { label: "Music", hint: "Practice · performance" },
    art: { label: "Art & making", hint: "Visual · hands-on" },
    writing: { label: "Writing & reading", hint: "Ideas · reflection" },
    creative: { label: "Creative things", hint: "Make · explore" },
    social: { label: "Group activities", hint: "Shared · social" },
    technical: { label: "Technical hobbies", hint: "Build · solve" },
    relaxing: { label: "Calm hobbies", hint: "Slow · reflective" }
  };
  function discoverTags(h) {
    return [
      h.place === "indoor" ? "Inside" : h.place === "outdoor" ? "Outside" : "Inside + outside",
      h.category === "active" ? "Active" : "Non-active",
      h.social === "group" ? "Group-centered" : h.social === "solo" ? "Solo" : "Solo or group"
    ];
  }
  function similarity(base, candidate) {
    var score = 0;
    if ((base.related || []).indexOf(candidate.id) >= 0) score += 6;
    if ((candidate.related || []).indexOf(base.id) >= 0) score += 4;
    if (topicFor(base) === topicFor(candidate)) score += 10;
    if (base.category && base.category === candidate.category) score += 2;
    if (base.place && (base.place === candidate.place || base.place === "either" || candidate.place === "either")) score += 1;
    if (base.social && (base.social === candidate.social || base.social === "either" || candidate.social === "either")) score += 2;
    return score;
  }
  function topicFor(h) {
    if (HOBBY_TOPIC[h.id]) return HOBBY_TOPIC[h.id];
    if (h.category === "active") return "sports";
    if (h.category === "social" || h.social === "group") return "social";
    if (h.category === "creative") return "creative";
    return TOPICS[h.category] ? h.category : "creative";
  }
  function ringPositions(count, rx, ry, offset) {
    var out = [];
    if (count === 1) return [{ x: 50, y: 50 }];
    for (var i = 0; i < count; i++) {
      var a = (offset == null ? -Math.PI / 2 : offset) + (Math.PI * 2 * i / count);
      out.push({ x: 50 + Math.cos(a) * rx, y: 50 + Math.sin(a) * ry });
    }
    return out;
  }
  function topicFrames(count) {
    if (count <= 1) return [{ x: 50, y: 50, rx: 43, ry: 41 }];
    if (count === 2) return [{ x: 27, y: 50, rx: 22, ry: 42 }, { x: 73, y: 50, rx: 22, ry: 42 }];
    if (count === 3) return [
      { x: 27, y: 28, rx: 22, ry: 24 }, { x: 73, y: 28, rx: 22, ry: 24 }, { x: 50, y: 74, rx: 25, ry: 22 }
    ];
    return [
      { x: 27, y: 27, rx: 22, ry: 23 }, { x: 73, y: 27, rx: 22, ry: 23 },
      { x: 27, y: 73, rx: 22, ry: 23 }, { x: 73, y: 73, rx: 22, ry: 23 }
    ];
  }
  function positionTopicNodes(group, frame, positions, labelAbove) {
    var current = group.nodes.filter(function (item) { return item.current; });
    var suggested = group.nodes.filter(function (item) { return !item.current; });
    var contentY = frame.y + frame.ry * .13;
    var currentPos = ringPositions(current.length, Math.min(8, frame.rx * .25), Math.min(8, frame.ry * .22), -Math.PI / 2);
    var suggestedPos = ringPositions(suggested.length, frame.rx * .58, frame.ry * .42, -Math.PI / 2);
    if (current.length === 1 && suggested.length) {
      currentPos = [{ x: 50, y: 50 + frame.ry * .05 }];
      if (suggested.length === 1) suggestedPos = [{ x: 50, y: 50 - frame.ry * .43 }];
      if (suggested.length === 2) suggestedPos = [
        { x: 50 - frame.rx * .48, y: 50 - frame.ry * .2 }, { x: 50 + frame.rx * .48, y: 50 - frame.ry * .2 }
      ];
      if (suggested.length === 3) suggestedPos = [
        { x: 50, y: 50 - frame.ry * .43 },
        { x: 50 - frame.rx * .53, y: 50 + frame.ry * .24 }, { x: 50 + frame.rx * .53, y: 50 + frame.ry * .24 }
      ];
      if (suggested.length === 4) suggestedPos = [
        { x: 50 - frame.rx * .5, y: 50 - frame.ry * .23 }, { x: 50 + frame.rx * .5, y: 50 - frame.ry * .23 },
        { x: 50 - frame.rx * .5, y: 50 + frame.ry * .34 }, { x: 50 + frame.rx * .5, y: 50 + frame.ry * .34 }
      ];
      suggested.forEach(function (item, i) { if (suggestedPos[i].y < 50) labelAbove[item.hobby.id] = true; });
    } else if (!current.length && suggested.length > 1) {
      labelAbove[suggested[0].hobby.id] = true;
    }
    current.forEach(function (item, i) {
      positions[item.hobby.id] = { x: frame.x + currentPos[i].x - 50, y: contentY + currentPos[i].y - 50 };
    });
    suggested.forEach(function (item, i) {
      positions[item.hobby.id] = { x: frame.x + suggestedPos[i].x - 50, y: contentY + suggestedPos[i].y - 50 };
    });
  }
  function discoverGraph() {
    var trackedIds = ((SQ.state && SQ.state.tracked) || []).map(function (t) { return t.hobbyId; });
    var current = trackedIds.map(function (id) { return SQ.getHobby(id); }).filter(Boolean);
    var available = catalog().filter(function (h) { return trackedIds.indexOf(h.id) < 0; });
    var suggestions = available.map(function (h) {
      var best = null, score = 0;
      current.forEach(function (base) { var n = similarity(base, h); if (n > score) { score = n; best = base.id; } });
      return { hobby: h, score: score, parent: best };
    }).filter(function (item) { return current.length ? item.score >= 4 : true; })
      .sort(function (a, b) { return b.score - a.score || a.hobby.name.localeCompare(b.hobby.name); });
    var initialIds = current.map(function (h) { return h.id; }).concat(suggestions.map(function (item) { return item.hobby.id; }));
    var all = current.slice();
    available.forEach(function (h) { if (!all.some(function (item) { return item.id === h.id; })) all.push(h); });
    var grouped = {};
    current.forEach(function (h) {
      var id = topicFor(h); grouped[id] = grouped[id] || { id: id, nodes: [] }; grouped[id].nodes.push({ hobby: h, current: true });
    });
    suggestions.forEach(function (item) {
      var id = topicFor(item.hobby); grouped[id] = grouped[id] || { id: id, nodes: [] }; grouped[id].nodes.push({ hobby: item.hobby, current: false });
    });
    var topicOrder = ["sports", "music", "art", "writing", "social", "creative", "technical", "relaxing"];
    var groups = Object.keys(grouped).map(function (id) { return grouped[id]; }).sort(function (a, b) {
      return topicOrder.indexOf(a.id) - topicOrder.indexOf(b.id);
    }).slice(0, 4);
    var frames = topicFrames(groups.length), positions = {}, labelAbove = {};
    groups.forEach(function (group, i) {
      group.frame = frames[i]; group.meta = TOPICS[group.id] || TOPICS.creative;
      positionTopicNodes(group, group.frame, positions, labelAbove);
    });
    initialIds = initialIds.filter(function (id) { return !!positions[id]; });
    return { current: current, suggestions: suggestions, all: all, initialIds: initialIds, positions: positions, groups: groups, labelAbove: labelAbove };
  }
  function discoverNode(h, graph) {
    var isCurrent = graph.current.some(function (item) { return item.id === h.id; });
    var shown = graph.initialIds.indexOf(h.id) >= 0;
    var p = graph.positions[h.id] || { x: 50, y: 50 };
    var tags = discoverTags(h).join(", ");
    return '<button type="button" class="dc-discover-node ' + (isCurrent ? "is-current" : "is-suggestion") + (graph.labelAbove[h.id] ? " label-above" : "") + '" data-action="discover-node" data-id="' + e(h.id) +
      '" data-name="' + e(h.name.toLowerCase()) + '" data-initial="' + (shown ? "1" : "0") + '" data-x="' + p.x.toFixed(2) + '" data-y="' + p.y.toFixed(2) +
      '" style="--node-x:' + p.x.toFixed(2) + '%;--node-y:' + p.y.toFixed(2) + '%" aria-label="' + e(h.name + ". " + tags) + '"' + (shown ? "" : " hidden") + '>' +
      '<span class="dc-node-dot" aria-hidden="true">' + e(HOBBY_EMOJI[h.id] || "✨") + '</span><span class="dc-node-name">' + e(h.name) + "</span></button>";
  }
  function discoverEdges(graph) {
    return graph.suggestions.map(function (item) {
      var a = graph.positions[item.parent], b = graph.positions[item.hobby.id];
      if (!a || !b) return "";
      return '<line x1="' + a.x.toFixed(2) + '" y1="' + a.y.toFixed(2) + '" x2="' + b.x.toFixed(2) + '" y2="' + b.y.toFixed(2) + '"></line>';
    }).join("");
  }
  function discoverTopicBubbles(graph) {
    return graph.groups.map(function (group) {
      var f = group.frame;
      return '<div class="dc-topic-bubble" data-topic="' + e(group.id) + '" style="--bubble-left:' + (f.x - f.rx).toFixed(2) + '%;--bubble-top:' + (f.y - f.ry).toFixed(2) +
        '%;--bubble-width:' + (f.rx * 2).toFixed(2) + '%;--bubble-height:' + (f.ry * 2).toFixed(2) + '%"><span class="dc-topic-title">' + e(group.meta.label) +
        '</span><span class="dc-topic-hint">' + e(group.meta.hint) + "</span></div>";
    }).join("");
  }

  SQUI.register("discover", {
    tab: "discover", title: "Discover",
    render: function () {
      var graph = discoverGraph();
      return '<div class="screen dc-discover-home" data-dc="discover-home"><div class="stack-lg"><header class="dc-disc-head"><div class="eyebrow">Discover</div>' +
        '<h1 class="h1">Find a new hobby</h1></header><label class="dc-search"><span class="dc-search-ic" aria-hidden="true">' + SQUI.icon("search", 18) +
        '</span><input type="search" class="dc-input" data-role="discover-search" placeholder="Search hobbies" aria-label="Search hobbies" autocomplete="off"></label>' +
        '<div class="dc-graph-legend"><span><i class="is-current"></i>Your hobbies</span><span><i class="is-suggestion"></i>Similar hobbies</span></div>' +
        '<div class="dc-discover-graph has-' + graph.groups.length + '-clusters" data-role="discover-graph" aria-label="A clustered map of your hobbies and similar hobbies">' +
          discoverTopicBubbles(graph) + '<svg class="dc-graph-lines" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">' +
          discoverEdges(graph) + '</svg>' + graph.all.map(function (h) { return discoverNode(h, graph); }).join("") + '</div>' +
        '<div class="empty" data-role="discover-empty"' + (graph.initialIds.length ? " hidden" : "") + '>Choose a current hobby first to build your discovery map.</div>' +
        '<p class="small muted dc-nores" data-role="discover-nores" hidden>No new hobby matches that search.</p></div></div>';
    },
    mount: function (root) {
      var host = bind(root, "[data-dc]", common({
        "discover-node": function (t) {
          var id = t.getAttribute("data-id");
          SQUI.go(tracked(id) ? "hobby" : "pack", { id: id });
        }
      }));
      var search = host.querySelector('[data-role="discover-search"]');
      var graph = host.querySelector('[data-role="discover-graph"]');
      search.addEventListener("input", function () {
        var term = search.value.trim().toLowerCase(), shown = 0;
        var matches = [];
        graph.classList.toggle("is-searching", !!term);
        graph.querySelectorAll(".dc-discover-node").forEach(function (node) {
          var visible = term ? node.getAttribute("data-name").indexOf(term) >= 0 : node.getAttribute("data-initial") === "1";
          node.hidden = !visible;
          if (visible) { shown += 1; matches.push(node); }
        });
        if (term) {
          var pos = ringPositions(matches.length, matches.length > 5 ? 34 : 25, matches.length > 5 ? 31 : 22, -Math.PI / 2);
          matches.forEach(function (node, i) { node.style.setProperty("--node-x", pos[i].x + "%"); node.style.setProperty("--node-y", pos[i].y + "%"); });
        } else {
          matches.forEach(function (node) { node.style.setProperty("--node-x", node.getAttribute("data-x") + "%"); node.style.setProperty("--node-y", node.getAttribute("data-y") + "%"); });
        }
        host.querySelector('[data-role="discover-nores"]').hidden = shown > 0;
        host.querySelector('[data-role="discover-empty"]').hidden = !!term || shown > 0;
      });
    }
  });
})();
