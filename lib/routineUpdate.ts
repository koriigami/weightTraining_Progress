// "Update routine with today's weights": what the routine looks like after a
// workout started from it. Only exercises that are in both change, and only if
// at least one of their sets was ticked. The ticked sets become the planned sets
// and the workout's notes for the exercise carry over. Exercises are never added
// or removed, so a skipped exercise stays in the routine as it was.
import type { Routine, RoutineItem, SetPlan, WorkoutLog } from './routines';

export function updateRoutineFromWorkout(routine: Routine, workout: Pick<WorkoutLog, 'items'>): Routine {
  const items = routine.items.map((item): RoutineItem => {
    const done = workout.items.find((w) => w.exerciseId === item.exerciseId);
    const sets = done?.sets.filter((s) => s.done) ?? [];
    if (!done || sets.length === 0) return item;
    const planned: SetPlan[] = sets.map(({ done: _done, ...rest }) => ({ ...rest }));
    const { notes: _old, ...rest } = item;
    const notes = done.notes?.trim();
    return { ...rest, ...(notes ? { notes } : item.notes ? { notes: item.notes } : {}), sets: planned };
  });
  return { ...routine, items };
}

// True when updating would change something.
export function routineWouldChange(routine: Routine, workout: Pick<WorkoutLog, 'items'>): boolean {
  return JSON.stringify(updateRoutineFromWorkout(routine, workout).items) !== JSON.stringify(routine.items);
}
