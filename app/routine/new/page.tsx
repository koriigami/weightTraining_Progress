'use client';

import { ComingCard } from '@/components/ComingCard';
import { PageHeader } from '@/components/ui/PageHeader';
import { Screen } from '@/components/ui/Screen';

export default function NewRoutinePage() {
  return (
    <Screen header={<PageHeader title="New routine" back="/routines" narrow />} narrow>
      <ComingCard>The routine editor arrives here: a title, exercises with sets, the library panel, and Save. Add exercise stays pinned at the bottom on the phone.</ComingCard>
    </Screen>
  );
}
