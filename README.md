# Home Workout: 6-Week Plan

A small personal web app showing a 6-week home workout plan (Sep 21 to
Nov 1, 2026), with per-exercise logging, XP, levels, hunter ranks (E
through S), a Strava-style badge collection, and goals layered on top.
Built with Next.js, Tailwind and Motion. The plan is a static file you
can edit directly; progress data is stored in Upstash Redis, per
user, behind Google sign-in with an invite list.

Calendar page: a 6-week grid on desktop (click any day to see its workout
beside it), a current-week strip with prev/next arrows on mobile. Sep 21
to 25 are marked as not started (that's what actually happened). The real
Day 1 is Sat, Sep 26. Weeks 1 and 2 are full-body sessions to build a
base, then from week 3 the program splits into Push A, Pull A, Legs,
Push B, Pull B, and a Full Body day, each with strength and cardio
combined.

Tick off each exercise on any day up to today as you go: strength items
earn XP and clear the day once every strength exercise is done, core and
cardio are bonus XP on top. Cardio opens a small sheet for minutes and an
optional distance. Clearing days, hitting streaks, logging pushups,
cardio distance and weigh-ins all build toward a badge collection (see
the Badges tab), and level-ups and rank-ups get a full-screen callout. A
morning weight entry on the Profile page tracks progress from 110 kg
toward a 103 kg target. The Goals page lets you set a streak (the end
date is worked out for you from the plan), a workouts/pushups/cardio
target over a period, or a weight goal with a Lose/Gain direction and a
pace meter.

Navigation follows Material 3: a bottom tab bar on phones, a navigation
rail on wider screens, both with Calendar, Profile, Badges and Goals.

Actual sets/reps logging happens in the **Heavy** app. This app only
tracks whether a day was completed as planned, plus a daily weight entry.

## Data model

Each person's state is one JSON document, `wt:user:{id}:state`, still
`version: 2`. The original 6-week plan log (`days`, `weights`, `goals`) is
unchanged and keeps its own scoring. Routines and logged workouts were added as
optional fields, and a missing field reads as empty:

- `routines`: a routine is one day's exercises, each with planned sets. The
  owner's six plan sessions are copied in as routines the first time the owner
  signs in after this change.
- `workouts`: finished workouts, set by set. The server works out XP and
  personal records and re-scores after every change.
- `prefs`: units, equipment, things to avoid, weekly goal, onboarding.
- `customExercises`: the person's own exercises, next to the library in
  `data/exercises.ts`.

Total XP is the plan XP plus workout XP (5 per ticked set, cardio by the minute,
50 for finishing, 25 per PR, 50 for hitting the weekly goal). Levels, ranks and
badges come from that total. The rules live in `lib/workoutScoring.ts`, and the
types and helpers in `lib/routines.ts`.

## Tests

```bash
npm test
```

Runs vitest over `tests/`. A parity test pins the plan-only numbers (XP, levels,
ranks, streaks, badges, goals) to what the code produced before workouts existed.

## Editing the plan

Everything lives in one file: `data/plan.ts`. Each session type
(`pushA`, `pushB`, `pullA`, `pullB`, `legs`, `fullBody`) is a small function
keyed by week number, so bumping a dumbbell weight or changing reps for a
given week just means editing the `case` for that week in the relevant
function. The weekly layout (which day gets which session, which days are
rest) is in the `WEEK_LAYOUT` table near the top of the file.

## Local development

```bash
npm install
npm run dev
```

Open http://localhost:3000. With no Google env vars set, the sign-in
screen shows a "Dev sign-in" email form (development only, never in
production). Run it like this:

```bash
AUTH_SECRET=dev-secret ALLOWED_EMAILS=me@example.com OWNER_EMAIL=me@example.com npm run dev
```

With no Redis env vars set, progress is kept in memory for the life of
the dev server (it resets when you restart it).

## Setting up sign-in and progress storage

The calendar itself needs no setup, but XP, badges, weights and goals
need a small database and Google sign-in. Each person's progress is
stored under `wt:user:{id}:state`, where the id is their Google account id.
Only emails on the invite list can sign in.

The owner's older progress in `wt:state:v2` (or `wt:state` from an even
earlier version) is copied once into the owner's own key the first time
the owner signs in. The old keys are never changed or deleted.

1. In the Vercel dashboard, open this project, go to Storage, and add
   **Upstash Redis** (free tier). Connect it to the project. This injects
   the `KV_REST_API_URL` / `UPSTASH_REDIS_REST_URL` style environment
   variables the app reads through `@upstash/redis`.
2. In Google Cloud Console, create a project. Under APIs and Services,
   set up the OAuth consent screen (External, Testing) and add each
   invited person as a test user.
3. Create an OAuth client ID (type: Web application). Add the redirect
   URI `https://<your-domain>/api/auth/callback/google`. Add
   `http://localhost:3000/api/auth/callback/google` too if you want to
   test Google sign-in locally.
4. In Vercel Project Settings, Environment Variables, add:
   - `AUTH_SECRET`: a random string. Run `npx auth secret` to make one.
   - `AUTH_GOOGLE_ID`: the OAuth client ID.
   - `AUTH_GOOGLE_SECRET`: the OAuth client secret.
   - `ALLOWED_EMAILS`: comma-separated Google emails that may sign in.
   - `OWNER_EMAIL`: the owner's Google email, so their old progress is copied over.
5. Redeploy.

## Deploying to Vercel

1. Push this repo to GitHub (already done if you're reading this from the repo).
2. Go to [vercel.com/new](https://vercel.com/new) and import the repository.
3. Framework preset: **Next.js** (auto-detected).
4. Follow "Setting up sign-in and progress storage" above before or
   right after the first deploy.
5. Deploy. Every push to `main` redeploys automatically.

## Installing on your phone

Open the deployed URL on your phone:

- **iOS (Safari):** Share button → "Add to Home Screen".
- **Android (Chrome):** Menu → "Install app" (or "Add to Home Screen").

The app opens full-screen, without browser chrome, using the icon and name
from `public/manifest.webmanifest`.
