'use client';

import { useRouter } from 'next/navigation';
import { Bike, ClipboardList, Dumbbell, Footprints, Play, Plus } from 'lucide-react';
import { useProgress } from '@/components/ProgressProvider';
import { useElapsed, useWorkoutSession } from '@/components/WorkoutSessionProvider';
import type { CardioKind } from '@/lib/session';
import { Button, ButtonLink } from '@/components/ui/Button';
import { Sheet, useSheet } from '@/components/ui/Sheet';

function StartBody() {
  const router = useRouter();
  const { closeThen } = useSheet();
  const { routines, showToast } = useProgress();
  const ws = useWorkoutSession();
  const elapsed = useElapsed(ws.session?.startedAt);

  // Start, then go to the log once the sheet has closed.
  function begin(run: () => string | null) {
    const error = run();
    if (error) {
      showToast(error);
      return;
    }
    closeThen(() => router.push('/workout'));
  }

  if (ws.session) {
    return (
      <div className="wt-stack" style={{ gap: 12 }}>
        <p className="wt-sheet-desc" style={{ margin: 0 }}>
          You have a workout in progress. Finish or discard it before you start another.
        </p>
        <div className="wt-startrow">
          <div className="grow">
            <b>{ws.session.title || 'Workout'}</b>
            <small>
              {ws.counts.done} of {ws.counts.total} sets{elapsed ? ` · ${elapsed}` : ''}
            </small>
          </div>
          <Button size="sm" icon={<Play size={14} fill="currentColor" aria-hidden="true" />} onClick={() => closeThen(() => router.push('/workout'))}>
            Resume
          </Button>
        </div>
      </div>
    );
  }

  const quick: { kind: CardioKind; label: string; icon: React.ReactNode }[] = [
    { kind: 'run', label: 'Run', icon: <Footprints size={16} aria-hidden="true" /> },
    { kind: 'walk', label: 'Walk', icon: <Footprints size={16} aria-hidden="true" /> },
    { kind: 'ride', label: 'Ride', icon: <Bike size={16} aria-hidden="true" /> },
  ];

  return (
    <div>
      <Button variant="secondary" block icon={<Plus size={18} aria-hidden="true" />} onClick={() => begin(() => ws.start())}>
        Empty workout
      </Button>

      <h3 className="wt-sec-label" style={{ fontSize: 17, marginTop: 14 }}>
        Quick log
      </h3>
      <div className="wt-grid-2" style={{ gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', marginTop: 8 }}>
        {quick.map((q) => (
          <Button key={q.kind} variant="secondary" size="sm" icon={q.icon} onClick={() => begin(() => ws.startCardio(q.kind))}>
            {q.label}
          </Button>
        ))}
      </div>

      <h3 className="wt-sec-label" style={{ fontSize: 17, marginTop: 14 }}>
        Routines
      </h3>
      {routines.length === 0 ? (
        <div className="wt-startrow" style={{ marginTop: 12 }}>
          <div className="grow">
            <b>No routines yet</b>
            <small>Build one, or just log as you go.</small>
          </div>
          <ButtonLink href="/routine/new" size="sm" variant="secondary" icon={<ClipboardList size={16} aria-hidden="true" />} onClick={(e) => { e.preventDefault(); closeThen(() => router.push('/routine/new')); }}>
            New
          </ButtonLink>
        </div>
      ) : (
        <div className="wt-startlist">
          {routines.map((r) => (
            <div key={r.id} className="wt-startrow">
              <div className="grow">
                <b>{r.title}</b>
                <small>
                  {r.items.length} {r.items.length === 1 ? 'exercise' : 'exercises'}
                </small>
              </div>
              <Button size="sm" icon={<Dumbbell size={14} aria-hidden="true" />} aria-label={`Start ${r.title}`} onClick={() => begin(() => ws.start(r.id))}>
                Start
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/** Empty workout, quick log of a run, walk or ride, and your routines with Start buttons. */
export function StartSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Sheet open={open} onClose={onClose} title="Start a workout">
      <StartBody />
    </Sheet>
  );
}
