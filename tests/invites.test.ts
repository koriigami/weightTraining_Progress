import { describe, expect, it } from 'vitest';
import { applyInviteDates, applyInvites, cleanDates, cleanList, createRateLimiter, keyMatches } from '../lib/invites';

describe('invite key', () => {
  it('refuses a missing header, a wrong key and a header that is not Bearer', () => {
    expect(keyMatches(null, 'secret')).toBe(false);
    expect(keyMatches('Bearer wrong', 'secret')).toBe(false);
    expect(keyMatches('secret', 'secret')).toBe(false);
    expect(keyMatches('Bearer secre', 'secret')).toBe(false);
  });

  it('refuses everything when INVITE_KEY is unset or empty', () => {
    expect(keyMatches('Bearer anything', undefined)).toBe(false);
    expect(keyMatches('Bearer ', '')).toBe(false);
    expect(keyMatches('Bearer undefined', undefined)).toBe(false);
  });

  it('accepts the right key', () => {
    expect(keyMatches('Bearer secret', 'secret')).toBe(true);
  });
});

describe('applyInvites', () => {
  it('normalises emails and rejects invalid ones', () => {
    const r = applyInvites([], { add: [' New@Example.com '] });
    expect(r).toMatchObject({ ok: true, emails: ['new@example.com'], added: 1 });
    for (const bad of ['nope', 'a@b', 'a b@c.com', 'a@b.com,c@d.com', 5]) {
      expect(applyInvites([], { add: [bad] }).ok).toBe(false);
    }
    expect(applyInvites([], { remove: ['nope'] }).ok).toBe(false);
    expect(applyInvites([], { add: 'a@b.com' }).ok).toBe(false);
    expect(applyInvites([], null).ok).toBe(false);
  });

  it('adds idempotently', () => {
    const once = applyInvites([], { add: ['a@example.com', 'A@example.com'] });
    expect(once).toMatchObject({ ok: true, added: 1, emails: ['a@example.com'] });
    const twice = applyInvites(once.ok ? once.emails : [], { add: ['a@example.com'] });
    expect(twice).toMatchObject({ ok: true, added: 0, emails: ['a@example.com'] });
  });

  it('removes idempotently', () => {
    const once = applyInvites(['a@example.com', 'b@example.com'], { remove: ['A@example.com'] });
    expect(once).toMatchObject({ ok: true, removed: 1, emails: ['b@example.com'] });
    const twice = applyInvites(once.ok ? once.emails : [], { remove: ['a@example.com'] });
    expect(twice).toMatchObject({ ok: true, removed: 0, emails: ['b@example.com'] });
  });

  it('refuses more than 200 emails in one call and accepts exactly 200', () => {
    const many = (n: number) => Array.from({ length: n }, (_, i) => `p${i}@example.com`);
    expect(applyInvites([], { add: many(201) }).ok).toBe(false);
    expect(applyInvites([], { add: many(150), remove: many(51) }).ok).toBe(false);
    expect(applyInvites([], { add: many(200) })).toMatchObject({ ok: true, added: 200 });
  });

  it('tidies a stored list', () => {
    expect(cleanList(['B@x.com', 'b@x.com', 3, ' ', 'a@x.com'])).toEqual(['b@x.com', 'a@x.com']);
    expect(cleanList(null)).toEqual([]);
  });
});

describe('rate limit', () => {
  it('allows the limit per window per caller, then refuses until the window passes', () => {
    const l = createRateLimiter(2, 1000);
    expect(l.take('a', 0)).toBe(true);
    expect(l.take('a', 10)).toBe(true);
    expect(l.take('a', 20)).toBe(false);
    expect(l.take('b', 20)).toBe(true);
    expect(l.take('a', 1001)).toBe(true);
  });
});

describe('invite dates', () => {
  const add = (current: string[], emails: string[]) => {
    const r = applyInvites(current, { add: emails });
    if (!r.ok) throw new Error(r.error);
    return r;
  };

  it('stamps new invites with today and keeps an earlier day', () => {
    const r = add([], ['a@example.com', 'b@example.com']);
    const first = applyInviteDates({}, r.emails, r, {}, '2026-10-02');
    expect(first).toEqual({ ok: true, dates: { 'a@example.com': '2026-10-02', 'b@example.com': '2026-10-02' }, changed: true });
    const again = applyInviteDates(first.ok ? first.dates : {}, r.emails, add(r.emails, ['a@example.com']), {}, '2026-10-09');
    expect(again).toMatchObject({ ok: true, changed: false, dates: { 'a@example.com': '2026-10-02' } });
  });

  it('drops the day of someone removed, and a re-invite gets a new day', () => {
    const removed = applyInvites(['a@example.com'], { remove: ['a@example.com'] });
    if (!removed.ok) throw new Error(removed.error);
    const gone = applyInviteDates({ 'a@example.com': '2026-10-02' }, removed.emails, removed, {}, '2026-10-05');
    expect(gone).toMatchObject({ ok: true, dates: {}, changed: true });
    const back = add([], ['a@example.com']);
    expect(applyInviteDates({}, back.emails, back, {}, '2026-10-09')).toMatchObject({ dates: { 'a@example.com': '2026-10-09' } });
  });

  it('backfills days for people on the list and refuses the rest', () => {
    const none = applyInvites(['a@example.com'], {});
    if (!none.ok) throw new Error(none.error);
    const ok = applyInviteDates({}, none.emails, none, { dates: { 'A@example.com': '2026-09-30' } }, '2026-10-02');
    expect(ok).toMatchObject({ ok: true, changed: true, dates: { 'a@example.com': '2026-09-30' } });
    for (const bad of [{ dates: { 'z@example.com': '2026-09-30' } }, { dates: { 'a@example.com': 'yesterday' } }, { dates: { 'a@example.com': '2026-13-45' } }, { dates: ['a@example.com'] }]) {
      expect(applyInviteDates({}, none.emails, none, bad, '2026-10-02').ok).toBe(false);
    }
  });

  it('tidies stored dates', () => {
    expect(cleanDates({ 'B@x.com': '2026-10-02', 'c@x.com': 'soon', 'd@x.com': 4 })).toEqual({ 'b@x.com': '2026-10-02' });
    expect(cleanDates(null)).toEqual({});
    expect(cleanDates(['a'])).toEqual({});
  });
});
