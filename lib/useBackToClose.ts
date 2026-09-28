'use client';

import { useEffect, useRef } from 'react';

// Makes the Android back button (and browser back) close an overlay instead of
// leaving the page. On open we push a history entry; back triggers popstate,
// which closes the overlay. When the overlay is closed by the UI itself (tap
// scrim, tap a button), we call history.back() so the pushed entry is
// consumed the same way, and the popstate handler is the single place that
// calls onClose. Never touches the URL.
export function useBackToClose(isOpen: boolean, onClose: () => void): () => void {
  const pushedRef = useRef(false);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!isOpen) return;
    // Guard against React Strict Mode's dev-only double-invoke of effects
    // (mount -> cleanup -> mount again, to catch missing cleanup). The
    // cleanup below only removes the popstate listener; it can't undo a
    // pushState. Without this guard, the second invoke would push a SECOND
    // history entry that nothing ever pops, so a later, unrelated
    // history.back() (from the next overlay in the celebration queue)
    // silently consumes that orphaned entry's popstate and fires this
    // overlay's oldest onClose a second time, closing the next overlay
    // before anyone ever saw it. Only push once per open.
    if (!pushedRef.current) {
      try {
        window.history.pushState({ overlay: true }, '');
        pushedRef.current = true;
      } catch {
        pushedRef.current = false;
      }
    }

    const onPopState = () => {
      pushedRef.current = false;
      onCloseRef.current();
    };
    window.addEventListener('popstate', onPopState);
    return () => {
      window.removeEventListener('popstate', onPopState);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  return () => {
    if (pushedRef.current) {
      pushedRef.current = false;
      try {
        window.history.back();
        return;
      } catch {
        // fall through to direct close
      }
    }
    onCloseRef.current();
  };
}
