import { describe, expect, it } from 'vitest';
import { addLap, buildLoggedWorkout, cardioMinutesLogged, defaultLogWhen, logSession, prefillFrom, setCounts, updateCardio } from '../lib/session';
import type { Session, SessionResult } from '../lib/session';
import type { Routine } from '../lib/routines';
import { workout } from './helpers';

// 10 Oct 2026, 18:37 on the device clock.
const NOW = new Date(2026, 9, 10, 18, 37, 12);

function must(r: SessionResult): Session {
  if (!r.ok) throw new Error(`expected ok, got: ${r.error}`);
  return r.session;
}

const routine: Routine = {
  id: 'push-a',
  title: 'Push A',
  items: [
    { exerciseId: 'db-ohp', sets: [{ kg: 5, reps: 10 }, { kg: 5, reps: 10 }, { kg: 7.5 }] },
    { exerciseId: 'pushup', sets: [{ reps: 10 }, {}] },
    { exerciseId: 'plank', sets: [{ sec: 40 }] },
    { exerciseId: 'run', sets: [{ min: 20, km: 3 }] },
    { exerciseId: 'walk', sets: [{ min: 0 }] },
  ],
};

describe('defaultLogWhen', () => {
  it('is an hour ago, rounded down to 5 minutes', () => {
    expect(defaultLogWhen(NOW)).toBe('2026-10-10T17:35');
    expect(defaultLogWhen(new Date(2026, 9, 10, 18, 40, 0))).toBe('2026-10-10T17:40');
    expect(defaultLogWhen(new Date(2026, 9, 10, 18, 4, 59))).toBe('2026-10-10T17:00');
  });

  it('crosses midnight to the day before', () => {
    expect(defaultLogWhen(new Date(2026, 9, 10, 0, 20, 0))).toBe('2026-10-09T23:20');
    expect(defaultLogWhen(new Date(2026, 0, 1, 0, 59, 0))).toBe('2025-12-31T23:55');
  });
});

describe('logSession', () => {
  it('ticks only the sets that have numbers', () => {
    const s = must(logSession({ routine }, NOW));
    const done = s.items.map((i) => i.sets.map((x) => x.done));
    expect(done).toEqual([
      [true, true, false], // the third set has a weight but no reps
      [true, false], // the empty set stays out
      [true],
      [true],
      [false], // no minutes, no XP
    ]);
    expect(s.routineId).toBe('push-a');
    expect(s.plan?.map((p) => p.exerciseId)).toEqual(['db-ohp', 'pushup', 'plank', 'run', 'walk']);
    expect(setCounts(s)).toEqual({ done: 5, total: 8, unticked: 3 });
  });

  it('starts a cardio draft blank, with no clock following it', () => {
    const s = must(logSession({ cardio: 'run' }, NOW));
    expect(s.follow).toBeUndefined();
    expect(s.title).toBe('Run');
    expect(s.items).toEqual([{ exerciseId: 'run', sets: [{ done: false }] }]);
    // Typing a Time is what makes it count.
    expect(updateCardio(s, 0, { min: 30 }).items[0].sets[0]).toMatchObject({ min: 30, done: true });
    expect(logSession({ cardio: 'db-ohp' }, NOW)).toEqual({ ok: false, error: 'That activity is not available.' });
  });

  it('gives picked exercises last time\'s numbers, ticked, and leaves an exercise with no history unticked', () => {
    const history = [workout('2026-10-05', [{ id: 'db-ohp', sets: [{ kg: 7.5, reps: 8 }, { kg: 7.5, reps: 7 }] }])];
    const s = must(logSession({ exerciseIds: ['db-ohp', 'pushup'] }, NOW, undefined, prefillFrom(history)));
    expect(s.items[0].sets).toEqual([{ kg: 7.5, reps: 8, done: true }, { kg: 7.5, reps: 7, done: true }]);
    expect(s.items[1].sets).toEqual([{ reps: 10, done: false }]);
    expect(s.follow).toBeUndefined();
  });

  it('starts picked exercises blank and unticked without a prefill', () => {
    const s = must(logSession({ exerciseIds: ['db-ohp'] }, NOW));
    expect(setCounts(s)).toEqual({ done: 0, total: 1, unticked: 1 });
  });

  it('starts a lone picked run blank, with no clock following it', () => {
    const s = must(logSession({ exerciseIds: ['run'] }, NOW, undefined, prefillFrom([])));
    expect(s.follow).toBeUndefined();
    expect(s.items[0].sets).toEqual([{ done: false }]);
  });

  it('refuses nothing picked', () => {
    expect(logSession({ exerciseIds: [] }, NOW)).toEqual({ ok: false, error: 'Pick at least one exercise.' });
  });
});

describe('buildLoggedWorkout', () => {
  const ticked = () => must(logSession({ routine }, NOW));

  it('takes the day from when and the start from when minus the minutes', () => {
    const r = buildLoggedWorkout(ticked(), { when: '2026-10-09T19:30', minutes: 45, notes: '', now: NOW, id: 'w-log' });
    if (!r.ok) throw new Error(r.error);
    expect(r.workout).toMatchObject({ id: 'w-log', date: '2026-10-09', when: '2026-10-09T19:30', title: 'Push A', routineId: 'push-a' });
    expect(r.workout.finishedAt).toBe(new Date(2026, 9, 9, 19, 30).toISOString());
    expect(r.workout.startedAt).toBe(new Date(2026, 9, 9, 18, 45).toISOString());
    expect(r.workout.items).toHaveLength(4);
    expect(r.workout.plan).toHaveLength(5);
  });

  it('keeps the notes, trimmed, and leaves them out when empty', () => {
    const s = ticked();
    const base = { when: '2026-10-09T19:30', minutes: 45, now: NOW };
    const withNotes = buildLoggedWorkout(s, { ...base, notes: '  felt strong  ' });
    expect(withNotes.ok && withNotes.workout.notes).toBe('felt strong');
    const without = buildLoggedWorkout(s, { ...base, notes: '   ' });
    expect(without.ok && 'notes' in without.workout).toBe(false);
  });

  it('refuses a time that has not happened yet', () => {
    const s = ticked();
    const error = 'Pick a time that has already happened.';
    expect(buildLoggedWorkout(s, { when: '2026-10-10T18:38', minutes: 30, notes: '', now: NOW })).toEqual({ ok: false, error });
    expect(buildLoggedWorkout(s, { when: '2026-10-11T08:00', minutes: 30, notes: '', now: NOW })).toEqual({ ok: false, error });
    // This minute is fine.
    expect(buildLoggedWorkout(s, { when: '2026-10-10T18:37', minutes: 30, notes: '', now: NOW }).ok).toBe(true);
  });

  it('makes a workout at least as long as the cardio in it', () => {
    const run = updateCardio(must(logSession({ cardio: 'run' }, NOW)), 0, { min: 50, km: 8 });
    const r = buildLoggedWorkout(run, { when: '2026-10-09T19:30', minutes: 10, notes: '', now: NOW });
    if (!r.ok) throw new Error(r.error);
    expect(r.workout.startedAt).toBe(new Date(2026, 9, 9, 18, 40).toISOString());
    // A mixed workout with a 20 minute run is at least 20 minutes, and longer when given.
    const mixed = buildLoggedWorkout(ticked(), { when: '2026-10-09T19:30', minutes: 10, notes: '', now: NOW });
    if (!mixed.ok) throw new Error(mixed.error);
    expect(mixed.workout.startedAt).toBe(new Date(2026, 9, 9, 19, 10).toISOString());
    const longer = buildLoggedWorkout(ticked(), { when: '2026-10-09T19:30', minutes: 45, notes: '', now: NOW });
    if (!longer.ok) throw new Error(longer.error);
    expect(longer.workout.startedAt).toBe(new Date(2026, 9, 9, 18, 45).toISOString());
  });

  it('falls back to a title from the time of day when it is empty', () => {
    const s = { ...ticked(), title: '   ' };
    const r = buildLoggedWorkout(s, { when: '2026-10-09T08:30', minutes: 30, notes: '', now: NOW });
    expect(r.ok && r.workout.title).toBe('Morning workout');
  });

  it('needs at least one ticked set', () => {
    const s = must(logSession({ exerciseIds: ['db-ohp'] }, NOW));
    expect(buildLoggedWorkout(s, { when: '2026-10-09T19:30', minutes: 30, notes: '', now: NOW })).toEqual({ ok: false, error: 'Tick at least one set first.' });
  });

  it('keeps the laps on a run', () => {
    let s = updateCardio(must(logSession({ cardio: 'run' }, NOW)), 0, { min: 30, km: 5 });
    s = { ...s, startedAt: NOW.toISOString() };
    s = addLap(s, 0, new Date(NOW.getTime() + 362_000), 1);
    s = addLap(s, 0, new Date(NOW.getTime() + 710_000), 1);
    const r = buildLoggedWorkout(s, { when: '2026-10-09T19:30', minutes: 30, notes: '', now: NOW });
    if (!r.ok) throw new Error(r.error);
    expect(r.workout.items[0].sets[0]).toMatchObject({ min: 30, km: 5, laps: [{ sec: 362, km: 1 }, { sec: 348, km: 1 }] });
  });
});

describe('cardioMinutesLogged', () => {
  it('is the cardio minutes on a cardio-only workout, and null for other work or none yet', () => {
    const run = must(logSession({ cardio: 'run' }, NOW));
    expect(cardioMinutesLogged(run)).toBeNull();
    expect(cardioMinutesLogged(updateCardio(run, 0, { min: 32 }))).toBe(32);
    expect(cardioMinutesLogged(must(logSession({ routine }, NOW)))).toBeNull();
  });
});
