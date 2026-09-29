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

## XP Rulebook (rules v2)

`docs/design/xp-reference.html`

The scoring rules in one page, with a calculator. The ideas: XP comes from effort and from
beating yourself, never from how heavy you lift, and a real session is needed for the finish
bonus.

- +5 a set, whatever the weight. Cardio 1 XP a minute, 30 at most a set, +10 with distance.
- New: +10 per exercise for beating last time. A record (best ever) pays +25 instead.
- The +50 finish bonus needs 20 work minutes, with a set counting as 3 minutes. At most 2 a day.
- The weekly goal counts only workouts with a finish bonus.
- Iron Mover counts sets, not tonnes. Month Clear needs 25 training days. New: Goal Month and
  Clean Sweep. Plan-only badges retire.
- The level curve stays at 50 × n × (n − 1) until the testers' data says otherwise.

## As built

Where each decision from board 05 lives in the code, and where the build differs
on purpose. Screenshots of each stage are in `docs/screenshots/` (`stage2-*`,
`stage3a-*`, `stage3b-*`, `stage4-*`).

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
- **Share sends text, not an image.** The sheet previews the card (title, stats,
  rank shield, XP) and shares its text with the Web Share API, or copies it. The
  board's picture of the card, with "Save image", is not built yet.
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

## Other design decisions that are not on a board

- No em dashes anywhere in copy, code or docs.
- Progress from the original 6-week plan is kept exactly. Legacy XP rules do
  not change. New workouts add XP under the new rules.
- Sign-in is Google only, with an invite list. Data is stored per user.
- The app keeps the name Home Workout for now.

## Where the chat lives

The conversation is not stored in the repo. Long chats are summarized when the
context fills up, and the working files of a cloud session are temporary. What
matters is copied here: the boards, the plan, and this file. The boards are
also published as private artifacts on claude.ai, but the copies in the repo are
the ones to rely on.
