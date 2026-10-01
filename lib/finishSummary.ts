// What the Finish dialog lists: the sets that are not ticked, by exercise.
import { exerciseById } from '../data/exercises';
import type { ExerciseLookup, WorkoutItem } from './routines';

export type UntickedRow = {
  exerciseId: string;
  name: string;
  sets: number[]; // 1-based set numbers that are not ticked
  total: number; // sets the exercise has
};

export function untickedSets(items: readonly WorkoutItem[], lookup: ExerciseLookup = exerciseById): UntickedRow[] {
  const rows: UntickedRow[] = [];
  for (const item of items) {
    const sets = item.sets.flatMap((s, i) => (s.done ? [] : [i + 1]));
    if (sets.length > 0) rows.push({ exerciseId: item.exerciseId, name: lookup(item.exerciseId)?.name ?? 'Exercise', sets, total: item.sets.length });
  }
  return rows;
}

// "Set 2", "Sets 2 and 3", "Sets 1, 2 and 4", "All 3 sets", "The set".
export function fmtUnticked(row: Pick<UntickedRow, 'sets' | 'total'>): string {
  const { sets, total } = row;
  if (sets.length === total) return total === 1 ? 'The set' : `All ${total} sets`;
  if (sets.length === 1) return `Set ${sets[0]}`;
  return `Sets ${sets.slice(0, -1).join(', ')} and ${sets[sets.length - 1]}`;
}

// "1 set is not ticked. It won't be saved." and so on.
export function untickedSentence(count: number): string {
  if (count === 0) return 'Every set is ticked. Nice work.';
  if (count === 1) return "1 set is not ticked. It won't be saved.";
  return `${count} sets are not ticked. They won't be saved.`;
}
