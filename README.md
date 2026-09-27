# Home Workout: 6-Week Plan

A small personal web app showing a 6-week home workout plan (Sep 21 to
Nov 1, 2026), with a one-tap "workout done" tracker, XP, levels, ranks,
achievements, and goals layered on top. Built with Next.js and Tailwind.
The plan is a static file you can edit directly; progress data is stored
in Upstash Redis and protected by a passcode, since the URL is public.

Calendar page: a 6-week grid on desktop (click any day to see its workout
beside it), a current-week strip with prev/next arrows on mobile. Sep 21
to 25 are marked as not started (that's what actually happened). The real
Day 1 is Sat, Sep 26. Weeks 1 and 2 are full-body sessions to build a
base, then from week 3 the program splits into Push A, Pull A, Legs,
Push B, Pull B, and a Full Body day, each with strength and cardio
combined.

Tap "Mark workout done" on any day up to today to log it. Doing so earns
XP, builds a streak, and can unlock achievements. A morning weight entry
on the Profile page tracks progress from 110 kg toward a 103 kg target
and unlocks weight milestones. The Goals page lets you set short-term
(a few days) or long-term (up to 3 months) goals for workouts, pushups,
cardio minutes, streaks, or weight.

Actual sets/reps logging happens in the **Heavy** app. This app only
tracks whether a day was completed as planned, plus a daily weight entry.

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

Open http://localhost:3000. Set `APP_PASSCODE=<anything>` in your shell
before `npm run dev` to try the passcode prompt locally. With no Redis
env vars set, progress is kept in memory for the life of the dev server
(it resets when you restart it).

## Setting up progress storage and the passcode

The calendar itself needs no setup, but XP, achievements, weights and
goals need a small database and a passcode, since the deployed URL is
public with no login.

1. In the Vercel dashboard, open this project, go to Storage, and add
   **Upstash Redis** (free tier). Connect it to the project. This injects
   the `KV_REST_API_URL` / `UPSTASH_REDIS_REST_URL` style environment
   variables the app reads through `@upstash/redis`.
2. In Project Settings, Environment Variables, add `APP_PASSCODE` with a
   value of your choice.
3. Redeploy. Open the app on each device and enter the passcode once; it's
   remembered after that.

## Deploying to Vercel

1. Push this repo to GitHub (already done if you're reading this from the repo).
2. Go to [vercel.com/new](https://vercel.com/new) and import the repository.
3. Framework preset: **Next.js** (auto-detected).
4. Follow "Setting up progress storage and the passcode" above before or
   right after the first deploy.
5. Deploy. Every push to `main` redeploys automatically.

## Installing on your phone

Open the deployed URL on your phone:

- **iOS (Safari):** Share button → "Add to Home Screen".
- **Android (Chrome):** Menu → "Install app" (or "Add to Home Screen").

The app opens full-screen, without browser chrome, using the icon and name
from `public/manifest.webmanifest`.
