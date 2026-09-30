'use client';

import { useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Calendar, ChevronRight, Clock, Dumbbell, Info, Minus, Plus, Trash2 } from 'lucide-react';
import { formatDay, formatWhen } from '@/lib/date';
import { deleteSentence, deletedToast, editedToast } from '@/lib/history';
import { fmtPreviousBest, previousBestSet } from '@/lib/exerciseHistory';
import { fillOnTick } from '@/lib/setColumns';
import { DURATION_STEP_MIN, buildWorkoutPatch, durationMinutes, sessionFromWorkout, stepDuration } from '@/lib/session';
import type { Session, SessionResult, SetPatch } from '@/lib/session';
import * as S from '@/lib/session';
import { setXp } from '@/lib/routines';
import type { WorkoutLog } from '@/lib/routines';
import { liveMarks, maxWorkoutDate } from '@/lib/workoutScoring';
import { useToday } from '@/lib/useToday';
import { useProgress } from '@/components/ProgressProvider';
import { ExerciseInfoSheet } from '@/components/exercises/ExerciseDetail';
import { ExercisePicker } from '@/components/exercises/ExercisePicker';
import { Button } from '@/components/ui/Button';
import { Card, CardHead } from '@/components/ui/Card';
import { DateTimeModal } from '@/components/ui/DatePicker';
import { Textarea } from '@/components/ui/Field';
import { PageHeader } from '@/components/ui/PageHeader';
import { Screen } from '@/components/ui/Screen';
import { DeleteWorkoutDialog } from './DeleteWorkoutDialog';
import { ExerciseBlock } from './ExerciseBlock';
import { ExerciseMenu } from './ExerciseMenu';
import { WorkoutNotFound } from './WorkoutNotFound';
import { useLeave } from './WorkoutView';

type PickerState = { mode: 'add' } | { mode: 'replace'; index: number } | null;

/** /workout/edit?id=. Waits for the workout to load, then hands it to the form. */
export function EditWorkout() {
  const id = useSearchParams().get('id');
  const { workouts, loading } = useProgress();
  const w = workouts.find((x) => x.id === id);
  if (!w) {
    if (loading) return <Screen header={<PageHeader title="Edit workout" back />}>{null}</Screen>;
    return <WorkoutNotFound title="Edit workout" />;
  }
  // The form keeps its own copy from the first render on: saving is what writes it back.
  return <EditForm key={w.id} workout={w} />;
}

/**
 * Edit workout: the log layout without a clock. The title, the date and time (in a
 * modal calendar), the length in five minute steps, every set with its tick, Add
 * exercise, notes and Delete. XP is worked out again on the server when it is saved.
 */
function EditForm({ workout }: { workout: WorkoutLog }) {
  const router = useRouter();
  const leave = useLeave();
  const leaveTwice = useLeave(2);
  const today = useToday();
  const { workouts, lookup, prefs, progress, updateWorkout, deleteWorkout, showToast } = useProgress();
  const units = prefs.units;

  const [session, setSession] = useState<Session>(() => sessionFromWorkout(workout));
  const ref = useRef(session);
  const commit = (next: Session) => {
    ref.current = next;
    setSession(next);
  };
  const [when, setWhen] = useState(workout.when);
  const [minutes, setMinutes] = useState(() => durationMinutes(workout.startedAt, workout.finishedAt));
  const [notes, setNotes] = useState(workout.notes ?? '');
  const [dateOpen, setDateOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [menuIndex, setMenuIndex] = useState<number | null>(null);
  const [picker, setPicker] = useState<PickerState>(null);
  const [infoId, setInfoId] = useState<string | null>(null);

  // What came before this workout: "Previous" and the Record and Beat chips are judged against it.
  const history = useMemo(() => workouts.filter((x) => x.id !== workout.id && x.when < when), [workouts, workout.id, when]);
  const previousBest = useMemo(() => {
    const out = new Map<string, ReturnType<typeof previousBestSet>>();
    for (const item of session.items) {
      const e = lookup(item.exerciseId);
      if (e) out.set(item.exerciseId, previousBestSet(history, item.exerciseId, e.metric));
    }
    return out;
  }, [session.items, history, lookup]);
  const marks = useMemo(() => liveMarks(session.items, history, lookup), [session.items, history, lookup]);

  const apply = (r: SessionResult) => {
    if (r.ok) commit(r.session);
    else showToast(r.error);
  };

  if (leaving) return <Screen header={<PageHeader title="Edit workout" back />}>{null}</Screen>;

  const inList = new Set(session.items.map((i) => i.exerciseId));
  const listName = session.title.trim() || 'this workout';
  const replaceEx = picker?.mode === 'replace' ? lookup(session.items[picker.index]?.exerciseId ?? '') : undefined;
  const menuEx = menuIndex !== null ? lookup(session.items[menuIndex]?.exerciseId ?? '') : undefined;

  async function save() {
    const built = buildWorkoutPatch(workout, { session: ref.current, when, minutes, notes }, lookup);
    if (!built.ok) {
      showToast(built.error);
      return;
    }
    setSaving(true);
    const r = await updateWorkout({ id: workout.id, ...built.patch });
    setSaving(false);
    if (!r.ok) {
      showToast(r.error);
      return;
    }
    setLeaving(true);
    if (typeof window !== 'undefined' && window.history.length > 1) router.back();
    else router.replace(`/workout/view?id=${encodeURIComponent(workout.id)}`);
    showToast(editedToast(r.before.level, r.after.level));
  }

  async function remove() {
    setDeleting(true);
    const r = await deleteWorkout(workout.id);
    setDeleting(false);
    setConfirming(false);
    if (!r.ok) {
      showToast(r.error);
      return;
    }
    setLeaving(true);
    leaveTwice();
    showToast(deletedToast(r.before.level, r.after.level));
  }

  function tick(i: number, j: number) {
    const cur = ref.current;
    const item = cur.items[i];
    const set = item?.sets[j];
    const e = item ? lookup(item.exerciseId) : undefined;
    let next = cur;
    if (item && set && !set.done && e) {
      const fill = fillOnTick(e.metric, set, previousBest.get(item.exerciseId) ?? null);
      if (fill) next = S.updateSet(next, i, j, fill);
    }
    next = S.toggleSet(next, i, j);
    commit(next);
    const done = Boolean(next.items[i]?.sets[j]?.done);
    return { done, xp: done && e ? setXp(e, next.items[i].sets[j]) : 0 };
  }

  function removeAt(index: number) {
    const name = lookup(ref.current.items[index]?.exerciseId ?? '')?.name ?? 'Exercise';
    const removal = S.removeExercise(ref.current, index);
    if (!removal) return;
    commit(removal.session);
    showToast(`${name} removed`, 'Undo', () => commit(S.restoreExercise(ref.current, removal.removed, removal.index, removal.planSlot)));
  }

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
        onNotes={(text) => commit(S.setItemNotes(ref.current, i, text))}
        onUpdateSet={(j, patch: SetPatch) => commit(S.updateSet(ref.current, i, j, patch))}
        onAddSet={() => apply(S.addSet(ref.current, i, lookup))}
        onRemoveSet={(j) => apply(S.removeSet(ref.current, i, j))}
        onToggleSet={(j) => tick(i, j)}
        mark={marks.find((m) => m.exerciseId === item.exerciseId)}
        cardio={e.metric === 'distance_time' ? { follow: false, onChange: (patch: SetPatch) => commit(S.updateCardio(ref.current, i, patch)) } : undefined}
      />
    );
  });

  const sentence = deleteSentence({ title: workout.title, whenLabel: formatDay(workout.date), xp: workout.xp, totalXp: progress.xp });

  return (
    <Screen
      narrow
      header={
        <PageHeader
          title="Edit workout"
          narrow
          lead={
            <button type="button" className="wt-textbtn" onClick={leave}>
              Cancel
            </button>
          }
          actions={
            <Button size="sm" loading={saving} onClick={() => void save()}>
              Save
            </Button>
          }
        />
      }
    >
      <input className="wt-log-title" aria-label="Workout title" maxLength={80} value={session.title} onChange={(e) => commit(S.setTitle(ref.current, e.target.value))} />

      <button type="button" className="wt-frow" aria-haspopup="dialog" onClick={() => setDateOpen(true)}>
        <Calendar size={20} aria-hidden="true" />
        <span className="grow">
          <small>Date and time</small>
          {formatWhen(when)}
        </span>
        <ChevronRight size={18} aria-hidden="true" />
      </button>

      <div className="wt-frow" role="group" aria-label="Duration">
        <Clock size={20} aria-hidden="true" />
        <span className="grow">
          <small>Duration</small>
          <span data-testid="edit-duration">{minutes} min</span>
        </span>
        <button type="button" className="wt-backbtn" aria-label={`Shorter by ${DURATION_STEP_MIN} minutes`} disabled={minutes <= 1} onClick={() => setMinutes((m) => stepDuration(m, -1))}>
          <Minus size={18} aria-hidden="true" />
        </button>
        <button type="button" className="wt-backbtn" aria-label={`Longer by ${DURATION_STEP_MIN} minutes`} onClick={() => setMinutes((m) => stepDuration(m, 1))}>
          <Plus size={18} aria-hidden="true" />
        </button>
      </div>

      <div className="wt-info">
        <Info size={16} aria-hidden="true" />
        <span>XP is worked out again when you save.</span>
      </div>

      {blocks.some(Boolean) ? (
        blocks
      ) : (
        <div className="wt-empty">
          <Dumbbell size={40} aria-hidden="true" />
          <b>No exercises</b>
          <span>Add an exercise to keep this workout.</span>
        </div>
      )}

      <div className="wt-log-end">
        <Button variant="secondary" size="lg" block icon={<Plus size={20} aria-hidden="true" />} onClick={() => setPicker({ mode: 'add' })}>
          Add exercise
        </Button>
        <Card>
          <CardHead title="Notes" />
          <Textarea aria-label="Workout notes" className="wt-notes-area" value={notes} maxLength={1000} placeholder="How did it feel?" onChange={(e) => setNotes(e.target.value)} />
        </Card>
        <div className="wt-danger">
          <Button variant="soft-destructive" size="sm" icon={<Trash2 size={16} aria-hidden="true" />} onClick={() => setConfirming(true)}>
            Delete workout
          </Button>
        </div>
      </div>

      <DateTimeModal open={dateOpen} value={when} max={maxWorkoutDate(today)} onCancel={() => setDateOpen(false)} onDone={(next) => { setWhen(next); setDateOpen(false); }} />

      <ExerciseMenu
        open={menuIndex !== null && Boolean(menuEx)}
        onClose={() => setMenuIndex(null)}
        name={menuEx?.name ?? ''}
        index={menuIndex ?? 0}
        count={session.items.length}
        onMoveUp={() => menuIndex !== null && commit(S.moveExercise(ref.current, menuIndex, -1))}
        onMoveDown={() => menuIndex !== null && commit(S.moveExercise(ref.current, menuIndex, 1))}
        onReplace={() => menuIndex !== null && setPicker({ mode: 'replace', index: menuIndex })}
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
        onAdd={(ids) => ids.forEach((id) => apply(S.addExercise(ref.current, id, lookup)))}
        onReplace={(id) => picker?.mode === 'replace' && apply(S.replaceExercise(ref.current, picker.index, id, lookup))}
      />

      <ExerciseInfoSheet exercise={infoId ? lookup(infoId) ?? null : null} onClose={() => setInfoId(null)} />
      <DeleteWorkoutDialog open={confirming} sentence={sentence} saving={deleting} onKeep={() => setConfirming(false)} onDelete={() => void remove()} />
    </Screen>
  );
}
