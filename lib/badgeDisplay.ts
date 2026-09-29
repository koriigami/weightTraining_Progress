// Maps an earned (or lockable) badge to what a card or reveal should show:
// name, description, XP and the props to hand to <Badge>. Kept separate from
// lib/badges.ts (pure computation) since this is presentation only.
import { LIFETIME_FAMILIES, MONTHLY_BADGES, SPECIAL_BADGES } from './badges';
import type { EarnedBadgeSummary, LifetimeFamilyId, MonthlyBadgeId, SpecialBadgeId } from './badges';
import { MEDAL_TIERS, MONTHLY_COLORS, TIERS, ribbonBackground } from './badgeColors';
import type { BadgeProps } from '@/components/Badge';
import { XP } from './progress';
import type { BadgeTier } from './progress';
import { monthLabel, monthRibbon } from './date';

export type BadgeDisplay = { name: string; description: string; xp: number; badgeProps: BadgeProps };

export function describeEarnedBadge(b: EarnedBadgeSummary): BadgeDisplay {
  if (b.kind === 'lifetime') return describeLifetimeTier(b.family, b.tier);
  if (b.kind === 'monthly') return describeMonthlyBadge(b.badge, b.month, true);
  return describeSpecialBadge(b.badge);
}

export function describeLifetimeTier(family: LifetimeFamilyId, tier: BadgeProps['tier']): BadgeDisplay {
  const meta = LIFETIME_FAMILIES[family];
  const tierLabel = tier ? TIERS[tier].label : '';
  return {
    name: meta.name,
    description: `${tierLabel} tier. ${meta.metric}.`,
    xp: tier ? XP.badgeTier[tier] : 0,
    badgeProps: { shape: meta.shape, tier, icon: meta.icon, dy: meta.dy, label: `${meta.name} ${tierLabel}` },
  };
}

export function describeMonthlyBadge(badge: MonthlyBadgeId, month: string, earned: boolean): BadgeDisplay {
  const meta = MONTHLY_BADGES[badge];
  return {
    name: meta.name,
    description: monthLabel(month),
    xp: earned ? XP.monthlyBadge : 0,
    badgeProps: {
      shape: 'circle',
      colors: MONTHLY_COLORS[meta.colorKey],
      text: meta.text,
      icon: meta.icon,
      month: monthRibbon(month),
      label: meta.name,
    },
  };
}

export function describeSpecialBadge(badge: SpecialBadgeId): BadgeDisplay {
  const meta = SPECIAL_BADGES[badge];
  return {
    name: meta.name,
    description: meta.description,
    xp: XP.specialBadge,
    badgeProps: { shape: 'star', tier: 'gold', icon: meta.icon, label: meta.name },
  };
}

// ---------------- The unlock moment ----------------

export type MomentBadge = {
  name: string;
  /** What it measures or asks for, in one line. */
  what: string;
  /** The tier ribbon: Bronze to Legend, or Monthly or Special. */
  ribbon: string;
  ribbonColor: string;
  /** The hexagon medal's light and dark colours. */
  medal: [string, string];
  icon?: string;
  text?: string;
  /** Extra vertical nudge for the icon, in the badge's 120-unit space. */
  dy?: number;
  xp: number;
};

const tierName = (tier: BadgeTier): string => TIERS[tier].label;
// "1 workout", "5 workouts", "3 kg". A lone 1 drops the plural s.
const withUnit = (n: number, unit: string): string => {
  const u = n === 1 && unit.endsWith('s') ? unit.slice(0, -1) : unit;
  return `${n.toLocaleString('en-US')}${u ? ` ${u}` : ''}`;
};

/** What the badge unlock moment shows for an earned badge: the medal, the ribbon, the name and what it measures. */
export function describeMomentBadge(b: EarnedBadgeSummary): MomentBadge {
  if (b.kind === 'lifetime') {
    const meta = LIFETIME_FAMILIES[b.family];
    const threshold = meta.tiers[['bronze', 'silver', 'gold', 'diamond', 'master', 'legend'].indexOf(b.tier)];
    const medal = MEDAL_TIERS[b.tier];
    return {
      name: meta.name,
      what: threshold !== undefined ? `${meta.metric}: ${withUnit(threshold, meta.unit)}` : meta.metric,
      ribbon: tierName(b.tier),
      ribbonColor: ribbonBackground(medal[1]),
      medal,
      icon: meta.icon,
      dy: meta.dy,
      xp: XP.badgeTier[b.tier],
    };
  }
  if (b.kind === 'monthly') {
    const meta = MONTHLY_BADGES[b.badge];
    const colors = MONTHLY_COLORS[meta.colorKey];
    return {
      name: meta.name,
      what: `${meta.rule}, ${monthLabel(b.month)}`,
      ribbon: 'Monthly',
      ribbonColor: ribbonBackground(colors[1]),
      medal: colors,
      icon: meta.icon,
      text: meta.text,
      xp: XP.monthlyBadge,
    };
  }
  const meta = SPECIAL_BADGES[b.badge];
  const gold = MEDAL_TIERS.gold;
  return { name: meta.name, what: meta.description, ribbon: 'Special', ribbonColor: ribbonBackground(gold[1]), medal: gold, icon: meta.icon, xp: XP.specialBadge };
}
