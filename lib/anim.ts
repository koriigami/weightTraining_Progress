// Web Animations helpers for the board 12 interactions. Client only: every call
// is a no-op on the server. Reduced motion shows end states, so nothing here
// animates then; the element already has its final style.
import { SPRINGS, springFrames } from './motion';
import type { Spring } from './motion';

export function reducedMotion(): boolean {
  return typeof window !== 'undefined' && Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
}

/** Animates an element and resolves when done (also when it is cancelled). Does nothing under reduced motion. */
export function anim(el: Element | null | undefined, frames: Keyframe[], opts: KeyframeAnimationOptions): Promise<void> {
  if (!el || typeof el.animate !== 'function' || reducedMotion()) return Promise.resolve();
  try {
    return el.animate(frames, opts).finished.then(
      () => undefined,
      () => undefined
    );
  } catch {
    return Promise.resolve();
  }
}

/** A property that settles with a spring, e.g. springTo(el, 1.35, 1, (v) => `scale(${v})`). The element ends in its normal style. */
export function springTo(el: Element | null | undefined, from: number, to: number, make: (v: number) => string, s: Spring = SPRINGS.bouncy, prop = 'transform', opts: KeyframeAnimationOptions = {}): Promise<void> {
  if (!el || reducedMotion()) return Promise.resolve();
  const { frames, ms } = springFrames(from, to, make, s, prop);
  return anim(el, frames, { duration: ms, easing: 'linear', ...opts });
}

export const wait = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));
