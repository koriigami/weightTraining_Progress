'use client';

import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Dumbbell, Flame } from 'lucide-react';
import { WorkoutCard } from '@/components/home/WorkoutCard';
import { useProgress } from '@/components/ProgressProvider';
import { Card, SectionLabel } from '@/components/ui/Card';
import { cn } from '@/components/ui/cn';
import { formatDateLong } from '@/lib/date';
import { monthGrid, monthOf, sessionsByDate, sessionsOn, shiftMonth, trainingDaysInMonth } from '@/lib/monthGrid';
import { WORKOUT_XP } from '@/lib/routines';
import { useToday } from '@/lib/useToday';
import { dayKind, weekSummary } from '@/lib/week';
import type { DayKind } from '@/lib/week';
import { dayMinutes } from '@/lib/workoutScoring';

const DOW = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

const KIND_LABEL: Record<DayKind, string> = { training: 'Training day', rest: 'Rest day', open: '' };

/**
 * The month grid, Monday first. Training days are green and rest days are sand, by the same rule as
 * Home (dayKind). A day with a workout that is not a training day carries a small dot. Tap a day to
 * list its workouts below the grid.
 */
export function MonthCalendar() {
  const { state, lookup, prefs } = useProgress();
  const today = useToday();
  const [month, setMonth] = useState(() => monthOf(today));
  const [selected, setSelected] = useState(today);

  const grid = useMemo(() => monthGrid(month), [month]);
  const byDate = useMemo(() => sessionsByDate(state, lookup), [state, lookup]);
  const week = useMemo(() => weekSummary(state, today), [state, today]);
  const { streak, rules } = week;
  const count = trainingDaysInMonth(rules.training, month);
  const list = sessionsOn(byDate, selected);
  const thisMonth = monthOf(today);
  const selectedKind = dayKind(selected, rules);
  // Minutes trained on the selected day, for the line under a workout that is not a training day.
  const minutes = list.length > 0 && selectedKind !== 'training' ? Math.floor(dayMinutes(state.workouts ?? [], selected, undefined, lookup)) : 0;

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
            <b>{count}</b> training {count === 1 ? 'day' : 'days'}
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
            const kind = dayKind(d.date, rules);
            const kindLabel = KIND_LABEL[kind].toLowerCase();
            return (
              <button
                key={d.date}
                type="button"
                className={cn('wt-dcell', kind === 'training' && 'w', kind === 'rest' && 'rest', n > 0 && kind !== 'training' && 'logged', d.date === today && 'today', d.date === selected && 'sel', d.date > today && 'fut')}
                aria-pressed={d.date === selected}
                aria-label={`${formatDateLong(d.date)}${kindLabel ? `, ${kindLabel}` : ''}${n ? `, ${n} ${n === 1 ? 'workout' : 'workouts'}` : ''}${d.date === today ? ', today' : ''}`}
                onClick={() => setSelected(d.date)}
              >
                <span>{d.day}</span>
              </button>
            );
          })}
        </div>
        <div className="wt-legend wt-callegend">
          <span>
            <i className="w" aria-hidden="true" />
            Training day
          </span>
          <span>
            <i className="r" aria-hidden="true" />
            Rest day
          </span>
          <span>
            <i className="d" aria-hidden="true" />
            Under {WORKOUT_XP.dailyMinutes} min
          </span>
        </div>
        {month !== thisMonth && (
          <div className="wt-monthfoot">
            <button type="button" className="wt-textbtn" onClick={() => { setMonth(thisMonth); setSelected(today); }}>
              Back to today
            </button>
          </div>
        )}
      </Card>

      <SectionLabel>{selectedKind === 'open' ? formatDateLong(selected) : `${formatDateLong(selected)} · ${KIND_LABEL[selectedKind]}`}</SectionLabel>
      {list.length === 0 ? (
        <div className="wt-hint">{selectedKind === 'rest' ? 'Rest day. Nothing logged.' : 'No workout on this day.'}</div>
      ) : (
        <>
          <div className="wt-feed">
            {list.map((item) => (
              <WorkoutCard key={item.id} item={item} units={prefs.units} />
            ))}
          </div>
          {selectedKind !== 'training' && (
            <div className="wt-hint">
              {selected === today
                ? `${minutes} of ${WORKOUT_XP.dailyMinutes} min today. ${Math.max(0, WORKOUT_XP.dailyMinutes - minutes)} more makes it a training day.`
                : `${minutes} of ${WORKOUT_XP.dailyMinutes} min, so this counts as a rest day.`}
            </div>
          )}
        </>
      )}
    </>
  );
}
