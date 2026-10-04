/* Habitual — SHELL: window.SQUI (router, UI kit, icons, mascot, reward overlay)
   and screens today, hobby, log, me, achievements. */
(function () {
  "use strict";
  var G = typeof window !== "undefined" ? window : globalThis;
  var HAS_DOM = typeof document !== "undefined";

  var SQUI = G.SQUI || {};
  G.SQUI = SQUI;
  SQUI.screens = SQUI.screens || {};

  /* ------------------------------------------------------------------ utils */
  function esc(s) {
    if (s === null || s === undefined) return "";
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }
  function money(r) {
    if (!r || !r.length) return "Free";
    var lo = Math.round(+r[0] || 0), hi = Math.round(+(r[1] == null ? r[0] : r[1]) || 0);
    if (hi < lo) { var t = lo; lo = hi; hi = t; }
    if (lo === 0 && hi === 0) return "Free";
    if (lo === hi) return "$" + lo.toLocaleString("en-US");
    return "$" + lo.toLocaleString("en-US") + "–" + hi.toLocaleString("en-US");
  }
  function sq() { return G.SQ; }
  function parseDate(s) {
    var p = String(s || "").split("-");
    return new Date(+p[0], (+p[1] || 1) - 1, +p[2] || 1);
  }
  function fmtDate(d) {
    var m = d.getMonth() + 1, dd = d.getDate();
    return d.getFullYear() + "-" + (m < 10 ? "0" : "") + m + "-" + (dd < 10 ? "0" : "") + dd;
  }
  function addDays(s, n) { var d = parseDate(s); d.setDate(d.getDate() + n); return fmtDate(d); }
  function todayStr() {
    try { return sq().today(); } catch (e) { return fmtDate(new Date()); }
  }
  function daysBetween(a, b) {
    try { return sq().daysBetween(a, b); } catch (e) {
      return Math.round((parseDate(b) - parseDate(a)) / 86400000);
    }
  }
  function weekKey(s) {
    try { return sq().weekKey(s); } catch (e) {
      var d = parseDate(s); var dow = (d.getDay() + 6) % 7; d.setDate(d.getDate() - dow); return fmtDate(d);
    }
  }
  var MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  var DOWS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  function relDay(s) {
    var n = daysBetween(s, todayStr());
    if (n <= 0) return "Today";
    if (n === 1) return "Yesterday";
    if (n < 7) return n + " days ago";
    var d = parseDate(s);
    return DOWS[(d.getDay() + 6) % 7] + ", " + MONTHS[d.getMonth()] + " " + d.getDate();
  }
  function fmtMinutes(m) {
    m = Math.round(m || 0);
    if (m < 60) return m + "m";
    var h = Math.floor(m / 60), r = m % 60;
    return h + "h" + (r ? " " + r + "m" : "");
  }
  function pct(a, b) { return b > 0 ? Math.max(0, Math.min(100, Math.round(a / b * 100))) : 0; }
  function hobby(id) { try { return sq().getHobby(id) || null; } catch (e) { return null; } }
  function tracked(id) {
    var st = sq() && sq().state;
    if (!st || !st.tracked) return null;
    for (var i = 0; i < st.tracked.length; i++) if (st.tracked[i].hobbyId === id) return st.tracked[i];
    return null;
  }
  var STAGES = ["Seed", "Sprout", "Sapling", "Bloom", "Tree"];
  var CAT_LABEL = { creative: "Creative", active: "Active", technical: "Technical", social: "Social", relaxing: "Relaxing" };
  var SIZES = [
    { k: "tiny", label: "Tiny", xp: 10 },
    { k: "regular", label: "Regular", xp: 25 },
    { k: "big", label: "Big", xp: 50 }
  ];
  function sizeLabel(k) { for (var i = 0; i < SIZES.length; i++) if (SIZES[i].k === k) return SIZES[i].label; return k || ""; }
  function prefersReduced() {
    try { return G.matchMedia && G.matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) { return false; }
  }

  /* ------------------------------------------------------------------ icons */
  var ICONS = {
    creative: '<path d="M12 3a9 9 0 1 0 0 18c1 0 1.7-.7 1.7-1.6 0-.5-.2-.9-.5-1.2-.3-.3-.5-.7-.5-1.2 0-.9.8-1.7 1.7-1.7H16a5 5 0 0 0 5-5c0-4-4-7.3-9-7.3z"/><circle cx="7.5" cy="11" r="1.2"/><circle cx="10.5" cy="7" r="1.2"/><circle cx="15" cy="7.5" r="1.2"/>',
    active: '<path d="M3 12h4l2.5-6 5 12 2.5-6h4"/>',
    technical: '<path d="M8 7l-5 5 5 5"/><path d="M16 7l5 5-5 5"/><path d="M13.5 4.5l-3 15"/>',
    social: '<path d="M20.5 12a8.5 8.5 0 0 1-12.3 7.6L3.5 20.5l1-4.4A8.5 8.5 0 1 1 20.5 12z"/><path d="M8.5 12h.01M12 12h.01M15.5 12h.01"/>',
    relaxing: '<path d="M4 10h12v3a6 6 0 0 1-12 0z"/><path d="M16 11h1.5a2.5 2.5 0 0 1 0 5H15"/><path d="M8 3.5c0 1.5 1 1.5 1 3"/><path d="M12 3.5c0 1.5 1 1.5 1 3"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    minus: '<path d="M5 12h14"/>',
    check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
    "chevron-right": '<path d="M9 6l6 6-6 6"/>',
    "chevron-left": '<path d="M15 6l-6 6 6 6"/>',
    flame: '<path d="M12 3c.8 3.3 5.5 5.2 5.5 10.2a5.5 5.5 0 0 1-11 0c0-2.4 1.2-4 2.4-5 .2 1.8 1 2.8 2.2 3.3-.5-3.3.2-6 .9-8.5z"/>',
    spark: '<path d="M12 3l1.9 5.6L19.5 10.5l-5.6 1.9L12 18l-1.9-5.6L4.5 10.5l5.6-1.9z"/><path d="M19 17v4M17 19h4"/>',
    calendar: '<rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
    pin: '<path d="M12 21s-6.5-5.8-6.5-11.2a6.5 6.5 0 0 1 13 0C18.5 15.2 12 21 12 21z"/><circle cx="12" cy="9.8" r="2.4"/>',
    users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.6-3.4 3.2-5.5 6.5-5.5s5.9 2.1 6.5 5.5"/><path d="M16 4.7a3.5 3.5 0 0 1 0 6.6"/><path d="M18 14.8c1.9.7 3.1 2.6 3.5 5.2"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4.5 20.5c.8-4 3.8-6.3 7.5-6.3s6.7 2.3 7.5 6.3"/>',
    lock: '<rect x="5" y="10.5" width="14" height="10" rx="2.5"/><path d="M8.5 10.5V7.5a3.5 3.5 0 0 1 7 0v3"/>',
    star: '<path d="M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.8L12 16.8l-5.2 2.8 1-5.8-4.3-4.1 5.9-.8z"/>',
    clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
    close: '<path d="M6 6l12 12M18 6L6 18"/>',
    search: '<circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4.3-4.3"/>',
    play: '<circle cx="12" cy="12" r="9"/><path d="M10 8.5l6 3.5-6 3.5z"/>',
    leaf: '<path d="M5 19.5C5 11 10 5 20 4.5c0 10-5.5 15-13.5 15z"/><path d="M5 19.5c3-4.5 6-7.5 9.5-9.5"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4"/>',
    compass: '<circle cx="12" cy="12" r="8.5"/><path d="M15.5 8.5l-2 5-5 2 2-5z"/>',
    trophy: '<path d="M8 4h8v5a4 4 0 0 1-8 0z"/><path d="M8 6H4.5c0 3 1.5 4.5 3.7 4.8M16 6h3.5c0 3-1.5 4.5-3.7 4.8"/><path d="M12 13v4M8.5 20.5h7M9.5 17h5v3.5h-5z"/>',
    trash: '<path d="M4.5 7h15M10 4h4M6.5 7l1 13h9l1-13"/>',
    bell: '<path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z"/><path d="M10 20.5a2 2 0 0 0 4 0"/>',
    moon: '<path d="M19.5 14.5A8 8 0 0 1 9.5 4.5a8 8 0 1 0 10 10z"/>'
  };
  var HOBBY_ICONS = {
    drawing: '<path d="M4 20l1.2-4.3L15.8 5.1a2 2 0 0 1 2.9 0l.2.2a2 2 0 0 1 0 2.9L8.3 18.8z"/><path d="M14 7l3 3"/><path d="M13 20.5h7"/>',
    running: '<path d="M3 17.5V13l3.5-4.5 2.5 1.5L11 7l2 .5c.5 2.5 2.5 3.5 5 3.8 1.8.2 3 1.3 3 3v3.2z"/><path d="M3 20.5h18"/><path d="M11 12l1.5 1M9.5 14l1.5 1"/>',
    tennis: '<circle cx="12" cy="12" r="8.5"/><path d="M5.6 6.4c3.2 2.8 3.2 8.4 0 11.2"/><path d="M18.4 6.4c-3.2 2.8-3.2 8.4 0 11.2"/>',
    guitar: '<path d="M13 11l7-7"/><path d="M18.5 2.5l3 3"/><path d="M11.8 9.2c-1.5-.6-3.3-.3-4.5.9-.6.6-.9 1.3-1 2.1-.8.1-1.6.4-2.2 1-1.6 1.6-1.3 4.4.6 6.2 1.9 1.9 4.6 2.2 6.2.6.6-.6.9-1.4 1-2.2.8-.1 1.5-.4 2.1-1 1.2-1.2 1.5-3 .9-4.5"/><circle cx="9.5" cy="14.5" r="1.3"/>',
    photography: '<rect x="3" y="7" width="18" height="13" rx="2.5"/><path d="M8.5 7l1.4-2.5h4.2L15.5 7"/><circle cx="12" cy="13.5" r="3.5"/><path d="M17.5 10h.01"/>',
    cooking: '<path d="M4.5 10.5h15v5a4.5 4.5 0 0 1-4.5 4.5H9a4.5 4.5 0 0 1-4.5-4.5z"/><path d="M2.5 10.5h19"/><path d="M9 7.5c0-1.2 1-1.6 1-2.8M14 7.5c0-1.2 1-1.6 1-2.8"/>',
    hiking: '<path d="M2.5 20l7-11.5 4 6.5 2.5-4 5.5 9z"/><path d="M7.4 12l1.6 1.2 1.6-1.2"/>',
    soccer: '<circle cx="12" cy="12" r="8.5"/><path d="M12 8.5l3.3 2.4-1.3 3.9h-4l-1.3-3.9z"/><path d="M12 8.5V3.5M15.3 10.9l4.8-1.5M14 14.8l2.9 4.1M10 14.8l-2.9 4.1M8.7 10.9L3.9 9.4"/>',
    knitting: '<circle cx="11" cy="13" r="7.5"/><path d="M5.5 8.5c4 .3 8.5 3.5 10 10"/><path d="M4 13.5c3.5.2 6.5 2.5 7.5 6.8"/><path d="M8.5 6c3.5 1.5 7 5 8 9"/><path d="M15 2.5l6.5 6.5M18 2l3.5 3.5"/>',
    bouldering: '<path d="M10 3h4a4 4 0 0 1 4 4v10a4 4 0 0 1-4 4h-4a4 4 0 0 1-4-4V7a4 4 0 0 1 4-4z"/><path d="M10 7.5v8"/><path d="M8.7 15.5h2.6"/>',
    chess: '<circle cx="12" cy="6" r="2.5"/><path d="M9.5 10.5h5"/><path d="M10.3 10.5c0 3-1 5.2-2.8 7.5h9c-1.8-2.3-2.8-4.5-2.8-7.5"/><path d="M6 21h12"/>',
    gardening: '<path d="M6.5 14h11l-1.6 7H8.1z"/><path d="M12 14V8"/><path d="M12 10.5c-3 0-4.8-2-4.8-4.8 3 0 4.8 2 4.8 4.8z"/><path d="M12 8.5c0-2.8 1.8-4.8 4.8-4.8 0 2.8-1.8 4.8-4.8 4.8z"/>',
    painting: '<path d="M4 20l1.2-4.3L15.8 5.1a2 2 0 0 1 2.9 0l.2.2a2 2 0 0 1 0 2.9L8.3 18.8z"/><path d="M14 7l3 3"/><path d="M13 20.5h7"/>',
    sewing: '<path d="M4 19L19 4M15 4h4v4"/><path d="M5 15l4 4"/><circle cx="6" cy="6" r="2.5"/><path d="M8 8l3 3"/>',
    journaling: '<path d="M5 4.5h11a3 3 0 0 1 3 3V20H8a3 3 0 0 1-3-3z"/><path d="M8 4.5V20M11 9h5M11 13h5"/>',
    piano: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M7 5v9M11 5v9M15 5v9M19 5v9M8.5 5v6M12.5 5v6M16.5 5v6"/>',
    basketball: '<circle cx="12" cy="12" r="8.5"/><path d="M4 9c5 1 9 5 11 10M9 4c1 5 5 9 10 11M3.5 13h17M13 3.5v17"/>'
  };
  function svgWrap(inner, size, sw) {
    size = size || 20;
    return '<svg class="sq-ic" width="' + size + '" height="' + size + '" viewBox="0 0 24 24" fill="none" ' +
      'stroke="currentColor" stroke-width="' + (sw || 1.75) + '" stroke-linecap="round" stroke-linejoin="round" ' +
      'aria-hidden="true" focusable="false">' + inner + "</svg>";
  }
  function icon(name, size) {
    return svgWrap(ICONS[name] || ICONS.leaf, size || 20);
  }
  function hobbyIcon(id, size) {
    size = size || 24;
    if (HOBBY_ICONS[id]) return svgWrap(HOBBY_ICONS[id], size);
    var h = hobby(id);
    var cat = h && h.category;
    return svgWrap(ICONS[cat] || ICONS.leaf, size);
  }
  var HOBBY_PHOTOS = {
    guitar: 1, soccer: 1, tennis: 1, painting: 1, photography: 1,
    running: 1, sewing: 1, journaling: 1, piano: 1, basketball: 1
  };
  function hobbyPicture(id, alt, className) {
    if (!HOBBY_PHOTOS[id]) return '<span class="sq-photo-fallback" aria-hidden="true">' + hobbyIcon(id, 28) + "</span>";
    return '<img class="' + esc(className || "sq-hobby-photo") + '" src="../assets/hobbies/' + esc(id) + '.jpg" alt="' + esc(alt || "") + '" loading="lazy">';
  }

  /* ------------------------------------------------------------------ mascot */
  function st(fill, stroke, extra) {
    return ' style="fill:' + (fill || "none") + ";stroke:" + (stroke || "none") + (extra ? ";" + extra : "") + '"';
  }
  function leafPath(x, y, len, angle, w) {
    // a leaf shape from (x,y) pointing at angle (deg), length len
    var a = angle * Math.PI / 180, c = Math.cos(a), s = Math.sin(a);
    var tx = x + c * len, ty = y + s * len;
    var nx = -s * (w || len * 0.42), ny = c * (w || len * 0.42);
    var mx = x + c * len * 0.5, my = y + s * len * 0.5;
    return "M" + r1(x) + " " + r1(y) + " Q" + r1(mx + nx) + " " + r1(my + ny) + " " + r1(tx) + " " + r1(ty) +
      " Q" + r1(mx - nx) + " " + r1(my - ny) + " " + r1(x) + " " + r1(y) + "Z";
  }
  function r1(n) { return Math.round(n * 10) / 10; }

  function mascot(stage, opts) {
    opts = opts || {};
    stage = Math.max(0, Math.min(4, +stage || 0));
    var mood = opts.mood || "happy";
    var size = opts.size || 120;
    var acc = opts.accessories || [];
    var LEAF = "var(--leaf)";
    var LEAF_D = "color-mix(in srgb, var(--leaf) 72%, var(--ink))";
    var OUT = "color-mix(in srgb, var(--leaf) 55%, var(--ink))";
    var body = LEAF, face = "var(--leaf-ink)", belly = "color-mix(in srgb, var(--leaf) 78%, var(--leaf-ink))";
    // geometry per stage
    var G0 = [
      { cy: 90, rx: 21, ry: 18 },
      { cy: 84, rx: 24, ry: 23 },
      { cy: 80, rx: 26, ry: 27 },
      { cy: 80, rx: 27, ry: 27 },
      { cy: 86, rx: 28, ry: 23 }
    ][stage];
    if (stage === 0) {
      body = "color-mix(in srgb, var(--warn) 72%, var(--surface))";
      face = "var(--sun-ink)";
      belly = "color-mix(in srgb, var(--warn) 50%, var(--surface))";
      OUT = "color-mix(in srgb, var(--warn) 70%, var(--ink))";
    } else if (stage === 4) {
      body = "color-mix(in srgb, var(--warn) 58%, var(--ink))";
      belly = "color-mix(in srgb, var(--warn) 45%, var(--ink))";
      OUT = "color-mix(in srgb, var(--warn) 40%, var(--ink))";
    }
    var cx = 60, cy = G0.cy, rx = G0.rx, ry = G0.ry, top = cy - ry;
    var s = "";
    // ground
    s += '<ellipse cx="60" cy="109" rx="' + (24 + stage * 5) + '" ry="5"' + st("var(--surface-2)", "var(--line)", "stroke-width:1.5") + "/>";
    // tree canopy behind
    if (stage === 4) {
      var cc = "color-mix(in srgb, var(--leaf) 85%, var(--ink))";
      s += '<g' + st(LEAF, OUT, "stroke-width:2") + '>' +
        '<circle cx="38" cy="44" r="18"/><circle cx="82" cy="44" r="18"/><circle cx="60" cy="30" r="22"/>' +
        '<circle cx="46" cy="58" r="15"/><circle cx="74" cy="58" r="15"/></g>';
      s += '<g' + st(LEAF, "none") + '><circle cx="38" cy="44" r="16.5"/><circle cx="82" cy="44" r="16.5"/>' +
        '<circle cx="60" cy="30" r="20.5"/><circle cx="46" cy="58" r="13.5"/><circle cx="74" cy="58" r="13.5"/></g>';
      s += '<g' + st(cc, "none") + '><circle cx="52" cy="26" r="3"/><circle cx="73" cy="38" r="2.5"/><circle cx="34" cy="46" r="2.5"/><circle cx="84" cy="52" r="2"/></g>';
    }
    // stem + leaves on top (stages 0-3)
    var cheer = mood === "cheer";
    if (stage === 0) {
      s += '<path d="M60 ' + (top + 1) + ' q1 -6 4 -8"' + st("none", LEAF_D, "stroke-width:2.2;stroke-linecap:round") + "/>";
      s += '<path d="' + leafPath(63, top - 6, 9, -30, 3.5) + '"' + st(LEAF, "none") + "/>";
    } else if (stage === 1) {
      s += '<path d="M60 ' + (top + 2) + ' v-10"' + st("none", LEAF_D, "stroke-width:2.4;stroke-linecap:round") + "/>";
      s += '<path d="' + leafPath(60, top - 7, 16, -150, 6) + '"' + st(LEAF, OUT, "stroke-width:1.5") + "/>";
      s += '<path d="' + leafPath(60, top - 7, 16, -30, 6) + '"' + st(LEAF, OUT, "stroke-width:1.5") + "/>";
    } else if (stage === 2 || stage === 3) {
      var stemTop = top - (stage === 3 ? 24 : 20);
      s += '<path d="M60 ' + (top + 2) + ' V' + stemTop + '"' + st("none", LEAF_D, "stroke-width:2.6;stroke-linecap:round") + "/>";
      s += '<path d="' + leafPath(60, top - 6, 18, -160, 7) + '"' + st(LEAF, OUT, "stroke-width:1.5") + "/>";
      s += '<path d="' + leafPath(60, top - 6, 18, -20, 7) + '"' + st(LEAF, OUT, "stroke-width:1.5") + "/>";
      s += '<path d="' + leafPath(60, top - 14, 15, -135, 6) + '"' + st(LEAF, OUT, "stroke-width:1.5") + "/>";
      s += '<path d="' + leafPath(60, top - 14, 15, -45, 6) + '"' + st(LEAF, OUT, "stroke-width:1.5") + "/>";
      if (stage === 3) {
        var fy = stemTop - 4, petal = "color-mix(in srgb, var(--bad) 55%, var(--surface))";
        for (var p = 0; p < 6; p++) {
          var ang = p * 60 * Math.PI / 180;
          s += '<ellipse cx="' + r1(60 + Math.cos(ang) * 7) + '" cy="' + r1(fy + Math.sin(ang) * 7) + '" rx="5" ry="5"' + st(petal, "color-mix(in srgb, var(--bad) 70%, var(--ink))", "stroke-width:1.2") + "/>";
        }
        s += '<circle cx="60" cy="' + fy + '" r="4.5"' + st("var(--warn)", "none") + "/>";
      } else {
        s += '<path d="' + leafPath(60, stemTop + 1, 11, -90, 5) + '"' + st(LEAF, OUT, "stroke-width:1.5") + "/>";
      }
    }
    // arms (leaf hands) stage >= 1
    if (stage >= 1) {
      var ay = cy + ry * 0.15, al = 11 + stage * 1.5;
      var la = cheer ? -140 : 160, ra = cheer ? -40 : 20;
      var armFill = stage === 4 ? LEAF : LEAF_D;
      s += '<path class="m-arm" d="' + leafPath(cx - rx + 2, ay, al, la, 4.5) + '"' + st(armFill, OUT, "stroke-width:1.3") + "/>";
      s += '<path class="m-arm" d="' + leafPath(cx + rx - 2, ay, al, ra, 4.5) + '"' + st(armFill, OUT, "stroke-width:1.3") + "/>";
    }
    // body
    var bodyPath = "M" + (cx - rx) + " " + cy +
      " C" + (cx - rx) + " " + r1(cy - ry * 1.1) + " " + (cx + rx) + " " + r1(cy - ry * 1.1) + " " + (cx + rx) + " " + cy +
      " C" + (cx + rx) + " " + r1(cy + ry * 0.75) + " " + r1(cx + rx * 0.6) + " " + (cy + ry) + " " + cx + " " + (cy + ry) +
      " C" + r1(cx - rx * 0.6) + " " + (cy + ry) + " " + (cx - rx) + " " + r1(cy + ry * 0.75) + " " + (cx - rx) + " " + cy + "Z";
    s += '<path d="' + bodyPath + '"' + st(body, OUT, "stroke-width:2") + "/>";
    s += '<ellipse cx="' + cx + '" cy="' + r1(cy + ry * 0.45) + '" rx="' + r1(rx * 0.55) + '" ry="' + r1(ry * 0.38) + '"' + st(belly, "none") + "/>";
    if (stage === 0) {
      s += '<path d="M' + (cx - 9) + " " + (top + 5) + " l4 3 l4 -3 l4 3 l4 -3" + '"' + st("none", OUT, "stroke-width:1.5;stroke-linecap:round;stroke-linejoin:round") + "/>";
    }
    if (stage === 4) {
      s += '<path d="M' + (cx - 14) + " " + (cy + 8) + " q3 6 0 12 M" + (cx + 15) + " " + (cy + 6) + ' q-3 5 0 11"' + st("none", OUT, "stroke-width:1.5;stroke-linecap:round") + "/>";
    }
    // face
    var ey = r1(cy - ry * 0.08), ex = r1(rx * 0.4), my = r1(cy + ry * 0.26);
    var fst = st("none", face, "stroke-width:2.4;stroke-linecap:round;stroke-linejoin:round");
    if (mood === "sleepy") {
      s += '<path d="M' + r1(cx - ex - 4) + " " + ey + " q4 3.5 8 0 M" + r1(cx + ex - 4) + " " + ey + ' q4 3.5 8 0"' + fst + "/>";
      s += '<ellipse cx="' + cx + '" cy="' + r1(my + 1) + '" rx="2.6" ry="2"' + st(face, "none") + "/>";
      var zx = cx + rx + 4, zy = top - 2;
      s += '<g class="m-z"' + st("none", "var(--ink-2)", "stroke-width:2;stroke-linecap:round;stroke-linejoin:round") + '>' +
        '<path d="M' + zx + " " + zy + " h7 l-7 8 h7" + '"/>' +
        '<path d="M' + (zx + 11) + " " + (zy - 9) + " h4.5 l-4.5 5 h4.5" + '" style="stroke-width:1.6"/></g>';
    } else if (cheer) {
      s += '<path d="M' + r1(cx - ex - 4) + " " + r1(ey + 2) + " l4 -4.5 l4 4.5 M" + r1(cx + ex - 4) + " " + r1(ey + 2) + ' l4 -4.5 l4 4.5"' + fst + "/>";
      s += '<path d="M' + (cx - 7) + " " + (my - 2) + " q7 0 14 0 q-1 8 -7 8 q-6 0 -7 -8z" + '"' + st(face, face, "stroke-width:1.6;stroke-linejoin:round") + "/>";
    } else {
      s += '<ellipse cx="' + r1(cx - ex) + '" cy="' + ey + '" rx="2.7" ry="3.4"' + st(face, "none") + "/>";
      s += '<ellipse cx="' + r1(cx + ex) + '" cy="' + ey + '" rx="2.7" ry="3.4"' + st(face, "none") + "/>";
      s += '<path d="M' + (cx - 5) + " " + (my - 1) + ' q5 5 10 0"' + fst + "/>";
    }
    var cheek = "color-mix(in srgb, var(--bad) 45%, transparent)";
    s += '<ellipse cx="' + r1(cx - ex - 6) + '" cy="' + r1(my - 1) + '" rx="3.6" ry="2.3"' + st(cheek, "none") + "/>";
    s += '<ellipse cx="' + r1(cx + ex + 6) + '" cy="' + r1(my - 1) + '" rx="3.6" ry="2.3"' + st(cheek, "none") + "/>";

    // accessories
    var has = {}; acc.forEach(function (a) { has[a] = 1; });
    var ink = "var(--ink)";
    if (has.social) { // scarf at the base of the head
      var sy = r1(cy + ry * 0.62);
      s += '<path d="M' + r1(cx - rx * 0.85) + " " + r1(sy - 3) + " Q" + cx + " " + r1(sy + 6) + " " + r1(cx + rx * 0.85) + " " + r1(sy - 3) +
        " L" + r1(cx + rx * 0.8) + " " + r1(sy + 3) + " Q" + cx + " " + r1(sy + 12) + " " + r1(cx - rx * 0.8) + " " + r1(sy + 3) + 'Z"' +
        st("var(--sky)", "color-mix(in srgb, var(--sky) 60%, var(--ink))", "stroke-width:1.4") + "/>";
      s += '<path d="M' + r1(cx + rx * 0.35) + " " + r1(sy + 5) + " l3 12 l6 -2 l-3 -11z" + '"' +
        st("var(--sky)", "color-mix(in srgb, var(--sky) 60%, var(--ink))", "stroke-width:1.4;stroke-linejoin:round") + "/>";
    }
    if (has.technical) { // round glasses
      var gs = st("color-mix(in srgb, var(--surface) 25%, transparent)", ink, "stroke-width:1.8");
      s += '<circle cx="' + r1(cx - ex) + '" cy="' + ey + '" r="6"' + gs + "/>";
      s += '<circle cx="' + r1(cx + ex) + '" cy="' + ey + '" r="6"' + gs + "/>";
      s += '<path d="M' + r1(cx - ex + 6) + " " + ey + " H" + r1(cx + ex - 6) + '"' + st("none", ink, "stroke-width:1.8") + "/>";
    }
    var hat = has.relaxing ? "relaxing" : has.creative ? "creative" : null;
    if (has.active && !hat) { // headband
      var hy = r1(top + ry * 0.32);
      s += '<path d="M' + r1(cx - rx * 0.93) + " " + r1(hy + 1) + " Q" + cx + " " + r1(hy - 6) + " " + r1(cx + rx * 0.93) + " " + r1(hy + 1) + '"' +
        st("none", "var(--bad)", "stroke-width:5;stroke-linecap:round") + "/>";
      s += '<path d="M' + r1(cx + rx * 0.9) + " " + r1(hy) + " l7 -4 M" + r1(cx + rx * 0.9) + " " + r1(hy + 1) + ' l7 3"' +
        st("none", "var(--bad)", "stroke-width:3;stroke-linecap:round") + "/>";
    }
    if (hat === "creative") { // beret
      var by = r1(top + 2);
      s += '<path d="M' + r1(cx - rx * 0.9) + " " + r1(by + 3) + " C" + r1(cx - rx * 0.9) + " " + r1(by - 12) + " " + r1(cx + rx * 1.05) + " " + r1(by - 12) + " " + r1(cx + rx * 0.95) + " " + r1(by + 2) +
        " Q" + cx + " " + r1(by + 7) + " " + r1(cx - rx * 0.9) + " " + r1(by + 3) + 'Z"' +
        st("var(--bad)", "color-mix(in srgb, var(--bad) 60%, var(--ink))", "stroke-width:1.5") + "/>";
      s += '<path d="M' + (cx + 2) + " " + r1(by - 8) + ' l2 -4"' + st("none", "color-mix(in srgb, var(--bad) 60%, var(--ink))", "stroke-width:2.2;stroke-linecap:round") + "/>";
    } else if (hat === "relaxing") { // sun hat
      var hy2 = r1(top + 3);
      var straw = "color-mix(in srgb, var(--warn) 40%, var(--surface))", strawO = "color-mix(in srgb, var(--warn) 70%, var(--ink))";
      s += '<ellipse cx="' + cx + '" cy="' + hy2 + '" rx="' + r1(rx * 1.35) + '" ry="5"' + st(straw, strawO, "stroke-width:1.5") + "/>";
      s += '<path d="M' + r1(cx - rx * 0.6) + " " + hy2 + " C" + r1(cx - rx * 0.6) + " " + r1(hy2 - 15) + " " + r1(cx + rx * 0.6) + " " + r1(hy2 - 15) + " " + r1(cx + rx * 0.6) + " " + hy2 + 'Z"' + st(straw, strawO, "stroke-width:1.5") + "/>";
      s += '<path d="M' + r1(cx - rx * 0.58) + " " + r1(hy2 - 3) + " H" + r1(cx + rx * 0.58) + '"' + st("none", "var(--leaf)", "stroke-width:3") + "/>";
    }

    var label = "Sprout the mascot, " + STAGES[stage] + " stage, " + (mood === "sleepy" ? "sleeping" : mood === "cheer" ? "cheering" : "smiling");
    return '<svg class="sq-mascot ' + esc(mood) + '" width="' + size + '" height="' + size + '" viewBox="0 0 120 120" role="img" aria-label="' + esc(label) + '">' +
      '<g class="m-bob">' + s + "</g></svg>";
  }

  /* ------------------------------------------------------------------ router */
  var stack = [];
  var current = null; // {name, params}
  var navBound = false;

  function register(name, def) {
    if (!name || !def) return;
    SQUI.screens[name] = def;
  }
  function screenTab(def) {
    try { var t = def && def.tab; return t === undefined ? null : t; } catch (e) { return null; }
  }
  function mainEl() { return HAS_DOM ? document.getElementById("app-main") : null; }

  function errorCard(title, err) {
    return '<div class="screen"><div class="sq-err stack"><div class="h3">' + esc(title) + "</div>" +
      '<p class="small muted">Something went wrong drawing this screen. Your progress is safe.</p>' +
      (err ? "<code>" + esc(err && err.message ? err.message : String(err)) + "</code>" : "") +
      '<div class="row"><button type="button" class="btn sm" data-sq-fallback="today">Go to Today</button></div></div></div>';
  }
  function fallbackScreen(name) {
    return '<div class="screen"><div class="empty stack">' +
      '<div class="h3">This part is still growing</div>' +
      '<p class="small">The "' + esc(name) + '" screen isn’t available yet.</p>' +
      '<div class="row" style="justify-content:center"><button type="button" class="btn sm" data-sq-fallback="back">Go back</button></div></div></div>';
  }

  function renderCurrent() {
    var main = mainEl();
    if (!main || !current) return;
    var def = SQUI.screens[current.name];
    var tab = null;
    if (!def) {
      main.innerHTML = fallbackScreen(current.name);
      tab = "today";
    } else {
      var html;
      try {
        html = def.render ? def.render(current.params || {}) : "";
      } catch (e) {
        logErr(e);
        html = errorCard("Couldn’t open this screen", e);
      }
      main.innerHTML = html || "";
      try {
        if (def.mount) def.mount(main, current.params || {});
      } catch (e2) {
        logErr(e2);
        main.insertAdjacentHTML("afterbegin", errorCard("Part of this screen didn’t load", e2));
      }
      tab = screenTab(def);
    }
    renderNav(tab);
    if (HAS_DOM) {
      try { document.title = (def && def.title ? def.title + " · " : "") + "Habitual"; } catch (e) { /* ignore */ }
    }
  }
  function logErr(e) { try { console.warn("[Habitual]", e); } catch (x) { /* ignore */ } }

  function go(name, params, opts) {
    params = params || {};
    opts = opts || {};
    var entry = { name: name, params: params };
    if (opts.reset) stack = [];
    if (opts.replace && stack.length) stack[stack.length - 1] = entry;
    else stack.push(entry);
    if (stack.length > 50) stack.splice(0, stack.length - 50);
    current = entry;
    renderCurrent();
    if (HAS_DOM) {
      try { G.scrollTo(0, 0); } catch (e) { /* ignore */ }
      var m = mainEl();
      if (m && opts.focus !== false) { try { m.setAttribute("tabindex", "-1"); m.focus({ preventScroll: true }); } catch (e) { /* ignore */ } }
    }
  }
  function back() {
    if (stack.length > 1) {
      stack.pop();
      current = stack[stack.length - 1];
      renderCurrent();
      try { G.scrollTo(0, 0); } catch (e) { /* ignore */ }
    } else {
      go("today", {}, { reset: true });
    }
  }
  // Re-rendering replaces every node, so keyboard focus would fall back to <body>.
  // Remember the focused control by its identifying attributes and restore it afterwards.
  var FOCUS_ATTRS = ["data-action", "data-id", "data-d", "data-ms", "data-size", "data-m", "data-t", "data-tier", "data-f", "data-nav", "data-v", "data-rw-close", "id"];
  function focusKey(el) {
    if (!HAS_DOM || !el || el === document.body || !el.getAttribute) return null;
    var sel = "";
    FOCUS_ATTRS.forEach(function (a) {
      var v = el.getAttribute(a);
      if (v !== null) sel += "[" + a + '="' + String(v).replace(/["\\]/g, "\\$&") + '"]';
    });
    return sel || null;
  }
  function restoreFocus(key, scope) {
    if (!key || !HAS_DOM) return false;
    try {
      var el = (scope || document).querySelector(key);
      if (el && !el.disabled) { el.focus({ preventScroll: true }); return document.activeElement === el; }
    } catch (e) { /* ignore */ }
    return false;
  }
  function refresh() {
    if (!current) return;
    var y = HAS_DOM ? (G.scrollY || 0) : 0;
    var main = mainEl();
    var act = HAS_DOM ? document.activeElement : null;
    var key = act && main && main.contains(act) ? focusKey(act) : null;
    renderCurrent();
    if (key && !restoreFocus(key, main) && main) {
      try { main.setAttribute("tabindex", "-1"); main.focus({ preventScroll: true }); } catch (e) { /* ignore */ }
    }
    try { G.scrollTo(0, y); } catch (e) { /* ignore */ }
  }

  var NAV = [
    { tab: "today", label: "Today", ic: "sun" },
    { tab: "discover", label: "Discover", ic: "compass" },
    { tab: "community", label: "Community", ic: "users" },
    { tab: "me", label: "Me", ic: "user" }
  ];
  function renderNav(tab) {
    if (!HAS_DOM) return;
    var nav = document.getElementById("app-nav");
    if (!nav) return;
    if (!tab) {
      nav.hidden = true;
      document.body.classList.remove("has-nav");
      return;
    }
    nav.hidden = false;
    document.body.classList.add("has-nav");
    var locked = false;
    try { locked = !sq().communityUnlocked(); } catch (e) { locked = false; }
    nav.innerHTML = '<div class="nav-inner">' + NAV.map(function (n) {
      var on = n.tab === tab;
      var lock = n.tab === "community" && locked;
      return '<button type="button" class="nav-btn' + (on ? " on" : "") + '" data-nav="' + n.tab + '"' +
        (on ? ' aria-current="page"' : "") + (lock ? ' aria-label="Community (locked until you track a hobby)"' : "") + ">" +
        '<span class="nav-ic">' + icon(n.ic, 22) +
        (lock ? '<span class="nav-lock">' + icon("lock", 10) + "</span>" : "") + "</span>" +
        "<span>" + n.label + "</span></button>";
    }).join("") + "</div>";
    if (!navBound) {
      navBound = true;
      nav.addEventListener("click", function (ev) {
        var b = ev.target.closest && ev.target.closest("[data-nav]");
        if (!b) return;
        var t = b.getAttribute("data-nav");
        go(t, {}, { reset: true });
      });
    }
  }

  function bindFallbacks() {
    if (!HAS_DOM) return;
    var main = mainEl();
    if (!main || main.__sqFallback) return;
    main.__sqFallback = true;
    main.addEventListener("click", function (ev) {
      var b = ev.target.closest && ev.target.closest("[data-sq-fallback]");
      if (!b) return;
      if (b.getAttribute("data-sq-fallback") === "back") back();
      else go("today", {}, { reset: true });
    });
  }

  /* ------------------------------------------------------------------ toast */
  var toastTimer = null;
  function toast(text) {
    if (!HAS_DOM) return;
    var root = document.getElementById("toast-root");
    if (!root) return;
    clearTimeout(toastTimer);
    root.innerHTML = '<div class="toast" role="status">' + esc(text) + "</div>";
    var el = root.firstChild;
    toastTimer = setTimeout(function () {
      if (el) el.classList.add("out");
      toastTimer = setTimeout(function () { if (root.firstChild === el) root.innerHTML = ""; }, 220);
    }, 2200);
  }

  /* ------------------------------------------------------------------ theme */
  var THEME_KEY = "sidequest.theme";
  function getTheme() {
    try { return G.localStorage.getItem(THEME_KEY) || "system"; } catch (e) { return "system"; }
  }
  function applyTheme(t) {
    if (!HAS_DOM) return;
    var root = document.documentElement;
    if (t === "light" || t === "dark") root.setAttribute("data-theme", t);
    else root.removeAttribute("data-theme");
  }
  function setTheme(t) {
    try { if (t === "system") G.localStorage.removeItem(THEME_KEY); else G.localStorage.setItem(THEME_KEY, t); } catch (e) { /* ignore */ }
    applyTheme(t);
  }

  /* ------------------------------------------------------------------ reward overlay */
  function stageArticle(name) { return /^[AEIOU]/.test(name) ? "an " : "a "; }
  function showReward(reward, opts) {
    opts = opts || {};
    return new Promise(function (resolve) {
      var achs = (reward && reward.newAchievements) || [];
      if (!HAS_DOM || !reward || (!(reward.xpGained > 0) && !achs.length)) { resolve(); return; }
      var root = document.getElementById("overlay-root") || document.body;
      var reduced = prefersReduced();
      var xp = Math.round(reward.xpGained || 0);
      var player = null;
      try { player = sq().player(); } catch (e) { player = null; }
      var stage = reward.stageAfter != null ? reward.stageAfter : (player ? player.stage : 0);
      var accs = player && player.accessories ? player.accessories : [];
      var h = reward.hobbyId ? hobby(reward.hobbyId) : null;

      var banners = "";
      var lvUp = reward.playerLevelAfter > reward.playerLevelBefore;
      var hLvUp = h && reward.hobbyLevelAfter > reward.hobbyLevelBefore;
      var stageUp = reward.stageAfter > reward.stageBefore;
      if (lvUp || hLvUp || stageUp) {
        var lines = [];
        var big = lvUp ? "Level up · Level " + reward.playerLevelAfter : hLvUp ? h.name + " · Lv " + reward.hobbyLevelAfter : "";
        if (lvUp && hLvUp) lines.push(h.name + " reached Lv " + reward.hobbyLevelAfter);
        if (stageUp) {
          var sn = STAGES[reward.stageAfter] || "";
          lines.push(reward.stageAfter === 1 ? "Your seed sprouted" : "Sprout grew into " + stageArticle(sn) + sn);
        }
        if (!big) { big = lines.shift(); }
        banners = '<div class="rw-level" role="status"><span class="big">' + esc(big) + "</span>" +
          lines.map(function (l) { return "<span>" + esc(l) + "</span>"; }).join("") + "</div>";
      }

      var br = (reward.breakdown || []).filter(function (b) { return b && b.xp; });
      var html = '<div class="rw" role="dialog" aria-modal="true" aria-labelledby="rw-title">' +
        (reduced ? "" : '<canvas class="rw-canvas" aria-hidden="true"></canvas>') +
        '<div class="rw-card">' +
        '<div class="rw-mascot">' + mascot(stage, { mood: "cheer", size: 112, accessories: accs }) + "</div>" +
        '<div class="rw-title" id="rw-title">' + esc(opts.title || (h ? h.name : "Nice work")) + "</div>" +
        (xp > 0 ? '<div class="rw-xp" aria-label="plus ' + xp + ' XP">+<span class="rw-n">' + (reduced ? xp : 0) + "</span><small>XP</small></div>"
          : '<div class="rw-xp" style="font-size:40px">Unlocked</div>') +
        (br.length ? '<ul class="rw-break">' + br.map(function (b) {
          return '<li><span>' + esc(b.label) + '</span><span class="num">+' + esc(b.xp) + "</span></li>";
        }).join("") + "</ul>" : "") +
        banners +
        (achs.length ? '<div class="rw-achs">' + achs.map(function (a, i) {
          return '<div class="rw-ach" style="animation-delay:' + (0.35 + i * 0.12).toFixed(2) + 's">' +
            '<span class="ach-badge">' + icon("trophy", 20) + "</span>" +
            '<span><span class="rw-ach-t">' + esc(a.name || "Achievement") + '</span><br><span class="small muted">' + esc(a.desc || "") + "</span></span></div>";
        }).join("") + "</div>" : "") +
        '<button type="button" class="btn primary block" data-rw-close>Nice</button>' +
        "</div></div>";
      var wrap = document.createElement("div");
      wrap.innerHTML = html;
      var el = wrap.firstChild;
      var prevFocus = document.activeElement;
      var prevKey = focusKey(prevFocus);
      root.appendChild(el);
      // The 3D character (showcase.js) leaps in when it's available; otherwise the 2D Sprout stays.
      if (!reduced && SQUI.celebrate) { try { SQUI.celebrate(el, { levelUp: !!(lvUp || hLvUp) }); } catch (e) { logErr(e); } }
      var btn = el.querySelector("[data-rw-close]");
      try { btn.focus({ preventScroll: true }); } catch (e) { /* ignore */ }

      // count up
      var nEl = el.querySelector(".rw-n");
      var raf = null;
      if (nEl && !reduced && xp > 0) {
        var t0 = null;
        var stepFn = function (t) {
          if (t0 === null) t0 = t;
          var k = Math.min(1, (t - t0) / 700);
          var e = 1 - Math.pow(1 - k, 3);
          nEl.textContent = String(Math.round(xp * e));
          if (k < 1) raf = G.requestAnimationFrame(stepFn);
        };
        raf = G.requestAnimationFrame(stepFn);
      }
      var stopConfetti = reduced ? null : confetti(el.querySelector(".rw-canvas"));

      var closed = false;
      function close() {
        if (closed) return;
        closed = true;
        document.removeEventListener("keydown", onKey, true);
        if (raf) G.cancelAnimationFrame(raf);
        if (stopConfetti) stopConfetti();
        el.classList.add("out");
        setTimeout(function () {
          if (el.parentNode) el.parentNode.removeChild(el);
          try {
            if (prevFocus && prevFocus.focus && prevFocus !== document.body && document.contains(prevFocus)) prevFocus.focus({ preventScroll: true });
            else if (!restoreFocus(prevKey, mainEl())) {
              var mm = mainEl();
              if (mm) { mm.setAttribute("tabindex", "-1"); mm.focus({ preventScroll: true }); }
            }
          } catch (e) { /* ignore */ }
          resolve();
        }, reduced ? 0 : 180);
      }
      function onKey(ev) {
        if (ev.key === "Escape") { ev.preventDefault(); close(); }
        else if (ev.key === "Tab") { ev.preventDefault(); btn.focus(); }
      }
      document.addEventListener("keydown", onKey, true);
      btn.addEventListener("click", close);
      el.addEventListener("click", function (ev) { if (ev.target === el) close(); });
    });
  }

  function confetti(canvas) {
    if (!canvas || !canvas.getContext) return null;
    var ctx = canvas.getContext("2d");
    if (!ctx) return null;
    var dpr = Math.min(2, G.devicePixelRatio || 1);
    var W = G.innerWidth, H = G.innerHeight;
    canvas.width = W * dpr; canvas.height = H * dpr;
    ctx.scale(dpr, dpr);
    var cs = getComputedStyle(document.documentElement);
    var cols = ["--sun", "--sun", "--leaf", "--sky", "--warn"].map(function (v) { return cs.getPropertyValue(v).trim() || "gold"; });
    var parts = [];
    var ox = W / 2, oy = Math.min(H * 0.38, 300);
    for (var i = 0; i < 90; i++) {
      var a = Math.random() * Math.PI * 2, sp = 4 + Math.random() * 8;
      parts.push({
        x: ox, y: oy, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 5,
        w: 5 + Math.random() * 5, h: 3 + Math.random() * 4, r: Math.random() * 6, vr: (Math.random() - 0.5) * 0.4,
        c: cols[i % cols.length]
      });
    }
    var start = null, raf = null, DUR = 1500;
    function frame(t) {
      if (start === null) start = t;
      var el = t - start;
      ctx.clearRect(0, 0, W, H);
      var alpha = el < DUR - 400 ? 1 : Math.max(0, (DUR - el) / 400);
      ctx.globalAlpha = alpha;
      for (var i = 0; i < parts.length; i++) {
        var p = parts[i];
        p.vy += 0.32; p.vx *= 0.985; p.vy *= 0.985;
        p.x += p.vx; p.y += p.vy; p.r += p.vr;
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r);
        ctx.fillStyle = p.c; ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      }
      if (el < DUR) raf = G.requestAnimationFrame(frame);
      else ctx.clearRect(0, 0, W, H);
    }
    raf = G.requestAnimationFrame(frame);
    return function () { if (raf) G.cancelAnimationFrame(raf); };
  }

  /* ------------------------------------------------------------------ shared bits */
  function backBtn(label) {
    return '<button type="button" class="back-btn" data-action="back" aria-label="' + esc(label || "Back") + '">' + icon("chevron-left", 24) + "</button>";
  }
  function glyph(id, size, big) {
    return '<span class="sq-glyph' + (big ? " lg" : "") + '" aria-hidden="true">' + hobbyIcon(id, size || 26) + "</span>";
  }
  function onClick(root, handlers) {
    var host = root.firstElementChild || root;
    host.addEventListener("click", function (ev) {
      var t = ev.target.closest && ev.target.closest("[data-action]");
      if (!t || !host.contains(t)) return;
      var fn = handlers[t.getAttribute("data-action")];
      if (fn) { ev.preventDefault(); fn(t, ev); }
    });
    return host;
  }
  function lastText(d) {
    if (d === null || d === undefined) return "Not started yet";
    if (d <= 0) return "Logged today";
    if (d === 1) return "Last session yesterday";
    return "Last session " + d + " days ago";
  }
  function dotsMeter(n, goal) {
    var s = '<span class="dots" aria-hidden="true">';
    var total = Math.max(goal, Math.min(n, 7));
    for (var i = 0; i < total; i++) s += '<i class="' + (i < n ? "on" : "") + '"></i>';
    return s + "</span>";
  }
  function stats(id) { try { return sq().hobbyStats(id); } catch (e) { logErr(e); return null; } }

  /* Early ladder rungs (10 min or less) are tiny wins; later rungs are real sessions and pay regular XP. */
  function stepSize(tw) { return tw && tw.minutes > 10 ? "regular" : "tiny"; }
  function stepKind(tw) { return stepSize(tw) === "regular" ? "Next step" : "Tiny win"; }
  function doTinyWin(id) {
    var s = stats(id);
    var tw = s && s.nextTinyWin;
    var r;
    var size = stepSize(tw);
    try { r = sq().logSession(id, { size: size, minutes: tw ? tw.minutes : null }); } catch (e) { logErr(e); toast("Couldn’t log that one"); return; }
    refresh();
    showReward(r, { title: stepKind(tw) }).then(function () { refresh(); });
  }

  /* ------------------------------------------------------------------ TODAY */
  function greeting() {
    var h = new Date().getHours();
    try { if (sq()._now) h = new Date(sq()._now).getHours(); } catch (e) { /* ignore */ }
    if (h < 5) return "Still up?";
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    if (h < 22) return "Good evening";
    return "Winding down";
  }
  function renderToday() {
    var S = sq(), st0 = S.state, p = S.player();
    var today = todayStr();
    var trackedList = st0.tracked || [];
    var loggedToday = (st0.sessions || []).some(function (x) { return x.date === today; });
    var anyComeback = false;
    var cards = trackedList.map(function (t) {
      var h = hobby(t.hobbyId);
      var s = stats(t.hobbyId);
      if (!h || !s) return "";
      if (s.inComeback) anyComeback = true;
      var met = s.sessionsThisWeek >= s.goal;
      var badges = "";
      if (s.inComeback) badges += '<span class="pill-warn">' + icon("spark", 14) + "Comeback bonus +20</span>";
      if (s.weeklyStreak > 0) badges += '<span class="hc-streak">' + icon("flame", 16) + s.weeklyStreak + "-week streak</span>";
      var tw = s.nextTinyWin;
      return '<article class="card hc">' +
        '<button type="button" class="hc-body" data-action="open" data-id="' + esc(t.hobbyId) + '">' +
        '<span class="hc-photo-wrap">' + hobbyPicture(t.hobbyId, "", "hc-photo") + "</span>" +
        '<span style="min-width:0"><span class="hc-name">' + esc(h.name) + "</span>" +
        '<span class="hc-meta"><span class="hc-lv">Lv ' + s.level + '</span><span class="small muted">' + esc(lastText(s.daysSince)) + "</span></span>" +
        '<span class="hc-progress">' + dotsMeter(s.sessionsThisWeek, s.goal) +
        '<span class="small"><span class="num">' + s.sessionsThisWeek + "</span> of <span class=\"num\">" + s.goal + "</span> this week</span>" +
        (met ? '<span class="pill-good">' + icon("check", 14) + "Goal met</span>" : "") + "</span>" +
        (badges ? '<span class="hc-badges">' + badges + "</span>" : "") +
        "</span>" +
        '<span class="hc-chev" aria-hidden="true">' + icon("chevron-right", 20) + "</span>" +
        "</button>" +
        (tw ? '<div class="hc-foot"><button type="button" class="tiny-btn" data-action="tiny" data-id="' + esc(t.hobbyId) + '" aria-label="' + stepKind(tw) + ' · ' + esc(tw.label) + ', log it now">' +
          '<span class="tw-ic">' + icon("plus", 18) + "</span>" +
          '<span style="min-width:0"><span class="tw-k">' + stepKind(tw) + '</span><span class="tw-l">' + esc(tw.label) + "</span></span>" +
          '<span class="tw-m">' + esc(tw.minutes) + " min</span></button></div>" : "") +
        "</article>";
    }).join("");

    // week dots (any session per day)
    var mon = weekKey(today), days = "";
    var dates = {};
    (st0.sessions || []).forEach(function (x) { dates[x.date] = 1; });
    for (var i = 0; i < 7; i++) {
      var d = addDays(mon, i);
      days += '<span class="td-day' + (dates[d] ? " done" : "") + (d === today ? " today" : "") + '"><i></i>' + DOWS[i].charAt(0) + "</span>";
    }

    // Header: greeting, level and XP, with the one thing worth doing today right under it.
    var pick = null, pickScore = -1;
    trackedList.forEach(function (t) {
      var s = stats(t.hobbyId), h = hobby(t.hobbyId);
      if (!s || !h || !s.nextTinyWin) return;
      var score = (s.inComeback ? 4 : 0) + (s.daysSince === 0 ? 0 : 2) + (s.sessionsThisWeek < s.goal ? 1 + (s.goal - s.sessionsThisWeek) / Math.max(1, s.goal) : 0);
      if (score > pickScore) { pickScore = score; pick = { id: t.hobbyId, h: h, s: s, tw: s.nextTinyWin }; }
    });
    var caughtUp = pick && pick.s.daysSince === 0 && pick.s.sessionsThisWeek >= pick.s.goal;
    var nextUp;
    if (!trackedList.length) {
      nextUp = '<div class="td-next"><span class="td-next-k">Up next</span><span class="td-next-l">Pick a hobby to start</span>' +
        '<button type="button" class="btn primary td-next-go" data-action="pick">' + icon("plus", 18) + "Choose</button></div>";
    } else if (pick && !caughtUp) {
      var kind = pick.s.inComeback ? "Comeback +20 XP" : stepKind(pick.tw);
      nextUp = '<div class="td-next"><span class="td-next-k">' + esc(kind) + " · " + esc(pick.h.name) + '</span>' +
        '<span class="td-next-l">' + esc(pick.tw.label) + '</span>' +
        '<button type="button" class="btn primary td-next-go" data-action="tiny" data-id="' + esc(pick.id) + '" aria-label="Do it: ' + esc(pick.tw.label) + ', ' + esc(pick.tw.minutes) + ' minutes">' +
        icon("check", 18) + esc(pick.tw.minutes) + " min</button></div>";
    } else {
      nextUp = '<div class="td-next td-next-done"><span class="td-next-k">All caught up</span><span class="td-next-l">' + (loggedToday ? "You showed up today. Anything extra is a bonus." : "Every weekly goal is met.") + "</span></div>";
    }
    var head = '<header class="td-card">' +
      '<div class="td-card-body">' +
      '<h1 class="h1 td-greet">' + esc(greeting()) + "</h1>" +
      '<div class="td-level"><span class="lv">Level ' + p.level + '</span><span class="num small muted">' + p.xp + " XP</span></div>" +
      '<div class="progress xp" role="progressbar" aria-label="Progress to next level" aria-valuemin="0" aria-valuemax="' + p.xpForNext + '" aria-valuenow="' + p.xpIntoLevel + '">' +
      '<div class="progress-bar" style="width:' + pct(p.xpIntoLevel, p.xpForNext) + '%"></div></div>' +
      '<div class="td-xpline num"><span>' + p.xpIntoLevel + " / " + p.xpForNext + "</span><span>to Lv " + (p.level + 1) + "</span></div>" +
      "</div>" + nextUp + "</header>";

    var week = '<div class="td-week"><span><strong class="num">' + p.weekSessions + '</strong> <span class="muted">session' + (p.weekSessions === 1 ? "" : "s") + " this week</span></span>" +
      '<span class="td-days" aria-hidden="true">' + days + "</span></div>";

    var body;
    if (!trackedList.length) {
      body = '<div class="empty td-empty"><div class="h2">Nothing on Today yet</div>' +
        '<p class="muted small">Choose a hobby from the Discover tab when you are ready.</p></div>';
    } else {
      body = '<section class="stack" aria-label="Your hobbies"><div class="sq-section-title"><h2 class="h3">Your hobbies</h2><span class="spacer"></span>' +
        '<span class="small muted">' + (loggedToday ? "Nice, you showed up today" : "One tiny win is enough") + "</span></div>" + cards + "</section>" +
        '<div class="td-actions">' +
        '<button type="button" class="btn" data-action="pick">' + icon("plus", 18) + "Add a hobby</button>" +
        '<button type="button" class="btn" data-action="discover">' + icon("compass", 18) + "Find something new</button></div>";
    }
    return '<div class="screen stack-lg sq-today">' + head + week + body + "</div>";
  }
  register("today", {
    tab: "today", title: "Today",
    render: renderToday,
    mount: function (root) {
      onClick(root, {
        open: function (b) { go("hobby", { id: b.getAttribute("data-id") }); },
        tiny: function (b) { doTinyWin(b.getAttribute("data-id")); },
        pick: function () { go("pick"); },
        discover: function () { go("discover"); }
      });
    }
  });

  /* ------------------------------------------------------------------ HOBBY */
  var hobbyUI = { id: null, confirm: false };
  function heatMap(s) {
    var today = todayStr();
    var counts = {};
    (s.heat || []).forEach(function (c) { counts[c.date] = c.count; });
    var mon = weekKey(today);
    var start = addDays(mon, -77);
    var cells = "", prevMonth = -1;
    for (var w = 0; w < 12; w++) {
      var wk = addDays(start, w * 7);
      var d0 = parseDate(wk);
      var mlabel = "";
      // label column by the month of its first day that starts a month, or first column
      var mo = -1;
      for (var k = 0; k < 7; k++) { var dk = parseDate(addDays(wk, k)); if (dk.getDate() === 1) { mo = dk.getMonth(); break; } }
      if (w === 0) mo = d0.getMonth();
      if (mo >= 0 && mo !== prevMonth) { mlabel = MONTHS[mo]; prevMonth = mo; }
      cells += '<span class="heat-m">' + mlabel + "</span>";
      for (var dd = 0; dd < 7; dd++) {
        var ds = addDays(wk, dd);
        var fut = ds > today;
        var n = counts[ds] || 0;
        var lv = n >= 3 ? 3 : n;
        cells += '<span class="heat-c' + (fut ? " fut" : lv ? " l" + lv : "") + (ds === today ? " today" : "") + '" title="' + esc(ds + (fut ? "" : " · " + n + " session" + (n === 1 ? "" : "s"))) + '"></span>';
      }
    }
    var dl = '<div class="heat-days" aria-hidden="true"><span></span>' + DOWS.map(function (d, i) { return "<span>" + (i % 2 === 0 ? d.charAt(0) : "") + "</span>"; }).join("") + "</div>";
    return '<div class="heat-wrap" role="img" aria-label="Sessions over the last 12 weeks">' + dl + '<div class="heat-grid">' + cells + "</div></div>";
  }
  function renderHobby(params) {
    var id = params.id;
    var h = hobby(id);
    if (!h) {
      return '<div class="screen stack-lg"><div class="screen-head">' + backBtn() + '</div><div class="empty">We couldn’t find that hobby.</div></div>';
    }
    if (hobbyUI.id !== id) hobbyUI = { id: id, confirm: false };
    var t = tracked(id);
    if (!t) {
      return '<div class="screen stack-lg sq-hobby"><div class="screen-head">' + backBtn() + "</div>" +
        '<div class="hb-top">' + glyph(id, 32, true) + '<h1 class="h1 hb-name">' + esc(h.name) + "</h1></div>" +
        '<div class="empty stack"><div class="h3">You’re not tracking this one</div><p class="small">Your past sessions are kept. Start tracking again to pick up where you left off.</p>' +
        '<button type="button" class="btn primary" data-action="track">' + icon("plus", 18) + "Track " + esc(h.name) + "</button></div></div>";
    }
    var s = stats(id);
    var tw = s.nextTinyWin;
    var ladder = (h.tinyWins || []).map(function (w, i) {
      var cls = i < s.ladderIndex ? "past" : i === s.ladderIndex ? "cur" : "";
      return '<li class="' + cls + '"' + (i === s.ladderIndex ? ' aria-current="step"' : "") + '><span class="lad-dot">' +
        (i < s.ladderIndex ? icon("check", 14) : i + 1) + "</span><span>" + esc(w.label) + '</span><span class="lad-min">' + esc(w.minutes) + "m</span></li>";
    }).join("");
    var done = {};
    (t.milestones || []).forEach(function (m) { done[m] = 1; });
    var ms = (h.milestones || []).map(function (m) {
      var d = !!done[m.id];
      return '<li><button type="button" class="list-row ms-row' + (d ? " done" : "") + '" data-action="ms" data-ms="' + esc(m.id) + '"' +
        (d ? ' aria-disabled="true"' : "") + ' aria-pressed="' + d + '">' +
        '<span class="ms-box">' + (d ? icon("check", 16) : "") + '</span><span class="ms-label">' + esc(m.label) + "</span>" +
        '<span class="ms-xp">' + (d ? "Done" : "+40 XP") + "</span></button></li>";
    }).join("");
    var nDone = (h.milestones || []).filter(function (m) { return done[m.id]; }).length;
    var recent = (s.recent || []).slice(0, 8).map(function (x) {
      return '<li class="list-row" style="align-items:flex-start"><span class="stack" style="gap:2px;flex:1;min-width:0">' +
        '<span><span class="sess-size">' + esc(sizeLabel(x.size)) + "</span>" +
        (x.minutes ? ' <span class="muted">· <span class="num">' + esc(x.minutes) + "</span> min</span>" : "") + "</span>" +
        (x.note ? '<span class="small muted sess-note">“' + esc(x.note) + "”</span>" : "") +
        '</span><span class="small muted" style="white-space:nowrap">' + esc(relDay(x.date)) + "</span></li>";
    }).join("");

    var stop = hobbyUI.confirm ?
      '<div class="confirm-box" role="group" aria-label="Confirm stop tracking"><div class="h3">Stop tracking ' + esc(h.name) + "?</div>" +
      '<p class="small muted">It leaves your Today list. Your sessions and XP stay, and you can add it back any time.</p>' +
      '<div class="row"><button type="button" class="btn sm danger-solid" data-action="stop-yes">Stop tracking</button>' +
      '<button type="button" class="btn sm" data-action="stop-no">Keep it</button></div></div>' :
      '<button type="button" class="btn ghost block" data-action="stop">Stop tracking</button>';

    return '<div class="screen stack-lg sq-hobby">' +
      '<div class="stack"><div class="screen-head">' + backBtn() + '<span class="eyebrow">' + esc(CAT_LABEL[h.category] || "Hobby") + "</span></div>" +
      '<div class="hb-top">' + glyph(id, 34, true) +
      '<div style="min-width:0"><h1 class="h1 hb-name">' + esc(h.name) + "</h1>" +
      '<div class="row" style="gap:10px;margin-top:2px"><span class="hc-lv" style="font-size:14px">Lv ' + s.level + '</span><span class="small muted">' + esc(lastText(s.daysSince)) + "</span>" +
      (s.inComeback ? '<span class="pill-warn">' + icon("spark", 14) + "Comeback +20</span>" : "") + "</div></div></div>" +
      '<div><div class="progress xp" role="progressbar" aria-label="' + esc(h.name) + ' level progress" aria-valuemin="0" aria-valuemax="' + s.xpForNext + '" aria-valuenow="' + s.xpIntoLevel + '"><div class="progress-bar" style="width:' + pct(s.xpIntoLevel, s.xpForNext) + '%"></div></div>' +
      '<div class="hb-xp num"><span>' + s.xpIntoLevel + " / " + s.xpForNext + " XP</span><span>to Lv " + (s.level + 1) + "</span></div></div></div>" +

      '<div class="hb-goal"><div style="flex:1;min-width:0"><div class="h3">Weekly goal</div><div class="small muted"><span class="num">' + s.sessionsThisWeek + "</span> of <span class=\"num\">" + s.goal + "</span> sessions this week</div></div>" +
      '<div class="stepper" role="group" aria-label="Sessions per week">' +
      '<button type="button" class="icon-btn" data-action="goal" data-d="-1" aria-label="Fewer sessions per week"' + (s.goal <= 1 ? " disabled" : "") + ">" + icon("minus", 18) + "</button>" +
      '<span class="num" aria-live="polite">' + s.goal + "</span>" +
      '<button type="button" class="icon-btn" data-action="goal" data-d="1" aria-label="More sessions per week"' + (s.goal >= 7 ? " disabled" : "") + ">" + icon("plus", 18) + "</button></div></div>" +

      '<div class="stack">' +
      (tw ? '<div class="hb-next stack"><div class="eyebrow" style="color:var(--leaf)">' + (stepSize(tw) === "regular" ? "Next step" : "Next tiny win") + ' · step ' + (s.ladderIndex + 1) + " of 5</div>" +
        '<div class="h3">' + esc(tw.label) + "</div>" +
        '<button type="button" class="tiny-btn" data-action="tiny"><span class="tw-ic">' + icon("check", 18) + '</span><span class="tw-l">' + (stepSize(tw) === "regular" ? "Did it, log the session" : "Did it, log a tiny win") + '</span><span class="tw-m">' + esc(tw.minutes) + " min</span></button></div>" : "") +
      '<button type="button" class="btn block" data-action="log">' + icon("plus", 18) + "Log a session</button></div>" +

      '<section class="stack"><div><h2 class="h3">Tiny-win ladder</h2><p class="small muted">Each session steps you up the ladder. A week away resets it to the first rung, so coming back is always easy.</p></div>' +
      '<ol class="ladder">' + ladder + "</ol></section>" +

      '<section class="stack"><h2 class="h3">Last 12 weeks</h2>' + heatMap(s) +
      '<div class="stats">' +
      '<div><span class="num">' + s.totalSessions + '</span><span class="eyebrow">Sessions</span></div>' +
      '<div><span class="num">' + fmtMinutes(s.totalMinutes) + '</span><span class="eyebrow">Time</span></div>' +
      '<div><span class="num">' + s.bestWeek + '</span><span class="eyebrow">Best week</span></div>' +
      '<div><span class="num">' + s.weeklyStreak + 'w</span><span class="eyebrow">Streak</span></div></div></section>' +

      '<section class="stack"><div class="sq-section-title"><h2 class="h3">Skill milestones</h2><span class="spacer"></span><span class="num small muted">' + nDone + "/" + (h.milestones || []).length + "</span></div>" +
      '<ul class="list">' + ms + "</ul></section>" +

      '<section class="stack"><h2 class="h3">Recent sessions</h2>' +
      (recent ? '<ul class="list">' + recent + "</ul>" : '<div class="empty small">No sessions yet. Your first tiny win will show up here.</div>') + "</section>" +
      '<div style="padding-top:8px">' + stop + "</div>" +
      "</div>";
  }
  register("hobby", {
    tab: "today", title: "Hobby",
    render: renderHobby,
    mount: function (root, params) {
      var id = params.id;
      onClick(root, {
        back: function () { back(); },
        track: function () {
          var r = sq().addHobby(id);
          refresh();
          showReward(r);
        },
        goal: function (b) {
          var s = stats(id);
          sq().setGoal(id, s.goal + (+b.getAttribute("data-d")));
          refresh();
        },
        tiny: function () { doTinyWin(id); },
        log: function () { go("log", { id: id }); },
        ms: function (b) {
          if (b.getAttribute("aria-disabled") === "true") return;
          var r = sq().tickMilestone(id, b.getAttribute("data-ms"));
          refresh();
          if (r) showReward(r, { title: "Milestone" }).then(refresh);
        },
        stop: function () {
          hobbyUI.confirm = true; refresh();
          var y = mainEl().querySelector("[data-action=stop-no]"); if (y) y.focus();
        },
        "stop-no": function () { hobbyUI.confirm = false; refresh(); },
        "stop-yes": function () {
          var h = hobby(id);
          hobbyUI.confirm = false;
          sq().removeHobby(id);
          go("today", {}, { reset: true });
          toast("Stopped tracking " + (h ? h.name : "that hobby"));
        }
      });
    }
  });

  /* ------------------------------------------------------------------ LOG */
  var logUI = { key: null, size: "regular", minutes: null, note: "" };
  function renderLog(params) {
    var id = params.id;
    var h = hobby(id);
    if (!h || !tracked(id)) {
      return '<div class="screen stack-lg"><div class="screen-head">' + backBtn("Close") + '</div><div class="empty">Track this hobby first to log sessions.</div></div>';
    }
    var key = id + "|" + (params.size || "");
    if (logUI.key !== key) logUI = { key: key, size: params.size || "regular", minutes: null, note: "" };
    var s = stats(id);
    var hints = "";
    if (s.inComeback) hints += '<div class="lg-hint">' + icon("spark", 18) + "<span><b>+20 comeback bonus</b> for showing up again</span></div>";
    if (s.sessionsThisWeek === s.goal - 1) hints += '<div class="lg-hint">' + icon("star", 18) + "<span><b>+50</b> if this hits your weekly goal</span></div>";
    var chips = [5, 10, 20, 30, 45, 60].map(function (m) {
      return '<button type="button" class="chip' + (logUI.minutes === m ? " on" : "") + '" data-action="min" data-m="' + m + '" aria-pressed="' + (logUI.minutes === m) + '">' + m + "</button>";
    }).join("");
    return '<div class="screen lg-screen sq-log">' +
      '<div class="stack-lg" style="flex:1">' +
      '<div class="lg-head">' + glyph(id, 24) + '<div style="flex:1;min-width:0"><div class="eyebrow">Log a session</div><h1 class="h2" style="overflow-wrap:anywhere">' + esc(h.name) + "</h1></div>" +
      '<button type="button" class="icon-btn" data-action="back" aria-label="Close">' + icon("close", 20) + "</button></div>" +
      '<div class="field"><span class="lbl" id="lg-size-l">How big was it?</span>' +
      '<div class="seg lg-seg" role="radiogroup" aria-labelledby="lg-size-l">' + SIZES.map(function (z) {
        var on = logUI.size === z.k;
        return '<button type="button" role="radio" aria-checked="' + on + '" class="' + (on ? "on" : "") + '" data-action="size" data-size="' + z.k + '">' +
          "<span>" + z.label + '</span><span class="xp">+' + z.xp + " XP</span></button>";
      }).join("") + "</div></div>" +
      '<div class="field"><span class="lbl" id="lg-min-l">Minutes</span>' +
      '<div class="lg-minutes" role="group" aria-labelledby="lg-min-l">' + chips + "</div>" +
      '<div class="row"><input class="input min-in" id="lg-min" type="number" inputmode="numeric" min="1" max="600" placeholder="Other" aria-label="Minutes" value="' + (logUI.minutes != null && [5, 10, 20, 30, 45, 60].indexOf(logUI.minutes) < 0 ? logUI.minutes : "") + '"><span class="small muted">Optional</span></div></div>' +
      '<div class="field"><label for="lg-note">Note <span class="muted" style="font-weight:400">(optional)</span></label>' +
      '<textarea class="textarea" id="lg-note" maxlength="280" placeholder="What did you work on? How did it feel?">' + esc(logUI.note) + "</textarea></div>" +
      (hints ? '<div class="stack" style="gap:8px">' + hints + "</div>" : "") +
      "</div>" +
      '<div class="lg-foot"><button type="button" class="btn primary block" data-action="save">Log it <span class="num" style="opacity:.85">· +' + (SIZES.filter(function (z) { return z.k === logUI.size; })[0] || SIZES[1]).xp + " XP</span></button></div>" +
      "</div>";
  }
  register("log", {
    tab: null, title: "Log a session",
    render: renderLog,
    mount: function (root, params) {
      var id = params.id;
      var host = onClick(root, {
        back: function () { back(); },
        size: function (b) { logUI.size = b.getAttribute("data-size"); refresh(); },
        min: function (b) {
          var m = +b.getAttribute("data-m");
          logUI.minutes = logUI.minutes === m ? null : m;
          refresh();
        },
        save: function (b) {
          b.disabled = true;
          var r;
          try {
            r = sq().logSession(id, { size: logUI.size, minutes: logUI.minutes, note: (logUI.note || "").trim() });
          } catch (e) { logErr(e); b.disabled = false; toast("Couldn’t save that session"); return; }
          logUI = { key: null, size: "regular", minutes: null, note: "" };
          var prev = stack[stack.length - 2];
          if (prev && prev.name === "hobby" && prev.params && prev.params.id === id) back();
          else go("hobby", { id: id }, { replace: true });
          showReward(r).then(function () { refresh(); });
        }
      });
      var inp = host.querySelector("#lg-min");
      if (inp) inp.addEventListener("input", function () {
        var v = parseInt(inp.value, 10);
        logUI.minutes = v > 0 ? Math.min(v, 600) : null;
        host.querySelectorAll("[data-action=min]").forEach(function (c) {
          var on = +c.getAttribute("data-m") === logUI.minutes;
          c.classList.toggle("on", on); c.setAttribute("aria-pressed", on);
        });
      });
      var note = host.querySelector("#lg-note");
      if (note) note.addEventListener("input", function () { logUI.note = note.value; });
    }
  });

  /* ------------------------------------------------------------------ ME */
  /* ------------------------------------------------------------------ ACHIEVEMENTS */
  function fmtLong(s) { var d = parseDate(s); return MONTHS[d.getMonth()] + " " + d.getDate() + ", " + d.getFullYear(); }
  register("achievements", {
    tab: "me", title: "Achievements",
    render: function () {
      var list = [];
      try { list = sq().achievementsList() || []; } catch (e) { list = []; }
      var n = list.filter(function (a) { return a.unlocked; }).length;
      var card = function (a) {
        var on = !!a.unlocked;
        return '<div class="ach' + (on ? "" : " locked") + '"><span class="ach-badge">' + icon(on ? "trophy" : "lock", 20) + "</span>" +
          '<span class="ach-name">' + esc(a.name) + '</span><span class="ach-desc">' + esc(a.desc) + "</span>" +
          (on ? '<span class="ach-date">Earned ' + esc(fmtLong(a.unlocked)) + "</span>" : "") + "</div>";
      };
      var earned = list.filter(function (a) { return a.unlocked; }).sort(function (x, y) { return x.unlocked < y.unlocked ? 1 : x.unlocked > y.unlocked ? -1 : 0; });
      var locked = list.filter(function (a) { return !a.unlocked; });
      var groups =
        '<section class="stack"><h2 class="h3">Earned</h2>' + (earned.length ? '<div class="ach-grid">' + earned.map(card).join("") + "</div>" :
          '<p class="small muted">Nothing yet. Log your first session to earn one.</p>') + "</section>" +
        (locked.length ? '<section class="stack"><div><h2 class="h3">Still to earn</h2><p class="small muted">Each one says how to get it.</p></div><div class="ach-grid">' + locked.map(card).join("") + "</div></section>" : "");
      return '<div class="screen stack-lg sq-ach"><div class="screen-head">' + backBtn() +
        '<div><h1 class="h2">Achievements</h1><div class="small muted"><span class="num">' + n + "</span> of <span class=\"num\">" + list.length + "</span> unlocked</div></div></div>" +
        (groups || '<div class="empty">No achievements yet.</div>') + "</div>";
    },
    mount: function (root) { onClick(root, { back: function () { back(); } }); }
  });

  /* ------------------------------------------------------------------ start */
  function start() {
    applyTheme(getTheme());
    bindFallbacks();
    var S = sq();
    if (!S) {
      var m = mainEl();
      if (m) m.innerHTML = errorCard("Habitual couldn’t start", new Error("Engine not loaded"));
      return;
    }
    try { S.init(); } catch (e) { logErr(e); }
    var firstRun = !(S.state && S.state.onboarded);
    go(firstRun ? "pick" : "today", {}, { reset: true, focus: false });
  }

  SQUI.register = register;
  SQUI.go = go;
  SQUI.back = back;
  SQUI.refresh = refresh;
  SQUI.start = start;
  SQUI.showReward = showReward;
  SQUI.toast = toast;
  SQUI.esc = esc;
  SQUI.icon = icon;
  SQUI.hobbyIcon = hobbyIcon;
  SQUI.hobbyPicture = hobbyPicture;
  SQUI.mascot = mascot;
  SQUI.money = money;
  SQUI.setTheme = setTheme;
  SQUI.getTheme = getTheme;
  SQUI.current = function () { return current ? { name: current.name, params: current.params } : null; };
})();
