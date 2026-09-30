'use client';

import { useId } from 'react';
import type { Rank } from '@/lib/progress';
import { RANK_TITLES } from '@/lib/progress';

export const SHIELD = 'M60 4 C80 12 98 12 112 10 V58 C112 92 90 116 60 128 C30 116 8 92 8 58 V10 C22 12 40 12 60 4 Z';

// Optical nudges: the letter and level are treated as one group, centered in
// the shield's upper-weighted silhouette. Applied to the letter glyph only.
const LETTER_DX: Partial<Record<Rank, number>> = { C: -3, D: 3, B: 1.5 };

type RankMaterial = { rim: [string, string]; face: [string, string]; glow?: string };

export const RANK_MATERIALS: Record<Rank, RankMaterial> = {
  E: { rim: ['#DCE2EA', '#5B6470'], face: ['#98A3B1', '#3E4652'] },
  D: { rim: ['#A6F3CF', '#0F7A4F'], face: ['#3DC98A', '#0A5236'] },
  C: { rim: ['#BFE1FF', '#1D4ED8'], face: ['#5AA2FF', '#14318F'] },
  B: { rim: ['#E7CCFF', '#6B21A8'], face: ['#B272F0', '#46106F'] },
  A: { rim: ['#FFF0A8', '#A36B00'], face: ['#FFC933', '#7A4E00'] },
  S: { rim: ['#FFC2CE', '#9F1239'], face: ['#FF5C7C', '#6E0B27'], glow: '#FF4D6D' },
};

export type RankShieldProps = {
  rank: Rank;
  level?: number;
  size?: number;
  className?: string;
};

export function RankShield({ rank, level, size = 96, className }: RankShieldProps) {
  const rawId = useId().replace(/:/g, '');
  const id = `shield-${rawId}`;
  const mat = RANK_MATERIALS[rank];
  const label = level != null ? `${RANK_TITLES[rank]}, level ${level}` : RANK_TITLES[rank];

  return (
    <svg viewBox="0 0 120 132" width={size} height={size} role="img" aria-label={label} className={className}>
      <defs>
        <linearGradient id={`${id}-a`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={mat.rim[0]} />
          <stop offset="1" stopColor={mat.rim[1]} />
        </linearGradient>
        <linearGradient id={`${id}-f`} x1="0" y1="0" x2=".6" y2="1">
          <stop offset="0" stopColor={mat.face[0]} />
          <stop offset="1" stopColor={mat.face[1]} />
        </linearGradient>
        <clipPath id={`${id}-c`}>
          <path d={SHIELD} transform="translate(60 66) scale(.82) translate(-60 -66)" />
        </clipPath>
        {mat.glow && (
          <filter id={`${id}-g`} x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="7" />
          </filter>
        )}
        <filter id={`${id}-t`} x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="3" stdDeviation="0" floodColor="#000" floodOpacity=".35" />
        </filter>
      </defs>

      {mat.glow && <path d={SHIELD} fill={mat.glow} opacity=".55" filter={`url(#${id}-g)`} />}
      <path d={SHIELD} fill={`url(#${id}-a)`} />
      <path d={SHIELD} fill={`url(#${id}-f)`} transform="translate(60 66) scale(.82) translate(-60 -66)" />
      <g clipPath={`url(#${id}-c)`}>
        <path d="M0 0 H120 V52 C80 44 40 60 0 50 Z" fill="#fff" opacity=".16" />
      </g>
      <path d={SHIELD} fill="none" stroke="rgba(255,255,255,.6)" strokeWidth="1.3" transform="translate(60 66) scale(.82) translate(-60 -66)" />
      <text
        x={60 + (LETTER_DX[rank] ?? 0)}
        y={level != null ? 69 : 83}
        textAnchor="middle"
        fontFamily="var(--font-display, 'Arial Rounded MT Bold')"
        fontSize={level != null ? 54 : 60}
        fill="#fff"
        filter={`url(#${id}-t)`}
      >
        {rank}
      </text>
      {level != null && (
        <text x="60" y="93" textAnchor="middle" fontFamily="var(--font-display, 'Arial Rounded MT Bold')" fontSize="15" fill="#fff" opacity=".92">
          LV {level}
        </text>
      )}
    </svg>
  );
}
