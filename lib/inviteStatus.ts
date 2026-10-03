// What the owner's invite routine needs to know about each person, and nothing more:
// who has signed in, when, and whether they have logged a workout. Pure helpers for
// /api/invites/status. No level, rank, set, weight or note ever goes in here.
import { invitedNotJoined } from './insights';
import type { PersonRow } from './insights';
import type { InviteDates } from './invites';

export type StatusPerson = {
  name: string;
  email: string; // lowercased
  joined: string; // YYYY-MM-DD, the day they first signed in
  workoutsTotal: number;
  lastWorkout: string | null; // YYYY-MM-DD
};

export type WaitingPerson = {
  email: string; // lowercased
  invitedOn: string | null; // YYYY-MM-DD, null for people with no recorded day (the first group, added by hand in ALLOWED_EMAILS)
};

export type InviteStatus = {
  signedIn: StatusPerson[];
  invitedNotJoined: WaitingPerson[];
};

/**
 * Signed-in people (oldest first, so the routine reads them in the order they came)
 * and the people invited but not signed in yet, with the day they were invited. People without an email on their
 * profile are left out, since the routine cannot write to them.
 */
export function inviteStatus(rows: readonly PersonRow[], invites: readonly string[], allowed: readonly string[], dates: InviteDates = {}): InviteStatus {
  const people = rows
    .filter((r) => r.email.trim() !== '')
    .map((r) => ({ name: r.name, email: r.email.trim().toLowerCase(), joined: r.joined, workoutsTotal: r.workoutsTotal, lastWorkout: r.lastWorkout }))
    .sort((a, b) => a.joined.localeCompare(b.joined) || a.email.localeCompare(b.email));
  const waiting = invitedNotJoined(invites, allowed, people.map((p) => p.email));
  return { signedIn: people, invitedNotJoined: waiting.map((email) => ({ email, invitedOn: dates[email] ?? null })) };
}
