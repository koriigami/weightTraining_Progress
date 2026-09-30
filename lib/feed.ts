// The Recent workouts feed: the logged workouts with a ticked set, newest first.
import { exerciseById } from '../data/exercises';
import type { ExerciseDef } from '../data/exercises';
import type { AppState } from './progress';
import { stateLookup, workoutTotals } from './routines';
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
  title: string;
  date: string; // YYYY-MM-DD
  time: string | null; // HH:mm, null when the workout has no time of day
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

// Newest first.
export function buildFeed(state: AppState, lookup: ExerciseLookup = stateLookup(state)): FeedItem[] {
  const entries: { at: string; item: FeedItem }[] = [];
  for (const w of state.workouts ?? []) {
    const item = workoutToFeedItem(w, lookup);
    if (item) entries.push({ at: w.when, item });
  }
  entries.sort((a, b) => (a.at === b.at ? 0 : a.at < b.at ? 1 : -1));
  return entries.map((e) => e.item);
}
