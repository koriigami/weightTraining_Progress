'use client';

import { useEffect, useState } from 'react';
import { DayCard } from '@/components/DayCard';
import { ProgressBar } from '@/components/ProgressBar';
import { plan } from '@/data/plan';
import { getTodayOrClosest, formatDateLong, formatDateShort } from '@/lib/date';

export default function TodayPage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return <div className="h-64" />;
  }

  const { day, index } = getTodayOrClosest();
  const tomorrow = plan[index + 1];
  const totalDays = plan.length;
  const daysToEnd = totalDays - 1 - index;

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="flex items-baseline justify-between">
          <h1 className="text-xl font-semibold text-neutral-900 dark:text-neutral-50">
            {formatDateLong(day.date)}
          </h1>
          <span className="text-xs text-neutral-400 dark:text-neutral-500">
            {daysToEnd > 0 ? `${daysToEnd} days to Nov 1` : 'Final day'}
          </span>
        </div>
        <div className="text-xs text-neutral-500 dark:text-neutral-400">
          Week {day.weekNumber} · Day {index + 1} of {totalDays}
        </div>
        <ProgressBar current={index + 1} total={totalDays} />
      </div>

      <div className="sm:grid sm:grid-cols-5 sm:gap-4">
        <div className="sm:col-span-3">
          <DayCard day={day} />
        </div>

        {tomorrow && (
          <div className="mt-4 sm:col-span-2 sm:mt-0">
            <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-neutral-400 dark:text-neutral-500">
              Tomorrow · {formatDateShort(tomorrow.date)}
            </div>
            <div className="sm:hidden">
              <DayCard day={tomorrow} compact />
            </div>
            <div className="hidden sm:block">
              <DayCard day={tomorrow} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
