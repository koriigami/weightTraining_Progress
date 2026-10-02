'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Calendar, ChevronRight, Clock, Dumbbell, Minus, Plus } from 'lucide-react';
import { formatWhen } from '@/lib/date';
import { fmtPreviousBest, previousBestSet } from '@/lib/exerciseHistory';
import { fillOnTick } from '@/lib/setColumns';
import { DURATION_STEP_MIN } from '@/lib/session';
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
import { ExerciseBlock } from './ExerciseBlock';
import { ExerciseMenu } from './ExerciseMenu';

type PickerState = { mode: 'add' } | { mode: 'replace'; index: number } | null;

/** The session being edited. `ref` is always the latest, for handlers that fire twice before React re-renders. */
export function useWorkoutDraft(init: () => Session) {
  const [session, setSession] = useState<Session>(init);
  const ref = useRef(session);
  const commit = useCallback((next: Session) => {
    ref.current = next;
    setSession(next);
  }, []);
  return { session, ref, commit };
}

export type WorkoutDraft = ReturnType<typeof useWorkoutDraft>;

/**
 * The body of Edit workout and Log workout: the title, the date and time (in a modal
 * calendar), the length, every exercise with its sets, Add exercise and notes. The
 * screens around it differ in their header, what they save, and what they add:
 * `info` sits above the exercises, `empty` is the text when there are none, and `end`
 * comes after the notes (Edit's Delete).
 */
export function WorkoutForm({
  draft,
  when,
  onWhen,
  minutes,
  onStep,
  notes,
  onNotes,
  history,
  info,
  empty,
  end,
  latestDate,
}: {
  draft: WorkoutDraft;
  when: string;
  onWhen: (when: string) => void;
  minutes: number;
  /** The Duration row's minus and plus. */
  onStep: (direction: -1 | 1) => void;
  notes: string;
  onNotes: (notes: string) => void;
  /** What came before this workout: "Previous" and the Record and Beat chips are judged against it. */
  history: WorkoutLog[];
  info?: ReactNode;
  empty: { title: string; text: string };
  end?: ReactNode;
  /** The last day the date picker offers. Edit allows a day ahead for time zones; Log stops at today. */
  latestDate?: string;
}) {
  const { session, ref, commit } = draft;
  const today = useToday();
  const { lookup, prefs, showToast } = useProgress();
  const units = prefs.units;

  const [dateOpen, setDateOpen] = useState(false);
  const [menuIndex, setMenuIndex] = useState<number | null>(null);
  const [picker, setPicker] = useState<PickerState>(null);
  const [infoId, setInfoId] = useState<string | null>(null);

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

  const inList = new Set(session.items.map((i) => i.exerciseId));
  const listName = session.title.trim() || 'this workout';
  const replaceEx = picker?.mode === 'replace' ? lookup(session.items[picker.index]?.exerciseId ?? '') : undefined;
  const menuEx = menuIndex !== null ? lookup(session.items[menuIndex]?.exerciseId ?? '') : undefined;

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
    showToast(`${name} removed`, 'Undo', () => commit(S.restoreExercise(ref.current, removal.removed, removal.index)));
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
        cardio={
          e.metric === 'distance_time'
            ? {
                follow: false,
                onChange: (patch: SetPatch) => commit(S.updateCardio(ref.current, i, patch)),
                laps: {
                  onAdd: () => commit(S.addBlankLap(ref.current, i)),
                  onUpdate: (lapIndex, patch) => commit(S.updateLap(ref.current, i, lapIndex, patch)),
                  onRemove: (lapIndex) => commit(S.removeLap(ref.current, i, lapIndex)),
                },
              }
            : undefined
        }
      />
    );
  });

  return (
    <>
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
        <button type="button" className="wt-backbtn" aria-label={`Shorter by ${DURATION_STEP_MIN} minutes`} disabled={minutes <= 1} onClick={() => onStep(-1)}>
          <Minus size={18} aria-hidden="true" />
        </button>
        <button type="button" className="wt-backbtn" aria-label={`Longer by ${DURATION_STEP_MIN} minutes`} onClick={() => onStep(1)}>
          <Plus size={18} aria-hidden="true" />
        </button>
      </div>

      {info}

      {blocks.some(Boolean) ? (
        blocks
      ) : (
        <div className="wt-empty">
          <Dumbbell size={40} aria-hidden="true" />
          <b>{empty.title}</b>
          <span>{empty.text}</span>
        </div>
      )}

      <div className="wt-log-end">
        <Button variant="secondary" size="lg" block icon={<Plus size={20} aria-hidden="true" />} onClick={() => setPicker({ mode: 'add' })}>
          Add exercise
        </Button>
        <Card>
          <CardHead title="Notes" />
          <Textarea aria-label="Workout notes" className="wt-notes-area" value={notes} maxLength={1000} placeholder="Anything to remember?" onChange={(e) => onNotes(e.target.value)} />
        </Card>
        {end}
      </div>

      <DateTimeModal open={dateOpen} value={when} max={latestDate ?? maxWorkoutDate(today)} onCancel={() => setDateOpen(false)} onDone={(next) => { onWhen(next); setDateOpen(false); }} />

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
    </>
  );
}
