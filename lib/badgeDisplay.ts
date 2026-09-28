// Maps an earned (or lockable) badge to what a card or reveal should show:
// name, description, XP and the props to hand to <Badge>. Kept separate from
// lib/badges.ts (pure computation) since this is presentation only.
import { LIFETIME_FAMILIES, MONTHLY_BADGES, SPECIAL_BADGES } from './badges';
import type { EarnedBadgeSummary, LifetimeFamilyId, MonthlyBadgeId, SpecialBadgeId } from './badges';
import { MONTHLY_COLORS, TIERS } from '@/components/Badge';
import type { BadgeProps } from '@/components/Badge';
import { XP } from './progress';
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
