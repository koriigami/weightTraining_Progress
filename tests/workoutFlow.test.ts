import { describe, expect, it } from 'vitest';
import {
  addExercise,
  addSet,
  buildWorkoutInput,
  cardioSession,
  customSession,
  newSession,
  parseStoredSession,
  prefillFrom,
  removeExercise,
  replaceExercise,
  restoreExercise,
  serializeSession,
  sessionFromRoutine,
  syncFollow,
  updateCardio,
} from '../lib/session';
import type { Session, SessionResult } from '../lib/session';
import { cardioRate, dailyBonusLive, distanceCardio, fmtMinutes, fmtSpeed, liveXp, minutesTodayText, statTiles, statsKind } from '../lib/liveStats';
import { lastWorkoutSets } from '../lib/exerciseHistory';
import { dailyBonusPaid, dayMinutes, liveMarks } from '../lib/workoutScoring';
import { defaultPrefs, resolvePrefs, workoutTotals } from '../lib/routines';
import type { Routine } from '../lib/routines';
import { parsePrefs } from '../lib/routineValidation';
import { workout } from './helpers';

const NOW = new Date(2026, 9, 10, 18, 0, 0);

function must(r: SessionResult): Session {
  if (!r.ok) throw new Error(`expected ok, got: ${r.error}`);
  return r.session;
}

const routine: Routine = {
  id: 'push-a',
  title: 'Push A',
  items: [
    { exerciseId: 'pushup', sets: [{ reps: 10 }, { reps: 10 }] },
    { exerciseId: 'db-ohp', sets: [{ kg: 5, reps: 10 }, { kg: 5, reps: 10 }, { kg: 7.5, reps: 8 }] },
  ],
};

describe('plan snapshot', () => {
  it('a routine start plans its items and set counts', () => {
    expect(sessionFromRoutine(routine, NOW).plan).toEqual([
      { exerciseId: 'pushup', sets: 2 },
      { exerciseId: 'db-ohp', sets: 3 },
    ]);
  });

  it('a custom start plans the picked exercises with their set counts', () => {
    const s = must(customSession(NOW, ['db-curl', 'pushup']));
    expect(s.plan).toEqual([
      { exerciseId: 'db-curl', sets: 1 },
      { exerciseId: 'pushup', sets: 1 },
    ]);
    expect(s.startedAt).toBe(NOW.toISOString());
  });

  it('a custom start plans last time\'s set count when it is prefilled', () => {
    const history = [workout('2026-10-01', [{ id: 'db-curl', sets: [{ kg: 8, reps: 10 }, { kg: 8, reps: 9 }, { kg: 8, reps: 8 }] }])];
    const s = must(customSession(NOW, ['db-curl'], undefined, { prefill: prefillFrom(history) }));
    expect(s.plan).toEqual([{ exerciseId: 'db-curl', sets: 3 }]);
  });

  it('refuses a custom start with nothing picked', () => {
    const r = customSession(NOW, []);
    expect(r.ok).toBe(false);
  });

  it('swapping an exercise moves its plan slot to the new exercise', () => {
    const s = sessionFromRoutine(routine, NOW);
    const next = must(replaceExercise(s, 0, 'db-curl'));
    expect(next.plan).toEqual([
      { exerciseId: 'db-curl', sets: 2 },
      { exerciseId: 'db-ohp', sets: 3 },
    ]);
  });

  it('removing an exercise leaves the plan as it was, so the workout cannot shrink its own plan, and Undo puts the exercise back', () => {
    const s = sessionFromRoutine(routine, NOW);
    const removal = removeExercise(s, 0);
    expect(removal?.session.items.map((i) => i.exerciseId)).toEqual(['db-ohp']);
    expect(removal?.session.plan).toEqual(s.plan);
    const back = restoreExercise(removal!.session, removal!.removed, removal!.index);
    expect(back.plan).toEqual(s.plan);
    expect(back.items.map((i) => i.exerciseId)).toEqual(s.items.map((i) => i.exerciseId));
  });

  it('adding exercises or sets mid-workout does not change the plan', () => {
    const s = sessionFromRoutine(routine, NOW);
    const plus = must(addExercise(s, 'db-curl'));
    expect(plus.plan).toEqual(s.plan);
    const more = must(addSet(plus, 0));
    expect(more.plan).toEqual(s.plan);
    expect(more.items[0].sets).toHaveLength(3);
  });

  it('is sent with the saved workout and survives a reload', () => {
    const s = must(customSession(NOW, ['pushup']));
    expect(parseStoredSession(serializeSession(s))?.plan).toEqual(s.plan);
  });
});

describe('prefill from history', () => {
  const history = [
    workout('2026-09-20', [{ id: 'db-curl', sets: [{ kg: 5, reps: 10 }] }]),
    workout('2026-10-01', [{ id: 'db-curl', sets: [{ kg: 8, reps: 10 }, { kg: 8, reps: 9 }], undone: [1] }]),
  ];

  it('takes the ticked sets of the most recent workout, none ticked', () => {
    expect(lastWorkoutSets(history, 'db-curl', 'weight_reps')).toEqual([{ kg: 8, reps: 10 }]);
    const s = must(addExercise(newSession(NOW), 'db-curl', undefined, prefillFrom(history)));
    expect(s.items[0].sets).toEqual([{ kg: 8, reps: 10, done: false }]);
  });

  it('keeps only the fields of the metric and handles time, reps and distance', () => {
    const h = [
      workout('2026-10-01', [
        { id: 'plank', sets: [{ sec: 45 }] },
        { id: 'pushup', sets: [{ reps: 12 }, { reps: 11 }] },
        { id: 'bike', sets: [{ min: 30, km: 12 }] },
      ]),
    ];
    expect(lastWorkoutSets(h, 'plank', 'time')).toEqual([{ sec: 45 }]);
    expect(lastWorkoutSets(h, 'pushup', 'reps')).toEqual([{ reps: 12 }, { reps: 11 }]);
    expect(lastWorkoutSets(h, 'bike', 'distance_time')).toEqual([{ min: 30, km: 12 }]);
  });

  it('falls back to one blank set with no history, and when the pref is off (no prefill)', () => {
    expect(lastWorkoutSets([], 'db-curl', 'weight_reps')).toBeNull();
    expect(must(addExercise(newSession(NOW), 'db-curl')).items[0].sets).toEqual([{ kg: 0, reps: 10, done: false }]);
    expect(must(addExercise(newSession(NOW), 'db-curl', undefined, prefillFrom([]))).items[0].sets).toEqual([{ kg: 0, reps: 10, done: false }]);
  });

  it('a custom start prefills every pick, but a lone cardio card follows the clock instead', () => {
    const h = [...history, workout('2026-10-02', [{ id: 'bike', sets: [{ min: 30, km: 12 }] }])];
    const custom = must(customSession(NOW, ['db-curl', 'pushup'], undefined, { prefill: prefillFrom(h) }));
    expect(custom.items[0].sets).toEqual([{ kg: 8, reps: 10, done: false }]);
    const cardio = must(customSession(NOW, ['bike'], undefined, { prefill: prefillFrom(h) }));
    expect(cardio.items[0].sets).toEqual([{ done: false }]);
    expect(cardio.follow).toEqual(['bike']);
  });
});

describe('the cardio card', () => {
  it('Time above zero is a ticked set, and typing a Time takes it off the clock', () => {
    const s = must(cardioSession('bike', NOW));
    const typed = updateCardio(s, 0, { min: 25 });
    expect(typed.items[0].sets[0]).toEqual({ min: 25, done: true });
    expect(typed.follow).toBeUndefined();
    expect(updateCardio(typed, 0, { min: undefined }).items[0].sets[0].done).toBe(false);
    const km = updateCardio(s, 0, { km: 5 });
    expect(km.items[0].sets[0].done).toBe(false);
    expect(km.follow).toEqual(['bike']);
  });

  it('Time follows the elapsed whole minutes until typed in', () => {
    const s = must(cardioSession('bike', NOW));
    expect(syncFollow(s, new Date(NOW.getTime() + 30_000))).toBe(s);
    const at5 = syncFollow(s, new Date(NOW.getTime() + 5 * 60_000 + 20_000));
    expect(at5.items[0].sets[0]).toEqual({ min: 5, done: true });
    expect(syncFollow(at5, new Date(NOW.getTime() + 5 * 60_000 + 40_000))).toBe(at5);
    const typed = updateCardio(at5, 0, { min: 40 });
    expect(syncFollow(typed, new Date(NOW.getTime() + 9 * 60_000)).items[0].sets[0].min).toBe(40);
  });
});

describe('cardio-only duration', () => {
  it('is the longer of the clock and the logged minutes', () => {
    const s = updateCardio(must(cardioSession('bike', NOW)), 0, { min: 45, km: 15 });
    // Finished after 10 minutes on the clock, with 45 logged.
    const now = new Date(NOW.getTime() + 10 * 60_000);
    const built = buildWorkoutInput(s, { now });
    if (!built.ok) throw new Error(built.error);
    expect(Date.parse(built.workout.finishedAt) - Date.parse(built.workout.startedAt)).toBe(45 * 60_000);
  });

  it('keeps the clock when it is longer, and leaves a mixed workout alone', () => {
    const s = updateCardio(must(cardioSession('bike', NOW)), 0, { min: 5 });
    const late = new Date(NOW.getTime() + 20 * 60_000);
    const a = buildWorkoutInput(s, { now: late });
    if (!a.ok) throw new Error(a.error);
    expect(Date.parse(a.workout.finishedAt) - Date.parse(a.workout.startedAt)).toBe(20 * 60_000);

    let mixed = must(customSession(NOW, ['bike', 'pushup']));
    mixed = updateCardio(mixed, 0, { min: 45 });
    mixed = { ...mixed, items: mixed.items.map((it) => ({ ...it, sets: it.sets.map((x) => ({ ...x, done: true })) })) };
    const b = buildWorkoutInput(mixed, { now: new Date(NOW.getTime() + 10 * 60_000) });
    if (!b.ok) throw new Error(b.error);
    expect(Date.parse(b.workout.finishedAt) - Date.parse(b.workout.startedAt)).toBe(10 * 60_000);
  });
});

describe('the adaptive stats row', () => {
  const strength = [{ exerciseId: 'pushup', sets: [{ reps: 10, done: true }] }];
  const ride = [{ exerciseId: 'bike', sets: [{ min: 32, km: 11.2, done: true }] }];
  const run = [{ exerciseId: 'run', sets: [{ min: 30, km: 5, done: true }] }];
  const opts = { elapsed: '12m 00s', weight: 'kg' as const, distance: 'km' as const };

  it('picks strength, cardio or mixed', () => {
    expect(statsKind([])).toBe('strength');
    expect(statsKind(strength)).toBe('strength');
    expect(statsKind(ride)).toBe('cardio');
    expect(statsKind([...strength, ...ride])).toBe('mixed');
  });

  it('strength: Duration, Volume, Sets', () => {
    expect(statTiles(strength, workoutTotals(strength), opts).map((t) => t.label)).toEqual(['Duration', 'Volume', 'Sets']);
  });

  it('cardio: Time, Distance and Speed for a ride', () => {
    const tiles = statTiles(ride, workoutTotals(ride), opts);
    expect(tiles.map((t) => [t.label, t.value])).toEqual([
      ['Time', '32 min'],
      ['Distance', '11.2 km'],
      ['Speed', '21 km/h'],
    ]);
  });

  it('cardio: Pace for a run or walk', () => {
    const tiles = statTiles(run, workoutTotals(run), opts);
    expect(tiles[2]).toEqual({ key: 'rate', label: 'Pace', value: '6:00 /km' });
  });

  it('mixed: Duration, Volume, then Distance or Cardio minutes', () => {
    const mixed = [...strength, ...ride];
    const tiles = statTiles(mixed, workoutTotals(mixed), opts);
    expect(tiles.map((t) => t.label)).toEqual(['Duration', 'Volume', 'Distance']);
    const noKm = [...strength, { exerciseId: 'bike', sets: [{ min: 20, done: true }] }];
    const t2 = statTiles(noKm, workoutTotals(noKm), opts);
    expect(t2[2]).toEqual({ key: 'cardio', label: 'Cardio', value: '20 min' });
  });

  it('formats speed whole from 10 and with a decimal below, in the user\'s unit', () => {
    expect(fmtSpeed(32, 11.2)).toBe('21 km/h');
    expect(fmtSpeed(60, 9.5)).toBe('9.5 km/h');
    expect(fmtSpeed(60, 20, 'mi')).toBe('12 mph');
    expect(fmtSpeed(0, 5)).toBe('');
    expect(cardioRate('ride', 30, 10).label).toBe('Speed');
    expect(cardioRate('run', 30, 5).value).toBe('6:00 /km');
    expect(cardioRate(undefined, 30, 5, 'mi').value).toMatch(/\/mi$/);
    expect(fmtMinutes(65)).toBe('1h 05m');
  });

  it('sums the distance cardio and calls it a ride only when every one is', () => {
    expect(distanceCardio(ride).kind).toBe('ride');
    expect(distanceCardio([...ride, ...run])).toMatchObject({ kind: 'run', min: 62 });
  });
});

describe('live chips and the XP popover', () => {
  const history = [
    workout('2026-09-20', [{ id: 'db-curl', sets: [{ kg: 10, reps: 10 }] }]),
    workout('2026-10-01', [{ id: 'db-curl', sets: [{ kg: 8, reps: 10 }] }]),
  ];
  const item = (kg: number, reps: number) => [{ exerciseId: 'db-curl', sets: [{ kg, reps, done: true }] }];

  it('beat last time: more than the latest workout, but not an all-time record', () => {
    expect(liveMarks(item(9, 10), history)).toEqual([{ exerciseId: 'db-curl', kind: 'beat', xp: 10 }]);
  });

  it('record: heavier than every earlier workout, and it replaces the beat', () => {
    expect(liveMarks(item(12, 8), history)).toEqual([{ exerciseId: 'db-curl', kind: 'record', xp: 25 }]);
  });

  it('nothing for a first time, an unticked set or no improvement', () => {
    expect(liveMarks(item(12, 8), [])).toEqual([]);
    expect(liveMarks([{ exerciseId: 'db-curl', sets: [{ kg: 12, reps: 8, done: false }] }], history)).toEqual([]);
    expect(liveMarks(item(8, 10), history)).toEqual([]);
  });

  it('splits XP into sets, records and beat, and cardio', () => {
    const items = [
      { exerciseId: 'db-curl', sets: [{ kg: 12, reps: 8, done: true }, { kg: 12, reps: 8, done: true }] },
      { exerciseId: 'bike', sets: [{ min: 20, km: 5, done: true }] },
    ];
    const marks = liveMarks(items, history);
    expect(liveXp(items, marks)).toEqual({ sets: 10, marks: 25, cardio: 30, total: 65 });
  });

  it('the daily bonus line counts up from the minutes today, rounded down', () => {
    expect(dailyBonusLive(12, false)).toEqual({ state: 'short', text: '12 of 20 min today' });
    expect(dailyBonusLive(0, false).text).toBe('0 of 20 min today');
    expect(dailyBonusLive(19.5, false).text).toBe('19 of 20 min today');
    expect(minutesTodayText(6)).toBe('6 of 20 min today');
  });

  it('the daily bonus line says earned once the day reaches 20 minutes', () => {
    expect(dailyBonusLive(20, false)).toEqual({ state: 'earned', text: 'Daily bonus earned' });
    expect(dailyBonusLive(45, false).state).toBe('earned');
  });

  it('the daily bonus line says already earned when an earlier workout paid it, whatever this one adds', () => {
    expect(dailyBonusLive(24, true)).toEqual({ state: 'paid', text: 'Already earned today' });
    expect(dailyBonusLive(3, true).state).toBe('paid');
  });

  it('feeds the line from the saved workouts of today plus the sets being logged', () => {
    const saved = [workout('2026-10-10', [{ id: 'pushup', sets: [{ reps: 10 }, { reps: 10 }] }]), workout('2026-10-09', [{ id: 'pushup', sets: Array.from({ length: 9 }, () => ({ reps: 10 })) }])];
    const live = [{ exerciseId: 'db-ohp', sets: Array.from({ length: 4 }, () => ({ kg: 5, reps: 10, done: true })) }];
    expect(dayMinutes(saved, '2026-10-10', live)).toBe(18); // 6 saved today, 12 live, yesterday not counted
    expect(dailyBonusLive(dayMinutes(saved, '2026-10-10', live), dailyBonusPaid(saved, '2026-10-10')).text).toBe('18 of 20 min today');
    const more = [{ ...live[0], sets: [...live[0].sets, { kg: 5, reps: 10, done: true }] }];
    expect(dailyBonusLive(dayMinutes(saved, '2026-10-10', more), dailyBonusPaid(saved, '2026-10-10')).state).toBe('earned');
  });
});

describe('new prefs', () => {
  it('default to on, for old stored prefs too', () => {
    expect(defaultPrefs()).toMatchObject({ keepAwake: true, prefillLast: true });
    const { keepAwake: _a, prefillLast: _b, ...old } = defaultPrefs();
    void _a;
    void _b;
    expect(resolvePrefs({ prefs: old as never })).toMatchObject({ keepAwake: true, prefillLast: true });
  });

  it('are validated, and default when a client does not send them', () => {
    const ok = parsePrefs({ ...defaultPrefs(), keepAwake: false, prefillLast: false });
    expect(ok.ok && ok.value).toMatchObject({ keepAwake: false, prefillLast: false });
    const { keepAwake: _a, prefillLast: _b, ...old } = defaultPrefs();
    void _a;
    void _b;
    const legacy = parsePrefs(old);
    expect(legacy.ok && legacy.value).toMatchObject({ keepAwake: true, prefillLast: true });
    expect(parsePrefs({ ...defaultPrefs(), keepAwake: 'yes' }).ok).toBe(false);
  });
});
