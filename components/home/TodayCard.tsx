'use client';

import Link from 'next/link';
import { Bike, Check, ChevronRight, ClipboardList, Play, Plus } from 'lucide-react';
import { fmtMinutes } from '@/lib/liveStats';
import { routineLine, weekChip } from '@/lib/todayCard';
import type { DoneRow, DoneWorkout, TodayModel } from '@/lib/todayCard';
import { ExerciseRows } from '@/components/routines/ExerciseRows';
import { useStartRoutine } from '@/components/routines/useStartRoutine';
import { useShell } from '@/components/nav/ShellContext';
import { Button, ButtonLink } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Thumb } from '@/components/ui/Thumb';

/** The green "View ›" text link to a finished workout. */
export function ViewLink({ id, title }: { id: string; title: string }) {
  return (
    <Link href={`/workout/view?id=${encodeURIComponent(id)}`} className="wt-viewbtn" aria-label={`View ${title}`}>
      View
      <ChevronRight size={16} aria-hidden="true" />
    </Link>
  );
}

export function DoneChip() {
  return (
    <span className="wt-donechip">
      <Check size={13} aria-hidden="true" />
      Done
    </span>
  );
}

/** The first rows of a finished workout, each with a green tick (and the minutes for cardio). */
export function DoneRows({ rows }: { rows: DoneRow[] }) {
  return (
    <ul className="wt-rrows" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
      {rows.map((r) => (
        <li key={r.key} className="wt-rrow">
          {r.exercise ? <Thumb exercise={r.exercise} size={28} /> : <span className="wt-thumb" style={{ width: 28, height: 28 }} />}
          <span className="rn" title={r.name}>
            {r.name}
          </span>
          <span className="rs ok">
            {r.minutes !== null && fmtMinutes(r.minutes)}
            <Check size={16} aria-hidden="true" />
            <span className="sr-only">Done</span>
          </span>
        </li>
      ))}
    </ul>
  );
}

/** Other routine, Cardio and Custom workout: starting something else is one tap away. */
function Tiles() {
  const { openStart, openCardio, openCustom } = useShell();
  return (
    <div className="wt-tc-alt">
      <button type="button" onClick={openStart}>
        <ClipboardList size={20} aria-hidden="true" />
        Other routine
      </button>
      <button type="button" onClick={() => openCardio()}>
        <Bike size={20} aria-hidden="true" />
        Cardio
      </button>
      <button type="button" onClick={openCustom}>
        <Plus size={20} aria-hidden="true" />
        Custom workout
      </button>
    </div>
  );
}

function DoneEntry({ w }: { w: DoneWorkout }) {
  return (
    <>
      <div className="wt-tc-main">
        <div className="wt-tc-t">
          <h3>
            {w.title} <DoneChip />
          </h3>
          <small>{w.meta}</small>
        </div>
        <ViewLink id={w.id} title={w.title} />
      </div>
      <DoneRows rows={w.rows} />
    </>
  );
}

/**
 * Phone: the Today card. Ready leads with the routine that is due and a normal-size
 * Start. Done today is the same card with each finished workout, its XP and a View link.
 * The three tiles stay in both.
 */
export function TodayCard({ model }: { model: TodayModel }) {
  const start = useStartRoutine();

  if (model.kind === 'done') {
    return (
      <Card as="section" className="wt-tcard" aria-label="Today">
        <div className="wt-tc-h">
          <span className="wt-eyebrow ok">
            <Check size={14} aria-hidden="true" /> Done today
          </span>
          <span className="wt-wk ok">+{model.xp} XP</span>
        </div>
        {model.workouts.map((w, i) => (
          <div key={w.id} className="wt-tc-entry">
            {i > 0 && <div className="wt-tc-sep" />}
            <DoneEntry w={w} />
          </div>
        ))}
        <Tiles />
      </Card>
    );
  }

  const it = model.routine;
  const chip = it ? weekChip(it) : null;
  return (
    <Card as="section" className="wt-tcard" aria-label="Today">
      <div className="wt-tc-h">
        <span className="wt-eyebrow">Today&apos;s workout</span>
        {chip && <span className="wt-wk">{chip}</span>}
      </div>
      {it ? (
        <>
          <div className="wt-tc-main">
            <div className="wt-tc-t">
              <h3>{it.routine.title}</h3>
              <small>{routineLine(it.routine)}</small>
            </div>
            <Button aria-label={`Start ${it.routine.title}`} icon={<Play size={14} fill="currentColor" aria-hidden="true" />} onClick={() => start(it.routine.id)}>
              Start
            </Button>
          </div>
          <ExerciseRows items={it.routine.items} max={3} showMore={false} />
        </>
      ) : (
        <div className="wt-tc-empty">
          <h3>No routines yet</h3>
          <p>Build a routine, or start a custom workout and log as you go.</p>
          <ButtonLink href="/routine/new" variant="secondary" icon={<Plus size={18} aria-hidden="true" />}>
            Create routine
          </ButtonLink>
        </div>
      )}
      <Tiles />
    </Card>
  );
}
