'use client';

import { Check, Clock } from 'lucide-react';
import { useId, useState } from 'react';
import type { ExerciseDef } from '@/data/exercises';
import { Button } from '@/components/ui/Button';
import { lapDistanceChoices, lapTotals } from '@/lib/laps';
import { cardioRate } from '@/lib/liveStats';
import { LIMITS } from '@/lib/routines';
import type { Lap, SetPlan } from '@/lib/routines';
import { setColumns } from '@/lib/setColumns';
import type { Units } from '@/lib/setColumns';
import type { LapPatch, SetPatch } from '@/lib/session';
import { LapTable } from './LapTable';
import { NumberCell } from './SetTable';

/** The state pill: Logged once there is a Time, a tap-to-log button when a planned Time is filled in but not logged, else "Add a time". */
export function CardioPill({ set, onToggle }: { set: SetPlan & { done?: boolean }; onToggle?: () => void }) {
  const logged = Boolean(set.done) && (set.min ?? 0) > 0;
  if (logged) {
    return (
      <span className="wt-cc-pill">
        <Check size={13} aria-hidden="true" />
        Logged
      </span>
    );
  }
  if ((set.min ?? 0) > 0 && onToggle) {
    return (
      <button type="button" className="wt-cc-pill no" onClick={onToggle}>
        Mark logged
      </button>
    );
  }
  return <span className="wt-cc-pill no">Add a time</span>;
}

/** What the cardio card needs to show and change laps. */
export type CardioLapControls = {
  onUpdate: (lapIndex: number, patch: LapPatch) => void;
  onRemove: (lapIndex: number) => void;
  /** Live log: tap on Lap, with the chosen lap distance in km. The Lap button, the distance chips and the running row show while Time follows the clock. */
  onStamp?: (km?: number) => void;
  /** Live log: seconds since Start, so the running lap's time ticks. */
  elapsedSec?: number;
  /** Edit workout: shows "+ Add lap" under the table. */
  onAdd?: () => void;
};

/**
 * A distance exercise in the log as a roomy card instead of a set table: Time and
 * Distance as big fields, the live Speed (a ride) or Pace (a run or walk) under
 * them, and a hint while Time still follows the clock. Time above zero counts as done.
 * Laps sit under that: a Lap button with its distance chips and the running lap
 * while Time follows the clock, and the stamped laps as an editable table.
 */
export function CardioFields({ exercise, set, units, follow, previous, onChange, laps }: { exercise: ExerciseDef; set: SetPlan & { done?: boolean; laps?: Lap[] }; units: Units; follow: boolean; previous: string; onChange: (patch: SetPatch) => void; laps?: CardioLapControls }) {
  const uid = useId();
  const [time, dist] = setColumns('distance_time', units);
  const rate = cardioRate(exercise.cardioKind, set.min, set.km, units.distance);
  const choices = lapDistanceChoices(units.distance);
  // The chosen lap distance is not stored: a reload goes back to No distance, and laps already stamped keep theirs.
  const [pick, setPick] = useState(0);
  const choice = choices[pick] ?? choices[0];
  const stamped = set.laps ?? [];
  const live = follow && Boolean(laps?.onStamp);
  const atCap = stamped.length >= LIMITS.lapsPerSet;
  const running = live ? { sec: Math.max(0, Math.floor((laps?.elapsedSec ?? 0) - lapTotals(stamped).sec)), km: choice.km } : undefined;
  return (
    <>
      <div className="wt-bigf">
        <div className="wt-bf">
          <label htmlFor={`${uid}-min`}>Time</label>
          <div className="in">
            <NumberCell id={`${uid}-min`} className="wt-bigin" column={time} set={set} units={units} label="Time (min)" onCommit={onChange} />
            <span className="u">min</span>
          </div>
        </div>
        <div className="wt-bf">
          <label htmlFor={`${uid}-km`}>Distance</label>
          <div className="in">
            <NumberCell id={`${uid}-km`} className="wt-bigin" column={dist} set={set} units={units} label={`Distance (${units.distance})`} onCommit={onChange} />
            <span className="u">{units.distance}</span>
          </div>
        </div>
      </div>
      <div className="wt-cc-meta">
        <span>{rate.label}</span>
        <b data-testid="cardio-rate">{rate.value || '-'}</b>
      </div>
      {previous !== 'New' && (
        <div className="wt-cc-meta">
          <span>Last time</span>
          <span>{previous}</span>
        </div>
      )}
      {follow && (
        <div className="wt-cc-note">
          <Clock size={16} aria-hidden="true" />
          Time follows the clock until you type in it.
        </div>
      )}
      {live && (
        <>
          <div className="wt-lapchips" role="group" aria-label="Distance of each lap">
            <span>Each lap:</span>
            {choices.map((c, i) => (
              <button key={c.label} type="button" className="wt-chip" aria-pressed={i === pick} onClick={() => setPick(i)}>
                {c.label}
              </button>
            ))}
          </div>
          <Button block disabled={atCap} onClick={() => laps?.onStamp?.(choice.km)}>
            Lap
          </Button>
        </>
      )}
      {laps && (stamped.length > 0 || running) && (
        <LapTable laps={stamped} units={units} kind={exercise.cardioKind} running={running} onUpdate={laps.onUpdate} onRemove={laps.onRemove} />
      )}
      {laps?.onAdd && !live && (
        <button type="button" className="wt-textbtn wt-addlap" disabled={atCap} onClick={laps.onAdd}>
          + Add lap
        </button>
      )}
    </>
  );
}
