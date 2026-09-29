'use client';

import { ComingCard } from '@/components/ComingCard';
import { PageHeader } from '@/components/ui/PageHeader';
import { Screen } from '@/components/ui/Screen';

export default function StatsPage() {
  return (
    <Screen header={<PageHeader title="Statistics" back="/profile" narrow />} narrow>
      <ComingCard>Statistics arrive here: the weekly chart, workouts, tonnes lifted, PRs, kilometres, and sets per muscle on a body heat map.</ComingCard>
    </Screen>
  );
}
