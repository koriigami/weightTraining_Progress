'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useProgress } from '@/components/ProgressProvider';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

// The first-run flow arrives with the onboarding screens. Until then this
// placeholder lets a new person continue, so nobody is stuck on it.
export default function OnboardingPage() {
  const router = useRouter();
  const { prefs, savePrefs, showToast } = useProgress();
  const [busy, setBusy] = useState(false);

  async function skip() {
    setBusy(true);
    const error = await savePrefs({ ...prefs, onboarded: true });
    if (error) {
      setBusy(false);
      showToast(error);
      return;
    }
    router.replace('/');
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-md space-y-4 text-center">
        <h1 className="gt" style={{ fontSize: 34, lineHeight: 1.1, margin: 0 }}>
          Welcome
        </h1>
        <p style={{ margin: 0, color: 'var(--muted)' }}>
          A short setup arrives here: your units, your equipment, anything to avoid, and how you want to start. Nothing is forced, and you can change it all later.
        </p>
        <Button block size="lg" loading={busy} onClick={skip}>
          Continue
        </Button>
      </Card>
    </div>
  );
}
