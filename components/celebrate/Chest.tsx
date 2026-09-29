'use client';

import { useId } from 'react';
import { BADGE_ICONS } from '@/components/Badge';
import type { MomentBadge } from '@/lib/badgeDisplay';

/**
 * The hexagon medal, ported from board 05: an outer hexagon in the tier's two
 * colours, an inset one, a gloss band, and the badge's icon or text.
 */
export function Medal({ badge, size = 120 }: { badge: MomentBadge; size?: number }) {
  const id = `md${useId().replace(/:/g, '')}`;
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={badge.medal[0]} />
          <stop offset="1" stopColor={badge.medal[1]} />
        </linearGradient>
      </defs>
      <path d="M32 2 58 17v30L32 62 6 47V17Z" fill={`url(#${id})`} stroke="rgba(0,0,0,.4)" strokeWidth="2.5" />
      <path d="M32 9 52 20.5v23L32 55 12 43.5v-23Z" fill="rgba(0,0,0,.2)" stroke="rgba(255,255,255,.5)" strokeWidth="1.5" />
      <path d="M12 20.5 32 9l20 11.5v6C40 22 24 22 12 27Z" fill="#fff" opacity=".18" />
      {badge.text ? (
        <text
          x="32"
          y="39.5"
          textAnchor="middle"
          fontFamily="var(--font-display, 'Arial Rounded MT Bold')"
          fontSize={badge.text.length > 3 ? 15 : 19}
          fill="#fff"
          stroke="rgba(0,0,0,.28)"
          strokeWidth="2"
          style={{ paintOrder: 'stroke' }}
        >
          {badge.text}
        </text>
      ) : badge.icon ? (
        <g
          transform={`translate(20 ${20 + (badge.dy ?? 0) * 0.5})`}
          fill="none"
          stroke="#fff"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          dangerouslySetInnerHTML={{ __html: BADGE_ICONS[badge.icon] ?? '' }}
        />
      ) : null}
    </svg>
  );
}

/**
 * The treasure chest for a badge unlock. It shakes, the lid flips open, and the
 * medal rises out with a shine sweep. The SVG paints outside its own box (the
 * lid swings up past the top edge), so it must never be clipped: overflow is
 * visible here and on the box around it, and the box is tall enough for the
 * medal to clear the lid.
 */
export function Chest({ badge }: { badge: MomentBadge }) {
  const id = useId().replace(/:/g, '');
  return (
    <div className="wt-chest">
      <svg className="wt-chest-box" width="160" height="136" viewBox="0 0 160 136" aria-hidden="true" focusable="false" overflow="visible">
        <defs>
          <linearGradient id={`${id}b`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" style={{ stopColor: 'var(--chest)' }} />
            <stop offset="1" style={{ stopColor: 'var(--chest-2)' }} />
          </linearGradient>
          <linearGradient id={`${id}g`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#FFE68F" />
            <stop offset="1" stopColor="#C98A0B" />
          </linearGradient>
        </defs>
        <ellipse cx="80" cy="64" rx="62" ry="12" fill="#FFF3B0" opacity=".9" />
        <rect x="8" y="62" width="144" height="68" rx="10" fill={`url(#${id}b)`} stroke="#1A0B05" strokeWidth="3" />
        <rect x="30" y="62" width="14" height="68" fill={`url(#${id}g)`} stroke="#1A0B05" strokeWidth="2" />
        <rect x="116" y="62" width="14" height="68" fill={`url(#${id}g)`} stroke="#1A0B05" strokeWidth="2" />
        <g className="wt-lid">
          <path d="M8 64 V42 Q8 16 80 16 Q152 16 152 42 V64 Z" fill={`url(#${id}b)`} stroke="#1A0B05" strokeWidth="3" />
          <path d="M30 64 V20 H44 V64 Z M116 64 V20 H130 V64 Z" fill={`url(#${id}g)`} stroke="#1A0B05" strokeWidth="2" />
          <rect x="66" y="50" width="28" height="26" rx="6" fill={`url(#${id}g)`} stroke="#1A0B05" strokeWidth="2.5" />
          <circle cx="80" cy="62" r="4" fill="#1A0B05" />
        </g>
      </svg>
      <div className="wt-m-medal">
        <Medal badge={badge} />
        <span className="wt-m-shine" />
      </div>
    </div>
  );
}
