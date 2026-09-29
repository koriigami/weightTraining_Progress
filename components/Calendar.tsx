'use client';

import { useEffect, useState } from 'react';
import { plan, WorkoutDay } from '@/data/plan';
import { DayCard } from './DayCard';
import { ProgressBar } from './ProgressBar';
import { Button } from '@/components/ui/Button';
import { getTodayOrClosest, formatDateShort } from '@/lib/date';
import { useProgress } from './ProgressProvider';
import { dayDoneCount, dayItemCount, isDayCleared, isPerfectDay } from '@/lib/progress';

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

function MiniRing({ frac }: { frac: number }) {
  const size = 14;
  const stroke = 2.5;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--line)" strokeWidth={stroke} />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="var(--accent)"
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={`${(c * frac).toFixed(1)} ${c.toFixed(1)}`}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
    </svg>
  );
}

function CellStatus({ day, isSelected }: { day: WorkoutDay; isSelected: boolean }) {
  const { state } = useProgress();
  const isWorkoutDay = day.dayType !== 'rest' && day.dayType !== 'pre-start';
  if (!isWorkoutDay) return null;
  const log = state.days[day.date];
  const total = dayItemCount(day);
  const done = dayDoneCount(day, log);
  if (done === 0) return null;
  const perfect = isPerfectDay(day, log);
  const cleared = isDayCleared(day, log);
  const starColor = isSelected ? '#fff' : '#B8860B';
  const checkColor = isSelected ? '#fff' : 'var(--ok)';
  if (perfect) {
    return (
      <span aria-label="Perfect day" style={{ color: starColor }} className="text-[11px] leading-none">
        &#9733;
      </span>
    );
  }
  if (cleared) {
    return (
      <span aria-label="Cleared" style={{ color: checkColor }} className="text-[10px] leading-none">
        &#10003;
      </span>
    );
  }
  return <MiniRing frac={total > 0 ? done / total : 0} />;
}

export function Calendar() {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const { state } = useProgress();

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
          <span className="text-xs" style={{ color: 'var(--muted)' }}>
            Week {plan[todayIndex].weekNumber} of 6 &middot; Day {todayIndex + 1} of {plan.length}
          </span>
          <span className="text-xs" style={{ color: 'var(--muted)' }}>
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
                    <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--muted)' }}>
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
                          className="rounded-lg border p-2 text-left transition-colors"
                          style={{
                            borderColor: isSelected ? 'var(--p-bevel)' : 'var(--line)',
                            background: isSelected ? 'var(--chip-on)' : isToday ? 'var(--surface-2)' : 'var(--surface)',
                          }}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-[10px]" style={{ color: isSelected ? 'rgba(255,255,255,.7)' : 'var(--muted)' }}>
                              {dayOfMonth(d.date)}
                            </span>
                            <CellStatus day={d} isSelected={isSelected} />
                          </div>
                          <div className="mt-1 flex items-center gap-1.5">
                            <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${DOT_STYLES[d.dayType]}`} />
                            <span
                              className="truncate text-xs font-medium"
                              style={{ color: isSelected ? '#fff' : 'var(--ink)' }}
                            >
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
          <div className="sticky top-20">
            <DayCard day={selectedDay} />
          </div>
        </div>
      </div>

      {/* Mobile: current-week strip + detail below */}
      <div className="space-y-3 md:hidden" data-testid="mobile-calendar">
        <div className="flex items-center justify-between">
          <button
            onClick={() => selectByWeekOffset(-1)}
            disabled={selectedWeek === 1}
            aria-label="Previous week"
            className="flex h-11 w-11 items-center justify-center rounded-lg text-lg disabled:opacity-30"
            style={{ color: 'var(--muted)' }}
          >
            &lsaquo;
          </button>
          <div className="text-center">
            <div className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>
              Week {selectedWeek} of 6
            </div>
            <div className="text-xs" style={{ color: 'var(--muted)' }}>
              {formatDateShort(thisWeekDays[0].date)} &ndash; {formatDateShort(thisWeekDays[6].date)}
            </div>
          </div>
          <button
            onClick={() => selectByWeekOffset(1)}
            disabled={selectedWeek === 6}
            aria-label="Next week"
            className="flex h-11 w-11 items-center justify-center rounded-lg text-lg disabled:opacity-30"
            style={{ color: 'var(--muted)' }}
          >
            &rsaquo;
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
                className="flex min-h-[58px] flex-col items-center justify-center gap-1 rounded-xl border py-2"
                style={{
                  borderColor: isSelected ? 'var(--p-bevel)' : isToday ? 'var(--xp)' : 'var(--line)',
                  background: isSelected ? 'var(--chip-on)' : isToday ? 'var(--surface-2)' : 'var(--surface)',
                  color: isSelected ? '#fff' : 'var(--ink)',
                  opacity: d.dayType === 'pre-start' && !isSelected ? 0.4 : 1,
                }}
              >
                <span className="text-[10px] font-medium uppercase tracking-wide opacity-70">{DOW_LABELS[i]}</span>
                <span className="text-sm font-semibold">{dayOfMonth(d.date)}</span>
                <span className="flex h-3.5 items-center justify-center">
                  <CellStatus day={d} isSelected={isSelected} />
                  {!state.days[d.date] && (
                    <span className={`h-1.5 w-1.5 rounded-full ${isSelected ? 'bg-white' : DOT_STYLES[d.dayType]}`} />
                  )}
                </span>
              </button>
            );
          })}
        </div>

        {selectedDate !== todayDate && (
          <Button variant="secondary" size="sm" block onClick={() => setSelectedDate(todayDate)}>
            Jump to today
          </Button>
        )}

        <DayCard day={selectedDay} />
      </div>
    </div>
  );
}
