'use client';

import { useId } from 'react';
import { RANK_MATERIALS, SHIELD } from '@/components/RankShield';
import { RANK_TITLES } from '@/lib/progress';
import type { Rank } from '@/lib/progress';

/** A small rank-coloured shield with the level number big in the middle, for the Resource bar. */
export function LevelBadge({ rank, level, size = 44 }: { rank: Rank; level: number; size?: number }) {
  const id = `lvb-${useId().replace(/:/g, '')}`;
  const m = RANK_MATERIALS[rank];
  const digits = String(level).length;
  return (
    <svg viewBox="0 0 120 132" width={size} height={Math.round(size * 1.1)} role="img" aria-label={`Level ${level}, ${RANK_TITLES[rank]}`}>
      <defs>
        <linearGradient id={`${id}-a`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={m.rim[0]} />
          <stop offset="1" stopColor={m.rim[1]} />
        </linearGradient>
        <linearGradient id={`${id}-f`} x1="0" y1="0" x2="0.6" y2="1">
          <stop offset="0" stopColor={m.face[0]} />
          <stop offset="1" stopColor={m.face[1]} />
        </linearGradient>
      </defs>
      <path d={SHIELD} fill="#2A1806" />
      <path d={SHIELD} fill={`url(#${id}-a)`} transform="translate(60 66) scale(.93) translate(-60 -66)" />
      <path d={SHIELD} fill={`url(#${id}-f)`} transform="translate(60 66) scale(.78) translate(-60 -66)" />
      <path d="M22 20 H98 V46 C78 40 42 52 22 45 Z" fill="#fff" opacity=".16" />
      <text x="60" y="88" textAnchor="middle" fontFamily="var(--font-num), Arial Rounded MT Bold, sans-serif" fontSize={digits > 1 ? 56 : 66} fill="#fff" stroke="#2A1806" strokeWidth="7" paintOrder="stroke">
        {level}
      </text>
    </svg>
  );
}
