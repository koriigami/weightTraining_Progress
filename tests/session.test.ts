import { EXERCISES, exerciseById } from '../data/exercises';
import { describe, expect, it } from 'vitest';
import {
  addBlankLap,
  addExercise,
  addLap,
  addSet,
  buildWorkoutInput,
  buildWorkoutPatch,
  cardioSession,
  defaultTitle,
  formatElapsed,
  localDate,
  localWhen,
  moveExercise,
  newSession,
  parseStoredSession,
  removeExercise,
  removeLap,
  removeSet,
  replaceExercise,
  restoreExercise,
  serializeSession,
  sessionFromRoutine,
  sessionFromWorkout,
  sessionTotals,
  setCounts,
  setItemNotes,
  setTitle,
  syncFollow,
  toggleSet,
  updateCardio,
  updateLap,
  updateSet,
} from '../lib/session';
import type { Session, SessionResult } from '../lib/session';
import { applyRoutineAction } from '../lib/routineActions';
import { emptyState } from '../lib/progress';
import { LIMITS, availableEquipment, defaultPrefs, isAvoided, ownerPrefs, resolvePrefs, weeklyGoalOf } from '../lib/routines';
import { seedRoutines } from './fixtures/seedRoutines';
import type { Routine } from '../lib/routines';
import { makeLookup } from '../lib/routines';
import { newUserState } from '../lib/store';

// 10 Oct 2026, 18:05 on the device clock.
const NOW = new Date(2026, 9, 10, 18, 5, 30);

const routine: Routine = {
  id: 'push-a',
  title: 'Push A',
  items: [
    { exerciseId: 'pushup', sets: [{ reps: 10 }, { reps: 10 }] },
    { exerciseId: 'db-ohp', notes: 'Slow', sets: [{ kg: 5, reps: 10 }, { kg: 5, reps: 10 }, { kg: 7.5, reps: 8 }] },
  ],
};

function must(r: SessionResult): Session {
  if (!r.ok) throw new Error(`expected ok, got: ${r.error}`);
  return r.session;
}

function mustFail(r: SessionResult, part: string) {
  expect(r.ok).toBe(false);
  if (!r.ok) expect(r.error).toContain(part);
}

describe('starting', () => {
  it('starts an empty workout titled from the time of day', () => {
    const s = newSession(NOW);
    expect(s.title).toBe('Evening workout');
    expect(s.items).toEqual([]);
    expect(s.routineId).toBeUndefined();
    expect(s.startedAt).toBe(NOW.toISOString());
  });

  it('titles by the hour', () => {
    expect(defaultTitle(new Date(2026, 0, 1, 7))).toBe('Morning workout');
    expect(defaultTitle(new Date(2026, 0, 1, 13))).toBe('Afternoon workout');
    expect(defaultTitle(new Date(2026, 0, 1, 22))).toBe('Night workout');
    expect(defaultTitle(new Date(2026, 0, 1, 2))).toBe('Night workout');
  });

  it('prefills sets from a routine, none ticked, without touching the routine', () => {
    const s = sessionFromRoutine(routine, NOW);
    expect(s.title).toBe('Push A');
    expect(s.routineId).toBe('push-a');
    expect(s.items.map((i) => i.exerciseId)).toEqual(['pushup', 'db-ohp']);
    expect(s.items[1].sets).toEqual([
      { kg: 5, reps: 10, done: false },
      { kg: 5, reps: 10, done: false },
      { kg: 7.5, reps: 8, done: false },
    ]);
    expect(s.items[1].notes).toBe('Slow');
    expect(routine.items[1].sets[0]).toEqual({ kg: 5, reps: 10 });
  });

  it('starts a cardio workout as one distance exercise with a blank set', () => {
    expect(must(cardioSession('run', NOW)).items[0].exerciseId).toBe('run');
    expect(must(cardioSession('walk', NOW)).title).toBe('Walk');
    const ride = must(cardioSession('cycle', NOW));
    expect(ride.title).toBe('Ride');
    expect(ride.items[0].sets).toEqual([{ done: false }]);
    expect(ride.plan).toEqual([{ exerciseId: 'cycle', sets: 1 }]);
    expect(ride.follow).toEqual(['cycle']);
  });
});

describe('adding and removing exercises', () => {
  it('adds an exercise with one blank set', () => {
    const s = must(addExercise(newSession(NOW), 'db-curl'));
    expect(s.items).toEqual([{ exerciseId: 'db-curl', sets: [{ kg: 0, reps: 10, done: false }] }]);
  });

  it('rejects a duplicate with a sentence that names both', () => {
    const s = sessionFromRoutine(routine, NOW);
    mustFail(addExercise(s, 'pushup'), 'Push Up is already in Push A.');
  });

  it('rejects an unknown exercise and a workout with too many', () => {
    mustFail(addExercise(newSession(NOW), 'nope'), 'not available');
    let s = newSession(NOW);
    const ids = ['db-bench', 'bb-bench', 'db-floor', 'pushup', 'db-fly', 'cable-fly', 'db-ohp', 'bb-ohp', 'db-lat', 'face-pull'];
    for (const id of ids) s = must(addExercise(s, id));
    expect(s.items).toHaveLength(ids.length);
    // fill up to the limit with anything valid, then one more
    
    for (const e of EXERCISES) {
      if (s.items.length >= LIMITS.itemsPerList) break;
      const r = addExercise(s, e.id);
      if (r.ok) s = r.session;
    }
    expect(s.items).toHaveLength(LIMITS.itemsPerList);
    const extra = EXERCISES.find((e) => !s.items.some((i) => i.exerciseId === e.id))!;
    mustFail(addExercise(s, extra.id), 'up to');
  });

  it('finds custom exercises through the lookup', () => {
    const custom = { id: 'custom-towel-row', name: 'Towel Row', equipment: 'bodyweight', primary: 'lats', secondary: [], metric: 'reps', custom: true } as const;
    const lookup = makeLookup([custom as never]);
    const s = must(addExercise(newSession(NOW), 'custom-towel-row', lookup));
    expect(s.items[0].sets).toEqual([{ reps: 10, done: false }]);
    mustFail(addExercise(newSession(NOW), 'custom-towel-row'), 'not available');
  });

  it('removes an exercise and can undo it in place', () => {
    const s = sessionFromRoutine(routine, NOW);
    const r = removeExercise(s, 0)!;
    expect(r.session.items.map((i) => i.exerciseId)).toEqual(['db-ohp']);
    expect(r.session.plan).toEqual(s.plan); // the plan keeps the removed exercise
    expect(r.removed.exerciseId).toBe('pushup');
    const back = restoreExercise(r.session, r.removed, r.index);
    expect(back.items.map((i) => i.exerciseId)).toEqual(['pushup', 'db-ohp']);
    expect(removeExercise(s, 9)).toBeNull();
  });

  it('undo does nothing when the exercise was added again meanwhile', () => {
    const s = sessionFromRoutine(routine, NOW);
    const r = removeExercise(s, 0)!;
    const again = must(addExercise(r.session, 'pushup'));
    const back = restoreExercise(again, r.removed, 0);
    expect(back.items.filter((i) => i.exerciseId === 'pushup')).toHaveLength(1);
    expect(back).toBe(again);
  });
});

describe('replace and move', () => {
  it('replaces an exercise, keeping the number of sets', () => {
    const s = must(replaceExercise(sessionFromRoutine(routine, NOW), 1, 'db-lat'));
    expect(s.items[1].exerciseId).toBe('db-lat');
    expect(s.items[1].sets).toHaveLength(3);
    expect(s.items[1].sets.every((x) => !x.done)).toBe(true);
    expect(s.items[1].notes).toBeUndefined();
  });

  it('refuses to replace with an exercise that is already in the workout', () => {
    mustFail(replaceExercise(sessionFromRoutine(routine, NOW), 1, 'pushup'), 'Push Up is already in Push A.');
  });

  it('replacing with itself is a no-op', () => {
    const s = sessionFromRoutine(routine, NOW);
    expect(must(replaceExercise(s, 0, 'pushup'))).toBe(s);
  });

  it('moves up and down and stays put at the ends', () => {
    const s = sessionFromRoutine(routine, NOW);
    expect(moveExercise(s, 0, 1).items.map((i) => i.exerciseId)).toEqual(['db-ohp', 'pushup']);
    expect(moveExercise(s, 0, -1)).toBe(s);
    expect(moveExercise(s, 1, 1)).toBe(s);
  });
});

describe('sets', () => {
  it('a new set copies the last one and is not ticked', () => {
    let s = sessionFromRoutine(routine, NOW);
    s = toggleSet(s, 1, 2);
    const next = must(addSet(s, 1));
    expect(next.items[1].sets).toHaveLength(4);
    expect(next.items[1].sets[3]).toEqual({ kg: 7.5, reps: 8, done: false });
  });

  it('caps sets per exercise', () => {
    let s = sessionFromRoutine(routine, NOW);
    for (let i = 0; i < LIMITS.setsPerItem; i++) {
      const r = addSet(s, 0);
      if (r.ok) s = r.session;
    }
    expect(s.items[0].sets).toHaveLength(LIMITS.setsPerItem);
    mustFail(addSet(s, 0), 'up to');
  });

  it('removes a set but never the last one', () => {
    const s = sessionFromRoutine(routine, NOW);
    expect(must(removeSet(s, 0, 0)).items[0].sets).toHaveLength(1);
    mustFail(removeSet(must(removeSet(s, 0, 0)), 0, 0), 'at least one set');
  });

  it('updates fields, and an empty value clears the field', () => {
    let s = sessionFromRoutine(routine, NOW);
    s = updateSet(s, 1, 0, { kg: 12.5, reps: 8 });
    expect(s.items[1].sets[0]).toEqual({ kg: 12.5, reps: 8, done: false });
    s = updateSet(s, 1, 0, { kg: undefined });
    expect(s.items[1].sets[0]).toEqual({ reps: 8, done: false });
    s = updateSet(s, 1, 0, { reps: Number.NaN });
    expect(s.items[1].sets[0]).toEqual({ done: false });
    s = updateSet(s, 1, 0, { kg: -3 });
    expect(s.items[1].sets[0].kg).toBeUndefined();
  });

  it('toggles a set and counts', () => {
    let s = sessionFromRoutine(routine, NOW);
    expect(setCounts(s)).toEqual({ done: 0, total: 5, unticked: 5 });
    s = toggleSet(toggleSet(s, 0, 0), 1, 1);
    expect(setCounts(s)).toEqual({ done: 2, total: 5, unticked: 3 });
    s = toggleSet(s, 0, 0);
    expect(setCounts(s).done).toBe(1);
    expect(toggleSet(s, 9, 0)).toBe(s);
  });

  it('works out totals from ticked sets only', () => {
    let s = sessionFromRoutine(routine, NOW);
    s = toggleSet(toggleSet(s, 0, 0), 1, 0);
    const t = sessionTotals(s);
    expect(t.sets).toBe(2);
    expect(t.xp).toBe(10);
    expect(t.volume).toBe(50);
  });

  it('sets the title and exercise notes', () => {
    let s = setTitle(sessionFromRoutine(routine, NOW), 'Heavy push');
    expect(s.title).toBe('Heavy push');
    s = setItemNotes(s, 0, 'Tempo 3-1-1');
    expect(s.items[0].notes).toBe('Tempo 3-1-1');
    s = setItemNotes(s, 0, '   ');
    expect(s.items[0].notes).toBeUndefined();
  });
});

describe('finishing', () => {
  it('needs at least one ticked set', () => {
    const r = buildWorkoutInput(sessionFromRoutine(routine, NOW), { now: NOW });
    expect(r).toEqual({ ok: false, error: 'Tick at least one set first.' });
    expect(buildWorkoutInput(newSession(NOW), { now: NOW }).ok).toBe(false);
  });

  it('keeps only ticked sets and drops exercises with none', () => {
    let s = sessionFromRoutine(routine, NOW);
    s = toggleSet(toggleSet(s, 1, 0), 1, 2);
    const r = buildWorkoutInput(s, { now: NOW, id: 'w-test' });
    if (!r.ok) throw new Error(r.error);
    expect(r.workout.items).toEqual([
      { exerciseId: 'db-ohp', notes: 'Slow', sets: [{ done: true, kg: 5, reps: 10 }, { done: true, kg: 7.5, reps: 8 }] },
    ]);
  });

  it('takes date and time from the device clock, in local time', () => {
    let s = sessionFromRoutine(routine, new Date(2026, 9, 10, 17, 30));
    s = toggleSet(s, 0, 0);
    const r = buildWorkoutInput(s, { now: NOW });
    if (!r.ok) throw new Error(r.error);
    expect(r.workout.date).toBe('2026-10-10');
    expect(r.workout.when).toBe('2026-10-10T18:05');
    expect(r.workout.startedAt).toBe(new Date(2026, 9, 10, 17, 30).toISOString());
    expect(r.workout.finishedAt).toBe(NOW.toISOString());
    expect(r.workout.routineId).toBe('push-a');
    expect(r.workout.title).toBe('Push A');
    expect(localDate(NOW)).toBe('2026-10-10');
    expect(localWhen(NOW)).toBe('2026-10-10T18:05');
  });

  it('cleans sets: only the fields the exercise uses, whole reps, inside the ranges', () => {
    let s = newSession(NOW, { title: '  ' });
    s = must(addExercise(s, 'pushup'));
    s = updateSet(s, 0, 0, { kg: 20, reps: 9.6 });
    s = toggleSet(s, 0, 0);
    s = must(addExercise(s, 'run'));
    s = updateSet(s, 1, 0, { min: 2000, km: 5.5 });
    s = toggleSet(s, 1, 0);
    const r = buildWorkoutInput(s, { now: NOW });
    if (!r.ok) throw new Error(r.error);
    expect(r.workout.items[0].sets).toEqual([{ done: true, reps: 10 }]);
    expect(r.workout.items[1].sets).toEqual([{ done: true, min: 1440, km: 5.5 }]);
    expect(r.workout.title).toBe('Evening workout');
  });

  it('cuts a workout left open for more than a day down to fit', () => {
    let s = sessionFromRoutine(routine, new Date(2026, 9, 8, 9, 0));
    s = toggleSet(s, 0, 0);
    const r = buildWorkoutInput(s, { now: NOW });
    if (!r.ok) throw new Error(r.error);
    const span = Date.parse(r.workout.finishedAt) - Date.parse(r.workout.startedAt);
    expect(span).toBeLessThan(24 * 3600 * 1000);
    expect(span).toBeGreaterThan(23 * 3600 * 1000);
  });

  it('produces a payload the saveWorkout action accepts, and scores it', () => {
    let s = sessionFromRoutine(routine, NOW);
    s = toggleSet(toggleSet(s, 0, 0), 1, 0);
    const r = buildWorkoutInput(s, { now: NOW });
    if (!r.ok) throw new Error(r.error);
    const state = { ...emptyState(), prefs: { ...defaultPrefs(), onboarded: true } };
    const saved = applyRoutineAction(state, { action: 'saveWorkout', workout: r.workout }, { today: '2026-10-10' });
    if (!saved.ok) throw new Error(saved.error);
    const w = saved.state.workouts![0];
    expect(w.id).toBe(r.workout.id);
    // The routine planned 2 push-ups and 3 presses, so 2 ticked sets do not finish it.
    expect(r.workout.plan).toEqual([
      { exerciseId: 'pushup', sets: 2 },
      { exerciseId: 'db-ohp', sets: 3 },
    ]);
    expect(w.xp).toBe(10);
    expect(w.planComplete).toBe(false);
    expect(w.planMissing).toEqual(['pushup', 'db-ohp']);
  });

  it('removing a planned exercise mid-workout leaves the plan intact and does not change the daily bonus', () => {
    const lift: Routine = {
      id: 'lift',
      title: 'Lift',
      items: [
        { exerciseId: 'pushup', sets: [{ reps: 10 }, { reps: 10 }] },
        { exerciseId: 'db-ohp', sets: Array.from({ length: 8 }, () => ({ kg: 5, reps: 10 })) },
        { exerciseId: 'plank', sets: [{ sec: 30 }] },
      ],
    };
    const finish = (removePlank: boolean) => {
      let s = sessionFromRoutine(lift, NOW);
      for (const [item, count] of [[0, 2], [1, 8]]) for (let i = 0; i < count; i++) s = toggleSet(s, item, i);
      if (removePlank) s = removeExercise(s, 2)!.session;
      const r = buildWorkoutInput(s, { now: NOW });
      if (!r.ok) throw new Error(r.error);
      const saved = applyRoutineAction(emptyState(), { action: 'saveWorkout', workout: r.workout }, { today: '2026-10-10' });
      if (!saved.ok) throw new Error(saved.error);
      return { plan: r.workout.plan, scored: saved.state.workouts![0] };
    };
    const left = finish(false); // the plank is still there, never ticked
    const removed = finish(true);
    expect(removed.plan).toEqual(left.plan);
    expect(removed.plan).toContainEqual({ exerciseId: 'plank', sets: 1 });
    // Ten sets are 30 minutes: the bonus is paid either way, and the plank is not done either way.
    expect(removed.scored.xpParts).toMatchObject({ sets: 50, finish: 50 });
    expect(removed.scored.xp).toBe(left.scored.xp);
    expect(removed.scored.planMissing).toEqual(['plank']);
  });

  it('a payload with a routine id and custom title still parses', () => {
    let s = setTitle(sessionFromRoutine(routine, NOW), 'Chest and shoulders');
    s = toggleSet(s, 0, 1);
    const r = buildWorkoutInput(s, { now: NOW });
    if (!r.ok) throw new Error(r.error);
    const saved = applyRoutineAction(emptyState(), { action: 'saveWorkout', workout: r.workout }, { today: '2026-10-10' });
    expect(saved.ok).toBe(true);
  });
});

describe('saving to localStorage', () => {
  it('round trips a session', () => {
    let s = sessionFromRoutine(routine, NOW);
    s = toggleSet(updateSet(s, 1, 0, { kg: 9 }), 1, 0);
    expect(parseStoredSession(serializeSession(s))).toEqual(s);
  });

  it('rejects anything that does not look like a session', () => {
    expect(parseStoredSession(null)).toBeNull();
    expect(parseStoredSession('')).toBeNull();
    expect(parseStoredSession('{nope')).toBeNull();
    expect(parseStoredSession('[]')).toBeNull();
    expect(parseStoredSession(JSON.stringify({ title: 'x', startedAt: 'not a date', items: [] }))).toBeNull();
    expect(parseStoredSession(JSON.stringify({ title: 'x', startedAt: NOW.toISOString(), items: [{ exerciseId: 'pushup', sets: [{ reps: 1 }] }] }))).toBeNull();
    expect(parseStoredSession(JSON.stringify({ title: 3, startedAt: NOW.toISOString(), items: [] }))).toBeNull();
  });

  it('drops junk fields from stored sets', () => {
    const raw = JSON.stringify({
      title: 'x',
      startedAt: NOW.toISOString(),
      items: [{ exerciseId: 'pushup', sets: [{ reps: 4, done: true, evil: 'x', kg: 'heavy' }] }],
    });
    expect(parseStoredSession(raw)?.items[0].sets).toEqual([{ reps: 4, done: true }]);
  });
});

describe('formatElapsed', () => {
  it('reads like the board', () => {
    expect(formatElapsed(45_000)).toBe('45s');
    expect(formatElapsed(12 * 60_000 + 5_000)).toBe('12m 05s');
    expect(formatElapsed(67 * 60_000)).toBe('1h 07m');
    expect(formatElapsed(-5)).toBe('0s');
  });
});

describe('owner defaults', () => {
  it('a state with no stored prefs reads as the owner setup: home, dumbbells and a cardio machine', () => {
    const p = resolvePrefs(emptyState());
    expect(p).toEqual(ownerPrefs());
    expect(p.equipment).toEqual({ kind: 'home', has: ['dumbbell', 'cardio-machine'], dumbbellKg: [2, 3, 5, 10] });
    expect(p.avoid).toEqual(['lunges']);
    expect(p.weeklyGoal).toBe(3);
    expect(p.onboarded).toBe(true);
    expect(p.units).toEqual({ weight: 'kg', distance: 'km' });
  });

  it('so none of the owner routines show as "Needs dumbbell"', () => {
    const have = availableEquipment(resolvePrefs(emptyState()));
    expect(have.has('dumbbell')).toBe(true);
    expect(have.has('cardio-machine')).toBe(true);
    expect(have.has('barbell')).toBe(false);
    for (const r of seedRoutines()) {
      for (const item of r.items) {
        const e = exerciseById(item.exerciseId)!;
        expect(have.has(e.equipment), `${r.title}: ${e.name}`).toBe(true);
      }
    }
  });

  it('lunges are avoided, and the weekly goal still reads 3', () => {
    const p = resolvePrefs(emptyState());
    expect(isAvoided(exerciseById('db-lunge')!, p)).toBe(true);
    expect(isAvoided(exerciseById('db-curl')!, p)).toBe(false);
    expect(weeklyGoalOf(emptyState())).toBe(3);
  });

  it('stored prefs win, and a new user still starts empty', () => {
    const mine = { ...defaultPrefs(), onboarded: true, equipment: { kind: 'gym' as const, has: [], dumbbellKg: [] }, avoid: [] };
    expect(resolvePrefs({ prefs: mine })).toEqual(mine);
    expect(resolvePrefs(newUserState()).equipment).toEqual({ kind: 'home', has: [], dumbbellKg: [] });
    expect(resolvePrefs(newUserState()).avoid).toEqual([]);
  });
});

describe('first run', () => {
  it('a new user is not onboarded, and someone with no prefs at all (the owner) is', () => {
    expect(resolvePrefs(newUserState()).onboarded).toBe(false);
    expect(resolvePrefs(emptyState()).onboarded).toBe(true);
    expect(resolvePrefs({ prefs: { ...defaultPrefs(), onboarded: true } }).onboarded).toBe(true);
  });
});

describe('laps', () => {
  const at = (sec: number) => new Date(NOW.getTime() + sec * 1000);
  const run = () => must(cardioSession('run', NOW));
  const lapsOf = (s: Session) => s.items[0].sets[0].laps;

  it('addLap stamps the time since Start, then the time since the last lap', () => {
    let s = addLap(run(), 0, at(362));
    s = addLap(s, 0, at(710));
    expect(lapsOf(s)).toEqual([{ sec: 362 }, { sec: 348 }]);
  });

  it('addLap keeps the Time following the clock', () => {
    let s = addLap(run(), 0, at(400));
    expect(s.follow).toEqual(['run']);
    s = syncFollow(s, at(400));
    expect(s.items[0].sets[0]).toMatchObject({ min: 6, done: true });
    expect(lapsOf(s)).toEqual([{ sec: 400 }]);
    expect(s.follow).toEqual(['run']);
  });

  it('addLap does nothing under a second after the last lap', () => {
    const base = run();
    expect(addLap(base, 0, at(0))).toBe(base);
    const s = addLap(base, 0, at(100));
    expect(addLap(s, 0, at(100.5))).toBe(s);
  });

  it('a lap stamped with a distance fills an empty run distance, and keeps adding up', () => {
    let s = addLap(run(), 0, at(360), 1);
    expect(s.items[0].sets[0].km).toBe(1);
    s = addLap(s, 0, at(710), 1);
    expect(s.items[0].sets[0].km).toBe(2);
    expect(lapsOf(s)).toEqual([{ sec: 360, km: 1 }, { sec: 350, km: 1 }]);
  });

  it('a distance the person typed is never overwritten', () => {
    let s = updateCardio(run(), 0, { km: 5.2 });
    s = addLap(s, 0, at(360), 1);
    s = addLap(s, 0, at(710), 1);
    expect(s.items[0].sets[0].km).toBe(5.2);
  });

  it('a lap with no distance leaves the run distance alone', () => {
    const s = addLap(run(), 0, at(360));
    expect(s.items[0].sets[0].km).toBeUndefined();
  });

  it('typing a Time ends the clock but keeps the laps', () => {
    const s = updateCardio(addLap(run(), 0, at(360)), 0, { min: 31 });
    expect(s.follow).toBeUndefined();
    expect(lapsOf(s)).toEqual([{ sec: 360 }]);
  });

  it('updateLap corrects a lap, an empty time leaves the row with none, and an empty distance clears it', () => {
    let s = addLap(run(), 0, at(360), 1);
    s = updateLap(s, 0, 0, { sec: 345.4, km: 0.4 });
    expect(lapsOf(s)).toEqual([{ sec: 345, km: 0.4 }]);
    s = updateLap(s, 0, 0, { km: undefined });
    expect(lapsOf(s)).toEqual([{ sec: 345 }]);
    s = updateLap(s, 0, 0, { sec: undefined });
    expect(lapsOf(s)).toEqual([{ sec: 0 }]);
    expect(updateLap(s, 0, 5, { sec: 10 })).toBe(s);
  });

  it('removeLap drops one lap, and the last one removes the laps key', () => {
    let s = addLap(addLap(run(), 0, at(100)), 0, at(250));
    s = removeLap(s, 0, 0);
    expect(lapsOf(s)).toEqual([{ sec: 150 }]);
    s = removeLap(s, 0, 0);
    expect('laps' in s.items[0].sets[0]).toBe(false);
  });

  it('addBlankLap adds a row with no time, up to 200 laps', () => {
    let s = addBlankLap(run(), 0);
    expect(lapsOf(s)).toEqual([{ sec: 0 }]);
    for (let i = 0; i < 250; i++) s = addBlankLap(s, 0);
    expect(lapsOf(s)).toHaveLength(LIMITS.lapsPerSet);
  });

  it('a new set copies the numbers, not the laps', () => {
    const s = must(addSet(addLap(run(), 0, at(100)), 0));
    expect(s.items[0].sets[1]).toEqual({ done: false });
  });

  it('a stored session keeps its laps, and drops junk laps', () => {
    let s = updateCardio(addLap(addLap(run(), 0, at(360), 1), 0, at(700), 0.4), 0, { min: 12 });
    s = addBlankLap(s, 0);
    expect(parseStoredSession(serializeSession(s))).toEqual(s);
    const raw = JSON.parse(serializeSession(s));
    raw.items[0].sets[0].laps.push({ sec: 'x' }, 7, { sec: 99999999, km: -1 });
    expect(parseStoredSession(JSON.stringify(raw))?.items[0].sets[0].laps).toEqual([{ sec: 360, km: 1 }, { sec: 340, km: 0.4 }, { sec: 0 }, { sec: 86400 }]);
  });

  it('finishing keeps the laps as stamped, drops rows with no time, and leaves the run totals alone', () => {
    let s = addLap(addLap(run(), 0, at(360), 1), 0, at(700), 1);
    s = addBlankLap(updateCardio(s, 0, { min: 12 }), 0);
    const r = buildWorkoutInput(s, { now: at(780) });
    if (!r.ok) throw new Error(r.error);
    expect(r.workout.items[0].sets).toEqual([{ done: true, min: 12, km: 2, laps: [{ sec: 360, km: 1 }, { sec: 340, km: 1 }] }]);
  });

  it('finishing keeps laps on distance cardio only', () => {
    let s = newSession(NOW);
    s = must(addExercise(s, 'pushup'));
    s = toggleSet(updateSet(s, 0, 0, { reps: 10 }), 0, 0);
    s.items[0].sets[0].laps = [{ sec: 60 }];
    const r = buildWorkoutInput(s, { now: at(120) });
    if (!r.ok) throw new Error(r.error);
    expect(r.workout.items[0].sets).toEqual([{ done: true, reps: 10 }]);
  });

  it('a saved run opens in Edit with its laps, and saving the edit keeps them', () => {
    let s = updateCardio(addLap(addLap(run(), 0, at(360), 1), 0, at(700), 1), 0, { min: 12 });
    const built = buildWorkoutInput(s, { now: at(780) });
    if (!built.ok) throw new Error(built.error);
    const saved = { ...built.workout, xp: 0 };
    const draft = sessionFromWorkout(saved);
    expect(draft.items[0].sets[0].laps).toEqual([{ sec: 360, km: 1 }, { sec: 340, km: 1 }]);
    s = updateLap(draft, 0, 1, { sec: 330 });
    const patch = buildWorkoutPatch(saved, { session: s, when: saved.when, minutes: 13, notes: '' });
    if (!patch.ok) throw new Error(patch.error);
    expect(patch.patch.items[0].sets[0].laps).toEqual([{ sec: 360, km: 1 }, { sec: 330, km: 1 }]);
  });
});
