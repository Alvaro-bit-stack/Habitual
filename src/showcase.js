/* Me tab: the player's 3D character, level, stats, achievements entry, hobbies with levels, and settings.
   Characters are GLB models that build.py wraps as dist/models/<id>.js (base64 on window.SQ_MODELS),
   so they load with a plain <script> tag even from file://. three.js is fetched only when this tab opens. */
(function () {
  "use strict";
  var G = typeof globalThis !== "undefined" ? globalThis : window;
  if (typeof document === "undefined") return;
  var SQUI = G.SQUI, esc = SQUI.esc, icon = SQUI.icon;
  // Self-rated skill tier (from the skill check) -> stars beside the hobby level. Levels start at 0 for everyone.
  var TIER_STARS = { intermediate: 1, advanced: 2 };
  function tier(id) {
    var sk = null;
    try { sk = sq().skill ? sq().skill(id) : (sq().state.skills || {})[id]; } catch (x) {}
    return sk && sk.tier ? String(sk.tier).toLowerCase() : null;
  }
  function stars(id) {
    var t = tier(id), n = TIER_STARS[t] || 0;
    if (!n) return "";
    return '<span class="sc-stars" role="img" aria-label="' + t.charAt(0).toUpperCase() + t.slice(1) + ", " + n + (n === 1 ? " star" : " stars") + '">' +
      new Array(n + 1).join(GEM) + "</span>";
  }
  // The hobby screen (opened from Today or Me) shows the same stars beside the hobby name.
  SQUI.skillStars = stars;
  // Diamond star: icy gradient under alternating light/dark facets, a white glint.
  var GEM = '<svg width="26" height="26" viewBox="2.5 2.5 19 18.5" aria-hidden="true"><defs><linearGradient id="sc-gem" x1="0" y1="0" x2="1" y2="1">' +
    '<stop offset="0" stop-color="#e8fbff"/><stop offset=".4" stop-color="#5cd0f5"/><stop offset=".7" stop-color="#8f7cf0"/><stop offset="1" stop-color="#2d7fd0"/></linearGradient></defs>' +
    '<path d="M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.8L12 16.8l-5.2 2.8 1-5.8-4.3-4.1 5.9-.8z" fill="url(#sc-gem)"/>' +
    '<path d="M12 12.3L12 3.5L14.6 8.9z" fill="#fff" fill-opacity=".55"/><path d="M12 12.3L14.6 8.9L20.5 9.7z" fill="#1d4f8a" fill-opacity=".28"/><path d="M12 12.3L20.5 9.7L16.2 13.8z" fill="#fff" fill-opacity=".55"/><path d="M12 12.3L16.2 13.8L17.2 19.6z" fill="#1d4f8a" fill-opacity=".28"/><path d="M12 12.3L17.2 19.6L12 16.8z" fill="#fff" fill-opacity=".55"/><path d="M12 12.3L12 16.8L6.8 19.6z" fill="#1d4f8a" fill-opacity=".28"/><path d="M12 12.3L6.8 19.6L7.8 13.8z" fill="#fff" fill-opacity=".55"/><path d="M12 12.3L7.8 13.8L3.5 9.7z" fill="#1d4f8a" fill-opacity=".28"/><path d="M12 12.3L3.5 9.7L9.4 8.9z" fill="#fff" fill-opacity=".55"/><path d="M12 12.3L9.4 8.9L12 3.5z" fill="#1d4f8a" fill-opacity=".28"/>' +
    '<path d="M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.8L12 16.8l-5.2 2.8 1-5.8-4.3-4.1 5.9-.8z" fill="none" stroke="#1d4f8a" stroke-width=".9" stroke-linejoin="round"/>' +
    '<path d="M10.2 7.6l.9-1.8" stroke="#fff" stroke-width="1.2" stroke-linecap="round"/></svg>';

  // ponytail: everyone picks any character for now; map character to the signed-in teammate once accounts exist.
  var CHARACTERS = [
    { id: "neo", name: "Neo" },
    { id: "adrian", name: "Adrian" },
    { id: "alvaro", name: "Alvaro" },
    { id: "avatar1", name: "Lizzy" },
    { id: "avatar2", name: "Gracie" },
    { id: "avatar3", name: "Olivia" }
  ]; // also listed in shell.js (CHAR_NAMES) and community.js (AVATARS); sprites in src/assets/avatars/manifest.json
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

  /* ------------------------------------------------------------------ props */
  // Props on the ground around the Me character: gear for the hobbies the player tracks (most XP first, up to
  // four) and nothing else. They're modelled in Blender (tools/build_props.py -> assets/models/props.glb, one object per
  // prop named prop_<hobbyId>); hobbies without a model get a simple tote bag. Units are metres next to the
  // 1.8 m character at the origin, feet at y = 0.
  function buildProps(THREE, kit, hobbyIds) {
    var group = new THREE.Group();
    function shadow(r, x, z, sx) { // soft blob on the street
      var o = new THREE.Mesh(new THREE.CircleGeometry(r, 24), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.16, depthWrite: false }));
      o.position.set(x, 0.003, z); o.rotation.x = -Math.PI / 2; o.scale.x = sx || 1; group.add(o);
    }
    function place(o, x, z, ry, s) { o.position.set(x, 0, z); o.rotation.y = ry || 0; o.scale.setScalar(s || 1); group.add(o); return o; }
    function tote() {
      var g = new THREE.Group(), m = function (c) { return new THREE.MeshStandardMaterial({ color: c, roughness: 0.8 }); };
      var bag = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.3, 0.1), m(0x3e8fd8)); bag.position.y = 0.15; g.add(bag);
      var h = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.012, 6, 20, Math.PI), m(0x22262b)); h.position.y = 0.3; g.add(h);
      return g;
    }
    function prop(id) { var o = kit && kit.getObjectByName("prop_" + id); return o ? o.clone() : null; }
    // x, z, turn. The back-left spot is the only one with room for a bike, so a bike always takes it.
    var SLOTS = [[0.58, 0.18, -0.7], [-0.55, 0.28, 0.5], [0.8, -0.55, 1.1], [-0.85, -1.1, 0.65]], BIKE = 3;
    var ids = hobbyIds.slice(0, SLOTS.length), free = [0, 1, 2, 3];
    if (ids.indexOf("bike") >= 0) free.splice(free.indexOf(BIKE), 1);
    ids.forEach(function (id) {
      var i = id === "bike" ? BIKE : free.shift(), sl = SLOTS[i], long = id === "guitar" || id === "tennis";
      if (id === "bike") { place(prop("bike") || tote(), sl[0], sl[1], sl[2], 0.78); shadow(0.42, sl[0], sl[1], 1.35); return; }
      place(prop(id) || tote(), sl[0], sl[1], sl[2] + (long ? (sl[0] > 0 ? 1.1 : -1.1) : 0), long ? 0.8 : 1.1);
      shadow(long ? 0.2 : 0.15, sl[0], sl[1], 1.5);
    });
    return group;
  }

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
    if (opts.props) scene.add(buildProps(THREE, opts.kit, opts.props)); // Me only: bike + hobby gear on the ground

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
    // The character and the props file load together; if the props fail, the character still shows.
    Promise.all([loadModel(id), loadModel("props").catch(function () { return null; })]).then(function (res) {
      var gltf = res[0], kit = res[1] && res[1].scene;
      if (!wrap.isConnected) return;
      status.hidden = true;
      // Only the hobbies the player tracks get props. Custom hobbies about cycling get the bike.
      var S = sq(), top = S.state.tracked.slice().sort(function (a, b) { return (b.xp || 0) - (a.xp || 0); }).map(function (t) {
        var h = S.getHobby(t.hobbyId) || {};
        return /bik|cycl/i.test(t.hobbyId + " " + (h.name || "")) ? "bike" : t.hobbyId;
      }).filter(function (id, i, all) { return all.indexOf(id) === i; });
      stage(wrap, gltf, { controls: true, intro: "wave", props: top, kit: kit, onMove: function (m) {
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
      // Character choice folds away: one row showing the current character, the grid only when opened.
      '<details class="sc-choose"><summary><span class="cm-mii" data-character="' + cur + '" style="--mii-size:34px" aria-hidden="true"></span>' +
      '<span class="sc-choose-l">Character</span><span class="sc-choose-v">' + esc(who.name) + '</span><span class="sc-choose-c" aria-hidden="true">' + icon("chevron-right", 18) + "</span></summary>" +
      '<div class="sc-picker" role="radiogroup" aria-label="Character">' + CHARACTERS.map(function (c) {
        var on = c.id === cur;
        return '<button type="button" role="radio" aria-checked="' + on + '" class="sc-pick' + (on ? " on" : "") + '" data-action="pick" data-id="' + c.id + '">' +
          '<span class="cm-mii" data-character="' + c.id + '" style="--mii-size:52px" aria-hidden="true"></span><span>' + esc(c.name) + "</span></button>";
      }).join("") + "</div></details>" +
      // Friends: accepted friendships only; tap for your code, requests and shared hobbies.
      '<button type="button" class="sc-friends" data-action="friends"><span class="sc-friends-ic" aria-hidden="true">' + icon("users", 20) + "</span>" +
      '<span class="sc-choose-l">Friends</span><span class="sc-choose-v" data-role="friend-count">' + friendCountText(cachedFriendList()) + "</span>" +
      '<span class="sc-choose-c" aria-hidden="true">' + icon("chevron-right", 18) + "</span></button></section>" +

      // Hobbies
      '<section class="stack"><h2 class="h3">Your hobbies</h2>' +
      (shelf.length ? '<div class="stack">' + shelf.map(function (x) {
        return '<button type="button" class="card tap sc-trophy" data-action="hobby" data-id="' + esc(x.h.id) + '">' +
          '<span class="sc-ic">' + SQUI.hobbyIcon(x.h.id, 26) + "</span>" +
          '<span class="sc-body"><span class="row"><span class="h3">' + esc(x.h.name) + '</span><span class="spacer"></span>' + stars(x.h.id) + '<span class="sc-lv num">Lv ' + x.s.level + "</span></span>" +
          '<span class="progress xp" role="progressbar" aria-label="' + esc(x.h.name) + ' level progress" aria-valuemin="0" aria-valuemax="' + x.s.xpForNext + '" aria-valuenow="' + x.s.xpIntoLevel + '">' +
          '<span class="progress-bar" style="width:' + pct(x.s.xpIntoLevel, x.s.xpForNext) + '%"></span></span>' +
          '<span class="small muted"><span class="num">' + x.s.totalSessions + "</span> sessions · <span class=\"num\">" + x.s.weeklyStreak + "</span>-week streak</span></span></button>";
      }).join("") + "</div>" :
        '<div class="empty stack"><div class="h3">No hobbies yet</div><p class="small">Track a hobby and log a session to see it here.</p>' +
        '<div class="row" style="justify-content:center"><button type="button" class="btn sm primary" data-action="discover">Find a hobby</button></div></div>') +
      "</section>" +
      // Stats; the last tile opens the achievements list
      '<section class="sc-stats" aria-label="Your stats">' +
      '<div class="sc-stat"><span class="sc-val num">' + p.totalSessions + '</span><span class="sc-lbl">Sessions</span></div>' +
      '<div class="sc-stat"><span class="sc-val num">' + timeText(minutes) + '</span><span class="sc-lbl">Time spent</span></div>' +
      '<div class="sc-stat"><span class="sc-val num">' + best + '<span class="sc-unit">' + (best === 1 ? " wk" : " wks") + '</span></span><span class="sc-lbl">Best streak</span></div>' +
      '<button type="button" class="sc-stat sc-stat-tap" data-action="achievements">' +
      '<span class="sc-val num">' + earned.length + '<span class="sc-unit"> of ' + achs.length + "</span></span>" +
      '<span class="sc-lbl">Achievements<span class="sc-go" aria-hidden="true">' + icon("chevron-right", 18) + "</span></span></button></section>" +

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
      '<div class="stack"><span class="sc-lbl" id="me-sound-lbl">Sound effects</span><div class="seg" role="radiogroup" aria-labelledby="me-sound-lbl">' +
      [["on", "On"], ["off", "Off"]].map(function (o) {
        var on = (S.state.user.sound === false ? "off" : "on") === o[0];
        return '<button type="button" role="radio" aria-checked="' + on + '" class="' + (on ? "on" : "") + '" data-action="sound" data-v="' + o[0] + '">' + o[1] + "</button>";
      }).join("") + '</div><p class="small muted">Chimes when you earn XP, level up or unlock an achievement.</p></div>' +
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

  // ---------------------------------------------------------------- friends
  // Friends live in the cloud account (backend /api/friends). Only accepted friendships count.
  var fr = { data: null, at: 0, err: "", confirm: null, login: { step: "email", email: "" }, busy: false, q: "", results: null, searching: false };
  function cloud() { return G.SQCloud; }
  function cachedFriendList() { var C = cloud(); return fr.data || (C && C.signedIn && C.signedIn() ? C.cachedFriends() : null); }
  function friendCountText(d) {
    if (!d) return "Add friends";
    return d.friends.length + (d.friends.length === 1 ? " friend" : " friends") + (d.incoming.length ? " · " + d.incoming.length + " new" : "");
  }
  function refreshFriends(done, force) {
    var C = cloud();
    if (!C || !C.signedIn || !C.signedIn() || (!force && Date.now() - fr.at < 2000)) return;
    fr.at = Date.now();
    C.loadFriends().then(function (d) { if (d) { fr.data = d; fr.err = ""; done(d); } }, function (e) { fr.err = e.message || "Couldn’t load friends"; done(fr.data); });
  }
  function mii(id, size) { return '<span class="cm-mii" data-character="' + esc(id || "neo") + '" style="--mii-size:' + size + 'px" aria-hidden="true"></span>'; }
  function myHobbyKeys() {
    var S = sq(), keys = {};
    S.state.tracked.forEach(function (t) { var h = S.getHobby(t.hobbyId); keys[t.hobbyId] = 1; if (h) keys["n:" + h.name.toLowerCase()] = 1; });
    return keys;
  }
  function friendCard(f, mine) {
    var hobbies = f.hobbies || [], shared = hobbies.filter(function (h) { return mine[h.id] || mine["n:" + h.name.toLowerCase()]; });
    var other = hobbies.filter(function (h) { return shared.indexOf(h) < 0; }).slice(0, 3);
    var lv = sq().levelFor(f.xp || 0).level;
    return '<li class="card sc-friend">' + mii(f.character, 44) + '<div class="sc-friend-body"><div class="row"><span class="h3">' + esc(f.name) + '</span><span class="sc-lv num">Lv ' + lv + "</span></div>" +
      (shared.length ? '<div class="sc-shared"><span class="small muted">You both do</span>' + shared.map(function (h) { return '<span class="sc-chip">' + SQUI.hobbyIcon(h.id, 16) + esc(h.name) + "</span>"; }).join("") + "</div>"
        : '<p class="small muted">No shared hobbies yet</p>') +
      (other.length ? '<p class="small muted">Also into ' + other.map(function (h) { return esc(h.name); }).join(", ") + "</p>" : "") +
      (fr.confirm === f.code ? '<div class="row"><button type="button" class="btn sm danger-solid" data-action="fr-remove-yes" data-code="' + esc(f.code) + '">Remove friend</button><button type="button" class="btn sm" data-action="fr-remove-no">Keep</button></div>'
        : '<button type="button" class="btn ghost sm sc-friend-x" data-action="fr-remove" data-code="' + esc(f.code) + '" aria-label="Remove ' + esc(f.name) + '">' + icon("close", 16) + "</button>") +
      "</div></li>";
  }
  // Verify an email right here: send a 6-digit code, then paste or type it.
  function loginCard() {
    var L = fr.login, err = fr.err ? '<p class="small sc-err" role="alert">' + esc(fr.err) + "</p>" : "";
    if (L.step === "email") return '<form class="card stack" data-role="fr-email"><div class="h3">Verify your email to add friends</div>' +
      '<label class="small muted" for="fr-email">Any email works. We’ll send a 6-digit code, no password.</label>' +
      '<input class="input" id="fr-email" name="email" type="email" inputmode="email" autocomplete="email" maxlength="254" required value="' + esc(L.email) + '" placeholder="you@example.com">' +
      err + '<button type="submit" class="btn primary"' + (fr.busy ? " disabled" : "") + ">" + (fr.busy ? "Sending…" : "Send code") + "</button></form>";
    return '<form class="card stack" data-role="fr-verify"><div class="h3">Enter your code</div>' +
      '<label class="small muted" for="fr-otp">We sent a 6-digit code to <strong>' + esc(L.email) + "</strong>. It expires in 10 minutes. Check spam if you don’t see it.</label>" +
      '<div class="nudge-row"><input class="input sc-otp num" id="fr-otp" name="code" type="text" inputmode="numeric" autocomplete="one-time-code" maxlength="7" placeholder="123456" required>' +
      '<button type="button" class="btn" data-action="fr-paste">Paste</button></div>' + err +
      '<button type="submit" class="btn primary"' + (fr.busy ? " disabled" : "") + ">" + (fr.busy ? "Checking…" : "Verify") + "</button>" +
      '<div class="row"><button type="button" class="btn ghost sm" data-action="fr-resend">Send a new code</button><button type="button" class="btn ghost sm" data-action="fr-other-email">Use a different email</button></div></form>';
  }
  function searchRows() {
    if (fr.searching) return '<p class="small muted">Searching…</p>';
    if (!fr.results) return "";
    if (!fr.results.length) return '<p class="small muted">No one found. Try another spelling, or ask for their friend code.</p>';
    return '<ul class="stack sc-friend-list">' + fr.results.map(function (p) {
      var btn = p.status === "friends" ? '<span class="small muted">Friends</span>'
        : p.status === "sent" ? '<span class="small muted">Requested</span>'
        : p.status === "incoming" ? '<button type="button" class="btn sm primary" data-action="fr-accept" data-code="' + esc(p.code) + '">Accept</button>'
        : '<button type="button" class="btn sm primary" data-action="fr-add-person" data-code="' + esc(p.code) + '">Add</button>';
      return '<li class="card sc-friend sc-person">' + mii(p.character, 36) + '<span class="h3 sc-person-name">' + esc(p.name) + "</span>" + btn + "</li>";
    }).join("") + "</ul>";
  }
  function markResult(code, status) { (fr.results || []).forEach(function (p) { if (p.code === code) p.status = status; }); }
  function renderFriends() {
    var S = sq(), C = cloud();
    var head = '<div class="screen-head"><button type="button" class="back-btn" data-action="back" aria-label="Back">' + icon("chevron-left", 22) + '</button><h1 class="h2">Friends</h1></div>';
    function note(title, text, cta) { return '<div class="screen stack-lg sq-friends">' + head + '<div class="empty stack"><div class="h3">' + title + '</div><p class="small">' + text + "</p>" + (cta || "") + "</div></div>"; }
    if (S.isGuest && S.isGuest()) return note("Friends need an account", "Guest mode doesn’t keep anything, so friends aren’t available. Choose Get started next time to save your progress, then sign in.");
    if (!C || !C.enabled()) return note("Friends need the online app", "Open Hobitual at hobitual.club to add friends.");
    if (!C.signedIn()) return '<div class="screen stack-lg sq-friends">' + head + loginCard() + "</div>";
    if (C.importOffered && C.importOffered()) return '<div class="screen stack-lg sq-friends">' + head +
      '<section class="card stack"><div class="h3">You’re verified</div><p class="small">This account is new. Bring the hobbies from this device into it? Friends will see them.</p>' +
      '<div class="row"><button type="button" class="btn primary" data-action="fr-import" data-bring="1">Bring them over</button><button type="button" class="btn" data-action="fr-import">Start fresh</button></div></section></div>';
    var d = cachedFriendList() || { code: "", friends: [], incoming: [], outgoing: [] }, mine = myHobbyKeys();
    // Search rows follow the latest friend list (e.g. someone accepted since the search ran).
    var st = {};
    d.friends.forEach(function (f) { st[f.code] = "friends"; }); d.outgoing.forEach(function (f) { st[f.code] = "sent"; }); d.incoming.forEach(function (f) { st[f.code] = "incoming"; });
    (fr.results || []).forEach(function (p) { p.status = st[p.code] || (p.status === "sent" ? null : p.status === "friends" ? null : p.status); });
    return '<div class="screen stack-lg sq-friends">' + head +
      '<section class="card stack sc-code"><span class="small muted">Your friend code</span><span class="sc-code-v num" aria-label="Your friend code ' + esc(d.code.split("").join(" ")) + '">' + esc(d.code || "········") + "</span>" +
      '<div class="row"><button type="button" class="btn sm" data-action="fr-copy">Copy</button><button type="button" class="btn sm" data-action="fr-share">' + icon("spark", 16) + " Share</button></div>" +
      '<p class="small muted">Send it to a friend. You’re friends once one of you adds the other’s code and the other accepts.</p></section>' +
      '<section class="stack"><label class="h3" for="fr-search">Find friends</label>' +
      '<input class="input" id="fr-search" type="search" data-role="fr-search" autocomplete="off" placeholder="Search by name" value="' + esc(fr.q) + '">' +
      '<div data-role="fr-results">' + searchRows() + "</div></section>" +
      '<form class="stack" data-role="fr-add"><label class="h3" for="fr-code">Have a friend code?</label><div class="nudge-row">' +
      '<input class="input" id="fr-code" name="code" maxlength="9" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="Their 8-character code">' +
      '<button type="submit" class="btn primary">Send</button></div></form>' +
      (fr.err ? '<p class="small" role="alert">' + esc(fr.err) + "</p>" : "") +
      (d.incoming.length ? '<section class="stack"><h2 class="h3">Requests</h2><ul class="stack sc-friend-list">' + d.incoming.map(function (f) {
        return '<li class="card sc-friend">' + mii(f.character, 40) + '<div class="sc-friend-body"><span class="h3">' + esc(f.name) + '</span><span class="small muted">wants to be friends</span>' +
          '<div class="row"><button type="button" class="btn sm primary" data-action="fr-accept" data-code="' + esc(f.code) + '">Accept</button><button type="button" class="btn sm" data-action="fr-decline" data-code="' + esc(f.code) + '">Decline</button></div></div></li>';
      }).join("") + "</ul></section>" : "") +
      '<section class="stack"><h2 class="h3">Your friends <span class="small muted num">' + d.friends.length + "</span></h2>" +
      (d.friends.length ? '<ul class="stack sc-friend-list">' + d.friends.map(function (f) { return friendCard(f, mine); }).join("") + "</ul>"
        : '<p class="small muted">No friends yet. Share your code to get started.</p>') + "</section>" +
      (d.outgoing.length ? '<section class="stack"><h2 class="h3">Sent</h2><ul class="stack sc-friend-list">' + d.outgoing.map(function (f) {
        return '<li class="card sc-friend">' + mii(f.character, 36) + '<div class="sc-friend-body"><span class="h3">' + esc(f.name) + '</span><span class="small muted">Waiting for them to accept</span></div>' +
          '<button type="button" class="btn ghost sm" data-action="fr-cancel" data-code="' + esc(f.code) + '">Cancel</button></li>';
      }).join("") + "</ul></section>" : "") +
      '<label class="sc-toggle"><input type="checkbox" data-role="fr-discover"' + (d.discoverable === false ? "" : " checked") + '><span>Let people find me by name<br><span class="small muted">Off: people can only add you with your code.</span></span></label>' +
      "</div>";
  }
  SQUI.register("friends", {
    tab: "me", title: "Friends",
    render: renderFriends,
    mount: function (root) {
      var host = root.firstElementChild, C = cloud();
      refreshFriends(function () { SQUI.refresh(); });
      function act(promise, ok) {
        promise.then(function (r) { fr.err = ""; fr.confirm = null; if (ok) ok(r); refreshFriends(function () { SQUI.refresh(); }, true); },
          function (e) { fr.err = e.message || "Something went wrong"; SQUI.refresh(); });
      }
      function login(promise, next) {
        fr.busy = true; fr.err = ""; SQUI.refresh();
        promise.then(function () { fr.busy = false; next(); SQUI.refresh(); refreshFriends(function () { SQUI.refresh(); }, true); },
          function (e) { fr.busy = false; fr.err = e.message || "Something went wrong"; SQUI.refresh(); var i = document.querySelector("#fr-otp"); if (i) i.focus(); });
      }
      function verify(code) {
        code = String(code || "").replace(/\D/g, "");
        if (code.length !== 6) { fr.err = "Enter the 6-digit code from the email."; SQUI.refresh(); return; }
        login(C.finishLogin(fr.login.email, code), function () { fr.login = { step: "email", email: "" }; });
      }
      var searchTimer = null;
      function search(q) {
        fr.q = q; clearTimeout(searchTimer);
        var box = host.querySelector('[data-role="fr-results"]');
        if (q.trim().length < 2) { fr.results = null; fr.searching = false; if (box) box.innerHTML = ""; return; }
        fr.searching = true; if (box) box.innerHTML = searchRows();
        searchTimer = setTimeout(function () {
          C.searchPeople(q.trim()).then(function (r) { if (fr.q !== q) return; fr.results = r.results; fr.searching = false; var b = host.querySelector('[data-role="fr-results"]'); if (b) b.innerHTML = searchRows(); },
            function (e) { fr.searching = false; fr.results = []; var b = host.querySelector('[data-role="fr-results"]'); if (b) b.innerHTML = '<p class="small" role="alert">' + esc(e.message || "Search failed") + "</p>"; });
        }, 300);
      }
      host.addEventListener("input", function (ev) {
        if (ev.target.matches('[data-role="fr-search"]')) search(ev.target.value);
        else if (ev.target.id === "fr-otp" && /^\d{6}$/.test(ev.target.value.replace(/\D/g, ""))) verify(ev.target.value);
      });
      host.addEventListener("change", function (ev) {
        if (!ev.target.matches('[data-role="fr-discover"]')) return;
        var on = ev.target.checked;
        C.setDiscoverable(on).then(function () { if (fr.data) fr.data.discoverable = on; SQUI.toast(on ? "People can find you by name" : "Only people with your code can add you"); },
          function (e) { ev.target.checked = !on; SQUI.toast(e.message || "Couldn’t save"); });
      });
      host.addEventListener("submit", function (ev) {
        if (ev.target.matches('[data-role="fr-email"]')) {
          ev.preventDefault();
          var email = String(new FormData(ev.target).get("email") || "").trim();
          fr.login.email = email;
          login(C.startLogin(email), function () { fr.login.step = "code"; setTimeout(function () { var i = document.querySelector("#fr-otp"); if (i) i.focus(); }, 30); });
          return;
        }
        if (ev.target.matches('[data-role="fr-verify"]')) { ev.preventDefault(); verify(new FormData(ev.target).get("code")); return; }
        if (!ev.target.matches('[data-role="fr-add"]')) return;
        ev.preventDefault();
        var code = String(new FormData(ev.target).get("code") || "").toUpperCase().replace(/[\s-]/g, "");
        if (!/^[A-HJ-NP-Z2-9]{8}$/.test(code)) { fr.err = "Friend codes are 8 letters and numbers."; SQUI.refresh(); return; }
        act(C.addFriend(code), function (r) { SQUI.toast(r.status === "friends" ? "You’re now friends" : "Request sent"); });
      });
      host.addEventListener("click", function (ev) {
        var b = ev.target.closest && ev.target.closest("[data-action]");
        if (!b) return;
        var a = b.getAttribute("data-action"), code = b.getAttribute("data-code"), d = cachedFriendList();
        if (a === "back") SQUI.back();
        else if (a === "fr-signin") {
          SQUI.go("me", {}, { reset: true });
          setTimeout(function () { if (C.beginSignIn()) { var p = document.querySelector("[data-cloud-panel]"); if (p) p.scrollIntoView({ block: "center" }); var i = document.querySelector("[data-cloud-email]"); if (i) i.focus(); } }, 60);
        }
        else if (a === "fr-copy" && d && d.code) {
          if (navigator.clipboard) navigator.clipboard.writeText(d.code).then(function () { SQUI.toast("Code copied"); }, function () { SQUI.toast("Couldn’t copy"); });
        }
        else if (a === "fr-share" && d && d.code) {
          var text = "Add me on Hobitual, where we make our hobbies a habit! My friend code is " + d.code + ". https://hobitual.club";
          if (navigator.share) navigator.share({ title: "Add me on Hobitual", text: text }).catch(function () { /* cancelled */ });
          else if (navigator.clipboard) navigator.clipboard.writeText(text).then(function () { SQUI.toast("Invite copied"); });
        }
        else if (a === "fr-accept") act(C.answerFriend(code, true), function () { SQUI.toast("You’re now friends"); markResult(code, "friends"); });
        else if (a === "fr-add-person") act(C.addFriend(code), function (r) { SQUI.toast(r.status === "friends" ? "You’re now friends" : "Request sent"); markResult(code, r.status === "friends" ? "friends" : "sent"); });
        else if (a === "fr-paste") {
          if (!navigator.clipboard || !navigator.clipboard.readText) { SQUI.toast("Long-press the box and choose Paste"); return; }
          navigator.clipboard.readText().then(function (t) {
            var m = String(t || "").match(/\d{6}/), i = host.querySelector("#fr-otp");
            if (!m) { SQUI.toast("No 6-digit code on the clipboard"); return; }
            if (i) i.value = m[0]; verify(m[0]);
          }, function () { SQUI.toast("Long-press the box and choose Paste"); });
        }
        else if (a === "fr-resend") login(C.startLogin(fr.login.email), function () { SQUI.toast("New code sent"); });
        else if (a === "fr-other-email") { fr.login.step = "email"; fr.err = ""; SQUI.refresh(); }
        else if (a === "fr-import") { C.resolveImport(b.hasAttribute("data-bring")).then(function () { refreshFriends(function () { SQUI.refresh(); }, true); SQUI.refresh(); }); }
        else if (a === "fr-decline") act(C.answerFriend(code, false));
        else if (a === "fr-cancel") act(C.removeFriend(code));
        else if (a === "fr-remove") { fr.confirm = code; SQUI.refresh(); }
        else if (a === "fr-remove-no") { fr.confirm = null; SQUI.refresh(); }
        else if (a === "fr-remove-yes") act(C.removeFriend(code), function () { SQUI.toast("Friend removed"); });
      });
    }
  });

  SQUI.register("me", {
    tab: "me", title: "Me",
    render: render,
    mount: function (root) {
      var host = root.firstElementChild; // #app-main persists across screens; bind to this screen's own node
      mountStage(host.querySelector(".sc-stage"), characterId());
      refreshFriends(function (d) { var el = host.querySelector('[data-role="friend-count"]'); if (el) el.textContent = friendCountText(d); });
      host.addEventListener("click", function (ev) {
        var b = ev.target.closest && ev.target.closest("[data-action]");
        if (!b) return;
        var a = b.getAttribute("data-action"), S = sq();
        if (a === "pick") { S.state.user.character = b.getAttribute("data-id"); S.save(); SQUI.refresh(); }
        else if (a === "achievements") SQUI.go("achievements");
        else if (a === "friends") SQUI.go("friends");
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
        else if (a === "sound") {
          S.state.user.sound = b.getAttribute("data-v") !== "off"; S.save(); SQUI.refresh();
          if (S.state.user.sound && SQUI.sound) SQUI.sound.play("xp");
        }
        else if (a === "seed") { S.seedDemo(); SQUI.go("today", {}, { reset: true }); SQUI.toast("Sample data loaded"); }
        else if (a === "reset") { ui.confirmReset = true; SQUI.refresh(); var c = document.querySelector("[data-action=reset-no]"); if (c) c.focus(); }
        else if (a === "reset-no") { ui.confirmReset = false; SQUI.refresh(); }
        else if (a === "reset-yes") { ui.confirmReset = false; S.reset(); SQUI.go("pick", {}, { reset: true }); }
      });
    }
  });
})();
