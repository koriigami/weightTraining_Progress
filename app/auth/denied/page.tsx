import Link from 'next/link';
import { Waitlist } from '@/components/SignInScreen';

const waitlistUrl = process.env.NEXT_PUBLIC_WAITLIST_URL;

export default function DeniedPage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div
        className="w-full max-w-sm space-y-4 rounded-2xl border p-6 text-center shadow-sm"
        style={{ borderColor: 'var(--line)', background: 'var(--surface)' }}
      >
        <h1 className="font-display text-3xl" style={{ color: 'var(--ink)' }}>
          Invite only
        </h1>
        <p className="text-sm" style={{ color: 'var(--muted)' }}>
          This app is invite only. Ask the owner to add your Google account.
        </p>
        {waitlistUrl && <Waitlist url={waitlistUrl} />}
        <Link
          href="/"
          className="inline-flex min-h-11 items-center justify-center rounded-full border px-5 text-sm font-semibold"
          style={{ borderColor: 'var(--line)', color: 'var(--ink)' }}
        >
          Back to sign in
        </Link>
      </div>
    </div>
  );
}
