'use client';

import { useRouter } from 'next/navigation';
import { Segmented } from '@/components/ui/Segmented';

const HREF = { mine: '/routines', explore: '/explore', exercises: '/exercises' } as const;

/**
 * On the phone Explore and the exercise library live inside Routines, as
 * segments: My routines, Explore, Exercises. They go in the page header's
 * pinned `sub` row. On desktop the sidebar has Routines and Exercises, and
 * Explore is a button on Routines, so this is hidden there.
 */
export function RoutinesTabs({ current }: { current: keyof typeof HREF }) {
  const router = useRouter();
  return (
    <div className="wt-ph-tabs md:hidden">
      <Segmented
        ariaLabel="Routines section"
        value={current}
        options={[
          { value: 'mine', label: 'My routines' },
          { value: 'explore', label: 'Explore' },
          { value: 'exercises', label: 'Exercises' },
        ]}
        onChange={(v) => router.push(HREF[v])}
      />
    </div>
  );
}
