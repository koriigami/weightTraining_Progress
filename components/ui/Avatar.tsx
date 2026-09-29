'use client';

import type { Rank } from '@/lib/progress';
import { RANK_MATERIALS } from '@/components/RankShield';
import { cn } from './cn';

/** A round avatar (Google photo or the first letter), optionally in a rank-coloured frame. */
export function Avatar({
  name,
  image,
  size = 'md',
  rank,
  className,
}: {
  name?: string | null;
  image?: string | null;
  size?: 'sm' | 'md' | 'lg';
  rank?: Rank;
  className?: string;
}) {
  const letter = (name?.trim().charAt(0) || '?').toUpperCase();
  const face = (
    <span className={cn('wt-avatar', size !== 'md' && size, className)} aria-hidden="true">
      {image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={image} alt="" referrerPolicy="no-referrer" />
      ) : (
        letter
      )}
    </span>
  );
  if (!rank) return face;
  const m = RANK_MATERIALS[rank];
  return (
    <span className="wt-frame" style={{ ['--fr1' as string]: m.rim[0], ['--fr2' as string]: m.rim[1] }}>
      {face}
    </span>
  );
}
