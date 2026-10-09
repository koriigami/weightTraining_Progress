'use client';

import { useEffect, useRef, useState } from 'react';
import { reducedMotion } from '@/lib/anim';

/**
 * Keeps something on screen for `ms` after it closes, so it can play an exit.
 * `mounted` is what to render; `closing` is true during the exit. Under reduced
 * motion there is no exit.
 */
export function usePresence(open: boolean, ms: number): { mounted: boolean; closing: boolean } {
  const [stay, setStay] = useState(open);
  if (open && !stay) setStay(true);

  useEffect(() => {
    if (open) return undefined;
    const t = setTimeout(() => setStay(false), reducedMotion() ? 0 : ms);
    return () => clearTimeout(t);
  }, [open, ms]);

  return { mounted: open || stay, closing: !open && stay };
}

/**
 * The value as it was while open, so what a sheet or modal showed stays on screen
 * during its exit even when its parent empties the content the moment it closes.
 */
export function useLastOpen<T>(open: boolean, value: T): T {
  const last = useRef(value);
  if (open) last.current = value;
  return open ? value : last.current;
}
