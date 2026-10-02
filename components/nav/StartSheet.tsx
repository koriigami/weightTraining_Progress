'use client';

import { useRouter } from 'next/navigation';
import { Bike, ChevronRight, ClipboardList, Footprints, History, PersonStanding, Play, Plus } from 'lucide-react';
import { estimateMinutes } from '@/lib/routines';
import { upNextRoutines } from '@/lib/week';
import { useToday } from '@/lib/useToday';
import { useProgress } from '@/components/ProgressProvider';
import { useElapsed, useWorkoutSession } from '@/components/WorkoutSessionProvider';
import { Button, ButtonLink } from '@/components/ui/Button';
import { Sheet, useSheet } from '@/components/ui/Sheet';
import { useShell } from './ShellContext';
import type { StartMode } from './ShellContext';

const MAX_ROUTINES = 3;

function StartBody({ mode }: { mode: StartMode }) {
  const log = mode === 'log';
  const router = useRouter();
  const { closeThen } = useSheet();
  const { routines, workouts, lookup, showToast } = useProgress();
  const { openCustom, openCardio } = useShell();
  const today = useToday();
  const ws = useWorkoutSession();
  const elapsed = useElapsed(ws.session?.startedAt);
  // The routine that is due today comes first and wears the Today tag.
  const todayId = upNextRoutines(routines, workouts, today, 1).items[0]?.routine.id;

  // Start, then go to the log once the sheet has closed.
  function begin(run: () => string | null) {
    const error = run();
    if (error) {
      showToast(error);
      return;
    }
    closeThen(() => router.push('/workout'));
  }

  // Log: open the Log screen for a routine once the sheet has closed. It never touches a workout in progress.
  function logRoutine(id: string) {
    closeThen(() => router.push(`/workout/log?routine=${encodeURIComponent(id)}`));
  }

  if (ws.session && !log) {
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

  const cardio = [
    { id: 'run', label: 'Run', icon: <Footprints size={22} aria-hidden="true" /> },
    { id: 'walk', label: 'Walk', icon: <PersonStanding size={22} aria-hidden="true" /> },
    { id: 'cycle', label: 'Ride', icon: <Bike size={22} aria-hidden="true" /> },
  ];
  const listed = [...routines.filter((r) => r.id === todayId), ...routines.filter((r) => r.id !== todayId)].slice(0, MAX_ROUTINES);

  return (
    <div>
      <h3 className="wt-sec-label" style={{ fontSize: 17 }}>
        Your routines
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
        <>
          <div className="wt-startlist">
            {listed.map((r) => (
              <div key={r.id} className="wt-startrow">
                <div className="grow">
                  <b>
                    {r.title}
                    {r.id === todayId && <span className="wt-todaytag">Today</span>}
                  </b>
                  <small>
                    {r.items.length} {r.items.length === 1 ? 'exercise' : 'exercises'} · about {estimateMinutes(r.items, lookup)} min
                  </small>
                </div>
                {log ? (
                  <Button size="sm" variant="secondary" icon={<History size={14} aria-hidden="true" />} aria-label={`Log ${r.title}`} onClick={() => logRoutine(r.id)}>
                    Log
                  </Button>
                ) : (
                  <Button size="sm" icon={<Play size={14} fill="currentColor" aria-hidden="true" />} aria-label={`Start ${r.title}`} onClick={() => begin(() => ws.start(r.id))}>
                    Start
                  </Button>
                )}
              </div>
            ))}
          </div>
          <button type="button" className="wt-textbtn" onClick={() => closeThen(() => router.push('/routines'))}>
            All routines
            <ChevronRight size={16} aria-hidden="true" />
          </button>
        </>
      )}

      <h3 className="wt-sec-label" style={{ fontSize: 17, marginTop: 14 }}>
        Cardio
      </h3>
      <div className="wt-acts" style={{ marginTop: 8 }}>
        {cardio.map((c) => (
          <button key={c.id} type="button" className="wt-act" onClick={() => closeThen(() => openCardio(c.id, mode))}>
            <span className="ib">{c.icon}</span>
            {c.label}
          </button>
        ))}
      </div>

      <button type="button" className="wt-startrow wt-customrow" onClick={() => closeThen(() => openCustom(mode))}>
        <span className="ib">
          <Plus size={22} aria-hidden="true" />
        </span>
        <span className="grow">
          <b>Custom workout</b>
          <small>{log ? 'Pick exercises, then log' : 'Pick exercises, then start'}</small>
        </span>
        <ChevronRight size={18} aria-hidden="true" />
      </button>
    </div>
  );
}

/**
 * Your routines with Start, the Cardio tiles, and Custom workout. In log mode it is the
 * same sheet, "Log a workout", with Log on each routine, and it shows the list even while
 * a workout is in progress.
 */
export function StartSheet({ open, mode = 'start', onClose }: { open: boolean; mode?: StartMode; onClose: () => void }) {
  return (
    <Sheet open={open} onClose={onClose} title={mode === 'log' ? 'Log a workout' : 'Start a workout'}>
      <StartBody mode={mode} />
    </Sheet>
  );
}
