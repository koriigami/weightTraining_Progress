'use client';

import { ArrowDown, ArrowUp, Replace, X } from 'lucide-react';
import { Sheet, SheetMenu, SheetMenuItem, useSheet } from '@/components/ui/Sheet';

type MenuProps = {
  open: boolean;
  onClose: () => void;
  name: string;
  index: number;
  count: number;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onReplace: () => void;
  onRemove: () => void;
};

function Items({ index, count, onMoveUp, onMoveDown, onReplace, onRemove }: Omit<MenuProps, 'open' | 'onClose' | 'name'>) {
  const { closeThen } = useSheet();
  return (
    <SheetMenu>
      <SheetMenuItem icon={<ArrowUp size={20} aria-hidden="true" />} disabled={index === 0} onClick={() => closeThen(onMoveUp)}>
        Move up
      </SheetMenuItem>
      <SheetMenuItem icon={<ArrowDown size={20} aria-hidden="true" />} disabled={index >= count - 1} onClick={() => closeThen(onMoveDown)}>
        Move down
      </SheetMenuItem>
      <SheetMenuItem icon={<Replace size={20} aria-hidden="true" />} onClick={() => closeThen(onReplace)}>
        Replace exercise
      </SheetMenuItem>
      <SheetMenuItem icon={<X size={20} aria-hidden="true" />} danger onClick={() => closeThen(onRemove)}>
        Remove exercise
      </SheetMenuItem>
    </SheetMenu>
  );
}

/** The three-dot menu of an exercise: Move up, Move down, Replace exercise (keeps the set count) and Remove exercise (instant, with Undo). */
export function ExerciseMenu({ open, onClose, name, ...items }: MenuProps) {
  return (
    <Sheet open={open} onClose={onClose} title={name}>
      <Items {...items} />
    </Sheet>
  );
}
