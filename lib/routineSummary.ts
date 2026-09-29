// Short readable lines for routines: one exercise's sets on a routine card, and
// the "4 exercises · 12 sets · about 30 min" line under a title.
import { exerciseById } from '../data/exercises';
import type { Metric } from '../data/exercises';
import { estimateMinutes, pace } from './routines';
import type { ExerciseLookup, RoutineItem, SetPlan } from './routines';
import { fmtNumber, kgToUnit, kmToUnit } from './units';
import type { DistanceUnit, WeightUnit } from './units';

const num = (v: number | undefined): number => (typeof v === 'number' && Number.isFinite(v) ? v : 0);

const uniq = (values: number[]): number[] => [...new Set(values)];

// "3 × 10 · 5 kg", "3 × 8 to 10 · 5 to 7.5 kg", "3 × 40s", "20 min · 3 km · 6:40 /km",
// "8 × 1 on, 1.5 off".
export function setsSummary(metric: Metric, sets: readonly SetPlan[], units: { weight: WeightUnit; distance: DistanceUnit } = { weight: 'kg', distance: 'km' }): string {
  const n = sets.length;
  const first = sets[0] ?? {};
  if (metric === 'intervals') return `${n} × ${fmtNumber(num(first.on))} on, ${fmtNumber(num(first.off))} off`;
  if (metric === 'distance_time') {
    const dist = first.km ? ` · ${fmtNumber(kmToUnit(first.km, units.distance))} ${units.distance}` : '';
    if (n > 1) return `${n} × ${fmtNumber(num(first.min))} min${dist}`;
    const p = pace(first.min, first.km, units.distance);
    return `${fmtNumber(num(first.min))} min${dist}${p ? ` · ${p}` : ''}`;
  }
  if (metric === 'time') return `${n} × ${fmtNumber(num(first.sec))}s`;

  const reps = uniq(sets.map((s) => num(s.reps)).filter((r) => r > 0));
  const repText = reps.length === 0 ? '' : reps.length === 1 ? String(reps[0]) : `${Math.min(...reps)} to ${Math.max(...reps)}`;
  const head = repText ? `${n} × ${repText}` : `${n} ${n === 1 ? 'set' : 'sets'}`;
  if (metric === 'reps') return head;

  const kgs = uniq(sets.map((s) => kgToUnit(num(s.kg), units.weight)));
  if (Math.max(...kgs) === 0) return head;
  const kg = kgs.length === 1 ? `${fmtNumber(kgs[0])} ${units.weight}` : `${fmtNumber(Math.min(...kgs))} to ${fmtNumber(Math.max(...kgs))} ${units.weight}`;
  return `${head} · ${kg}`;
}

export function countSets(items: readonly Pick<RoutineItem, 'sets'>[]): number {
  return items.reduce((sum, it) => sum + it.sets.length, 0);
}

// "4 exercises · 12 sets · about 30 min".
export function routineMeta(items: RoutineItem[], lookup: ExerciseLookup = exerciseById): string {
  const sets = countSets(items);
  const ex = items.length;
  return `${ex} ${ex === 1 ? 'exercise' : 'exercises'} · ${sets} ${sets === 1 ? 'set' : 'sets'} · about ${estimateMinutes(items, lookup)} min`;
}
