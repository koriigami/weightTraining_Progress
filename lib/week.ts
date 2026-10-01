// This week at a glance, and which routines are up next. Pure functions.
//
// A day counts as trained when it is a training day: its workouts add up to 20
// minutes (see scoreWorkouts). Weeks run Monday to Sunday, like the weekly streak
// and the weekly goal.
//
// dayRules and dayKind are the one rule every day view shares (Home's week strip,
// the Calendar, the Profile month strip, the Statistics chips). A day is a
// training day, a rest day or open.
import type { AppState } from './progress';
import { addDaysStr, mondayOf } from './date';
import { trainingDaysOf, weeklyStreaks } from './workoutScoring';
import { weeklyGoalOf } from './routines';
import type { Routine, WorkoutLog } from './routines';

const hasTickedSet = (w: WorkoutLog): boolean => w.items.some((it) => it.sets.some((s) => s.done));

// The date of every logged workout with a ticked set, one entry per workout, so
// two workouts on one day count twice. Oldest first. This counts sessions (the
// Profile tile), not training days.
export function trainedDates(state: Pick<AppState, 'workouts'>): string[] {
  const dates: string[] = [];
  for (const w of state.workouts ?? []) if (hasTickedSet(w)) dates.push(w.date);
  return dates.sort();
}

// ---------------- Day rules ----------------

// training  reached 20 minutes
// rest      a past day without a training day, on or after the first logged workout,
//           or a day still to come this week once the weekly goal is met
// open      today until it becomes a training day, days still to come, and days
//           before the first logged workout
export type DayKind = 'training' | 'rest' | 'open';

export type DayRules = {
  training: ReadonlySet<string>; // the training days
  since: string | null; // the first logged workout; no rest days before it, and none at all when null
  today: string;
  goalMetThisWeek: boolean; // the training days in today's week reach the weekly goal
};

// `trainingDays` are the dates that reached 20 minutes (trainingDaysOf), `firstWorkout`
// is the date of the earliest workout with a ticked set (the first of trainedDates),
// and `goal` is the weekly goal. Without a goal the days ahead are never rest days.
export function dayRules(trainingDays: readonly string[], firstWorkout: string | null, today: string, goal?: number): DayRules {
  const training = new Set(trainingDays);
  const monday = mondayOf(today);
  const sunday = addDaysStr(monday, 6);
  let inWeek = 0;
  for (const d of training) if (d >= monday && d <= sunday) inWeek++;
  return { training, since: firstWorkout, today, goalMetThisWeek: goal !== undefined && inWeek >= goal };
}

// Today is never a rest day: it stays open until it becomes a training day.
export function dayKind(date: string, r: DayRules): DayKind {
  if (r.training.has(date)) return 'training';
  if (r.since === null || date < r.since) return 'open';
  if (date < r.today) return 'rest';
  const sunday = addDaysStr(mondayOf(r.today), 6);
  if (date > r.today && date <= sunday && r.goalMetThisWeek) return 'rest';
  return 'open';
}

export type WeekDot = {
  date: string;
  label: string; // M T W T F S S
  day: number; // day of the month
  done: boolean; // a training day
  rest: boolean; // shown as "Rest" (dayKind)
  today: boolean;
  future: boolean;
};

const LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

function dotsFor(r: DayRules): WeekDot[] {
  const monday = mondayOf(r.today);
  return LABELS.map((label, i) => {
    const date = addDaysStr(monday, i);
    const kind = dayKind(date, r);
    return { date, label, day: Number(date.slice(8, 10)), done: kind === 'training', rest: kind === 'rest', today: date === r.today, future: date > r.today };
  });
}

// Monday to Sunday of the week that holds `today`. `dates` are training days and
// `since` is the first logged workout (null means no rest days at all). The rest
// days follow dayKind.
export function weekDots(dates: readonly string[], today: string, goal?: number, since: string | null = null): WeekDot[] {
  return dotsFor(dayRules(dates, since, today, goal));
}

// True when the next training day pays the comeback bonus: this week has none yet,
// last week had none, and there was a training day before that. `dates` are
// training days. This is the same test scoreWorkouts uses to pay it.
export function comebackPending(dates: readonly string[], today: string): boolean {
  const monday = mondayOf(today);
  const lastMonday = addDaysStr(monday, -7);
  return dates.some((d) => d < lastMonday) && !dates.some((d) => d >= lastMonday);
}

export type WeekSummary = {
  dots: WeekDot[];
  count: number; // training days this week
  goal: number;
  streak: number; // weeks in a row with at least one training day
  comeback: boolean; // the next training day pays the comeback bonus
  rules: DayRules; // the day rule, for the Calendar and the Profile month strip
};

export function weekSummary(state: AppState, today: string): WeekSummary {
  const dates = trainingDaysOf(state, today);
  const monday = mondayOf(today);
  const sunday = addDaysStr(monday, 6);
  const goal = weeklyGoalOf(state);
  const rules = dayRules(dates, trainedDates(state)[0] ?? null, today, goal);
  return {
    dots: dotsFor(rules),
    count: dates.filter((d) => d >= monday && d <= sunday).length,
    goal,
    streak: weeklyStreaks(dates, today).current,
    comeback: comebackPending(dates, today),
    rules,
  };
}

// ---------------- Up next ----------------

export type UpNextItem = {
  routine: Routine;
  done: number; // workouts started from it this week
  target: number | null; // its weekly target, null for "Any"
  lastDate: string | null; // the last time it was done
};

// How many workouts this week started from the routine, and when it was last done.
export function routineWeekStats(routine: Routine, workouts: readonly WorkoutLog[], today: string): UpNextItem {
  const monday = mondayOf(today);
  const sunday = addDaysStr(monday, 6);
  let done = 0;
  let lastDate: string | null = null;
  for (const w of workouts) {
    if (w.routineId !== routine.id || !hasTickedSet(w)) continue;
    if (w.date >= monday && w.date <= sunday) done++;
    if (lastDate === null || w.date > lastDate) lastDate = w.date;
  }
  return { routine, done, target: routine.timesPerWeek ?? null, lastDate };
}

// Least recently done first, and never done before that.
const byLeastRecent = (a: UpNextItem, b: UpNextItem) => {
  if (a.lastDate === b.lastDate) return 0;
  if (a.lastDate === null) return -1;
  if (b.lastDate === null) return 1;
  return a.lastDate < b.lastDate ? -1 : 1;
};

// Routines below their weekly count. When no routine has a weekly count, the ones
// done least recently. When every routine with a count has reached it, nothing,
// and `allDone` says so.
export function upNextRoutines(routines: readonly Routine[], workouts: readonly WorkoutLog[], today: string, max = 2): { items: UpNextItem[]; allDone: boolean } {
  const all = routines.map((r) => routineWeekStats(r, workouts, today));
  const pending = all.filter((s) => s.target !== null && s.done < s.target);
  if (pending.length > 0) return { items: [...pending].sort(byLeastRecent).slice(0, max), allDone: false };
  if (all.some((s) => s.target !== null)) return { items: [], allDone: true };
  return { items: [...all].sort(byLeastRecent).slice(0, max), allDone: false };
}
