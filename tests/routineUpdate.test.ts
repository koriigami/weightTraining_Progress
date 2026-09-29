import { describe, expect, it } from 'vitest';
import { routineWouldChange, updateRoutineFromWorkout } from '../lib/routineUpdate';
import type { Routine } from '../lib/routines';
import { workout } from './helpers';

const routine: Routine = {
  id: 'push-a',
  title: 'Push A',
  items: [
    { exerciseId: 'pushup', sets: [{ reps: 10 }, { reps: 10 }] },
    { exerciseId: 'db-ohp', notes: 'Slow', sets: [{ kg: 5, reps: 10 }, { kg: 5, reps: 10 }, { kg: 5, reps: 10 }] },
    { exerciseId: 'db-fly', sets: [{ kg: 5, reps: 12 }] },
  ],
};

describe('update routine with today\'s weights', () => {
  it('replaces the sets with the ticked ones, without the done flag', () => {
    const w = workout('2026-10-10', [
      { id: 'db-ohp', sets: [{ kg: 7.5, reps: 10 }, { kg: 7.5, reps: 9 }, { kg: 7.5, reps: 8 }] },
      { id: 'pushup', sets: [{ reps: 12 }, { reps: 11 }] },
    ]);
    const next = updateRoutineFromWorkout(routine, w);
    expect(next.items[0].sets).toEqual([{ reps: 12 }, { reps: 11 }]);
    expect(next.items[1].sets).toEqual([{ kg: 7.5, reps: 10 }, { kg: 7.5, reps: 9 }, { kg: 7.5, reps: 8 }]);
    expect(routine.items[1].sets[0].kg).toBe(5);
  });

  it('uses only ticked sets, so an exercise done in fewer sets shrinks', () => {
    const w = workout('2026-10-10', [{ id: 'db-ohp', sets: [{ kg: 7.5, reps: 10 }, { kg: 7.5, reps: 9 }, { kg: 7.5, reps: 8 }], undone: [2] }]);
    expect(updateRoutineFromWorkout(routine, w).items[1].sets).toHaveLength(2);
  });

  it('leaves an exercise that was skipped, or not ticked at all, as it was', () => {
    const w = workout('2026-10-10', [{ id: 'db-ohp', sets: [{ kg: 7.5, reps: 10 }], undone: [0] }]);
    const next = updateRoutineFromWorkout(routine, w);
    expect(next.items).toEqual(routine.items);
  });

  it('never adds or removes exercises', () => {
    const w = workout('2026-10-10', [{ id: 'bb-squat', sets: [{ kg: 60, reps: 5 }] }, { id: 'pushup', sets: [{ reps: 12 }] }]);
    const next = updateRoutineFromWorkout(routine, w);
    expect(next.items.map((i) => i.exerciseId)).toEqual(['pushup', 'db-ohp', 'db-fly']);
  });

  it('carries the workout notes for an exercise over, and keeps the old ones otherwise', () => {
    const w = workout('2026-10-10', [{ id: 'db-ohp', sets: [{ kg: 7.5, reps: 10 }] }, { id: 'pushup', sets: [{ reps: 12 }] }]);
    w.items[1].notes = ' Go slower ';
    const next = updateRoutineFromWorkout(routine, w);
    expect(next.items[1].notes).toBe('Slow');
    const w2 = workout('2026-10-10', [{ id: 'db-ohp', sets: [{ kg: 7.5, reps: 10 }] }]);
    w2.items[0].notes = ' Felt heavy ';
    expect(updateRoutineFromWorkout(routine, w2).items[1].notes).toBe('Felt heavy');
  });

  it('says whether anything would change', () => {
    const same = workout('2026-10-10', [{ id: 'pushup', sets: [{ reps: 10 }, { reps: 10 }] }]);
    expect(routineWouldChange(routine, same)).toBe(false);
    const heavier = workout('2026-10-10', [{ id: 'db-fly', sets: [{ kg: 6, reps: 12 }] }]);
    expect(routineWouldChange(routine, heavier)).toBe(true);
  });
});
