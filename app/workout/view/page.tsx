'use client';

import { Suspense } from 'react';
import { WorkoutView } from '@/components/workout/WorkoutView';

// The id is a query parameter (/workout/view?id=...) so the page stays static.
export default function WorkoutViewPage() {
  return (
    <Suspense fallback={null}>
      <WorkoutView />
    </Suspense>
  );
}
