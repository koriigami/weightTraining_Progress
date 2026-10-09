'use client';

import { useEffect, useRef } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { isErrorToast } from '@/lib/interactions';
import { SPRINGS } from '@/lib/motion';
import { buzz, play } from '@/lib/sound';

export type ToastState = { id: number; text: string; actionLabel?: string; onAction?: () => void } | null;

// 4s plain, 6s when there is an action (such as Undo) to read and tap.
const BASE_MS = 4000;
const ACTION_MS = 6000;

/**
 * The dark wood pill toast. One toast at a time: a newer id replaces the
 * current one and restarts the timer, and hovering or focusing it pauses the
 * timer. It rises 60 px with a bounce and sinks 20 px as it fades. Good news gets
 * the quiet chime; a message that says something went wrong shakes once sideways
 * and gets the error sound.
 */
export function Toast({ toast, onDismiss }: { toast: ToastState; onDismiss: () => void }) {
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

  useEffect(() => {
    if (!toast) {
      clearTimer();
      return undefined;
    }
    const bad = isErrorToast(toast.text);
    play(bad ? 'error' : 'chime');
    buzz(bad ? 'error' : 'success');
    pausedRef.current = false;
    schedule(toast.actionLabel ? ACTION_MS : BASE_MS);
    return clearTimer;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toast?.id]);

  function pause() {
    if (!toast || pausedRef.current || !timerRef.current) return;
    pausedRef.current = true;
    remainingRef.current = Math.max(0, remainingRef.current - (Date.now() - startedAtRef.current));
    clearTimer();
  }

  function resume() {
    if (!toast || !pausedRef.current) return;
    pausedRef.current = false;
    schedule(remainingRef.current);
  }

  const bad = toast ? isErrorToast(toast.text) : false;
  return (
    <div className="wt-toast-wrap">
      <AnimatePresence>
        {toast && (
          <motion.div
            key={toast.id}
            role="status"
            className={bad ? 'wt-toast bad' : 'wt-toast'}
            onMouseEnter={pause}
            onMouseLeave={resume}
            onFocus={pause}
            onBlur={resume}
            initial={{ opacity: 0, y: reduceMotion ? 0 : 60 }}
            animate={{ opacity: 1, y: 0, x: bad && !reduceMotion ? [0, -8, 8, 0] : 0 }}
            exit={{ opacity: 0, y: reduceMotion ? 0 : 20, transition: { duration: reduceMotion ? 0 : 0.2, ease: [0.5, 0, 0.75, 0] } }}
            transition={
              reduceMotion
                ? { duration: 0 }
                : { y: { type: 'spring', stiffness: SPRINGS.bouncy.k, damping: SPRINGS.bouncy.c, mass: SPRINGS.bouncy.m }, opacity: { duration: 0.12 }, x: { delay: 0.3, duration: 0.26, ease: 'linear' } }
            }
          >
            <span>{toast.text}</span>
            {toast.actionLabel && (
              <button
                type="button"
                onClick={() => {
                  toast.onAction?.();
                  onDismiss();
                }}
              >
                {toast.actionLabel}
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
