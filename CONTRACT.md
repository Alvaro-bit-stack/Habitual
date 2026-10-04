# Habitual — Team Contract

Habitual is a mobile-first web app that gets people off their
phones and into hobbies. Two ways in: "I already have hobbies" (add them to a tracker) and
"Find a new hobby" (5-question quiz → 3 matches → starter pack with gear + cost → start).
Tracked hobbies get weekly goals, tiny wins, comeback mode, XP, levels, achievements, a 3D
character and progress page (Me), a skill evaluator and a community tab.

**This file is the source of truth for how the parts talk to each other**: data shapes, the `SQ`
engine API, the `SQUI` UI kit, shared CSS classes and design tokens. If you need to change
something another part depends on, change it here first and get a quick OK from the team
(in the PR or the group chat). Changes that stay inside your own files don't need to be listed.

## 0. Who owns what

| Area | Files | Owner |
| --- | --- | --- |
| Core & data | `src/engine.js`, `src/data.js`, `tests/` | shared, see each section |
| Characters & Me page (incl. tracker screens) | `src/shell.*`, `src/showcase.*`, `assets/models/`, `tools/rig.py` | Neo |
| Community | `src/community.*` | _(fill in)_ |
| Skill evaluator | `src/evaluate.*` (new) + its engine/data additions | _(fill in)_ |
| Discovery (onboarding, quiz, starter packs) | `src/discover.*` | _(fill in)_ |

Edit only your own files. If you need something from another part that isn't in this contract,
code defensively (check it exists before calling it) and raise it with the owner.

## 1. Ground rules

- **Plain browser JavaScript (ES2020).** No framework, no modules, no imports. Each JS file is
  wrapped in an IIFE `(function(){ ... })();` and exposes only the globals named here.
- **`data.js` and `engine.js` never touch the DOM** (use `globalThis`), so the tests can load them
  in Node. Other files guard any `window`/`document` use.
- **Build:** `build.py` inlines `src/` into one page, in this order:
  `data.js` → `engine.js` → `shell.css`/`shell.js` → `discover.*` → `community.*` → `showcase.*` →
  `boot.js` (which just calls `SQUI.start()`). Add new files to the `CSS`/`JS` lists in `build.py`.
- **Always online.** The app is headed toward a real mobile app with network access, so loading a
  library from a CDN (cdn.jsdelivr.net, cdnjs) is fine when it earns its place. Load it only on
  the screen that needs it, and show a friendly message if it fails. Don't bundle libraries.
- **No emoji** anywhere in UI or data. Icons are inline SVG (`SQUI.icon`, `SQUI.hobbyIcon`).
- **No `alert/confirm/prompt`.** Use in-page UI (see the reset confirm on the Me screen).
- **Dates:** today is the local date. All dates in data are relative (day offsets) so the demo
  never goes stale.
- **Saved state is rebuilt on load.** `normalize()` in `engine.js` keeps only known top-level
  fields (extra fields on `state.user` survive). **A new top-level state field must be added to
  `fresh()` and `normalize()`**, or it will silently disappear on the next page load.

## 2. Data — `globalThis.SQ_DATA` (`src/data.js`)

```
SQ_DATA = {
  hobbies: Hobby[],          // exactly 12
  achievements: AchDef[],    // exactly the ids listed below, in this order
  groups: Group[],           // one per hobby (12)
  events: EventDef[],        // 16-20 events across hobbies
  quiz: QuizQuestion[]       // exactly the 5 questions below
}
```

Hobby ids (exactly these): `drawing`, `running`, `tennis`, `guitar`, `photography`,
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
      budget: { items: GearItem[] },          // 2-5 items, realistic USD ranges
      stepup: { items: GearItem[] }           // 2-5 items
    },
    tryFirst: string[],                       // 2-3 try-before-you-buy tips (rent, library, free class, used)
    firstSessions: [{title, detail, tinyVersion}]   // exactly 3
  }
}
GearItem = { name, price: [lo, hi], reason }  // name is generic, NOT a brand/product name
```
Budget tier total should agree with `minBudget` (0 → free tier truly free; 50 → budget total low
end < 50; 150 → budget total low end < 150).

```
AchDef = { id, name, desc, category: "starter"|"consistency"|"comeback"|"skill"|"social" }
```
Achievement ids, in order: `first_hobby` (track first hobby), `first_session` (log first session),
`starter_pack` (start a hobby from a starter pack), `tiny_five` (log 5 tiny wins),
`three_hobbies` (track 3 hobbies), `goal_week_1` (hit a weekly goal),
`goal_week_4` (weekly streak of 4), `comeback` (log a session after 14+ days away),
`milestone_1` (tick first skill milestone), `milestone_5` (tick 5 skill milestones total),
`event_1` (check in at first event), `event_5` (check in at 5 events), `level_5` (reach player level 5).

```
Group = { hobbyId, name, members: number, posts: Post[] }      // name like "Tennis · Newark area"
Post  = { author, text, daysAgo, sessionLabel }                 // 3-4 posts each; sessionLabel like "Regular session · 40 min"
EventDef = { id, hobbyId, title, dayOffset, time, place, level, spots, going, host }
   // dayOffset: 0 = today (at least 4 events with 0), up to 13
   // time "9:00 AM"; place = a plausible PUBLIC venue type in the Newark NJ area
   // level: "Beginner friendly"|"All levels"|"Experienced"; spots > going
   // host: first name + last initial ("Maya R.")
QuizQuestion = { id, prompt, options: [{value, label, hint}] }
```
Quiz (ids and values exact):
1. `vibe` — "What sounds most fun?" values `creative`,`active`,`technical`,`social`,`relaxing`
2. `place` — "Where do you want to spend it?" `indoor`,`outdoor`,`either`
3. `social` — "Solo or with people?" `solo`,`group`,`either`
4. `budget` — "Starting budget?" values numbers `0`,`50`,`150`,`999` (Free / Under $50 / Under $150 / Flexible)
5. `time` — "Time per week?" `low`,`mid`,`high` (Under 1 hr / 1–3 hrs / 3+ hrs)

## 3. Engine — `globalThis.SQ` (`src/engine.js`)

Pure logic over `SQ_DATA` + saved state. No DOM. Saves to `localStorage` key `sidequest.v1` when
available (every access in try/catch; works with no storage).

### State (`SQ.state`, plain JSON)
```
{
  version: 1,
  onboarded: boolean,
  user: { name: "You", xp: number, nudgeTime: "21:00", quiz: null | QuizAnswers,
          character?: "neo"|"adrian"|"alvaro" },          // character: see section 6
  custom: [{ id: "custom-<slug>", name, category }],      // user-typed hobbies
  tracked: [{ hobbyId, goal: 1..7, xp, addedAt: "YYYY-MM-DD", viaStarter: bool, milestones: string[] }],
  sessions: [{ id, hobbyId, date: "YYYY-MM-DD", ts: number, size: "tiny"|"regular"|"big",
               minutes: number|null, note: string, xp: number }],
  achievements: { [achId]: "YYYY-MM-DD" },   // includes dynamic "skill:<hobbyId>:<milestoneId>"
  rsvps: string[], checkins: string[]
  // skills: see section 5 (proposed)
}
```

### XP and levels
tiny 10 · regular 25 · big 50 · comeback bonus +20 · weekly goal hit +50 · milestone 40 · event check-in 60.
Every XP gain adds to `user.xp` AND (when tied to a tracked hobby) to that hobby's `xp`.
Level curve (player and hobby): level 1 at 0 XP; going from level n to n+1 costs `100 * n` XP
(L2 at 100, L3 at 300, L4 at 600, L5 at 1000 ...).
Mascot stage by player level: 1-2 Seed(0), 3-4 Sprout(1), 5-7 Sapling(2), 8-11 Bloom(3), 12+ Tree(4).
Accessories: one per category in which the user has logged ≥3 sessions.

### Weeks, goals, comeback
- Weeks start Monday (local). `sessionsThisWeek` = sessions for that hobby in the current Mon–Sun week.
- Goal-hit bonus: on the session that makes `sessionsThisWeek === goal` (once per week per hobby).
- Weekly streak: consecutive weeks, walking back from the current week, where sessions ≥ goal.
  The current week counts only if already met (otherwise skipped, not a break). One missed week per
  calendar month is forgiven (bridges the streak, adds 0). Stops at the first unforgiven miss or at
  the week before the hobby was added.
- `daysSince`: days since the last session for that hobby, or null.
- `inComeback`: (daysSince ≥ 7) OR (no sessions AND added ≥ 7 days ago). A session logged while
  in comeback earns +20.
- `comeback` achievement: a session logged when the previous one was ≥ 14 days earlier.
- Tiny-win ladder index = sessions since the most recent gap of ≥ 7 days (or since the first
  session), capped at 4; 0 when in comeback or no sessions. `nextTinyWin = hobby.tinyWins[index]`.
  Custom hobbies get a generic 5-step ladder (2, 5, 10, 20, 30 minutes) and 5 generic milestones.

### API
```
SQ.init()                       // load from storage or create fresh state; returns state
SQ.state                        // getter, current state object
SQ.save()                       // persist (every mutator calls it)
SQ.reset()                      // fresh state (onboarded:false), saved
SQ.seedDemo()                   // replaces state with the realistic demo, onboarded:true
SQ.today()                      // "YYYY-MM-DD" local; respects SQ._now
SQ._now                         // null by default; tests may set a Date
SQ.getHobby(id)                 // catalog or custom hobby (custom ones get generated tinyWins/milestones, no starterPack)
SQ.catalog()                    // all 12 catalog hobbies
SQ.addCustomHobby(name, category) // returns new custom id; does NOT track it
SQ.isTracked(id) -> bool
SQ.addHobby(id, {goal=2, viaStarter=false}={}) -> Reward   // xpGained 0; may unlock first_hobby/three_hobbies/starter_pack
SQ.removeHobby(id)              // untrack; keeps sessions
SQ.setGoal(id, n)               // clamp 1..7
SQ.logSession(id, {size, minutes=null, note=""}) -> Reward
SQ.tickMilestone(id, milestoneId) -> Reward | null   // null if already ticked; +40 xp
SQ.events() -> [EventDef & {date, rsvp, checkedIn, canCheckIn}]   // sorted by date then time
SQ.toggleRsvp(eventId) -> bool
SQ.checkIn(eventId) -> Reward | null   // needs rsvp, event date <= today, not already checked in
SQ.communityUnlocked() -> bool  // tracked.length >= 1
SQ.hobbyStats(id) -> {
  level, xp, xpIntoLevel, xpForNext, sessionsThisWeek, goal, weeklyStreak,
  totalSessions, totalMinutes, bestWeek, daysSince, inComeback, ladderIndex, nextTinyWin,
  heat: [{date, count}],  // exactly 84 entries, oldest first, ending today
  recent: Session[]       // newest first, max 20
}
SQ.player() -> { level, xp, xpIntoLevel, xpForNext, stage, stageName, accessories, totalSessions, weekSessions, trackedCount }
SQ.levelFor(xp) -> { level, into, next }
SQ.match(answers) -> [{ hobby, score, reasons }]   // top 3, deterministic, already-tracked excluded
SQ.achievementsList() -> [{ id, name, desc, category, unlocked: "YYYY-MM-DD"|null }]
SQ.weekKey(dateStr) -> Monday of that week
SQ.daysBetween(a, b) -> integer days b - a
```
`match` scoring: vibe in hobby.vibes +3 (primary category +1 more); place match or "either" +2;
social match or "either" +2; budget: minBudget <= answers.budget +2 else -3; time equal +1;
related to a tracked hobby +1.5. Ties broken by catalog order. Up to 3 short reasons.

Reward:
```
{ xpGained, breakdown: [{label, xp}], hobbyId|null,
  hobbyLevelBefore, hobbyLevelAfter, playerLevelBefore, playerLevelAfter,
  stageBefore, stageAfter, newAchievements: [{id, name, desc, category}],
  goalHit: bool, wasComeback: bool }
```

### Demo data and tests
`seedDemo()` replays real API calls on past dates: tracks drawing (goal 3, in comeback),
running (goal 2, consistent, last run yesterday) and guitar (goal 2, via starter pack); 2 running
milestones and 1 drawing milestone ticked; 2 RSVPs, one today. Player lands around level 4-5.
Keep these invariants if you change it; `tests/engine.test.js` checks them.

Tests (CI runs all three on every push and PR):
`node tests/data.check.js` · `node tests/engine.test.js` · `python3 tests/e2e.py` (Playwright).
Engine changes come with a test in `tests/engine.test.js`.

## 4. UI kit — `window.SQUI` (`src/shell.js`)

```
SQUI.screens = {}                     // registry
SQUI.register(name, { tab, title, render(params) -> htmlString, mount(rootEl, params) })
   // tab: "today"|"discover"|"community"|"me"|null (null = full-screen flow, nav hidden)
SQUI.go(name, params={}, {replace=false, reset=false}={})
SQUI.back()                           // history back, fallback "today"
SQUI.refresh()                        // re-render current screen with same params
SQUI.current() -> {name, params}|null
SQUI.start()                          // SQ.init(); welcome if not onboarded, else today
SQUI.showReward(reward, {title}?)     // full-screen celebration; Promise resolved on close
SQUI.toast(text)
SQUI.esc(str)                         // HTML-escape. Use it on every string that isn't a literal.
SQUI.icon(name, size=20)              // inline SVG: categories ("creative","active","technical","social",
                                      //  "relaxing"), "plus","check","chevron-right","chevron-left","flame",
                                      //  "spark","calendar","pin","users","lock","star","clock","close",
                                      //  "search","leaf","trophy","sun","compass","user"
SQUI.hobbyIcon(hobbyId, size=24)      // per-hobby glyph (custom → its category icon)
SQUI.mascot(stage 0..4, {mood, size, accessories})  // 2D Sprout SVG
SQUI.money([lo,hi]) -> "$25–60" / "Free"
SQUI.setTheme("system"|"light"|"dark")
SQUI.getTheme() -> "system"|"light"|"dark"
SQUI.celebrate(overlayEl, {levelUp}) -> bool   // defined by showcase.js; showReward calls it. The 3D character
                                      //  leaps up behind the reward card and cheers (level-up: bigger, spins,
                                      //  cheers twice). Returns false (2D Sprout stays) when the model isn't
                                      //  loaded yet or reduced motion is on.
```
**Event binding:** screens render HTML strings; `mount(root)` wires listeners with `data-action`
attributes and event delegation. Bind to `root.firstElementChild` (your screen's own node), not
`root`: `#app-main` stays the same element across screens, so listeners on it pile up.
No inline `onclick`.

**Screens and owners**
- Shell: `today`, `hobby` ({id}), `log` ({id, size?}, tab null), `achievements` (earned first, newest on top, then what's left).
- Discovery: `welcome`, `pick`, `quiz`, `results` (tab null), `pack` ({id}), `discover`.
- Community: `community`, `group` ({hobbyId}), `event` ({id}).
- Me page (`showcase.js`): `me`.
- Skill evaluator: `evaluate` ({id}), see section 5.

Bottom nav (shell): Today · Discover · Community · Me, hidden when a screen's tab is null.
Community shows a lock until the user tracks a hobby.

**Onboarding (discovery):** `welcome` offers "I already have hobbies" → `pick`, "Find a new hobby" →
`quiz`, and a quiet "Explore with sample data" → `SQ.seedDemo(); SQUI.go("today")`. Finishing
`pick` (≥1 hobby) or pressing Start on a pack sets `SQ.state.onboarded = true; SQ.save()` and goes
to `today`. Starting from a pack calls `SQ.addHobby(id, {goal:2, viaStarter:true})`, then
`SQUI.showReward(r)` if it has newAchievements.

### Shared CSS classes (defined in `shell.css`; use them, never redefine them)
Layout: `.screen` (padded column, max-width 560px), `.stack` (gap 12px), `.stack-lg` (gap 24px),
`.row`, `.spacer`, `.screen-head`, `.back-btn`.
Type: `.h1`, `.h2`, `.h3`, `.eyebrow`, `.muted`, `.small`, `.num` (mono, tabular).
Components: `.btn`, `.btn.primary`, `.btn.ghost`, `.btn.block`, `.btn.sm`, `.card`, `.card.tap`,
`.chip`, `.chip.on`, `.pill-good`, `.pill-warn`, `.progress` > `.progress-bar` (style="width:NN%"),
`.list` > `.list-row`, `.seg` > `button.on`, `.empty`, `.sheet`, `.icon-btn`, `.me-stats`.
Prefix your own classes with your area (`sc-`, `cm-`, `dc-`, `ev-`).

### Design tokens (use only these variables; no literal colors in component rules)
Direction: "trail map meets field notebook": calm, daylight, outdoorsy. Reward moments are the
only loud thing. Mobile-first, max content width 560px.
```
:root {
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
Theme rule: bare `:root` holds light values; `@media (prefers-color-scheme: dark){ :root:not([data-theme="light"]){...; color-scheme:dark} }`;
`:root[data-theme="dark"]{...; color-scheme:dark}`.
Fonts come from Google Fonts (Bricolage Grotesque, Figtree, JetBrains Mono); `build.py` adds the link.

**Accessibility:** visible `:focus-visible`; buttons are `<button>`; respect `prefers-reduced-motion`;
tap targets ≥ 44px; works at 360px wide with no horizontal scroll.

## 5. Skill evaluator — PROPOSAL, owner to confirm

> Draft so the other parts know what to expect. The skill evaluator owner should edit this
> section to match what they actually build, then tell the team.

**What it does:** a short check-in per hobby that places the user at a skill tier, so the app
can meet them where they are: harder tiny wins for experienced people, matching community events,
and a tier badge on the Me page.

**Data** (`SQ_DATA.skillChecks`, in `data.js`):
```
skillChecks: { [hobbyId]: SkillQuestion[] }     // 3-5 questions per catalog hobby
SkillQuestion = { id, prompt, options: [{ value, label, points: 0..3 }] }
   // e.g. guitar: "Can you switch between G, C and D without stopping?"
```

**State** (new top-level field; add it to `fresh()` and `normalize()`):
```
skills: { [hobbyId]: { tier: "new"|"beginner"|"intermediate"|"advanced",
                       score: 0..100, answers: { [questionId]: value }, evaluatedAt: "YYYY-MM-DD" } }
```

**Engine API:**
```
SQ.evaluateSkill(hobbyId, answers) -> { tier, score, reasons: string[], eventLevel }
   // saves to state.skills, then returns. eventLevel maps tier to EventDef.level:
   //   new/beginner → "Beginner friendly", intermediate → "All levels", advanced → "Experienced"
SQ.skill(hobbyId) -> state.skills[hobbyId] | null
```
Open questions for the owner: does a tier change the tiny-win ladder start or the milestones?
Does re-evaluating award XP or an achievement? Do custom hobbies get a generic check?

**Screen:** `evaluate` ({id}), tab null (full-screen flow), opened from the hobby screen
("Check my level"). Shows the result and a "Back to hobby" button.

**Who reads it:**
- Me page: tier badge on each hobby card (`SQ.skill(id)`, hidden when null).
- Community: highlight events whose `level` matches `eventLevel`.
- Hobby screen (shell): "Check my level" entry point and the current tier.

## 6. Me page — `src/showcase.js`, `src/showcase.css`

The `me` tab, top to bottom: the 3D character with name, level and XP bar to the next level;
a character picker; four stat tiles (sessions, time spent, best streak, and an Achievements tile
showing "11 of 16" that opens `achievements`); every tracked hobby with
level, XP bar, sessions and streak (tap to open it); a share button; and Settings (nudge time,
appearance, sample data, two-step reset). Character customization is paused until new models exist.

- **Characters:** `assets/models/<id>.glb`, ids `neo`, `adrian`, `alvaro`, built by
  `tools/mixamo_merge.py` from Neo's Mixamo downloads (Adrian and Alvaro get a fitted copy of Neo's
  Mixamo skeleton and its skin weights). Clips (all kept in place): `SadIdle` and `HappyIdle`, plus
  moves `JoyfulJump`, `SillyDance`, `Breakdance`, `GoalkeeperDive`, `StandardWalk`, `DrunkWalk`.
  **Mood:** the resting pose is `SadIdle` until a session is logged today, then `HappyIdle` (checked
  every time the character returns to rest). The script keys a plain `idle` only if no idle is supplied.
  Me: greets with JoyfulJump, each tap plays the next move and names it. Celebrations: JoyfulJump,
  level-ups SillyDance. Older models from `tools/rig.py` (idle/wave/cheer) still work as fallbacks.
  `build.py` writes each as `dist/models/<id>.js` (base64 on `window.SQ_MODELS[id]`) so it also loads
  when `dist/preview.html` is opened from disk.
- **Selected character:** `SQ.state.user.character` (survives `normalize` because it is on
  `user`). Everyone can pick any character for now; later it is set from the signed-in user.
- **Celebrations:** every reward (`SQUI.showReward`, which all XP gains go through) brings the
  character in via `SQUI.celebrate`. The model is preloaded 2 s after startup so the first one is instant.
- **three.js r147** loads from jsDelivr (on the Me tab or by the preload) (see "Always online" in section 1).

## 7. Working together

- `main` is protected: one short-lived branch per task, small PRs, one approval, tests passing.
- Reviews come from someone outside the area (see `.github/CODEOWNERS`).
- Interface change → edit this file in the same PR and say so in the PR description.

## 8. Community — `src/community.js`, `src/community.css`, `src/gathering.css`

Community now uses a venue-photo event feed with original inline SVG character profiles.
The old numbered trail layout is retired. The app uses a blue mobile theme in both light and dark modes. Community stays
a single readable column, including on larger screens. Artwork palette values are
local to the SVG illustrations. All content stays self-contained, without remote images.

Header: "Community" centered with the location under it (no avatar button).
Tabs, in order: Going (default) / For you / All events / Your groups. Below them two dropdowns:
When (Any day / Today / Tomorrow / This weekend; hidden on Your groups) and Hobby, a
type-to-search combobox (`#cm-hobby`, listbox `#cm-hobby-list`; arrows, Enter, Escape, tap; a clear
button when set). On Going / For you / Your groups it lists only your tracked hobbies; on All events
(for discovering new hobbies) your hobbies first, then every other hobby with events. Switching to a
tab that doesn't offer the picked hobby clears it. Hobby also narrows Your groups. Reset clears both.
All three filters share one look: a pill that opens the same list panel (`.cm-combo-list`), with an
icon per option and a check on the current pick. When (`#cm-when`) and Level are buttons
(`.cm-menu-btn`, `aria-haspopup="listbox"`; arrows, Enter/Space, Escape, tap); Hobby adds typing.
Level (`#cm-level`: Any level / Beginner / Experienced) shows on For you and All events only;
"All levels" events count for both choices. The All events search box searches by location
(the event's `place`) only.

Sharing: every event card has a share button on its photo, and the event screen a "Share this
event" button. The sheet offers Text a friend (`sms:` link with the invite; uses the system share
sheet where `navigator.share` exists), Copy invite, and Send in Habitual to sample members (hosts
from the Newark groups). Sends are kept in `SQ.state.user.shares` as `{eventId, to, at}` (on `user`
so `normalize()` keeps them) and the event screen shows "Shared with …". Delivery to other people
needs accounts; until then it's recorded on this device only.

Each event shows who's going as a stack of character heads, host in front: 1 head for 1 person,
2 for 2-3, 3 for 4-7, 4 for 8-14, 5 for 15+ (your character joins the stack once you RSVP). This weekend means the upcoming Saturday-Sunday, or the remaining
current weekend. Group listings are independent of date filters. Search is rendered only in All events
and filters that category immediately, without replacing the search field. Its query
is retained when changing categories but never filters For you, Your groups or Going.

Additional registered screen: `member` ({id: eventId}), tab `community`, title `Member`.
It shows the event host's deterministic sample character, their event and hobby group.
No new engine API or stored state is introduced. Existing `sidequest.v1` and
`sidequest.theme` storage keys remain compatible.


### Venue photo assets

`build.py` injects `globalThis.SQ_VENUES` from `src/assets/venues/manifest.json` before the app scripts, adding a JPEG data URL to each entry. Community matches normalized exact event locations in each entry's `places` array. This curated demo catalog does not perform live venue searches. Unknown locations and failed images receive a location-based fallback. Character avatars and group artwork stay inline SVG. Event cards and event details include expandable photo descriptions and source/license attribution. Assets retain their individual licenses; see `src/assets/venues/ATTRIBUTION.md`.


### Mobile design (Ocean)

The app uses the Ocean design: `src/mobile.css` is the shared mobile shell and `src/ocean.css` layers on DM Sans, inset cards and the floating navigation. Both have light/dark tokens, safe-area insets, reduced-motion handling and one-column community layouts. Community starts with a page title, not an app wordmark. Its category tabs precede search and date filters.

`build.py` emits one page, `dist/Habitual.html`, plus `dist/models/` for the Me tab's 3D characters. Keep `dist/models/` beside the page when copying it.

### Avatar gathering

Event cards place the people going as pre-rendered sprites of the three characters
(`src/assets/avatars/<id>-idle.png` and an 8-frame `<id>-run.png`, rendered from the GLBs by
`tools/render-community-avatars.py`; `build.py` embeds them once as CSS variables). When the user
RSVPs, their selected character (`SQ.state.user.character`) joins the cast with a "You" label.

**Arrival (plays once per RSVP, never on a plain refresh):** the "You" slot renders hidden
(`cm-arriving`). `land()` in community.js drops the character from 150px above the card into the
slot (gravity ease, ~0.56 s), squashes on landing, nudges the card, bursts sparks and pops the label.
If the 3D model is loaded, `SQUI.dropIn(slot, opts)` (showcase.js) does the fall with the real
character, which then plays `JoyfulJump` and fades into the sprite. Otherwise the 2D sprite falls.
Reduced motion: the character simply appears. Falling characters and sparks live in a fixed
`.cm-drop-layer` under the nav (z-index 19) and clean themselves up. Test: `tests/arrival.e2e.py`.
