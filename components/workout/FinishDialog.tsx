'use client';

import { Flag } from 'lucide-react';
import { fmtUnticked, untickedSentence } from '@/lib/finishSummary';
import type { UntickedRow } from '@/lib/finishSummary';
import { GameModal } from '@/components/ui/GameModal';

const MAX_ROWS = 5;

/**
 * The centered green dialog Finish opens. It says how many sets are not ticked
 * and lists them by exercise, so an accidental Finish can be undone with
 * "Keep logging". Both buttons are the same width.
 */
export function FinishDialog({ open, unticked, saving, onKeepLogging, onFinish }: { open: boolean; unticked: UntickedRow[]; saving: boolean; onKeepLogging: () => void; onFinish: () => void }) {
  const count = unticked.reduce((n, r) => n + r.sets.length, 0);
  const shown = unticked.slice(0, MAX_ROWS);
  const more = unticked.length - shown.length;
  return (
    <GameModal
      open={open}
      tone="green"
      icon={<Flag size={30} aria-hidden="true" />}
      title="Finish workout?"
      cancelLabel="Keep logging"
      confirmLabel="Finish"
      confirmLoading={saving}
      onCancel={onKeepLogging}
      onConfirm={onFinish}
      extra={
        count > 0 ? (
          <ul className="wt-gm-list" aria-label="Sets that are not ticked">
            {shown.map((r) => (
              <li key={r.exerciseId}>
                <span>{r.name}</span>
                <span>{fmtUnticked(r)}</span>
              </li>
            ))}
            {more > 0 && (
              <li>
                <span>+{more} more</span>
                <span />
              </li>
            )}
          </ul>
        ) : undefined
      }
    >
      {untickedSentence(count)}
    </GameModal>
  );
}
