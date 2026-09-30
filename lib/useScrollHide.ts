'use client';

import { useEffect, useState } from 'react';
import { nextHidden } from './scrollHide';

/** True while the page is scrolled down and the title row should be tucked away. Follows the window (the phone layout). */
export function useScrollHide(enabled: boolean): boolean {
  const [hidden, setHidden] = useState(false);
  useEffect(() => {
    if (!enabled) {
      setHidden(false);
      return;
    }
    let last = window.scrollY;
    let cur = false;
    const onScroll = () => {
      const y = window.scrollY;
      const next = nextHidden(cur, last, y);
      last = y;
      if (next !== cur) {
        cur = next;
        setHidden(next);
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [enabled]);
  return hidden;
}
