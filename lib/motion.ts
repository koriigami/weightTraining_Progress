// The motion tokens (board 12): durations, easings and three springs, as code.
// Pure, so it runs anywhere. Springs are for things that land (a slam, a rise);
// everything else uses a duration and an easing.

/** Durations in ms. */
export const DUR = { press: 80, quick: 160, base: 240, slow: 400, reward: 700 } as const;

/** CSS easing curves. */
export const EASE = {
  out: 'cubic-bezier(.2,.8,.2,1)',
  in: 'cubic-bezier(.5,0,.75,0)',
  over: 'cubic-bezier(.2,1.6,.4,1)',
  wipe: 'cubic-bezier(.65,0,.35,1)',
} as const;

export type Spring = { k: number; c: number; m: number };

/** Stiffness, damping, mass. Bouncy is the slam; heavy is the rise. */
export const SPRINGS: { snappy: Spring; bouncy: Spring; heavy: Spring } = {
  snappy: { k: 400, c: 30, m: 1 },
  bouncy: { k: 190, c: 11, m: 0.7 },
  heavy: { k: 120, c: 14, m: 1.2 },
};

/** Position of a spring released from 0 towards 1, `t` seconds in. */
export function spring(t: number, { k, c, m }: Spring = SPRINGS.bouncy): number {
  const w0 = Math.sqrt(k / m);
  const z = c / (2 * Math.sqrt(k * m));
  if (z >= 1) return 1 - Math.exp(-w0 * t) * (1 + w0 * t);
  const wd = w0 * Math.sqrt(1 - z * z);
  return 1 - Math.exp(-z * w0 * t) * (Math.cos(wd * t) + ((z * w0) / wd) * Math.sin(wd * t));
}

/** How long a spring takes to settle within 0.5 percent, in ms. */
export function springMs(s: Spring = SPRINGS.bouncy): number {
  for (let t = 0.05; t < 3; t += 0.01) {
    let ok = true;
    for (let u = t; u < t + 0.3; u += 0.02) if (Math.abs(spring(u, s) - 1) > 0.005) ok = false;
    if (ok) return Math.round(t * 1000);
  }
  return 3000;
}

/**
 * Web Animations keyframes for a spring between two values of one property.
 * `make(v)` turns a number into the property's value, e.g. (v) => `scale(${v})`.
 */
export function springFrames(
  from: number,
  to: number,
  make: (v: number) => string,
  s: Spring = SPRINGS.bouncy,
  prop = 'transform'
): { frames: Record<string, string>[]; ms: number } {
  const ms = springMs(s);
  const n = Math.max(12, Math.round(ms / 16));
  const frames: Record<string, string>[] = [];
  for (let i = 0; i <= n; i++) {
    const p = spring((i / n) * (ms / 1000), s);
    frames.push({ [prop]: make(from + (to - from) * p) });
  }
  return { frames, ms };
}

/** Easing functions on 0..1, for frame-driven tweens. */
export const ease = {
  linear: (t: number) => t,
  outCubic: (t: number) => 1 - (1 - t) ** 3,
  inCubic: (t: number) => t ** 3,
  inQuad: (t: number) => t * t,
  outBack: (t: number, s = 1.7) => 1 + (s + 1) * (t - 1) ** 3 + s * (t - 1) ** 2,
  inOut: (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2),
};
