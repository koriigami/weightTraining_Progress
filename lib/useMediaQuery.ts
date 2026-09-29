'use client';

import { useCallback, useSyncExternalStore } from 'react';

// A CSS media query as a boolean. It reads the real viewport on the first client
// render (the pages that use it only mount after the app has loaded, so there is
// no server markup to match) and follows changes.
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const mql = window.matchMedia(query);
      mql.addEventListener('change', onChange);
      return () => mql.removeEventListener('change', onChange);
    },
    [query]
  );
  const getSnapshot = useCallback(() => window.matchMedia(query).matches, [query]);
  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}

// The side column layout (library panel and Summary next to the list) starts here.
export const WIDE_QUERY = '(min-width: 1100px)';

/** True when the screen is wide enough for the library panel beside the list. */
export function useWideLayout(): boolean {
  return useMediaQuery(WIDE_QUERY);
}

/** True from the tablet breakpoint up, where the sidebar shows and the tab bar hides. */
export function useDesktopLayout(): boolean {
  return useMediaQuery('(min-width: 768px)');
}
