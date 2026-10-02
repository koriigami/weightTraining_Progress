// Rules v4: the weekly goal bonus grows with each week in a row the goal is met.
import { describe, expect, it } from 'vitest';
import { weeklyGoalXp } from '../lib/routines';
import { addDaysStr } from '../lib/date';
import { rescoreWorkouts, scoreWorkouts } from '../lib/workoutScoring';
import { stateWith, trainingDay } from './helpers';

// Monday 2026-10-05 starts week 1. Week n starts 7 * (n - 1) days later.
const MON = '2026-10-05';
const monday = (week: number) => addDaysStr(MON, 7 * (week - 1));

// `days` training days in the Monday to Sunday week, from its Monday.
const week = (n: number, days: number) => Array.from({ length: days }, (_, i) => trainingDay(addDaysStr(monday(n), i)));

const goal3 = { weeklyGoal: 3 };
const paid = (scores: ReturnType<typeof scoreWorkouts>) => scores.map((s) => s.weeklyXp).filter((x) => x > 0);

describe('weeklyGoalXp', () => {
  it('is 50 for the first week, 10 more for each week in a row, and 100 from week 6', () => {
    expect([1, 2, 3, 4, 5, 6].map(weeklyGoalXp)).toEqual([50, 60, 70, 80, 90, 100]);
  });

  it('never goes over 100, and a run below 1 reads as the first week', () => {
    expect([7, 12, 400].map(weeklyGoalXp)).toEqual([100, 100, 100]);
    expect([0, -3].map(weeklyGoalXp)).toEqual([50, 50]);
  });
});

describe('the growing weekly goal bonus', () => {
  it('grows by 10 for each week in a row and stops at +100', () => {
    const weeks = [1, 2, 3, 4, 5, 6, 7, 8].flatMap((n) => week(n, 3));
    const scores = scoreWorkouts(weeks, goal3);
    expect(paid(scores)).toEqual([50, 60, 70, 80, 90, 100, 100, 100]);
    expect(scores.filter((s) => s.weeklyXp > 0).map((s) => s.parts.weekRun)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  });

  it('is still paid once a week, on the workout that reaches the goal', () => {
    const scores = scoreWorkouts([...week(1, 5), ...week(2, 5)], goal3);
    expect(scores.map((s) => s.weeklyXp)).toEqual([0, 0, 50, 0, 0, 0, 0, 60, 0, 0]);
  });

  it('keeps the run in xpParts only on the workout that paid', () => {
    const scores = scoreWorkouts([...week(1, 3), ...week(2, 3)], goal3);
    expect(scores.map((s) => s.parts.weekRun)).toEqual([undefined, undefined, 1, undefined, undefined, 2]);
    expect(scores[5].xp).toBe(35 + 50 + 60);
  });

  it('starts again at +50 after a week without any training', () => {
    const scores = scoreWorkouts([...week(1, 3), ...week(2, 3), ...week(4, 3), ...week(5, 3)], goal3);
    expect(paid(scores)).toEqual([50, 60, 50, 60]);
  });

  it('starts again at +50 after a week with training that fell short of the goal', () => {
    const scores = scoreWorkouts([...week(1, 3), ...week(2, 3), ...week(3, 2), ...week(4, 3)], goal3);
    expect(paid(scores)).toEqual([50, 60, 50]);
  });

  it('pays +50 for the first goal week after time away, and the comeback with it', () => {
    const scores = scoreWorkouts([...week(1, 3), ...week(2, 3), ...week(7, 3)], goal3);
    expect(paid(scores)).toEqual([50, 60, 50]);
    expect(scores[6].comebackXp).toBe(25);
  });

  it('counts a week from Monday to Sunday: a Sunday and the Monday after it are two weeks in a row', () => {
    const sunday = addDaysStr(monday(1), 6);
    const scores = scoreWorkouts([trainingDay(sunday), trainingDay(addDaysStr(sunday, 1)), trainingDay(addDaysStr(sunday, 2))], { weeklyGoal: 1 });
    expect(scores.map((s) => s.weeklyXp)).toEqual([50, 60, 0]);
    expect(scores.map((s) => s.parts.weekRun)).toEqual([1, 2, undefined]);
  });

  it('works for a goal of one training day', () => {
    const scores = scoreWorkouts([...week(1, 2), ...week(2, 2), ...week(3, 2)], { weeklyGoal: 1 });
    expect(paid(scores)).toEqual([50, 60, 70]);
  });

  it('extends the later run when a workout is logged into a past week and everything is scored again', () => {
    const before = [...week(1, 3), ...week(2, 2), ...week(3, 3)];
    expect(paid(scoreWorkouts(before, goal3))).toEqual([50, 50]); // week 2 fell short, so week 3 starts again
    const after = [...before, trainingDay(addDaysStr(monday(2), 2))]; // the missing third day of week 2
    expect(paid(scoreWorkouts(after, goal3))).toEqual([50, 60, 70]);
    // Through rescoreWorkouts, so the stored snapshots follow.
    const state = stateWith(after);
    const stored = rescoreWorkouts(state, state.workouts!).sort((a, b) => (a.date < b.date ? -1 : 1));
    expect(stored.filter((w) => (w.xpParts?.weekly ?? 0) > 0).map((w) => [w.xpParts!.weekly, w.xpParts!.weekRun])).toEqual([[50, 1], [60, 2], [70, 3]]);
  });

  it('checks every week again against the weekly goal it is given', () => {
    const history = [...week(1, 3), ...week(2, 2), ...week(3, 3)];
    expect(paid(scoreWorkouts(history, { weeklyGoal: 3 }))).toEqual([50, 50]);
    expect(paid(scoreWorkouts(history, { weeklyGoal: 2 }))).toEqual([50, 60, 70]);
    expect(paid(scoreWorkouts(history, { weeklyGoal: 4 }))).toEqual([]);
  });
});
