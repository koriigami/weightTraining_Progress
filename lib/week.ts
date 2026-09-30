// This week at a glance, and which routines are up next. Pure functions.
//
// A day counts as trained when there is a logged workout with a ticked set on it.
// Weeks run Monday to Sunday, like the weekly streak and the weekly goal.
import type { AppState } from './progress';
import { addDaysStr, mondayOf } from './date';
import { weeklyStreaks } from './workoutScoring';
import { weeklyGoalOf } from './routines';
import type { Routine, WorkoutLog } from './routines';

const hasTickedSet = (w: WorkoutLog): boolean => w.items.some((it) => it.sets.some((s) => s.done));

// The date of every training session, one entry per workout, so two workouts on
// one day count twice. Oldest first.
export function trainedDates(state: Pick<AppState, 'workouts'>): string[] {
  const dates: string[] = [];
  for (const w of state.workouts ?? []) if (hasTickedSet(w)) dates.push(w.date);
  return dates.sort();
}

export type WeekDot = {
  date: string;
  label: string; // M T W T F S S
  day: number; // day of the month
  done: boolean;
  today: boolean;
  future: boolean;
};

const LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

// Monday to Sunday of the week that holds `today`.
export function weekDots(dates: readonly string[], today: string): WeekDot[] {
  const monday = mondayOf(today);
  const set = new Set(dates);
  return LABELS.map((label, i) => {
    const date = addDaysStr(monday, i);
    return { date, label, day: Number(date.slice(8, 10)), done: set.has(date), today: date === today, future: date > today };
  });
}

export type WeekSummary = {
  dots: WeekDot[];
  count: number; // sessions this week
  goal: number;
  streak: number; // weeks in a row with at least one session
};

export function weekSummary(state: AppState, today: string): WeekSummary {
  const dates = trainedDates(state);
  const monday = mondayOf(today);
  const sunday = addDaysStr(monday, 6);
  return {
    dots: weekDots(dates, today),
    count: dates.filter((d) => d >= monday && d <= sunday).length,
    goal: weeklyGoalOf(state),
    streak: weeklyStreaks([...new Set(dates)], today).current,
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
