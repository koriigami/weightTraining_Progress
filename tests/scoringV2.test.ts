// Scoring rules v2: beat last time vs record, the finish bonus and the weekly goal.
import { describe, expect, it } from 'vitest';
import { computeWorkoutStats, planOf, rescoreWorkouts, scoreWorkouts } from '../lib/workoutScoring';
import type { WorkoutLog } from '../lib/routines';
import { stateWith, workout } from './helpers';

const opts = { weeklyGoal: 3 };

type Sets = Parameters<typeof workout>[1][number]['sets'];

// One exercise per workout, one workout per day from 2026-10-05, scored in order.
function run(id: string, ...perWorkout: Sets[]) {
  const ws = perWorkout.map((sets, i) => workout(`2026-10-${String(5 + i).padStart(2, '0')}`, [{ id, sets }]));
  return scoreWorkouts(ws, opts);
}

const kinds = (scores: ReturnType<typeof run>) => scores.map((s) => s.marks.map((m) => m.kind));

describe('beat last time and record: weight and reps', () => {
  it('a heavier set than ever is a record, and a record replaces the beat', () => {
    const scores = run('db-ohp', [{ kg: 10, reps: 10 }], [{ kg: 12, reps: 8 }]);
    expect(scores[1].marks).toEqual([{ exerciseId: 'db-ohp', kind: 'record', kg: 12, reps: 8 }]);
    expect(scores[1].recordXp).toBe(25);
    expect(scores[1].beatXp).toBe(0);
  });

  it('the same weight for more reps is a record too', () => {
    expect(kinds(run('db-ohp', [{ kg: 10, reps: 10 }], [{ kg: 10, reps: 11 }]))).toEqual([[], ['record']]);
  });

  it('better than last time but not than the best is a beat, worth 10', () => {
    const scores = run('db-ohp', [{ kg: 12, reps: 8 }], [{ kg: 10, reps: 10 }], [{ kg: 11, reps: 10 }]);
    expect(kinds(scores)).toEqual([[], [], ['beat']]);
    expect(scores[2].beatXp).toBe(10);
    expect(scores[2].recordXp).toBe(0);
  });

  it('the same weight for more reps than last time is a beat', () => {
    expect(kinds(run('db-ohp', [{ kg: 12, reps: 8 }], [{ kg: 10, reps: 8 }], [{ kg: 10, reps: 9 }]))).toEqual([[], [], ['beat']]);
  });

  it('more weight for fewer reps than last time is not a beat', () => {
    expect(kinds(run('db-ohp', [{ kg: 12, reps: 8 }], [{ kg: 10, reps: 10 }], [{ kg: 11, reps: 9 }]))).toEqual([[], [], []]);
  });

  it('the same set again earns nothing', () => {
    expect(kinds(run('db-ohp', [{ kg: 10, reps: 10 }], [{ kg: 10, reps: 10 }]))).toEqual([[], []]);
  });

  it('the first time an exercise appears earns neither', () => {
    const [s] = run('db-ohp', [{ kg: 100, reps: 10 }]);
    expect(s.marks).toEqual([]);
    expect(s.beatXp + s.recordXp).toBe(0);
  });

  it('last time is the most recent workout with a qualifying set of that exercise', () => {
    const a = workout('2026-10-05', [{ id: 'db-ohp', sets: [{ kg: 10, reps: 10 }] }]);
    const b = workout('2026-10-06', [{ id: 'db-ohp', sets: [{ kg: 8, reps: 8 }, { kg: 7, reps: 0 }], undone: [0] }, { id: 'pushup', sets: [{ reps: 10 }] }]);
    const c = workout('2026-10-07', [{ id: 'db-ohp', sets: [{ kg: 11, reps: 10 }] }]);
    const scores = scoreWorkouts([a, b, c], opts);
    // b's press was not ticked and c's other set had no reps, so a is still last time. 11 kg for 10 beats 10 kg for 10 and is a record.
    expect(scores[2].marks).toEqual([{ exerciseId: 'db-ohp', kind: 'record', kg: 11, reps: 10 }]);
  });

  it('every exercise in a workout can earn one', () => {
    const a = workout('2026-10-05', [{ id: 'db-ohp', sets: [{ kg: 10, reps: 10 }] }, { id: 'pushup', sets: [{ reps: 10 }] }]);
    const b = workout('2026-10-06', [{ id: 'db-ohp', sets: [{ kg: 12, reps: 10 }] }, { id: 'pushup', sets: [{ reps: 12 }] }]);
    const [, sb] = scoreWorkouts([a, b], opts);
    expect(sb.marks.map((m) => [m.exerciseId, m.kind])).toEqual([['db-ohp', 'record'], ['pushup', 'record']]);
    expect(sb.recordXp).toBe(50);
  });
});

describe('beat last time and record: reps and time', () => {
  it('reps: more than the best is a record, more than last time is a beat', () => {
    expect(kinds(run('pushup', [{ reps: 15 }], [{ reps: 10 }], [{ reps: 12 }], [{ reps: 16 }]))).toEqual([[], [], ['beat'], ['record']]);
  });

  it('time: a longer hold', () => {
    const scores = run('plank', [{ sec: 60 }], [{ sec: 30 }], [{ sec: 45 }], [{ sec: 45 }], [{ sec: 70 }]);
    expect(kinds(scores)).toEqual([[], [], ['beat'], [], ['record']]);
    expect(scores[4].marks[0]).toMatchObject({ sec: 70 });
  });

  it('a hold under 5 seconds does not count as a set', () => {
    expect(kinds(run('plank', [{ sec: 30 }], [{ sec: 4 }]))).toEqual([[], []]);
    expect(scoreWorkouts([workout('2026-10-05', [{ id: 'plank', sets: [{ sec: 4 }] }, { id: 'pushup', sets: [{ reps: 5 }] }])], opts)[0].setXp).toBe(5);
  });
});

describe('beat last time and record: distance cardio', () => {
  it('a longer distance than ever is a record', () => {
    const scores = run('run', [{ min: 30, km: 5 }], [{ min: 40, km: 6 }]);
    expect(scores[1].marks).toEqual([{ exerciseId: 'run', kind: 'record', km: 6, min: 40 }]);
  });

  it('more distance than last time, short of the best, is a beat', () => {
    expect(kinds(run('run', [{ min: 40, km: 6 }], [{ min: 30, km: 5 }], [{ min: 60, km: 5.5 }]))).toEqual([[], [], ['beat']]);
  });

  it('the same distance in less time is a beat, never a record', () => {
    expect(kinds(run('run', [{ min: 30, km: 5 }], [{ min: 28, km: 5 }]))).toEqual([[], ['beat']]);
    expect(kinds(run('run', [{ min: 30, km: 5 }], [{ min: 32, km: 5 }]))).toEqual([[], []]);
  });

  it('less distance is nothing, even when faster', () => {
    expect(kinds(run('run', [{ min: 30, km: 5 }], [{ min: 20, km: 4 }]))).toEqual([[], []]);
  });

  it('with no distance on either side, more minutes is a beat and never a record', () => {
    const scores = run('treadmill', [{ min: 20 }], [{ min: 30 }], [{ min: 25 }]);
    expect(kinds(scores)).toEqual([[], ['beat'], []]);
    expect(scores[1].marks[0]).toMatchObject({ km: 0, min: 30 });
  });

  it('a workout needs a minute to count', () => {
    expect(kinds(run('treadmill', [{ min: 20 }], [{ min: 0, km: 3 }]))).toEqual([[], []]);
  });
});

describe('intervals', () => {
  it('never beat or record anything', () => {
    expect(kinds(run('runwalk', [{ on: 1, off: 1 }], [{ on: 5, off: 5 }]))).toEqual([[], []]);
  });
});

describe('the finish bonus', () => {
  const plan = (items: [string, number][]) => items.map(([exerciseId, sets]) => ({ exerciseId, sets }));

  it('pays the XP of the planned sets when the plan is done', () => {
    const w = workout('2026-10-05', [{ id: 'db-ohp', sets: [{ kg: 5, reps: 10 }, { kg: 5, reps: 10 }, { kg: 5, reps: 10 }] }], { plan: plan([['db-ohp', 3]]) });
    const [s] = scoreWorkouts([w], opts);
    expect(s.planComplete).toBe(true);
    expect(s.planMissing).toEqual([]);
    expect(s.finishXp).toBe(15);
    expect(s.xp).toBe(15 + 15);
  });

  it('pays nothing when a planned set is missing, and names what is missing', () => {
    const w = workout('2026-10-05', [{ id: 'db-ohp', sets: [{ kg: 5, reps: 10 }, { kg: 5, reps: 10 }, { kg: 5, reps: 10 }], undone: [2] }, { id: 'pushup', sets: [{ reps: 10 }] }], {
      plan: plan([['db-ohp', 3], ['pushup', 1], ['plank', 1]]),
    });
    const [s] = scoreWorkouts([w], opts);
    expect(s.planComplete).toBe(false);
    expect(s.planMissing).toEqual(['db-ohp', 'plank']);
    expect(s.finishXp).toBe(0);
    expect(s.xp).toBe(15);
  });

  it('is sized to the planned sets, not to every set done', () => {
    const w = workout('2026-10-05', [{ id: 'db-ohp', sets: [{ kg: 5, reps: 10 }, { kg: 5, reps: 10 }, { kg: 5, reps: 10 }, { kg: 5, reps: 10 }] }], { plan: plan([['db-ohp', 2]]) });
    const [s] = scoreWorkouts([w], opts);
    expect(s.setXp).toBe(20);
    expect(s.finishXp).toBe(10);
  });

  it('ignores exercises that were not in the plan', () => {
    const w = workout('2026-10-05', [{ id: 'db-ohp', sets: [{ kg: 5, reps: 10 }] }, { id: 'pushup', sets: [{ reps: 10 }, { reps: 10 }] }], { plan: plan([['db-ohp', 1]]) });
    const [s] = scoreWorkouts([w], opts);
    expect(s.planComplete).toBe(true);
    expect(s.finishXp).toBe(5);
  });

  it('is capped at 50', () => {
    const sets = Array.from({ length: 12 }, () => ({ reps: 10 }));
    const w = workout('2026-10-05', [{ id: 'pushup', sets }], { plan: plan([['pushup', 12]]) });
    const [s] = scoreWorkouts([w], opts);
    expect(s.setXp).toBe(60);
    expect(s.finishXp).toBe(50);
  });

  it('counts cardio minutes, and a set with no rep does not fill the plan', () => {
    const cardio = workout('2026-10-05', [{ id: 'run', sets: [{ min: 25, km: 4 }] }], { plan: plan([['run', 1]]) });
    expect(scoreWorkouts([cardio], opts)[0].finishXp).toBe(35);
    const empty = workout('2026-10-06', [{ id: 'pushup', sets: [{ reps: 10 }, { reps: 0 }] }], { plan: plan([['pushup', 2]]) });
    const [s] = scoreWorkouts([empty], opts);
    expect(s.planComplete).toBe(false);
    expect(s.planMissing).toEqual(['pushup']);
  });

  it('a workout saved before v8 has no plan: what it ticked stands in as the plan', () => {
    const w = workout('2026-10-05', [{ id: 'db-ohp', sets: [{ kg: 5, reps: 10 }, { kg: 5, reps: 10 }] }, { id: 'pushup', sets: [{ reps: 10 }, { reps: 10 }], undone: [1] }]);
    expect(planOf(w)).toEqual([{ exerciseId: 'db-ohp', sets: 2 }, { exerciseId: 'pushup', sets: 1 }]);
    const [s] = scoreWorkouts([w], opts);
    expect(s.planComplete).toBe(true);
    expect(s.finishXp).toBe(15);
  });

  it('is paid at most twice a calendar day, in time order, and the third still counts as finished', () => {
    const at = (h: string, i: number) =>
      workout('2026-10-05', [{ id: 'pushup', sets: [{ reps: 10 }, { reps: 10 }] }], { id: `d${i}`, when: `2026-10-05T${h}:00`, startedAt: `2026-10-05T${h}:00:00.000Z` });
    const [a, b, c] = [at('07', 1), at('12', 2), at('19', 3)];
    const scores = scoreWorkouts([c, a, b], opts); // saved out of order
    expect(scores.map((s) => s.id)).toEqual(['d1', 'd2', 'd3']);
    expect(scores.map((s) => s.finishXp)).toEqual([10, 10, 0]);
    expect(scores.map((s) => s.planComplete)).toEqual([true, true, true]);
    // A different day starts over.
    const next = workout('2026-10-06', [{ id: 'pushup', sets: [{ reps: 10 }, { reps: 10 }] }]);
    expect(scoreWorkouts([a, b, c, next], opts)[3].finishXp).toBe(10);
  });

  it('is stored on the workout by rescoring', () => {
    const w = workout('2026-10-05', [{ id: 'pushup', sets: [{ reps: 10 }] }], { plan: plan([['pushup', 2]]) });
    const [r] = rescoreWorkouts(stateWith([w]), [w], '2026-10-30');
    expect(r).toMatchObject({ planComplete: false, planMissing: ['pushup'], xp: 5 });
    expect(r.xpParts).toEqual({ sets: 5, cardio: 0, beat: 0, record: 0, finish: 0, weekly: 0 });
  });
});

describe('the weekly goal', () => {
  const day = (date: string, done = true): WorkoutLog =>
    workout(date, [{ id: 'pushup', sets: [{ reps: 10 }, { reps: 10 }], undone: done ? [] : [1] }], { plan: [{ exerciseId: 'pushup', sets: 2 }] });

  it('counts only workouts that finished their plan', () => {
    const scores = scoreWorkouts([day('2026-10-05'), day('2026-10-06', false), day('2026-10-07', false), day('2026-10-08')], { weeklyGoal: 2 });
    expect(scores.map((s) => s.weeklyXp)).toEqual([0, 0, 0, 50]);
  });

  it('is never reached by workouts that missed their plan', () => {
    const scores = scoreWorkouts([day('2026-10-05', false), day('2026-10-06', false), day('2026-10-07', false)], opts);
    expect(scores.map((s) => s.weeklyXp)).toEqual([0, 0, 0]);
  });

  it('a third finish on the same day still counts towards the week', () => {
    const at = (h: string, i: number) => workout('2026-10-05', [{ id: 'pushup', sets: [{ reps: 10 }] }], { id: `s${i}`, when: `2026-10-05T${h}:00`, startedAt: `2026-10-05T${h}:00:00.000Z` });
    const scores = scoreWorkouts([at('07', 1), at('12', 2), at('19', 3)], opts);
    expect(scores.map((s) => s.weeklyXp)).toEqual([0, 0, 50]);
  });
});

describe('the weekly streak', () => {
  it('counts a week with any workout that has a ticked set, finished plan or not', () => {
    const missed = (date: string) => workout(date, [{ id: 'pushup', sets: [{ reps: 10 }] }], { plan: [{ exerciseId: 'pushup', sets: 5 }] });
    const state = stateWith([missed('2026-10-05'), missed('2026-10-14'), missed('2026-10-21')]);
    const stats = computeWorkoutStats(state, '2026-10-23');
    expect(stats.weeklyStreak).toBe(3);
    expect(stats.bestWeeklyStreak).toBe(3);
    expect(stats.workouts).toBe(3);
  });

  it('counts records in the stats', () => {
    const stats = computeWorkoutStats(stateWith([workout('2026-10-05', [{ id: 'pushup', sets: [{ reps: 10 }] }]), workout('2026-10-06', [{ id: 'pushup', sets: [{ reps: 12 }] }])]), '2026-10-30');
    expect(stats.records).toBe(1);
  });
});
