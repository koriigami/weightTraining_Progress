# v8 plan: fix the UX, XP rules v2, remove the 6-week plan

The earlier plans (v7 build, boards v2 to v5) are recorded in `docs/ROADMAP.md` and `docs/DESIGN_HISTORY.md`.

## Context

v7 is live on `main` (304f149). Using the app surfaced these problems:
- **Logging:**
  - An empty workout starts its clock before any exercise is picked.
  - A cardio workout shows Volume and Sets, which mean nothing for a ride.
  - The center **START** button doesn't say that it opens routines, cardio, or an empty workout.
- **Navigation:**
  - The tabs on Routines and Rank scroll away.
  - Tapping Rank again jumps to level 32.
- **Missing features:**
  - Home has no "done today" state.
  - You can't delete a routine from the list, or edit/delete a past workout.
  - There's no workout detail page.
  - Recent workout cards don't name the routine.
- **Profile, forms and onboarding:**
  - Profile's This month card looks incomplete.
  - The date picker is the plain native one, stacked on top of a sheet.
  - Onboarding's Skip sits where Continue should be.
- **The 6-week plan should go.** It is hard to reach, and goals and several badges only count plan days (logged workouts never move a goal).
- **XP needs a fairness pass:**
  - Beating your last session earns nothing unless it's an all-time record.
  - Iron Mover rewards raw tonnage.
  - A single-set workout still earns +50.

Everything below is agreed with the user. Photos, image share cards, Google Health, renaming the app, and plans/Trainer come later.

## Board v6 feedback, round 2 (overrides anything below that conflicts)

**Home**
- On the phone, the level card shrinks to a compact top strip in the Clash Royale home style: level shield, XP bar and rank. Logging becomes the hero. The user is sending Clash Royale screenshots as a reference. Desktop keeps the big level card.
- The Today card copy says "Today's workout" instead of "Up next".
- The in-progress state is a slim bar, not a big green card with a big Resume, on phone and desktop. Other pages keep the Resume bar above the tabs.

**Starting a workout**
- "Empty workout" becomes **Custom workout**.
- The center button stays **Workout +**, on a wider button with side padding so the label never touches the edge.
- Picker:
  - No caption line.
  - The pinned Start workout button is hidden until at least one exercise is picked, then appears at full height.
- Exercises logged before are prefilled with last time's sets, kg and reps, editable. Routine starts keep using the routine's values, which follow last time through Victory's "Save weights to routine".

**Logging**
- The finish bonus chip is removed on phone and desktop. An ⓘ on the XP stat explains XP in a small popover.
- The log's end gets a row of two equal buttons, **Settings** and **Discard workout**, like Hevy.
- Settings opens a minimal **Workout settings** page (back, title, Done) with four switches:
  - Sounds
  - Vibration
  - Keep screen on (Screen Wake Lock)
  - Fill in last time's numbers
- It leaves out Hevy's rest timer, RPE, plate calculator, warm-up calculator and supersets. Units and weekly goal stay in the main Settings.
- The Finish confirm says when a planned exercise isn't done, so the missed bonus is never a surprise.
- "Add lap" is removed from cardio. Interval exercises keep their own interval sets.
- The cardio picker must not re-animate when an activity is picked. In the board this was a redraw artifact.

**Workout page**
- Remove the "Where the XP came from" card on phone and desktop. An eye icon on the XP tile opens the breakdown in a small modal.
- The focus goes to muscles, exercises and notes.

**Edit workout**
- The date and time picker opens as a centered game modal, not inline.
- One date format everywhere: "Tue 29 Sep · 6:40 pm", with the year only when it isn't this year.

**Level or rank drops (XP is derived, so they can happen)**
- There is no demotion animation.
- The delete confirm adds one line only when a boundary is crossed, for example "You'll go back to level 6."
- After a delete, an edit, a date move, a weekly goal change or a weigh-in delete, a toast says "XP updated · Level 6".
- Level-up moments don't replay when a level is re-reached, since the seen cache only grows.

**Goals**
- Once achieved, a goal stays achieved, keeping its XP and badge.
- The goal sheet goes back to the v7 layout: back button, normal-size buttons, and the "New goal" title, reward line and **Create goal** pinned.
- The chip reads **Pick end date**. The game calendar opens inside the sheet on the phone and inside the dialog on desktop, with no popover.

**Profile:** revert to the v7 design. It keeps the stats chart, goals, weight, and the This month strip with its streak and workouts this month. The month grid idea is dropped.

**Routines and Rank:** the large title hides on scroll down and returns on scroll up, while the tabs stay pinned.

**Backlog, next plan:**
- Consider removing page headers entirely, since the tab bar already names the page.
- Late-stage rewards: coins spent on cosmetics, streak shields, a monthly season road. Rewards never buy XP. Options were given to the user in chat.

**Round 2 is published at the same links** (board 06 and the XP Rulebook, version 2). It waits for sign-off.

## Board v6 feedback, round 3 (overrides round 2 where they conflict)
- **Resume stays exactly as in v7:**
  - Phone: the floating Resume bar sits just above the tab bar on every tab, Home included, and Home's content doesn't change.
  - Desktop: the "Workout in progress" card sits in the sidebar above the user row.
  - No green in-progress card anywhere.
- **Desktop Home goes back to the v7 layout:**
  - Hero card and This week on top.
  - Then a "Today's workout" row of three cards: two routines with Start, and a dashed "Something else" card ("Another routine, cardio or a custom workout.", Choose) that opens the Start sheet.
- **Phone Today card:** Start is a normal-size button beside the routine name, not a big full-width one. The card shows the routine's first 3 exercises and the three tiles.
- **Phone top bar:** the round-2 blue card is dropped. The board offers three Clash Royale-style options, and the user picks one:
  - **A, Resource bar:** a level badge overlapping a dark XP bar with the numbers, plus streak and this-week counters.
  - **B, Player plate:** avatar, name and rank title, level badge with a small bar, and a streak pill.
  - **C, Level ring:** XP as a ring around the level number.
- **Calendar and week-row alignment bug:** in the board, the Today card's `.today` class collided with the day cells' `today` state. The build must scope class names (it uses `wt-` prefixes) and check that today and selected cells align with their row at 390 px.

**Insights:** approved as designed, and built last in this iteration.

**Finish bonus rule (replaces the 20 work-minutes rule)**
- It is paid when every exercise and set in the plan is ticked.
  - The plan is the routine, or what was picked before Start workout.
  - Exercises added on top don't count against you.
  - A swapped exercise keeps its slot.
- The bonus equals the XP of the planned sets, capped at 50.
  - A 15-set routine pays 50.
  - A plan of 3 curl sets pays 15.
  - A planned 30-minute ride pays 40.
- At most 2 a day.
- The weekly goal counts workouts that finished their plan.
- The XP Rulebook's finish-bonus section and calculator get updated. The rest of the Rulebook is accepted for now; the user will review it in depth later.

## Decisions (signed off in chat)

### Workout flow
- **Empty workout:** it opens the exercise picker first. The pinned CTA is **Start workout**, disabled until at least one exercise is picked. The clock starts only on that tap. Closing the picker starts nothing.
- **Cardio quick start:** pick an activity (Run, Walk, Ride, Treadmill, Bike...), then **Start workout**. The same rule applies: nothing runs until the tap.
- **Starting from a routine:** its Start button still starts right away, since that tap is already explicit.
- **Evening cardio after a gym workout** is saved as its own workout.
- **Center nav button:** a single word with an icon, **Workout** with a + icon. The board shows one alternative, e.g. **Train** with a dumbbell, to compare.
- **Routines tab:** a **Create routine** button with a + icon at the top, and the tabs pinned under the title.
- **UX copy sweep:** every CTA is one or two clear words plus an icon ("Create routine", "Start workout", "Log weight"). No long labels.
- **Past workouts** open a detail page. Everything on it can be edited: sets, weights, reps, exercises, date, duration, title and notes. Editing uses the log layout without a running clock. XP is re-derived on save. Delete asks for confirmation (soft red button, then solid red).

### XP rules v2 (`lib/workoutScoring.ts`, `lib/routines.ts`)
- **Strength set:** +5. It must have reps ≥ 1, or ≥ 5 s for a time set. Weight lifted never scales XP.
- **Cardio:** 1 XP per minute, capped at 30 per set, plus 10 when a distance is logged. Interval sets get the same 30 cap (today they are uncapped).
- **Beat last time: +10 per exercise.** Your best set beats the most recent earlier workout that had that exercise:
  - Weight and reps: more kg at the same or more reps, or more reps at the same kg.
  - Reps only: more reps.
  - Time: a longer hold.
  - Cardio: more km, or the same km or more in less time. Minutes only: more minutes.
  - The first time you do an exercise there is nothing to beat, so no bonus.
- **Record: +25**, paid instead of the +10, never both. It means an all-time best:
  - Weight and reps: heaviest, then most reps.
  - Reps only: most reps.
  - Time: longest hold.
  - Cardio: longest distance.
- **Finish: +50.** It needs **20 work-minutes**, where each ticked strength set counts as 3 min (research: a set takes 1.5 to 3 min with rest) and cardio counts its minutes. So 7 sets, or 20 cardio minutes, or a mix. At most 2 finish bonuses a day. The log shows "Finish bonus: 5 of 7 sets".
- **Weekly goal: +50**, once per week. It counts only qualifying workouts (the ones that earn the finish bonus). The weekly streak counts them too.
- **Unchanged:**
  - The level curve, `xpForLevel(n) = 50·n·(n−1)`. Revisit after about 3 weeks of data from the 15 to 20 testers.
  - The ranks: E 1, D 5, C 10, B 15, A 20, S 30.
  - Badge tier XP: 25, 50, 100, 200, 350, 500. Monthly badges 75, special 50.
  - Weigh-in: +10.
- **Goal XP** keeps its base formulas, but without the plan multiplier (×1.0), clamped to 25 to 1000.

### Badge catalogue v2 (`lib/badges.ts`, `lib/badgeCards.ts`)
- **Keep:** Finisher (qualifying workouts), Record Breaker, Streak Keeper (weeks), All-Rounder, Road Runner, Rider, Scale Keeper, Shedding (counted from the first weigh-in).
- **Change:**
  - Iron Mover counts sets logged: 50, 250, 500, 1000, 2500, 5000.
  - Engine counts workout cardio minutes.
  - Pushup Path counts logged reps of push-up variations.
- **Retire:** Iron Will, Grinder.
- **Monthly:**
  - Month Clear: trained on 25 or more days of the month.
  - Goal Month (new): the weekly goal met in every week of the month.
  - Cardio Month: 600 min.
  - Walk/Run 50 km, Ride 100 km.
  - Pushup Month: 1000.
  - Weigh-in Month: unchanged.
  - Retire Perfect Month.
- **Special:**
  - Clean Sweep (new): finish a routine with every planned set ticked.
  - Goal Getter: kept.
  - Retire Awakening, Perfect Day, Full Week and Program Complete.
- Earned badges are derived, so the owner's plan-day badges are re-derived after the migration below. The user accepted that their level may shift slightly.

### The 6-week plan goes
- **Migration:** on the next read, each logged plan day in `state.days` becomes a normal `WorkoutLog`.
  - It is titled after its routine (Push A and so on), with `routineId` set to the matching `seed-*` routine.
  - Sets come from the plan's sets and reps, with weights from the routine defaults.
  - Cardio keeps its minutes and km.
  - The pre-migration state is first copied to `wt:user:{sub}:backup:v7`. Then `days` is dropped.
  - Plan data stays only inside the migration module, `lib/migrations/planDays.ts`.
- **Delete:**
  - `/calendar/plan`, `components/Calendar.tsx`, `DayCard.tsx`, `ExerciseRow.tsx`, `CardioSheet.tsx`.
  - The API actions `tick`, `untick`, `logCardio`, `completeAll`, `setDayLog`.
  - Legacy XP (`xpForDay`, day streaks), the plan badge code, and `seedOwnerRoutines`. The owner's routines already exist.
  - The "6-week plan" feed tag, and the Home and Calendar links to the plan.
  - `data/plan.ts`, except what the migration module snapshots.
- **Rebuild goals on workouts** (`lib/goals.ts`, `NewGoalSheet.tsx`):
  - Goal types: Workouts, Weekly streak, Cardio minutes, Distance, Push-ups, Weight.
  - Drop the plan hints.
- **Tests:** replace `tests/legacyParity.test.ts` and its golden fixtures with migration tests.
  - Plan days become the expected workouts.
  - No XP comes from `days`.
  - The backup is written.

### Screens (design board v6 shows each state, phone and desktop)
- **Home:**
  - A **Today** card with three states:
    - Ready: the suggested routine with Start, plus Other routine, Cardio and Empty.
    - In progress: the timer, sets done, and Resume.
    - Done today: each finished workout with its routine chip and XP, plus View. The next routine shows as "Next time". A gentle row appears when the routine's cardio wasn't logged.
  - The yellow Empty workout block goes away.
  - The **This week** card links to the calendar.
- **Log screen:**
  - The stats row adapts to what's being logged:
    - Strength: Duration, Volume, Sets, XP.
    - Cardio only: Time, Distance, Pace, XP.
    - Mixed: Duration, Volume, Distance, XP.
  - Cardio exercises get a roomy Time + Distance card with live pace.
  - A cardio-only workout's duration becomes the logged minutes when that is longer than the clock.
  - A finish-bonus progress chip.
- **Workout detail page `/workout/[id]`:**
  - Header, routine chip, date, the stats above, and a muscle map.
  - Exercises with every set, and record / beat-last-time markers.
  - An XP breakdown and notes.
  - Actions: Edit, Delete, Share.
- **Workout card v2:**
  - Tapping it opens the detail page.
  - The routine chip shows even if the title was renamed.
  - "+N added" when exercises beyond the routine were logged, and a "Custom" tag on custom exercises.
- **Routines:** Create routine at the top, tabs in the pinned header, and a ⋯ menu on each card (Edit, Duplicate, Delete) with the solid red confirm.
- **Rank:**
  - The Road/Badges tabs sit in the pinned header.
  - The page always opens centered on your level, including when you tap the Rank tab again while on /rank (listen for a same-route nav tap).
  - Switching back to Road re-centers too.
- **Sticky sweep:** every segmented control or tab row goes into `PageHeader`'s `sub` slot (`components/ui/PageHeader.tsx`). Check Exercises, Explore, Profile and Stats.
- **Profile:** This month becomes a compact real month grid (weekday headers, day numbers, trained days filled). Tapping a day opens its workouts, and "Calendar" opens the full page.
- **Onboarding (avoid step):** Continue sits pinned at the bottom like every step. Skip becomes a text button in the top bar.
- **Date picker:**
  - A new game-styled `components/ui/DatePicker.tsx`: a cream panel, gold selected day, 3D month arrows, today ringed, min/max.
  - Inside a sheet it expands inline, so no second modal is stacked. On desktop it drops down as a popover.
  - Used for goal end dates, workout date/time on Victory and in Edit, and weight date.
- **Owner-only Insights page `/insights`:**
  - Group-level only: weekly active people, workouts per person per week (a distribution), the funnel (signed in, onboarded, first workout, active in week 2, active in week 4), and time to reach each rank.
  - Groups by frequency (1 to 2, 3 to 4, 5+ a week) and by type (strength, cardio, mixed).
  - Any group smaller than 5 people is hidden.
  - Data comes from a server SCAN of `wt:user:*:state` and `:profile` (join date = profile `createdAt`), guarded by `OWNER_EMAIL`.
  - A link to it appears in Settings for the owner only.

## Order of work

Status: step 1 is done and committed as c91c74c on the branch. Board 06 is at https://claude.ai/artifact/XrqbkePKW7kztpKpebJy7V and the XP Rulebook at https://claude.ai/artifact/QjPR5Tes6iXn9AtQmqWsjX. Both are also in `docs/design/`. The build starts once the user signs off.

1. **Design (Opus), done:**
   - Board v6 as a new artifact and `docs/design/06-ux-fixes-board-v6.html`. It is built from board 05's tokens and components and has a nav-label toggle.
   - The XP and badge reference page as an artifact and `docs/design/xp-reference.html`. It covers the level table 1 to 35 with ranks, every XP source with examples, the beat-last-time and record rules, the finish rule with a small calculator, the badge catalogue with tiers and XP, a college student vs bodybuilder worked example, and where each rule shows in the app.
   - The user signs off, and any feedback round happens here.
2. **Build (Sonnet 5.5 subagents, one stage at a time, Opus verifies each).** Each stage is its own commit(s) on `claude/home-workout-nutrition-plan-kuyhvx`.
   - **A. Rules and data:** XP v2, badges v2, goals on workouts, plan-day migration with backup, removal of plan code and API actions, tests.
   - **B. Workout flow:** picker-first Empty workout and cardio start, adaptive stats, cardio card, finish-bonus chip, the new Start sheet and the Workout nav button, the copy sweep.
   - **C. History:** `/workout/[id]` detail, edit mode (reusing `LogScreen` and `WorkoutSessionProvider` in an edit mode), delete, workout card v2. Uses the existing `updateWorkout`/`deleteWorkout` in `ProgressProvider.tsx` and `lib/routineActions.ts`.
   - **D. Home and navigation:** the Today card states, This week linking to the calendar, Routines (Create routine, card menu with delete/duplicate), sticky tabs sweep, Rank re-center, Profile month grid, Calendar cleanup, the onboarding Skip.
   - **E. Date picker** and the goals UI on workouts.
   - **F. Insights page**, docs (DESIGN_HISTORY, ROADMAP, ARCHITECTURE, XP reference) and screenshots.
3. **Opus review.** Then ask the user before merging to `main` (a fast-forward, which Vercel deploys).

## Verification
- **vitest:**
  - New scoring tests: beat-last-time vs record exclusivity, the finish rule (7 sets, 20 min, mix, 2 a day), the interval cap, the weekly goal counting only qualifying workouts.
  - Badge v2 tiers, goals from workouts.
  - Migration (plan days become workouts, backup key written, `days` removed, idempotent).
- **Other checks:** `tsc` clean, `next build` with the pages static, and the em dash grep empty.
- **Playwright (Dev sign-in), phone 390 px and desktop 1440 px:**
  - Empty workout: Start workout stays disabled until an exercise is picked, and the clock reads 0 until tapped.
  - A ride-only workout shows Time, Distance, Pace and XP.
  - Home Done-today state after finishing.
  - Past workout: open, edit a set, check the XP changes, delete it.
  - Delete a routine from its card menu.
  - Tabs stay pinned after scrolling on Routines and Rank. Re-tapping Rank re-centers on your level.
  - The goal sheet's date picker opens inline.
  - `/insights` returns 404 for a non-owner.
- No console errors, and screenshots go to `docs/screenshots/stage-v8-*`.
