'use client';

import { useMemo } from 'react';
import { FEELS, feelSummary } from '@/lib/feel';
import { fmtNumber } from '@/lib/units';
import { useToday } from '@/lib/useToday';
import { useProgress } from '@/components/ProgressProvider';
import { Card, CardHead } from '@/components/ui/Card';

/**
 * Profile: how the last 30 days felt. A bar in the five colours, a legend with the
 * counts, and the average effort. Hidden until a workout in those 30 days has a face or
 * an effort.
 */
export function FeelCard() {
  const { workouts } = useProgress();
  const today = useToday();
  const sum = useMemo(() => feelSummary(workouts, today), [workouts, today]);
  if (sum.rated === 0) return null;
  return (
    <Card aria-label="How workouts felt, last 30 days">
      <CardHead title="How workouts felt, last 30 days" />
      {sum.faces > 0 && (
        <>
          <div className="wt-feelbar" aria-hidden="true">
            {FEELS.filter((f) => sum.counts[f.key] > 0).map((f) => (
              <i key={f.key} style={{ flex: sum.counts[f.key], background: f.colour }} />
            ))}
          </div>
          <div className="wt-feellegend">
            {FEELS.map((f) => (
              <span key={f.key}>
                <i style={{ background: f.colour }} aria-hidden="true" />
                {f.label} {sum.counts[f.key]}
              </span>
            ))}
          </div>
        </>
      )}
      {sum.effortAvg !== null && (
        <small className="wt-feelnote">
          Effort average {fmtNumber(sum.effortAvg)} of 10, on {sum.effortCount} rated {sum.effortCount === 1 ? 'workout' : 'workouts'}
        </small>
      )}
    </Card>
  );
}
