'use client';

import { useEffect, useRef, useState } from 'react';
import { fmtVolume } from '@/lib/units';
import type { WeightUnit } from '@/lib/units';
import { cn } from '@/components/ui/cn';

function XpStat({ xp }: { xp: number }) {
  const prev = useRef(xp);
  const [bump, setBump] = useState(0);
  useEffect(() => {
    if (xp > prev.current) setBump((n) => n + 1);
    prev.current = xp;
  }, [xp]);
  return (
    <b key={bump} className={cn('wt-xpv', bump > 0 && 'wt-bump')} data-testid="xp-stat">
      +{xp}
    </b>
  );
}

/**
 * The live stats of a workout in progress: duration, volume, ticked sets and XP so far.
 * `side` is the two-by-two version for the desktop Summary card.
 */
export function WorkoutStats({ elapsed, volumeKg, sets, xp, weight, side }: { elapsed: string; volumeKg: number; sets: number; xp: number; weight: WeightUnit; side?: boolean }) {
  return (
    <div className={cn('wt-logstats', side && 'side')} data-testid="log-stats">
      <div className="wt-stat">
        <small>Duration</small>
        <b style={{ color: 'var(--link)' }}>{elapsed || '0s'}</b>
      </div>
      <div className="wt-stat">
        <small>Volume</small>
        <b>{fmtVolume(volumeKg, weight)}</b>
      </div>
      <div className="wt-stat">
        <small>Sets</small>
        <b>{sets}</b>
      </div>
      <div className="wt-stat">
        <small>XP</small>
        <XpStat xp={xp} />
      </div>
    </div>
  );
}
