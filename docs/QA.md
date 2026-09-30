# QA checklist

A manual pass for every screen, at a phone width (390 px) and a desktop width
(1440 px). Do it before a release, and after any change to the shell, a shared
component or `app/globals.css`.

## Setup

```bash
AUTH_SECRET=dev-secret ALLOWED_EMAILS=me@example.com,friend@example.com OWNER_EMAIL=me@example.com npx next dev -p 3311
```

Open http://localhost:3311. Progress lives in memory, so restarting the server
gives a clean slate. Use two people:

- **friend@example.com**: a new person. Onboarding, no routines, no workouts.
- **me@example.com**: the owner (`OWNER_EMAIL`). The only one who sees Insights.

Free the port with `fuser -k 3311/tcp`. Do not use `pkill -f`.

For screenshots without signing in by hand, use the harness: it starts the
server, signs in as `qa@example.com` (or the owner with `--owner`), seeds
workouts, weights, a goal and a routine, and prints console errors and overflow:

```bash
npm run qa -- --routes "/,/profile,/workout/view?id=@strength,/workout/view?id=@run" --widths 390,1440 --out /tmp/levl-qa
```

## Every screen, every width

Tick these on each screen below, at 390 px and at 1440 px.

- [ ] No horizontal scroll. The page never wider than the viewport.
- [ ] No errors in the browser console. (Known and harmless: a 401 from
      `/api/auth/session` while signed out, and the dev server's fast refresh
      notices.)
- [ ] Phone: every tap target is at least 44 px tall and wide.
- [ ] Desktop: the header stays put while the main column scrolls.
- [ ] Keyboard: Tab reaches everything in a sensible order, the focus ring is
      visible, and the skip link works.
- [ ] Dialogs and sheets: centered (dialogs), Esc closes, focus moves in, and
      focus returns to the button that opened it.
- [ ] Reduced motion (browser emulation): nothing spins, slides or bounces.
- [ ] No em dashes in any copy.

## Sign-in and onboarding

- [ ] Signed out: the sign-in screen shows the Dev sign-in form (development) or
      the Google button. An email not on the invite list is refused and lands on
      `/auth/denied`.
- [ ] A new person is sent to `/onboarding` from every route until they finish.
- [ ] Four screens: units, equipment, things to avoid, how to start. Back and
      Continue work, Continue is pinned at the bottom on the phone.
- [ ] "Build my own routine" opens the editor. "Start from a ready-made routine"
      opens Explore. "Just log as I go" opens Home.
- [ ] Settings > Welcome tour opens it again without wiping anything.

## Home `/`

- [ ] Phone: the Resource bar on top (level shield and XP bar, week streak,
      weekly goal count). Desktop: the hunter card and the week card.
- [ ] Ready: the Today card names one routine ("Today's workout") with a normal
      size Start and its first 3 exercises. Desktop shows three cards: two
      routines and a dashed "Something else".
- [ ] Done today (finish a workout first): the same card turns green with Done
      chips and a text "View" link. On desktop each finished workout is a Done
      card, then routines still to do fill the row, and "Something else" is last.
      The total "+N XP" shows in the section title.
- [ ] A workout in progress shows a Resume bar (phone) or the sidebar card
      (desktop).
- [ ] This week opens `/calendar`.
- [ ] Recent workouts: a card per workout with Time, Volume, Sets and XP (cardio
      shows Distance and Pace). Tapping one opens its workout page.
- [ ] For someone who had workouts before v8, the "XP was worked out again" note
      shows once and does not come back after it is dismissed.
- [ ] Phone: the tab bar has Home, Routines, a raised WORKOUT button, Rank,
      Profile.

## Routines `/routines`, Explore, Exercises

- [ ] Phone: the segments My routines, Explore and Exercises switch without a page
      load. Desktop: Exercises is its own sidebar item.
- [ ] My routines: each card lists every exercise, "+N more" after six.
- [ ] Explore: chips filter Running, Walking, Cycling and the strength groups. A
      card opens its preview.
- [ ] Preview: every set, the muscle map, "Save routine" or "Start".
- [ ] Exercises: multi-select muscle and equipment filters, search, removable
      pills, Clear, an exercise detail with the muscle map, a custom exercise.
- [ ] Create a routine: title, add exercises from the picker (phone) or the side
      library (desktop), an exercise already in the routine is tagged and cannot
      be added, sets can be added and removed, reorder and swap work.
- [ ] Edit a routine, save, and see the change. The dots on a routine card open a
      menu with Duplicate (a copy right after it, with a toast) and Delete (a
      solid red confirm, then a toast).
- [ ] "Create routine" opens the editor.
- [ ] Phone: the tabs (My routines, Explore, Exercises) stay pinned under the
      header, and the large title collapses when scrolling down.
- [ ] A cardio routine shows time and distance per set and a pace in min/km.

## Start flow and workout log `/workout`

- [ ] The Workout button (tab bar on the phone, top of the sidebar on desktop)
      opens the Start sheet: your routines, the Run, Walk and Ride tiles, and
      Custom workout.
- [ ] Custom workout: no Start button until an exercise is picked, then "Start
      workout, N". The clock stays at 0 until Start. Cancel starts nothing.
- [ ] Cardio picker: tapping an activity only highlights it. Start opens the
      log with that activity.
- [ ] A ride or run alone shows Time, Distance, Speed (ride) or Pace (run and
      walk), and XP. No Volume and no Sets. Strength shows Duration, Volume,
      Sets and XP.
- [ ] Sets are prefilled with last time's numbers (Workout settings can turn
      that off). Ticking a set pops "+5 XP".
- [ ] The XP info button opens the popover: XP so far and plan progress.
- [ ] "Beat last time" and "Record" chips appear on an exercise as soon as its
      ticked set earns them, never the first time an exercise is logged.
- [ ] Cardio card: Time follows the clock until you type in it (only when the
      workout is that one cardio exercise). Typing a Time takes it off the clock.
- [ ] Add exercise: a duplicate is refused with a message. Remove exercise shows
      an Undo toast.
- [ ] The end of the log: Add exercise, then Settings and Discard. Settings opens
      `/workout/settings` (Sounds, Vibration, Keep screen on, Fill in last
      time's numbers) and changes stick.
- [ ] Finish confirm names the planned exercises that are not done and says how
      many sets are not ticked. A workout with no ticked set cannot be finished.
- [ ] Discard: soft red entry, a confirm with the solid red button. Tapping
      outside only shakes it. Esc or "Keep going" closes it.
- [ ] Phone: nothing is pinned while logging. Desktop: Discard and Finish stay in
      the sticky header.
- [ ] Reload mid-workout: the workout is still there.

## Workout page, edit and delete `/workout/view?id=`

- [ ] Open a workout from Home or the Profile feed. The page shows
      its stats, the XP tile, muscles, exercises with their chips, notes, Share
      and Edit.
- [ ] The eye on the XP tile opens the XP breakdown modal (sets, cardio, beat,
      record, finish, weekly goal) that adds up to the workout's XP.
- [ ] Edit (`/workout/edit?id=`): the log layout without a clock. The date and
      time open in the game-style date picker modal. Save, and the page shows
      the change. Changing a date re-scores the other workouts.
- [ ] Delete: a solid red confirm that says what level you would drop to, if it
      would drop. Afterwards an "XP updated" toast and no level-down animation.
- [ ] A missing or wrong id shows a friendly not-found state.

## Victory `/workout/done`

- [ ] Banner, rolling XP, crowns for sets and the XP bar play first.
- [ ] Reward moments start about 1.8 seconds later, or at the first tap if that is
      sooner. Never on top of the banner at once.
- [ ] Order: level up or rank up first, then new badges, one at a time.
- [ ] Edit the title, date and time, and notes. The changes save. (There is no photo control yet: it waits for file storage.)
- [ ] The XP lines follow rules v2: sets, cardio, beat or record, finish bonus
      and weekly goal only when earned.
- [ ] Share opens the sheet with the share card as the preview: a random sky,
      the muscles worked, the stats and the workout's own XP. A renamed title
      shows on the card. The dice on the card's corner rolls a new sky; closing
      and reopening the sheet brings back the first sky. Share image (green) and
      Save image (gold) sit below the card on a phone and to the right of it on
      desktop.
- [ ] The picture is made when the sheet opens (and again after each dice tap).
      Until it is ready, Share image shows a spinner and Save image is disabled.
      Then the card turns into the exact picture that will be sent: long-press
      it on a phone to save it from there.
- [ ] Share image opens the phone's share menu with the picture (and nothing
      else, no text). Closing the menu shows no message. Tapping Share image
      while the menu is open does nothing.
- [ ] Save image downloads `levl-<title>-<date>.png`, 1080 x 1350, and shows
      "Image saved." The fonts in the file are the rounded Lilita One titles and
      Figtree labels, not a fallback font.
- [ ] A browser that cannot share files (most desktop browsers) shows only Save
      image, and the copy beside the card says to save the picture.
- [ ] If the picture cannot be made, Save image and Share image show "Couldn't
      make the picture. Try again." and Share image shares the text line where
      the browser can. Tapping the dice makes a new try.
- [ ] Done is pinned at the bottom. Reload the page: no celebration replays.

## Reward moments

For each of Level up, Rank up and Badge unlock:

- [ ] Full screen with a radial scrim. Rays spin, the glow and sparks appear,
      the title drops in, and "Tap to continue" pulses.
- [ ] Level up: the shield slams in with the new level and the number rolls.
- [ ] Rank up: the old shield spins out and shrinks, the new one slams in late,
      then the rank title and "Level N, new title and profile frame".
- [ ] Badge: the chest shakes and opens. The lid and the medal are not cropped.
      The hexagon medal rises with a shine sweep, then the tier ribbon (Bronze to
      Legend, Monthly or Special), the name and what it measures.
- [ ] Tap, Enter, Space and Esc continue. A tap in the first fraction of a second
      is ignored. The browser Back button closes it.
- [ ] Focus is inside the moment, and returns to where it was.
- [ ] A screen reader announces "Level up", "Rank up" or "New badge" with the
      details.
- [ ] Sound off: silent. Haptics off: no vibration. On: a chime, a fanfare and a
      chest cue, each with its own vibration pattern.
- [ ] Reduced motion: the end state, nothing spinning.

## Rank `/rank`

- [ ] The road opens with your level centered.
- [ ] All four gate states: unlocked earlier (sky card, gold frame), your rank
      (gold glow and progress to the next rank), next (levels to go and a
      progress bar), locked (padlock, "Reach level N").
- [ ] The "Next rank" chip sits above the road and never covers a gate card.
      Tapping it scrolls to the next gate.
- [ ] Tap a locked gate or a locked badge: a full-colour preview marked Locked
      and the requirement. Tap an unlocked gate or an earned badge: its moment
      replays, without the "+XP" line.
- [ ] Tap the Rank tab again (or the sidebar item) after scrolling: the road
      re-centres on your level.
- [ ] Badges: Workouts, Lifetime, This month, Trophies and Milestones. The retired
      plan badges (Perfect Month, Awakening, Program Complete, Iron Will and the
      like) are nowhere. Goal Month and Clean Sweep exist.
- [ ] Phone: a segment switches between Rank Road and Badges. Desktop: the
      Badges column stays in place while the road scrolls.

## Profile `/profile`

- [ ] Header: avatar in the rank frame, name, rank title, Level, Workouts and
      Week streak. The gear opens Settings.
- [ ] Stats: the weekly chart switches between XP, Sets and Volume. Four tiles:
      workouts, lifted, PRs, cardio. "See all" opens Statistics.
- [ ] Goals: New goal opens the goal sheet with the title and the XP reward
      pinned. "Pick end date" opens the inline calendar (a sheet on the phone, a
      dialog on desktop) that starts on the first pickable month. A goal that is
      already reached is refused. Streak goals ask for weeks. Edit and delete
      from the dots, with Undo on delete. Weight and distance goals are typed and
      shown in your own units, and a weigh-in date uses the picker too.
- [ ] A goal stays achieved after a workout behind it is deleted.
- [ ] Weight: log a weight, the change and sparkline update, the value is in
      your unit. Out-of-range values are refused.
- [ ] This month strip, and Calendar opens the full month.
- [ ] Workouts feed, newest first. A workout opens with its details.
- [ ] Desktop: Goals, Weight and This month sit in a sticky side column.

## Statistics `/stats`, Calendar `/calendar`

- [ ] Statistics: the body heat map (front and back) and sets per muscle for the
      last seven days, with an accessible text summary.
- [ ] Calendar: a month grid whose today cells line up with the header, previous
      and next month, a day list, days with a workout marked. There is no plan
      link.

## Settings `/settings`

- [ ] Account: name, email and photo from Google.
- [ ] Training: units, equipment, things to avoid and weekly goal each open an
      editor. Save, reload, and the value is still there.
- [ ] App: Sounds and Haptics switches persist.
- [ ] Sign out: a confirm with the solid red button. On desktop the sidebar user
      row opens an account menu with Profile, Settings and Sign out (and
      Insights, for the owner).
- [ ] Onboarding: the Skip button is in the top bar.

## Insights `/insights` (owner only)

Sign in as `me@example.com`, and add five or six more people with workouts (sign
in as each, then log a workout or send `saveWorkout` to `/api/state`).

- [ ] Fewer than 5 people: "Insights appear once 5 people have joined."
- [ ] The owner sees the four tiles (People, Active this week, Workouts a week,
      Days to D rank), the weekly bar chart with this week in gold, the funnel,
      the days to each rank and "How people train". Bars have value labels and a
      tooltip.
- [ ] Any group under 5 people shows a lock instead of a number, in a tile, a
      bar row or a week.
- [ ] 4 weeks, 12 weeks and All time change the chart and the numbers.
- [ ] Nothing on the page or in the `/api/insights` response has a name, email,
      id, set or weight.
- [ ] Phone: the tiles are two across, the cards stack, no horizontal scroll.
- [ ] A person who is not the owner: `/api/insights` answers 404, `/insights`
      shows the not-found state, and Settings and the account menu have no
      Insights entry. Signed out, the API also answers 404.
- [ ] The owner sees an Insights row in Settings (App) and an Insights entry in
      the desktop account menu.

## After the pass

- [ ] `npm test`, `npx tsc --noEmit` and `npm run build` pass, and the routes are
      still listed as static.
- [ ] A search for the em dash character (U+2014) over `app components lib data tests docs README.md` finds nothing.

## Share card on real phones

Automated checks run in desktop Chromium only, so check these by hand after a deploy:

- iPhone Safari and the iPhone home-screen app: open a finished workout, tap Share, tap Share image. The share menu opens at once (not "Tap Share again").
- Share to WhatsApp, to an Instagram story and to Photos (Save Image in the share menu). The picture arrives whole, with the rounded title font.
- Android Chrome: the same three targets.
- Tap the dice, then Share image: the new sky is the one that gets sent.
- Save image on a laptop downloads `levl-<title>-<date>.png`, 1080 by 1350.
- A run shows the distance, time and pace, and no body figure.
