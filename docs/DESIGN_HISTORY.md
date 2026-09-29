# Design history

Every design we explored, in order, and why each one changed. The boards are
standalone HTML files in `docs/design/`. Open them in a browser. They are
clickable prototypes, so they show the flows better than screenshots do.
`docs/ROADMAP.md` holds the full plan and the decisions behind it.

The final target is board 05. The build follows it.

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
