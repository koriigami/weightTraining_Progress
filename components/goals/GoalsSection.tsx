'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { useProgress } from '@/components/ProgressProvider';
import { Button } from '@/components/ui/Button';
import { GoalCard } from '@/components/goals/GoalCard';
import { NewGoalSheet } from '@/components/goals/NewGoalSheet';
import { goalStatus } from '@/lib/goals';
import { useToday } from '@/lib/useToday';
import type { Goal } from '@/lib/progress';

export function GoalsSection() {
  const { state, deleteGoal } = useProgress();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editGoal, setEditGoal] = useState<Goal | null>(null);
  const today = useToday();

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

  return (
    <div className="space-y-5">
      <Section title="Active" items={active} state={state} today={today} onDelete={deleteGoal} onEdit={openEdit} empty="No active goals. Set one below." />
      <Section title="Completed" items={completed} state={state} today={today} onDelete={deleteGoal} onEdit={openEdit} empty="Nothing completed yet." />
      <Section title="Past" items={past} state={state} today={today} onDelete={deleteGoal} onEdit={openEdit} empty="No expired or failed goals." />

      <Button variant="secondary" block icon={<Plus size={18} aria-hidden="true" />} onClick={openNew}>
        New goal
      </Button>

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
