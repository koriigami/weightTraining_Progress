'use client';

import { useId } from 'react';
import { metricValue, niceMax, weekLabels } from '@/lib/weekly';
import type { WeekPoint, WeeklyMetric } from '@/lib/weekly';
import { kgToUnit } from '@/lib/units';
import type { WeightUnit } from '@/lib/units';

const X0 = 34;
const X1 = 314;
const Y0 = 22;
const Y1 = 124;
const BAR_W = 22;

const fmt = (n: number) => Math.round(n).toLocaleString('en-US');

/** A week's value in what the person sees: XP, sets, or volume in their weight unit. */
export function chartValue(p: WeekPoint, metric: WeeklyMetric, unit: WeightUnit): number {
  const v = metricValue(p, metric);
  return metric === 'volume' ? kgToUnit(v, unit) : v;
}

export function chartUnit(metric: WeeklyMetric, unit: WeightUnit): string {
  return metric === 'xp' ? ' XP' : metric === 'sets' ? ' sets' : ` ${unit}`;
}

/**
 * The weekly chart in the 3D game look: chunky pillars on a sunken panel. This
 * week is gold with a crown and a glow, past weeks are green, and an empty week
 * is a flat stub. Day numbers sit under the bars, with the month shown once.
 */
export function WeeklyChart({ points, metric, unit }: { points: WeekPoint[]; metric: WeeklyMetric; unit: WeightUnit }) {
  const uid = useId().replace(/:/g, '');
  const data = points.map((p) => chartValue(p, metric, unit));
  const max = niceMax(data);
  const slot = (X1 - X0) / points.length;
  const y = (v: number) => Y1 - (v / max) * (Y1 - Y0);
  const labels = weekLabels(points);
  const label = `Weekly ${metric === 'xp' ? 'XP' : metric}, last ${points.length} weeks. ${points
    .map((p, i) => `Week of ${labels[i].month ?? ''} ${labels[i].day}: ${fmt(data[i])}`)
    .join('. ')}.`;

  return (
    <div className="wt-chart-panel">
      <svg className="wt-chart" viewBox="0 0 320 154" width="100%" role="img" aria-label={label}>
        <defs>
          <linearGradient id={`${uid}g`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#2E9E36" />
            <stop offset=".38" stopColor="#7EE36A" />
            <stop offset="1" stopColor="#23862C" />
          </linearGradient>
          <linearGradient id={`${uid}y`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#E29A0C" />
            <stop offset=".38" stopColor="#FFE27A" />
            <stop offset="1" stopColor="#C98208" />
          </linearGradient>
          <radialGradient id={`${uid}r`}>
            <stop offset="0" stopColor="#FFE27A" stopOpacity=".9" />
            <stop offset="1" stopColor="#FFE27A" stopOpacity="0" />
          </radialGradient>
        </defs>
        {[max / 2, max].map((t) => (
          <g key={t}>
            <line x1={X0} x2={X1} y1={y(t)} y2={y(t)} stroke="#D7BA7C" strokeWidth="1" strokeDasharray="3 4" />
            <text className="ax" x={X0 - 6} y={y(t) + 3} textAnchor="end">
              {t.toLocaleString('en-US')}
            </text>
          </g>
        ))}
        <text className="ax" x={X0 - 6} y={Y1 + 3} textAnchor="end">
          0
        </text>
        <rect x={X0} y={Y1} width={X1 - X0} height="4" rx="2" fill="#C9A566" />
        {data.map((d, i) => {
          const cx = X0 + slot * i + slot / 2;
          const cur = points[i].current;
          const lab = (
            <>
              <text className="ax" x={cx} y={Y1 + 16} textAnchor="middle">
                {labels[i].day}
              </text>
              {labels[i].month && (
                <text className="ax" x={cx} y={Y1 + 27} textAnchor="middle" style={{ fontWeight: 800 }}>
                  {labels[i].month}
                </text>
              )}
            </>
          );
          if (!d) {
            return (
              <g key={points[i].monday}>
                <rect x={cx - BAR_W / 2} y={Y1 - 5} width={BAR_W} height="5" rx="2.5" fill="#E3CC9A" stroke="#C9A566" strokeWidth="1" />
                {lab}
              </g>
            );
          }
          const h = Math.max(10, Y1 - y(d));
          const top = Y1 - h;
          return (
            <g key={points[i].monday}>
              {cur && <ellipse cx={cx} cy={top + h / 2} rx={BAR_W} ry={h / 2 + 12} fill={`url(#${uid}r)`} />}
              <rect x={cx - BAR_W / 2} y={top + 3} width={BAR_W} height={h - 3} rx="6" fill="rgba(0,0,0,.25)" />
              <rect x={cx - BAR_W / 2} y={top} width={BAR_W} height={h - 3} rx="6" fill={`url(#${uid}${cur ? 'y' : 'g'})`} stroke="#3A230C" strokeWidth="1.6" />
              <rect x={cx - BAR_W / 2 + 4} y={top + 3} width={BAR_W - 8} height="5" rx="2.5" fill="#fff" opacity=".55" />
              {cur && (
                <>
                  <g transform={`translate(${cx - 9} ${top - 38})`} style={{ color: '#F5B41A' }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M3 18h18l-1.5-10-5 4L12 5l-2.5 7-5-4Z" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
                    </svg>
                  </g>
                  <text className="val" x={cx} y={top - 8} textAnchor="middle">
                    {fmt(d)}
                  </text>
                </>
              )}
              {lab}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
