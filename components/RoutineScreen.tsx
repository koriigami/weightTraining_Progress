'use client';

import { useParams } from 'next/navigation';
import { useProgress } from '@/components/ProgressProvider';
import { ComingCard } from '@/components/ComingCard';
import { Card, CardHead } from '@/components/ui/Card';
import { MuscleMap } from '@/components/ui/MuscleMap';
import { PageHeader } from '@/components/ui/PageHeader';
import { Screen } from '@/components/ui/Screen';
import { musclesOfExercises } from '@/lib/muscles';
import type { ExerciseDef } from '@/data/exercises';

// The routine screen. A stand-in until the editor arrives: it shows the
// routine's title and the muscles it works.
export function RoutineScreen() {
  const params = useParams<{ id: string }>();
  const { routines, lookup } = useProgress();
  const routine = routines.find((r) => r.id === params.id);
  const exercises = (routine?.items ?? []).map((i) => lookup(i.exerciseId)).filter((e): e is ExerciseDef => Boolean(e));
  const { primary, secondary } = musclesOfExercises(exercises);

  return (
    <Screen header={<PageHeader title={routine?.title ?? 'Routine'} back="/routines" narrow />} narrow>
      {routine ? (
        <Card>
          <CardHead title="Summary" />
          <MuscleMap primary={primary} secondary={secondary} size={84} />
        </Card>
      ) : (
        <ComingCard title="Routine not found">This routine is gone, or it has not loaded yet.</ComingCard>
      )}
      <ComingCard>The routine editor arrives here, with the exercises, sets, Delete routine and the library panel.</ComingCard>
    </Screen>
  );
}
