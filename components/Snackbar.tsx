'use client';

import { AnimatePresence, motion, useReducedMotion } from 'motion/react';

export type SnackbarState = { id: number; text: string; actionLabel?: string; onAction?: () => void } | null;

export function Snackbar({ snackbar, onDismiss }: { snackbar: SnackbarState; onDismiss: () => void }) {
  const reduceMotion = useReducedMotion();

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[60] flex justify-center px-3 pb-[calc(96px+env(safe-area-inset-bottom))] md:pb-6 md:pl-24">
      <AnimatePresence>
        {snackbar && (
          <motion.div
            key={snackbar.id}
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
