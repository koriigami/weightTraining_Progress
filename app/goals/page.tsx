'use client';

import { useState } from 'react';
import { useProgress } from '@/components/ProgressProvider';
import { GoalCard } from '@/components/goals/GoalCard';
import { NewGoalSheet } from '@/components/goals/NewGoalSheet';
import { goalStatus } from '@/lib/goals';
import { todayStr } from '@/lib/date';

export default function GoalsPage() {
  const { state, deleteGoal } = useProgress();
  const [sheetOpen, setSheetOpen] = useState(false);
  const today = todayStr();

  const withStatus = state.goals.map((goal) => ({ goal, status: goalStatus(goal, state, today) }));
  const active = withStatus.filter((g) => g.status === 'active');
  const completed = withStatus.filter((g) => g.status === 'achieved');
  const past = withStatus.filter((g) => g.status === 'failed' || g.status === 'expired');

  return (
    <div className="space-y-5">
      <Section title="Active" items={active} state={state} today={today} onDelete={deleteGoal} empty="No active goals. Set one below." />
      <Section title="Completed" items={completed} state={state} today={today} onDelete={deleteGoal} empty="Nothing completed yet." />
      <Section title="Past" items={past} state={state} today={today} onDelete={deleteGoal} empty="No expired or failed goals." />

      <button
        onClick={() => setSheetOpen(true)}
        className="fixed bottom-[calc(96px+env(safe-area-inset-bottom))] right-4 z-30 min-h-14 rounded-2xl px-5 text-[15px] font-semibold shadow-lg md:bottom-6"
        style={{ background: 'var(--pill)', color: 'var(--pill-ink)' }}
      >
        + New goal
      </button>

      <NewGoalSheet open={sheetOpen} onClose={() => setSheetOpen(false)} />
    </div>
  );
}

function Section({
  title,
  items,
  state,
  today,
  onDelete,
  empty,
}: {
  title: string;
  items: { goal: import('@/lib/progress').Goal; status: string }[];
  state: import('@/lib/progress').AppState;
  today: string;
  onDelete: (goal: import('@/lib/progress').Goal) => void;
  empty: string;
}) {
  if (items.length === 0 && title !== 'Active') return null;
  return (
    <div className="space-y-2">
      <h2 className="text-sm font-semibold uppercase tracking-wide" style={{ color: 'var(--muted)' }}>
        {title}
      </h2>
      {items.length === 0 ? (
        <p className="text-xs" style={{ color: 'var(--muted)' }}>
          {empty}
        </p>
      ) : (
        <div className="space-y-2">
          {items.map(({ goal }) => (
            <GoalCard key={goal.id} goal={goal} state={state} today={today} onDelete={onDelete} />
          ))}
        </div>
      )}
    </div>
  );
}
