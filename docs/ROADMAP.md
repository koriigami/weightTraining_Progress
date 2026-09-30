# v7 roadmap: routines like Hevy, plus Solo Leveling gamification

## Status (updated after v8 stage F)

The v7 redesign was merged to `main` (304f149) and is live. v8 fixes what day-to-day use turned
up, moves XP to rules v2 and removes the 6-week plan. Its plan is in `docs/V8_PLAN.md`. All of
v8 is built on the branch `claude/home-workout-nutrition-plan-kuyhvx` and is not merged yet.

| Stage | What | State |
|---|---|---|
| Phase 1 | Google sign-in, per-user data, owner migration, static pages | Done, live |
| Design boards | v1 to v5, final target is board 05 | Done, in `docs/design/` |
| 1 | Data layer: exercise library, routines, workouts, scoring, badge families, API actions, legacy parity test | Done |
| 2 | Arena Bright tokens, UI primitives, shell (tab bar with START, sidebar), Home | Done |
| 3A | Routines, Explore, Exercises, editor, Log workout, Victory and Share | Done |
| 3B | Rank Road and Badges, Profile, Statistics, Calendar, Settings, onboarding | Done |
| 4 | Reward moments (level up, rank up, badge chest) with a queue, sounds and haptics, goals and volumes in the person's units, plan-only badges hidden, docs, full regression at 390 px and 1440 px, axe check | Done |
| v7 release | Merged to `main`, deployed to production | Done |
| v8 design | Board 06 (UX fixes) and the XP Rulebook, see `docs/design/` | Done, signed off |
| v8 A1 | Scoring rules v2, badges v2, goals on workouts that stay achieved | Done, on branch, not merged |
| v8 A2 | The 6-week plan removed: plan days become workouts on read, with a v7 backup | Done, on branch, not merged |
| v8 B | Workout flow: Workout button, Start sheet, Custom workout, Cardio picker, adaptive log, Workout settings | Done, on branch, not merged |
| v8 C | History: workout page, Edit workout, XP breakdown, delete with a level-drop line | Done, on branch, not merged |
| v8 D | Home (Resource bar, Today card, Done today), Routines menu, pinned tabs, Rank re-centre | Done, on branch, not merged |
| v8 E | Goals and dates: the date picker, the goal sheet, weekly streak goals | Done, on branch, not merged |
| v8 F | Owner-only Insights, docs and screenshots | Done, on branch, not merged |
| v8 release | Opus review, then a fast-forward merge to `main` once the user says yes | Waiting |


### Next

1. **Level-pace review.** After about 3 weeks of tester data, open Insights (days to D, C and B
   rank, workouts a week) and decide whether the level curve `50 * n * (n - 1)` and the XP rules
   need to change. Until then the curve stays.
2. **Remove the page headers** (backlog). The phone tab screens keep a large title and the desktop
   a header row. Try screens without them, with the title only in the tab or the sidebar.
3. **Rewards.** Coins, cosmetics, streak shields and a season road. Rewards never buy XP: XP stays
   a record of effort.
4. **Photo storage with Vercel Blob.** Victory has no photo control yet. Upstash Redis cannot hold
   images, so photos go to Vercel Blob (free tier) and the workout keeps only a URL in `photo`. A
   photo stays optional.
5. **Image share cards.** Done in v9: Share sends the card as a 1080 by 1350 picture with a random
   sky, the muscles worked and the right stats for cardio, or Save image downloads it. Next: a 9:16
   Story size as a Post / Story switch.
6. **Google Health sync.** Weight first, then workouts. Health Connect is an on-device Android
   API, so a web app goes through the Google Health cloud API. Verify that before building.
7. **Rename the app.** Done: the app is now Levl (name, logo, metadata, manifest and icons).
8. Smaller: a real ESLint setup (`npm run lint` is not configured), and a component test layer for
   the reward moments.
9. **Dev tooling.** Done: `CLAUDE.md`, `npm run verify`, the QA harness (`npm run qa`), the
   `levl-builder` and `levl-ui-check` agents, the `levl-release` and `levl-board` skills, and CI on
   every push. What to add later and when: `docs/AGENTS.md`.

## Brand and launch essentials

- Custom domain (for example a Levl app domain), then update `metadataBase` (or set `NEXT_PUBLIC_SITE_URL`).
- Google OAuth consent screen: set the app name and logo to Levl.
- Rename the Vercel project to Levl.
- Done: `/privacy` and `/terms`, public and linked from sign-in, the invite-only page and Settings. Have a lawyer read them before a public launch, and add an in-app "Delete my account" button so deletion does not need an email.
- Done: the Tally waitlist form (`https://tally.so/r/kdMyYM`) is the default in `lib/waitlist.ts`.
- A trademark and name check for "Levl" before public launch.
- App store style screenshots.
- An OG image per shared workout (image share cards, already possible in Next).

The generated plan (the Trainer) was rejected and is not on the list. See `docs/DESIGN_HISTORY.md`.


## Context

Phase 1 (Google sign-in, per-user data, owner migration) is live: production serves "Sign in with Google" and `/api/auth/providers` lists Google. GitHub `main` is still at `7f52bec` (the passcode version), though. The feature branch holds Phase 1 at `ebd5b57`. So the next push to `main` would redeploy the old app.

The Phase 2 design board (a generated plan with a 13-screen onboarding) was rejected:
- **Too many questions.** Onboarding should be 3 or 4 screens.
- **No fixed schedules.** Most people don't train on fixed days.
- **No forced generated plan.** People should build their own routines, or just log what they did.
- "Anything to avoid" was liked.

The reference is **Hevy**:
- A clean, spacious desktop with a left sidebar (Feed, Routines, Exercises, Profile, Settings).
- A user row at the bottom of the sidebar.
- An exercise library filtered by equipment and muscle, where each exercise maps to muscle groups.
- A routine builder with a library panel.
- A 5-step onboarding (Username, Units, Plans, Get started).
- A "Trainer" (generated plans), with goals behind a paid tier.

Our edge over Hevy is the Solo Leveling gamification (XP, levels, E to S ranks, badges, celebrations).

The user also reports:
- The current UI feels crammed and scattered, mostly on desktop.
- The account avatar sits in the top bar.
- Navigation feels laggy.

The user will share Hevy mobile screenshots before the mobile design is fixed.

### Confirmed decisions
- **Per-set logging, like Hevy:** sets are prefilled from the routine, and you tick each one and edit the weight or reps.
- **Frequency** = times per week.
- **The owner's 6-week plan becomes routines** from now on. The history stays exactly as is.

### Definitions (from the user)
- **Routine** = one day's worth of exercises, e.g. "Push day". It is an ordered list of exercises. Each exercise has sets, and each set has a planned weight and reps. It is not a week or a month.
- **Frequency** is optional metadata on a routine. It never forces a schedule.

## Step 0: sync main with production (first thing after approval)
- Fast-forward `main` to `ebd5b57` so GitHub matches what Vercel is serving. Push `main`.
- Tell the user they can now remove `APP_PASSCODE` from Vercel.

## Step 1: fix navigation lag (small, independent, ships first)
Cause: `app/layout.tsx` is `async` and calls `await auth()`. That makes every route dynamic, so each tab switch waits on a serverless round trip (cold start plus JWT decode) before the page changes. There is no `loading.tsx` either. Every page is a client component reading `useProgress()`, so the server render adds nothing.

Fix:
- Make the root layout static. Drop `auth()` there and let `SessionProvider` fetch the session on the client.
- `AppShell` shows a light skeleton while the session status is `loading`.
- Keep the provider flags (`hasGoogle`, `hasDev`) as build-time values, passed from the server.
- Routes become prerendered, and `<Link>` prefetch makes tab switches instant.
- Verify with `next build` output (routes marked static) and a Playwright timing check of tab switches.

## Phase 2 (new): routines, exercise library, workout logging, clean UI

### Information architecture
Desktop follows the Hevy sidebar. Mobile nav is final only after the phone screenshots.
- **Home:** Start empty workout, your routines as quick-start cards, rank/XP card, this week at a glance, recent workouts.
- **Routines:** list, New routine, and the routine editor.
- **Exercises:** library with equipment and muscle filters, search, a muscle map per exercise, and Custom exercise.
- **History:** calendar of what you did, with past workouts and activities. It replaces today's Calendar tab. The owner's 6-week history stays visible.
- **Profile:** rank shield, level, badges, goals, weight, preferences (units, equipment, avoid list), and sign out.
- **Desktop shell:**
  - A 256 px left sidebar with the logo, nav items, and the user row plus sign out at the bottom.
  - Content max width about 880 px, with an optional right column (for example the library panel in the routine editor).
  - White cards on a soft background, 24 px card padding, bigger type, far more whitespace.
  - No top app bar on desktop. The rank chip moves into the sidebar user row.
- **Mobile (confirmed from the Hevy screenshots):** 3 tabs, Home, Workout and Profile. Profile holds a dashboard: Statistics, Exercises, Badges, Calendar, Measures, Goals.

### Onboarding (3 or 4 screens; runs once after the first Google sign-in)
1. **Units:** kg/lb and km/mi (segmented controls, like Hevy).
2. **Your equipment:**
   - Gym (everything), home (checklist), or none.
   - Home adds dumbbell weights as chips, e.g. 2, 3, 5, 10 kg.
   - This only sets the library's default filter.
3. **Anything to avoid?** Chips (lunges, burpees, jumping) plus joint limits. Avoided exercises are hidden or flagged in the library and in swap suggestions.
4. **How do you want to start?**
   - Build my own routine: opens the routine editor.
   - Start from a ready-made routine: pick from 4 to 6 starter routines.
   - Just log as I go: goes to Home.

   Nothing is forced, and everything can be changed later in Profile.

### Exercise library (`data/exercises.ts`, about 100)
- Fields:
  - `id`, `name`, `equipment`
  - `primary` muscle and `secondary` muscles (Hevy-style muscle groups: chest, upper back, lats, shoulders, biceps, triceps, forearms, abs, obliques, lower back, glutes, quads, hamstrings, calves, adductors, abductors)
  - `pattern` (used for swap suggestions)
  - `metric`: `weight_reps`, `reps` (bodyweight), `time`, or `distance_time` (cardio: treadmill, cycle, run, walk)
  - `stresses` (joints) for the avoid list
- **Custom exercises** are stored per user with the same fields.
- A **muscle map** is our own simple front/back body SVG, highlighting primary muscles strongly and secondary ones lightly. It appears on the exercise detail and as a routine summary (like Hevy's "Summary" panel).

### Routines (per user: `wt:user:{sub}:routines`)
- `Routine`:
  - `{id, title, notes?, exercises: [{exerciseId, sets: [{kg?, reps?, seconds?, km?}], restSec?}], timesPerWeek?}`
  - `timesPerWeek` is optional (confirmed: a weekly count, no fixed days). Home shows "Push day: 1 of 2 this week". It feeds the weekly streak and never blocks anything.
- **Editor** (Hevy layout):
  - Desktop: the title and exercise list on the left, the library panel on the right (filters plus search, tap + to add), and a Summary card with the exercise count, total sets and a muscle map.
  - Mobile: "Add exercise" opens a full-screen library picker.
  - Per exercise: add or remove sets, a weight/reps (or time/distance) input per set, reorder, remove, and swap with the same pattern.
- Ready-made starter routines (templates) include the owner's current sessions: Full Body, Push A, Push B, Pull A, Pull B, Legs.

### Workout logging (per user: `wt:user:{sub}:workouts`)
- **Start** from a routine or as an empty workout. Sets are prefilled from the routine. You tick each set, editing the actual weight and reps if they differ, and can add exercises on the fly. Then Finish.
- A workout is `{id, date, routineId?, title, startedAt, finishedAt, exercises: [{exerciseId, sets: [{kg?, reps?, seconds?, km?, done}]}]}`.
- **Quick log** for cardio and other activity: run, walk or cycle, with minutes and optional km, on any date. It is the same shape as a one-exercise workout.
- After finishing, you can offer to "Update routine with these weights" (like Hevy).

### Gamification (kept; the differentiator)
- **Existing progress is kept exactly.**
  - Legacy day logs (`state.days`, keyed to the static 6-week plan) keep their current XP rules untouched.
  - New workouts add XP under the new rules.
  - Totals, levels, ranks and badges are derived from both.
- **New XP rules:**
  - +5 per completed set. A 3-set exercise gives 15, the same as today's strength tick.
  - Cardio: 1 XP a minute, capped at 30, plus 10 with distance.
  - Finishing a workout: +50.
  - Weekly target hit: +50.
  - PR (heaviest set or best volume for an exercise): +25.
- **Streaks become weekly, like Hevy:** a week counts if you trained at least once. Separately, hitting your weekly goal (Settings, default 3) gives +50 XP. The owner's past daily streaks and badges stay earned.
- **New badge families:**
  - workouts finished (1, 10, 25, 50, 100)
  - total volume lifted (tonnes)
  - PRs set
  - weekly streak
  - variety (muscle groups trained)
  - cardio distance (existing Road Runner and Rider tiers extend to logged activities)
- Goals move to Profile and keep working on both old and new data.

### The owner's current plan
- The 6-week plan's history stays exactly as is, visible in History.
- Its sessions become the owner's starter routines, with sets and reps from the plan and dumbbell weights from the plan text. The owner uses routines from today onward. Their Oct 1 to Nov 1 days aren't forced; the routines are one tap away on Home.

### Out of scope for now
- The plan generator / "Trainer": maybe later, like Hevy's paid Trainer tab.
- Social feed.
- Google Health weight sync (Phase 4, unchanged).

## Design board v5 (next; design only, republished to the v4 URL)

Feedback on v4.1:

1. **Mobile Finish and Discard dialogs render wrong.** Cause: `.app.phone>*:not(.sky):not(.sheet-wrap):not(.moment){position:relative}` also catches `.gm-wrap` (and `.ob-dialog`). The dialog drops into the flex column at the bottom and pushes the pinned footer up. Fix: the overlay rule excludes every overlay (a shared `.overlay` class), so the dialog is a true centered overlay on the phone, like on desktop.

2. **Workout logging button layout** (Hevy's Log Workout screen as the reference):
   - **Phone:**
     - Top bar: collapse arrow, title with the live timer, and **Finish** (primary, green).
     - Stats row, then the exercise cards.
     - After the last exercise: **+ Add exercise**, full width. It is secondary gold, and becomes primary when the workout is empty.
     - Below that, set apart by space: **Discard workout** (soft destructive, smaller).
     - Nothing is pinned while logging, so the sets get the whole screen.
     - The routine editor keeps Add exercise pinned, as agreed.
   - **Desktop:**
     - Header: **Discard** (soft destructive) and **Finish** (primary), side by side, sticky.
     - A new **+ Add exercise** at the end of the exercise list, matching the phone. It focuses the library search in the side column and pulses the panel.
     - The library panel title becomes "Add exercises".

3. **Rank Road states** (a new "States" reference strip on the board):
   - **Current level row:** the yellow "You" pill is removed. The current row gets the pulsing shield, the XP bar and "Now" in the caption. There's nothing to select.
   - **Rank gate states:**
     - Unlocked earlier: a sky card with a gold frame and "Unlocked".
     - Current rank, when you're at the gate's level or inside that rank: a sky card with a gold glow, "Your rank", and progress to the next rank.
     - Next to unlock: a cream card with a gold border, "3 levels to go", and a progress bar.
     - Locked, further away: cream with a dashed border, a padlock, "Reach level N".
   - **Locked visuals** for shields and badges: the design stays visible, but muted (55% saturation, lighter) with a padlock medallion. Tapping opens a **preview dialog** with the full-colour design, "Locked" and the requirement. This covers rank gates and badges both.
   - **Demo bug:** "Play rank up" only plays the animation; it doesn't change XP, so the Road stayed at level 4. The board gets a **"Try a level"** control (levels 4, 5, 12) that sets the demo XP, so every gate state can be seen for real.

4. **Settings becomes a page** (it will keep growing).
   - Sections as game panels:
     - Account: name, email and photo from Google.
     - Training: units, equipment, things to avoid, weekly goal.
     - App: sounds, haptics.
   - **Sign out** sits at the bottom as a soft destructive button, and it confirms with a game dialog (solid destructive "Sign out").
   - On desktop, the sidebar logout icon becomes an **account menu** on the user row (Profile, Settings, Sign out), so a stray click can't sign you out.

5. **Where the solid destructive button is used:** the Discard workout confirm, the Sign out confirm, and **Delete routine** (a new soft destructive entry at the bottom of the edit-routine page, confirmed with the solid button). Remove exercise stays instant, with an Undo toast.

6. **Home hierarchy on desktop.** Today the feed takes the big left column.
   - The new desktop Home:
     - a full-width top row: the hunter card (wide) next to This week
     - then an **Up next** row of routine cards side by side
     - then Recent workouts in a two-column grid underneath
   - The phone keeps its order.

7. **Profile: inline sections (user's choice).** The six-tile dashboard is gone, and Rank Road and Exercises are removed as duplicates. The order sets the hierarchy:
   1. **Header:** avatar in the rank frame, name, rank title, then Level, Workouts and Week streak. A gear button (the round 3D secondary button) opens Settings.
   2. **Stats:**
      - the 3D weekly chart (XP, Sets, Volume)
      - a row of four stat tiles: workouts, tonnes lifted, PRs, km
      - "See all" opens the full Statistics page, which has the body heat map and sets per muscle
   3. **Goals:** active goal cards with progress bars, plus "+ New goal".
   4. **Weight:** the current weight, the change, a sparkline toward the target, and "Log weight". This replaces the Measures tile.
   5. **This month:** a compact month heat strip, and "Calendar" opens the full calendar.
   6. **Workouts:** the history feed.
   - **Desktop:**
     - Main column: header, Stats, Workouts.
     - Side column (sticky): Goals, Weight, This month.
9. **Exercises on the phone live inside Routines (user's choice).** The Routines tab gets a segmented control at the top: My routines, Explore, Exercises. Explore is no longer a separate pushed page on the phone. Desktop keeps Exercises in the sidebar.
10. **Workout log layout:** go with Hevy's Log Workout screen from earlier (user confirmed), as described in item 2.

### Verification
- Phone: the Finish, Discard and Sign out dialogs appear centered over the screen, and nothing behind them moves.
- Desktop Log: Discard and Finish stay sticky in the header. "+ Add exercise" at the end of the list focuses the library search.
- "Try a level" at 4, 5 and 12 shows every rank gate state. Locked shields and badges open a full-colour preview marked Locked.
- Settings is a page. Sign out confirms with a solid red button. Delete routine confirms the same way.
- Desktop Home order: hunter card and This week, then Up next, then Recent workouts. Profile follows the section order above.
- No script errors, the em dash grep is empty, one screenshot check, then republish to the same URL.

8. **UI consistency sweep.** Everything not yet in the game style gets restyled:
   - the back button (a round 3D gold button with a chevron, used on every sub-page)
   - settings rows
   - text inputs and selects (cream fields with a gold focus ring)
   - the calendar header, and the exercise detail
   - toasts (dark wood pill)
   - the START sheet, and the filter sheets' footers

## Design board v4.1 (done)

v4 is at https://claude.ai/artifact/GvQvW5Fuepjqk5fHazZPBK. User feedback:
- **Deep Sky is chosen** for every hero, everywhere. The hero toggle bar and the "Pick a hero style" section are removed. Deep Sky becomes the only hero style (it's already the `:root` default). The `.hs-*` demo classes and the gold/parch blocks are deleted.
- **Bug: the desktop header scrolls away.** On desktop Log workout, the Discard and Finish header scrolls off. The cause: `.dmain>.dtop{position:relative}` overrides `.dtop{position:sticky}`. The fix gives `.dtop` only a z-index and keeps it sticky. Every desktop screen with a header (Log, Editor, Victory, Rank, Profile) is checked to stay pinned.
- **"Add set" blends into the card.** The secondary button's white top gradient melts into the cream card.
- **Discard needs its own destructive style, and its confirm should look like the app.**
- **The finish confirm's two buttons are unequal widths.** They should match.
- **Charts don't match the 3D game look.**

### Button system (defined once, shown on the board as a small reference strip)
| Type | Look | Used for |
|---|---|---|
| Primary | Green 3D (unchanged) | Start, Finish, Save, Add exercise, Done |
| Secondary | Gold 3D, redesigned so it can't blend into cream cards: a deeper gold face (#FFE08A to #F2B940), a 1.5 px darker gold outline, and a gloss band inset 3 px from the edges instead of a white top | Edit, Explore, Share, filters, chips, tiles |
| Tertiary / in-card add | A dashed gold outline on a transparent fill, bold brown text with a + icon, a soft gold tint on press | Add set, "+N more", small in-card adds |
| Destructive, soft | A light red face (#FFE6E1 to #FFC8BE), red text (#C8322A), a darker red bevel | The entry point: Discard in the log header, Remove exercise, Delete routine |
| Destructive, solid | A red 3D face (#FF7466 to #D8352A), white text, a #8E1A12 bevel and the same gloss | Only the final confirm inside a dialog: "Discard workout", "Delete routine" |

Every type gets the same four states: default, pressed (squish), disabled (desaturated, flat bevel) and loading (spinner, label kept). The board shows them in one strip.

### Confirm dialogs in the app's style
- Discard, Finish and Delete use one **game modal**, centered on both phone and desktop:
  - a cream panel with a gold frame and a Deep Sky ribbon header carrying the title in the game font
  - an icon medallion (trash in red for discard, flag in green for finish)
  - one plain sentence
  - **two equal-width buttons**
- Discard: "Keep going" (secondary) and "Discard" (solid destructive). The body says what is lost: "You'll lose 6 ticked sets and 30 XP."
- Finish: "Keep logging" (secondary) and "Finish" (primary). The body lists unticked sets.
- The scrim can't dismiss a destructive confirm by accident: tapping outside only shakes the modal. Esc or Keep going closes it.
- Pickers and menus stay as bottom sheets on the phone.

### Charts in the 3D language
- **Weekly chart on Profile:**
  - Bars become chunky 3D pillars: a gradient face, a lighter top cap, and a darker bottom bevel on a sunken inset panel.
  - The current week is gold with a soft glow and a small crown marker. Past weeks are green.
  - Empty weeks show a small flat stub, not nothing.
  - Values sit in the game font with a stroke. The axis text is brown, and the gridlines are faint dashes.
  - The metric chips stay 3D.
- **Sets per muscle (Statistics):** the bars use the chunky XP-bar style (outlined, segmented, with a gradient fill).
- **Rank and XP bars:** unchanged; they already use this style.

### Verification
- Desktop Log, Editor and Victory keep their header buttons visible after scrolling the main column. Checked with the scroll position forced.
- Add set reads as distinct on the cream card: a visible outline, and no white edge merging into the card.
- The Discard entry is soft red, and its confirm uses solid red. Both confirm dialogs have equal-width buttons, on phone and desktop.
- The em dash grep is empty and the page has no script errors. One screenshot check, then republish to the same URL.

## Design board v4 (done)

v3 is at https://claude.ai/artifact/5SotVrDopwjKRtpUfzCX4r. The user picked **Arena Bright** (sky, greens, gold, cream whites). v4 drops the other two skins and applies this feedback.

### Board layout (user's request)
- Only Arena Bright. Shadow Monarch and Ember are removed.
- The board has just two prototypes: one phone and one desktop, each with its screen index. The v3 skin section goes.
- A pinned toggle switches the **hero style** between three options, applied everywhere a hero appears (Home hero card, reached rank gates, the Victory banner, the routine preview header, the profile hunter card):
  - **Deep Sky:** dusk blue (#2F8FE8 to #1D5FBF), soft clouds and a thin gold frame.
  - **Treasure Gold:** gold to amber (#FFD35A to #F2A516), dark brown text and a brown frame.
  - **Parchment and Gold:** a cream parchment (#FFF6DC to #F6E3B4), a thick gold border and a ribbon title.

  The choice is remembered in localStorage, with a try/catch around it.
- The "Play a moment" buttons stay.

### Visual
1. **Replace the orange-red hero gradient** with the three hero styles above. Orange stays only in the body-map highlight, which moves to green or gold to match the palette.
2. **Secondary buttons become 3D like the green primary.**
   - A cream-to-gold gradient face, the same gloss highlight on top, a darker golden-brown bevel, and a squish when pressed.
   - Chips, tiles and filter buttons get the same treatment.
3. **More sky.** Two or three layers of soft cloud shapes at different depths, drifting very slowly (60 to 90 second loops). They stay in the top sky band, so content contrast is kept, and stop under reduced motion.
4. **Rank gate cards stop looking flat.**
   - Reached gates become sky banners with a gold frame.
   - Locked gates keep their full-colour shield, with a padlock chip and "Reach level 10", on a cream parchment card with a dashed gold border. No more grey or black.
5. **The badge chest is no longer cropped.** The SVG gets headroom above and overflow visible, so the lid and medal stay in frame.
6. **No visible scrollbars on the phone.** Scroll areas hide scrollbars when the pointer is coarse or the app runs installed. Desktop keeps a thin themed scrollbar.

### UX
7. **Pinned bottom CTAs.** A sticky footer holds the main action on:
   - Create/edit routine: Add exercise, with Save in the top bar.
   - Log workout: Add exercise, with Finish in the top bar.
   - Routine preview: Start routine, or Add to my routines.
   - Exercise picker: Add N exercises.
   - Onboarding: Continue.
   - Finish: Done.

   On desktop the header row and the side column stay put, and only the main column scrolls. For example, on Rank the Badges column stays fixed while the Road scrolls.
8. **No duplicate exercises.**
   - In the picker, exercises already in this routine or workout show an "In routine" tag and a tick. They can't be selected.
   - Tapping one explains "Push Up is already in Push A." Search still finds it, with the same tag.
   - The desktop library disables the + for them.
9. **Rank Road opens where you are.** It opens centered on your current level, with the next unlock just above it. A "Next reward" chip jumps to it. It never opens at level 32.
10. **Cardio routines for runners, walkers and cyclists.**
    - Explore gets Running, Walking and Cycling groups:
      - Running: Easy Run, Couch to 5K Week 1 (run/walk intervals), 6 × 400 m Intervals, Long Run.
      - Walking: Brisk Walk, Incline Treadmill Walk.
      - Cycling: Zone 2 Ride, Bike Intervals.
    - Cardio sets show time and distance, plus an auto pace (min/km).
    - Intervals are sets of the same exercise, e.g. Running 6 × 1 min between Walking sets.
    - Onboarding stays as in v3 (user's choice). The equipment step's "No equipment: bodyweight, walking and running" option puts the Running and Walking groups first in Explore.
11. **Finishing a workout** (Hevy/Strava-like, and XP is never gated behind a "Claim" button).
    - "Keep going" is removed. Tapping Finish first shows a small confirm: "3 sets not ticked will be dropped", with "Finish" and "Keep logging". That is where an accidental Finish gets undone.
    - The finished-workout screen lets you edit:
      - the title (prefilled with the routine name)
      - the date and time (for logging a workout later; it moves the day on the calendar and streak)
      - a photo, via file input
      - notes
    - Share builds a Strava-style card: title, stats, rank shield, XP. It uses the Web Share API with files on phones, and falls back to "Save image".
    - **Victory first (the user's choice).**
      - The flow is Finish, then the confirm, then Victory.
      - XP is added the moment the workout finishes. The XP counter rolls and the bar fills, and any level-up or rank-up moment plays automatically.
      - Below the banner: the details card (title, date and time, photo, notes, all saved as you edit), then Share. **Done** is pinned at the bottom.
      - There is no Claim button.
    - Later: Google Health Connect / Google Health sync of workouts goes to Phase 4, next to weight. Health Connect is an on-device Android API, so a web app would go through the Google Health cloud API instead. Verify first.

### Build notes to carry forward
- Photos need file storage. Upstash Redis can't hold images, so plan on Vercel Blob (free tier), and keep a photo optional.
- Share cards are rendered client-side to a canvas, then shared or saved.

## Design board v3 (done)

Feedback on v2 (https://claude.ai/artifact/55dg68fV3wPVsZ2DuwPp1X):
- **Muscle filter:** it should take several muscles at once (chest + triceps + shoulders, back + biceps, up to 4 or more), and each one should be easy to unselect.
- **Explore cards:** they cut the exercise list off after about 3 names.
- **Visual direction:** the blue CTAs look like Hevy, and gold clashes with blue. The user wants something premium and distinctive, drawing on Clash of Clans / Clash Royale for level-ups, badges and rank trophies. Gradients and rich backgrounds are welcome.

### Changes
1. **Multi-select filters (muscle and equipment).**
   - The filter sheet becomes a checklist.
   - Quick picks at the top: Push (chest, shoulders, triceps), Pull (back, biceps), Legs, Core.
   - Selected muscles show as removable pills under the search (tap × to remove), plus a "Clear" link.
   - Matching is "works any selected muscle". Exercises whose main muscle is selected come first, grouped under muscle headers.
   - The same pattern applies to the desktop library panel and the Exercises page.
2. **Routine cards show every exercise.**
   - Explore and My routines cards list all exercises as rows (thumb, name, "3 × 10"). Past 6 exercises a "+N more" row appears.
   - Tapping a card opens a routine preview with every set, a muscle map, and "Add to my routines" / "Start".
3. **A new visual identity (the direction is picked with the user).** Shared rules whichever direction wins:
   - No flat Hevy-blue CTAs. Buttons become chunky and game-like: a gradient face, a darker bottom bevel, and a squish when pressed.
   - Lilita One headlines with a stroke and drop shadow for game moments. Figtree stays for reading.
   - Layered gradient backgrounds, with a subtle pattern on hero areas.
   - Logging screens stay calm and high-contrast so sets are easy to read mid-workout. The spectacle goes to reward moments.
   - The mobile nav stops copying Hevy: Home, Routines, a raised center **Start** button (like Clash Royale's Battle button), Rank, Profile.
   - **Game moments, Clash style:**
     - Level-up and rank-up: a full-screen ray burst, the shield slamming in, a rolling XP counter, and "Tap to continue".
     - Badge unlock: a chest-style reveal with a shine sweep and a tier ribbon.
     - Workout complete as a "Victory" screen: sets counted up like crowns, then a segmented XP bar.
     - A **Rank Road** (like the Trophy Road): levels and ranks E to S laid out as a path, with the badges and titles unlocked along it.
4. Keep everything else from v2: 4-question onboarding, per-set logging, weekly streak, owner's plan as routines.

### Three directions, one switcher (the user chose to compare all three)
A theme switcher at the top of v3 flips the whole clickable prototype (phone and desktop) between three looks. The structure is shared; only the tokens and component skins change:
- **Shadow Monarch (dark):** a near-black indigo background with a violet nebula glow and star dust. Buttons go violet to magenta. Rewards are gold, a royal purple and gold pairing.
- **Arena Bright (light):** a sky-to-cream gradient with soft clouds, chunky green Start buttons with a thick bevel, gold rewards with a dark outline, and warm stone panels with an inner border.
- **Ember (dark):** charcoal with an ember glow at the edges, orange-to-red buttons, gold rewards, and warm white text.

Each theme defines:
- the background layers
- the surface, panel frame and bevel
- the primary and secondary button skins
- the reward and XP colors
- the title stroke and shadow
- the nav style, including the raised center Start button
- the level-up ray colors

The logging tables use each theme's calm surface so sets stay readable. The rank shield colors stay the same in all three. The chosen theme is remembered per viewer in localStorage, with a try/catch around it.

### Order
- Opus writes design board v3 as a new artifact.
  - It keeps v2's flows and adds the multi-select filters, full routine cards with a preview, the Start/Rank nav, the Rank Road and the Clash-style moments (level-up, rank-up, badge chest, Victory).
  - It also adds a "Play a moment" row that triggers the level-up, rank-up and badge animations on demand.
- One screenshot check, then publish.
- The user picks a direction and gives feedback before any build.

## Order of work
1. Step 0 (sync main) and Step 1 (navigation lag): done and deployed.
2. Design board v2: done. v3 (above) is next, and the user reviews it.
3. **Sonnet:**
   - Build: the exercise library and muscle map, then per-user routines, workouts and custom exercises with their API actions, then the new shell and pages, then onboarding.
   - Scoring: the XP and badge rules, with legacy scoring kept.
   - Tests: pure tests for the scoring (legacy XP must equal today's exactly).
4. Opus review, then deploy.

## Verification
- **Legacy parity:** for the owner's migrated state, total XP, level, rank and earned badges are identical before and after Phase 2. This is a pure test on a copy of production state.
- `next build` passes, with the main routes static. The em dash grep over app, components, lib, data and the README is empty.
- **Playwright (Dev sign-in):**
  - onboarding in 4 screens or fewer
  - create a routine from the library panel
  - start a workout from it, tick sets, finish (XP rises by the expected amount)
  - quick-log a run
  - History shows both the old days and the new workout
  - desktop and 390 px screenshots with no horizontal scroll
- Tab-switch timing on the deployed preview feels instant, with no server round trip per tab.
