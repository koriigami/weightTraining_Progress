// View-models for the badge cards on the Rank screen. Pure: no React, no
// component imports, so the numbers and wording can be tested. The component
// maps `art` to the <Badge> medal.
//
// Every badge is shown, earned or not. A locked badge keeps its full-colour
// design (the first tier, bronze, for a family nobody has started) and the card
// says what it takes.
import { computeBadges, LIFETIME_FAMILIES, MONTHLY_BADGES, SPECIAL_BADGES } from './badges';
import type { BadgeShape, BadgeState, EarnedBadgeSummary, FamilyProgress, LifetimeFamilyId, MonthlyBadgeId, SpecialBadgeId } from './badges';
import { monthKey, monthLabel, monthRibbon } from './date';
import type { AppState, BadgeTier } from './progress';
import { fmtNumber } from './units';

export const TIER_ORDER: BadgeTier[] = ['bronze', 'silver', 'gold', 'diamond', 'master', 'legend'];

export const tierLabel = (tier: BadgeTier): string => tier.charAt(0).toUpperCase() + tier.slice(1);

/** What to draw. `colorKey` is a monthly badge's colour set (see MONTHLY_COLORS in the Badge component). */
export type BadgeArt = {
  shape: BadgeShape;
  tier?: BadgeTier;
  icon?: string;
  dy?: number;
  text?: string;
  month?: string;
  colorKey?: string;
  label: string;
};

export type BadgeCard = {
  id: string;
  group: 'lifetime' | 'monthly' | 'special';
  family?: LifetimeFamilyId;
  name: string;
  what: string; // what it measures or asks for
  earned: boolean;
  tierName: string; // Bronze to Legend, or Locked, Earned
  art: BadgeArt;
  value: number;
  target: number | null; // the next threshold, null when there is nothing further
  pct: number; // 0..100, how far value is towards target
  progressText: string; // "3 of 10 workouts"
  hint: string; // the sentence in the preview
  earnedAt: string | null;
  ladder: { tier: BadgeTier; threshold: number; earned: boolean }[]; // lifetime only
};

/** The families that score the workout itself. They come first on the screen. */
export const WORKOUT_FAMILIES: LifetimeFamilyId[] = ['finisher', 'iron-mover', 'record-breaker', 'streak-keeper', 'all-rounder'];
/** The rest: volume-style counters, distance and the scale. */
export const LEGACY_FAMILIES: LifetimeFamilyId[] = ['pushup-path', 'engine', 'road-runner', 'rider', 'shedding', 'scale-keeper'];

const pct = (value: number, target: number | null): number => (target === null ? 100 : target <= 0 ? 0 : Math.max(0, Math.min(100, Math.round((value / target) * 100))));

// "1 training day", "5 training days", "3 kg". A lone 1 drops the plural s.
const withUnit = (n: number, unit: string): string => {
  const u = n === 1 && unit.endsWith('s') ? unit.slice(0, -1) : unit;
  return `${fmtNumber(n)}${u ? ` ${u}` : ''}`;
};

export function lifetimeCard(id: LifetimeFamilyId, fam: FamilyProgress): BadgeCard {
  const meta = LIFETIME_FAMILIES[id];
  const got = fam.tierIndex; // tiers earned
  const earned = got > 0;
  const top = got >= meta.tiers.length;
  const shown: BadgeTier = earned ? TIER_ORDER[got - 1] : TIER_ORDER[0];
  const target = fam.nextThreshold;
  const nextTier = top ? null : TIER_ORDER[got];

  let hint: string;
  if (top) hint = `${tierLabel(shown)} tier, the top one. ${meta.metric}. ${withUnit(fam.value, meta.unit)} so far.`;
  else if (earned) hint = `${tierLabel(shown)} tier. ${meta.metric}. ${withUnit(fam.value, meta.unit)} so far. ${tierLabel(nextTier!)} unlocks at ${withUnit(target!, meta.unit)}.`;
  else hint = `${tierLabel(nextTier!)} unlocks at ${withUnit(target!, meta.unit)}. You are at ${withUnit(fam.value, meta.unit)}. ${meta.metric}.`;

  return {
    id: `lifetime:${id}`,
    group: 'lifetime',
    family: id,
    name: meta.name,
    what: meta.metric,
    earned,
    tierName: earned ? tierLabel(shown) : 'Locked',
    art: { shape: meta.shape, tier: shown, icon: meta.icon, dy: meta.dy, label: `${meta.name} ${earned ? tierLabel(shown) : 'locked'}` },
    value: fam.value,
    target,
    pct: pct(fam.value, target),
    progressText: target === null ? `${withUnit(fam.value, meta.unit)}, top tier` : `${fmtNumber(fam.value)} of ${withUnit(target, meta.unit)}`,
    hint,
    earnedAt: fam.earned.length ? fam.earned[fam.earned.length - 1].earnedAt : null,
    ladder: meta.tiers.map((threshold, i) => ({ tier: TIER_ORDER[i], threshold, earned: got > i })),
  };
}

export function monthlyCard(id: MonthlyBadgeId, month: string, info: { earned: boolean; earnedAt?: string; value: number; target: number }): BadgeCard {
  const meta = MONTHLY_BADGES[id];
  return {
    id: `monthly:${month}:${id}`,
    group: 'monthly',
    name: meta.name,
    what: meta.rule,
    earned: info.earned,
    tierName: info.earned ? 'Earned' : 'Locked',
    art: { shape: 'circle', colorKey: meta.colorKey, text: meta.text, icon: meta.icon, month: monthRibbon(month), label: `${meta.name}, ${monthLabel(month)}` },
    value: info.value,
    target: info.target,
    pct: info.earned ? 100 : pct(info.value, info.target),
    progressText: `${fmtNumber(info.value)} of ${fmtNumber(info.target)}`,
    hint: info.earned
      ? `${meta.rule} in ${monthLabel(month)}. You earned it.`
      : `${meta.rule} in ${monthLabel(month)}. You are at ${fmtNumber(info.value)} of ${fmtNumber(info.target)}.`,
    earnedAt: info.earnedAt ?? null,
    ladder: [],
  };
}

export function specialCard(id: SpecialBadgeId, got: { earnedAt: string } | undefined): BadgeCard {
  const meta = SPECIAL_BADGES[id];
  const earned = Boolean(got);
  return {
    id: `special:${id}`,
    group: 'special',
    name: meta.name,
    what: meta.description,
    earned,
    tierName: earned ? 'Earned' : 'Locked',
    art: { shape: 'star', tier: 'gold', icon: meta.icon, label: meta.name },
    value: earned ? 1 : 0,
    target: 1,
    pct: earned ? 100 : 0,
    progressText: earned ? 'Earned' : 'Not yet',
    hint: earned ? `${meta.description}. You earned it.` : `${meta.description}.`,
    earnedAt: got?.earnedAt ?? null,
    ladder: [],
  };
}

export type BadgeCards = {
  workouts: BadgeCard[];
  lifetime: BadgeCard[];
  month: { key: string; label: string; cards: BadgeCard[] };
  trophies: BadgeCard[]; // earned monthly badges, newest month first
  milestones: BadgeCard[];
};

export function buildBadgeCards(state: AppState, today: string): BadgeCards {
  return badgeCardsFrom(computeBadges(state, today), today);
}

export function badgeCardsFrom(b: BadgeState, today: string): BadgeCards {
  const life = (ids: LifetimeFamilyId[]) => ids.map((id) => lifetimeCard(id, b.lifetime[id]));
  const monthIds = Object.keys(MONTHLY_BADGES) as MonthlyBadgeId[];
  const specialIds = Object.keys(SPECIAL_BADGES) as SpecialBadgeId[];
  const thisMonth = monthKey(today);
  const current = b.monthly.find((m) => m.month === thisMonth);

  const trophies: BadgeCard[] = [];
  for (const m of [...b.monthly].reverse()) {
    for (const id of monthIds) {
      const info = m.badges[id];
      if (info.earned) trophies.push(monthlyCard(id, m.month, info));
    }
  }

  return {
    workouts: life(WORKOUT_FAMILIES),
    lifetime: life(LEGACY_FAMILIES),
    month: {
      key: thisMonth,
      label: monthLabel(thisMonth),
      cards: current ? monthIds.filter((id) => current.badges[id].eligible).map((id) => monthlyCard(id, thisMonth, current.badges[id])) : [],
    },
    trophies,
    milestones: specialIds.map((id) => specialCard(id, b.special[id])),
  };
}

/**
 * The earned badge behind an earned card, so tapping it can replay its unlock
 * moment. A family card stands for the highest tier earned. Null for a locked card.
 */
export function cardToEarned(card: BadgeCard): EarnedBadgeSummary | null {
  if (!card.earned) return null;
  const earnedAt = card.earnedAt ?? '';
  if (card.group === 'lifetime' && card.family && card.art.tier) {
    return { id: `lifetime:${card.family}:${card.art.tier}`, kind: 'lifetime', family: card.family, tier: card.art.tier, earnedAt };
  }
  if (card.group === 'monthly') {
    const [, month, badge] = card.id.split(':');
    return { id: card.id, kind: 'monthly', badge: badge as MonthlyBadgeId, month, earnedAt };
  }
  if (card.group === 'special') return { id: card.id, kind: 'special', badge: card.id.slice('special:'.length) as SpecialBadgeId, earnedAt };
  return null;
}
