'use client';

import { useEffect } from 'react';

// Holds a screen wake lock while `active`. The browser drops the lock when the
// tab is hidden, so it is asked for again when the tab comes back. Browsers
// without the API, and refusals, are ignored: the screen just sleeps as usual.
export function useWakeLock(active: boolean): void {
  useEffect(() => {
    if (!active || typeof navigator === 'undefined' || !('wakeLock' in navigator)) return undefined;
    let lock: WakeLockSentinel | null = null;
    let cancelled = false;

    async function request() {
      if (document.visibilityState !== 'visible' || lock) return;
      try {
        const got = await navigator.wakeLock.request('screen');
        if (cancelled) {
          void got.release().catch(() => undefined);
          return;
        }
        lock = got;
        got.addEventListener('release', () => {
          if (lock === got) lock = null;
        });
      } catch {
        // Denied or unsupported right now. Nothing to do.
      }
    }

    void request();
    const onVisible = () => void request();
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisible);
      const held = lock;
      lock = null;
      if (held) void held.release().catch(() => undefined);
    };
  }, [active]);
}
