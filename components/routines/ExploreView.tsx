'use client';

import { useState } from 'react';
import { EXPLORE_CHIPS, exploreGroups, fitsEquipment, isStarterAdded } from '@/lib/explore';
import type { ExploreKind } from '@/lib/explore';
import { newRoutineId } from '@/lib/routineDraft';
import { availableEquipment, instantiateRoutine } from '@/lib/routines';
import type { Routine } from '@/lib/routines';
import { useProgress } from '@/components/ProgressProvider';
import { SectionLabel } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { TemplateCard } from './RoutineCard';

/** Saves a copy of a ready-made routine, with the dumbbell weights set for this person. */
export function useAddStarter(): { add: (starter: Routine) => Promise<boolean>; addingId: string | null } {
  const { saveRoutine, prefs, showToast } = useProgress();
  const [addingId, setAddingId] = useState<string | null>(null);
  async function add(starter: Routine): Promise<boolean> {
    setAddingId(starter.id);
    const error = await saveRoutine(instantiateRoutine(starter, newRoutineId(), prefs));
    setAddingId(null);
    if (error) {
      showToast(error);
      return false;
    }
    showToast(`${starter.title} added to My routines`);
    return true;
  }
  return { add, addingId };
}

/**
 * Ready-made routines in groups, with type chips (All, Strength, Running,
 * Walking, Cycling). Someone with no equipment sees running and walking first.
 */
export function ExploreView() {
  const { routines, prefs } = useProgress();
  const [kind, setKind] = useState<ExploreKind>('all');
  const { add, addingId } = useAddStarter();
  const mine = availableEquipment(prefs);
  const groups = exploreGroups(kind, prefs.equipment.kind);

  return (
    <>
      <div className="wt-xtabs" role="group" aria-label="Routine type">
        {EXPLORE_CHIPS.map((c) => (
          <Chip key={c.kind} pressed={kind === c.kind} onClick={() => setKind(c.kind)}>
            {c.label}
          </Chip>
        ))}
      </div>
      {groups.map((g) => (
        <section key={g.id} aria-label={g.title} className="wt-stack">
          <SectionLabel>{g.title}</SectionLabel>
          <div className="wt-rgrid">
            {g.routines.map((r) => (
              <TemplateCard key={r.id} routine={r} fits={g.kind === 'strength' && fitsEquipment(r, mine)} added={isStarterAdded(r, routines)} adding={addingId === r.id} onAdd={() => void add(r)} />
            ))}
          </div>
        </section>
      ))}
    </>
  );
}
