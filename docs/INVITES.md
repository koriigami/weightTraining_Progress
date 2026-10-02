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
5. **Writes one Gmail draft per person** in the owner's Gmail: the app link, "sign in with this Google account", and a line asking for feedback. Sign them "Ketan Damle", then "Kagadmodyaa Studio". The owner reads them and presses Send.
6. **Records** the batch below: date and count only.

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
