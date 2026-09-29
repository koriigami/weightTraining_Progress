'use client';

import { forwardRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { EQUIPMENT, EQUIPMENT_ORDER, MUSCLES, MUSCLE_ORDER, QUICK_MUSCLE_GROUPS } from '@/data/exercises';
import { clearFilters, filterPills, isQuickPickOn, removePill, toggleInList, toggleQuickPick } from '@/lib/exerciseFilter';
import type { ClearWhich, ExerciseFilters as Filters } from '@/lib/exerciseFilter';
import { Button } from '@/components/ui/Button';
import { CheckChip, Chip, RemovableChip } from '@/components/ui/Chip';
import { SearchField } from '@/components/ui/Field';
import { Sheet, useSheet } from '@/components/ui/Sheet';

type Which = 'muscles' | 'equipment';

function SheetFoot({ which, count, onClear }: { which: Which; count: number; onClear: (which: ClearWhich) => void }) {
  const { close } = useSheet();
  return (
    <>
      <Button variant="secondary" onClick={() => onClear(which)}>
        Clear
      </Button>
      <Button onClick={close}>
        Show {count} {count === 1 ? 'exercise' : 'exercises'}
      </Button>
    </>
  );
}

/**
 * The search box, the Muscles and Equipment buttons, the removable pills with
 * "Clear all", and the two multi-select sheets. `resultCount` feeds the sheets'
 * "Show N exercises" button.
 */
export const ExerciseFilters = forwardRef<HTMLInputElement, { filters: Filters; onChange: (next: Filters) => void; resultCount: number; searchLabel?: string }>(function ExerciseFilters(
  { filters, onChange, resultCount, searchLabel = 'Search exercise' },
  searchRef
) {
  const [sheet, setSheet] = useState<Which | null>(null);
  const pills = filterPills(filters);
  const clear = (which: ClearWhich) => onChange(clearFilters(filters, which));

  return (
    <div className="wt-fstack">
      <SearchField ref={searchRef} aria-label={searchLabel} placeholder="Search exercise" value={filters.query} onChange={(e) => onChange({ ...filters, query: e.target.value })} />
      <div className="wt-filters">
        <button type="button" className="wt-fbtn" onClick={() => setSheet('muscles')} aria-haspopup="dialog">
          Muscles
          {filters.muscles.length > 0 ? <span className="n" aria-label={`${filters.muscles.length} selected`}>{filters.muscles.length}</span> : <ChevronDown size={16} aria-hidden="true" />}
        </button>
        <button type="button" className="wt-fbtn" onClick={() => setSheet('equipment')} aria-haspopup="dialog">
          Equipment
          {filters.equipment.length > 0 ? <span className="n" aria-label={`${filters.equipment.length} selected`}>{filters.equipment.length}</span> : <ChevronDown size={16} aria-hidden="true" />}
        </button>
      </div>
      {pills.length > 0 && (
        <div className="wt-pills">
          {pills.map((p) => (
            <RemovableChip key={`${p.kind}-${p.value}`} label={p.label} onRemove={() => onChange(removePill(filters, p))} />
          ))}
          <button type="button" className="wt-textbtn sm" onClick={() => clear('all')}>
            Clear all
          </button>
        </div>
      )}

      <Sheet
        open={sheet === 'muscles'}
        onClose={() => setSheet(null)}
        title="Muscles"
        description="Pick as many as you like. You'll see exercises that work any of them."
        footer={<SheetFoot which="muscles" count={resultCount} onClear={clear} />}
      >
        <div className="wt-chips" role="group" aria-label="Quick picks">
          {QUICK_MUSCLE_GROUPS.map((g) => (
            <Chip key={g.id} pressed={isQuickPickOn(filters.muscles, g.muscles)} onClick={() => onChange({ ...filters, muscles: toggleQuickPick(filters.muscles, g.muscles) })}>
              {g.label}
            </Chip>
          ))}
        </div>
        <div className="wt-checklist">
          {MUSCLE_ORDER.map((m) => (
            <CheckChip key={m} checked={filters.muscles.includes(m)} onChange={() => onChange({ ...filters, muscles: toggleInList(filters.muscles, m) })}>
              {MUSCLES[m]}
            </CheckChip>
          ))}
        </div>
      </Sheet>

      <Sheet open={sheet === 'equipment'} onClose={() => setSheet(null)} title="Equipment" description="Pick one or more." footer={<SheetFoot which="equipment" count={resultCount} onClear={clear} />}>
        <div className="wt-checklist">
          {EQUIPMENT_ORDER.map((q) => (
            <CheckChip key={q} checked={filters.equipment.includes(q)} onChange={() => onChange({ ...filters, equipment: toggleInList(filters.equipment, q) })}>
              {EQUIPMENT[q]}
            </CheckChip>
          ))}
        </div>
      </Sheet>
    </div>
  );
});
