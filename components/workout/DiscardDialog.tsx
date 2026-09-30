'use client';

import { Trash2 } from 'lucide-react';
import { GameModal } from '@/components/ui/GameModal';

/**
 * The strict red dialog Discard opens. It says what is lost. Tapping outside only
 * shakes it. Esc or "Keep logging" closes it, and only the solid red button discards.
 */
export function DiscardDialog({ open, tickedSets, xp, onKeepLogging, onDiscard }: { open: boolean; tickedSets: number; xp: number; onKeepLogging: () => void; onDiscard: () => void }) {
  return (
    <GameModal
      open={open}
      strict
      tone="red"
      icon={<Trash2 size={30} aria-hidden="true" />}
      title="Discard workout?"
      cancelLabel="Keep logging"
      confirmLabel="Discard"
      onCancel={onKeepLogging}
      onConfirm={onDiscard}
    >
      {tickedSets > 0 ? `You'll lose ${tickedSets} ticked ${tickedSets === 1 ? 'set' : 'sets'} and ${xp} XP. This can't be undone.` : 'Nothing is ticked yet, so nothing is lost.'}
    </GameModal>
  );
}
