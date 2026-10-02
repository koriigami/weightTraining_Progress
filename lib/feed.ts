// The Recent workouts feed: the logged workouts with a ticked set, newest first.
import { exerciseById } from '../data/exercises';
import type { ExerciseDef } from '../data/exercises';
import { isFeel } from './feel';
import type { Feel } from './feel';
import { distanceCardio, fmtMinutes, fmtSpeed, statsKind } from './liveStats';
import type { StatsKind } from './liveStats';
import type { AppState } from './progress';
import { pace, stateLookup, workoutTotals } from './routines';
import type { ExerciseLookup, Routine, WorkoutLog } from './routines';
import { fmtDistance, fmtNumber, fmtVolume } from './units';
import type { DistanceUnit, WeightUnit } from './units';

export type FeedExercise = {
  key: string;
  name: string;
  detail: string; // "3 sets" or "20 min"
  line: string; // "3 × Push Up", or "Stationary Bike · 32 min, 11.2 km" for cardio
  custom: boolean; // one of the user's own exercises
  added: boolean; // not in the plan the workout set out to do
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
  feel: Feel | null; // how it felt, for the face next to the title
  exercises: FeedExercise[];
  routine: string | null; // title of the routine it came from, when that routine still exists
  added: number; // exercises done that were not in the plan
  kind: StatsKind;
  km: number;
  cardioMinutes: number;
  rideOnly: boolean; // every distance exercise was a ride: Speed instead of Pace
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

// A workout as the card and the workout page show it. Always built, even with nothing ticked.
export function workoutSummary(w: WorkoutLog, lookup: ExerciseLookup = exerciseById, routines: readonly Routine[] = []): FeedItem {
  const totals = workoutTotals(w.items, lookup);
  // Old workouts have no plan: their own exercises are the plan, so nothing was added.
  const inPlan = w.plan ? new Set(w.plan.map((p) => p.exerciseId)) : null;
  const exercises: FeedExercise[] = [];
  for (const item of w.items) {
    if (!item.sets.some((s) => s.done)) continue;
    const e = lookup(item.exerciseId);
    const name = e?.name ?? 'Exercise';
    const detail = workoutDetail(e, item.sets);
    const cardio = e?.metric === 'distance_time' || e?.metric === 'intervals';
    exercises.push({
      key: item.exerciseId,
      name,
      detail,
      line: cardio ? `${name} · ${detail}` : `${item.sets.filter((s) => s.done).length} × ${name}`,
      custom: Boolean(e && 'custom' in e),
      added: inPlan ? !inPlan.has(item.exerciseId) : false,
      exercise: e ?? null,
    });
  }
  const dc = distanceCardio(w.items, lookup);
  const routine = w.routineId ? routines.find((r) => r.id === w.routineId) : undefined;
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
    feel: isFeel(w.feel) ? w.feel : null,
    exercises,
    routine: routine?.title ?? null,
    added: exercises.filter((e) => e.added).length,
    kind: statsKind(w.items, lookup),
    km: totals.km,
    cardioMinutes: totals.cardioMinutes,
    rideOnly: dc.kind === 'ride',
  };
}

export function workoutToFeedItem(w: WorkoutLog, lookup: ExerciseLookup = exerciseById, routines: readonly Routine[] = []): FeedItem | null {
  return workoutTotals(w.items, lookup).sets === 0 ? null : workoutSummary(w, lookup, routines);
}

export type FeedTile = { key: string; label: string; value: string };

// The tiles of a card or the workout page, before XP. Strength (and mixed): Time,
// Volume, Sets. Cardio only: Time, Distance and Speed or Pace.
export function feedTiles(item: FeedItem, units: { weight: WeightUnit; distance: DistanceUnit }): FeedTile[] {
  const time: FeedTile = { key: 'time', label: 'Time', value: item.minutes !== null ? fmtMinutes(item.minutes) : fmtMinutes(item.cardioMinutes) };
  if (item.kind !== 'cardio') {
    return [time, { key: 'volume', label: 'Volume', value: fmtVolume(item.volumeKg ?? 0, units.weight) }, { key: 'sets', label: 'Sets', value: String(item.sets) }];
  }
  const speed = item.rideOnly;
  const rate = speed ? fmtSpeed(item.cardioMinutes, item.km, units.distance) : pace(item.cardioMinutes, item.km, units.distance);
  return [time, { key: 'distance', label: 'Distance', value: fmtDistance(item.km, units.distance) }, { key: 'rate', label: speed ? 'Speed' : 'Pace', value: rate || '-' }];
}

// Newest first.
export function buildFeed(state: AppState, lookup: ExerciseLookup = stateLookup(state)): FeedItem[] {
  const entries: { at: string; item: FeedItem }[] = [];
  for (const w of state.workouts ?? []) {
    const item = workoutToFeedItem(w, lookup, state.routines ?? []);
    if (item) entries.push({ at: w.when, item });
  }
  entries.sort((a, b) => (a.at === b.at ? 0 : a.at < b.at ? 1 : -1));
  return entries.map((e) => e.item);
}
