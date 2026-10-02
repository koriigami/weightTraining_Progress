import { NextRequest, NextResponse } from 'next/server';
import { applyInvites, createRateLimiter, keyMatches } from '@/lib/invites';
import { getInvites, saveInvites } from '@/lib/store';

// The owner manages the invite list from chat with a secret key (INVITE_KEY). With no
// key set, or a missing or wrong one, the answer is a bare 401. Emails are never logged.
export const dynamic = 'force-dynamic';

const limiter = createRateLimiter(30, 60_000); // per IP, per minute

const deny = (status: number) => new NextResponse(null, { status, headers: { 'Cache-Control': 'no-store' } });
const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store' } });

function gate(req: NextRequest): NextResponse | null {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  if (!limiter.take(ip)) return deny(429);
  if (!keyMatches(req.headers.get('authorization'))) return deny(401);
  return null;
}

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
