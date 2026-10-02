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
5. **Writes one Gmail draft per person** in the owner's Gmail: the app link, "sign in with this Google account", and a line asking for feedback. Sign them "Ketan Damle", then "Kagadmodyaa Studio". Send them as HTML with the app link as the text "Open Levl", so no long URL shows (Gmail wraps raw links in a long google.com/url redirect). The owner reads them and presses Send.
6. **Records** the batch below: date and count only.

## Invite status (for the routine)
`GET /api/invites/status` with the `INVITE_KEY` returns `signedIn` (name, email, joined date, workout count, last workout date) and `invitedNotJoined` (emails). Read only, no level, rank or workout details. The invite list does not store invite dates yet, so "2 days after the invite" is not available until it does.

## Nudge and check-in
Both read Insights (People list and "Invited, not signed in yet") or the status endpoint above. The wording is in `docs/marketing/stories.html`. Gmail drafts use the same text, the same "Open Levl" link and the same sign-off.
- **Nudge**: people under "Invited, not signed in yet", a few days after their invite, not on the day.
- **Check-in**: people in the People list with "No workout yet".

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
