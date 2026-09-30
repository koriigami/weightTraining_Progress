import type { ReactNode, Ref, SVGProps } from 'react';
import { RankShieldArt } from '@/components/RankShield';
import { BodyShapes } from '@/components/ui/MuscleMap';
import type { Muscle } from '@/data/exercises';
import { textWidth } from '@/lib/shareCard';
import type { MuscleChip, ShareCard, ShareStat } from '@/lib/shareCard';
import { CLOUD_STAMPS, skyClouds } from '@/lib/sky';
import type { Cloud } from '@/lib/sky';
import { CARD, CARD_H, CARD_W, DATE_KEEP_OUT, FONT_BODY, FONT_DISPLAY } from './cardTheme';

// The share card: one self-contained 1080 x 1350 SVG, laid out like layout B of the
// design board (docs/design/share-card/card-reference.js). It is the on-screen
// preview and the source of the exported picture, so every colour is a literal, the
// fonts are the two 'Levl' @font-face names, and there is no foreignObject, image
// or link in it.

type Anchor = 'start' | 'middle' | 'end';

const f1 = (n: number): string => n.toFixed(1);

// The letters of both fonts are 0.71 em tall, so a line is centred on cy when its baseline is at cy + 0.355 * size.
const baseFor = (cy: number, size: number): number => cy + 0.355 * size;

// ---------------- text ----------------

// Game title text: a navy drop copy, then white (or gold) with a navy outline.
function GameText({
  x,
  y,
  size,
  text,
  fill = '#fff',
  anchor = 'middle',
  drop = 0.08,
  outline = 0.16,
}: {
  x: number;
  y: number;
  size: number;
  text: string;
  fill?: string;
  anchor?: Anchor;
  drop?: number;
  outline?: number;
}) {
  const common: SVGProps<SVGTextElement> = {
    x,
    y: f1(y),
    textAnchor: anchor,
    fontFamily: FONT_DISPLAY,
    fontSize: size,
    stroke: CARD.stroke,
    strokeWidth: f1(size * outline),
    strokeLinejoin: 'round',
    paintOrder: 'stroke',
  };
  return (
    <>
      <text {...common} fill={CARD.stroke} transform={`translate(0 ${f1(size * drop)})`}>
        {text}
      </text>
      <text {...common} fill={fill}>
        {text}
      </text>
    </>
  );
}

// ---------------- the sky ----------------

function CloudArt({ cloud: c }: { cloud: Cloud }) {
  const sx = c.flip ? -c.s : c.s;
  return (
    <g transform={`translate(${f1(c.x)} ${f1(c.y)}) scale(${sx.toFixed(3)} ${c.s.toFixed(3)})`} fill="#fff" opacity={c.opacity.toFixed(2)}>
      {CLOUD_STAMPS[c.stamp].e.map(([cx, cy, rx, ry], i) => (
        <ellipse key={i} cx={cx} cy={cy} rx={rx} ry={ry} />
      ))}
    </g>
  );
}

// The gradient, the clouds (between the gradient and the glow) and the corner glow.
function Background({ id, clouds }: { id: string; clouds: Cloud[] }) {
  return (
    <>
      <defs>
        <linearGradient id={`${id}-sky`} x1="0" y1="0" x2=".35" y2="1">
          <stop offset="0" stopColor={CARD.skyTop} />
          <stop offset=".38" stopColor={CARD.skyMid} />
          <stop offset="1" stopColor={CARD.skyBottom} />
        </linearGradient>
        <radialGradient id={`${id}-glow`} cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(960 40) scale(520)">
          <stop offset="0" stopColor="#fff" stopOpacity=".38" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width={CARD_W} height={CARD_H} fill={`url(#${id}-sky)`} />
      <g data-part="sky">
        {clouds.map((c, i) => (
          <CloudArt key={i} cloud={c} />
        ))}
      </g>
      <rect width={CARD_W} height={CARD_H} fill={`url(#${id}-glow)`} />
    </>
  );
}

function Frame() {
  return (
    <>
      <rect x="22" y="22" width={CARD_W - 44} height={CARD_H - 44} rx="44" fill="none" stroke={CARD.frame} strokeWidth="10" />
      <rect x="36" y="36" width={CARD_W - 72} height={CARD_H - 72} rx="32" fill="none" stroke="#fff" strokeOpacity=".28" strokeWidth="3" />
    </>
  );
}

// ---------------- the top bar ----------------

// The Levl mark (the tile of docs/design/brand/build.js mark(), 120 x 120), ids `${id}b`, `c`, `t` and `r`.
function MarkArt({ id }: { id: string }) {
  const grad = (k: string, stops: [number, string][]) => (
    <linearGradient id={`${id}${k}`} x1="0" y1="0" x2="0" y2="1">
      {stops.map(([offset, color]) => (
        <stop key={offset} offset={offset} stopColor={color} />
      ))}
    </linearGradient>
  );
  const chevron = (y: number, g: string, opacity: number) => (
    <path d={`M34 ${y + 20} L60 ${y} L86 ${y + 20}`} fill="none" stroke={`url(#${id}${g})`} strokeOpacity={opacity} strokeWidth="11" strokeLinecap="round" strokeLinejoin="round" />
  );
  return (
    <>
      <defs>
        {grad('b', [[0, '#5FD24A'], [0.5, '#2BA438'], [1, '#1E8A2E']])}
        {grad('c', [[0, '#FFFFFF'], [1, '#F2FFE9']])}
        {grad('t', [[0, '#FFF2A6'], [1, '#FFC21A']])}
        {grad('r', [[0, '#FFF2A6'], [1, '#E0A316']])}
      </defs>
      <rect x="4" y="8" width="112" height="108" rx="30" fill="#186A20" />
      <rect x="4" y="4" width="112" height="108" rx="30" fill={`url(#${id}b)`} />
      <rect x="10.5" y="10.5" width="99" height="95" rx="24" fill="none" stroke={`url(#${id}r)`} strokeOpacity=".85" strokeWidth="1.5" />
      {chevron(28, 't', 1)}
      {chevron(48, 'c', 0.85)}
      {chevron(68, 'c', 0.5)}
    </>
  );
}

// The mark's face (y 4 to 112 of 120) is centred on cy, and so are the letters of "Levl" and the date.
function TopBar({ id, date }: { id: string; date: string }) {
  const cy = 92;
  return (
    <>
      <g transform={`translate(76 ${f1(cy - 58 * 0.58)}) scale(.58)`}>
        <MarkArt id={id} />
      </g>
      <GameText x={160} y={baseFor(cy, 50)} size={50} text="Levl" anchor="start" drop={0.07} outline={0.14} />
      <text x="1004" y={f1(baseFor(cy, 32))} textAnchor="end" fontFamily={FONT_BODY} fontWeight={700} fontSize="32" fill="#fff" fillOpacity=".94">
        {date}
      </text>
    </>
  );
}

// ---------------- plaques ----------------

// A cream plate with a tan lower edge and a white inner line.
function Plaque({ x, y, w, h, r = 30 }: { x: number; y: number; w: number; h: number; r?: number }) {
  return (
    <>
      <rect x={x} y={y + 8} width={w} height={h} rx={r} fill={CARD.bevel} />
      <rect x={x} y={y} width={w} height={h} rx={r} fill={CARD.cream} />
      <rect x={x + 3} y={y + 3} width={w - 6} height={h - 6} rx={r - 3} fill="none" stroke="#fff" strokeOpacity=".7" strokeWidth="3" />
    </>
  );
}

// A label over a value, the pair centred in the plaque. The value shrinks to fit.
function StatPlaque({ x, y, w, h, stat, cap }: { x: number; y: number; w: number; h: number; stat: ShareStat; cap: number }) {
  const size = Math.min(cap, Math.floor((w - 48) / textWidth(stat.value, 1)));
  const block = 26 * 0.71 + 22 + size * 0.71;
  const top = y + (h - block) / 2;
  return (
    <>
      <Plaque x={x} y={y} w={w} h={h} />
      <text x={x + w / 2} y={f1(top + 26 * 0.71)} textAnchor="middle" fontFamily={FONT_BODY} fontWeight={800} fontSize="26" letterSpacing="3" fill={CARD.muted}>
        {stat.label.toUpperCase()}
      </text>
      <text x={x + w / 2} y={f1(top + block)} textAnchor="middle" fontFamily={FONT_DISPLAY} fontSize={size} fill={CARD.ink}>
        {stat.value}
      </text>
    </>
  );
}

// Plaques side by side in a row.
function StatsRow({ x, y, w, h, stats }: { x: number; y: number; w: number; h: number; stats: ShareStat[] }) {
  const gap = 24;
  const pw = (w - gap * (stats.length - 1)) / stats.length;
  return (
    <>
      {stats.map((s, i) => (
        <StatPlaque key={s.key} x={x + i * (pw + gap)} y={y} w={pw} h={h} stat={s} cap={stats.length > 3 ? 58 : 70} />
      ))}
    </>
  );
}

// Plaques stacked top to bottom in y 360 to 1100.
function StatsColumn({ x, w, stats, cap }: { x: number; w: number; stats: ShareStat[]; cap: number }) {
  const gap = 26;
  const ph = (740 - gap * (stats.length - 1)) / stats.length;
  return (
    <>
      {stats.map((s, i) => (
        <StatPlaque key={s.key} x={x} y={360 + i * (ph + gap)} w={w} h={ph} stat={s} cap={cap} />
      ))}
    </>
  );
}

// ---------------- the middle of the card ----------------

function ChipRow({ x, y, w, chip }: { x: number; y: number; w: number; chip: MuscleChip }) {
  const h = 78;
  return (
    <>
      <rect x={x} y={y} width={w} height={h} rx={h / 2} fill={CARD.okSoft} />
      <circle cx={x + 40} cy={y + h / 2} r="13" fill={chip.main ? CARD.hi : CARD.sec} />
      <text x={x + 68} y={y + h / 2 + 13} fontFamily={FONT_DISPLAY} fontSize="38" fill={CARD.ink}>
        {chip.label}
      </text>
      <text x={x + w - 30} y={y + h / 2 + 11} textAnchor="end" fontFamily={FONT_BODY} fontWeight={700} fontSize="30" fill={CARD.muted}>
        {chip.setsLabel}
      </text>
    </>
  );
}

// Strength and mixed: the body and the top muscles on the left, the stats stacked on the right.
function BodyColumn({ muscles, stats }: { muscles: NonNullable<ShareCard['muscles']>; stats: ShareStat[] }) {
  const fillFor = (m: Muscle): string => (muscles.primary.includes(m) ? CARD.hi : muscles.secondary.includes(m) ? CARD.sec : CARD.muscle);
  const fw = 180; // one figure's width
  const gap = 22;
  const bx = 80 + (500 - (fw * 2 + gap)) / 2;
  const { chips, moreCount } = muscles;
  const shapes = (view: 'front' | 'back', x: number) => (
    <g transform={`translate(${x} 386) scale(${fw / 100})`}>
      <BodyShapes view={view} fillFor={fillFor} skin={CARD.skin} line={CARD.bodyline} />
    </g>
  );
  return (
    <>
      <Plaque x={80} y={360} w={500} h={740} r={36} />
      <g data-part="body">
        {shapes('front', bx)}
        {shapes('back', bx + fw + gap)}
      </g>
      {chips.map((c, i) => (
        <ChipRow key={c.muscle} x={106} y={772 + i * 88} w={448} chip={c} />
      ))}
      {moreCount > 0 && (
        <text x="330" y={772 + 3 * 88 + 36} textAnchor="middle" fontFamily={FONT_BODY} fontWeight={700} fontSize="30" fill={CARD.muted}>
          {`+${moreCount} more ${moreCount === 1 ? 'muscle' : 'muscles'}`}
        </text>
      )}
      <StatsColumn x={610} w={390} stats={stats} cap={stats.length > 3 ? 70 : 80} />
    </>
  );
}

// Cardio: the hero (the distance, or the time) in a big plaque, the rest in a row below.
// With no row the hero takes the whole height, and its text moves to stay centred.
function HeroPanel({ hero, stats }: { hero: ShareStat; stats: ShareStat[] }) {
  const bigH = stats.length > 0 ? 430 : 740;
  const mid = 360 + bigH / 2;
  const size = Math.min(200, Math.floor(820 / textWidth(hero.value, 1)));
  const rowY = 360 + bigH + 34;
  return (
    <>
      <Plaque x={80} y={360} w={920} h={bigH} r={36} />
      <text x="540" y={f1(mid - 135)} textAnchor="middle" fontFamily={FONT_BODY} fontWeight={800} fontSize="28" letterSpacing="3" fill={CARD.muted}>
        {hero.label.toUpperCase()}
      </text>
      <text x="540" y={f1(mid + 100)} textAnchor="middle" fontFamily={FONT_DISPLAY} fontSize={size} fill={CARD.ink}>
        {hero.value}
      </text>
      {stats.length > 0 && <StatsRow x={80} y={rowY} w={920} h={1100 - rowY} stats={stats} />}
    </>
  );
}

function Middle({ card }: { card: ShareCard }): ReactNode {
  if (card.muscles) return <BodyColumn muscles={card.muscles} stats={card.stats} />;
  if (card.hero) return <HeroPanel hero={card.hero} stats={card.stats} />;
  // No muscles and no hero (a strength workout of exercises with no muscle): the stats alone, wide.
  return <StatsColumn x={80} w={920} stats={card.stats} cap={card.stats.length > 3 ? 90 : 110} />;
}

// ---------------- the card ----------------

/**
 * The share card for a workout. `roll` picks the sky (the seed is `${card.seedBase}#${roll}`).
 * `idPrefix` starts every id in the SVG, so two cards on one page do not clash.
 */
export function ShareCardSvg({ card, roll, idPrefix = 'lvc', ref }: { card: ShareCard; roll: number; idPrefix?: string; ref?: Ref<SVGSVGElement> }) {
  const clouds = skyClouds(`${card.seedBase}#${roll}`, { width: CARD_W, height: CARD_H, count: 16, keepOut: [DATE_KEEP_OUT] });
  const shieldK = 1.12;
  return (
    <svg
      ref={ref}
      xmlns="http://www.w3.org/2000/svg"
      viewBox={`0 0 ${CARD_W} ${CARD_H}`}
      width={CARD_W}
      height={CARD_H}
      role="img"
      aria-label={`${card.fullTitle.trim() || 'Workout'} workout card`}
    >
      <Background id={idPrefix} clouds={clouds} />
      <Frame />
      <TopBar id={`${idPrefix}-m`} date={card.dateLabel} />
      <g transform={`translate(78 150) scale(${shieldK})`}>
        <RankShieldArt rank={card.rank} level={card.level} idPrefix={`${idPrefix}-s`} fontFamily={FONT_DISPLAY} />
      </g>
      <GameText x={236} y={baseFor(150 + 66 * shieldK, card.titleSize)} size={card.titleSize} text={card.title} anchor="start" />
      <g data-part="stats">
        <Middle card={card} />
      </g>
      <g data-part="xp">
        <GameText x={540} y={1236} size={132} text={`+${card.xp} XP`} fill={CARD.xp} />
      </g>
    </svg>
  );
}
