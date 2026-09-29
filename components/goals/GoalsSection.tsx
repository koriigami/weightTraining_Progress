'use client';

import { useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useProgress } from '@/components/ProgressProvider';
import { GoalCard } from '@/components/goals/GoalCard';
import { NewGoalSheet } from '@/components/goals/NewGoalSheet';
import { Button } from '@/components/ui/Button';
import { Card, SectionLabel } from '@/components/ui/Card';
import { Sheet, SheetMenu, SheetMenuItem, useSheet } from '@/components/ui/Sheet';
import { goalStatus, goalTitle } from '@/lib/goals';
import { useToday } from '@/lib/useToday';
import type { Goal } from '@/lib/progress';

function GoalMenu({ goal, active, onEdit, onDelete }: { goal: Goal; active: boolean; onEdit: (goal: Goal) => void; onDelete: (goal: Goal) => void }) {
  const { closeThen } = useSheet();
  return (
    <SheetMenu>
      {active && (
        <SheetMenuItem icon={<Pencil size={20} aria-hidden="true" />} onClick={() => closeThen(() => onEdit(goal))}>
          Edit goal
        </SheetMenuItem>
      )}
      <SheetMenuItem danger icon={<Trash2 size={20} aria-hidden="true" />} onClick={() => closeThen(() => onDelete(goal))}>
        Delete goal
      </SheetMenuItem>
    </SheetMenu>
  );
}

/**
 * Profile > Goals. Active goals first, then the achieved ones and the past ones.
 * "New goal" opens the goal sheet, and the dots on a goal open Edit and Delete.
 */
export function GoalsSection() {
  const { state, deleteGoal, prefs } = useProgress();
  const units = prefs.units;
  const today = useToday();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editGoal, setEditGoal] = useState<Goal | null>(null);
  const [menuGoal, setMenuGoal] = useState<Goal | null>(null);

  const withStatus = state.goals.map((goal) => ({ goal, status: goalStatus(goal, state, today) }));
  const ordered = [
    ...withStatus.filter((g) => g.status === 'active'),
    ...withStatus.filter((g) => g.status === 'achieved'),
    ...withStatus.filter((g) => g.status === 'failed' || g.status === 'expired'),
  ];
  const menuActive = menuGoal ? goalStatus(menuGoal, state, today) === 'active' : false;

  function openNew() {
    setEditGoal(null);
    setSheetOpen(true);
  }

  return (
    <section id="goals" aria-label="Goals" className="wt-stack wt-anchor">
      <div className="wt-sechead">
        <SectionLabel>Goals</SectionLabel>
        <button type="button" className="wt-textbtn sm" onClick={openNew}>
          <Plus size={14} aria-hidden="true" /> New goal
        </button>
      </div>
      {ordered.length === 0 ? (
        <Card tone="dashed" className="wt-empty-card">
          <p style={{ margin: 0, color: 'var(--muted)' }}>No goals yet. Pick something to aim for, and earn XP when you get there.</p>
          <Button variant="tertiary" icon={<Plus size={18} aria-hidden="true" />} onClick={openNew}>
            New goal
          </Button>
        </Card>
      ) : (
        <Card>
          {ordered.map(({ goal }) => (
            <GoalCard key={goal.id} goal={goal} state={state} today={today} units={units} onOptions={setMenuGoal} />
          ))}
        </Card>
      )}

      <Sheet open={menuGoal !== null} onClose={() => setMenuGoal(null)} title="Goal" description={menuGoal ? goalTitle(menuGoal, units) : undefined}>
        {menuGoal && <GoalMenu goal={menuGoal} active={menuActive} onEdit={(g) => { setEditGoal(g); setSheetOpen(true); }} onDelete={deleteGoal} />}
      </Sheet>
      <NewGoalSheet open={sheetOpen} onClose={() => setSheetOpen(false)} editGoal={editGoal} />
    </section>
  );
}
