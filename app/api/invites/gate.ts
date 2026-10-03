import { NextRequest, NextResponse } from 'next/server';
import { createRateLimiter, keyMatches } from '@/lib/invites';

// Shared by the owner's invite routes: one rate limit per IP, then the INVITE_KEY check.
// With no key set, or a missing or wrong one, the answer is a bare 401.
const limiter = createRateLimiter(30, 60_000); // per IP, per minute

export const deny = (status: number) => new NextResponse(null, { status, headers: { 'Cache-Control': 'no-store' } });
export const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store' } });

export function gate(req: NextRequest): NextResponse | null {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  if (!limiter.take(ip)) return deny(429);
  if (!keyMatches(req.headers.get('authorization'))) return deny(401);
  return null;
}
