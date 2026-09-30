import type { ReactNode } from 'react';
import type { Muscle } from '@/data/exercises';
import { cn } from './cn';

// Our own simple front and back body, ported from the design board. Shapes are
// drawn for the left half and mirrored, plus a few centre shapes. A shape with
// a muscle name lights up when that muscle is main or secondary.
// e = ellipse (cx cy rx ry), c = circle (cx cy r), r = rect (x y w h rx),
// p = path (d).
type Raw = readonly [Muscle | null, 'e' | 'c' | 'r' | 'p', ...(number | string)[]];
type View = { base: string; left: Raw[]; center: Raw[] };

const BODY: Record<'front' | 'back', View> = {
  front: {
    base: 'M31 34 Q50 28 69 34 L66 86 Q50 94 34 86 Z',
    left: [
      ['shoulders', 'e', 29, 43, 8, 7.5],
      ['chest', 'r', 35, 36, 14, 15, 5],
      ['biceps', 'e', 24, 60, 5, 10.5],
      ['forearms', 'e', 20.5, 83, 4.3, 11.5],
      [null, 'c', 19, 100, 4],
      ['obliques', 'r', 34.5, 54, 5.5, 27, 2.75],
      ['quads', 'r', 35.5, 96, 13, 46, 6.5],
      [null, 'c', 42, 147, 4.5],
      ['calves', 'r', 37.5, 154, 9, 34, 4.5],
      [null, 'e', 41, 193, 5.5, 3],
    ],
    center: [
      [null, 'c', 50, 15, 10],
      [null, 'r', 45.5, 25, 9, 8, 3],
      ['abs', 'r', 41.5, 54, 8, 8.5, 2.5],
      ['abs', 'r', 50.5, 54, 8, 8.5, 2.5],
      ['abs', 'r', 41.5, 64, 8, 8.5, 2.5],
      ['abs', 'r', 50.5, 64, 8, 8.5, 2.5],
      ['abs', 'r', 41.5, 74, 8, 9, 2.5],
      ['abs', 'r', 50.5, 74, 8, 9, 2.5],
      [null, 'r', 37, 85, 26, 9, 4],
    ],
  },
  back: {
    base: 'M31 34 Q50 28 69 34 L66 86 Q50 94 34 86 Z',
    left: [
      ['shoulders', 'e', 29, 43, 8, 7.5],
      ['upperback', 'r', 40, 45, 9, 13, 3],
      ['lats', 'p', 'M33.5 48 L39 48 L42.5 60 L42.5 82 L39.5 82 Q30 66 33.5 48 Z'],
      ['triceps', 'e', 24, 60, 5, 10.5],
      ['forearms', 'e', 20.5, 83, 4.3, 11.5],
      [null, 'c', 19, 100, 4],
      ['glutes', 'r', 36, 86, 13.5, 17, 7],
      ['hamstrings', 'r', 35.5, 105, 13, 38, 6.5],
      [null, 'c', 42, 147, 4.5],
      ['calves', 'e', 41.5, 165, 6, 14],
      [null, 'r', 38.5, 178, 6, 10, 3],
      [null, 'e', 41, 193, 5.5, 3],
    ],
    center: [
      [null, 'c', 50, 15, 10],
      [null, 'r', 45.5, 25, 9, 8, 3],
      ['traps', 'p', 'M42 28 H58 L70 39 L58 44 L50 51 L42 44 L30 39 Z'],
      ['lowerback', 'r', 44, 62, 12, 22, 4],
    ],
  },
};

function shape(s: Raw, fill: string, key: string, stroke: string, strokeWidth: number): ReactNode {
  const [, t, ...a] = s;
  const common = { fill, stroke, strokeWidth };
  if (t === 'e') return <ellipse key={key} cx={a[0] as number} cy={a[1] as number} rx={a[2] as number} ry={a[3] as number} {...common} />;
  if (t === 'c') return <circle key={key} cx={a[0] as number} cy={a[1] as number} r={a[2] as number} {...common} />;
  if (t === 'r') return <rect key={key} x={a[0] as number} y={a[1] as number} width={a[2] as number} height={a[3] as number} rx={a[4] as number} {...common} />;
  return <path key={key} d={a[0] as string} {...common} />;
}

export type MuscleFill = (muscle: Muscle) => string;

/**
 * The shapes of one body view as a `<g>` on a 100 x 200 canvas. The defaults are
 * the app's CSS variables; the share card passes literal colours, because an SVG
 * drawn to an image cannot read them.
 */
export function BodyShapes({
  view,
  fillFor,
  skin = 'var(--skin)',
  line = 'var(--bodyline, var(--surface))',
  strokeWidth = 1.2,
}: {
  view: 'front' | 'back';
  fillFor: MuscleFill;
  skin?: string;
  line?: string;
  strokeWidth?: number;
}) {
  const b = BODY[view];
  const fill = (s: Raw) => (s[0] ? fillFor(s[0]) : skin);
  return (
    <g>
      <path d={b.base} fill={skin} />
      {b.left.map((s, i) => shape(s, fill(s), `l${i}`, line, strokeWidth))}
      <g transform="matrix(-1 0 0 1 100 0)">{b.left.map((s, i) => shape(s, fill(s), `r${i}`, line, strokeWidth))}</g>
      {b.center.map((s, i) => shape(s, fill(s), `c${i}`, line, strokeWidth))}
    </g>
  );
}

/** One body view as an SVG. `fillFor` picks the colour per muscle. */
export function BodySvg({
  view,
  fillFor,
  viewBox = '0 0 100 200',
  width = 100,
  height = 200,
  label,
}: {
  view: 'front' | 'back';
  fillFor: MuscleFill;
  viewBox?: string;
  width?: number;
  height?: number;
  label?: string;
}) {
  return (
    <svg viewBox={viewBox} width={width} height={height} role={label ? 'img' : undefined} aria-label={label} aria-hidden={label ? undefined : true}>
      <BodyShapes view={view} fillFor={fillFor} />
    </svg>
  );
}

/** Colours for main and secondary muscles (the `--hi` and `--sec` tokens). */
export function highlightFill(primary: readonly Muscle[], secondary: readonly Muscle[]): MuscleFill {
  return (m) => (primary.includes(m) ? 'var(--hi)' : secondary.includes(m) ? 'var(--sec)' : 'var(--muscle)');
}

/**
 * Front and back body with main muscles in green and secondary muscles light
 * green. `size` is the width of one figure.
 */
export function MuscleMap({
  primary = [],
  secondary = [],
  size = 96,
  legend = true,
  className,
}: {
  primary?: readonly Muscle[];
  secondary?: readonly Muscle[];
  size?: number;
  legend?: boolean;
  className?: string;
}) {
  const fill = highlightFill(primary, secondary);
  return (
    <div className={className}>
      <div className="wt-maps">
        <BodySvg view="front" fillFor={fill} width={size} height={size * 2} label="Front muscles" />
        <BodySvg view="back" fillFor={fill} width={size} height={size * 2} label="Back muscles" />
      </div>
      {legend && (
        <div className={cn('wt-legend')}>
          <span>
            <i style={{ background: 'var(--hi)' }} />
            Main
          </span>
          <span>
            <i style={{ background: 'var(--sec)' }} />
            Also works
          </span>
        </div>
      )}
    </div>
  );
}
