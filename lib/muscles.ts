// Which muscles a set of exercises works, for the muscle map summaries.
import type { ExerciseDef, Muscle } from '../data/exercises';

// Main muscles win over "also works". Cardio is not a muscle group, so it never
// highlights anything as main.
export function musclesOfExercises(exercises: Pick<ExerciseDef, 'primary' | 'secondary'>[]): { primary: Muscle[]; secondary: Muscle[] } {
  const primary = new Set<Muscle>();
  const secondary = new Set<Muscle>();
  for (const e of exercises) {
    if (e.primary !== 'cardio') primary.add(e.primary);
    for (const m of e.secondary) secondary.add(m);
  }
  for (const m of primary) secondary.delete(m);
  return { primary: [...primary], secondary: [...secondary] };
}
