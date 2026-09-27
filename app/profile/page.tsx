'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useProgress } from '@/components/ProgressProvider';
import { ProgressBar } from '@/components/ProgressBar';
import { todayStr } from '@/lib/date';
import { START_WEIGHT, TARGET_WEIGHT, Rank } from '@/lib/progress';

const RANK_COLORS: Record<Rank, string> = {
  E: 'bg-neutral-200 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300',
  D: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
  C: 'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300',
  B: 'bg-purple-100 text-purple-700 dark:bg-purple-500/15 dark:text-purple-300',
  A: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
  S: 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300',
};

export default function ProfilePage() {
  const { progress, state, logWeight } = useProgress();
  const [today, setToday] = useState<string | null>(null);
  const [weightInput, setWeightInput] = useState('');

  useEffect(() => {
    const t = todayStr();
    setToday(t);
    setWeightInput(state.weights[t] !== undefined ? String(state.weights[t]) : '');
  }, [state.weights]);

  const stats = progress.stats;
  const weightPct = stats.latestWeight
    ? Math.min(100, Math.max(0, ((START_WEIGHT - stats.latestWeight) / (START_WEIGHT - TARGET_WEIGHT)) * 100))
    : 0;

  function submitWeight(e: React.FormEvent) {
    e.preventDefault();
    if (!today) return;
    const kg = Number(weightInput);
    if (Number.isNaN(kg) || kg < 40 || kg > 250) return;
    logWeight(today, kg);
  }

  const recentAchievements = [...progress.achievements]
    .filter((a) => a.unlockedAt)
    .sort((a, b) => (a.unlockedAt! < b.unlockedAt! ? 1 : -1))
    .slice(0, 3);

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
        <div className="flex items-center gap-3">
          <span className={`flex h-14 w-14 items-center justify-center rounded-2xl text-2xl font-bold ${RANK_COLORS[progress.rank]}`}>
            {progress.rank}
          </span>
          <div>
            <div className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">Level {progress.level}</div>
            <div className="text-xs text-neutral-500 dark:text-neutral-400">{progress.xp} total XP</div>
          </div>
        </div>
        <div className="mt-3 space-y-1">
          <ProgressBar current={progress.xpIntoLevel.current} total={progress.xpIntoLevel.needed} />
          <div className="text-xs text-neutral-400 dark:text-neutral-500">
            {progress.xpIntoLevel.current} / {progress.xpIntoLevel.needed} XP to level {progress.level + 1}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
        <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Weight</h2>
        <form onSubmit={submitWeight} className="mt-2 flex gap-2">
          <input
            type="number"
            step="0.1"
            inputMode="decimal"
            value={weightInput}
            onChange={(e) => setWeightInput(e.target.value)}
            placeholder="kg today"
            className="w-28 rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 outline-none focus:border-neutral-500 dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-100"
          />
          <button
            type="submit"
            className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-semibold text-white dark:bg-neutral-100 dark:text-neutral-900"
          >
            Log
          </button>
        </form>
        <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
          <div>
            <div className="text-neutral-400 dark:text-neutral-500">Latest</div>
            <div className="font-semibold text-neutral-900 dark:text-neutral-100">
              {stats.latestWeight !== null ? `${stats.latestWeight} kg` : 'Not logged'}
            </div>
          </div>
          <div>
            <div className="text-neutral-400 dark:text-neutral-500">Lost</div>
            <div className="font-semibold text-neutral-900 dark:text-neutral-100">{stats.kgLost.toFixed(1)} kg</div>
          </div>
        </div>
        <div className="mt-3 space-y-1">
          <ProgressBar current={weightPct} total={100} />
          <div className="flex justify-between text-xs text-neutral-400 dark:text-neutral-500">
            <span>{START_WEIGHT} kg</span>
            <span>{TARGET_WEIGHT} kg</span>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
        <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Stats</h2>
        <div className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
          <Stat label="Workouts done" value={stats.workoutsCompleted} />
          <Stat label="Current streak" value={stats.currentStreak} />
          <Stat label="Best streak" value={stats.bestStreak} />
          <Stat label="Lifetime pushups" value={stats.lifetimePushups} />
          <Stat label="Cardio minutes" value={stats.cardioMinutes} />
          <Stat label="Weigh-ins" value={stats.weighIns} />
        </div>
      </div>

      <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Recent achievements</h2>
          <Link href="/achievements" className="text-xs font-medium text-neutral-500 underline dark:text-neutral-400">
            See all
          </Link>
        </div>
        {recentAchievements.length === 0 ? (
          <p className="mt-2 text-xs text-neutral-400 dark:text-neutral-500">None yet. Complete a workout to start.</p>
        ) : (
          <ul className="mt-2 space-y-1.5">
            {recentAchievements.map((a) => (
              <li key={a.id} className="flex items-center justify-between text-sm">
                <span className="font-medium text-neutral-800 dark:text-neutral-100">{a.name}</span>
                <span className="text-xs text-neutral-400 dark:text-neutral-500">{a.unlockedAt}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="text-neutral-400 dark:text-neutral-500">{label}</div>
      <div className="text-base font-semibold text-neutral-900 dark:text-neutral-100">{value}</div>
    </div>
  );
}
