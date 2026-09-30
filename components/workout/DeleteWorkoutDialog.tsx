'use client';

import { Trash2 } from 'lucide-react';
import { GameModal } from '@/components/ui/GameModal';

/**
 * The strict red dialog "Delete workout" opens. The body says what goes and, only
 * when it applies, the level or rank you fall back to. Tapping outside only shakes it.
 */
export function DeleteWorkoutDialog({ open, sentence, saving, onKeep, onDelete }: { open: boolean; sentence: string; saving: boolean; onKeep: () => void; onDelete: () => void }) {
  return (
    <GameModal open={open} strict tone="red" icon={<Trash2 size={30} aria-hidden="true" />} title="Delete workout?" cancelLabel="Keep it" confirmLabel="Delete" confirmLoading={saving} onCancel={onKeep} onConfirm={onDelete}>
      {sentence}
    </GameModal>
  );
}
