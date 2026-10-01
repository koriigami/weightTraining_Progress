// Badge catalogue v2: the changed families, the monthly badges and Clean Sweep.
import { describe, expect, it } from 'vitest';
import { LIFETIME_FAMILIES, MONTHLY_BADGES, SPECIAL_BADGES, allEarnedBadges, computeBadges, computeMonthlyProgress } from '../lib/badges';
import type { MonthlyBadgeId } from '../lib/badges';
import { defaultPrefs } from '../lib/routines';
import type { WorkoutLog } from '../lib/routines';
import type { AppState } from '../lib/progress';
import { stateWith, trainingDay, workout } from './helpers';

const TODAY = '2026-10-31';
const pad = (n: number) => String(n).padStart(2, '0');
const oct = (day: number) => `2026-10-${pad(day)}`;
const quick = (date: string, over: Partial<WorkoutLog> = {}) => workout(date, [{ id: 'pushup', sets: [{ reps: 10 }] }], over);
const month = (state: AppState, key: string, today = TODAY) => computeMonthlyProgress(state, today).find((m) => m.month === key)!;
const info = (state: AppState, id: MonthlyBadgeId, key = '2026-10', today = TODAY) => month(state, key, today).badges[id];

describe('lifetime families', () => {
  it('Iron Mover counts sets logged, from 50', () => {
    const sets = (n: number) => Array.from({ length: n }, () => ({ kg: 5, reps: 10 }));
    expect(LIFETIME_FAMILIES['iron-mover'].tiers).toEqual([50, 250, 500, 1000, 2500, 5000]);
    const b = computeBadges(stateWith([workout(oct(1), [{ id: 'db-ohp', sets: sets(30) }]), workout(oct(2), [{ id: 'db-row', sets: sets(20) }])]), TODAY);
    expect(b.lifetime['iron-mover']).toMatchObject({ value: 50, tierIndex: 1 });
    expect(b.lifetime['iron-mover'].earned[0].earnedAt).toBe(oct(2));
    expect(computeBadges(stateWith([workout(oct(1), [{ id: 'db-ohp', sets: sets(49) }])]), TODAY).lifetime['iron-mover'].tierIndex).toBe(0);
  });

  it('Engine counts the cardio minutes of workouts, intervals included', () => {
    const b = computeBadges(stateWith([workout(oct(1), [{ id: 'run', sets: [{ min: 30, km: 4 }] }, { id: 'runwalk', sets: [{ on: 10, off: 20 }] }])]), TODAY);
    expect(b.lifetime.engine).toMatchObject({ value: 60, tierIndex: 1 });
    // Strength minutes are not cardio minutes.
    expect(computeBadges(stateWith([quick(oct(1))]), TODAY).lifetime.engine.value).toBe(0);
  });

  it('Pushup Path counts reps on push-up exercises only', () => {
    const w = workout(oct(1), [
      { id: 'pushup', sets: Array.from({ length: 6 }, () => ({ reps: 10 })) },
      { id: 'diamond-pushup', sets: [{ reps: 20 }, { reps: 20 }] },
      { id: 'pike-pushup', sets: [{ reps: 5 }] },
      { id: 'plank', sets: [{ sec: 60 }] },
      { id: 'db-ohp', sets: [{ kg: 5, reps: 100 }] },
    ]);
    const b = computeBadges(stateWith([w]), TODAY);
    expect(b.lifetime['pushup-path'].value).toBe(60 + 40 + 5);
    expect(b.lifetime['pushup-path'].tierIndex).toBe(1);
  });

  it('Pushup Path skips unticked sets', () => {
    const w = workout(oct(1), [{ id: 'pushup', sets: [{ reps: 50 }, { reps: 50 }], undone: [1] }]);
    expect(computeBadges(stateWith([w]), TODAY).lifetime['pushup-path'].value).toBe(50);
  });

  it('Finisher counts training days: a day that reached 20 minutes, once, whatever the plan', () => {
    const short = quick(oct(1));
    const unfinishedPlan = trainingDay(oct(2), { plan: [{ exerciseId: 'pushup', sets: 30 }] });
    const sameDay = trainingDay(oct(2));
    const b = computeBadges(stateWith([short, unfinishedPlan, sameDay]), TODAY);
    expect(b.lifetime.finisher.value).toBe(1);
    expect(b.lifetime.finisher.earned[0].earnedAt).toBe(oct(2));
    expect(computeBadges(stateWith([short, unfinishedPlan, sameDay, trainingDay(oct(3))]), TODAY).lifetime.finisher.value).toBe(2);
    expect(LIFETIME_FAMILIES.finisher.tiers).toEqual([1, 10, 25, 50, 100, 250]);
  });

  it('Record Breaker counts records, not beats', () => {
    const ws = [quick(oct(1)), workout(oct(2), [{ id: 'pushup', sets: [{ reps: 12 }] }]), workout(oct(3), [{ id: 'pushup', sets: [{ reps: 11 }] }]), workout(oct(4), [{ id: 'pushup', sets: [{ reps: 13 }] }])];
    expect(computeBadges(stateWith(ws), TODAY).lifetime['record-breaker'].value).toBe(2);
  });

  it('Streak Keeper counts weeks with a training day, so a week of short workouts is a break', () => {
    const b = computeBadges(stateWith([trainingDay('2026-10-05'), trainingDay('2026-10-12'), quick('2026-10-19'), trainingDay('2026-10-26')]), TODAY);
    expect(b.lifetime['streak-keeper'].value).toBe(2);
    expect(b.lifetime['streak-keeper'].tierIndex).toBe(1);
    expect(computeBadges(stateWith([trainingDay('2026-10-05'), trainingDay('2026-10-12'), trainingDay('2026-10-19')]), TODAY).lifetime['streak-keeper'].value).toBe(3);
  });

  it('has no Iron Will or Grinder', () => {
    expect(Object.keys(LIFETIME_FAMILIES)).not.toContain('iron-will');
    expect(Object.keys(LIFETIME_FAMILIES)).not.toContain('grinder');
    const ids = allEarnedBadges(stateWith([quick('2026-09-26')]), TODAY).map((b) => b.id);
    expect(ids.filter((id) => /iron-will|grinder|awakening|perfect|full-week|program-complete/.test(id))).toEqual([]);
  });
});

describe('monthly badges', () => {
  it('Month Clear is 25 training days in the month', () => {
    const days = (n: number) => Array.from({ length: n }, (_, i) => trainingDay(oct(i + 1)));
    expect(info(stateWith(days(24)), 'month-clear')).toMatchObject({ earned: false, value: 24, target: 25 });
    const full = info(stateWith(days(25)), 'month-clear');
    expect(full).toMatchObject({ earned: true, value: 25, earnedAt: oct(25) });
    // Two workouts on one day are one day.
    expect(info(stateWith([...days(24), trainingDay(oct(24))]), 'month-clear').value).toBe(24);
    // A day under 20 minutes is not a training day.
    expect(info(stateWith([...days(24), quick(oct(25))]), 'month-clear')).toMatchObject({ earned: false, value: 24 });
    // Days in another month do not count.
    expect(info(stateWith([...days(24), trainingDay('2026-09-30')]), 'month-clear').earned).toBe(false);
  });

  it('Goal Month needs the weekly goal met in every Monday to Sunday week that starts in the month', () => {
    const prefs = { ...defaultPrefs(), weeklyGoal: 2 };
    // Mondays in October 2026: 5, 12, 19 and 26. The week of Sep 28 starts in September.
    const week = (monday: number) => [trainingDay(oct(monday)), trainingDay(oct(monday + 2))];
    const all = [...week(5), ...week(12), ...week(19), ...week(26)];
    const b = info(stateWith(all, { prefs }), 'goal-month');
    expect(b).toMatchObject({ earned: true, value: 4, target: 4, earnedAt: oct(28) });
    // A week with one training day short breaks it.
    const short = info(stateWith([...week(5), ...week(12), trainingDay(oct(19)), ...week(26)], { prefs }), 'goal-month');
    expect(short).toMatchObject({ earned: false, value: 3, target: 4 });
  });

  it('Goal Month counts only training days, and lets a week run into the next month', () => {
    const prefs = { ...defaultPrefs(), weeklyGoal: 2 };
    const missed = (d: string) => quick(d);
    // September 2026 has Mondays 7, 14, 21 and 28. The last week ends on Sunday Oct 4.
    const sep = (day: number) => `2026-09-${pad(day)}`;
    const good = [trainingDay(sep(7)), trainingDay(sep(8)), trainingDay(sep(14)), trainingDay(sep(15)), trainingDay(sep(21)), trainingDay(sep(22)), trainingDay(sep(28)), trainingDay('2026-10-01')];
    expect(info(stateWith(good, { prefs }), 'goal-month', '2026-09').earned).toBe(true);
    const spoiled = [...good.slice(0, 7), missed('2026-10-01')];
    expect(info(stateWith(spoiled, { prefs }), 'goal-month', '2026-09')).toMatchObject({ earned: false, value: 3, target: 4 });
  });

  it('Cardio Month is 600 cardio minutes', () => {
    const ws = Array.from({ length: 20 }, (_, i) => workout(oct(i + 1), [{ id: 'bike', sets: [{ min: 30 }] }]));
    expect(info(stateWith(ws.slice(0, 19)), 'cardio-month')).toMatchObject({ earned: false, value: 570, target: 600 });
    expect(info(stateWith(ws), 'cardio-month')).toMatchObject({ earned: true, earnedAt: oct(20) });
  });

  it('50K Walk/Run counts run-type exercises and 100K Ride counts ride-type', () => {
    const state = stateWith([
      workout(oct(1), [{ id: 'run', sets: [{ min: 200, km: 30 }] }]),
      workout(oct(2), [{ id: 'walk', sets: [{ min: 200, km: 20 }] }]),
      workout(oct(3), [{ id: 'cycle', sets: [{ min: 200, km: 60 }] }]),
      workout(oct(4), [{ id: 'bike', sets: [{ min: 200, km: 40 }] }]),
    ]);
    expect(info(state, '20k-walk-run')).toMatchObject({ earned: true, value: 50, target: 50, earnedAt: oct(2) });
    expect(info(state, '40k-ride')).toMatchObject({ earned: true, value: 100, target: 100, earnedAt: oct(4) });
    expect(info(stateWith([workout(oct(1), [{ id: 'run', sets: [{ min: 200, km: 49 }] }])]), '20k-walk-run').earned).toBe(false);
  });

  it('Pushup Month is 1000 push-up reps', () => {
    const w = (d: number, reps: number) => workout(oct(d), [{ id: 'pushup', sets: [{ reps }] }]);
    expect(info(stateWith([w(1, 500), w(2, 499)]), 'pushup-month').earned).toBe(false);
    expect(info(stateWith([w(1, 500), w(2, 500)]), 'pushup-month')).toMatchObject({ earned: true, earnedAt: oct(2), value: 1000 });
  });

  it('Weigh-in Month is unchanged: 20 weigh-ins', () => {
    const weights = Object.fromEntries(Array.from({ length: 20 }, (_, i) => [oct(i + 1), 80]));
    expect(info(stateWith([], { weights }), 'weigh-in-month')).toMatchObject({ earned: true, earnedAt: oct(20) });
  });

  it('only months that have ended or the current month are evaluated', () => {
    const state = stateWith([quick('2026-08-10'), quick('2026-12-10')], { weights: { '2027-01-05': 80 } });
    expect(computeMonthlyProgress(state, '2026-10-15').map((m) => m.month)).toEqual(['2026-08', '2026-10']);
  });

  it('has the v2 badges and not Perfect Month', () => {
    expect(Object.keys(MONTHLY_BADGES)).not.toContain('perfect-month');
    expect(MONTHLY_BADGES['month-clear'].rule).toBe('Trained on 25 days');
    expect(MONTHLY_BADGES['goal-month'].name).toBe('Goal Month');
  });
});

describe('special badges', () => {
  const plan = [{ exerciseId: 'pushup', sets: 2 }];
  const two = { id: 'pushup', sets: [{ reps: 10 }, { reps: 10 }] };
  const special = (ws: WorkoutLog[]) => computeBadges(stateWith(ws), TODAY).special;

  it('Clean Sweep is a routine finished with every planned set ticked', () => {
    expect(special([workout(oct(3), [two], { routineId: 'r1', plan })])['clean-sweep']).toEqual({ earnedAt: oct(3) });
  });

  it('is earned the first time, and needs a routine, a plan and every set', () => {
    const first = workout(oct(3), [two], { routineId: 'r1', plan });
    const later = workout(oct(9), [two], { routineId: 'r1', plan });
    expect(special([later, first])['clean-sweep']).toEqual({ earnedAt: oct(3) });
    expect(special([workout(oct(3), [two], { plan })])['clean-sweep']).toBeUndefined(); // no routine
    expect(special([workout(oct(3), [two], { routineId: 'r1' })])['clean-sweep']).toBeUndefined(); // no plan snapshot
    expect(special([workout(oct(3), [{ id: 'pushup', sets: [{ reps: 10 }, { reps: 10 }], undone: [1] }], { routineId: 'r1', plan })])['clean-sweep']).toBeUndefined();
  });

  it('needs every planned exercise: a removed one denies it even when the day paid its daily bonus', () => {
    const sevenSets = { id: 'pushup', sets: Array.from({ length: 7 }, () => ({ reps: 10 })) };
    const removed = workout(oct(3), [sevenSets], { routineId: 'r1', plan: [{ exerciseId: 'pushup', sets: 7 }, { exerciseId: 'plank', sets: 1 }] });
    expect(special([removed])['clean-sweep']).toBeUndefined();
    const withPlank = workout(oct(3), [sevenSets, { id: 'plank', sets: [{ sec: 30 }] }], { routineId: 'r1', plan: [{ exerciseId: 'pushup', sets: 7 }, { exerciseId: 'plank', sets: 1 }] });
    expect(special([withPlank])['clean-sweep']).toEqual({ earnedAt: oct(3) });
  });

  it('has only Clean Sweep and Goal Getter', () => {
    expect(Object.keys(SPECIAL_BADGES)).toEqual(['clean-sweep', 'goal-getter']);
  });
});
