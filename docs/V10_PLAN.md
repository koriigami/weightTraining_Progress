# v10 plan: one daily bonus, training days, rest days, comeback

(The v9 share card and dev tooling are done and on `main`.)

## Context
The user lost a finish bonus because the routine's plan included a 15-minute Treadmill item. The message read "Treadmill isn't done, so this workout won't get the finish bonus". This is because:
- the routines seeded from the old 6-week plan (Push A, Legs, Pull B) end with a treadmill item;
- the Cardio tile makes a separate workout.

So cardio feels separate. The rules also allow 2 finish bonuses a day, which reads as "one for workouts, one for cardio".

There is also a loophole: removing an exercise mid-workout removes it from the plan (`lib/session.ts` ~183-195), so the plan stays complete and pays the full bonus.

The streak today is weekly: consecutive Monday to Sunday weeks with any workout (`weeklyStreaks`, `lib/workoutScoring.ts` ~447). The weekly goal counts plan-complete workouts. Rest days are not a concept.

The research favours:
- weekly streaks for lifting (Strava, Hevy, Peloton; ACSM, WHO and NHS recommend at least 2 strength days a week, with recovery);
- built-in slack;
- rewarding comebacks (the StepUp megastudy: +27% gym visits).

## Signed-off decisions
1. **Daily bonus, +50 XP, once a day:**
   - Paid when the day's training adds up to **20 minutes**: each ticked qualifying strength set counts 3 minutes, and cardio counts its minutes (intervals count on plus off).
   - All workouts that day combine, strength and cardio together.
   - It is paid on the workout that crosses 20 minutes.
   - No plan check: removing exercises, skipping a planned treadmill, or unticked sets do not matter beyond not counting.
   - It replaces the finish bonus (which was up to 50, at most 2 a day).
2. **Training day:** a day that reached 20 minutes. The weekly goal counts training days. +50 XP goes on the workout that makes the week's training-day count reach the goal.
3. **Streak:** stays weekly. Consecutive Monday to Sunday weeks with at least 1 training day, and the current week keeps it alive until it ends.
4. **Rest days and comeback:**
   - The Home week strip shows days off as "Rest", not empty.
   - **+25 XP comeback** on the workout that makes the first training day after a whole Monday to Sunday week with no training day. It is never paid for a person's first-ever training day.
5. **Rescore:** all history is rescored under the new rules (XP is derived). A one-time note reads "XP was worked out again with the new daily bonus", like v8's `rulesV2Note`.
6. **Roadmap, next scopes kept:**
   - in-app account deletion and data export;
   - an in-app feedback box;
   - retention analytics.

## Approach
- **`lib/routines.ts` `WORKOUT_XP`:**
  - Add `daily: 50`, `dailyMinutes: 20`, `minutesPerSet: 3` and `comeback: 25`.
  - Retire `finishCap` and `finishPerDay`.
- **`lib/workoutScoring.ts` `scoreWorkouts`:** keep the chronological pass, and per date accumulate `effortMinutes`, where effortMinutes = qualifying strength sets × 3 + cardio minutes.
  - **Daily bonus:** when the running total crosses 20 and the date is not yet paid, pay `daily` on this workout.
  - **Training day:** a date becomes a training day at that moment.
  - **Weekly goal:** the training-day count per `mondayOf(date)` uses the same moment for the goal, plus 50.
  - **Comeback:** at that moment, if no training day exists in the previous Monday to Sunday week and some earlier training day exists, pay `comeback`.
  - Export `trainingDays(scores)` or an equivalent, and `dayMinutes(state, date)` for the live view.
  - The `XpParts` key `finish` stays as the stored, derived field and now means the daily bonus (no data migration). Add `comeback`; a missing value reads as 0.
  - Update the header comment.
- **`weeklyStreaks`:** fed training-day dates, not any-workout dates.
- **The `planComplete` / `planMissing` / plan snapshot stays, only for the Clean Sweep badge.** Removing a planned exercise mid-workout no longer shrinks the plan (`lib/session.ts`); a swap still moves the slot. Clean Sweep then needs every planned exercise done.
- **Everything that counted plan-complete workouts moves to training days.** That includes:
  - the weekly goal;
  - `lib/goals.ts` "workouts" goals;
  - badges in `lib/badges.ts` (Finisher, Goal Month);
  - `lib/insights.ts`, if it uses plan completion.

  The builder checks each with grep for `planComplete`, `finishXp` and `finishPerDay`.
- **Copy and UI:**
  - **The live XP popover (`lib/liveStats.ts`):** "Daily bonus: 12 of 20 min today" including earlier workouts today, then "Daily bonus earned" once crossed or already paid.
  - **The Finish dialog:** drops the "won't get the finish bonus" plan message (`lib/finishSummary.ts`) and keeps the unticked-sets warning.
  - **Victory lines (`lib/victory.ts`) and workout-page lines (`lib/history.ts`):** "Daily bonus +50" or "Daily bonus already earned today", "Comeback +25", "Weekly goal +50". Remove the "Missed: X not done" line.
  - **The Home week strip:** past days without training show "Rest" in a calm style. Once the weekly goal is met, the remaining days show "Rest" too.
  - **The Home Today card:** when last week had no training day, show a hint, "Comeback bonus: +25 XP on your first training day".
  - **The one-time rules note**, with a new optional state flag set on read for people who have workouts, mirroring `rulesV2Note` in `lib/store.ts`.
- **Rulebook:** `docs/design/xp-reference.html` is the source of truth. Update it, add a small mock of the week strip and popover, republish it to its existing artifact URL (QjPR5Tes6iXn9AtQmqWsjX), and keep building.

## Stages (`levl-builder` per stage; `levl-ui-check` after stage 2; main conversation verifies and pushes)
- **0. Rulebook update** (main conversation): the rules above, worked examples (a lift of 5 sets plus a run of 10 minutes; a skipped treadmill; two workouts in a day; a comeback), the week strip and copy mock. Republish, then continue.
- **1. Scoring:** `WORKOUT_XP`, `scoreWorkouts`, training days, streak input, comeback, plan-shrink removal in `lib/session.ts`, and switching goals, badges and insights to training days.
  - Tests are one per rule:
    - a 20-minute bar from sets;
    - from cardio;
    - from a mix across two workouts;
    - once a day;
    - a skipped planned treadmill still pays;
    - removing an exercise does not change the bonus;
    - weekly goal on training days;
    - a streak with a 5-minute workout does not count;
    - comeback paid once, not for a first-ever day;
    - Clean Sweep needs removed exercises.
  - Update the existing tests that pinned 2 a day and plan-complete counting.
- **2. UI and copy:** the popover, the Finish dialog, Victory and history lines, the week strip "Rest", the comeback hint, the rules note.
  - QA routes: `/`, `/workout/view?id=@strength`, `/workout/view?id=@run`, `/profile`, `/rank` at 390 and 1440, plus a flow through `withApp` that finishes a workout and checks the Victory lines.
- **3. Docs:**
  - **ARCHITECTURE:** scoring section.
  - **DESIGN_HISTORY:** "Daily bonus and rest days (v10)".
  - **ROADMAP:** v10 done; the three next scopes listed under Next.
  - **QA:** checks.
  - **`docs/AGENTS.md`:** note that the "XP integrity check" trigger fired; the rulebook examples serve as its fixture.

## Verification
- `npm run verify` for each stage, and `npm run verify:full` before the push. CI is green on the branch.
- Stage 2: `levl-ui-check` screenshots of the touched screens at 390 and 1440, with no console errors or overflow. Victory shows "Daily bonus" and never "Missed".
- **Rescore sanity:** a script on `tests/fixtures/legacyPlanState.ts` prints XP, level and rank before and after, for the user to see the change. A day that lost the bonus to the treadmill now pays it, and a day with two bonuses keeps one.
- Push the feature branch. Merge to main only on the user's word (`levl-release`).

---

# v10.1 follow-up: rest days on every page, XP bar shows progress in the level

Signed off on 1 October 2026. Same branch as v10; both reach `main` together.

## Why
v10 made a training day a date that reaches 20 minutes and showed "Rest" on Home's
week strip. The Calendar, the Profile month strip and the Statistics day chips still
marked any workout day, so a 6 minute day was "Rest" on Home and green elsewhere, and
no other page showed rest. The phone XP bar showed total XP over the next threshold
("582 / 600") while desktop, Rank, Victory and level-up moments showed progress inside
the level ("282 / 300"). The user asked for the Clash Royale model: show how far you are
into this level and what the next level needs.

## Decisions
1. **One rule for every day view.** A day is one of:
   - **Training day:** reached 20 minutes. Green tile, as now.
   - **Rest day:** the sand tile Home uses. A past day without a training day, on or
     after the first logged workout; or a day still to come this week once the weekly
     goal is met.
   - **Open:** today until it becomes a training day, days still to come, and days
     before the first logged workout. Shown plain. (Home changes too: a brand new
     account no longer sees Monday and Tuesday as "Rest".)
2. **A short-workout day is a rest day.** On the Calendar, where a day can be opened,
   it also gets a small dot so you know something is logged.
3. **Calendar.** Cells keep their date number. Rest days get the sand tile. A legend
   under the grid: "Training day · Rest day · Under 20 min". Header: "{streak} week
   streak | {n} training days" for the month shown. The selected day's label reads
   "Thursday, 2 October · Rest day" or "· Training day". Below it:
   - a rest day with nothing logged: "Rest day. Nothing logged."
   - a short day: its workouts, then "6 of 20 min, so this counts as a rest day."
   - today with a short workout: "6 of 20 min today. 14 more makes it a training day."
   - an open day: "No workout on this day."
4. **Profile month strip.** Sand squares for rest days, a legend (Training day, Rest
   day), caption "{n} training days in October · {streak} week streak".
5. **Statistics, last 7 days chips.** The green dot marks training days only. A rest
   day is a sand chip with "Rest" under the number. The muscle heat map is unchanged.
6. **Phone XP bar** reads "282 / 300": XP into the level over what the level needs.
   Aria-label "Level 7, 282 of 300 XP to level 8, ...". Every level XP text groups
   digits the same way ("1,050 / 1,100"): HeroLevel, RankRoad, the level-up Moment.
7. **Rank Road level rows.** Rows above your level show "1,318 XP to go" instead of the
   total threshold. Rows below show "Cleared". Your row is unchanged.
8. The Profile "Workouts" tile keeps counting sessions.

## Stages
### 1. Logic and tests (`levl-builder`)
- `lib/week.ts`: one shared rule.
  ```ts
  export type DayKind = 'training' | 'rest' | 'open';
  export type DayRules = { training: ReadonlySet<string>; since: string | null; today: string; goalMetThisWeek: boolean };
  export function dayRules(trainingDays: readonly string[], firstWorkout: string | null, today: string, goal?: number): DayRules
  export function dayKind(date: string, r: DayRules): DayKind
  ```
  `weekDots` uses it (with a `since` argument). `weekSummary` passes
  `trainedDates(state)[0] ?? null` and also returns `rules: DayRules` so the Calendar
  and MonthStrip reuse it instead of scoring again.
- `lib/monthGrid.ts`: add `trainingDaysInMonth(trainingDays, month)`; remove
  `monthSessionCount` and its test; update the header comment.
- `lib/muscleStats.ts`: `DayChip` gets `rest: boolean`; `trained` now means a training
  day. `last7Stats` builds chips from `trainingDaysOf(state, today)` and the same rule.
- `lib/rankRoad.ts`: `LevelRow` gets `xpToGo` (0 once reached), like `GateRow`.
- Tests, one per rule: past day after first workout is rest; day before first workout
  is open and no workouts means no rest days; today is open until trained; a short
  day is rest; rest of this week is rest once the goal is met, next week stays open;
  month training-day count; last 7 chips mark rest; a level row's `xpToGo`. Update the
  existing `weekDots` tests the `since` rule changes.

### 2. UI (`levl-builder`, then `levl-ui-check`)
- `app/globals.css`: token `--rest: #f4e9d2`, used by `.wt-wd.rest`; new
  `.wt-dcell.rest`, `.wt-dcell.logged` (small dot under the number), `.wt-monthstrip i.r`,
  `.wt-dchip.rest`; reuse `.wt-legend`.
- `MonthCalendar.tsx`, `MonthStrip.tsx`, `BodyGraph.tsx`, `ResourceBar.tsx`,
  `RankRoad.tsx` level rows, digit grouping in `HeroLevel.tsx` and `celebrate/Moment.tsx`.
- Aria-labels say "training day" or "rest day", as `WeekCard` does.

### 3. Docs (main conversation)
Rulebook (`docs/design/xp-reference.html`, republished), DESIGN_HISTORY, ARCHITECTURE,
QA, ROADMAP.

## Verification
`levl-ui-check` at 390 and 1440 on `/`, `/calendar`, `/profile`, `/stats`, `/rank`:
the seeded `qa-short` day (2 days ago) is sand with a dot on the Calendar and sand on
the strip and chips; `qa-strength` (today) is green; days before the first seeded
workout are plain; the phone bar reads within-level XP. A `withApp` flow taps the short
day on the Calendar and checks the "6 of 20 min" line.
