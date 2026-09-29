// What a person did with an exercise before: the best earlier set (shown as
// "Previous" in the log) and a small history for the exercise detail.
// Only ticked sets count.
import type { Metric } from '../data/exercises';
import { fmtDistance, fmtNumber, fmtWeight } from './units';
import type { DistanceUnit, WeightUnit } from './units';
import { bestSet } from './workoutScoring';
import type { SetPlan, WorkoutLog } from './routines';

const num = (v: number | undefined): number => (typeof v === 'number' && Number.isFinite(v) ? v : 0);

// The best ticked set of one exercise across the given workouts. Weights and reps:
// heaviest, then most reps. Reps and time: the most. Distance: the farthest.
// Intervals have no best. Null when there is nothing to show.
export function previousBestSet(workouts: readonly WorkoutLog[], exerciseId: string, metric: Metric): SetPlan | null {
  let best: SetPlan | null = null;
  for (const w of workouts) {
    for (const item of w.items) {
      if (item.exerciseId !== exerciseId) continue;
      let cand: SetPlan | null = null;
      if (metric === 'weight_reps') {
        const top = bestSet(item.sets);
        if (top) cand = { kg: top.kg, reps: top.reps };
      } else {
        for (const s of item.sets) {
          if (!s.done) continue;
          if (metric === 'reps' && num(s.reps) > 0 && (!cand || num(s.reps) > num(cand.reps))) cand = { reps: s.reps };
          else if (metric === 'time' && num(s.sec) > 0 && (!cand || num(s.sec) > num(cand.sec))) cand = { sec: s.sec };
          else if (metric === 'distance_time' && num(s.min) + num(s.km) > 0) {
            const better = !cand || num(s.km) > num(cand.km) || (num(s.km) === num(cand.km) && num(s.min) > num(cand.min));
            if (better) cand = { min: s.min, ...(s.km !== undefined ? { km: s.km } : {}) };
          }
        }
      }
      if (cand && (!best || isBetter(metric, cand, best))) best = cand;
    }
  }
  return best;
}

function isBetter(metric: Metric, a: SetPlan, b: SetPlan): boolean {
  switch (metric) {
    case 'weight_reps':
      return num(a.kg) > num(b.kg) || (num(a.kg) === num(b.kg) && num(a.reps) > num(b.reps));
    case 'reps':
      return num(a.reps) > num(b.reps);
    case 'time':
      return num(a.sec) > num(b.sec);
    case 'distance_time':
      return num(a.km) > num(b.km) || (num(a.km) === num(b.km) && num(a.min) > num(b.min));
    default:
      return false;
  }
}

// "5 kg × 12", "12 reps", "40s", "5 km in 30 min". "New" when there is no history.
export function fmtPreviousBest(metric: Metric, set: SetPlan | null, units: { weight: WeightUnit; distance: DistanceUnit }): string {
  if (!set) return 'New';
  switch (metric) {
    case 'weight_reps':
      return `${fmtWeight(num(set.kg), units.weight)} × ${num(set.reps)}`;
    case 'reps':
      return `${num(set.reps)} reps`;
    case 'time':
      return `${num(set.sec)}s`;
    case 'distance_time':
      return set.km ? `${fmtDistance(set.km, units.distance)} in ${fmtNumber(num(set.min))} min` : `${fmtNumber(num(set.min))} min`;
    default:
      return 'New';
  }
}

export type ExerciseHistory = {
  best: SetPlan | null;
  lastDate: string | null; // YYYY-MM-DD of the latest workout with a ticked set
  workouts: number; // workouts with a ticked set of it
};

export function exerciseHistory(workouts: readonly WorkoutLog[], exerciseId: string, metric: Metric): ExerciseHistory {
  let lastDate: string | null = null;
  let count = 0;
  for (const w of workouts) {
    const did = w.items.some((it) => it.exerciseId === exerciseId && it.sets.some((s) => s.done));
    if (!did) continue;
    count++;
    if (lastDate === null || w.date > lastDate) lastDate = w.date;
  }
  return { best: previousBestSet(workouts, exerciseId, metric), lastDate, workouts: count };
}
