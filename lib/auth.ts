import { NextRequest } from 'next/server';

export function isAuthorized(req: NextRequest): boolean {
  const expected = process.env.APP_PASSCODE;
  if (!expected) return false;
  const provided = req.headers.get('x-passcode');
  return provided === expected;
}
