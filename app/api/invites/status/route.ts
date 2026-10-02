import { NextRequest } from 'next/server';
import { personRow } from '@/lib/insights';
import type { PersonRow } from '@/lib/insights';
import { inviteStatus } from '@/lib/inviteStatus';
import { getInvites, getProfile, getState, listUserIds } from '@/lib/store';
import { allowedEmails } from '@/lib/signups';
import { todayStr } from '@/lib/date';
import { gate, json } from '../gate';

// Read only, for the owner's invite routine, behind the same INVITE_KEY as /api/invites.
// Per person: name, email, the day they joined, their workout count and last workout date.
// Nothing about what they trained. Emails are never logged.
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const blocked = gate(req);
  if (blocked) return blocked;

  const today = todayStr();
  const ids = await listUserIds();
  const rows: PersonRow[] = [];
  for (let i = 0; i < ids.length; i += 20) {
    const batch = await Promise.all(
      ids.slice(i, i + 20).map(async (id) => {
        const [state, profile] = await Promise.all([getState(id), getProfile(id)]);
        return personRow(state, profile, today);
      })
    );
    rows.push(...batch);
  }
  return json({ today, ...inviteStatus(rows, await getInvites(), allowedEmails()) });
}
