'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { useProgress } from '@/components/ProgressProvider';
import { Card, SectionLabel } from '@/components/ui/Card';
import { cn } from '@/components/ui/cn';
import { monthGrid, monthOf, trainingDaysInMonth } from '@/lib/monthGrid';
import { useToday } from '@/lib/useToday';
import { dayKind, weekSummary } from '@/lib/week';

const plural = (n: number, one: string, many: string) => (n === 1 ? one : many);

/**
 * This month: a compact strip, one square per day (green for a training day, sand for a rest day,
 * by the same rule as Home), and a link to the full Calendar.
 */
export function MonthStrip() {
  const { state } = useProgress();
  const today = useToday();
  const month = monthOf(today);
  const grid = useMemo(() => monthGrid(month), [month]);
  const week = useMemo(() => weekSummary(state, today), [state, today]);
  const { streak, rules } = week;
  const count = trainingDaysInMonth(rules.training, month);
  const kinds = useMemo(() => grid.days.map((d) => dayKind(d.date, rules)), [grid, rules]);
  // Rest days so far: the ones up to today (a rest day still to come is not counted).
  const restSoFar = grid.days.reduce((n, d, i) => (d.date < today && kinds[i] === 'rest' ? n + 1 : n), 0);
  const name = grid.label.split(' ')[0];

  return (
    <section aria-label="This month" className="wt-stack">
      <div className="wt-sechead">
        <SectionLabel>This month</SectionLabel>
        <Link href="/calendar" className="wt-textbtn sm">
          Calendar <ChevronRight size={14} aria-hidden="true" />
        </Link>
      </div>
      <Card>
        <div
          className="wt-monthstrip"
          role="img"
          aria-label={`${grid.label}: ${count} training ${plural(count, 'day', 'days')} and ${restSoFar} rest ${plural(restSoFar, 'day', 'days')} so far`}
        >
          {grid.days.map((d, i) => (
            <i key={d.date} className={cn(kinds[i] === 'training' && 'w', kinds[i] === 'rest' && 'r', d.date === today && 't', d.date > today && 'f')} title={`${name} ${d.day}`} />
          ))}
        </div>
        <div className="wt-legend" style={{ justifyContent: 'flex-start', marginTop: 10 }}>
          <span>
            <i className="w" aria-hidden="true" />
            Training day
          </span>
          <span>
            <i className="r" aria-hidden="true" />
            Rest day
          </span>
        </div>
        <small className="wt-chart-note" style={{ marginTop: 10 }}>
          {count} training {plural(count, 'day', 'days')} in {name} · {streak} week streak
        </small>
      </Card>
    </section>
  );
}
