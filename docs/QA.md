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

- **friend@example.com**: a new person. Onboarding, no routines, no plan days.
- **me@example.com**: the owner. Comes with the six plan routines. Plan days only
  exist if you tick some on `/calendar/plan`.

Free the port with `fuser -k 3311/tcp`. Do not use `pkill -f`.

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

- [ ] Hunter card: shield, level, rank title, XP bar. Numbers match Rank.
- [ ] This week: the week count against the weekly goal.
- [ ] Up next: routine cards. Phone stacks them, desktop puts them side by side.
- [ ] Recent workouts: a card per workout with sets, volume and time. Big volumes
      read as tonnes (5.7 t) or thousands of pounds (12.6k lb).
- [ ] Empty state for a new person is friendly, with a way to start.
- [ ] Phone: the tab bar has Home, Routines, a raised START, Rank, Profile. A
      workout in progress adds a mini bar above it.

## Routines `/routines`, Explore, Exercises

- [ ] Phone: the segments My routines, Explore and Exercises switch without a page
      load. Desktop: Exercises is its own sidebar item.
- [ ] My routines: each card lists every exercise, "+N more" after six.
- [ ] Explore: chips filter Running, Walking, Cycling and the strength groups. A
      card opens its preview.
- [ ] Preview: every set, the muscle map, "Add to my routines" or "Start".
- [ ] Exercises: multi-select muscle and equipment filters, search, removable
      pills, Clear, an exercise detail with the muscle map, a custom exercise.
- [ ] Create a routine: title, add exercises from the picker (phone) or the side
      library (desktop), an exercise already in the routine is tagged and cannot
      be added, sets can be added and removed, reorder and swap work.
- [ ] Edit a routine, save, and see the change. Delete a routine: soft red entry
      at the bottom, solid red confirm, the routine is gone.
- [ ] A cardio routine shows time and distance per set and a pace in min/km.

## Workout log `/workout`

- [ ] Start from a routine, from an empty workout, and from a quick cardio log.
- [ ] Sets are prefilled. Ticking a set pops "+5 XP", and the live stats update.
- [ ] Editing weight and reps works, and the units follow Settings.
- [ ] Add exercise: a duplicate is refused with a message. Remove exercise shows
      an Undo toast.
- [ ] Cardio set: time and distance give a pace.
- [ ] Finish opens a confirm that says how many sets are not ticked. Two equal
      width buttons: "Keep logging" and "Finish". A workout with no ticked set
      cannot be finished.
- [ ] Discard: soft red entry, a confirm with the solid red button. Tapping
      outside only shakes it. Esc or "Keep going" closes it.
- [ ] Phone: nothing is pinned while logging. Desktop: Discard and Finish stay in
      the sticky header, and "+ Add exercise" focuses the library search.
- [ ] Reload mid-workout: the workout is still there.

## Victory `/workout/done`

- [ ] Banner, rolling XP, crowns for sets and the XP bar play first.
- [ ] Reward moments start about 1.8 seconds later, or at the first tap if that is
      sooner. Never on top of the banner at once.
- [ ] Order: level up or rank up first, then new badges, one at a time.
- [ ] Edit the title, date and time, and notes. The changes save. (There is no photo control yet: it waits for file storage.)
- [ ] Share opens the sheet with a preview card and either the phone's share sheet or a Copy button.
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
- [ ] Badges: Workouts, Lifetime, This month, Trophies and Milestones. A new
      person sees no plan-only badges (Perfect Month, Awakening, Month Clear,
      Program Complete, Iron Will and the like). The owner with plan days sees
      all of them.
- [ ] Phone: a segment switches between Rank Road and Badges. Desktop: the
      Badges column stays in place while the road scrolls.

## Profile `/profile`

- [ ] Header: avatar in the rank frame, name, rank title, Level, Workouts and
      Week streak. The gear opens Settings.
- [ ] Stats: the weekly chart switches between XP, Sets and Volume. Four tiles:
      workouts, lifted, PRs, cardio. "See all" opens Statistics.
- [ ] Goals: New goal (two steps), the XP reward shown before saving, edit and
      delete from the dots, with Undo on delete. Weight goals and distance goals
      are typed and shown in your own units.
- [ ] Weight: log a weight, the change and sparkline update, the value is in
      your unit. Out-of-range values are refused.
- [ ] This month strip, and Calendar opens the full month.
- [ ] Workouts feed, newest first. A workout opens with its details.
- [ ] Desktop: Goals, Weight and This month sit in a sticky side column.

## Statistics `/stats`, Calendar `/calendar`

- [ ] Statistics: the body heat map (front and back) and sets per muscle for the
      last seven days, with an accessible text summary.
- [ ] Calendar: a month grid, previous and next month, a day list, days with a
      workout marked. "6-week plan" opens `/calendar/plan`, where plan days can be
      ticked.

## Settings `/settings`

- [ ] Account: name, email and photo from Google.
- [ ] Training: units, equipment, things to avoid and weekly goal each open an
      editor. Save, reload, and the value is still there.
- [ ] App: Sounds and Haptics switches persist.
- [ ] Sign out: a confirm with the solid red button. On desktop the sidebar user
      row opens an account menu with Profile, Settings and Sign out.

## After the pass

- [ ] `npm test`, `npx tsc --noEmit` and `npm run build` pass, and the routes are
      still listed as static.
- [ ] A search for the em dash character (U+2014) over `app components lib data tests docs README.md` finds nothing.
