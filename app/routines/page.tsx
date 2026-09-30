'use client';

import { Compass, Plus } from 'lucide-react';
import { useProgress } from '@/components/ProgressProvider';
import { RoutinesTabs } from '@/components/RoutinesTabs';
import { RoutineCard } from '@/components/routines/RoutineCard';
import { ButtonLink } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { PageHeader } from '@/components/ui/PageHeader';
import { Screen } from '@/components/ui/Screen';
import { routineWeekStats } from '@/lib/week';
import { useDesktopLayout } from '@/lib/useMediaQuery';
import { useToday } from '@/lib/useToday';

export default function RoutinesPage() {
  const { routines, workouts } = useProgress();
  const today = useToday();
  const desktop = useDesktopLayout();

  return (
    <Screen
      header={
        <PageHeader
          title="Routines"
          large
          collapse
          sub={desktop ? undefined : <RoutinesTabs current="mine" />}
          actions={
            desktop ? (
              <>
                <ButtonLink href="/routine/new" variant="secondary" icon={<Plus size={20} aria-hidden="true" />}>
                  Create routine
                </ButtonLink>
                <ButtonLink href="/explore" variant="secondary" icon={<Compass size={20} aria-hidden="true" />}>
                  Explore
                </ButtonLink>
              </>
            ) : undefined
          }
        />
      }
    >
      {!desktop && (
        <ButtonLink href="/routine/new" variant="secondary" block icon={<Plus size={20} aria-hidden="true" />}>
          Create routine
        </ButtonLink>
      )}
      {routines.length === 0 ? (
        <Card tone="dashed" className="text-center">
          <p style={{ margin: '0 0 4px' }}>
            <b>No routines yet.</b>
          </p>
          <p style={{ margin: '0 0 14px', color: 'var(--muted)' }}>A routine is one day of training: exercises, then sets with a weight and reps. Build your own, or start from a ready-made one.</p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
            <ButtonLink href="/routine/new">Create routine</ButtonLink>
            <ButtonLink href="/explore" variant="secondary">
              Explore
            </ButtonLink>
          </div>
        </Card>
      ) : (
        <div className="wt-rgrid">
          {routines.map((r) => (
            <RoutineCard key={r.id} routine={r} doneThisWeek={routineWeekStats(r, workouts, today).done} />
          ))}
        </div>
      )}
    </Screen>
  );
}
