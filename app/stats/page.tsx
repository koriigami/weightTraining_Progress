'use client';

import { useMemo } from 'react';
import { useProgress } from '@/components/ProgressProvider';
import { BodyGraphCard, MuscleBarsCard } from '@/components/stats/BodyGraph';
import { PageHeader } from '@/components/ui/PageHeader';
import { Screen } from '@/components/ui/Screen';
import { last7Stats } from '@/lib/muscleStats';
import { useToday } from '@/lib/useToday';

export default function StatsPage() {
  const { state } = useProgress();
  const today = useToday();
  const stats = useMemo(() => last7Stats(state, today), [state, today]);
  return (
    <Screen header={<PageHeader title="Statistics" back="/profile" narrow />} narrow>
      <BodyGraphCard stats={stats} />
      <MuscleBarsCard stats={stats} />
    </Screen>
  );
}
