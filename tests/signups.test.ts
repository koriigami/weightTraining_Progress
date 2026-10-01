import { describe, expect, it } from 'vitest';
import { allowedEmails, canSignIn, signupMode } from '@/lib/signups';

describe('sign-ups', () => {
  it('is open when SIGNUPS is unset, empty or "open"', () => {
    expect(signupMode(undefined)).toBe('open');
    expect(signupMode('')).toBe('open');
    expect(signupMode(' Open ')).toBe('open');
  });

  it('is invite-only for "invite" and for any other value, so a typo never opens it', () => {
    expect(signupMode('invite')).toBe('invite');
    expect(signupMode('INVITE')).toBe('invite');
    expect(signupMode('opne')).toBe('invite');
  });

  it('lets any email in while open', () => {
    expect(canSignIn('someone@new.com', 'open', [])).toBe(true);
  });

  it('lets only listed emails in while invite-only, ignoring case and spaces', () => {
    const list = allowedEmails(' Me@Example.com , friend@example.com,');
    expect(list).toEqual(['me@example.com', 'friend@example.com']);
    expect(canSignIn('ME@example.com ', 'invite', list)).toBe(true);
    expect(canSignIn('stranger@example.com', 'invite', list)).toBe(false);
  });

  it('never lets in an account without an email', () => {
    expect(canSignIn(undefined, 'open', [])).toBe(false);
    expect(canSignIn('  ', 'open', [])).toBe(false);
  });
});
