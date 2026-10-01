'use client';

import { BodySvg } from '@/components/ui/MuscleMap';
import { Card, CardHead } from '@/components/ui/Card';
import { XpBar } from '@/components/ui/XpBar';
import { cn } from '@/components/ui/cn';
import { MUSCLES } from '@/data/exercises';
import type { Muscle } from '@/data/exercises';
import { fmtNumber } from '@/lib/units';
import { heatPercent } from '@/lib/muscleStats';
import type { Last7 } from '@/lib/muscleStats';

const HEAT_FEW = `color-mix(in srgb, var(--hi) ${heatPercent(0)}%, var(--muscle))`;

/** A muscle's colour: the resting colour, mixing in more green the more sets it got. */
function heatFill(intensity: Last7['intensity']) {
  return (m: Muscle) => {
    const i = intensity[m];
    return i === undefined ? 'var(--muscle)' : `color-mix(in srgb, var(--hi) ${heatPercent(i)}%, var(--muscle))`;
  };
}

/** Last 7 days body graph: a chip for each day (a dot on training days, "Rest" on rest days), and front and back heat maps. */
export function BodyGraphCard({ stats }: { stats: Last7 }) {
  const fill = heatFill(stats.intensity);
  const any = stats.rows.length > 0;
  return (
    <Card as="section" aria-label="Last 7 days body graph">
      <CardHead title="Last 7 days body graph" />
      <ol className="wt-daychips">
        {stats.days.map((d) => (
          <li
            key={d.date}
            className={cn('wt-dchip', d.trained && 'w', d.rest && 'rest')}
            aria-label={`${d.label} ${d.day}${d.trained ? ', training day' : ''}${d.rest ? ', rest day' : ''}${d.today ? ', today' : ''}`}
          >
            <span aria-hidden="true">{d.label}</span>
            <b aria-hidden="true">{d.day}</b>
            <i aria-hidden="true">{d.rest ? 'Rest' : null}</i>
          </li>
        ))}
      </ol>
      <div className="wt-maps" style={{ marginTop: 16 }}>
        <BodySvg view="front" fillFor={fill} width={120} height={240} label="Front muscles worked" />
        <BodySvg view="back" fillFor={fill} width={120} height={240} label="Back muscles worked" />
      </div>
      <div className="wt-legend">
        <span>
          <i style={{ background: HEAT_FEW }} />A few sets
        </span>
        <span>
          <i style={{ background: 'var(--hi)' }} />
          Most sets
        </span>
      </div>
      {!any && <p className="wt-chart-note" style={{ textAlign: 'center' }}>Nothing trained in the last 7 days. Log a workout and the muscles you work light up.</p>}
    </Card>
  );
}

/** Sets per muscle group as chunky segmented bars. A muscle it also works counts half a set. */
export function MuscleBarsCard({ stats }: { stats: Last7 }) {
  return (
    <Card as="section" aria-label="Sets per muscle group">
      <CardHead title="Sets per muscle group" right={<small style={{ color: 'var(--muted)' }}>Last 7 days</small>} />
      {stats.rows.length === 0 ? (
        <p className="wt-chart-note" style={{ margin: 0 }}>No sets yet. Tick a few sets and they add up here.</p>
      ) : (
        <ul className="wt-mbars">
          {stats.rows.map((r) => (
            <li key={r.muscle} className="wt-mbar">
              <span>{MUSCLES[r.muscle]}</span>
              <XpBar variant="muscle" value={Math.round(r.intensity * 100)} label={`${MUSCLES[r.muscle]}: ${fmtNumber(r.sets)} sets`} />
              <span>{fmtNumber(r.sets)}</span>
            </li>
          ))}
        </ul>
      )}
      <p className="wt-chart-note" style={{ marginBottom: 0 }}>A muscle an exercise also works counts half a set.</p>
    </Card>
  );
}
