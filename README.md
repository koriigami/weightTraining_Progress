# Home Workout — 6-Week Plan

A small read-only web app showing a 6-week home workout plan (Sep 21 – Nov 1,
2026). Built with Next.js + Tailwind. No login, no database — the plan is a
static file you can edit directly.

- **Today** (`/`) — today's workout, with a peek at tomorrow.
- **Plan** (`/plan`) — the full 6 weeks, collapsible on mobile, a grid on desktop.

Actual sets/reps logging happens in the **Heavy** app; body weight is tracked
in **Google Fit**. This app is just the plan you check each morning.

## Editing the plan

Everything lives in one file: `data/plan.ts`. Each of the 42 days is built
from small per-day-type functions (`pushDay`, `pullDay`, `legsDay`, etc.)
that take the week number and return that week's exercises — so bumping a
dumbbell weight or changing reps for a given week just means editing the
`case` for that week in the relevant function.

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

## What's not built yet

Pulling body weight from Google into the app (via the newer Google Health
APIs, since the old Fit REST API is being sunset) is a deliberately deferred
phase — see the plan discussion for details. The app works fully without it.
