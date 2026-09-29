'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Play, Plus } from 'lucide-react';
import { useProgress } from '@/components/ProgressProvider';
import { useWorkoutSession } from '@/components/WorkoutSessionProvider';
import { useShell } from '@/components/nav/ShellContext';
import { HeroLevel } from '@/components/HeroLevel';
import { ComingCard } from '@/components/ComingCard';
import { Button } from '@/components/ui/Button';
import { Card, CardHead } from '@/components/ui/Card';
import { PageHeader } from '@/components/ui/PageHeader';
import { Screen } from '@/components/ui/Screen';

export default function HomePage() {
  const router = useRouter();
  const { routines, showToast } = useProgress();
  const ws = useWorkoutSession();
  const { openStart } = useShell();

  function startRoutine(id: string) {
    const error = ws.start(id);
    if (error) showToast(error);
    else router.push('/workout');
  }

  return (
    <Screen header={<PageHeader title="Home" large />}>
      <HeroLevel />

      <Card>
        <CardHead title="Up next" right={<Link href="/routines" className="wt-textbtn sm">All routines</Link>} />
        <div className="wt-startlist" style={{ marginTop: 0, marginBottom: 12 }}>
          {routines.slice(0, 3).map((r) => (
            <div key={r.id} className="wt-startrow">
              <div className="grow">
                <b>{r.title}</b>
                <small>
                  {r.items.length} {r.items.length === 1 ? 'exercise' : 'exercises'}
                </small>
              </div>
              <Button size="sm" aria-label={`Start ${r.title}`} icon={<Play size={14} fill="currentColor" aria-hidden="true" />} onClick={() => startRoutine(r.id)} disabled={Boolean(ws.session)}>
                Start
              </Button>
            </div>
          ))}
          {routines.length === 0 && <p style={{ margin: 0, color: 'var(--muted)' }}>No routines yet. Build one, or start an empty workout and log as you go.</p>}
        </div>
        <Button variant="secondary" block icon={<Plus size={18} aria-hidden="true" />} onClick={openStart}>
          Empty workout
        </Button>
      </Card>

      <ComingCard>
        Home is being rebuilt: this week at a glance, your streak and your recent workouts.
        <br />
        <Link href="/calendar" className="wt-textbtn" style={{ padding: '8px 0' }}>
          Open the 6-week plan calendar
        </Link>
      </ComingCard>
    </Screen>
  );
}
