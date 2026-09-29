import { describe, expect, it } from 'vitest';
import { allEarnedBadges } from '../lib/badges';
import { emptyState, totalXp } from '../lib/progress';
import type { AppState } from '../lib/progress';

const TODAY = '2026-10-10';
const withWeights = (weights: Record<string, number>, days = false): AppState =>
  ({ ...emptyState(), weights, days: days ? { '2026-09-26': { items: { s0: { at: '2026-09-26T10:00:00Z' } } } } : {} }) as AppState;
const shedding = (s: AppState) => allEarnedBadges(s, TODAY).filter((b) => b.id.startsWith('lifetime:shedding'));

describe('Shedding', () => {
  it('a first weigh-in earns nothing, whatever the weight', () => {
    expect(shedding(withWeights({ '2026-10-01': 75 }))).toEqual([]);
    expect(shedding(withWeights({ '2026-10-01': 140 }))).toEqual([]);
    // Only the weigh-in itself is worth XP.
    expect(totalXp(withWeights({ '2026-10-01': 75 }), TODAY)).toBe(10);
  });

  it('counts kg lost from the first weigh-in for someone without plan days', () => {
    const s = withWeights({ '2026-10-01': 75, '2026-10-05': 73.5, '2026-10-09': 71.9 });
    // 3.1 kg down: bronze (1) and silver (3).
    expect(shedding(s).map((b) => b.id)).toEqual(['lifetime:shedding:bronze', 'lifetime:shedding:silver']);
  });

  it('keeps counting from 110 kg for someone with plan days, exactly as before', () => {
    const s = withWeights({ '2026-10-01': 100 }, true);
    // 10 kg lost from 110: bronze to diamond (1, 3, 5, 7, 10).
    expect(shedding(s)).toHaveLength(5);
  });

  it('a gain never counts as a loss', () => {
    expect(shedding(withWeights({ '2026-10-01': 75, '2026-10-09': 80 }))).toEqual([]);
  });
});
