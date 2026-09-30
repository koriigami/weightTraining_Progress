'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { ComponentType } from 'react';
import { Flame, Dumbbell, ChevronsUp, Timer, Route, Scale } from 'lucide-react';
import { useProgress } from '@/components/ProgressProvider';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { DatePicker } from '@/components/ui/DatePicker';
import { Segmented } from '@/components/ui/Segmented';
import { Sheet, useSheet } from '@/components/ui/Sheet';
import { Stepper } from '@/components/ui/Stepper';
import { useToday } from '@/lib/useToday';
import { addDaysStr, formatDay } from '@/lib/date';
import { END_PRESETS, WEIGHT_GOAL_STEP, endPresetDate, endsLabel, goalDistanceKm, goalHint, goalReward, recentNumbers, streakDeadline, weightGoalTarget, weightPaceLabel, weightPaceLabelFull } from '@/lib/goals';
import { fmtNumber, kgToUnit, kmToUnit, unitToKg } from '@/lib/units';
import type { EndPreset } from '@/lib/goals';
import type { Goal, GoalType } from '@/lib/progress';

const TYPES: { id: GoalType; label: string; Icon: ComponentType<{ size?: number }> }[] = [
  { id: 'workouts', label: 'Workouts', Icon: Dumbbell },
  { id: 'streak', label: 'Weekly streak', Icon: Flame },
  { id: 'cardio-minutes', label: 'Cardio minutes', Icon: Timer },
  { id: 'cardio-km', label: 'Distance', Icon: Route },
  { id: 'pushups', label: 'Push-ups', Icon: ChevronsUp },
  { id: 'weight', label: 'Weight', Icon: Scale },
];

const ANTI_FARM = 'Only workouts logged after you create the goal count.';
const WEEKS_MIN = 1;
const WEEKS_MAX = 26;
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
        {isEdit ? 'Save goal' : 'Create goal'}
      </Button>
    </>
  );
}

/**
 * The goal sheet, in the game look. Step 1 picks the kind of goal and step 2 sets
 * the numbers, with the XP reward shown before you save. Editing skips step 1.
 */
export function NewGoalSheet({ open, onClose, editGoal }: { open: boolean; onClose: () => void; editGoal?: Goal | null }) {
  const { progress, state, addGoal, updateGoal, prefs } = useProgress();
  // Goals are stored in kg and km. Everything typed and shown here is in the person's own units.
  const wu = prefs.units.weight;
  const du = prefs.units.distance;
  const wStep = WEIGHT_GOAL_STEP[wu];
  const today = useToday();
  const tomorrow = addDaysStr(today, 1);
  const isEdit = Boolean(editGoal);

  const [step, setStep] = useState<1 | 2>(1);
  const [type, setType] = useState<GoalType | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [streakN, setStreakN] = useState(4);
  const [periodPreset, setPeriodPreset] = useState<EndPreset | 'custom'>('1-month');
  const pickerRef = useRef<HTMLDivElement>(null);
  const [customEnd, setCustomEnd] = useState('');
  const [amountOverride, setAmountOverride] = useState<number | null>(null);
  const [weightDir, setWeightDir] = useState<'lose' | 'gain'>('lose');
  const [weightAmt, setWeightAmt] = useState(wStep.start);
  const [weightWeeks, setWeightWeeks] = useState(4.3);

  function reset() {
    setStep(1);
    setType(null);
    setError(null);
    setStreakN(4);
    setPeriodPreset('1-month');
    setCustomEnd('');
    setAmountOverride(null);
    setWeightDir('lose');
    setWeightAmt(wStep.start);
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
      setWeightAmt(kgToUnit(Math.abs(editGoal.target - baseline), wu) || wStep.min);
      setWeightWeeks(Math.max(2, weeksBetween(today, editGoal.deadline)));
    } else {
      setPeriodPreset('custom');
      setCustomEnd(editGoal.deadline);
      setAmountOverride(editGoal.type === 'cardio-km' ? kmToUnit(editGoal.target, du) : editGoal.target);
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
  const streakDl = streakDeadline(streakStart, streakN);

  const periodEndDate = periodPreset === 'custom' ? customEnd || tomorrow : endPresetDate(periodPreset, today);
  const recent = useMemo(() => recentNumbers(state, today), [state, today]);
  const defaultAmount: Record<string, number> = {
    workouts: 8,
    pushups: 300,
    'cardio-minutes': 150,
    'cardio-km': du === 'mi' ? 12 : 20,
  };
  const amount = amountOverride ?? (type ? defaultAmount[type] ?? 0 : 0);

  // Editing keeps the goal's original baseline; a brand-new goal is priced
  // off the live latest weight.
  const baselineForCalc = isEdit ? editGoal!.baseline ?? null : progress.stats.latestWeight;
  const weightTarget = baselineForCalc !== null ? weightGoalTarget(baselineForCalc, weightDir, weightAmt, wu) : null;
  // The pace labels are worked out in kg per week, then written in the person's unit.
  const weightPace = unitToKg(weightAmt, wu) / weightWeeks;
  const showW = (kg: number) => fmtNumber(kgToUnit(kg, wu));
  const weightDeadline = addDaysStr(today, Math.round(weightWeeks * 7));

  function canSaveStep2(): boolean {
    if (saving) return false;
    if (!type) return false;
    if (type === 'streak') return true;
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
        err = isEdit
          ? await updateGoal(editGoal!, { target: streakN, deadline: streakDl })
          : await addGoal({ type: 'streak', target: streakN, start: today, deadline: streakDl });
      } else if (type === 'weight') {
        if (baselineForCalc === null || weightTarget === null) return false;
        const target = weightTarget;
        err = isEdit
          ? await updateGoal(editGoal!, { target, deadline: weightDeadline, direction: weightDir })
          : await addGoal({ type: 'weight', target, start: today, deadline: weightDeadline, direction: weightDir, baseline: baselineForCalc });
      } else {
        err = isEdit
          ? await updateGoal(editGoal!, { target: type === 'cardio-km' ? goalDistanceKm(amount, du) : amount, deadline: periodEndDate })
          : await addGoal({ type, target: type === 'cardio-km' ? goalDistanceKm(amount, du) : amount, start: today, deadline: periodEndDate });
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
  const title = isEdit ? 'Edit goal' : 'New goal';

  const rewardCandidate: Goal | null = (() => {
    if (!type) return null;
    const createdAt = editGoal?.createdAt ?? new Date().toISOString();
    if (type === 'streak') {
      return { id: editGoal?.id ?? '', type: 'streak', target: streakN, start: streakStart, deadline: streakDl, createdAt };
    }
    if (type === 'weight') {
      if (baselineForCalc === null || weightTarget === null) return null;
      return {
        id: editGoal?.id ?? '',
        type: 'weight',
        target: weightTarget,
        start: today,
        deadline: weightDeadline,
        createdAt,
        direction: weightDir,
        baseline: baselineForCalc,
      };
    }
    if (amount <= 0) return null;
    return { id: editGoal?.id ?? '', type, target: type === 'cardio-km' ? goalDistanceKm(amount, du) : amount, start: today, deadline: periodEndDate, createdAt };
  })();
  const reward = rewardCandidate ? goalReward(rewardCandidate) : null;
  const showNote = (step === 2 || isEdit) && (reward !== null || error);

  const footer = (
    <div className="wt-goal-foot">
      {showNote && (
        <div className="wt-goal-note">
          {reward !== null && (
            <div className="wt-goal-reward">
              <span>Reward</span>
              <b>+{reward} XP</b>
            </div>
          )}
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
    <Sheet open={open} onClose={handleClose} title={title} description={type && (step === 2 || isEdit) ? TYPES.find((t) => t.id === type)?.label : undefined} footer={footer}>
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
              <Group label="Weeks in a row">
                <Stepper label="Weeks" value={streakN} min={WEEKS_MIN} max={WEEKS_MAX} onChange={setStreakN} format={(v) => `${v} ${v === 1 ? 'week' : 'weeks'}`} />
                <span className="wt-field-hint">{goalHint('streak', recent)}</span>
              </Group>
              <div className="wt-goal-summary">
                <b>{endsLabel(streakDl)}</b>
                <span>{isEdit ? `Started ${formatDay(streakStart)}` : 'Starts this week'}. Any workout keeps a week alive.</span>
              </div>
              <span className="wt-field-hint">{ANTI_FARM}</span>
            </>
          )}

          {type === 'weight' && (
            <>
              <Group label={isEdit ? 'Starting weight' : 'Latest weight'}>
                <div className="wt-goal-weight">{baselineForCalc !== null ? `${showW(baselineForCalc)} ${wu}` : 'Not logged'}</div>
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
                <Stepper label="Amount" value={weightAmt} min={wStep.min} max={wStep.max} step={wStep.step} onChange={setWeightAmt} format={(v) => `${v.toFixed(1)} ${wu}`} />
                <div className="wt-goal-summary">
                  <b>
                    {weightDir === 'lose' ? 'Lose' : 'Gain'} {weightAmt.toFixed(1)} {wu}, to {weightTarget !== null ? kgToUnit(weightTarget, wu).toFixed(1) : '--'} {wu}
                  </b>
                  <span>{baselineForCalc !== null ? `From ${showW(baselineForCalc)} ${wu}` : ''}</span>
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
                    {kgToUnit(weightPace, wu).toFixed(2)} {wu} per week.
                  </b>{' '}
                  {weightPaceLabelFull(weightPace)}.
                </span>
              </Group>
            </>
          )}

          {type && type !== 'streak' && type !== 'weight' && (
            <>
              <Group label="Ends">
                <div className="wt-chips">
                  {END_PRESETS.map((p) => (
                    <Chip key={p.id} pressed={periodPreset === p.id} onClick={() => setPeriodPreset(p.id)}>
                      {p.label}
                    </Chip>
                  ))}
                  <Chip
                    pressed={periodPreset === 'custom'}
                    onClick={() => {
                      setPeriodPreset('custom');
                      setTimeout(() => pickerRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }), 0);
                    }}
                  >
                    Pick end date
                  </Chip>
                </div>
                {periodPreset === 'custom' ? (
                  <div ref={pickerRef}>
                    <DatePicker label="Goal end date" value={customEnd || null} min={tomorrow} today={today} onChange={setCustomEnd} footer={customEnd ? endsLabel(customEnd) : 'Pick a day'} />
                  </div>
                ) : (
                  <span className="wt-field-hint">{endsLabel(periodEndDate)}</span>
                )}
              </Group>
              <Group label={type === 'workouts' ? 'Workouts' : type === 'pushups' ? 'Push-ups' : type === 'cardio-minutes' ? 'Cardio minutes' : du === 'mi' ? 'Miles' : 'Kilometres'}>
                <Stepper label="Amount" value={amount} min={1} max={100000} onChange={setAmountOverride} />
                <span className="wt-field-hint">{goalHint(type, recent, 4, `${fmtNumber(kmToUnit(recent.km, du))} ${du}`)}</span>
                <span className="wt-field-hint">{ANTI_FARM}</span>
              </Group>
            </>
          )}
        </div>
      )}
    </Sheet>
  );
}
