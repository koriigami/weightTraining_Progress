'use client';

import { useEffect, useId, useRef } from 'react';
import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { buzz, play } from '@/lib/sound';
import { Button } from './Button';
import type { ButtonVariant } from './Button';
import { cn } from './cn';
import { useDialog } from './useDialog';
import { useLastOpen, usePresence } from './usePresence';

/** How long a game modal takes to leave: it shrinks to 92% and fades. */
export const MODAL_EXIT_MS = 160;

export type GameModalProps = {
  open: boolean;
  title: string;
  /** One plain sentence. Leave it out when the body is all in `extra`. */
  children?: ReactNode;
  /** Medallion colour: red for destructive, green for finishing, neutral gold otherwise. */
  tone?: 'red' | 'green' | 'neutral';
  /** The icon inside the medallion. */
  icon?: ReactNode;
  /** Replaces the medallion, e.g. a locked shield preview. */
  art?: ReactNode;
  /** Sits under the art, e.g. a "Locked" ribbon. */
  badge?: ReactNode;
  /** More under the sentence, e.g. the list of sets that are not ticked. */
  extra?: ReactNode;
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
  /** Extra class on the panel, for a modal that needs its own width. */
  className?: string;
  /** The confirm button charges along its bottom edge (Finish). */
  confirmCharging?: boolean;
};

/**
 * The framed game dialog: a cream panel, a sky ribbon title, an icon medallion,
 * one sentence and two equal-width buttons. Centered on phone and desktop. It
 * pops in from 70% with an overshoot (the ribbon drops in 80 ms later) with a pip
 * and a lift, and leaves by shrinking to 92% and fading, with the soft puff.
 */
export function GameModal(props: GameModalProps) {
  const { open, onCancel } = props;
  // What the modal showed stays on screen while it leaves, even if the parent empties it on close.
  const { title, children, tone = 'neutral', icon, art, badge, extra, strict, cancelLabel = 'Cancel', confirmLabel = 'OK', confirmVariant, confirmLoading, className, confirmCharging, onConfirm } = useLastOpen(open, props);
  const ref = useRef<HTMLDivElement>(null);
  const uid = useId();
  const titleId = `${uid}-t`;
  const bodyId = `${uid}-b`;
  useDialog(open, ref, onCancel);

  const { mounted, closing } = usePresence(open, MODAL_EXIT_MS);
  const was = useRef(false);
  useEffect(() => {
    if (open !== was.current) {
      play(open ? 'modal' : 'close');
      if (open) buzz('light');
    }
    was.current = open;
  }, [open]);

  if (!mounted || typeof document === 'undefined') return null;

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
    <div className={cn('wt-gm-wrap', closing && 'closing')} inert={closing || undefined}>
      <button
        type="button"
        tabIndex={-1}
        className="wt-scrim"
        aria-label={strict ? 'Choose one of the two buttons' : 'Close'}
        onClick={strict ? shake : onCancel}
      />
      <div
        ref={ref}
        className={cn('wt-gmodal', className)}
        role={strict ? 'alertdialog' : 'dialog'}
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={children ? bodyId : undefined}
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
          {children && <p id={bodyId}>{children}</p>}
          {extra}
          <div className={cn('wt-gm-btns', single && 'one')}>
            {single ? (
              <Button variant="secondary" onClick={onCancel} data-autofocus>
                {cancelLabel}
              </Button>
            ) : (
              <>
                <Button variant="secondary" onClick={onCancel} data-autofocus disabled={confirmLoading || confirmCharging}>
                  {cancelLabel}
                </Button>
                <Button variant={variant} onClick={onConfirm} loading={confirmLoading} className={cn(confirmCharging && 'charging')}>
                  {confirmLabel}
                  {confirmCharging && <i className="wt-charge" aria-hidden="true" />}
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
