'use client';

import { RankShield } from '@/components/RankShield';
import { useProgress } from '@/components/ProgressProvider';
import { RANK_TITLES } from '@/lib/progress';
import { Hero } from '@/components/ui/Card';
import { ButtonLink } from '@/components/ui/Button';
import { XpBar } from '@/components/ui/XpBar';
import { Shield } from 'lucide-react';

/** The Deep Sky level card: shield, level, rank title and the XP bar. */
export function HeroLevel() {
  const { progress } = useProgress();
  const { current, needed } = progress.xpIntoLevel;
  return (
    <Hero>
      <div className="wt-hero-row">
        <RankShield rank={progress.rank} level={progress.level} size={66} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="gt wt-hero-lvl">Level {progress.level}</div>
          <div className="wt-hero-t">{RANK_TITLES[progress.rank]}</div>
        </div>
        <ButtonLink href="/rank" variant="secondary" size="sm" icon={<Shield size={16} aria-hidden="true" />} aria-label="Open Rank Road">
          Road
        </ButtonLink>
      </div>
      <XpBar current={current} max={needed} label={`${current} of ${needed} XP to level ${progress.level + 1}`} />
      <div className="wt-hero-xp">
        <span>
          {current} / {needed} XP
        </span>
        <span>
          {needed - current} XP to level {progress.level + 1}
        </span>
      </div>
    </Hero>
  );
}
