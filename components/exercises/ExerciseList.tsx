'use client';

import { Check, Info, Plus, Replace } from 'lucide-react';
import type { ExerciseDef } from '@/data/exercises';
import { avoidReasons, exerciseSubtitle, filterExercises, groupExercises } from '@/lib/exerciseFilter';
import type { ExerciseFilters } from '@/lib/exerciseFilter';
import { availableEquipment } from '@/lib/routines';
import { useProgress } from '@/components/ProgressProvider';
import { cn } from '@/components/ui/cn';
import { Thumb } from '@/components/ui/Thumb';

/**
 * browse: tapping a row opens the exercise. pick: tapping toggles a selection
 * (the phone picker). add: a green plus adds it at once (the desktop panel).
 */
export type ExerciseListMode = 'browse' | 'pick' | 'add';

type ListProps = {
  /** The whole library in display order. */
  exercises: ExerciseDef[];
  filters: ExerciseFilters;
  onFiltersChange: (next: ExerciseFilters) => void;
  mode: ExerciseListMode;
  /** Exercises already in the routine or workout. They cannot be picked twice. */
  inList?: ReadonlySet<string>;
  /** "In routine" or "In workout". */
  inLabel?: string;
  /** Picked in this visit (pick mode). */
  selected?: readonly string[];
  /** The exercise shown in the detail panel (browse mode). */
  activeId?: string | null;
  /** A swap is being picked: the plus becomes a swap icon. */
  swap?: boolean;
  compact?: boolean;
  onPick?: (id: string) => void;
  onAdd?: (id: string) => void;
  onInfo: (id: string) => void;
  /** A tap on an exercise that is already in the list. */
  onDuplicate?: (id: string) => void;
};

/** How many exercises the current filters show, for the filter sheets' button. */
export function useVisibleCount(exercises: ExerciseDef[], filters: ExerciseFilters): number {
  const { prefs } = useProgress();
  return filterExercises(exercises, filters, prefs).list.length;
}

export function ExerciseList({ exercises, filters, onFiltersChange, mode, inList, inLabel, selected = [], activeId, swap, compact, onPick, onAdd, onInfo, onDuplicate }: ListProps) {
  const { prefs } = useProgress();
  const mine = availableEquipment(prefs);
  const { list, hidden } = filterExercises(exercises, filters, prefs);
  const groups = groupExercises(list, filters, mine);
  const reasons = avoidReasons(hidden, prefs);

  return (
    <div className={cn('wt-exlist', compact && 'compact')}>
      {groups.map((g) => (
        <section key={g.key} aria-label={g.title}>
          <h3 className="wt-grp">
            {g.title}
            <span>{g.exercises.length}</span>
          </h3>
          <div role="list" aria-label={g.title}>
            {g.exercises.map((e) => {
              const dup = mode !== 'browse' && Boolean(inList?.has(e.id));
              const dim = !mine.has(e.equipment);
              const sel = mode === 'pick' && selected.includes(e.id);
              const main = (
                <button
                  type="button"
                  className="wt-exrow-main"
                  aria-pressed={mode === 'pick' && !dup ? sel : undefined}
                  aria-current={mode === 'browse' && activeId === e.id ? 'true' : undefined}
                  onClick={() => {
                    if (dup) onDuplicate?.(e.id);
                    else if (mode === 'pick') onPick?.(e.id);
                    else onInfo(e.id);
                  }}
                >
                  <Thumb exercise={e} size={44} />
                  <span className="wt-exrow-t">
                    <b>{e.name}</b>
                    <small>{exerciseSubtitle(e, { needs: dim && !dup })}</small>
                  </span>
                  {dup && inLabel && (
                    <span className="wt-inl-tag">
                      <Check size={12} aria-hidden="true" />
                      {inLabel}
                    </span>
                  )}
                </button>
              );
              return (
                <div key={e.id} role="listitem" className={cn('wt-exrow', sel && 'sel', dim && !dup && 'dim', dup && 'inl', mode === 'browse' && activeId === e.id && 'sel')}>
                  {mode === 'add' &&
                    (dup ? (
                      <button type="button" className="wt-addbtn" disabled aria-label={`${e.name} is already added`}>
                        <Check size={16} aria-hidden="true" />
                      </button>
                    ) : (
                      <button type="button" className="wt-addbtn" aria-label={`${swap ? 'Swap in' : 'Add'} ${e.name}`} onClick={() => onAdd?.(e.id)}>
                        {swap ? <Replace size={18} aria-hidden="true" /> : <Plus size={18} aria-hidden="true" />}
                      </button>
                    ))}
                  {main}
                  {sel && (
                    <span className="wt-selmark" aria-hidden="true">
                      <Check size={14} />
                    </span>
                  )}
                  {mode !== 'browse' && (
                    <button type="button" className="wt-iconbtn" aria-label={`About ${e.name}`} onClick={() => onInfo(e.id)}>
                      <Info size={20} aria-hidden="true" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      ))}
      {groups.length === 0 && (
        <div className="wt-empty">
          <b>No matches</b>
          <span>Try another search, or remove a filter.</span>
        </div>
      )}
      {hidden.length > 0 && (
        <div className="wt-hiddenrow">
          <span>
            {hidden.length} hidden by your avoid list{reasons.length > 0 ? `: ${reasons.join(', ')}` : ''}.
          </span>
          <button type="button" className="wt-textbtn sm" onClick={() => onFiltersChange({ ...filters, showAvoided: true })}>
            Show
          </button>
        </div>
      )}
    </div>
  );
}
