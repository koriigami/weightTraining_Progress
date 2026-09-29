'use client';

import { Calendar } from '@/components/Calendar';
import { ComingCard } from '@/components/ComingCard';
import { PageHeader } from '@/components/ui/PageHeader';
import { Screen } from '@/components/ui/Screen';

// The 6-week plan calendar stays here until the new calendar replaces it.
export default function CalendarPage() {
  return (
    <Screen header={<PageHeader title="Calendar" back="/profile" />}>
      <ComingCard>The new calendar shows every workout you log. Until it lands, this is your 6-week plan.</ComingCard>
      <Calendar />
    </Screen>
  );
}
