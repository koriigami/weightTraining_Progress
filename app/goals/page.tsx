'use client';

import { useState } from 'react';
import { useProgress } from '@/components/ProgressProvider';
import { GoalCard } from '@/components/goals/GoalCard';
import { NewGoalSheet } from '@/components/goals/NewGoalSheet';
import { goalStatus } from '@/lib/goals';
import { useToday } from '@/lib/useToday';
import { useIsDesktop } from '@/lib/useIsDesktop';
import type { Goal } from '@/lib/progress';

export default function GoalsPage() {
  const { state, deleteGoal, snackbarVisible } = useProgress();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editGoal, setEditGoal] = useState<Goal | null>(null);
  const today = useToday();
  const isDesktop = useIsDesktop();

  const withStatus = state.goals.map((goal) => ({ goal, status: goalStatus(goal, state, today) }));
  const active = withStatus.filter((g) => g.status === 'active');
  const completed = withStatus.filter((g) => g.status === 'achieved');
  const past = withStatus.filter((g) => g.status === 'failed' || g.status === 'expired');

  function openNew() {
    setEditGoal(null);
    setSheetOpen(true);
  }

  function openEdit(goal: Goal) {
    setEditGoal(goal);
    setSheetOpen(true);
  }

  // On mobile, a raised FAB clears the Undo/error snackbar (M3: FAB moves up
  // by the snackbar's height plus 8px while one shows). Desktop stays put.
  const fabBottom = !isDesktop && snackbarVisible ? 'calc(96px + env(safe-area-inset-bottom) + 68px)' : undefined;

  return (
    <div className="space-y-5">
      <Section title="Active" items={active} state={state} today={today} onDelete={deleteGoal} onEdit={openEdit} empty="No active goals. Set one below." />
      <Section title="Completed" items={completed} state={state} today={today} onDelete={deleteGoal} onEdit={openEdit} empty="Nothing completed yet." />
      <Section title="Past" items={past} state={state} today={today} onDelete={deleteGoal} onEdit={openEdit} empty="No expired or failed goals." />

      <button
        onClick={openNew}
        className="fixed bottom-[calc(96px+env(safe-area-inset-bottom))] right-4 z-30 min-h-14 rounded-2xl px-5 text-[15px] font-semibold shadow-lg transition-[bottom] duration-200 md:bottom-6"
        style={{ background: 'var(--pill)', color: 'var(--pill-ink)', ...(fabBottom ? { bottom: fabBottom } : {}) }}
      >
        + New goal
      </button>

      <NewGoalSheet open={sheetOpen} onClose={() => setSheetOpen(false)} editGoal={editGoal} />
    </div>
  );
}

function Section({
  title,
  items,
  state,
  today,
  onDelete,
  onEdit,
  empty,
}: {
  title: string;
  items: { goal: Goal; status: string }[];
  state: import('@/lib/progress').AppState;
  today: string;
  onDelete: (goal: Goal) => void;
  onEdit: (goal: Goal) => void;
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
            <GoalCard key={goal.id} goal={goal} state={state} today={today} onDelete={onDelete} onEdit={onEdit} />
          ))}
        </div>
      )}
    </div>
  );
}
