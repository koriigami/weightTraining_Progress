// Goals on workouts: progress, rewards, the createdAt cutoff and achievedAt.
import { describe, expect, it } from 'vitest';
import { goalProgressValue, goalReward, goalStatus, stampAchievedGoals, streakDeadline } from '../lib/goals';
import { allEarnedBadges, computeBadges } from '../lib/badges';
import { XP, emptyState, totalXp } from '../lib/progress';
import type { AppState, Goal } from '../lib/progress';
import { applyRoutineAction } from '../lib/routineActions';
import { stateWith, workout } from './helpers';

const TODAY = '2026-10-14';
const CREATED = '2026-10-05T06:00:00.000Z';

const goal = (over: Partial<Goal>): Goal => ({ id: 'g1', type: 'workouts', target: 3, start: '2026-10-05', deadline: '2026-10-25', createdAt: CREATED, ...over });
// A workout finished after the goal was created unless said otherwise.
const done = (date: string, items: Parameters<typeof workout>[1], finishedAt = `${date}T20:00:00.000Z`) => workout(date, items, { finishedAt });
const push = (date: string, reps = 10, finishedAt?: string) => done(date, [{ id: 'pushup', sets: [{ reps }] }], finishedAt);
const withGoal = (g: Goal, ws: ReturnType<typeof workout>[]): AppState => ({ ...stateWith(ws), goals: [g] });

describe('goal rewards', () => {
  it('pays 25 a workout, 50 a week of streak, 1 a cardio minute, 8 a km, a quarter push-up, and 120 a kg', () => {
    expect(goalReward(goal({ type: 'workouts', target: 8 }))).toBe(200);
    expect(goalReward(goal({ type: 'streak', target: 4 }))).toBe(200);
    expect(goalReward(goal({ type: 'cardio-minutes', target: 150 }))).toBe(150);
    expect(goalReward(goal({ type: 'cardio-km', target: 20 }))).toBe(160);
    expect(goalReward(goal({ type: 'pushups', target: 400 }))).toBe(100);
    expect(goalReward(goal({ type: 'weight', target: 73, baseline: 75, direction: 'lose', start: '2026-10-05', deadline: '2026-12-05' }))).toBe(240);
  });

  it('adds a quarter for an ambitious weight pace, and nothing else changes it', () => {
    // 2 kg in 2.5 weeks is 0.8 kg a week: ambitious.
    const w = goal({ type: 'weight', target: 73, baseline: 75, direction: 'lose', start: '2026-10-05', deadline: '2026-10-22' });
    expect(goalReward(w)).toBe(300);
    // Nothing about the person's earlier workouts or a plan changes a count goal.
    expect(goalReward(goal({ type: 'workouts', target: 8, start: '2026-01-01', deadline: '2026-01-08' }))).toBe(200);
  });

  it('rounds to 5 and stays within 25 to 1000', () => {
    expect(goalReward(goal({ type: 'pushups', target: 30 }))).toBe(25);
    expect(goalReward(goal({ type: 'cardio-minutes', target: 5 }))).toBe(25);
    expect(goalReward(goal({ type: 'cardio-km', target: 3.3 }))).toBe(25);
    expect(goalReward(goal({ type: 'cardio-km', target: 4.3 }))).toBe(35);
    expect(goalReward(goal({ type: 'workouts', target: 100 }))).toBe(1000);
    expect(goalReward(goal({ type: 'streak', target: 26 }))).toBe(1000);
  });
});

describe('goal progress from workouts', () => {
  it('a workouts goal counts workouts with a ticked set inside its window', () => {
    const ws = [push('2026-10-06'), push('2026-10-08'), push('2026-10-08'), push('2026-10-26'), push('2026-10-03', 10, '2026-10-03T20:00:00.000Z')];
    const s = withGoal(goal({}), ws);
    expect(goalProgressValue(goal({}), s, TODAY)).toBe(3);
    expect(goalStatus(goal({}), s, TODAY)).toBe('achieved');
  });

  it('only progress finished at or after createdAt counts', () => {
    const before = push('2026-10-06', 10, '2026-10-05T05:59:59.000Z');
    const at = push('2026-10-06', 10, CREATED);
    const s = withGoal(goal({ target: 2 }), [before, at]);
    expect(goalProgressValue(goal({ target: 2 }), s, TODAY)).toBe(1);
    expect(goalStatus(goal({ target: 2 }), s, TODAY)).toBe('active');
  });

  it('push-ups count reps on push-up exercises', () => {
    const g = goal({ type: 'pushups', target: 60 });
    const s = withGoal(g, [push('2026-10-06', 25), done('2026-10-07', [{ id: 'diamond-pushup', sets: [{ reps: 20 }] }, { id: 'db-ohp', sets: [{ kg: 5, reps: 50 }] }])]);
    expect(goalProgressValue(g, s, TODAY)).toBe(45);
    expect(goalStatus(g, s, TODAY)).toBe('active');
  });

  it('cardio minutes and distance count workout cardio', () => {
    const ws = [done('2026-10-06', [{ id: 'run', sets: [{ min: 30, km: 4.5 }] }, { id: 'runwalk', sets: [{ on: 5, off: 5 }] }]), done('2026-10-07', [{ id: 'cycle', sets: [{ min: 45, km: 15 }] }])];
    expect(goalProgressValue(goal({ type: 'cardio-minutes', target: 100 }), withGoal(goal({}), ws), TODAY)).toBe(85);
    expect(goalProgressValue(goal({ type: 'cardio-km', target: 20 }), withGoal(goal({}), ws), TODAY)).toBe(19.5);
  });

  it('a streak goal counts weeks in a row with any workout, from the week it started', () => {
    const g = goal({ type: 'streak', target: 3, start: '2026-10-05', deadline: streakDeadline('2026-10-05', 3) });
    expect(g.deadline).toBe('2026-10-25');
    const ws = [push('2026-10-07'), push('2026-10-13')];
    expect(goalProgressValue(g, withGoal(g, ws), TODAY)).toBe(2);
    expect(goalStatus(g, withGoal(g, ws), TODAY)).toBe('active');
    expect(goalStatus(g, withGoal(g, [...ws, push('2026-10-20')]), '2026-10-21')).toBe('achieved');
  });

  it('a streak goal fails once a whole week passes with no workout', () => {
    const g = goal({ type: 'streak', target: 3, start: '2026-10-05', deadline: '2026-10-25' });
    const s = withGoal(g, [push('2026-10-07'), push('2026-10-21')]);
    expect(goalStatus(g, s, '2026-10-14')).toBe('active'); // the week of the 12th is still open
    expect(goalStatus(g, s, '2026-10-21')).toBe('failed');
  });

  it('a streak goal made before v8 reads under the weekly meaning', () => {
    const old = goal({ type: 'streak', target: 2, start: '2026-10-05', deadline: '2026-10-06' });
    const s = withGoal(old, [push('2026-10-07'), push('2026-10-14')]);
    expect(goalStatus(old, s, TODAY)).toBe('achieved');
  });

  it('a weight goal is met by any weigh-in from creation to the deadline, even if the weight comes back', () => {
    const g = goal({ type: 'weight', target: 74, baseline: 75, direction: 'lose', deadline: '2026-11-05' });
    const s = (weights: Record<string, number>): AppState => ({ ...emptyState(), goals: [g], weights });
    expect(goalStatus(g, s({ '2026-10-05': 75, '2026-10-10': 74.5 }), TODAY)).toBe('active');
    expect(goalStatus(g, s({ '2026-10-05': 75, '2026-10-10': 73.9, '2026-10-13': 75.5 }), TODAY)).toBe('achieved');
    // A weigh-in from before the goal was created does not count.
    expect(goalStatus(g, s({ '2026-10-04': 73 }), TODAY)).toBe('active');
    // After the deadline it has expired.
    expect(goalStatus(g, s({ '2026-10-05': 75 }), '2026-11-06')).toBe('expired');
    const gain = { ...g, direction: 'gain' as const, target: 76 };
    expect(goalStatus(gain, s({ '2026-10-08': 76.2 }), TODAY)).toBe('achieved');
  });

  it('an unmet goal expires after its deadline', () => {
    const g = goal({});
    expect(goalStatus(g, withGoal(g, [push('2026-10-06')]), '2026-10-26')).toBe('expired');
  });
});

describe('goals stay achieved', () => {
  const g = goal({ target: 2 });
  const ws = [push('2026-10-06'), push('2026-10-07')];

  it('stamps achievedAt on a goal that is newly achieved, once', () => {
    const s = withGoal(g, ws);
    const stamped = stampAchievedGoals(s, '2026-10-14T09:00:00.000Z', TODAY);
    expect(stamped[0].achievedAt).toBe('2026-10-14T09:00:00.000Z');
    const again = stampAchievedGoals({ ...s, goals: stamped }, '2026-10-20T09:00:00.000Z', '2026-10-20');
    expect(again).toBe(stamped);
    expect(again[0].achievedAt).toBe('2026-10-14T09:00:00.000Z');
  });

  it('leaves goals that are not achieved without a stamp, and returns the same list', () => {
    const s = withGoal(g, [push('2026-10-06')]);
    expect(stampAchievedGoals(s, 'now', TODAY)).toBe(s.goals);
  });

  it('keeps a stamped goal achieved, with its XP and Goal Getter, after the workouts are deleted', () => {
    const stamped = { ...g, achievedAt: '2026-10-07T20:00:00.000Z' };
    const s: AppState = { ...emptyState(), goals: [stamped] };
    expect(goalStatus(stamped, s, TODAY)).toBe('achieved');
    expect(goalStatus(stamped, s, '2027-03-01')).toBe('achieved'); // even after the deadline
    expect(totalXp(s, TODAY)).toBe(goalReward(stamped) + XP.specialBadge); // the goal and Goal Getter
    expect(computeBadges(s, TODAY).special['goal-getter']).toEqual({ earnedAt: '2026-10-07' });
    expect(allEarnedBadges(s, TODAY).map((b) => b.id)).toContain('special:goal-getter');
  });

  it('a goal without a stamp loses its XP when the workouts go, which is what the stamp prevents', () => {
    const before = withGoal(g, ws);
    const after = { ...before, workouts: [] };
    expect(totalXp(before, TODAY)).toBeGreaterThan(totalXp(after, TODAY));
  });

  it('a stamp survives an action that changes the workouts', () => {
    // The route stamps after every action. Deleting a workout does not lose it.
    const stamped = stampAchievedGoals(withGoal(g, ws), 'now', TODAY);
    const r = applyRoutineAction({ ...withGoal(g, ws), goals: stamped }, { action: 'deleteWorkout', id: ws[0].id }, { today: TODAY });
    if (!r.ok) throw new Error(r.error);
    expect(goalStatus(r.state.goals[0], r.state, TODAY)).toBe('achieved');
  });

  it('Goal Getter is earned on the day the goal was first met', () => {
    const s = withGoal(g, ws);
    expect(computeBadges(s, TODAY).special['goal-getter']).toEqual({ earnedAt: '2026-10-07' });
  });
});
