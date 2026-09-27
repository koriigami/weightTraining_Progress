'use client';

import { useEffect, useState } from 'react';
import { plan, WorkoutDay } from '@/data/plan';
import { DayCard } from './DayCard';
import { ProgressBar } from './ProgressBar';
import { getTodayOrClosest, formatDateShort } from '@/lib/date';

const DOT_STYLES: Record<WorkoutDay['dayType'], string> = {
  'push-a': 'bg-orange-400',
  'push-b': 'bg-amber-400',
  'pull-a': 'bg-blue-400',
  'pull-b': 'bg-sky-400',
  legs: 'bg-emerald-400',
  'full-body': 'bg-purple-400',
  rest: 'bg-neutral-300 dark:bg-neutral-600',
  'pre-start': 'bg-neutral-200 dark:bg-neutral-700',
};

const SHORT_LABEL: Record<WorkoutDay['dayType'], string> = {
  'push-a': 'Push A',
  'push-b': 'Push B',
  'pull-a': 'Pull A',
  'pull-b': 'Pull B',
  legs: 'Legs',
  'full-body': 'Full Body',
  rest: 'Rest',
  'pre-start': '·',
};

const MILESTONE_WEEKS = new Set([3, 5]);
const DOW_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

function dayOfMonth(date: string): number {
  return Number(date.slice(8, 10));
}

export function Calendar() {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  useEffect(() => {
    setSelectedDate(getTodayOrClosest().day.date);
  }, []);

  if (selectedDate === null) {
    return <div className="h-96" />;
  }

  const todayDate = getTodayOrClosest().day.date;
  const todayIndex = plan.findIndex((d) => d.date === todayDate);
  const daysToEnd = plan.length - 1 - todayIndex;

  const selectedDay = plan.find((d) => d.date === selectedDate)!;
  const selectedWeek = selectedDay.weekNumber;
  const weekNumbers = Array.from(new Set(plan.map((d) => d.weekNumber)));
  const thisWeekDays = plan.filter((d) => d.weekNumber === selectedWeek);

  function selectByWeekOffset(weeksDelta: number) {
    const dowIndex = thisWeekDays.findIndex((d) => d.date === selectedDate);
    const targetWeekDays = plan.filter((d) => d.weekNumber === selectedWeek + weeksDelta);
    if (targetWeekDays.length === 0) return;
    setSelectedDate(targetWeekDays[dowIndex].date);
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-xs text-neutral-500 dark:text-neutral-400">
            Week {plan[todayIndex].weekNumber} of 6 · Day {todayIndex + 1} of {plan.length}
          </span>
          <span className="text-xs text-neutral-400 dark:text-neutral-500">
            {daysToEnd > 0 ? `${daysToEnd} days to Nov 1` : 'Final day'}
          </span>
        </div>
        <ProgressBar current={todayIndex + 1} total={plan.length} />
      </div>

      {/* Desktop: full 6-week grid + side detail */}
      <div className="hidden gap-6 md:grid md:grid-cols-5">
        <div className="md:col-span-3">
          <div className="space-y-3">
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
                      const isSelected = d.date === selectedDate;
                      return (
                        <button
                          key={d.date}
                          onClick={() => setSelectedDate(d.date)}
                          className={`rounded-lg border p-2 text-left transition-colors ${
                            isSelected
                              ? 'border-neutral-900 ring-1 ring-neutral-900 dark:border-neutral-100 dark:ring-neutral-100'
                              : 'border-neutral-200 hover:border-neutral-300 dark:border-neutral-800 dark:hover:border-neutral-700'
                          } ${isToday ? 'bg-neutral-100 dark:bg-neutral-900' : 'bg-white dark:bg-neutral-950'}`}
                        >
                          <div className="text-[10px] text-neutral-400">{dayOfMonth(d.date)}</div>
                          <div className="mt-1 flex items-center gap-1.5">
                            <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${DOT_STYLES[d.dayType]}`} />
                            <span className="truncate text-xs font-medium text-neutral-800 dark:text-neutral-100">
                              {SHORT_LABEL[d.dayType]}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        <div className="md:col-span-2">
          <div className="sticky top-4">
            <DayCard day={selectedDay} />
          </div>
        </div>
      </div>

      {/* Mobile: current-week strip + detail below */}
      <div className="space-y-3 md:hidden">
        <div className="flex items-center justify-between">
          <button
            onClick={() => selectByWeekOffset(-1)}
            disabled={selectedWeek === 1}
            aria-label="Previous week"
            className="flex h-11 w-11 items-center justify-center rounded-lg text-lg text-neutral-500 disabled:opacity-30 dark:text-neutral-400"
          >
            ‹
          </button>
          <div className="text-center">
            <div className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">
              Week {selectedWeek} of 6
            </div>
            <div className="text-xs text-neutral-400">
              {formatDateShort(thisWeekDays[0].date)} – {formatDateShort(thisWeekDays[6].date)}
            </div>
          </div>
          <button
            onClick={() => selectByWeekOffset(1)}
            disabled={selectedWeek === 6}
            aria-label="Next week"
            className="flex h-11 w-11 items-center justify-center rounded-lg text-lg text-neutral-500 disabled:opacity-30 dark:text-neutral-400"
          >
            ›
          </button>
        </div>

        {MILESTONE_WEEKS.has(selectedWeek) && (
          <div className="flex justify-center">
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700 dark:bg-amber-500/15 dark:text-amber-300">
              MILESTONE WEEK
            </span>
          </div>
        )}

        <div className="grid grid-cols-7 gap-1.5">
          {thisWeekDays.map((d, i) => {
            const isToday = d.date === todayDate;
            const isSelected = d.date === selectedDate;
            return (
              <button
                key={d.date}
                onClick={() => setSelectedDate(d.date)}
                className={`flex min-h-[56px] flex-col items-center justify-center gap-1 rounded-xl border py-2 ${
                  isSelected
                    ? 'border-neutral-900 bg-neutral-900 text-white dark:border-neutral-100 dark:bg-neutral-100 dark:text-neutral-900'
                    : isToday
                      ? 'border-neutral-300 bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-900'
                      : d.dayType === 'pre-start'
                        ? 'border-neutral-100 opacity-40 dark:border-neutral-900'
                        : 'border-neutral-200 dark:border-neutral-800'
                }`}
              >
                <span className="text-[10px] font-medium uppercase tracking-wide opacity-70">{DOW_LABELS[i]}</span>
                <span className="text-sm font-semibold">{dayOfMonth(d.date)}</span>
                <span
                  className={`h-1.5 w-1.5 rounded-full ${isSelected ? 'bg-white dark:bg-neutral-900' : DOT_STYLES[d.dayType]}`}
                />
              </button>
            );
          })}
        </div>

        {selectedDate !== todayDate && (
          <button
            onClick={() => setSelectedDate(todayDate)}
            className="w-full rounded-lg border border-neutral-200 py-2.5 text-xs font-medium text-neutral-500 dark:border-neutral-800 dark:text-neutral-400"
          >
            Jump to Today
          </button>
        )}

        <DayCard day={selectedDay} />
      </div>
    </div>
  );
}
