import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { aggregate, minGroupFor, parseRange, personFacts } from '@/lib/insights';
import type { PersonFacts } from '@/lib/insights';
import { insightsStatus } from '@/lib/owner';
import { normaliseEmail } from '@/lib/invites';
import { getInvites, getProfile, getState, listUserIds } from '@/lib/store';
import { signupMode } from '@/lib/signups';
import { todayStr } from '@/lib/date';

// Owner only. Everyone else, signed in or not, gets a plain 404. The response holds
// group numbers and nothing that names a person.
export async function GET(req: NextRequest) {
  const session = await auth();
  if (insightsStatus(session?.user?.email) === 404) return NextResponse.json({ error: 'not found' }, { status: 404 });

  const today = todayStr();
  const ids = await listUserIds();
  const people: PersonFacts[] = [];
  const signedInEmails = new Set<string>();
  for (let i = 0; i < ids.length; i += 20) {
    const batch = await Promise.all(
      ids.slice(i, i + 20).map(async (id) => {
        const [state, profile] = await Promise.all([getState(id), getProfile(id)]);
        if (profile?.email) signedInEmails.add(normaliseEmail(profile.email));
        return personFacts(state, profile?.createdAt, today);
      })
    );
    people.push(...batch);
  }
  // The server knows each person's email. Only the two counts leave it.
  const invited = await getInvites();
  const invites = { invited: invited.length, signedIn: invited.filter((e) => signedInEmails.has(e)).length };
  const min = minGroupFor(signupMode());
  return NextResponse.json(aggregate(people, today, parseRange(req.nextUrl.searchParams.get('range')), { min, invites }), {
    headers: { 'Cache-Control': 'no-store' },
  });
}
