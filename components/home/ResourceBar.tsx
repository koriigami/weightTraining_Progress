'use client';

import Link from 'next/link';
import { Dumbbell, Flame } from 'lucide-react';
import { LevelBadge } from './LevelBadge';
import { useProgress } from '@/components/ProgressProvider';
import type { WeekSummary } from '@/lib/week';

/**
 * The phone's Home top bar: the level badge over the left end of the XP bar
 * ("total XP / XP for the next level"), then the weekly streak and this week's
 * training days as two dark pills. No card, it sits on the sky. The whole bar opens Rank.
 */
export function ResourceBar({ week }: { week: WeekSummary }) {
  const { progress } = useProgress();
  const { current, needed } = progress.xpIntoLevel;
  const next = progress.xp - current + needed;
  const pct = needed > 0 ? Math.min(100, Math.round((current / needed) * 100)) : 100;
  const xp = `${progress.xp.toLocaleString('en-US')} / ${next.toLocaleString('en-US')}`;
  return (
    <header className="wt-rbar-wrap">
      <Link
        href="/rank"
        className="wt-rbar"
        aria-label={`Level ${progress.level}, ${xp} XP, ${week.streak} week streak, ${week.count} of ${week.goal} training days this week. Open Rank`}
      >
        <span className="wt-rbar-badge">
          <LevelBadge rank={progress.rank} level={progress.level} />
        </span>
        <span className="wt-rbar-xp" aria-hidden="true">
          <i style={{ width: `${pct}%` }} />
          <em>{xp}</em>
        </span>
        <span className="wt-rbar-pill" aria-hidden="true">
          <span className="fl">
            <Flame size={18} />
          </span>
          {week.streak}
        </span>
        <span className="wt-rbar-pill" aria-hidden="true">
          <span className="db">
            <Dumbbell size={18} />
          </span>
          {week.count}/{week.goal}
        </span>
      </Link>
    </header>
  );
}
