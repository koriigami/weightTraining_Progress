'use client';

import Link from 'next/link';
import { createContext, useCallback, useContext, useEffect, useId, useLayoutEffect, useMemo, useRef } from 'react';
import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { anim, springTo } from '@/lib/anim';
import { DUR, EASE, SPRINGS } from '@/lib/motion';
import { play } from '@/lib/sound';
import { useBackToClose } from '@/lib/useBackToClose';
import { cn } from './cn';
import { useDialog } from './useDialog';
import { useLastOpen, usePresence } from './usePresence';

/** How long a sheet takes to leave: 200 ms down and away (a fade on the desktop dialog). */
export const SHEET_EXIT_MS = 200;

type SheetControls = {
  /** Closes the sheet the way Back would, so the history entry it pushed is consumed. */
  close: () => void;
  /**
   * Closes the sheet, then runs fn once the history entry is gone. Use it for
   * actions that navigate: navigating first would leave the sheet's history
   * entry between the old page and the new one.
   */
  closeThen: (fn: () => void) => void;
};

const SheetContext = createContext<SheetControls | null>(null);

/** Close controls for content rendered inside a Sheet. */
export function useSheet(): SheetControls {
  const ctx = useContext(SheetContext);
  if (!ctx) throw new Error('useSheet must be used inside a Sheet');
  return ctx;
}

/**
 * A bottom sheet on the phone (pickers and menus) and a centered dialog on
 * desktop. Back and Esc close it, focus is trapped and restored, and tapping the
 * scrim closes it. For destructive confirms use GameModal instead. It rises with
 * a snappy spring and a soft lift sound, and leaves with a real exit and the low puff.
 */
export function Sheet(props: {
  open: boolean;
  onClose: () => void;
  title?: string;
  /** Required when there is no visible title. */
  ariaLabel?: string;
  description?: ReactNode;
  /** A pinned footer, e.g. Clear and Show 12 exercises. */
  footer?: ReactNode;
  /** Extra class on the sheet itself, e.g. to make the desktop dialog wider. */
  className?: string;
  children: ReactNode;
}) {
  const { open, onClose, className } = props;
  // What the sheet showed stays on screen while it leaves, even if the parent empties it on close.
  const { title, ariaLabel, description, footer, children } = useLastOpen(open, props);
  const ref = useRef<HTMLDivElement>(null);
  const uid = useId();
  const pending = useRef<(() => void) | null>(null);

  const handleClose = useCallback(() => {
    onClose();
    const fn = pending.current;
    pending.current = null;
    fn?.();
  }, [onClose]);

  const hookClose = useBackToClose(open, handleClose);
  const hookCloseRef = useRef(hookClose);
  hookCloseRef.current = hookClose;

  const controls = useMemo<SheetControls>(
    () => ({
      close: () => hookCloseRef.current(),
      closeThen: (fn) => {
        pending.current = fn;
        hookCloseRef.current();
      },
    }),
    []
  );

  useDialog(open, ref, controls.close);

  const { mounted, closing } = usePresence(open, SHEET_EXIT_MS);

  // The phone's sheet rises with a spring and never overshoots the bottom edge.
  // The desktop dialog fades in (CSS).
  useLayoutEffect(() => {
    if (open && window.matchMedia?.('(max-width: 767px)').matches) void springTo(ref.current, 100, 0, (v) => `translateY(${Math.max(0, v)}%)`, SPRINGS.snappy);
  }, [open]);

  const was = useRef(false);
  useEffect(() => {
    if (open !== was.current) play(open ? 'open' : 'close');
    was.current = open;
  }, [open]);

  if (!mounted || typeof document === 'undefined') return null;
  const titleId = `${uid}-t`;

  return createPortal(
    <SheetContext.Provider value={controls}>
      <div className={cn('wt-sheet-wrap', closing && 'closing')} inert={closing || undefined}>
        <button type="button" tabIndex={-1} className="wt-scrim" aria-label="Close" onClick={controls.close} />
        <div
          ref={ref}
          className={cn('wt-sheet', className)}
          role="dialog"
          aria-modal="true"
          aria-labelledby={title ? titleId : undefined}
          aria-label={title ? undefined : ariaLabel}
          tabIndex={-1}
        >
          <div className="wt-sheet-head">
            <div className="wt-grab" aria-hidden="true" />
            {title && (
              <div className="wt-sheet-title-row">
                <h2 id={titleId} className="wt-sheet-title gt">
                  {title}
                </h2>
                <button
                  type="button"
                  className="wt-iconbtn wt-sheet-close"
                  aria-label="Close"
                  onClick={(e) => {
                    // The cross turns a quarter as the sheet leaves.
                    void anim(e.currentTarget.firstElementChild, [{ transform: 'rotate(0)' }, { transform: 'rotate(90deg)' }], { duration: DUR.base, easing: EASE.out, fill: 'forwards' });
                    controls.close();
                  }}
                >
                  <X size={20} aria-hidden="true" />
                </button>
              </div>
            )}
            {description && <p className="wt-sheet-desc">{description}</p>}
          </div>
          <div className="wt-sheet-body">{children}</div>
          {footer && <div className="wt-sheet-foot">{footer}</div>}
        </div>
      </div>
    </SheetContext.Provider>,
    document.body
  );
}

/** A grouped list of rows for a menu sheet. */
export function SheetMenu({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('wt-menu', className)}>{children}</div>;
}

/** One row of a SheetMenu: a button, or a link when href is given. */
export function SheetMenuItem({
  icon,
  children,
  hint,
  danger,
  disabled,
  onClick,
  href,
}: {
  icon?: ReactNode;
  children: ReactNode;
  hint?: ReactNode;
  danger?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  href?: string;
}) {
  const inner = (
    <>
      {icon}
      {children}
      {hint && <small>{hint}</small>}
    </>
  );
  if (href) {
    return (
      <Link href={href} className={cn(danger && 'danger')} onClick={onClick}>
        {inner}
      </Link>
    );
  }
  return (
    <button type="button" className={cn(danger && 'danger')} disabled={disabled} onClick={onClick}>
      {inner}
    </button>
  );
}
