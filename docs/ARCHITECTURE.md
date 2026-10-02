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
| `app/` | Routes. Each page is a thin client component that reads a provider and composes components. `app/api/state/route.ts` is the data API for a person's own state, `app/api/insights/route.ts` is the owner-only Insights API, `app/api/invites/route.ts` manages the invite list with a secret key and `app/api/invites/status/route.ts` reads who has signed in and who has not (same key, read only), and `app/api/auth/` is Auth.js. `app/globals.css` holds every style. |
| `components/` | React components. `ProgressProvider.tsx`, `WorkoutSessionProvider.tsx` and `AppShell.tsx` sit at the top. Sub-folders per area: `ui/` (buttons, cards, sheets, dialogs), `nav/`, `home/`, `routines/`, `exercises/`, `workout/`, `victory/`, `celebrate/`, `rank/`, `profile/`, `goals/`, `stats/`, `calendar/`, `prefs/`, `onboarding/`, `insights/`. |
| `lib/` | Pure logic with no React and no browser access, so it is testable. Scoring, badges, the rank road, goals, units, the workout session, routine actions and validation, feed and stat builders. `feedback.ts`, `useToday.ts`, `useMediaQuery.ts` and `useBackToClose.ts` are the few browser-facing helpers. `migrations/planDays.ts` turns the old plan log into workouts. |
| `data/` | `exercises.ts`: the library, muscle groups, equipment and metrics. |
| `tests/` | Vitest, over `lib/` and the store. `tests/fixtures/` holds an old plan-era state for the migration tests. |
| `docs/` | This file, the roadmap, the design history, `design/` (the boards) and `screenshots/`. |
| `auth.ts` | Auth.js config: Google, who may sign in (`lib/signups.ts`), a dev-only email sign-in, and the session's `isOwner` flag. |

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

## Who may sign in

Sign-ups are open: any Google account can sign in, and a new person goes through onboarding.
The `SIGNUPS` env var is the switch. `SIGNUPS=invite` limits sign-in to `ALLOWED_EMAILS`, and any
value other than empty or `open` also means invite, so a typo closes sign-ups rather than opening
them (`signupMode` and `canSignIn` in `lib/signups.ts`, used by the `signIn` callback and the dev
provider). A refused sign-in lands on `/auth/denied`: in invite mode it says "Invite only" and
shows the Tally waitlist; while open it says "Couldn't sign you in" with Try again. The sign-in
card shows the waitlist only in invite mode. Changing `SIGNUPS` on Vercel needs a redeploy, and
sessions already signed in are not affected. While invite-only, a person may also sign in when their
email is on the app's invite list (see "The invite list" below). Google's own consent screen is "In production", so
Google allows any account; showing the Levl logo there needs Google's brand verification.

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

### Logging a workout done earlier

Log workout adds a workout the person already did. It starts in three places only: a button
on Home (`TodayCard`'s tiles on the phone, the Something else card on desktop), "Log workout"
in a routine's three-dot menu (with a New pill until 15 November 2026, `.wt-newpill`), and
"Log" on a routine's page. The shell has `openLog()` (the Start sheet in log mode, titled
"Log a workout") and a `mode` for `openCardio` and `openCustom`; the StartSheet,
CardioSheet and CustomWorkoutPicker take `mode: 'start' | 'log'`. The "finish or discard your
workout first" block in `AppShell` applies to start mode only, and the log-mode Start sheet
lists routines even while a workout is running.

Every path ends at `/workout/log` (a static page, like `/workout/edit`), which reads
`?routine=<id>`, `?cardio=<exercise id>` or `?ex=a,b,c`. `components/workout/LogWorkout.tsx`
builds the draft once from the data as it is on opening, with `logSession` in `lib/session.ts`:

- from a routine (`sessionFromRoutine`), a cardio activity (`cardioSession`, no clock follows)
  or picked exercises (`customSession` with last time's numbers when the prefill pref is on);
- sets that have numbers (they would earn XP: `setXp > 0`) come in ticked, and a blank set stays
  unticked. A picked exercise with no history keeps its blank set unticked, so a placeholder never
  earns XP. A run counts once its Time is typed;
- an unknown routine shows a not-found card, and a bad activity or an empty pick says why.

The form body is shared with Edit workout, not copied: `components/workout/WorkoutForm.tsx`
(title, Date and time with its modal, Duration, exercise blocks with laps, Add exercise, Notes,
the exercise menu, the picker and the info sheet) plus `useWorkoutDraft` (the session and a ref
to the latest copy). Edit passes its info line, its Delete block and its own empty text; Log passes
none of the first two. `when` is the time the workout finished, as in Edit, and starts an hour ago
rounded down to 5 minutes (`defaultLogWhen`). Duration starts at `estimateMinutes` of the draft and,
for a cardio-only log, follows the cardio Time (`cardioMinutesLogged`) until the stepper is used.

Save runs `buildLoggedWorkout` (the day is the day of `when`, the start is `when` minus the
minutes and at least the cardio minutes on a cardio-only workout, a time that has not happened
yet is refused, the plan is kept as Finish keeps it) and then `logWorkout(input)` in the
`WorkoutSessionProvider`. It mirrors `finish()`: `saveWorkout` with `celebrate: false`, then
`lastFinished` is set with `logged: true`, then the route is replaced with `/workout/done`.
It never reads or writes the workout in progress, so a live workout is untouched. XP is derived
as ever, so the workout counts on the chosen day and rescoring is the same as for any edit. On
Victory, a logged workout starts with "Save weights to <routine>" off and applies nothing by itself.
There is no stored-state change, so no migration and no backup key. A Log screen left half done is
not kept.

### Laps on a run

A distance cardio set (`distance_time`) can carry `laps?: Lap[]`, with
`Lap = { sec: number; km?: number }` (`LoggedSet` in `lib/routines.ts`). The run keeps its
own total `min` and `km` on the same set, so XP, records and "beat last time" never read
laps: a run is judged on its whole time and distance. Limits: up to 200 laps a set, `sec` a
whole number from 1 to 86,400, `km` from 0 to 100.

The field is optional and additive, so **there is no migration and no backup key**: every
workout saved before laps is valid as it is, and the server never writes `laps` unless the
client sent some. `lib/laps.ts` holds the pure helpers (`closeLap`, `lapTotals`,
`fastestLap`, lap time formatting and parsing, the chart heights, the distance chips).

Every path a set passes through keeps laps, so anything new that rebuilds sets field by
field has to be checked:

- `parseLoggedSets` in `lib/routineValidation.ts` (save and edit both use it). It rejects
  laps on any other metric.
- `cleanSet` in `lib/session.ts` (finishing and saving an edit). It drops laps that have no
  time, which is how an added row left empty is not saved.
- `parseStoredSession` (the workout in progress on the device) and `sessionFromWorkout`
  (Edit workout).
- `updateRoutineFromWorkout` strips laps, and `lastWorkoutSets` (prefill) never copied them:
  a routine plans numbers only.

The live Lap button is `addLap` in `lib/session.ts`. It stamps the seconds since Start minus
the laps already stamped and leaves the Time following the clock. The run's Distance follows
the laps (`followLaps`) only while it is nothing but their sum and every lap has a distance, so
a warm-up lap without one stops the filling and a typed distance never moves. The lap distance chip is
component state in `CardioFields`, not stored. The running lap row ticks from the one clock
`LogScreen` already has (`useNow`), passed down as `elapsedSec`.

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
rules are the XP Rulebook (`docs/design/xp-reference.html`), called rules v3:

- **Set XP** (`setXp` in `lib/routines.ts`): 5 per ticked strength set with a
  rep or a 5 second hold, cardio 1 XP a minute (30 at most a set) plus 10 with a
  distance, an interval set its work plus easy minutes (also capped at 30).
- **Beat last time (+10) and records (+25)**, once per exercise per workout. A
  record replaces the beat. The first time an exercise shows up earns neither.
- **Daily bonus**: +50, once a day, on the workout that takes the day's
  training to 20 minutes. Every workout of that date adds up, strength and cardio
  together: a ticked strength set that earns XP counts 3 minutes, cardio counts
  its minutes (intervals work plus easy, not capped, only the XP is). The plan
  does not matter. A date that reaches 20 minutes is a **training day**. The
  amount is stored in `xpParts.finish`, the key the old finish bonus used, so
  no stored data had to move. `WORKOUT_XP` in `lib/routines.ts` holds the numbers.
- **Weekly goal** (rules v4): on the workout that makes a Monday to Sunday week's
  count of training days reach the weekly goal, +50 the first week and +10 more for
  each week in a row the goal is met, up to +100 from week 6 (`weeklyGoalXp(run)`
  in `lib/routines.ts`, with `weeklyGoalStep` and `weeklyGoalMax` in `WORKOUT_XP`).
  A week that does not reach the goal, even one with training, starts the run again
  at +50. `scoreWorkouts` keeps the run per week: when a workout makes its week reach
  the goal, the run is the previous week's run plus one (0 if that week missed).
  Workouts are scored in date order, so the previous week is final by then. The run
  is stored next to the amount as `xpParts.weekRun` (only when `weekly` is more than
  0). The goal is the current `prefs.weeklyGoal` applied to every week, so changing
  it checks the runs again. Every goal week paid +50 under v3, so XP never goes down.
- **Comeback**: +25 on the first training day after a whole Monday to Sunday week
  with none, never for a person's first training day (`xpParts.comeback`, a
  missing value reads as 0).
- Workouts are scored in date order by `scoreWorkouts` and `rescoreWorkouts` in
  `lib/workoutScoring.ts`. Beat, record, the daily bonus, the weekly goal and the
  comeback depend on the workouts around them, so after any save, edit or delete
  the server scores all workouts again, and deleting or moving one re-scores the
  rest. `trainingDays`, `trainingDaysOf`, `trainingMinutes`, `dayMinutes` and
  `dailyBonusPaid` are the helpers the screens use: the training days of a state,
  and the minutes a date has so far (saved workouts plus the one in progress).
- **Where the daily bonus shows.**
  - *The XP popover while logging* (`dailyBonusLive` in `lib/liveStats.ts`) says
    "N of 20 min today" from today's saved workouts plus the live sets,
    "Daily bonus earned" once the total reaches 20, and "Already earned today"
    when a saved workout already paid it.
  - *The Victory screen and the workout page* (`bonusLines` in `lib/victory.ts`,
    used by `xpLines` and by `xpBreakdown` in `lib/history.ts`) list the daily
    bonus, the comeback and the weekly goal. A daily bonus of 0 says why: already
    earned today, or N of 20 min today. The Weekly goal line says "3 of 3 training
    days, 4 weeks in a row" from the second week in a row (`weekRun`), else "this
    week". The Finish dialog only warns about unticked sets.
  - *Every day view* uses one rule, `dayRules` and `dayKind` in `lib/week.ts`:
    a day is `training`, `rest` or `open`. Rest is a past day without a training
    day on or after the first logged workout, or a day still to come this week
    once the weekly goal is met. Today stays open until it is a training day, and
    days before the first workout are open. `weekSummary` returns the rules, and
    the Home week strip (`weekDots`), the Calendar, the Profile month strip and
    the Statistics day chips (`last7Days` in `lib/muscleStats.ts`) all read them.
    The Calendar adds a dot on days with a workout under 20 minutes.
    `comebackPending` drives the "Comeback bonus" hint on the Today card:
    last week and this week have no training day and an earlier one exists.
  - *The weekly goal bonus on Home* is `goalRun` in `lib/week.ts`, returned by
    `weekSummary` as `goalRun`: the weeks in a row up to last week, whether this
    week is met, what this week pays and what next week pays. It reads the same
    training days and the same `weeklyGoalXp` ladder as scoring, and a test checks
    that the two agree. `goalRunText` words it and `WeekCard` shows it under the
    streak row: "Goal bonus this week: +80 XP" with "Goal met 3 weeks in a row", or
    once met "Goal met 4 weeks in a row: +80 XP" with "Next week pays +90 XP".
  - *XP bars* show XP into the level over what the level takes (`xpIntoLevel` in
    `lib/progress.ts`), never the running total. The Rank Road's level rows show
    the XP to go (`LevelRow.xpToGo` in `lib/rankRoad.ts`).
- **Training days drive the rest.** `weeklyStreaks` takes training-day dates, and
  the weekly goal, the Finisher, Month Clear, Goal Month and Streak Keeper badges,
  and the workouts and weekly streak goals all count training days. A day under
  20 minutes still earns its XP but is not one.
- **The plan snapshot.** A workout carries `plan`, the exercises and set counts it
  set out to do, taken at Start (the routine, or the exercises picked before
  Start). Swapping moves a plan slot. Removing and adding do not change it, so a
  workout cannot shrink its own plan. The plan decides only the Clean Sweep badge
  (and `planComplete` and `planMissing`), never any XP. A workout saved before v8
  has no `plan`, and its own ticked sets stand in as the plan. `marks`,
  `xpParts`, `planComplete` and `planMissing` are
  derived and written by `rescoreWorkouts`. The server ignores what a client
  sends for them.
- `totalXp` in `lib/progress.ts` adds workout XP, badge tiers, monthly and special
  badges, weigh-ins and goal rewards. Levels come from
  `xpForLevel(n) = 50 * n * (n - 1)`.
- Badges (`lib/badges.ts`) come from time series over the workouts.
  `lib/badgeCards.ts` turns them into cards. The plan-only badges are retired.
- Goals (`lib/goals.ts`) count training days (the stored type id is still
  `workouts`) logged after the goal's `createdAt`. The
  server stamps `achievedAt` the first time a goal is met, and a stamped goal
  stays achieved even if a workout is later edited or deleted.
- **Rules notes.** `AppState.rulesV2Note` is set once by the store for a person
  who already had workouts or plan days, so Home can say "XP was worked out
  again with the new rules". `rulesV3Note` does the same for the daily bonus
  rules, and `rulesV4Note` for the growing weekly goal bonus: true when the state
  has workouts the first time it is read, false otherwise. Seeing a note sets its
  flag to false (`setRulesNote`, `setRulesV3Note`, `setRulesV4Note`). Home's
  `RulesNote` shows the newest note that is waiting (v4, then v3, then v2) and
  "Got it" clears every waiting one. The pass that sets `rulesV3Note` or
  `rulesV4Note` also works the stored `xp` and `xpParts` of every workout out
  again, so the workout pages match the new rules at once. Before the v4 pass
  rescores a state that has workouts, it copies the state as it was to
  `wt:user:{id}:backup:v11`, only if that key is free. Reading again changes nothing.

## Storage

Redis keys, all per person (`{id}` is the Google account id):

| Key | Content |
|---|---|
| `wt:user:{id}:state` | The whole `AppState` document, `version: 2` |
| `wt:user:{id}:profile` | Email, name, photo, created time (`createdAt` is the join date Insights uses) |
| `wt:user:{id}:backup:v7` | The state exactly as it was before the plan days became workouts, written once and never changed |
| `wt:user:{id}:backup:v11` | The state exactly as it was before the weekly goal bonus started to grow (rules v4) and the stored XP was worked out again. Written once, only for a state that had workouts, and never changed |
| `wt:invites` | The invite list: a de-duplicated array of trimmed, lowercased emails. Server only |
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

`rulesV2Note` is set in the same pass (and `rulesV3Note` and `rulesV4Note`, see the rules notes above). `tests/planMigration.test.ts` and
`tests/store.test.ts` cover the migration, the backups and idempotence, and
`tests/xpIntegrity.test.ts` checks that a rules change never lowers XP (see
"XP integrity check" in `docs/AGENTS.md`).

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
  `wt:user:*:state` and `wt:user:*:profile` key: an Upstash `scan` with a match
  pattern and a cursor loop, or the memory store's map. The profile key counts
  because someone who signed in and left before saving anything has a profile and
  no state; they read as a new person (no workouts, not set up). The route loads
  each state and profile.
- **Adding up.** `personFacts` (`lib/insights.ts`) reduces one person to a few
  facts: join date, whether they finished setup, their workout dates with
  cardio minutes and strength sets, and the workout date on which they crossed
  level 5, 10 and 15 (by replaying workout XP in date order). `aggregate` turns
  everyone's facts into group numbers. The group numbers carry no names, emails,
  ids, sets or weights.
- **The group minimum.** Any group smaller than the minimum is `null`, which the
  page draws as a lock, and below the minimum in total nothing else is returned.
  The minimum is 5 while sign-ups are open and 1 while `SIGNUPS=invite`
  (`minGroupFor`), chosen by the server route and returned as `min` so the page
  words its locks and note to match. The note under the cards says the group
  numbers show no names and that the People card is the one place that names
  people, and it never shows sets or weights.
- **Activation, last workout, how workouts were made, invites.** Activation is
  signed in, set up, first workout, a second training day, active in week 2.
  Last workout buckets everyone by days since their last workout (today, 1 to 7,
  8 to 14, over 14, never). How workouts were made counts workouts in the range
  as started live, logged afterwards (the `source` field below) and runs with
  laps. Invites shows how many emails are on the list and how many of them have
  signed in: the route matches the list against each person's profile email on
  the server and only the two counts are returned.
- **People.** The one part of the response that names people, for the owner who
  runs Levl and wants to ask friends for feedback. The route builds a row per
  person with `personRow(state, profile, today)` and returns them sorted by
  `sortRoster` as `roster` (`people` is already the count in the group numbers).
  A row holds name, email, join date, whether they finished setup, level and rank
  (from `computeProgress`, so they match what the person sees), the date of their
  last workout and whole days since, training days in the last 7 days, workouts in
  the last 30 days and workouts in total. Both windows end today and include it.
  A row never holds a set, rep, weight, body weight, note, goal, joint limit,
  photo, id or anything else from inside a workout; a test pins the exact keys.
  `invitedNotJoined(invites, allowed, joinedEmails)` returns `invitedNotJoined`:
  the emails on the invite list or in `ALLOWED_EMAILS` that no profile uses yet,
  normalised and sorted. The card (`components/insights/PeopleCard.tsx`) is a table
  from 1100 px up and a stacked list below, with a "Not set up" tag, "No workout
  yet" for people who never trained (they sort last), and the invited emails as
  selectable text. It shows even when the group minimum is not met, because it
  needs no hiding: it names people on purpose. The Privacy Policy (section 3)
  says the owner can see these details and nothing more.
- **Range.** 4 weeks, 12 weeks or all time limits the weekly bars, workouts a
  week, how people train and which rank crossings count.

## The invite list

While `SIGNUPS=invite`, `auth.ts` lets an email in when it is in `ALLOWED_EMAILS` or in the
invite list at `wt:invites` (`canSignIn`'s fourth argument). The list is read only on the
server, only in invite mode, and only at sign-in. If it cannot be read, nobody extra gets in.
It is never sent to a browser, except that the owner's Insights People card lists the emails on it
that have not signed in yet (`invitedNotJoined`).

`/api/invites` is how the owner edits it from chat. It is a dynamic API route, so pages stay static. `/api/invites/status` is a read only view for the owner's invite routine: per signed-in person the name, email, joined day, workout count and last workout date, plus the emails still waiting. It never returns what anyone trained.
- Every call needs `Authorization: Bearer <INVITE_KEY>`. The key is compared in constant time
  (both sides hashed, then `timingSafeEqual` on equal-length buffers). With `INVITE_KEY` unset,
  or a missing or wrong key, the answer is a bare 401.
- `GET` returns `{ emails, count }`. `POST { add?, remove? }` returns `{ added, removed, count }`,
  where `added` and `removed` count real changes, so repeating a call returns zeros. Emails are
  validated and lowercased, at most 200 per call, and an invalid one rejects the whole call (400).
- A small in-memory limiter allows 30 calls a minute per IP (429 after that). It is per server
  instance, which is enough for one owner. Emails are never logged.
- Why it is safe: the route is server-only and behind a secret that lives in an env var. The list
  is never in any response except to the key holder, and to the owner for the emails that have not
  signed in yet (the People card). The group numbers only ever get counts.
- Pure helpers (`lib/invites.ts`) hold the validation, the add and remove rules, the key check and
  the limiter. `lib/store.ts` reads and writes the list.

## Workout source

A saved workout has an optional `source: 'live' | 'log'`. Finish sets `live` (`buildWorkoutInput`),
Log workout sets `log` (`buildLoggedWorkout`). The server (`parseWorkoutInput`) refuses any other
value, and edits never touch it. A workout saved before this existed has none and counts as live,
so there is no migration.

## How it felt

A saved workout has an optional `feel: 'rough' | 'tough' | 'ok' | 'good' | 'great'` and an optional
`effort`, a whole number from 1 to 10. Both are additive, like `source`, so there is no migration, and
neither earns XP: scoring never reads them and the XP breakdown is the same with or without them.
- **Validation.** `parseWorkoutInput` refuses any other value (the Edit and Log screens do not send them,
  but the API still checks). `parseWorkoutPatch` takes them on `updateWorkout`, where `null` clears one and
  the other stays. `rescoreWorkouts` spreads the rest of the workout, so they survive rescoring, and
  `buildWorkoutPatch` never sends them, so editing a workout never touches them.
- **Pure logic, `lib/feel.ts`.** `FEELS` (key, label and the colour token), `isFeel`, `isEffort`,
  `effortWord` (1 to 3 Easy, 4 to 6 Moderate, 7 and 8 Hard, 9 and 10 All out), `effortReadout`
  ("6, Moderate"), `feltPhrase` ("Felt good") and `feelSummary(workouts, today)`: counts per face, the
  effort average (over workouts with an effort only, one decimal), how many have an effort and how many
  were rated at all, over the last 30 days (today and the 29 before it).
- **Colours.** The five face colours and the picked-face tint are tokens at the top of `app/globals.css`
  (`--feel-rough` to `--feel-great`, `--feel-pick`, `--feel-pick-line`). `FEELS` holds them as
  `var(--feel-...)`, so the faces, the Profile bar and its legend read one set.
- **Where it is set, and nowhere else.** `components/workout/HowItFelt.tsx` is the control (five faces with
  `aria-pressed`, tap the picked one to clear; "Add effort" opens a 1 to 10 slider at 6, "Remove" clears it).
  The slider saves once when a drag ends (the native change event), not on every step. Victory uses it in its
  own card between the level card and Workout details and saves with its existing `edit(patch, true)`. The
  workout page uses it too and calls `updateWorkout` on tap: after Exercises on a phone, above Notes in the
  side column on a wide screen. Edit and Log do not have it.
- **Where it shows.** `FeedItem.feel` puts a small face (`components/ui/FeelFace.tsx`, labelled "Felt good")
  beside the title in `WorkoutCard`, which Home, Profile and the Calendar all use. Profile has a
  "How workouts felt, last 30 days" card (`components/profile/FeelCard.tsx`) under the weekly chart: a bar
  in the five colours, the legend with counts and "Effort average 6.4 of 10, on 9 rated workouts". It is
  hidden when nothing in the last 30 days has a face or an effort.
- The Notes placeholder on Victory, Edit and Log reads "Anything to remember?", so "How did it feel?" is
  asked once.

## Rendering and layout

- Every route is a static shell. Pages that depend on a person's routine ids
  (`/routine/[id]`) return an empty `generateStaticParams` so Next prerenders the
  shell once. A saved workout is opened by query, `/workout/view?id=` and
  `/workout/edit?id=`, and a workout to log by `/workout/log?routine=`, `?cardio=` or `?ex=`,
  so those pages stay static too. `/workout/settings` holds the
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
validation (including how it felt), the celebration queue, the plan migration, Insights (including the
5 person rule and the owner gate), and the store with an in-memory KV. There is
no component test suite. Screens are checked two ways:

- `npm run qa` (`scripts/qa/`): starts the dev server, signs in over HTTP with
  the dev provider, seeds a known state through `/api/state` (workouts
  `qa-strength`, `qa-run`, `qa-ride`, `qa-mixed`, `qa-short`, weights, a goal, a routine),
  screenshots the given routes at 390 and 1440 px, and reports console errors
  and horizontal overflow. `withApp` in `scripts/qa/lib.mjs` gives a signed-in
  page for flows such as finishing a workout.
- `docs/QA.md` for what only a person or a real phone can judge.

The test policy (related tests while coding, `npm run verify` before every
commit, the build before a push, screenshots only for touched screens) is in
`CLAUDE.md`. CI runs `verify` and the build on every push.
