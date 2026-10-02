# v11 plan: laps, then logging a past workout, how it felt and consistency

(v10, v10.1, v10.2 and open sign-ups are done and on `main`.)

## Context
A runner who uses Levl asked for laps back. Laps were removed in v8 to keep the run card simple, but people who train for pace use them every run. Board 10 (`docs/design/10-runs-logging-board.html`) also covered logging a workout done earlier, how a workout felt, and a reward for training week after week. Laps shipped first. Log workout was signed off in round 3.

## Stages
1. **Laps** (done, live since 2 October 2026).
2. **Log workout**: add a workout you already did (signed off in board 10 round 3).
3. **How it felt**: faces plus an optional effort score after finishing, no XP (signed off in round 1).
4. **Consistency**: the weekly goal bonus grows with each week in a row the goal is met, +50 then +10 a week up to +100 (signed off in round 1; the Home line chosen on 2 October 2026).

## Stage 1: laps

### Signed-off decisions
- **A live Lap button**, like a running watch. While a run, walk or ride is live and its Time follows the clock, tapping **Lap** stamps the time since the last lap.
- **Lap distance is optional and off by default.** Chips above the table: **No distance** (the default), **400 m**, **1 km**. In miles: No distance, 0.25 mi, 1 mi. The chosen distance applies to every lap stamped after it.
- **Rows stay editable.** A stamped lap's time and distance can be corrected or the lap removed, during the run and later in Edit workout.
- **Records and XP judge the whole run.** The run keeps its total time and distance in the set (`min`, `km`), so XP, records and "beat last time" are unchanged. A fast 400 m lap never counts as a record against a 10 km run.

### Data
- `LoggedSet` (`lib/routines.ts`) gains `laps?: Lap[]`, with `export type Lap = { sec: number; km?: number }`. Only a `distance_time` set carries laps, and only its first set (the cardio card shows one set).
- The field is optional and additive. Old workouts are valid as they are: no migration and no backup key. Say so in `docs/ARCHITECTURE.md`.
- Limits: up to 200 laps a set; `sec` a whole number from 1 to 86,400; `km` from 0 to 100, optional.
- Every path a set passes through keeps laps:
  - the server's `parseLoggedSets` (`lib/routineValidation.ts`), used by both saving and editing;
  - `cleanSet` in `lib/session.ts` (today it keeps only `SET_FIELDS`);
  - `parseStoredSession` (the in-progress workout on the device);
  - `sessionFromWorkout` and `buildWorkoutPatch` (Edit workout).

  Anything that rebuilds sets field by field must be checked.

### Pure helpers, new `lib/laps.ts`
- `closeLap(laps, elapsedSec, km?)`: the next lap, with `sec` equal to the elapsed seconds minus the laps already stamped. It returns null when that is under 1 second, which stops a double tap from adding an empty lap.
- `lapTotals(laps)`: the count, seconds and km.
- `fastestLap(laps)`: the index of the fastest lap.
  - When any lap has a distance, it is ranked by pace among the laps with a distance.
  - Otherwise it is ranked by time.
  - It returns null for fewer than 2 laps.
- Formatting:
  - lap times as `m:ss` (`h:mm:ss` from an hour);
  - pace and speed through the existing `cardioRate` (`lib/liveStats.ts`), with `sec / 60` as minutes.
- The run's distance follows the laps while it is only their sum (empty, or equal to the laps' distance before a change). It becomes the new sum when every lap has a distance, and goes back to empty when no lap has one. A lap without a distance (a warm-up) stops the filling, so the run never looks shorter than it was. A distance the person typed is never overwritten. (Changed after QA: the first build filled the distance from some laps only, which gave a wrong pace.)

### Session (`lib/session.ts`)
- **New functions:**
  - `addLap(session, index, now, km?)` stamps a lap on the cardio card at `index` using `closeLap`, with the elapsed time from `session.startedAt`. It does not take the Time off the clock.
  - `updateLap(session, index, lapIndex, patch)` and `removeLap(session, index, lapIndex)`.
- **Lap distance choice:** kept in component state in `CardioFields`. It is not stored: a reload resets it to No distance, and the laps already stamped keep theirs.
- **Finish** keeps the laps as stamped. The time after the last lap stays in the run's total and is not turned into a lap. A short last lap would otherwise show as the fastest.

### Screens
- **Live (`components/workout/CardioCard.tsx` `CardioFields`, used by `ExerciseBlock` in `LogScreen`):**
  - while `follow` is true, a full-width **Lap** button at the standard size (`wt-btn`, 48 px) sits under the Time and Distance fields, with the lap distance chips above the table;
  - the table columns are Lap, Time, Distance (in the person's unit) and Pace (Speed for a ride);
  - the fastest lap is marked "Fastest" (green row tint, as on the board);
  - the lap that is running shows last, in green, with its time ticking;
  - the stamped rows' Time and Distance are inputs, and each row has a remove button the same as a set row in `SetTable`;
  - the hint "Time follows the clock until you type in it." stays;
  - once the Time is typed in (follow ends), the Lap button and the running row go, and the stamped laps stay editable.
- **Edit workout (`EditWorkout.tsx`, `follow: false`):** the same lap table, without the running row, plus a **+ Add lap** text button under it. An added lap starts empty and saves only once it has a time.
- **Workout page (`WorkoutView.tsx`):** for a set with laps, under the run's totals:
  - the line "5 laps · fastest lap 2, 4:05 /km" (or by time when the laps have no distance: "5 laps · fastest lap 2, 1:38");
  - a small bar chart, one bar per lap, taller is faster, the fastest in green;
  - the table, read only.
- Buttons are the app's sizes: Lap is a standard `wt-btn`; "+ Add lap" is a text button. No new oversized buttons.

### Tests (one per rule, `tests/laps.test.ts` and the existing session and validation tests)
- `closeLap` subtracts the earlier laps and refuses a lap under 1 second.
- `fastestLap` ranks by pace when laps have a distance, by time when none do, and is null for one lap.
- `lapTotals` adds up time and distance.
- Stamping a lap with a distance fills an empty run distance, and leaves a typed one alone. A warm-up lap with no distance stops the filling. Correcting or removing a lap moves a filled distance with it.
- `addLap` keeps the Time following the clock.
- Validation accepts good laps and rejects:
  - more than 200 laps;
  - a lap time of 0, a fraction or over 86,400;
  - a distance out of range;
  - laps on a metric other than `distance_time`.
- A saved and re-read session keeps its laps (`parseStoredSession`). `buildWorkoutInput` keeps the laps.
- A run with laps scores the same XP, record and beat as the same run without laps.

### Docs
- `docs/design/xp-reference.html` (the rulebook): one line under cardio, "Laps never change XP or records: a run is judged on its total time and distance."
- `docs/ARCHITECTURE.md`: the laps field and why there is no migration.
- `docs/QA.md`: a real-phone check: start a run, lock and unlock the phone, tap Lap a few times, then Finish and open the workout.
- `docs/ROADMAP.md`: v11 stage 1 done.
- `docs/DESIGN_HISTORY.md`: board 10 round 1 laps pick is built.

### Done when
- `npm run verify` passes and `next build` succeeds.
- The QA flow works at 390 and 1440, with no console errors and no overflow: start a Run from the Cardio sheet, tap Lap three times (the dev clock can be faked by moving `startedAt`), finish, open the workout page, then Edit and add a lap.

## Stage 2: Log workout

### Signed-off decisions (board 10 round 3)
- **Start stays exactly as it is.**
  - The Workout button's sheet is unchanged (S1).
  - Every other start point stays Start only.
- **Log appears in three places only:**
  - **Home:** a secondary button, full width, 48 px, under the Today card's three tiles (H1). It shows before and after today's workout. On desktop it goes in the Something else card, under Choose, at the same width.
  - **A routine's menu** (Routines tab, the three dots): "Log workout" first, with a New pill.
  - **A routine's page:** Edit, Log and Start, three equal buttons. "Start routine" becomes "Start".
- **The words** are "Log workout" (the user's "keep it simple"), in the app's sentence case like "Start workout". The routine page's button is "Log".
- **The Log sheet** (from Home) is the Start sheet, element for element, titled "Log a workout":
  - routine rows have a small secondary Log button;
  - Run, Walk and Ride open the Cardio sheet with "Pick an activity, then log." and a "Log workout" button;
  - Custom workout reads "Pick exercises, then log", and the picker's button is "Log workout · N".
- **The Log screen** is the Edit workout screen, titled "Log workout", with Cancel and Save:
  - **Date and time** starts an hour ago, rounded down to 5 minutes. It is the time the workout finished, as in Edit. A future time is not allowed.
  - **Duration** starts at the routine's estimate. For a cardio-only log it follows the cardio Time until the person changes it.
  - **Sets that have numbers come in ticked.** Untick one to leave it out. A set without numbers stays unticked, so it never earns XP. A run counts once its Time is typed, and "+ Add lap" adds lap rows.
  - "+ Add exercise", Swap, Remove and Notes work as in Edit.
  - There is no "XP is worked out again" line and no Delete. The empty state reads "No exercises yet" and "Add what you did, one exercise at a time."
- **After Save** the Victory screen plays, as after Finish: XP, records, level and badge moments. The workout's XP lands on the chosen day, rescored like any edit.
- **Logging never touches a workout in progress.** Log can be used while one runs.

### Build
- **Pure logic, `lib/session.ts`:**
  - `logSession(source, now, lookup, prefill?)` makes the draft from a routine (`sessionFromRoutine`), a cardio activity (`cardioSession`, with no clock following) or picked exercises (`customSession` with last time's numbers). It ticks the sets that have numbers.
  - `defaultLogWhen(now)` is an hour ago, rounded down to 5 minutes.
  - `buildLoggedWorkout(session, { when, minutes, notes, now, lookup })` returns the saveWorkout payload:
    - `date` is the day of `when`, `finishedAt` is `when`, and `startedAt` is `when` minus the minutes;
    - a future time is refused with "Pick a time that has already happened.";
    - a cardio-only workout lasts at least its cardio minutes;
    - the title falls back to the default;
    - the plan is kept as Finish keeps it;
    - "Tick at least one set first." when nothing is ticked.
- **Route:** `/workout/log`, a static page (Suspense, like `/workout/edit`). It reads `?routine=<id>`, `?cardio=<exerciseId>` or `?ex=a,b,c`. An unknown routine shows the not-found state.
- **The form:** the Edit workout form body is shared between Edit and Log, not copied.
- **Saving:** a provider method `logWorkout(input)` saves with `celebrate: false` and sets `lastFinished` with `logged: true`, then replaces the route with `/workout/done`.
- **Victory:** for a logged workout, "Save weights to <routine>" starts off and is not applied by itself, because an old workout's weights should not overwrite the routine.
- **Shell:** `openLog()` (the Start sheet in log mode), plus a mode for `openCardio` and `openCustom`. The "finish or discard your workout first" block applies to start mode only.
- **New pill:** `.wt-newpill`, 24 px tall, 10 px padding each side, in the secondary gold. It shows until 15 November 2026.

### Changed after QA
- The live workout screen on the phone was also titled "Log workout". It is now "Workout", so the two screens are never confused.
- A workout lasts at least as long as the cardio in it, also when it mixes strength and cardio. Duration never shows less.
- The Log screen's date picker stops at today. Edit keeps a day ahead for time zones.
- On Victory and the workout page, a past day's daily bonus line says "that day" instead of "today".

### Not in this stage
- A Log screen left half done is not kept. It behaves like Edit.
- There is no warning when the same routine is logged twice on one day.
- How it felt and the growing weekly goal bonus are stages 3 and 4.

### Tests (one per rule)
- `logSession`:
  - it ticks only sets with numbers;
  - a cardio draft has no clock following;
  - picked exercises get last time's numbers.
- `defaultLogWhen`: an hour ago, rounding down, and across midnight.
- `buildLoggedWorkout`:
  - the date and start come from `when` and the minutes;
  - a future time is refused;
  - a cardio-only log is at least its minutes long;
  - the title fallback;
  - nothing ticked;
  - laps are kept.

### Done when
- `npm run verify` passes and `next build` succeeds.
- These flows work at 390 and 1440, with no console errors and no overflow, every button pair equal width, and buttons at the app's sizes only:
  - Home, then Log workout, then a routine, then Save, then Victory, then the workout page on the chosen day;
  - a Run with time and laps;
  - a custom workout with two exercises;
  - a routine's menu;
  - a routine's page;
  - Log while a workout is in progress.

## Stage 2b: invite-only launch kit (invites from chat, Insights for a small group)

### Signed-off decisions
- **Invite-only again**, with the list managed from the owner's chat instead of Vercel edits.
  - In invite mode a person may sign in when their email is in `ALLOWED_EMAILS` (kept) or in the app's invite list, Redis key `wt:invites`. That key is a set of trimmed, lowercased emails.
  - The list is read only on the server at sign-in. It is never sent to a browser and no page shows it.
- **`/api/invites`**, owner only by secret:
  - Every call needs `Authorization: Bearer <INVITE_KEY>`, compared in constant time.
  - With no `INVITE_KEY` set, or a missing or wrong one, the answer is 401 with no body detail.
  - `GET` returns `{ emails: [...], count }`.
  - `POST { add?: string[], remove?: string[] }`:
    - validates each email;
    - takes at most 200 per call;
    - is idempotent;
    - returns `{ added, removed, count }`.
  - Calls are rate limited (a small in-memory limiter is enough).
- **Insights for a small group:**
  - The lock threshold is 1 while `SIGNUPS=invite`, and 5 when sign-ups are open.
  - Still no names, sets or weights.
  - The note reads "Small groups are shown while Levl is invite-only. No names, sets or weights."
  - New numbers:
    - **Activation:** signed in, set up, first workout, a second training day, active in week 2 after joining.
    - **Last workout:** today, 1 to 7 days ago, 8 to 14 days ago, more than 14 days, never.
    - **How workouts were made** (in range):
      - started live;
      - logged afterwards;
      - runs with laps.

      A new optional `source?: 'live' | 'log'` on saved workouts is set by Finish and by Log workout. It is validated on the server, and an old workout without it counts as live, so there is no migration.
    - **Invites:** how many are invited, and how many of those have signed in. Counts only.

### Tests (one per rule)
- `canSignIn` with the union of both lists, ignoring case and spaces.
- The invite route:
  - refuses no key, a wrong key, and an unset `INVITE_KEY`;
  - validates emails;
  - add and remove are idempotent;
  - refuses more than 200.
- `source` is accepted and refused correctly, and is defaulted.
- Each new Insights number, and the threshold switching with the mode.

## Stage 3: How it felt

### Signed-off decisions (board 10 round 1, option c)
- **Five faces, drawn as SVG, no emoji.** Rough, Tough, OK, Good and Great, from frown to big smile, as in the board's script (`docs/design/10-runs-logging-board.html`, the `FEELS` list). Colours: Rough `#E5534B`, Tough `#F08A3C`, OK `#E8B83A`, Good `#7BC74D`, Great `#2BA438`, as tokens at the top of `app/globals.css`.
- **The control**, titled "How did it feel?":
  - the five faces in a row with their labels under them, one tap each. The picked face is tinted as on the board. Tapping it again clears it. Each face is a button with `aria-pressed`;
  - a dashed in-card "+ Add effort (1 to 10)" button, like "+ Add set". It shows the slider at 6 and saves 6;
  - the slider reads "6, Moderate". The words: 1 to 3 Easy, 4 to 6 Moderate, 7 and 8 Hard, 9 and 10 All out. A "Remove" text button clears the effort;
  - everything is optional and nothing earns XP.
- **Set in two places only:**
  - **Victory**, in its own card between the level card and Workout details. Finish and Log workout both end there, and it saves on tap like the date;
  - **the workout page**, the same control, saving on tap. On a wide screen it sits in the side column above Notes; on a phone, after Exercises.

  Not on Edit or Log, so there are only two places to set it.
- **Shown:**
  - in workout rows (Home, Profile, Calendar), a small face next to the title;
  - on Profile, a "How workouts felt, last 30 days" card next to the weekly chart: a bar in the five colours, the legend "Rough 1, Tough 2, OK 3, Good 5, Great 4" and "Effort average 6.4 of 10, on 9 rated workouts". It is hidden when nothing was rated in the last 30 days.
- **Notes** placeholders read "Anything to remember?" instead of "How did it feel?", so the question is asked once.

### Build
- **Data:** `feel?: 'rough' | 'tough' | 'ok' | 'good' | 'great'` and `effort?: number` (a whole number 1 to 10) on `WorkoutLog`. Both are optional and additive, like `source`, so there is no migration. They are validated in `parseWorkoutInput`, and in `parseWorkoutPatch` where `null` clears them, like `notes`.
- **Pure logic, new `lib/feel.ts`:** `FEELS` (key, label, colour), `effortWord(n)` and `feelSummary(workouts, today)` (counts per face, average effort and the number rated, over the last 30 days).
- **UI:** a new `components/workout/HowItFelt.tsx`, used by Victory and the workout page; `feel` on `FeedItem` for the row face; the Profile card.

### Tests (one per rule)
- Validation: each face and effort 1 to 10 are accepted; anything else and decimals are refused; `null` clears on edit and the other fields stay.
- `effortWord` at the edges of each band.
- `feelSummary`: the 30-day window, unrated workouts left out, the average over workouts with effort only, nothing rated.
- Scoring ignores how it felt.

## Stage 4: the growing weekly goal bonus (rules v4)

### Signed-off decisions (board 10 round 1, option a; Home line chosen on 2 October 2026)
- **The rule:** +50 the first week the weekly goal is met, +10 more for each week in a row it is met, up to +100 from week 6. A week without the goal met starts it again from +50, also a week with training that fell short of the goal. Weeks still run Monday to Sunday, the goal is still the current weekly goal (changing it checks past weeks again), and time away still never lowers XP. Every goal week paid +50 before, so nobody's XP goes down.
- **Home:** one line under the streak row of the This week card. Nothing else on Home changes.
  - Before the goal is met: "Goal bonus this week: +80 XP" and, when there is a run, "Goal met 3 weeks in a row".
  - After: "Goal met 4 weeks in a row: +80 XP" and "Next week pays +90 XP" (at the top, "Next week pays +100 XP").
- **Victory and the workout page:** the Weekly goal line shows the real amount, with "3 of 3 training days, 4 weeks in a row" from the second week in a row.
- **Settings:** "Reach your goal for +50 XP, and +10 more for each week in a row you reach it, up to +100."
- **A one-time note on Home** (the existing rules note): "The weekly goal bonus now grows with each week in a row. XP was worked out again." with Got it.

### Build
- `WORKOUT_XP` gets `weeklyGoalStep: 10` and `weeklyGoalMax: 100`, and `weeklyGoalXp(run)` gives the amount for the Nth week in a row.
- `scoreWorkouts` keeps the run per week. When a workout makes the week reach the goal, the run is last week's run plus one (0 if last week missed), and the bonus is `weeklyGoalXp(run)`. Workouts are scored in date order, so last week is final by then. `XpParts.weekRun` records the run next to `weekly`.
- `goalRun(...)` in `lib/week.ts` gives Home the run up to last week, whether this week is met, what this week pays and what next week pays.
- **Migration on read**, like the v3 pass: a state without `rulesV4Note` that has workouts is copied once to `wt:user:{id}:backup:v11` (only if that key is free), its stored XP is worked out again, and `rulesV4Note` is set. New people get `false`. When several rules notes are waiting, the newest shows and Got it clears them all.
- **XP integrity check** (the trigger in `docs/AGENTS.md`): a committed test replays `tests/fixtures/legacyPlanState.ts` and the QA seed, checks that XP under v4 is at least XP with every goal week at +50 and that the difference is the ladder, and prints an XP, level and rank table with `XP_REPORT=1`.
- **Docs:** `docs/design/xp-reference.html` becomes rules v4 (the Weekly goal row, the example, the levels table, a "v4 goes live" note); ARCHITECTURE, QA, ROADMAP, DESIGN_HISTORY and AGENTS follow.

### Tests (one per rule)
- The ladder +50 to +100 and the cap; a missed week resets; a short week resets; the first goal week after time away is +50; a workout logged into a past week extends the later run once rescored; changing the goal checks the runs again; still paid once a week, on the workout that reaches the goal.
- `goalRun` before and after the goal is met, and at the cap; it agrees with scoring.
- The Weekly goal sub-line with and without a run.
- The migration: rescored and flagged, the backup written once, a second read changes nothing, new people get `false`.

### Done when (stages 3 and 4)
- `npm run verify` passes and `next build` succeeds.
- At 390 and 1440, no console errors, no overflow, equal-width pairs and app button sizes: Victory after Finish and after Log, the workout page, Home (rows, This week before and after the goal, the rules note), Profile, Settings.
