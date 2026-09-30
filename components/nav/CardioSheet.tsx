'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Bike, Footprints, PersonStanding, Play, Sailboat, Waves } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { CARDIO_CHOICES } from '@/lib/session';
import { useProgress } from '@/components/ProgressProvider';
import { useWorkoutSession } from '@/components/WorkoutSessionProvider';
import { Button } from '@/components/ui/Button';
import { Sheet, useSheet } from '@/components/ui/Sheet';

const ICONS: Record<string, LucideIcon> = { run: Footprints, walk: PersonStanding, cycle: Bike, bike: Bike, treadmill: Waves, rower: Sailboat };

function StartCardio({ id }: { id: string }) {
  const router = useRouter();
  const { closeThen } = useSheet();
  const { showToast } = useProgress();
  const ws = useWorkoutSession();
  return (
    <Button
      size="lg"
      block
      icon={<Play size={20} fill="currentColor" aria-hidden="true" />}
      onClick={() =>
        closeThen(() => {
          const error = ws.startCardio(id);
          if (error) showToast(error);
          else router.push('/workout');
        })
      }
    >
      Start workout
    </Button>
  );
}

/**
 * Cardio: six activities. Tapping one only highlights it (the sheet does not
 * redraw), and the pinned Start workout appears once one is picked.
 */
export function CardioSheet({ open, initial, onClose }: { open: boolean; initial: string | null; onClose: () => void }) {
  const [act, setAct] = useState<string | null>(initial);
  return (
    <Sheet open={open} onClose={onClose} title="Cardio" description="Pick an activity, then start." footer={act ? <StartCardio id={act} /> : undefined}>
      <div className="wt-acts">
        {CARDIO_CHOICES.map((c) => {
          const Icon = ICONS[c.id] ?? Footprints;
          return (
            <button key={c.id} type="button" className="wt-act" aria-pressed={act === c.id} onClick={() => setAct((cur) => (cur === c.id ? null : c.id))}>
              <span className="ib">
                <Icon size={22} aria-hidden="true" />
              </span>
              {c.label}
            </button>
          );
        })}
      </div>
    </Sheet>
  );
}
