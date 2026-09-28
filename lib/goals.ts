import { plan } from '../data/plan';
import { addDaysStr, daysBetween, lastDayOfMonth } from './date';
import {
  isDayCleared,
  isPushupExercise,
  isWorkoutDay,
  lowerBoundReps,
  planDay,
  pushupsInLog,
  workoutDates,
} from './progress';
import type { AppState, Goal } from './progress';

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

export function periodGoalValue(goal: Goal, state: AppState): number {
  const days = plan.filter((d) => isWorkoutDay(d) && d.date >= goal.start && d.date <= goal.deadline);
  if (goal.type === 'workouts') {
    return days.filter((d) => isDayCleared(d, state.days[d.date])).length;
  }
  if (goal.type === 'pushups') {
    return days.reduce((sum, d) => sum + pushupsInLog(d, state.days[d.date]), 0);
  }
  if (goal.type === 'cardio-minutes') {
    return days.reduce((sum, d) => sum + (state.days[d.date]?.cardio?.minutes ?? 0), 0);
  }
  if (goal.type === 'cardio-km') {
    return days.reduce((sum, d) => sum + (state.days[d.date]?.cardio?.km ?? 0), 0);
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
    case 'this-month':
      return lastDayOfMonth(start);
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

export function goalTitle(goal: Goal): string {
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
      return `${goal.target} km cardio distance`;
    case 'weight': {
      const dir = goal.direction === 'gain' ? 'Gain' : 'Lose';
      const amt = goal.baseline !== undefined ? Math.abs(goal.target - goal.baseline).toFixed(1) : goal.target.toFixed(1);
      return `${dir} ${amt} kg, to ${goal.target.toFixed(1)} kg`;
    }
  }
}

export function daysLeft(goal: Goal, today: string): number {
  return Math.max(0, daysBetween(today, goal.deadline));
}
