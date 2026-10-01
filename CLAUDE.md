# Levl

Levl is a game-style workout tracker by Kagadmodyaa Studio (Nagpur, India). People log
strength and cardio workouts, earn XP, level up and climb ranks E to S. It is in early
access with open sign-ups. Production: https://weight-training-progress.vercel.app

## Stack
- Next.js 15 App Router, React 19, TypeScript (strict), Tailwind plus hand-written CSS in `app/globals.css`.
- Auth.js v5: Google in production, a dev credentials provider locally (`auth.ts`). Sign-ups are open to any Google account; `SIGNUPS=invite` limits sign-in to `ALLOWED_EMAILS` (`lib/signups.ts`). Owner in `OWNER_EMAIL`.
- Upstash Redis, one key per person: `wt:user:{sub}:state` and `:profile`. A dev memory store is used when no Redis env is set (`lib/store.ts`).
- Vercel hosting. `main` deploys to production.

## Commands
| Command | What it does | Time |
|---|---|---|
| `npm run test:related -- <files>` | Tests that import the changed files | ~3 s |
| `npm run typecheck` | `tsc --noEmit` | ~3 s |
| `npm run verify` | typecheck, the full unit suite, the em dash check | ~10 s |
| `npm run verify:full` | `verify` plus `next build` | ~50 s |
| `npm run qa -- --routes "/,/workout/view?id=@run" --widths 390,1440` | Screenshots signed in with seeded data; JSON summary of console errors and overflow | ~20 s to 1.5 min (first visit to a route compiles it) |

There is no linter yet (`npm run lint` is not set up). `tsc` is the static check.

## Test policy
- While coding: `npm run test:related -- <changed files>` and `npm run typecheck`.
- Once before every commit: `npm run verify`. Never skip it. The full suite is the regression net for shared code.
- `next build`: once, right before a push, by whoever pushes. Not repeated by every agent.
- UI: `npm run qa` on the screens the change touches, at 390 and 1440, and look at every screenshot.
- New tests cover rules and edge cases in pure logic (`lib/`), one test per rule, not every permutation. Screens are checked with screenshots, not markup tests.
- Delete a test only when the feature it covers is removed.
- CI (`.github/workflows/ci.yml`) runs `verify` and `build` on every push.

## QA harness (`scripts/qa/`)
- `lib.mjs` starts `next dev` on port 3311 with the QA env, signs in over HTTP (dev provider, no clicking), seeds a known state (onboarded prefs, workouts `qa-strength` (a training day), `qa-short` (6 minutes, not a training day), `qa-run`, `qa-ride`, `qa-mixed`, weights, a goal, a routine) and opens pages. `withApp(fn, { width })` gives a signed-in page for flows.
- In routes, `@strength`, `@short`, `@run`, `@ride` and `@mixed` become the seeded workout ids. `--owner` signs in as the owner (Insights).
- Shots are at 2x pixel density and show the first screen only. For any page that scrolls, add `--full`: it also writes one slice per screen height (`-s0.png`, `-s1.png`) that are easy to read. `--out` creates the folder; use the session scratchpad.
- Flow scripts live in the scratchpad and import the harness by absolute path (`import { withApp } from '/home/user/weightTraining_Progress/scripts/qa/lib.mjs'`). Do not import `playwright` directly; `lib.mjs` loads it.
- `/workout/done` only renders right after finishing a workout in the same page, and `/workout` needs a workout in progress. Drive those flows through the UI with `withApp`.
- `npm run qa` and `withApp` stop the server themselves. If a flow crashes or you used `--keep-server`, stop it with `fuser -k 3311/tcp`, never `pkill -f`.

## Conventions
- **No em dashes anywhere**: code, comments, copy, docs, commit messages. `npm run check:dashes` enforces it.
- Copy is plain and specific, written from the person's side. Buttons say what happens.
- Every page is static (`○` in the build output). Details use query params (`/workout/view?id=`), not dynamic segments that need the server.
- `lib/` is pure logic with relative imports. Components use `@/` imports. Match the comment density and naming of the file you are in.
- CSS classes use the `wt-` prefix and the tokens at the top of `app/globals.css`. One light look, no dark mode.
- Images made in the browser (the share card) use literal colours (`components/share/cardTheme.ts`) and the fonts 'Levl Display' and 'Levl Body' (`public/fonts/`).
- Scoring rules: the source of truth is `docs/design/xp-reference.html` and `lib/workoutScoring.ts`. XP is derived from stored workouts, never stored as a running total.
- Changing the stored state shape needs a migration on read, a one-time backup key and tests for idempotence (see "Plan removal and the v7 backup" in `docs/ARCHITECTURE.md`).
- No model names or model identifiers in any file in the repo.

## How work flows
1. **Design**: board rounds with the user in the main conversation (`levl-board` skill). Boards live in `docs/design/NN-name.html` and are published as artifacts.
2. **Sign-off**: the user picks. The plan goes in `docs/Vn_PLAN.md`.
3. **Build**: one stage at a time with the `levl-builder` agent. UI stages add a `levl-ui-check` pass. The main conversation reviews the diff, runs `npm run verify`, and runs `next build` before pushing.
4. **Push** the feature branch. Nothing reaches `main` until the user says so.
5. **Release**: the `levl-release` skill (fast-forward `main`, push, wait for the deploy, report).

## Git
- Work on the designated feature branch. Commit messages are plain English and end with the attribution lines from the session's instructions.
- Subagents commit locally and never push. Never rewrite history, never force-push `main`.
- Retry a failed push on network errors only (2 s, 4 s, 8 s, 16 s).

## Docs to keep current
- `docs/ARCHITECTURE.md`: how it is built.
- `docs/ROADMAP.md`: what is next and what is done.
- `docs/DESIGN_HISTORY.md`: every board round and why it changed.
- `docs/QA.md`: the manual checks, including the ones only a real phone can do.
- `docs/AGENTS.md`: the agents and skills in use and when to add more.
- `docs/screenshots/`: screenshots from QA passes.
