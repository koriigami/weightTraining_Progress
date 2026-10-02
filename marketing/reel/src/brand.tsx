// The Levl look for video: the app's tokens (app/globals.css), its two fonts and the
// sky. Literal colours, as on the share card, because video has no CSS variables.
import React from 'react';
import { AbsoluteFill, staticFile, useCurrentFrame } from 'remotion';

export const C = {
  sky: '#86ccff',
  skyMid: '#cdeeff',
  cream: '#fbeacb',
  creamTop: '#fff6e2',
  surface: '#fff8e8',
  calm: '#fffdf6',
  line: '#e2cb98',
  ink: '#2e1f0c',
  muted: '#795f3f',
  stroke: '#3a230c',
  track: 'rgba(110, 70, 20, 0.2)',
  p1: '#86ea64',
  p2: '#2ba438',
  pBevel: '#186a20',
  okSoft: '#ddf5d2',
  sFace: '#ffedb8',
  sLine: '#d49a2a',
  sBevel: '#b8862e',
  sInk: '#4a3212',
  xp: '#ffc21a',
  xpHi: '#fff28f',
  xpDeep: '#c7870a',
  xpInk: '#8f5c00',
  bad: '#dd3f33',
  rest: '#f4e9d2',
  scrim: 'rgba(46, 26, 6, 0.82)',
  flame: '#f26b1d',
};

export const DISPLAY = "'Levl Display', 'Arial Rounded MT Bold', sans-serif";
export const BODY = "'Levl Body', system-ui, sans-serif";

export const Fonts: React.FC = () => (
  <style>{`@font-face{font-family:'Levl Display';src:url(${staticFile('lilita.woff2')}) format('woff2')}
@font-face{font-family:'Levl Body';src:url(${staticFile('figtree.woff2')}) format('woff2');font-weight:100 900}`}</style>
);

// The stroked display type of the stories: white face, ink outline, a hard ink drop.
export const Display: React.FC<{ size: number; color?: string; children: React.ReactNode; style?: React.CSSProperties }> = ({ size, color = '#fff', children, style }) => (
  <div
    style={{
      fontFamily: DISPLAY,
      fontSize: size,
      lineHeight: 1.02,
      color,
      WebkitTextStroke: `${Math.round(size * 0.11)}px ${C.ink}`,
      paintOrder: 'stroke fill',
      textShadow: `0 ${Math.round(size * 0.075)}px 0 ${C.ink}`,
      textAlign: 'center',
      whiteSpace: 'pre-line',
      ...style,
    }}
  >
    {children}
  </div>
);

// The cream pill with a gold edge that labels a story ("RANK ROAD").
export const Tag: React.FC<{ children: React.ReactNode; tone?: 'gold' | 'red' | 'green'; style?: React.CSSProperties }> = ({ children, tone = 'gold', style }) => {
  const t = { gold: [C.xpInk, '#e3b03a', '#c8932a'], red: ['#a5261d', '#e5534b', '#b8362c'], green: [C.pBevel, C.p2, C.pBevel] }[tone];
  return (
    <div
      style={{
        fontFamily: BODY,
        fontWeight: 800,
        fontSize: 34,
        letterSpacing: '0.14em',
        textTransform: 'uppercase',
        color: t[0],
        background: C.surface,
        border: `4px solid ${t[1]}`,
        borderRadius: 999,
        padding: '10px 34px',
        boxShadow: `0 6px 0 ${t[2]}`,
        ...style,
      }}
    >
      {children}
    </div>
  );
};

// A puffy cloud from overlapping circles, like the app's sky.
export const Cloud: React.FC<{ x: number; y: number; s: number; o?: number }> = ({ x, y, s, o = 0.9 }) => (
  <svg style={{ position: 'absolute', left: x, top: y, overflow: 'visible' }} width={300 * s} height={120 * s} viewBox="0 0 300 120">
    <g fill="#fff" opacity={o}>
      <circle cx="80" cy="80" r="42" />
      <circle cx="140" cy="58" r="56" />
      <circle cx="210" cy="78" r="40" />
      <rect x="40" y="78" width="210" height="42" rx="21" />
    </g>
  </svg>
);

// The app's sky: blue at the top fading to cream, with clouds drifting slowly.
export const Sky: React.FC<{ drift?: number }> = ({ drift = 0.6 }) => {
  const f = useCurrentFrame();
  const d = f * drift;
  return (
    <AbsoluteFill style={{ background: `linear-gradient(180deg, ${C.sky} 0%, ${C.skyMid} 30%, ${C.creamTop} 58%, ${C.cream} 100%)`, overflow: 'hidden' }}>
      <Cloud x={-120 + d * 0.5} y={150} s={1.6} />
      <Cloud x={640 - d * 0.35} y={60} s={1.3} o={0.8} />
      <Cloud x={560 + d * 0.25} y={520} s={1.1} o={0.7} />
      <Cloud x={-80 - d * 0.2} y={760} s={1.2} o={0.55} />
    </AbsoluteFill>
  );
};
