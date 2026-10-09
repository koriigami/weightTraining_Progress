// Frame-driven tweens for the 3D stage, ported from docs/design/12-motion/motion.js.
// `step` is called once per rendered frame; each tween calls fn(progress) with the
// eased 0..1 value and resolves when done. Reduced motion jumps to the end.
import { reducedMotion } from '@/lib/anim';
import { ease, spring, springMs, SPRINGS } from '@/lib/motion';
import type { Spring } from '@/lib/motion';

type Tween = { t0: number; ms: number; fn: (p: number) => void; ez: (t: number) => number; resolve: () => void };

export class Tweens {
  private list: Tween[] = [];

  add(ms: number, fn: (p: number) => void, ez: (t: number) => number = ease.outCubic, delay = 0): Promise<void> {
    return new Promise((resolve) => {
      this.list.push({ t0: performance.now() + delay, ms: reducedMotion() ? 1 : ms, fn, ez, resolve });
    });
  }

  /** A spring from 0 to 1 handed to `fn`. */
  spring(fn: (v: number) => void, s: Spring = SPRINGS.bouncy, delay = 0): Promise<void> {
    const ms = springMs(s);
    return this.add(ms, (p) => fn(spring((p * ms) / 1000, s)), ease.linear, delay);
  }

  step(now: number) {
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
