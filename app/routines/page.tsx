'use client';

import Link from 'next/link';
import { Plus } from 'lucide-react';
import { useProgress } from '@/components/ProgressProvider';
import { ComingCard } from '@/components/ComingCard';
import { RoutinesTabs } from '@/components/RoutinesTabs';
import { ButtonLink } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { PageHeader } from '@/components/ui/PageHeader';
import { Screen } from '@/components/ui/Screen';

export default function RoutinesPage() {
  const { routines } = useProgress();
  return (
    <Screen
      header={
        <PageHeader
          title="Routines"
          large
          actions={
            <ButtonLink href="/routine/new" size="sm" variant="secondary" icon={<Plus size={16} aria-hidden="true" />}>
              New
            </ButtonLink>
          }
        />
      }
    >
      <RoutinesTabs current="mine" />
      <Card tone="flush">
        {routines.length === 0 ? (
          <p style={{ margin: 0, padding: 16, color: 'var(--muted)' }}>No routines yet.</p>
        ) : (
          <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            {routines.map((r) => (
              <li key={r.id} style={{ borderBottom: '1px solid var(--line)' }}>
                <Link href={`/routine/${r.id}`} style={{ display: 'block', padding: '14px 16px', minHeight: 44 }}>
                  <b>{r.title}</b>
                  <div style={{ color: 'var(--muted)', fontSize: 13 }}>
                    {r.items.length} {r.items.length === 1 ? 'exercise' : 'exercises'}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
      <ComingCard>Routine cards with every exercise, the preview screen and the Explore list of ready-made routines arrive with the Routines screen.</ComingCard>
    </Screen>
  );
}
