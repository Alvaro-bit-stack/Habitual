# Habitual

A mobile-first app that helps people trade scrolling for hobbies. It gets you started on a new hobby in minutes and makes coming back to an old one feel rewarding, even for a two-minute effort.

> The app is named **Habitual**. Legacy `sidequest` storage keys and artifact filenames are retained for compatibility.

## What the MVP does

- **Two ways in:** "I already have hobbies" (add them to the tracker) or "Find a new hobby" (5-question quiz → 3 matches → starter pack).
- **Starter packs** for 12 hobbies: gear in Free / Budget / Step-up tiers with totals, try-before-you-buy tips, and a plan for the first 3 sessions.
- **Tracker:** weekly goals, one-tap tiny wins on a 5-rung ladder, comeback mode after 7+ days away, a 12-week activity map, skill milestones and a session log.
- **Rewards:** XP, hobby and player levels, the Sprout mascot (5 growth stages, accessories), achievements and a celebration screen.
- **Community (sample data):** a venue-photo event feed with character profiles, live search, date filters, your groups, RSVPs and check-in for XP. Character profiles use inline SVG. Licensed venue photos are bundled in the standalone page; no remote image requests.

Everything runs in the browser and saves to the device (localStorage). There are no accounts, servers or real other users yet.

## Run it

Requirements: Python 3 and Node 18+.

```bash
python3 build.py          # inlines src/ into dist/
open dist/Habitual.html   # or double-click it; on Linux use xdg-open
```

On the welcome screen, tap **Explore with sample data** to see the app filled in.

`build.py` writes one page, `dist/Habitual.html`, in the Ocean design. Keep the `dist/models` folder next to it; the Showcase tab loads its 3D characters from there.

## Tests

```bash
node tests/data.check.js       # content: every hobby, pack, event and quiz entry matches the contract
node tests/engine.test.js      # game logic: XP, levels, streaks, comeback, matching, storage
node tests/community.test.js   # dates, search, RSVPs, groups and character profiles
pip install playwright && python3 -m playwright install chromium
python3 tests/e2e.py           # browser walkthrough of every flow, phone + desktop, light + dark
python3 tests/arrival.e2e.py   # Community: character drops in from above the card, lands with sparks
python3 tests/filters.e2e.py   # Community: hobby search, level, location search, sharing
```

All checks run automatically on every push and pull request (see `.github/workflows/tests.yml`). Screenshots from the browser tests land in `scratch/qa/` (git-ignored).

## How the code is organized

The app is plain HTML, CSS and JavaScript with no framework and no build tools beyond `build.py`, which concatenates the files in this order:

| File | What it is | Owner |
| --- | --- | --- |
| `src/data.js` | Hobby catalog, starter packs, achievements, quiz, sample groups and events (`SQ_DATA`) | Core & data |
| `src/engine.js` | State, saving, XP, levels, weekly goals, streaks, comeback, matching (`SQ`). No UI. | Core & data |
| `src/shell.js`, `src/shell.css` | App shell, navigation, design tokens, shared components, Today, hobby, log, Me, achievements, reward overlay, mascot (`SQUI`) | Tracker & rewards |
| `src/discover.js`, `src/discover.css` | Welcome, add-hobbies picker, quiz, results, starter packs, Discover tab | Discovery & community |
| `src/community.js`, `src/community.css` | Community tab, groups, events | Discovery & community |
| `src/boot.js` | Starts the app | Anyone |

**[CONTRACT.md](CONTRACT.md) is the source of truth** for how these pieces talk to each other: data shapes, the `SQ` engine API, the `SQUI` UI kit, shared CSS classes and design tokens. Change it before changing an interface, and get a quick OK from the team.

## Team split

| Area | Owns | Later |
| --- | --- | --- |
| **Core & data** | `engine.js`, `data.js`, `CONTRACT.md`, tests | Accounts, database, sync, live gear prices |
| **Tracker & rewards** | `shell.*` | Push nudges, photo logging, animation polish |
| **Discovery & community** | `discover.*`, `community.*` | Real groups and events, moderation, safety tools |

Fill in GitHub usernames in `.github/CODEOWNERS` so each area's owner is asked to review changes to it.

## Working together

1. `main` is protected: no direct pushes. In GitHub, go to Settings → Branches → add a rule for `main` that requires a pull request, one approval and passing checks.
2. One short-lived branch per task (`quiz-retake-button`), merged within a day or two.
3. Small pull requests, reviewed by someone outside that area. Rotate reviewers.
4. Tests must pass before merging.
5. Track work on a GitHub Projects board (To do / Doing / Done) and demo what you shipped once a week.

## Product spec

The full spec (user flows, tracker, discovery, gamification, community, data model, metrics, roadmap) lives in the team's Claude doc "Hobby App — Product Spec".


### Venue thumbnails

Event cards resolve their `place` against the exact locations in `src/assets/venues/manifest.json` (case and whitespace normalized). Photos describe the wider venue, not necessarily the exact meeting area or current season. Events at the same venue share a photo. Unknown places show a location placeholder; they never inherit a photo from their hobby or host. Image load failures reveal the same fallback. Host profiles and group illustrations remain original SVG characters.

This demo uses a curated photo catalog, not a live Places/search API. To add a venue, save its licensed JPEG in `src/assets/venues`, add its exact event locations to `places` in the manifest, and include its author, source, license URL, and accurate alt text. Update `ATTRIBUTION.md` alongside it. `build.py` embeds each JPEG once into `SQ_VENUES`; no API key or runtime image service is required. The build fails on missing or non-JPEG assets. Expand “About this venue photo” on a card or event detail to view credits.


### Design

The app uses the Ocean design: DM Sans, pale blue, inset cards and a floating navigation bar. `src/mobile.css` holds the shared mobile shell and `src/ocean.css` the Ocean layer. Google Fonts and the Showcase 3D library need a connection; venue photos and model files are local. The pre-update local changes remain recoverable in the Git stash named `Habitual local venue feed before PR 1 update`.
