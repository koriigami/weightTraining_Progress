'use client';

import { useEffect, useState } from 'react';
import { todayStr } from './date';

// A few seconds of slack past midnight so the timer never fires early from
// clock jitter.
function msUntilNextMidnight(): number {
  const now = new Date();
  const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 3, 0);
  return next.getTime() - now.getTime();
}

// Today's date string, re-read whenever it might have changed: the tab comes
// back into view, the window regains focus, or local midnight actually
// arrives while the tab is open. Without this, "today" is computed once at
// mount and every gate built on it (can this day still be edited, has this
// goal's deadline passed) stays stuck on yesterday until a full reload.
export function useToday(): string {
  const [today, setToday] = useState(() => todayStr());

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;

    function refresh() {
      setToday(todayStr());
    }

    function scheduleMidnight() {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        refresh();
        scheduleMidnight();
      }, msUntilNextMidnight());
    }

    function onVisibility() {
      if (document.visibilityState === 'visible') refresh();
    }

    scheduleMidnight();
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('focus', refresh);

    return () => {
      if (timer) clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('focus', refresh);
    };
  }, []);

  return today;
}
