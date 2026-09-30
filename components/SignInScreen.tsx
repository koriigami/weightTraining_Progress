'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Field, Input } from '@/components/ui/Field';

const waitlistUrl = process.env.NEXT_PUBLIC_WAITLIST_URL;

/** The invite-only note and the waitlist button. Rendered only when NEXT_PUBLIC_WAITLIST_URL is set. */
export function Waitlist({ url }: { url: string }) {
  return (
    <div className="space-y-2 pt-1">
      <p className="text-sm" style={{ color: 'var(--muted)' }}>
        Not invited yet? Join the waitlist and we&apos;ll let you in.
      </p>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex min-h-11 w-full items-center justify-center rounded-full border px-5 text-sm font-semibold"
        style={{ borderColor: 'var(--line)', color: 'var(--ink)' }}
      >
        Join the waitlist
      </a>
    </div>
  );
}

export function SignInScreen({ hasGoogle, hasDev }: { hasGoogle: boolean; hasDev: boolean }) {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-sm space-y-4 text-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/favicon.svg" alt="" width={72} height={72} className="mx-auto" aria-hidden="true" />
        <h1 className="gt text-4xl" style={{ fontSize: 38, lineHeight: 1.1 }}>
          Levl
        </h1>
        <p className="text-sm" style={{ color: 'var(--muted)' }}>
          Log workouts. Beat last time. Climb from E to S rank.
        </p>
        {hasGoogle && (
          <Button block size="lg" onClick={() => signIn('google', { callbackUrl: '/' })}>
            Sign in with Google
          </Button>
        )}
        {hasDev && (
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              const res = await signIn('dev', { email, redirect: false });
              if (res?.error) {
                setBusy(false);
                router.push('/auth/denied');
              } else window.location.href = '/';
            }}
            className="text-left"
          >
            <Field label="Email">
              <Input type="email" name="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
            </Field>
            <Button type="submit" block loading={busy}>
              Dev sign-in
            </Button>
          </form>
        )}
        {waitlistUrl && <Waitlist url={waitlistUrl} />}
      </Card>
    </div>
  );
}
