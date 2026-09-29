'use client';

import { useId } from 'react';

import { TIERS, MONTHLY_COLORS } from '@/lib/badgeColors';
import type { BadgeTier } from '@/lib/progress';

export { TIERS, MONTHLY_COLORS };
export type { BadgeTier };
export type BadgeShape = 'shield' | 'hex' | 'circle' | 'diamond' | 'square' | 'star';

// 24px-grid stroke icons, ported verbatim from the design reference so the
// geometry inside each badge matches exactly.
export const BADGE_ICONS: Record<string, string> = {
  flame: '<path d="M12 3c.5 3 4 4.6 4 9a4 4 0 0 1-8 0c0-2 .8-3.2 2-4.2.1 1.8 1 2.8 2 2.8 0-2.6-.8-4.8 0-7.6z"/>',
  chevrons: '<path d="M6 13l6-6 6 6M6 19l6-6 6 6"/>',
  dumbbell: '<path d="M6.5 6.5v11M17.5 6.5v11M3.5 9.5v5M20.5 9.5v5M6.5 12h11"/>',
  timer: '<circle cx="12" cy="13.5" r="7.5"/><path d="M12 9.5v4l2.5 2M9.5 3h5"/>',
  run: '<circle cx="14.5" cy="4.5" r="1.8"/><path d="M8 20l3-6 3 2.5V21M6 11.5l3.5-3.5 4 2 3 3.5"/>',
  bike: '<circle cx="6" cy="16.5" r="3.5"/><circle cx="18" cy="16.5" r="3.5"/><path d="M6 16.5l4-8h4.5l3.5 8M10 8.5l3 8M13 5.5h3"/>',
  down: '<path d="M3 6l6.5 6.5 4-4L21 16M21 10v6h-6"/>',
  calcheck: '<rect x="3.5" y="5" width="17" height="15" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4M9 15l2 2 4-4"/>',
  star: '<path d="M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.8L12 16.8 6.8 19.6l1-5.8-4.3-4.1 5.9-.8z"/>',
  trophy: '<path d="M8 4h8v5a4 4 0 0 1-8 0zM8 6H4.5a3 3 0 0 0 3.5 4M16 6h3.5a3 3 0 0 1-3.5 4M12 13v4M8.5 20h7M10 17h4"/>',
  week: '<rect x="3.5" y="5" width="17" height="15" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4M7.5 14h9"/>',
  target: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="1"/>',
  crown: '<path d="M4 18h16M5 18L3.5 8l5 3.5L12 5l3.5 6.5 5-3.5L19 18"/>',
  scale: '<rect x="3.5" y="4" width="17" height="16" rx="3"/><path d="M8 9a5 5 0 0 1 8 0M12 9.5l1.5-1.5"/>',
};

function starPath(): string {
  let p = '';
  for (let i = 0; i < 16; i++) {
    const r = i % 2 ? 38 : 54;
    const a = -Math.PI / 2 + (i * Math.PI) / 8;
    p += (i ? 'L' : 'M') + (60 + r * Math.cos(a)).toFixed(1) + ' ' + (60 + r * Math.sin(a)).toFixed(1) + ' ';
  }
  return p + 'Z';
}

const SHAPES: Record<BadgeShape, string> = {
  shield: 'M60 6 L106 20 V56 C106 84 88 104 60 114 C32 104 14 84 14 56 V20 Z',
  hex: 'M60 6 L107 33 V87 L60 114 L13 87 V33 Z',
  circle: 'M60 10 A46 46 0 1 1 59.99 10 Z',
  diamond: 'M60 6 Q64 6 68 10 L110 52 Q114 60 110 68 L68 110 Q60 116 52 110 L10 68 Q6 60 10 52 L52 10 Q56 6 60 6 Z',
  square: 'M34 12 H86 Q108 12 108 34 V86 Q108 108 86 108 H34 Q12 108 12 86 V34 Q12 12 34 12 Z',
  star: starPath(),
};

function shade(hex: string, amt: number): string {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  const f = (v: number) => Math.max(0, Math.min(255, Math.round(v + (amt < 0 ? v * amt : (255 - v) * amt))));
  return '#' + [f(r), f(g), f(b)].map((v) => v.toString(16).padStart(2, '0')).join('');
}

export type BadgeProps = {
  shape: BadgeShape;
  tier?: BadgeTier;
  colors?: [string, string];
  icon?: string;
  /** Extra vertical nudge for the icon emblem, in the badge's 120-unit space. */
  dy?: number;
  text?: string;
  month?: string; // ribbon text, e.g. "OCT 26"
  locked?: boolean;
  progress?: number | null; // 0..1, shown as a ring when locked
  size?: number;
  label?: string;
  className?: string;
};

export function Badge({ shape, tier, colors, icon, dy = 0, text, month, locked, progress, size = 96, label, className }: BadgeProps) {
  const rawId = useId().replace(/:/g, '');
  const id = `badge-${rawId}`;
  const mat = colors ? { rim: colors, face: colors, label: '' } : TIERS[locked ? 'locked' : (tier ?? 'bronze')];
  const face: [string, string] = colors ? [shade(colors[0], -0.05), shade(colors[1], -0.25)] : mat.face;
  const shapePath = SHAPES[shape];
  const isLegend = tier === 'legend' && !locked;
  const rimStops = mat.rim.map((c, i) => ({ offset: mat.rim.length > 1 ? i / (mat.rim.length - 1) : 0, color: c }));
  const sparkColor = tier === 'master' ? '#FFB36B' : '#fff';

  const showRibbonTails = shape === 'circle' && !month;
  const showBanner = Boolean(month);
  const showSparkle = (tier === 'diamond' || tier === 'master' || tier === 'legend') && !locked;
  const showRing = Boolean(locked && progress != null);
  const innerTransform = locked && progress != null ? 'translate(60 60) scale(.74) translate(-60 -60)' : undefined;

  const ringCircumference = 2 * Math.PI * 57;
  const ringDash = progress != null ? (ringCircumference * Math.max(0, Math.min(1, progress))).toFixed(1) : '0';

  return (
    <svg
      viewBox="0 0 120 124"
      width={size}
      height={size}
      role="img"
      aria-label={label ?? ''}
      className={[isLegend ? 'badge-legend' : '', className].filter(Boolean).join(' ')}
    >
      <defs>
        <linearGradient id={`${id}-a`} x1="0" y1="0" x2={isLegend ? '1' : '0'} y2="1">
          {rimStops.map((s, i) => (
            <stop key={i} offset={s.offset} stopColor={s.color} />
          ))}
        </linearGradient>
        <linearGradient id={`${id}-f`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={face[0]} />
          <stop offset="1" stopColor={face[1]} />
        </linearGradient>
        <linearGradient id={`${id}-r`} x1="0" y1="0" x2="0" y2="1">
          {rimStops.map((s, i) => (
            <stop key={i} offset={s.offset} stopColor={s.color} />
          ))}
        </linearGradient>
        <clipPath id={`${id}-c`}>
          <path d={shapePath} transform="translate(60 60) scale(.84) translate(-60 -60)" />
        </clipPath>
        <filter id={`${id}-s`} x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="1.5" stdDeviation="1.2" floodColor="#000" floodOpacity=".35" />
        </filter>
        <filter id={`${id}-d`} x="-10%" y="-10%" width="120%" height="125%">
          <feDropShadow dx="0" dy="3" stdDeviation="2.5" floodColor="#000" floodOpacity=".25" />
        </filter>
      </defs>

      {showRing && (
        <>
          <circle cx="60" cy="60" r="57" fill="none" stroke="var(--line)" strokeWidth="5" />
          <circle
            cx="60"
            cy="60"
            r="57"
            fill="none"
            stroke="var(--accent)"
            strokeWidth="5"
            strokeLinecap="round"
            strokeDasharray={`${ringDash} ${ringCircumference.toFixed(1)}`}
            transform="rotate(-90 60 60)"
          />
        </>
      )}

      <g transform={innerTransform} opacity={locked ? 0.45 : undefined}>
        {showRibbonTails && (
          <>
            <path d={`M40 88 L30 118 L44 110 L52 120 L58 96 Z`} fill={face[1]} />
            <path d={`M80 88 L90 118 L76 110 L68 120 L62 96 Z`} fill={face[1]} />
          </>
        )}
        <path d={shapePath} fill={`url(#${id}-a)`} filter={`url(#${id}-d)`} />
        <path d={shapePath} fill={`url(#${id}-f)`} transform="translate(60 60) scale(.84) translate(-60 -60)" />
        <g clipPath={`url(#${id}-c)`}>
          <ellipse cx="60" cy="22" rx="62" ry="34" fill="#fff" opacity=".18" />
        </g>
        <path d={shapePath} fill="none" stroke="rgba(255,255,255,.55)" strokeWidth="1.2" transform="translate(60 60) scale(.84) translate(-60 -60)" />

        {text ? (
          <text
            x="60"
            y={month ? 63 : 72}
            textAnchor="middle"
            fontFamily="var(--font-display, 'Arial Rounded MT Bold')"
            fontSize={text.length > 3 ? 24 : 30}
            fill="#fff"
            style={{ paintOrder: 'stroke' }}
            stroke="rgba(0,0,0,.28)"
            strokeWidth={3}
          >
            {text}
          </text>
        ) : icon ? (
          <g
            transform={`translate(${month ? 38 : 36} ${(month ? 30 : 36) + dy}) scale(${month ? 1.85 : 2})`}
            fill="none"
            stroke="#fff"
            strokeWidth={2.1}
            strokeLinecap="round"
            strokeLinejoin="round"
            filter={`url(#${id}-s)`}
            dangerouslySetInnerHTML={{ __html: BADGE_ICONS[icon] ?? '' }}
          />
        ) : null}

        {showSparkle && (
          <>
            <path d="M96 18 l3 7 7 3 -7 3 -3 7 -3 -7 -7 -3 7 -3z" fill={sparkColor} opacity=".9" />
            <path d="M22 92 l2 4 4 2 -4 2 -2 4 -2 -4 -4 -2 4 -2z" fill={sparkColor} opacity=".75" />
            {tier === 'legend' && (
              <>
                <path d="M100 88 l2 4 4 2 -4 2 -2 4 -2 -4 -4 -2 4 -2z" fill="#fff" opacity=".8" />
                <path d="M20 24 l1.5 3 3 1.5 -3 1.5 -1.5 3 -1.5 -3 -3 -1.5 3 -1.5z" fill="#fff" opacity=".7" />
              </>
            )}
          </>
        )}

        {showBanner && (
          <>
            <path d="M8 84 H112 L104 96 L112 108 H8 L16 96 Z" fill={`url(#${id}-r)`} stroke="rgba(0,0,0,.25)" />
            <text
              x="60"
              y="101"
              textAnchor="middle"
              fontFamily="var(--font-display, 'Arial Rounded MT Bold')"
              fontSize="14"
              fill="#fff"
              style={{ paintOrder: 'stroke' }}
              stroke="rgba(0,0,0,.35)"
              strokeWidth={2}
            >
              {month}
            </text>
          </>
        )}
      </g>

      {locked && (
        <g transform="translate(84 84)">
          <circle r="13" fill="var(--surface)" stroke="var(--line)" />
          <rect x="-5.5" y="-2" width="11" height="8" rx="2" fill="var(--muted)" />
          <path d="M-3.5 -2 v-3 a3.5 3.5 0 0 1 7 0 v3" fill="none" stroke="var(--muted)" strokeWidth="2" />
        </g>
      )}
    </svg>
  );
}
