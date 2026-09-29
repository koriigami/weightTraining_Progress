'use client';

import { EllipsisVertical, Trophy } from 'lucide-react';
import { xpForGoal } from '@/lib/progress';
import type { AppState, Goal } from '@/lib/progress';
import { formatMonthDay } from '@/lib/date';
import { goalProgressValue, goalStatus, goalTitle, goalWeight, daysLeft, weightGoalPct } from '@/lib/goals';
import type { GoalUnits } from '@/lib/goals';
import { fmtNumber, kmToUnit } from '@/lib/units';
import { Tag } from '@/components/ui/Chip';
import { XpBar } from '@/components/ui/XpBar';
import { cn } from '@/components/ui/cn';

const STATUS_LABEL: Record<string, string> = { active: 'Active', achieved: 'Achieved', failed: 'Failed', expired: 'Expired' };

/** A goal row: title, a segmented XP-style bar, the numbers and the XP reward. The dots open Edit and Delete. */
export function GoalCard({ goal, state, today, units, onOptions }: { goal: Goal; state: AppState; today: string; units: GoalUnits; onOptions: (goal: Goal) => void }) {
  const status = goalStatus(goal, state, today);
  const value = goalProgressValue(goal, state, today);

  let frac: number;
  let valueLabel: string;
  if (goal.type === 'weight') {
    frac = weightGoalPct(goal, value) / 100;
    valueLabel = `${goalWeight(value, units.weight).toFixed(1)} ${units.weight} now`;
  } else {
    frac = goal.target > 0 ? value / goal.target : 0;
    valueLabel =
      goal.type === 'cardio-km' && units.distance === 'mi'
        ? `${fmtNumber(kmToUnit(value, 'mi'))} of ${fmtNumber(kmToUnit(goal.target, 'mi'))}`
        : `${value} of ${goal.target}`;
  }
  const pct = Math.max(0, Math.min(100, Math.round(frac * 100)));
  const remaining = daysLeft(goal, today);
  const reward = xpForGoal(goal);
  const title = goalTitle(goal, units);

  return (
    <div className={cn('wt-goal', status !== 'active' && status !== 'achieved' && 'past')} data-goal={goal.id}>
      <div className="wt-goal-top">
        <b>{title}</b>
        {status === 'active' ? (
          <small style={{ color: 'var(--muted)' }}>by {formatMonthDay(goal.deadline)}</small>
        ) : (
          <Tag tone={status === 'achieved' ? 'ok' : 'default'}>{STATUS_LABEL[status]}</Tag>
        )}
        <button type="button" className="wt-iconbtn" aria-label={`Options for ${title}`} onClick={() => onOptions(goal)}>
          <EllipsisVertical size={18} aria-hidden="true" />
        </button>
      </div>
      <XpBar thin variant="muscle" value={pct} label={`${title}: ${pct}%`} />
      <small className="wt-goal-sub">
        {status === 'achieved' && <Trophy size={13} aria-hidden="true" style={{ color: 'var(--ok)' }} />}
        <span>
          {valueLabel}
          {status === 'active' ? ` · ${remaining} day${remaining === 1 ? '' : 's'} left` : ''}
        </span>
        <span className="wt-goal-xp" style={{ color: status === 'achieved' ? 'var(--ok)' : 'var(--xp-deep)' }}>
          {status === 'achieved' ? `+${reward} XP earned` : `+${reward} XP`}
        </span>
      </small>
    </div>
  );
}
