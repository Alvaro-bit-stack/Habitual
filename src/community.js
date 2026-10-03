/* Sidequest — COMMUNITY tab: community, group({hobbyId}), event({id}) */
(function () {
  "use strict";
  if (typeof window === "undefined" || !window.SQUI) return;
  var SQUI = window.SQUI;
  var G = globalThis;

  var AREA = "Sample community · Newark area";
  var CHECKIN_XP = 60;
  var TWO_PLAYER = ["tennis", "chess"];
  var WD = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  var WD_LONG = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  var MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  var MON_LONG = ["January", "February", "March", "April", "May", "June", "July", "August",
    "September", "October", "November", "December"];

  // view state for the community list (kept for the session)
  var view = { filter: "all", showAll: false };

  function esc(s) { return SQUI.esc(s == null ? "" : String(s)); }
  function icon(n, s) { try { return SQUI.icon(n, s) || ""; } catch (e) { return ""; } }
  function glyph(id, s) { try { return SQUI.hobbyIcon(id, s) || ""; } catch (e) { return ""; } }
  function SQ() { return G.SQ; }
  function data() { return G.SQ_DATA || { groups: [], events: [] }; }

  function parse(d) {
    var p = String(d || "").split("-");
    return new Date(+p[0], (+p[1] || 1) - 1, +p[2] || 1);
  }
  function today() {
    try { return SQ().today(); } catch (e) {
      var n = new Date();
      return n.getFullYear() + "-" + String(n.getMonth() + 1).padStart(2, "0") + "-" + String(n.getDate()).padStart(2, "0");
    }
  }
  function diffDays(a, b) {
    return Math.round((parse(b) - parse(a)) / 86400000);
  }
  function dayLabel(d) {
    var n = diffDays(today(), d);
    if (n === 0) return "Today";
    if (n === 1) return "Tomorrow";
    if (n === -1) return "Yesterday";
    var dt = parse(d);
    return WD[dt.getDay()] + ", " + MON[dt.getMonth()] + " " + dt.getDate();
  }
  function longDate(d) {
    var dt = parse(d);
    var rel = diffDays(today(), d);
    var base = WD_LONG[dt.getDay()] + ", " + MON_LONG[dt.getMonth()] + " " + dt.getDate();
    return rel === 0 ? "Today · " + base : rel === 1 ? "Tomorrow · " + base : base;
  }
  function ago(n) {
    n = +n || 0;
    if (n <= 0) return "today";
    if (n === 1) return "yesterday";
    if (n < 7) return n + " days ago";
    if (n < 14) return "1 week ago";
    return Math.floor(n / 7) + " weeks ago";
  }

  function hobby(id) { try { return SQ().getHobby(id) || null; } catch (e) { return null; } }
  function hobbyName(id) { var h = hobby(id); return h ? h.name : id; }
  function tracked() {
    try { return (SQ().state.tracked || []).map(function (t) { return t.hobbyId; }); } catch (e) { return []; }
  }
  function isTracked(id) { try { return !!SQ().isTracked(id); } catch (e) { return false; } }
  function allEvents() { try { return SQ().events() || []; } catch (e) { return []; } }
  function findEvent(id) {
    var ev = allEvents();
    for (var i = 0; i < ev.length; i++) if (ev[i].id === id) return ev[i];
    return null;
  }
  function group(hid) {
    var gs = data().groups || [];
    for (var i = 0; i < gs.length; i++) if (gs[i].hobbyId === hid) return gs[i];
    return null;
  }

  function levelPill(level) {
    var cls = level === "Experienced" ? "pill-warn" : "pill-good";
    return '<span class="' + cls + ' cm-level">' + esc(level) + "</span>";
  }
  // Sample "going" counts exclude the user; add them once they RSVP (or check in) so the number reacts.
  function going(e) {
    var n = +e.going || 0;
    return Math.min(+e.spots || n, n + (e.rsvp || e.checkedIn ? 1 : 0));
  }
  function spotsText(e) {
    var left = Math.max(0, (+e.spots || 0) - going(e));
    return '<span class="num">' + going(e) + "/" + esc(e.spots) + "</span> going" +
      (left > 0 && left <= 3 ? ' · <span class="cm-few">' + left + " left</span>" : "");
  }

  function rsvpBtn(e, extra) {
    if (e.checkedIn) {
      return '<span class="cm-done">' + icon("check", 16) + " Checked in</span>";
    }
    return '<button type="button" class="btn sm cm-rsvp' + (e.rsvp ? " on" : "") + (extra || "") +
      '" data-action="rsvp" data-id="' + esc(e.id) + '" aria-pressed="' + (e.rsvp ? "true" : "false") +
      '" aria-label="' + (e.rsvp ? "Going to " : "RSVP to ") + esc(e.title) + '">' +
      (e.rsvp ? icon("check", 16) + " Going" : "RSVP") + "</button>";
  }

  // Shared event row component
  function eventRow(e, opts) {
    opts = opts || {};
    return '<li class="cm-ev' + (e.rsvp ? " is-going" : "") + '">' +
      '<button type="button" class="cm-ev-main" data-action="open-event" data-id="' + esc(e.id) + '">' +
        '<span class="cm-glyph" aria-hidden="true">' + glyph(e.hobbyId, 26) + "</span>" +
        '<span class="cm-ev-body">' +
          '<span class="cm-ev-title">' + esc(e.title) + "</span>" +
          '<span class="cm-ev-meta small muted">' +
            (opts.showDate ? esc(dayLabel(e.date)) + " · " : "") +
            '<span class="num">' + esc(e.time) + "</span> · " + esc(e.place) + "</span>" +
        "</span>" +
      "</button>" +
      '<div class="cm-ev-foot small">' + levelPill(e.level) +
        '<span class="muted">' + spotsText(e) + '</span><span class="spacer"></span>' + rsvpBtn(e) + "</div>" +
    "</li>";
  }

  function caughtUp() {
    return '<div class="cm-caught">' +
      '<span class="cm-caught-mark" aria-hidden="true">' + icon("check", 22) + "</span>" +
      '<p class="h3">You\'re caught up.</p>' +
      '<p class="muted">Go do a tiny win?</p>' +
      '<button type="button" class="btn primary" data-action="go-today">Go do a tiny win</button>' +
    "</div>";
  }

  /* ---------------- community ---------------- */
  function renderLocked() {
    return '<div class="screen stack-lg cm">' +
      '<div class="screen-head"><h1 class="h1">Community</h1></div>' +
      '<div class="cm-locked">' +
        '<div class="cm-lock-badge" aria-hidden="true">' + icon("lock", 30) + "</div>" +
        '<h2 class="h2">Track one hobby to unlock your community</h2>' +
        '<p class="muted">Community is for doing your hobby with people, not scrolling about it.</p>' +
        '<ul class="cm-why">' +
          '<li><span class="cm-why-ic" aria-hidden="true">' + icon("users", 20) + "</span><span>Find people nearby at your level</span></li>" +
          '<li><span class="cm-why-ic" aria-hidden="true">' + icon("calendar", 20) + "</span><span>Join small local meetups and practice sessions</span></li>" +
          '<li><span class="cm-why-ic cm-why-xp" aria-hidden="true">' + icon("spark", 20) + "</span><span>Earn <strong>" + CHECKIN_XP + " XP</strong> every time you check in</span></li>" +
        "</ul>" +
        '<div class="stack">' +
          '<button type="button" class="btn primary block" data-action="go" data-to="pick">I already have a hobby</button>' +
          '<button type="button" class="btn block" data-action="go" data-to="discover">Find a new hobby</button>' +
        "</div>" +
      "</div>" +
      '<p class="small muted cm-sample">' + esc(AREA) + "</p>" +
    "</div>";
  }

  function render() {
    if (!SQ() || !SQ().communityUnlocked()) return renderLocked();
    var t = today();
    var mine = tracked();
    var catalogMine = mine.filter(function (id) { return !!group(id); });
    if (view.filter !== "all" && mine.indexOf(view.filter) < 0) view.filter = "all";

    var evs = allEvents().filter(function (e) { return e.date >= t; });
    var scoped = evs.filter(function (e) {
      if (view.filter !== "all") return e.hobbyId === view.filter;
      return view.showAll || mine.indexOf(e.hobbyId) >= 0;
    });

    // Today strip: today's events, RSVP'd first (scoped to tracked hobbies + any RSVP'd)
    var todays = evs.filter(function (e) {
      return e.date === t && (mine.indexOf(e.hobbyId) >= 0 || e.rsvp || view.showAll);
    }).sort(function (a, b) { return (b.rsvp ? 1 : 0) - (a.rsvp ? 1 : 0); });

    var h = '<div class="screen stack-lg cm">';
    h += '<div class="screen-head cm-head"><div><h1 class="h1">Community</h1>' +
      '<p class="small muted cm-area">' + icon("pin", 14) + " " + esc(AREA) + "</p></div></div>";

    // Today strip
    h += '<section class="stack" aria-labelledby="cm-today-h">' +
      '<div class="row"><h2 class="h2" id="cm-today-h">Today</h2><span class="spacer"></span>' +
      '<span class="small muted">' + esc(dayLabel(t) === "Today" ? longDate(t).replace("Today · ", "") : "") + "</span></div>";
    if (todays.length) {
      h += '<div class="cm-strip" role="list">';
      todays.forEach(function (e) {
        h += '<div class="cm-today card' + (e.rsvp ? " is-going" : "") + '" role="listitem">' +
          '<button type="button" class="cm-today-top" data-action="open-event" data-id="' + esc(e.id) + '">' +
            '<span class="cm-glyph" aria-hidden="true">' + glyph(e.hobbyId, 24) + "</span>" +
            '<span class="cm-today-txt"><span class="cm-ev-title">' + esc(e.title) + "</span>" +
            '<span class="small muted"><span class="num">' + esc(e.time) + "</span> · " + esc(e.place) + "</span></span>" +
          "</button>";
        if (e.checkedIn) {
          h += '<span class="cm-done">' + icon("check", 16) + " Checked in · +" + CHECKIN_XP + " XP</span>";
        } else if (e.canCheckIn) {
          h += '<button type="button" class="btn primary sm block cm-checkin" data-action="checkin" data-id="' + esc(e.id) + '">' +
            icon("pin", 16) + " Check in · +" + CHECKIN_XP + " XP</button>";
        } else {
          h += rsvpBtn(e, " block");
        }
        h += "</div>";
      });
      h += "</div>";
    } else {
      h += '<p class="muted small cm-none">Nothing on today for your hobbies. Upcoming meetups are below.</p>';
    }
    h += "</section>";

    // Filters
    h += '<section class="stack" aria-labelledby="cm-up-h">' +
      '<h2 class="h2" id="cm-up-h">Upcoming</h2>' +
      '<div class="cm-chips" role="group" aria-label="Filter events">' +
      '<button type="button" class="chip' + (view.filter === "all" ? " on" : "") + '" data-action="filter" data-f="all" aria-pressed="' + (view.filter === "all") + '">All</button>';
    mine.forEach(function (id) {
      h += '<button type="button" class="chip' + (view.filter === id ? " on" : "") + '" data-action="filter" data-f="' + esc(id) + '" aria-pressed="' + (view.filter === id) + '">' + esc(hobbyName(id)) + "</button>";
    });
    h += '<button type="button" class="chip cm-chip-toggle' + (view.showAll ? " on" : "") + '" data-action="toggle-all" aria-pressed="' + view.showAll + '"' +
      (view.filter !== "all" ? " disabled" : "") + ">" + (view.showAll ? icon("check", 14) + " " : "") + "Show all hobbies</button>";
    h += "</div>";

    if (!scoped.length) {
      h += '<div class="empty cm-empty"><p class="h3">No meetups for ' + esc(view.filter === "all" ? "your hobbies" : hobbyName(view.filter)) + " in the next two weeks</p>" +
        '<p class="muted small">Try showing all hobbies. Something nearby might be worth a first look.</p>' +
        (view.showAll ? "" : '<button type="button" class="btn sm" data-action="toggle-all">Show all hobbies</button>') + "</div>";
    } else {
      var lastDay = null;
      scoped.forEach(function (e) {
        if (e.date !== lastDay) {
          if (lastDay !== null) h += "</ul>";
          h += '<h3 class="eyebrow cm-day">' + esc(dayLabel(e.date)) + "</h3><ul class=\"cm-evlist\">";
          lastDay = e.date;
        }
        h += eventRow(e);
      });
      h += "</ul>";
    }
    h += "</section>";

    // Your groups
    if (catalogMine.length) {
      h += '<section class="stack" aria-labelledby="cm-gr-h"><h2 class="h2" id="cm-gr-h">Your groups</h2><div class="cm-groups">';
      catalogMine.forEach(function (id) {
        var g = group(id);
        var count = evs.filter(function (e) { return e.hobbyId === id; }).length;
        h += '<button type="button" class="card tap cm-group" data-action="open-group" data-id="' + esc(id) + '">' +
          '<span class="cm-glyph" aria-hidden="true">' + glyph(id, 26) + "</span>" +
          '<span class="cm-group-txt"><span class="cm-ev-title">' + esc(g.name) + "</span>" +
          '<span class="small muted"><span class="num">' + esc(g.members) + "</span> members · " +
          count + (count === 1 ? " meetup" : " meetups") + " coming up</span></span>" +
          '<span class="cm-chev" aria-hidden="true">' + icon("chevron-right", 20) + "</span></button>";
      });
      h += "</div></section>";
    }

    // Partner finder teaser
    var duo = mine.filter(function (id) { return TWO_PLAYER.indexOf(id) >= 0; });
    if (duo.length) {
      var hid = duo[0];
      var sample = hid === "chess"
        ? { who: "Dev P.", text: "Casual player, around 1100 online. Looking for someone to play slow games with at the library on weekday evenings." }
        : { who: "Jordan K.", text: "Beginner, can rally a bit. Free most Saturday mornings at Branch Brook Park courts. Happy to just hit for an hour." };
      h += '<section class="card cm-partner" aria-labelledby="cm-pt-h">' +
        '<div class="row"><span class="cm-glyph" aria-hidden="true">' + glyph(hid, 24) + "</span>" +
        '<h2 class="h3" id="cm-pt-h">Looking for a ' + esc(hobbyName(hid).toLowerCase()) + " partner?</h2></div>" +
        '<div class="cm-post cm-post-sample"><div class="row"><span class="cm-av" aria-hidden="true">' + esc(sample.who.charAt(0)) + "</span>" +
        '<span class="cm-author">' + esc(sample.who) + '</span><span class="spacer"></span><span class="cm-tag">Sample post</span></div>' +
        '<p class="cm-post-text">' + esc(sample.text) + "</p></div>" +
        '<p class="small muted">Partner matching is coming. For now, meet people at a beginner-friendly event.</p>' +
        '<button type="button" class="btn sm" data-action="open-group" data-id="' + esc(hid) + '">See the ' + esc(hobbyName(hid)) + " group</button>" +
      "</section>";
    }

    h += '<p class="small muted cm-sample">All people, groups and events here are sample data.</p>';
    h += "</div>";
    return h;
  }

  /* ---------------- group ---------------- */
  function renderGroup(params) {
    var hid = params && params.hobbyId;
    var g = group(hid);
    var back = '<button type="button" class="back-btn" data-action="back" aria-label="Back">' + icon("chevron-left", 22) + "</button>";
    if (!g) {
      return '<div class="screen stack-lg cm"><div class="screen-head">' + back + '<h1 class="h1">Group</h1></div>' +
        '<div class="empty cm-empty"><span class="cm-lock-badge" aria-hidden="true">' + icon("users", 28) + "</span>" +
        '<p class="h3">No group for this hobby yet</p>' +
        '<p class="muted small">Custom hobbies don\'t have a sample group. Browse meetups for other hobbies in the meantime.</p>' +
        '<button type="button" class="btn primary" data-action="go" data-to="community">Back to Community</button></div></div>';
    }
    var t = today();
    var evs = allEvents().filter(function (e) { return e.hobbyId === hid && e.date >= t; });
    var tr = isTracked(hid);
    var h = '<div class="screen stack-lg cm">';
    h += '<div class="screen-head">' + back + '<span class="eyebrow">Group</span></div>';
    h += '<header class="cm-ghead"><span class="cm-glyph cm-glyph-lg" aria-hidden="true">' + glyph(hid, 34) + "</span>" +
      '<div><h1 class="h1">' + esc(g.name) + "</h1>" +
      '<p class="small muted cm-gmeta"><span class="cm-nowrap">' + icon("users", 14) + ' <span class="num">' + esc(g.members) + "</span> members</span> · " + esc(AREA) + "</p></div></header>";

    h += '<section class="stack" aria-labelledby="cm-gup-h"><h2 class="h2" id="cm-gup-h">Upcoming</h2>';
    if (evs.length) {
      h += '<ul class="cm-evlist">' + evs.map(function (e) { return eventRow(e, { showDate: true }); }).join("") + "</ul>";
    } else {
      h += '<p class="muted small">No meetups scheduled in the next two weeks.</p>';
    }
    h += "</section>";

    h += '<section class="stack" aria-labelledby="cm-gp-h"><div class="row"><h2 class="h2" id="cm-gp-h">Sessions</h2>' +
      '<span class="spacer"></span><button type="button" class="btn sm" data-action="share" data-id="' + esc(hid) + '">' + icon("plus", 16) + " Share a session</button></div>" +
      '<p class="small muted">Posts are attached to a logged session. Log one, then share how it went.</p>';
    var posts = (g.posts || []).slice().sort(function (a, b) { return (a.daysAgo || 0) - (b.daysAgo || 0); });
    if (posts.length) {
      h += '<ul class="cm-posts">';
      posts.forEach(function (p) {
        h += '<li class="cm-post"><div class="row cm-post-head"><span class="cm-av" aria-hidden="true">' + esc(String(p.author || "?").charAt(0)) + "</span>" +
          '<span class="cm-author">' + esc(p.author) + '</span><span class="small muted">' + esc(ago(p.daysAgo)) + "</span></div>" +
          (p.sessionLabel ? '<span class="cm-tag">' + icon("clock", 14) + " " + esc(p.sessionLabel) + "</span>" : "") +
          '<p class="cm-post-text">' + esc(p.text) + "</p></li>";
      });
      h += "</ul>";
    }
    h += caughtUp() + "</section>";
    h += '<p class="small muted cm-sample">' + esc(AREA) + (tr ? "" : " · You don't track " + esc(hobbyName(hid)) + " yet") + "</p>";
    h += "</div>";
    return h;
  }

  /* ---------------- event ---------------- */
  function renderEvent(params) {
    var e = findEvent(params && params.id);
    var back = '<button type="button" class="back-btn" data-action="back" aria-label="Back">' + icon("chevron-left", 22) + "</button>";
    if (!e) {
      return '<div class="screen stack-lg cm"><div class="screen-head">' + back + '<h1 class="h1">Event</h1></div>' +
        '<div class="empty cm-empty"><p class="h3">This event has wrapped up</p><p class="muted small">It may have already happened. There are more meetups coming.</p>' +
        '<button type="button" class="btn primary" data-action="go" data-to="community">See upcoming events</button></div></div>';
    }
    var nGoing = going(e);
    var pct = Math.min(100, Math.round(nGoing / Math.max(1, +e.spots || 1) * 100));
    var left = Math.max(0, (+e.spots || 0) - nGoing);
    var h = '<div class="screen stack-lg cm">';
    h += '<div class="screen-head">' + back + '<span class="eyebrow">' + esc(hobbyName(e.hobbyId)) + " meetup</span></div>";
    h += '<header class="cm-ehead"><span class="cm-glyph cm-glyph-lg" aria-hidden="true">' + glyph(e.hobbyId, 36) + "</span>" +
      '<h1 class="h1">' + esc(e.title) + "</h1>" + levelPill(e.level) + "</header>";

    h += '<ul class="list cm-facts">' +
      '<li class="list-row"><span class="cm-fic" aria-hidden="true">' + icon("calendar", 20) + "</span><span>" + esc(longDate(e.date)) +
        '<br><span class="num muted small">' + esc(e.time) + "</span></span></li>" +
      '<li class="list-row"><span class="cm-fic" aria-hidden="true">' + icon("pin", 20) + "</span><span>" + esc(e.place) + "</span></li>" +
      '<li class="list-row"><span class="cm-fic" aria-hidden="true">' + icon("users", 20) + "</span><span>Hosted by " + esc(e.host) + "</span></li>" +
    "</ul>";

    h += '<div class="stack cm-cap"><div class="row"><span><span class="num">' + nGoing + "</span> going" + (e.rsvp || e.checkedIn ? ", including you" : "") + "</span><span class=\"spacer\"></span>" +
      '<span class="small muted"><span class="num">' + left + "</span> of " + esc(e.spots) + " spots left</span></div>" +
      '<div class="progress" role="progressbar" aria-valuemin="0" aria-valuemax="' + esc(e.spots) + '" aria-valuenow="' + nGoing + '" aria-label="Spots filled">' +
      '<div class="progress-bar" style="width:' + pct + '%"></div></div></div>';

    h += '<div class="stack cm-actions">';
    if (e.checkedIn) {
      h += '<div class="cm-done cm-done-lg">' + icon("check", 20) + " Checked in · +" + CHECKIN_XP + " XP</div>";
    } else {
      if (e.canCheckIn) {
        h += '<button type="button" class="btn primary block" data-action="checkin" data-id="' + esc(e.id) + '">' + icon("pin", 18) + " Check in · +" + CHECKIN_XP + " XP</button>";
      }
      h += '<button type="button" class="btn block cm-rsvp' + (e.rsvp ? " on" : "") + '" data-action="rsvp" data-id="' + esc(e.id) + '" aria-pressed="' + e.rsvp + '">' +
        (e.rsvp ? icon("check", 18) + " Going · tap to cancel" : "RSVP · I'm going") + "</button>";
      if (e.rsvp && !e.canCheckIn) {
        h += '<p class="small muted cm-hint">Check-in opens on the day. It\'s worth ' + CHECKIN_XP + " XP.</p>";
      } else if (!e.rsvp) {
        h += '<p class="small muted cm-hint">RSVP so the host knows, then check in when you get there for ' + CHECKIN_XP + " XP.</p>";
      }
    }
    h += "</div>";

    h += '<div class="cm-safety"><span class="cm-fic" aria-hidden="true">' + icon("leaf", 18) + "</span>" +
      '<p class="small">Public venue. Meet where the organizer says, and tell a friend where you\'re going.</p></div>';

    if (group(e.hobbyId)) {
      h += '<button type="button" class="card tap cm-group" data-action="open-group" data-id="' + esc(e.hobbyId) + '">' +
        '<span class="cm-glyph" aria-hidden="true">' + glyph(e.hobbyId, 24) + "</span>" +
        '<span class="cm-group-txt"><span class="cm-ev-title">' + esc(group(e.hobbyId).name) + '</span><span class="small muted">See the group</span></span>' +
        '<span class="cm-chev" aria-hidden="true">' + icon("chevron-right", 20) + "</span></button>";
    }
    h += '<p class="small muted cm-sample">Sample event · not a real listing</p>';
    h += "</div>";
    return h;
  }

  /* ---------------- shared actions ---------------- */
  function mount(root) {
    // Bind to this screen's own wrapper (replaced on every render) so the listener never
    // outlives the screen or leaks onto other screens sharing #app-main.
    var host = root && (root.querySelector(".cm") || root);
    if (!host || host._cmBound) return;
    host._cmBound = true;
    host.addEventListener("click", function (ev) {
      var el = ev.target.closest ? ev.target.closest("[data-action]") : null;
      if (!el || !host.contains(el) || el.disabled) return;
      var a = el.getAttribute("data-action");
      var id = el.getAttribute("data-id");
      if (a === "back") { SQUI.back(); }
      else if (a === "go") { SQUI.go(el.getAttribute("data-to")); }
      else if (a === "go-today") { SQUI.go("today"); }
      else if (a === "open-event") { SQUI.go("event", { id: id }); }
      else if (a === "open-group") { SQUI.go("group", { hobbyId: id }); }
      else if (a === "filter") { view.filter = el.getAttribute("data-f") || "all"; SQUI.refresh(); }
      else if (a === "toggle-all") { view.showAll = !view.showAll; SQUI.refresh(); }
      else if (a === "share") {
        if (isTracked(id)) SQUI.go("log", { id: id });
        else { SQUI.toast("Start " + hobbyName(id) + " first, then share a session"); SQUI.go("pack", { id: id }); }
      }
      else if (a === "rsvp") {
        var e = findEvent(id);
        var on = SQ().toggleRsvp(id);
        SQUI.toast(on ? "You're going" + (e ? " · " + e.title : "") : "RSVP removed");
        SQUI.refresh();
      }
      else if (a === "checkin") {
        var r = SQ().checkIn(id);
        if (!r) { SQUI.toast("Check-in isn't open for this event"); SQUI.refresh(); return; }
        SQUI.refresh();
        try {
          var p = SQUI.showReward(r, { title: "Checked in" });
          if (p && p.then) p.then(function () { SQUI.refresh(); });
        } catch (e2) { /* overlay optional */ }
      }
    });
  }

  SQUI.register("community", { tab: "community", title: "Community", render: render, mount: mount });
  SQUI.register("group", { tab: "community", title: "Group", render: renderGroup, mount: mount });
  SQUI.register("event", { tab: "community", title: "Event", render: renderEvent, mount: mount });
})();
