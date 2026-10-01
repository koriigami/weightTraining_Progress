// Scoring rules: beat last time vs record, the daily bonus, training days, the weekly goal, the weekly streak and the comeback.
import { describe, expect, it } from 'vitest';
import { computeWorkoutStats, dailyBonusPaid, dayMinutes, planOf, rescoreWorkouts, scoreWorkouts, trainingDays, trainingDaysOf, trainingMinutes } from '../lib/workoutScoring';
import type { WorkoutLog } from '../lib/routines';
import { stateWith, trainingDay, workout } from './helpers';

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

describe('the daily bonus', () => {
  const sets = (n: number) => Array.from({ length: n }, () => ({ reps: 10 }));
  const lift = (date: string, n: number, over: Partial<WorkoutLog> = {}) => workout(date, [{ id: 'pushup', sets: sets(n) }], over);
  const at = (date: string, h: string, id: string, items: Parameters<typeof workout>[1]) => workout(date, items, { id, when: `${date}T${h}:00`, startedAt: `${date}T${h}:00:00.000Z` });

  it('is paid when strength sets alone reach 20 minutes: each ticked set that earns XP counts 3', () => {
    const [short, full] = scoreWorkouts([lift('2026-10-05', 6), lift('2026-10-06', 7)], opts);
    expect([short.minutes, short.dailyXp, short.trainingDay]).toEqual([18, 0, false]);
    expect([full.minutes, full.dailyXp, full.trainingDay]).toEqual([21, 50, true]);
    expect(full.xp).toBe(35 + 50);
  });

  it('only counts ticked sets that earn XP', () => {
    // Seven sets, but one is not ticked and one has no rep: 5 count, 15 minutes.
    const w = workout('2026-10-05', [{ id: 'pushup', sets: [...sets(5), { reps: 10 }, { reps: 0 }], undone: [5] }]);
    const [s] = scoreWorkouts([w], opts);
    expect(s.minutes).toBe(15);
    expect(s.dailyXp).toBe(0);
  });

  it('is paid when cardio alone reaches 20 minutes, intervals counting work plus easy minutes', () => {
    const [short, run, intervals] = scoreWorkouts(
      [
        workout('2026-10-05', [{ id: 'run', sets: [{ min: 19, km: 3 }] }]),
        workout('2026-10-06', [{ id: 'run', sets: [{ min: 20 }] }]),
        workout('2026-10-07', [{ id: 'runwalk', sets: Array.from({ length: 8 }, () => ({ on: 1, off: 1.5 })) }]),
      ],
      opts
    );
    expect(short.dailyXp).toBe(0);
    expect([run.minutes, run.dailyXp]).toEqual([20, 50]);
    expect([intervals.minutes, intervals.dailyXp]).toEqual([20, 50]);
  });

  it('counts cardio minutes in full even though the XP for a set is capped at 30', () => {
    const items = [{ exerciseId: 'treadmill', sets: [{ min: 45, done: true }] }];
    expect(trainingMinutes(items)).toBe(45);
    const [s] = scoreWorkouts([workout('2026-10-05', [{ id: 'treadmill', sets: [{ min: 45 }] }])], opts);
    expect(s.setXp).toBe(30);
    expect(s.minutes).toBe(45);
  });

  it('adds strength and cardio across two workouts the same day, and is paid on the second', () => {
    const morning = at('2026-10-05', '07', 'am', [{ id: 'pushup', sets: sets(5) }]);
    const evening = at('2026-10-05', '19', 'pm', [{ id: 'run', sets: [{ min: 10 }] }]);
    const scores = scoreWorkouts([evening, morning], opts); // saved out of order
    expect(scores.map((s) => s.id)).toEqual(['am', 'pm']);
    expect(scores.map((s) => s.dayMinutes)).toEqual([15, 25]);
    expect(scores.map((s) => s.dailyXp)).toEqual([0, 50]);
    expect(scores.map((s) => s.trainingDay)).toEqual([false, true]);
  });

  it('is paid once a day, and the next day pays again', () => {
    const scores = scoreWorkouts([at('2026-10-05', '07', 'a', [{ id: 'pushup', sets: sets(7) }]), at('2026-10-05', '12', 'b', [{ id: 'pushup', sets: sets(7) }]), at('2026-10-05', '19', 'c', [{ id: 'pushup', sets: sets(7) }]), lift('2026-10-06', 7)], opts);
    expect(scores.map((s) => s.dailyXp)).toEqual([50, 0, 0, 50]);
    expect(scores.map((s) => s.xp)).toEqual([85, 35, 35, 85]);
    expect(trainingDays(scores)).toEqual(['2026-10-05', '2026-10-06']);
  });

  it('is still paid when a planned treadmill was skipped', () => {
    const plan = [{ exerciseId: 'pushup', sets: 14 }, { exerciseId: 'treadmill', sets: 1 }];
    const [s] = scoreWorkouts([lift('2026-10-05', 14, { plan })], opts);
    expect(s.planComplete).toBe(false);
    expect(s.planMissing).toEqual(['treadmill']);
    expect(s.dailyXp).toBe(50);
    expect(s.trainingDay).toBe(true);
  });

  it('does not look at the plan at all', () => {
    const plan = [{ exerciseId: 'pushup', sets: 30 }];
    expect(scoreWorkouts([lift('2026-10-05', 7, { plan })], opts)[0].dailyXp).toBe(50);
    expect(scoreWorkouts([lift('2026-10-05', 7, { plan: [{ exerciseId: 'pushup', sets: 1 }] })], opts)[0].dailyXp).toBe(50);
    expect(scoreWorkouts([lift('2026-10-05', 7)], opts)[0].dailyXp).toBe(50); // a workout saved before v8 has no plan
  });

  it('is stored on the workout by rescoring, under the finish key', () => {
    const w = lift('2026-10-05', 7);
    const [r] = rescoreWorkouts(stateWith([w]), [w], '2026-10-30');
    expect(r.xpParts).toEqual({ sets: 35, cardio: 0, beat: 0, record: 0, finish: 50, weekly: 0, comeback: 0 });
    expect(r.xp).toBe(85);
  });

  it('is told by the helpers the live popover uses: minutes of a date, with items in progress, and whether it is paid', () => {
    const saved = [lift('2026-10-05', 4), workout('2026-10-04', [{ id: 'run', sets: [{ min: 30 }] }])];
    const live = [{ exerciseId: 'pushup', sets: [{ reps: 10, done: true }, { reps: 10, done: true }, { reps: 10, done: false }] }];
    expect(dayMinutes(saved, '2026-10-05')).toBe(12);
    expect(dayMinutes(saved, '2026-10-05', live)).toBe(18);
    expect(dailyBonusPaid(saved, '2026-10-05')).toBe(false);
    expect(dailyBonusPaid(saved, '2026-10-04')).toBe(true);
    // Items in progress never count as already paid: they finish after what is saved.
    expect(dailyBonusPaid([], '2026-10-05')).toBe(false);
  });

  it('only counts saved workouts stamped before the moment given, since scoring goes in time order', () => {
    const evening = workout('2026-10-05', [{ id: 'run', sets: [{ min: 30 }] }], { when: '2026-10-05T18:00' });
    const live = [{ exerciseId: 'pushup', sets: [{ reps: 10, done: true }] }];
    expect(dailyBonusPaid([evening], '2026-10-05', undefined, '2026-10-05T03:22')).toBe(false);
    expect(dayMinutes([evening], '2026-10-05', live, undefined, '2026-10-05T03:22')).toBe(3);
    expect(dailyBonusPaid([evening], '2026-10-05', undefined, '2026-10-05T19:00')).toBe(true);
  });
});

describe('training days and the weekly goal', () => {
  it('count dates that reached 20 minutes, not workouts', () => {
    const scores = scoreWorkouts([trainingDay('2026-10-05'), workout('2026-10-06', [{ id: 'pushup', sets: [{ reps: 10 }] }]), trainingDay('2026-10-05')], opts);
    expect(trainingDays(scores)).toEqual(['2026-10-05']);
    expect(trainingDaysOf(stateWith([trainingDay('2026-10-07'), trainingDay('2026-10-05')]))).toEqual(['2026-10-05', '2026-10-07']);
    // Workouts dated after tomorrow are left out when today is given.
    expect(trainingDaysOf(stateWith([trainingDay('2026-10-05'), trainingDay('2026-11-20')]), '2026-10-30')).toEqual(['2026-10-05']);
  });

  it('pay +50 on the workout that makes the week reach the goal, counting training days only', () => {
    const short = (date: string) => workout(date, [{ id: 'pushup', sets: [{ reps: 10 }] }]);
    const scores = scoreWorkouts([short('2026-10-05'), trainingDay('2026-10-06'), trainingDay('2026-10-06'), short('2026-10-07'), trainingDay('2026-10-08'), trainingDay('2026-10-09')], { weeklyGoal: 3 });
    // Training days: Tue, Thu and Fri. Short workouts and a second workout on Tuesday add nothing.
    expect(scores.map((s) => s.weeklyXp)).toEqual([0, 0, 0, 0, 0, 50]);
  });

  it('are never reached by workouts that stay under 20 minutes', () => {
    const short = (date: string) => workout(date, [{ id: 'pushup', sets: [{ reps: 10 }, { reps: 10 }] }]);
    const scores = scoreWorkouts([short('2026-10-05'), short('2026-10-06'), short('2026-10-07')], opts);
    expect(scores.map((s) => s.weeklyXp)).toEqual([0, 0, 0]);
  });

  it('are reached on the workout that tops up a day, when two short ones add up', () => {
    const at = (h: string, id: string, n: number) => workout('2026-10-05', [{ id: 'pushup', sets: Array.from({ length: n }, () => ({ reps: 10 })) }], { id, when: `2026-10-05T${h}:00`, startedAt: `2026-10-05T${h}:00:00.000Z` });
    const scores = scoreWorkouts([at('07', 'a', 4), at('19', 'b', 3)], { weeklyGoal: 1 });
    expect(scores.map((s) => [s.dailyXp, s.weeklyXp])).toEqual([[0, 0], [50, 50]]);
  });
});

describe('the weekly streak', () => {
  it('is fed training days: a week with only a 5 minute workout does not keep it', () => {
    const short = workout('2026-10-14', [{ id: 'run', sets: [{ min: 5, km: 1 }] }]);
    const state = stateWith([trainingDay('2026-10-05'), short, trainingDay('2026-10-21')]);
    const stats = computeWorkoutStats(state, '2026-10-23');
    expect(stats.weeklyStreak).toBe(1);
    expect(stats.bestWeeklyStreak).toBe(1);
    expect(stats.workouts).toBe(3);
    expect(computeWorkoutStats(stateWith([trainingDay('2026-10-05'), trainingDay('2026-10-14'), trainingDay('2026-10-21')]), '2026-10-23').weeklyStreak).toBe(3);
  });

  it('counts the training days of this week in the stats', () => {
    const stats = computeWorkoutStats(stateWith([trainingDay('2026-10-19'), trainingDay('2026-10-19'), trainingDay('2026-10-20'), workout('2026-10-21', [{ id: 'pushup', sets: [{ reps: 10 }] }])]), '2026-10-23');
    expect(stats.thisWeek).toBe(2);
  });

  it('counts records in the stats', () => {
    const stats = computeWorkoutStats(stateWith([workout('2026-10-05', [{ id: 'pushup', sets: [{ reps: 10 }] }]), workout('2026-10-06', [{ id: 'pushup', sets: [{ reps: 12 }] }])]), '2026-10-30');
    expect(stats.records).toBe(1);
  });
});

describe('the comeback bonus', () => {
  it('is paid once, on the first training day after a whole week with none', () => {
    // Training in the week of Oct 5, nothing in the week of Oct 12, then two training days in the week of Oct 19.
    const scores = scoreWorkouts([trainingDay('2026-10-06'), trainingDay('2026-10-19'), trainingDay('2026-10-20')], opts);
    expect(scores.map((s) => s.comebackXp)).toEqual([0, 25, 0]);
    expect(scores[1].xp).toBe(85 + 25);
    expect(scores[1].parts.comeback).toBe(25);
  });

  it('is never paid for a first training day, or when the week before had one', () => {
    const first = scoreWorkouts([trainingDay('2026-10-19')], opts);
    expect(first[0].comebackXp).toBe(0);
    // A week of short workouts is not a training week, so the first training day after it is still the first ever.
    const afterShort = scoreWorkouts([workout('2026-10-06', [{ id: 'pushup', sets: [{ reps: 10 }] }]), trainingDay('2026-10-19')], opts);
    expect(afterShort.map((s) => s.comebackXp)).toEqual([0, 0]);
    // Training the week before, even once, means no week was missed.
    expect(scoreWorkouts([trainingDay('2026-10-06'), trainingDay('2026-10-13'), trainingDay('2026-10-20')], opts).map((s) => s.comebackXp)).toEqual([0, 0, 0]);
    // A short gap inside a week is not a week off.
    expect(scoreWorkouts([trainingDay('2026-10-06'), trainingDay('2026-10-11'), trainingDay('2026-10-12')], opts).map((s) => s.comebackXp)).toEqual([0, 0, 0]);
  });

  it('is paid on the workout that makes the day a training day, with the daily bonus', () => {
    const at = (h: string, id: string, n: number) => workout('2026-10-19', [{ id: 'pushup', sets: Array.from({ length: n }, () => ({ reps: 10 })) }], { id, when: `2026-10-19T${h}:00`, startedAt: `2026-10-19T${h}:00:00.000Z` });
    const scores = scoreWorkouts([trainingDay('2026-10-06'), at('07', 'a', 3), at('19', 'b', 5)], opts);
    expect(scores.map((s) => [s.dailyXp, s.comebackXp])).toEqual([[50, 0], [0, 0], [50, 25]]);
  });

  it('works again after a second break, and counts a break longer than a week once', () => {
    const scores = scoreWorkouts([trainingDay('2026-10-05'), trainingDay('2026-10-19'), trainingDay('2026-10-26'), trainingDay('2026-11-23')], opts);
    expect(scores.map((s) => s.comebackXp)).toEqual([0, 25, 0, 25]);
  });
});

describe('Clean Sweep and the plan', () => {
  const plan = [{ exerciseId: 'pushup', sets: 7 }, { exerciseId: 'plank', sets: 1 }];

  it('still needs every planned exercise done, so a removed one denies it even when the daily bonus is paid', () => {
    const removed = trainingDay('2026-10-05', { routineId: 'r1', plan });
    const [r] = scoreWorkouts([removed], opts);
    expect(r.dailyXp).toBe(50);
    expect(r.planMissing).toEqual(['plank']);
    expect(r.cleanSweep).toBe(false);
    const full = workout('2026-10-05', [{ id: 'pushup', sets: Array.from({ length: 7 }, () => ({ reps: 10 })) }, { id: 'plank', sets: [{ sec: 30 }] }], { routineId: 'r1', plan });
    expect(scoreWorkouts([full], opts)[0].cleanSweep).toBe(true);
  });

  it('a workout saved before v8 has no plan: what it ticked stands in as the plan', () => {
    const w = workout('2026-10-05', [{ id: 'db-ohp', sets: [{ kg: 5, reps: 10 }, { kg: 5, reps: 10 }] }, { id: 'pushup', sets: [{ reps: 10 }, { reps: 10 }], undone: [1] }]);
    expect(planOf(w)).toEqual([{ exerciseId: 'db-ohp', sets: 2 }, { exerciseId: 'pushup', sets: 1 }]);
    const [s] = scoreWorkouts([w], opts);
    expect(s.planComplete).toBe(true);
    expect(s.cleanSweep).toBe(false); // no routine and no plan snapshot
  });

  it('names what is missing and counts a set with no rep as not done', () => {
    const w = workout('2026-10-05', [{ id: 'pushup', sets: [{ reps: 10 }, { reps: 0 }] }], { plan: [{ exerciseId: 'pushup', sets: 2 }] });
    const [s] = scoreWorkouts([w], opts);
    expect(s.planComplete).toBe(false);
    expect(s.planMissing).toEqual(['pushup']);
  });
});
