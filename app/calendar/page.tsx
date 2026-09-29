'use client';

import { CalendarRange } from 'lucide-react';
import { MonthCalendar } from '@/components/calendar/MonthCalendar';
import { ButtonLink } from '@/components/ui/Button';
import { PageHeader } from '@/components/ui/PageHeader';
import { Screen } from '@/components/ui/Screen';

export default function CalendarPage() {
  return (
    <Screen
      header={
        <PageHeader
          title="Calendar"
          back="/profile"
          narrow
          actions={
            <ButtonLink href="/calendar/plan" variant="secondary" size="sm" icon={<CalendarRange size={16} aria-hidden="true" />}>
              6-week plan
            </ButtonLink>
          }
        />
      }
      narrow
    >
      <MonthCalendar />
    </Screen>
  );
}
