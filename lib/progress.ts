import { plan } from '../data/plan';
import type { WorkoutDay, Exercise } from '../data/plan';
import { allEarnedBadges } from './badges';
import { goalReward, goalStatus } from './goals';
import { computeWorkoutStats, workoutXpTotal } from './workoutScoring';
import type { WorkoutStats } from './workoutScoring';
import type { CustomExercise } from '../data/exercises';
import type { Prefs, Routine, WorkoutLog } from './routines';

export const START_WEIGHT = 110;
export const TARGET_WEIGHT = 103;

// ---------------- Data model v2 ----------------

export type ItemKey = string; // 's0','s1'.. strength index, 'k0','k1'.. core index, 'cardio'

export type DayLog = {
  items: Record<ItemKey, { at: string }>;
  cardio?: { minutes: number; km?: number; at: string };
};

export type GoalType = 'streak' | 'workouts' | 'pushups' | 'cardio-minutes' | 'cardio-km' | 'weight';
export type GoalDirection = 'lose' | 'gain';

export type Goal = {
  id: string;
  type: GoalType;
  target: number;
  start: string;
  deadline: string;
  createdAt: string; // ISO instant; anti-farming cutoff for count-based goal progress
  direction?: GoalDirection; // weight only
  baseline?: number; // weight only, kg at creation
};

// The optional fields were added with routines and logged workouts. Old saved
// states do not have them, and a missing field always reads as empty. `days`
// stays the legacy 6-week plan log and keeps its own scoring rules.
export type AppState = {
  version: 2;
  days: Record<string, DayLog>;
  weights: Record<string, number>;
  goals: Goal[];
  routines?: Routine[];
  workouts?: WorkoutLog[];
  prefs?: Prefs;
  customExercises?: CustomExercise[];
};

export function emptyState(): AppState {
  return { version: 2, days: {}, weights: {}, goals: [] };
}

export function isWorkoutDay(day: WorkoutDay): boolean {
  return day.dayType !== 'rest' && day.dayType !== 'pre-start';
}

export function lowerBoundReps(reps: string): number {
  const match = reps.match(/(\d+)/);
  return match ? Number(match[1]) : 0;
}

export function isPushupExercise(name: string): boolean {
  return name.toLowerCase().includes('pushups');
}

const dayByDate: Record<string, WorkoutDay> = Object.fromEntries(plan.map((d) => [d.date, d]));

export function planDay(date: string): WorkoutDay | undefined {
  return dayByDate[date];
}

// Sorted (chronological) dates of scheduled workout days, the only ones that
// count for streaks, clearing and badges.
export function workoutDates(): string[] {
  return plan.filter(isWorkoutDay).map((d) => d.date);
}

// ---------------- Item keys ----------------

export function strengthKeys(day: WorkoutDay): string[] {
  return day.strength.map((_, i) => `s${i}`);
}

export function coreKeys(day: WorkoutDay): string[] {
  return (day.core ?? []).map((_, i) => `k${i}`);
}

export function cardioKeyOf(day: WorkoutDay): string[] {
  return day.cardio ? ['cardio'] : [];
}

export function allItemKeys(day: WorkoutDay): string[] {
  return [...strengthKeys(day), ...coreKeys(day), ...cardioKeyOf(day)];
}

export function exerciseForKey(day: WorkoutDay, key: ItemKey): Exercise | undefined {
  if (key.startsWith('s')) return day.strength[Number(key.slice(1))];
  if (key.startsWith('k')) return day.core?.[Number(key.slice(1))];
  return undefined;
}

export function isValidItemKey(day: WorkoutDay, key: ItemKey): boolean {
  return allItemKeys(day).includes(key);
}

function ticked(log: DayLog | undefined, key: ItemKey): boolean {
  if (!log) return false;
  if (key === 'cardio') return Boolean(log.cardio);
  return Boolean(log.items[key]);
}

// Cleared = every strength item ticked. Core and cardio never count.
export function isDayCleared(day: WorkoutDay, log: DayLog | undefined): boolean {
  const keys = strengthKeys(day);
  if (keys.length === 0) return false;
  return keys.every((k) => ticked(log, k));
}

export function isPerfectDay(day: WorkoutDay, log: DayLog | undefined): boolean {
  const keys = allItemKeys(day);
  if (keys.length === 0) return false;
  return keys.every((k) => ticked(log, k));
}

export function dayDoneCount(day: WorkoutDay, log: DayLog | undefined): number {
  return allItemKeys(day).filter((k) => ticked(log, k)).length;
}

export function dayItemCount(day: WorkoutDay): number {
  return allItemKeys(day).length;
}

export function isItemTicked(day: WorkoutDay, log: DayLog | undefined, key: ItemKey): boolean {
  return ticked(log, key);
}

// Sum of lowerBound(reps) * sets for ticked pushup items only (strength + core).
export function pushupsInLog(day: WorkoutDay, log: DayLog | undefined): number {
  let total = 0;
  day.strength.forEach((ex, i) => {
    if (isPushupExercise(ex.name) && ticked(log, `s${i}`)) total += lowerBoundReps(ex.reps) * ex.sets;
  });
  (day.core ?? []).forEach((ex, i) => {
    if (isPushupExercise(ex.name) && ticked(log, `k${i}`)) total += lowerBoundReps(ex.reps) * ex.sets;
  });
  return total;
}

// ---------------- Goal anti-farming: createdAt-aware progress ----------------
// A workout, pushup or cardio entry only counts toward a goal's progress if it
// was logged at or after the goal's createdAt, so a goal can never be created
// already partly (or fully) satisfied by past history.

// Latest `at` timestamp among a day's strength items, or null if none ticked.
function latestStrengthAt(day: WorkoutDay, log: DayLog | undefined): string | null {
  if (!log) return null;
  let latest: string | null = null;
  for (const k of strengthKeys(day)) {
    const at = log.items[k]?.at;
    if (at && (latest === null || at > latest)) latest = at;
  }
  return latest;
}

// A day counts toward a workouts-goal only if it's cleared AND the latest
// strength tick that cleared it happened at or after `since`.
export function isDayClearedSince(day: WorkoutDay, log: DayLog | undefined, since: string): boolean {
  if (!isDayCleared(day, log)) return false;
  const latest = latestStrengthAt(day, log);
  return latest !== null && latest >= since;
}

// Pushups from items ticked at or after `since` only.
export function pushupsInLogSince(day: WorkoutDay, log: DayLog | undefined, since: string): number {
  let total = 0;
  day.strength.forEach((ex, i) => {
    if (!isPushupExercise(ex.name)) return;
    const at = log?.items[`s${i}`]?.at;
    if (at && at >= since) total += lowerBoundReps(ex.reps) * ex.sets;
  });
  (day.core ?? []).forEach((ex, i) => {
    if (!isPushupExercise(ex.name)) return;
    const at = log?.items[`k${i}`]?.at;
    if (at && at >= since) total += lowerBoundReps(ex.reps) * ex.sets;
  });
  return total;
}

// Cardio minutes/km for a day only count if the cardio item's own `at` is at
// or after `since` (cardio is logged as a single item, not per-set).
export function cardioSince(log: DayLog | undefined, since: string): { minutes: number; km: number } {
  const c = log?.cardio;
  // Cardio saved before cardio.at existed still has its tick time on the item.
  const at = c?.at ?? log?.items['cardio']?.at;
  if (!c || !at || at < since) return { minutes: 0, km: 0 };
  return { minutes: c.minutes, km: c.km ?? 0 };
}

// ---------------- XP ----------------

export type BadgeTier = 'bronze' | 'silver' | 'gold' | 'diamond' | 'master' | 'legend';

export const XP = {
  strength: 15,
  core: 10,
  cardio: 20,
  cardioKmBonus: 10,
  dayCleared: 50,
  perfectDay: 25,
  weighIn: 10,
  badgeTier: { bronze: 25, silver: 50, gold: 100, diamond: 200, master: 350, legend: 500 } as Record<BadgeTier, number>,
  monthlyBadge: 75,
  specialBadge: 50,
  goalShort: 75,
  goalLong: 200,
};

export function dayClearedXp(streakAfter: number): number {
  return XP.dayCleared + Math.min(50, 10 * streakAfter);
}

export function xpForGoal(goal: Goal): number {
  return goalReward(goal);
}

// XP earned from a single day's log: per-item XP, the day-cleared bonus (which
// depends on the streak count as of that day) and the perfect-day bonus.
export function xpForDay(day: WorkoutDay, log: DayLog | undefined, streakAfter: number): number {
  if (!log) return 0;
  let xp = 0;
  strengthKeys(day).forEach((k) => {
    if (ticked(log, k)) xp += XP.strength;
  });
  coreKeys(day).forEach((k) => {
    if (ticked(log, k)) xp += XP.core;
  });
  if (log.cardio) {
    xp += XP.cardio;
    if (log.cardio.km !== undefined) xp += XP.cardioKmBonus;
  }
  if (isDayCleared(day, log)) xp += dayClearedXp(streakAfter);
  if (isPerfectDay(day, log)) xp += XP.perfectDay;
  return xp;
}

// ---------------- Levels and ranks ----------------

export function xpForLevel(n: number): number {
  return 50 * n * (n - 1);
}

export function levelForXp(xp: number): number {
  let level = 1;
  while (xpForLevel(level + 1) <= xp) {
    level++;
  }
  return level;
}

export function xpIntoLevel(xp: number): { current: number; needed: number; level: number } {
  const level = levelForXp(xp);
  const floor = xpForLevel(level);
  const ceil = xpForLevel(level + 1);
  return { current: xp - floor, needed: ceil - floor, level };
}

export type Rank = 'E' | 'D' | 'C' | 'B' | 'A' | 'S';

export const RANK_TITLES: Record<Rank, string> = {
  E: 'E-Rank Hunter',
  D: 'D-Rank Hunter',
  C: 'C-Rank Hunter',
  B: 'B-Rank Hunter',
  A: 'A-Rank Hunter',
  S: 'S-Rank Hunter',
};

export const RANK_LEVEL_LABEL: Record<Rank, string> = {
  E: 'Levels 1 to 4',
  D: 'Levels 5 to 9',
  C: 'Levels 10 to 14',
  B: 'Levels 15 to 19',
  A: 'Levels 20 to 29',
  S: 'Level 30 and up',
};

export function rankForLevel(level: number): Rank {
  if (level >= 30) return 'S';
  if (level >= 20) return 'A';
  if (level >= 15) return 'B';
  if (level >= 10) return 'C';
  if (level >= 5) return 'D';
  return 'E';
}

// Level at which the next rank starts, or null once at the top rank.
export function nextRankLevel(rank: Rank): number | null {
  switch (rank) {
    case 'E':
      return 5;
    case 'D':
      return 10;
    case 'C':
      return 15;
    case 'B':
      return 20;
    case 'A':
      return 30;
    case 'S':
      return null;
  }
}

// ---------------- Streaks ----------------

// Consecutive cleared-day streak ending at each workout date, walking forward.
export function clearedStreakSeries(state: AppState): Record<string, number> {
  const result: Record<string, number> = {};
  let running = 0;
  for (const date of workoutDates()) {
    const day = dayByDate[date];
    if (isDayCleared(day, state.days[date])) running++;
    else running = 0;
    result[date] = running;
  }
  return result;
}

export function currentStreak(state: AppState, todayDate: string): number {
  const dates = workoutDates();
  let streak = 0;
  for (let i = dates.length - 1; i >= 0; i--) {
    const date = dates[i];
    if (date > todayDate) continue;
    const cleared = isDayCleared(dayByDate[date], state.days[date]);
    if (date === todayDate) {
      if (cleared) streak++;
      continue;
    }
    if (cleared) streak++;
    else break;
  }
  return streak;
}

export function bestStreak(state: AppState): number {
  const series = clearedStreakSeries(state);
  return Object.values(series).reduce((max, v) => Math.max(max, v), 0);
}

// ---------------- Total XP ----------------

// Total XP is the legacy plan XP (days, weigh-ins, goals) plus XP from logged
// workouts. Badge XP covers every badge, including the ones workouts earn.
export function totalXp(state: AppState, todayDate: string): number {
  let xp = workoutXpTotal(state, todayDate);
  const streaks = clearedStreakSeries(state);
  for (const date of workoutDates()) {
    xp += xpForDay(dayByDate[date], state.days[date], streaks[date]);
  }
  xp += Object.keys(state.weights).length * XP.weighIn;

  for (const b of allEarnedBadges(state, todayDate)) {
    if (b.kind === 'lifetime') xp += XP.badgeTier[b.tier];
    else if (b.kind === 'monthly') xp += XP.monthlyBadge;
    else xp += XP.specialBadge;
  }

  for (const goal of state.goals) {
    if (goalStatus(goal, state, todayDate) === 'achieved') xp += xpForGoal(goal);
  }

  return xp;
}

// ---------------- Derived stats ----------------

export type Stats = {
  daysCleared: number;
  perfectDays: number;
  lifetimePushups: number;
  cardioMinutes: number;
  treadmillKm: number;
  cycleKm: number;
  currentStreak: number;
  bestStreak: number;
  latestWeight: number | null;
  latestWeightDate: string | null;
  kgLost: number;
  weighIns: number;
};

export function computeStats(state: AppState, todayDate: string): Stats {
  let daysCleared = 0;
  let perfectDays = 0;
  let lifetimePushups = 0;
  let cardioMinutes = 0;
  let treadmillKm = 0;
  let cycleKm = 0;

  for (const date of workoutDates()) {
    const day = dayByDate[date];
    const log = state.days[date];
    if (isDayCleared(day, log)) daysCleared++;
    if (isPerfectDay(day, log)) perfectDays++;
    lifetimePushups += pushupsInLog(day, log);
    if (log?.cardio) {
      cardioMinutes += log.cardio.minutes;
      if (log.cardio.km !== undefined && day.cardio) {
        if (day.cardio.modality === 'treadmill') treadmillKm += log.cardio.km;
        else cycleKm += log.cardio.km;
      }
    }
  }

  const weightDates = Object.keys(state.weights).sort();
  const latestWeightDate = weightDates.length > 0 ? weightDates[weightDates.length - 1] : null;
  const latestWeight = latestWeightDate ? state.weights[latestWeightDate] : null;

  return {
    daysCleared,
    perfectDays,
    lifetimePushups,
    cardioMinutes,
    treadmillKm,
    cycleKm,
    currentStreak: currentStreak(state, todayDate),
    bestStreak: bestStreak(state),
    latestWeight,
    latestWeightDate,
    kgLost: latestWeight !== null ? START_WEIGHT - latestWeight : 0,
    weighIns: weightDates.length,
  };
}

export type FullProgress = {
  xp: number;
  level: number;
  rank: Rank;
  xpIntoLevel: { current: number; needed: number; level: number };
  stats: Stats;
  workout: WorkoutStats;
};

export function computeProgress(state: AppState, todayDate: string): FullProgress {
  const xp = totalXp(state, todayDate);
  const level = levelForXp(xp);
  return {
    xp,
    level,
    rank: rankForLevel(level),
    xpIntoLevel: xpIntoLevel(xp),
    stats: computeStats(state, todayDate),
    workout: computeWorkoutStats(state, todayDate),
  };
}
