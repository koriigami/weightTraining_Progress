'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useCelebration } from '@/components/celebrate/CelebrationProvider';
import { useWorkoutSession } from '@/components/WorkoutSessionProvider';
import { ComingCard } from '@/components/ComingCard';
import { Button } from '@/components/ui/Button';
import { Card, Hero } from '@/components/ui/Card';
import { PageHeader } from '@/components/ui/PageHeader';
import { Screen } from '@/components/ui/Screen';
import { XpBar } from '@/components/ui/XpBar';

// A stand-in for the Victory screen. It shows how the finish result is used:
// the XP counter rolls from `before` to `after`, and the level-up, rank-up and
// badge moments are played from `events` (finish() holds them back).
export default function WorkoutDonePage() {
  const router = useRouter();
  const { lastFinished, clearLastFinished, ready } = useWorkoutSession();
  const celebration = useCelebration();
  const played = useRef(false);

  useEffect(() => {
    if (!lastFinished || played.current) return;
    played.current = true;
    celebration.enqueue(lastFinished.events);
  }, [lastFinished, celebration]);

  function done() {
    clearLastFinished();
    router.replace('/');
  }

  if (!lastFinished) {
    return (
      <Screen header={<PageHeader title="Workout" back="/" />}>
        <Card tone="dashed" className="text-center">
          <p style={{ margin: '0 0 12px' }}>{ready ? 'There is no finished workout to show.' : 'Loading.'}</p>
          <Button onClick={() => router.replace('/')}>Home</Button>
        </Card>
      </Screen>
    );
  }

  const { workout, before, after } = lastFinished;
  const sets = workout.items.reduce((n, i) => n + i.sets.length, 0);
  const pct = (s: typeof before) => (s.needed > 0 ? (s.current / s.needed) * 100 : 0);

  return (
    <Screen
      header={<PageHeader title="Victory" narrow />}
      narrow
      footer={
        <Button block size="lg" onClick={done}>
          Done
        </Button>
      }
    >
      <Hero>
        <div className="gt" style={{ fontSize: 44, lineHeight: 1, textAlign: 'center', color: 'var(--v-title)' }}>
          VICTORY!
        </div>
        <p style={{ textAlign: 'center', fontWeight: 800, margin: '6px 0 12px' }}>{workout.title}</p>
        <div className="gt gold" style={{ fontSize: 30, textAlign: 'center', marginBottom: 10 }}>
          +{after.xp - before.xp} XP
        </div>
        <XpBar from={before.level === after.level ? pct(before) : 0} value={pct(after)} animate label={`Level ${after.level} progress`} />
        <div className="wt-hero-xp">
          <span>Level {after.level}</span>
          <span>
            {after.current} / {after.needed} XP
          </span>
        </div>
      </Hero>
      <Card>
        <b>{sets} sets saved</b>
        <div style={{ color: 'var(--muted)' }}>{workout.when.replace('T', ' ')}</div>
      </Card>
      <ComingCard>The title, date, photo and notes editor, and Share, arrive with the Victory screen.</ComingCard>
    </Screen>
  );
}
