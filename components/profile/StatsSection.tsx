'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { useProgress } from '@/components/ProgressProvider';
import { Card, SectionLabel } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { fmtDistance, fmtVolume } from '@/lib/units';
import { profileTiles } from '@/lib/profileStats';
import { WEEKLY_METRICS, weeklySeries } from '@/lib/weekly';
import type { WeeklyMetric } from '@/lib/weekly';
import { useToday } from '@/lib/useToday';
import { WeeklyChart, chartUnit, chartValue } from './WeeklyChart';

/** Profile > Stats: the weekly chart with XP, Sets and Volume, and four stat tiles. "See all" opens Statistics. */
export function StatsSection() {
  const { state, prefs } = useProgress();
  const today = useToday();
  const [metric, setMetric] = useState<WeeklyMetric>('xp');
  const points = useMemo(() => weeklySeries(state, today), [state, today]);
  const tiles = useMemo(() => profileTiles(state, today), [state, today]);
  const unit = prefs.units.weight;
  const now = points[points.length - 1];

  const lifted = fmtVolume(tiles.volumeKg, unit);
  const stat = [
    { n: String(tiles.workouts), l: 'Workouts' },
    { n: lifted, l: 'Lifted' },
    { n: String(tiles.prs), l: 'PRs' },
    { n: fmtDistance(tiles.cardioKm, prefs.units.distance), l: 'Cardio' },
  ];

  return (
    <section aria-label="Stats" className="wt-stack">
      <div className="wt-sechead">
        <SectionLabel>Stats</SectionLabel>
        <Link href="/stats" className="wt-textbtn sm">
          See all <ChevronRight size={14} aria-hidden="true" />
        </Link>
      </div>
      <Card>
        <div className="wt-chart-head">
          <small>This week</small>
          <div className="wt-chart-big" aria-live="polite">
            {metric === 'volume' ? fmtVolume(now.volumeKg, unit) : `${chartValue(now, metric, unit).toLocaleString('en-US')}${chartUnit(metric, unit)}`}
          </div>
        </div>
        <WeeklyChart points={points} metric={metric} unit={unit} />
        {metric === 'volume' && <small className="wt-chart-note">Volume counts workouts logged with weights.</small>}
        <div className="wt-chips" role="group" aria-label="Chart metric" style={{ marginTop: 14 }}>
          {WEEKLY_METRICS.map((m) => (
            <Chip key={m.id} pressed={metric === m.id} onClick={() => setMetric(m.id)}>
              {m.label}
            </Chip>
          ))}
        </div>
        <div className="wt-stiles">
          {stat.map((s) => (
            <div key={s.l} className="wt-stile">
              <b>{s.n}</b>
              <small>{s.l}</small>
            </div>
          ))}
        </div>
      </Card>
    </section>
  );
}
