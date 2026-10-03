# v12 plan: the first-run guide and What's new

(v11 is done and on `main`: laps, Log workout, how it felt, the growing weekly goal bonus. v12 stages 1 to 4 are live since 3 October 2026; people already on Levl get the guide once too.)

## Context
A new person lands on Home with no explanation, and changes reach people only as the Home rules note. Board 11 (`docs/design/11-guide-board.html`) documents every screen as it is today and designs two lasting systems:
- **A first-run guide**, played once after the setup questions;
- **a What's new card** the next time people open Levl after a release that changed something they can see, or changed the XP rules.

Both reuse the app's game modal look. The user signed off round 1 with my pick on all seven decisions, plus two round 2 fixes to the spotlight: the ring wraps the element's bevel shadow, and the step card has one gold border.

## Stages
1. **What is remembered, the update list, the rules.** Pure logic and data, no UI.
2. **The What's new card**, the Home controller and the `/news` page.
3. **The spotlight guide.**
4. **Settings rows, the release step, docs.**

## Signed-off decisions (board 11)
- **Who sees what:**
  - **New people:** after the setup questions, the guide plays on Home. They never see updates from before they joined.
  - **People already on Levl:** the guide once too, on their first open after the release, then the October update on a later open. (Changed on 3 October 2026, before release: there are very few people on Levl, so everyone should see the introduction. Board 11 had What's new only for them.)
  - **At most one thing per app open:** the guide first, What's new on a later open.
  - **Only on Home** (phone and computer), after any level-up or badge moments, and never while a workout is in progress.
- **The guide (spotlight tour):**
  1. **Welcome card**, in the game modal look:
     - the ribbon "Welcome to Levl" and the Levl logo;
     - "Levl turns your training into a game. Every set earns XP, and XP takes you from rank E to rank S.";
     - Skip and "Show me around", at equal width.
  2. **Seven steps.** Each one dims the screen and lights up the real element with a gold ring. A step card next to it has "N of 7", Skip, the title, the words, and a Next button (44 px on a phone, 38 px on a computer).

     | # | Title | Points at | Words |
     |---|---|---|---|
     | 1 | Your level | phone: the level bar at the top; computer: the level card | Every bit of XP fills this bar. Level up to climb from rank E to S. |
     | 2 | Today | phone: the Today card; computer: the two Today cards | Your next routine waits here. Trained without the app? Log workout adds it afterwards. |
     | 3 | Start a workout | phone: the Workout button; computer: "+ Workout" | phone: Tap Workout to start a routine, a run or a custom workout. Tick each set as you go. Computer: Start a routine, a run or a custom workout. Tick each set as you go. |
     | 4 | Your week | This week | A day counts once you train for 20 minutes. Reach your weekly goal for a bonus that grows each week in a row. |
     | 5 | phone: Routines; computer: Routines and Exercises | phone: the Routines tab; computer: the Routines and Exercises links | phone: Save the workouts you repeat, or pick a ready-made one. Every exercise is here too. Computer: Save the workouts you repeat, pick a ready-made one, or browse every exercise. |
     | 6 | Rank | the Rank tab or link | The Rank Road shows every level and rank ahead, and the badges you can earn. |
     | 7 | Profile | the Profile tab or link | phone: Your stats, goals, weight and calendar. Settings is in here too. Computer: Your stats, goals, weight and calendar. Settings is in your account menu, bottom left. |

  3. **How XP works card**, in the game modal look:
     - "XP comes from showing up, never from how heavy you lift.";
     - the list: Each set you tick +5; Each minute of cardio +1; Beat last time, or a record +10 or +25; A day with 20 minutes of training +50; Your weekly goal, growing each week in a row +50 to +100;
     - one button, "Start training";
     - under it: "You can play this guide again from Settings."
- **The ring (round 2):** it wraps the element and its bevel shadow.
  - The gap is 4 px on all four sides, with the bottom gap measured from the bottom of the shadow.
  - The radius is the element's radius plus 4.
  - The bevel depth is read from the element's own `box-shadow` (the deepest shadow with no blur and no spread): 4 px on cards, 5 px on the Workout button, none on the tab and sidebar links.
- **The step card (round 2):** one 3 px gold border and a soft drop shadow, with no bevel under the border. The welcome and How XP works cards keep the GameModal look.
- **What's new (paged game card):**
  - the "What's new" ribbon;
  - "October 2026 · 1 of 4";
  - a picture cut from the real screen, with an "XP rules changed" tag on a rules page;
  - a title and two lines;
  - dots;
  - one button, Next, which is "Got it" on the last page.

  Escape, Back or Got it marks the update seen. Several unseen updates show as one card, newest first, at most 5 pages.
- **The first update (`2026-10`, "October 2026"):**
  1. **Laps for runners:** "Tap Lap as you run. Levl marks your fastest lap and shows every lap on the workout page."
  2. **Log a workout you already did:** "Trained without the app? Tap Log workout on Home, pick the day and time, and the XP lands on that day."
  3. **How did it feel?:** "After a workout, tap a face and add your effort if you like. Profile shows how the last 30 days felt. It earns no XP."
  4. **Your goal bonus grows** (rules page): "Reach your weekly goal week after week: +50, then +10 more each week in a row, up to +100. Your XP was worked out again with this rule."
- **Rule changes** are announced in What's new from now on. Closing an update that has a rules page also clears the waiting Home rules notes (v2 to v4), so nobody is told twice.
- **Settings, App group:**
  - "How Levl works" plays the guide again;
  - "What's new" opens the list of updates;
  - "Welcome tour" becomes "Setup questions". It is the same row and still opens the setup.

## Stage 1: what is remembered, the update list, the rules

### Build
- **`AppState`** (`lib/progress.ts`) gets two optional fields:
  - `guideDone?: boolean`: false means the guide is waiting.
  - `newsSeen?: string`: the id of the newest update seen.

  Missing means "joined before v12": the guide waits for them too (only `guideDone: true` puts it away), and every update is unseen. No migration write and no backup. The fields are additive, like `source` in v11 stage 2b.
- **New people:**
  - `newUserState()` sets `guideDone: false` and `newsSeen` to the newest id. So does the owner's empty state.
  - In `savePrefs`, onboarding finishing for the first time (`onboarded` going from false to true) sets `guideDone: false` unless it is already true, and sets `newsSeen` to the newest id if it is missing. That covers someone who signed up before v12 and never finished setup. Visiting Setup questions again changes neither.
- **Actions** (`lib/routineActions.ts`, the provider, the state route), like `setRulesV4Note`:
  - `setGuideDone`: true only.
  - `setNewsSeen`: an id that exists. Closing an update with a rules page also clears `rulesV2Note`, `rulesV3Note` and `rulesV4Note`.
- **`lib/news.ts`:**
  - `NEWS`, newest first: `{ id, date, label, pages: [{ title, text, image, rules? }] }`;
  - `latestNewsId()`;
  - `unseenPages(newsSeen)`: the pages of entries newer than `newsSeen`, newest first, at most 5.

  The pictures are `public/news/2026-10-laps.jpg`, `-log`, `-felt`, `-goal`, copied from `docs/design/11-guide/new-*.jpg`.
- **`lib/guide.ts`:**
  - the step list, with the words and a `data-guide` target name for phone and computer;
  - `bevelDepth(boxShadow)`;
  - `ringRect(rect, bevel, radius)`;
  - `bubblePlace(ring, viewport, layout)`: below or above on a phone, to the right of sidebar links on a computer;
  - `introToShow({ guideDone, onboarded, unseen, sessionActive, shownThisLoad })`: `'guide' | 'news' | null`.

### Tests (one per rule)
- **Defaults:**
  - New people start with `guideDone: false` and the newest `newsSeen`.
  - A state without the fields reads as an existing person.
- **`savePrefs`:**
  - finishing onboarding the first time sets both fields;
  - Setup questions again does not;
  - `guideDone: true` stays true.
- **Actions:**
  - `setGuideDone` refuses anything but true.
  - `setNewsSeen` refuses an unknown id, and clears the rules notes for a rules update only.
- **`unseenPages`:**
  - nothing seen;
  - the newest seen;
  - an older one seen;
  - the cap of 5.
- **`introToShow`:**
  - the guide first;
  - news next;
  - one per load;
  - nothing while a workout is in progress or before onboarding.
- **`bevelDepth`:**
  - the card shadow gives 4;
  - the Workout button gives 5;
  - `none` and inset-only shadows give 0.
- **`ringRect`:** the gap, the bevel at the bottom, and the radius.

## Stage 2: the What's new card
- `components/news/NewsModal.tsx` uses the GameModal pieces (`.wt-gm-*`, `useDialog`, `useBackToClose`). Closing it in any way calls `setNewsSeen` with the newest unseen id.
- `components/home/HomeIntro.tsx` goes on both Home layouts (`app/page.tsx`):
  - it asks `introToShow`;
  - it waits until no celebration moment is showing (`components/celebrate/CelebrationProvider.tsx`);
  - it shows nothing while a workout session is active;
  - it remembers "shown this load" in memory only.
- **`/news`**, a static page: every update, newest first, with each page's picture, title and words. The header back button returns to Settings.

## Stage 3: the spotlight guide
- **`components/guide/GuideTour.tsx`:** the welcome card, the 7 steps and the How XP works card, with the words above.
- **Anchors:** `data-guide` attributes on the real elements:
  - the level bar (`ResourceBar`) and the level card (`HeroLevel`);
  - the Today card and the desktop Today cards;
  - the Workout button and the sidebar "+ Workout";
  - `WeekCard`;
  - the tab and sidebar links.
- **Spotlight:**
  - It scrolls the element into view, measures it, adds the bevel from its computed `box-shadow`, and re-measures on resize and scroll.
  - The scrim is the ring's spread shadow.
  - Nothing behind can be tapped.
- **Step card:** placed by `bubblePlace`, with one gold border.
- **Behaviour:**
  - Escape, Back and Skip end it. Ending it in any way calls `setGuideDone`.
  - Focus moves into each step and is trapped.
  - Reduced motion has no movement.
  - Each step's title and words are announced.
- **Replay:** Home with `?guide=1` (from Settings) plays it again without changing what is remembered.

## Stage 4: Settings, the release step, docs
- **`app/settings/page.tsx`, App group:**
  - "How Levl works" (`CircleHelp`) goes to `/?guide=1`;
  - "What's new" (`Sparkles`) goes to `/news`;
  - "Welcome tour" becomes "Setup questions" (`Compass`, still `/onboarding`).
- **Release step:** `.claude/skills/levl-release/SKILL.md` gets a step before the push: "Does this release change something people see, or the XP rules? Add an update to `lib/news.ts` with its pictures in `public/news/`, and show it to the user before it goes live."
- **Docs:**
  - `docs/ARCHITECTURE.md`: the two fields, the controller, the update list, the guide anchors;
  - `docs/QA.md`: the guide and What's new on a real phone, Back closing them, a small phone where the week card starts below the fold;
  - `docs/ROADMAP.md`.

## Done when
- `npm run verify` passes and `next build` succeeds, with every page still static.
- At 390 and 1440 there are no console errors and no overflow, button pairs are equal width, and buttons are at the app's sizes.
- These flows work:
  - **A fresh person:** the setup questions, then the guide on Home. Skip ends it for good, and so does finishing it. The next open shows nothing (no old updates).
  - **The seeded existing person:** the October update shows once, 4 pages. Got it, and it does not come back. The Home rules note is gone.
  - **Settings:** How Levl works replays the guide, What's new lists the update, and Setup questions opens the setup.
  - **A workout in progress:** nothing shows on Home.
