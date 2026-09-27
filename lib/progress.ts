import { plan, WorkoutDay } from '../data/plan';

export const START_WEIGHT = 110;
export const TARGET_WEIGHT = 103;

export type Completions = Record<string, { at: string }>;
export type Weights = Record<string, number>;

export type GoalType = 'workouts' | 'pushups' | 'cardio-minutes' | 'streak' | 'weight';

export type Goal = {
  id: string;
  type: GoalType;
  target: number;
  start: string;
  deadline: string;
};

export type AppState = {
  completions: Completions;
  weights: Weights;
  goals: Goal[];
};

export function emptyState(): AppState {
  return { completions: {}, weights: {}, goals: [] };
}

function isWorkoutDay(day: WorkoutDay): boolean {
  return day.dayType !== 'rest' && day.dayType !== 'pre-start';
}

export function lowerBoundReps(reps: string): number {
  const match = reps.match(/(\d+)/);
  return match ? Number(match[1]) : 0;
}

export function isPushupExercise(name: string): boolean {
  return name.toLowerCase().includes('pushups');
}

// ---- XP ----

export function xpForCompletion(streakAfter: number): number {
  const streakBonus = Math.min(50, 10 * streakAfter);
  return 100 + streakBonus;
}

export const XP_WEIGH_IN = 10;
export const XP_ACHIEVEMENT = 50;

export function xpForGoal(goal: Goal): number {
  const days = daysBetween(goal.start, goal.deadline);
  return days <= 7 ? 75 : 200;
}

function daysBetween(start: string, end: string): number {
  const a = new Date(`${start}T00:00:00Z`).getTime();
  const b = new Date(`${end}T00:00:00Z`).getTime();
  return Math.round((b - a) / 86400000);
}

// ---- Levels and ranks ----

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

export function rankForLevel(level: number): Rank {
  if (level >= 11) return 'S';
  if (level >= 9) return 'A';
  if (level >= 7) return 'B';
  if (level >= 5) return 'C';
  if (level >= 3) return 'D';
  return 'E';
}

// ---- Streaks ----

// Sorted list of workout-day dates (chronological), the ones that can be completed or missed.
function workoutDates(): string[] {
  return plan.filter(isWorkoutDay).map((d) => d.date);
}

// Streak as of a given "today" date: consecutive completed workout days walking
// backward from today, skipping rest/pre-start days, stopping (without breaking)
// at today itself if today is not yet over, and breaking on the first missed
// past workout day.
export function currentStreak(completions: Completions, todayStr: string): number {
  const dates = workoutDates();
  let streak = 0;
  for (let i = dates.length - 1; i >= 0; i--) {
    const date = dates[i];
    if (date > todayStr) continue;
    if (date === todayStr) {
      if (completions[date]) streak++;
      continue;
    }
    if (completions[date]) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}

// Best streak ever achieved, and the running streak at each completed date (for
// streak-based achievements and XP-at-completion-time calculations).
export function bestStreak(completions: Completions): number {
  const dates = workoutDates();
  let best = 0;
  let running = 0;
  for (const date of dates) {
    if (completions[date]) {
      running++;
      best = Math.max(best, running);
    } else {
      running = 0;
    }
  }
  return best;
}

// The streak value immediately after completing `date` (used for XP awarded at
// completion time): counts consecutive completed workout days ending at `date`.
export function streakAfterCompleting(completions: Completions, date: string): number {
  const dates = workoutDates();
  const idx = dates.indexOf(date);
  if (idx === -1) return 0;
  let streak = 0;
  for (let i = idx; i >= 0; i--) {
    const d = dates[i];
    const done = d === date ? true : !!completions[d];
    if (done) streak++;
    else break;
  }
  return streak;
}

// ---- Derived stats ----

export type Stats = {
  workoutsCompleted: number;
  lifetimePushups: number;
  cardioMinutes: number;
  currentStreak: number;
  bestStreak: number;
  latestWeight: number | null;
  latestWeightDate: string | null;
  kgLost: number;
  weighIns: number;
};

export function computeStats(state: AppState, todayStr: string): Stats {
  const completedDays = plan.filter((d) => isWorkoutDay(d) && state.completions[d.date]);

  let lifetimePushups = 0;
  let cardioMinutes = 0;
  for (const day of completedDays) {
    for (const ex of day.strength) {
      if (isPushupExercise(ex.name)) {
        lifetimePushups += lowerBoundReps(ex.reps) * ex.sets;
      }
    }
    if (day.core) {
      for (const ex of day.core) {
        if (isPushupExercise(ex.name)) {
          lifetimePushups += lowerBoundReps(ex.reps) * ex.sets;
        }
      }
    }
    if (day.cardio) cardioMinutes += day.cardio.minutes;
  }

  const weightDates = Object.keys(state.weights).sort();
  const latestWeightDate = weightDates.length > 0 ? weightDates[weightDates.length - 1] : null;
  const latestWeight = latestWeightDate ? state.weights[latestWeightDate] : null;

  return {
    workoutsCompleted: completedDays.length,
    lifetimePushups,
    cardioMinutes,
    currentStreak: currentStreak(state.completions, todayStr),
    bestStreak: bestStreak(state.completions),
    latestWeight,
    latestWeightDate,
    kgLost: latestWeight !== null ? START_WEIGHT - latestWeight : 0,
    weighIns: weightDates.length,
  };
}

// ---- Total XP ----

export function totalXp(state: AppState): number {
  let xp = 0;
  const dates = workoutDates();
  let running = 0;
  for (const date of dates) {
    if (state.completions[date]) {
      running++;
      xp += xpForCompletion(running);
    } else {
      running = 0;
    }
  }
  xp += Object.keys(state.weights).length * XP_WEIGH_IN;
  xp += computeAchievements(state).filter((a) => a.unlockedAt).length * XP_ACHIEVEMENT;
  const today = todayForGoals(state);
  for (const goal of state.goals) {
    const status = goalStatus(goal, state, today);
    if (status === 'achieved') xp += xpForGoal(goal);
  }
  return xp;
}

// Goals don't carry "today" so callers pass it in; for totalXp we use the
// latest known activity date as a stand-in when no explicit today is given.
function todayForGoals(state: AppState): string {
  const dates = [...Object.keys(state.completions), ...Object.keys(state.weights)].sort();
  return dates.length > 0 ? dates[dates.length - 1] : plan[0].date;
}

// ---- Achievements ----

export type AchievementId =
  | 'first-workout'
  | 'streak-3'
  | 'streak-7'
  | 'streak-14'
  | 'full-week'
  | 'pushups-100'
  | 'pushups-500'
  | 'pushups-1000'
  | 'cardio-60'
  | 'cardio-300'
  | 'weighins-7'
  | 'kg-1'
  | 'kg-3'
  | 'kg-5'
  | 'target-weight'
  | 'program-complete';

export type Achievement = {
  id: AchievementId;
  name: string;
  description: string;
  unlockedAt: string | null;
  progress: number;
  target: number;
};

const ACHIEVEMENT_META: Record<AchievementId, { name: string; description: (target?: number) => string }> = {
  'first-workout': { name: 'Awakening', description: () => 'Complete your first workout' },
  'streak-3': { name: 'Rising', description: () => 'Reach a 3-day streak' },
  'streak-7': { name: 'Hunter', description: () => 'Reach a 7-day streak' },
  'streak-14': { name: 'Monarch', description: () => 'Reach a 14-day streak' },
  'full-week': { name: 'Full Clear', description: () => 'Complete every workout day in one program week' },
  'pushups-100': { name: 'Pushup Novice', description: (t) => `Reach ${t} lifetime pushups` },
  'pushups-500': { name: 'Pushup Adept', description: (t) => `Reach ${t} lifetime pushups` },
  'pushups-1000': { name: 'Pushup Master', description: (t) => `Reach ${t} lifetime pushups` },
  'cardio-60': { name: 'Getting Moving', description: (t) => `Reach ${t} lifetime cardio minutes` },
  'cardio-300': { name: 'Endurance', description: (t) => `Reach ${t} lifetime cardio minutes` },
  'weighins-7': { name: 'Tracker', description: () => 'Log 7 weigh-ins' },
  'kg-1': { name: 'First Step Down', description: () => 'Reach 109 kg or below' },
  'kg-3': { name: 'Momentum', description: () => 'Reach 107 kg or below' },
  'kg-5': { name: 'Breakthrough', description: () => 'Reach 105 kg or below' },
  'target-weight': { name: 'Goal Reached', description: () => 'Reach 103 kg or below' },
  'program-complete': { name: 'Program Complete', description: () => 'Complete every workout day in the 6-week program' },
};

// Returns the date each achievement's condition was first crossed, or null.
export function computeAchievements(state: AppState): Achievement[] {
  const dates = workoutDates();

  // completion order (chronological) for first-workout and running totals
  let firstWorkoutAt: string | null = null;
  let pushups100At: string | null = null;
  let pushups500At: string | null = null;
  let pushups1000At: string | null = null;
  let cardio60At: string | null = null;
  let cardio300At: string | null = null;
  let runningPushups = 0;
  let runningCardio = 0;

  const completedSorted = dates.filter((d) => state.completions[d]).sort();
  const dayByDate: Record<string, WorkoutDay> = Object.fromEntries(plan.map((d) => [d.date, d]));

  for (const date of completedSorted) {
    if (firstWorkoutAt === null) firstWorkoutAt = date;
    const day = dayByDate[date];
    let dayPushups = 0;
    for (const ex of day.strength) {
      if (isPushupExercise(ex.name)) dayPushups += lowerBoundReps(ex.reps) * ex.sets;
    }
    if (day.core) {
      for (const ex of day.core) {
        if (isPushupExercise(ex.name)) dayPushups += lowerBoundReps(ex.reps) * ex.sets;
      }
    }
    runningPushups += dayPushups;
    runningCardio += day.cardio?.minutes ?? 0;
    if (pushups100At === null && runningPushups >= 100) pushups100At = date;
    if (pushups500At === null && runningPushups >= 500) pushups500At = date;
    if (pushups1000At === null && runningPushups >= 1000) pushups1000At = date;
    if (cardio60At === null && runningCardio >= 60) cardio60At = date;
    if (cardio300At === null && runningCardio >= 300) cardio300At = date;
  }

  // streaks: find date each streak threshold was first reached
  let streak3At: string | null = null;
  let streak7At: string | null = null;
  let streak14At: string | null = null;
  {
    let running = 0;
    for (const date of dates) {
      if (state.completions[date]) {
        running++;
        if (streak3At === null && running >= 3) streak3At = date;
        if (streak7At === null && running >= 7) streak7At = date;
        if (streak14At === null && running >= 14) streak14At = date;
      } else {
        running = 0;
      }
    }
  }

  // full-week: earliest week where every workout day of that week is completed
  let fullWeekAt: string | null = null;
  {
    const weeks = Array.from(new Set(plan.map((d) => d.weekNumber))).sort((a, b) => a - b);
    for (const week of weeks) {
      const weekWorkoutDays = plan.filter((d) => d.weekNumber === week && isWorkoutDay(d));
      if (weekWorkoutDays.length === 0) continue;
      if (weekWorkoutDays.every((d) => state.completions[d.date])) {
        const lastDate = weekWorkoutDays.map((d) => d.date).sort().slice(-1)[0];
        fullWeekAt = lastDate;
        break;
      }
    }
  }

  // program-complete: all workout days done
  const allWorkoutDays = plan.filter(isWorkoutDay);
  const programComplete = allWorkoutDays.length > 0 && allWorkoutDays.every((d) => state.completions[d.date]);
  const programCompleteAt = programComplete ? allWorkoutDays.map((d) => d.date).sort().slice(-1)[0] : null;

  // weight achievements: date latest reading first crossed a threshold
  const weightEntriesSorted = Object.entries(state.weights).sort(([a], [b]) => (a < b ? -1 : 1));
  let kg1At: string | null = null;
  let kg3At: string | null = null;
  let kg5At: string | null = null;
  let targetAt: string | null = null;
  for (const [date, kg] of weightEntriesSorted) {
    if (kg1At === null && kg <= 109) kg1At = date;
    if (kg3At === null && kg <= 107) kg3At = date;
    if (kg5At === null && kg <= 105) kg5At = date;
    if (targetAt === null && kg <= TARGET_WEIGHT) targetAt = date;
  }

  const weighInDatesSorted = Object.keys(state.weights).sort();
  const weighins7At = weighInDatesSorted.length >= 7 ? weighInDatesSorted[6] : null;

  const stats = computeStats(state, completedSorted[completedSorted.length - 1] ?? plan[0].date);

  const result: Achievement[] = ([
    { id: 'first-workout', unlockedAt: firstWorkoutAt, progress: stats.workoutsCompleted > 0 ? 1 : 0, target: 1 },
    { id: 'streak-3', unlockedAt: streak3At, progress: stats.bestStreak, target: 3 },
    { id: 'streak-7', unlockedAt: streak7At, progress: stats.bestStreak, target: 7 },
    { id: 'streak-14', unlockedAt: streak14At, progress: stats.bestStreak, target: 14 },
    { id: 'full-week', unlockedAt: fullWeekAt, progress: fullWeekAt ? 1 : 0, target: 1 },
    { id: 'pushups-100', unlockedAt: pushups100At, progress: stats.lifetimePushups, target: 100 },
    { id: 'pushups-500', unlockedAt: pushups500At, progress: stats.lifetimePushups, target: 500 },
    { id: 'pushups-1000', unlockedAt: pushups1000At, progress: stats.lifetimePushups, target: 1000 },
    { id: 'cardio-60', unlockedAt: cardio60At, progress: stats.cardioMinutes, target: 60 },
    { id: 'cardio-300', unlockedAt: cardio300At, progress: stats.cardioMinutes, target: 300 },
    { id: 'weighins-7', unlockedAt: weighins7At, progress: stats.weighIns, target: 7 },
    { id: 'kg-1', unlockedAt: kg1At, progress: kg1At ? 1 : 0, target: 1 },
    { id: 'kg-3', unlockedAt: kg3At, progress: kg3At ? 1 : 0, target: 1 },
    { id: 'kg-5', unlockedAt: kg5At, progress: kg5At ? 1 : 0, target: 1 },
    { id: 'target-weight', unlockedAt: targetAt, progress: targetAt ? 1 : 0, target: 1 },
    { id: 'program-complete', unlockedAt: programCompleteAt, progress: stats.workoutsCompleted, target: allWorkoutDays.length },
  ] as { id: AchievementId; unlockedAt: string | null; progress: number; target: number }[]).map((a) => ({
    ...a,
    name: ACHIEVEMENT_META[a.id].name,
    description: ACHIEVEMENT_META[a.id].description(a.target),
  }));

  return result;
}

// ---- Goals ----

export type GoalStatus = 'active' | 'achieved' | 'expired';

export function goalProgressValue(goal: Goal, state: AppState): number {
  if (goal.type === 'weight') {
    const entries = Object.entries(state.weights)
      .filter(([date]) => date >= goal.start && date <= goal.deadline)
      .sort(([a], [b]) => (a < b ? -1 : 1));
    return entries.length > 0 ? entries[entries.length - 1][1] : (state.weights[goal.start] ?? START_WEIGHT);
  }

  const daysInRange = plan.filter(
    (d) => isWorkoutDay(d) && d.date >= goal.start && d.date <= goal.deadline && state.completions[d.date]
  );

  if (goal.type === 'workouts') return daysInRange.length;

  if (goal.type === 'pushups') {
    let total = 0;
    for (const day of daysInRange) {
      for (const ex of day.strength) {
        if (isPushupExercise(ex.name)) total += lowerBoundReps(ex.reps) * ex.sets;
      }
      if (day.core) {
        for (const ex of day.core) {
          if (isPushupExercise(ex.name)) total += lowerBoundReps(ex.reps) * ex.sets;
        }
      }
    }
    return total;
  }

  if (goal.type === 'cardio-minutes') {
    return daysInRange.reduce((sum, d) => sum + (d.cardio?.minutes ?? 0), 0);
  }

  if (goal.type === 'streak') {
    let best = 0;
    let running = 0;
    for (const d of workoutDates()) {
      if (d < goal.start || d > goal.deadline) continue;
      if (state.completions[d]) {
        running++;
        best = Math.max(best, running);
      } else {
        running = 0;
      }
    }
    return best;
  }

  return 0;
}

export function goalStatus(goal: Goal, state: AppState, todayStr: string): GoalStatus {
  const value = goalProgressValue(goal, state);
  const met = goal.type === 'weight' ? value <= goal.target : value >= goal.target;
  if (met) return 'achieved';
  if (todayStr > goal.deadline) return 'expired';
  return 'active';
}

export function goalDescription(goal: Goal): string {
  const dateLabel = new Date(`${goal.deadline}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  switch (goal.type) {
    case 'workouts':
      return `Complete ${goal.target} workouts by ${dateLabel}`;
    case 'pushups':
      return `Do ${goal.target} pushups by ${dateLabel}`;
    case 'cardio-minutes':
      return `Log ${goal.target} cardio minutes by ${dateLabel}`;
    case 'streak':
      return `Reach a ${goal.target}-day streak by ${dateLabel}`;
    case 'weight':
      return `Reach ${goal.target} kg by ${dateLabel}`;
  }
}

export type FullProgress = {
  xp: number;
  level: number;
  rank: Rank;
  xpIntoLevel: { current: number; needed: number; level: number };
  stats: Stats;
  achievements: Achievement[];
};

export function computeProgress(state: AppState, todayStr: string): FullProgress {
  const xp = totalXp(state);
  const level = levelForXp(xp);
  return {
    xp,
    level,
    rank: rankForLevel(level),
    xpIntoLevel: xpIntoLevel(xp),
    stats: computeStats(state, todayStr),
    achievements: computeAchievements(state),
  };
}
