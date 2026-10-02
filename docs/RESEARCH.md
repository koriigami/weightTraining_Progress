# Research with early users

How Levl learns from the people using it. It starts small and grows in steps, as more people join. The rule for what gets built is at the end.

## Step 1: now (under 15 active people). A weekly 30-minute check

Every Sunday evening:

1. **Insights** (`/insights`, owner only):
   - Activation: how many signed in, set up, logged a first workout, trained on a second day, and came back in week 2. The biggest drop between two steps is the problem of the week.
   - Last workout: who went quiet (8 or more days). This tells you who to message.
   - How workouts were made: started live, logged afterwards, runs with laps. This shows which features people actually use.
2. **The waitlist:** in our chat, say "invite the new people". `docs/INVITES.md` says what happens next.
3. **One message to anyone quiet for 8 or more days**, by WhatsApp, written personally:
   > Hey! Saw you tried Levl. Quick one: what got in the way of logging this week? Even "busy" or "forgot" helps me. No pressure.
4. **The feedback log:** write every reply and remark down the same day, in the format below. Keep it out of the repo, in a private note or sheet. Remove names; a short tag like "P3" is enough.

| Date | Who (tag) | What they said | Area | Kind |
|---|---|---|---|---|
| 5 Oct | P3 | "Didn't know where to add yesterday's run" | Logging | Confused |

- **Area** is one of: Logging, Running, XP and ranks, Badges, Routines, Sign-in, Speed, Other.
- **Kind** is one of: Confused, Missing, Bug, Liked, Idea.

## Step 2: at about 15 active people. Ask in a structured way

- **A feedback form:** a short Tally form, linked from a WhatsApp message.
  1. How many days did you train last week?
  2. What do you like most?
  3. What annoyed you?
  4. What almost made you stop using it?
  5. One thing you'd change?
- **Three 15-minute calls** a month, with people from both ends: one very active person and one who went quiet. Ask them to open the app and share their screen. The script:
  1. Show me how you logged your last workout.
  2. What do you look at after a workout?
  3. What does your rank or level mean to you?
  4. When did you last open Levl without training? Why?
  5. What would make you tell a friend about it?
  6. Anything that felt slow or confusing?

  Listen more than you talk. Don't explain the app; note where they hesitate.

## Step 3: later (30 or more people)

- The in-app "Send feedback" box (on the roadmap), so feedback arrives without being asked for.
- Task tests on new designs before building: give 3 people a board link and one task ("log yesterday's run"), and watch.
- A monthly look at retention: what share of people who joined in a week are still training 4 weeks later.

## What gets built

- A new feature needs the **same ask from 3 or more people**, or a drop in the activation numbers that it would fix.
- A bug or a confusion that one person hits is fixed right away.
- Everything else waits in the feedback log until it reaches 3.

Signed-off work already in the plan goes ahead: board 09 (badges and chests), How it felt, and the growing weekly goal bonus (`docs/V11_PLAN.md`).
