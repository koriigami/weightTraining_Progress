// A short readable line for one set, by metric: "5 kg × 10", "12 reps", "40s",
// "20 min, 3 km" or "1 min on, 1 min off". Weights and distances follow the
// user's units. A bare distance unit still works, for older callers.
import type { Metric } from '../data/exercises';
import { pace } from './routines';
import type { SetPlan } from './routines';
import { fmtDistance, fmtNumber, fmtWeight } from './units';
import type { DistanceUnit, WeightUnit } from './units';

export function fmtSetSummary(metric: Metric, s: SetPlan, units: { weight: WeightUnit; distance: DistanceUnit } | DistanceUnit = 'km'): string {
  const u = typeof units === 'string' ? { weight: 'kg' as const, distance: units } : units;
  switch (metric) {
    case 'weight_reps':
      return `${fmtWeight(s.kg ?? 0, u.weight)} × ${s.reps ?? 0}`;
    case 'reps':
      return s.reps === undefined ? 'Max reps' : `${s.reps} reps`;
    case 'time':
      return `${s.sec ?? 0}s`;
    case 'intervals':
      return `${fmtNumber(s.on ?? 0)} min on, ${fmtNumber(s.off ?? 0)} min off`;
    case 'distance_time': {
      const p = pace(s.min, s.km, u.distance);
      return `${fmtNumber(s.min ?? 0)} min${s.km ? `, ${fmtDistance(s.km, u.distance)}` : ''}${p ? `, ${p}` : ''}`;
    }
  }
}
