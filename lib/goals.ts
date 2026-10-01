import { addDaysStr, daysBetween, formatDay, lastDayOfMonth, mondayOf } from './date';
import type { AppState, Goal } from './progress';
import { scoreState } from './workoutScoring';
import type { WorkoutScore } from './workoutScoring';
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

// ---------------- Progress from workouts ----------------

// The workouts that count for a goal: dated inside its window and finished at or
// after the goal's createdAt, so a goal can never be created already partly (or
// fully) satisfied by past history. Pass `scores` to reuse an earlier scoring.
function goalScores(goal: Goal, state: AppState, scores?: WorkoutScore[]): WorkoutScore[] {
  return (scores ?? scoreState(state)).filter((s) => s.date >= goal.start && s.date <= goal.deadline && s.finishedAt >= goal.createdAt);
}

// ---------------- Streak (in weeks) ----------------

// The Sunday that ends the Nth Monday to Sunday week, counting the week that
// holds `start` as the first.
export function streakDeadline(start: string, weeks: number): string {
  return addDaysStr(mondayOf(start), 7 * weeks - 1);
}

// Walk the goal's weeks from the start. A week with a training day adds one. A
// week that is over with none fails the goal, and the current week does not count
// against it until it ends.
export function streakProgress(
  goal: Goal,
  state: AppState,
  today: string,
  scores?: WorkoutScore[]
): { consecutive: number; failed: boolean } {
  // The window is the goal's own weeks, whatever deadline an older goal stored,
  // and never runs past tomorrow (workouts can be dated a day ahead).
  const end = streakDeadline(goal.start, goal.target);
  const limit = addDaysStr(today, 1);
  const weeks = new Set(
    goalScores({ ...goal, deadline: end < limit ? end : limit }, state, scores)
      .filter((s) => s.trainingDay)
      .map((s) => mondayOf(s.date))
  );
  let consecutive = 0;
  for (let i = 0; i < goal.target; i++) {
    const monday = addDaysStr(mondayOf(goal.start), 7 * i);
    if (weeks.has(monday)) {
      consecutive++;
      continue;
    }
    if (addDaysStr(monday, 6) < today) return { consecutive, failed: true };
    break;
  }
  return { consecutive, failed: false };
}

// ---------------- Period goals (workouts / pushups / cardio-minutes / cardio-km) ----------------

export function periodGoalValue(goal: Goal, state: AppState, scores?: WorkoutScore[]): number {
  const list = goalScores(goal, state, scores);
  switch (goal.type) {
    case 'workouts':
      // The goal keeps its stored type id. It counts training days.
      return list.filter((s) => s.trainingDay).length;
    case 'pushups':
      return list.reduce((sum, s) => sum + s.pushupReps, 0);
    case 'cardio-minutes':
      return Math.round(list.reduce((sum, s) => sum + s.cardioMinutes, 0));
    case 'cardio-km':
      return Math.round(list.reduce((sum, s) => sum + s.km, 0) * 100) / 100;
    default:
      return 0;
  }
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

export type EndPreset = '2-weeks' | '1-month' | '3-months';

/** The end-date chips on the goal sheet, in order. "Pick end date" is a fourth chip that opens the calendar. */
export const END_PRESETS: { id: EndPreset; label: string }[] = [
  { id: '2-weeks', label: '2 weeks' },
  { id: '1-month', label: '1 month' },
  { id: '3-months', label: '3 months' },
];

// The same day-of-month some months on, or the month's last day when it is shorter (31 Jan + 1 month is 28 Feb).
function addMonthsStr(date: string, months: number): string {
  const [y, m, d] = date.split('-').map(Number);
  const first = new Date(Date.UTC(y, m - 1 + months, 1));
  const last = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate();
  return new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth(), Math.min(d, last))).toISOString().slice(0, 10);
}

/** The end date a preset chip gives, counted from today. */
export function endPresetDate(preset: EndPreset, today: string): string {
  return preset === '2-weeks' ? addDaysStr(today, 14) : addMonthsStr(today, preset === '1-month' ? 1 : 3);
}

/** "Ends Sat 31 Oct", the line under the calendar and under a weekly streak goal. */
export const endsLabel = (date: string): string => `Ends ${formatDay(date)}`;

/** How much a person did in the 4 weeks up to today, to size a new goal from. Read from real workouts. `workouts` is training days. */
export type RecentNumbers = { workouts: number; pushups: number; cardioMinutes: number; km: number; weeksTrained: number };

export function recentNumbers(state: AppState, today: string, weeks = 4): RecentNumbers {
  const from = addDaysStr(today, -(7 * weeks - 1));
  const list = scoreState(state).filter((s) => s.date >= from && s.date <= today);
  const days = list.filter((s) => s.trainingDay);
  return {
    workouts: days.length,
    pushups: list.reduce((sum, s) => sum + s.pushupReps, 0),
    cardioMinutes: Math.round(list.reduce((sum, s) => sum + s.cardioMinutes, 0)),
    km: Math.round(list.reduce((sum, s) => sum + s.km, 0) * 10) / 10,
    weeksTrained: new Set(days.map((s) => mondayOf(s.date))).size,
  };
}

/** The short hint under a goal's amount, in plain workout terms. Null when there is nothing to say. `kmText` is the distance already in the person's unit. */
export function goalHint(type: Goal['type'], n: RecentNumbers, weeks = 4, kmText?: string): string | null {
  const span = `in the last ${weeks} weeks`;
  switch (type) {
    case 'workouts':
      return `You logged ${n.workouts} ${n.workouts === 1 ? 'workout' : 'workouts'} ${span}.`;
    case 'streak':
      return `You trained in ${n.weeksTrained} of the last ${weeks} weeks.`;
    case 'pushups':
      return `You did ${n.pushups} push-ups ${span}.`;
    case 'cardio-minutes':
      return `You did ${n.cardioMinutes} cardio minutes ${span}.`;
    case 'cardio-km':
      return `You covered ${kmText ?? `${n.km} km`} ${span}.`;
    default:
      return null;
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

// A weight goal is met once any weigh-in from the day it was created up to its
// deadline (and today) reaches the target. Weighing in above the target again
// afterwards does not undo it.
function weightGoalMet(goal: Goal, state: AppState, today: string): boolean {
  const from = goal.createdAt.slice(0, 10);
  return Object.keys(state.weights).some((d) => d >= from && d <= goal.deadline && d <= today && weightGoalAchieved(goal, state.weights[d]));
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

// A goal with an achievedAt stamp stays achieved for good: it keeps its XP and
// its part in Goal Getter even if the workouts behind it are later edited or deleted.
export function goalStatus(goal: Goal, state: AppState, today: string, scores?: WorkoutScore[]): GoalStatus {
  if (goal.achievedAt) return 'achieved';
  if (goal.type === 'streak') {
    const { consecutive, failed } = streakProgress(goal, state, today, scores);
    if (consecutive >= goal.target) return 'achieved';
    if (failed) return 'failed';
    return 'active';
  }
  if (goal.type === 'weight') {
    if (weightGoalMet(goal, state, today)) return 'achieved';
    if (today > goal.deadline) return 'expired';
    return 'active';
  }
  const value = periodGoalValue(goal, state, scores);
  if (value >= goal.target) return 'achieved';
  if (today > goal.deadline) return 'expired';
  return 'active';
}

// Status as of an earlier date, used to find the date a goal first became achieved.
// It reads the progress itself, never the stamp.
export function goalStatusAsOf(goal: Goal, state: AppState, asOf: string, scores?: WorkoutScore[]): GoalStatus {
  const clamped: Goal = { ...goal, achievedAt: undefined, deadline: goal.deadline < asOf ? goal.deadline : asOf };
  return goalStatus(clamped, state, asOf, scores);
}

// The goals with `achievedAt` set on every one that is achieved now and had no
// stamp. Returns the same array when nothing changed.
export function stampAchievedGoals(state: AppState, now: string, today: string): Goal[] {
  const scores = scoreState(state);
  let changed = false;
  const goals = state.goals.map((g) => {
    if (g.achievedAt || goalStatus(g, state, today, scores) !== 'achieved') return g;
    changed = true;
    return { ...g, achievedAt: now };
  });
  return changed ? goals : state.goals;
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
      return `${goal.target} ${goal.target === 1 ? 'week' : 'weeks'} in a row`;
    case 'workouts':
      return `${goal.target} ${goal.target === 1 ? 'workout' : 'workouts'}`;
    case 'pushups':
      return `${goal.target} push-ups`;
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

// Deterministic from the goal's own fields (never stored): 25 a training day, 50 a
// week of streak, 1 a cardio minute, 8 a km, a quarter of a push-up, 120 a kg
// (a quarter more at an ambitious pace). Rounded to 5 and kept within 25 to 1000.
export function goalReward(goal: Goal): number {
  let base: number;
  let multiplier = 1;

  switch (goal.type) {
    case 'streak':
      base = 50 * goal.target;
      break;
    case 'workouts':
      base = 25 * goal.target;
      break;
    case 'pushups':
      base = goal.target / 4;
      break;
    case 'cardio-minutes':
      base = goal.target;
      break;
    case 'cardio-km':
      base = 8 * goal.target;
      break;
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
