// What the reward stage plays, as plain data: the moments in order, the items in
// the chest with their card copy, the counter and the summary. Pure, so the order
// and the numbers can be tested. The stage itself is components/celebrate/RewardStage.
import { TIER_ORDER, tierLabel } from './badgeCards';
import type { BadgeArt } from './badgeCards';
import type { PaletteKey } from './badgeColors';
import { LIFETIME_FAMILIES, MONTHLY_BADGES, SPECIAL_BADGES } from './badges';
import type { EarnedBadgeSummary } from './badges';
import { describeMomentBadge } from './badgeDisplay';
import { monthLabel, monthRibbon } from './date';
import type { CelebrationEvent } from './celebrations';
import { GATE_RANK } from './rankRoad';
import { RANK_TITLES, xpIntoLevel } from './progress';
import type { Rank } from './progress';
import { CHEST_FOR_RANK, afterWorkout, badgeWorth, bestLast } from './rewards';
import type { ChestKey, RewardItem } from './rewards';

/** One thing that comes out of a chest: its card copy, its colours and what to draw. */
export type StageItem = {
  id: string;
  kind: 'title' | 'frame' | 'badge';
  /** The band across the top of the card: the tier, or "New title". */
  band: string;
  name: string;
  /** What it measures, one line. */
  what: string;
  /** The line to the next tier, and how far along it is (0 to 1). */
  next: string;
  p: number;
  /** XP paid when it comes out. Zero for titles, frames and replays. */
  xp: number;
  /** A word in place of the XP pill: "Unlocked", "Earned". */
  xpText?: string;
  /** Whose colours frame the card: a badge's tier, or a rank for titles and frames. */
  palette?: PaletteKey;
  rank?: Rank;
  art?: BadgeArt;
};

export type StagePlan = {
  /** Stable for one batch of events, so the stage plays once per batch. */
  key: string;
  /** The rank-up moment before the chest. `fromRank` is null for the first rank, which has nothing to break. */
  rankUp: { fromRank: Rank | null; toRank: Rank } | null;
  chest: { key: ChestKey; rank: Rank; items: StageItem[] };
  /** Where the level bar starts and ends, in total XP. `null` hides the bar. */
  xp: { from: number; to: number } | null;
  replay: boolean;
};

const withUnit = (n: number, unit: string): string => {
  const u = n === 1 && unit.endsWith('s') ? unit.slice(0, -1) : unit;
  return `${n.toLocaleString('en-US')}${u ? ` ${u}` : ''}`;
};

/** The art for an earned badge, the same drawing the Badges tab uses. */
export function earnedBadgeArt(b: EarnedBadgeSummary): BadgeArt {
  if (b.kind === 'lifetime') {
    const meta = LIFETIME_FAMILIES[b.family];
    return { shape: meta.shape, tier: b.tier, icon: meta.icon, dy: meta.dy, label: `${meta.name} ${tierLabel(b.tier)}` };
  }
  if (b.kind === 'monthly') {
    const meta = MONTHLY_BADGES[b.badge];
    return { shape: 'circle', colorKey: meta.colorKey, text: meta.text, icon: meta.icon, month: monthRibbon(b.month), label: `${meta.name}, ${monthLabel(b.month)}` };
  }
  const meta = SPECIAL_BADGES[b.badge];
  return { shape: 'star', tier: 'gold', icon: meta.icon, special: true, label: meta.name };
}

/** The line under a card: where this badge leads, with a bar of how far the next tier is. */
function nextLine(b: EarnedBadgeSummary): { next: string; p: number } {
  if (b.kind === 'monthly') return { next: 'A new monthly badge every month', p: 1 };
  if (b.kind === 'special') return { next: 'Special badges are earned once', p: 1 };
  const meta = LIFETIME_FAMILIES[b.family];
  const i = TIER_ORDER.indexOf(b.tier);
  if (i >= TIER_ORDER.length - 1) return { next: 'The top tier', p: 1 };
  const at = meta.tiers[i];
  const to = meta.tiers[i + 1];
  return { next: `Next: ${tierLabel(TIER_ORDER[i + 1])} at ${withUnit(to, meta.unit)}`, p: at / to };
}

const GATES = Object.entries(GATE_RANK)
  .map(([level, rank]) => ({ level: Number(level), rank }))
  .sort((x, y) => x.level - y.level);

/** The next gate after a rank, as "Next: D-Rank Hunter at level 5", or the top rank. */
function nextRankLine(rank: Rank): string {
  const next = GATES[GATES.findIndex((g) => g.rank === rank) + 1];
  return next ? `Next: ${RANK_TITLES[next.rank]} at level ${next.level}` : 'The top rank';
}

/** One chest item as the stage shows it. A replay pays no XP. */
export function stageItem(item: RewardItem, replay = false): StageItem {
  if (item.kind === 'title') {
    return {
      id: `title-${item.rank}`,
      kind: 'title',
      band: 'New title',
      name: item.title,
      what: 'Shown on your profile and your share card',
      next: nextRankLine(item.rank),
      p: 0,
      xp: 0,
      xpText: 'Unlocked',
      rank: item.rank,
    };
  }
  if (item.kind === 'frame') {
    return {
      id: `frame-${item.rank}`,
      kind: 'frame',
      band: 'Profile frame',
      name: `${item.rank}-Rank frame`,
      what: 'Your photo in the colours of your rank',
      next: nextRankLine(item.rank),
      p: 0,
      xp: 0,
      xpText: 'Unlocked',
      rank: item.rank,
    };
  }
  const b = item.badge;
  const shown = describeMomentBadge(b);
  const { next, p } = nextLine(b);
  return {
    id: b.id,
    kind: 'badge',
    band: shown.ribbon,
    name: shown.name,
    what: shown.what,
    next,
    p,
    xp: replay ? 0 : shown.xp,
    xpText: replay ? 'Earned' : undefined,
    palette: b.kind === 'lifetime' ? b.tier : b.kind === 'monthly' ? 'monthly' : 'special',
    art: earnedBadgeArt(b),
  };
}

/** How many items are still in the chest after `opened` have come out. */
export const itemsLeft = (total: number, opened: number): number => Math.max(0, total - opened);

/** The XP the items pay together, for the summary's total. */
export const summaryXp = (items: Pick<StageItem, 'xp'>[]): number => items.reduce((sum, it) => sum + Math.max(0, it.xp), 0);

/** Whether the stage shows a summary at the end: only when the chest held more than one item. */
export const hasSummary = (items: unknown[]): boolean => items.length > 1;

/** XP the badges paid, for where the level bar starts (it was already counted in the total). */
const paidBy = (badges: EarnedBadgeSummary[]): number => badges.reduce((sum, b) => sum + badgeWorth(b), 0);

/**
 * The plan for a batch of waiting events, or null when there is nothing to open
 * (a level up on its own is not a chest). It runs the events through
 * afterWorkout: the rank-up moment first if a rank was crossed, then the chest.
 * A replay pays no XP and shows the bar as it is.
 */
export function planStage(events: CelebrationEvent[]): StagePlan | null {
  const rankEvent = events.find((e): e is Extract<CelebrationEvent, { kind: 'rankup' }> => e.kind === 'rankup');
  const badgeEvents = events.filter((e): e is Extract<CelebrationEvent, { kind: 'badge' }> => e.kind === 'badge');
  const replay = events.some((e) => e.replay);
  const badges = badgeEvents.map((e) => e.badge);
  const level = rankEvent?.level ?? Math.max(1, ...badgeEvents.map((e) => e.level ?? 1));

  let rankUp: StagePlan['rankUp'] = null;
  let chestKey: ChestKey;
  let rank: Rank;
  let items: RewardItem[];
  if (rankEvent && rankEvent.fromRank === null) {
    // The first rank has nothing before it: the chest is its own, with the title and frame.
    rank = rankEvent.toRank;
    chestKey = CHEST_FOR_RANK[rank];
    items = [{ kind: 'title', rank, title: RANK_TITLES[rank] }, { kind: 'frame', rank }, ...bestLast(badges).map((badge) => ({ kind: 'badge' as const, badge }))];
    rankUp = { fromRank: null, toRank: rank };
  } else {
    const after = afterWorkout({ levelBefore: rankEvent ? (rankEvent.from ?? rankEvent.level - 1) : level, levelAfter: level, earned: badges });
    if (!after.chest) return null;
    rankUp = after.rankUp ? { fromRank: after.rankUp.fromRank, toRank: after.rankUp.toRank } : null;
    chestKey = after.chest.key;
    rank = after.chest.rank;
    items = after.chest.items;
  }

  const xpNow = Math.max(0, ...events.map((e) => (e.kind === 'badge' ? (e.xpNow ?? 0) : e.kind === 'levelup' || e.kind === 'rankup' ? e.xpNow : 0)));
  const hasXp = xpNow > 0;
  const paid = replay ? 0 : paidBy(badges);
  const xp = hasXp ? { from: Math.max(0, xpNow - paid), to: xpNow } : null;
  const key = `${replay ? 'replay-' : ''}${rankEvent ? `rank-${rankEvent.toRank}-${rankEvent.level}` : 'chest'}-${items.map((i) => (i.kind === 'badge' ? i.badge.id : i.kind)).join(',')}`;
  return { key, rankUp, chest: { key: chestKey, rank, items: items.map((i) => stageItem(i, replay)) }, xp, replay };
}

/** The level bar's numbers for a total XP: the level, how far in, and how much the level needs. */
export const barAt = (xp: number): { level: number; current: number; needed: number; pct: number } => {
  const { level, current, needed } = xpIntoLevel(xp);
  return { level, current, needed, pct: needed > 0 ? Math.min(100, (current / needed) * 100) : 0 };
};

/**
 * How long Victory plays on its own before the reward stage starts, in ms: its
 * last part (the level bar, or the level up after it) plus the hold. Reduced
 * motion shows Victory's end state at once, so only the hold is left.
 */
export function stageDelay({ barEnd, levelUpMs, hold, reduced }: { barEnd: number; levelUpMs: number; hold: number; reduced: boolean }): number {
  return reduced ? hold : barEnd + levelUpMs + hold;
}
