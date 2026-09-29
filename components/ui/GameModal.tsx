'use client';

import { useId, useRef } from 'react';
import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Button } from './Button';
import type { ButtonVariant } from './Button';
import { cn } from './cn';
import { useDialog } from './useDialog';

export type GameModalProps = {
  open: boolean;
  title: string;
  /** One plain sentence. */
  children: ReactNode;
  /** Medallion colour: red for destructive, green for finishing, neutral gold otherwise. */
  tone?: 'red' | 'green' | 'neutral';
  /** The icon inside the medallion. */
  icon?: ReactNode;
  /** Replaces the medallion, e.g. a locked shield preview. */
  art?: ReactNode;
  /** Sits under the art, e.g. a "Locked" ribbon. */
  badge?: ReactNode;
  /** A destructive confirm: tapping the scrim only shakes the dialog. Esc or Cancel closes it. */
  strict?: boolean;
  cancelLabel?: string;
  confirmLabel?: string;
  /** Defaults to solid-destructive for a red tone and primary otherwise. */
  confirmVariant?: Extract<ButtonVariant, 'primary' | 'solid-destructive'>;
  /** Called by the Cancel button, Esc, and (when not strict) the scrim. */
  onCancel: () => void;
  /** Leave it out for a one-button dialog ("Got it") that closes with onCancel. */
  onConfirm?: () => void;
  confirmLoading?: boolean;
};

/**
 * The framed game dialog: a cream panel, a sky ribbon title, an icon medallion,
 * one sentence and two equal-width buttons. Centered on phone and desktop.
 */
export function GameModal({
  open,
  title,
  children,
  tone = 'neutral',
  icon,
  art,
  badge,
  strict,
  cancelLabel = 'Cancel',
  confirmLabel = 'OK',
  confirmVariant,
  onCancel,
  onConfirm,
  confirmLoading,
}: GameModalProps) {
  const ref = useRef<HTMLDivElement>(null);
  const uid = useId();
  const titleId = `${uid}-t`;
  const bodyId = `${uid}-b`;
  useDialog(open, ref, onCancel);

  if (!open || typeof document === 'undefined') return null;

  function shake() {
    const el = ref.current;
    if (!el) return;
    el.classList.remove('shake');
    void el.offsetWidth;
    el.classList.add('shake');
  }

  const single = !onConfirm;
  const variant = confirmVariant ?? (tone === 'red' ? 'solid-destructive' : 'primary');

  return createPortal(
    <div className="wt-gm-wrap">
      <button
        type="button"
        tabIndex={-1}
        className="wt-scrim"
        aria-label={strict ? 'Choose one of the two buttons' : 'Close'}
        onClick={strict ? shake : onCancel}
      />
      <div
        ref={ref}
        className="wt-gmodal"
        role={strict ? 'alertdialog' : 'dialog'}
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={bodyId}
        tabIndex={-1}
        onAnimationEnd={(e) => e.currentTarget.classList.remove('shake')}
      >
        <div className="wt-gm-rib">
          <h2 id={titleId} className="gt">
            {title}
          </h2>
        </div>
        {art ? <div className="wt-gm-art">{art}</div> : icon ? <div className={cn('wt-gm-med', tone)}>{icon}</div> : null}
        {badge && <div style={{ textAlign: 'center', marginBottom: 10 }}>{badge}</div>}
        <div className="wt-gm-body">
          <p id={bodyId}>{children}</p>
          <div className={cn('wt-gm-btns', single && 'one')}>
            {single ? (
              <Button variant="secondary" onClick={onCancel} data-autofocus>
                {cancelLabel}
              </Button>
            ) : (
              <>
                <Button variant="secondary" onClick={onCancel} data-autofocus disabled={confirmLoading}>
                  {cancelLabel}
                </Button>
                <Button variant={variant} onClick={onConfirm} loading={confirmLoading}>
                  {confirmLabel}
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
