'use client';

import { useEffect, useRef } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';

export type SnackbarState = { id: number; text: string; actionLabel?: string; onAction?: () => void } | null;

// M3 recommends 4-10s; 4s plain, 6s when there's an action to read and tap.
const BASE_MS = 4000;
const ACTION_MS = 6000;

export function Snackbar({ snackbar, onDismiss }: { snackbar: SnackbarState; onDismiss: () => void }) {
  const reduceMotion = useReducedMotion();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const remainingRef = useRef(0);
  const startedAtRef = useRef(0);
  const pausedRef = useRef(false);

  function clearTimer() {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }

  function schedule(ms: number) {
    clearTimer();
    startedAtRef.current = Date.now();
    remainingRef.current = ms;
    timerRef.current = setTimeout(onDismiss, ms);
  }

  // A new snackbar (or the same one replaced by a newer id) restarts the timer.
  useEffect(() => {
    if (!snackbar) {
      clearTimer();
      return undefined;
    }
    pausedRef.current = false;
    schedule(snackbar.actionLabel ? ACTION_MS : BASE_MS);
    return clearTimer;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [snackbar?.id]);

  function pause() {
    if (!snackbar || pausedRef.current || !timerRef.current) return;
    pausedRef.current = true;
    const elapsed = Date.now() - startedAtRef.current;
    remainingRef.current = Math.max(0, remainingRef.current - elapsed);
    clearTimer();
  }

  function resume() {
    if (!snackbar || !pausedRef.current) return;
    pausedRef.current = false;
    schedule(remainingRef.current);
  }

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[60] flex justify-center px-3 pb-[calc(96px+env(safe-area-inset-bottom))] md:pb-6 md:pl-24">
      <AnimatePresence>
        {snackbar && (
          <motion.div
            key={snackbar.id}
            role="status"
            onMouseEnter={pause}
            onMouseLeave={resume}
            onFocus={pause}
            onBlur={resume}
            initial={{ opacity: 0, y: reduceMotion ? 0 : 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: reduceMotion ? 0 : 16 }}
            transition={{ duration: reduceMotion ? 0 : 0.2 }}
            className="pointer-events-auto flex w-full max-w-sm items-center justify-between gap-4 rounded-lg bg-[#2B2F45] px-4 py-3 text-sm text-white shadow-lg"
          >
            <span>{snackbar.text}</span>
            {snackbar.actionLabel && (
              <button
                onClick={() => {
                  snackbar.onAction?.();
                  onDismiss();
                }}
                className="min-h-9 shrink-0 font-bold text-[#FFD66B]"
              >
                {snackbar.actionLabel}
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
