import { WorkoutDay } from '@/data/plan';
import { ExerciseRow } from './ExerciseRow';

const BADGE_STYLES: Record<WorkoutDay['dayType'], string> = {
  push: 'bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-300',
  pull: 'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300',
  legs: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
  'full-body': 'bg-purple-100 text-purple-700 dark:bg-purple-500/15 dark:text-purple-300',
  'cardio-core': 'bg-pink-100 text-pink-700 dark:bg-pink-500/15 dark:text-pink-300',
  rest: 'bg-neutral-200 text-neutral-600 dark:bg-neutral-700/40 dark:text-neutral-300',
};

const BADGE_LABELS: Record<WorkoutDay['dayType'], string> = {
  push: 'PUSH',
  pull: 'PULL',
  legs: 'LEGS',
  'full-body': 'FULL BODY',
  'cardio-core': 'CARDIO',
  rest: 'REST',
};

function estimateMinutes(day: WorkoutDay): number {
  const strengthMin = day.strength.length > 0 ? 30 : 0;
  const coreMin = day.core && day.core.length > 0 ? 8 : 0;
  const cardioMin = day.cardio?.minutes ?? 0;
  return strengthMin + coreMin + cardioMin;
}

function compactSummary(day: WorkoutDay): string {
  const parts: string[] = [];
  if (day.strength.length > 0) parts.push(`${day.strength.length} exercises`);
  if (day.core && day.core.length > 0) parts.push('core');
  if (day.cardio) parts.push(`${day.cardio.modality} ${day.cardio.minutes}min`);
  return parts.join(' · ');
}

export function DayCard({ day, compact = false }: { day: WorkoutDay; compact?: boolean }) {
  if (day.dayType === 'rest') {
    if (compact) {
      return (
        <div className="flex items-center gap-2 rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3 dark:border-neutral-800 dark:bg-neutral-900/50">
          <span className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-bold tracking-wide ${BADGE_STYLES.rest}`}>
            {BADGE_LABELS.rest}
          </span>
          <span className="text-sm text-neutral-600 dark:text-neutral-300">Recovery day</span>
        </div>
      );
    }
    return (
      <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-5 dark:border-neutral-800 dark:bg-neutral-900/50">
        <span className={`inline-block rounded-full px-2.5 py-1 text-xs font-bold tracking-wide ${BADGE_STYLES.rest}`}>
          {BADGE_LABELS.rest}
        </span>
        <h2 className="mt-3 text-lg font-semibold text-neutral-800 dark:text-neutral-100">
          Rest day — recovery matters
        </h2>
        <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">{day.focus}</p>
      </div>
    );
  }

  if (compact) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-xl border border-neutral-200 bg-white px-4 py-3 dark:border-neutral-800 dark:bg-neutral-900">
        <div className="flex min-w-0 items-center gap-2">
          <span className={`inline-block shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold tracking-wide ${BADGE_STYLES[day.dayType]}`}>
            {BADGE_LABELS[day.dayType]}
          </span>
          <span className="truncate text-sm font-medium text-neutral-800 dark:text-neutral-100">
            {day.title.split('—')[0].trim()}
          </span>
        </div>
        <span className="shrink-0 text-xs text-neutral-400 dark:text-neutral-500">{compactSummary(day)}</span>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
      <div className="flex items-center justify-between">
        <span className={`inline-block rounded-full px-2.5 py-1 text-xs font-bold tracking-wide ${BADGE_STYLES[day.dayType]}`}>
          {BADGE_LABELS[day.dayType]}
        </span>
        <span className="text-xs text-neutral-400 dark:text-neutral-500">~{estimateMinutes(day)} min</span>
      </div>

      <h2 className="mt-2 text-lg font-semibold text-neutral-900 dark:text-neutral-50">{day.title}</h2>

      {day.strength.length > 0 && (
        <div className="mt-3 divide-y divide-neutral-100 dark:divide-neutral-800">
          {day.strength.map((ex) => (
            <ExerciseRow key={ex.name} exercise={ex} />
          ))}
        </div>
      )}

      {day.core && day.core.length > 0 && (
        <div className="mt-3 border-t border-neutral-100 pt-3 dark:border-neutral-800">
          <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-neutral-400 dark:text-neutral-500">
            Core
          </div>
          <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
            {day.core.map((ex) => (
              <ExerciseRow key={ex.name} exercise={ex} />
            ))}
          </div>
        </div>
      )}

      {day.cardio && (
        <div className="mt-3 flex items-center justify-between rounded-xl bg-neutral-50 px-3 py-2 dark:bg-neutral-800/50">
          <span className="text-sm font-medium capitalize text-neutral-700 dark:text-neutral-200">
            {day.cardio.modality} · {day.cardio.minutes} min
          </span>
          {day.cardio.notes && (
            <span className="text-xs text-neutral-400 dark:text-neutral-500">{day.cardio.notes}</span>
          )}
        </div>
      )}

      <p className="mt-3 text-xs text-neutral-400 dark:text-neutral-500">{day.focus}</p>
    </div>
  );
}
