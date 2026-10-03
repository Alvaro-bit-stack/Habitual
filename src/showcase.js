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
  var THREE_CDN = "https://cdn.jsdelivr.net/npm/three@0.147.0/";
  var THREE_FILES = ["build/three.min.js", "examples/js/loaders/GLTFLoader.js", "examples/js/controls/OrbitControls.js"];

  function sq() { return G.SQ; }
  function pct(a, b) { return b > 0 ? Math.max(0, Math.min(100, Math.round(a / b * 100))) : 0; }
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
  function loadModel(id) {
    return loadScript("models/" + id + ".js").then(function () {
      var bin = atob(G.SQ_MODELS[id]), buf = new Uint8Array(bin.length);
      for (var i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
      return new Promise(function (res, rej) { new G.THREE.GLTFLoader().parse(buf.buffer, "", res, rej); });
    });
  }

  /* ------------------------------------------------------------------ 3D stage */
  function mountStage(wrap, id) {
    var status = wrap.querySelector(".sc-status");
    loadThree().then(function () { return loadModel(id); }).then(function (gltf) {
      if (!wrap.isConnected) return;
      var THREE = G.THREE, canvas = document.createElement("canvas");
      canvas.setAttribute("aria-label", "3D character. Drag to turn it, tap to make it cheer.");
      canvas.setAttribute("role", "img");
      wrap.appendChild(canvas);
      status.hidden = true;

      var renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
      renderer.setPixelRatio(Math.min(G.devicePixelRatio || 1, 2));
      renderer.outputEncoding = THREE.sRGBEncoding;
      var scene = new THREE.Scene();
      scene.add(new THREE.HemisphereLight(0xffffff, 0x8a9a80, 1.1));
      var sun = new THREE.DirectionalLight(0xffffff, 1.1);
      sun.position.set(2, 4, 3);
      scene.add(sun);

      // Tripo exports come in at arbitrary scale: fit to 1.8 units tall, feet on the ground, centered.
      var model = gltf.scene, box = new THREE.Box3().setFromObject(model), size = box.getSize(new THREE.Vector3());
      model.scale.setScalar(1.8 / (size.y || 1));
      box.setFromObject(model);
      var c = box.getCenter(new THREE.Vector3());
      model.position.set(-c.x, -box.min.y, -c.z);
      scene.add(model);

      var camera = new THREE.PerspectiveCamera(32, 1, 0.1, 50);
      camera.position.set(0, 1.1, 4.4);
      var controls = new THREE.OrbitControls(camera, canvas);
      controls.target.set(0, 0.9, 0);
      controls.enablePan = false;
      controls.enableZoom = false;
      controls.minPolarAngle = controls.maxPolarAngle = Math.PI / 2.15;

      // Rigged clips from tools/rig.py: "idle" loops; "wave" plays on arrival, "cheer" on tap.
      var still = G.matchMedia("(prefers-reduced-motion: reduce)").matches;
      var mixer = new THREE.AnimationMixer(model), clock = new THREE.Clock(), actions = {};
      gltf.animations.forEach(function (clip) { actions[clip.name] = mixer.clipAction(clip); });
      var cur = null;
      function play(name) { // crossfade from whatever is playing; one-shot clips hand back to idle when done
        var next = actions[name], once = name !== "idle";
        if (!next || (still && once)) return;
        next.reset().setLoop(once ? THREE.LoopOnce : THREE.LoopRepeat, once ? 1 : Infinity);
        next.clampWhenFinished = once;
        next.play();
        if (cur && cur !== next) cur.crossFadeTo(next, 0.3, false);
        cur = next;
      }
      mixer.addEventListener("finished", function (e) { if (e.action === cur) play("idle"); });
      play("idle");
      play("wave");
      var down = null;
      canvas.addEventListener("pointerdown", function (e) { down = [e.clientX, e.clientY]; });
      canvas.addEventListener("pointerup", function (e) {
        if (down && Math.abs(e.clientX - down[0]) + Math.abs(e.clientY - down[1]) < 6) play("cheer");
        down = null;
      });

      (function frame() {
        if (!canvas.isConnected) { renderer.dispose(); controls.dispose(); return; } // screen re-rendered or left
        var w = wrap.clientWidth, h = wrap.clientHeight;
        if (canvas.width !== Math.floor(w * renderer.getPixelRatio())) { renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); }
        mixer.update(Math.min(clock.getDelta(), 0.1));
        controls.update();
        renderer.render(scene, camera);
        requestAnimationFrame(frame);
      })();
    }).catch(function (e) {
      try { console.warn("[Sidequest]", e); } catch (x) { /* ignore */ }
      if (wrap.isConnected) { status.hidden = false; status.textContent = "Your character couldn’t load. Check your connection and reopen this tab."; }
    });
  }

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
      '<span class="sc-lbl">Achievements</span><span class="sc-go" aria-hidden="true">' + icon("chevron-right", 20) + "</span></button></section>" +

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
