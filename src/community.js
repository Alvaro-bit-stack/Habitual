/* Habitual — COMMUNITY tab: community, group({hobbyId}), event({id}) */
(function () {
  "use strict";
  if (typeof window === "undefined" || !window.SQUI) return;
  var SQUI = window.SQUI;
  var G = globalThis;

  var AREA = "Sample community · Newark area";
    var WD = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  var WD_LONG = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  var MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  var MON_LONG = ["January", "February", "March", "April", "May", "June", "July", "August",
    "September", "October", "November", "December"];

  // view state for the community list (kept for the session)
  var arrivingEvent = null;
  var view = { when: "upcoming", category: "going", query: "", hobby: "", level: "" };

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
    var cls = level === "Experienced" ? "pill-warn" : level === "Intermediate" ? "pill-good cm-level-mid" : "pill-good";
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
    return '<button type="button" class="btn sm cm-rsvp' + (e.rsvp ? " on" : "") + (extra || "") +
      '" data-action="rsvp" data-id="' + esc(e.id) + '" aria-pressed="' + (e.rsvp ? "true" : "false") +
      '" aria-label="' + (e.rsvp ? "Going to " : "RSVP to ") + esc(e.title) + '">' +
      (e.rsvp ? icon("check", 16) + " Going" : "I’m going") + "</button>";
  }

  /* ---------------- sharing ---------------- */
  function svg(size, body) {
    return '<svg width="' + size + '" height="' + size + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + body + '</svg>';
  }
  function shareIcon(size) { return svg(size, '<path d="M12 15V3"/><path d="M7 8l5-5 5 5"/><path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7"/>'); }
  function textIcon(size) { return svg(size, '<path d="M21 12a8 8 0 0 1-11.6 7.1L4 20.5l1.4-5.1A8 8 0 1 1 21 12z"/>'); }
  function copyIcon(size) { return svg(size, '<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V6a2 2 0 0 1 2-2h9"/>'); }
  function shareBtn(e) {
    return '<button type="button" class="cm-share" data-action="share-event" data-id="' + esc(e.id) + '" aria-label="Share ' + esc(e.title) + '">' + shareIcon(20) + '</button>';
  }
  function shares() {
    var u = SQ().state.user;
    if (!Array.isArray(u.shares)) u.shares = []; // lives on user so normalize() keeps it
    return u.shares;
  }
  function sharedWith(e) {
    var names = [];
    shares().forEach(function (s) { if (s.eventId === e.id && names.indexOf(s.to) < 0) names.push(s.to); });
    return names;
  }
  function sharedLine(e) {
    var n = sharedWith(e);
    return n.length ? '<p class="small muted cm-hint cm-shared-line">' + icon("check", 14) + ' Shared with ' + esc(n.join(", ")) + '</p>' : '';
  }
  function inviteText(e) {
    return "Want to come with me? " + e.title + " · " + dayLabel(e.date) + " " + e.time + " · " + e.place +
      ". " + (e.level === "Experienced" ? "For experienced players." : e.level === "Intermediate" ? "Best if you've done it a few times." : "Beginners welcome.") + " Found it on Habitual.";
  }
  // People you can send to inside Habitual: sample members from the Newark groups (hosts you've seen).
  function sharePeople(e) {
    var seen = {}, out = [];
    allEvents().forEach(function (x) { if (x.host !== e.host && !seen[x.host]) { seen[x.host] = 1; out.push({ name: x.host, hobbyId: x.hobbyId }); } });
    out.unshift({ name: e.host, hobbyId: e.hobbyId, hostOf: true });
    return out.slice(0, 8);
  }
  var shareReturnFocus = null;
  function closeShare() {
    var el = document.querySelector(".cm-share-sheet");
    if (!el) return;
    el.remove();
    document.removeEventListener("keydown", shareKeys, true);
    var r = shareReturnFocus && document.getElementById(shareReturnFocus);
    try { (r || document.querySelector('[data-action="share-event"]') || document.body).focus({ preventScroll: true }); } catch (x) { /* ignore */ }
  }
  function shareKeys(ev) { if (ev.key === "Escape") { ev.preventDefault(); closeShare(); } }
  function openShare(id) {
    var e = findEvent(id);
    if (!e || typeof document === "undefined") return;
    closeShare();
    var opener = document.activeElement;
    if (opener && !opener.id) opener.id = "cm-share-from-" + Math.random().toString(36).slice(2, 8);
    shareReturnFocus = opener && opener.id;
    var text = inviteText(e), sent = sharedWith(e);
    var people = sharePeople(e).map(function (p) {
      var done = sent.indexOf(p.name) >= 0;
      return '<li><span class="cm-attendance-icon">' + mii(avatarFor(p.name), 42) + '</span>' +
        '<span class="cm-sp-name"><strong>' + esc(p.name) + '</strong><span class="small muted">' + (p.hostOf ? "Host" : esc(hobbyName(p.hobbyId)) + " group") + '</span></span>' +
        '<button type="button" class="btn sm cm-sp-send' + (done ? " on" : "") + '" data-send="' + esc(p.name) + '"' + (done ? " disabled" : "") + '>' +
        (done ? icon("check", 14) + " Sent" : "Send") + '</button></li>';
    }).join("");
    var sms = "sms:?&body=" + encodeURIComponent(text);
    var wrap = document.createElement("div");
    wrap.className = "cm-share-sheet";
    wrap.innerHTML = '<div class="cm-sheet-backdrop" data-close></div>' +
      '<div class="cm-sheet" role="dialog" aria-modal="true" aria-labelledby="cm-share-title">' +
        '<div class="cm-sheet-grab" aria-hidden="true"></div>' +
        '<div class="cm-sheet-head"><h2 id="cm-share-title" class="h3">Share this event</h2>' +
          '<button type="button" class="icon-btn" data-close aria-label="Close">' + icon("close", 20) + '</button></div>' +
        '<div class="cm-sheet-event">' + glyph(e.hobbyId, 22) + '<span><strong>' + esc(e.title) + '</strong><span class="small muted">' + esc(dayLabel(e.date)) + " · " + esc(e.time) + " · " + esc(e.place) + '</span></span></div>' +
        '<div class="cm-sheet-row">' +
          '<a class="btn primary cm-sheet-text" href="' + esc(sms) + '" data-text-share>' + textIcon(18) + ' Text a friend</a>' +
          '<button type="button" class="btn cm-sheet-copy" data-copy>' + copyIcon(18) + ' Copy invite</button>' +
        '</div>' +
        '<p class="cm-sheet-preview" id="cm-invite-text">' + esc(text) + '</p>' +
        '<h3 class="eyebrow cm-sheet-sub">Send in Habitual</h3>' +
        '<ul class="cm-sheet-people">' + people + '</ul>' +
        '<p class="small muted cm-sample">Sample members · they’ll see it in their Community inbox once accounts are live</p>' +
      '</div>';
    (document.getElementById("overlay-root") || document.body).appendChild(wrap);
    document.addEventListener("keydown", shareKeys, true);
    wrap.addEventListener("click", function (ev) {
      var t = ev.target;
      if (t.closest("[data-close]")) { closeShare(); return; }
      var send = t.closest("[data-send]");
      if (send && !send.disabled) {
        var to = send.getAttribute("data-send");
        shares().push({ eventId: e.id, to: to, at: today() });
        try { SQ().save(); } catch (x) { /* storage optional */ }
        send.disabled = true; send.classList.add("on"); send.innerHTML = icon("check", 14) + " Sent";
        SQUI.toast("Sent to " + to);
        return;
      }
      if (t.closest("[data-copy]")) {
        var done = function () { SQUI.toast("Invite copied. Paste it in any chat"); };
        try { navigator.clipboard.writeText(text).then(done, function () { selectInvite(); }); } catch (x) { selectInvite(); }
        return;
      }
      if (t.closest("[data-text-share]") && navigator.share) {
        // Phones: the system share sheet covers Messages, WhatsApp and more.
        ev.preventDefault();
        navigator.share({ title: e.title, text: text }).catch(function (err) {
          if (err && err.name === "AbortError") return; // they closed the system sheet
          selectInvite(); // sharing isn't allowed here: hand them the text instead
        });
      }
    });
    var first = wrap.querySelector(".cm-sheet-text");
    try { first.focus({ preventScroll: true }); } catch (x) { /* ignore */ }
  }
  function selectInvite() {
    var p = document.getElementById("cm-invite-text");
    if (!p) return;
    var r = document.createRange(); r.selectNodeContents(p);
    var sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(r);
    SQUI.toast("Invite selected. Copy it to share");
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
          '<li><span class="cm-why-ic cm-why-xp" aria-hidden="true">' + icon("spark", 20) + "</span><span>Unlock <strong>achievements</strong> as you join meetups</span></li>" +
        "</ul>" +
        '<div class="stack">' +
          '<button type="button" class="btn primary block" data-action="go" data-to="pick">I already have a hobby</button>' +
          '<button type="button" class="btn block" data-action="go" data-to="discover">Find a new hobby</button>' +
        "</div>" +
      "</div>" +
      '<p class="small muted cm-sample">' + esc(AREA) + "</p>" +
    "</div>";
  }

  var DATE_FILTERS = [['upcoming', 'Any day', 'calendar'], ['today', 'Today', 'sun'], ['tomorrow', 'Tomorrow', 'clock'], ['weekend', 'This weekend', 'star']];
  // Level: "All levels" events welcome everyone, so they show under every choice.
  var LEVEL_FILTERS = [['', 'Any level', 'users'], ['beginner', 'Beginner', 'leaf'], ['intermediate', 'Intermediate', 'trophy'], ['experienced', 'Experienced', 'flame']];
  var LEVEL_MATCH = { beginner: ['Beginner friendly', 'All levels'], intermediate: ['Intermediate', 'All levels'], experienced: ['Experienced', 'All levels'] };
  function levelFilterOn() { return view.category === 'for-you' || view.category === 'all'; }
  var CATEGORIES = [['going', 'Going', 'calendar'], ['for-you', 'For you', 'spark'], ['all', 'All events', 'compass'], ['groups', 'Your groups', 'users']];

  var AVATARS = ['neo', 'adrian', 'alvaro'];
  function selectedAvatar() {
    var id = SQ().state.user.character;
    return AVATARS.indexOf(id) >= 0 ? id : 'neo';
  }
  function avatarFor(name) {
    var seed = Array.from(String(name)).reduce(function (n, c) { return ((n * 31) + c.charCodeAt(0)) >>> 0; }, 7);
    return AVATARS[seed % AVATARS.length];
  }
  function mii(id, size) {
    return '<span class="cm-mii" data-character="' + id + '" style="--mii-size:' + size + 'px" aria-hidden="true"></span>';
  }
  function character(name, size) { return mii(avatarFor(name), size); }
  // A small illustrative cast represents the meetup; the text still gives the full attendee count.
  function venueCast(e) {
    var joined = e.rsvp || e.checkedIn;
    var people = Math.min(3, Math.max(0, +e.going || 0));
    var first = AVATARS.indexOf(avatarFor(e.host));
    var cast = '<span class="cm-venue-cast" aria-hidden="true">';
    for (var i = 0; i < people; i++) {
      cast += '<span class="cm-person">' + mii(AVATARS[(first + i) % 3], 106) + '</span>';
    }
    if (joined) cast += '<span class="cm-person cm-you' + (arrivingEvent === e.id ? ' cm-arriving' : '') + '">' +
      mii(selectedAvatar(), 106) + '<span class="cm-you-label">You</span></span>';
    return cast + '</span><span class="sr-only">' + (joined ? 'Your avatar has joined the group. ' : '') +
      going(e) + ' people going. Characters represent sample attendees.</span>';
  }
  // Curated venue identity comes from the location, never the activity or host.
  function venuePhoto(e) {
    var place = String(e.place || '').trim().toLowerCase().replace(/\s+/g, ' ');
    var photos = G.SQ_VENUES || {};
    var key = Object.keys(photos).find(function (id) {
      return (photos[id].places || []).some(function (p) {
        return p.trim().toLowerCase().replace(/\s+/g, ' ') === place;
      });
    });
    return key ? photos[key] : null;
  }
  function venueCover(e) {
    var photo = venuePhoto(e);
    return '<span class="cm-venue-fallback" aria-hidden="true">' + icon('pin', 30) +
      '<strong>' + esc(photo ? photo.name : e.place) + '</strong><span>Venue photo unavailable</span></span>' +
      (photo && photo.src ? '<img class="cm-venue-image" src="' + esc(photo.src) + '" alt="' + esc(photo.alt) + '" loading="lazy" decoding="async">' : '') + '<span class="cm-venue-ground" aria-hidden="true"></span>' + venueCast(e);
  }
  function venueCredit(e) {
    var photo = venuePhoto(e);
    if (!photo) return '';
    return '<details class="cm-photo-credit"><summary>About this venue photo</summary><p>' + esc(photo.alt) +
      '. Venue overview; the meeting area and current conditions may differ.</p><p>Photo by ' + esc(photo.author) + ' · ' +
      '<a href="' + esc(photo.source) + '" target="_blank" rel="noopener noreferrer">Wikimedia Commons</a> · ' +
      '<a href="' + esc(photo.licenseUrl || photo.source) + '" target="_blank" rel="noopener noreferrer">' + esc(photo.license) +
      '</a>. Cropped to fit.</p></details>';
  }
  function renderMember(params) {
    var e = findEvent(params && params.id);
    if (!e) return renderEvent(params);
    return '<div class="screen stack-lg cm cm-member"><div class="screen-head"><button type="button" class="back-btn" data-action="back" aria-label="Back">' + icon('chevron-left', 22) + '</button><span class="eyebrow">Meet your host</span></div>' +
      '<div class="cm-member-stage">' + character(e.host, 220) + '</div><div class="cm-member-name"><p class="eyebrow">' + esc(hobbyName(e.hobbyId)) + ' community</p><h1 class="h1">' + esc(e.host) + '</h1><p class="muted">Sample host · Newark area</p></div>' +
      '<section class="stack"><h2 class="h2">Hosting next</h2><ul class="cm-evlist">' + eventRow(e, {showDate:true}) + '</ul></section>' +
      '<button type="button" class="btn primary block" data-action="open-group" data-id="' + esc(e.hobbyId) + '">Explore the ' + esc(hobbyName(e.hobbyId)) + ' group</button>' +
      '<p class="small muted cm-sample">Habitual character · Sample host profile</p></div>';
  }

  function matchesDate(e) {
    var offset = diffDays(today(), e.date);
    if (offset < 0) return false;
    if (view.when === 'today') return offset === 0;
    if (view.when === 'tomorrow') return offset === 1;
    if (view.when === 'weekend') {
      var day = parse(today()).getDay();
      var first = day === 0 ? 0 : (6 - day + 7) % 7;
      return offset >= first && offset <= first + (day === 0 ? 0 : 1);
    }
    return true;
  }
  function matchesQuery(text) {
    return view.category !== 'all' || text.toLowerCase().indexOf(view.query.trim().toLowerCase()) >= 0;
  }
  function feedEvents() {
    return allEvents().filter(function (e) {
      if (!matchesDate(e)) return false;
      if (view.category === 'for-you' && !isTracked(e.hobbyId) && !e.rsvp && !e.checkedIn) return false;
      if (view.category === 'going' && !e.rsvp && !e.checkedIn) return false;
      if (view.hobby && e.hobbyId !== view.hobby) return false;
      if (view.level && levelFilterOn() && (LEVEL_MATCH[view.level] || []).indexOf(e.level) < 0) return false;
      return matchesQuery(e.place); // All events search is by location
    });
  }
  function feedGroups() {
    return (data().groups || []).filter(function (g) {
      return isTracked(g.hobbyId) && (!view.hobby || g.hobbyId === view.hobby) && matchesQuery(g.name + ' ' + hobbyName(g.hobbyId));
    });
  }
  // Host in front, then a few more heads behind: more people going, more heads (1 to 5).
  function crowdSize(n) { return n <= 1 ? 1 : n <= 3 ? 2 : n <= 7 ? 3 : n <= 14 ? 4 : 5; }
  function crowd(e) {
    var n = +going(e) || 0, size = crowdSize(n), host = avatarFor(e.host), first = AVATARS.indexOf(host);
    var heads = [host];
    if ((e.rsvp || e.checkedIn) && size > 1) heads.push(selectedAvatar());
    for (var i = 1; heads.length < size; i++) heads.push(AVATARS[(first + i) % AVATARS.length]);
    return '<span class="cm-crowd" data-heads="' + size + '" aria-hidden="true">' + heads.map(function (id, k) {
      return '<span class="cm-attendance-icon" style="z-index:' + (size - k) + '">' + mii(id, 42) + '</span>';
    }).join('') + '</span>';
  }
  function eventCard(e) {
    var label = e.rsvp ? 'You’re going' : e.level;
    var status = e.checkedIn || e.rsvp;
    return '<li class="cm-feed-event cm-ev' + (e.rsvp ? ' is-going' : '') + '">' +
      '<button type="button" class="cm-event-photo" data-action="open-event" data-id="' + esc(e.id) + '" aria-label="View ' + esc(e.title) + '">' +
      venueCover(e) + '<span class="cm-photo-tag' + (status ? ' cm-photo-going' : '') + '">' +
      (status ? icon('check', 14) : glyph(e.hobbyId, 16)) + ' ' + esc(label) + '</span>' +
      '<span class="cm-photo-hobby">' + esc(hobbyName(e.hobbyId)) + '</span></button>' + shareBtn(e) +
      '<button type="button" class="cm-ev-main' + (e.date === today() ? ' cm-today-top' : '') + '" data-action="open-event" data-id="' + esc(e.id) + '">' +
      '<span class="cm-ev-body"><span class="cm-event-date">' + esc(dayLabel(e.date)) + ' · ' + esc(e.time) + '</span>' +
      '<span class="cm-ev-title">' + esc(e.title) + '</span>' +
      '<span class="cm-event-place">' + icon('pin', 14) + ' ' + esc(e.place) + '</span></span></button>' +
      '<div class="cm-feed-foot"><button type="button" class="cm-attendance" data-action="open-member" data-id="' + esc(e.id) + '" aria-label="Meet ' + esc(e.host) + ', ' + going(e) + ' going">' + crowd(e) +
      '<span><strong>' + going(e) + ' going</strong><span class="cm-host">with ' + esc(e.host) + '</span></span></button>' + rsvpBtn(e) + '</div>' +
      venueCredit(e) + '</li>';
  }
  function groupCard(g) {
    var events = allEvents().filter(function (e) { return e.hobbyId === g.hobbyId && e.date >= today(); });
    var next = events.find(function (e) { return e.rsvp || e.checkedIn; }) || events[0];
    return '<li><button type="button" class="cm-feed-group cm-gathering" data-action="open-group" data-id="' + esc(g.hobbyId) + '">' +
      (next ? '<span class="cm-event-photo cm-group-scene">' + venueCover(next) + '</span>' : '') +
      '<span class="cm-gathering-body"><span class="cm-gathering-top"><span class="cm-ev-title">' + esc(g.name) +
      '</span><span aria-hidden="true">' + icon('chevron-right', 20) + '</span></span>' +
      '<span class="small muted">' + esc(g.members) + ' members' + (next && (next.rsvp || next.checkedIn) ? ' · You’re going' : '') + '</span>' +
      (next ? '<span class="cm-group-next">Next together · ' + esc(dayLabel(next.date)) + '</span><span class="cm-group-place">' + esc(next.place) + '</span>' : '<span class="small muted">More meetups soon</span>') +
      '</span></button>' + (next ? venueCredit(next) : '') + '</li>';
  }
  function feedStatus() {
    var groups = view.category === 'groups';
    var n = groups ? feedGroups().length : feedEvents().length;
    return n + (groups ? n === 1 ? ' group' : ' groups' : n === 1 ? ' event' : ' events');
  }
  function feedResults() {
    var groups = view.category === 'groups';
    var list = groups ? feedGroups() : feedEvents();
    if (!list.length) {
      return '<div class="empty cm-empty"><span aria-hidden="true">' + icon('search', 28) + '</span>' +
        '<h2 class="h3">' + (groups ? 'Your groups start here' : view.category === 'going' && !view.query ? 'Your plans start here' : 'No events found') + '</h2>' +
        '<p class="muted small">' + (groups ? 'Groups appear for the hobbies you track. Add a hobby to find your people.' : 'Try a different day, or explore All events to search nearby meetups.') + '</p>' +
        '<button type="button" class="btn primary" data-action="reset-feed">Explore all events</button>' +
        (groups ? '<button type="button" class="btn" data-action="go" data-to="pick">Add a hobby</button>' : '') + '</div>';
    }
    return '<ul class="' + (groups ? 'cm-feed-groups' : 'cm-event-feed') + '" aria-label="' + (groups ? 'Your hobby groups' : 'Community events') + '">' +
      list.map(groups ? groupCard : eventCard).join('') + '</ul>' +
      '<p class="cm-feed-end">' + (groups ? 'Your hobby groups' : 'You’re all caught up') + '</p>';
  }
  // Going / For you / Your groups filter within your own hobbies; All events is for discovering new
  // ones, so it lists your hobbies first and then every other hobby with events here.
  function hobbyIds(category) {
    var ids = [];
    (SQ().state.tracked || []).forEach(function (t) { if (ids.indexOf(t.hobbyId) < 0) ids.push(t.hobbyId); });
    if (category === 'all') allEvents().forEach(function (e) { if (ids.indexOf(e.hobbyId) < 0) ids.push(e.hobbyId); });
    return ids;
  }
  function hobbyOptions() {
    return [['', 'All hobbies']].concat(hobbyIds(view.category).map(function (id) { return [id, hobbyName(id)]; }));
  }
  // Type-to-narrow hobby picker (combobox): the field shows the chosen hobby; typing filters the list.
  function hobbyCombo() {
    var opts = hobbyOptions(), cur = view.hobby ? hobbyName(view.hobby) : '';
    var mine = view.category === 'all' ? 'Every hobby' : 'Your hobbies';
    return '<div class="cm-filter cm-combo' + (view.hobby ? ' on' : '') + '">' +
      '<span aria-hidden="true">' + icon('spark', 16) + '</span>' +
      '<label class="sr-only" for="cm-hobby">Hobby</label>' +
      '<input id="cm-hobby" type="text" role="combobox" aria-autocomplete="list" aria-expanded="false" aria-controls="cm-hobby-list"' +
      ' autocomplete="off" spellcheck="false" placeholder="All hobbies" value="' + esc(cur) + '">' +
      (view.hobby ? '<button type="button" class="cm-combo-clear" data-action="hobby-filter" data-v="" aria-label="Show all hobbies">' + icon('close', 14) + '</button>'
                  : '<span class="cm-filter-caret" aria-hidden="true">' + icon('chevron-right', 14) + '</span>') +
      '<ul id="cm-hobby-list" class="cm-combo-list" role="listbox" aria-label="' + mine + '" hidden>' + opts.map(function (o, i) {
        return '<li id="cm-hobby-opt-' + i + '" role="option" data-v="' + esc(o[0]) + '" aria-selected="' + (o[0] === view.hobby) + '">' +
          (o[0] ? glyph(o[0], 16) : icon('compass', 16)) + '<span>' + esc(o[1]) + '</span>' + (o[0] === view.hobby ? '<i class="cm-opt-check">' + icon('check', 16) + '</i>' : '') + '</li>';
      }).join('') + '<li class="cm-combo-none" role="presentation" hidden>No matching hobby</li></ul></div>';
  }
  // When and Level: a button that opens the same list panel as the Hobby search (no typing).
  function filterSelect(id, label, action, value, options, ic) {
    var on = value !== options[0][0];
    var cur = options.filter(function (o) { return o[0] === value; })[0] || options[0];
    return '<div class="cm-filter cm-menu' + (on ? ' on' : '') + '">' +
      '<span aria-hidden="true">' + icon(ic, 16) + '</span>' +
      '<button type="button" id="' + id + '" class="cm-menu-btn" data-menu="' + action + '" aria-haspopup="listbox" aria-expanded="false" aria-controls="' + id + '-list"' +
      ' aria-label="' + label + ': ' + esc(cur[1]) + '">' + esc(cur[1]) + '</button>' +
      '<span class="cm-filter-caret" aria-hidden="true">' + icon('chevron-right', 14) + '</span>' +
      '<ul id="' + id + '-list" class="cm-combo-list" role="listbox" aria-label="' + label + '" tabindex="-1" hidden>' + options.map(function (o, i) {
        return '<li id="' + id + '-opt-' + i + '" role="option" data-v="' + esc(o[0]) + '" aria-selected="' + (o[0] === value) + '">' +
          icon(o[2], 16) + '<span>' + esc(o[1]) + '</span>' + (o[0] === value ? '<i class="cm-opt-check">' + icon('check', 16) + '</i>' : '') + '</li>';
      }).join('') + '</ul></div>';
  }
  // Header: location eyebrow, title, and a small "group photo" of neighbors going this week.
  function weekStats() {
    var t = today(), mine = allEvents().filter(function (e) { var d = diffDays(t, e.date); return d >= 0 && d < 7 && isTracked(e.hobbyId); });
    var heads = [];
    mine.forEach(function (e) { var id = avatarFor(e.host); if (heads.indexOf(id) < 0) heads.push(id); });
    return { events: mine.length, people: mine.reduce(function (n, e) { return n + going(e); }, 0), first: heads[0] || selectedAvatar() };
  }
  // One person in front, then people behind on each side, smaller the further back (1, 3 or 5 heads).
  function groupPhoto(first, people) {
    var n = people >= 12 ? 5 : people >= 3 ? 3 : 1, start = AVATARS.indexOf(first), out = [];
    for (var i = 0; i < n; i++) out.push(AVATARS[(start + i) % AVATARS.length]);
    var slots = n === 5 ? ['far-l', 'near-l', 'front', 'near-r', 'far-r'] : n === 3 ? ['near-l', 'front', 'near-r'] : ['front'];
    var order = n === 5 ? [3, 1, 0, 2, 4] : n === 3 ? [1, 0, 2] : [0];
    return '<span class="cm-huddle" data-heads="' + n + '" aria-hidden="true">' + slots.map(function (slot, k) {
      var size = slot === 'front' ? 56 : slot.indexOf('near') === 0 ? 42 : 32;
      return '<span class="cm-gp cm-gp-' + slot + '">' + mii(out[order[k]], size) + '</span>';
    }).join('') + '</span>';
  }
  function feedHeader() {
    var w = weekStats();
    return '<header class="cm-feed-header cm-hd-b"><span class="cm-hd-eyebrow">' + icon('pin', 14) + ' Newark, NJ</span><h1>Community</h1>' +
      '<span class="cm-hd-people">' + groupPhoto(w.first, w.people) +
      '<span>' + (w.people ? '<strong>' + w.people + ' neighbors going</strong><br>to meetups for your hobbies this week'
                           : 'No meetups for your hobbies this week yet. Explore <strong>All events</strong>') + '</span></span></header>';
  }
  function render() {
    if (!SQ() || !SQ().communityUnlocked()) return renderLocked();
    var groups = view.category === 'groups';
    return '<div class="screen cm cm-feed">' +
      feedHeader() +
      '<div class="cm-categories" role="group" aria-label="Community categories">' + CATEGORIES.map(function (c) {
        return '<button type="button" data-action="category" data-v="' + c[0] + '" aria-pressed="' + (view.category === c[0]) + '" class="' + (view.category === c[0] ? 'on' : '') + '"><span aria-hidden="true">' + icon(c[2], 23) + '</span>' + c[1] + '</button>';
      }).join('') + '</div>' +
      (view.category === 'all' ? '<label class="cm-search"><span aria-hidden="true">' + icon('search', 20) + '</span><span class="sr-only">Search events by location</span>' +
      '<input id="cm-search" type="search" placeholder="Search by location…" value="' + esc(view.query) + '" maxlength="120" autocomplete="off"></label>' : '') +
      '<div class="cm-filters' + (levelFilterOn() ? ' has-level' : '') + '">' +
        (groups ? '' : filterSelect('cm-when', 'When', 'date-filter', view.when, DATE_FILTERS, 'calendar')) +
        (levelFilterOn() ? filterSelect('cm-level', 'Level', 'level-filter', view.level, LEVEL_FILTERS, 'star') : '') +
        hobbyCombo() +
      '</div>' +
      '<div class="cm-feed-label"><h2>' + (groups ? 'Your circles' : view.category === 'going' ? 'On your calendar' : view.category === 'for-you' ? 'For your hobbies' : 'Around you') + '</h2>' +
      '<span class="small muted" role="status" aria-live="polite" aria-atomic="true" data-feed-status>' + feedStatus() + '</span></div>' +
      '<div data-feed-results>' + feedResults() + '</div><p class="small muted cm-sample">Sample events · Real venues, sample characters</p></div>';
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
      h += '<ul class="cm-event-feed">' + evs.map(eventCard).join("") + "</ul>";
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
        h += '<li class="cm-post"><div class="row cm-post-head"><span class="cm-av" aria-hidden="true">' + character(p.author || "?", 42) + "</span>" +
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
    h += '<div class="cm-event-photo cm-venue-detail">' + venueCover(e) + '</div>' + venueCredit(e);
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
    h += '<button type="button" class="btn block cm-share-wide" data-action="share-event" data-id="' + esc(e.id) + '">' + shareIcon(18) + " Share this event</button>" + sharedLine(e);
    h += '<button type="button" class="btn block cm-rsvp' + (e.rsvp ? " on" : "") + '" data-action="rsvp" data-id="' + esc(e.id) + '" aria-pressed="' + e.rsvp + '">' +
      (e.rsvp ? icon("check", 18) + " Going · tap to cancel" : "I’m going") + "</button>";
    if (!e.rsvp) h += '<p class="small muted cm-hint">RSVP so the host knows you’re coming.</p>';
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

  /* ---------------- arrival: drop in from above the card, land, sparks ----------------
     After an RSVP, the "You" slot renders hidden (cm-arriving). The character falls from above
     the card into that slot, lands with a squash and a small thud of the card, sparks burst at its
     feet and the "You" label pops in. With the 3D model loaded (showcase.js) the real character
     falls and does its Joyful Jump; otherwise the 2D sprite falls. Reduced motion: it just appears. */
  var STILL = !!(G.matchMedia && G.matchMedia("(prefers-reduced-motion: reduce)").matches);
  var DROP_MS = 560, SQUASH_MS = 180, DROP_ABOVE = 150;
  function dropLayer() {
    var l = document.querySelector(".cm-drop-layer");
    if (!l) { l = document.createElement("div"); l.className = "cm-drop-layer"; l.setAttribute("aria-hidden", "true"); document.body.appendChild(l); }
    return l;
  }
  function sparks(slot) {
    var r = slot.getBoundingClientRect(), x = r.left + r.width / 2, y = r.bottom - 10, layer = dropLayer();
    var colors = ["var(--sun)", "var(--sun)", "var(--leaf)", "var(--sky)", "var(--surface)"];
    var ring = document.createElement("span");
    ring.className = "cm-spark-ring";
    ring.style.left = x + "px"; ring.style.top = y + "px";
    layer.appendChild(ring);
    ring.animate([{ transform: "translate(-50%,-50%) scale(.2)", opacity: 1 }, { transform: "translate(-50%,-50%) scale(1.7)", opacity: 0 }],
      { duration: 650, easing: "cubic-bezier(.2,.7,.3,1)" }).onfinish = function () { ring.remove(); };
    var flash = document.createElement("span");
    flash.className = "cm-spark-flash";
    flash.style.left = x + "px"; flash.style.top = (y - 18) + "px";
    layer.appendChild(flash);
    flash.animate([{ transform: "translate(-50%,-50%) rotate(0deg) scale(.2)", opacity: 1 }, { transform: "translate(-50%,-50%) rotate(45deg) scale(1.2)", opacity: .9, offset: .35 }, { transform: "translate(-50%,-50%) rotate(90deg) scale(.4)", opacity: 0 }],
      { duration: 560, easing: "ease-out" }).onfinish = function () { flash.remove(); };
    for (var i = 0; i < 22; i++) {
      var p = document.createElement("span"), streak = i % 3 === 0;
      var ang = (-185 + (i / 22) * 190 + (Math.random() * 12 - 6)) * Math.PI / 180; // fan upward and out
      var dist = 46 + Math.random() * 52, dx = Math.cos(ang) * dist, dy = Math.sin(ang) * dist * 0.9;
      p.className = streak ? "cm-spark cm-spark-streak" : "cm-spark";
      p.style.left = x + "px"; p.style.top = y + "px";
      p.style.background = colors[i % colors.length];
      var rot = "rotate(" + (ang * 180 / Math.PI + 90) + "deg)";
      layer.appendChild(p);
      p.animate([
        { transform: "translate(-50%,-50%) " + rot + " scale(1)", opacity: 1 },
        { transform: "translate(calc(-50% + " + dx + "px), calc(-50% + " + dy + "px)) " + rot + " scale(.25)", opacity: 0 }
      ], { duration: 650 + Math.random() * 350, easing: "cubic-bezier(.15,.75,.35,1)" }).onfinish = (function (el) { return function () { el.remove(); }; })(p);
    }
  }
  function thud(slot) {
    var card = slot.closest(".cm-feed-event") || slot.closest(".cm-event-photo");
    if (card && card.animate) card.animate([{ transform: "translateY(0)" }, { transform: "translateY(3px)" }, { transform: "translateY(0)" }], { duration: 240, easing: "ease-out" });
  }
  // Where the fall starts: DROP_ABOVE px above the top of the card holding the slot.
  function dropStartTop(slot, h) {
    var card = slot.closest(".cm-feed-event") || slot.closest(".cm-event-photo") || slot.parentNode;
    return card.getBoundingClientRect().top - DROP_ABOVE - h;
  }
  function drop2d(slot, onLand, onDone) {
    var sprite = slot.querySelector(".cm-mii"), layer = dropLayer();
    if (!sprite || !sprite.animate) { onLand(); onDone(); return; }
    var fall = document.createElement("span");
    fall.className = "cm-drop";
    fall.appendChild(sprite.cloneNode(true));
    layer.appendChild(fall);
    var t0 = null, landed = false;
    (function frame() {
      var now = performance.now(); // one clock: rAF timestamps and performance.now() can disagree
      if (!slot.isConnected) { fall.remove(); return; }
      if (t0 === null) t0 = now;
      var r = sprite.getBoundingClientRect(), t = now - t0;
      var k = Math.min(1, t / DROP_MS), yEnd = r.top, yStart = dropStartTop(slot, r.height);
      var y = yStart + (yEnd - yStart) * k * k; // gravity: accelerates into the landing
      var sq = 0;
      if (k >= 1) {
        if (!landed) { landed = true; onLand(); }
        sq = Math.sin(Math.min(1, (t - DROP_MS) / SQUASH_MS) * Math.PI); // squash then spring back
      }
      fall.style.width = r.width + "px"; fall.style.height = r.height + "px";
      fall.style.opacity = Math.min(1, k / 0.25); // materializes above the card, then falls in
      fall.style.transform = "translate(" + r.left + "px," + y + "px) scale(" + (1 + 0.12 * sq) + "," + (1 - 0.14 * sq) + ")";
      if (t < DROP_MS + SQUASH_MS) requestAnimationFrame(frame);
      else { onDone(); fall.remove(); }
    })();
  }
  function land(slot) {
    if (STILL) { slot.classList.remove("cm-arriving"); return; }
    function onLand() { slot.classList.add("cm-landed"); sparks(slot); thud(slot); }
    function onDone() { slot.classList.remove("cm-arriving", "cm-landed"); }
    var took = false;
    try { took = !!(SQUI.dropIn && SQUI.dropIn(slot, { onLand: onLand, onDone: onDone, startTop: dropStartTop, ms: DROP_MS })); } catch (e) { took = false; }
    if (!took) drop2d(slot, onLand, onDone);
  }

  var comboQuietUntil = 0; // focus returned after a pick (by us or by SQUI.refresh) shouldn't reopen the list
  var menuQuiet = { id: null, until: 0 }; // a key-up "click" after a pick shouldn't reopen that same menu
  function bindMenus(host) {
    var btns = host.querySelectorAll ? host.querySelectorAll(".cm-menu-btn") : [];
    Array.prototype.forEach.call(btns, function (btn) {
      var list = document.getElementById(btn.getAttribute("aria-controls"));
      if (!list) return;
      var items = Array.prototype.slice.call(list.querySelectorAll('[role="option"]')), active = -1;
      function setActive(i) {
        active = (i + items.length) % items.length;
        items.forEach(function (li, k) { li.classList.toggle("on", k === active); });
        btn.setAttribute("aria-activedescendant", items[active].id);
      }
      function open() {
        closeAllMenus(btn);
        list.hidden = false; btn.setAttribute("aria-expanded", "true");
        var sel = items.findIndex(function (li) { return li.getAttribute("aria-selected") === "true"; });
        setActive(sel < 0 ? 0 : sel);
      }
      function close() { list.hidden = true; btn.setAttribute("aria-expanded", "false"); btn.removeAttribute("aria-activedescendant"); }
      btn._cmClose = close;
      function choose(li) {
        var v = li.getAttribute("data-v") || "", key = btn.getAttribute("data-menu");
        close();
        if (key === "date-filter") view.when = v; else if (key === "level-filter") view.level = v;
        menuQuiet = { id: btn.id, until: Date.now() + 400 };
        SQUI.refresh();
        var again = document.getElementById(btn.id);
        if (again) try { again.focus({ preventScroll: true }); } catch (e) { /* ignore */ }
      }
      btn.addEventListener("click", function () { if (menuQuiet.id === btn.id && Date.now() < menuQuiet.until) return; if (list.hidden) open(); else close(); });
      btn.addEventListener("keydown", function (ev) {
        if (ev.key === "ArrowDown" || ev.key === "ArrowUp") { ev.preventDefault(); if (list.hidden) open(); else setActive(active + (ev.key === "ArrowDown" ? 1 : -1)); }
        else if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); if (list.hidden) open(); else choose(items[active]); }
        else if (ev.key === "Escape" && !list.hidden) { ev.preventDefault(); close(); }
        else if (ev.key === "Tab") close();
      });
      btn.addEventListener("blur", function () { setTimeout(function () { if (!list.contains(document.activeElement)) close(); }, 120); });
      list.addEventListener("mousedown", function (ev) { ev.preventDefault(); });
      list.addEventListener("click", function (ev) { var li = ev.target.closest && ev.target.closest('[role="option"]'); if (li) choose(li); });
    });
  }
  function closeAllMenus(except) {
    Array.prototype.forEach.call(document.querySelectorAll(".cm-menu-btn"), function (b) { if (b !== except && b._cmClose) b._cmClose(); });
    if (!except) return; // called from the Hobby search itself
    var h = document.getElementById("cm-hobby-list");
    if (except && h && !h.hidden) { h.hidden = true; var inp = document.getElementById("cm-hobby"); if (inp) inp.blur(); }
  }
  function bindHobbyCombo(host) {
    var input = host.querySelector && host.querySelector("#cm-hobby");
    var list = host.querySelector && host.querySelector("#cm-hobby-list");
    if (!input || !list) return;
    var items = Array.prototype.slice.call(list.querySelectorAll('[role="option"]'));
    var none = list.querySelector(".cm-combo-none"), active = -1, label = input.value;
    function visible() { return items.filter(function (li) { return !li.hidden; }); }
    function setActive(i) {
      var vis = visible();
      active = vis.length && i !== -1 ? (i + vis.length) % vis.length : -1; // -1 = nothing highlighted yet
      items.forEach(function (li) { li.classList.remove("on"); });
      if (active >= 0) { vis[active].classList.add("on"); input.setAttribute("aria-activedescendant", vis[active].id); vis[active].scrollIntoView({ block: "nearest" }); }
      else input.removeAttribute("aria-activedescendant");
    }
    function filter(q) {
      q = q.trim().toLowerCase();
      items.forEach(function (li) { li.hidden = !!q && li.getAttribute("data-v") !== "" ? li.textContent.toLowerCase().indexOf(q) < 0 : !!q && li.getAttribute("data-v") === ""; });
      none.hidden = visible().length > 0;
      setActive(q ? 0 : -1);
    }
    function open(q) { closeAllMenus(null); var was = list.hidden; list.hidden = false; input.setAttribute("aria-expanded", "true"); if (was) list.scrollTop = 0; filter(q || ""); }
    function close() { list.hidden = true; input.setAttribute("aria-expanded", "false"); input.removeAttribute("aria-activedescendant"); input.value = label; }
    function choose(li) {
      if (!li) return;
      view.hobby = li.getAttribute("data-v") || "";
      comboQuietUntil = Date.now() + 400; // set first: SQUI.refresh restores focus while it renders
      SQUI.refresh();
      var again = document.getElementById("cm-hobby");
      if (again) try { again.focus({ preventScroll: true }); } catch (e) { /* ignore */ }
    }
    input.addEventListener("focus", function () { if (Date.now() < comboQuietUntil) return; input.select(); open(""); });
    input.addEventListener("click", function () { if (list.hidden) open(""); });
    input.addEventListener("input", function () { open(input.value); });
    input.addEventListener("keydown", function (ev) {
      if (ev.key === "ArrowDown") { ev.preventDefault(); if (list.hidden) open(""); else setActive(active + 1); }
      else if (ev.key === "ArrowUp") { ev.preventDefault(); if (list.hidden) open(""); else setActive(active < 0 ? visible().length - 1 : active - 1); }
      else if (ev.key === "Enter") { var vis = visible(); if (!list.hidden && vis.length) { ev.preventDefault(); choose(vis[Math.max(0, active)]); } }
      else if (ev.key === "Escape") { if (!list.hidden) { ev.preventDefault(); close(); } }
    });
    input.addEventListener("blur", function () { setTimeout(function () { if (document.activeElement !== input) close(); }, 0); });
    list.addEventListener("mousedown", function (ev) { ev.preventDefault(); }); // keep focus in the field while picking
    list.addEventListener("click", function (ev) {
      var li = ev.target.closest && ev.target.closest('[role="option"]');
      if (li) choose(li);
    });
  }

  /* ---------------- shared actions ---------------- */
  function mount(root) {
    // Bind to this screen's own wrapper (replaced on every render) so the listener never
    // outlives the screen or leaks onto other screens sharing #app-main.
    var host = root && (root.querySelector(".cm") || root);
    if (!host || host._cmBound) return;
    host._cmBound = true;
    // Arrival is a one-shot RSVP transition, never replayed by filters or a later render.
    arrivingEvent = null;
    var arriving = host.querySelector(".cm-you.cm-arriving");
    if (arriving) requestAnimationFrame(function () { land(arriving); });
    host.addEventListener("error", function (ev) {
      if (ev.target.classList && ev.target.classList.contains("cm-venue-image")) ev.target.remove();
    }, true);
    var search = host.querySelector("#cm-search");
    if (search) search.addEventListener("input", function () {
      view.query = search.value;
      host.querySelector("[data-feed-results]").innerHTML = feedResults();
      host.querySelector("[data-feed-status]").textContent = feedStatus();
    });
    host.addEventListener("change", function (ev) {
      var t = ev.target, a = t && t.getAttribute && t.getAttribute("data-action");
      if (a === "date-filter") view.when = t.value;
      else if (a === "level-filter") view.level = t.value;
      else return;
      SQUI.refresh();
      var again = document.getElementById(t.id); // keep keyboard focus on the same filter
      if (again) try { again.focus({ preventScroll: true }); } catch (e) { /* ignore */ }
    });
    bindHobbyCombo(host);
    bindMenus(host);
    host.addEventListener("click", function (ev) {
      var el = ev.target.closest ? ev.target.closest("[data-action]") : null;
      if (el && el.tagName === "SELECT") return; // selects change on "change", not click
      if (!el || !host.contains(el) || el.disabled) return;
      var a = el.getAttribute("data-action");
      var id = el.getAttribute("data-id");
      if (a === "back") { SQUI.back(); }
      else if (a === "go") { SQUI.go(el.getAttribute("data-to")); }
      else if (a === "go-today") { SQUI.go("today"); }
      else if (a === "open-event") { SQUI.go("event", { id: id }); }
      else if (a === "open-group") { SQUI.go("group", { hobbyId: id }); }
      else if (a === "date-filter") { view.when = el.getAttribute("data-v"); SQUI.refresh(); }
      else if (a === "hobby-filter") { view.hobby = el.getAttribute("data-v") || ""; SQUI.refresh(); }
      else if (a === "level-filter") { view.level = el.getAttribute("data-v") || ""; SQUI.refresh(); }
      else if (a === "share-event") { openShare(id); }
      else if (a === "category") {
        view.category = el.getAttribute("data-v");
        if (view.hobby && hobbyIds(view.category).indexOf(view.hobby) < 0) view.hobby = "";
        SQUI.refresh();
      }
      else if (a === "reset-feed") { view.when = "upcoming"; view.category = "all"; view.query = ""; view.hobby = ""; view.level = ""; SQUI.refresh(); }
      else if (a === "open-member") { SQUI.go("member", {id:id}); }
      else if (a === "share") {
        if (isTracked(id)) SQUI.go("log", { id: id });
        else { SQUI.toast("Start " + hobbyName(id) + " first, then share a session"); SQUI.go("pack", { id: id }); }
      }
      else if (a === "rsvp") {
        var e = findEvent(id);
        var had = {};
        SQ().achievementsList().forEach(function (x) { if (x.unlocked) had[x.id] = 1; });
        var on = SQ().toggleRsvp(id);
        var won = SQ().achievementsList().filter(function (x) { return x.unlocked && !had[x.id]; })[0];
        arrivingEvent = on ? id : null;
        SQUI.toast(!on ? "RSVP removed" : won ? "Achievement unlocked · " + won.name : "You joined the group" + (e ? " · " + e.title : ""));
        SQUI.refresh();
      }
    });
  }

  SQUI.register("community", { tab: "community", title: "Community", render: render, mount: mount });
  SQUI.register("group", { tab: "community", title: "Group", render: renderGroup, mount: mount });
  SQUI.register("member", { tab: "community", title: "Member", render: renderMember, mount: mount });
  SQUI.register("event", { tab: "community", title: "Event", render: renderEvent, mount: mount });
})();
