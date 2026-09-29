'use client';

import Link from 'next/link';
import { createContext, useCallback, useContext, useId, useMemo, useRef } from 'react';
import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { useBackToClose } from '@/lib/useBackToClose';
import { cn } from './cn';
import { useDialog } from './useDialog';

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
 * scrim closes it. For destructive confirms use GameModal instead.
 */
export function Sheet({
  open,
  onClose,
  title,
  ariaLabel,
  description,
  footer,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  /** Required when there is no visible title. */
  ariaLabel?: string;
  description?: ReactNode;
  /** A pinned footer, e.g. Clear and Show 12 exercises. */
  footer?: ReactNode;
  children: ReactNode;
}) {
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

  if (!open || typeof document === 'undefined') return null;
  const titleId = `${uid}-t`;

  return createPortal(
    <SheetContext.Provider value={controls}>
      <div className="wt-sheet-wrap">
        <button type="button" tabIndex={-1} className="wt-scrim" aria-label="Close" onClick={controls.close} />
        <div
          ref={ref}
          className="wt-sheet"
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
                <button type="button" className="wt-iconbtn wt-sheet-close" aria-label="Close" onClick={controls.close}>
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
