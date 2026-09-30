'use client';

import { Check, Clock } from 'lucide-react';
import { useId } from 'react';
import type { ExerciseDef } from '@/data/exercises';
import { cardioRate } from '@/lib/liveStats';
import type { SetPlan } from '@/lib/routines';
import { setColumns } from '@/lib/setColumns';
import type { Units } from '@/lib/setColumns';
import type { SetPatch } from '@/lib/session';
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

/**
 * A distance exercise in the log as a roomy card instead of a set table: Time and
 * Distance as big fields, the live Speed (a ride) or Pace (a run or walk) under
 * them, and a hint while Time still follows the clock. Time above zero counts as done.
 */
export function CardioFields({ exercise, set, units, follow, previous, onChange }: { exercise: ExerciseDef; set: SetPlan & { done?: boolean }; units: Units; follow: boolean; previous: string; onChange: (patch: SetPatch) => void }) {
  const uid = useId();
  const [time, dist] = setColumns('distance_time', units);
  const rate = cardioRate(exercise.cardioKind, set.min, set.km, units.distance);
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
    </>
  );
}
