import Link from 'next/link';
import { inviteOnly } from '@/auth';
import { Waitlist } from '@/components/SignInScreen';
import { LegalLinks } from '@/components/legal/LegalLinks';

import { WAITLIST_URL as waitlistUrl } from '@/lib/waitlist';

/**
 * Where Auth.js sends a failed sign-in. While sign-ups are invite-only (SIGNUPS=invite) that
 * almost always means the account is not on the list, so it says so and offers the waitlist.
 * While open, a refusal can only be a sign-in that went wrong, so it says to try again.
 */
export default function DeniedPage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div
        className="w-full max-w-sm space-y-4 rounded-2xl border p-6 text-center shadow-sm"
        style={{ borderColor: 'var(--line)', background: 'var(--surface)' }}
      >
        <h1 className="font-display text-3xl" style={{ color: 'var(--ink)' }}>
          {inviteOnly ? 'Invite only' : "Couldn't sign you in"}
        </h1>
        <p className="text-sm" style={{ color: 'var(--muted)' }}>
          {inviteOnly
            ? 'This app is invite only. Ask the owner to add your Google account.'
            : 'Something went wrong signing in with Google. Please try again.'}
        </p>
        {inviteOnly && waitlistUrl && <Waitlist url={waitlistUrl} />}
        <Link
          href="/"
          className="inline-flex min-h-11 items-center justify-center rounded-full border px-5 text-sm font-semibold"
          style={{ borderColor: 'var(--line)', color: 'var(--ink)' }}
        >
          {inviteOnly ? 'Back to sign in' : 'Try again'}
        </Link>
        <LegalLinks />
      </div>
    </div>
  );
}
