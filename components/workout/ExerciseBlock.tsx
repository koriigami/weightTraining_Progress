'use client';

import { ArrowUp, Crown, EllipsisVertical } from 'lucide-react';
import type { ExerciseDef } from '@/data/exercises';
import type { Units } from '@/lib/setColumns';
import type { SetPlan } from '@/lib/routines';
import type { SetPatch } from '@/lib/session';
import { Thumb } from '@/components/ui/Thumb';
import type { LiveMark } from '@/lib/workoutScoring';
import { CardioFields, CardioPill } from './CardioCard';
import { SetTable } from './SetTable';

export type BlockItem = { exerciseId: string; notes?: string; sets: (SetPlan & { done?: boolean })[] };

export type ExerciseBlockProps = {
  mode: 'editor' | 'log';
  exercise: ExerciseDef;
  item: BlockItem;
  units: Units;
  previous: string;
  onOpenExercise: () => void;
  onMenu: () => void;
  onNotes: (notes: string) => void;
  onUpdateSet: (setIndex: number, patch: SetPatch) => void;
  onAddSet: () => void;
  onRemoveSet: (setIndex: number) => void;
  onToggleSet?: (setIndex: number) => { done: boolean; xp: number } | null;
  /** Log only: the live "Beat last time" or "Record" chip. */
  mark?: LiveMark;
  /** Log only, distance cardio with one set: shows the roomy cardio card instead of the set table. */
  cardio?: { follow: boolean; onChange: (patch: SetPatch) => void };
};

/** The gold Record or green Beat last time chip, with its XP. */
export function MarkChip({ mark }: { mark: Pick<LiveMark, 'kind' | 'xp'> }) {
  return mark.kind === 'record' ? (
    <span className="wt-mk rec" data-testid="mark-chip">
      <Crown size={14} aria-hidden="true" />
      Record +{mark.xp}
    </span>
  ) : (
    <span className="wt-mk" data-testid="mark-chip">
      <ArrowUp size={14} aria-hidden="true" />
      Beat last time +{mark.xp}
    </span>
  );
}

/**
 * One exercise as it is edited in a routine or logged in a workout: the name
 * (opens the exercise), the three-dot menu, a notes line, the set table and
 * Add set. The editor and the log share it.
 */
export function ExerciseBlock({ mode, exercise, item, units, previous, onOpenExercise, onMenu, onNotes, onUpdateSet, onAddSet, onRemoveSet, onToggleSet, mark, cardio }: ExerciseBlockProps) {
  const card = mode === 'log' && cardio && item.sets.length === 1 ? cardio : null;
  return (
    <section className="wt-exblock" aria-label={exercise.name}>
      <div className="wt-eb-top">
        <Thumb exercise={exercise} size={40} />
        <button type="button" className="wt-eb-name" onClick={onOpenExercise}>
          {exercise.name}
        </button>
        {card && <CardioPill set={item.sets[0]} onToggle={() => onToggleSet?.(0)} />}
        <button type="button" className="wt-iconbtn" aria-label={`More for ${exercise.name}`} aria-haspopup="dialog" onClick={onMenu}>
          <EllipsisVertical size={20} aria-hidden="true" />
        </button>
      </div>
      {card ? (
        <>
          <CardioFields exercise={exercise} set={item.sets[0]} units={units} follow={card.follow} previous={previous} onChange={card.onChange} />
          {mark && <MarkChip mark={mark} />}
        </>
      ) : (
        <>
          {mark && <MarkChip mark={mark} />}
          <input className="wt-notes-in" placeholder="Add notes here" aria-label={`Notes for ${exercise.name}`} maxLength={300} value={item.notes ?? ''} onChange={(e) => onNotes(e.target.value)} />
          <SetTable
            mode={mode}
            exercise={exercise}
            sets={item.sets}
            units={units}
            previous={previous}
            onUpdate={onUpdateSet}
            onRemove={onRemoveSet}
            onAdd={onAddSet}
            onToggle={onToggleSet}
          />
        </>
      )}
    </section>
  );
}
