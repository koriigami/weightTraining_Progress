import { describe, expect, it } from 'vitest';
import { allEarnedBadges } from '../lib/badges';
import { emptyState, totalXp } from '../lib/progress';
import type { AppState } from '../lib/progress';

const TODAY = '2026-10-10';
const withWeights = (weights: Record<string, number>): AppState => ({ ...emptyState(), weights });
const shedding = (s: AppState) => allEarnedBadges(s, TODAY).filter((b) => b.id.startsWith('lifetime:shedding'));

describe('Shedding', () => {
  it('a first weigh-in earns nothing, whatever the weight', () => {
    expect(shedding(withWeights({ '2026-10-01': 75 }))).toEqual([]);
    expect(shedding(withWeights({ '2026-10-01': 140 }))).toEqual([]);
    // Only the weigh-in itself is worth XP.
    expect(totalXp(withWeights({ '2026-10-01': 75 }), TODAY)).toBe(10);
  });

  it('counts kg lost from the first weigh-in from any starting weight', () => {
    const s = withWeights({ '2026-10-01': 75, '2026-10-05': 73.5, '2026-10-09': 71.9 });
    // 3.1 kg down: bronze (1) and silver (3).
    expect(shedding(s).map((b) => b.id)).toEqual(['lifetime:shedding:bronze', 'lifetime:shedding:silver']);
  });

  it('counts from the first weigh-in even when it is 110 kg', () => {
    const s = withWeights({ '2026-10-01': 110, '2026-10-09': 100 });
    // 10 kg lost from 110: bronze to diamond (1, 3, 5, 7, 10).
    expect(shedding(s)).toHaveLength(5);
    // A single weigh-in of 100 kg is not a loss from 110 any more.
    expect(shedding(withWeights({ '2026-10-01': 100 }))).toEqual([]);
  });

  it('a gain never counts as a loss', () => {
    expect(shedding(withWeights({ '2026-10-01': 75, '2026-10-09': 80 }))).toEqual([]);
  });
});
