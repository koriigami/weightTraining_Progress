'use client';

import { Suspense } from 'react';
import { EditWorkout } from '@/components/workout/EditWorkout';

export default function EditWorkoutPage() {
  return (
    <Suspense fallback={null}>
      <EditWorkout />
    </Suspense>
  );
}
