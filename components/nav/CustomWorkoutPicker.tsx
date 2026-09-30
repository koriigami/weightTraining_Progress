'use client';

import { useRouter } from 'next/navigation';
import { useProgress } from '@/components/ProgressProvider';
import { useWorkoutSession } from '@/components/WorkoutSessionProvider';
import { ExercisePicker } from '@/components/exercises/ExercisePicker';

const NONE: ReadonlySet<string> = new Set();

/**
 * Custom workout: pick the exercises first. Nothing is created and no clock runs
 * until "Start workout · N" is tapped. Cancel starts nothing.
 */
export function CustomWorkoutPicker({ open, onClose }: { open: boolean; onClose: () => void }) {
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
      onStart={(ids) => {
        const error = ws.startCustom(ids);
        if (error) showToast(error);
        else router.push('/workout');
      }}
    />
  );
}
