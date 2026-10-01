import { describe, expect, it } from 'vitest';
import { applyRoutineAction } from '../lib/routineActions';
import type { ActionResult } from '../lib/routineActions';
import { emptyState } from '../lib/progress';
import type { AppState } from '../lib/progress';
import { LIMITS, defaultPrefs } from '../lib/routines';
import { seedRoutines } from './fixtures/seedRoutines';
import type { WorkoutLog } from '../lib/routines';
import { isValidDate, isValidWhen, parsePrefs, parseRoutine, parseWorkoutInput } from '../lib/routineValidation';
import { exerciseById } from '../data/exercises';
import { workout } from './helpers';

const TODAY = '2026-10-10';
const ctx = { today: TODAY, makeId: () => 'custom-made-id' };

function run(state: AppState, body: Record<string, unknown>): ActionResult {
  return applyRoutineAction(state, body, ctx);
}

function expectOk(r: ActionResult): AppState {
  if (!r.ok) throw new Error(`expected ok, got: ${r.error}`);
  return r.state;
}

function expectFail(r: ActionResult, part: string) {
  expect(r.ok).toBe(false);
  if (!r.ok) expect(r.error).toContain(part);
}

const routine = (over: Record<string, unknown> = {}) => ({
  id: 'r1',
  title: 'Push day',
  items: [{ exerciseId: 'pushup', sets: [{ reps: 10 }, { reps: 10 }] }],
  ...over,
});

// Seven ticked sets are 21 minutes: the day reaches the daily bonus on its own.
const training = { exerciseId: 'db-ohp', sets: Array.from({ length: 7 }, () => ({ kg: 10, reps: 10, done: true })) };

// A workout as the client sends it: no xp, no marks.
function input(date: string, over: Record<string, unknown> = {}, exerciseId = 'db-ohp') {
  return {
    id: `in-${date}-${exerciseId}`,
    date,
    when: `${date}T18:30`,
    title: 'Evening',
    startedAt: `${date}T18:30:00.000Z`,
    finishedAt: `${date}T19:15:00.000Z`,
    items: [{ exerciseId, sets: [{ kg: 10, reps: 10, done: true }, { kg: 10, reps: 8, done: false }] }],
    ...over,
  };
}

describe('saveRoutine', () => {
  it('adds a routine, then replaces it by id', () => {
    const a = expectOk(run(emptyState(), { action: 'saveRoutine', routine: routine() }));
    expect(a.routines).toHaveLength(1);
    const b = expectOk(run(a, { action: 'saveRoutine', routine: routine({ title: 'Renamed', timesPerWeek: 2 }) }));
    expect(b.routines).toHaveLength(1);
    expect(b.routines![0]).toMatchObject({ title: 'Renamed', timesPerWeek: 2 });
  });

  it('does not change the state it was given', () => {
    const before = emptyState();
    run(before, { action: 'saveRoutine', routine: routine() });
    expect(before).toEqual(emptyState());
  });

  it('trims text and keeps only fields that belong to the exercise', () => {
    const s = expectOk(
      run(emptyState(), {
        action: 'saveRoutine',
        routine: routine({ title: '  Push day  ', extra: 'x', items: [{ exerciseId: 'pushup', sets: [{ reps: 8, kg: 50, sec: 9, evil: 1 }] }] }),
      })
    );
    expect(s.routines![0].title).toBe('Push day');
    expect(s.routines![0].items[0].sets).toEqual([{ reps: 8 }]);
    expect(s.routines![0]).not.toHaveProperty('extra');
  });

  it('rejects bad input', () => {
    const bad = (r: unknown, part: string) => expectFail(run(emptyState(), { action: 'saveRoutine', routine: r }), part);
    bad(undefined, 'invalid routine');
    bad(routine({ id: 'has space' }), 'id');
    bad(routine({ id: 5 }), 'id');
    bad(routine({ title: '   ' }), 'title');
    bad(routine({ title: 'x'.repeat(61) }), 'title');
    bad(routine({ notes: 'x'.repeat(501) }), 'notes');
    bad(routine({ timesPerWeek: 0 }), 'times per week');
    bad(routine({ timesPerWeek: 2.5 }), 'times per week');
    bad(routine({ items: [] }), 'exercises');
    bad(routine({ items: [{ exerciseId: 'nope', sets: [{ reps: 1 }] }] }), 'unknown exercise');
    bad(routine({ items: [{ exerciseId: 'pushup', sets: [] }] }), 'sets');
    bad(routine({ items: [{ exerciseId: 'pushup', sets: [{ reps: -1 }] }] }), 'out of range');
    bad(routine({ items: [{ exerciseId: 'pushup', sets: [{ reps: '10' }] }] }), 'out of range');
    bad(routine({ items: [{ exerciseId: 'pushup', sets: [{ reps: 1.5 }] }] }), 'whole number');
    bad(routine({ items: [{ exerciseId: 'db-ohp', sets: [{ kg: 5001, reps: 1 }] }] }), 'out of range');
    bad(routine({ items: [{ exerciseId: 'pushup', sets: Array.from({ length: LIMITS.setsPerItem + 1 }, () => ({ reps: 1 })) }] }), 'sets');
    bad(routine({ items: Array.from({ length: LIMITS.itemsPerList + 1 }, () => ({ exerciseId: 'pushup', sets: [{ reps: 1 }] })) }), 'exercises');
  });

  it('rejects the same exercise twice', () => {
    const items = [
      { exerciseId: 'pushup', sets: [{ reps: 10 }] },
      { exerciseId: 'plank', sets: [{ sec: 30 }] },
      { exerciseId: 'pushup', sets: [{ reps: 10 }] },
    ];
    expectFail(run(emptyState(), { action: 'saveRoutine', routine: routine({ items }) }), 'once');
  });

  it('stops at 200 routines but still lets an existing one be edited', () => {
    const full: AppState = {
      ...emptyState(),
      routines: Array.from({ length: LIMITS.routines }, (_, i) => ({ id: `r${i}`, title: `R${i}`, items: [] })),
    };
    expectFail(run(full, { action: 'saveRoutine', routine: routine({ id: 'new' }) }), 'too many');
    expectOk(run(full, { action: 'saveRoutine', routine: routine({ id: 'r7' }) }));
  });
});

describe('deleteRoutine', () => {
  it('removes by id and ignores an id that is not there', () => {
    const s: AppState = { ...emptyState(), routines: seedRoutines() };
    const next = expectOk(run(s, { action: 'deleteRoutine', id: 'seed-legs' }));
    expect(next.routines!.map((r) => r.id)).not.toContain('seed-legs');
    expect(next.routines).toHaveLength(5);
    expect(expectOk(run(next, { action: 'deleteRoutine', id: 'nope' })).routines).toHaveLength(5);
    expectFail(run(s, { action: 'deleteRoutine', id: 7 }), 'invalid id');
  });
});

describe('saveWorkout', () => {
  it('works out xp and marks on the server, ignoring what the client sends', () => {
    const s = expectOk(run(emptyState(), { action: 'saveWorkout', workout: input('2026-10-09', { items: [training], xp: 99999, marks: [{ exerciseId: 'x', kind: 'record' }], planComplete: false, xpParts: { sets: 999 } }) }));
    expect(s.workouts).toHaveLength(1);
    expect(s.workouts![0].xp).toBe(35 + 50);
    expect(s.workouts![0].marks).toEqual([]);
    expect(s.workouts![0].planComplete).toBe(true);
    expect(s.workouts![0].xpParts).toEqual({ sets: 35, cardio: 0, beat: 0, record: 0, finish: 50, weekly: 0, comeback: 0 });
  });

  it('marks a record against an earlier workout and pays for it', () => {
    let s = expectOk(run(emptyState(), { action: 'saveWorkout', workout: input('2026-10-08') }));
    const heavier = input('2026-10-09', { items: [{ exerciseId: 'db-ohp', sets: [{ kg: 12, reps: 10, done: true }] }] });
    s = expectOk(run(s, { action: 'saveWorkout', workout: heavier }));
    expect(s.workouts![1].marks).toEqual([{ exerciseId: 'db-ohp', kind: 'record', kg: 12, reps: 10 }]);
    expect(s.workouts![1].xp).toBe(5 + 25); // one set is 3 minutes, so no daily bonus
  });

  it('rejects a duplicate id', () => {
    const w = input('2026-10-09');
    const s = expectOk(run(emptyState(), { action: 'saveWorkout', workout: w }));
    expectFail(run(s, { action: 'saveWorkout', workout: w }), 'already saved');
  });

  it('rejects a future date but allows tomorrow', () => {
    expectFail(run(emptyState(), { action: 'saveWorkout', workout: input('2026-10-12') }), 'future');
    expectOk(run(emptyState(), { action: 'saveWorkout', workout: input('2026-10-11') }));
  });

  it('rejects bad input', () => {
    const bad = (over: Record<string, unknown>, part: string) =>
      expectFail(run(emptyState(), { action: 'saveWorkout', workout: input('2026-10-09', over) }), part);
    bad({ id: '' }, 'id');
    bad({ date: '2026-02-31', when: '2026-02-31T10:00' }, 'date');
    bad({ when: '2026-10-09 18:30' }, 'time');
    bad({ when: '2026-10-08T18:30' }, 'do not match');
    bad({ title: '' }, 'title');
    bad({ title: 'x'.repeat(81) }, 'title');
    bad({ routineId: 'bad id' }, 'routine id');
    bad({ startedAt: 'yesterday' }, 'start or finish');
    bad({ finishedAt: '2026-10-09T17:00:00.000Z' }, 'after the start');
    bad({ finishedAt: '2026-10-11T19:15:00.000Z' }, 'within a day');
    bad({ notes: 'x'.repeat(1001) }, 'notes');
    bad({ photo: 'x'.repeat(2001) }, 'photo');
    bad({ items: [] }, 'exercises');
    bad({ items: [{ exerciseId: 'nope', sets: [{ done: true }] }] }, 'unknown exercise');
    bad({ items: [{ exerciseId: 'db-ohp', sets: [{ kg: 10, reps: 10 }] }] }, 'invalid set'); // done is required
    bad({ items: [{ exerciseId: 'db-ohp', sets: [{ kg: 10, reps: 10, done: 'yes' }] }] }, 'invalid set');
    bad({ items: [{ exerciseId: 'db-ohp', sets: [{ kg: 10, reps: 10, done: false }] }] }, 'tick at least one');
    bad(
      {
        items: [
          { exerciseId: 'db-ohp', sets: [{ kg: 10, reps: 10, done: true }] },
          { exerciseId: 'db-ohp', sets: [{ kg: 10, reps: 10, done: true }] },
        ],
      },
      'once'
    );
  });

  it('rejects a workout with too many sets in total', () => {
    const ids = ['pushup', 'plank', 'crunch', 'twist', 'legraise', 'superman', 'bridge', 'bw-squat', 'dips', 'diamond-pushup', 'deadbug'];
    const items = ids.map((exerciseId) => ({
      exerciseId,
      sets: Array.from({ length: LIMITS.setsPerItem }, () => (exerciseId === 'plank' ? { sec: 30, done: true } : { reps: 10, done: true })),
    }));
    expectFail(run(emptyState(), { action: 'saveWorkout', workout: input('2026-10-09', { items }) }), 'too many sets');
  });

  it('stops at 2000 workouts', () => {
    const many: AppState = { ...emptyState(), workouts: Array.from({ length: LIMITS.workouts }, (_, i) => workout('2026-09-01', [{ id: 'pushup', sets: [{ reps: 1 }] }], { id: `w-${i}` })) };
    expectFail(run(many, { action: 'saveWorkout', workout: input('2026-10-09') }), 'too many workouts');
  });

  it('pays the weekly goal bonus once, on the third workout of the week', () => {
    let s = emptyState();
    for (const d of ['2026-10-05', '2026-10-06', '2026-10-07', '2026-10-08']) {
      s = expectOk(run(s, { action: 'saveWorkout', workout: input(d, { items: [training] }) }));
    }
    expect(s.workouts!.map((w) => w.xp)).toEqual([85, 85, 135, 85]);
  });
});

describe('updateWorkout', () => {
  const base = () => expectOk(run(emptyState(), { action: 'saveWorkout', workout: input('2026-10-09') }));
  const id = 'in-2026-10-09-db-ohp';

  it('never takes xp or the routine from the client', () => {
    const s = expectOk(
      run(base(), {
        action: 'updateWorkout',
        id,
        title: 'Renamed',
        notes: 'Felt strong',
        photo: 'p1',
        xp: 9999,
        routineId: 'other',
      })
    );
    const w = s.workouts![0];
    expect(w).toMatchObject({ title: 'Renamed', notes: 'Felt strong', photo: 'p1', xp: 5 });
    expect(w.items).toHaveLength(1);
    expect(w.routineId).toBeUndefined();
  });

  it('moves the day and keeps the clock time when only the date changes, and re-scores', () => {
    const s = expectOk(run(base(), { action: 'updateWorkout', id, date: '2026-10-07' }));
    expect(s.workouts![0]).toMatchObject({ date: '2026-10-07', when: '2026-10-07T18:30' });
    const t = expectOk(run(base(), { action: 'updateWorkout', id, when: '2026-10-06T07:15' }));
    expect(t.workouts![0]).toMatchObject({ date: '2026-10-06', when: '2026-10-06T07:15' });
  });

  it('re-scores the others when the order changes', () => {
    let s = expectOk(run(emptyState(), { action: 'saveWorkout', workout: input('2026-10-06') }));
    s = expectOk(run(s, { action: 'saveWorkout', workout: input('2026-10-07', { items: [{ exerciseId: 'db-ohp', sets: [{ kg: 20, reps: 5, done: true }] }] }) }));
    expect(s.workouts!.map((w) => w.marks!.length)).toEqual([0, 1]);
    // Moving the lighter one after the heavier one turns the heavy one into the baseline.
    s = expectOk(run(s, { action: 'updateWorkout', id: 'in-2026-10-06-db-ohp', date: '2026-10-08' }));
    expect(s.workouts!.map((w) => w.marks!.length)).toEqual([0, 0]);
  });

  it('clears notes and photo with an empty string', () => {
    let s = expectOk(run(base(), { action: 'updateWorkout', id, notes: 'x', photo: 'p' }));
    s = expectOk(run(s, { action: 'updateWorkout', id, notes: '', photo: '' }));
    expect(s.workouts![0]).not.toHaveProperty('notes');
    expect(s.workouts![0]).not.toHaveProperty('photo');
  });

  it('rejects bad input', () => {
    expectFail(run(base(), { action: 'updateWorkout', id: 'nope', title: 'x' }), 'not found');
    expectFail(run(base(), { action: 'updateWorkout', id, title: '' }), 'title');
    expectFail(run(base(), { action: 'updateWorkout', id, date: '2026-10-20' }), 'future');
    expectFail(run(base(), { action: 'updateWorkout', id, when: '2026-10-20T10:00' }), 'future');
    expectFail(run(base(), { action: 'updateWorkout', id, date: '2026-10-05', when: '2026-10-06T10:00' }), 'do not match');
    expectFail(run(base(), { action: 'updateWorkout', id, date: 'soon' }), 'date');
    expectFail(run(base(), { action: 'updateWorkout', id, notes: 'x'.repeat(1001) }), 'notes');
    expectFail(run(base(), { action: 'updateWorkout', id, photo: 'x'.repeat(2001) }), 'photo');
    expectFail(run(base(), { action: 'updateWorkout', id, notes: 42 }), 'notes');
  });
});

describe('deleteWorkout', () => {
  it('removes the workout and its XP', () => {
    let s = expectOk(run(emptyState(), { action: 'saveWorkout', workout: input('2026-10-09') }));
    s = expectOk(run(s, { action: 'deleteWorkout', id: 'in-2026-10-09-db-ohp' }));
    expect(s.workouts).toEqual([]);
    expectOk(run(s, { action: 'deleteWorkout', id: 'gone' }));
    expectFail(run(s, { action: 'deleteWorkout', id: {} }), 'invalid id');
  });
});

describe('savePrefs', () => {
  const prefs = () => ({ ...defaultPrefs(), onboarded: true, weeklyGoal: 2, avoid: ['lunges'], limits: ['knees'], equipment: { kind: 'home', has: ['dumbbell'], dumbbellKg: [5, 10] } });

  it('saves valid prefs', () => {
    const s = expectOk(run(emptyState(), { action: 'savePrefs', prefs: prefs() }));
    expect(s.prefs).toEqual(prefs());
  });

  it('re-scores workouts when the weekly goal changes', () => {
    let s = emptyState();
    for (const d of ['2026-10-05', '2026-10-06']) s = expectOk(run(s, { action: 'saveWorkout', workout: input(d, { items: [training] }) }));
    expect(s.workouts!.map((w) => w.xp)).toEqual([85, 85]);
    s = expectOk(run(s, { action: 'savePrefs', prefs: prefs() }));
    expect(s.workouts!.map((w) => w.xp)).toEqual([85, 135]);
  });

  it('rejects bad input', () => {
    const bad = (over: Record<string, unknown>, part: string) => expectFail(run(emptyState(), { action: 'savePrefs', prefs: { ...prefs(), ...over } }), part);
    bad({ units: { weight: 'stone', distance: 'km' } }, 'units');
    bad({ units: { weight: 'kg', distance: 'ft' } }, 'units');
    bad({ equipment: { kind: 'space', has: [], dumbbellKg: [] } }, 'equipment');
    bad({ equipment: { kind: 'home', has: ['jetpack'], dumbbellKg: [] } }, 'equipment list');
    bad({ equipment: { kind: 'home', has: ['dumbbell', 'dumbbell'], dumbbellKg: [] } }, 'equipment list');
    bad({ equipment: { kind: 'home', has: [], dumbbellKg: [0] } }, 'dumbbell');
    bad({ equipment: { kind: 'home', has: [], dumbbellKg: Array.from({ length: 31 }, () => 5) } }, 'dumbbell');
    bad({ avoid: ['running'] }, 'avoid');
    bad({ limits: ['ego'] }, 'limits');
    bad({ weeklyGoal: 0 }, 'weekly goal');
    bad({ weeklyGoal: 8 }, 'weekly goal');
    bad({ weeklyGoal: 2.5 }, 'weekly goal');
    bad({ sound: 'yes' }, 'settings');
    expectFail(run(emptyState(), { action: 'savePrefs', prefs: null }), 'prefs');
  });
});

describe('addCustomExercise', () => {
  const custom = (over: Record<string, unknown> = {}) => ({ name: 'Sled Push', equipment: 'machine', primary: 'quads', secondary: ['glutes'], metric: 'weight_reps', ...over });

  it('adds an exercise with a server id, and it can be used in a routine and scored', () => {
    let s = expectOk(run(emptyState(), { action: 'addCustomExercise', exercise: custom() }));
    expect(s.customExercises).toEqual([{ id: 'custom-made-id', name: 'Sled Push', equipment: 'machine', primary: 'quads', secondary: ['glutes'], metric: 'weight_reps', custom: true }]);
    s = expectOk(run(s, { action: 'saveRoutine', routine: routine({ items: [{ exerciseId: 'custom-made-id', sets: [{ kg: 50, reps: 10 }] }] }) }));
    s = expectOk(run(s, { action: 'saveWorkout', workout: input('2026-10-09', {}, 'custom-made-id') }));
    expect(s.workouts![0].xp).toBe(5);
  });

  it('accepts a client id that starts with custom-', () => {
    const s = expectOk(run(emptyState(), { action: 'addCustomExercise', exercise: custom({ id: 'custom-abc123' }) }));
    expect(s.customExercises![0].id).toBe('custom-abc123');
  });

  it('rejects bad input and duplicates', () => {
    const bad = (over: Record<string, unknown>, part: string) => expectFail(run(emptyState(), { action: 'addCustomExercise', exercise: custom(over) }), part);
    bad({ name: '' }, 'name');
    bad({ name: 'x'.repeat(61) }, 'name');
    bad({ equipment: 'jetpack' }, 'equipment');
    bad({ primary: 'brain' }, 'muscle');
    bad({ metric: 'vibes' }, 'metric');
    bad({ secondary: ['quads'] }, 'secondary');
    bad({ secondary: ['a', 'b', 'c', 'd', 'e', 'f'] }, 'secondary');
    bad({ avoidTag: 'constructor' }, 'avoid tag');
    bad({ stresses: ['soul'] }, 'joints');
    bad({ id: 'pushup' }, 'id');
    bad({ id: 'custom-' }, 'id');
    bad({ name: 'push up' }, 'already exists'); // library name, any case
    const s = expectOk(run(emptyState(), { action: 'addCustomExercise', exercise: custom() }));
    expectFail(run(s, { action: 'addCustomExercise', exercise: custom({ name: 'SLED PUSH', id: 'custom-other' }) }), 'already exists');
    expectFail(run(s, { action: 'addCustomExercise', exercise: custom({ name: 'Other', id: 'custom-made-id' }) }), 'already exists');
    expectFail(run(emptyState(), { action: 'addCustomExercise', exercise: 'sled' }), 'invalid exercise');
  });

  it('stops at 200 custom exercises', () => {
    const many: AppState = {
      ...emptyState(),
      customExercises: Array.from({ length: LIMITS.customExercises }, (_, i) => ({ ...(exerciseById('pushup')!), id: `custom-x${i}`, name: `X${i}`, custom: true as const })),
    };
    expectFail(run(many, { action: 'addCustomExercise', exercise: custom() }), 'too many');
  });
});

describe('unknown action', () => {
  it('is refused', () => {
    expectFail(run(emptyState(), { action: 'tick' }), 'unknown action');
  });
});

describe('validation helpers', () => {
  it('checks real dates and times', () => {
    expect(isValidDate('2026-10-09')).toBe(true);
    expect(isValidDate('2026-02-30')).toBe(false);
    expect(isValidDate('2026-2-3')).toBe(false);
    expect(isValidDate(20261009)).toBe(false);
    expect(isValidWhen('2026-10-09T23:59')).toBe(true);
    expect(isValidWhen('2026-10-09T24:00')).toBe(false);
    expect(isValidWhen('2026-10-09T10:60')).toBe(false);
  });

  it('parses the pieces on their own', () => {
    const lookup = exerciseById;
    expect(parseRoutine({ id: 'a', title: 'A', items: [{ exerciseId: 'plank', sets: [{ sec: 30 }] }] }, lookup).ok).toBe(true);
    expect(parsePrefs(defaultPrefs()).ok).toBe(true);
    const w: WorkoutLog = workout('2026-10-09', [{ id: 'pushup', sets: [{ reps: 10 }] }]);
    expect(parseWorkoutInput(w, lookup).ok).toBe(true);
  });
});

describe('saveRoutine after', () => {
  const three = () => ({ ...emptyState(), routines: ['a', 'b', 'c'].map((id) => ({ id, title: id, items: [{ exerciseId: 'pushup', sets: [{ reps: 10 }] }] })) });

  it('puts a new routine right after the one named', () => {
    const next = expectOk(run(three(), { action: 'saveRoutine', routine: routine({ id: 'a2', title: 'a copy' }), after: 'a' }));
    expect(next.routines?.map((r) => r.id)).toEqual(['a', 'a2', 'b', 'c']);
  });

  it('appends when there is no anchor or it is unknown, and leaves an existing routine where it is', () => {
    expect(expectOk(run(three(), { action: 'saveRoutine', routine: routine({ id: 'd' }) })).routines?.map((r) => r.id)).toEqual(['a', 'b', 'c', 'd']);
    expect(expectOk(run(three(), { action: 'saveRoutine', routine: routine({ id: 'd' }), after: 'zzz' })).routines?.map((r) => r.id)).toEqual(['a', 'b', 'c', 'd']);
    expect(expectOk(run(three(), { action: 'saveRoutine', routine: routine({ id: 'b', title: 'renamed' }), after: 'c' })).routines?.map((r) => r.title)).toEqual(['a', 'renamed', 'c']);
  });

  it('rejects an anchor that is not an id', () => {
    expectFail(run(three(), { action: 'saveRoutine', routine: routine({ id: 'd' }), after: { $ne: 1 } }), 'invalid id');
  });
});

describe('setRulesV3Note', () => {
  it('puts the daily bonus note away, and leaves the earlier note alone', () => {
    const next = expectOk(run({ ...emptyState(), rulesV2Note: true, rulesV3Note: true }, { action: 'setRulesV3Note', value: false }));
    expect(next.rulesV3Note).toBe(false);
    expect(next.rulesV2Note).toBe(true);
  });

  it('is harmless when the note is already gone', () => {
    expect(expectOk(run(emptyState(), { action: 'setRulesV3Note', value: false })).rulesV3Note).toBe(false);
  });

  it('cannot raise the note, and only takes a boolean false', () => {
    for (const value of [true, 'false', 0, null, undefined]) expectFail(run(emptyState(), { action: 'setRulesV3Note', value }), 'invalid note flag');
  });
});

describe('setRulesNote', () => {
  it('puts the note away', () => {
    const next = expectOk(run({ ...emptyState(), rulesV2Note: true }, { action: 'setRulesNote', value: false }));
    expect(next.rulesV2Note).toBe(false);
  });

  it('is harmless when the note is already gone', () => {
    expect(expectOk(run(emptyState(), { action: 'setRulesNote', value: false })).rulesV2Note).toBe(false);
  });

  it('cannot raise the note, and only takes a boolean false', () => {
    for (const value of [true, 'false', 0, null, undefined]) expectFail(run(emptyState(), { action: 'setRulesNote', value }), 'invalid note flag');
  });
});
