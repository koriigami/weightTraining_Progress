'use client';

import { useId } from 'react';
import { Lock } from 'lucide-react';
import type { Bucket, CountBucket, RankBucket, WeekBar } from '@/lib/insights';
import { MIN_GROUP } from '@/lib/insights';
import { niceMax } from '@/lib/weekly';

const W = 460;
const H = 190;
const PT = 26;
const PB = 26;
const BAR_W = 30;

const monthDay = (monday: string) => new Date(`${monday}T00:00:00Z`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });

/**
 * Active people each week, in the app's 3D bar look: one series, this week in
 * gold, value labels on the bars. A week with fewer than 5 people is a dashed
 * stub with a lock instead of a number.
 */
export function WeekBars({ weeks, min = MIN_GROUP }: { weeks: WeekBar[]; min?: number }) {
  const uid = useId().replace(/:/g, '');
  const max = niceMax(weeks.map((w) => w.people ?? 0));
  const y = (v: number) => PT + (H - PT - PB) * (1 - v / max);
  const slot = (W - 20) / weeks.length;
  const bw = Math.min(BAR_W, slot - 4);
  // Label roughly every other week when there are many.
  const every = weeks.length > 16 ? 4 : weeks.length > 8 ? 2 : 1;
  const label = `Active people each week. ${weeks.map((w) => `Week of ${monthDay(w.monday)}: ${w.people === null ? `hidden, fewer than ${min} people` : w.people}`).join('. ')}.`;

  return (
    <div className="wt-chart-panel">
      <svg className="wt-chart" viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label={label}>
        <defs>
          <linearGradient id={`${uid}g`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#86EA64" />
            <stop offset="1" stopColor="#2BA438" />
          </linearGradient>
          <linearGradient id={`${uid}y`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#FFE68F" />
            <stop offset="1" stopColor="#F2B940" />
          </linearGradient>
        </defs>
        {[0, max / 2, max].map((t) => (
          <line key={t} x1="10" x2={W - 10} y1={y(t)} y2={y(t)} stroke="rgba(125,101,69,.25)" strokeDasharray="3 4" />
        ))}
        {weeks.map((w, i) => {
          const cx = 10 + slot * i + slot / 2;
          const x = cx - bw / 2;
          const axis =
            i % every === 0 || w.current ? (
              <text className="ax" x={cx} y={H - 8} textAnchor="middle">
                {monthDay(w.monday)}
              </text>
            ) : null;
          if (w.people === null) {
            return (
              <g key={w.monday}>
                <title>{`${monthDay(w.monday)}: fewer than ${min} people`}</title>
                <rect x={x} y={H - PB - 5} width={bw} height="5" rx="2.5" fill="none" stroke="#C9A566" strokeWidth="1.2" strokeDasharray="3 2" />
                <g transform={`translate(${cx - 6} ${H - PB - 22})`} style={{ color: '#7D6545' }} aria-hidden="true">
                  <rect x="1.5" y="6" width="9" height="7" rx="1.6" fill="currentColor" />
                  <path d="M3.5 6V4.2a2.5 2.5 0 0 1 5 0V6" fill="none" stroke="currentColor" strokeWidth="1.5" />
                </g>
                {axis}
              </g>
            );
          }
          const top = w.people === 0 ? H - PB - 5 : y(w.people);
          const h = H - PB - top;
          return (
            <g key={w.monday}>
              <title>{`${monthDay(w.monday)}: ${w.people} active ${w.people === 1 ? 'person' : 'people'}`}</title>
              <rect x={x} y={top} width={bw} height={h} rx="4" fill={w.people === 0 ? '#E3CC9A' : `url(#${uid}${w.current ? 'y' : 'g'})`} stroke="#3A230C" strokeWidth={w.people === 0 ? 1 : 1.6} />
              {w.people > 0 && (
                <>
                  <rect x={x + 4} y={top + 3} width={bw - 8} height="4" rx="2" fill="#fff" opacity=".55" />
                  <text className="val" x={cx} y={top - 6} textAnchor="middle">
                    {w.people}
                  </text>
                </>
              )}
              {axis}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

/** A horizontal bar row. A null value is a dashed empty track with a lock. */
export function HBar({ label, value, max, unit = '', min = MIN_GROUP }: { label: string; value: number | null; max: number; unit?: string; min?: number }) {
  if (value === null) {
    return (
      <div className="wt-hbar hid" title={`${label}: fewer than ${min} people`}>
        <span>{label}</span>
        <span className="t" />
        <span aria-label={`Hidden, fewer than ${min} people`}>
          <Lock size={14} aria-hidden="true" />
        </span>
      </div>
    );
  }
  return (
    <div className="wt-hbar" title={`${label}: ${value}${unit}`}>
      <span>{label}</span>
      <span className="t">
        <i style={{ width: `${max > 0 ? Math.round((value / max) * 100) : 0}%` }} />
      </span>
      <span>
        {value}
        {unit}
      </span>
    </div>
  );
}

export function BucketBars({ items, max, min = MIN_GROUP }: { items: Bucket[]; max: number; min?: number }) {
  return (
    <>
      {items.map((b) => (
        <HBar key={b.label} label={b.label} value={b.people} max={max} min={min} />
      ))}
    </>
  );
}

/** Bars for counts of workouts rather than people. */
export function CountBars({ items, min = MIN_GROUP }: { items: CountBucket[]; min?: number }) {
  const max = Math.max(1, ...items.map((i) => i.count ?? 0));
  return (
    <>
      {items.map((b) => (
        <HBar key={b.label} label={b.label} value={b.count} max={max} min={min} />
      ))}
    </>
  );
}

export function RankBars({ items, min = MIN_GROUP }: { items: RankBucket[]; min?: number }) {
  const max = Math.max(1, ...items.map((r) => r.days ?? 0));
  return (
    <>
      {items.map((r) => (
        <HBar key={r.label} label={r.label} value={r.days} max={max} unit=" d" min={min} />
      ))}
    </>
  );
}
