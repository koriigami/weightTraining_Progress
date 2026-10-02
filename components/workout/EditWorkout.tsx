'use client';

import { useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Info, Trash2 } from 'lucide-react';
import { formatDay } from '@/lib/date';
import { deleteSentence, deletedToast, editedToast } from '@/lib/history';
import { buildWorkoutPatch, durationMinutes, sessionFromWorkout, stepDuration } from '@/lib/session';
import type { WorkoutLog } from '@/lib/routines';
import { useProgress } from '@/components/ProgressProvider';
import { Button } from '@/components/ui/Button';
import { PageHeader } from '@/components/ui/PageHeader';
import { Screen } from '@/components/ui/Screen';
import { DeleteWorkoutDialog } from './DeleteWorkoutDialog';
import { WorkoutForm, useWorkoutDraft } from './WorkoutForm';
import { WorkoutNotFound } from './WorkoutNotFound';
import { useLeave } from './WorkoutView';

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
  const { workouts, lookup, progress, updateWorkout, deleteWorkout, showToast } = useProgress();

  const draft = useWorkoutDraft(() => sessionFromWorkout(workout));
  const [when, setWhen] = useState(workout.when);
  const [minutes, setMinutes] = useState(() => durationMinutes(workout.startedAt, workout.finishedAt));
  const [notes, setNotes] = useState(workout.notes ?? '');
  const [saving, setSaving] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const history = useMemo(() => workouts.filter((x) => x.id !== workout.id && x.when < when), [workouts, workout.id, when]);

  if (leaving) return <Screen header={<PageHeader title="Edit workout" back />}>{null}</Screen>;

  async function save() {
    const built = buildWorkoutPatch(workout, { session: draft.ref.current, when, minutes, notes }, lookup);
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
      <WorkoutForm
        draft={draft}
        when={when}
        onWhen={setWhen}
        minutes={minutes}
        onStep={(direction) => setMinutes((m) => stepDuration(m, direction))}
        notes={notes}
        onNotes={setNotes}
        history={history}
        info={
          <div className="wt-info">
            <Info size={16} aria-hidden="true" />
            <span>XP is worked out again when you save.</span>
          </div>
        }
        empty={{ title: 'No exercises', text: 'Add an exercise to keep this workout.' }}
        end={
          <div className="wt-danger">
            <Button variant="soft-destructive" size="sm" icon={<Trash2 size={16} aria-hidden="true" />} onClick={() => setConfirming(true)}>
              Delete workout
            </Button>
          </div>
        }
      />

      <DeleteWorkoutDialog open={confirming} sentence={sentence} saving={deleting} onKeep={() => setConfirming(false)} onDelete={() => void remove()} />
    </Screen>
  );
}
