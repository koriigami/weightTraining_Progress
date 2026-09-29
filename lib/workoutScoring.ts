// XP, personal records and weekly streaks for logged workouts. Pure functions.
//
// Rules:
//   +5 XP per ticked strength set. Cardio is 1 XP a minute (30 at most a set)
//   plus 10 when a distance is logged. An interval set is its work plus easy
//   minutes. See setXp in lib/routines.ts.
//   +50 for finishing a workout.
//   +25 per personal record: the best set (heaviest, then most reps) for an
//   exercise beats the best set of every earlier workout. The first time an
//   exercise shows up there is nothing to beat, so it is never a PR.
//   +50 the first time the weekly goal count is reached in a Monday to Sunday week.
//
// Everything is derived from the workouts, in date order, so deleting or moving
// a workout re-scores the rest. A workout with no ticked sets scores nothing,
// and a workout dated after tomorrow is ignored (tomorrow allows for time zones).
import { exerciseById } from '../data/exercises';
import type { Muscle } from '../data/exercises';
import { addDaysStr, mondayOf } from './date';
import { WORKOUT_XP, setXp, stateLookup, weeklyGoalOf, workoutTotals } from './routines';
import type { ExerciseLookup, LoggedSet, WorkoutLog, WorkoutPr } from './routines';
import type { AppState } from './progress';

export { setXp };

// Latest date a workout may carry, given today's date.
export function maxWorkoutDate(today: string): string {
  return addDaysStr(today, 1);
}

// Oldest first. Ties fall back to when it was started, then to the id.
export function chronological(workouts: WorkoutLog[]): WorkoutLog[] {
  return [...workouts].sort((a, b) => {
    if (a.when !== b.when) return a.when < b.when ? -1 : 1;
    if (a.startedAt !== b.startedAt) return a.startedAt < b.startedAt ? -1 : 1;
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });
}

type Best = { kg: number; reps: number };

const num = (v: number | undefined): number => (typeof v === 'number' && Number.isFinite(v) ? v : 0);

// The best ticked set: heaviest, then most reps. Null when nothing qualifies.
export function bestSet(sets: LoggedSet[]): Best | null {
  let best: Best | null = null;
  for (const s of sets) {
    if (!s.done || num(s.reps) < 1) continue;
    const cand = { kg: num(s.kg), reps: num(s.reps) };
    if (best === null || isBetterSet(cand, best)) best = cand;
  }
  return best;
}

export function isBetterSet(a: Best, b: Best): boolean {
  return a.kg > b.kg || (a.kg === b.kg && a.reps > b.reps);
}

export type WorkoutScore = {
  id: string;
  date: string;
  sets: number;
  volume: number; // kg
  setXp: number;
  finishXp: number;
  prXp: number;
  weeklyXp: number;
  xp: number;
  prs: WorkoutPr[];
  muscles: Muscle[]; // primary muscles of the exercises trained
  runKm: number; // distance on foot
  rideKm: number; // distance by bike
};

export type ScoreOptions = {
  weeklyGoal: number;
  lookup?: ExerciseLookup;
  maxDate?: string; // ignore workouts dated after this
};

// Scores the workouts that count, oldest first.
export function scoreWorkouts(workouts: WorkoutLog[], opts: ScoreOptions): WorkoutScore[] {
  const lookup = opts.lookup ?? exerciseById;
  const bestByExercise = new Map<string, Best>();
  const weekCounts = new Map<string, number>();
  const scores: WorkoutScore[] = [];

  for (const w of chronological(workouts)) {
    if (opts.maxDate !== undefined && w.date > opts.maxDate) continue;
    const totals = workoutTotals(w.items, lookup);
    if (totals.sets === 0) continue;

    // Best set per exercise in this workout, then compare with earlier workouts.
    const inWorkout = new Map<string, Best>();
    const muscles = new Set<Muscle>();
    let runKm = 0;
    let rideKm = 0;
    for (const item of w.items) {
      const e = lookup(item.exerciseId);
      if (!e) continue;
      if (item.sets.some((s) => s.done)) muscles.add(e.primary);
      if (e.metric === 'distance_time') {
        const km = item.sets.reduce((sum, s) => sum + (s.done ? num(s.km) : 0), 0);
        if (e.cardioKind === 'ride') rideKm += km;
        else if (e.cardioKind === 'run') runKm += km;
      }
      if (e.metric !== 'weight_reps') continue;
      const top = bestSet(item.sets);
      if (!top) continue;
      const prev = inWorkout.get(item.exerciseId);
      if (!prev || isBetterSet(top, prev)) inWorkout.set(item.exerciseId, top);
    }
    const prs: WorkoutPr[] = [];
    for (const [exerciseId, top] of inWorkout) {
      const before = bestByExercise.get(exerciseId);
      if (before && isBetterSet(top, before)) prs.push({ exerciseId, kg: top.kg, reps: top.reps });
      if (!before || isBetterSet(top, before)) bestByExercise.set(exerciseId, top);
    }

    const week = mondayOf(w.date);
    const count = (weekCounts.get(week) ?? 0) + 1;
    weekCounts.set(week, count);

    const finishXp = WORKOUT_XP.finish;
    const prXp = prs.length * WORKOUT_XP.pr;
    const weeklyXp = count === opts.weeklyGoal ? WORKOUT_XP.weeklyGoal : 0;
    scores.push({
      id: w.id,
      date: w.date,
      sets: totals.sets,
      volume: totals.volume,
      setXp: totals.xp,
      finishXp,
      prXp,
      weeklyXp,
      xp: totals.xp + finishXp + prXp + weeklyXp,
      prs,
      muscles: [...muscles],
      runKm,
      rideKm,
    });
  }
  return scores;
}

// Scores for everything in an app state. Pass today to drop future-dated workouts.
export function scoreState(state: AppState, today?: string): WorkoutScore[] {
  return scoreWorkouts(state.workouts ?? [], {
    weeklyGoal: weeklyGoalOf(state),
    lookup: stateLookup(state),
    maxDate: today !== undefined ? maxWorkoutDate(today) : undefined,
  });
}

// The workouts with xp and prs brought up to date. A workout that does not
// count keeps its place with zero XP.
export function rescoreWorkouts(state: AppState, workouts: WorkoutLog[], today?: string): WorkoutLog[] {
  const scores = scoreWorkouts(workouts, {
    weeklyGoal: weeklyGoalOf(state),
    lookup: stateLookup(state),
    maxDate: today !== undefined ? maxWorkoutDate(today) : undefined,
  });
  const byId = new Map(scores.map((s) => [s.id, s]));
  return workouts.map((w) => {
    const s = byId.get(w.id);
    return { ...w, xp: s ? s.xp : 0, prs: s ? s.prs : [] };
  });
}

// Total XP from logged workouts (badge XP is counted with the other badges).
export function workoutXpTotal(state: AppState, today?: string): number {
  return scoreState(state, today).reduce((sum, s) => sum + s.xp, 0);
}

// ---------------- Weekly streak ----------------

// Consecutive Monday to Sunday weeks with at least one finished workout. A week
// that has not had a workout yet keeps the streak alive until it ends.
export function weeklyStreaks(dates: string[], today: string): { current: number; best: number } {
  const weeks = new Set(dates.map(mondayOf));
  if (weeks.size === 0) return { current: 0, best: 0 };

  let best = 0;
  for (const w of weeks) {
    if (weeks.has(addDaysStr(w, -7))) continue; // not the start of a run
    let run = 0;
    for (let cur = w; weeks.has(cur); cur = addDaysStr(cur, 7)) run++;
    best = Math.max(best, run);
  }

  let cur = mondayOf(today);
  if (!weeks.has(cur)) cur = addDaysStr(cur, -7);
  let current = 0;
  while (weeks.has(cur)) {
    current++;
    cur = addDaysStr(cur, -7);
  }
  return { current, best };
}

// ---------------- Stats for the UI ----------------

export type WorkoutStats = {
  workouts: number;
  sets: number;
  volumeKg: number;
  prs: number;
  weeklyStreak: number;
  bestWeeklyStreak: number;
  thisWeek: number; // finished workouts this Monday to Sunday week
  weeklyGoal: number;
  musclesTrained: Muscle[];
  runKm: number;
  rideKm: number;
  xp: number;
};

export function computeWorkoutStats(state: AppState, today: string): WorkoutStats {
  const scores = scoreState(state, today);
  const streaks = weeklyStreaks(
    scores.map((s) => s.date),
    today
  );
  const monday = mondayOf(today);
  const sunday = addDaysStr(monday, 6);
  const muscles = new Set<Muscle>();
  const stats: WorkoutStats = {
    workouts: scores.length,
    sets: 0,
    volumeKg: 0,
    prs: 0,
    weeklyStreak: streaks.current,
    bestWeeklyStreak: streaks.best,
    thisWeek: 0,
    weeklyGoal: weeklyGoalOf(state),
    musclesTrained: [],
    runKm: 0,
    rideKm: 0,
    xp: 0,
  };
  for (const s of scores) {
    stats.sets += s.sets;
    stats.volumeKg += s.volume;
    stats.prs += s.prs.length;
    stats.runKm += s.runKm;
    stats.rideKm += s.rideKm;
    stats.xp += s.xp;
    if (s.date >= monday && s.date <= sunday) stats.thisWeek++;
    s.muscles.forEach((m) => muscles.add(m));
  }
  stats.musclesTrained = [...muscles];
  return stats;
}
