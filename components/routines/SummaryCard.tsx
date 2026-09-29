'use client';

import type { ExerciseDef } from '@/data/exercises';
import { musclesOfExercises } from '@/lib/muscles';
import { countSets } from '@/lib/routineSummary';
import { estimateMinutes } from '@/lib/routines';
import type { RoutineItem } from '@/lib/routines';
import { useProgress } from '@/components/ProgressProvider';
import { Card, CardHead } from '@/components/ui/Card';
import { MuscleMap } from '@/components/ui/MuscleMap';

/** The desktop Summary card: exercises, total sets, about how long, and the muscles worked. */
export function SummaryCard({ items }: { items: RoutineItem[] }) {
  const { lookup } = useProgress();
  const exercises = items.map((i) => lookup(i.exerciseId)).filter((e): e is ExerciseDef => Boolean(e));
  const { primary, secondary } = musclesOfExercises(exercises);
  return (
    <Card>
      <CardHead title="Summary" />
      <div className="wt-sum-n">
        <div className="wt-stat">
          <small>Exercises</small>
          <b>{items.length}</b>
        </div>
        <div className="wt-stat">
          <small>Total sets</small>
          <b>{countSets(items)}</b>
        </div>
        <div className="wt-stat">
          <small>About</small>
          <b>{estimateMinutes(items, lookup)} min</b>
        </div>
      </div>
      <MuscleMap primary={primary} secondary={secondary} size={84} />
    </Card>
  );
}
