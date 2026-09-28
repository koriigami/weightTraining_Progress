'use client';

import { useState } from 'react';
import { useProgress } from '@/components/ProgressProvider';
import { Badge, TIERS } from '@/components/Badge';
import type { BadgeTier } from '@/components/Badge';
import { BottomSheet } from '@/components/BottomSheet';
import { computeBadges, LIFETIME_FAMILIES, MONTHLY_BADGES, SPECIAL_BADGES } from '@/lib/badges';
import type { LifetimeFamilyId, MonthlyBadgeId, SpecialBadgeId } from '@/lib/badges';
import { describeLifetimeTier, describeMonthlyBadge, describeSpecialBadge } from '@/lib/badgeDisplay';
import { daysBetween, lastDayOfMonth, monthKey, monthLabel, todayStr } from '@/lib/date';

const TIER_ORDER: BadgeTier[] = ['bronze', 'silver', 'gold', 'diamond', 'master', 'legend'];

type Selected =
  | { kind: 'lifetime'; family: LifetimeFamilyId }
  | { kind: 'monthly'; badge: MonthlyBadgeId; month: string }
  | { kind: 'special'; badge: SpecialBadgeId };

export default function BadgesPage() {
  const { state } = useProgress();
  const today = todayStr();
  const badges = computeBadges(state, today);
  const [selected, setSelected] = useState<Selected | null>(null);

  const thisMonth = monthKey(today);
  const thisMonthProgress = badges.monthly.find((m) => m.month === thisMonth);
  const monthEnd = lastDayOfMonth(today);
  const daysLeftInMonth = Math.max(0, daysBetween(today, monthEnd));

  const trophyMonths = [...badges.monthly].reverse().filter((m) => Object.values(m.badges).some((b) => b.earned));

  return (
    <div className="space-y-6">
      <section className="space-y-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide" style={{ color: 'var(--muted)' }}>
          This month
        </h2>
        {thisMonthProgress && (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {(Object.keys(MONTHLY_BADGES) as MonthlyBadgeId[]).map((id) => {
              const info = thisMonthProgress.badges[id];
              if (!info.eligible) return null;
              const { badgeProps, name } = describeMonthlyBadge(id, thisMonth, info.earned);
              return (
                <button
                  key={id}
                  onClick={() => setSelected({ kind: 'monthly', badge: id, month: thisMonth })}
                  className="flex items-center gap-3.5 rounded-2xl border p-3.5 text-left shadow-sm"
                  style={{ borderColor: 'var(--line)', background: 'var(--surface)' }}
                >
                  <Badge {...badgeProps} locked={!info.earned} progress={info.earned ? null : Math.min(1, info.value / info.target)} size={64} />
                  <div className="min-w-0 flex-1">
                    <b className="block text-[15px]" style={{ color: 'var(--ink)' }}>
                      {name}
                    </b>
                    <span className="text-[13px]" style={{ color: 'var(--muted)' }}>
                      {info.earned ? 'Earned' : `${info.value} of ${info.target}`}
                      {!info.earned && ` · ${daysLeftInMonth} days left`}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide" style={{ color: 'var(--muted)' }}>
          Trophy case
        </h2>
        {trophyMonths.length === 0 ? (
          <p className="text-xs" style={{ color: 'var(--muted)' }}>
            Earn a monthly badge to start your trophy case.
          </p>
        ) : (
          <div className="space-y-4">
            {trophyMonths.map((m) => (
              <div key={m.month}>
                <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--muted)' }}>
                  {monthLabel(m.month)}
                </div>
                <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
                  {(Object.keys(m.badges) as MonthlyBadgeId[])
                    .filter((id) => m.badges[id].earned)
                    .map((id) => {
                      const { badgeProps, name } = describeMonthlyBadge(id, m.month, true);
                      return (
                        <button key={id} onClick={() => setSelected({ kind: 'monthly', badge: id, month: m.month })} className="flex flex-col items-center gap-1 text-center">
                          <Badge {...badgeProps} size={72} />
                          <span className="text-xs font-medium" style={{ color: 'var(--ink)' }}>
                            {name}
                          </span>
                        </button>
                      );
                    })}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide" style={{ color: 'var(--muted)' }}>
          Lifetime
        </h2>
        <div className="divide-y" style={{ borderColor: 'var(--line)' }}>
          {(Object.keys(LIFETIME_FAMILIES) as LifetimeFamilyId[]).map((id) => {
            const meta = LIFETIME_FAMILIES[id];
            const fam = badges.lifetime[id];
            return (
              <div key={id} className="py-3">
                <div className="mb-2">
                  <b className="block text-[15px]" style={{ color: 'var(--ink)' }}>
                    {meta.name}
                  </b>
                  <span className="text-xs" style={{ color: 'var(--muted)' }}>
                    {meta.metric}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
                  {TIER_ORDER.map((tier, i) => {
                    const earned = fam.tierIndex > i;
                    const isNext = fam.tierIndex === i;
                    const threshold = meta.tiers[i];
                    const prev = i === 0 ? 0 : meta.tiers[i - 1];
                    const progress = isNext ? Math.min(1, Math.max(0, (fam.value - prev) / (threshold - prev))) : null;
                    return (
                      <button key={tier} onClick={() => setSelected({ kind: 'lifetime', family: id })} className="flex flex-col items-center gap-1 text-center">
                        <Badge shape={meta.shape} tier={tier} icon={meta.icon} dy={meta.dy} locked={!earned} progress={isNext ? progress : earned ? null : 0} size={56} />
                        <span className="text-[10px]" style={{ color: 'var(--muted)' }}>
                          {threshold.toLocaleString()}
                          {meta.unit ? ` ${meta.unit}` : ''}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide" style={{ color: 'var(--muted)' }}>
          Milestones
        </h2>
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
          {(Object.keys(SPECIAL_BADGES) as SpecialBadgeId[]).map((id) => {
            const earned = Boolean(badges.special[id]);
            const meta = SPECIAL_BADGES[id];
            return (
              <button key={id} onClick={() => setSelected({ kind: 'special', badge: id })} className="flex flex-col items-center gap-1 text-center">
                <Badge shape="star" tier="gold" icon={meta.icon} locked={!earned} size={72} />
                <span className="text-xs font-medium" style={{ color: 'var(--ink)' }}>
                  {meta.name}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <BadgeDetailSheet selected={selected} onClose={() => setSelected(null)} />
    </div>
  );
}

function BadgeDetailSheet({ selected, onClose }: { selected: Selected | null; onClose: () => void }) {
  const { state } = useProgress();
  const today = todayStr();
  const badges = computeBadges(state, today);

  let display: ReturnType<typeof describeLifetimeTier> | null = null;
  let earnedAt: string | undefined;
  let ladder: { tier: BadgeTier; earned: boolean; earnedAt?: string }[] | null = null;

  if (selected?.kind === 'lifetime') {
    const meta = LIFETIME_FAMILIES[selected.family];
    const fam = badges.lifetime[selected.family];
    const hasTier = fam.tierIndex > 0;
    const currentTier = hasTier ? TIER_ORDER[fam.tierIndex - 1] : TIER_ORDER[0];
    display = describeLifetimeTier(selected.family, currentTier);
    display.description = `${meta.metric}. ${fam.value.toLocaleString()}${meta.unit ? ` ${meta.unit}` : ''} so far.`;
    display = { ...display, badgeProps: { ...display.badgeProps, locked: !hasTier, progress: !hasTier ? fam.progressToNext : null } };
    earnedAt = fam.earned[fam.earned.length - 1]?.earnedAt;
    ladder = TIER_ORDER.map((tier, i) => ({ tier, earned: fam.tierIndex > i, earnedAt: fam.earned[i]?.earnedAt }));
  } else if (selected?.kind === 'monthly') {
    const info = badges.monthly.find((m) => m.month === selected.month)?.badges[selected.badge];
    display = describeMonthlyBadge(selected.badge, selected.month, Boolean(info?.earned));
    display = { ...display, badgeProps: { ...display.badgeProps, locked: !info?.earned } };
    earnedAt = info?.earnedAt;
  } else if (selected?.kind === 'special') {
    display = describeSpecialBadge(selected.badge);
    const info = badges.special[selected.badge];
    display = { ...display, badgeProps: { ...display.badgeProps, locked: !info } };
    earnedAt = info?.earnedAt;
  }

  return (
    <BottomSheet open={Boolean(selected)} onClose={onClose} ariaLabel="Badge details" title={display?.name ?? 'Badge'}>
      {display && (
        <div className="flex flex-col items-center gap-3 pb-2 pt-2 text-center">
          <Badge {...display.badgeProps} size={140} />
          <p className="text-sm" style={{ color: 'var(--muted)' }}>
            {display.description}
          </p>
          <p className="text-xs font-semibold" style={{ color: earnedAt ? 'var(--ok)' : 'var(--muted)' }}>
            {earnedAt ? `Earned ${earnedAt}` : 'Not yet earned'}
          </p>
          {ladder && (
            <div className="mt-2 grid w-full grid-cols-6 gap-1.5">
              {ladder.map((l) => (
                <div key={l.tier} className="flex flex-col items-center gap-1">
                  <Badge shape="circle" tier={l.tier} text={l.tier[0].toUpperCase()} locked={!l.earned} size={32} />
                  <span className="text-[9px] capitalize" style={{ color: 'var(--muted)' }}>
                    {l.tier}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </BottomSheet>
  );
}
