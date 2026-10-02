'use client';

import { Suspense } from 'react';
import { LogWorkout } from '@/components/workout/LogWorkout';

export default function LogWorkoutPage() {
  return (
    <Suspense fallback={null}>
      <LogWorkout />
    </Suspense>
  );
}
