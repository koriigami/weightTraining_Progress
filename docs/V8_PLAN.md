# v8 build plan: UX fixes, XP rules v2, 6-week plan removed

## Context

v7 is live on `main` (304f149). Using it showed problems:
- a workout started before any exercise was picked;
- cardio showed Volume and Sets;
- a vague START button;
- tabs that scrolled away, and Rank jumping to level 32;
- no done-today state on Home;
- no way to delete a routine or edit or delete a past workout;
- a hidden 6-week plan that goals and badges still depended on;
- XP that farmed easily and ignored beating yourself.

Four rounds of design review with the user settled everything:
- Board 06: https://claude.ai/artifact/XrqbkePKW7kztpKpebJy7V (`docs/design/06-ux-fixes-board-v6.html`)
- XP Rulebook: https://claude.ai/artifact/QjPR5Tes6iXn9AtQmqWsjX (`docs/design/xp-reference.html`)

Both are committed on `claude/home-workout-nutrition-plan-kuyhvx` (35b3eb8). This file is the single build spec. Where it conflicts with older notes in `docs/V8_PLAN.md`, this file wins.

The only open design item is the **View** button in Done today, below. It lands before stage D, the stage that builds Home.

## View button (the last design change)
- View is a secondary action, so it becomes a low-weight **text button**:
  - "View" with a chevron, in the link green.
  - No fill and no 3D bevel.
  - About 32 px tap height.
- **Phone:** it sits beside each finished workout's title in the Today card.
- **Desktop:** it sits at the bottom of each Done card.
- Board 06 is republished at the same link with this change as the first execution step, for a quick look before stage D.

## Rules v2 (source of truth: the XP Rulebook)
- **Set XP:**
  - Strength (weight and reps, reps, time): +5 per ticked set that has reps of at least 1, or a hold of at least 5 s.
  - Cardio: `min(30, round(min)) + 10 if km > 0`, and it needs min > 0.
  - Intervals: `min(30, round(on + off))`.
- **Beat last time and records:** once per exercise per workout. A record pays +25 and replaces the +10, never both. The first time an exercise is logged earns neither.
  - "Last time" is the most recent earlier workout with a qualifying set of that exercise. "Best" is the best across all earlier workouts.
  - Weight and reps:
    - Beat last time: more kg at the same reps or more, or the same kg with more reps.
    - Record: heaviest, then most reps.
  - Reps only: more reps.
  - Time: a longer hold.
  - Cardio:
    - Beat last time: more km, or the same km or more in less time. With no distance on either side, more minutes.
    - Record: longest km.
- **Finish bonus:** paid when the workout's **plan** is complete.
  - A new `WorkoutLog.plan` holds `{exerciseId, sets}[]`, a snapshot taken at Start: the routine's items, or the exercises picked before Start workout.
  - Complete means every plan item has at least its planned number of ticked sets.
  - Swapping an exercise moves its plan slot to the new exercise. Removing an exercise from the workout removes it from the plan. Added exercises don't change the plan.
  - Bonus = `min(50, XP of the ticked sets that fill the plan)`.
  - At most 2 a day, counted in the order the workouts happened.
  - Workouts saved before v8 have no `plan`, so their own items count as the plan.
- **Weekly goal:** +50 the first time in a Monday to Sunday week that the count of plan-complete workouts reaches `prefs.weeklyGoal`.
- **Weekly streak:** weeks with any workout that has a ticked set.
- **Unchanged:**
  - Weigh-in: +10.
  - The level curve: `50·n·(n−1)`.
  - Ranks: E 1, D 5, C 10, B 15, A 20, S 30.
  - Badge tier XP: 25, 50, 100, 200, 350, 500. Monthly badges 75, special 50.
- **Badges v2:**
  - Finisher counts plan-complete workouts.
  - Iron Mover counts sets logged: 50, 250, 500, 1000, 2500, 5000.
  - Engine counts workout cardio minutes.
  - Pushup Path counts push-up reps logged.
  - Record Breaker, Streak Keeper, All-Rounder, Road Runner, Rider, Scale Keeper and Shedding (counted from the first weigh-in) stay.
  - Monthly:
    - Month Clear: trained on 25 days or more.
    - Goal Month (new): the weekly goal met in every week of the month.
    - Cardio Month: 600 min.
    - 50K Walk/Run.
    - 100K Ride.
    - Pushup Month: 1000.
    - Weigh-in Month: 20 weigh-ins.
  - Special: Clean Sweep (new: a routine finished with every planned set ticked) and Goal Getter.
  - Retired: Iron Will, Grinder, Perfect Month, Awakening, Perfect Day, Full Week, Program Complete.
- **Goals:**
  - They count workouts, not plan days.
  - Types and rewards:
    - Workouts: 25 × target.
    - Weekly streak: 50 × weeks.
    - Cardio minutes: 1 × minutes.
    - Distance: 8 × km.
    - Push-ups: target ÷ 4.
    - Weight: 120 × kg, × 1.25 at an ambitious pace.
  - Rewards are rounded to 5 and clamped to 25 to 1000.
  - Only progress logged after `createdAt` counts.
  - **Goals stay achieved:** the server stamps `achievedAt` the first time a goal is met, and a stamped goal stays achieved.

## 6-week plan removal
- **Migration, on read in `lib/store.ts`:** when `state.days` has entries:
  1. Copy the raw state to `wt:user:{sub}:backup:v7`, but only if that key doesn't exist.
  2. Turn each logged plan workout day into a `WorkoutLog`:
     - `id` is `w-plan-{date}`.
     - The title is the routine title, and `routineId` is the matching `seed-*` routine if it exists.
     - Items are the ticked items, with the plan's set counts and reps (a range plans its top end), the routine's kg, and every set done.
     - Cardio keeps its minutes and km.
     - `plan` holds every item scheduled that day.
     - `startedAt` and `finishedAt` are synthesized at 18:00.
  3. Drop `days`. The migration is idempotent.
  - Plan data lives only in `lib/migrations/planDays.ts`.
- **Delete:**
  - `/calendar/plan`, `components/Calendar.tsx`, `DayCard.tsx`, `ExerciseRow.tsx`, `CardioSheet.tsx`.
  - The API actions `tick`, `untick`, `logCardio`, `completeAll`, `setDayLog`, and their `ProgressProvider` methods.
  - Legacy day XP and streaks, and the plan badges and plan-only filters.
  - `seedOwnerRoutines`, but keep the existing routines.
  - The plan feed tag and the Home and Calendar plan links.
  - The plan hints in goals.
  - `data/plan.ts`.
- **Tests:** replace `tests/legacyParity.test.ts` and its golden fixtures with migration tests.

## Build stages (Sonnet subagents, one at a time; Opus verifies, commits land on the branch, Opus pushes)
- **A1. Scoring rules v2**
  - Files: `lib/routines.ts` (types, `WORKOUT_XP`, `setXp`, `plan`), `lib/workoutScoring.ts`, `lib/badges.ts`, `lib/badgeCards.ts`, `lib/goals.ts` with `achievedAt` stamping in `app/api/state/route.ts`, `lib/routineValidation.ts` (the `plan` field) and `lib/victory.ts` (XP lines).
  - Keep the build green by adjusting consumers minimally.
  - Legacy day scoring stays until A2.
  - New tests cover every rule above.
- **A2. Plan removal:** the migration with backup, the deletions above, the migration tests, and a note flag so Home can say "XP was worked out again with the new rules" once.
- **B. Workout flow:**
  - The **Workout +** nav button (wider, with side padding) and the same button in the sidebar.
  - The Start sheet: routines with today's tagged, the Run/Walk/Ride tiles, and Custom workout.
  - The Custom workout picker: Start workout · N appears only once an exercise is picked, and the clock starts on tap.
  - The cardio picker (6 activities; picking only highlights).
  - Prefilling last time's numbers.
  - The plan snapshot in the session (`lib/session.ts`, `WorkoutSessionProvider`).
  - The adaptive stats row, with the XP ⓘ popover (XP so far and plan progress).
  - Beat and Record chips.
  - The cardio card (Time follows the clock, speed for rides and pace for run or walk, no Add lap).
  - A cardio-only duration of `max(clock, minutes)`.
  - The log end: Add exercise, then Settings and Discard.
  - The Workout settings page (Sounds, Vibration, Keep screen on via Wake Lock, Fill in last time's numbers; new prefs `keepAwake`, `prefillLast`).
  - The Finish confirm naming undone planned exercises.
  - Victory lines under v2.
  - The copy sweep from board 06's table.
- **C. History:**
  - `/workout/[id]`: stats, an XP tile with an eye that opens a breakdown modal, muscles, exercises with chips, notes, Share, and Delete with a solid red confirm that includes a level-drop line.
  - `/workout/[id]/edit`: the log layout without a clock, and the date and time in a modal date picker.
  - Workout card v2: opens the page; shows a routine chip, "+N added", a Custom tag, and cardio stats.
  - An "XP updated · Level N" toast on level changes, with no demotion animation.
- **D. Home and navigation:**
  - Phone Home:
    - The Resource bar top bar.
    - The Today card: "Today's workout", a normal-size Start, the first 3 exercises, and the three tiles.
    - Done today: the same card with Done chips, ticks and the text View.
  - Resume stays as in v7.
  - Desktop Home: hero and week, then the three-card "Today's workout" row, with Done cards when done.
  - This week opens `/calendar`.
  - Routines: Create routine, and a ⋯ card menu (Duplicate, Delete).
  - Tabs pinned in the header `sub` everywhere, and large titles collapse on scroll down on Routines and Rank.
  - Rank re-centers on your level when the tab is tapped again.
  - Onboarding Skip moves to the top bar.
  - Profile unchanged.
  - Scope all class names, and check that today cells line up.
- **E. Goals and dates:**
  - A game-style `components/ui/DatePicker.tsx`, inline or as a modal, with optional time.
  - The goal sheet: the v7 layout with a pinned title, reward and Create goal, normal-size buttons, and Pick end date opening the inline calendar (the sheet on the phone, the dialog on desktop).
  - The goal types from rules v2.
  - The weight date uses the picker too.
- **F. Insights, docs and screenshots:**
  - Owner-only `/insights`: group numbers only, and groups under 5 people hidden.
  - Docs: DESIGN_HISTORY, ROADMAP, ARCHITECTURE, and the Rulebook "as built".
  - Screenshots in `docs/screenshots/stage-v8-*`.
- **Then** Opus reviews everything, and the user is asked before a fast-forward merge to `main`.

## Verification (each stage)
- `npm test` (vitest), `npx tsc --noEmit` and `npm run build` (pages stay static).
- The em dash grep over app, components, lib, data and docs is empty.
- Stage-specific vitest:
  - A1: record vs beat, the finish plan rule, the 2-a-day cap, the interval cap, the weekly goal and streak, badges v2, goals and `achievedAt`.
  - A2: migration output, the backup key, idempotence, no `days`.
- Playwright with Dev sign-in, at 390 px and 1440 px, for UI stages:
  - B: Custom workout (no button until a pick, clock at 0 until Start); a ride-only log shows Time, Distance, Speed and XP.
  - C: open, edit and delete a workout, with the XP toast.
  - D: Done today; the routine delete menu; pinned tabs and collapsing titles; Rank re-center; today cells aligned.
  - E: the goal date picker inline.
  - F: `/insights` returns 404 for non-owners.
- No console errors.
