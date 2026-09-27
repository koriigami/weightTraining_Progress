'use client';

import { useEffect, useState } from 'react';
import { useProgress } from '@/components/ProgressProvider';
import { ProgressBar } from '@/components/ProgressBar';
import { todayStr } from '@/lib/date';
import { Goal, GoalType, goalDescription, goalProgressValue, goalStatus } from '@/lib/progress';

const TYPE_LABELS: Record<GoalType, string> = {
  workouts: 'Workouts completed',
  pushups: 'Pushups',
  'cardio-minutes': 'Cardio minutes',
  streak: 'Day streak',
  weight: 'Weight (kg)',
};

const QUICK_PICKS = [
  { label: '2 days', days: 2 },
  { label: '3 days', days: 3 },
  { label: '1 week', days: 7 },
  { label: '1 month', days: 30 },
  { label: '3 months', days: 90 },
];

function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export default function GoalsPage() {
  const { state, addGoal, deleteGoal } = useProgress();
  const [today, setToday] = useState<string | null>(null);
  const [type, setType] = useState<GoalType>('workouts');
  const [target, setTarget] = useState('3');
  const [deadline, setDeadline] = useState('');

  useEffect(() => {
    setToday(todayStr());
  }, []);

  useEffect(() => {
    if (today && !deadline) setDeadline(addDays(today, 7));
  }, [today, deadline]);

  if (!today) return null;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const targetNum = Number(target);
    if (Number.isNaN(targetNum) || targetNum <= 0 || !deadline) return;
    addGoal({ type, target: targetNum, start: today!, deadline });
    setTarget('3');
  }

  const goalsWithMeta = state.goals.map((g) => ({
    goal: g,
    status: goalStatus(g, state, today),
    value: goalProgressValue(g, state),
  }));

  const shortTerm = goalsWithMeta.filter((g) => daysBetween(g.goal.start, g.goal.deadline) <= 7);
  const longTerm = goalsWithMeta.filter((g) => daysBetween(g.goal.start, g.goal.deadline) > 7);

  return (
    <div className="space-y-5">
      <h1 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">Goals</h1>

      <form
        onSubmit={submit}
        className="space-y-3 rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900"
      >
        <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">New goal</h2>
        <div className="flex flex-wrap gap-2">
          <select
            value={type}
            onChange={(e) => setType(e.target.value as GoalType)}
            className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-100"
          >
            {Object.entries(TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <input
            type="number"
            min={1}
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            className="w-24 rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-100"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {QUICK_PICKS.map((qp) => (
            <button
              type="button"
              key={qp.label}
              onClick={() => setDeadline(addDays(today, qp.days))}
              className={`rounded-full border px-3 py-1 text-xs font-medium ${
                deadline === addDays(today, qp.days)
                  ? 'border-neutral-900 bg-neutral-900 text-white dark:border-neutral-100 dark:bg-neutral-100 dark:text-neutral-900'
                  : 'border-neutral-300 text-neutral-600 dark:border-neutral-700 dark:text-neutral-300'
              }`}
            >
              {qp.label}
            </button>
          ))}
          <input
            type="date"
            value={deadline}
            min={today}
            onChange={(e) => setDeadline(e.target.value)}
            className="rounded-lg border border-neutral-300 bg-white px-2 py-1 text-xs text-neutral-900 dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-100"
          />
        </div>
        <button
          type="submit"
          className="w-full rounded-lg bg-neutral-900 py-2.5 text-sm font-semibold text-white dark:bg-neutral-100 dark:text-neutral-900"
        >
          Add goal
        </button>
      </form>

      <GoalSection title="Short term" items={shortTerm} today={today} onDelete={deleteGoal} />
      <GoalSection title="Long term" items={longTerm} today={today} onDelete={deleteGoal} />
    </div>
  );
}

function daysBetween(start: string, end: string): number {
  const a = new Date(`${start}T00:00:00Z`).getTime();
  const b = new Date(`${end}T00:00:00Z`).getTime();
  return Math.round((b - a) / 86400000);
}

function GoalSection({
  title,
  items,
  today,
  onDelete,
}: {
  title: string;
  items: { goal: Goal; status: string; value: number }[];
  today: string;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="space-y-2">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-400 dark:text-neutral-500">{title}</h2>
      {items.length === 0 ? (
        <p className="text-xs text-neutral-400 dark:text-neutral-500">No goals here yet.</p>
      ) : (
        <div className="space-y-2">
          {items.map(({ goal, status, value }) => {
            const daysLeft = daysBetween(today, goal.deadline);
            const pct =
              goal.type === 'weight'
                ? Math.min(100, Math.max(0, ((110 - value) / (110 - goal.target)) * 100))
                : Math.min(100, (value / goal.target) * 100);
            return (
              <div
                key={goal.id}
                className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">{goalDescription(goal)}</p>
                  <button
                    onClick={() => onDelete(goal.id)}
                    className="shrink-0 text-xs font-medium text-neutral-400 underline dark:text-neutral-500"
                  >
                    Delete
                  </button>
                </div>
                <div className="mt-2 space-y-1">
                  <ProgressBar current={pct} total={100} />
                  <div className="flex justify-between text-xs text-neutral-400 dark:text-neutral-500">
                    <span>
                      {goal.type === 'weight' ? `${value} kg` : `${value} / ${goal.target}`}
                    </span>
                    <span>
                      {status === 'active' ? `${Math.max(0, daysLeft)} days left` : status === 'achieved' ? 'Achieved' : 'Expired'}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
