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
  const wasOpenRef = useRef(isOpen);

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

  // Pops a still-pending entry if `isOpen` itself transitions true -> false
  // (a Save/Remove handler closed via the raw prop instead of this hook's
  // `close()`, or a parent flipped its open state some other way), so it
  // never lingers as a dead entry that swallows the next Back press. This is
  // a SEPARATE effect, keyed on the isOpen value actually changing, rather
  // than living in the effect above's cleanup: that cleanup also runs for
  // React Strict Mode's dev-only mount->cleanup->mount dance and for a
  // caller that hardcodes isOpen=true for its whole lifetime (every
  // celebration overlay) -- in both of those cases isOpen never becomes
  // false, so popping there would fire a spurious history.back() that
  // dismisses the overlay before anyone ever saw it.
  useEffect(() => {
    const wasOpen = wasOpenRef.current;
    wasOpenRef.current = isOpen;
    if (wasOpen && !isOpen && pushedRef.current) {
      pushedRef.current = false;
      try {
        window.history.back();
      } catch {
        // ignore
      }
    }
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
