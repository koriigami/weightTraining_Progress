# Home Workout: 6-Week Plan

A small read-only web app showing a 6-week home workout plan (Sep 21 to
Nov 1, 2026). Built with Next.js and Tailwind. No login, no database. The
plan is a static file you can edit directly.

Single page, calendar-style: a 6-week grid on desktop (click any day to see
its workout beside it), a current-week strip with prev/next arrows on
mobile. Sep 21 to 25 are marked as not started (that's what actually
happened). The real Day 1 is Sat, Sep 26. Weeks 1 and 2 are full-body
sessions to build a base, then from week 3 the program splits into
Push A, Pull A, Legs, Push B, Pull B, and a Full Body day, each with
strength and cardio combined.

Actual sets/reps logging happens in the **Heavy** app. Body weight is
tracked directly in **Google Fit** (no integration here, see below).

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

Open http://localhost:3000.

## Deploying to Vercel

1. Push this repo to GitHub (already done if you're reading this from the repo).
2. Go to [vercel.com/new](https://vercel.com/new) and import the repository.
3. Framework preset: **Next.js** (auto-detected). No environment variables needed.
4. Deploy. Every push to `main` redeploys automatically.

## Installing on your phone

Open the deployed URL on your phone:

- **iOS (Safari):** Share button → "Add to Home Screen".
- **Android (Chrome):** Menu → "Install app" (or "Add to Home Screen").

The app opens full-screen, without browser chrome, using the icon and name
from `public/manifest.webmanifest`.

## Why there's no weight tracking in the app

Investigated pulling body weight from Google into this app. The old Google
Fit REST API is deprecated and sunset, and Health Connect (its replacement)
is Android-only with no web API. The newer "Google Health API"
(developers.google.com/health) looked promising by name but turns out to be
the successor to the **Fitbit** Web API. It only reads data from Fitbit
devices and Pixel Watch, not from the Google Fit app or Health Connect. So
there's no web-callable path to your Google Fit weight data in 2026. The app
stays a pure workout viewer. Keep using Google Fit for weight.
