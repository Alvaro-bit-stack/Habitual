# Sidequest MVP — Build Contract

Sidequest is a mobile-first web app that gets people off their phones and into hobbies.
Two entry paths: "I already have hobbies" (add them to a tracker) and "Find a new hobby"
(5-question quiz → 3 matches → starter pack with gear + cost → start). Tracked hobbies get
weekly goals, tiny wins, comeback mode, XP, levels, a growing mascot ("Sprout"),
achievements, and a community tab (groups + local events, sample data only).

Everything ships as ONE self-contained HTML page at the end. You write separate source
files in `/home/claude/sidequest/src/`; a build script inlines them in this order:

1. `data.js`        — catalog content (Agent: DATA)
2. `engine.js`      — state + game logic, no DOM (Agent: ENGINE)
3. `shell.css`, `shell.js` — app shell, shared UI kit, Today/Hobby/Me screens, reward overlay (Agent: SHELL)
4. `discover.css`, `discover.js` — onboarding fork, add-hobbies picker, quiz, results, starter packs (Agent: DISCOVER)
5. `community.css`, `community.js` — community tab (Agent: COMMUNITY)
6. `boot.js` — written by the integrator: `SQUI.start()`

Rules for ALL agents
- Plain browser JavaScript (ES2020), no modules, no imports, no build step, no libraries.
  Each JS file is wrapped by you in an IIFE `(function(){ ... })();` and exposes ONLY the
  globals named here. Must also load in Node for tests (guard any `window`/`document` use;
  data.js and engine.js must not touch the DOM at all — use `globalThis`).
- No emoji anywhere in UI or data. Icons are inline SVG.
- No `alert/confirm/prompt`, no network calls, no external images. Google Fonts already
  linked by the shell (see Design tokens).
- Today = local date. All dates in data are relative (day offsets) so the demo never goes stale.
- Write ONLY your own files. Do not edit other agents' files. If you need something from
  another part that isn't in this contract, code defensively and report it in your final message.
- Final message: list files written, public API exactly as implemented, any deviations from
  this contract, and known issues. Be precise; the integrator relies on it.

-------------------------------------------------------------------------------
## 1. DATA — `globalThis.SQ_DATA`

```
SQ_DATA = {
  hobbies: Hobby[],          // exactly 12
  achievements: AchDef[],    // exactly the ids listed below, in this order
  groups: Group[],           // one per hobby (12)
  events: EventDef[],        // 16-20 events across hobbies
  quiz: QuizQuestion[]       // exactly the 5 questions below
}
```

Hobby ids (use exactly these): `drawing`, `running`, `tennis`, `guitar`, `photography`,
`cooking`, `hiking`, `soccer`, `knitting`, `bouldering`, `chess`, `gardening`.

```
Hobby = {
  id, name,                                   // "Drawing"
  category: "creative"|"active"|"technical"|"social"|"relaxing",  // primary vibe
  vibes: string[],                            // all vibes that fit, includes category
  place: "indoor"|"outdoor"|"either",
  social: "solo"|"group"|"either",            // tennis/soccer = group; chess = either
  minBudget: 0|50|150,                        // cheapest realistic start (budget tier total bucket)
  time: "low"|"mid"|"high",                   // weekly time it naturally wants
  blurb: string,                              // one sentence, < 110 chars
  related: string[],                          // 2-3 other hobby ids
  tinyWins: [{label, minutes}],               // exactly 5, ascending minutes, first is 2-5 min
                                              // e.g. running: "Put on your shoes and walk 5 minutes"
  milestones: [{id, label}],                  // exactly 5 skill milestones, ids unique within hobby
                                              // e.g. soccer: {id:"pass", label:"Complete 10 passes in a row"}
  starterPack: {
    whyLike: string,                          // 1-2 sentences
    firstMonth: string,                       // 1-2 sentences, concrete
    tiers: {
      free:   { items: GearItem[] },          // borrow / use what you have / free venues; prices [0,0] ok
      budget: { items: GearItem[] },          // 2-5 items, realistic 2026 USD ranges
      stepup: { items: GearItem[] }           // 2-5 items
    },
    tryFirst: string[],                       // 2-3 try-before-you-buy tips (rent, library, free class, used)
    firstSessions: [{title, detail, tinyVersion}]   // exactly 3
  }
}
GearItem = { name, price: [lo, hi], reason }  // name is generic, NOT a brand/product name
                                              // ("Starter aluminum racket, 25 in" not a brand)
```
Budget tier total (sum of lo..hi) should agree with minBudget (0 → free tier truly free;
50 → budget total low end < 50; 150 → budget total low end < 150).

```
AchDef = { id, name, desc, category: "starter"|"consistency"|"comeback"|"skill"|"social" }
```
Achievement ids, in order (write good short names/descs; desc says how to earn it):
`first_hobby` (track first hobby), `first_session` (log first session),
`starter_pack` (start a hobby from a starter pack), `tiny_five` (log 5 tiny wins),
`three_hobbies` (track 3 hobbies), `goal_week_1` (hit a weekly goal),
`goal_week_4` (weekly streak of 4), `comeback` (log a session after 14+ days away),
`milestone_1` (tick first skill milestone), `milestone_5` (tick 5 skill milestones total),
`event_1` (check in at first event), `event_5` (check in at 5 events), `level_5` (reach player level 5).

```
Group = { hobbyId, name, members: number, posts: Post[] }      // name like "Tennis · Newark area"
Post  = { author, text, daysAgo, sessionLabel }                 // 3-4 posts each; sessionLabel like "Regular session · 40 min"
EventDef = { id, hobbyId, title, dayOffset, time, place, level, spots, going, host }
   // dayOffset: 0 = today (include at least 4 events with 0), up to 13
   // time "9:00 AM"; place = a plausible PUBLIC venue type in the Newark NJ area
   //   (e.g. "Branch Brook Park courts", "Newark Public Library, Main Branch") — public places only
   // level: "Beginner friendly"|"All levels"|"Experienced"; spots > going
   // host: first name + last initial ("Maya R.")
QuizQuestion = { id, prompt, options: [{value, label, hint}] }
```
Quiz (ids and values exact):
1. `vibe` — "What sounds most fun?" values `creative`,`active`,`technical`,`social`,`relaxing`
2. `place` — "Where do you want to spend it?" `indoor`,`outdoor`,`either`
3. `social` — "Solo or with people?" `solo`,`group`,`either`
4. `budget` — "Starting budget?" values numbers `0`,`50`,`150`,`999` (labels Free / Under $50 / Under $150 / Flexible)
5. `time` — "Time per week?" `low`,`mid`,`high` (Under 1 hr / 1–3 hrs / 3+ hrs)

-------------------------------------------------------------------------------
## 2. ENGINE — `globalThis.SQ`

Pure logic over `SQ_DATA` + persisted state. No DOM. Persists to `localStorage` key
`sidequest.v1` if available (every access in try/catch; works with no storage).

### State (SQ.state, plain JSON)
```
{
  version: 1,
  onboarded: boolean,
  user: { name: "You", xp: number, nudgeTime: "21:00", quiz: null | QuizAnswers },
  custom: [{ id: "custom-<slug>", name, category }],   // user-typed hobbies
  tracked: [{ hobbyId, goal: 1..7, xp, addedAt: "YYYY-MM-DD", viaStarter: bool, milestones: string[] }],
  sessions: [{ id, hobbyId, date: "YYYY-MM-DD", ts: number, size: "tiny"|"regular"|"big",
               minutes: number|null, note: string, xp: number }],
  achievements: { [achId]: "YYYY-MM-DD" },   // includes dynamic "skill:<hobbyId>:<milestoneId>"
  rsvps: string[], checkins: string[]
}
```

### XP rules
tiny 10 · regular 25 · big 50 · comeback bonus +20 · weekly goal hit +50 · milestone 40 · event check-in 60.
Every XP gain adds to `user.xp` AND (when tied to a tracked hobby) to that tracked hobby's `xp`.
Level curve (same for player and hobby): start at level 1 with 0 XP; going from level n to
n+1 costs `100 * n` XP. (L2 at 100, L3 at 300, L4 at 600, L5 at 1000 ...)
Mascot stage by PLAYER level: 1-2 Seed(0), 3-4 Sprout(1), 5-7 Sapling(2), 8-11 Bloom(3), 12+ Tree(4).
Accessories: one per category in which the user has logged ≥3 sessions (category of the hobby).

### Weeks, goals, comeback
- Weeks start Monday (local). `sessionsThisWeek` = sessions for that hobby dated within the current Mon–Sun week.
- Goal hit bonus: awarded on the session that makes `sessionsThisWeek === goal` (exactly once per week per hobby).
- Weekly streak: count consecutive weeks, walking back from the current week, where sessions ≥ goal
  (current goal). The current week counts only if already met; if not met it is skipped (not a break).
  One missed week per calendar month is forgiven (bridges the streak, adds 0). Stop at the first
  unforgiven miss or at the week before the hobby was added.
- `daysSince`: days since last session for that hobby; if none, null.
- `inComeback`: (daysSince ≥ 7) OR (no sessions AND added ≥ 7 days ago).
- Comeback bonus +20 when the logged session happens while `inComeback` was true.
- `comeback` achievement: session logged when there was a previous session ≥ 14 days earlier.
- Tiny-win ladder index = number of sessions since the most recent gap of ≥ 7 days between
  consecutive sessions (or since the first session), capped at 4; if inComeback or no sessions → 0.
  `nextTinyWin = hobby.tinyWins[index]`. Custom hobbies get a generic 5-step ladder
  (2, 5, 10, 20, 30 minutes: "Do 2 minutes of <name>", ...) and 5 generic milestones.

### API (all must exist exactly)
```
SQ.init()                       // load from storage or create fresh default state; returns state
SQ.state                        // getter, current state object
SQ.save()                       // persist (called automatically by every mutator)
SQ.reset()                      // fresh default state (onboarded:false), saved
SQ.seedDemo()                   // replaces state with a realistic demo (see below), onboarded:true
SQ.today()                      // "YYYY-MM-DD" local; respects SQ._now (Date or null) for tests
SQ._now                         // null by default; tests may set a Date
SQ.getHobby(id)                 // catalog or custom hobby object (custom ones get generated tinyWins/milestones/no starterPack)
SQ.catalog()                    // all 12 catalog hobbies
SQ.addCustomHobby(name, category) // returns new custom hobby id; does NOT track it
SQ.isTracked(id) -> bool
SQ.addHobby(id, {goal=2, viaStarter=false}={}) -> Reward   // tracks it; may unlock first_hobby/three_hobbies/starter_pack
SQ.removeHobby(id)              // untrack; keeps sessions
SQ.setGoal(id, n)               // clamp 1..7
SQ.logSession(id, {size, minutes=null, note=""}) -> Reward
SQ.tickMilestone(id, milestoneId) -> Reward | null   // null if already ticked; +40 xp; unlocks dynamic skill achievement
SQ.events() -> [EventDef & {date:"YYYY-MM-DD", rsvp:bool, checkedIn:bool, canCheckIn:bool}] sorted by date then time
SQ.toggleRsvp(eventId) -> bool (new rsvp state)
SQ.checkIn(eventId) -> Reward | null   // requires rsvp and event date <= today and not already checked in
SQ.communityUnlocked() -> bool  // tracked.length >= 1
SQ.hobbyStats(id) -> {
  level, xp, xpIntoLevel, xpForNext, sessionsThisWeek, goal, weeklyStreak,
  totalSessions, totalMinutes, bestWeek, daysSince, inComeback, ladderIndex, nextTinyWin,
  heat: [{date, count}]   // exactly 84 entries, oldest first, ending today
  recent: Session[]       // newest first, max 20
}
SQ.player() -> { level, xp, xpIntoLevel, xpForNext, stage, stageName, accessories: string[], totalSessions, weekSessions, trackedCount }
SQ.levelFor(xp) -> { level, into, next }   // into = xp past current level start, next = cost of this level
SQ.match(answers) -> [{ hobby, score, reasons: string[] }]   // top 3, deterministic
   // score: vibe in hobby.vibes +3 (primary category +1 more); place match or "either" on either side +2;
   //   social match or either +2; budget: hobby.minBudget <= answers.budget +2 else -3;
   //   time equal +1; related to a tracked hobby +1.5; already tracked → excluded.
   //   reasons: up to 3 short human strings ("Creative", "Indoors", "Under $50 to start", "Pairs with Drawing")
   //   ties broken by catalog order.
SQ.achievementsList() -> [{ id, name, desc, category, unlocked: "YYYY-MM-DD"|null }]  // static defs then dynamic skill ones
SQ.weekKey(dateStr) -> "YYYY-MM-DD" of that week's Monday
SQ.daysBetween(a, b) -> integer days b - a
```
Reward:
```
{ xpGained, breakdown: [{label, xp}], hobbyId|null,
  hobbyLevelBefore, hobbyLevelAfter, playerLevelBefore, playerLevelAfter,
  stageBefore, stageAfter, newAchievements: AchDef-like[] (with name/desc/category),
  goalHit: bool, wasComeback: bool }
```
`addHobby` returns a Reward with xpGained 0 (it may still carry newAchievements).

### seedDemo()
Build the demo by replaying real API calls with `SQ._now` set to past dates (then reset `_now` to null):
user tracks `drawing` (goal 3), `running` (goal 2), `guitar` (goal 2, added 20 days ago via starter pack).
~5 weeks of plausible history: running regular & consistent, last run yesterday, 1 run this week
(if today is Monday, put that one today); drawing used to be frequent but last session 9 days ago
(so it's in comeback); guitar: 3 tiny wins + 1 regular, last 2 days ago. 2 milestones ticked on running,
1 on drawing. RSVP to 2 events, one of them today (not yet checked in). Player should land around level 4-5.

### Tests
Write `/home/claude/sidequest/tests/engine.test.js` (node, no deps; load data.js then engine.js
via `vm` or `require` after defining globalThis) covering: level curve, XP per size, goal-hit once,
comeback bonus + ladder reset, weekly streak incl. forgiven week, match() determinism and exclusion,
milestone idempotence, check-in rules, seedDemo invariants (drawing inComeback, level 4-5), storage-less operation.
Until DATA is ready, use a minimal stub in tests; at the end run against the real `src/data.js` if it exists.
Run with `node tests/engine.test.js` — must exit 0.

-------------------------------------------------------------------------------
## 3. UI KIT — provided by SHELL as `window.SQUI`

```
SQUI.screens = {}                     // registry; other files add entries
SQUI.register(name, { tab, title, render(params) -> htmlString, mount(rootEl, params) })
   // tab: "today"|"discover"|"community"|"me"|null (null = full-screen flow, nav hidden)
SQUI.go(name, params={}, {replace=false}={})   // render screen into #app-main, scroll top, push history
SQUI.back()                           // history back, fallback "today"
SQUI.refresh()                        // re-render current screen with same params
SQUI.start()                          // SQ.init(); go("welcome") if !SQ.state.onboarded else go("today")
SQUI.showReward(reward, {title}?)     // full-screen celebration overlay; returns Promise resolved on close
SQUI.toast(text)                      // small transient message
SQUI.esc(str)                         // HTML-escape
SQUI.icon(name, size=20)              // inline SVG string. names: categories ("creative","active","technical",
                                      //  "social","relaxing"), "plus","check","chevron-right","chevron-left","flame",
                                      //  "spark","calendar","pin","users","lock","star","clock","close","search","leaf"
SQUI.hobbyIcon(hobbyId, size=24)      // per-hobby SVG glyph (12 catalog hobbies; custom → its category icon)
SQUI.mascot(stage 0..4, {mood:"happy"|"sleepy"|"cheer", size:120, accessories:[]}) // inline SVG string
SQUI.money([lo,hi]) -> "$25–60" / "Free"
```
Event binding convention: screens render HTML strings; `mount(root)` wires listeners with
`root.querySelector(...)` / event delegation using `data-action` attributes. No inline `onclick`.

Screens owned by SHELL: `today` (tab today), `hobby` ({id}) (tab today), `log` ({id, size?}) sheet-style
screen (tab null), `me` (tab me), `achievements` (tab me).
Screens owned by DISCOVER: `welcome` (null), `pick` (null during onboarding / tab discover after),
`quiz` (null), `results` (null), `pack` ({id}) (tab discover), `discover` (tab discover — browse:
"Find something new" hub with Retake quiz, your last matches, Browse all 12).
Screens owned by COMMUNITY: `community` (tab community), `group` ({hobbyId}) (tab community),
`event` ({id}) (tab community).

Bottom nav (SHELL): Today · Discover · Community · Me, hidden when screen tab is null. Community
shows a lock glyph when locked.

Onboarding contract (DISCOVER): `welcome` shows the fork: "I already have hobbies" → `pick`,
"Find a new hobby" → `quiz`, plus a quiet link "Explore with sample data" → `SQ.seedDemo(); SQUI.go("today")`.
Finishing `pick` (≥1 hobby added) or pressing Start on a pack during onboarding sets
`SQ.state.onboarded = true; SQ.save()` and goes to `today`. Starting from a pack calls
`SQ.addHobby(id, {goal:2, viaStarter:true})` then `SQUI.showReward(r)` if it has newAchievements.

### Shared CSS classes (SHELL defines in shell.css; others use, never redefine)
Layout: `.screen` (padded page column, max-width 560px centered), `.stack` (flex column gap 12px),
`.stack-lg` (gap 24px), `.row` (flex row, align center, gap 8px, wrap), `.spacer` (flex:1),
`.screen-head` (title row with optional back button), `.back-btn`.
Type: `.h1`, `.h2`, `.h3`, `.eyebrow` (small caps label), `.muted`, `.small`, `.num` (mono, tabular).
Components: `.btn` (secondary), `.btn.primary`, `.btn.ghost`, `.btn.block` (full width), `.btn.sm`,
`.card` (surface + border + radius), `.card.tap` (hover/active affordance, cursor pointer),
`.chip` (pill), `.chip.on` (selected), `.pill-good`, `.pill-warn` (status pills),
`.progress` > `.progress-bar` (style="width:NN%"), `.list` (divided rows) > `.list-row`,
`.seg` (segmented control container) > `button` with `.on`, `.empty` (designed empty state block),
`.sheet` (bottom-sheet style panel), `.icon-btn`.

### Design tokens (SHELL writes these into shell.css; everyone uses ONLY these vars)
Direction: "trail map meets field notebook" — calm, daylight, outdoorsy; the reward moments
are the only loud thing. Mobile-first, max content width 560px.
```
:root {
  /* Layout: single centered column, bottom tab bar, cards only for tappable objects */
  --bg: #F3F5EF;  --surface: #FFFFFF; --surface-2: #E9EDE3; --line: #D5DCCB;
  --ink: #1D2A22; --ink-2: #56645A;
  --leaf: #2F7D4F;     /* growth, primary actions */
  --leaf-ink: #FFFFFF;
  --sun: #F2B33D;      /* XP, rewards only */
  --sun-ink: #2A1E00;
  --sky: #3E6FB0;      /* links, info, community */
  --good: #2F7D4F; --warn: #B7651B; --bad: #B23A3A;
  --radius: 14px; --radius-sm: 10px;
  --font-display: "Bricolage Grotesque", "Avenir Next", system-ui, sans-serif;
  --font-body: "Figtree", system-ui, -apple-system, "Segoe UI", sans-serif;
  --font-mono: "JetBrains Mono", ui-monospace, Menlo, monospace;
}
dark (both blocks, same values):
  --bg: #121814; --surface: #1A221D; --surface-2: #222C25; --line: #2E3A32;
  --ink: #E6EDE7; --ink-2: #9FB0A4; --leaf: #5DBB84; --leaf-ink: #0D1A12;
  --sun: #F5C25A; --sun-ink: #2A1E00; --sky: #7FA7DE; --good: #5DBB84; --warn: #E09A55; --bad: #E07575;
```
Fonts link (SHELL puts in index.html head area):
`https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,800&family=Figtree:wght@400;500;600;700&family=JetBrains+Mono:wght@500;700&display=swap`

Theme rule: bare `:root` light values; `@media (prefers-color-scheme: dark){ :root:not([data-theme="light"]){...; color-scheme:dark} }`;
`:root[data-theme="dark"]{...; color-scheme:dark}`. Never use literal colors in component rules.
Accessibility: visible `:focus-visible`, buttons are `<button>`, `prefers-reduced-motion` respected,
tap targets ≥ 44px, works at 360px width with no horizontal scroll.
