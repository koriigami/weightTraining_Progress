import { NextRequest } from 'next/server';
import { applyInvites } from '@/lib/invites';
import { getInvites, saveInvites } from '@/lib/store';
import { gate, json } from './gate';

// The owner manages the invite list from chat with a secret key (INVITE_KEY). With no
// key set, or a missing or wrong one, the answer is a bare 401. Emails are never logged.
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const blocked = gate(req);
  if (blocked) return blocked;
  const emails = await getInvites();
  return json({ emails, count: emails.length });
}

export async function POST(req: NextRequest) {
  const blocked = gate(req);
  if (blocked) return blocked;
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return json({ error: 'send a JSON body' }, 400);
  }
  const change = applyInvites(await getInvites(), body);
  if (!change.ok) return json({ error: change.error }, 400);
  if (change.added > 0 || change.removed > 0) await saveInvites(change.emails);
  return json({ added: change.added, removed: change.removed, count: change.emails.length });
}
