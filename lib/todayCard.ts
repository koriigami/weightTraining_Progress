// What the Today card on Home shows, as pure functions: the routine that is due,
// or the workouts already finished today. Ready and Done are one card in two states.
import { exerciseById } from '../data/exercises';
import type { ExerciseDef } from '../data/exercises';
import { formatDateShort } from './date';
import { fmtMinutes } from './liveStats';
import type { AppState } from './progress';
import { stateLookup } from './routines';
import type { ExerciseLookup, Routine, RoutineItem, WorkoutLog } from './routines';
import { workoutToFeedItem } from './feed';
import { fmtDistance } from './units';
import type { DistanceUnit } from './units';
import { routineWeekStats, upNextRoutines } from './week';
import type { UpNextItem } from './week';

const num = (v: number | undefined): number => (typeof v === 'number' && Number.isFinite(v) ? v : 0);

/** Every strength set counts 3 minutes and cardio counts what it plans, rounded to 5 (at least 5). */
export function estimateRoutineMinutes(items: readonly RoutineItem[], lookup: ExerciseLookup = exerciseById): number {
  let m = 0;
  for (const item of items) {
    const e = lookup(item.exerciseId);
    if (e?.metric === 'distance_time') for (const s of item.sets) m += num(s.min);
    else if (e?.metric === 'intervals') for (const s of item.sets) m += num(s.on) + num(s.off);
    else m += item.sets.length * 3;
  }
  return Math.max(5, Math.round(m / 5) * 5);
}

/** "5 exercises · 50 min". */
export function routineLine(routine: Routine, lookup: ExerciseLookup = exerciseById): string {
  const n = routine.items.length;
  return `${n} ${n === 1 ? 'exercise' : 'exercises'} · ${estimateRoutineMinutes(routine.items, lookup)} min`;
}

/** "1 of 2 this week" for a routine with a weekly count, else null. */
export function weekChip(item: UpNextItem): string | null {
  return item.target === null ? null : `${item.done} of ${item.target} this week`;
}

// Least recently done first, and never done before that.
const byLeastRecent = (a: UpNextItem, b: UpNextItem) => ((a.lastDate ?? '') < (b.lastDate ?? '') ? -1 : a.lastDate === b.lastDate ? 0 : 1);

/**
 * The routines Home suggests, best first: the ones below their weekly count (up next), then
 * the rest, done least recently first. So there is always one to lead with when a routine exists.
 */
export function routinesDue(routines: readonly Routine[], workouts: readonly WorkoutLog[], today: string, max: number): UpNextItem[] {
  const pending = upNextRoutines(routines, workouts, today, routines.length).items;
  const ids = new Set(pending.map((p) => p.routine.id));
  const rest = routines.filter((r) => !ids.has(r.id)).map((r) => routineWeekStats(r, workouts, today)).sort(byLeastRecent);
  return [...pending, ...rest].slice(0, max);
}

/** The routine the Today card leads with: the first of up next. */
export function todayRoutine(routines: readonly Routine[], workouts: readonly WorkoutLog[], today: string): UpNextItem | null {
  return routinesDue(routines, workouts, today, 1)[0] ?? null;
}

/** "4 exercises · 0 of 1 this week", or when it was last done for a routine with no weekly count. */
export function routineWeekLine(item: UpNextItem): string {
  const n = item.routine.items.length;
  const base = `${n} ${n === 1 ? 'exercise' : 'exercises'}`;
  if (item.target !== null) return `${base} · ${item.done} of ${item.target} this week`;
  return item.lastDate ? `${base} · last done ${formatDateShort(item.lastDate)}` : base;
}

/** One row of a finished workout: a green tick, and the minutes for cardio. */
export type DoneRow = { key: string; name: string; exercise: Pick<ExerciseDef, 'primary' | 'secondary'> | null; minutes: number | null };

export type DoneWorkout = {
  id: string;
  title: string;
  meta: string; // "52 min · 12 sets · +105 XP", or "11.2 km · +90 XP" for cardio
  xp: number;
  rows: DoneRow[]; // the first three
};

export type TodayModel = { kind: 'ready'; routine: UpNextItem | null } | { kind: 'done'; xp: number; workouts: DoneWorkout[] };

const ROWS = 3;

function rowsOf(w: WorkoutLog, lookup: ExerciseLookup): DoneRow[] {
  const rows: DoneRow[] = [];
  for (const item of w.items) {
    const done = item.sets.filter((s) => s.done);
    if (done.length === 0) continue;
    const e = lookup(item.exerciseId);
    let minutes: number | null = null;
    if (e?.metric === 'distance_time') minutes = done.reduce((sum, s) => sum + num(s.min), 0);
    else if (e?.metric === 'intervals') minutes = done.reduce((sum, s) => sum + num(s.on) + num(s.off), 0);
    rows.push({ key: item.exerciseId, name: e?.name ?? 'Exercise', exercise: e ?? null, minutes });
  }
  return rows;
}

/** The workout as the Today card lists it, or null when nothing in it was ticked. */
export function doneWorkout(w: WorkoutLog, lookup: ExerciseLookup, units: { distance: DistanceUnit }): DoneWorkout | null {
  const item = workoutToFeedItem(w, lookup);
  if (!item) return null;
  const xp = `+${item.xp} XP`;
  let meta: string;
  if (item.kind === 'cardio') {
    meta = item.km > 0 ? `${fmtDistance(item.km, units.distance)} · ${xp}` : `${fmtMinutes(item.cardioMinutes || item.minutes || 0)} · ${xp}`;
  } else {
    const parts = [item.minutes !== null ? fmtMinutes(item.minutes) : null, `${item.sets} ${item.sets === 1 ? 'set' : 'sets'}`, xp];
    meta = parts.filter(Boolean).join(' · ');
  }
  const rows = rowsOf(w, lookup);
  return { id: w.id, title: w.title, meta, xp: item.xp, rows: rows.slice(0, ROWS) };
}

/** Done when at least one workout is dated today, otherwise Ready with the routine that is due. */
export function todayModel(state: AppState, today: string, units: { distance: DistanceUnit }): TodayModel {
  const lookup = stateLookup(state);
  const workouts = state.workouts ?? [];
  const done = workouts
    .filter((w) => w.date === today)
    .sort((a, b) => (a.when === b.when ? 0 : a.when < b.when ? -1 : 1))
    .map((w) => doneWorkout(w, lookup, units))
    .filter((d): d is DoneWorkout => d !== null);
  if (done.length > 0) return { kind: 'done', xp: done.reduce((sum, d) => sum + d.xp, 0), workouts: done };
  return { kind: 'ready', routine: todayRoutine(state.routines ?? [], workouts, today) };
}
