# v11 plan: laps, then logging a past workout, how it felt and consistency

(v10, v10.1, v10.2 and open sign-ups are done and on `main`.)

## Context
A runner who uses Levl asked for laps back. Laps were removed in v8 to keep the run card simple, but people who train for pace use them every run. Board 10 (`docs/design/10-runs-logging-board.html`) also covered logging a workout done earlier, how a workout felt, and a reward for training week after week. Laps are signed off and ship first. The rest waits for board 10 round 3.

## Stages
1. **Laps** (signed off, this release).
2. **Log a past workout** (board 10 round 3, not signed off yet).
3. **How it felt**: faces plus an optional effort score after finishing, no XP (signed off in round 1, built after stage 2).
4. **Consistency**: the weekly goal bonus grows with each week in a row the goal is met, +50 then +10 a week up to +100 (signed off in round 1, built after stage 2).

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
- If the run's distance is empty when a lap with a distance is stamped, the run's distance becomes the laps' sum. A distance the person typed is never overwritten.

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
- Stamping a lap with a distance fills an empty run distance, and leaves a typed one alone.
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
