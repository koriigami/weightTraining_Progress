'use client';

import Link from 'next/link';
import { Dumbbell, Flame } from 'lucide-react';
import { RankShield } from '@/components/RankShield';
import { useProgress } from '@/components/ProgressProvider';
import { RANK_TITLES } from '@/lib/progress';
import type { WeekSummary } from '@/lib/week';

/**
 * The phone's Home top bar: a mini hunter card. The rank shield (the letter only), "Level N" over
 * the XP bar ("XP into the level / XP the level takes", like Rank and the level card), then the
 * weekly streak and this week's training days stacked on the right. The whole card opens Rank.
 */
export function ResourceBar({ week }: { week: WeekSummary }) {
  const { progress } = useProgress();
  const { current, needed } = progress.xpIntoLevel;
  const pct = needed > 0 ? Math.min(100, Math.round((current / needed) * 100)) : 100;
  const into = current.toLocaleString('en-US');
  const takes = needed.toLocaleString('en-US');
  return (
    <header className="wt-rbar-wrap">
      <Link
        href="/rank"
        className="wt-rbar"
        data-guide="level"
        aria-label={`Level ${progress.level}, ${RANK_TITLES[progress.rank]}, ${into} of ${takes} XP to level ${progress.level + 1}, ${week.streak} week streak, ${week.count} of ${week.goal} training days this week. Open Rank`}
      >
        <span className="wt-rbar-shield" aria-hidden="true">
          <RankShield rank={progress.rank} size={46} />
        </span>
        <span className="wt-rbar-mid" aria-hidden="true">
          <b>Level {progress.level}</b>
          <span className="wt-rbar-track">
            {current > 0 && <i style={{ width: `${pct}%` }} />}
            <em>
              {into} / {takes}
            </em>
          </span>
        </span>
        <span className="wt-rbar-stats" aria-hidden="true">
          <span className="wt-rbar-stat">
            <span className="fl">
              <Flame size={18} />
            </span>
            {week.streak}
          </span>
          <span className="wt-rbar-stat">
            <span className="db">
              <Dumbbell size={18} />
            </span>
            {week.count}/{week.goal}
          </span>
        </span>
      </Link>
    </header>
  );
}
