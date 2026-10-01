// The goal sheet's pure helpers: end-date presets, the hint numbers, the weeks-to-deadline line and the reward line per type.
import { describe, expect, it } from 'vitest';
import { END_PRESETS, endPresetDate, endsLabel, goalDistanceKm, goalHint, goalReward, recentNumbers, streakDeadline } from '../lib/goals';
import type { Goal } from '../lib/progress';
import { stateWith, trainingDay, workout } from './helpers';

const TODAY = '2026-09-30';

describe('end date presets', () => {
  it('lists 2 weeks, 1 month and 3 months', () => {
    expect(END_PRESETS.map((p) => p.label)).toEqual(['2 weeks', '1 month', '3 months']);
  });

  it('counts from today', () => {
    expect(endPresetDate('2-weeks', TODAY)).toBe('2026-10-14');
    expect(endPresetDate('1-month', TODAY)).toBe('2026-10-30');
    expect(endPresetDate('3-months', TODAY)).toBe('2026-12-30');
  });

  it('uses the last day of a shorter month', () => {
    expect(endPresetDate('1-month', '2026-01-31')).toBe('2026-02-28');
    expect(endPresetDate('3-months', '2026-11-30')).toBe('2027-02-28');
  });
});

describe('end date wording', () => {
  it('writes the app date format', () => {
    expect(endsLabel('2026-10-31')).toBe('Ends Sat 31 Oct');
  });

  it('shows a weekly streak deadline as a Sunday', () => {
    // 2026-09-30 is a Wednesday: 4 weeks from that Monday ends Sunday 25 Oct.
    expect(endsLabel(streakDeadline(TODAY, 4))).toBe('Ends Sun 25 Oct');
    expect(endsLabel(streakDeadline(TODAY, 1))).toBe('Ends Sun 4 Oct');
  });
});

describe('goal hints from real workouts', () => {
  const state = stateWith([
    workout('2026-09-29', [{ id: 'pushup', sets: [{ reps: 20 }] }]),
    trainingDay('2026-09-22'),
    workout('2026-09-24', [{ id: 'pushup', sets: [{ reps: 30 }] }]),
    workout('2026-09-01', [{ id: 'pushup', sets: [{ reps: 99 }] }]),
  ]);

  it('counts only the last 4 weeks, and training days for workouts and weeks', () => {
    const n = recentNumbers(state, TODAY);
    expect(n.workouts).toBe(1);
    expect(n.pushups).toBe(20 + 70 + 30);
    expect(n.weeksTrained).toBe(1);
  });

  it('writes plain hints', () => {
    const n = recentNumbers(state, TODAY);
    expect(goalHint('workouts', n)).toBe('You trained 1 day in the last 4 weeks.');
    expect(goalHint('streak', n)).toBe('You trained in 1 of the last 4 weeks.');
    expect(goalHint('pushups', n)).toBe('You did 120 push-ups in the last 4 weeks.');
    expect(goalHint('weight', n)).toBeNull();
  });

  it('says training days, and one day in the singular', () => {
    expect(goalHint('workouts', { workouts: 1, pushups: 0, cardioMinutes: 0, km: 0, weeksTrained: 1 })).toBe('You trained 1 day in the last 4 weeks.');
    expect(goalHint('workouts', { workouts: 9, pushups: 0, cardioMinutes: 0, km: 0, weeksTrained: 4 })).toBe('You trained 9 days in the last 4 weeks.');
  });
});

describe('the reward line per type', () => {
  const g = (over: Partial<Goal>): Goal => ({ id: 'g', type: 'workouts', target: 1, start: TODAY, deadline: '2026-10-30', createdAt: '2026-09-30T06:00:00.000Z', ...over });

  it('follows the rules for each goal type', () => {
    expect(goalReward(g({ type: 'workouts', target: 12 }))).toBe(300);
    expect(goalReward(g({ type: 'streak', target: 6 }))).toBe(300);
    expect(goalReward(g({ type: 'cardio-minutes', target: 200 }))).toBe(200);
    expect(goalReward(g({ type: 'pushups', target: 1200 }))).toBe(300);
    expect(goalReward(g({ type: 'cardio-km', target: goalDistanceKm(10, 'mi') }))).toBe(130);
    expect(goalReward(g({ type: 'weight', target: 72, baseline: 75, direction: 'lose', deadline: '2026-12-30' }))).toBe(360);
  });

  it('keeps small goals at 25 and big ones at 1000', () => {
    expect(goalReward(g({ type: 'workouts', target: 1 }))).toBe(25);
    expect(goalReward(g({ type: 'streak', target: 26 }))).toBe(1000);
  });
});
