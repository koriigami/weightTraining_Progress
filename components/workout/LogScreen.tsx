'use client';

import { useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Dumbbell, Flag, Plus, Trash2 } from 'lucide-react';
import { fmtPreviousBest, previousBestSet } from '@/lib/exerciseHistory';
import { untickedSets } from '@/lib/finishSummary';
import { fillOnTick } from '@/lib/setColumns';
import type { SetPatch } from '@/lib/session';
import { useDesktopLayout, useWideLayout } from '@/lib/useMediaQuery';
import { useProgress } from '@/components/ProgressProvider';
import { useElapsed, useWorkoutSession } from '@/components/WorkoutSessionProvider';
import { ExerciseInfoSheet } from '@/components/exercises/ExerciseDetail';
import { ExercisePicker } from '@/components/exercises/ExercisePicker';
import { LibraryPanel } from '@/components/exercises/LibraryPanel';
import type { LibraryPanelHandle } from '@/components/exercises/LibraryPanel';
import { useShell } from '@/components/nav/ShellContext';
import { SummaryCard } from '@/components/routines/SummaryCard';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { PageHeader } from '@/components/ui/PageHeader';
import { Screen } from '@/components/ui/Screen';
import { DiscardDialog } from './DiscardDialog';
import { ExerciseBlock } from './ExerciseBlock';
import { ExerciseMenu } from './ExerciseMenu';
import { FinishDialog } from './FinishDialog';
import { WorkoutStats } from './WorkoutStats';

type PickerState = { mode: 'add' } | { mode: 'replace'; index: number } | null;

/**
 * Log workout, laid out like Hevy.
 * Phone: Finish in the top bar, the live stats under it, the exercises, then
 * Add exercise (full width, primary when the workout is empty) and a small
 * "Discard workout" below a dashed line. Nothing is pinned, so the sets get the
 * whole screen.
 * Desktop: a sticky header with Discard and Finish side by side, "+ Add exercise"
 * at the end of the list (it jumps to the library search in the side column),
 * and a Summary card above the library panel.
 */
export function LogScreen() {
  const router = useRouter();
  const { lookup, prefs, workouts, showToast } = useProgress();
  const ws = useWorkoutSession();
  const { openStart } = useShell();
  const desktop = useDesktopLayout();
  const wide = useWideLayout();
  const elapsed = useElapsed(ws.session?.startedAt);
  const panelRef = useRef<LibraryPanelHandle>(null);

  const [confirm, setConfirm] = useState<'finish' | 'discard' | null>(null);
  const [saving, setSaving] = useState(false);
  // True while leaving after Finish or Discard, so the screen does not flash "No workout in progress".
  const [leaving, setLeaving] = useState(false);
  const [menuIndex, setMenuIndex] = useState<number | null>(null);
  const [picker, setPicker] = useState<PickerState>(null);
  const [swapping, setSwapping] = useState<number | null>(null);
  const [infoId, setInfoId] = useState<string | null>(null);

  const session = ws.session;
  const items = session?.items;
  const units = prefs.units;

  // The best earlier set of each exercise in the workout, shown as "Previous".
  const previousBest = useMemo(() => {
    const out = new Map<string, ReturnType<typeof previousBestSet>>();
    for (const item of items ?? []) {
      const e = lookup(item.exerciseId);
      if (e) out.set(item.exerciseId, previousBestSet(workouts, item.exerciseId, e.metric));
    }
    return out;
  }, [items, workouts, lookup]);

  if (!ws.ready) return <Screen header={<PageHeader title="Log workout" back="/" />}>{null}</Screen>;

  if (!session && leaving) return <Screen header={<PageHeader title="Log workout" back="/" />}>{null}</Screen>;

  if (!session) {
    return (
      <Screen header={<PageHeader title="Workout" back="/" />}>
        <Card tone="dashed" className="text-center">
          <p style={{ margin: '0 0 12px' }}>
            <b>No workout in progress.</b>
          </p>
          <Button onClick={openStart}>Start a workout</Button>
        </Card>
      </Screen>
    );
  }

  const inList = new Set(session.items.map((i) => i.exerciseId));
  const listName = session.title.trim() || 'this workout';
  const empty = session.items.length === 0;
  const unticked = untickedSets(session.items, lookup);

  function leave() {
    if (typeof window !== 'undefined' && window.history.length > 1) router.back();
    else router.push('/');
  }

  function askFinish() {
    if (ws.counts.done === 0) showToast('Tick at least one set first.');
    else setConfirm('finish');
  }

  async function finish() {
    setSaving(true);
    setLeaving(true);
    const result = await ws.finish();
    setSaving(false);
    setConfirm(null);
    if (!result.ok) {
      setLeaving(false);
      showToast(result.error);
      return;
    }
    router.replace('/workout/done');
  }

  function discard() {
    setConfirm(null);
    setLeaving(true);
    ws.discard();
    router.replace('/');
    showToast('Workout discarded');
  }

  function addExercise() {
    if (wide) panelRef.current?.focusSearch();
    else setPicker({ mode: 'add' });
  }

  function addIds(ids: string[]) {
    for (const id of ids) {
      const error = ws.addExercise(id);
      if (error) showToast(error);
    }
  }

  function addFromPanel(id: string) {
    const name = lookup(id)?.name ?? 'the exercise';
    if (swapping !== null) {
      const error = ws.replaceExercise(swapping, id);
      if (error) showToast(error);
      else showToast(`Swapped in ${name}`);
      setSwapping(null);
      return;
    }
    const error = ws.addExercise(id);
    if (error) showToast(error);
    else showToast(`Added ${name}`);
  }

  function removeAt(index: number) {
    const name = lookup(session!.items[index]?.exerciseId ?? '')?.name ?? 'Exercise';
    const undo = ws.removeExercise(index);
    if (undo) showToast(`${name} removed`, 'Undo', undo);
  }

  function startReplace(index: number) {
    if (wide) {
      setSwapping(index);
      showToast(`Pick a swap for ${lookup(session!.items[index].exerciseId)?.name ?? 'the exercise'} in the library.`);
    } else {
      setPicker({ mode: 'replace', index });
    }
  }

  // Ticking a set with empty boxes fills them in first, then the tick pops "+5 XP".
  function tick(i: number, j: number) {
    const item = session!.items[i];
    const set = item?.sets[j];
    const e = item ? lookup(item.exerciseId) : undefined;
    if (item && set && !set.done && e) {
      const fill = fillOnTick(e.metric, set, previousBest.get(item.exerciseId) ?? null);
      if (fill) ws.updateSet(i, j, fill);
    }
    return ws.toggleSet(i, j);
  }

  const menuItem = menuIndex !== null ? session.items[menuIndex] : undefined;
  const menuEx = menuItem ? lookup(menuItem.exerciseId) : undefined;
  const replaceItem = picker?.mode === 'replace' ? session.items[picker.index] : undefined;
  const replaceEx = replaceItem ? lookup(replaceItem.exerciseId) : undefined;
  const swapItem = swapping !== null ? session.items[swapping] : undefined;
  const swapEx = swapItem ? lookup(swapItem.exerciseId) : undefined;

  const stats = <WorkoutStats elapsed={elapsed} volumeKg={ws.totals.volume} sets={ws.totals.sets} xp={ws.totals.xp} weight={units.weight} />;

  const blocks = session.items.map((item, i) => {
    const e = lookup(item.exerciseId);
    if (!e) return null;
    return (
      <ExerciseBlock
        key={item.exerciseId}
        mode="log"
        exercise={e}
        item={item}
        units={units}
        previous={fmtPreviousBest(e.metric, previousBest.get(item.exerciseId) ?? null, units)}
        onOpenExercise={() => setInfoId(e.id)}
        onMenu={() => setMenuIndex(i)}
        onNotes={(text) => ws.setItemNotes(i, text)}
        onUpdateSet={(j, patch: SetPatch) => ws.updateSet(i, j, patch)}
        onAddSet={() => {
          const error = ws.addSet(i);
          if (error) showToast(error);
        }}
        onRemoveSet={(j) => {
          const error = ws.removeSet(i, j);
          if (error) showToast(error);
        }}
        onToggleSet={(j) => tick(i, j)}
      />
    );
  });

  const header = desktop ? (
    <PageHeader
      title={session.title || 'Workout'}
      back
      onBack={leave}
      backLabel="Minimize workout"
      narrow={!wide}
      actions={
        <>
          <Button size="sm" variant="soft-destructive" icon={<Trash2 size={16} aria-hidden="true" />} onClick={() => setConfirm('discard')}>
            Discard
          </Button>
          <Button size="sm" icon={<Flag size={16} aria-hidden="true" />} onClick={askFinish}>
            Finish
          </Button>
        </>
      }
      sub={wide ? undefined : stats}
    />
  ) : (
    <PageHeader
      title="Log workout"
      back
      onBack={leave}
      backLabel="Minimize workout"
      backIcon="down"
      actions={
        <Button size="sm" onClick={askFinish}>
          Finish
        </Button>
      }
      sub={stats}
    />
  );

  const addButton = (
    <Button variant={empty ? 'primary' : 'secondary'} size="lg" block icon={<Plus size={20} aria-hidden="true" />} onClick={addExercise}>
      Add exercise
    </Button>
  );

  return (
    <Screen
      header={header}
      narrow={!wide}
      aside={
        wide ? (
          <>
            <SummaryCard items={session.items}>
              <WorkoutStats elapsed={elapsed} volumeKg={ws.totals.volume} sets={ws.totals.sets} xp={ws.totals.xp} weight={units.weight} side />
            </SummaryCard>
            <LibraryPanel
              ref={panelRef}
              inLabel="In workout"
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
      {!desktop && (
        <input className="wt-log-title" aria-label="Workout title" maxLength={80} value={session.title} onChange={(e) => ws.setTitle(e.target.value)} />
      )}

      {blocks.some(Boolean) ? (
        blocks
      ) : (
        <div className="wt-empty">
          <Dumbbell size={40} aria-hidden="true" />
          <b>Get started</b>
          <span>{wide ? 'Add an exercise from the library on the right.' : 'Add an exercise to start your workout.'}</span>
        </div>
      )}

      <div className="wt-log-end">
        {addButton}
        {!desktop && (
          <div className="wt-danger-zone">
            <Button variant="soft-destructive" size="sm" icon={<Trash2 size={16} aria-hidden="true" />} onClick={() => setConfirm('discard')}>
              Discard workout
            </Button>
          </div>
        )}
      </div>

      <ExerciseMenu
        open={menuIndex !== null && Boolean(menuEx)}
        onClose={() => setMenuIndex(null)}
        name={menuEx?.name ?? ''}
        index={menuIndex ?? 0}
        count={session.items.length}
        onMoveUp={() => menuIndex !== null && ws.moveExercise(menuIndex, -1)}
        onMoveDown={() => menuIndex !== null && ws.moveExercise(menuIndex, 1)}
        onReplace={() => menuIndex !== null && startReplace(menuIndex)}
        onRemove={() => menuIndex !== null && removeAt(menuIndex)}
      />

      <ExercisePicker
        open={picker !== null}
        onClose={() => setPicker(null)}
        mode={picker?.mode ?? 'add'}
        inLabel="In workout"
        listName={listName}
        inList={inList}
        initialMuscles={replaceEx ? [replaceEx.primary] : undefined}
        onAdd={addIds}
        onReplace={(id) => {
          if (picker?.mode !== 'replace') return;
          const error = ws.replaceExercise(picker.index, id);
          if (error) showToast(error);
        }}
      />

      <ExerciseInfoSheet exercise={infoId ? lookup(infoId) ?? null : null} onClose={() => setInfoId(null)} />

      <DiscardDialog open={confirm === 'discard'} tickedSets={ws.counts.done} xp={ws.totals.xp} onKeepGoing={() => setConfirm(null)} onDiscard={discard} />
      <FinishDialog open={confirm === 'finish'} unticked={unticked} saving={saving} onKeepLogging={() => setConfirm(null)} onFinish={() => void finish()} />
    </Screen>
  );
}
