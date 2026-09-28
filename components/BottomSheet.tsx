'use client';

import { useEffect } from 'react';
import { ArrowLeft } from 'lucide-react';
import { AnimatePresence, motion, useDragControls, useReducedMotion, type PanInfo } from 'motion/react';
import { useBackToClose } from '@/lib/useBackToClose';

export type SheetCta = { label: string; onClick: () => void; disabled?: boolean };

export function BottomSheet({
  open,
  onClose,
  ariaLabel,
  title,
  fixed,
  onBack,
  cta,
  children,
}: {
  open: boolean;
  onClose: () => void;
  ariaLabel: string;
  title?: string;
  fixed?: boolean;
  onBack?: () => void;
  cta?: SheetCta;
  children: React.ReactNode;
}) {
  const close = useBackToClose(open, onClose);
  const reduceMotion = useReducedMotion();
  const dragControls = useDragControls();

  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  function onDragEnd(_: unknown, info: PanInfo) {
    if (info.offset.y > 90 || info.velocity.y > 600) close();
  }

  function startDrag(e: React.PointerEvent) {
    if ((e.target as HTMLElement).closest('button')) return;
    dragControls.start(e);
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="scrim"
            className="fixed inset-0 z-40 bg-black/50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.22 }}
            onClick={close}
          />
          <motion.div
            key="sheet"
            role="dialog"
            aria-modal="true"
            aria-label={ariaLabel}
            className="fixed inset-x-0 bottom-0 z-50 mx-auto flex w-full max-w-lg flex-col overflow-hidden rounded-t-3xl shadow-2xl"
            style={{
              background: 'var(--surface)',
              height: fixed ? 'min(640px, 88dvh)' : undefined,
              maxHeight: '88dvh',
            }}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={reduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 320, damping: 34 }}
            drag="y"
            dragListener={false}
            dragControls={dragControls}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.6 }}
            onDragEnd={onDragEnd}
          >
            <div className="shrink-0 px-4 pb-1 pt-2" onPointerDown={startDrag} style={{ touchAction: 'none' }}>
              <div className="mx-auto mb-3 h-1 w-8 rounded-full" style={{ background: 'var(--line)' }} />
              {title && (
                <div className="flex min-h-12 items-center gap-1">
                  {onBack && (
                    <button
                      onClick={onBack}
                      aria-label="Back"
                      className="-ml-3 flex h-12 w-12 items-center justify-center rounded-full active:bg-[var(--surface-2)]"
                      style={{ color: 'var(--ink)' }}
                    >
                      <ArrowLeft size={22} />
                    </button>
                  )}
                  <h2 className="text-xl font-semibold" style={{ color: 'var(--ink)' }}>
                    {title}
                  </h2>
                </div>
              )}
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">{children}</div>
            {cta && (
              <div
                className="shrink-0 border-t px-4 pt-3"
                style={{ borderColor: 'var(--line)', background: 'var(--surface)', paddingBottom: 'max(16px, env(safe-area-inset-bottom))' }}
              >
                <button
                  onClick={cta.onClick}
                  disabled={cta.disabled}
                  className="min-h-12 w-full rounded-full text-sm font-semibold text-[#3B2600] shadow-[0_3px_0_#9A6300] transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-45 disabled:shadow-none"
                  style={{ background: 'linear-gradient(180deg,#FFD66B,#E09A12)' }}
                >
                  {cta.label}
                </button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
