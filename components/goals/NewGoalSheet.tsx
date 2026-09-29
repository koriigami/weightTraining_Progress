'use client';

import { useEffect, useState } from 'react';
import type { ComponentType } from 'react';
import { Flame, Dumbbell, ChevronsUp, Timer, Route, Scale } from 'lucide-react';
import { plan } from '@/data/plan';
import { useProgress } from '@/components/ProgressProvider';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { Input } from '@/components/ui/Field';
import { Segmented } from '@/components/ui/Segmented';
import { Sheet, useSheet } from '@/components/ui/Sheet';
import { Stepper } from '@/components/ui/Stepper';
import { useToday } from '@/lib/useToday';
import { addDaysStr, formatDateMed } from '@/lib/date';
import { goalReward, maxStreakFrom, periodEnd, planTotals, streakDeadline, weightPaceLabel, weightPaceLabelFull } from '@/lib/goals';
import type { PeriodPreset } from '@/lib/goals';
import type { Goal, GoalType } from '@/lib/progress';

const TYPES: { id: GoalType; label: string; Icon: ComponentType<{ size?: number }> }[] = [
  { id: 'streak', label: 'Streak', Icon: Flame },
  { id: 'workouts', label: 'Workouts', Icon: Dumbbell },
  { id: 'pushups', label: 'Pushups', Icon: ChevronsUp },
  { id: 'cardio-minutes', label: 'Cardio time', Icon: Timer },
  { id: 'cardio-km', label: 'Distance', Icon: Route },
  { id: 'weight', label: 'Weight', Icon: Scale },
];

const PERIOD_PRESETS: { id: PeriodPreset; label: string }[] = [
  { id: 'this-week', label: 'This week' },
  { id: '2-weeks', label: '2 weeks' },
  { id: 'this-month', label: 'This month' },
  { id: '3-months', label: '3 months' },
  { id: 'custom', label: 'Pick date' },
];

const STREAK_CHIPS = [3, 5, 7, 14, 30];
const WEIGHT_DEADLINE_CHIPS: { label: string; weeks: number }[] = [
  { label: '2 weeks', weeks: 2 },
  { label: '1 month', weeks: 4.3 },
  { label: '2 months', weeks: 8.6 },
  { label: '3 months', weeks: 13 },
];

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="wt-field">
      <span className="wt-field-label">{label}</span>
      {children}
    </div>
  );
}

// The buttons pinned at the bottom of the sheet. Save resolves to whether it worked, and the sheet closes when it did.
function GoalActions({ step, isEdit, canSave, saving, onContinue, onBack, onSave }: { step: 1 | 2; isEdit: boolean; canSave: boolean; saving: boolean; onContinue: () => void; onBack: () => void; onSave: () => Promise<boolean> }) {
  const { close } = useSheet();
  if (!isEdit && step === 1) {
    return (
      <Button block onClick={onContinue} disabled={!canSave}>
        Continue
      </Button>
    );
  }
  return (
    <>
      {!isEdit && (
        <Button variant="secondary" onClick={onBack} disabled={saving}>
          Back
        </Button>
      )}
      <Button
        loading={saving}
        disabled={!canSave}
        onClick={async () => {
          if (await onSave()) close();
        }}
      >
        {isEdit ? 'Save changes' : 'Save goal'}
      </Button>
    </>
  );
}

/**
 * The goal sheet, in the game look. Step 1 picks the kind of goal and step 2 sets
 * the numbers, with the XP reward shown before you save. Editing skips step 1.
 */
export function NewGoalSheet({ open, onClose, editGoal }: { open: boolean; onClose: () => void; editGoal?: Goal | null }) {
  const { progress, addGoal, updateGoal } = useProgress();
  const today = useToday();
  const tomorrow = addDaysStr(today, 1);
  const isEdit = Boolean(editGoal);

  const [step, setStep] = useState<1 | 2>(1);
  const [type, setType] = useState<GoalType | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [streakN, setStreakN] = useState(7);
  const [periodPreset, setPeriodPreset] = useState<PeriodPreset>('this-week');
  const [customEnd, setCustomEnd] = useState('');
  const [amountOverride, setAmountOverride] = useState<number | null>(null);
  const [weightDir, setWeightDir] = useState<'lose' | 'gain'>('lose');
  const [weightAmt, setWeightAmt] = useState(2.0);
  const [weightWeeks, setWeightWeeks] = useState(4.3);

  function reset() {
    setStep(1);
    setType(null);
    setError(null);
    setStreakN(7);
    setPeriodPreset('this-week');
    setCustomEnd('');
    setAmountOverride(null);
    setWeightDir('lose');
    setWeightAmt(2.0);
    setWeightWeeks(4.3);
  }

  // Prefill from the goal being edited, or reset for a fresh "New goal" run,
  // each time the sheet opens.
  useEffect(() => {
    if (!open) return;
    if (!editGoal) {
      reset();
      return;
    }
    setError(null);
    setType(editGoal.type);
    setStep(2);
    if (editGoal.type === 'streak') {
      setStreakN(editGoal.target);
    } else if (editGoal.type === 'weight') {
      setWeightDir(editGoal.direction ?? 'lose');
      const baseline = editGoal.baseline ?? editGoal.target;
      setWeightAmt(Math.abs(editGoal.target - baseline) || 0.5);
      setWeightWeeks(Math.max(2, weeksBetween(today, editGoal.deadline)));
    } else {
      setPeriodPreset('custom');
      setCustomEnd(editGoal.deadline);
      setAmountOverride(editGoal.target);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editGoal]);

  function weeksBetween(from: string, to: string): number {
    const days = Math.round((new Date(`${to}T00:00:00Z`).getTime() - new Date(`${from}T00:00:00Z`).getTime()) / 86400000);
    return Math.round((days / 7) * 10) / 10;
  }

  function handleClose() {
    onClose();
    setTimeout(reset, 300);
  }

  const streakStart = editGoal?.start ?? today;
  const maxN = maxStreakFrom(streakStart);
  const streakDl = streakDeadline(streakStart, streakN);
  const lastPlanDate = plan[plan.length - 1].date;

  const periodEndDate = periodPreset === 'custom' ? customEnd || tomorrow : periodEnd(periodPreset, today);
  const totals = planTotals(today, periodEndDate);
  const defaultAmount: Record<string, number> = {
    workouts: totals.workouts,
    pushups: totals.pushups,
    'cardio-minutes': totals.cardioMinutes,
    'cardio-km': 20,
  };
  const amount = amountOverride ?? (type ? defaultAmount[type] ?? 0 : 0);

  // Editing keeps the goal's original baseline; a brand-new goal is priced
  // off the live latest weight.
  const baselineForCalc = isEdit ? editGoal!.baseline ?? null : progress.stats.latestWeight;
  const weightTarget = baselineForCalc !== null ? (weightDir === 'lose' ? baselineForCalc - weightAmt : baselineForCalc + weightAmt) : null;
  const weightPace = weightAmt / weightWeeks;
  const weightDeadline = addDaysStr(today, Math.round(weightWeeks * 7));

  function canSaveStep2(): boolean {
    if (saving) return false;
    if (!type) return false;
    if (type === 'streak') return Boolean(streakDl);
    if (type === 'weight') return baselineForCalc !== null;
    if (periodPreset === 'custom' && !customEnd) return false;
    return amount > 0;
  }

  async function submit(): Promise<boolean> {
    if (!type) return false;
    setError(null);
    setSaving(true);
    try {
      let err: string | null;
      if (type === 'streak') {
        if (!streakDl) return false;
        err = isEdit
          ? await updateGoal(editGoal!, { target: streakN, deadline: streakDl })
          : await addGoal({ type: 'streak', target: streakN, start: today, deadline: streakDl });
      } else if (type === 'weight') {
        if (baselineForCalc === null || weightTarget === null) return false;
        const target = Number(weightTarget.toFixed(1));
        err = isEdit
          ? await updateGoal(editGoal!, { target, deadline: weightDeadline, direction: weightDir })
          : await addGoal({ type: 'weight', target, start: today, deadline: weightDeadline, direction: weightDir, baseline: baselineForCalc });
      } else {
        err = isEdit
          ? await updateGoal(editGoal!, { target: amount, deadline: periodEndDate })
          : await addGoal({ type, target: amount, start: today, deadline: periodEndDate });
      }
      if (err) {
        setError(err);
        return false;
      }
      return true;
    } finally {
      setSaving(false);
    }
  }

  const typeMeta = TYPES.find((t) => t.id === type);
  const title = isEdit ? `Edit ${(typeMeta?.label ?? '').toLowerCase()} goal` : step === 1 ? 'New goal' : `${typeMeta?.label ?? ''} goal`;

  const rewardCandidate: Goal | null = (() => {
    if (!type) return null;
    const createdAt = editGoal?.createdAt ?? new Date().toISOString();
    if (type === 'streak') {
      if (!streakDl) return null;
      return { id: editGoal?.id ?? '', type: 'streak', target: streakN, start: streakStart, deadline: streakDl, createdAt };
    }
    if (type === 'weight') {
      if (baselineForCalc === null || weightTarget === null) return null;
      return {
        id: editGoal?.id ?? '',
        type: 'weight',
        target: Number(weightTarget.toFixed(1)),
        start: today,
        deadline: weightDeadline,
        createdAt,
        direction: weightDir,
        baseline: baselineForCalc,
      };
    }
    if (amount <= 0) return null;
    return { id: editGoal?.id ?? '', type, target: amount, start: today, deadline: periodEndDate, createdAt };
  })();
  const reward = rewardCandidate ? goalReward(rewardCandidate) : null;
  const showNote = (step === 2 || isEdit) && (reward !== null || error);

  const footer = (
    <div className="wt-goal-foot">
      {showNote && (
        <div className="wt-goal-note">
          {reward !== null && <span className="wt-goal-reward">Reward +{reward} XP</span>}
          {error && (
            <span role="alert" className="wt-field-error">
              {error}
            </span>
          )}
        </div>
      )}
      <div className="wt-goal-btns">
        <GoalActions
          step={step}
          isEdit={isEdit}
          canSave={!isEdit && step === 1 ? Boolean(type) : canSaveStep2()}
          saving={saving}
          onContinue={() => setStep(2)}
          onBack={() => {
            setStep(1);
            setError(null);
          }}
          onSave={submit}
        />
      </div>
    </div>
  );

  return (
    <Sheet open={open} onClose={handleClose} title={title} footer={footer}>
      {!isEdit && step === 1 ? (
        <div>
          <p className="wt-sheet-desc" style={{ marginLeft: 0 }}>
            What do you want to aim for?
          </p>
          <div className="wt-gtypes" role="group" aria-label="Kind of goal">
            {TYPES.map((t) => (
              <button key={t.id} type="button" className="wt-gtype" aria-pressed={type === t.id} onClick={() => setType(t.id)}>
                <t.Icon size={26} />
                {t.label}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div>
          {type === 'streak' && (
            <>
              <Group label="How many workout days in a row?">
                <div className="wt-chips">
                  {STREAK_CHIPS.map((n) => (
                    <Chip key={n} pressed={streakN === n} disabled={n > maxN} onClick={() => setStreakN(n)}>
                      {n}
                    </Chip>
                  ))}
                </div>
                {maxN < 30 && <span className="wt-field-hint">Your plan ends {formatDateMed(lastPlanDate)}.</span>}
              </Group>
              <div className="wt-goal-summary">
                <b>{streakN} workout days in a row</b>
                {streakDl ? (
                  <span>
                    {isEdit ? `Starts ${formatDateMed(streakStart)}` : 'Starts today'}, ends {formatDateMed(streakDl)}. Rest days do not count.
                  </span>
                ) : (
                  <span style={{ color: 'var(--bad-ink)' }}>Not enough workout days left in the plan.</span>
                )}
              </div>
            </>
          )}

          {type === 'weight' && (
            <>
              <Group label={isEdit ? 'Starting weight' : 'Latest weight'}>
                <div className="wt-goal-weight">{baselineForCalc !== null ? `${baselineForCalc} kg` : 'Not logged'}</div>
                {baselineForCalc === null && <span className="wt-field-hint">Log a weight on Profile first.</span>}
              </Group>
              <Group label="Direction">
                <Segmented
                  ariaLabel="Direction"
                  value={weightDir}
                  onChange={setWeightDir}
                  options={[
                    { value: 'lose', label: 'Lose' },
                    { value: 'gain', label: 'Gain' },
                  ]}
                />
              </Group>
              <Group label="Amount">
                <Stepper label="Amount" value={weightAmt} min={0.5} max={15} step={0.5} onChange={setWeightAmt} format={(v) => `${v.toFixed(1)} kg`} />
                <div className="wt-goal-summary">
                  <b>
                    {weightDir === 'lose' ? 'Lose' : 'Gain'} {weightAmt.toFixed(1)} kg, to {weightTarget !== null ? weightTarget.toFixed(1) : '--'} kg
                  </b>
                  <span>{baselineForCalc !== null ? `From ${baselineForCalc} kg` : ''}</span>
                </div>
              </Group>
              <Group label="By">
                <div className="wt-chips">
                  {WEIGHT_DEADLINE_CHIPS.map((c) => (
                    <Chip key={c.label} pressed={weightWeeks === c.weeks} onClick={() => setWeightWeeks(c.weeks)}>
                      {c.label}
                    </Chip>
                  ))}
                </div>
              </Group>
              <Group label="Pace">
                <div className="wt-pace" aria-hidden="true">
                  <span style={{ left: `calc(${Math.min(96, (weightPace / 1.5) * 100)}% - 2px)` }} />
                </div>
                <span style={{ fontSize: 14 }}>
                  <b style={{ color: weightPaceLabel(weightPace) === 'Comfortable' ? 'var(--ok)' : weightPaceLabel(weightPace) === 'Ambitious' ? 'var(--warn)' : 'var(--bad-ink)' }}>
                    {weightPace.toFixed(2)} kg per week.
                  </b>{' '}
                  {weightPaceLabelFull(weightPace)}.
                </span>
              </Group>
            </>
          )}

          {type && type !== 'streak' && type !== 'weight' && (
            <>
              <Group label="Period">
                <div className="wt-chips">
                  {PERIOD_PRESETS.map((p) => (
                    <Chip key={p.id} pressed={periodPreset === p.id} onClick={() => setPeriodPreset(p.id)}>
                      {p.label}
                    </Chip>
                  ))}
                </div>
                {periodPreset === 'custom' && <Input type="date" aria-label="Goal end date" value={customEnd} min={tomorrow} onChange={(e) => setCustomEnd(e.target.value)} />}
              </Group>
              <Group label={type === 'workouts' ? 'Workout days' : type === 'pushups' ? 'Pushups' : type === 'cardio-minutes' ? 'Cardio minutes' : 'Kilometres'}>
                <Stepper label="Amount" value={amount} min={1} max={100000} onChange={setAmountOverride} />
                <span className="wt-field-hint">
                  {type === 'workouts' && `Your plan has ${totals.workouts} workout days in that time.`}
                  {type === 'pushups' && `Your plan has about ${totals.pushups} pushups in that time.`}
                  {type === 'cardio-minutes' && `Your plan has ${totals.cardioMinutes} cardio minutes in that time.`}
                  {type === 'cardio-km' && 'Treadmill and cycle combined.'}
                </span>
              </Group>
            </>
          )}
        </div>
      )}
    </Sheet>
  );
}
