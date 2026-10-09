import { describe, expect, it } from 'vitest';
import type { EarnedBadgeSummary } from '../lib/badges';
import type { CelebrationEvent } from '../lib/celebrations';
import { nextUp } from '../lib/celebrations';
import { barAt, hasSummary, itemsLeft, planStage, stageDelay, stageItem, summaryXp } from '../lib/rewardStage';
import { xpForLevel } from '../lib/progress';

const life = (tier: 'bronze' | 'silver' | 'gold' | 'diamond' | 'master' | 'legend', family: 'finisher' | 'iron-mover' = 'finisher'): EarnedBadgeSummary => ({
  id: `lifetime:${family}:${tier}`,
  kind: 'lifetime',
  family,
  tier,
  earnedAt: '2026-10-01',
});
const monthly: EarnedBadgeSummary = { id: 'monthly:2026-09:month-clear', kind: 'monthly', badge: 'month-clear', month: '2026-09', earnedAt: '2026-09-30' };

const badge = (b: EarnedBadgeSummary, level = 3, xpNow = 500): CelebrationEvent => ({ kind: 'badge', badge: b, level, xpNow });
const rankUp = (level: number, fromRank: 'E' | 'D' | null, toRank: 'D' | 'C'): CelebrationEvent => ({ kind: 'rankup', fromRank, toRank, level, xpNow: xpForLevel(level) + 40, from: level - 1 });
const levelUp = (to: number): CelebrationEvent => ({ kind: 'levelup', from: to - 1, to, rank: 'E', xpNow: xpForLevel(to) });

describe('the items in the chest', () => {
  it('puts the title and the frame first on a rank crossing, then the badges with the best last', () => {
    const plan = planStage([rankUp(5, 'E', 'D'), badge(life('gold'), 5), badge(life('bronze'), 5)])!;
    expect(plan.chest.key).toBe('silver');
    expect(plan.chest.items.map((i) => i.kind)).toEqual(['title', 'frame', 'badge', 'badge']);
    expect(plan.chest.items.map((i) => i.id).slice(2)).toEqual(['lifetime:finisher:bronze', 'lifetime:finisher:gold']);
  });

  it('opens your rank chest for a badge and nothing for a level up on its own', () => {
    expect(planStage([badge(life('silver'), 10)])!.chest.key).toBe('gold');
    expect(planStage([levelUp(3)])).toBeNull();
  });

  it('takes a themed chest from a monthly badge', () => {
    expect(planStage([badge(monthly, 10)])!.chest.key).toBe('monthly');
  });

  it('has no moment before the first rank chest, and still gives the title and frame', () => {
    const plan = planStage([{ kind: 'rankup', fromRank: null, toRank: 'E', level: 1, xpNow: 0, replay: true }])!;
    expect(plan.rankUp).toEqual({ fromRank: null, toRank: 'E' });
    expect(plan.chest.key).toBe('bronze');
    expect(plan.chest.items.map((i) => i.kind)).toEqual(['title', 'frame']);
  });

  it('plays the rank-up moment before the chest, with the old and new rank', () => {
    expect(planStage([rankUp(5, 'E', 'D')])!.rankUp).toEqual({ fromRank: 'E', toRank: 'D' });
    expect(planStage([badge(life('bronze'))])!.rankUp).toBeNull();
  });
});

describe('the counter and the summary', () => {
  it('counts what is left in the chest as each item comes out, never below zero', () => {
    expect([0, 1, 2, 3, 4].map((opened) => itemsLeft(3, opened))).toEqual([3, 2, 1, 0, 0]);
  });

  it('sums the XP the items pay, with nothing from a title or a frame', () => {
    const plan = planStage([rankUp(5, 'E', 'D'), badge(life('gold'), 5), badge(life('bronze'), 5)])!;
    expect(summaryXp(plan.chest.items)).toBe(100 + 25);
    expect(plan.chest.items.slice(0, 2).map((i) => i.xp)).toEqual([0, 0]);
  });

  it('pays no XP on a replay and says Earned instead', () => {
    const plan = planStage([{ ...badge(life('gold'), 10), replay: true }])!;
    expect(summaryXp(plan.chest.items)).toBe(0);
    expect(plan.chest.items[0].xpText).toBe('Earned');
  });

  it('shows a summary only when the chest held more than one item', () => {
    expect(hasSummary([1])).toBe(false);
    expect(hasSummary([1, 2])).toBe(true);
  });
});

describe('the level bar', () => {
  it('starts before the badge XP and ends at the total, since the total already counts it', () => {
    const plan = planStage([badge(life('gold'), 3, 900)])!;
    expect(plan.xp).toEqual({ from: 800, to: 900 });
  });

  it('stays still on a replay', () => {
    const plan = planStage([{ ...badge(life('gold'), 3, 900), replay: true }])!;
    expect(plan.xp).toEqual({ from: 900, to: 900 });
  });

  it('is hidden when the event does not say where the person stands', () => {
    const plan = planStage([{ kind: 'badge', badge: life('bronze') }])!;
    expect(plan.xp).toBeNull();
  });

  it('reads the level and how far into it from total XP', () => {
    const at = barAt(xpForLevel(4) + 10);
    expect(at.level).toBe(4);
    expect(at.current).toBe(10);
    expect(at.pct).toBeGreaterThan(0);
  });
});

describe('the card copy', () => {
  it('shows the next tier and how far it is, from the thresholds', () => {
    const it = stageItem({ kind: 'badge', badge: life('bronze') });
    expect(it.next).toBe('Next: Silver at 10 training days');
    expect(it.p).toBeCloseTo(0.1);
  });

  it('says the top tier has no next', () => {
    const it = stageItem({ kind: 'badge', badge: life('legend') });
    expect(it.next).toBe('The top tier');
    expect(it.p).toBe(1);
  });

  it('points a rank title at the next gate, and the last rank at none', () => {
    expect(stageItem({ kind: 'title', rank: 'D', title: 'D-Rank Hunter' }).next).toBe('Next: C-Rank Hunter at level 10');
    expect(stageItem({ kind: 'title', rank: 'S', title: 'S-Rank Hunter' }).next).toBe('The top rank');
  });
});

describe('what plays next from the queue', () => {
  it('plays a level up that came in alone first', () => {
    expect(nextUp([levelUp(3), badge(life('bronze'))])?.kind).toBe('levelup');
  });

  it('puts every waiting rank up and badge in one stage, not one each', () => {
    const next = nextUp([rankUp(5, 'E', 'D'), badge(life('bronze'), 5), badge(life('silver', 'iron-mover'), 5)]);
    expect(next?.kind).toBe('stage');
    expect(next?.kind === 'stage' && next.events).toHaveLength(3);
  });

  it('plays a replay on its own', () => {
    const next = nextUp([{ ...badge(life('bronze')), replay: true }, badge(life('silver', 'iron-mover'))]);
    expect(next?.kind === 'stage' && next.events).toHaveLength(1);
  });

  it('plays nothing when the queue is empty', () => {
    expect(nextUp([])).toBeNull();
  });
});

describe('when the stage starts after Victory', () => {
  it('waits for the level bar, then the hold', () => {
    expect(stageDelay({ barEnd: 4000, levelUpMs: 0, hold: 1800, reduced: false })).toBe(5800);
  });

  it('waits for the level up on the bar too', () => {
    expect(stageDelay({ barEnd: 4000, levelUpMs: 1100, hold: 1800, reduced: false })).toBe(6900);
  });

  it('is only the hold under reduced motion, since Victory shows its end at once', () => {
    expect(stageDelay({ barEnd: 4000, levelUpMs: 1100, hold: 1800, reduced: true })).toBe(1800);
  });
});
