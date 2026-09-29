// The Recent workouts feed. It mixes two kinds of entry:
// - workouts logged with the new log, and
// - days of the old 6-week plan with something ticked, shown as "6-week plan"
//   workouts. Their title comes from the plan day, their sets from the ticked
//   items and their XP from the per-day helpers in lib/progress.ts.
import { exerciseById } from '../data/exercises';
import type { ExerciseDef } from '../data/exercises';
import { allItemKeys, clearedStreakSeries, dayDoneCount, exerciseForKey, isItemTicked, isWorkoutDay, planDay, xpForDay } from './progress';
import type { AppState } from './progress';
import { PLAN_NAME_TO_ID, stateLookup, workoutTotals } from './routines';
import type { ExerciseLookup, WorkoutLog } from './routines';
import { fmtNumber } from './units';

export type FeedExercise = {
  key: string;
  name: string;
  detail: string; // "3 sets" or "20 min"
  exercise: Pick<ExerciseDef, 'primary' | 'secondary'> | null; // for the thumbnail
};

export type FeedItem = {
  id: string;
  kind: 'workout' | 'plan';
  title: string;
  date: string; // YYYY-MM-DD
  time: string | null; // HH:mm, null for plan days
  minutes: number | null;
  volumeKg: number | null;
  sets: number;
  xp: number;
  notes: string | null;
  exercises: FeedExercise[];
};

const num = (v: number | undefined): number => (typeof v === 'number' && Number.isFinite(v) ? v : 0);

function workoutDetail(e: ExerciseDef | undefined, sets: WorkoutLog['items'][number]['sets']): string {
  const done = sets.filter((s) => s.done);
  if (e?.metric === 'distance_time') {
    const min = done.reduce((sum, s) => sum + num(s.min), 0);
    const km = done.reduce((sum, s) => sum + num(s.km), 0);
    return `${fmtNumber(min)} min${km > 0 ? `, ${fmtNumber(km)} km` : ''}`;
  }
  if (e?.metric === 'intervals') {
    const min = done.reduce((sum, s) => sum + num(s.on) + num(s.off), 0);
    return `${fmtNumber(min)} min intervals`;
  }
  return `${done.length} ${done.length === 1 ? 'set' : 'sets'}`;
}

export function workoutToFeedItem(w: WorkoutLog, lookup: ExerciseLookup = exerciseById): FeedItem | null {
  const totals = workoutTotals(w.items, lookup);
  if (totals.sets === 0) return null;
  const exercises: FeedExercise[] = [];
  for (const item of w.items) {
    if (!item.sets.some((s) => s.done)) continue;
    const e = lookup(item.exerciseId);
    exercises.push({ key: item.exerciseId, name: e?.name ?? 'Exercise', detail: workoutDetail(e, item.sets), exercise: e ?? null });
  }
  const span = Date.parse(w.finishedAt) - Date.parse(w.startedAt);
  return {
    id: w.id,
    kind: 'workout',
    title: w.title,
    date: w.date,
    time: /^\d{4}-\d{2}-\d{2}T(\d{2}:\d{2})$/.test(w.when) ? w.when.slice(11, 16) : null,
    minutes: Number.isFinite(span) && span >= 0 ? Math.max(1, Math.round(span / 60000)) : null,
    volumeKg: totals.volume > 0 ? totals.volume : null,
    sets: totals.sets,
    xp: w.xp,
    notes: w.notes?.trim() || null,
    exercises,
  };
}

// A 6-week plan day with something ticked, or null.
export function planDayToFeedItem(state: AppState, date: string, streaks: Record<string, number>): FeedItem | null {
  const day = planDay(date);
  const log = state.days[date];
  if (!day || !isWorkoutDay(day) || !log) return null;
  if (dayDoneCount(day, log) === 0 && !log.cardio) return null;

  const exercises: FeedExercise[] = [];
  let sets = 0;
  for (const key of allItemKeys(day)) {
    if (!isItemTicked(day, log, key)) continue;
    if (key === 'cardio') {
      const modality = day.cardio?.modality === 'treadmill' ? 'treadmill' : 'bike';
      const def = exerciseById(modality);
      const minutes = log.cardio?.minutes ?? day.cardio?.minutes ?? 0;
      exercises.push({ key, name: def?.name ?? 'Cardio', detail: `${fmtNumber(minutes)} min`, exercise: def ?? null });
      continue;
    }
    const ex = exerciseForKey(day, key);
    if (!ex) continue;
    const def = exerciseById(PLAN_NAME_TO_ID[ex.name] ?? '');
    sets += ex.sets;
    exercises.push({ key, name: def?.name ?? ex.name, detail: `${ex.sets} ${ex.sets === 1 ? 'set' : 'sets'}`, exercise: def ?? null });
  }
  return {
    id: `plan-${date}`,
    kind: 'plan',
    title: day.title,
    date,
    time: null,
    minutes: null,
    volumeKg: null,
    sets,
    xp: xpForDay(day, log, streaks[date] ?? 0),
    notes: null,
    exercises,
  };
}

// Newest first. On one day, logged workouts come before the plan day.
export function buildFeed(state: AppState, lookup: ExerciseLookup = stateLookup(state)): FeedItem[] {
  const entries: { at: string; item: FeedItem }[] = [];
  for (const w of state.workouts ?? []) {
    const item = workoutToFeedItem(w, lookup);
    if (item) entries.push({ at: w.when, item });
  }
  const streaks = clearedStreakSeries(state);
  for (const date of Object.keys(state.days ?? {})) {
    const item = planDayToFeedItem(state, date, streaks);
    if (item) entries.push({ at: `${date}T00:00`, item });
  }
  entries.sort((a, b) => (a.at === b.at ? 0 : a.at < b.at ? 1 : -1));
  return entries.map((e) => e.item);
}
