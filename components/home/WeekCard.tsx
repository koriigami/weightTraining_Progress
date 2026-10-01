'use client';

import Link from 'next/link';
import { Check, ChevronRight, Flame } from 'lucide-react';
import type { WeekSummary } from '@/lib/week';
import { cn } from '@/components/ui/cn';

const weekday = (date: string) => new Date(`${date}T12:00:00`).toLocaleDateString('en-US', { weekday: 'long' });

/**
 * This week: M to S days with a tick on each training day, "Rest" on days off (the
 * past ones, and the rest of the week once the goal is met), today ringed, the
 * weekly streak and "N of goal this week" in training days. The whole card opens the calendar.
 */
export function WeekCard({ week }: { week: WeekSummary }) {
  return (
    <Link href="/calendar" className="wt-card wt-weekcard">
      <div className="wt-cardhead">
        <b>This week</b>
        <span className="wt-linkhint">
          Calendar
          <ChevronRight size={16} aria-hidden="true" />
        </span>
      </div>
      <div className="wt-weekrow" role="list" aria-label="Days this week">
        {week.dots.map((d) => (
          <div
            key={d.date}
            role="listitem"
            className={cn('wt-wd', d.done && 'done', d.rest && 'rest', d.today && 'today')}
            aria-label={`${weekday(d.date)} ${d.day}${d.done ? ', training day' : ''}${d.rest ? ', rest day' : ''}${d.today ? ', today' : ''}`}
          >
            <span aria-hidden="true">{d.label}</span>
            <i aria-hidden="true">{d.done ? <Check size={16} /> : d.rest ? 'Rest' : d.day}</i>
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
          {week.count} of {week.goal} training days
        </span>
      </div>
    </Link>
  );
}
