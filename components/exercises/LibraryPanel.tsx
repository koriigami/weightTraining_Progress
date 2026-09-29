'use client';

import { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import { Plus } from 'lucide-react';
import { EXERCISES } from '@/data/exercises';
import type { Muscle } from '@/data/exercises';
import { emptyFilters, libraryOrder } from '@/lib/exerciseFilter';
import type { ExerciseFilters as Filters } from '@/lib/exerciseFilter';
import { useProgress } from '@/components/ProgressProvider';
import { CustomExerciseSheet } from './CustomExerciseSheet';
import { ExerciseInfoSheet } from './ExerciseDetail';
import { ExerciseFilters } from './ExerciseFilters';
import { ExerciseList, useVisibleCount } from './ExerciseList';

export type LibraryPanelHandle = {
  /** Focuses the search box and pulses the panel. */
  focusSearch: () => void;
};

type PanelProps = {
  /** "In routine" or "In workout". */
  inLabel: string;
  listName: string;
  inList: ReadonlySet<string>;
  /** Set while a swap is being picked: the panel says "Pick a swap" and has Cancel. */
  swapping?: { name: string; muscle: Muscle } | null;
  onCancelSwap?: () => void;
  onAdd: (id: string) => void;
};

/**
 * The desktop library in the side column: search, filters and the list with a
 * green plus on every row. Exercises already in the routine or workout are
 * marked and their plus is disabled.
 */
export const LibraryPanel = forwardRef<LibraryPanelHandle, PanelProps>(function LibraryPanel({ inLabel, listName, inList, swapping, onCancelSwap, onAdd }, handle) {
  const { customExercises, lookup, showToast } = useProgress();
  const [filters, setFilters] = useState<Filters>(emptyFilters);
  const [infoId, setInfoId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const exercises = libraryOrder(EXERCISES, customExercises);
  const count = useVisibleCount(exercises, filters);

  useImperativeHandle(handle, () => ({
    focusSearch() {
      searchRef.current?.focus();
      searchRef.current?.select();
      const panel = panelRef.current;
      if (!panel) return;
      panel.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      // Restart the pulse even if it is still running.
      panel.classList.remove('wt-lib-pulse');
      void panel.offsetWidth;
      panel.classList.add('wt-lib-pulse');
    },
  }));

  // A swap starts on the old exercise's muscle, like the phone picker.
  const swapMuscle = swapping?.muscle;
  const [lastSwap, setLastSwap] = useState<Muscle | undefined>(undefined);
  if (swapMuscle !== lastSwap) {
    setLastSwap(swapMuscle);
    setFilters(swapMuscle ? { ...emptyFilters(), muscles: [swapMuscle] } : emptyFilters());
  }

  return (
    <div ref={panelRef} className="wt-card wt-libpanel" onAnimationEnd={(e) => e.target === e.currentTarget && e.currentTarget.classList.remove('wt-lib-pulse')} role="region" aria-label={swapping ? 'Pick a swap' : 'Add exercises'}>
      <div className="wt-lp-top">
        <div className="wt-cardhead" style={{ margin: 0 }}>
          <h2 className="gt wt-lp-title">{swapping ? 'Pick a swap' : 'Add exercises'}</h2>
          {swapping ? (
            <button type="button" className="wt-textbtn sm" onClick={onCancelSwap}>
              Cancel
            </button>
          ) : (
            <button type="button" className="wt-textbtn sm" onClick={() => setCreating(true)}>
              <Plus size={16} aria-hidden="true" /> Custom
            </button>
          )}
        </div>
        {swapping && <p style={{ margin: 0, color: 'var(--muted)', fontSize: 14 }}>Pick a swap for {swapping.name}. It keeps the number of sets.</p>}
        <ExerciseFilters ref={searchRef} filters={filters} onChange={setFilters} resultCount={count} searchLabel="Search exercise in the library" />
      </div>
      <div className="wt-lp-list">
        <ExerciseList
          exercises={exercises}
          filters={filters}
          onFiltersChange={setFilters}
          mode="add"
          compact
          swap={Boolean(swapping)}
          inList={inList}
          inLabel={inLabel}
          onAdd={onAdd}
          onInfo={setInfoId}
          onDuplicate={(id) => showToast(`${lookup(id)?.name ?? 'That exercise'} is already in ${listName}.`)}
        />
      </div>
      <ExerciseInfoSheet exercise={infoId ? lookup(infoId) ?? null : null} onClose={() => setInfoId(null)} />
      <CustomExerciseSheet open={creating} onClose={() => setCreating(false)} />
    </div>
  );
});
