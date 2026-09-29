'use client';

import { useParams } from 'next/navigation';
import { RoutineEditor } from '@/components/routines/RoutineEditor';

/** /routine/[id]: the editor for a saved routine. */
export function RoutineScreen() {
  const params = useParams<{ id: string }>();
  return <RoutineEditor key={params.id} routineId={params.id} />;
}
