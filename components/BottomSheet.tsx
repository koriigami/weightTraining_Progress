'use client';

import { useEffect, useRef } from 'react';
import { ArrowLeft, X } from 'lucide-react';
import { AnimatePresence, motion, useDragControls, useReducedMotion, type PanInfo } from 'motion/react';
import { useBackToClose } from '@/lib/useBackToClose';
import { useIsDesktop } from '@/lib/useIsDesktop';

export type SheetCta = { label: string; onClick: () => void; disabled?: boolean };

const FOCUSABLE = 'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function BottomSheet({
  open,
  onClose,
  ariaLabel,
  title,
  fixed,
  onBack,
  cta,
  footerNote,
  desktopWidth = 'md',
  closeRef,
  children,
}: {
  open: boolean;
  onClose: () => void;
  ariaLabel: string;
  title?: string;
  fixed?: boolean;
  onBack?: () => void;
  cta?: SheetCta;
  /** Rendered above the pinned CTA button (e.g. a live reward preview or an inline save error). */
  footerNote?: React.ReactNode;
  /** Max width of the centered desktop dialog. The goal sheet uses 'lg'. */
  desktopWidth?: 'md' | 'lg';
  /**
   * Filled in with this sheet's history-aware close function on every
   * render. Save/Remove handlers should call `closeRef.current()` instead of
   * the raw `onClose` prop, so closing also pops the history entry this
   * sheet pushed (otherwise one Back press after Save does nothing).
   */
  closeRef?: React.MutableRefObject<() => void>;
  children: React.ReactNode;
}) {
  const close = useBackToClose(open, onClose);
  const reduceMotion = useReducedMotion();
  const dragControls = useDragControls();
  const isDesktop = useIsDesktop();
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const openerRef = useRef<Element | null>(null);

  useEffect(() => {
    if (closeRef) closeRef.current = close;
  });

  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  // Focus management: move focus into the dialog on open, return it to
  // whatever opened the dialog on close.
  useEffect(() => {
    if (open) {
      openerRef.current = document.activeElement;
      const id = requestAnimationFrame(() => {
        dialogRef.current?.focus();
      });
      return () => cancelAnimationFrame(id);
    }
    const opener = openerRef.current;
    if (opener instanceof HTMLElement) opener.focus();
    return undefined;
  }, [open]);

  // Escape closes; Tab is trapped inside the dialog.
  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.stopPropagation();
        close();
        return;
      }
      if (e.key === 'Tab') {
        const container = dialogRef.current;
        if (!container) return;
        const focusables = Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE));
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }
    document.addEventListener('keydown', onKeyDown, true);
    return () => document.removeEventListener('keydown', onKeyDown, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, close]);

  function onDragEnd(_: unknown, info: PanInfo) {
    if (info.offset.y > 90 || info.velocity.y > 600) close();
  }

  function startDrag(e: React.PointerEvent) {
    if ((e.target as HTMLElement).closest('button')) return;
    dragControls.start(e);
  }

  const desktopMaxWidthClass = desktopWidth === 'lg' ? 'md:max-w-lg' : 'md:max-w-md';

  const header = title && (
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
      <h2 className="flex-1 text-xl font-semibold" style={{ color: 'var(--ink)' }}>
        {title}
      </h2>
      {isDesktop && (
        <button
          onClick={close}
          aria-label="Close"
          className="-mr-2 flex h-11 w-11 items-center justify-center rounded-full active:bg-[var(--surface-2)]"
          style={{ color: 'var(--muted)' }}
        >
          <X size={20} />
        </button>
      )}
    </div>
  );

  const footer = (cta || footerNote) && (
    <div
      className="shrink-0 border-t px-4 pt-3"
      style={{ borderColor: 'var(--line)', background: 'var(--surface)', paddingBottom: isDesktop ? 16 : 'max(16px, env(safe-area-inset-bottom))' }}
    >
      {footerNote}
      {cta && (
        <button
          onClick={cta.onClick}
          disabled={cta.disabled}
          className="min-h-12 w-full rounded-full text-sm font-semibold text-[#3B2600] shadow-[0_3px_0_#9A6300] transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-45 disabled:shadow-none"
          style={{ background: 'linear-gradient(180deg,#FFD66B,#E09A12)' }}
        >
          {cta.label}
        </button>
      )}
    </div>
  );

  if (isDesktop) {
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
              transition={{ duration: reduceMotion ? 0 : 0.18 }}
              onClick={close}
            />
            <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center p-4">
              <motion.div
                key="dialog"
                ref={dialogRef}
                tabIndex={-1}
                role="dialog"
                aria-modal="true"
                aria-label={ariaLabel}
                className={`pointer-events-auto flex w-full ${desktopMaxWidthClass} flex-col overflow-hidden rounded-[28px] shadow-2xl focus:outline-none`}
                style={{
                  background: 'var(--surface)',
                  maxHeight: '85vh',
                  height: fixed ? 'min(640px, 85vh)' : undefined,
                }}
                initial={{ opacity: 0, scale: reduceMotion ? 1 : 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: reduceMotion ? 1 : 0.96 }}
                transition={{ duration: reduceMotion ? 0 : 0.2 }}
              >
                {header && <div className="shrink-0 px-5 pt-4">{header}</div>}
                <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-4 pt-1">{children}</div>
                {footer}
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>
    );
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
            ref={dialogRef}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-label={ariaLabel}
            className="fixed inset-x-0 bottom-0 z-50 mx-auto flex w-full max-w-lg flex-col overflow-hidden rounded-t-3xl shadow-2xl focus:outline-none"
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
              {header}
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">{children}</div>
            {footer}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
