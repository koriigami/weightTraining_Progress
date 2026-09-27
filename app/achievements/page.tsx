'use client';

import { useProgress } from '@/components/ProgressProvider';
import { ProgressBar } from '@/components/ProgressBar';

export default function AchievementsPage() {
  const { progress } = useProgress();

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">Achievements</h1>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {progress.achievements.map((a) => {
          const unlocked = Boolean(a.unlockedAt);
          return (
            <div
              key={a.id}
              className={`rounded-2xl border p-4 ${
                unlocked
                  ? 'border-amber-200 bg-amber-50 dark:border-amber-500/30 dark:bg-amber-500/10'
                  : 'border-neutral-200 bg-neutral-50 opacity-60 dark:border-neutral-800 dark:bg-neutral-900/50'
              }`}
            >
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">{a.name}</h2>
                {unlocked && (
                  <span className="text-xs font-medium text-amber-700 dark:text-amber-300">Unlocked {a.unlockedAt}</span>
                )}
              </div>
              <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">{a.description}</p>
              {!unlocked && a.target > 1 && (
                <div className="mt-2 space-y-1">
                  <ProgressBar current={a.progress} total={a.target} />
                  <div className="text-xs text-neutral-400 dark:text-neutral-500">
                    {a.progress} / {a.target}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
