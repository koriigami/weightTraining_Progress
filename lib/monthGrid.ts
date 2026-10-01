// The Calendar screen's month grid and day lookup. Pure.
//
// Weeks start on Monday, like the weekly streak and goal. The workouts of a day come
// from the workout feed. Whether a day is a training day, a rest day or open is the
// shared rule in week.ts (dayKind), not decided here.
import { addDaysStr, lastDayOfMonth, monthLabel } from './date';
import { buildFeed } from './feed';
import type { FeedItem } from './feed';
import type { AppState } from './progress';
import { stateLookup } from './routines';
import type { ExerciseLookup } from './routines';

export type MonthDay = { date: string; day: number };

export type MonthGrid = {
  month: string; // YYYY-MM
  label: string; // "September 2026"
  leading: number; // empty cells before the 1st, Monday first
  days: MonthDay[];
};

/** "2026-09-29" as "2026-09". */
export const monthOf = (date: string): string => date.slice(0, 7);

/** The month `delta` months from `month` (YYYY-MM). */
export function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split('-').map(Number);
  const idx = y * 12 + (m - 1) + delta;
  return `${Math.floor(idx / 12)}-${String((idx % 12) + 1).padStart(2, '0')}`;
}

/** The cells of one month: how many blanks lead the 1st (Monday first) and every day. */
export function monthGrid(month: string): MonthGrid {
  const first = `${month}-01`;
  const last = lastDayOfMonth(first);
  const count = Number(last.slice(8, 10));
  const leading = (new Date(`${first}T00:00:00Z`).getUTCDay() + 6) % 7;
  const days = Array.from({ length: count }, (_, i) => ({ date: addDaysStr(first, i), day: i + 1 }));
  return { month, label: monthLabel(month), leading, days };
}

/** Every workout keyed by its date, newest first inside a day. */
export function sessionsByDate(state: AppState, lookup: ExerciseLookup = stateLookup(state)): Map<string, FeedItem[]> {
  const map = new Map<string, FeedItem[]>();
  for (const item of buildFeed(state, lookup)) {
    const list = map.get(item.date);
    if (list) list.push(item);
    else map.set(item.date, [item]);
  }
  return map;
}

/** The workouts of one day, or an empty list. */
export function sessionsOn(byDate: Map<string, FeedItem[]>, date: string): FeedItem[] {
  return byDate.get(date) ?? [];
}

/** How many of the training days fall in a month (YYYY-MM). Each date counts once. */
export function trainingDaysInMonth(trainingDays: Iterable<string>, month: string): number {
  const inMonth = new Set<string>();
  for (const d of trainingDays) if (monthOf(d) === month) inMonth.add(d);
  return inMonth.size;
}
