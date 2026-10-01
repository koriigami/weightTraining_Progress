# Levl

Levl (formerly called Home Workout) is a routine-first workout tracker with a game layer. Build your own routines or
start from ready-made ones, log every set, and earn XP, levels, hunter ranks (E
to S), badges and a Rank Road. Built with Next.js 15 (App Router), TypeScript,
Tailwind and Motion. Sign-in is Google only, with an invite list. Each person's
data is stored under their own key in Upstash Redis.

The app started as a fixed 6-week home workout plan. That plan is gone: its
history was turned into ordinary logged workouts (with a backup of the old data),
and everything now happens in routines and logged workouts.

## Features

- **Routines.** Build a routine from the exercise library (over 100
  exercises with muscle groups, equipment and a muscle map), or add a
  ready-made one from Explore: strength splits, running, walking and cycling.
  Every routine has a preview with all its sets.
- **Workout logging, like Hevy.** The Workout button opens a Start sheet:
  a routine, a Run, Walk or Ride, or a Custom workout. Sets are prefilled with
  last time's numbers, you tick each one and edit weight and reps. Cardio sets
  take time and distance and work out the pace or speed. Add exercises on the
  fly (no duplicates), reorder, swap, and discard or finish with a confirm.
  Live "Beat last time" and "Record" chips show the bonus as you earn it.
- **Your workouts.** Every workout has its own page with an XP breakdown. Edit
  its date, time and sets, or delete it, and the XP of the rest is worked out again.
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
- **Goals.** Weekly streak, workouts, pushups, cardio time, distance and weight
  goals with XP rewards, and a game-style date picker. Typed and shown in your own
  units. A goal that is reached stays reached.
- **Settings.** Units (kg or lb, km or mi), equipment, things to avoid, weekly
  goal, sounds and haptics.
- **Onboarding.** Four screens, once: units, equipment, things to avoid, and how
  to start.
- **Phone and desktop.** A tab bar with a raised Workout button on the phone, a
  sidebar with an account menu on desktop. Installable to a phone home screen.
- **Insights (owner only).** For the person named in `OWNER_EMAIL`: how many
  people joined, how many are active each week, how long people take to reach
  each rank and how they train. It shows group numbers only, never a name or a
  set, and a group of fewer than 5 people is hidden behind a lock. Everyone else
  gets a 404 and never sees a link.

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
| `/workout/settings` | Workout settings: sounds, vibration, keep screen on, fill in last time |
| `/workout/done` | Victory, then the reward moments |
| `/workout/view?id=`, `/workout/edit?id=` | A finished workout, and its editor |
| `/rank` | Rank Road and Badges |
| `/profile` | Stats, goals, weight, this month, workouts |
| `/stats` | Body heat map and sets per muscle |
| `/calendar` | Month calendar |
| `/settings` | Account, training, app |
| `/onboarding` | The first-run flow |
| `/auth/denied` | Shown to a Google account that is not on the invite list |
| `/privacy`, `/terms` | Privacy Policy and Terms of Use. Public, readable signed out. Contact and studio details live in `lib/legal.ts` |
| `/badges`, `/goals` | Redirect to `/rank` and `/profile#goals` |
| `/insights` | Owner only: group numbers on how people use the app |
| `/api/state` | A person's own state: `GET` it, `POST` an action |
| `/api/insights` | Owner only: the Insights numbers (404 for anyone else) |
| `/api/auth/*` | Auth.js |

## Data model

Each person's state is one JSON document, `wt:user:{id}:state`, still
`version: 2`. Every field but `version`, `weights` and `goals` is optional, and a
missing field reads as empty:

- `weights`: one weight per date, in kg.
- `goals`: goals, stored in kg and km. A reached goal keeps an `achievedAt`.
- `routines`: a routine is one day's exercises, each with planned sets.
- `workouts`: finished workouts, set by set, with the `plan` each one set out to do.
  The server works out XP, beats and records, and scores them again after every change.
- `prefs`: units, equipment, things to avoid, weekly goal, workout settings, onboarding.
- `customExercises`: the person's own exercises, next to the library in
  `data/exercises.ts`.
- `rulesV2Note`, `rulesV3Note`: whether an "XP was worked out again" note is waiting on Home (the second one is for the daily bonus rules).

Weight and distance are always stored in kg and km. Units in Settings change
what the screens show and what a typed number means. Profile info (name,
email, photo, when they joined) is kept at `wt:user:{id}:profile`. A state that
still had the old plan log is converted on read, and the untouched original is
kept once at `wt:user:{id}:backup:v7`.

## Scoring rules

XP rules v2, from the signed-off rulebook in `docs/design/xp-reference.html`. Total
XP is workout XP plus badge and goal rewards plus weigh-ins. Levels, ranks and
badges come from the total. The code is `lib/workoutScoring.ts` (workouts),
`lib/progress.ts` (totals, levels, ranks) and `lib/badges.ts`.

| Source | XP |
|---|---|
| Ticked strength set with a rep (or a 5 second hold) | 5, whatever the weight |
| Cardio set | 1 per minute, up to 30 per set, plus 10 when a distance is logged |
| Interval set | Work plus easy minutes, up to 30 |
| Beat last time (per exercise, per workout) | 10 |
| All-time record (replaces the beat) | 25 |
| Finishing the plan (every planned exercise and set ticked) | The XP of the planned sets, up to 50, at most twice a day |
| The weekly goal (first time in a Monday to Sunday week) | 50 |
| Weigh-in | 10 |
| Badge tier (Bronze, Silver, Gold, Diamond, Master, Legend) | 25, 50, 100, 200, 350, 500 |
| Monthly badge / special badge | 75 / 50 |
| Goal reward | 25 to 1,000, worked out from the goal |

The first time an exercise is logged there is nothing to beat, so it earns
neither a beat nor a record.

| Levels and ranks | |
|---|---|
| XP to reach level n | `50 * n * (n - 1)` (level 2 is 100 XP) |
| E-Rank Hunter | levels 1 to 4 |
| D, C, B, A | levels 5, 10, 15 and 20 |
| S-Rank Hunter | level 30 and up |

Streaks are weekly: a week counts if it has a training day (20 minutes of training).

Badge families: Finisher (training days), Iron Mover (sets), Record Breaker,
Streak Keeper, All-Rounder, Road Runner, Rider, Engine (cardio minutes),
Pushup Path (push-up reps), Scale Keeper and Shedding, plus monthly badges (Month
Clear, Goal Month, Cardio Month and more) and specials (Clean Sweep, Goal Getter).

Migration: `tests/planMigration.test.ts` pins how an old plan-era state becomes
workouts, the v7 backup, and that reading it twice changes nothing.

## Tests and development

```bash
npm install
npm run verify        # type check, the full unit suite and the em dash check (about 10 s)
npm run verify:full   # verify, then the production build; the routes stay static
npm run test:related -- lib/feed.ts   # only the tests that import a changed file
npm run qa -- --routes "/,/workout/view?id=@run" --widths 390,1440   # screenshots with seeded data
npm run dev           # http://localhost:3000
```

CI (`.github/workflows/ci.yml`) runs `verify` and the build on every push. The
test policy, the QA harness and the conventions are in `CLAUDE.md`.

With no Google env vars set, the sign-in screen shows a "Dev sign-in" email
form (development only, never in production). With no Redis env vars, progress
is kept in memory for the life of the dev server. Run it like this:

```bash
AUTH_SECRET=dev-secret ALLOWED_EMAILS=me@example.com,friend@example.com OWNER_EMAIL=me@example.com npm run dev
```

Sign in as `me@example.com` to be the owner (Insights shows in Settings), or as
`friend@example.com` to see the onboarding a new person gets. Insights needs 5
people with data before it shows numbers.

Manual checks per screen are in `docs/QA.md`.

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
   a test user. Set the app name to Levl, upload `public/icon-512.png` as the
   logo, and fill in the home page (`https://<your-domain>/`), privacy policy
   (`https://<your-domain>/privacy`) and terms (`https://<your-domain>/terms`)
   links.
3. Create an OAuth client ID (type: Web application). Add the redirect URI
   `https://<your-domain>/api/auth/callback/google`. Add
   `http://localhost:3000/api/auth/callback/google` too if you want to test
   Google sign-in locally.
4. In Vercel Project Settings, Environment Variables, add:
   - `AUTH_SECRET`: a random string. Run `npx auth secret` to make one.
   - `AUTH_GOOGLE_ID`: the OAuth client ID.
   - `AUTH_GOOGLE_SECRET`: the OAuth client secret.
   - `ALLOWED_EMAILS`: comma-separated Google emails that may sign in.
   - `OWNER_EMAIL`: the owner's Google email. Their older progress is copied over
     on first sign-in, and only they can open Insights.
   - `NEXT_PUBLIC_WAITLIST_URL` (optional): the waitlist form behind the "Join the
     waitlist" button on the sign-in screen and the "Invite only" page. Defaults
     to the Levl Tally form (`https://tally.so/r/kdMyYM`). Set it to an empty
     value to hide the button.
   - `NEXT_PUBLIC_SITE_URL` (optional): the public site URL, used for the
     metadata base, social share images, `robots.txt` and the sitemap. Defaults
     to `https://weight-training-progress.vercel.app`.
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
