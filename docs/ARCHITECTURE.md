# Architecture

How the app is put together, and the few rules that keep it correct. For what
the app does, see the README. For why it looks the way it does, see
`docs/DESIGN_HISTORY.md`.

## Stack

Next.js 15 App Router, React 19, TypeScript, Tailwind 3 plus one large
hand-written stylesheet (`app/globals.css`, classes prefixed `wt-`), Motion for a
few springs, `canvas-confetti`, Auth.js (next-auth v5 beta) and Upstash Redis.
Fonts are Figtree (reading) and Lilita One (game titles).

## Folders

| Folder | What lives there |
|---|---|
| `app/` | Routes. Each page is a thin client component that reads a provider and composes components. `app/api/state/route.ts` is the only data API, `app/api/auth/` is Auth.js. `app/globals.css` holds every style. |
| `components/` | React components. `ProgressProvider.tsx`, `WorkoutSessionProvider.tsx` and `AppShell.tsx` sit at the top. Sub-folders per area: `ui/` (buttons, cards, sheets, dialogs), `nav/`, `home/`, `routines/`, `exercises/`, `workout/`, `victory/`, `celebrate/`, `rank/`, `profile/`, `goals/`, `stats/`, `calendar/`, `prefs/`, `onboarding/`. |
| `lib/` | Pure logic with no React and no browser access, so it is testable. Scoring, badges, the rank road, goals, units, the workout session, routine actions and validation, feed and stat builders. `feedback.ts`, `useToday.ts`, `useMediaQuery.ts` and `useBackToClose.ts` are the few browser-facing helpers. |
| `data/` | `exercises.ts` (the library, muscle groups, equipment, metrics) and `plan.ts` (the original 6-week plan). |
| `tests/` | Vitest, over `lib/` and the store. `tests/fixtures/` holds a copy of the owner's real state and its golden numbers. |
| `docs/` | This file, the roadmap, the design history, `design/` (the boards) and `screenshots/`. |
| `auth.ts` | Auth.js config: Google, the invite list, and a dev-only email sign-in. |

## Providers

Mounted in `app/layout.tsx` and `components/AppShell.tsx`, outermost first:

1. `SessionProvider` (next-auth). The root layout is static: the session is
   fetched on the client, so every route can be prerendered.
2. `CelebrationProvider` (`components/celebrate/`). Holds the queue of reward
   moments and renders the one on screen. API: `enqueue(events, { delayMs })`
   and `replay(event)`. It is above the shell so a moment can outlive a
   page change.
3. `AppShell`. Shows a skeleton while the session loads, the sign-in screen when
   signed out, and otherwise mounts the two providers below plus the frame
   (sidebar, tab bar, START sheet, sign-out dialog, skip link).
4. `ProgressProvider`. The person's whole state, derived progress, and every
   action that changes it. `useProgress()` is what almost every screen reads.
5. `WorkoutSessionProvider`. The workout in progress, kept in localStorage.

## Data flow

### Reading

`ProgressProvider` fetches `GET /api/state` once per signed-in user, holds the
`AppState` in React state, and computes `progress` (XP, level, rank, stats) from
it with `computeProgress`. Pages read `state`, `progress`, `routines`,
`workouts` and `prefs` from `useProgress()` and pass them to pure builders in
`lib/`, such as `buildBadgeCards` or `weeklySeries`. The date comes from
`useToday()`, so a page left open past midnight updates.

### Optimistic actions

Every change goes through one queue in `ProgressProvider`:

1. Take the current state as `before`.
2. Apply the change locally and update the screen at once. For routines,
   workouts, prefs and custom exercises the local change is the same pure
   function the server runs, `applyRoutineAction` in `lib/routineActions.ts`, so
   the client and the server end up with the same numbers. If it rejects the
   input (a duplicate, a bad value) nothing is sent.
3. `POST /api/state` behind a promise chain, so two quick actions never race a
   read-modify-write on the server. Each request has a sequence number, and a
   response is applied only if nothing newer was queued.
4. On success the server's state replaces the local one. On failure the state
   rolls back to `before` (or is fetched again if newer changes were queued) and
   a toast says "Couldn't save."

The server (`app/api/state/route.ts`) checks the session, reads the person's
state, validates and applies the action, saves, and returns the whole state.

### The workout session

`WorkoutSessionProvider` keeps one `Session` (a workout that is not finished) in
React state and in localStorage under `wt:session:{userId}`, so a reload does
not lose it. `lib/session.ts` holds all the operations as pure functions: add,
remove, swap and move exercises, add and tick sets, and the duplicate rule.

`finish()` turns the session into a `saveWorkout` action that keeps only the
ticked sets. The workout stays in progress until the save succeeds. It resolves
to the saved workout, an XP snapshot before and after, and the celebration
events the workout caused. Those events are not played yet.

### Victory and the reward moments

`/workout/done` shows the Victory screen from the last finished workout (in
memory only). Its banner, rolling XP, crowns and XP bar play first. The screen
then calls `celebration.enqueue(events, { delayMs: 1800 })`: the events are held
back until 1.8 seconds after mount, or the first tap or key press if that comes
sooner. Then `CelebrationProvider` plays them one at a time: level ups and rank
ups first, then badges, in the order `lib/celebrations.ts` gives. A rank up
already says the level, and monthly and special badges reuse the badge moment.

A moment (`Moment.tsx`, with `Chest.tsx`) is a full-screen `role="dialog"`. Focus
moves into it and is restored after. Tap, Enter, Space or Esc continue, and the
browser Back button closes it too. A tap in the first 300 ms is ignored so the
tap that started it cannot skip it. Sound and haptics fire with the animation,
through `lib/feedback.ts`. With reduced motion the moment shows its end state
with nothing spinning.

Nothing replays on reload. `wt:seen:{userId}` in localStorage records the
highest level and the set of badge ids already shown, and only ever grows.
Events come from two places: `diffCelebrations` (the change an action caused)
and the first load (what was earned since the last visit).

Replay is separate from this. On the Rank screen, tapping an earned badge or an
unlocked rank gate calls `replay(event)`, which marks the event as a replay: it
skips seen-tracking, and a badge replay leaves out the "+XP" line.

## Scoring is derived, never stored

Nothing about XP is stored except what a workout carries for display. Total XP,
level, rank, streaks and badges are computed from the state every time:

- Workouts are scored in date order by `lib/workoutScoring.ts`
  (`rescoreWorkouts`): 5 XP per ticked set, cardio by the minute, 50 for
  finishing, 25 per PR, 50 for hitting the weekly goal. A PR depends on every
  earlier workout, so after any save, edit or delete the server scores all
  workouts again. Deleting or moving a workout therefore re-scores the rest.
- The plan log (`state.days`) is scored by `lib/progress.ts` with its own,
  unchanged rules.
- `totalXp` adds the two, plus badge tiers, monthly and special badges, weigh-ins
  and goal rewards. Levels come from `xpForLevel(n) = 50 * n * (n - 1)`.
- Badges (`lib/badges.ts`) come from time series over the plan and the
  workouts. `lib/badgeCards.ts` turns them into cards and decides which to show:
  badges that only the 6-week plan can move are shown only to people who have
  plan days. That is a display filter. It never changes what is earned.

## Storage

Redis keys, all per person (`{id}` is the Google account id):

| Key | Content |
|---|---|
| `wt:user:{id}:state` | The whole `AppState` document, `version: 2` |
| `wt:user:{id}:profile` | Email, name, photo, created time |
| `wt:state:v2`, `wt:state` | The owner's older single-user progress. Read only, never written or deleted |

Browser storage, all per person and device: `wt:session:{id}` (workout in
progress), `wt:seen:{id}` (what reward moments were shown), and `wt:prefs`
(sound and haptics for this device). Every read and write is wrapped in
try/catch, and the app works with storage blocked.

`lib/store.ts` has one `KV` interface with two backends: Upstash Redis, and an
in-memory map used only in development when no Redis variables are set.

## Owner migration

The first time the owner (`OWNER_EMAIL`) signs in and has no state of their own,
`getState` copies `wt:state:v2` (or converts `wt:state` from the first version)
into `wt:user:{id}:state`, adds the six plan sessions as routines, and saves.
Old keys are not touched. An owner who already has state but no `routines` field
gets the routines once, and an owner who deletes them all keeps an empty list.
Anyone else starts with `newUserState()`: no routines, default prefs, and not yet
through onboarding, so the shell sends them there.

## Legacy parity guarantee

Progress the owner earned in the 6-week plan must not change. To hold that:

- The plan log and its scoring rules were not edited when routines were added.
  New things are optional fields and new code paths, and a missing field reads as
  empty.
- `tests/legacyParity.test.ts` runs a copy of the owner's real state
  (`tests/fixtures/legacyState.json`) through the scoring code and compares
  total XP, level, rank, streaks, earned badges and goal states with golden
  numbers made by the code as it was before workouts existed
  (`tests/fixtures/genLegacyGolden.ts`).
- Changes that could touch old numbers are guarded by "has plan days". The
  Shedding badge counts from 110 kg only for people with plan days.

## Rendering and layout

- Every route is a static shell. Pages that depend on a person's routine ids
  (`/routine/[id]`) return an empty `generateStaticParams` so Next prerenders the
  shell once. The ready-made routine previews (`/explore/[id]`) are prerendered
  for real.
- `Screen` and `PageHeader` (`components/ui/`) give every page the same
  structure: a sticky header, a body, an optional desktop side column, and on the
  phone a pinned footer for the main action.
- The phone/desktop split is CSS first, with `useWideLayout()` for the few places
  that render different trees.
- Dialogs and sheets use `useDialog` (focus trap, Esc, restore focus) and
  `useBackToClose` (the Back button closes the top layer).
- Motion is decoration only. Every animation has a `prefers-reduced-motion`
  rule, and the reward moments have a static end state.

## Testing

`npm test` runs vitest over `tests/`. The tests are pure: scoring, badges, badge
cards, the rank road, goals and units, the session, routine actions and
validation, the celebration queue, and the store with an in-memory KV. There is
no component or browser test suite. Screens are checked by hand with
`docs/QA.md`.
