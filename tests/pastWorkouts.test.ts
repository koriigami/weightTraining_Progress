import { describe, expect, it } from 'vitest';
import { exerciseById } from '../data/exercises';
import type { CustomExercise } from '../data/exercises';
import { fmtClock, formatDay, formatWhen, joinWhen, splitWhen } from '../lib/date';
import { growSeen, unseenEvents } from '../lib/celebrations';
import type { CelebrationEvent } from '../lib/celebrations';
import { feedTiles, workoutSummary } from '../lib/feed';
import { deleteSentence, deletedToast, dropAfterRemoving, editedToast, setLine, xpBreakdown } from '../lib/history';
import { levelForXp, xpForLevel } from '../lib/progress';
import { applyRoutineAction } from '../lib/routineActions';
import { makeLookup } from '../lib/routines';
import type { Routine, WorkoutLog } from '../lib/routines';
import { buildWorkoutPatch, durationMinutes, removeExercise, addExercise, sessionFromWorkout, stepDuration, updateSet } from '../lib/session';
import { scoreState } from '../lib/workoutScoring';
import { stateWith, workout } from './helpers';

const NOW = new Date(2026, 8, 30, 12, 0);

describe('the one date format', () => {
  it('reads "Tue 29 Sep · 6:40 pm" in the current year', () => {
    expect(formatWhen('2026-09-29T18:40', NOW)).toBe('Tue 29 Sep · 6:40 pm');
    expect(formatDay('2026-09-29', NOW)).toBe('Tue 29 Sep');
  });

  it('adds the year only when it is not the current year', () => {
    expect(formatWhen('2025-12-31T09:05', NOW)).toBe('Wed 31 Dec 2025 · 9:05 am');
    expect(formatDay('2027-01-01', NOW)).toBe('Fri 1 Jan 2027');
  });

  it('handles noon, midnight and a date with no time', () => {
    expect(fmtClock(0, 5)).toBe('12:05 am');
    expect(fmtClock(12, 0)).toBe('12:00 pm');
    expect(formatWhen('2026-09-29', NOW)).toBe('Tue 29 Sep');
  });

  it('splits and joins a date and time', () => {
    expect(splitWhen('2026-09-29T18:40')).toEqual({ date: '2026-09-29', hour: 18, minute: 40 });
    expect(joinWhen('2026-09-29', 6, 5)).toBe('2026-09-29T06:05');
  });
});

describe('the delete sentence', () => {
  const base = { title: 'Pull A', whenLabel: 'Tue 29 Sep', xp: 105 };

  it('says only what goes when the level holds', () => {
    // 2,485 XP is level 7 (2,100 to 2,800): losing 105 stays inside it.
    expect(deleteSentence({ ...base, totalXp: 2485 })).toBe("Pull A from Tue 29 Sep and its 105 XP will be removed. This can't be undone.");
  });

  it('adds the level it drops back to', () => {
    // Level 7 starts at 2,100 XP.
    const total = xpForLevel(7) + 20;
    expect(levelForXp(total)).toBe(7);
    expect(deleteSentence({ ...base, totalXp: total })).toBe("Pull A from Tue 29 Sep and its 105 XP will be removed. You'll go back to level 6. This can't be undone.");
  });

  it('says the rank instead of the level when the rank drops too', () => {
    // Level 5 is where D rank starts.
    const total = xpForLevel(5) + 10;
    const s = deleteSentence({ ...base, totalXp: total });
    expect(s).toContain("You'll go back to E rank.");
    expect(s).not.toContain('level 4');
    expect(s.endsWith("This can't be undone.")).toBe(true);
  });

  it('never drops below level 1', () => {
    expect(dropAfterRemoving(30, 500)).toEqual({ level: null, rank: null });
  });

  it('words the toasts', () => {
    expect(deletedToast(7, 6)).toBe('Workout deleted · Level 6');
    expect(deletedToast(7, 7)).toBe('Workout deleted');
    expect(editedToast(6, 7)).toBe('XP updated · Level 7');
    expect(editedToast(7, 7)).toBe('Changes saved');
  });
});

describe('level ups never replay', () => {
  const up = (from: number, to: number): CelebrationEvent => ({ kind: 'levelup', from, to, rank: 'E', xpNow: xpForLevel(to) });
  const rankUp = (level: number): CelebrationEvent => ({ kind: 'rankup', fromRank: 'E', toRank: 'D', level, xpNow: xpForLevel(level), from: level - 1 });

  it('the seen record only grows', () => {
    let seen = growSeen(null, 6, ['a']);
    seen = growSeen(seen, 5, ['b']);
    expect(seen).toEqual({ level: 6, badgeIds: ['a', 'b'] });
    seen = growSeen(seen, 7, []);
    expect(seen.level).toBe(7);
  });

  it('a level lost and won back is not a new level up', () => {
    let seen = growSeen(null, 6, []);
    // A delete takes the level to 5: nothing is queued for a drop, and the record stays 6.
    seen = growSeen(seen, 5, []);
    expect(seen.level).toBe(6);
    expect(unseenEvents([up(5, 6)], seen)).toEqual([]);
    // Going past what was seen is new.
    expect(unseenEvents([up(5, 7)], seen)).toEqual([up(5, 7)]);
  });

  it('a rank climbed back to is not celebrated twice, and a badge seen before is not either', () => {
    const seen = growSeen(null, 5, ['lifetime:x']);
    expect(unseenEvents([rankUp(5)], seen)).toEqual([]);
    expect(unseenEvents([rankUp(6)], seen)).toHaveLength(1);
    const b: CelebrationEvent = { kind: 'badge', badge: { id: 'lifetime:x', kind: 'lifetime', family: 'finisher', tier: 'bronze', earnedAt: '2026-09-27' } };
    expect(unseenEvents([b], seen)).toEqual([]);
  });

  it('a first run with no record lets everything through', () => {
    expect(unseenEvents([up(1, 2)], null)).toHaveLength(1);
  });

  it('a drop never makes a moment', () => {
    expect(unseenEvents([up(6, 5)], growSeen(null, 1, []))).toEqual([]);
  });
});

describe('the XP breakdown', () => {
  const row = (over: Partial<WorkoutLog> = {}) =>
    workout(
      '2026-09-29',
      [
        { id: 'db-row', sets: [{ kg: 12.5, reps: 10 }, { kg: 12.5, reps: 10 }] },
        { id: 'db-curl', sets: [{ kg: 7.5, reps: 10 }] },
      ],
      over
    );

  it('lists sets, record, beat, missed finish and the total', () => {
    const w = row({
      xp: 60,
      xpParts: { sets: 15, cardio: 0, beat: 10, record: 25, finish: 0, weekly: 0 },
      marks: [
        { exerciseId: 'db-row', kind: 'record', kg: 12.5, reps: 10 },
        { exerciseId: 'db-curl', kind: 'beat', kg: 7.5, reps: 10 },
      ],
      planComplete: false,
      planMissing: ['run'],
    });
    const b = xpBreakdown(w);
    expect(b.lines.map((l) => [l.key, l.title, l.xp])).toEqual([
      ['sets', '3 sets', 15],
      ['record', 'Record', 25],
      ['beat', 'Beat last time', 10],
      ['finish', 'Finish bonus', 0],
    ]);
    expect(b.lines[0].sub).toBe('5 XP a set');
    expect(b.lines[1].sub).toBe('Bent Over Row (Dumbbell), 12.5 kg × 10');
    expect(b.lines[2].sub).toBe('Bicep Curl (Dumbbell)');
    expect(b.lines[3].sub).toMatch(/^Missed: .+ (wasn't|weren't) done$/);
    expect(b.total).toBe(60);
  });

  it('pays the finish bonus and the weekly goal when earned, and names several misses', () => {
    const paid = xpBreakdown(row({ xp: 130, xpParts: { sets: 15, cardio: 0, beat: 0, record: 0, finish: 15, weekly: 50 }, planComplete: true, planMissing: [] }), { weeklyGoal: 3 });
    expect(paid.lines.map((l) => [l.key, l.xp])).toEqual([['sets', 15], ['finish', 15], ['weekly', 50]]);
    expect(paid.lines[2].sub).toBe('3 workouts this week');
    const missed = xpBreakdown(row({ xpParts: { sets: 15, cardio: 0, beat: 0, record: 0, finish: 0, weekly: 0 }, planComplete: false, planMissing: ['pushup', 'plank'] }));
    expect(missed.lines[1].sub).toBe("Missed: Push Up, Plank weren't done");
  });

  it('puts cardio on its own line', () => {
    const w = workout('2026-09-29', [{ id: 'run', sets: [{ min: 30, km: 5 }] }], { xp: 40, xpParts: { sets: 0, cardio: 40, beat: 0, record: 0, finish: 0, weekly: 0 } });
    const b = xpBreakdown(w);
    expect(b.lines.map((l) => [l.key, l.xp])).toEqual([['cardio', 40]]);
  });

  it('writes a set as a line for every kind', () => {
    expect(setLine('weight_reps', { kg: 12.5, reps: 10 })).toBe('12.5 kg × 10');
    expect(setLine('weight_reps', { kg: 10, reps: 8 }, { weight: 'lb', distance: 'km' })).toBe('22 lb × 8');
    expect(setLine('reps', { reps: 10 })).toBe('10 reps');
    expect(setLine('time', { sec: 40 })).toBe('40 s');
    expect(setLine('distance_time', { min: 32, km: 11.2 })).toBe('32 min · 11.2 km');
    expect(setLine('distance_time', { min: 20 })).toBe('20 min');
  });
});

describe('workout cards', () => {
  const custom: CustomExercise = { id: 'custom-towel', name: 'Towel Row', equipment: 'bodyweight', primary: 'upperback', secondary: [], metric: 'reps', custom: true };
  const lookup = makeLookup([custom]);
  const routines: Routine[] = [{ id: 'pull-a', title: 'Pull A', items: [{ exerciseId: 'db-row', sets: [{ kg: 10, reps: 10 }] }] }];
  const units = { weight: 'kg', distance: 'km' } as const;

  it('shows the routine title from its id, even for a renamed workout, and nothing without one', () => {
    const w = workout('2026-09-29', [{ id: 'db-row', sets: [{ kg: 10, reps: 10 }] }], { title: 'Renamed', routineId: 'pull-a' });
    expect(workoutSummary(w, lookup, routines).routine).toBe('Pull A');
    expect(workoutSummary({ ...w, routineId: 'gone' }, lookup, routines).routine).toBeNull();
    expect(workoutSummary({ ...w, routineId: undefined }, lookup, routines).routine).toBeNull();
  });

  it('counts exercises that were not in the plan as added, and tags custom exercises', () => {
    const w = workout(
      '2026-09-29',
      [
        { id: 'db-row', sets: [{ kg: 10, reps: 10 }] },
        { id: 'custom-towel', sets: [{ reps: 10 }] },
        { id: 'pushup', sets: [{ reps: 10 }] },
        { id: 'plank', sets: [{ sec: 30 }], undone: [0] },
      ],
      { plan: [{ exerciseId: 'db-row', sets: 1 }] }
    );
    const s = workoutSummary(w, lookup, routines);
    expect(s.added).toBe(2);
    expect(s.exercises.map((e) => [e.name, e.added, e.custom])).toEqual([
      ['Bent Over Row (Dumbbell)', false, false],
      ['Towel Row', true, true],
      ['Push Up', true, false],
    ]);
  });

  it('adds nothing for an old workout with no plan', () => {
    const w = workout('2026-09-29', [{ id: 'pushup', sets: [{ reps: 10 }] }]);
    expect(workoutSummary(w, lookup, routines).added).toBe(0);
  });

  it('shows Time, Volume and Sets for strength', () => {
    const w = workout('2026-09-29', [{ id: 'db-ohp', sets: [{ kg: 5, reps: 10 }, { kg: 5, reps: 10 }] }], { startedAt: '2026-09-29T18:00:00.000Z', finishedAt: '2026-09-29T18:52:00.000Z' });
    expect(feedTiles(workoutSummary(w, lookup, routines), units).map((t) => [t.label, t.value])).toEqual([
      ['Time', '52 min'],
      ['Volume', '100 kg'],
      ['Sets', '2'],
    ]);
  });

  it('shows Time, Distance and Speed for a ride, and Pace for a run', () => {
    const t0 = { startedAt: '2026-09-29T18:00:00.000Z', finishedAt: '2026-09-29T18:32:00.000Z' };
    const ride = workout('2026-09-29', [{ id: 'bike', sets: [{ min: 32, km: 11.2 }] }], t0);
    const rideTiles = feedTiles(workoutSummary(ride, lookup, routines), units);
    expect(rideTiles.map((t) => t.label)).toEqual(['Time', 'Distance', 'Speed']);
    expect(rideTiles.map((t) => t.value).slice(0, 2)).toEqual(['32 min', '11.2 km']);
    const run = workout('2026-09-29', [{ id: 'run', sets: [{ min: 30, km: 5 }] }], t0);
    expect(feedTiles(workoutSummary(run, lookup, routines), units).map((t) => [t.label, t.value])[2]).toEqual(['Pace', '6:00 /km']);
  });

  it('says how a cardio exercise is described on the card', () => {
    const ride = workout('2026-09-29', [{ id: 'bike', sets: [{ min: 32, km: 11.2 }] }]);
    expect(workoutSummary(ride, lookup, routines).exercises[0].line).toBe(`${exerciseById('bike')!.name} · 32 min, 11.2 km`);
    const lift = workout('2026-09-29', [{ id: 'pushup', sets: [{ reps: 10 }, { reps: 10 }, { reps: 10 }] }]);
    expect(workoutSummary(lift, lookup, routines).exercises[0].line).toBe('3 × Push Up');
  });
});

describe('editing a saved workout', () => {
  const NOW_WORKOUT = () =>
    workout(
      '2026-09-29',
      [
        { id: 'db-row', sets: [{ kg: 10, reps: 10 }, { kg: 10, reps: 10 }] },
        { id: 'db-curl', sets: [{ kg: 5, reps: 10 }] },
      ],
      { id: 'edit-me', title: 'Pull A', when: '2026-09-29T18:40', startedAt: '2026-09-29T17:48:00.000Z', finishedAt: '2026-09-29T18:40:00.000Z', plan: [{ exerciseId: 'db-row', sets: 2 }, { exerciseId: 'db-curl', sets: 1 }] }
    );
  const draftOf = (w: WorkoutLog, over: Partial<Parameters<typeof buildWorkoutPatch>[1]> = {}) => ({ session: sessionFromWorkout(w), when: w.when, minutes: durationMinutes(w.startedAt, w.finishedAt), notes: w.notes ?? '', ...over });

  it('starts from the saved sets and plan', () => {
    const w = NOW_WORKOUT();
    const s = sessionFromWorkout(w);
    expect(s.items).toHaveLength(2);
    expect(s.plan).toEqual(w.plan);
    expect(s.title).toBe('Pull A');
  });

  it('freezes the items of an old workout as its plan, so an added exercise is not part of it', () => {
    const w = { ...NOW_WORKOUT(), plan: undefined };
    const s = sessionFromWorkout(w);
    expect(s.plan).toEqual([{ exerciseId: 'db-row', sets: 2 }, { exerciseId: 'db-curl', sets: 1 }]);
    const built = buildWorkoutPatch(w, draftOf(w));
    expect(built.ok && built.patch.plan).toBeUndefined();
  });

  it('leaves the plan alone for edits, and sends nothing about times when nothing moved', () => {
    const w = NOW_WORKOUT();
    let s = sessionFromWorkout(w);
    s = updateSet(s, 0, 0, { kg: 12.5 });
    const added = addExercise(s, 'pushup');
    if (!added.ok) throw new Error(added.error);
    const built = buildWorkoutPatch(w, draftOf(w, { session: added.session }));
    if (!built.ok) throw new Error(built.error);
    expect(built.patch.plan).toBeUndefined();
    expect(built.patch.startedAt).toBeUndefined();
    expect(built.patch.finishedAt).toBeUndefined();
    expect(built.patch.items.map((i) => i.exerciseId)).toEqual(['db-row', 'db-curl']);
  });

  it('drops an unticked set, and an exercise left with none', () => {
    const w = NOW_WORKOUT();
    const s = sessionFromWorkout(w);
    s.items[1].sets[0].done = false;
    const built = buildWorkoutPatch(w, draftOf(w, { session: s }));
    if (!built.ok) throw new Error(built.error);
    expect(built.patch.items.map((i) => i.exerciseId)).toEqual(['db-row']);
    s.items[0].sets.forEach((x) => (x.done = false));
    expect(buildWorkoutPatch(w, draftOf(w, { session: s }))).toEqual({ ok: false, error: 'Tick at least one set first.' });
  });

  it('removing an exercise leaves the plan alone, so the edit does not move it', () => {
    const w = NOW_WORKOUT();
    const removal = removeExercise(sessionFromWorkout(w), 1)!;
    expect(removal.session.plan).toEqual(sessionFromWorkout(w).plan);
    const built = buildWorkoutPatch(w, draftOf(w, { session: removal.session }));
    if (!built.ok) throw new Error(built.error);
    expect(built.patch.plan).toBeUndefined();
    expect(built.patch.items.map((i) => i.exerciseId)).toEqual(['db-row']);
  });

  it('steps the duration by five minutes and never under one', () => {
    expect(durationMinutes('2026-09-29T17:48:00.000Z', '2026-09-29T18:40:00.000Z')).toBe(52);
    expect(stepDuration(52, 1)).toBe(57);
    expect(stepDuration(52, -1)).toBe(47);
    expect(stepDuration(3, -1)).toBe(1);
    expect(stepDuration(1, -1)).toBe(1);
    expect(stepDuration(1438, 1)).toBe(1439);
  });

  it('moves the start back from the finish when the length changes', () => {
    const w = NOW_WORKOUT();
    const built = buildWorkoutPatch(w, draftOf(w, { minutes: 57 }));
    if (!built.ok) throw new Error(built.error);
    expect(built.patch.finishedAt).toBe(w.finishedAt);
    expect(built.patch.startedAt).toBe('2026-09-29T17:43:00.000Z');
  });

  it('moves both times with a new date and time', () => {
    const w = NOW_WORKOUT();
    const built = buildWorkoutPatch(w, draftOf(w, { when: '2026-09-28T07:00' }));
    if (!built.ok) throw new Error(built.error);
    expect(built.patch).toMatchObject({ when: '2026-09-28T07:00', date: '2026-09-28' });
    const finished = Date.parse(built.patch.finishedAt!);
    expect(new Date(finished).getHours()).toBe(7);
    expect(finished - Date.parse(built.patch.startedAt!)).toBe(52 * 60_000);
  });

  it('rejects an empty title', () => {
    const w = NOW_WORKOUT();
    const s = { ...sessionFromWorkout(w), title: '   ' };
    expect(buildWorkoutPatch(w, draftOf(w, { session: s })).ok).toBe(false);
  });
});

describe('the server rescores an edit', () => {
  const TODAY = '2026-09-30';
  const saved = () => {
    const w = workout('2026-09-29', [{ id: 'db-row', sets: [{ kg: 10, reps: 10 }, { kg: 10, reps: 10 }] }], { id: 'w-edit', when: '2026-09-29T18:40', startedAt: '2026-09-29T17:48:00.000Z', finishedAt: '2026-09-29T18:40:00.000Z' });
    const state = stateWith([w]);
    return { ...state, workouts: state.workouts!.map((x) => ({ ...x, xp: scoreState(state)[0].xp })) };
  };
  const run = (body: Record<string, unknown>) => applyRoutineAction(saved(), { action: 'updateWorkout', id: 'w-edit', ...body }, { today: TODAY });

  it('takes new items and works the XP out itself, ignoring what the client says', () => {
    const r = run({
      xp: 9999,
      items: [{ exerciseId: 'db-row', sets: Array.from({ length: 7 }, () => ({ kg: 10, reps: 10, done: true })) }],
    });
    if (!r.ok) throw new Error(r.error);
    const w = r.state.workouts![0];
    expect(w.items[0].sets).toHaveLength(7);
    // 35 for the sets and 50 for the daily bonus: seven sets are 21 minutes.
    expect(w.xp).toBe(85);
    expect(w.xpParts).toMatchObject({ sets: 35, finish: 50 });
  });

  it('moves the date, the length and the plan', () => {
    const r = run({ date: '2026-09-28', when: '2026-09-28T07:00', startedAt: '2026-09-28T06:00:00.000Z', finishedAt: '2026-09-28T07:00:00.000Z', plan: [{ exerciseId: 'db-row', sets: 2 }] });
    if (!r.ok) throw new Error(r.error);
    expect(r.state.workouts![0]).toMatchObject({ date: '2026-09-28', when: '2026-09-28T07:00', startedAt: '2026-09-28T06:00:00.000Z', plan: [{ exerciseId: 'db-row', sets: 2 }] });
  });

  it('refuses bad items, a finish before the start, and a date past tomorrow', () => {
    for (const bad of [
      { items: [] },
      { items: [{ exerciseId: 'nope', sets: [{ done: true, reps: 5 }] }] },
      { items: [{ exerciseId: 'db-row', sets: [{ kg: 10, reps: 10, done: false }] }] },
      { startedAt: '2026-09-29T19:00:00.000Z' },
      { startedAt: '2026-09-27T17:00:00.000Z' },
      { date: '2026-10-05', when: '2026-10-05T10:00' },
    ]) {
      expect(run(bad).ok).toBe(false);
    }
  });

  it('a level seen before a delete is not celebrated when an edit climbs back to it', () => {
    expect(levelForXp(xpForLevel(2))).toBe(2);
    const seen = growSeen(growSeen(null, 2, []), 1, []);
    const climb: CelebrationEvent = { kind: 'levelup', from: 1, to: 2, rank: 'E', xpNow: xpForLevel(2) };
    expect(unseenEvents([climb], seen)).toEqual([]);
  });
});
