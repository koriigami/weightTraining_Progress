'use client';

import { EllipsisVertical } from 'lucide-react';
import type { ExerciseDef } from '@/data/exercises';
import type { Units } from '@/lib/setColumns';
import type { SetPlan } from '@/lib/routines';
import type { SetPatch } from '@/lib/session';
import { Thumb } from '@/components/ui/Thumb';
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
};

/**
 * One exercise as it is edited in a routine or logged in a workout: the name
 * (opens the exercise), the three-dot menu, a notes line, the set table and
 * Add set. The editor and the log share it.
 */
export function ExerciseBlock({ mode, exercise, item, units, previous, onOpenExercise, onMenu, onNotes, onUpdateSet, onAddSet, onRemoveSet, onToggleSet }: ExerciseBlockProps) {
  return (
    <section className="wt-exblock" aria-label={exercise.name}>
      <div className="wt-eb-top">
        <Thumb exercise={exercise} size={40} />
        <button type="button" className="wt-eb-name" onClick={onOpenExercise}>
          {exercise.name}
        </button>
        <button type="button" className="wt-iconbtn" aria-label={`More for ${exercise.name}`} aria-haspopup="dialog" onClick={onMenu}>
          <EllipsisVertical size={20} aria-hidden="true" />
        </button>
      </div>
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
    </section>
  );
}
