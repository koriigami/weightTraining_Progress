// The invite list: who may sign in while Levl is invite-only. Pure helpers for the
// owner's /api/invites route. The list itself lives in the store (wt:invites) and
// is read on the server only. Nothing here is imported by a browser bundle.
import { createHash, timingSafeEqual } from 'node:crypto';

export const MAX_PER_CALL = 200; // emails in one POST, add and remove together
const MAX_EMAIL = 254;
// Deliberately plain: one @, no spaces, a dot in the domain.
const EMAIL_RE = /^[^\s@,;<>()]+@[^\s@,;<>()]+\.[^\s@,;<>()]+$/;

/** Trimmed and lowercased, the form the list stores. */
export const normaliseEmail = (e: string): string => e.trim().toLowerCase();

export function isValidEmail(e: string): boolean {
  return e.length <= MAX_EMAIL && EMAIL_RE.test(e);
}

/** Tidies a stored list: strings only, normalised, no repeats. */
export function cleanList(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return [...new Set(raw.filter((x): x is string => typeof x === 'string').map(normaliseEmail).filter(Boolean))];
}

export type InviteChange = { ok: true; emails: string[]; added: number; removed: number } | { ok: false; error: string };

function parseEmails(raw: unknown, name: string): { ok: true; list: string[] } | { ok: false; error: string } {
  if (raw === undefined) return { ok: true, list: [] };
  if (!Array.isArray(raw)) return { ok: false, error: `${name} must be a list of emails` };
  const list: string[] = [];
  for (const v of raw) {
    if (typeof v !== 'string') return { ok: false, error: `${name} must be a list of emails` };
    const e = normaliseEmail(v);
    if (!isValidEmail(e)) return { ok: false, error: `${name} has an invalid email` };
    list.push(e);
  }
  return { ok: true, list };
}

/**
 * Adds and removes emails. Idempotent: adding someone already listed or removing
 * someone who is not changes nothing, and `added` and `removed` count only the real
 * changes. An email in both lists ends up removed. At most 200 emails per call.
 */
export function applyInvites(current: readonly string[], body: unknown): InviteChange {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) return { ok: false, error: 'send an object with add and remove lists' };
  const b = body as Record<string, unknown>;
  const add = parseEmails(b.add, 'add');
  if (!add.ok) return add;
  const remove = parseEmails(b.remove, 'remove');
  if (!remove.ok) return remove;
  if (add.list.length + remove.list.length > MAX_PER_CALL) return { ok: false, error: `at most ${MAX_PER_CALL} emails per call` };

  const set = new Set(cleanList(current));
  let added = 0;
  let removed = 0;
  for (const e of add.list) {
    if (!set.has(e)) {
      set.add(e);
      added++;
    }
  }
  for (const e of remove.list) if (set.delete(e)) removed++;
  return { ok: true, emails: [...set].sort(), added, removed };
}

/**
 * True when the Authorization header is `Bearer <key>` for exactly this key. Both
 * sides are hashed first so the comparison runs on equal-length buffers in constant
 * time. An unset or empty key never matches.
 */
export function keyMatches(header: string | null | undefined, key: string | undefined = process.env.INVITE_KEY): boolean {
  if (!key || !header) return false;
  const m = /^Bearer (.+)$/.exec(header);
  if (!m) return false;
  const a = createHash('sha256').update(m[1]).digest();
  const b = createHash('sha256').update(key).digest();
  return timingSafeEqual(a, b);
}

/** A small fixed-window limiter, kept in memory (one count per caller per window). */
export function createRateLimiter(limit: number, windowMs: number) {
  const hits = new Map<string, { start: number; n: number }>();
  return {
    /** True when this caller is within the limit and the call is counted. */
    take(who: string, now: number = Date.now()): boolean {
      if (hits.size > 1000) for (const [k, v] of hits) if (now - v.start >= windowMs) hits.delete(k);
      const h = hits.get(who);
      if (!h || now - h.start >= windowMs) {
        hits.set(who, { start: now, n: 1 });
        return true;
      }
      h.n++;
      return h.n <= limit;
    },
  };
}
