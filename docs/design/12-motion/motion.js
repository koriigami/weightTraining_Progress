// Board 12: the motion tokens as code. Durations, easings and three springs,
// shared by every demo on the board (and, after sign-off, by the app).

export const DUR = { press: 80, quick: 160, base: 240, slow: 400, reward: 700 };

export const EASE = {
  out: 'cubic-bezier(.2,.8,.2,1)',
  in: 'cubic-bezier(.5,0,.75,0)',
  over: 'cubic-bezier(.2,1.6,.4,1)',
  wipe: 'cubic-bezier(.65,0,.35,1)',
};

// stiffness, damping, mass. Bouncy is board 11's slam; heavy is its rise.
export const SPRINGS = {
  snappy: { k: 400, c: 30, m: 1 },
  bouncy: { k: 190, c: 11, m: 0.7 },
  heavy: { k: 120, c: 14, m: 1.2 },
};

// Position of a spring released from 0 towards 1, at time t seconds.
export function spring(t, { k, c, m } = SPRINGS.bouncy) {
  const w0 = Math.sqrt(k / m);
  const z = c / (2 * Math.sqrt(k * m));
  if (z >= 1) return 1 - Math.exp(-w0 * t) * (1 + w0 * t);
  const wd = w0 * Math.sqrt(1 - z * z);
  return 1 - Math.exp(-z * w0 * t) * (Math.cos(wd * t) + ((z * w0) / wd) * Math.sin(wd * t));
}

// How long a spring takes to settle within 0.5 percent, in ms.
export function springMs(s = SPRINGS.bouncy) {
  for (let t = 0.05; t < 3; t += 0.01) {
    let ok = true;
    for (let u = t; u < t + 0.3; u += 0.02) if (Math.abs(spring(u, s) - 1) > 0.005) ok = false;
    if (ok) return Math.round(t * 1000);
  }
  return 3000;
}

// Web Animations keyframes for a spring between two values of one property.
// make(v) turns a number into the property's value, e.g. (v) => `scale(${v})`.
export function springFrames(from, to, make, s = SPRINGS.bouncy, prop = 'transform') {
  const ms = springMs(s);
  const n = Math.max(12, Math.round(ms / 16));
  const frames = [];
  for (let i = 0; i <= n; i++) {
    const p = spring((i / n) * (ms / 1000), s);
    frames.push({ [prop]: make(from + (to - from) * p) });
  }
  return { frames, ms };
}

export const ease = {
  linear: (t) => t,
  outCubic: (t) => 1 - (1 - t) ** 3,
  inCubic: (t) => t ** 3,
  inQuad: (t) => t * t,
  outBack: (t, s = 1.7) => 1 + (s + 1) * (t - 1) ** 3 + s * (t - 1) ** 2,
  inOut: (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2),
};

export const reduced = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches || document.documentElement.dataset.reduced === '1';

export const wait = (ms) => new Promise((r) => setTimeout(r, reduced() ? Math.min(ms, 60) : ms));

// A tiny frame-driven tween runner for canvas and three.js scenes.
export class Tweens {
  constructor() {
    this.list = [];
  }
  // fn(p) is called with progress 0..1 (eased); resolves when done
  add(ms, fn, ez = ease.outCubic, delay = 0) {
    return new Promise((resolve) => {
      this.list.push({ t0: performance.now() + delay, ms: reduced() ? 1 : ms, fn, ez, resolve });
    });
  }
  // a spring from 0 to 1 handed to fn
  spring(fn, s = SPRINGS.bouncy, delay = 0) {
    const ms = springMs(s);
    return this.add(ms, (p) => fn(spring((p * ms) / 1000, s)), ease.linear, delay);
  }
  step(now) {
    this.list = this.list.filter((tw) => {
      if (now < tw.t0) return true;
      const p = Math.min(1, (now - tw.t0) / tw.ms);
      tw.fn(tw.ez(p));
      if (p >= 1) {
        tw.resolve();
        return false;
      }
      return true;
    });
  }
  clear() {
    this.list.forEach((t) => t.resolve());
    this.list = [];
  }
}
