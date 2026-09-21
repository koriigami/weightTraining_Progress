'use client';

import { useEffect, useState } from 'react';
import { plan, WorkoutDay } from '@/data/plan';
import { formatDateShort, todayStr } from '@/lib/date';

const DAY_TYPE_LABEL: Record<WorkoutDay['dayType'], string> = {
  push: 'Push',
  pull: 'Pull',
  legs: 'Legs',
  'full-body': 'Full Body',
  'cardio-core': 'Cardio',
  rest: 'Rest',
};

const DOT_STYLES: Record<WorkoutDay['dayType'], string> = {
  push: 'bg-orange-400',
  pull: 'bg-blue-400',
  legs: 'bg-emerald-400',
  'full-body': 'bg-purple-400',
  'cardio-core': 'bg-pink-400',
  rest: 'bg-neutral-300 dark:bg-neutral-600',
};

const MILESTONE_WEEKS = new Set([3, 5]);

function daySummary(day: WorkoutDay): string {
  const parts: string[] = [];
  if (day.strength.length > 0) parts.push(`${day.strength.length} exercises`);
  if (day.core && day.core.length > 0) parts.push('core');
  if (day.cardio) parts.push(`${day.cardio.modality} ${day.cardio.minutes}min`);
  return parts.length > 0 ? parts.join(' · ') : 'Recovery';
}

export function PlanView() {
  const [todayDate, setTodayDate] = useState<string | null>(null);
  const [openWeek, setOpenWeek] = useState<number | null>(null);

  useEffect(() => {
    const t = todayStr();
    setTodayDate(t);
    setOpenWeek(plan.find((d) => d.date === t)?.weekNumber ?? 1);
  }, []);

  if (todayDate === null || openWeek === null) {
    return <div className="h-64" />;
  }

  const weekNumbers = Array.from(new Set(plan.map((d) => d.weekNumber)));

  return (
    <div className="space-y-6">
      {/* Mobile: collapsible weeks */}
      <div className="space-y-2 sm:hidden">
        {weekNumbers.map((week) => {
          const days = plan.filter((d) => d.weekNumber === week);
          const isOpen = openWeek === week;
          const isCurrent = week === plan.find((d) => d.date === todayDate)?.weekNumber;
          return (
            <div key={week} className="overflow-hidden rounded-xl border border-neutral-200 dark:border-neutral-800">
              <button
                onClick={() => setOpenWeek(isOpen ? -1 : week)}
                className="flex w-full items-center justify-between bg-neutral-50 px-4 py-3 text-left dark:bg-neutral-900/50"
              >
                <span className="flex items-center gap-2 text-sm font-semibold text-neutral-800 dark:text-neutral-100">
                  Week {week}
                  {isCurrent && <span className="text-xs font-normal text-neutral-400">· current</span>}
                  {MILESTONE_WEEKS.has(week) && (
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700 dark:bg-amber-500/15 dark:text-amber-300">
                      MILESTONE
                    </span>
                  )}
                </span>
                <span className="text-xs text-neutral-400">
                  {formatDateShort(days[0].date)} – {formatDateShort(days[6].date)}
                </span>
              </button>
              {isOpen && (
                <div className="divide-y divide-neutral-100 bg-white dark:divide-neutral-800 dark:bg-neutral-950">
                  {days.map((d) => {
                    const isToday = d.date === todayDate;
                    return (
                      <div
                        key={d.date}
                        className={`flex items-center gap-3 px-4 py-2.5 ${isToday ? 'bg-neutral-100 dark:bg-neutral-900' : ''}`}
                      >
                        <span className={`h-2 w-2 shrink-0 rounded-full ${DOT_STYLES[d.dayType]}`} />
                        <span className="w-10 shrink-0 text-xs text-neutral-400">
                          {formatDateShort(d.date).slice(0, 3)}
                        </span>
                        <span
                          className={`w-20 shrink-0 text-sm ${
                            isToday
                              ? 'font-semibold text-neutral-900 dark:text-neutral-50'
                              : 'text-neutral-700 dark:text-neutral-300'
                          }`}
                        >
                          {DAY_TYPE_LABEL[d.dayType]}
                        </span>
                        <span className="truncate text-xs text-neutral-400">{daySummary(d)}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Desktop: weekly grid */}
      <div className="hidden space-y-3 sm:block">
        {weekNumbers.map((week) => {
          const days = plan.filter((d) => d.weekNumber === week);
          return (
            <div key={week}>
              <div className="mb-1.5 flex items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-neutral-400 dark:text-neutral-500">
                  Week {week}
                </span>
                {MILESTONE_WEEKS.has(week) && (
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700 dark:bg-amber-500/15 dark:text-amber-300">
                    MILESTONE
                  </span>
                )}
              </div>
              <div className="grid grid-cols-7 gap-2">
                {days.map((d) => {
                  const isToday = d.date === todayDate;
                  return (
                    <div
                      key={d.date}
                      className={`rounded-lg border p-2.5 ${
                        isToday
                          ? 'border-neutral-900 ring-1 ring-neutral-900 dark:border-neutral-100 dark:ring-neutral-100'
                          : 'border-neutral-200 dark:border-neutral-800'
                      }`}
                    >
                      <div className="text-[10px] text-neutral-400">{formatDateShort(d.date)}</div>
                      <div className="mt-1 flex items-center gap-1.5">
                        <span className={`h-1.5 w-1.5 rounded-full ${DOT_STYLES[d.dayType]}`} />
                        <span className="text-xs font-medium text-neutral-800 dark:text-neutral-100">
                          {DAY_TYPE_LABEL[d.dayType]}
                        </span>
                      </div>
                      <div className="mt-0.5 truncate text-[10px] text-neutral-400">{daySummary(d)}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
