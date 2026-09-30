'use client';

import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useProgress } from '@/components/ProgressProvider';
import { useWorkoutSession } from '@/components/WorkoutSessionProvider';

/** Starts a workout from a saved routine and opens the log, or says why it cannot. */
export function useStartRoutine(): (routineId: string) => void {
  const router = useRouter();
  const { showToast } = useProgress();
  const ws = useWorkoutSession();
  return useCallback(
    (routineId: string) => {
      const error = ws.start(routineId);
      if (error) showToast(error);
      else router.push('/workout');
    },
    [ws, showToast, router]
  );
}
