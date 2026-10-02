# Invites

Levl is invite-only (`SIGNUPS=invite` on Vercel). People join the waitlist on Tally (https://tally.so/r/kdMyYM), and the owner lets them in in batches from the chat.

## Who can sign in
In invite mode, a Google account can sign in when its email is in either list:
- `ALLOWED_EMAILS` on Vercel: the first group, added by hand;
- the app's invite list: Redis key `wt:invites`, managed through `/api/invites` with the `INVITE_KEY` secret.

See "Who may sign in" in `docs/ARCHITECTURE.md` for how the list is kept private.

## Inviting a batch (from the chat)
Say "invite the new people". Claude then:
1. **Reads** the Tally submissions: name, Google account email, what they will track, and where they heard about Levl.
2. **Compares** them with the invite list (`GET /api/invites`) and with the people already allowed.
3. **Shows** the new names and the count. Nothing is added before the owner confirms.
4. **Adds** the confirmed emails (`POST /api/invites` with `add`).
5. **Writes one Gmail draft per person** in the owner's Gmail: the app link, "sign in with this Google account", and a line asking for feedback. Sign them "Ketan Damle", then "Kagadmodyaa Studio". Send them as HTML with the app link as the text "Open Levl", so no long URL shows (Gmail wraps raw links in a long google.com/url redirect). The welcome mail reads like a short personal note: subject "Your Levl invite, from Ketan", a line from what they said they would track, and a request to tap "Not spam" and reply "got it". Mail from a sender a person has never heard from often lands in spam, so for people with a phone number also send the WhatsApp welcome ("I've also emailed you, check spam"). Send one at a time, spaced out, not in a batch. The owner reads them and presses Send.
6. **Records** the batch below: date and count only.

## Invite status (for the routine)
`GET /api/invites/status` with the `INVITE_KEY` returns `signedIn` (name, email, joined date, workout count, last workout date) and `invitedNotJoined` (email and `invitedOn`). Read only, no level, rank or workout details.

`invitedOn` is the day the person was added to the invite list, kept in the Redis key `wt:invites:dates` (email to YYYY-MM-DD), apart from the list itself. It is set when someone is added, dropped when they are removed, and `null` for the first group in `ALLOWED_EMAILS`, who have no recorded day. To fix or backfill a day, POST `{"dates": {"a@x.com": "2026-10-02"}}` to `/api/invites`, for emails already on the list. `GET /api/invites` also returns `dates`.

The nudge goes to people with `invitedOn` two or more days ago, or `null`. The check-in goes to people in `signedIn` with `workoutsTotal` 0 whose `joined` is two or more days ago.

## Nudge and check-in
Both read Insights (People list and "Invited, not signed in yet") or the status endpoint above. The wording is in `docs/marketing/stories.html`. Gmail drafts use the same text, the same "Open Levl" link and the same sign-off.
- **Nudge**: people under "Invited, not signed in yet", a few days after their invite, not on the day.
- **Check-in**: people in the People list with "No workout yet".

## Daily routine
A scheduled Claude routine, "Levl invites: daily drafts" (`trig_01TeremNzEAGL1VLxHttv9Jh`), runs every day at 08:47 IST in a fresh session. It only creates Gmail drafts. It never sends, deletes or edits anything, and the owner presses Send.
1. **Welcome**: anyone on the Tally form who is not on any list yet gets the welcome draft, then is added to the invite list. More than 10 new people in one run is treated as spam and skipped.
2. **Nudge**: invited and not signed in, invited 2 or more days ago (or no recorded day).
3. **Check-in**: signed in with no workout, joined 2 or more days ago.
4. **WhatsApp list**: one extra draft to the owner with a pre-filled `wa.me` link per person who gave a phone number, so each message is one tap to send from the owner's own WhatsApp.

Gmail is its memory: before drafting it searches for a draft or sent mail with the same subject to the same address and skips if one exists, so nobody is drafted twice. Subjects: "Your Levl invite, from Ketan" (the first batch used "You're in: Levl early access", and the routine counts that as done too), "Your Levl invite is ready", "How's Levl going?".

The routine's prompt lives in the routine, not in this repo, because it names the owner's accounts. It needs the Gmail and Tally connectors and `INVITE_KEY` in the environment. This environment's API cannot attach connectors to a routine, so they are attached in the claude.ai routines page, and the routine stays paused until that is done.

## Removing someone
Say "remove <email> from the invites". It goes through `POST /api/invites` with `remove`. Their saved data stays until they ask for it to be deleted (Privacy Policy).

## Rules
- Emails, names and phone numbers never go in this repo, in commits or in docs.
- `INVITE_KEY` lives only in Vercel's environment variables and in the chat environment's secrets. If it may have leaked, set a new one in Vercel and redeploy.
- Phone numbers from Tally are only for the owner's personal WhatsApp follow-up, never stored in the app.

## Batches
| Date | Added | Note |
|---|---|---|
| Before 2 Oct 2026 | about 16 | `ALLOWED_EMAILS` on Vercel, by hand |
| 2 Oct 2026 | 2 | Invite list. 5 other form sign-ups were already in `ALLOWED_EMAILS` |
| 2 Oct 2026 | 1 | Invite list, a later form submission |
| 2 Oct 2026 | 1 | Invite list, another late form submission |
| 2 Oct 2026 | 1 | Invite list, asked on WhatsApp |
