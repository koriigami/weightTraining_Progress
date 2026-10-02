'use client';

import { useRouter } from 'next/navigation';
import { useProgress } from '@/components/ProgressProvider';
import { useWorkoutSession } from '@/components/WorkoutSessionProvider';
import { ExercisePicker } from '@/components/exercises/ExercisePicker';
import type { StartMode } from './ShellContext';

const NONE: ReadonlySet<string> = new Set();

/**
 * Custom workout: pick the exercises first. Nothing is created and no clock runs
 * until "Start workout · N" is tapped. Cancel starts nothing. In log mode the button
 * is "Log workout · N" and opens the Log screen with the picked exercises.
 */
export function CustomWorkoutPicker({ open, mode = 'start', onClose }: { open: boolean; mode?: StartMode; onClose: () => void }) {
  const router = useRouter();
  const { showToast } = useProgress();
  const ws = useWorkoutSession();
  return (
    <ExercisePicker
      open={open}
      onClose={onClose}
      mode="start"
      inLabel="Picked"
      listName="this workout"
      inList={NONE}
      onAdd={() => undefined}
      onReplace={() => undefined}
      log={mode === 'log'}
      onStart={(ids) => {
        if (mode === 'log') {
          router.push(`/workout/log?ex=${ids.map(encodeURIComponent).join(',')}`);
          return;
        }
        const error = ws.startCustom(ids);
        if (error) showToast(error);
        else router.push('/workout');
      }}
    />
  );
}
