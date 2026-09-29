import { describe, expect, it } from 'vitest';
import {
  addExercise,
  addExercises,
  addSet,
  blankRoutine,
  draftFrom,
  moveItem,
  newItemSets,
  newRoutineId,
  removeItem,
  removeSet,
  replaceItem,
  restoreItem,
  sameRoutine,
  setItemNotes,
  setTimesPerWeek,
  setTitle,
  updateSet,
  validateRoutine,
} from '../lib/routineDraft';
import type { DraftResult } from '../lib/routineDraft';
import { exerciseById } from '../data/exercises';
import { LIMITS } from '../lib/routines';
import type { Routine } from '../lib/routines';

const base: Routine = {
  id: 'push-a',
  title: 'Push A',
  timesPerWeek: 2,
  items: [
    { exerciseId: 'pushup', sets: [{ reps: 10 }, { reps: 10 }] },
    { exerciseId: 'db-ohp', notes: 'Slow', sets: [{ kg: 5, reps: 10 }, { kg: 5, reps: 10 }, { kg: 7.5, reps: 8 }] },
  ],
};

function must(r: DraftResult): Routine {
  if (!r.ok) throw new Error(`expected ok, got: ${r.error}`);
  return r.routine;
}

function mustFail(r: DraftResult, part: string) {
  expect(r.ok).toBe(false);
  if (!r.ok) expect(r.error).toContain(part);
}

describe('ids and blanks', () => {
  it('makes ids the API accepts', () => {
    const id = newRoutineId(new Date(2026, 9, 10), () => 0.5);
    expect(id).toMatch(/^[A-Za-z0-9_-]{1,64}$/);
    expect(newRoutineId()).not.toBe(newRoutineId(new Date(0)));
    expect(blankRoutine('r-1')).toEqual({ id: 'r-1', title: '', items: [] });
  });

  it('a draft is a copy', () => {
    const copy = draftFrom(base);
    copy.items[0].sets[0].reps = 99;
    expect(base.items[0].sets[0].reps).toBe(10);
  });

  it('new exercises get three sets, one for a distance session', () => {
    expect(newItemSets(exerciseById('db-ohp')!)).toEqual([{ kg: 0, reps: 10 }, { kg: 0, reps: 10 }, { kg: 0, reps: 10 }]);
    expect(newItemSets(exerciseById('run')!)).toEqual([{ min: 20 }]);
  });
});

describe('adding exercises', () => {
  it('adds an exercise with its default sets', () => {
    const r = must(addExercise(base, 'bw-squat'));
    expect(r.items).toHaveLength(3);
    expect(r.items[2]).toEqual({ exerciseId: 'bw-squat', sets: [{ reps: 10 }, { reps: 10 }, { reps: 10 }] });
  });

  it('turns away a duplicate and names the routine', () => {
    mustFail(addExercise(base, 'pushup'), 'Push Up is already in Push A.');
    mustFail(addExercise({ ...base, title: '  ' }, 'pushup'), 'Push Up is already in this routine.');
  });

  it('turns away an unknown exercise and a full routine', () => {
    mustFail(addExercise(base, 'nope'), 'not available');
    const full: Routine = { ...base, items: Array.from({ length: LIMITS.itemsPerList }, (_, i) => ({ exerciseId: `x${i}`, sets: [{}] })) };
    mustFail(addExercise(full, 'pushup'), `up to ${LIMITS.itemsPerList}`);
  });

  it('adds several and skips the ones already there', () => {
    const r = addExercises(base, ['pushup', 'bridge', 'crunch']);
    expect(r.added).toEqual(['bridge', 'crunch']);
    expect(r.routine.items.map((i) => i.exerciseId)).toEqual(['pushup', 'db-ohp', 'bridge', 'crunch']);
    expect(r.error).toContain('Push Up is already in Push A.');
  });
});

describe('removing and moving', () => {
  it('removes with an undo that puts it back in place', () => {
    const removal = removeItem(base, 0)!;
    expect(removal.routine.items.map((i) => i.exerciseId)).toEqual(['db-ohp']);
    expect(restoreItem(removal.routine, removal.removed, removal.index)).toEqual(base);
  });

  it('undo does nothing if the exercise was added again', () => {
    const removal = removeItem(base, 0)!;
    const again = must(addExercise(removal.routine, 'pushup'));
    expect(restoreItem(again, removal.removed, 0)).toBe(again);
  });

  it('removing out of range is null', () => {
    expect(removeItem(base, 5)).toBeNull();
    expect(removeItem(base, -1)).toBeNull();
  });

  it('moves up and down, and stops at the ends', () => {
    expect(moveItem(base, 0, 1).items.map((i) => i.exerciseId)).toEqual(['db-ohp', 'pushup']);
    expect(moveItem(base, 1, -1).items.map((i) => i.exerciseId)).toEqual(['db-ohp', 'pushup']);
    expect(moveItem(base, 0, -1)).toBe(base);
    expect(moveItem(base, 1, 1)).toBe(base);
  });
});

describe('replacing', () => {
  it('keeps the number of sets with fresh blank sets', () => {
    const r = must(replaceItem(base, 1, 'db-lat'));
    expect(r.items[1]).toEqual({ exerciseId: 'db-lat', sets: [{ kg: 0, reps: 10 }, { kg: 0, reps: 10 }, { kg: 0, reps: 10 }] });
  });

  it('refuses an exercise that is elsewhere in the routine', () => {
    mustFail(replaceItem(base, 1, 'pushup'), 'Push Up is already in Push A.');
  });

  it('replacing with itself changes nothing', () => {
    expect(must(replaceItem(base, 0, 'pushup'))).toBe(base);
  });
});

describe('sets', () => {
  it('a new set copies the last one', () => {
    const r = must(addSet(base, 1));
    expect(r.items[1].sets).toHaveLength(4);
    expect(r.items[1].sets[3]).toEqual({ kg: 7.5, reps: 8 });
  });

  it('caps the sets in an exercise', () => {
    const many: Routine = { ...base, items: [{ exerciseId: 'pushup', sets: Array.from({ length: LIMITS.setsPerItem }, () => ({ reps: 10 })) }] };
    mustFail(addSet(many, 0), `up to ${LIMITS.setsPerItem}`);
  });

  it('removes a set but never the last one', () => {
    expect(must(removeSet(base, 1, 0)).items[1].sets).toHaveLength(2);
    const one = must(removeSet(base, 0, 0));
    expect(one.items[0].sets).toHaveLength(1);
    mustFail(removeSet(one, 0, 0), 'at least one set');
  });

  it('updates one field of one set, and an empty value clears it', () => {
    const r = updateSet(base, 1, 2, { kg: 10 });
    expect(r.items[1].sets[2]).toEqual({ kg: 10, reps: 8 });
    expect(base.items[1].sets[2]).toEqual({ kg: 7.5, reps: 8 });
    expect(updateSet(base, 1, 2, { reps: undefined }).items[1].sets[2]).toEqual({ kg: 7.5 });
    expect(updateSet(base, 1, 2, { kg: -3 }).items[1].sets[2]).toEqual({ reps: 8 });
  });

  it('ignores an update outside the routine', () => {
    expect(updateSet(base, 9, 0, { kg: 1 })).toBe(base);
    expect(updateSet(base, 0, 9, { reps: 1 })).toBe(base);
  });
});

describe('title, notes and weekly count', () => {
  it('sets and trims the title to the API limit', () => {
    expect(setTitle(base, 'x'.repeat(100)).title).toHaveLength(60);
  });

  it('sets and clears exercise notes', () => {
    expect(setItemNotes(base, 0, 'Knees ok').items[0].notes).toBe('Knees ok');
    expect(setItemNotes(base, 1, '   ').items[1]).not.toHaveProperty('notes');
  });

  it('sets a weekly count, and Any removes it', () => {
    expect(setTimesPerWeek(base, 3).timesPerWeek).toBe(3);
    expect(setTimesPerWeek(base, undefined)).not.toHaveProperty('timesPerWeek');
  });
});

describe('validation uses the API words', () => {
  it('needs a title', () => {
    expect(validateRoutine({ ...base, title: '  ' })).toBe('Routine needs a title of 1 to 60 characters.');
  });

  it('needs an exercise', () => {
    expect(validateRoutine({ ...base, items: [] })).toBe('A routine needs 1 to 40 exercises.');
  });

  it('passes a good routine', () => {
    expect(validateRoutine(base)).toBeNull();
  });

  it('catches a duplicate', () => {
    expect(validateRoutine({ ...base, items: [base.items[0], base.items[0]] })).toBe('An exercise can only be in a routine once.');
  });

  it('compares routines by content', () => {
    expect(sameRoutine(base, draftFrom(base))).toBe(true);
    expect(sameRoutine(base, setTitle(base, 'Push B'))).toBe(false);
  });
});
