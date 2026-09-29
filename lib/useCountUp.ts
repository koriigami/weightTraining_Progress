'use client';

import { useEffect, useState } from 'react';

// A number that rolls from 0 to `target` after `delay` ms, over `duration` ms. It
// jumps straight to the target when the person prefers reduced motion. When the
// target changes later, it rolls from where it is.
export function useCountUp(target: number, opts: { delay?: number; duration?: number } = {}): number {
  const { delay = 900, duration = 700 } = opts;
  const [value, setValue] = useState(0);
  const [first, setFirst] = useState(true);

  useEffect(() => {
    const reduce = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduce) {
      setValue(target);
      setFirst(false);
      return undefined;
    }
    let raf = 0;
    const from = first ? 0 : value;
    const wait = first ? delay : 0;
    const t0 = performance.now() + wait;
    const step = (now: number) => {
      const k = Math.min(1, Math.max(0, (now - t0) / duration));
      setValue(Math.round(from + (target - from) * k));
      if (k < 1) raf = requestAnimationFrame(step);
      else setFirst(false);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
    // The roll restarts only when the target changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);

  return value;
}
