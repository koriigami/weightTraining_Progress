'use client';

import { EXERCISES, MUSCLES } from '@/data/exercises';
import { useProgress } from '@/components/ProgressProvider';
import { ComingCard } from '@/components/ComingCard';
import { RoutinesTabs } from '@/components/RoutinesTabs';
import { Card, CardHead } from '@/components/ui/Card';
import { PageHeader } from '@/components/ui/PageHeader';
import { Screen } from '@/components/ui/Screen';
import { Thumb } from '@/components/ui/Thumb';

export default function ExercisesPage() {
  const { customExercises } = useProgress();
  const sample = EXERCISES.slice(0, 6);
  return (
    <Screen header={<PageHeader title="Exercises" large />}>
      <RoutinesTabs current="exercises" />
      <Card>
        <CardHead title={`${EXERCISES.length + customExercises.length} exercises`} />
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {sample.map((e) => (
            <li key={e.id} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <Thumb exercise={e} size={44} />
              <span style={{ minWidth: 0 }}>
                <b style={{ display: 'block' }}>{e.name}</b>
                <small style={{ color: 'var(--muted)' }}>{MUSCLES[e.primary]}</small>
              </span>
            </li>
          ))}
        </ul>
      </Card>
      <ComingCard>The searchable library with muscle and equipment filters, the muscle map for each exercise and custom exercises arrive with the Exercises screen.</ComingCard>
    </Screen>
  );
}
