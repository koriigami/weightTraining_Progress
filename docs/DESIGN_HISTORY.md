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

## Where the chat lives

The conversation is not stored in the repo. Long chats are summarized when the
context fills up, and the working files of a cloud session are temporary. What
matters is copied here: the boards, the plan, and this file. The boards are
also published as private artifacts on claude.ai, but the copies in the repo are
the ones to rely on.
