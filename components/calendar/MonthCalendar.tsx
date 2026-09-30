'use client';

import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Dumbbell, Flame } from 'lucide-react';
import { WorkoutCard } from '@/components/home/WorkoutCard';
import { useProgress } from '@/components/ProgressProvider';
import { Card, SectionLabel } from '@/components/ui/Card';
import { cn } from '@/components/ui/cn';
import { formatDateLong } from '@/lib/date';
import { monthGrid, monthOf, monthSessionCount, sessionsByDate, sessionsOn, shiftMonth } from '@/lib/monthGrid';
import { useToday } from '@/lib/useToday';
import { weekSummary } from '@/lib/week';

const DOW = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

/**
 * The month grid, Monday first. Every day with a finished workout is marked. Tap a day to list its
 * workouts below the grid.
 */
export function MonthCalendar() {
  const { state, lookup, prefs } = useProgress();
  const today = useToday();
  const [month, setMonth] = useState(() => monthOf(today));
  const [selected, setSelected] = useState(today);

  const grid = useMemo(() => monthGrid(month), [month]);
  const byDate = useMemo(() => sessionsByDate(state, lookup), [state, lookup]);
  const streak = useMemo(() => weekSummary(state, today).streak, [state, today]);
  const count = monthSessionCount(byDate, month);
  const list = sessionsOn(byDate, selected);
  const thisMonth = monthOf(today);

  return (
    <>
      <Card tone="flush">
        <div className="wt-calhead">
          <div>
            <span className="wt-flame">
              <Flame size={20} aria-hidden="true" />
            </span>
            <b>{streak} week streak</b>
          </div>
          <div>
            <Dumbbell size={20} aria-hidden="true" />
            <b>{count}</b> {month === thisMonth ? 'this month' : 'that month'}
          </div>
        </div>
        <div className="wt-monthnav">
          <button type="button" className="wt-backbtn" aria-label="Previous month" onClick={() => setMonth(shiftMonth(month, -1))}>
            <ChevronLeft size={20} strokeWidth={2.4} aria-hidden="true" />
          </button>
          <h2 aria-live="polite">{grid.label}</h2>
          <button type="button" className="wt-backbtn" aria-label="Next month" onClick={() => setMonth(shiftMonth(month, 1))}>
            <ChevronRight size={20} strokeWidth={2.4} aria-hidden="true" />
          </button>
        </div>
        <div className="wt-mgrid" role="group" aria-label={grid.label}>
          {DOW.map((d, i) => (
            <span key={i} className="wt-dow" aria-hidden="true">
              {d}
            </span>
          ))}
          {Array.from({ length: grid.leading }, (_, i) => (
            <span key={`b${i}`} aria-hidden="true" />
          ))}
          {grid.days.map((d) => {
            const n = sessionsOn(byDate, d.date).length;
            return (
              <button
                key={d.date}
                type="button"
                className={cn('wt-dcell', n > 0 && 'w', d.date === today && 'today', d.date === selected && 'sel', d.date > today && 'fut')}
                aria-pressed={d.date === selected}
                aria-label={`${formatDateLong(d.date)}${n ? `, ${n} ${n === 1 ? 'workout' : 'workouts'}` : ''}${d.date === today ? ', today' : ''}`}
                onClick={() => setSelected(d.date)}
              >
                <span>{d.day}</span>
              </button>
            );
          })}
        </div>
        {month !== thisMonth && (
          <div className="wt-monthfoot">
            <button type="button" className="wt-textbtn" onClick={() => { setMonth(thisMonth); setSelected(today); }}>
              Back to today
            </button>
          </div>
        )}
      </Card>

      <SectionLabel>{formatDateLong(selected)}</SectionLabel>
      {list.length === 0 ? (
        <div className="wt-hint">No workout on this day.</div>
      ) : (
        <div className="wt-feed">
          {list.map((item) => (
            <WorkoutCard key={item.id} item={item} units={prefs.units} />
          ))}
        </div>
      )}
    </>
  );
}
