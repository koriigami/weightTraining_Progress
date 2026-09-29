// The weekly chart on Profile: XP, sets and volume for the last 8 Monday to
// Sunday weeks. Pure functions.
//
// Two sources feed it, like the rest of the app:
// - logged workouts, scored by lib/workoutScoring (so a workout dated after
//   tomorrow does not count, and a workout with no ticked set scores nothing);
// - days of the old 6-week plan, whose XP comes from the untouched legacy
//   per-day rule and whose sets are the sets of the ticked exercises. The old
//   plan has no weights, so it adds no volume.
import { addDaysStr, mondayOf } from './date';
import { clearedStreakSeries, isItemTicked, planDay, workoutDates, xpForDay } from './progress';
import type { AppState } from './progress';
import { scoreState } from './workoutScoring';

export type WeeklyMetric = 'xp' | 'sets' | 'volume';

export const WEEKLY_METRICS: { id: WeeklyMetric; label: string }[] = [
  { id: 'xp', label: 'XP' },
  { id: 'sets', label: 'Sets' },
  { id: 'volume', label: 'Volume' },
];

export const CHART_WEEKS = 8;

export type WeekPoint = {
  monday: string; // YYYY-MM-DD, the Monday the week starts on
  xp: number;
  sets: number;
  volumeKg: number;
  current: boolean; // the week that holds today
};

export function metricValue(p: WeekPoint, metric: WeeklyMetric): number {
  return metric === 'xp' ? p.xp : metric === 'sets' ? p.sets : p.volumeKg;
}

// Sets of the strength and core items ticked on a plan day. Cardio has no sets.
function legacyDaySets(date: string, state: AppState): number {
  const day = planDay(date);
  const log = state.days[date];
  if (!day || !log) return 0;
  let sets = 0;
  day.strength.forEach((ex, i) => {
    if (isItemTicked(day, log, `s${i}`)) sets += ex.sets;
  });
  (day.core ?? []).forEach((ex, i) => {
    if (isItemTicked(day, log, `k${i}`)) sets += ex.sets;
  });
  return sets;
}

/**
 * The last `weeks` weeks, oldest first, the last one being the week that holds
 * `today`. Every week is present, with zeros when nothing was trained.
 */
export function weeklySeries(state: AppState, today: string, weeks: number = CHART_WEEKS): WeekPoint[] {
  const thisMonday = mondayOf(today);
  const points: WeekPoint[] = [];
  for (let i = weeks - 1; i >= 0; i--) {
    const monday = addDaysStr(thisMonday, -7 * i);
    points.push({ monday, xp: 0, sets: 0, volumeKg: 0, current: monday === thisMonday });
  }
  const byMonday = new Map(points.map((p) => [p.monday, p]));

  for (const s of scoreState(state, today)) {
    const p = byMonday.get(mondayOf(s.date));
    if (!p) continue;
    p.xp += s.xp;
    p.sets += s.sets;
    p.volumeKg += s.volume;
  }

  const streaks = clearedStreakSeries(state);
  for (const date of workoutDates()) {
    const log = state.days[date];
    if (!log) continue;
    const p = byMonday.get(mondayOf(date));
    if (!p) continue;
    p.xp += xpForDay(planDay(date)!, log, streaks[date]);
    p.sets += legacyDaySets(date, state);
  }
  return points;
}

// ---------------- Chart helpers ----------------

const STEPS = [10, 20, 50, 100, 200, 300, 500, 1000, 2000, 5000, 10000, 20000, 50000];

/** A round top for the chart's scale, at least as big as the biggest value. */
export function niceMax(values: readonly number[]): number {
  const top = Math.max(1, ...values);
  return STEPS.find((s) => s >= top) ?? Math.ceil(top / 50000) * 50000;
}

export type WeekLabel = { day: string; month: string | null };

/** Day-number labels under the bars. The month name shows once, on the first label and where the month changes. */
export function weekLabels(points: readonly WeekPoint[]): WeekLabel[] {
  return points.map((p, i) => {
    const month = monthShort(p.monday);
    const prev = i > 0 ? monthShort(points[i - 1].monday) : null;
    return { day: String(Number(p.monday.slice(8, 10))), month: month !== prev ? month : null };
  });
}

function monthShort(date: string): string {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' });
}
