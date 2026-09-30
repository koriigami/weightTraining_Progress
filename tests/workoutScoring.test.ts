import { describe, expect, it } from 'vitest';
import { computeProgress, emptyState, totalXp, XP } from '../lib/progress';
import { allEarnedBadges, computeBadges } from '../lib/badges';
import { setXp, workoutTotals, defaultPrefs } from '../lib/routines';
import { exerciseById } from '../data/exercises';
import {
  bestSet,
  rescoreWorkouts,
  scoreWorkouts,
  weeklyStreaks,
  workoutXpTotal,
} from '../lib/workoutScoring';
import { stateWith, workout } from './helpers';
import { legacyPlanState } from './fixtures/legacyPlanState';
import type { AppState } from '../lib/progress';

const ex = (id: string) => exerciseById(id)!;
const TODAY = '2026-10-30';
const opts = { weeklyGoal: 3 };

// Mon 2026-10-05 is the start of a Monday to Sunday week.
const MON = '2026-10-05';

describe('set XP', () => {
  it('is 5 for a strength set of any kind', () => {
    expect(setXp(ex('db-ohp'), { kg: 5, reps: 10 })).toBe(5);
    expect(setXp(ex('pushup'), { reps: 12 })).toBe(5);
    expect(setXp(ex('plank'), { sec: 40 })).toBe(5);
  });

  it('needs a rep, or a 5 second hold, and never scales with weight', () => {
    expect(setXp(ex('db-ohp'), { kg: 5, reps: 0 })).toBe(0);
    expect(setXp(ex('db-ohp'), { kg: 5 })).toBe(0);
    expect(setXp(ex('db-ohp'), { kg: 100, reps: 1 })).toBe(5);
    expect(setXp(ex('pushup'), { reps: 0 })).toBe(0);
    expect(setXp(ex('plank'), { sec: 4 })).toBe(0);
    expect(setXp(ex('plank'), { sec: 5 })).toBe(5);
  });

  it('needs a minute for distance cardio', () => {
    expect(setXp(ex('treadmill'), { min: 0, km: 2 })).toBe(0);
    expect(setXp(ex('treadmill'), { km: 2 })).toBe(0);
  });

  it('is a minute for a minute of cardio, capped at 30 a set, plus 10 with distance', () => {
    expect(setXp(ex('treadmill'), { min: 20 })).toBe(20);
    expect(setXp(ex('treadmill'), { min: 20, km: 3 })).toBe(30);
    expect(setXp(ex('treadmill'), { min: 45 })).toBe(30);
    expect(setXp(ex('treadmill'), { min: 45, km: 6 })).toBe(40);
    expect(setXp(ex('treadmill'), { min: 20, km: 0 })).toBe(20);
  });

  it('is work plus easy minutes for an interval set', () => {
    expect(setXp(ex('runwalk'), { on: 1, off: 1.5 })).toBe(3);
    expect(setXp(ex('bike-int'), { on: 2, off: 3 })).toBe(5);
  });

  it('caps an interval set at 30', () => {
    expect(setXp(ex('runwalk'), { on: 20, off: 25 })).toBe(30);
    expect(setXp(ex('runwalk'), { on: 10, off: 20 })).toBe(30);
    expect(setXp(ex('runwalk'), { on: 10, off: 19 })).toBe(29);
  });
});

describe('workout totals', () => {
  it('counts only ticked sets, and volume only for weight and reps', () => {
    const w = workout(MON, [
      { id: 'db-ohp', sets: [{ kg: 10, reps: 10 }, { kg: 10, reps: 8 }, { kg: 10, reps: 5 }], undone: [2] },
      { id: 'pushup', sets: [{ reps: 15 }] },
      { id: 'treadmill', sets: [{ min: 10, km: 1.2 }] },
    ]);
    const t = workoutTotals(w.items);
    expect(t.sets).toBe(4);
    expect(t.volume).toBe(180);
    expect(t.xp).toBe(5 + 5 + 5 + 20);
    expect(t.exercises).toBe(3);
    expect(t.cardioMinutes).toBe(10);
    expect(t.km).toBe(1.2);
  });
});

describe('finishing a workout', () => {
  it('earns set XP plus a finish bonus sized to the sets, and nothing when no set is ticked', () => {
    const w = workout(MON, [{ id: 'pushup', sets: [{ reps: 10 }, { reps: 10 }, { reps: 10 }], undone: [2] }]);
    const [s] = scoreWorkouts([w], opts);
    expect(s.setXp).toBe(10);
    expect(s.finishXp).toBe(10);
    expect(s.xp).toBe(20);

    const empty = workout('2026-10-06', [{ id: 'pushup', sets: [{ reps: 10 }], undone: [0] }]);
    expect(scoreWorkouts([empty], opts)).toEqual([]);
  });
});

describe('records and beats', () => {
  const sets = (kg: number, reps: number) => [{ id: 'db-ohp', sets: [{ kg, reps }] }];

  it('need an earlier workout to compare with, so the first one earns neither', () => {
    const [s] = scoreWorkouts([workout(MON, sets(20, 10))], opts);
    expect(s.marks).toEqual([]);
    expect(s.recordXp).toBe(0);
    expect(s.beatXp).toBe(0);
  });

  it('go to the heavier set, or the same weight for more reps, and cost +25 each', () => {
    const scores = scoreWorkouts(
      [
        workout('2026-10-05', sets(10, 10)),
        workout('2026-10-06', sets(12.5, 6)),
        workout('2026-10-07', sets(12.5, 8)),
        workout('2026-10-08', sets(12.5, 8)),
        workout('2026-10-09', sets(10, 20)),
      ],
      opts
    );
    expect(scores.map((s) => s.records)).toEqual([0, 1, 1, 0, 0]);
    expect(scores[1].marks).toEqual([{ exerciseId: 'db-ohp', kind: 'record', kg: 12.5, reps: 6 }]);
    expect(scores[1].recordXp).toBe(25);
    expect(scores[1].xp).toBe(5 + 5 + 25);
  });

  it('count once per exercise per workout, using the best set', () => {
    const scores = scoreWorkouts(
      [
        workout('2026-10-05', sets(10, 10)),
        workout('2026-10-06', [
          {
            id: 'db-ohp',
            sets: [
              { kg: 12, reps: 8 },
              { kg: 15, reps: 5 },
              { kg: 14, reps: 6 },
            ],
          },
        ]),
      ],
      opts
    );
    expect(scores[1].marks).toEqual([{ exerciseId: 'db-ohp', kind: 'record', kg: 15, reps: 5 }]);
  });

  it('ignore unticked sets', () => {
    const scores = scoreWorkouts(
      [
        workout('2026-10-05', [{ id: 'db-ohp', sets: [{ kg: 10, reps: 10 }] }, { id: 'pushup', sets: [{ reps: 10 }] }]),
        workout('2026-10-06', [{ id: 'db-ohp', sets: [{ kg: 50, reps: 10 }, { kg: 10, reps: 10 }], undone: [0] }, { id: 'pushup', sets: [{ reps: 10 }] }]),
      ],
      opts
    );
    expect(scores[1].marks).toEqual([]);
  });

  it('are worked out from earlier workouts by date, not by the order they were saved', () => {
    const heavy = workout('2026-10-08', sets(20, 5));
    const light = workout('2026-10-06', sets(10, 5));
    const scores = scoreWorkouts([heavy, light], opts); // saved heavy first
    expect(scores.map((s) => s.id)).toEqual([light.id, heavy.id]);
    expect(scores[0].marks).toEqual([]);
    expect(scores[1].records).toBe(1);
  });

  it('cannot be farmed by logging a lighter workout on an earlier date after the fact', () => {
    // A heavy workout today, then a lighter one backdated. The backdated one
    // is first in time, so it is the baseline and the heavy one is the record.
    const scores = scoreWorkouts([workout('2026-10-08', sets(20, 5)), workout('2026-10-01', sets(5, 5))], opts);
    expect(scores.map((s) => s.records)).toEqual([0, 1]);
  });
});

describe('weekly goal bonus', () => {
  const day = (date: string) => workout(date, [{ id: 'pushup', sets: [{ reps: 10 }] }]);

  it('pays +50 once, on the workout that reaches the goal in a Monday to Sunday week', () => {
    const scores = scoreWorkouts([day('2026-10-05'), day('2026-10-07'), day('2026-10-11'), day('2026-10-11')], opts);
    expect(scores.map((s) => s.weeklyXp)).toEqual([0, 0, 50, 0]);
  });

  it('starts counting again on Monday', () => {
    const scores = scoreWorkouts(
      [day('2026-10-11'), day('2026-10-12'), day('2026-10-13'), day('2026-10-14'), day('2026-10-15')],
      { weeklyGoal: 2 }
    );
    // Sunday is its own week. Mon 12 and Tue 13 reach the goal of 2.
    expect(scores.map((s) => s.weeklyXp)).toEqual([0, 0, 50, 0, 0]);
  });

  it('uses the weekly goal it is given', () => {
    const days = [day('2026-10-05'), day('2026-10-06')];
    expect(scoreWorkouts(days, { weeklyGoal: 1 }).map((s) => s.weeklyXp)).toEqual([50, 0]);
    expect(scoreWorkouts(days, { weeklyGoal: 5 }).map((s) => s.weeklyXp)).toEqual([0, 0]);
  });

  it('reads the goal from prefs, defaulting to 3', () => {
    const days = [day('2026-10-05'), day('2026-10-06'), day('2026-10-07')];
    expect(workoutXpTotal(stateWith(days))).toBe(3 * 10 + 50);
    expect(workoutXpTotal(stateWith(days, { prefs: { ...defaultPrefs(), weeklyGoal: 2 } }))).toBe(3 * 10 + 50);
    expect(workoutXpTotal(stateWith(days, { prefs: { ...defaultPrefs(), weeklyGoal: 4 } }))).toBe(3 * 10);
  });
});

describe('anti-farming', () => {
  it('ignores workouts dated after tomorrow', () => {
    const future = workout('2026-11-20', [{ id: 'pushup', sets: [{ reps: 10 }] }]);
    const tomorrow = workout('2026-10-31', [{ id: 'pushup', sets: [{ reps: 10 }] }]);
    const s = stateWith([future, tomorrow]);
    expect(workoutXpTotal(s, '2026-10-30')).toBe(10);
    expect(computeProgress(s, '2026-10-30').workout.workouts).toBe(1);
    expect(rescoreWorkouts(s, s.workouts!, '2026-10-30').map((w) => w.xp)).toEqual([0, 10]);
  });

  it('gives no XP for a workout with nothing ticked', () => {
    const s = stateWith([workout(MON, [{ id: 'pushup', sets: [{ reps: 10 }], undone: [0] }])]);
    expect(workoutXpTotal(s, TODAY)).toBe(0);
  });
});

describe('rescoring', () => {
  it('stores xp, marks and the plan result on each workout and follows deletes', () => {
    const a = workout('2026-10-05', [{ id: 'db-ohp', sets: [{ kg: 10, reps: 10 }] }]);
    const b = workout('2026-10-06', [{ id: 'db-ohp', sets: [{ kg: 12, reps: 10 }] }]);
    const both = rescoreWorkouts(stateWith([a, b]), [a, b], TODAY);
    expect(both.map((w) => w.xp)).toEqual([10, 35]);
    expect(both[1].marks).toEqual([{ exerciseId: 'db-ohp', kind: 'record', kg: 12, reps: 10 }]);
    expect(both[1].xpParts).toEqual({ sets: 5, cardio: 0, beat: 0, record: 25, finish: 5, weekly: 0 });
    expect(both[1].planComplete).toBe(true);
    expect(both[1].planMissing).toEqual([]);
    const onlyB = rescoreWorkouts(stateWith([b]), [b], TODAY);
    expect(onlyB[0].xp).toBe(10);
    expect(onlyB[0].marks).toEqual([]);
  });

  it('drops stored pre-v8 prs, and gives a workout that does not count nothing', () => {
    const old = { ...workout('2026-10-05', [{ id: 'pushup', sets: [{ reps: 10 }] }]), prs: [{ exerciseId: 'pushup', kg: 0, reps: 10 }] };
    const future = workout('2026-12-25', [{ id: 'pushup', sets: [{ reps: 10 }] }]);
    const [o, f] = rescoreWorkouts(stateWith([old, future]), [old, future], TODAY);
    expect(o.prs).toBeUndefined();
    expect(f).toMatchObject({ xp: 0, marks: [], planComplete: false, planMissing: [] });
  });
});

describe('weekly streak', () => {
  it('counts consecutive Monday to Sunday weeks with a workout', () => {
    const r = weeklyStreaks(['2026-10-05', '2026-10-14', '2026-10-21', '2026-11-09'], '2026-10-23');
    expect(r).toEqual({ current: 3, best: 3 });
  });

  it('keeps the streak alive while this week is still empty, and breaks it after', () => {
    const dates = ['2026-10-05', '2026-10-12'];
    expect(weeklyStreaks(dates, '2026-10-19').current).toBe(2); // week of Oct 19 is empty so far
    expect(weeklyStreaks(dates, '2026-10-26').current).toBe(0); // a whole week missed
    expect(weeklyStreaks(dates, '2026-10-26').best).toBe(2);
  });

  it('is zero with no workouts', () => {
    expect(weeklyStreaks([], TODAY)).toEqual({ current: 0, best: 0 });
  });
});

describe('progress with workouts', () => {
  // Weigh-ins and goals but no workouts: the plan days are not part of a state any more.
  const s0: AppState = { ...emptyState(), weights: legacyPlanState.weights, goals: legacyPlanState.goals };
  const today = '2026-10-25';
  const workouts = [
    workout('2026-10-20', [
      { id: 'db-ohp', sets: [{ kg: 10, reps: 10 }, { kg: 10, reps: 10 }] },
      { id: 'run', sets: [{ min: 30, km: 5 }] },
    ]),
    workout('2026-10-22', [
      { id: 'db-ohp', sets: [{ kg: 12, reps: 10 }] },
      { id: 'cycle', sets: [{ min: 40, km: 12 }] },
    ]),
  ];
  const s1: AppState = { ...s0, workouts };

  it('adds workout XP and new badge XP on top of the weigh-in total', () => {
    const before = totalXp(s0, today);
    const after = totalXp(s1, today);
    const newBadges = allEarnedBadges(s1, today).filter((b) => !allEarnedBadges(s0, today).some((o) => o.id === b.id));
    const badgeXp = newBadges.reduce((sum, b) => sum + (b.kind === 'lifetime' ? XP.badgeTier[b.tier] : 0), 0);
    expect(after - before).toBe(workoutXpTotal(s1, today) + badgeXp);
    expect(workoutXpTotal(s1, today)).toBe(10 + 40 + 50 + (5 + 40 + 45 + 25));
  });

  it('takes level and rank from the total', () => {
    const p = computeProgress(s1, today);
    expect(p.xp).toBe(totalXp(s1, today));
    expect(p.level).toBeGreaterThanOrEqual(computeProgress(s0, today).level);
    expect(p.workout.workouts).toBe(2);
    expect(p.workout.records).toBe(1);
    expect(p.workout.runKm).toBe(5);
    expect(p.workout.rideKm).toBe(12);
    expect(p.workout.volumeKg).toBe(10 * 10 * 2 + 12 * 10);
  });

  it('earns the workout badge families', () => {
    const b = computeBadges(s1, today);
    expect(b.lifetime.finisher.tierIndex).toBe(1);
    expect(b.lifetime.finisher.earned[0].earnedAt).toBe('2026-10-20');
    expect(b.lifetime['record-breaker'].tierIndex).toBe(1);
    expect(b.lifetime['record-breaker'].earned[0].earnedAt).toBe('2026-10-22');
    expect(b.lifetime['iron-mover'].value).toBe(5); // sets logged
    expect(b.lifetime['streak-keeper'].value).toBe(1);
    expect(b.lifetime['all-rounder'].value).toBe(2); // shoulders and cardio
    const oldIds = allEarnedBadges(s0, today).map((x) => x.id);
    const newIds = allEarnedBadges(s1, today).map((x) => x.id);
    for (const id of oldIds) expect(newIds).toContain(id); // adding workouts never takes a badge away
  });

  it('feeds run and ride distance into Road Runner and Rider', () => {
    const b0 = computeBadges(s0, today);
    const b1 = computeBadges(s1, today);
    expect(b1.lifetime['road-runner'].value).toBeCloseTo(b0.lifetime['road-runner'].value + 5, 5);
    expect(b1.lifetime.rider.value).toBeCloseTo(b0.lifetime.rider.value + 12, 5);
  });

  it('earns Road Runner tier 1 from workouts alone', () => {
    const only = stateWith([workout('2026-10-20', [{ id: 'run', sets: [{ min: 60, km: 10 }] }])]);
    const b = computeBadges(only, today);
    expect(b.lifetime['road-runner'].tierIndex).toBe(1);
  });
});

describe('best set', () => {
  it('is the heaviest, then the most reps, ticked sets only', () => {
    expect(
      bestSet([
        { kg: 10, reps: 12, done: true },
        { kg: 12, reps: 5, done: true },
        { kg: 12, reps: 6, done: true },
        { kg: 30, reps: 5, done: false },
      ])
    ).toEqual({ kg: 12, reps: 6 });
    expect(bestSet([{ kg: 10, reps: 0, done: true }])).toBeNull();
  });
});
