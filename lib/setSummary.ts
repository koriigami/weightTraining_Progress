// A short readable line for one set, by metric: "5 kg × 10", "12 reps", "40s",
// "20 min, 3 km" or "1 min on, 1 min off".
import type { Metric } from '../data/exercises';
import { pace } from './routines';
import type { SetPlan } from './routines';

export function fmtSetSummary(metric: Metric, s: SetPlan, distanceUnit: 'km' | 'mi' = 'km'): string {
  switch (metric) {
    case 'weight_reps':
      return `${s.kg ?? 0} kg × ${s.reps ?? 0}`;
    case 'reps':
      return `${s.reps ?? 0} reps`;
    case 'time':
      return `${s.sec ?? 0}s`;
    case 'intervals':
      return `${s.on ?? 0} min on, ${s.off ?? 0} min off`;
    case 'distance_time': {
      const p = pace(s.min, s.km, distanceUnit);
      return `${s.min ?? 0} min${s.km ? `, ${s.km} km` : ''}${p ? `, ${p}` : ''}`;
    }
  }
}
