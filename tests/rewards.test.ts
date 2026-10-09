import { describe, expect, it } from 'vitest';
import type { EarnedBadgeSummary } from '../lib/badges';
import { TIER_PALETTE } from '../lib/badgeColors';
import { CHEST_FOR_RANK, afterWorkout, chestFor, chestName, chestTaps } from '../lib/rewards';

const life = (tier: 'bronze' | 'silver' | 'gold' | 'diamond' | 'master' | 'legend', family: 'finisher' | 'engine' = 'finisher'): EarnedBadgeSummary => ({
  id: `lifetime:${family}:${tier}`,
  kind: 'lifetime',
  family,
  tier,
  earnedAt: '2026-10-01',
});
const monthly: EarnedBadgeSummary = { id: 'monthly:2026-09:month-clear', kind: 'monthly', badge: 'month-clear', month: '2026-09', earnedAt: '2026-09-30' };
const special: EarnedBadgeSummary = { id: 'special:clean-sweep', kind: 'special', badge: 'clean-sweep', earnedAt: '2026-10-01' };

describe('which chest opens', () => {
  it('opens nothing when there is no badge and no new rank', () => {
    expect(chestFor({ levelBefore: 3, levelAfter: 3, earned: [] })).toBeNull();
    expect(chestFor({ levelBefore: 3, levelAfter: 4, earned: [] })).toBeNull();
    expect(afterWorkout({ levelBefore: 3, levelAfter: 3, earned: [] })).toEqual({ levelUpOnVictory: null, rankUp: null, chest: null });
  });

  it('opens your rank chest for a badge, one per rank', () => {
    const at = (level: number) => chestFor({ levelBefore: level, levelAfter: level, earned: [life('gold')] })?.key;
    expect([1, 5, 10, 15, 20, 30].map(at)).toEqual(['bronze', 'silver', 'gold', 'diamond', 'master', 'legend']);
    expect(CHEST_FOR_RANK).toEqual({ E: 'bronze', D: 'silver', C: 'gold', B: 'diamond', A: 'master', S: 'legend' });
  });

  it('uses the chest names and taps from the board', () => {
    expect((Object.keys(TIER_PALETTE) as (keyof typeof TIER_PALETTE)[]).length).toBe(9);
    expect(['bronze', 'silver', 'gold', 'diamond', 'master', 'legend', 'monthly', 'royal', 'pillow'].map((k) => chestName(k as never))).toEqual([
      'Wooden',
      'Silver',
      'Golden',
      'Crystal',
      'Obsidian',
      'Prismatic',
      'Monthly',
      'Royal',
      'Pillow',
    ]);
    expect(['bronze', 'silver', 'monthly', 'pillow'].map((k) => chestTaps(k as never))).toEqual([1, 1, 1, 1]);
    expect(['gold', 'diamond', 'royal'].map((k) => chestTaps(k as never))).toEqual([2, 2, 2]);
    expect(['master', 'legend'].map((k) => chestTaps(k as never))).toEqual([3, 3]);
  });

  it('opens the new rank chest on a crossing, with the title and frame first and badges best last', () => {
    const chest = chestFor({ levelBefore: 9, levelAfter: 10, earned: [life('diamond'), life('bronze', 'engine'), life('silver')] });
    expect(chest).toMatchObject({ key: 'gold', rank: 'C', rankUp: true });
    expect(chest?.items.map((i) => (i.kind === 'badge' ? i.badge.id : i.kind))).toEqual([
      'title',
      'frame',
      'lifetime:engine:bronze',
      'lifetime:finisher:silver',
      'lifetime:finisher:diamond',
    ]);
    expect(chest?.items[0]).toEqual({ kind: 'title', rank: 'C', title: 'C-Rank Hunter' });
  });

  it('opens a rank chest on a crossing even with no badge', () => {
    const chest = chestFor({ levelBefore: 4, levelAfter: 5, earned: [] });
    expect(chest?.key).toBe('silver');
    expect(chest?.items.map((i) => i.kind)).toEqual(['title', 'frame']);
  });

  it('lets a themed chest take over from the rank chest, and a rank crossing win over both', () => {
    expect(chestFor({ levelBefore: 12, levelAfter: 12, earned: [life('gold'), monthly] })?.key).toBe('monthly');
    expect(chestFor({ levelBefore: 12, levelAfter: 12, earned: [monthly, special] })?.key).toBe('royal');
    expect(chestFor({ levelBefore: 12, levelAfter: 12, earned: [special] })?.key).toBe('royal');
    expect(chestFor({ levelBefore: 14, levelAfter: 15, earned: [monthly, special] })?.key).toBe('diamond');
  });
});

describe('after Victory', () => {
  it('plays a new level in the same rank on Victory, with no chest', () => {
    expect(afterWorkout({ levelBefore: 6, levelAfter: 7, earned: [] })).toEqual({ levelUpOnVictory: { from: 6, to: 7 }, rankUp: null, chest: null });
  });

  it('plays the level up, then the chest, for a new level and a badge', () => {
    const r = afterWorkout({ levelBefore: 6, levelAfter: 7, earned: [life('silver')] });
    expect(r.levelUpOnVictory).toEqual({ from: 6, to: 7 });
    expect(r.chest?.key).toBe('silver');
  });

  it('turns several levels at once into one level up that shows the final level', () => {
    const r = afterWorkout({ levelBefore: 6, levelAfter: 9, earned: [] });
    expect(r.levelUpOnVictory).toEqual({ from: 6, to: 9 });
  });

  it('plays the rank up before the new rank chest', () => {
    const r = afterWorkout({ levelBefore: 9, levelAfter: 10, earned: [life('bronze')] });
    expect(r.levelUpOnVictory).toBeNull();
    expect(r.rankUp).toEqual({ fromRank: 'D', toRank: 'C', from: 9, to: 10 });
    expect(r.chest?.key).toBe('gold');
  });

  it('shows no moment when the level went down', () => {
    expect(afterWorkout({ levelBefore: 10, levelAfter: 9, earned: [] })).toEqual({ levelUpOnVictory: null, rankUp: null, chest: null });
  });
});
