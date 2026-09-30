'use client';

import { Copy, Trash2 } from 'lucide-react';
import { Sheet, SheetMenu, SheetMenuItem, useSheet } from '@/components/ui/Sheet';

function Items({ onDuplicate, onDelete }: { onDuplicate: () => void; onDelete: () => void }) {
  const { closeThen } = useSheet();
  return (
    <SheetMenu>
      <SheetMenuItem icon={<Copy size={20} aria-hidden="true" />} onClick={() => closeThen(onDuplicate)}>
        Duplicate
      </SheetMenuItem>
      <SheetMenuItem icon={<Trash2 size={20} aria-hidden="true" />} danger onClick={() => closeThen(onDelete)}>
        Delete routine
      </SheetMenuItem>
    </SheetMenu>
  );
}

/** The three-dot menu of a routine card: Duplicate, and Delete routine (which asks first). */
export function RoutineMenu({ open, onClose, title, onDuplicate, onDelete }: { open: boolean; onClose: () => void; title: string; onDuplicate: () => void; onDelete: () => void }) {
  return (
    <Sheet open={open} onClose={onClose} title={title}>
      <Items onDuplicate={onDuplicate} onDelete={onDelete} />
    </Sheet>
  );
}
