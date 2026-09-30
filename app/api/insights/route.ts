import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { aggregate, parseRange, personFacts } from '@/lib/insights';
import type { PersonFacts } from '@/lib/insights';
import { insightsStatus } from '@/lib/owner';
import { getProfile, getState, listUserIds } from '@/lib/store';
import { todayStr } from '@/lib/date';

// Owner only. Everyone else, signed in or not, gets a plain 404. The response holds
// group numbers and nothing that names a person.
export async function GET(req: NextRequest) {
  const session = await auth();
  if (insightsStatus(session?.user?.email) === 404) return NextResponse.json({ error: 'not found' }, { status: 404 });

  const today = todayStr();
  const ids = await listUserIds();
  const people: PersonFacts[] = [];
  for (let i = 0; i < ids.length; i += 20) {
    const batch = await Promise.all(
      ids.slice(i, i + 20).map(async (id) => {
        const [state, profile] = await Promise.all([getState(id), getProfile(id)]);
        return personFacts(state, profile?.createdAt, today);
      })
    );
    people.push(...batch);
  }
  return NextResponse.json(aggregate(people, today, parseRange(req.nextUrl.searchParams.get('range'))), {
    headers: { 'Cache-Control': 'no-store' },
  });
}
