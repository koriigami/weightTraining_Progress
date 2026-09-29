'use client';

import { Check, Flame, Target } from 'lucide-react';
import type { WeekSummary } from '@/lib/week';
import { Card, CardHead } from '@/components/ui/Card';
import { cn } from '@/components/ui/cn';

const weekday = (date: string) => new Date(`${date}T12:00:00`).toLocaleDateString('en-US', { weekday: 'long' });

/** This week: M to S dots with today ringed, "N of goal workouts", the weekly streak and the goal. */
export function WeekCard({ week }: { week: WeekSummary }) {
  return (
    <Card aria-label="This week">
      <CardHead title="This week" right={<span style={{ color: 'var(--muted)' }}>{week.count} of {week.goal} workouts</span>} />
      <div className="wt-weekrow" role="list" aria-label="Days this week">
        {week.dots.map((d) => (
          <div key={d.date} role="listitem" className={cn('wt-wd', d.done && 'done', d.today && 'today')} aria-label={`${weekday(d.date)} ${d.day}${d.done ? ', trained' : ''}${d.today ? ', today' : ''}`}>
            <span aria-hidden="true">{d.label}</span>
            <i aria-hidden="true">{d.done ? <Check size={16} /> : d.day}</i>
          </div>
        ))}
      </div>
      <div className="wt-streakrow">
        <span>
          <span className="wt-flame">
            <Flame size={18} aria-hidden="true" />
          </span>
          {week.streak} week streak
        </span>
        <span style={{ color: 'var(--muted)' }}>
          <Target size={18} aria-hidden="true" />
          Goal {week.goal} a week
        </span>
      </div>
    </Card>
  );
}
