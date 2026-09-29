// Legacy parity: for a state that only has plan days, weights and goals, the
// numbers must be exactly what the scoring code produced at commit 39a2b2a,
// before routines and workouts existed. legacyGolden.json holds those numbers.
// See tests/fixtures/genLegacyGolden.ts for how it was produced and how to
// regenerate it against the current code.
import { describe, expect, it } from 'vitest';
import legacy from './fixtures/legacyState.json';
import golden from './fixtures/legacyGolden.json';
import {
  clearedStreakSeries,
  computeProgress,
  emptyState,
  planDay,
  totalXp,
  workoutDates,
  xpForDay,
} from '../lib/progress';
import type { AppState } from '../lib/progress';
import { allEarnedBadges } from '../lib/badges';
import { goalProgressValue, goalStatus } from '../lib/goals';
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

  for (const g of golden.perToday) {
    it(`totals, level, rank, streaks, badges and goals on ${g.today}`, () => {
      const p = computeProgress(s, g.today);
      expect(totalXp(s, g.today)).toBe(g.totalXp);
      expect(p.xp).toBe(g.totalXp);
      expect(p.level).toBe(g.level);
      expect(p.rank).toBe(g.rank);
      expect(p.xpIntoLevel).toEqual(g.xpIntoLevel);
      expect(p.stats).toEqual(g.stats);
      const badges = allEarnedBadges(s, g.today)
        .map((b) => `${b.id}@${b.earnedAt}`)
        .sort();
      expect(badges).toEqual(g.badges);
      const goals = s.goals.map((goal) => ({
        id: goal.id,
        status: goalStatus(goal, s, g.today),
        progress: goalProgressValue(goal, s, g.today),
      }));
      expect(goals).toEqual(g.goals);
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
