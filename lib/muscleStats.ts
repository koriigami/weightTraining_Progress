// Statistics: the last 7 days as day chips, and sets per muscle group. Pure.
//
// Every ticked set counts once for the exercise's main muscle and half for each
// of its "also works" muscles. Cardio is left out: its sets are minutes, not
// lifts, and cardio is not a muscle group.
import type { ExerciseDef, Muscle } from '../data/exercises';
import { addDaysStr } from './date';
import type { AppState } from './progress';
import { stateLookup } from './routines';
import type { ExerciseLookup, WorkoutItem } from './routines';
import { dayKind, dayRules, trainedDates } from './week';
import type { DayRules } from './week';
import { trainingDaysOf } from './workoutScoring';

export const SECONDARY_WEIGHT = 0.5;

export type DayChip = {
  date: string;
  label: string; // M T W T F S S
  day: number; // day of the month
  trained: boolean; // a training day
  rest: boolean; // a rest day (dayKind); the green dot is for training days only
  today: boolean;
};

const LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']; // Date#getUTCDay order, Sunday first

/** The 7 days ending today (oldest first), each marked as a training day, a rest day or neither. */
export function last7Days(rules: DayRules): DayChip[] {
  const { today } = rules;
  return Array.from({ length: 7 }, (_, i) => {
    const date = addDaysStr(today, i - 6);
    const kind = dayKind(date, rules);
    return {
      date,
      label: LABELS[new Date(`${date}T00:00:00Z`).getUTCDay()],
      day: Number(date.slice(8, 10)),
      trained: kind === 'training',
      rest: kind === 'rest',
      today: date === today,
    };
  });
}

export function isInLast7Days(date: string, today: string): boolean {
  return date >= addDaysStr(today, -6) && date <= today;
}

export type MuscleSets = Partial<Record<Muscle, number>>;

function add(into: MuscleSets, e: Pick<ExerciseDef, 'primary' | 'secondary'>, sets: number) {
  if (sets <= 0) return;
  if (e.primary !== 'cardio') into[e.primary] = (into[e.primary] ?? 0) + sets;
  for (const m of e.secondary) {
    if (m === 'cardio') continue;
    into[m] = (into[m] ?? 0) + sets * SECONDARY_WEIGHT;
  }
}

/** Weighted sets per muscle for the ticked sets of one workout's items. Cardio and unknown exercises are left out. */
export function workoutMuscleSets(items: readonly WorkoutItem[], lookup: ExerciseLookup): MuscleSets {
  const out: MuscleSets = {};
  for (const item of items) {
    const e = lookup(item.exerciseId);
    if (!e || e.metric === 'distance_time' || e.metric === 'intervals') continue;
    add(out, e, item.sets.filter((s) => s.done).length);
  }
  return out;
}

/** Weighted sets per muscle over the last 7 days (today included). */
export function muscleSets(state: AppState, today: string, lookup: ExerciseLookup = stateLookup(state)): MuscleSets {
  const out: MuscleSets = {};

  for (const w of state.workouts ?? []) {
    if (!isInLast7Days(w.date, today)) continue;
    for (const [muscle, n] of Object.entries(workoutMuscleSets(w.items, lookup)) as [Muscle, number][]) {
      out[muscle] = (out[muscle] ?? 0) + n;
    }
  }
  return out;
}

export type MuscleRow = { muscle: Muscle; sets: number; intensity: number };

/** Muscles that were worked, most sets first. Intensity is the share of the busiest muscle, 0 to 1. */
export function muscleRows(sets: MuscleSets): MuscleRow[] {
  const entries = (Object.entries(sets) as [Muscle, number][]).filter(([, n]) => n > 0);
  const max = Math.max(0, ...entries.map(([, n]) => n));
  return entries
    .map(([muscle, n]) => ({ muscle, sets: n, intensity: max > 0 ? n / max : 0 }))
    .sort((a, b) => b.sets - a.sets || a.muscle.localeCompare(b.muscle));
}

/** How much of the "worked" green to mix into the resting colour: 30% for a few sets up to 100% for the most. */
export function heatPercent(intensity: number): number {
  const i = Math.max(0, Math.min(1, intensity));
  return Math.round(30 + 70 * i);
}

export type Last7 = { days: DayChip[]; rows: MuscleRow[]; intensity: Partial<Record<Muscle, number>> };

/** Everything the Statistics page needs. */
export function last7Stats(state: AppState, today: string): Last7 {
  const rows = muscleRows(muscleSets(state, today));
  const intensity: Partial<Record<Muscle, number>> = {};
  for (const r of rows) intensity[r.muscle] = r.intensity;
  // No goal: the chips end today, so the days still to come this week never show.
  const rules = dayRules(trainingDaysOf(state, today), trainedDates(state)[0] ?? null, today);
  return { days: last7Days(rules), rows, intensity };
}
