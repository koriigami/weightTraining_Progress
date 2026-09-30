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
| `app/` | Routes. Each page is a thin client component that reads a provider and composes components. `app/api/state/route.ts` is the data API for a person's own state, `app/api/insights/route.ts` is the owner-only Insights API, and `app/api/auth/` is Auth.js. `app/globals.css` holds every style. |
| `components/` | React components. `ProgressProvider.tsx`, `WorkoutSessionProvider.tsx` and `AppShell.tsx` sit at the top. Sub-folders per area: `ui/` (buttons, cards, sheets, dialogs), `nav/`, `home/`, `routines/`, `exercises/`, `workout/`, `victory/`, `celebrate/`, `rank/`, `profile/`, `goals/`, `stats/`, `calendar/`, `prefs/`, `onboarding/`, `insights/`. |
| `lib/` | Pure logic with no React and no browser access, so it is testable. Scoring, badges, the rank road, goals, units, the workout session, routine actions and validation, feed and stat builders. `feedback.ts`, `useToday.ts`, `useMediaQuery.ts` and `useBackToClose.ts` are the few browser-facing helpers. `migrations/planDays.ts` turns the old plan log into workouts. |
| `data/` | `exercises.ts`: the library, muscle groups, equipment and metrics. |
| `tests/` | Vitest, over `lib/` and the store. `tests/fixtures/` holds an old plan-era state for the migration tests. |
| `docs/` | This file, the roadmap, the design history, `design/` (the boards) and `screenshots/`. |
| `auth.ts` | Auth.js config: Google, the invite list, a dev-only email sign-in, and the session's `isOwner` flag. |

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
level, rank, streaks and badges are computed from the state every time. The
rules are the XP Rulebook (`docs/design/xp-reference.html`), called rules v2:

- **Set XP** (`setXp` in `lib/routines.ts`): 5 per ticked strength set with a
  rep or a 5 second hold, cardio 1 XP a minute (30 at most a set) plus 10 with a
  distance, an interval set its work plus easy minutes (also capped at 30).
- **Beat last time (+10) and records (+25)**, once per exercise per workout. A
  record replaces the beat. The first time an exercise shows up earns neither.
- **Finish bonus**: paid when the workout's plan is complete. It is worth the XP
  of the sets that fill the plan, up to 50, and at most 2 a day.
- **Weekly goal**: +50 the workout that makes a Monday to Sunday week's count of
  plan-complete workouts reach the weekly goal.
- Workouts are scored in date order by `scoreWorkouts` and `rescoreWorkouts` in
  `lib/workoutScoring.ts`. Beat, record, the daily cap and the weekly goal
  depend on the workouts around them, so after any save, edit or delete the
  server scores all workouts again, and deleting or moving one re-scores the rest.
- **The plan snapshot.** A workout carries `plan`, the exercises and set counts it
  set out to do, taken at Start (the routine, or the exercises picked before
  Start). Swapping moves a plan slot, removing removes it, adding does not
  change it. A workout saved before v8 has no `plan`, and its own ticked sets
  stand in as the plan. `marks`, `xpParts`, `planComplete` and `planMissing` are
  derived and written by `rescoreWorkouts`. The server ignores what a client
  sends for them.
- `totalXp` in `lib/progress.ts` adds workout XP, badge tiers, monthly and special
  badges, weigh-ins and goal rewards. Levels come from
  `xpForLevel(n) = 50 * n * (n - 1)`.
- Badges (`lib/badges.ts`) come from time series over the workouts.
  `lib/badgeCards.ts` turns them into cards. The plan-only badges are retired.
- Goals (`lib/goals.ts`) count workouts logged after the goal's `createdAt`. The
  server stamps `achievedAt` the first time a goal is met, and a stamped goal
  stays achieved even if a workout is later edited or deleted.
- **Rules note.** `AppState.rulesV2Note` is set once by the store for a person
  who already had workouts or plan days, so Home can say "XP was worked out
  again with the new rules". Seeing it sets the flag to false.

## Storage

Redis keys, all per person (`{id}` is the Google account id):

| Key | Content |
|---|---|
| `wt:user:{id}:state` | The whole `AppState` document, `version: 2` |
| `wt:user:{id}:profile` | Email, name, photo, created time (`createdAt` is the join date Insights uses) |
| `wt:user:{id}:backup:v7` | The state exactly as it was before the plan days became workouts, written once and never changed |
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
into `wt:user:{id}:state`. Old keys are not touched. Anyone else starts with
`newUserState()`: no routines, default prefs, and not yet through onboarding, so
the shell sends them there.

## Plan removal and the v7 backup

The 6-week plan is gone from the app (`data/plan.ts`, the plan calendar, the day
cards and the plan actions were deleted). Its history was kept as workouts. The
first time `getState` reads a state that still has a `days` log (`upgrade` in
`lib/store.ts`):

1. The raw state is copied to `wt:user:{id}:backup:v7`, but only if that key is free.
2. Each logged day becomes a `WorkoutLog` (`lib/migrations/planDays.ts`): id
   `w-plan-{date}`, the ticked items, the plan's set counts, a synthesized
   18:00 start and finish, and a `plan` holding everything scheduled that day.
3. `days` is dropped and the state is saved. Reading it again changes nothing.

`rulesV2Note` is set in the same pass. `tests/planMigration.test.ts` and
`tests/store.test.ts` cover the migration, the backup and idempotence.

### The share card

`lib/shareCard.ts` turns a workout into a `ShareCard` (fitted title, stats or a
cardio hero, muscle chips, file name, fallback text). One builder serves the
Victory screen and the workout page. `components/share/ShareCardSvg.tsx` lays it
out as one self-contained SVG, 1080 by 1350: literal colours from
`components/share/cardTheme.ts`, fonts named 'Levl Display' and 'Levl Body'
(`public/fonts/`, declared in `globals.css`, because next/font names are
hashed), ids from an `idPrefix`. The sky comes from `lib/sky.ts`, a seeded
PRNG, so the same seed always gives the same clouds.

`components/share/useShareImage.ts` makes the PNG as soon as the sheet opens and
after each new sky: `lib/shareImage.ts` serialises the SVG, packs both fonts
inside as data URIs, draws it on a canvas and returns a `File`. It is made ahead
of time because iPhones only allow `navigator.share` straight from the tap. The
finished picture is shown over the SVG, so the preview is the exact file and a
long press saves it. Share image appears only when `navigator.canShare({ files })`
says yes; Save image always does.

## Insights (owner only)

`/insights` is a static page like every other. It shows nothing until the
session says `isOwner`, then fetches `GET /api/insights?range=4w|12w|all`.

- **Owner gate.** `lib/owner.ts` compares the session email with `OWNER_EMAIL`,
  ignoring case. The session callback in `auth.ts` puts only the yes or no
  (`session.user.isOwner`) on the session, so the address never reaches a
  browser. The API route answers 404 to everyone else, signed in or not
  (`insightsStatus`). The Settings row and the sidebar account menu entry render
  only when `isOwner` is true, and a non-owner who opens `/insights` sees a
  plain "not found" state.
- **Reading everyone.** `listUserIds()` in `lib/store.ts` finds every
  `wt:user:*:state` key: an Upstash `scan` with a match pattern and a cursor
  loop, or the memory store's map. The route loads each state and profile.
- **Adding up.** `personFacts` (`lib/insights.ts`) reduces one person to a few
  facts: join date, whether they finished setup, their workout dates with
  cardio minutes and strength sets, and the workout date on which they crossed
  level 5, 10 and 15 (by replaying workout XP in date order). `aggregate` turns
  everyone's facts into group numbers. Only the group numbers leave the server:
  no names, emails, ids, sets or weights.
- **The 5 person rule.** Any group of 1 to 4 people is `null`, which the page
  draws as a lock. Below 5 people in total nothing else is returned either.
- **Range.** 4 weeks, 12 weeks or all time limits the weekly bars, workouts a
  week, how people train and which rank crossings count.

## Rendering and layout

- Every route is a static shell. Pages that depend on a person's routine ids
  (`/routine/[id]`) return an empty `generateStaticParams` so Next prerenders the
  shell once. A saved workout is opened by query, `/workout/view?id=` and
  `/workout/edit?id=`, so those pages stay static too. `/workout/settings` holds the
  workout settings, and `/insights` the owner's numbers. The ready-made routine previews (`/explore/[id]`) are prerendered
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
validation, the celebration queue, the plan migration, Insights (including the
5 person rule and the owner gate), and the store with an in-memory KV. There is
no component or browser test suite. Screens are checked by hand with
`docs/QA.md`.
