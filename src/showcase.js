/* Me tab: the player's 3D character, level, stats, achievements entry, hobbies with levels, and settings.
   Characters are GLB models that build.py wraps as dist/models/<id>.js (base64 on window.SQ_MODELS),
   so they load with a plain <script> tag even from file://. three.js is fetched only when this tab opens. */
(function () {
  "use strict";
  var G = typeof globalThis !== "undefined" ? globalThis : window;
  if (typeof document === "undefined") return;
  var SQUI = G.SQUI, esc = SQUI.esc, icon = SQUI.icon;

  // ponytail: everyone picks any character for now; map character to the signed-in teammate once accounts exist.
  var CHARACTERS = [
    { id: "neo", name: "Neo" },
    { id: "adrian", name: "Adrian" },
    { id: "alvaro", name: "Alvaro" }
  ];
  var MOVES = ["JoyfulJump", "SillyDance", "Breakdance", "GoalkeeperDive", "StandardWalk", "DrunkWalk"];
  var THREE_CDN = "https://cdn.jsdelivr.net/npm/three@0.147.0/";
  var THREE_FILES = ["build/three.min.js", "examples/js/loaders/GLTFLoader.js", "examples/js/controls/OrbitControls.js"];

  function sq() { return G.SQ; }
  function pct(a, b) { return b > 0 ? Math.max(0, Math.min(100, Math.round(a / b * 100))) : 0; }
  // Mood: the character slumps (SadIdle) until a session is logged today, then perks up (HappyIdle).
  function happyToday() {
    var S = sq(), t = S.today();
    return S.state.sessions.some(function (x) { return x.date === t; });
  }
  function characterId() {
    var id = sq().state.user.character;
    return CHARACTERS.some(function (c) { return c.id === id; }) ? id : CHARACTERS[0].id;
  }

  var scripts = {};
  function loadScript(src) {
    if (!scripts[src]) {
      scripts[src] = new Promise(function (res, rej) {
        var s = document.createElement("script");
        s.src = src; s.onload = res;
        s.onerror = function () { delete scripts[src]; rej(new Error("Couldn’t load " + src)); };
        document.head.appendChild(s);
      });
    }
    return scripts[src];
  }
  function loadThree() {
    return THREE_FILES.reduce(function (p, f) { return p.then(function () { return loadScript(THREE_CDN + f); }); }, Promise.resolve());
  }
  var buffers = {}, ready = {};
  function loadModel(id) { // decode the base64 once per character; parse a fresh copy for every stage
    if (!buffers[id]) {
      buffers[id] = loadScript("models/" + id + ".js").then(function () {
        var bin = atob(G.SQ_MODELS[id]), buf = new Uint8Array(bin.length);
        for (var i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
        return buf.buffer;
      });
      buffers[id].catch(function () { delete buffers[id]; });
    }
    return loadThree().then(function () { return buffers[id]; }).then(function (buf) {
      ready[id] = true;
      return new Promise(function (res, rej) {
        // GLTFLoader reads embedded textures with fetch(blob:) when createImageBitmap exists. Pages with a
        // strict connect-src (Claude artifacts, many hosts) refuse that fetch and the character renders as
        // untextured gray clay. Hiding createImageBitmap while the parser is built makes it use <img> instead.
        var cib = G.createImageBitmap;
        try { G.createImageBitmap = undefined; new G.THREE.GLTFLoader().parse(buf, "", res, rej); }
        finally { G.createImageBitmap = cib; }
      });
    });
  }
  var still = G.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ------------------------------------------------------------------ 3D stage */
  // Renders gltf into wrap until wrap leaves the page. opts.controls: drag to turn + tap to cheer.
  // opts.intro: "wave" | "jump" | "jump-spin" | "drop". opts.onMove(name): called when a tap starts a move.
  // opts.tick(now): called every frame before rendering. opts.onIdle(): a one-shot move finished.
  // "drop" frames the whole body with the feet on the bottom edge and waits for api.cheer().
  // Returns { cheer }. Everything cleans up on disconnect.
  function stage(wrap, gltf, opts) {
    var THREE = G.THREE, canvas = document.createElement("canvas");
    canvas.setAttribute("aria-hidden", opts.controls ? "false" : "true");
    if (opts.controls) { canvas.setAttribute("role", "img"); canvas.setAttribute("aria-label", "3D character. Drag to turn it, tap to make it cheer."); }
    wrap.appendChild(canvas);

    var renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(G.devicePixelRatio || 1, 2));
    renderer.outputEncoding = THREE.sRGBEncoding;
    var scene = new THREE.Scene();
    scene.add(new THREE.HemisphereLight(0xffffff, 0x8a9a80, 1.1));
    var sun = new THREE.DirectionalLight(0xffffff, 1.1);
    sun.position.set(2, 4, 3);
    scene.add(sun);

    // Fit to 1.8 units tall, feet on the ground, centered. `rig` lets intros move/spin the whole body.
    // Measure from bone positions: three r147 sizes a skinned mesh's box without its skeleton's scale.
    function bounds(obj) {
      obj.updateMatrixWorld(true);
      var b = new THREE.Box3(), v = new THREE.Vector3(), bones = 0;
      obj.traverse(function (o) { if (o.isBone) { b.expandByPoint(o.getWorldPosition(v)); bones++; } });
      return bones ? b : new THREE.Box3().setFromObject(obj);
    }
    var model = gltf.scene, box = bounds(model), size = box.getSize(new THREE.Vector3());
    model.scale.setScalar(1.8 / (size.y || 1));
    box = bounds(model);
    var c = box.getCenter(new THREE.Vector3());
    model.position.set(-c.x, -box.min.y, -c.z);
    var rig = new THREE.Group(); rig.add(model); scene.add(rig);

    var camera = new THREE.PerspectiveCamera(32, 1, 0.1, 50), controls = null;
    if (opts.controls) {
      camera.position.set(0, 1.1, 4.4);
      controls = new THREE.OrbitControls(camera, canvas);
      controls.target.set(0, 0.9, 0);
      controls.enablePan = false;
      controls.enableZoom = false;
      controls.minPolarAngle = controls.maxPolarAngle = Math.PI / 2.15;
    } else if (opts.intro === "drop") {
      // Whole body, feet on the bottom edge, ~1.8x the body's height of headroom for the jump.
      var half = 2.0, dist = half / Math.tan(16 * Math.PI / 180); // body ≈ the community sprites' height
      camera.position.set(0, half - 0.05, dist); camera.lookAt(0, half - 0.05, 0);
    } else {
      camera.position.set(0, 1.3, 4.1); camera.lookAt(0, 1.3, 0); // knees down hide behind the card; room for arms up + jump
    }

    // Rigged clips from tools/rig.py. "idle" loops; one-shots hand back to idle when done.
    var mixer = new THREE.AnimationMixer(model), clock = new THREE.Clock(), actions = {}, cur = null;
    gltf.animations.forEach(function (clip) { actions[clip.name] = mixer.clipAction(clip); });
    // Mixamo models (tools/mixamo_merge.py) carry idle + named moves; older ones idle/wave/cheer.
    function pick(names) { return names.filter(function (n) { return actions[n]; })[0]; }
    function rest() { return pick([happyToday() ? "HappyIdle" : "SadIdle", "idle"]); } // re-checked every time
    var greet = pick(["wave", "JoyfulJump"]), cheer = pick(["JoyfulJump", "cheer"]), party = pick(["SillyDance", "cheer"]);
    var moves = MOVES.filter(function (n) { return actions[n]; }), nextMove = 0;
    function play(name) {
      var next = actions[name], once = !/idle$/i.test(name || "");
      if (!next || (still && once)) return;
      next.reset().setLoop(once ? THREE.LoopOnce : THREE.LoopRepeat, once ? 1 : Infinity);
      next.clampWhenFinished = once;
      next.play();
      if (cur && cur !== next) cur.crossFadeTo(next, 0.3, false);
      cur = next;
    }
    mixer.addEventListener("finished", function (e) { if (e.action === cur) { play(rest()); if (opts.onIdle) opts.onIdle(); } });
    play(rest());

    // Intro: "wave" in place, or leap up from below (behind the reward card) and cheer.
    var t0 = null, intro = opts.intro || "wave", leap = intro !== "wave" && intro !== "drop" && !still;
    if (intro === "wave") play(greet);
    else if (still) play(cheer);
    else if (intro !== "drop") rig.position.y = -2.2; // "drop" moves the whole canvas instead
    function ease(k) { var c1 = 1.7, c3 = c1 + 1; return 1 + c3 * Math.pow(k - 1, 3) + c1 * Math.pow(k - 1, 2); } // ease-out-back

    if (opts.controls) {
      var down = null;
      canvas.addEventListener("pointerdown", function (e) { down = [e.clientX, e.clientY]; });
      canvas.addEventListener("pointerup", function (e) {
        if (down && Math.abs(e.clientX - down[0]) + Math.abs(e.clientY - down[1]) < 6) {
          var m = moves.length ? moves[nextMove++ % moves.length] : cheer; // each tap shows the next move
          play(m);
          if (opts.onMove) opts.onMove(m);
        }
        down = null;
      });
    }

    (function frame(now) {
      if (!canvas.isConnected) { renderer.dispose(); if (controls) controls.dispose(); return; } // screen re-rendered or overlay closed
      if (opts.tick) { opts.tick(now || performance.now()); if (!canvas.isConnected) return; }
      var w = wrap.clientWidth, h = wrap.clientHeight;
      if (canvas.width !== Math.floor(w * renderer.getPixelRatio())) { renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); }
      if (leap && now) {
        if (t0 === null) t0 = now;
        var k = Math.min(1, (now - t0) / 520);
        rig.position.y = -2.2 * (1 - ease(k));
        if (intro === "jump-spin") rig.rotation.y = Math.PI * 2 * (1 - Math.pow(1 - k, 3));
        if (k === 1) { leap = false; rig.rotation.y = 0; play(intro === "jump-spin" ? party : cheer); }
      }
      mixer.update(Math.min(clock.getDelta(), 0.1));
      if (controls) controls.update();
      renderer.render(scene, camera);
      requestAnimationFrame(frame);
    })();
    return { cheer: function () { if (cheer) play(cheer); else if (opts.onIdle) opts.onIdle(); } };
  }

  function mountStage(wrap, id) {
    var status = wrap.querySelector(".sc-status");
    loadModel(id).then(function (gltf) {
      if (!wrap.isConnected) return;
      status.hidden = true;
      stage(wrap, gltf, { controls: true, intro: "wave", onMove: function (m) {
        var cap = document.querySelector(".sc-move");
        if (cap) cap.textContent = m.replace(/([a-z])([A-Z])/g, "$1 $2"); // SillyDance -> Silly Dance
      } });
    }).catch(function (e) {
      try { console.warn("[Sidequest]", e); } catch (x) { /* ignore */ }
      if (wrap.isConnected) { status.hidden = false; status.textContent = "Your character couldn’t load. Check your connection and reopen this tab."; }
    });
  }

  /* ------------------------------------------------------------------ celebrations */
  // Called by SQUI.showReward with the reward overlay element. The character leaps up from behind the
  // card and cheers; on a level-up it spins on the way up, cheers twice and the stage is bigger.
  // Only takes over when the model is already loaded (preloaded below), so the card never jumps around;
  // otherwise the 2D Sprout stays and the model loads for next time. Returns true when it took over.
  SQUI.celebrate = function (overlay, opts) {
    var id = characterId(), card = overlay && overlay.querySelector(".rw-card");
    if (!card || still) return false;
    if (!ready[id]) { loadModel(id).catch(function () { /* next time */ }); return false; }
    var big = !!(opts && opts.levelUp);
    overlay.classList.add("rw-hero", big ? "rw-hero-big" : "rw-hero-small");
    var mascot = card.querySelector(".rw-mascot");
    if (mascot) mascot.hidden = true;
    var wrap = document.createElement("div");
    wrap.className = "rw-stage";
    overlay.insertBefore(wrap, card);
    loadModel(id).then(function (gltf) { if (wrap.isConnected) stage(wrap, gltf, { intro: big ? "jump-spin" : "jump" }); }, function () { wrap.remove(); if (mascot) mascot.hidden = false; });
    return true;
  };

  /* ------------------------------------------------------------------ community arrival */
  // Called by community.js after an RSVP with the hidden "You" slot on an event card. The 3D character
  // falls from above the card into the slot, lands (opts.onLand: sparks), does its Joyful Jump, then
  // fades into the slot's sprite (opts.onDone). Only takes over when the model is already loaded.
  SQUI.dropIn = function (slot, opts) {
    var id = characterId();
    if (still || !ready[id] || !slot || !G.THREE) return false;
    var layer = document.querySelector(".cm-drop-layer");
    if (!layer) { layer = document.createElement("div"); layer.className = "cm-drop-layer"; layer.setAttribute("aria-hidden", "true"); document.body.appendChild(layer); }
    var wrap = document.createElement("div");
    wrap.className = "cm-drop cm-drop-3d";
    wrap.style.visibility = "hidden";
    layer.appendChild(wrap);
    var api = null, t0 = null, landed = false, finished = false, ms = opts.ms || 560;
    function finish() {
      if (finished) return;
      finished = true;
      opts.onDone();
      wrap.style.opacity = "";
      wrap.classList.add("cm-drop-out");
      G.setTimeout(function () { wrap.remove(); }, 320);
    }
    function place() {
      var now = performance.now(); // one clock: rAF timestamps and performance.now() can disagree
      if (!slot.isConnected) { wrap.remove(); return; }
      if (t0 === null) t0 = now;
      var r = slot.getBoundingClientRect(), w = r.width * 2.2, h = r.height * 2.1; // room for arms and the jump
      var yEnd = r.bottom - h - 8, yStart = opts.startTop(slot, h), k = Math.min(1, (now - t0) / ms);
      var y = landed ? yEnd : yStart + (yEnd - yStart) * k * k;
      wrap.style.width = w + "px"; wrap.style.height = h + "px";
      wrap.style.transform = "translate(" + (r.left + r.width / 2 - w / 2) + "px," + y + "px)";
      wrap.style.visibility = "visible";
      if (!landed) wrap.style.opacity = Math.min(1, k / 0.25); // materializes above the card, then falls in
      if (!landed && k >= 1) { landed = true; opts.onLand(); if (api) api.cheer(); G.setTimeout(finish, 3200); } // safety net
    }
    loadModel(id).then(function (gltf) {
      if (!slot.isConnected) { wrap.remove(); return; }
      api = stage(wrap, gltf, { intro: "drop", tick: place, onIdle: function () { if (landed) finish(); } });
    }, function () { wrap.remove(); opts.onLand(); opts.onDone(); });
    return true;
  };

  // Warm the cache shortly after startup so the first celebration is instant.
  if (!still) G.setTimeout(function () { try { loadModel(characterId()).catch(function () { /* retried on demand */ }); } catch (e) { /* SQ not ready */ } }, 2000);

  /* ------------------------------------------------------------------ screen */
  function timeText(min) {
    return min < 60 ? min + '<span class="sc-unit"> min</span>' : (Math.round(min / 6) / 10) + '<span class="sc-unit"> hrs</span>';
  }
  var ui = { confirmReset: false };

  function render() {
    var S = sq(), p = S.player(), cur = characterId();
    var who = CHARACTERS.filter(function (c) { return c.id === cur; })[0];
    var shelf = S.state.tracked.map(function (t) {
      return { h: S.getHobby(t.hobbyId), s: S.hobbyStats(t.hobbyId), ms: (t.milestones || []).length };
    }).filter(function (x) { return x.h; }).sort(function (a, b) { return b.s.xp - a.s.xp; });
    var achs = S.achievementsList(), earned = achs.filter(function (a) { return a.unlocked; });
    var minutes = shelf.reduce(function (n, x) { return n + (x.s.totalMinutes || 0); }, 0);
    var best = shelf.reduce(function (n, x) { return Math.max(n, x.s.weeklyStreak || 0); }, 0);
    var theme = SQUI.getTheme(), nudge = S.state.user.nudgeTime || "21:00";

    return '<div class="screen stack-lg sq-me">' +
      // Character + level
      '<section class="sc-hero">' +
      '<div class="sc-stage"><p class="sc-status small muted" role="status">Loading ' + esc(who.name) + "…</p></div>" +
      '<h1 class="h1">' + esc(who.name) + "</h1>" +
      '<p class="sc-move small muted" aria-live="polite">' + (happyToday() ? "Tap " + esc(who.name) + " to see a move" : "Log a session today to cheer " + esc(who.name) + " up") + "</p>" +
      '<div class="sc-level"><div class="row"><span class="h3">Level ' + p.level + '</span><span class="spacer"></span><span class="small muted"><span class="num">' + p.xpIntoLevel + " / " + p.xpForNext + "</span> XP to level " + (p.level + 1) + "</span></div>" +
      '<div class="progress xp" role="progressbar" aria-label="Progress to next level" aria-valuemin="0" aria-valuemax="' + p.xpForNext + '" aria-valuenow="' + p.xpIntoLevel + '"><div class="progress-bar" style="width:' + pct(p.xpIntoLevel, p.xpForNext) + '%"></div></div></div>' +
      '<div class="seg" role="radiogroup" aria-label="Character">' + CHARACTERS.map(function (c) {
        var on = c.id === cur;
        return '<button type="button" role="radio" aria-checked="' + on + '" class="' + (on ? "on" : "") + '" data-action="pick" data-id="' + c.id + '">' + esc(c.name) + "</button>";
      }).join("") + "</div></section>" +

      // Stats; the last tile opens the achievements list
      '<section class="sc-stats" aria-label="Your stats">' +
      '<div class="sc-stat"><span class="sc-val num">' + p.totalSessions + '</span><span class="sc-lbl">Sessions</span></div>' +
      '<div class="sc-stat"><span class="sc-val num">' + timeText(minutes) + '</span><span class="sc-lbl">Time spent</span></div>' +
      '<div class="sc-stat"><span class="sc-val num">' + best + '<span class="sc-unit">' + (best === 1 ? " wk" : " wks") + '</span></span><span class="sc-lbl">Best streak</span></div>' +
      '<button type="button" class="sc-stat sc-stat-tap" data-action="achievements">' +
      '<span class="sc-val num">' + earned.length + '<span class="sc-unit"> of ' + achs.length + "</span></span>" +
      '<span class="sc-lbl">Achievements<span class="sc-go" aria-hidden="true">' + icon("chevron-right", 18) + "</span></span></button></section>" +

      // Hobbies
      '<section class="stack"><h2 class="h3">Your hobbies</h2>' +
      (shelf.length ? '<div class="stack">' + shelf.map(function (x) {
        return '<button type="button" class="card tap sc-trophy" data-action="hobby" data-id="' + esc(x.h.id) + '">' +
          '<span class="sc-ic">' + SQUI.hobbyIcon(x.h.id, 26) + "</span>" +
          '<span class="sc-body"><span class="row"><span class="h3">' + esc(x.h.name) + '</span><span class="spacer"></span><span class="sc-lv num">Lv ' + x.s.level + "</span></span>" +
          '<span class="progress xp" role="progressbar" aria-label="' + esc(x.h.name) + ' level progress" aria-valuemin="0" aria-valuemax="' + x.s.xpForNext + '" aria-valuenow="' + x.s.xpIntoLevel + '">' +
          '<span class="progress-bar" style="width:' + pct(x.s.xpIntoLevel, x.s.xpForNext) + '%"></span></span>' +
          '<span class="small muted"><span class="num">' + x.s.totalSessions + "</span> sessions · <span class=\"num\">" + x.s.weeklyStreak + "</span>-week streak</span></span></button>";
      }).join("") + "</div>" :
        '<div class="empty stack"><div class="h3">No hobbies yet</div><p class="small">Track a hobby and log a session to see it here.</p>' +
        '<div class="row" style="justify-content:center"><button type="button" class="btn sm primary" data-action="discover">Find a hobby</button></div></div>') +
      "</section>" +
      (shelf.length ? '<button type="button" class="btn block" data-action="share">' + icon("spark", 18) + " Share my progress</button>" : "") +

      // Settings
      (G.SQCloud ? G.SQCloud.panel() : "") +
      '<section class="stack sc-settings"><h2 class="h3">Settings</h2>' +
      '<div class="stack"><label class="sc-lbl" for="me-nudge">Daily nudge time</label>' +
      '<div class="nudge-row"><input class="input" type="time" id="me-nudge" value="' + esc(nudge) + '"><button type="button" class="btn" data-action="nudge">Save</button></div>' +
      '<p class="small muted">We’ll suggest a tiny win around this time.</p></div>' +
      '<div class="stack"><span class="sc-lbl" id="me-theme-lbl">Appearance</span><div class="seg" role="radiogroup" aria-labelledby="me-theme-lbl">' +
      [["system", "System"], ["light", "Light"], ["dark", "Dark"]].map(function (o) {
        return '<button type="button" role="radio" aria-checked="' + (theme === o[0]) + '" class="' + (theme === o[0] ? "on" : "") + '" data-action="theme" data-t="' + o[0] + '">' + o[1] + "</button>";
      }).join("") + "</div></div>" +
      '<hr class="sq-dashrule"><button type="button" class="btn block" data-action="seed">Load sample data</button>' +
      (ui.confirmReset ?
        '<div class="confirm-box"><div class="h3">Reset everything?</div><p class="small muted">This erases your hobbies, sessions, XP and achievements on this device. It can’t be undone.</p>' +
        '<div class="row"><button type="button" class="btn sm danger-solid" data-action="reset-yes">Erase and start over</button><button type="button" class="btn sm" data-action="reset-no">Cancel</button></div></div>' :
        '<button type="button" class="btn ghost block danger" data-action="reset">Reset everything</button>') +
      "</section></div>";
  }

  function shareText() {
    var S = sq(), p = S.player();
    var lines = S.state.tracked.map(function (t) {
      var h = S.getHobby(t.hobbyId);
      return h ? h.name + ": Lv " + S.hobbyStats(t.hobbyId).level : null;
    }).filter(Boolean);
    return "My Sidequest progress. Level " + p.level + ", " + p.totalSessions + " sessions.\n" + lines.join("\n");
  }

  SQUI.register("me", {
    tab: "me", title: "Me",
    render: render,
    mount: function (root) {
      var host = root.firstElementChild; // #app-main persists across screens; bind to this screen's own node
      mountStage(host.querySelector(".sc-stage"), characterId());
      host.addEventListener("click", function (ev) {
        var b = ev.target.closest && ev.target.closest("[data-action]");
        if (!b) return;
        var a = b.getAttribute("data-action"), S = sq();
        if (a === "pick") { S.state.user.character = b.getAttribute("data-id"); S.save(); SQUI.refresh(); }
        else if (a === "achievements") SQUI.go("achievements");
        else if (a === "hobby") SQUI.go("hobby", { id: b.getAttribute("data-id") });
        else if (a === "discover") SQUI.go("discover", {}, { reset: true });
        else if (a === "share") {
          var text = shareText();
          if (navigator.share) navigator.share({ title: "My Sidequest progress", text: text }).catch(function () { /* cancelled */ });
          else if (navigator.clipboard) navigator.clipboard.writeText(text).then(function () { SQUI.toast("Copied to clipboard"); }, function () { SQUI.toast("Couldn’t copy"); });
        }
        else if (a === "nudge") {
          var v = (host.querySelector("#me-nudge") || {}).value;
          if (!v) { SQUI.toast("Pick a time first"); return; }
          S.state.user.nudgeTime = v; S.save(); SQUI.toast("Nudge time saved for " + v);
        }
        else if (a === "theme") { SQUI.setTheme(b.getAttribute("data-t")); SQUI.refresh(); }
        else if (a === "seed") { S.seedDemo(); SQUI.go("today", {}, { reset: true }); SQUI.toast("Sample data loaded"); }
        else if (a === "reset") { ui.confirmReset = true; SQUI.refresh(); var c = document.querySelector("[data-action=reset-no]"); if (c) c.focus(); }
        else if (a === "reset-no") { ui.confirmReset = false; SQUI.refresh(); }
        else if (a === "reset-yes") { ui.confirmReset = false; S.reset(); SQUI.go("welcome", {}, { reset: true }); }
      });
    }
  });
})();
