import { Exercise } from '@/data/plan';

export function ExerciseRow({ exercise }: { exercise: Exercise }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1.5">
      <div className="min-w-0">
        <div className="truncate text-[15px] font-medium text-neutral-900 dark:text-neutral-100">
          {exercise.name}
        </div>
        {exercise.notes && (
          <div className="truncate text-xs text-neutral-500 dark:text-neutral-400">{exercise.notes}</div>
        )}
      </div>
      <div className="shrink-0 text-[15px] tabular-nums text-neutral-600 dark:text-neutral-300">
        {exercise.sets}×{exercise.reps}
      </div>
    </div>
  );
}
