import { describe, expect, it } from 'vitest';
import { emptyState } from '../lib/progress';
import type { AppState, Goal } from '../lib/progress';
import { profileTiles, weightSummary } from '../lib/profileStats';
import { legacyPlanState, migratedPlanState } from './fixtures/legacyPlanState';
import { stateWith, workout } from './helpers';

const TODAY = '2026-09-30';

describe('profile tiles', () => {
  it('is all zeros for someone new', () => {
    expect(profileTiles(emptyState(), TODAY)).toEqual({ workouts: 0, volumeKg: 0, prs: 0, cardioKm: 0 });
  });

  it('counts workouts, kilograms lifted, PRs and distance', () => {
    const state = stateWith([
      workout('2026-09-20', [{ id: 'db-bench', sets: [{ kg: 20, reps: 10 }, { kg: 20, reps: 10 }] }]),
      // 25 kg beats the 20 kg of the workout before: a PR.
      workout('2026-09-25', [{ id: 'db-bench', sets: [{ kg: 25, reps: 8 }] }, { id: 'run', sets: [{ min: 30, km: 4.5 }] }]),
      workout('2026-09-28', [{ id: 'walk', sets: [{ min: 20, km: 1.5 }] }]),
    ]);
    expect(profileTiles(state, TODAY)).toEqual({ workouts: 3, volumeKg: 400 + 200, prs: 1, cardioKm: 6 });
  });

  it('counts the migrated days of the old plan as workouts, with their km', () => {
    const t = profileTiles(migratedPlanState(), '2026-11-02');
    expect(t.workouts).toBe(Object.keys(legacyPlanState.days!).length);
    expect(t.volumeKg).toBe(0);
    expect(t.cardioKm).toBeGreaterThan(0);
  });

  it('leaves out workouts dated after tomorrow', () => {
    const state = stateWith([workout('2026-10-10', [{ id: 'run', sets: [{ min: 30, km: 5 }] }])]);
    expect(profileTiles(state, TODAY).cardioKm).toBe(0);
  });
});

describe('weight summary', () => {
  const goal = (over: Partial<Goal>): Goal => ({ id: 'g', type: 'weight', target: 103, start: '2026-09-01', deadline: '2026-12-31', createdAt: '2026-09-01T00:00:00Z', direction: 'lose', baseline: 110, ...over });

  it('has nothing to show before a first weigh-in', () => {
    expect(weightSummary(emptyState(), TODAY)).toEqual({ points: [], current: null, currentDate: null, changeKg: null, since: null, target: null });
  });

  it('a single weigh-in has no change yet', () => {
    const s = weightSummary({ ...emptyState(), weights: { '2026-09-29': 109.2 } }, TODAY);
    expect(s).toMatchObject({ current: 109.2, currentDate: '2026-09-29', changeKg: null, since: null });
  });

  it('shows the last 8 weigh-ins, the current one, and the change since the first of them', () => {
    const weights: Record<string, number> = {};
    for (let i = 0; i < 10; i++) weights[`2026-09-${String(10 + i).padStart(2, '0')}`] = 110 - i * 0.2;
    const s = weightSummary({ ...emptyState(), weights }, TODAY);
    expect(s.points).toHaveLength(8);
    expect(s.points[0].date).toBe('2026-09-12');
    expect(s.current).toBe(108.2);
    expect(s.changeKg).toBe(-1.4);
    expect(s.since).toBe('2026-09-12');
  });

  it('the target is the newest active weight goal, and nothing when there is none', () => {
    const base: AppState = { ...emptyState(), weights: { '2026-09-29': 109 } };
    expect(weightSummary(base, TODAY).target).toBeNull();
    const withGoals: AppState = {
      ...base,
      goals: [goal({ id: 'a', target: 105, createdAt: '2026-09-01T00:00:00Z' }), goal({ id: 'b', target: 103, createdAt: '2026-09-20T00:00:00Z' }), goal({ id: 'c', type: 'workouts', target: 5, deadline: '2026-12-31' })],
    };
    expect(weightSummary(withGoals, TODAY).target).toBe(103);
    // A goal that has passed its deadline is no longer the target.
    expect(weightSummary({ ...base, goals: [goal({ deadline: '2026-09-15' })] }, TODAY).target).toBeNull();
  });
});
