'use client';

import Link from 'next/link';
import { Check, ChevronRight, Eye, Pencil, Play, Plus } from 'lucide-react';
import type { Routine } from '@/lib/routines';
import { routineMeta } from '@/lib/routineSummary';
import { useProgress } from '@/components/ProgressProvider';
import { Button, ButtonLink } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Tag } from '@/components/ui/Chip';
import { cn } from '@/components/ui/cn';
import { ExerciseRows } from './ExerciseRows';
import { useStartRoutine } from './useStartRoutine';

/**
 * A saved routine: the title opens the full preview, every exercise is listed
 * with its sets and weight (six rows, then "+N more"), and Edit and Start sit
 * at the bottom. `doneThisWeek` feeds the "1 of 2" chip when it has a weekly count.
 */
export function RoutineCard({ routine, doneThisWeek }: { routine: Routine; doneThisWeek: number }) {
  const { lookup } = useProgress();
  const start = useStartRoutine();
  const target = routine.timesPerWeek;
  const reached = target !== undefined && doneThisWeek >= target;

  return (
    <Card as="article" className="wt-rcard" aria-label={routine.title}>
      <Link href={`/routine/${routine.id}/preview`} className="wt-rc-head" aria-label={`${routine.title}, preview`}>
        <span className="grow">
          <h3>{routine.title}</h3>
          <small>{routineMeta(routine.items, lookup)}</small>
        </span>
        {target !== undefined && (
          <span className={cn('wt-wk', reached && 'ok')}>
            {reached && <Check size={14} aria-hidden="true" />}
            {doneThisWeek} of {target}
            <span className="sr-only"> this week</span>
          </span>
        )}
        <ChevronRight size={18} aria-hidden="true" />
      </Link>
      <ExerciseRows items={routine.items} />
      <div className="wt-rc-actions">
        <ButtonLink href={`/routine/${routine.id}`} variant="secondary" size="sm" icon={<Pencil size={16} aria-hidden="true" />} aria-label={`Edit ${routine.title}`}>
          Edit
        </ButtonLink>
        <Button className="grow" size="sm" icon={<Play size={14} fill="currentColor" aria-hidden="true" />} aria-label={`Start ${routine.title}`} onClick={() => start(routine.id)}>
          Start
        </Button>
      </div>
    </Card>
  );
}

/** A ready-made routine in Explore: Preview and Add. */
export function TemplateCard({ routine, fits, added, onAdd, adding }: { routine: Routine; fits: boolean; added: boolean; onAdd: () => void; adding?: boolean }) {
  const { lookup } = useProgress();
  return (
    <Card as="article" className="wt-rcard" aria-label={routine.title}>
      <Link href={`/explore/${routine.id}`} className="wt-rc-head" aria-label={`${routine.title}, preview`}>
        <span className="grow">
          <h3>{routine.title}</h3>
          <small>{routineMeta(routine.items, lookup)}</small>
        </span>
        {fits && <Tag tone="ok">Fits you</Tag>}
        <ChevronRight size={18} aria-hidden="true" />
      </Link>
      <ExerciseRows items={routine.items} />
      {routine.notes && <small style={{ color: 'var(--muted)' }}>{routine.notes}</small>}
      <div className="wt-rc-actions">
        <ButtonLink href={`/explore/${routine.id}`} variant="secondary" size="sm" icon={<Eye size={16} aria-hidden="true" />} aria-label={`Preview ${routine.title}`}>
          Preview
        </ButtonLink>
        <Button
          className="grow"
          size="sm"
          disabled={added}
          loading={adding}
          icon={added ? <Check size={16} aria-hidden="true" /> : <Plus size={16} aria-hidden="true" />}
          aria-label={added ? `${routine.title} is in My routines` : `Add ${routine.title} to My routines`}
          onClick={onAdd}
        >
          {added ? 'Added' : 'Add'}
        </Button>
      </div>
    </Card>
  );
}
