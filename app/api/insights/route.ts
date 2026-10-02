import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { aggregate, invitedNotJoined, minGroupFor, parseRange, personFacts, personRow, sortRoster } from '@/lib/insights';
import type { InsightsResponse, PersonFacts, PersonRow } from '@/lib/insights';
import { insightsStatus } from '@/lib/owner';
import { normaliseEmail } from '@/lib/invites';
import { getInvites, getProfile, getState, listUserIds } from '@/lib/store';
import { allowedEmails, signupMode } from '@/lib/signups';
import { todayStr } from '@/lib/date';

// Owner only. Everyone else, signed in or not, gets a plain 404. The group numbers
// name no one. `roster` is the one part that does: a row per person with their name,
// email, level and how often they train, and never a set, weight, note or limit.
export async function GET(req: NextRequest) {
  const session = await auth();
  if (insightsStatus(session?.user?.email) === 404) return NextResponse.json({ error: 'not found' }, { status: 404 });

  const today = todayStr();
  const ids = await listUserIds();
  const people: PersonFacts[] = [];
  const rows: PersonRow[] = [];
  const signedInEmails = new Set<string>();
  for (let i = 0; i < ids.length; i += 20) {
    const batch = await Promise.all(
      ids.slice(i, i + 20).map(async (id) => {
        const [state, profile] = await Promise.all([getState(id), getProfile(id)]);
        if (profile?.email) signedInEmails.add(normaliseEmail(profile.email));
        return { facts: personFacts(state, profile?.createdAt, today), row: personRow(state, profile, today) };
      })
    );
    for (const b of batch) {
      people.push(b.facts);
      rows.push(b.row);
    }
  }
  // The group numbers get only the two invite counts, never the emails.
  const invited = await getInvites();
  const invites = { invited: invited.length, signedIn: invited.filter((e) => signedInEmails.has(e)).length };
  const min = minGroupFor(signupMode());
  const result = aggregate(people, today, parseRange(req.nextUrl.searchParams.get('range')), { min, invites });
  const body: InsightsResponse = { ...result, roster: sortRoster(rows), invitedNotJoined: invitedNotJoined(invited, allowedEmails(), [...signedInEmails]) };
  return NextResponse.json(body, { headers: { 'Cache-Control': 'no-store' } });
}
