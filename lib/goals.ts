import { plan } from '../data/plan';
import { addDaysStr, daysBetween, lastDayOfMonth } from './date';
import {
  cardioSince,
  isDayCleared,
  isDayClearedSince,
  isPushupExercise,
  isWorkoutDay,
  lowerBoundReps,
  planDay,
  pushupsInLogSince,
  workoutDates,
} from './progress';
import type { AppState, Goal } from './progress';
import { fmtNumber, kgToUnit, kmToUnit, unitToKg, unitToKm } from './units';
import type { DistanceUnit, WeightUnit } from './units';

export type GoalUnits = { weight: WeightUnit; distance: DistanceUnit };
const METRIC: GoalUnits = { weight: 'kg', distance: 'km' };

/** A weight in kg as the number to show in the person's unit. Kilograms come back untouched, so the kg wording is exactly what it was. */
export const goalWeight = (kg: number, unit: WeightUnit): number => (unit === 'lb' ? kgToUnit(kg, 'lb') : kg);

// What the goal sheet types and shows is in the person's units. These turn that
// back into the kg and km that are stored. Kilograms and kilometres come out as
// the same numbers as before (one decimal for a weight target), so a person on
// the metric units sees no change.

/** The amount of a weight goal, in the person's unit, as kg. */
export const goalAmountKg = (amount: number, unit: WeightUnit): number => unitToKg(amount, unit);

/** The weight to reach, in kg, for losing or gaining `amount` (in the person's unit) from a baseline in kg. */
export function weightGoalTarget(baselineKg: number, direction: 'lose' | 'gain', amount: number, unit: WeightUnit): number {
  const delta = goalAmountKg(amount, unit);
  const target = direction === 'lose' ? baselineKg - delta : baselineKg + delta;
  // Two decimals keep a whole number of pounds honest; kilograms keep their one.
  return Number(target.toFixed(unit === 'lb' ? 2 : 1));
}

/** A distance goal typed in miles or km, as the km that is stored. */
export const goalDistanceKm = (amount: number, unit: DistanceUnit): number => (unit === 'mi' ? Math.round(unitToKm(amount, 'mi') * 100) / 100 : amount);

/** The smallest, biggest and default weight step a person can pick, in their unit. */
export const WEIGHT_GOAL_STEP: Record<WeightUnit, { min: number; max: number; step: number; start: number }> = {
  kg: { min: 0.5, max: 15, step: 0.5, start: 2 },
  lb: { min: 1, max: 33, step: 1, start: 5 },
};

export type GoalStatus = 'active' | 'achieved' | 'failed' | 'expired';

// ---------------- Streak ----------------

export function scheduledWorkoutDatesFrom(start: string): string[] {
  return workoutDates().filter((d) => d >= start);
}

// The date of the Nth scheduled workout day on or after `start`, or null if
// the plan doesn't have that many workout days left.
export function streakDeadline(start: string, n: number): string | null {
  const dates = scheduledWorkoutDatesFrom(start);
  if (n <= 0 || dates.length < n) return null;
  return dates[n - 1];
}

export function maxStreakFrom(start: string): number {
  return scheduledWorkoutDatesFrom(start).length;
}

function streakWindowDates(goal: Goal): string[] {
  return workoutDates().filter((d) => d >= goal.start && d <= goal.deadline);
}

// Walk the goal's window from the start. A past uncleared workout day fails
// the goal immediately; today doesn't count against it until it's over.
export function streakProgress(
  goal: Goal,
  state: AppState,
  today: string
): { consecutive: number; failed: boolean } {
  let consecutive = 0;
  for (const d of streakWindowDates(goal)) {
    if (d > today) break;
    const day = planDay(d)!;
    const cleared = isDayCleared(day, state.days[d]);
    if (d === today) {
      if (cleared) consecutive++;
      break;
    }
    if (cleared) consecutive++;
    else return { consecutive, failed: true };
  }
  return { consecutive, failed: false };
}

// ---------------- Period goals (workouts / pushups / cardio-minutes / cardio-km) ----------------

// Only progress logged at or after the goal's createdAt counts, so a goal
// can never be created already partly (or fully) satisfied by past history.
export function periodGoalValue(goal: Goal, state: AppState): number {
  const since = goal.createdAt;
  const days = plan.filter((d) => isWorkoutDay(d) && d.date >= goal.start && d.date <= goal.deadline);
  if (goal.type === 'workouts') {
    return days.filter((d) => isDayClearedSince(d, state.days[d.date], since)).length;
  }
  if (goal.type === 'pushups') {
    return days.reduce((sum, d) => sum + pushupsInLogSince(d, state.days[d.date], since), 0);
  }
  if (goal.type === 'cardio-minutes') {
    return days.reduce((sum, d) => sum + cardioSince(state.days[d.date], since).minutes, 0);
  }
  if (goal.type === 'cardio-km') {
    return days.reduce((sum, d) => sum + cardioSince(state.days[d.date], since).km, 0);
  }
  return 0;
}

// Plan totals over a date range, for the "your plan has..." hint and target prefill.
export function planTotals(start: string, end: string): { workouts: number; pushups: number; cardioMinutes: number } {
  const days = plan.filter((d) => isWorkoutDay(d) && d.date >= start && d.date <= end);
  let pushups = 0;
  let cardioMinutes = 0;
  for (const d of days) {
    for (const ex of d.strength) if (isPushupExercise(ex.name)) pushups += lowerBoundReps(ex.reps) * ex.sets;
    for (const ex of d.core ?? []) if (isPushupExercise(ex.name)) pushups += lowerBoundReps(ex.reps) * ex.sets;
    if (d.cardio) cardioMinutes += d.cardio.minutes;
  }
  return { workouts: days.length, pushups, cardioMinutes };
}

export type PeriodPreset = 'this-week' | '2-weeks' | 'this-month' | '3-months' | 'custom';

export function periodEnd(preset: PeriodPreset, start: string): string {
  switch (preset) {
    case 'this-week':
      return addDaysStr(start, 6);
    case '2-weeks':
      return addDaysStr(start, 13);
    case 'this-month': {
      const end = lastDayOfMonth(start);
      // On the month's last day, "this month" would otherwise end today,
      // which the server always rejects (a deadline must be after start).
      // Roll to next month's end instead of failing silently.
      return end > start ? end : lastDayOfMonth(addDaysStr(start, 1));
    }
    case '3-months':
      return addDaysStr(start, 89);
    default:
      return addDaysStr(start, 6);
  }
}

// ---------------- Weight goals ----------------

export function latestWeightOnOrBefore(state: AppState, date: string): number | null {
  const dates = Object.keys(state.weights)
    .filter((d) => d <= date)
    .sort();
  return dates.length ? state.weights[dates[dates.length - 1]] : null;
}

export function weightGoalAchieved(goal: Goal, latest: number | null): boolean {
  if (latest === null) return false;
  return goal.direction === 'gain' ? latest >= goal.target : latest <= goal.target;
}

export type PaceLabel = 'Comfortable' | 'Ambitious' | 'Aggressive';

export function weightPaceLabel(kgPerWeek: number): PaceLabel {
  const p = Math.abs(kgPerWeek);
  if (p <= 0.5) return 'Comfortable';
  if (p <= 1.0) return 'Ambitious';
  return 'Aggressive';
}

export function weightPaceLabelFull(kgPerWeek: number): string {
  const label = weightPaceLabel(kgPerWeek);
  return label === 'Aggressive' ? 'Aggressive, hard to sustain' : label;
}

export function weightGoalPct(goal: Goal, latest: number | null): number {
  if (latest === null || goal.baseline === undefined) return 0;
  const total = Math.abs(goal.target - goal.baseline);
  if (total === 0) return 100;
  const done = goal.direction === 'gain' ? latest - goal.baseline : goal.baseline - latest;
  return Math.min(100, Math.max(0, (done / total) * 100));
}

// ---------------- Unified status ----------------

export function goalStatus(goal: Goal, state: AppState, today: string): GoalStatus {
  if (goal.type === 'streak') {
    const { consecutive, failed } = streakProgress(goal, state, today);
    if (consecutive >= goal.target) return 'achieved';
    if (failed) return 'failed';
    return 'active';
  }
  if (goal.type === 'weight') {
    const latest = latestWeightOnOrBefore(state, today);
    if (weightGoalAchieved(goal, latest)) return 'achieved';
    if (today > goal.deadline) return 'expired';
    return 'active';
  }
  const value = periodGoalValue(goal, state);
  if (value >= goal.target) return 'achieved';
  if (today > goal.deadline) return 'expired';
  return 'active';
}

// Status as of an earlier date, used to find the date a goal first became achieved.
export function goalStatusAsOf(goal: Goal, state: AppState, asOf: string): GoalStatus {
  const clamped: Goal = { ...goal, deadline: goal.deadline < asOf ? goal.deadline : asOf };
  return goalStatus(clamped, state, asOf);
}

export function goalProgressValue(goal: Goal, state: AppState, today: string): number {
  if (goal.type === 'streak') return streakProgress(goal, state, today).consecutive;
  if (goal.type === 'weight') return latestWeightOnOrBefore(state, today) ?? goal.baseline ?? goal.target;
  return periodGoalValue(goal, state);
}

// Goals are stored in kg and km. The title writes them in the person's units.
export function goalTitle(goal: Goal, units: GoalUnits = METRIC): string {
  switch (goal.type) {
    case 'streak':
      return `${goal.target} workout days in a row`;
    case 'workouts':
      return `${goal.target} workout days`;
    case 'pushups':
      return `${goal.target} pushups`;
    case 'cardio-minutes':
      return `${goal.target} cardio minutes`;
    case 'cardio-km':
      return `${units.distance === 'km' ? goal.target : fmtNumber(kmToUnit(goal.target, units.distance))} ${units.distance} cardio distance`;
    case 'weight': {
      const dir = goal.direction === 'gain' ? 'Gain' : 'Lose';
      const u = units.weight;
      const amt = goalWeight(goal.baseline !== undefined ? Math.abs(goal.target - goal.baseline) : goal.target, u).toFixed(1);
      return `${dir} ${amt} ${u}, to ${goalWeight(goal.target, u).toFixed(1)} ${u}`;
    }
  }
}

export function daysLeft(goal: Goal, today: string): number {
  return Math.max(0, daysBetween(today, goal.deadline));
}

// ---------------- Goal XP reward ----------------

// Plan totals across the goal's own window, used only to scale the ambition
// multiplier below (not the same as progress logged toward it).
function ambitionMultiplier(goal: Goal, planTotal: number): number {
  if (planTotal <= 0) return goal.target > 0 ? 1.25 : 0.75;
  const pct = goal.target / planTotal;
  if (pct < 0.5) return 0.75;
  if (pct < 1) return 1.0;
  return 1.25;
}

// Deterministic from the goal's own fields (never stored). See the v5.1 plan,
// section 1, for the base-XP table and rounding/clamp rules.
export function goalReward(goal: Goal): number {
  let base: number;
  let multiplier = 1;

  switch (goal.type) {
    case 'streak':
      base = 20 * goal.target;
      break;
    case 'workouts': {
      base = 25 * goal.target;
      const totals = planTotals(goal.start, goal.deadline);
      multiplier = ambitionMultiplier(goal, totals.workouts);
      break;
    }
    case 'pushups': {
      base = goal.target / 4;
      const totals = planTotals(goal.start, goal.deadline);
      multiplier = ambitionMultiplier(goal, totals.pushups);
      break;
    }
    case 'cardio-minutes': {
      base = goal.target;
      const totals = planTotals(goal.start, goal.deadline);
      multiplier = ambitionMultiplier(goal, totals.cardioMinutes);
      break;
    }
    case 'cardio-km': {
      base = 8 * goal.target;
      const totals = planTotals(goal.start, goal.deadline);
      multiplier = ambitionMultiplier(goal, totals.cardioMinutes * 0.15);
      break;
    }
    case 'weight': {
      const change = Math.abs(goal.target - (goal.baseline ?? goal.target));
      base = 120 * change;
      const weeks = daysBetween(goal.start, goal.deadline) / 7;
      const kgPerWeek = weeks > 0 ? change / weeks : 0;
      multiplier = weightPaceLabel(kgPerWeek) === 'Ambitious' ? 1.25 : 1.0;
      break;
    }
  }

  const rounded = Math.round((base * multiplier) / 5) * 5;
  return Math.min(1000, Math.max(25, rounded));
}
