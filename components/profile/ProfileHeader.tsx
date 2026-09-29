'use client';

import { useSession } from 'next-auth/react';
import { RankShield } from '@/components/RankShield';
import { Avatar } from '@/components/ui/Avatar';
import { Card } from '@/components/ui/Card';
import { RANK_TITLES } from '@/lib/progress';
import type { Rank } from '@/lib/progress';

/**
 * You: the avatar in a frame in your rank's colours with the shield on its
 * corner, your name from Google, your rank title, and Level, Workouts and Week
 * streak.
 */
export function ProfileHeader({ rank, level, workouts, weekStreak }: { rank: Rank; level: number; workouts: number; weekStreak: number }) {
  const { data: auth } = useSession();
  const name = auth?.user?.name || auth?.user?.email || 'You';
  return (
    <Card as="section" aria-label="Your profile">
      <div className="wt-phead">
        <div className="wt-pav">
          <Avatar name={name} image={auth?.user?.image} size="lg" rank={rank} />
          <span className="wt-pav-sh">
            <RankShield rank={rank} size={36} />
          </span>
        </div>
        <div className="grow">
          <h2 className="wt-pname">{name}</h2>
          <div className="wt-ptitle">{RANK_TITLES[rank]}</div>
          <div className="wt-pstats">
            <div className="wt-stat">
              <small>Level</small>
              <b>{level}</b>
            </div>
            <div className="wt-stat">
              <small>Workouts</small>
              <b>{workouts}</b>
            </div>
            <div className="wt-stat">
              <small>Week streak</small>
              <b>{weekStreak}</b>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
