'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Field, Input } from '@/components/ui/Field';

export function SignInScreen({ hasGoogle, hasDev }: { hasGoogle: boolean; hasDev: boolean }) {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-sm space-y-4 text-center">
        <h1 className="gt text-4xl" style={{ fontSize: 38, lineHeight: 1.1 }}>
          Home Workout
        </h1>
        <p className="text-sm" style={{ color: 'var(--muted)' }}>
          Sign in to see your progress.
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
      </Card>
    </div>
  );
}
