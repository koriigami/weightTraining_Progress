'use client';

import { MonthCalendar } from '@/components/calendar/MonthCalendar';
import { PageHeader } from '@/components/ui/PageHeader';
import { Screen } from '@/components/ui/Screen';

export default function CalendarPage() {
  return (
    <Screen
      header={
        <PageHeader title="Calendar" back="/profile" narrow />
      }
      narrow
    >
      <MonthCalendar />
    </Screen>
  );
}
