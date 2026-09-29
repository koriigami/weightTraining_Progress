import { emptyState } from '../lib/progress';
import type { AppState } from '../lib/progress';
import type { LoggedSet, WorkoutLog } from '../lib/routines';

type ItemSpec = { id: string; sets: Omit<LoggedSet, 'done'>[]; undone?: number[] };

let counter = 0;

// A workout on a date (YYYY-MM-DD) with the given exercises. Every set is
// ticked unless its index is listed in `undone`.
export function workout(date: string, items: ItemSpec[], over: Partial<WorkoutLog> = {}): WorkoutLog {
  counter++;
  const hh = String(8 + (counter % 10)).padStart(2, '0');
  return {
    id: over.id ?? `w${counter}`,
    date,
    when: `${date}T${hh}:00`,
    title: 'Workout',
    startedAt: `${date}T${hh}:00:00.000Z`,
    finishedAt: `${date}T${hh}:45:00.000Z`,
    items: items.map((it) => ({
      exerciseId: it.id,
      sets: it.sets.map((s, i) => ({ ...s, done: !it.undone?.includes(i) })),
    })),
    xp: 0,
    prs: [],
    ...over,
  };
}

export function stateWith(workouts: WorkoutLog[], extra: Partial<AppState> = {}): AppState {
  return { ...emptyState(), workouts, ...extra };
}
