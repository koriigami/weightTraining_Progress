# Design history

Every design we explored, in order, and why each one changed. The boards are
standalone HTML files in `docs/design/`. Open them in a browser. They are
clickable prototypes, so they show the flows better than screenshots do.
`docs/ROADMAP.md` holds the full plan and the decisions behind it.

Board 05 is the look. Board 06 fixes what day-to-day use of the built app turned up, and the
XP Rulebook sets the scoring rules. Once they are signed off, the build follows all three.

## 01 Hunter board (v1 to v5.1 of the original app)

`docs/design/01-hunter-board-v1.html`

The Solo Leveling look for the first app: E to S hunter ranks, XP, levels,
badges in six tiers (Bronze to Legend), monthly and special badges, and
full-screen celebrations. Rank shields, badge shapes and the level-up overlay
came from here. Feedback that shaped it: move the shield letters up, six
badge tiers, a two-step goal sheet with a pinned button, Material 3 navigation.
This look is what shipped as v5.1 and is still live.

## 02 Plan builder (rejected)

`docs/design/02-plan-builder-rejected.html`

A generated-plan design: a 13-screen onboarding, activity cards, and a swap
sheet. Rejected because 13 questions is too many, most people have no fixed
schedule, and nobody should be forced onto a generated plan. It led to the
routine-first direction. Kept only as a record.

## 03 Routines board v2

`docs/design/03-routines-board-v2.html`

The reset, modelled on Hevy. A routine is one day: exercises, then sets with
a weight and reps. A 4-question onboarding (units, equipment, things to
avoid, how to start), an exercise library filtered by equipment and muscle
with a muscle map, per-set logging with XP, a weekly streak, and a sidebar
on desktop. Blue buttons with gold XP. Feedback: it looks like Hevy, gold
clashes with blue, the muscle filter needs multi-select, cards cut off the
exercise list.

## 04 Routines board v3 (three skins)

`docs/design/04-routines-board-v3-three-skins.html`

Three looks on one structure, switchable: Shadow Monarch (dark violet),
Arena Bright (sky, greens, gold, cream) and Ember (charcoal and fire). Added
multi-select muscle filters, full routine cards with a preview, a raised
START button in the nav, the Rank Road, and Clash-style reward moments
(level up, rank up, badge chest, Victory). Arena Bright won.

## 05 Routines board v5 (final)

`docs/design/05-routines-board-v5-final.html`

Arena Bright with the Deep Sky hero card. Decisions made across the last
rounds:

- Buttons: five types, each with default, pressed, disabled and loading
  states. Primary green 3D, secondary gold with an outline, dashed tertiary,
  soft red to start a destructive action, solid red to confirm it.
- Dialogs: a framed game modal, centered on phone and desktop, with equal
  width buttons. Discard, Sign out and Delete routine use the solid red
  confirm. A destructive dialog only shakes when you tap outside it.
- Workout log, like Hevy: Finish in the top bar, Add exercise after the last
  exercise, and Discard workout set apart below it. Desktop keeps Discard and
  Finish in a sticky header, with Add exercise jumping to the library search.
- Pinned main action: Add exercise in the routine editor, Add N exercises in
  the picker, Start in the preview, Continue in onboarding, Done on Victory.
- No duplicate exercises in a routine or workout.
- Finish, then Victory: XP lands at once, then edit the title, date, photo
  and notes and share. There is no claim step. Photo storage is planned for
  the next version.
- Cardio for everyone: running, walking and cycling routines, interval sets,
  and pace worked out from time and distance.
- Rank Road: opens on your level. Four gate states (unlocked earlier, your
  rank, next, locked). Locked shields and badges stay visible with a padlock
  and open a full-colour preview.
- Profile: Stats, Goals, Weight, This month, then Workouts, all on the page.
  Settings is its own page. Sign out asks first.
- Home on desktop: level and week first, then Up next, then Recent workouts.
- Phone navigation: Home, Routines, START, Rank, Profile. The exercise
  library lives inside Routines.
- Charts use 3D bars on a sunken panel. Clouds drift behind the top of each
  screen.

## 06 UX fixes board v6

`docs/design/06-ux-fixes-board-v6.html`

Made after using the v7 app for real. It shows each changed screen in its states, side by side,
with a phone and a desktop. Decisions:

- Nothing starts by accident. Empty workout opens the exercise picker, and its pinned button is
  Start workout, disabled until an exercise is picked. The clock starts on that tap. Cardio works
  the same way: pick an activity, then Start workout. A routine's Start still starts at once.
- The center nav button is one word with an icon: Workout with a +. The board can switch it to
  Train to compare.
- Home has one Today card with three states: Ready (the next routine, then Other routine, Cardio
  and Empty workout), In progress (clock, sets, Resume) and Done today (each workout with its XP,
  Next time, and a gentle row when a routine's cardio wasn't logged). The yellow Empty workout
  block is gone. This week opens the calendar.
- Evening cardio after a gym session is its own workout.
- The log's stats row adapts: strength shows Duration, Volume, Sets and XP; cardio shows Time,
  Distance, Speed or Pace, and XP; a mix shows Duration, Volume, Distance and XP. Cardio gets two
  big fields (Time follows the clock until typed in). A chip tracks the finish bonus, and
  exercises show Beat last time +10 or Record +25.
- Every past workout has a page: stats, where the XP came from, muscles, every set. Everything
  can be edited in the log layout without a clock, and Delete asks first.
- Workout cards open that page, show the routine as a gold chip even after a rename, mark
  exercises added on top of the routine, and tag custom exercises.
- Routines: Create routine with a + at the top, tabs pinned in the header, a ⋯ menu with
  Duplicate and Delete routine.
- Rank: tabs pinned, and it always opens on your level, including a second tap on the tab.
- Profile shows a real month grid. Onboarding's Skip moves to the top bar. One game-style date
  picker opens inside the sheet you're in, or as a popover on desktop.
- An owner-only Insights page shows the group, never a person, and hides groups under 5 people.
- Button words: one or two plain words and an icon (Create routine, Start workout, Keep logging).

### Board 06, round 2

The user's review of round 1 changed these, all at the same board link:

- Home on the phone leads with logging. Level, XP and streak shrink to a compact strip at the top,
  like the player bar on Clash Royale's home screen. Desktop keeps the big level card. The Today
  card says "Today's workout", and In progress is a slim green bar.
- "Empty workout" is now Custom workout. The center button stays Workout with a +, on a wider
  button. The picker shows Start workout only after an exercise is picked, with no caption.
- Exercises done before start with last time's weight and reps filled in.
- The finish bonus chip, the "Where the XP came from" card and Add lap are gone. Tapping XP opens a
  small popover in the log, and an eye on the workout page's XP tile opens the breakdown.
- The log ends with Settings and Discard side by side, like Hevy. Workout settings has four
  switches: Sounds, Vibration, Keep screen on, Fill in last time's numbers.
- The finish bonus means finishing the plan. The Finish dialog says when it will be missed.
- The edit date opens in a modal. Dates read "Tue 29 Sep · 6:40 pm" everywhere.
- A level drop gets one quiet line in the delete confirm and a toast, never an animation.
- Big titles on Routines and Rank slide away on scroll down and return on scroll up.
- Profile stays as v7. The goal sheet goes back to the v7 layout with the calendar inside it and
  Pick end date.

### Board 06, round 3

- Resume works exactly as in v7: the floating bar above the tabs on the phone, and the card in
  the desktop sidebar. No in-progress card on Home.
- Desktop Home goes back to v7's three cards under the level and week cards, labelled "Today's
  workout": two routines, then "Something else" for another routine, cardio or a custom workout.
- The phone Today card uses a normal-size Start beside the routine name.
- Three Clash Royale-style top bars to choose from on the phone: A Resource bar, B Player plate,
  C Level ring.
- The board's today cells were out of line because two class names collided. The build scopes
  every class and checks the alignment.

### Board 06, round 4

- The phone top bar is option A, the Resource bar, on Home only. Profile keeps its v7 header as
  the full player card.
- Done today reuses the Ready layout: the same Today card on the phone and the same three cards
  on desktop, with a Done chip, ticks on the exercise rows, and View in place of Start.

## XP Rulebook (rules v2)

`docs/design/xp-reference.html`

The scoring rules in one page, with a calculator. The ideas: XP comes from effort and from
beating yourself, never from how heavy you lift, and the finish bonus is for finishing what
you planned.

- +5 a set, whatever the weight. Cardio 1 XP a minute, 30 at most a set, +10 with distance.
- New: +10 per exercise for beating last time. A record (best ever) pays +25 instead.
- The finish bonus pays when every planned exercise and set is ticked, and is worth the planned
  sets' XP, up to 50. At most 2 a day.
- The weekly goal counts only workouts that finished their plan.
- Goals stay achieved once reached. XP can still drop after a delete or edit, shown quietly.
- Iron Mover counts sets, not tonnes. Month Clear needs 25 training days. New: Goal Month and
  Clean Sweep. Plan-only badges retire.
- The level curve stays at 50 × n × (n − 1) until the testers' data says otherwise.

## As built

Where each decision from board 05 lives in the code, and where the build differs
on purpose. Screenshots of each stage are in `docs/screenshots/` (`stage2-*`,
`stage3a-*`, `stage3b-*`, `stage4-*`, and `stage-v8-*` for v8).

### Where each decision lives

| Decision | Code |
|---|---|
| Arena Bright tokens, clouds, every `wt-` class | `app/globals.css`, `components/ui/Sky.tsx` |
| Five button types and their states | `components/ui/Button.tsx` |
| Framed game modal, centered, equal buttons, shake on outside tap | `components/ui/GameModal.tsx` (Discard, Finish and Sign out dialogs use it) |
| Bottom sheets for pickers and menus | `components/ui/Sheet.tsx`, `components/ui/useDialog.ts` |
| Screen layout, sticky header, pinned phone footer, desktop side column | `components/ui/Screen.tsx`, `components/ui/PageHeader.tsx` |
| Phone tab bar with the raised START, desktop sidebar and account menu | `components/nav/` |
| Home (hunter card, week, Up next, Recent workouts) | `app/page.tsx`, `components/home/` |
| Routines, Explore and Exercises segments | `app/routines/page.tsx`, `components/RoutinesTabs.tsx`, `components/routines/`, `components/exercises/` |
| Routine editor with library panel and Summary | `components/routines/RoutineEditor.tsx`, `lib/routineDraft.ts` |
| No duplicate exercises | `lib/routines.ts` (`findDuplicateExercise`), the picker and the library panel |
| Cardio routines, interval sets and pace | `data/exercises.ts` (`distance_time`), `lib/routines.ts`, `lib/explore.ts` |
| Workout log like Hevy's | `components/workout/`, `components/WorkoutSessionProvider.tsx`, `lib/session.ts` |
| Finish, then Victory, with no claim step | `WorkoutSessionProvider.finish()`, `components/victory/`, `lib/victory.ts` |
| Level up, rank up, badge chest | `components/celebrate/Moment.tsx`, `Chest.tsx`, `CelebrationProvider.tsx`, `lib/celebrations.ts`, the "Reward moments" block in `app/globals.css` |
| Sounds and haptics for each moment | `lib/feedback.ts` (`levelUp`, `rankUp`, `whoosh`, `chest`) |
| Rank Road, four gate states, locked previews, replay | `lib/rankRoad.ts`, `components/rank/`, `app/rank/page.tsx` |
| Badges as game cards | `lib/badgeCards.ts`, `lib/badgeDisplay.ts`, `lib/badgeColors.ts`, `components/Badge.tsx` |
| Profile sections, 3D weekly chart | `app/profile/page.tsx`, `components/profile/`, `lib/weekly.ts` |
| Statistics body heat map | `components/stats/BodyGraph.tsx`, `lib/muscleStats.ts` |
| Calendar month grid | `components/calendar/MonthCalendar.tsx`, `lib/monthGrid.ts` |
| Settings as a page, Sign out confirm | `app/settings/page.tsx`, `components/prefs/PrefsFields.tsx`, `components/nav/SignOutDialog.tsx` |
| Four-screen onboarding | `components/onboarding/OnboardingFlow.tsx` |
| Goals | `components/goals/`, `lib/goals.ts` |

### Where the build differs from board 05, on purpose

- **The Next rank chip sits above the Rank Road**, in the flow. On the board it
  floats over the road, where it covered gate cards while scrolling.
- **Victory hands over to the moments after about 1.8 seconds**, or at the first
  tap. On the board the moments are separate buttons. Here they queue behind the
  banner so the banner, the rolling XP, the crowns and the XP bar are seen first.
- **Reward moments queue.** One at a time, level ups and rank ups before badges.
  Replaying a badge from the Rank screen leaves out the "+XP" line, since it was
  paid when it was first earned.
- **Moments shrink on short screens** (under 740 px and 620 px tall) so nothing
  is cut off, and a short confetti pop lands with the shield or medal.
- **No photo control on Victory.** The board has one. It needs file storage, so
  it waits for Vercel Blob. The workout keeps a small optional `photo` field.
- **Share sends text, not an image.** Replaced in v9: see "Share card (v9)" below.
- **Goals and volumes follow the person's units.** The board is metric only.
  Goals are stored in kg and km and typed in kg, lb, km or mi. A total of 1,000 kg
  or more reads in tonnes (5.7 t), and for pounds as thousands of pounds (12.6k
  lb).
- **Plan-only badges are hidden from people with no plan days.** Perfect Month,
  Awakening, Month Clear, Program Complete, Iron Will and the like can only
  progress from the owner's 6-week plan, so a new person is not shown a badge
  they cannot earn. It is a display filter: what is earned does not change.
- **Shedding counts from a person's own first weigh-in** unless they have plan
  days, in which case it still counts from 110 kg.
- **Phone tabs are Home, Routines, START, Rank, Profile** and Statistics,
  Calendar and Settings are pushed pages under Profile, as decided on the board.
- **Not built:** the generated plan (rejected), a social feed, Google Health sync
  and the workout photo. See `docs/ROADMAP.md`.

### v8 as built (board 06 and the XP Rulebook)

Where each v8 decision lives. Screenshots are `docs/screenshots/stage-v8-*` (stages
b to f). The Rulebook itself is `docs/design/xp-reference.html`, and the code follows it.

| Decision | Code |
|---|---|
| Set XP, beat last time, records, finish bonus, weekly goal | `lib/routines.ts` (`setXp`, `WORKOUT_XP`), `lib/workoutScoring.ts` (`scoreWorkouts`, `planProgress`, `liveMarks`) |
| The plan snapshot taken at Start (`WorkoutLog.plan`) | `lib/session.ts`, `lib/routineValidation.ts` |
| Badges v2, goals on workouts, goals that stay achieved | `lib/badges.ts`, `lib/badgeCards.ts`, `lib/goals.ts`, `stampAchievedGoals` in `app/api/state/route.ts` |
| 6-week plan turned into workouts, v7 backup, the "XP was worked out again" note | `lib/migrations/planDays.ts`, `lib/store.ts` (`upgrade`), `AppState.rulesV2Note`, `components/home/RulesNote.tsx` |
| Workout button, Start sheet, Custom workout picker, Cardio picker | `components/nav/` (`StartSheet`, `CustomWorkoutPicker`, `CardioSheet`), `components/AppShell.tsx` |
| Log screen: adaptive stats, XP popover, Beat and Record chips, cardio card | `components/workout/`, `lib/liveStats.ts`, `lib/session.ts` |
| Workout settings (Sounds, Vibration, Keep screen on, Fill in last time) | `app/workout/settings/page.tsx`, `components/workout/WorkoutSettings.tsx`, `lib/useWakeLock.ts` |
| Workout page, XP breakdown, delete with the level-drop line | `app/workout/view/page.tsx`, `components/workout/WorkoutView.tsx`, `DeleteWorkoutDialog.tsx`, `lib/history.ts` |
| Edit workout with a date and time modal | `app/workout/edit/page.tsx`, `components/workout/EditWorkout.tsx`, `components/ui/DatePicker.tsx` |
| Home: Resource bar, Today card, Done today, desktop Today row | `components/home/`, `lib/todayCard.ts`, `lib/scrollHide.ts` |
| Routines menu (Duplicate, Delete), Create routine, pinned tabs, collapsing titles | `components/routines/RoutineMenu.tsx`, `components/RoutinesTabs.tsx`, `components/ui/PageHeader.tsx`, `lib/useScrollHide.ts` |
| Rank re-centres when the tab is tapped again | `lib/rankRetap.ts`, `components/nav/` |
| Goal sheet with an inline end date picker, weekly streak goals | `components/goals/NewGoalSheet.tsx`, `lib/goals.ts` |
| Insights for the owner | `app/insights/page.tsx`, `components/insights/`, `lib/insights.ts`, `lib/owner.ts`, `app/api/insights/route.ts` |

#### Where the build differs from board 06, on purpose

- **A workout page is `/workout/view?id=...` and its editor `/workout/edit?id=...`.**
  The board shows `/workout/w-29-pull-a`. A dynamic segment would need a server
  render for every workout id, and every page here is a static shell, so the id is
  a query parameter and the pages read it on the client.
- **The saved workout page and the cards say "Time", not "Duration".** The board's
  strength stats read Duration, Volume, Sets. Cardio and saved workouts show one
  Time tile, so the label is the same everywhere a finished workout is shown. The
  live log keeps Duration for strength and mixed workouts.
- **Cardio Time follows the clock only for a workout that is one cardio
  exercise.** With more than one exercise there is no single clock to follow, so
  each Time is typed. Typing a Time takes it off the clock for good.
- **Done today cards fill the row in a fixed order.** Finished workouts come
  first, then routines still to do (least recently done first) up to three cards,
  and "Something else" is always last. The board showed the cards in a fixed
  example order.
- **The Insights page has no "Sample data" chip.** It shows real numbers. Until 5
  people have joined it shows one line instead of the board's sample numbers.
- **Insights counts a rank from workout XP alone.** Weigh-ins, badges and goal
  rewards are left out, so "days to D rank" runs a little longer than the real
  level. It is a pace check, not a leaderboard.
- **Insights hides a week with fewer than 5 active people** as a lock on the
  chart, where the board's sample chart shows small counts.

## Other design decisions that are not on a board

- No em dashes anywhere in copy, code or docs.
- Progress from the original 6-week plan is kept exactly. Legacy XP rules do
  not change. New workouts add XP under the new rules.
- Sign-in is Google only, with an invite list. Data is stored per user.
- The app is now called Levl (see "Brand: Levl" below).

## Brand: Levl

- The name is a playful respelling of "level", the way Hevy respells "heavy".
- The logo is three rounded rank chevrons on the primary green tile, with the button's bottom bevel, a thin gold ring and a gold top chevron. It came out of three rounds: a cartoon shield (rejected as childish), four refined directions (`logo-round-2.html`, the chevrons picked) and five colourways with rounded chevrons (`logo-round-3.html`, Field green picked, with the gold ring from Wood and gold).
- The wordmark is Lilita One, the app's heading face, so "Levl" matches every other heading and label.
- `node docs/design/brand/build.js` rebuilds every asset from the one mark: `public/logo.svg` (in-app), `public/favicon.svg` (heavier strokes for 16 px), the PNG favicon, `public/favicon.ico` (16, 32 and 48 px, for Vercel and older crawlers), the app icons (rounded, maskable and the full-bleed Apple icon) and `public/og.jpg`.
- Link previews are cached by WhatsApp, LinkedIn, Facebook and X. When the OG image changes, give it a new file name (the `ogImage` constant in `app/layout.tsx`), and share the link with a query such as `?v=2` to get a fresh preview in chats that already cached the old one.

## Share card (v9)

Board: `docs/design/07-share-card-board.html` (two rounds). The reference card
code and the measured Lilita One widths are in `docs/design/share-card/`.

- **Share sends a picture now.** Before v9 it sent a text line and the card was
  only a preview. The card is one SVG, 1080 by 1350, used both for the preview
  and for the PNG that is shared or saved, so what you see is what gets sent.
- **Split layout.** Round 1 showed Stacked, Split and a 9:16 Story. Split won:
  the body figure is big on the left, the stats stack on the right. Story waits.
- **No rank line.** "E-Rank Hunter · LV 4" was dropped because the shield says it.
- **One-line title.** It shrinks through four sizes, then stops at the last whole
  word with an ellipsis.
- **Centred lockups.** The logo, "Levl" and the date share one centre line, and
  the title is centred on the shield. Both fonts have a letter height of 0.71 em,
  so a line is centred on y when its baseline is y + 0.355 times the size.
- **Random sky.** The app's two cloud shapes, placed at random in a far and a near
  layer, seeded by the workout id and a roll. The same workout always opens with
  the same sky; the gold dice on the preview's corner rolls a new one. The dice
  lives on the sheet, never on the picture.
- **Muscles.** Two-tone like the workout page. The body lights every muscle
  worked; chips show the three with the most sets, then "+N more muscles".
- **Cardio.** A cardio-only card has no body: the distance is the big number,
  with time and pace, or speed for rides. Before v9 a run shared as "Sets 1".
- **XP** is the workout's own XP everywhere. Victory used to add badge XP.
- **Buttons.** Share image (green) and Save image (gold). No Copy text. Where a
  browser can't share pictures, only Save image shows.

## Daily bonus and rest days (v10)

Rules v3, in `docs/design/xp-reference.html` (republished to the same artifact).

- **Why.** The finish bonus needed the whole plan. Routines seeded from the old 6-week plan end
  with a treadmill, so skipping it, or logging the run as its own workout, lost the bonus ("Treadmill
  isn't done"). Two bonuses a day read as one for lifting and one for cardio. And removing an
  exercise mid-workout shrank the plan, so the bonus could be kept by deleting what you skipped.
- **One daily bonus.** +50 once a day when the day adds up to 20 minutes: 3 minutes a ticked set,
  cardio its minutes, every workout that day together. No plan check at all. Picked over "finish
  your plan once a day" (still loses the bonus to a skipped treadmill) and "any workout" (one set
  would earn it).
- **Training days.** A day that reached 20 minutes. The weekly goal, the streak, Finisher, Month
  Clear and "Training days" goals count them.
- **Streak stays weekly.** Strength training works best 2 to 4 days a week with rest (ACSM 2026,
  WHO, NHS), so a daily streak would reward skipping recovery. Strava, Hevy and Peloton are weekly
  too. One training day keeps the week; the weekly goal is the stretch target.
- **Rest days and comeback.** Days off show "Rest" on Home, and after the goal is met the rest of
  the week does too. +25 for the first training day after a week with none, because rewarding
  the return worked better than punishing the gap in the StepUp megastudy.
- **Plans** are kept only for the Clean Sweep badge, and removing a planned exercise no longer
  shrinks them.

### v10.1: rest days on every page, and the level XP bar

Agreed in the conversation after a UI check of v10 (no board; the plan is in `docs/V10_PLAN.md`).

- **Why.** Only Home's week strip knew about rest days. The Calendar, the Profile month strip and
  the Statistics day chips still marked any workout, so a 6 minute day was "Rest" on Home and
  green everywhere else.
- **One rule.** Training day (green), rest day (the same sand as Home), or open (plain). Rest days
  count from the first logged workout, so the months before someone joined are not a wall of
  rest, and a brand new account no longer starts the week with two rest days. A short-workout day
  is a rest day; the Calendar adds a small dot so it can still be opened, and its day list says
  "6 of 20 training minutes (each set counts 3), so this counts as a rest day". It says "training
  minutes" because the workout card above shows clock time, which can differ (8 min for 2 sets).
- **Calendar keeps its numbers.** A month grid needs dates, so rest is the sand tile plus a legend
  rather than the word "Rest" in every cell. The Statistics chips have room for the word, like Home.
- **XP bar inside the level.** The phone bar showed total XP over the next threshold ("582 / 600").
  It now shows XP into the level over what the level takes ("282 / 300"), like Clash Royale and
  like the desktop card, Rank, Victory and the level-up moment already did. The Rank Road's level
  rows show "XP to go" instead of total thresholds, since the total is no longer shown anywhere.

## 08 Home header (v10.2)

`docs/design/08-home-header-board.html`, published as an artifact.

- **Why.** The phone's Home header was dark wood pills on a light sky, the XP bar was 26 px, and the
  level was only a number on a rank-coloured shield, which did not read as a level.
- **Round 1.** Four options: A cream bar with a LEVEL tag on the shield (my pick), B a rank-coloured
  "Lv 4" chip with no shield, C a mini hunter card (the desktop card made compact), D A's layout in
  frosted white. Each was shown above the Today card and in four states at 360 px.
- **Picked: C, amended.** Since "Level 4" is written out, the shield shows the rank letter, and the
  "287 XP to level 5" line is dropped because the bar's "113 / 400" says it.
- **Round 2** recorded the amended header, plus two things raised with it:
  - **Day tiles.** The green training-day tiles drew their bevel 3 px below the tile, so they looked
    taller than their neighbours and covered the bottom of the gold today ring. The bevel now sits
    inside the tile on the Home week strip, the Calendar, the Profile strip and the date picker's
    selected day; today gets a full ring with a small gap; rest days get a thin border. Buttons and
    chips keep the bevel below, where it is the press cue.
  - **Time away.** Asked whether missed days should cost XP or rank, Solo Leveling style. No: XP comes
    only from logged workouts, so time away already never lowers XP, level or rank, and losing rank
    while away would punish people at the moment they might return. A week off ends the streak and
    misses the weekly goal; the comeback bonus pays for coming back. The rulebook says so in one line.

## 10 Runs, logging and consistency

`docs/design/10-runs-logging-board.html`, published as an artifact. From a runner's feedback. (Board
09, badges, is parked: shown, not answered yet.)

- **Round 1** showed laps (a live Lap button, or typed rows), Log vs Start (two big buttons, a
  switch, or a row), how it felt (faces, a 1 to 10 effort, or both) and three ways to reward
  consistency, compared on three people over 10 weeks.
- **Picked:** the live Lap button; two big buttons; faces plus optional effort (no XP); a weekly goal
  bonus that grows by +10 for each week in a row, up to +100. Records and beats judge a whole run,
  never a single lap.
- **Round 2**, after the user asked how a logged workout adds exercises and what each start point
  does: Log reuses the Edit workout screen (Add exercise, Swap, Remove, sets) with When and How long
  on top and Save at the bottom, shown for a routine, a custom workout, a run with typed laps and a
  mixed workout. A table maps all ten start points. Three layouts for the Workout sheet (mode
  buttons over the list, two doors, today's routine first) and three rules for the other start
  points, plus answers for the edge cases: a workout in progress, a half-done log, past weeks scored
  again, the same routine twice in a day.
- **Round 2 turned down:**
  - The Workout sheet's mode buttons. They switched the list below like tabs, and a button should
    do what it says.
  - The words "Log one I did", which are not plain English.
  - A redrawn sheet, when today's Start sheet already works. Change the current screen as little as
    possible.
  - The tall "+ Add exercise" button. Buttons keep the app's sizes.
  - Start plus Log on all ten start points, which is too much.

  The user also had to point out, again, that buttons side by side must be equal widths. These
  rules are now in the `levl-board` skill and in CLAUDE.md.
- **Kept from round 2:**
  - Log in a routine's menu with a slightly bigger New pill;
  - Log on a routine's page, at equal widths;
  - the Log screen for each kind of workout;
  - the Cardio sheet;
  - desktop Home.
- **Built (v11 stage 1):** the laps pick, as the board showed it:
  - the live Lap button (one full-width button, not the board's two);
  - the distance chips;
  - editable rows, with the fastest lap tinted;
  - "+ Add lap" in Edit workout;
  - the summary line, bars and table on the workout page.
- **Equal widths fixed across the app:** five places had two buttons of different widths:
  - routine cards;
  - a routine's page;
  - Explore cards;
  - the page headers: Share and Edit, Create routine and Explore, Discard and Finish.

  `.wt-rc-actions` and `.wt-ph-actions` are now equal grid columns.
- **Round 3**, built from screenshots of the real app with the change made (a scratch prototype),
  so sizes are exact:
  - Today's Start sheet is unchanged. Log goes in three places only:
    - a "Log a past workout" button on Home;
    - a routine's menu, with a 24 px New pill;
    - Edit, Log and Start on a routine's page.
  - The Log sheet is the Start sheet with Log in place of Start.
  - The Log screen is Edit workout titled "Log workout".
  - Options shown:
    - three for the Home button (a button under the tiles, a text link, a fourth tile);
    - two for the Workout sheet (unchanged, or one button on top);
    - four wordings.
- **Round 3 answers:**
  - Home: H1, the button under the tiles (under Choose on desktop).
  - The Workout button's sheet: S1, unchanged.
  - The words: "Log workout", the user's "keep it simple", in sentence case like "Start workout".
  - Log in three places: Home, a routine's menu with a New pill, and a routine's page with Edit, Log and Start at equal widths.

  Built as v11 stage 2 (`docs/V11_PLAN.md`).
- **Built (v11 stage 4, rules v4):** the growing weekly goal bonus from round 1, option a:
  - +50 the first week the goal is met, +10 more for each week in a row, up to +100 from week 6.
    A week short of the goal, even with training, starts it again at +50. Every goal week paid
    +50 before, so nobody's XP goes down.
  - **Home line chosen on 2 October 2026**, over the board's separate card: two short lines under
    the streak row of This week ("Goal bonus this week: +80 XP" and "Goal met 3 weeks in a row",
    then "Goal met 4 weeks in a row: +80 XP" and "Next week pays +90 XP"). Nothing else on Home
    changes and the phone header stays as it was.
  - Victory and the workout page show the real amount, with "3 of 3 training days, 4 weeks in a
    row" from the second week in a row. Settings says how the bonus grows.
  - A one-time note on Home, a copy of the state kept first (`backup:v11`) and a committed XP
    integrity test that prints a before and after table (`tests/xpIntegrity.test.ts`).

## 11 Guide and What's new

`docs/design/11-guide-board.html` (images in `docs/design/11-guide/`), published as an artifact.
The user asked for a lasting way to explain Levl, like games do: a short guide for someone new
(the tabs, how XP works, the basics) and a What's new card the next time people open the app
after a release. Also a record of every screen as it is today, leaving out the early boards whose
screens nobody sees any more.

- **Round 1** shows:
  - **The app today:** 40 phone screens and 7 computer screens from the live build with demo
    data, each with what it is for, what you can do, the board where its design was last set, and
    a tag: 23 Stable, 14 Changed in v11, 3 New in v11. Then How XP works in plain words (rules v4).
  - **The first-run guide:** A, a spotlight tour on Home after the setup questions (a welcome
    card, seven steps on the real screen, a How XP works card; playable at phone and computer
    size); B, story cards in the teaser stories' look; C, first-visit tips per tab. My pick: A.
  - **What's new:** A, a paged game card (one change per page, a real picture, one button, an
    "XP rules changed" tag for rule changes); B, an update screen; C, a card on Home. The example
    is the real October update: laps, Log workout, How it felt and the growing goal bonus. My
    pick: A.
  - **How it works:** one thing per open, only on Home, never during a workout or on Victory; new
    people get the guide and never old updates; per person on the server, guide done and the last
    update seen; an update is one entry in a list, added with the release; two new Settings rows
    (How Levl works, What's new) and Welcome tour renamed Setup questions.
- **Round 1 answers (2 October 2026):** my pick on all seven. The spotlight tour ("a very good
  industry standard ... it looks so good with respect to game-like design"), its steps and words as
  shown, What's new only for people already on Levl, the paged game card, rule changes through
  What's new, the two Settings rows and Setup questions, and the October update as the first one.
  Badges and chests (board 09) stay as they are.
- **Round 2**, two fixes the user asked for:
  - **The ring wraps the shadow.** Cards and buttons have a bevel under them (4 px on cards, 5 px
    on the Workout button). The gold ring now treats it as part of the element: the same 4 px gap
    on all four sides, measured from the bottom of the shadow, so the bottom corners sit as cleanly
    as the top ones. The build measures the bevel from the element's own `box-shadow`.
  - **One gold border on the step card.** The 7 cards with Skip and Next had a darker bevel under
    their gold border, which read as a second gold line. They keep one border and a soft shadow.
    The welcome and How XP works cards keep the app's game modal look.

  Built as v12 (`docs/V12_PLAN.md`).
- **Changed before release (3 October 2026):** "there are very few users who are actually using the
  product, so it would be better if everyone sees the introductory screens." People already on Levl
  get the guide once too, on their first open, then the October update on a later open.

## 12 Motion and sound

`docs/design/12-motion-sound.html`, with its code, sounds and licences in `docs/design/12-motion/`.

- **Why:** the user found Levl's motion and sound "okay" but boring: one pop for everything, the
  same words on every reward, a single rudimentary brown chest. They sent five Clash Royale
  screenshots and five videos (chest opening, card upgrade, level up, two screen recordings) and
  asked for a motion and sound library for the whole app: micro-interactions and their sounds,
  click sounds, music where it fits, a premium tap-to-open chest inspired by (not copied from) the
  game, 34 premium interactions, and a free hand to redo every badge. They also said they did not
  like board 09's chest and badge art.
- **Answers before the board (3 October 2026):** music in reward moments only, never while
  training; recorded free-licence sounds for rich moments and code-made sounds for tiny taps;
  every chest waits for a tap, rarer tiers take more taps; tap sounds on by default, quiet, and
  mixed with the person's own music.
- **The other chat's board 11, "the Levl motion language"** (branch `claude/cool-euler-wpvctn`,
  not merged), had eight moves, three springs and twelve code-made sounds. The user found it
  boring and said the two boards go hand in hand. Board 12 takes it over: its springs (slam,
  rise) and all eight moves are kept and mapped to where they now live. The number clash with
  our board 11 (the guide) is settled when that branch is merged or retired.
- **Round 1, shown (3 October 2026):**
  - **References:** the videos were studied frame by frame (6 frames a second) with the sound
    plotted against the picture. Only written lessons and timings were kept; no frame, art or
    sound from the game is in the repo or the artifact.
  - **Two art directions, both new:** A, premium vector (layered SVG); B, real 3D built in code
    with three.js (no model files). Nine chests in each (Wooden, Silver, Golden, Crystal,
    Obsidian, Prismatic, Monthly, Royal, Pillow; board 09's tier list), and medals for every tier,
    shape, monthly, special and secret badge, a stone locked style, and one tier palette to
    replace `TIERS` and `MEDAL_TIERS`. My pick: B, with small badges as pictures rendered from
    the same models.
  - **The reward stage:** a deep Levl-blue diamond backdrop; the chest drops, waits, takes 1 to 3
    taps, bursts, and hands out each badge with a ribbon, name, what it measures and XP coins
    that fly into the level bar; a counter of rewards left; a You got summary with Continue last.
    Playable in both directions.
  - **The 34 interactions,** each live with its motion, timing, sound and haptic: taps and
    controls (8), overlays (4), training (8), Victory and progress (6), rewards (7), ambient (1).
  - **Library rules:** durations, easings and three springs; one sound and one haptic per kind of
    moment; three sound buses; the ambient audio session; reduced motion; haptics on Android
    only (iPhone browsers have no web vibration).
  - **Sounds and music:** 45 effect candidates and 12 music candidates, all CC0 (Kenney packs and
    OpenGameArt), cut and evened out with ffmpeg, sources in `12-motion/sounds/LICENSES.md`. My
    picks are marked, with the caveat that I chose them without listening.
  - **Settings:** a Music switch next to Sounds and Haptics.
  - **Board 09 carry-overs:** the badge view, rank gates, stone, a chest per tier, tap to open,
    and tier up are answered here; the new badge list and XP for new families wait for board 09
    round 2.

- **Round 1 answers (3 October 2026):**
  - **Art:** 3D (B). Loved the wooden chest; Golden, Pillow, Bronze, Silver and Diamond kept.
    Crystal and Prismatic: no spikes, redesign. Obsidian: one more option. Monthly: less white.
    Royal: new gold tone and gem. Gold medal: no laurels, the red is wrong. Master and Legend:
    options; Legend must not read as a plain circle. 3D icons too large. Locked: stone, centred
    in its ring.
  - **Sound:** the chest music did not suit Levl; the badge sound sounded sad ("the main
    character died"); the chest opening said "you have failed"; close, Saved and Got it were
    shrill or weird; several sounds too loud, the landing too quiet.
  - **Stage:** the open chest fell off screen; earlier badges vanished; the summary medals were
    small; drop the "You got" heading. Wanted a swirling badge reveal, a tier up that turns into
    the next tier, a real shatter for rank up, skeleton loading, and a full flow: Finish, Victory,
    then the chest, with the XP at the top counting up.
  - **Approved:** the library rules, the Music switch, badge tilt, and retiring the other chat's
    motion-language board.
- **Round 2, shown (3 October 2026):**
  - **Checked, not guessed:** every candidate was pitch-tracked and key-checked
    (`tools/contour.py` in the working files). The sad sounds were minor or falling, and the badge
    bell sat a tritone from the music's key. Good moments now keep only rising, major candidates,
    and every reward sound plays in the key of the chest music. Files are levelled by loudness
    (EBU R128) with per-slot volumes.
  - **Music:** nine chest pieces in three feels (bright game-pop, cinematic, upbeat workout) cut
    on bar lines, a code-made shimmer that lifts with each tap, and None; four level-up options;
    rank up trimmed to 4 s.
  - **Art:** 3D only, with chest options (Silver, Crystal, Obsidian, Prismatic, Monthly, Royal)
    and medal options (Gold, Master, Legend), no laurels, smaller icons, a stone locked medal.
  - **Stage:** the open chest settles in the lower third; each badge swirls out and gets a card
    framed in its tier colour; earlier badges fly to a tray that becomes the summary (no
    heading); the XP counts up with the XP-lines sound; a full finish and a rank up to play; a
    half-speed switch.
  - **The 34:** the round 1 fixes, soft close and open sounds, a skeleton, a seal for the
    weekly goal, the reward cards in 3D, a real shatter for rank up.
- **Which chest opens (decided 3 October 2026):** the user asked how the chest is chosen, since
  with "the best badge decides" most people would only see Wooden and Silver. A simulation with
  the real rules confirmed it: a regular lifter (3 a week) gets 21 chests in 156 workouts, 12 of
  them in the first 3 months; a casual one (2 a week) gets 10 a year and never sees Obsidian or
  Prismatic. The user proposed a Clash Royale style road where crossing a rank opens a chest.
  Decided: **your rank decides your chest** (E Wooden, D Silver, C Golden, B Crystal, A Obsidian,
  S Prismatic). A workout that earns a badge opens your rank's chest; crossing a rank opens the
  new rank's chest for the first time with the title and frame; Monthly, Royal and Pillow stay for
  monthly, special and secret badges. Nothing new is stored.

- **Round 2 answers (9 October 2026):**
  - **Chests:** Silver as shown; Crystal: faceted crystal; Obsidian: void; Prismatic: opal;
    Monthly: two-tone; Royal: antique gold with a ruby. Wooden, Golden and Pillow as before.
  - **Medals:** Gold: sunburst gold; Master: violet flame; Legend: star-burst.
  - **Sounds:** my pick for every slot, except: the medal flying out is Air move (Almitory);
    exercise complete is the marimba run made in code; new record is the fanfare made in code.
  - **Music:** no chest music; rank up is Triumphant (Emma_MA, C major, 4 s).
  - **Asked:** what the end of a workout shows when there is no badge and no level up, or a
    level up without a rank up.

## 13 Rank Road and chests

- **Why:** the chest rule above needs a place where people see the chests coming. The user asked
  for the Rank page to work like Clash Royale's Trophy Road, and what its milestone tiles would
  hold when Levl has no gold or items.
- **Round 1, shown (3 October 2026, `docs/design/13-rank-road.html`):**
  - **The tiles hold badges:** the rows behind you show the badges you earned on that level; your
    level shows Up next, the three closest badges; rank gates show their chest, what is inside,
    and the badges that came out of it. Rows ahead stay as today. No new currency.
  - **Two looks:** A, today's light road with chests (my pick); B, a Trophy Road of tiles on the
    stage blue with a rail and a marker.
  - **States** from a simulated regular lifter: new, D rank, one level before C, just reached C,
    S rank; the computer layout; the rank up handing back to the road with the gate ticked.
  - **Early levels:** no change now. The start is already quick (D rank by week 2 to 3); the slow
    part is the middle. Insights (median days to D) decides in 4 to 6 weeks.
  - **Later, not now:** small unlocks every few levels (share-card backgrounds, frame colours).
- **Round 1 answers (4 October 2026):**
  - **Look A,** today's light road. From B, the user liked the gate cards in their rank's colour.
  - **Too much detail on the gate cards:** drop the "Hunter" copy, say the level once, shorten
    the chest line.
  - **Your rank:** "4 levels to the next rank" and its bar are unnecessary; scroll up instead.
  - **Your level:** "Now 0 / 100 XP to level 2" repeats "100 XP to go"; show the progress on the
    road's vertical line, not in a card. Up next is not needed: the Badges tab has it.
  - **Badges on the rows behind you:** liked, but asked whether they are needed when the Badges
    tab has them (open).
  - Themed chests, early levels and later unlocks: not answered yet (kept open).
- **Round 2, shown (4 October 2026):**
  - **Gate cards:** the rank's shield colours (grey E, green D, blue C, purple B, gold A, red S),
    "C rank", the level once ("Level 10", or "Your rank, since level 10"), and "Golden chest:
    title and frame". A tick on the chest once opened; a gold frame on your rank; a dashed edge
    and a lock for ranks ahead.
  - **Your level:** "You are here". The road's gold line fills from your shield toward the next
    level's dot as you earn XP, with a glowing tip. The next level keeps "XP to go".
  - **Up next and look B removed.**
  - **Open question shown both ways:** the road with small medals on the rows behind you (my
    pick) and without.

## Where the chat lives

The conversation is not stored in the repo. Long chats are summarized when the
context fills up, and the working files of a cloud session are temporary. What
matters is copied here: the boards, the plan, and this file. The boards are
also published as private artifacts on claude.ai, but the copies in the repo are
the ones to rely on.
