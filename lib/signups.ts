// Who may sign in. Sign-ups are open to any Google account unless the SIGNUPS env
// var says "invite", which limits sign-in to the emails in ALLOWED_EMAILS. Any other
// value also means invite, so a typo can only close the door, never open it.

export type SignupMode = 'open' | 'invite';

export function signupMode(value: string | undefined = process.env.SIGNUPS): SignupMode {
  const v = value?.trim().toLowerCase();
  return !v || v === 'open' ? 'open' : 'invite';
}

/** ALLOWED_EMAILS, comma separated, trimmed and lowercased. */
export function allowedEmails(value: string | undefined = process.env.ALLOWED_EMAILS): string[] {
  return (value ?? '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

/**
 * True when this email may sign in. An account without an email never may. While
 * invite-only, an email is let in when it is in ALLOWED_EMAILS or in the app's invite
 * list (`invited`, read from the store on the server, already lowercased).
 */
export function canSignIn(
  email: string | null | undefined,
  mode: SignupMode = signupMode(),
  allowed: readonly string[] = allowedEmails(),
  invited: readonly string[] = []
): boolean {
  const e = email?.trim().toLowerCase();
  if (!e) return false;
  return mode === 'open' || allowed.includes(e) || invited.includes(e);
}
