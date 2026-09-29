'use client';

import { Calendar } from '@/components/Calendar';
import { PageHeader } from '@/components/ui/PageHeader';
import { Screen } from '@/components/ui/Screen';

// The original 6-week plan calendar. Its days keep their own scoring, and the
// new Calendar marks the days you ticked here too.
export default function PlanCalendarPage() {
  return (
    <Screen header={<PageHeader title="6-week plan" back="/calendar" />}>
      <Calendar />
    </Screen>
  );
}
