'use client';

import { useCallback, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { History, Play, Plus } from 'lucide-react';
import { EXERCISES, exerciseById } from '@/data/exercises';
import type { Muscle } from '@/data/exercises';
import { emptyFilters } from '@/lib/exerciseFilter';
import { libraryOrder } from '@/lib/exerciseFilter';
import type { ExerciseFilters as Filters } from '@/lib/exerciseFilter';
import { useBackToClose } from '@/lib/useBackToClose';
import { useProgress } from '@/components/ProgressProvider';
import { Button } from '@/components/ui/Button';
import { PageHeader } from '@/components/ui/PageHeader';
import { useDialog } from '@/components/ui/useDialog';
import { CustomExerciseSheet } from './CustomExerciseSheet';
import { ExerciseInfoSheet } from './ExerciseDetail';
import { ExerciseFilters } from './ExerciseFilters';
import { ExerciseList, useVisibleCount } from './ExerciseList';

type PickerProps = {
  open: boolean;
  onClose: () => void;
  /** add: pick several and add them. replace: pick one to swap in. start: pick the exercises of a new custom workout. */
  mode: 'add' | 'replace' | 'start';
  /** "In routine" or "In workout". */
  inLabel: string;
  /** Used in "Push Up is already in Push A." */
  listName: string;
  /** Exercises already in the routine or workout. */
  inList: ReadonlySet<string>;
  /** Start with these muscles selected (a swap starts with the old exercise's muscle). */
  initialMuscles?: Muscle[];
  onAdd: (ids: string[]) => void;
  onReplace: (id: string) => void;
  /** start mode: called with the picked ids once the picker has closed. */
  onStart?: (ids: string[]) => void;
  /** start mode: the pinned button says "Log workout · N" instead of "Start workout · N". */
  log?: boolean;
};

const TITLES = { add: 'Add exercise', replace: 'Replace exercise', start: 'Custom workout' } as const;

function PickerBody({ mode, inLabel, listName, inList, initialMuscles, onAdd, onReplace, onStart, log, close, closeThen }: Omit<PickerProps, 'open' | 'onClose'> & { close: () => void; closeThen: (fn: () => void) => void }) {
  const { customExercises, lookup, showToast } = useProgress();
  const [filters, setFilters] = useState<Filters>(() => ({ ...emptyFilters(), muscles: initialMuscles ?? [] }));
  const [selected, setSelected] = useState<string[]>([]);
  const [infoId, setInfoId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const exercises = libraryOrder(EXERCISES, customExercises);
  const count = useVisibleCount(exercises, filters);
  const n = selected.length;

  function pick(id: string) {
    if (mode === 'replace') {
      onReplace(id);
      close();
      return;
    }
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  }

  return (
    <>
      <PageHeader
        title={TITLES[mode]}
        lead={
          <button type="button" className="wt-textbtn" onClick={close}>
            Cancel
          </button>
        }
        actions={
          <button type="button" className="wt-textbtn" onClick={() => setCreating(true)}>
            Create
          </button>
        }
      />
      <div className="wt-picker-top">
        <ExerciseFilters filters={filters} onChange={setFilters} resultCount={count} />
      </div>
      <div className="wt-picker-list">
        <ExerciseList
          exercises={exercises}
          filters={filters}
          onFiltersChange={setFilters}
          mode="pick"
          inList={inList}
          inLabel={inLabel}
          selected={selected}
          onPick={pick}
          onInfo={setInfoId}
          onDuplicate={(id) => showToast(`${exerciseById(id)?.name ?? lookup(id)?.name ?? 'That exercise'} is already in ${listName}.`)}
        />
      </div>
      {n > 0 && mode === 'add' && (
        <div className="wt-foot">
          <Button
            size="lg"
            icon={<Plus size={20} aria-hidden="true" />}
            onClick={() => {
              onAdd(selected);
              close();
            }}
          >
            Add {n} {n === 1 ? 'exercise' : 'exercises'}
          </Button>
        </div>
      )}
      {n > 0 && mode === 'start' && (
        <div className="wt-foot">
          <Button size="lg" icon={log ? <History size={20} aria-hidden="true" /> : <Play size={20} fill="currentColor" aria-hidden="true" />} onClick={() => closeThen(() => onStart?.(selected))}>
            {log ? 'Log workout' : 'Start workout'} · {n}
          </Button>
        </div>
      )}
      <ExerciseInfoSheet exercise={infoId ? lookup(infoId) ?? null : null} onClose={() => setInfoId(null)} />
      <CustomExerciseSheet open={creating} onClose={() => setCreating(false)} onCreated={(e) => mode !== 'replace' && setSelected((s) => [...s, e.id])} />
    </>
  );
}

/**
 * The full-screen exercise picker: search, filters, the list, and "Add N
 * exercises" (or, starting a custom workout, "Start workout · N", or "Log workout · N"
 * for one already done) pinned at the bottom once something is picked. Exercises
 * already in the routine or workout are marked and cannot be picked twice. Esc,
 * Cancel and the Back button close it.
 */
export function ExercisePicker(props: PickerProps) {
  const { open, onClose, ...body } = props;
  const ref = useRef<HTMLDivElement>(null);
  const pending = useRef<(() => void) | null>(null);
  const handleClose = useCallback(() => {
    onClose();
    const fn = pending.current;
    pending.current = null;
    fn?.();
  }, [onClose]);
  const requestClose = useBackToClose(open, handleClose);
  // Closes first, then runs fn once the history entry the picker pushed is gone (Start navigates).
  const closeThen = useCallback(
    (fn: () => void) => {
      pending.current = fn;
      requestClose();
    },
    [requestClose]
  );
  useDialog(open, ref, requestClose);
  if (!open || typeof document === 'undefined') return null;
  return createPortal(
    <div ref={ref} className="wt-picker" role="dialog" aria-modal="true" aria-label={TITLES[props.mode]} tabIndex={-1}>
      <PickerBody {...body} close={requestClose} closeThen={closeThen} />
    </div>,
    document.body
  );
}
