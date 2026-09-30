'use client';

import { ButtonLink } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { PageHeader } from '@/components/ui/PageHeader';
import { Screen } from '@/components/ui/Screen';

/** Shown for a workout id that is missing or unknown, or was just deleted. */
export function WorkoutNotFound({ title = 'Workout' }: { title?: string }) {
  return (
    <Screen header={<PageHeader title={title} back="/profile" />} narrow>
      <Card tone="dashed" className="text-center">
        <p style={{ margin: '0 0 12px' }}>
          <b>We can&apos;t find that workout.</b>
          <br />
          It may have been deleted.
        </p>
        <ButtonLink href="/profile">Back to your workouts</ButtonLink>
      </Card>
    </Screen>
  );
}
