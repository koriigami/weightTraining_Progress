'use client';

import { Copy, History, Trash2 } from 'lucide-react';
import { useToday } from '@/lib/useToday';
import { Sheet, SheetMenu, SheetMenuItem, useSheet } from '@/components/ui/Sheet';

// The "New" pill on Log workout goes away on this day.
const LOG_PILL_UNTIL = '2026-11-15';

function Items({ onLog, onDuplicate, onDelete }: { onLog: () => void; onDuplicate: () => void; onDelete: () => void }) {
  const { closeThen } = useSheet();
  const today = useToday();
  return (
    <SheetMenu>
      <SheetMenuItem icon={<History size={20} aria-hidden="true" />} onClick={() => closeThen(onLog)}>
        Log workout
        {today < LOG_PILL_UNTIL && <span className="wt-newpill">New</span>}
      </SheetMenuItem>
      <SheetMenuItem icon={<Copy size={20} aria-hidden="true" />} onClick={() => closeThen(onDuplicate)}>
        Duplicate
      </SheetMenuItem>
      <SheetMenuItem icon={<Trash2 size={20} aria-hidden="true" />} danger onClick={() => closeThen(onDelete)}>
        Delete routine
      </SheetMenuItem>
    </SheetMenu>
  );
}

/** The three-dot menu of a routine card: Log workout, Duplicate, and Delete routine (which asks first). */
export function RoutineMenu({ open, onClose, title, onLog, onDuplicate, onDelete }: { open: boolean; onClose: () => void; title: string; onLog: () => void; onDuplicate: () => void; onDelete: () => void }) {
  return (
    <Sheet open={open} onClose={onClose} title={title}>
      <Items onLog={onLog} onDuplicate={onDuplicate} onDelete={onDelete} />
    </Sheet>
  );
}
