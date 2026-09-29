# Home Workout

A routine-first workout tracker with a game layer. Build your own routines or
start from ready-made ones, log every set, and earn XP, levels, hunter ranks (E
to S), badges and a Rank Road. Built with Next.js 15 (App Router), TypeScript,
Tailwind and Motion. Sign-in is Google only, with an invite list. Each person's
data is stored under their own key in Upstash Redis.

The app started as a 6-week home workout plan (Sep 21 to Nov 1, 2026). That
plan's history is still there and still scored by its original rules, but new
work happens in routines and logged workouts.

## Features

- **Routines.** Build a routine from the exercise library (over 100
  exercises with muscle groups, equipment and a muscle map), or add a
  ready-made one from Explore: strength splits, running, walking and cycling.
  Every routine has a preview with all its sets.
- **Workout logging, like Hevy.** Start from a routine or an empty workout.
  Sets are prefilled, you tick each one and edit weight and reps. Cardio sets
  take time and distance and work out the pace. Add exercises on the fly (no
  duplicates), reorder, swap, and discard or finish with a confirm.
- **Victory.** Finishing plays a Victory screen: rolling XP, crowns for sets,
  and an XP bar. Edit the title, date and time, and notes, and share the workout as text.
  A photo waits for file storage (see the roadmap).
- **Reward moments.** Level up, rank up and badge unlock each play as a full
  screen moment (rays, shield slam, treasure chest). They queue one at a time,
  never replay on reload, and honor reduced motion, sound and haptics settings.
- **Rank Road.** Levels 1 to 32 and the six rank gates in four states
  (unlocked, your rank, next, locked). Locked shields and badges stay visible
  and open a preview. Tapping an unlocked rank or an earned badge replays its
  moment.
- **Badges.** Lifetime families in six tiers (Bronze to Legend), monthly and
  special badges, shown as game cards with progress.
- **Profile.** Weekly chart (XP, sets, volume), stat tiles, goals, weight log
  with a sparkline, this month at a glance, and a workout feed. **Statistics**
  has a body heat map and sets per muscle, and **Calendar** a month view.
- **Goals.** Streak, workouts, pushups, cardio time, distance and weight goals
  with XP rewards. Typed and shown in your own units.
- **Settings.** Units (kg or lb, km or mi), equipment, things to avoid, weekly
  goal, sounds and haptics.
- **Onboarding.** Four screens, once: units, equipment, things to avoid, and how
  to start.
- **Phone and desktop.** A tab bar with a raised START button on the phone, a
  sidebar with an account menu on desktop. Installable to a phone home screen.

## Screens and routes

Every route is prerendered as a static shell. Data is read on the client.

| Route | What it is |
|---|---|
| `/` | Home: hunter card, this week, Up next routines, recent workouts |
| `/routines` | My routines, Explore and Exercises segments (phone) |
| `/explore`, `/explore/[id]` | Ready-made routines and their previews |
| `/exercises` | The exercise library (desktop sidebar item) |
| `/routine/new`, `/routine/[id]` | Routine editor (create, edit, delete) |
| `/routine/[id]/preview` | Every set of a routine, with Start |
| `/workout` | Log a workout |
| `/workout/done` | Victory, then the reward moments |
| `/rank` | Rank Road and Badges |
| `/profile` | Stats, goals, weight, this month, workouts |
| `/stats` | Body heat map and sets per muscle |
| `/calendar`, `/calendar/plan` | Month calendar, and the original 6-week plan |
| `/settings` | Account, training, app |
| `/onboarding` | The first-run flow |
| `/auth/denied` | Shown to a Google account that is not on the invite list |
| `/badges`, `/goals` | Redirect to `/rank` and `/profile#goals` |
| `/api/state` | The one JSON API: `GET` the state, `POST` an action |
| `/api/auth/*` | Auth.js |

## Data model

Each person's state is one JSON document, `wt:user:{id}:state`, still
`version: 2`. The original plan log (`days`, `weights`, `goals`) is unchanged.
Everything added since is an optional field, and a missing field reads as empty:

- `days`: the 6-week plan log, keyed by date, with its own scoring rules.
- `weights`: one weight per date, in kg.
- `goals`: goals, stored in kg and km.
- `routines`: a routine is one day's exercises, each with planned sets.
- `workouts`: finished workouts, set by set. The server works out XP and
  personal records, and scores them again after every change.
- `prefs`: units, equipment, things to avoid, weekly goal, onboarding.
- `customExercises`: the person's own exercises, next to the library in
  `data/exercises.ts`.

Weight and distance are always stored in kg and km. Units in Settings change
what the screens show and what a typed number means. Profile info (name,
email, photo) is kept at `wt:user:{id}:profile`.

## Scoring rules

Total XP is the plan XP plus workout XP plus badge and goal rewards. Levels,
ranks and badges come from the total. The rules are in `lib/workoutScoring.ts`
(workouts), `lib/progress.ts` (plan, levels, ranks) and `lib/badges.ts`.

| Source | XP |
|---|---|
| Ticked strength set (logged workout) | 5 |
| Cardio set (logged workout) | 1 per minute, up to 30 per set, plus 10 when a distance is logged |
| Finishing a workout with at least one ticked set | 50 |
| Personal record (heaviest set, then most reps, for an exercise; the first time is never a PR) | 25 |
| Hitting the weekly goal (first time in a Monday to Sunday week) | 50 |
| Plan: strength item | 15 |
| Plan: core item | 10 |
| Plan: cardio, plus a distance bonus | 20, plus 10 |
| Plan: day cleared (all strength ticked) | 50, plus 10 per streak day up to 50 |
| Plan: perfect day (everything ticked) | 25 |
| Weigh-in | 10 |
| Badge tier (Bronze, Silver, Gold, Diamond, Master, Legend) | 25, 50, 100, 200, 350, 500 |
| Monthly badge / special badge | 75 / 50 |
| Goal reward | 25 to 1,000, worked out from the goal |

| Levels and ranks | |
|---|---|
| XP to reach level n | `50 * n * (n - 1)` (level 2 is 100 XP) |
| E-Rank Hunter | levels 1 to 4 |
| D, C, B, A | levels 5, 10, 15 and 20 |
| S-Rank Hunter | level 30 and up |

Streaks for logged workouts are weekly: a week counts if you trained at least
once. The plan's daily streaks and badges stay as they were.

Badge families that score logged workouts: Finisher (workouts finished), Iron
Mover (tonnes lifted), Record Breaker (PRs), Streak Keeper (weekly streak) and
All-Rounder (muscle groups). Road Runner and Rider also count logged runs and
rides. Badges that only the 6-week plan can move (Iron Will, Pushup Path,
Grinder, Engine, Perfect Month, Awakening, Month Clear and the like) are shown
only to people who have plan days.

Legacy parity: `tests/legacyParity.test.ts` pins the plan-only numbers (XP,
levels, ranks, streaks, badges, goals) to what the code produced before
workouts existed.

## Tests and development

```bash
npm install
npm test            # vitest over tests/ (pure logic: scoring, badges, rank road, units, sessions)
npx tsc --noEmit    # type check
npm run lint        # next lint
npm run build       # production build; the routes stay static
npm run dev         # http://localhost:3000
```

With no Google env vars set, the sign-in screen shows a "Dev sign-in" email
form (development only, never in production). With no Redis env vars, progress
is kept in memory for the life of the dev server. Run it like this:

```bash
AUTH_SECRET=dev-secret ALLOWED_EMAILS=me@example.com,friend@example.com OWNER_EMAIL=me@example.com npm run dev
```

Sign in as `me@example.com` to get the owner's setup, or as
`friend@example.com` to see the onboarding a new person gets.

Manual checks per screen are in `docs/QA.md`.

## Editing the plan

The original 6-week plan lives in `data/plan.ts`. Each session type (`pushA`,
`pushB`, `pullA`, `pullB`, `legs`, `fullBody`) is a small function keyed by
week number, and the weekly layout is the `WEEK_LAYOUT` table near the top.
The owner's six sessions are also copied into routines once, the first time the
owner signs in after routines shipped.

## Setting up sign-in and progress storage

XP, badges, weights and goals need a small database and Google sign-in. Each
person's progress is stored under `wt:user:{id}:state`, where the id is their
Google account id. Only emails on the invite list can sign in.

The owner's older progress in `wt:state:v2` (or `wt:state` from an even
earlier version) is copied once into the owner's own key the first time the
owner signs in. The old keys are never changed or deleted.

1. In the Vercel dashboard, open this project, go to Storage, and add
   **Upstash Redis** (free tier). Connect it to the project. This injects the
   `KV_REST_API_URL` / `UPSTASH_REDIS_REST_URL` style environment variables the
   app reads through `@upstash/redis`.
2. In Google Cloud Console, create a project. Under APIs and Services, set up
   the OAuth consent screen (External, Testing) and add each invited person as
   a test user.
3. Create an OAuth client ID (type: Web application). Add the redirect URI
   `https://<your-domain>/api/auth/callback/google`. Add
   `http://localhost:3000/api/auth/callback/google` too if you want to test
   Google sign-in locally.
4. In Vercel Project Settings, Environment Variables, add:
   - `AUTH_SECRET`: a random string. Run `npx auth secret` to make one.
   - `AUTH_GOOGLE_ID`: the OAuth client ID.
   - `AUTH_GOOGLE_SECRET`: the OAuth client secret.
   - `ALLOWED_EMAILS`: comma-separated Google emails that may sign in.
   - `OWNER_EMAIL`: the owner's Google email, so their old progress is copied over.
5. Redeploy.

## Deploying to Vercel

1. Push this repo to GitHub.
2. Go to [vercel.com/new](https://vercel.com/new) and import the repository.
3. Framework preset: **Next.js** (auto-detected).
4. Follow "Setting up sign-in and progress storage" above before or right after
   the first deploy.
5. Deploy. Every push to `main` redeploys automatically.

## Installing on your phone

Open the deployed URL on your phone:

- **iOS (Safari):** Share button, then "Add to Home Screen".
- **Android (Chrome):** Menu, then "Install app" (or "Add to Home Screen").

The app opens full-screen, without browser chrome, using the icon and name from
`public/manifest.webmanifest`.

## Design

The look is Arena Bright: sky, greens, gold and cream, with chunky 3D buttons
and game-style titles. Every design we explored, and why each one changed, is in
[docs/DESIGN_HISTORY.md](docs/DESIGN_HISTORY.md). The boards themselves are
clickable HTML prototypes in [docs/design/](docs/design/). Board 05 is the final
target, and the "As built" section of the history says where each decision
lives in the code and where the build differs on purpose. Screenshots of each
stage are in `docs/screenshots/`.

More documents:

- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md): folders, providers and data flow.
- [docs/QA.md](docs/QA.md): the manual checklist.
- [docs/ROADMAP.md](docs/ROADMAP.md): the plan, the decisions behind it, and what is next.
