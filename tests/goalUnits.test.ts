import { describe, expect, it } from 'vitest';
import { WEIGHT_GOAL_STEP, goalAmountKg, goalDistanceKm, goalTitle, weightGoalTarget } from '../lib/goals';
import type { Goal } from '../lib/progress';
import { kgToUnit } from '../lib/units';

const base = { id: 'g', start: '2026-09-29', deadline: '2026-11-01', createdAt: '2026-09-29T00:00:00Z' };
const weightGoal: Goal = { ...base, type: 'weight', target: 72.73, direction: 'lose', baseline: 75 };
const km: Goal = { ...base, type: 'cardio-km', target: 20 };

describe('goals in the person\'s units', () => {
  it('kilograms and kilometres read exactly as before', () => {
    expect(goalTitle({ ...weightGoal, target: 73, direction: 'lose' })).toBe('Lose 2.0 kg, to 73.0 kg');
    expect(goalTitle(km)).toBe('20 km cardio distance');
    expect(goalTitle(km, { weight: 'kg', distance: 'km' })).toBe('20 km cardio distance');
  });

  it('a pounds person reads the same goal in pounds', () => {
    const g: Goal = { ...weightGoal, target: 72.73 };
    expect(goalTitle(g, { weight: 'lb', distance: 'km' })).toBe('Lose 5.0 lb, to 160.3 lb');
    expect(goalTitle({ ...g, direction: 'gain', target: 77.27 }, { weight: 'lb', distance: 'km' })).toBe('Gain 5.0 lb, to 170.4 lb');
  });

  it('a miles person reads a distance goal in miles', () => {
    expect(goalTitle(km, { weight: 'kg', distance: 'mi' })).toBe('12.43 mi cardio distance');
    expect(goalTitle({ ...km, target: 16.09 }, { weight: 'kg', distance: 'mi' })).toBe('10 mi cardio distance');
  });

  it('a typed weight amount becomes the kg that is stored, and reads back as what was typed', () => {
    expect(weightGoalTarget(75, 'lose', 2, 'kg')).toBe(73);
    expect(weightGoalTarget(75, 'gain', 0.5, 'kg')).toBe(75.5);
    const t = weightGoalTarget(75, 'lose', 5, 'lb');
    expect(t).toBe(72.73);
    expect(kgToUnit(75 - t, 'lb')).toBe(5);
    expect(kgToUnit(t, 'lb')).toBe(160.3);
    expect(goalAmountKg(10, 'lb')).toBeCloseTo(4.536, 3);
    expect(goalAmountKg(2.5, 'kg')).toBe(2.5);
  });

  it('a typed distance becomes the km that is stored', () => {
    expect(goalDistanceKm(20, 'km')).toBe(20);
    expect(goalDistanceKm(10, 'mi')).toBe(16.09);
    expect(goalDistanceKm(12.43, 'mi')).toBe(20);
  });

  it('every step lies on a whole or half unit inside its range', () => {
    for (const u of ['kg', 'lb'] as const) {
      const s = WEIGHT_GOAL_STEP[u];
      expect(s.min).toBeGreaterThan(0);
      expect(s.start).toBeGreaterThanOrEqual(s.min);
      expect(s.start).toBeLessThanOrEqual(s.max);
    }
  });
});
