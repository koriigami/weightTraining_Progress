// Legacy parity: for a state that only has plan days, weights and goals, the
// per-day XP, the day streaks and the plan stats must be exactly what the scoring
// code produced at commit 39a2b2a, before routines and workouts existed. legacyGolden.json holds those numbers.
// See tests/fixtures/genLegacyGolden.ts for how it was produced and how to
// regenerate it against the current code.
import { describe, expect, it } from 'vitest';
import legacy from './fixtures/legacyState.json';
import golden from './fixtures/legacyGolden.json';
import { clearedStreakSeries, computeProgress, emptyState, planDay, workoutDates, xpForDay } from '../lib/progress';
import type { AppState } from '../lib/progress';
import { defaultPrefs } from '../lib/routines';

const state = legacy as unknown as AppState;

// The same state with every new field present but empty must score the same.
const withEmptyNewFields: AppState = { ...state, routines: [], workouts: [], prefs: defaultPrefs(), customExercises: [] };

describe.each([
  ['fields missing', state],
  ['fields empty', withEmptyNewFields],
])('legacy parity (%s)', (_name, s) => {
  it('per-day XP and streak series are unchanged', () => {
    const streaks = clearedStreakSeries(s);
    expect(streaks).toEqual(golden.streaks);
    const dayXp: Record<string, number> = {};
    for (const date of workoutDates()) {
      const xp = xpForDay(planDay(date)!, s.days[date], streaks[date]);
      if (xp) dayXp[date] = xp;
    }
    expect(dayXp).toEqual(golden.dayXp);
  });

  // XP rules v2 intentionally change the totals, level, rank, badges and goal
  // results in the golden file: the plan-only badges are retired, Engine and
  // Pushup Path count workouts, the monthly targets moved, and goals count
  // workouts rather than plan days. The legacy plan stats are untouched.
  for (const g of golden.perToday) {
    it(`legacy plan stats on ${g.today}`, () => {
      const p = computeProgress(s, g.today);
      expect(p.stats).toEqual(g.stats);
    });
  }
});

describe('empty state', () => {
  it('has no XP and no workout stats', () => {
    const p = computeProgress(emptyState(), '2026-09-29');
    expect(p.xp).toBe(0);
    expect(p.level).toBe(1);
    expect(p.rank).toBe('E');
    expect(p.workout.workouts).toBe(0);
  });
});
