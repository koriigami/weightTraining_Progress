import { describe, expect, it } from 'vitest';
import { applyRoutineAction, isRoutineAction } from '../lib/routineActions';
import type { ActionResult } from '../lib/routineActions';
import { NEWS, latestNewsId } from '../lib/news';
import type { NewsEntry } from '../lib/news';
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

  it('pays the weekly goal bonus more for each week in a row, and keeps the run in xpParts', () => {
    let s = emptyState();
    for (const d of ['2026-09-21', '2026-09-22', '2026-09-23', '2026-09-28', '2026-09-29', '2026-09-30', '2026-10-05', '2026-10-06', '2026-10-07']) {
      s = expectOk(run(s, { action: 'saveWorkout', workout: input(d, { items: [training] }) }));
    }
    expect(s.workouts!.map((w) => w.xp)).toEqual([85, 85, 135, 85, 85, 145, 85, 85, 155]);
    expect(s.workouts!.at(-1)!.xpParts).toMatchObject({ weekly: 70, weekRun: 3 });
    expect(s.workouts![0].xpParts).not.toHaveProperty('weekRun');
  });
});

describe('workout source', () => {
  const save = (source: unknown) => run(emptyState(), { action: 'saveWorkout', workout: { ...input('2026-10-09'), ...(source === undefined ? {} : { source }) } });

  it('accepts live and log, and an absent source stays absent', () => {
    expect(expectOk(save('live')).workouts![0].source).toBe('live');
    expect(expectOk(save('log')).workouts![0].source).toBe('log');
    expect(expectOk(save(undefined)).workouts![0].source).toBeUndefined();
  });

  it('refuses any other source', () => {
    for (const bad of ['import', '', 1, null, true]) expect(save(bad).ok).toBe(false);
  });

  it('keeps the source when the workout is edited', () => {
    const s = expectOk(save('log'));
    const edited = expectOk(run(s, { action: 'updateWorkout', id: s.workouts![0].id, title: 'Renamed', source: 'live' }));
    expect(edited.workouts![0].source).toBe('log');
  });
});

describe('how it felt', () => {
  const id = 'in-2026-10-09-db-ohp';
  const save = (extra: Record<string, unknown>) => run(emptyState(), { action: 'saveWorkout', workout: { ...input('2026-10-09'), ...extra } });
  const edit = (s: AppState, patch: Record<string, unknown>) => run(s, { action: 'updateWorkout', id, ...patch });
  const felt = (s: AppState) => ({ feel: s.workouts![0].feel, effort: s.workouts![0].effort });

  it('accepts each face and each effort from 1 to 10, and a workout without them has neither', () => {
    for (const feel of ['rough', 'tough', 'ok', 'good', 'great']) expect(expectOk(save({ feel })).workouts![0].feel).toBe(feel);
    for (let effort = 1; effort <= 10; effort++) expect(expectOk(save({ effort })).workouts![0].effort).toBe(effort);
    expect(felt(expectOk(save({})))).toEqual({ feel: undefined, effort: undefined });
  });

  it('refuses any other face, and an effort that is not a whole number from 1 to 10', () => {
    for (const feel of ['meh', '', 'Good', 3, null, true]) expectFail(save({ feel }), 'feel');
    for (const effort of [0, 11, -1, 6.5, '6', null, true]) expectFail(save({ effort }), 'effort');
  });

  it('sets and changes them on an edit', () => {
    let s = expectOk(save({}));
    s = expectOk(edit(s, { feel: 'tough', effort: 8 }));
    expect(felt(s)).toEqual({ feel: 'tough', effort: 8 });
    s = expectOk(edit(s, { feel: 'great' }));
    expect(felt(s)).toEqual({ feel: 'great', effort: 8 });
  });

  it('clears with null, and clearing one leaves the other', () => {
    const s = expectOk(save({ feel: 'good', effort: 6 }));
    const noFace = expectOk(edit(s, { feel: null }));
    expect(noFace.workouts![0]).not.toHaveProperty('feel');
    expect(noFace.workouts![0].effort).toBe(6);
    const noEffort = expectOk(edit(s, { effort: null }));
    expect(noEffort.workouts![0]).not.toHaveProperty('effort');
    expect(noEffort.workouts![0].feel).toBe('good');
  });

  it('refuses a bad value on an edit and changes nothing', () => {
    const s = expectOk(save({ feel: 'good', effort: 6 }));
    expectFail(edit(s, { feel: 'meh' }), 'feel');
    expectFail(edit(s, { effort: 6.5 }), 'effort');
    expectFail(edit(s, { effort: 11 }), 'effort');
    expect(felt(s)).toEqual({ feel: 'good', effort: 6 });
  });

  it('keeps them when other parts of the workout are edited', () => {
    const s = expectOk(save({ feel: 'good', effort: 6 }));
    const edited = expectOk(edit(s, { title: 'Renamed', notes: 'Heavy', date: '2026-10-08' }));
    expect(felt(edited)).toEqual({ feel: 'good', effort: 6 });
  });

  it('earns no XP: the same workout scores the same with and without them', () => {
    const plain = expectOk(save({ items: [training] })).workouts![0];
    const rated = expectOk(save({ items: [training], feel: 'great', effort: 10 })).workouts![0];
    expect(rated.xp).toBe(plain.xp);
    expect(rated.xpParts).toEqual(plain.xpParts);
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

describe('laps', () => {
  const day = '2026-10-09';
  const withLaps = (laps: unknown, exerciseId = 'run') => {
    const set = exerciseId === 'run' ? { min: 30, km: 5, done: true } : { reps: 10, done: true };
    return input(day, { items: [{ exerciseId, sets: [{ ...set, laps }] }] }, exerciseId);
  };
  const save = (laps: unknown, exerciseId?: string) => run(emptyState(), { action: 'saveWorkout', workout: withLaps(laps, exerciseId) });
  const good = [{ sec: 360, km: 1 }, { sec: 98 }];

  it('accepts good laps on a run, on save and on edit', () => {
    const saved = expectOk(save(good));
    expect(saved.workouts![0].items[0].sets[0].laps).toEqual(good);
    const edited = expectOk(run(saved, { action: 'updateWorkout', id: `in-${day}-run`, items: [{ exerciseId: 'run', sets: [{ min: 30, km: 5, done: true, laps: [{ sec: 100 }] }] }] }));
    expect(edited.workouts![0].items[0].sets[0].laps).toEqual([{ sec: 100 }]);
  });

  it('accepts 200 laps, an empty list as none, and a workout with no laps at all', () => {
    expectOk(save(Array.from({ length: 200 }, () => ({ sec: 60 }))));
    expect(expectOk(save([])).workouts![0].items[0].sets[0].laps).toBeUndefined();
    expect(expectOk(run(emptyState(), { action: 'saveWorkout', workout: input(day, { items: [{ exerciseId: 'run', sets: [{ min: 30, km: 5, done: true }] }] }, 'run') })).workouts).toHaveLength(1);
  });

  it('rejects more than 200 laps', () => {
    expectFail(save(Array.from({ length: 201 }, () => ({ sec: 60 }))), 'too many laps');
  });

  it('rejects a lap time of 0, a fraction, or over 86,400', () => {
    expectFail(save([{ sec: 0 }]), 'lap time');
    expectFail(save([{ sec: 59.5 }]), 'lap time');
    expectFail(save([{ sec: 86401 }]), 'lap time');
    expectFail(save([{ sec: '60' }]), 'lap time');
    expectOk(save([{ sec: 86400 }]));
  });

  it('rejects a lap distance outside 0 to 100 km', () => {
    expectFail(save([{ sec: 60, km: -1 }]), 'distance');
    expectFail(save([{ sec: 60, km: 100.5 }]), 'distance');
    expectOk(save([{ sec: 60, km: 100 }, { sec: 60, km: 0 }]));
  });

  it('rejects laps that are not a list of laps', () => {
    expectFail(save('nope'), 'invalid laps');
    expectFail(save([5]), 'invalid lap');
  });

  it('rejects laps on a metric other than distance_time', () => {
    expectFail(save(good, 'pushup'), 'laps only belong on distance cardio');
    const saved = expectOk(save(good));
    expectFail(run(saved, { action: 'updateWorkout', id: `in-${day}-run`, items: [{ exerciseId: 'pushup', sets: [{ reps: 10, done: true, laps: good }] }] }), 'laps only belong');
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

describe('setRulesV4Note', () => {
  it('puts the weekly goal bonus note away, and leaves the earlier notes alone', () => {
    const next = expectOk(run({ ...emptyState(), rulesV2Note: true, rulesV3Note: true, rulesV4Note: true }, { action: 'setRulesV4Note', value: false }));
    expect(next.rulesV4Note).toBe(false);
    expect(next.rulesV3Note).toBe(true);
    expect(next.rulesV2Note).toBe(true);
  });

  it('is harmless when the note is already gone', () => {
    expect(expectOk(run(emptyState(), { action: 'setRulesV4Note', value: false })).rulesV4Note).toBe(false);
  });

  it('cannot raise the note, and only takes a boolean false', () => {
    for (const value of [true, 'false', 0, null, undefined]) expectFail(run(emptyState(), { action: 'setRulesV4Note', value }), 'invalid note flag');
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

describe('savePrefs and the guide', () => {
  const finished = () => ({ ...defaultPrefs(), onboarded: true });
  // Someone who signed up before the guide existed and has not finished the setup questions.
  const notYet = (): AppState => ({ ...emptyState(), prefs: defaultPrefs() });

  it('finishing the setup questions for the first time makes the guide wait and marks the updates so far as seen', () => {
    const next = expectOk(run(notYet(), { action: 'savePrefs', prefs: finished() }));
    expect(next.guideDone).toBe(false);
    expect(next.newsSeen).toBe(latestNewsId());
  });

  it('leaves a guide that was already played, and an update already seen, as they were', () => {
    const next = expectOk(run({ ...notYet(), guideDone: true, newsSeen: '2020-01' }, { action: 'savePrefs', prefs: finished() }));
    expect(next.guideDone).toBe(true);
    expect(next.newsSeen).toBe('2020-01');
  });

  it('changes neither on a later visit to the setup questions', () => {
    const existing: AppState = { ...emptyState(), prefs: finished() };
    const next = expectOk(run(existing, { action: 'savePrefs', prefs: { ...finished(), weeklyGoal: 4 } }));
    expect(next).not.toHaveProperty('guideDone');
    expect(next).not.toHaveProperty('newsSeen');
    const played = expectOk(run({ ...existing, guideDone: true, newsSeen: '2020-01' }, { action: 'savePrefs', prefs: finished() }));
    expect([played.guideDone, played.newsSeen]).toEqual([true, '2020-01']);
  });

  it('changes neither while the setup questions are still not finished, or for someone with no stored prefs', () => {
    const unfinished = expectOk(run(notYet(), { action: 'savePrefs', prefs: { ...defaultPrefs(), weeklyGoal: 4 } }));
    expect(unfinished).not.toHaveProperty('guideDone');
    // No stored prefs reads as set up already (the owner), so saving a setting is not finishing onboarding.
    const owner = expectOk(run(emptyState(), { action: 'savePrefs', prefs: finished() }));
    expect(owner).not.toHaveProperty('guideDone');
    expect(owner).not.toHaveProperty('newsSeen');
  });
});

describe('setGuideDone', () => {
  it('marks the guide done, and keeps everything else', () => {
    const next = expectOk(run({ ...emptyState(), guideDone: false, newsSeen: '2026-10', rulesV4Note: true }, { action: 'setGuideDone', value: true }));
    expect(next).toMatchObject({ guideDone: true, newsSeen: '2026-10', rulesV4Note: true });
  });

  it('only takes a boolean true, so it cannot raise the guide again', () => {
    for (const value of [false, 'true', 1, null, undefined]) expectFail(run({ ...emptyState(), guideDone: true }, { action: 'setGuideDone', value }), 'invalid guide flag');
  });

  it('is a state action the route accepts', () => {
    expect(isRoutineAction('setGuideDone')).toBe(true);
    expect(isRoutineAction('setNewsSeen')).toBe(true);
  });
});

describe('setNewsSeen', () => {
  const page = { title: 'A page', text: 'Words', image: '/news/a.jpg' };
  const entry = (id: string, rules?: boolean): NewsEntry => ({ id, date: `${id}-01`, label: id, pages: [rules ? { ...page, rules: true } : page] });
  const plain = [entry('2027-02'), entry('2027-01')]; // newest first, no rules page
  const withRules = [entry('2027-02'), entry('2027-01', true)];
  const waiting: AppState = { ...emptyState(), rulesV2Note: true, rulesV3Note: true, rulesV4Note: true };
  const seeNews = (state: AppState, id: unknown, news?: NewsEntry[]) => applyRoutineAction(state, { action: 'setNewsSeen', id }, { ...ctx, news });

  it('remembers the update, and keeps everything else', () => {
    const next = expectOk(run({ ...emptyState(), guideDone: true }, { action: 'setNewsSeen', id: NEWS[0].id }));
    expect(next).toMatchObject({ newsSeen: NEWS[0].id, guideDone: true });
  });

  it('refuses an id that is not in the update list', () => {
    for (const id of ['2019-01', '', 5, null, undefined, { $ne: 1 }]) expectFail(run(emptyState(), { action: 'setNewsSeen', id }), 'unknown update');
  });

  it('clears the rules notes that are waiting when the update has a rules page, and nothing else', () => {
    const next = expectOk(run(waiting, { action: 'setNewsSeen', id: '2026-10' })); // the real October update has one
    expect(next).toMatchObject({ rulesV2Note: false, rulesV3Note: false, rulesV4Note: false });
    // A note that was never raised stays unset instead of becoming false.
    expect(expectOk(run({ ...emptyState(), rulesV4Note: true }, { action: 'setNewsSeen', id: '2026-10' }))).not.toHaveProperty('rulesV2Note');
  });

  it('leaves the rules notes alone for an update with no rules page', () => {
    const next = expectOk(seeNews(waiting, '2027-02', plain));
    expect(next).toMatchObject({ newsSeen: '2027-02', rulesV2Note: true, rulesV3Note: true, rulesV4Note: true });
  });

  it('clears the notes when an older unseen update with a rules page is closed along with a newer one', () => {
    expect(expectOk(seeNews(waiting, '2027-02', withRules)).rulesV4Note).toBe(false);
    // Once the rules update was seen, closing a later one does not touch a note.
    expect(expectOk(seeNews({ ...waiting, newsSeen: '2027-01' }, '2027-02', withRules)).rulesV4Note).toBe(true);
  });

  it('never moves what is remembered back to an older update', () => {
    const next = expectOk(seeNews({ ...emptyState(), newsSeen: '2027-02' }, '2027-01', plain));
    expect(next.newsSeen).toBe('2027-02');
  });
});

