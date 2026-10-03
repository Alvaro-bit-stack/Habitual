# Habitual

A mobile-first app that helps people trade scrolling for hobbies. It gets you started on a new hobby in minutes and makes coming back to an old one feel rewarding, even for a two-minute effort.

> The MVP's in-app name is still the working name "Sidequest". Rename it when the team settles on a name.

## What the MVP does

- **Two ways in:** "I already have hobbies" (add them to the tracker) or "Find a new hobby" (5-question quiz → 3 matches → starter pack).
- **Starter packs** for 12 hobbies: gear in Free / Budget / Step-up tiers with totals, try-before-you-buy tips, and a plan for the first 3 sessions.
- **Tracker:** weekly goals, one-tap tiny wins on a 5-rung ladder, comeback mode after 7+ days away, a 12-week activity map, skill milestones and a session log.
- **Rewards:** XP, hobby and player levels, the Sprout mascot (5 growth stages, accessories), achievements and a celebration screen.
- **Community (sample data):** Newark-area groups and events, RSVP and check-in for XP. Events first, no infinite feed.

Everything runs in the browser and saves to the device (localStorage). There are no accounts, servers or real other users yet.

## Run it

Requirements: Python 3 and Node 18+.

```bash
python3 build.py          # inlines src/ into dist/
open dist/preview.html    # or double-click it; on Linux use xdg-open
```

On the welcome screen, tap **Explore with sample data** to see the app filled in.

`build.py` writes two files:

- `dist/preview.html` is a full HTML page you can open locally or host anywhere.
- `dist/sidequest.html` is the same page without the outer `<html>` wrapper (used for the Claude artifact).

## Tests

```bash
node tests/data.check.js       # content: every hobby, pack, event and quiz entry matches the contract
node tests/engine.test.js      # game logic: XP, levels, streaks, comeback, matching, storage
pip install playwright && python3 -m playwright install chromium
python3 tests/e2e.py           # browser walkthrough of every flow, phone + desktop, light + dark
```

All three run automatically on every push and pull request (see `.github/workflows/tests.yml`). Screenshots from the browser tests land in `scratch/qa/` (git-ignored).

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
