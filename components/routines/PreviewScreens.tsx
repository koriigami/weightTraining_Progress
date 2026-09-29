'use client';

import { useParams } from 'next/navigation';
import { findStarter } from '@/lib/explore';
import { useProgress } from '@/components/ProgressProvider';
import { ButtonLink } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { PageHeader } from '@/components/ui/PageHeader';
import { Screen } from '@/components/ui/Screen';
import { RoutinePreview } from './RoutinePreview';

function Missing({ back, label }: { back: string; label: string }) {
  return (
    <Screen header={<PageHeader title="Routine" back={back} narrow />} narrow>
      <Card tone="dashed" className="text-center">
        <p style={{ margin: '0 0 12px' }}>
          <b>This routine is gone, or it has not loaded yet.</b>
        </p>
        <ButtonLink href={back} variant="secondary">
          {label}
        </ButtonLink>
      </Card>
    </Screen>
  );
}

/** The preview of one of the person's own routines: /routine/[id]/preview. */
export function SavedPreviewScreen() {
  const params = useParams<{ id: string }>();
  const { routines } = useProgress();
  const routine = routines.find((r) => r.id === params.id);
  if (!routine) return <Missing back="/routines" label="Back to routines" />;
  return <RoutinePreview routine={routine} kind="mine" />;
}

/** The preview of a ready-made routine: /explore/[id]. */
export function StarterPreviewScreen() {
  const params = useParams<{ id: string }>();
  const routine = findStarter(params.id);
  if (!routine) return <Missing back="/explore" label="Back to Explore" />;
  return <RoutinePreview routine={routine} kind="starter" />;
}
