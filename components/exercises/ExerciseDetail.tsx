'use client';

import { EQUIPMENT, MUSCLES } from '@/data/exercises';
import type { ExerciseDef } from '@/data/exercises';
import { formatDateShort } from '@/lib/date';
import { exerciseHistory, fmtPreviousBest } from '@/lib/exerciseHistory';
import { useProgress } from '@/components/ProgressProvider';
import { Card, CardHead } from '@/components/ui/Card';
import { MuscleMap } from '@/components/ui/MuscleMap';
import { Sheet } from '@/components/ui/Sheet';

/** Muscle map, main and supporting muscles, equipment, and what the person has done with it. */
export function ExerciseDetail({ exercise }: { exercise: ExerciseDef }) {
  const { workouts, prefs } = useProgress();
  const history = exerciseHistory(workouts, exercise.id, exercise.metric);
  const primary = exercise.primary === 'cardio' ? [] : [exercise.primary];

  return (
    <div className="wt-exd">
      <MuscleMap primary={primary} secondary={exercise.secondary} size={110} />
      <div className="wt-exd-mus">
        <div>
          <small>Main muscle</small>
          <b>{MUSCLES[exercise.primary]}</b>
        </div>
        <div>
          <small>Also works</small>
          <b>{exercise.secondary.map((m) => MUSCLES[m]).join(', ') || 'Nothing else'}</b>
        </div>
        <div>
          <small>Equipment</small>
          <b>{EQUIPMENT[exercise.equipment]}</b>
        </div>
      </div>
      <Card tone="calm">
        <CardHead title="Your history" />
        {history.workouts > 0 ? (
          <div>
            <div className="wt-kv">
              <span>Best set</span>
              <b>{fmtPreviousBest(exercise.metric, history.best, prefs.units)}</b>
            </div>
            <div className="wt-kv">
              <span>Last done</span>
              <b>{history.lastDate ? formatDateShort(history.lastDate) : ''}</b>
            </div>
            <div className="wt-kv">
              <span>Workouts</span>
              <b>{history.workouts}</b>
            </div>
          </div>
        ) : (
          <span style={{ color: 'var(--muted)' }}>Your best set shows here after your first workout with it.</span>
        )}
      </Card>
    </div>
  );
}

/** The detail as a bottom sheet on the phone and a centered dialog on desktop. */
export function ExerciseInfoSheet({ exercise, onClose }: { exercise: ExerciseDef | null; onClose: () => void }) {
  return (
    <Sheet open={Boolean(exercise)} onClose={onClose} title={exercise?.name ?? 'Exercise'}>
      {exercise && <ExerciseDetail exercise={exercise} />}
    </Sheet>
  );
}
