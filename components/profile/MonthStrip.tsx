'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { useProgress } from '@/components/ProgressProvider';
import { Card, SectionLabel } from '@/components/ui/Card';
import { cn } from '@/components/ui/cn';
import { monthGrid, monthOf, sessionsByDate, trainingDaysInMonth } from '@/lib/monthGrid';
import { useToday } from '@/lib/useToday';
import { weekSummary } from '@/lib/week';

/** This month: a compact heat strip, one square per day, and a link to the full Calendar. */
export function MonthStrip() {
  const { state, lookup } = useProgress();
  const today = useToday();
  const month = monthOf(today);
  const grid = useMemo(() => monthGrid(month), [month]);
  const byDate = useMemo(() => sessionsByDate(state, lookup), [state, lookup]);
  const week = useMemo(() => weekSummary(state, today), [state, today]);
  const count = trainingDaysInMonth(week.rules.training, month);
  const streak = week.streak;
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
        <div className="wt-monthstrip" role="img" aria-label={`${grid.label}: ${count} training ${count === 1 ? 'day' : 'days'}`}>
          {grid.days.map((d) => (
            <i key={d.date} className={cn(byDate.has(d.date) && 'w', d.date === today && 't', d.date > today && 'f')} title={`${name} ${d.day}`} />
          ))}
        </div>
        <small className="wt-chart-note" style={{ marginTop: 10 }}>
          {count} training {count === 1 ? 'day' : 'days'} in {name} · {streak} week streak
        </small>
      </Card>
    </section>
  );
}
