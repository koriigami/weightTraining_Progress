// App pieces rebuilt as vectors for video, copied from the app as it is today:
// the rank shield (components/RankShield.tsx), the segmented XP bar (.wt-xpbar),
// the Home header card, the week strip, the XP chip and the XP earned sheet.
// Sizes are the phone's times about 2.6, so a 1080 px video reads like a phone.
import React from 'react';
import { Img, staticFile } from 'remotion';
import { BODY, C, DISPLAY } from './brand';

type Rank = 'E' | 'D' | 'C' | 'B' | 'A' | 'S';
const SHIELD = 'M60 4 C80 12 98 12 112 10 V58 C112 92 90 116 60 128 C30 116 8 92 8 58 V10 C22 12 40 12 60 4 Z';
const MAT: Record<Rank, { rim: [string, string]; face: [string, string]; glow?: string }> = {
  E: { rim: ['#DCE2EA', '#5B6470'], face: ['#98A3B1', '#3E4652'] },
  D: { rim: ['#A6F3CF', '#0F7A4F'], face: ['#3DC98A', '#0A5236'] },
  C: { rim: ['#BFE1FF', '#1D4ED8'], face: ['#5AA2FF', '#14318F'] },
  B: { rim: ['#E7CCFF', '#6B21A8'], face: ['#B272F0', '#46106F'] },
  A: { rim: ['#FFF0A8', '#A36B00'], face: ['#FFC933', '#7A4E00'] },
  S: { rim: ['#FFC2CE', '#9F1239'], face: ['#FF5C7C', '#6E0B27'], glow: '#FF4D6D' },
};
const DX: Partial<Record<Rank, number>> = { C: -3, D: 3, B: 1.5 };

export const Shield: React.FC<{ rank: Rank; level?: number; size: number; id: string }> = ({ rank, level, size, id }) => {
  const m = MAT[rank];
  const inner = 'translate(60 66) scale(.82) translate(-60 -66)';
  return (
    <svg viewBox="0 0 120 132" width={size} height={size * 1.1} style={{ overflow: 'visible', display: 'block' }}>
      <defs>
        <linearGradient id={`${id}a`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={m.rim[0]} />
          <stop offset="1" stopColor={m.rim[1]} />
        </linearGradient>
        <linearGradient id={`${id}f`} x1="0" y1="0" x2=".6" y2="1">
          <stop offset="0" stopColor={m.face[0]} />
          <stop offset="1" stopColor={m.face[1]} />
        </linearGradient>
        <clipPath id={`${id}c`}>
          <path d={SHIELD} transform={inner} />
        </clipPath>
      </defs>
      <path d={SHIELD} fill={`url(#${id}a)`} />
      <path d={SHIELD} fill={`url(#${id}f)`} transform={inner} />
      <g clipPath={`url(#${id}c)`}>
        <path d="M0 0 H120 V52 C80 44 40 60 0 50 Z" fill="#fff" opacity=".16" />
      </g>
      <path d={SHIELD} fill="none" stroke="rgba(255,255,255,.6)" strokeWidth="1.3" transform={inner} />
      <text x={60 + (DX[rank] ?? 0)} y={level != null ? 69 : 83} textAnchor="middle" fontFamily={DISPLAY} fontSize={level != null ? 54 : 60} fill="#fff" style={{ filter: 'drop-shadow(0 3px 0 rgba(0,0,0,.35))' }}>
        {rank}
      </text>
      {level != null && (
        <text x="60" y="93" textAnchor="middle" fontFamily={DISPLAY} fontSize="15" fill="#fff" opacity=".92">
          LV {level}
        </text>
      )}
    </svg>
  );
};

// The segmented gold bar with an ink outline, ten segments, the text inside.
export const XpBar: React.FC<{ pct: number; height?: number; label?: string; children?: React.ReactNode }> = ({ pct, height = 64, label, children }) => (
  <div style={{ position: 'relative', height, borderRadius: height / 2, background: C.track, border: `5px solid ${C.stroke}`, overflow: 'hidden' }}>
    <div style={{ height: '100%', width: `${Math.max(0, Math.min(100, pct))}%`, background: `linear-gradient(180deg, ${C.xpHi}, ${C.xp} 55%, ${C.xpDeep})`, borderRadius: `0 ${height / 2}px ${height / 2}px 0` }} />
    <div style={{ position: 'absolute', inset: 0, background: 'repeating-linear-gradient(90deg, transparent 0 calc(10% - 4px), rgba(0,0,0,.28) calc(10% - 4px) 10%)' }} />
    {label && (
      <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', fontFamily: DISPLAY, fontSize: height * 0.55, color: C.ink }}>{label}</div>
    )}
    {children}
  </div>
);

// A cream card with the app's gold bevel.
export const Card: React.FC<{ children: React.ReactNode; style?: React.CSSProperties }> = ({ children, style }) => (
  <div style={{ background: C.surface, borderRadius: 48, border: `5px solid ${C.line}`, boxShadow: `0 14px 0 ${C.line}, 0 40px 60px -30px rgba(60,30,0,.45)`, padding: 44, ...style }}>{children}</div>
);

// The Home header: shield, level, the XP bar with the numbers inside, streak and days.
export const HunterCard: React.FC<{ rank: Rank; level: number; into: number; need: number; streak?: number; days?: string; bar?: React.ReactNode }> = ({ rank, level, into, need, streak = 1, days = '2/3', bar }) => (
  <Card style={{ padding: '36px 40px', display: 'flex', alignItems: 'center', gap: 34, width: 960 }}>
    <Shield rank={rank} level={undefined} size={150} id="hc" />
    <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ fontFamily: DISPLAY, fontSize: 76, color: C.ink, lineHeight: 1 }}>Level {level}</div>
      {bar ?? <XpBar height={76} pct={(into / need) * 100} label={`${into.toLocaleString('en-US')} / ${need.toLocaleString('en-US')}`} />}
    </div>
    <div style={{ borderLeft: `4px solid ${C.line}`, paddingLeft: 30, display: 'flex', flexDirection: 'column', gap: 18, fontFamily: DISPLAY, fontSize: 60, color: C.ink }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <Flame size={56} />
        {streak}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <Dumbbell size={56} />
        {days}
      </div>
    </div>
  </Card>
);

export const Flame: React.FC<{ size: number; color?: string }> = ({ size, color = C.flame }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
  </svg>
);
export const Dumbbell: React.FC<{ size: number }> = ({ size }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={C.p2} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14.4 14.4 9.6 9.6M18.657 21.485a2 2 0 1 1-2.829-2.828l-1.767 1.768a2 2 0 1 1-2.829-2.829l6.364-6.364a2 2 0 1 1 2.829 2.829l-1.768 1.767a2 2 0 1 1 2.828 2.829zM21.5 21.5l-1.4-1.4M3.9 3.9 2.5 2.5M6.404 12.768a2 2 0 1 1-2.829-2.829l1.768-1.767a2 2 0 1 1-2.828-2.829l2.828-2.828a2 2 0 1 1 2.829 2.828l1.767-1.768a2 2 0 1 1 2.829 2.829z" />
  </svg>
);

// One day tile of the week strip: done (green with a tick), rest, or not yet.
export type Day = 'done' | 'rest' | 'none' | 'today';
export const DayTile: React.FC<{ kind: Day; size?: number }> = ({ kind, size = 104 }) => {
  if (kind === 'done' || kind === 'today')
    return (
      <div style={{ width: size, height: size, borderRadius: 26, background: `linear-gradient(180deg, ${C.p1}, ${C.p2})`, boxShadow: `0 8px 0 ${C.pBevel}`, outline: kind === 'today' ? `6px solid ${C.xp}` : undefined, outlineOffset: 6, display: 'grid', placeItems: 'center' }}>
        <svg width={size * 0.42} height={size * 0.42} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 6 9 17l-5-5" />
        </svg>
      </div>
    );
  if (kind === 'rest')
    return <div style={{ width: size, height: size, borderRadius: 26, background: C.rest, border: `4px solid ${C.line}`, display: 'grid', placeItems: 'center', fontFamily: BODY, fontWeight: 700, fontSize: size * 0.27, color: C.muted }}>Rest</div>;
  return <div style={{ width: size, height: size, borderRadius: 26, background: C.calm, border: `4px dashed ${C.line}` }} />;
};

export const WeekStrip: React.FC<{ days: Day[]; tile?: number; render?: (i: number, el: React.ReactNode) => React.ReactNode }> = ({ days, tile = 104, render }) => (
  <div style={{ display: 'flex', gap: 22, justifyContent: 'center' }}>
    {days.map((d, i) => (
      <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
        <div style={{ fontFamily: BODY, fontWeight: 700, fontSize: 40, color: C.muted }}>{'MTWTFSS'[i]}</div>
        {render ? render(i, <DayTile kind={d} size={tile} />) : <DayTile kind={d} size={tile} />}
      </div>
    ))}
  </div>
);

// The gold +XP chip.
export const XpChip: React.FC<{ xp: number; what?: string; big?: boolean }> = ({ xp, what, big }) => (
  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 22, background: C.surface, border: `5px solid ${C.sLine}`, borderRadius: 999, padding: big ? '18px 40px 18px 18px' : '12px 30px 12px 12px', boxShadow: `0 8px 0 ${C.sBevel}` }}>
    <span style={{ fontFamily: DISPLAY, fontSize: big ? 64 : 50, color: '#3b2600', background: `linear-gradient(180deg, ${C.xpHi}, ${C.xp})`, borderRadius: 999, padding: big ? '6px 30px' : '4px 24px', boxShadow: `0 5px 0 ${C.xpDeep}` }}>+{xp}</span>
    {what && <span style={{ fontFamily: BODY, fontWeight: 800, fontSize: big ? 48 : 42, color: C.ink }}>{what}</span>}
  </div>
);

// The XP earned sheet from the workout page, rows given as [what, sub, xp].
export const XpSheet: React.FC<{ rows: [string, string | null, number][]; total: number; shown?: number }> = ({ rows, total, shown = rows.length + 1 }) => (
  <div style={{ width: 900, background: C.surface, borderRadius: 48, border: `6px solid ${C.xp}`, boxShadow: `0 14px 0 ${C.xpDeep}`, overflow: 'visible', position: 'relative', paddingTop: 70 }}>
    <div style={{ position: 'absolute', left: 60, right: 60, top: -44, height: 96, borderRadius: 26, background: 'linear-gradient(180deg, #4aa3ff, #1d6fe0)', border: `6px solid ${C.xp}`, boxShadow: `0 8px 0 #12408a`, display: 'grid', placeItems: 'center', fontFamily: DISPLAY, fontSize: 58, color: '#fff', WebkitTextStroke: '8px #12408a', paintOrder: 'stroke fill' }}>XP earned</div>
    <div style={{ padding: '30px 60px 50px', fontFamily: BODY, fontSize: 44, color: C.ink }}>
      {rows.map(([w, sub, xp], i) => (
        <div key={w} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '26px 0', borderBottom: `3px solid ${C.line}`, opacity: i < shown ? 1 : 0 }}>
          <div>
            <div style={{ fontWeight: 600 }}>{w}</div>
            {sub && <div style={{ fontSize: 34, color: C.muted, fontWeight: 600 }}>{sub}</div>}
          </div>
          <div style={{ fontWeight: 800 }}>+{xp}</div>
        </div>
      ))}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 30, opacity: shown > rows.length ? 1 : 0 }}>
        <div style={{ fontWeight: 800 }}>Total</div>
        <div style={{ fontFamily: DISPLAY, fontSize: 64, color: C.xpInk }}>+{total} XP</div>
      </div>
    </div>
  </div>
);

// The Levl logo: the real mark from public/logo.svg, and the word.
export const Logo: React.FC<{ size: number }> = ({ size }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: size * 0.24 }}>
    <Img src={staticFile('logo.svg')} style={{ width: size, height: size }} />
    <div style={{ fontFamily: DISPLAY, fontSize: size * 0.82, color: C.ink, lineHeight: 1 }}>Levl</div>
  </div>
);
