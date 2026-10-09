// What a workout leaves behind after Victory, as plain data: the level up on
// Victory, the rank up, and at most one chest. Pure and derived: nothing here is
// stored. The rules are the signed-off tables in docs/V13_PLAN.md.
import type { EarnedBadgeSummary } from './badges';
import { TIER_PALETTE } from './badgeColors';
import { RANK_TITLES, XP, rankForLevel } from './progress';
import type { Rank } from './progress';

/** The chest names used on the motion board (docs/design/12-motion/art3d.js). */
export type ChestKey = 'bronze' | 'silver' | 'gold' | 'diamond' | 'master' | 'legend' | 'monthly' | 'royal' | 'pillow';

/** Your rank decides your chest: E Wooden, D Silver, C Golden, B Crystal, A Obsidian, S Prismatic. */
export const CHEST_FOR_RANK: Record<Rank, ChestKey> = { E: 'bronze', D: 'silver', C: 'gold', B: 'diamond', A: 'master', S: 'legend' };

/** The palette entry each chest takes its colours, name and taps from. */
export const CHEST_PALETTE = { bronze: 'bronze', silver: 'silver', gold: 'gold', diamond: 'diamond', master: 'master', legend: 'legend', monthly: 'monthly', royal: 'special', pillow: 'secret' } as const;

export const chestName = (key: ChestKey): string => TIER_PALETTE[CHEST_PALETTE[key]].chest;

/** Taps to open: 1 for Wooden, Silver, Monthly and Pillow; 2 for Golden, Crystal and Royal; 3 for Obsidian and Prismatic. */
export const chestTaps = (key: ChestKey): 1 | 2 | 3 => TIER_PALETTE[CHEST_PALETTE[key]].taps;

export type RewardItem =
  | { kind: 'title'; rank: Rank; title: string }
  | { kind: 'frame'; rank: Rank }
  | { kind: 'badge'; badge: EarnedBadgeSummary };

export type Chest = {
  key: ChestKey;
  rank: Rank; // the rank the chest belongs to: the new rank on a crossing, else yours
  rankUp: boolean; // a rank crossing opened it, so the title and frame come first
  items: RewardItem[]; // title and frame on a rank crossing, then the badges, best last
};

/** What a badge is worth in XP, the one ranking of "best" the app already has. */
export function badgeWorth(b: EarnedBadgeSummary): number {
  if (b.kind === 'lifetime') return XP.badgeTier[b.tier];
  return b.kind === 'monthly' ? XP.monthlyBadge : XP.specialBadge;
}

/** The badges with the best last. Equal worth keeps the order they came in. */
export function bestLast(badges: EarnedBadgeSummary[]): EarnedBadgeSummary[] {
  return badges
    .map((b, i) => ({ b, i }))
    .sort((x, y) => badgeWorth(x.b) - badgeWorth(y.b) || x.i - y.i)
    .map((x) => x.b);
}

/**
 * The themed chest a set of badges asks for, or null for the rank's own chest.
 * Royal for special badges, then Monthly for monthly badges. Pillow is kept for
 * secret rest badges: none exist in lib/badges.ts yet, so nothing returns it.
 */
function themedChest(badges: EarnedBadgeSummary[]): ChestKey | null {
  if (badges.some((b) => b.kind === 'special')) return 'royal';
  if (badges.some((b) => b.kind === 'monthly')) return 'monthly';
  return null;
}

export type ChestInput = {
  levelBefore: number;
  levelAfter: number;
  /** Badges this workout earned that the person has not seen yet. */
  earned: EarnedBadgeSummary[];
};

/**
 * The chest a workout opens, or null. At most one: it comes from a badge or a
 * rank crossing. A rank crossing always wins, with the new rank's chest and the
 * title and frame first. Otherwise a themed badge picks Royal or Monthly, and
 * any other badge opens your rank's chest. Badges go in best last.
 */
export function chestFor({ levelBefore, levelAfter, earned }: ChestInput): Chest | null {
  const rank = rankForLevel(levelAfter);
  const rankUp = levelAfter > levelBefore && rank !== rankForLevel(levelBefore);
  if (!rankUp && earned.length === 0) return null;
  const items: RewardItem[] = [];
  if (rankUp) items.push({ kind: 'title', rank, title: RANK_TITLES[rank] }, { kind: 'frame', rank });
  for (const badge of bestLast(earned)) items.push({ kind: 'badge', badge });
  const key = rankUp ? CHEST_FOR_RANK[rank] : (themedChest(earned) ?? CHEST_FOR_RANK[rank]);
  return { key, rank, rankUp, items };
}

export type AfterWorkout = {
  /** A new level inside the same rank: plays on Victory itself, showing the final level. */
  levelUpOnVictory: { from: number; to: number } | null;
  /** A new rank: the rank-up moment, before its chest. */
  rankUp: { fromRank: Rank; toRank: Rank; from: number; to: number } | null;
  chest: Chest | null;
};

/**
 * The steps after Victory's hold (VICTORY_HOLD_MS). At most one moment and one
 * chest: several levels at once is one level up, and a level lost (an edited
 * or deleted workout) is nothing. Pass only badges the person has not seen
 * (see unseenEvents in lib/celebrations.ts).
 */
export function afterWorkout(input: ChestInput): AfterWorkout {
  const { levelBefore, levelAfter } = input;
  const up = levelAfter > levelBefore;
  const fromRank = rankForLevel(levelBefore);
  const toRank = rankForLevel(levelAfter);
  const rankUp = up && fromRank !== toRank ? { fromRank, toRank, from: levelBefore, to: levelAfter } : null;
  return {
    levelUpOnVictory: up && !rankUp ? { from: levelBefore, to: levelAfter } : null,
    rankUp,
    chest: chestFor(input),
  };
}
