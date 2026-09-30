import { allEarnedBadges } from './badges';
import { goalReward, goalStatus } from './goals';
import { computeWorkoutStats, workoutXpTotal } from './workoutScoring';
import type { WorkoutStats } from './workoutScoring';
import type { CustomExercise } from '../data/exercises';
import type { Prefs, Routine, WorkoutLog } from './routines';

// ---------------- Data model v2 ----------------

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
  achievedAt?: string; // ISO instant, stamped by the server the first time the goal is achieved. Once set the goal stays achieved
};

// The optional fields were added with routines and logged workouts. Old saved
// states do not have them, and a missing field always reads as empty. Saved
// states from before v8 also carry a `days` log of the 6-week plan: the store
// turns it into workouts on read (lib/migrations/planDays.ts) and it is not part
// of this type.
export type AppState = {
  version: 2;
  weights: Record<string, number>;
  goals: Goal[];
  routines?: Routine[];
  workouts?: WorkoutLog[];
  prefs?: Prefs;
  customExercises?: CustomExercise[];
  // True while the "XP was worked out again with the new rules" note is waiting
  // to be shown. The store sets it, once, the first time it reads a state that
  // already had workouts or plan days under v8, and false for everyone else. The
  // note sets it to false when it has been seen. Undefined only on states not read since.
  rulesV2Note?: boolean;
};

export function emptyState(): AppState {
  return { version: 2, weights: {}, goals: [] };
}

// ---------------- XP ----------------

export type BadgeTier = 'bronze' | 'silver' | 'gold' | 'diamond' | 'master' | 'legend';

export const XP = {
  weighIn: 10,
  badgeTier: { bronze: 25, silver: 50, gold: 100, diamond: 200, master: 350, legend: 500 } as Record<BadgeTier, number>,
  monthlyBadge: 75,
  specialBadge: 50,
  goalShort: 75,
  goalLong: 200,
};

export function xpForGoal(goal: Goal): number {
  return goalReward(goal);
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

// ---------------- Total XP ----------------

// Total XP is workout XP, weigh-in XP, badge XP and goal XP. Badge XP covers
// every badge, including the ones workouts earn.
export function totalXp(state: AppState, todayDate: string): number {
  let xp = workoutXpTotal(state, todayDate);
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
  latestWeight: number | null;
  latestWeightDate: string | null;
  weighIns: number;
};

export function computeStats(state: AppState): Stats {
  const weightDates = Object.keys(state.weights).sort();
  const latestWeightDate = weightDates.length > 0 ? weightDates[weightDates.length - 1] : null;
  const latestWeight = latestWeightDate ? state.weights[latestWeightDate] : null;
  return { latestWeight, latestWeightDate, weighIns: weightDates.length };
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
    stats: computeStats(state),
    workout: computeWorkoutStats(state, todayDate),
  };
}
