'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Dumbbell, Plus, Trash2 } from 'lucide-react';
import type { ExerciseDef } from '@/data/exercises';
import * as D from '@/lib/routineDraft';
import type { DraftResult, ItemRemoval } from '@/lib/routineDraft';
import type { Routine } from '@/lib/routines';
import { useDesktopLayout, useWideLayout } from '@/lib/useMediaQuery';
import { useProgress } from '@/components/ProgressProvider';
import { ExerciseInfoSheet } from '@/components/exercises/ExerciseDetail';
import { ExercisePicker } from '@/components/exercises/ExercisePicker';
import { LibraryPanel } from '@/components/exercises/LibraryPanel';
import type { LibraryPanelHandle } from '@/components/exercises/LibraryPanel';
import { ExerciseBlock } from '@/components/workout/ExerciseBlock';
import { ExerciseMenu } from '@/components/workout/ExerciseMenu';
import { Button, ButtonLink } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { GameModal } from '@/components/ui/GameModal';
import { PageHeader } from '@/components/ui/PageHeader';
import { Screen } from '@/components/ui/Screen';
import { Segmented } from '@/components/ui/Segmented';
import { SummaryCard } from './SummaryCard';

type PickerState = { mode: 'add' } | { mode: 'replace'; index: number } | null;

const FREQ = ['any', '1', '2', '3'];

/**
 * The routine editor, for a new routine (/routine/new) and a saved one
 * (/routine/[id]). It edits a copy, so Cancel never loses a saved routine.
 * Phone: Save in the top bar, Add exercise pinned at the bottom and a
 * full-screen picker. Desktop: the library panel and a Summary card in the
 * side column, and "+ Add exercise" jumps to the library search.
 */
export function RoutineEditor({ routineId }: { routineId?: string }) {
  const router = useRouter();
  const { routines, lookup, prefs, saveRoutine, deleteRoutine, showToast } = useProgress();
  const desktop = useDesktopLayout();
  const wide = useWideLayout();

  const saved = routineId ? routines.find((r) => r.id === routineId) : undefined;
  const [draft, setDraftState] = useState<Routine | null>(() => (saved ? D.draftFrom(saved) : routineId ? null : D.blankRoutine(D.newRoutineId())));
  const draftRef = useRef(draft);
  const [menuIndex, setMenuIndex] = useState<number | null>(null);
  const [picker, setPicker] = useState<PickerState>(null);
  const [swapping, setSwapping] = useState<number | null>(null);
  const [infoId, setInfoId] = useState<string | null>(null);
  const [askDelete, setAskDelete] = useState(false);
  const [busy, setBusy] = useState<'save' | 'delete' | null>(null);
  const titleRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<LibraryPanelHandle>(null);

  function setDraft(next: Routine) {
    draftRef.current = next;
    setDraftState(next);
  }

  // Applies the result of an edit, or says why it was refused.
  function apply(result: DraftResult): boolean {
    if (!result.ok) {
      showToast(result.error);
      return false;
    }
    setDraft(result.routine);
    return true;
  }

  if (!draft) {
    return (
      <Screen header={<PageHeader title="Routine" back="/routines" narrow />} narrow>
        <Card tone="dashed" className="text-center">
          <p style={{ margin: '0 0 12px' }}>
            <b>This routine is gone, or it has not loaded yet.</b>
          </p>
          <ButtonLink href="/routines" variant="secondary">
            Back to routines
          </ButtonLink>
        </Card>
      </Screen>
    );
  }

  const isNew = !saved;
  const heading = isNew ? 'Create routine' : 'Edit routine';
  const inList = new Set(draft.items.map((i) => i.exerciseId));
  const listName = draft.title.trim() || 'this routine';

  const cur = () => draftRef.current as Routine;

  function leave() {
    if (typeof window !== 'undefined' && window.history.length > 1) router.back();
    else router.push('/routines');
  }

  async function save() {
    const d = cur();
    const error = D.validateRoutine(d, lookup);
    if (error) {
      showToast(error);
      if (!d.title.trim()) titleRef.current?.focus();
      return;
    }
    setBusy('save');
    const failed = await saveRoutine({ ...d, title: d.title.trim() });
    setBusy(null);
    if (failed) {
      showToast(failed);
      return;
    }
    router.replace('/routines');
    showToast('Routine saved');
  }

  async function remove() {
    if (!saved) return;
    setBusy('delete');
    const failed = await deleteRoutine(saved.id);
    if (failed) {
      setBusy(null);
      setAskDelete(false);
      showToast(failed);
      return;
    }
    setAskDelete(false);
    router.replace('/routines');
    showToast(`${saved.title} deleted`);
  }

  function addFromPicker(ids: string[]) {
    const r = D.addExercises(cur(), ids, lookup);
    setDraft(r.routine);
    if (r.error) showToast(r.error);
  }

  function addFromPanel(id: string) {
    if (swapping !== null) {
      if (apply(D.replaceItem(cur(), swapping, id, lookup))) showToast(`Swapped in ${lookup(id)?.name ?? 'the exercise'}`);
      setSwapping(null);
      return;
    }
    if (apply(D.addExercise(cur(), id, lookup))) showToast(`Added ${lookup(id)?.name ?? 'the exercise'}`);
  }

  function removeAt(index: number) {
    const removal: ItemRemoval | null = D.removeItem(cur(), index);
    if (!removal) return;
    const name = lookup(removal.removed.exerciseId)?.name ?? 'Exercise';
    setDraft(removal.routine);
    showToast(`${name} removed`, 'Undo', () => setDraft(D.restoreItem(cur(), removal.removed, removal.index)));
  }

  function startReplace(index: number) {
    if (wide) {
      setSwapping(index);
      showToast(`Pick a swap for ${lookup(cur().items[index].exerciseId)?.name ?? 'the exercise'} in the library.`);
    } else {
      setPicker({ mode: 'replace', index });
    }
  }

  function addExercise() {
    if (wide) panelRef.current?.focusSearch();
    else setPicker({ mode: 'add' });
  }

  const times = draft.timesPerWeek;
  const freqOptions = [...FREQ, ...(times !== undefined && times > 3 ? [String(times)] : [])];
  const menuItem = menuIndex !== null ? draft.items[menuIndex] : undefined;
  const menuEx = menuItem ? lookup(menuItem.exerciseId) : undefined;
  const replaceItem = picker?.mode === 'replace' ? draft.items[picker.index] : undefined;
  const swapItem = swapping !== null ? draft.items[swapping] : undefined;
  const swapEx = swapItem ? lookup(swapItem.exerciseId) : undefined;

  const units = prefs.units;
  const blocks = draft.items.map((item, i) => {
    const e = lookup(item.exerciseId);
    if (!e) return null;
    return (
      <ExerciseBlock
        key={item.exerciseId}
        mode="editor"
        exercise={e}
        item={item}
        units={units}
        previous=""
        onOpenExercise={() => setInfoId(e.id)}
        onMenu={() => setMenuIndex(i)}
        onNotes={(text) => setDraft(D.setItemNotes(cur(), i, text))}
        onUpdateSet={(j, patch) => setDraft(D.updateSet(cur(), i, j, patch))}
        onAddSet={() => apply(D.addSet(cur(), i, lookup))}
        onRemoveSet={(j) => apply(D.removeSet(cur(), i, j))}
      />
    );
  });

  const saveButton = (
    <Button size="sm" loading={busy === 'save'} onClick={() => void save()}>
      <span className="md:hidden">Save</span>
      <span className="hidden md:inline">Save routine</span>
    </Button>
  );

  const header = desktop ? (
    <PageHeader title={heading} back onBack={leave} backLabel="Cancel" narrow={!wide} actions={saveButton} />
  ) : (
    <PageHeader
      title={heading}
      lead={
        <button type="button" className="wt-textbtn" onClick={leave}>
          Cancel
        </button>
      }
      actions={saveButton}
    />
  );

  return (
    <Screen
      header={header}
      narrow={!wide}
      footer={
        desktop ? undefined : (
          <Button size="lg" icon={<Plus size={20} aria-hidden="true" />} onClick={addExercise}>
            Add exercise
          </Button>
        )
      }
      aside={
        wide ? (
          <>
            <SummaryCard items={draft.items} />
            <LibraryPanel
              ref={panelRef}
              inLabel="In routine"
              listName={listName}
              inList={inList}
              swapping={swapEx && swapItem ? { name: swapEx.name, muscle: swapEx.primary } : null}
              onCancelSwap={() => setSwapping(null)}
              onAdd={addFromPanel}
            />
          </>
        ) : undefined
      }
    >
      <Card>
        <input ref={titleRef} className="wt-title-in" aria-label="Routine title" placeholder="Routine title" maxLength={60} value={draft.title} onChange={(e) => setDraft(D.setTitle(cur(), e.target.value))} />
        <div className="wt-freq">
          <div>
            <b id="freq-label">How often?</b>
            <small>Times per week. No fixed days.</small>
          </div>
          <Segmented
            size="sm"
            ariaLabel="Times per week"
            value={times === undefined ? 'any' : String(times)}
            options={freqOptions.map((v) => ({ value: v, label: v === 'any' ? 'Any' : `${v}×`, ariaLabel: v === 'any' ? 'Any number of times a week' : `${v} times a week` }))}
            onChange={(v) => setDraft(D.setTimesPerWeek(cur(), v === 'any' ? undefined : Number(v)))}
          />
        </div>
      </Card>

      {blocks.some(Boolean) ? (
        blocks
      ) : (
        <div className="wt-empty">
          <Dumbbell size={40} aria-hidden="true" />
          <b>No exercises yet</b>
          <span>{wide ? 'Add exercises from the library on the right.' : 'Add exercises from the library.'}</span>
        </div>
      )}

      {desktop && (
        <Button variant="secondary" size="lg" block icon={<Plus size={20} aria-hidden="true" />} onClick={addExercise}>
          Add exercise
        </Button>
      )}

      {!isNew && (
        <div className="wt-danger-zone">
          <Button variant="soft-destructive" size="sm" icon={<Trash2 size={16} aria-hidden="true" />} onClick={() => setAskDelete(true)}>
            Delete routine
          </Button>
        </div>
      )}

      <ExerciseMenu
        open={menuIndex !== null && Boolean(menuEx)}
        onClose={() => setMenuIndex(null)}
        name={menuEx?.name ?? ''}
        index={menuIndex ?? 0}
        count={draft.items.length}
        onMoveUp={() => menuIndex !== null && setDraft(D.moveItem(cur(), menuIndex, -1))}
        onMoveDown={() => menuIndex !== null && setDraft(D.moveItem(cur(), menuIndex, 1))}
        onReplace={() => menuIndex !== null && startReplace(menuIndex)}
        onRemove={() => menuIndex !== null && removeAt(menuIndex)}
      />

      <ExercisePicker
        open={picker !== null}
        onClose={() => setPicker(null)}
        mode={picker?.mode ?? 'add'}
        inLabel="In routine"
        listName={listName}
        inList={inList}
        initialMuscles={replaceItem ? mainMuscle(lookup(replaceItem.exerciseId)) : undefined}
        onAdd={addFromPicker}
        onReplace={(id) => picker?.mode === 'replace' && apply(D.replaceItem(cur(), picker.index, id, lookup))}
      />

      <ExerciseInfoSheet exercise={infoId ? lookup(infoId) ?? null : null} onClose={() => setInfoId(null)} />

      <GameModal
        open={askDelete}
        strict
        tone="red"
        icon={<Trash2 size={30} aria-hidden="true" />}
        title="Delete routine?"
        cancelLabel="Cancel"
        confirmLabel="Delete"
        confirmLoading={busy === 'delete'}
        onCancel={() => setAskDelete(false)}
        onConfirm={() => void remove()}
      >
        {`"${saved?.title ?? draft.title}" leaves My routines. Workouts you have logged with it stay in your history.`}
      </GameModal>
    </Screen>
  );
}

function mainMuscle(e: ExerciseDef | undefined) {
  return e ? [e.primary] : undefined;
}
