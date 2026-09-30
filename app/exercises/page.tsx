'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { EXERCISES } from '@/data/exercises';
import { emptyFilters, libraryOrder } from '@/lib/exerciseFilter';
import type { ExerciseFilters as Filters } from '@/lib/exerciseFilter';
import { useDesktopLayout, useWideLayout } from '@/lib/useMediaQuery';
import { useProgress } from '@/components/ProgressProvider';
import { RoutinesTabs } from '@/components/RoutinesTabs';
import { CustomExerciseSheet } from '@/components/exercises/CustomExerciseSheet';
import { ExerciseDetail, ExerciseInfoSheet } from '@/components/exercises/ExerciseDetail';
import { ExerciseFilters } from '@/components/exercises/ExerciseFilters';
import { ExerciseList, useVisibleCount } from '@/components/exercises/ExerciseList';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { PageHeader } from '@/components/ui/PageHeader';
import { Screen } from '@/components/ui/Screen';

export default function ExercisesPage() {
  const { customExercises, lookup } = useProgress();
  const desktop = useDesktopLayout();
  const wide = useWideLayout();
  const [filters, setFilters] = useState<Filters>(emptyFilters);
  const [activeId, setActiveId] = useState<string>(EXERCISES[0].id);
  const [sheetId, setSheetId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const exercises = libraryOrder(EXERCISES, customExercises);
  const count = useVisibleCount(exercises, filters);
  const active = lookup(activeId) ?? EXERCISES[0];

  // From 1100px the detail sits in the side column. Below that it opens as a sheet.
  function open(id: string) {
    if (wide) setActiveId(id);
    else setSheetId(id);
  }

  return (
    <Screen
      header={
        <PageHeader
          title={desktop ? 'Exercises' : 'Routines'}
          large
          collapse
          sub={desktop ? undefined : <RoutinesTabs current="exercises" />}
          actions={
            desktop ? (
              <Button variant="secondary" icon={<Plus size={18} aria-hidden="true" />} onClick={() => setCreating(true)}>
                Custom exercise
              </Button>
            ) : (
              <button type="button" className="wt-textbtn" onClick={() => setCreating(true)}>
                <Plus size={16} aria-hidden="true" /> Custom
              </button>
            )
          }
        />
      }
      aside={
        wide ? (
          <Card>
            <h2 className="gt" style={{ fontSize: 20, margin: '0 0 12px' }}>
              {active.name}
            </h2>
            <ExerciseDetail exercise={active} />
          </Card>
        ) : undefined
      }
    >
      <ExerciseFilters filters={filters} onChange={setFilters} resultCount={count} />
      <Card tone="flush">
        <ExerciseList exercises={exercises} filters={filters} onFiltersChange={setFilters} mode="browse" activeId={wide ? activeId : null} onInfo={open} />
      </Card>
      <ExerciseInfoSheet exercise={sheetId ? lookup(sheetId) ?? null : null} onClose={() => setSheetId(null)} />
      <CustomExerciseSheet open={creating} onClose={() => setCreating(false)} onCreated={(e) => setActiveId(e.id)} />
    </Screen>
  );
}
