// The columns of a set table for each kind of exercise, and how a typed number
// maps to the stored one (kg and km are stored, the user may see lb and mi).
import type { Metric } from '../data/exercises';
import { pace } from './routines';
import type { SetPlan } from './routines';
import type { SetPatch } from './session';
import { distanceLabel, fmtNumber, kgToUnit, kmToUnit, unitToKg, unitToKm, weightLabel } from './units';
import type { DistanceUnit, WeightUnit } from './units';

export type Units = { weight: WeightUnit; distance: DistanceUnit };

export type SetColumn = { key: keyof SetPlan; label: string; kind: 'weight' | 'distance' | 'plain' };

// weight_reps: Kg and Reps. reps: Reps. time: Seconds. distance_time: Min and Km.
// intervals: Work min and Easy min.
export function setColumns(metric: Metric, units: Units): SetColumn[] {
  switch (metric) {
    case 'weight_reps':
      return [
        { key: 'kg', label: weightLabel(units.weight), kind: 'weight' },
        { key: 'reps', label: 'Reps', kind: 'plain' },
      ];
    case 'reps':
      return [{ key: 'reps', label: 'Reps', kind: 'plain' }];
    case 'time':
      return [{ key: 'sec', label: 'Seconds', kind: 'plain' }];
    case 'distance_time':
      return [
        { key: 'min', label: 'Min', kind: 'plain' },
        { key: 'km', label: distanceLabel(units.distance), kind: 'distance' },
      ];
    case 'intervals':
      return [
        { key: 'on', label: 'Work min', kind: 'plain' },
        { key: 'off', label: 'Easy min', kind: 'plain' },
      ];
  }
}

// The text a box shows for a stored value. Empty when nothing is stored.
export function displayValue(col: SetColumn, set: SetPlan, units: Units): string {
  const v = set[col.key];
  if (typeof v !== 'number' || !Number.isFinite(v)) return '';
  if (col.kind === 'weight') return fmtNumber(kgToUnit(v, units.weight));
  if (col.kind === 'distance') return fmtNumber(kmToUnit(v, units.distance));
  return fmtNumber(v);
}

// What a box's text means: undefined for an empty box, null for text that is not
// a number yet (a lone ".").
export function parseTyped(text: string): number | undefined | null {
  const t = text.trim().replace(',', '.');
  if (t === '') return undefined;
  if (!/^\d*\.?\d*$/.test(t) || t === '.') return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

// The patch to store when a box holds `typed` (in the user's unit).
export function patchFor(col: SetColumn, typed: number | undefined, units: Units): SetPatch {
  if (typed === undefined) return { [col.key]: undefined };
  if (col.kind === 'weight') return { [col.key]: unitToKg(typed, units.weight) };
  if (col.kind === 'distance') return { [col.key]: unitToKm(typed, units.distance) };
  return { [col.key]: col.key === 'reps' ? Math.round(typed) : typed };
}

// The last column before the tick: the previous best for strength, a live pace
// for distance cardio and the length of a round for intervals.
export function liveHeader(metric: Metric): 'Previous' | 'Pace' | 'Round' {
  return metric === 'distance_time' ? 'Pace' : metric === 'intervals' ? 'Round' : 'Previous';
}

export function liveValue(metric: Metric, set: SetPlan, previous: string, units: Units): string {
  if (metric === 'distance_time') return pace(set.min, set.km, units.distance) || '';
  if (metric === 'intervals') {
    const total = (set.on ?? 0) + (set.off ?? 0);
    return total > 0 ? `${fmtNumber(total)} min` : '';
  }
  return previous;
}
