// What the owner's invite routine needs to know about each person, and nothing more:
// who has signed in, when, and whether they have logged a workout. Pure helpers for
// /api/invites/status. No level, rank, set, weight or note ever goes in here.
import { invitedNotJoined } from './insights';
import type { PersonRow } from './insights';

export type StatusPerson = {
  name: string;
  email: string; // lowercased
  joined: string; // YYYY-MM-DD, the day they first signed in
  workoutsTotal: number;
  lastWorkout: string | null; // YYYY-MM-DD
};

export type InviteStatus = {
  signedIn: StatusPerson[];
  invitedNotJoined: string[];
};

/**
 * Signed-in people (oldest first, so the routine reads them in the order they came)
 * and the emails invited but not signed in yet. People without an email on their
 * profile are left out, since the routine cannot write to them.
 */
export function inviteStatus(rows: readonly PersonRow[], invites: readonly string[], allowed: readonly string[]): InviteStatus {
  const people = rows
    .filter((r) => r.email.trim() !== '')
    .map((r) => ({ name: r.name, email: r.email.trim().toLowerCase(), joined: r.joined, workoutsTotal: r.workoutsTotal, lastWorkout: r.lastWorkout }))
    .sort((a, b) => a.joined.localeCompare(b.joined) || a.email.localeCompare(b.email));
  return { signedIn: people, invitedNotJoined: invitedNotJoined(invites, allowed, people.map((p) => p.email)) };
}
