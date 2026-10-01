// XP, records, training days and weekly streaks for logged workouts. Pure functions.
//
// Rules (v3):
//   +5 XP per ticked strength set that has a rep (or a 5 second hold). Cardio is
//   1 XP a minute (30 at most a set) plus 10 when a distance is logged. An
//   interval set is its work plus easy minutes, also capped at 30. See setXp in
//   lib/routines.ts.
//   +10 for beating last time and +25 for an all-time record, once per exercise
//   per workout. A record replaces the beat. The first time an exercise shows up
//   there is nothing to beat, so it earns neither.
//   +50 daily bonus, once a day, on the workout that takes the day's training to
//   20 minutes. Every workout of the date adds up, strength and cardio together:
//   a ticked strength set that earns XP counts 3 minutes, cardio counts its own
//   minutes (not capped, only the XP is). The plan does not matter. A date that
//   reaches 20 minutes is a training day.
//   +50 on the workout that makes the Monday to Sunday week's training days
//   reach the weekly goal.
//   +25 comeback on the first training day after a whole Monday to Sunday week
//   with none, never for a person's first training day.
//
// Everything is derived from the workouts, in date order, so deleting or moving
// a workout re-scores the rest. A workout with no ticked sets scores nothing,
// and a workout dated after tomorrow is ignored (tomorrow allows for time zones).
// The plan a workout set out to do is kept only for the Clean Sweep badge.
import { exerciseById } from '../data/exercises';
import type { ExerciseDef, Muscle } from '../data/exercises';
import { addDaysStr, mondayOf } from './date';
import { WORKOUT_XP, setXp, stateLookup, weeklyGoalOf, workoutTotals } from './routines';
import type { ExerciseLookup, LoggedSet, PlanItem, WorkoutItem, WorkoutLog, WorkoutMark, XpParts } from './routines';
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

// ---------------- One exercise in one workout ----------------

// The workout's best set of an exercise, as far as beat and record care. Which
// fields are set depends on the metric: weight_reps kg and reps, reps reps,
// time sec, distance_time km and min.
type Perf = { kg: number; reps: number; sec: number; km: number; min: number };

const NO_PERF: Perf = { kg: 0, reps: 0, sec: 0, km: 0, min: 0 };

// A ticked set that earns XP. This is what "done" means for a plan item.
function qualifies(e: ExerciseDef, s: LoggedSet): boolean {
  return s.done && setXp(e, s) > 0;
}

// Cardio: the most distance wins, then the fewest minutes for it. With no
// distance anywhere, the most minutes.
function betterCardio(a: Perf, b: Perf): boolean {
  if (a.km !== b.km) return a.km > b.km;
  if (a.km > 0) return a.min < b.min;
  return a.min > b.min;
}

function perfOf(e: ExerciseDef, sets: LoggedSet[]): Perf | null {
  let best: Perf | null = null;
  for (const s of sets) {
    if (!qualifies(e, s)) continue;
    const cand: Perf = { ...NO_PERF };
    let better: boolean;
    switch (e.metric) {
      case 'weight_reps':
        cand.kg = num(s.kg);
        cand.reps = num(s.reps);
        better = best === null || isBetterSet(cand, best);
        break;
      case 'reps':
        cand.reps = num(s.reps);
        better = best === null || cand.reps > best.reps;
        break;
      case 'time':
        cand.sec = num(s.sec);
        better = best === null || cand.sec > best.sec;
        break;
      case 'distance_time':
        cand.km = num(s.km);
        cand.min = num(s.min);
        better = best === null || betterCardio(cand, best);
        break;
      default:
        return null; // intervals have no beat or record
    }
    if (better) best = cand;
  }
  return best;
}

// Beat last time: better than the most recent earlier workout with the exercise.
function beatsLast(e: ExerciseDef, cur: Perf, last: Perf): boolean {
  switch (e.metric) {
    case 'weight_reps':
      return (cur.kg > last.kg && cur.reps >= last.reps) || (cur.kg === last.kg && cur.reps > last.reps);
    case 'reps':
      return cur.reps > last.reps;
    case 'time':
      return cur.sec > last.sec;
    case 'distance_time':
      if (cur.km > last.km) return true;
      if (cur.km >= last.km && cur.km > 0) return cur.min < last.min;
      if (cur.km === 0 && last.km === 0) return cur.min > last.min;
      return false;
    default:
      return false;
  }
}

// Record: better than every earlier workout. Cardio records are about distance only.
function isRecord(e: ExerciseDef, cur: Perf, best: Perf): boolean {
  switch (e.metric) {
    case 'weight_reps':
      return isBetterSet(cur, best);
    case 'reps':
      return cur.reps > best.reps;
    case 'time':
      return cur.sec > best.sec;
    case 'distance_time':
      return cur.km > 0 && cur.km > best.km;
    default:
      return false;
  }
}

// The best of two workouts' efforts, for the all-time best. Cardio keeps the
// longest distance (minutes come from the same effort).
function bestOf(e: ExerciseDef, a: Perf | undefined, b: Perf): Perf {
  if (!a) return b;
  switch (e.metric) {
    case 'weight_reps':
      return isBetterSet(b, a) ? b : a;
    case 'reps':
      return b.reps > a.reps ? b : a;
    case 'time':
      return b.sec > a.sec ? b : a;
    default:
      return b.km > a.km ? b : a;
  }
}

function markOf(e: ExerciseDef, exerciseId: string, kind: WorkoutMark['kind'], p: Perf): WorkoutMark {
  switch (e.metric) {
    case 'weight_reps':
      return { exerciseId, kind, kg: p.kg, reps: p.reps };
    case 'reps':
      return { exerciseId, kind, reps: p.reps };
    case 'time':
      return { exerciseId, kind, sec: p.sec };
    default:
      return { exerciseId, kind, km: p.km, min: p.min };
  }
}

// ---------------- The plan ----------------

// The plan is kept for the Clean Sweep badge only. It does not decide any XP.

// The plan a workout is judged against: the snapshot taken at Start, or for
// older workouts what they ticked.
export function planOf(w: Pick<WorkoutLog, 'plan' | 'items'>): PlanItem[] {
  if (w.plan) return w.plan.filter((p) => p.sets >= 1);
  return w.items
    .map((item) => ({ exerciseId: item.exerciseId, sets: item.sets.filter((s) => s.done).length }))
    .filter((p) => p.sets >= 1);
}

type PlanResult = { complete: boolean; missing: string[] };

// Done means at least `sets` qualifying sets of that exercise.
function checkPlan(plan: PlanItem[], items: WorkoutItem[], lookup: ExerciseLookup): PlanResult {
  const missing: string[] = [];
  for (const p of plan) {
    const e = lookup(p.exerciseId);
    const item = items.find((i) => i.exerciseId === p.exerciseId);
    const done = e && item ? item.sets.filter((s) => qualifies(e, s)).length : 0;
    if (done < p.sets) missing.push(p.exerciseId);
  }
  return { complete: plan.length > 0 && missing.length === 0, missing };
}

// ---------------- Live marks ----------------

export type LiveMark = { exerciseId: string; kind: WorkoutMark['kind']; xp: number };

// The "Beat last time" and "Record" chips of a workout still in progress: the
// same rules as scoreWorkouts, judged against the saved workouts. An exercise
// with no earlier workout earns neither.
export function liveMarks(items: WorkoutItem[], history: readonly WorkoutLog[], lookup: ExerciseLookup = exerciseById): LiveMark[] {
  const marks: LiveMark[] = [];
  const ordered = chronological([...history]);
  for (const item of items) {
    const e = lookup(item.exerciseId);
    if (!e) continue;
    const perf = perfOf(e, item.sets);
    if (!perf) continue;
    let last: Perf | undefined;
    let best: Perf | undefined;
    for (const w of ordered) {
      const before = w.items.find((i) => i.exerciseId === item.exerciseId);
      const p = before ? perfOf(e, before.sets) : null;
      if (!p) continue;
      last = p;
      best = bestOf(e, best, p);
    }
    if (!last || !best) continue;
    if (isRecord(e, perf, best)) marks.push({ exerciseId: item.exerciseId, kind: 'record', xp: WORKOUT_XP.record });
    else if (beatsLast(e, perf, last)) marks.push({ exerciseId: item.exerciseId, kind: 'beat', xp: WORKOUT_XP.beat });
  }
  return marks;
}

// Push-up variations, for the Pushup Path badge, the Pushup Month badge and goals.
export function isPushup(e: ExerciseDef | undefined): boolean {
  return Boolean(e && /push[ -]?up/i.test(e.name));
}

// ---------------- Training minutes and days ----------------

// What a set of items counts towards the daily bonus: every ticked strength set
// that earns XP is minutesPerSet minutes, and cardio is the minutes it says (an
// interval set is its work plus easy minutes). Cardio minutes are not capped,
// only the XP for them is.
export function trainingMinutes(items: readonly WorkoutItem[], lookup: ExerciseLookup = exerciseById): number {
  let minutes = 0;
  for (const item of items) {
    const e = lookup(item.exerciseId);
    if (!e) continue;
    for (const s of item.sets) {
      if (!s.done) continue;
      if (e.metric === 'distance_time') minutes += num(s.min);
      else if (e.metric === 'intervals') minutes += num(s.on) + num(s.off);
      else if (setXp(e, s) > 0) minutes += WORKOUT_XP.minutesPerSet;
    }
  }
  return minutes;
}

// Minutes trained on a date: the saved workouts dated that day, plus the items of
// a workout still in progress. This is the number the live popover counts up to 20.
// `before` (a local `when`, YYYY-MM-DDTHH:mm) keeps only saved workouts at or before
// that moment. Scoring goes in `when` order, so a workout in progress, saved with
// `when` = the time it finishes, only builds on the ones that come before it.
export function dayMinutes(
  workouts: readonly WorkoutLog[],
  date: string,
  live?: readonly WorkoutItem[],
  lookup: ExerciseLookup = exerciseById,
  before?: string,
): number {
  let minutes = live ? trainingMinutes(live, lookup) : 0;
  for (const w of workouts) if (w.date === date && (before === undefined || w.when <= before)) minutes += trainingMinutes(w.items, lookup);
  return minutes;
}

// True when the saved workouts of a date, up to `before` when given, have already
// paid its daily bonus, so a workout finished then will not pay it again.
export function dailyBonusPaid(workouts: readonly WorkoutLog[], date: string, lookup: ExerciseLookup = exerciseById, before?: string): boolean {
  return dayMinutes(workouts, date, undefined, lookup, before) >= WORKOUT_XP.dailyMinutes;
}

// ---------------- Scoring ----------------

export type WorkoutScore = {
  id: string;
  date: string;
  routineId?: string;
  finishedAt: string;
  sets: number; // ticked sets
  volume: number; // kg
  setXp: number; // sets and cardio, before any bonus
  beatXp: number;
  recordXp: number;
  dailyXp: number; // the daily bonus, paid on the workout that takes the day to 20 minutes
  weeklyXp: number;
  comebackXp: number;
  xp: number;
  parts: XpParts;
  marks: WorkoutMark[];
  records: number; // marks that are records
  minutes: number; // this workout's training minutes
  dayMinutes: number; // the date's training minutes once this workout is counted
  trainingDay: boolean; // this workout is the one that made its date a training day
  planComplete: boolean;
  planMissing: string[];
  cleanSweep: boolean; // a routine's own plan, every planned set ticked
  muscles: Muscle[]; // primary muscles of the exercises trained
  cardioMinutes: number;
  pushupReps: number;
  km: number; // all distance cardio
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
  const lastByExercise = new Map<string, Perf>();
  const bestByExercise = new Map<string, Perf>();
  const minutesByDate = new Map<string, number>();
  const trainingDaysByWeek = new Map<string, number>();
  const trainingDates = new Set<string>();
  let firstTrainingDay: string | null = null;
  const scores: WorkoutScore[] = [];

  for (const w of chronological(workouts)) {
    if (opts.maxDate !== undefined && w.date > opts.maxDate) continue;
    const totals = workoutTotals(w.items, lookup);
    if (totals.sets === 0) continue;

    const muscles = new Set<Muscle>();
    const inWorkout = new Map<string, { e: ExerciseDef; perf: Perf }>();
    const parts: XpParts = { sets: 0, cardio: 0, beat: 0, record: 0, finish: 0, weekly: 0, comeback: 0 };
    const marks: WorkoutMark[] = [];
    let runKm = 0;
    let rideKm = 0;
    let pushupReps = 0;
    for (const item of w.items) {
      const e = lookup(item.exerciseId);
      if (!e) continue;
      if (item.sets.some((s) => s.done)) muscles.add(e.primary);
      for (const s of item.sets) {
        if (!s.done) continue;
        const xp = setXp(e, s);
        if (e.metric === 'distance_time' || e.metric === 'intervals') parts.cardio += xp;
        else parts.sets += xp;
        if (isPushup(e) && xp > 0) pushupReps += num(s.reps);
      }
      if (e.metric === 'distance_time') {
        const km = item.sets.reduce((sum, s) => sum + (s.done ? num(s.km) : 0), 0);
        if (e.cardioKind === 'ride') rideKm += km;
        else if (e.cardioKind === 'run') runKm += km;
      }
      const perf = perfOf(e, item.sets);
      if (perf) inWorkout.set(item.exerciseId, { e, perf });
    }

    // Beat last time or record, once per exercise. Then this workout becomes the
    // new "last time" and may raise the all-time best.
    for (const [exerciseId, { e, perf }] of inWorkout) {
      const last = lastByExercise.get(exerciseId);
      const best = bestByExercise.get(exerciseId);
      if (last && best) {
        if (isRecord(e, perf, best)) {
          marks.push(markOf(e, exerciseId, 'record', perf));
          parts.record += WORKOUT_XP.record;
        } else if (beatsLast(e, perf, last)) {
          marks.push(markOf(e, exerciseId, 'beat', perf));
          parts.beat += WORKOUT_XP.beat;
        }
      }
      lastByExercise.set(exerciseId, perf);
      bestByExercise.set(exerciseId, bestOf(e, best, perf));
    }

    // The daily bonus: every workout of the date adds its minutes, and the one
    // that takes the day to the bar pays once and makes the date a training day.
    // That moment also counts towards the weekly goal and can pay the comeback.
    const minutes = trainingMinutes(w.items, lookup);
    const dayTotal = (minutesByDate.get(w.date) ?? 0) + minutes;
    minutesByDate.set(w.date, dayTotal);
    let trainingDay = false;
    if (!trainingDates.has(w.date) && dayTotal >= WORKOUT_XP.dailyMinutes) {
      trainingDay = true;
      trainingDates.add(w.date);
      parts.finish = WORKOUT_XP.daily;
      const week = mondayOf(w.date);
      const inWeek = (trainingDaysByWeek.get(week) ?? 0) + 1;
      trainingDaysByWeek.set(week, inWeek);
      if (inWeek === opts.weeklyGoal) parts.weekly = WORKOUT_XP.weeklyGoal;
      // First training day of its week, the week before it was empty, and there
      // was training before that.
      if (inWeek === 1 && !trainingDaysByWeek.has(addDaysStr(week, -7)) && firstTrainingDay !== null && firstTrainingDay < w.date) parts.comeback = WORKOUT_XP.comeback;
      if (firstTrainingDay === null || w.date < firstTrainingDay) firstTrainingDay = w.date;
    }

    const plan = planOf(w);
    const check = checkPlan(plan, w.items, lookup);

    scores.push({
      id: w.id,
      date: w.date,
      ...(w.routineId ? { routineId: w.routineId } : {}),
      finishedAt: w.finishedAt,
      sets: totals.sets,
      volume: totals.volume,
      setXp: parts.sets + parts.cardio,
      beatXp: parts.beat,
      recordXp: parts.record,
      dailyXp: parts.finish,
      weeklyXp: parts.weekly,
      comebackXp: parts.comeback ?? 0,
      xp: parts.sets + parts.cardio + parts.beat + parts.record + parts.finish + parts.weekly + (parts.comeback ?? 0),
      parts,
      marks,
      records: marks.filter((m) => m.kind === 'record').length,
      minutes,
      dayMinutes: dayTotal,
      trainingDay,
      planComplete: check.complete,
      planMissing: check.missing,
      cleanSweep: Boolean(w.routineId) && w.plan !== undefined && check.complete,
      muscles: [...muscles],
      cardioMinutes: totals.cardioMinutes,
      pushupReps,
      km: totals.km,
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

// The workouts with xp, marks and the plan result brought up to date. A workout
// that does not count keeps its place with zero XP.
export function rescoreWorkouts(state: AppState, workouts: WorkoutLog[], today?: string): WorkoutLog[] {
  const scores = scoreWorkouts(workouts, {
    weeklyGoal: weeklyGoalOf(state),
    lookup: stateLookup(state),
    maxDate: today !== undefined ? maxWorkoutDate(today) : undefined,
  });
  const byId = new Map(scores.map((s) => [s.id, s]));
  return workouts.map((w) => {
    const { prs: _old, ...rest } = w;
    void _old;
    const s = byId.get(w.id);
    if (!s) {
      return { ...rest, xp: 0, marks: [], xpParts: { sets: 0, cardio: 0, beat: 0, record: 0, finish: 0, weekly: 0, comeback: 0 }, planComplete: false, planMissing: [] };
    }
    return { ...rest, xp: s.xp, marks: s.marks, xpParts: s.parts, planComplete: s.planComplete, planMissing: s.planMissing };
  });
}

// Total XP from logged workouts (badge XP is counted with the other badges).
export function workoutXpTotal(state: AppState, today?: string): number {
  return scoreState(state, today).reduce((sum, s) => sum + s.xp, 0);
}

// ---------------- Weekly streak ----------------

// The dates that are training days (a date that reached 20 minutes), oldest first,
// one per day.
export function trainingDays(scores: readonly WorkoutScore[]): string[] {
  return scores.filter((s) => s.trainingDay).map((s) => s.date).sort();
}

// The training days of an app state. Pass today to drop future-dated workouts.
export function trainingDaysOf(state: AppState, today?: string): string[] {
  return trainingDays(scoreState(state, today));
}

// Consecutive Monday to Sunday weeks with at least one training day. Pass the
// training days (trainingDays), not every workout date: a week with only a short
// workout does not count. A week that has not had a training day yet keeps the
// streak alive until it ends.
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
  records: number;
  weeklyStreak: number;
  bestWeeklyStreak: number;
  thisWeek: number; // training days this Monday to Sunday week
  weeklyGoal: number;
  musclesTrained: Muscle[];
  runKm: number;
  rideKm: number;
  xp: number;
};

export function computeWorkoutStats(state: AppState, today: string): WorkoutStats {
  const scores = scoreState(state, today);
  const streaks = weeklyStreaks(trainingDays(scores), today);
  const monday = mondayOf(today);
  const sunday = addDaysStr(monday, 6);
  const muscles = new Set<Muscle>();
  const stats: WorkoutStats = {
    workouts: scores.length,
    sets: 0,
    volumeKg: 0,
    records: 0,
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
    stats.records += s.records;
    stats.runKm += s.runKm;
    stats.rideKm += s.rideKm;
    stats.xp += s.xp;
    if (s.trainingDay && s.date >= monday && s.date <= sunday) stats.thisWeek++;
    s.muscles.forEach((m) => muscles.add(m));
  }
  stats.musclesTrained = [...muscles];
  return stats;
}
