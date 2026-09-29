'use client';

import { useRouter } from 'next/navigation';
import { Segmented } from '@/components/ui/Segmented';

/**
 * On the phone the exercise library lives inside Routines, as a segment. On
 * desktop the sidebar has Exercises, so this is hidden there. Stage 3 adds the
 * Explore segment for ready-made routines.
 */
export function RoutinesTabs({ current }: { current: 'mine' | 'exercises' }) {
  const router = useRouter();
  return (
    <div className="md:hidden">
      <Segmented
        ariaLabel="Routines section"
        value={current}
        options={[
          { value: 'mine', label: 'My routines' },
          { value: 'exercises', label: 'Exercises' },
        ]}
        onChange={(v) => router.push(v === 'mine' ? '/routines' : '/exercises')}
      />
    </div>
  );
}
