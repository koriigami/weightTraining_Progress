'use client';

import { useEffect, useState } from 'react';
import { MoreVertical, Trophy } from 'lucide-react';
import { xpForGoal } from '@/lib/progress';
import type { AppState, Goal } from '@/lib/progress';
import { goalProgressValue, goalStatus, goalTitle, daysLeft, weightGoalPct } from '@/lib/goals';

function Ring({ frac, size = 64, stroke = 7, color }: { frac: number; size?: number; stroke?: number; color: string }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true" className="shrink-0">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--line)" strokeWidth={stroke} />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={`${(c * Math.max(0, Math.min(1, frac))).toFixed(1)} ${c.toFixed(1)}`}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
    </svg>
  );
}

const STATUS_LABEL: Record<string, string> = { active: 'Active', achieved: 'Achieved', failed: 'Failed', expired: 'Expired' };
const STATUS_COLOR: Record<string, string> = { active: 'var(--accent)', achieved: 'var(--ok)', failed: 'var(--bad)', expired: 'var(--muted)' };

export function GoalCard({
  goal,
  state,
  today,
  onDelete,
  onEdit,
}: {
  goal: Goal;
  state: AppState;
  today: string;
  onDelete: (goal: Goal) => void;
  onEdit: (goal: Goal) => void;
}) {
  const status = goalStatus(goal, state, today);
  const value = goalProgressValue(goal, state, today);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!menuOpen) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setMenuOpen(false);
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [menuOpen]);

  let frac: number;
  let valueLabel: string;
  if (goal.type === 'weight') {
    frac = weightGoalPct(goal, value) / 100;
    valueLabel = `${value.toFixed(1)} kg`;
  } else {
    frac = goal.target > 0 ? value / goal.target : 0;
    valueLabel = `${value} / ${goal.target}`;
  }

  const remaining = daysLeft(goal, today);
  const ringColor = status === 'achieved' ? 'var(--ok)' : status === 'failed' || status === 'expired' ? 'var(--muted)' : 'var(--accent)';
  const reward = xpForGoal(goal);
  const rewardLabel = status === 'achieved' ? `+${reward} XP earned` : `+${reward} XP`;

  return (
    <div className="relative flex items-center gap-3.5 rounded-2xl border p-4 shadow-sm" style={{ borderColor: 'var(--line)', background: 'var(--surface)' }}>
      {status === 'achieved' ? (
        <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full" style={{ background: 'var(--ok-soft)' }}>
          <Trophy size={28} color="var(--ok)" />
        </span>
      ) : (
        <Ring frac={frac} color={ringColor} />
      )}
      <div className="min-w-0 flex-1">
        <b className="block text-[15px]" style={{ color: 'var(--ink)' }}>
          {goalTitle(goal)}
        </b>
        <span className="text-[13px]" style={{ color: 'var(--muted)' }}>
          {valueLabel} &middot; {status === 'active' ? `${remaining} day${remaining === 1 ? '' : 's'} left` : STATUS_LABEL[status]}
        </span>
        <span className="block text-[12px] font-semibold" style={{ color: status === 'achieved' ? 'var(--ok)' : 'var(--accent)' }}>
          {rewardLabel}
        </span>
      </div>
      <span
        className="shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold"
        style={{ background: 'var(--surface-2)', color: STATUS_COLOR[status] }}
      >
        {STATUS_LABEL[status]}
      </span>
      <div className="relative">
        <button
          type="button"
          aria-label="Goal options"
          onClick={() => setMenuOpen((o) => !o)}
          className="flex h-10 w-10 items-center justify-center rounded-full active:bg-[var(--surface-2)]"
          style={{ color: 'var(--muted)' }}
        >
          <MoreVertical size={18} />
        </button>
        {menuOpen && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
            <div
              className="absolute right-0 top-11 z-20 min-w-32 overflow-hidden rounded-xl border shadow-lg"
              style={{ borderColor: 'var(--line)', background: 'var(--surface)' }}
            >
              {status === 'active' && (
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    onEdit(goal);
                  }}
                  className="min-h-11 w-full px-4 text-left text-sm font-medium"
                  style={{ color: 'var(--ink)' }}
                >
                  Edit
                </button>
              )}
              <button
                onClick={() => {
                  setMenuOpen(false);
                  onDelete(goal);
                }}
                className="min-h-11 w-full px-4 text-left text-sm font-medium"
                style={{ color: 'var(--bad)' }}
              >
                Delete
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
