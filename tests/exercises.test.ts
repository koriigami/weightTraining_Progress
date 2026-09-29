import { describe, expect, it } from 'vitest';
import {
  AVOID_TAGS,
  EQUIPMENT,
  EQUIPMENT_ORDER,
  EXERCISES,
  JOINTS,
  MUSCLES,
  MUSCLE_ORDER,
  QUICK_MUSCLE_GROUPS,
  exerciseById,
} from '../data/exercises';
import type { Metric } from '../data/exercises';
import {
  STARTER_GROUPS,
  STARTER_ROUTINES,
  availableEquipment,
  defaultPrefs,
  estimateMinutes,
  findDuplicateExercise,
  hasExercise,
  instantiateRoutine,
  isAvoided,
  makeLookup,
  pace,
  seedOwnerRoutines,
  workoutItemsFromRoutine,
} from '../lib/routines';
import type { Routine } from '../lib/routines';

// Which set fields belong to each metric.
const FIELDS: Record<Metric, string[]> = {
  weight_reps: ['kg', 'reps'],
  reps: ['reps'],
  time: ['sec'],
  distance_time: ['min', 'km'],
  intervals: ['on', 'off'],
};

describe('exercise library', () => {
  it('has about 100 exercises with unique ids and names', () => {
    expect(EXERCISES.length).toBeGreaterThanOrEqual(95);
    expect(EXERCISES.length).toBeLessThanOrEqual(125);
    expect(new Set(EXERCISES.map((e) => e.id)).size).toBe(EXERCISES.length);
    expect(new Set(EXERCISES.map((e) => e.name)).size).toBe(EXERCISES.length);
  });

  it('only uses known muscles, equipment, tags and joints', () => {
    for (const e of EXERCISES) {
      expect(MUSCLE_ORDER, e.id).toContain(e.primary);
      for (const m of e.secondary) {
        expect(MUSCLE_ORDER, e.id).toContain(m);
        expect(m, e.id).not.toBe(e.primary);
      }
      expect(new Set(e.secondary).size, e.id).toBe(e.secondary.length);
      expect(EQUIPMENT_ORDER, e.id).toContain(e.equipment);
      if (e.avoidTag) expect(Object.keys(AVOID_TAGS), e.id).toContain(e.avoidTag);
      for (const j of e.stresses ?? []) expect(Object.keys(JOINTS), e.id).toContain(j);
    }
  });

  it('has a label for every muscle and equipment type', () => {
    expect(Object.keys(MUSCLES).sort()).toEqual([...MUSCLE_ORDER].sort());
    expect(Object.keys(EQUIPMENT).sort()).toEqual([...EQUIPMENT_ORDER].sort());
    for (const g of QUICK_MUSCLE_GROUPS) for (const m of g.muscles) expect(MUSCLE_ORDER).toContain(m);
    expect(QUICK_MUSCLE_GROUPS.map((g) => g.label)).toEqual(['Push', 'Pull', 'Legs', 'Core', 'Arms']);
  });

  it('covers every muscle and every equipment type', () => {
    for (const m of MUSCLE_ORDER) expect(EXERCISES.some((e) => e.primary === m), m).toBe(true);
    for (const q of EQUIPMENT_ORDER) expect(EXERCISES.some((e) => e.equipment === q), q).toBe(true);
  });

  it('has the owner exercises', () => {
    for (const id of [
      'pushup', 'db-floor', 'db-fly', 'db-ohp', 'db-lat', 'db-ohext', 'db-kick', 'db-row', 'db-curl', 'db-hammer',
      'db-spider', 'db-sumo', 'bw-squat', 'db-goblet', 'db-rdl', 'db-calf', 'crunch', 'plank', 'treadmill', 'bike',
    ]) {
      expect(exerciseById(id), id).toBeDefined();
    }
  });

  it('tags distance cardio as run or ride where it counts toward a badge', () => {
    expect(exerciseById('run')!.cardioKind).toBe('run');
    expect(exerciseById('cycle')!.cardioKind).toBe('ride');
    expect(exerciseById('bike')!.cardioKind).toBe('ride');
    expect(exerciseById('rower')!.cardioKind).toBeUndefined();
  });
});

function checkRoutine(r: Routine) {
  expect(r.items.length, r.id).toBeGreaterThan(0);
  expect(findDuplicateExercise(r.items), r.id).toBeNull();
  for (const item of r.items) {
    const e = exerciseById(item.exerciseId);
    expect(e, `${r.id}: ${item.exerciseId}`).toBeDefined();
    expect(item.sets.length, `${r.id}: ${item.exerciseId}`).toBeGreaterThan(0);
    for (const set of item.sets) {
      for (const key of Object.keys(set)) {
        expect(FIELDS[e!.metric], `${r.id}: ${item.exerciseId} has ${key}`).toContain(key);
      }
    }
  }
}

describe('owner routines', () => {
  const seeds = seedOwnerRoutines();

  it('are the six plan sessions, once a week each', () => {
    expect(seeds.map((r) => r.title)).toEqual(['Push A', 'Pull A', 'Legs', 'Push B', 'Pull B', 'Full Body']);
    expect(new Set(seeds.map((r) => r.id)).size).toBe(6);
    for (const r of seeds) expect(r.timesPerWeek).toBe(1);
  });

  it('only use library exercises and matching set fields', () => {
    for (const r of seeds) checkRoutine(r);
  });

  it('use week 6 sets and reps and the default dumbbell weights', () => {
    const pushA = seeds[0];
    const fly = pushA.items.find((i) => i.exerciseId === 'db-fly')!;
    expect(fly.sets).toHaveLength(4); // week 6 has 4 sets of flyes
    expect(fly.sets[0]).toEqual({ kg: 5, reps: 10 });
    const row = seeds[1].items.find((i) => i.exerciseId === 'db-row')!;
    expect(row.sets[0].kg).toBe(10);
    const goblet = seeds[2].items.find((i) => i.exerciseId === 'db-goblet')!;
    expect(goblet.sets[0].kg).toBe(10);
    const ohext = pushA.items.find((i) => i.exerciseId === 'db-ohext')!;
    expect(ohext.sets).toHaveLength(3);
    expect(ohext.sets[0].kg).toBe(5);
  });
});

describe('starter routines', () => {
  it('only use library exercises and matching set fields', () => {
    expect(STARTER_ROUTINES.length).toBeGreaterThanOrEqual(12);
    expect(new Set(STARTER_ROUTINES.map((r) => r.id)).size).toBe(STARTER_ROUTINES.length);
    for (const r of STARTER_ROUTINES) checkRoutine(r);
  });

  it('include the Running, Walking and Cycling groups with interval sets', () => {
    const kinds = STARTER_GROUPS.map((g) => g.kind);
    expect(kinds).toEqual(expect.arrayContaining(['strength', 'running', 'walking', 'cycling']));
    const c25k = STARTER_ROUTINES.find((r) => r.title === 'Couch to 5K: Week 1')!;
    const intervals = c25k.items.find((i) => i.exerciseId === 'runwalk')!;
    expect(intervals.sets).toHaveLength(8);
    expect(intervals.sets[0]).toEqual({ on: 1, off: 1.5 });
  });

  it('can be copied with dumbbell weights set from the dumbbells the user has', () => {
    const src = STARTER_ROUTINES.find((r) => r.id === 'starter-arms-shoulders')!;
    const prefs = { ...defaultPrefs(), equipment: { kind: 'home' as const, has: ['dumbbell'], dumbbellKg: [2, 3, 5, 10] } };
    const copy = instantiateRoutine(src, 'mine-1', prefs);
    expect(copy.id).toBe('mine-1');
    expect(copy.items[0].sets[0].kg).toBe(5);
    expect(src.id).toBe('starter-arms-shoulders'); // the source is untouched
    expect(instantiateRoutine(src, 'x').items[0].sets[0].kg).toBe(5);
  });
});

describe('duplicate guard', () => {
  it('finds a repeated exercise and stays quiet otherwise', () => {
    expect(findDuplicateExercise([{ exerciseId: 'pushup' }, { exerciseId: 'plank' }])).toBeNull();
    expect(findDuplicateExercise([{ exerciseId: 'pushup' }, { exerciseId: 'plank' }, { exerciseId: 'pushup' }])).toBe('pushup');
    expect(findDuplicateExercise([])).toBeNull();
  });

  it('tells whether an exercise is already in a list', () => {
    const items = [{ exerciseId: 'pushup' }];
    expect(hasExercise(items, 'pushup')).toBe(true);
    expect(hasExercise(items, 'plank')).toBe(false);
  });
});

describe('pace', () => {
  it('is minutes per km, or per mile', () => {
    expect(pace(30, 5)).toBe('6:00 /km');
    expect(pace(25, 4)).toBe('6:15 /km');
    expect(pace(30, 5, 'mi')).toBe('9:39 /mi');
  });

  it('rolls 60 seconds into the next minute and is empty without both numbers', () => {
    expect(pace(29.99, 5)).toBe('6:00 /km');
    expect(pace(30, undefined)).toBe('');
    expect(pace(undefined, 5)).toBe('');
    expect(pace(0, 5)).toBe('');
  });
});

describe('estimated minutes', () => {
  it('counts 2.5 minutes a strength set and the stated time for cardio, rounded to 5', () => {
    const r = STARTER_ROUTINES.find((x) => x.id === 'starter-easy-run')!;
    expect(estimateMinutes(r.items)).toBe(30);
    const c25k = STARTER_ROUTINES.find((x) => x.id === 'starter-c25k-1')!;
    expect(estimateMinutes(c25k.items)).toBe(5 + 8 * 2.5);
    expect(estimateMinutes([{ exerciseId: 'pushup', sets: [{ reps: 10 }] }])).toBe(5); // never under 5
    expect(estimateMinutes([{ exerciseId: 'pushup', sets: Array.from({ length: 12 }, () => ({ reps: 10 })) }])).toBe(30);
  });
});

describe('avoid list and equipment', () => {
  const prefs = { ...defaultPrefs(), avoid: ['lunges', 'overhead'], limits: ['knees'] };

  it('flags avoided tags and joint limits', () => {
    expect(isAvoided(exerciseById('db-lunge')!, prefs)).toBe(true);
    expect(isAvoided(exerciseById('db-ohp')!, prefs)).toBe(true);
    expect(isAvoided(exerciseById('bw-squat')!, prefs)).toBe(true); // stresses knees
    expect(isAvoided(exerciseById('db-curl')!, prefs)).toBe(false);
    expect(isAvoided(exerciseById('burpee')!, prefs)).toBe(false);
  });

  it('builds the equipment set for gym, home and none', () => {
    const p = defaultPrefs();
    expect(availableEquipment({ equipment: { ...p.equipment, kind: 'gym' } }).size).toBe(EQUIPMENT_ORDER.length);
    expect([...availableEquipment({ equipment: { ...p.equipment, kind: 'none', has: ['dumbbell'] } })]).toEqual(['bodyweight']);
    expect([...availableEquipment({ equipment: { ...p.equipment, kind: 'home', has: ['dumbbell', 'bogus'] } })].sort()).toEqual(['bodyweight', 'dumbbell']);
  });
});

describe('custom exercises and workout prefill', () => {
  it('resolve through the lookup after the library', () => {
    const custom = { id: 'custom-1', name: 'Sled Push', equipment: 'machine' as const, primary: 'quads' as const, secondary: [], metric: 'weight_reps' as const, custom: true as const };
    const lookup = makeLookup([custom]);
    expect(lookup('custom-1')?.name).toBe('Sled Push');
    expect(lookup('pushup')?.name).toBe('Push Up');
    expect(lookup('nope')).toBeUndefined();
  });

  it('starts a workout from a routine with nothing ticked', () => {
    const items = workoutItemsFromRoutine(seedOwnerRoutines()[0]);
    expect(items.length).toBeGreaterThan(0);
    expect(items.every((i) => i.sets.every((s) => s.done === false))).toBe(true);
  });
});
