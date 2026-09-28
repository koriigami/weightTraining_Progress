'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export function SignInScreen({ hasGoogle, hasDev }: { hasGoogle: boolean; hasDev: boolean }) {
  const [email, setEmail] = useState('');
  const router = useRouter();
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div
        className="w-full max-w-sm space-y-4 rounded-2xl border p-6 text-center shadow-sm"
        style={{ borderColor: 'var(--line)', background: 'var(--surface)' }}
      >
        <h1 className="font-display text-3xl" style={{ color: 'var(--ink)' }}>
          Home Workout
        </h1>
        <p className="text-sm" style={{ color: 'var(--muted)' }}>
          Sign in to see your progress.
        </p>
        {hasGoogle && (
          <button
            type="button"
            onClick={() => signIn('google', { callbackUrl: '/' })}
            className="min-h-11 w-full rounded-full px-4 py-2 text-sm font-semibold text-white"
            style={{ background: 'var(--ink)' }}
          >
            Sign in with Google
          </button>
        )}
        {hasDev && (
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const res = await signIn('dev', { email, redirect: false });
              if (res?.error) router.push('/auth/denied');
              else window.location.href = '/';
            }}
            className="space-y-3"
          >
            <input
              type="email"
              name="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              aria-label="Email"
              className="w-full rounded-lg border px-3 py-2 text-sm outline-none"
              style={{ borderColor: 'var(--line)', background: 'var(--surface)', color: 'var(--ink)' }}
            />
            <button
              type="submit"
              className="min-h-11 w-full rounded-full px-4 py-2 text-sm font-semibold text-white"
              style={{ background: 'var(--ink)' }}
            >
              Dev sign-in
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
