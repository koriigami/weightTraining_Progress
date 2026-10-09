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

Shots are at 2x pixel density and show the first screen. Add `--full` for pages that
scroll; it also writes one readable slice per screen height.

The seeded person has the first-run guide put away, so ordinary runs never show it,
and has already seen the newest update, so What's new does not show either. Open
`/?news=1` to preview the What's new card with every page of the newest update (it
remembers nothing). In a flow script, `withApp(fn, { guide: true })` leaves the guide
waiting, as it is for a brand new person. `/?guide=1` plays the guide again and
remembers nothing, so it can be driven as often as needed.

The first-run guide, at 390 and at 1440 (and 320 x 568 for the small phone): the
welcome card, each of the seven rings with its step card, and the How XP works card.
Check the ring gap is even on all four sides (the bottom is measured from the bottom
of the bevel), the step card has one gold border, the card stays on screen, Skip and
Escape end it for good, Back ends it, nothing behind the dim can be tapped or scrolled,
and Tab stays inside the card.

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
      the Google button, with no waitlist button: sign-ups are open, so any email
      signs in and a new one goes to onboarding.
- [ ] With `SIGNUPS=invite`: the waitlist button is back, an email not in
      `ALLOWED_EMAILS` is refused and lands on `/auth/denied` ("Invite only" and
      the waitlist). Without it, `/auth/denied` reads "Couldn't sign you in".
- [ ] A new person is sent to `/onboarding` from every route until they finish.
- [ ] Four screens: units, equipment, things to avoid, how to start. Back and
      Continue work, Continue is pinned at the bottom on the phone.
- [ ] "Build my own routine" opens the editor. "Start from a ready-made routine"
      opens Explore. "Just log as I go" opens Home.
- [ ] Settings > Setup questions opens it again without wiping anything.

## Home `/`

- [ ] Phone: the header is one cream card: the rank shield with the rank letter,
      "Level N", the XP bar reading XP into the level over what the level takes
      ("282 / 300", the same numbers as the desktop hunter card and Rank), and the
      streak and "N/goal" stacked on the right. It fits a 360 px phone at level 31,
      and tapping it opens Rank. Desktop: the hunter card and the week card.
- [ ] Ready: the Today card names one routine ("Today's workout") with a normal
      size Start and its first 3 exercises. Desktop shows three cards: two
      routines and a dashed "Something else".
- [ ] Done today (finish a workout first): the same card turns green with Done
      chips and a text "View" link. On desktop each finished workout is a Done
      card, then routines still to do fill the row, and "Something else" is last.
      The total "+N XP" shows in the section title.
- [ ] A workout in progress shows a Resume bar (phone) or the sidebar card
      (desktop).
- [ ] This week opens `/calendar`. Training days show a tick, past days
      without one show "Rest", and once the weekly goal is met the rest of the
      week shows "Rest". Today keeps its ring until it is a training day. Days
      before the first logged workout show their number, not "Rest".
- [ ] Day tiles (here, the Calendar, the Profile strip, the Statistics chips and
      the date picker): every tile in a row is the same height, the green bevel
      sits inside the tile, today's gold ring is complete with a small gap, and
      rest days have a thin border. On the Calendar the selected day has a dark
      ring; today keeps only its gold ring when selected.
- [ ] Under the streak row, This week shows the weekly goal bonus. Before the goal is met:
      "Goal bonus this week: +80 XP", and when there is a run a second line, "Goal met 3 weeks in a
      row" ("1 week in a row" for one). Once met: "Goal met 4 weeks in a row: +80 XP" (a first
      goal week says "Goal met this week: +50 XP") and "Next week pays +90 XP", never over +100.
      A week short of the goal, or with no training, starts it again at +50. It fits a 390 px phone
      and the desktop card without overflow, and the card still opens the Calendar.
- [ ] After a week with no training day (and none yet this week) the Today card
      says "Comeback bonus: +25 XP on your first training day". It is gone once
      this week has a training day.
- [ ] Recent workouts: a card per workout with Time, Volume, Sets and XP (cardio
      shows Distance and Pace). Tapping one opens its workout page.
- [ ] For someone who had workouts before v8, the "XP was worked out again" note
      shows once and does not come back after it is dismissed. Someone who has
      both notes waiting sees only "XP was worked out again with the new daily
      bonus", and dismissing it clears both. For someone with workouts before v11 the
      newest note shows, "The weekly goal bonus now grows with each week in a row. XP was
      worked out again.", and Got it clears every note that is waiting. Their goal weeks in a
      row now pay more than +50 on the workout rows, and nothing pays less.
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
- [ ] The XP info button opens the popover: XP so far, then "Daily bonus" with
      "N of 20 min today" (today's saved workouts count too). It turns to
      "Daily bonus earned" when the day reaches 20 minutes, and says "Already
      earned today" when an earlier workout paid it.
- [ ] Finish asks only about sets that are not ticked. It never mentions a plan
      or a bonus.
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
- [ ] Laps: on a run, walk or ride that is following the clock, the Lap button
      (green, full width) sits under Time and Distance. Under it the table shows
      the stamped laps, the fastest one in green with "Fastest", and the lap that
      is running last, ticking. The distance chips (No distance, 400 m, 1 km; in
      miles 0.25 mi, 1 mi) set the distance of the laps stamped after it. A
      lap time and distance can be corrected, and the X removes a lap. A double
      tap adds one lap. Typing a Time removes the Lap button and the running row
      and keeps the laps.

## Log workout `/workout/log`

- [ ] Home has a gold full-width "Log workout" button under the three tiles, before and after
      today's workout. On desktop the Something else card has Choose and Log workout stacked at
      one width.
- [ ] It opens "Log a workout": your routines with a small gold Log button, Run, Walk and Ride,
      and "Custom workout, Pick exercises, then log". The same sheet lists routines while a
      workout is running.
- [ ] Run, Walk or Ride opens the Cardio sheet ("Pick an activity, then log.") with a green Log
      workout button. Custom workout opens the picker with "Log workout · N".
- [ ] A routine's three-dot menu starts with "Log workout" and a gold New pill (it goes away on
      15 November 2026). A routine's page has Edit, Log and Start, three buttons of one width.
- [ ] The Log screen is the Edit screen, titled "Log workout", with Cancel and Save and no "XP is
      worked out again" line and no Delete. The date and time start an hour ago, Duration starts at
      the routine's estimate, and sets that have numbers are ticked. The Notes box says "Anything to
      remember?", and How did it feel? is not here: it comes on Victory afterwards.
- [ ] A Run: type a Time and a distance and the Duration follows the Time until you use the
      stepper. "+ Add lap" adds rows. Nothing counts until the Time is typed.
- [ ] Change the date to yesterday and Save: the Victory screen plays (XP, level, badge moments),
      "Save weights to <routine>" is off, and the workout page shows yesterday. A time that has not
      happened yet is refused with "Pick a time that has already happened."
- [ ] Log while a workout is running: it saves, and the running workout and its mini bar are
      exactly as they were.

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
- [ ] A run with laps shows "N laps · fastest lap 2, 4:05 /km", a small bar chart
      (taller is faster, the fastest in green) and the read-only lap table under
      its totals. Edit shows the same table with a "+ Add lap" button under it;
      an added lap that has no time is not saved.
- [ ] How did it feel? sits after Exercises on a phone and above Notes in the side column on a wide
      screen. Tapping a face picks it (tinted, with a gold edge) and saves at once, with no Save
      button. Tapping the picked face again clears it. "Add effort (1 to 10)" shows the slider at
      "6, Moderate" and saves 6. Dragging changes the words (Easy, Moderate, Hard, All out) and saves
      once when you let go. Remove clears the effort and brings the button back. Reload: it is all still
      there. Edit shows none of this.
- [ ] A missing or wrong id shows a friendly not-found state.

## Victory `/workout/done`

- [ ] Banner, rolling XP, crowns for sets and the XP bar play first.
- [ ] The reward stage starts 1.8 seconds after Victory has finished counting (the
      crowns, XP lines, total and level bar, and the level up on the bar). A tap on
      Victory does not start it early. Done starts it at once on Home.
- [ ] Order: the rank-up moment first if a rank was crossed, then one chest.
- [ ] How did it feel? is its own card between the level card and Workout details. Pick a face, add an
      effort, move the slider: each change saves on its own ("Saved" shows in Workout details), and
      neither changes the XP. Finish and Log workout both end here with nothing picked.
- [ ] Edit the title, date and time, and notes (the box says "Anything to remember?"). The changes save. (There is no photo control yet: it waits for file storage.)
- [ ] The XP lines follow rules v4: sets, cardio, beat or record, then Daily
      bonus (0 with "Already earned today" or "N of 20 min today" when not paid),
      Comeback and Weekly goal only when earned. The Weekly goal line shows its real
      amount (+50 to +100) and, from the second week in a row, "3 of 3 training days,
      4 weeks in a row". The workout page's XP breakdown says the same. No "Workout finished" or
      "Missed" line.
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

## Reward stage

The chest, the rank-up moment and the replays from Rank. A same-rank level up plays on
Victory itself. A level up that arrives outside Victory (a logged past workout) still
uses the plain full-screen level up.

- [ ] The deep blue backdrop fills the screen at 390 and 1440; the stage stays centred
      and nothing is cut off at the edges.
- [ ] The chest drops with a land sound, dust and a shake. A counter on its corner shows
      how many items are inside. "Tap to open" bobs, with 1, 2 or 3 pips for the chest.
- [ ] Each tap cracks the latch and jolts the chest. A three-tap chest (Obsidian,
      Prismatic) charges for about 0.8 s with a riser, then bursts: a flash, the burst
      sound, sparks, the lid opens. The open chest sits in the lower third and stays whole.
- [ ] Each item: light spirals into the chest, it rises spinning, pauses backlit, flips to
      its face with a flash, a ring and stars. The card is framed in the tier colour with
      the tier, name, what it measures, the next tier line with its bar and the +XP pill.
- [ ] Coins fly from the +XP pill to the level bar at the top, which counts up with ticks.
- [ ] Several items: "Tap to continue", the item flies into a tray under the level bar. At
      the end the tray grows into the summary with no heading, the total counts up and
      Continue is last.
- [ ] Rank up: the old shield shakes, flashes and breaks into pieces, a pillar of light,
      the new shield rises with the rank music and the title unrolls. Then the new rank's
      chest holds the title and the profile frame first, then any badges.
- [ ] Chests: your rank decides it (Wooden, Silver, Golden, Crystal, Obsidian,
      Prismatic); Monthly for monthly badges, Royal for special badges.
- [ ] Rank screen: tap an earned badge for a one-item chest, or a reached gate for the
      rank up and its chest. The card says "Earned" or "Unlocked", with no coins.
- [ ] Esc and the browser Back button close the stage. Focus is inside it and returns.
- [ ] No WebGL (for example the browser's WebGL switched off): the same sequence plays
      with a flat chest and the vector medal.
- [ ] Reduced motion: every step shows its end state, with the taps still needed.
- [ ] Sound off: silent. Music off: no rank music. Haptics off: no vibration. There is no
      music while the chest opens.
- [ ] Real phone only: the silent switch, and ambient audio when other music is playing.

## Rank `/rank`

- [ ] The road opens with your level centered. Levels above yours show "N XP
      to go", levels below show "Cleared".
- [ ] All four gate states: unlocked earlier (sky card, gold frame), your rank
      (gold glow and progress to the next rank), next (levels to go and a
      progress bar), locked (padlock, "Reach level N").
- [ ] The "Next rank" chip sits above the road and never covers a gate card.
      Tapping it scrolls to the next gate.
- [ ] Tap a locked gate or a locked badge: a full-colour preview marked Locked
      and the requirement. Tap an unlocked gate or an earned badge: the reward stage
      replays, without coins.
- [ ] Tap the Rank tab again (or the sidebar item) after scrolling: the road
      re-centres on your level.
- [ ] Badges: Workouts, Lifetime, This month, Trophies and Milestones. The retired
      plan badges (Perfect Month, Awakening, Program Complete, Iron Will and the
      like) are nowhere. Goal Month and Clean Sweep exist.
- [ ] Rank Road: gate cards are in their rank's colours with a chest (open with a tick once
      reached), your rank has the gold frame, ranks ahead are dashed with a lock chip. Your
      level says "You are here" and the gold line fills from your shield toward the next level.
- [ ] Medals on rows and a badge in the Badges tab open the badge view: the medal tilts under
      a finger and springs back, and "Watch it unlock" replays the reward. A locked badge shows
      the stone medal in its ring; a locked rank shows the shield in stone and "Reach level N".
      Tilt on a real phone feels smooth and does not scroll the page.
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
- [ ] This month strip: training days green, rest days sand, a legend, "N
      training days in October". Calendar opens the full month.
- [ ] How workouts felt, last 30 days sits under the weekly chart: a bar in the five colours, the legend
      with a count per face, and "Effort average 6.4 of 10, on 9 rated workouts". It is not there when
      no workout in the last 30 days has a face or an effort.
- [ ] Workouts feed, newest first. A rated workout shows a small face beside its title, and a screen
      reader says "Felt good". A workout opens with its details.
- [ ] Desktop: Goals, Weight and This month sit in a sticky side column.

## Statistics `/stats`, Calendar `/calendar`

- [ ] Statistics: the body heat map (front and back) and sets per muscle for the
      last seven days, with an accessible text summary. The day chips put a dot
      on training days and "Rest" on rest days, the same days as Home.
- [ ] Calendar: a month grid whose today cells line up with the header, previous
      and next month, a day list. Training days green, rest days sand, a dot on a
      day with a workout under 20 minutes, a legend under the grid, and "N
      training days" in the header. Tap the short day: its workout, then "6 of
      20 training minutes (each set counts 3), so this counts as a rest day". There is no plan link.

## Settings `/settings`

- [ ] Account: name, email and photo from Google.
- [ ] Training: units, equipment, things to avoid and weekly goal each open an
      editor. Save, reload, and the value is still there. The weekly goal editor says: "Reach
      your goal for +50 XP, and +10 more for each week in a row you reach it, up to +100."
      Changing the goal checks past weeks and the run again.
- [ ] App: Sounds and Haptics switches persist.
- [ ] App: How Levl works plays the first-run guide on Home and changes nothing that is
      remembered. What's new opens `/news`, every update newest first. Setup questions opens
      the setup again without wiping anything.
- [ ] Sign out: a confirm with the solid red button. On desktop the sidebar user
      row opens an account menu with Profile, Settings and Sign out (and
      Insights, for the owner).
- [ ] Onboarding: the Skip button is in the top bar.

## Invite list `/api/invites`

Start the server with `INVITE_KEY=testkey SIGNUPS=invite` and use curl.

- [ ] No header, and a wrong key: 401 with an empty body. With `INVITE_KEY` unset: always 401.
- [ ] `GET` with `Authorization: Bearer testkey`: `{ "emails": [...], "count": n }`.
- [ ] `POST -d '{"add":["a@example.com"]}'` returns `added: 1`. Sending it again returns `added: 0`.
- [ ] `POST -d '{"remove":["a@example.com"]}'` returns `removed: 1`, then `removed: 0`.
- [ ] An invalid email, or more than 200 emails, gives 400 and changes nothing.
- [ ] More than 30 calls in a minute from one IP gives 429.
- [ ] While invite-only, an emailed person on the list can sign in and one not on it lands on
      `/auth/denied`. Removing them stops the next sign-in.

## Insights `/insights` (owner only)

Sign in as `me@example.com`, and add five or six more people with workouts (sign
in as each, then log a workout or send `saveWorkout` to `/api/state`).

- [ ] Open sign-ups, fewer than 5 people: "Insights appear once 5 people have joined."
- [ ] With `SIGNUPS=invite`, even one person shows numbers, and the note reads "Small groups are
      shown while Levl is invite-only. The group numbers show no names. The People card is the
      one place that names people, and it never shows sets or weights."
- [ ] The cards Activation, Last workout, How workouts were made and Invites are there, with equal
      card widths and the same bar style. After Log workout, "Logged afterwards" goes up by 1.
- [ ] The owner sees the four tiles (People, Active this week, Workouts a week,
      Days to D rank), the weekly bar chart with this week in gold, the funnel,
      the days to each rank and "How people train". Bars have value labels and a
      tooltip.
- [ ] Any group under 5 people shows a lock instead of a number, in a tile, a
      bar row or a week.
- [ ] 4 weeks, 12 weeks and All time change the chart and the numbers.
- [ ] Outside the People card, nothing on the page has a name or email, and the group numbers in
      the `/api/insights` response (everything except `roster` and `invitedNotJoined`) have no
      name, email, id, set or weight.
- [ ] People card: one row per person who has signed in, with name, email, level and rank, last
      workout (and how many days ago), training days in the last 7 days, workouts in the last
      30 days and the join date. The most recent workout is first, and a person with no workout
      is last and reads "No workout yet". Someone who skipped setup has a "Not set up" tag.
- [ ] People card, privacy: the `roster` in the `/api/insights` response has only name, email,
      joined, setUp, level, rank, lastWorkout, daysSince, workouts30, trainingDays7 and
      workoutsTotal. No sets, reps, weights, body weight, notes, goals, joint limits, photos or ids
      anywhere in the response.
- [ ] People card, phone (390) and tablet (under 1100): each person is a stacked row with the name in bold, the email small
      under it and one line like "Level 6 · D rank · last workout 3 days ago · 2 training days in
      the last 7 days". A long email wraps and nothing scrolls sideways. Desktop (1440) shows a
      table with Name, Email, Level, Last workout, Last 7 days, Last 30 days and Joined. An email
      can be selected and copied.
- [ ] "Invited, not signed in yet (N)" lists the emails on the invite list or in `ALLOWED_EMAILS`
      with no profile, and is gone when there are none. Sign in as one of them and the email moves
      into the table.
- [ ] Phone: the tiles are two across, the cards stack, no horizontal scroll.
- [ ] A person who is not the owner: `/api/insights` answers 404 (so no People data either),
      `/insights` shows the not-found state, and Settings and the account menu have no
      Insights entry. Signed out, the API also answers 404.
- [ ] The owner sees an Insights row in Settings (App) and an Insights entry in
      the desktop account menu.

## After the pass

- [ ] `npm test`, `npx tsc --noEmit` and `npm run build` pass, and the routes are
      still listed as static.
- [ ] A search for the em dash character (U+2014) over `app components lib data tests docs README.md` finds nothing.

## Sound, motion and 3D on real phones (v13)

Only a real phone can judge these. Do them once on an iPhone and once on a mid-range Android phone.

- [ ] iPhone silent switch: with the switch on silent, Levl plays nothing. With it off, taps, sets and the reward
      moments play. Turn Sounds off in Settings and check it is silent either way.
- [ ] Android haptics: a set tick, a Finish, the chest taps and the burst each buzz. Haptics off in Settings
      means no buzz. A phone with vibration switched off in the system stays quiet without errors.
- [ ] Ambient audio: start Spotify (or any music app), open Levl and finish a workout. Button and set sounds
      mix over it without stopping it. The reward moments play the Levl music over it and the other music comes
      back afterwards. With Music off in Settings, no Levl music plays and the other music is not touched.
- [ ] 3D frame rate: on a mid-range phone, open the chest stage and the badge view. The chest, the medal tilt
      and the sparks stay smooth. Note any phone that drops frames, and check the flat fallback also plays the
      whole sequence.
- [ ] Reduced motion (iPhone: Settings, Accessibility, Motion; Android: remove animations): Victory, the chest,
      the rank-up and the badge view show end states with no movement. The taps are still needed.
- [ ] Chest flow: finish a workout that earns a badge. After Victory's hold the chest drops. Tap to open, take
      each item, tap through to the summary and Continue. Back and Esc close it. Reload and nothing replays.
- [ ] Rank up: finish a workout that crosses a rank (set the XP close to the gate first). The shield breaks, the
      new shield rises with the rank music, the title unrolls, then the new rank's chest opens with the title
      and frame first.
- [ ] Level up on Victory: a level inside the same rank plays on the level bar on Victory, with no extra moment.

## Share card on real phones

Automated checks run in desktop Chromium only, so check these by hand after a deploy:

- iPhone Safari and the iPhone home-screen app: open a finished workout, tap Share, tap Share image. The share menu opens at once (not "Tap Share again").
- Share to WhatsApp, to an Instagram story and to Photos (Save Image in the share menu). The picture arrives whole, with the rounded title font.
- Android Chrome: the same three targets.
- Tap the dice, then Share image: the new sky is the one that gets sent.
- Save image on a laptop downloads `levl-<title>-<date>.png`, 1080 by 1350.
- A run shows the distance, time and pace, and no body figure.

## Laps on a real phone

Automated checks fake the clock, so check these by hand after a deploy:

- Start a Run, lock the phone, unlock it, and tap Lap a few times while the run goes on. The
  Time and the running lap carry on from the real clock, every stamped lap keeps its time,
  and the screen stays awake.
- Tap Lap with a thumb while moving: one tap adds one lap, and two quick taps add one.
- Finish, open the workout, and check the laps, the summary line and the chart. Open Edit,
  correct a time with the keyboard (`m:ss` works on the phone keyboard) and save.

## How it felt on a real phone

- Faces: each face is easy to hit with a thumb, the picked one is clearly tinted, and tapping it again
  clears it. The five labels stay on one line at the smallest phone width.
- Slider (iPhone Safari and Android Chrome): "Add effort (1 to 10)" shows it at 6. Dragging with a thumb
  changes "6, Moderate" as you go and saves once on lifting the finger. Tapping the track jumps to that
  value. Remove puts the button back. With VoiceOver or TalkBack the slider says "Effort from 1 to 10"
  and the value with its word, and adjusting it saves.
- After Finish and after Log workout, pick a face on Victory, tap Done, and check the face is beside the
  title on Home and on the workout page.

## Log workout on a real phone

- Pick the date in the calendar modal on a real phone (iPhone Safari and Android Chrome): the
  day grid, the hour and minute boxes and am or pm work with a thumb and the keyboard, and Done
  puts the chosen day on the Log screen.
- Log a routine for yesterday, Save, and check the Victory screen, the Home week strip and the
  workout page. Open the workout and check it shows yesterday and the chosen time.
- Start a workout, switch to Home, and log another one from the Log workout button. Resume the
  first one: nothing in it has changed.

## First-run guide and What's new on a real phone

- A new Google account: after the setup questions the guide plays on Home. Each gold ring sits
  evenly around its element, bottom shadow included, and each step card has one gold border.
- Thumb through all seven steps on iPhone Safari and Android Chrome. Nothing behind the dim
  reacts to a tap, and the page does not scroll under a finger.
- Android Back on a step ends the guide and stays on Home. It does not come back on the next open.
- On a small phone the week step scrolls into view and its card stays on screen.
- With VoiceOver or TalkBack each card reads its title and words first, then Skip and Next.
- An account that joined before v12: the guide plays on the first open after the release. On the
  next open the October update shows once, four pages. Got it, then reopen the app: nothing shows,
  and the Home rules note about the weekly goal bonus is gone.
- Start a workout, go to Home: neither the guide nor What's new shows.

