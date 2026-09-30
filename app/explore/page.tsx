'use client';

import { RoutinesTabs } from '@/components/RoutinesTabs';
import { ExploreView } from '@/components/routines/ExploreView';
import { PageHeader } from '@/components/ui/PageHeader';
import { Screen } from '@/components/ui/Screen';
import { useDesktopLayout } from '@/lib/useMediaQuery';

export default function ExplorePage() {
  const desktop = useDesktopLayout();
  return (
    <Screen header={desktop ? <PageHeader title="Explore routines" back="/routines" /> : <PageHeader title="Routines" large collapse sub={<RoutinesTabs current="explore" />} />}>
      <ExploreView />
    </Screen>
  );
}
