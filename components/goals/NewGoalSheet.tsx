'use client';

import { useState } from 'react';
import type { ComponentType } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { Flame, Dumbbell, ChevronsUp, Timer, Route, Scale } from 'lucide-react';
import { plan } from '@/data/plan';
import { BottomSheet } from '@/components/BottomSheet';
import { useProgress } from '@/components/ProgressProvider';
import { addDaysStr, formatDateMed, todayStr } from '@/lib/date';
import { maxStreakFrom, periodEnd, planTotals, streakDeadline, weightPaceLabel, weightPaceLabelFull } from '@/lib/goals';
import type { PeriodPreset } from '@/lib/goals';
import type { GoalType } from '@/lib/progress';

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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <label className="text-[13px] font-semibold" style={{ color: 'var(--muted)' }}>
        {label}
      </label>
      {children}
    </div>
  );
}

function Chip({ active, disabled, onClick, children }: { active: boolean; disabled?: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="min-h-10 rounded-lg border px-3.5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-40"
      style={{
        borderColor: active ? 'transparent' : 'var(--line)',
        background: active ? 'var(--pill)' : 'var(--surface)',
        color: active ? 'var(--pill-ink)' : 'var(--ink)',
      }}
    >
      {children}
    </button>
  );
}

function Stepper({ value, onChange, min = 0, max = 999, step = 1, format }: { value: number; onChange: (v: number) => void; min?: number; max?: number; step?: number; format?: (v: number) => string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <button
        type="button"
        aria-label="Less"
        onClick={() => onChange(Math.max(min, Math.round((value - step) * 100) / 100))}
        className="flex h-12 w-12 items-center justify-center rounded-full border text-xl font-semibold"
        style={{ borderColor: 'var(--line)', background: 'var(--surface)', color: 'var(--ink)' }}
      >
        &minus;
      </button>
      <output className="font-display text-3xl tabular-nums" style={{ color: 'var(--ink)' }}>
        {format ? format(value) : value}
      </output>
      <button
        type="button"
        aria-label="More"
        onClick={() => onChange(Math.min(max, Math.round((value + step) * 100) / 100))}
        className="flex h-12 w-12 items-center justify-center rounded-full border text-xl font-semibold"
        style={{ borderColor: 'var(--line)', background: 'var(--surface)', color: 'var(--ink)' }}
      >
        +
      </button>
    </div>
  );
}

const slide = {
  enter: (dir: number) => ({ x: dir * 32, opacity: 0 }),
  center: { x: 0, opacity: 1 },
};

export function NewGoalSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { progress, addGoal } = useProgress();
  const reduceMotion = Boolean(useReducedMotion());
  const today = todayStr();

  const [step, setStep] = useState<1 | 2>(1);
  const [direction, setDirection] = useState(1);
  const [type, setType] = useState<GoalType | null>(null);

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
    setStreakN(7);
    setPeriodPreset('this-week');
    setCustomEnd('');
    setAmountOverride(null);
    setWeightDir('lose');
    setWeightAmt(2.0);
    setWeightWeeks(4.3);
  }

  function handleClose() {
    onClose();
    setTimeout(reset, 300);
  }

  const maxN = maxStreakFrom(today);
  const streakDl = streakDeadline(today, streakN);
  const lastPlanDate = plan[plan.length - 1].date;

  const periodEndDate = periodPreset === 'custom' ? customEnd || today : periodEnd(periodPreset, today);
  const totals = planTotals(today, periodEndDate);
  const defaultAmount: Record<string, number> = {
    workouts: totals.workouts,
    pushups: totals.pushups,
    'cardio-minutes': totals.cardioMinutes,
    'cardio-km': 20,
  };
  const amount = amountOverride ?? (type ? defaultAmount[type] ?? 0 : 0);

  const latestWeight = progress.stats.latestWeight;
  const weightTarget = latestWeight !== null ? (weightDir === 'lose' ? latestWeight - weightAmt : latestWeight + weightAmt) : null;
  const weightPace = weightAmt / weightWeeks;
  const weightDeadline = addDaysStr(today, Math.round(weightWeeks * 7));

  function ctaDisabledForStep2(): boolean {
    if (!type) return true;
    if (type === 'streak') return !streakDl;
    if (type === 'weight') return latestWeight === null;
    if (periodPreset === 'custom' && !customEnd) return true;
    return amount <= 0;
  }

  async function submit() {
    if (!type) return;
    if (type === 'streak') {
      if (!streakDl) return;
      const ok = await addGoal({ type: 'streak', target: streakN, start: today, deadline: streakDl });
      if (ok) handleClose();
      return;
    }
    if (type === 'weight') {
      if (latestWeight === null || weightTarget === null) return;
      const ok = await addGoal({
        type: 'weight',
        target: Number(weightTarget.toFixed(1)),
        start: today,
        deadline: weightDeadline,
        direction: weightDir,
        baseline: latestWeight,
      });
      if (ok) handleClose();
      return;
    }
    const ok = await addGoal({ type, target: amount, start: today, deadline: periodEndDate });
    if (ok) handleClose();
  }

  const typeMeta = TYPES.find((t) => t.id === type);
  const title = step === 1 ? 'New goal' : `${typeMeta?.label ?? ''} goal`;

  return (
    <BottomSheet
      open={open}
      onClose={handleClose}
      ariaLabel={title}
      title={title}
      fixed
      onBack={step === 2 ? () => { setDirection(-1); setStep(1); } : undefined}
      cta={step === 1 ? { label: 'Continue', onClick: () => { setDirection(1); setStep(2); }, disabled: !type } : { label: 'Save goal', onClick: submit, disabled: ctaDisabledForStep2() }}
    >
      <AnimatePresence mode="wait" initial={false} custom={direction}>
        {step === 1 ? (
          <motion.div
            key="step1"
            custom={direction}
            variants={slide}
            initial={reduceMotion ? false : 'enter'}
            animate="center"
            transition={{ duration: reduceMotion ? 0 : 0.26, ease: [0.2, 0, 0, 1] }}
          >
            <p className="mb-3.5 text-sm" style={{ color: 'var(--muted)' }}>
              What do you want to aim for?
            </p>
            <div className="grid grid-cols-3 gap-2">
              {TYPES.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  aria-pressed={type === t.id}
                  onClick={() => setType(t.id)}
                  className="flex min-h-[104px] flex-col items-center justify-center gap-1.5 rounded-2xl border text-[13px] font-semibold"
                  style={{
                    borderColor: type === t.id ? 'var(--ink)' : 'var(--line)',
                    background: type === t.id ? 'var(--surface-2)' : 'var(--surface)',
                    color: 'var(--ink)',
                  }}
                >
                  <t.Icon size={26} />
                  {t.label}
                </button>
              ))}
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="step2"
            custom={direction}
            variants={slide}
            initial={reduceMotion ? false : 'enter'}
            animate="center"
            transition={{ duration: reduceMotion ? 0 : 0.26, ease: [0.2, 0, 0, 1] }}
          >
            {type === 'streak' && (
              <div className="flex flex-col gap-4">
                <Field label="How many workout days in a row?">
                  <div className="flex flex-wrap gap-2">
                    {STREAK_CHIPS.map((n) => (
                      <Chip key={n} active={streakN === n} disabled={n > maxN} onClick={() => setStreakN(n)}>
                        {n}
                      </Chip>
                    ))}
                  </div>
                  {maxN < 30 && (
                    <span className="text-xs" style={{ color: 'var(--muted)' }}>
                      Your plan ends {formatDateMed(lastPlanDate)}.
                    </span>
                  )}
                </Field>
                <div className="rounded-xl p-3 text-sm" style={{ background: 'var(--surface-2)' }}>
                  <b className="block text-base" style={{ color: 'var(--ink)' }}>
                    {streakN} workout days in a row
                  </b>
                  {streakDl ? (
                    <span style={{ color: 'var(--muted)' }}>Starts today, ends {formatDateMed(streakDl)}. Rest days don&apos;t count.</span>
                  ) : (
                    <span style={{ color: 'var(--bad)' }}>Not enough workout days left in the plan.</span>
                  )}
                </div>
              </div>
            )}

            {type === 'weight' && (
              <div className="flex flex-col gap-4">
                <Field label="Latest weight">
                  <div className="font-display text-[34px]" style={{ color: 'var(--ink)' }}>
                    {latestWeight !== null ? `${latestWeight} kg` : 'Not logged'}
                  </div>
                  {latestWeight === null && (
                    <span className="text-xs" style={{ color: 'var(--muted)' }}>
                      Log a weight on Profile first.
                    </span>
                  )}
                </Field>
                <Field label="Direction">
                  <div className="grid grid-cols-2 overflow-hidden rounded-full border" style={{ borderColor: 'var(--line)' }}>
                    {(['lose', 'gain'] as const).map((d) => (
                      <button
                        key={d}
                        type="button"
                        aria-pressed={weightDir === d}
                        onClick={() => setWeightDir(d)}
                        className="min-h-11 text-sm font-semibold capitalize"
                        style={{ background: weightDir === d ? 'var(--pill)' : 'transparent', color: weightDir === d ? 'var(--pill-ink)' : 'var(--ink)' }}
                      >
                        {d}
                      </button>
                    ))}
                  </div>
                </Field>
                <Field label="Amount">
                  <Stepper value={weightAmt} min={0.5} max={15} step={0.5} onChange={setWeightAmt} format={(v) => `${v.toFixed(1)} kg`} />
                  <div className="rounded-xl p-3 text-sm" style={{ background: 'var(--surface-2)' }}>
                    <b className="block text-base" style={{ color: 'var(--ink)' }}>
                      {weightDir === 'lose' ? 'Lose' : 'Gain'} {weightAmt.toFixed(1)} kg, to {weightTarget !== null ? weightTarget.toFixed(1) : '--'} kg
                    </b>
                    <span style={{ color: 'var(--muted)' }}>{latestWeight !== null ? `From ${latestWeight} kg today` : ''}</span>
                  </div>
                </Field>
                <Field label="By">
                  <div className="flex flex-wrap gap-2">
                    {WEIGHT_DEADLINE_CHIPS.map((c) => (
                      <Chip key={c.label} active={weightWeeks === c.weeks} onClick={() => setWeightWeeks(c.weeks)}>
                        {c.label}
                      </Chip>
                    ))}
                  </div>
                </Field>
                <Field label="Pace">
                  <div
                    className="relative h-2 rounded"
                    style={{ background: 'linear-gradient(90deg, var(--ok) 0 33%, var(--warn) 33% 66%, var(--bad) 66%)' }}
                  >
                    <span
                      className="absolute -top-1 h-4 w-1 rounded"
                      style={{ left: `calc(${Math.min(96, (weightPace / 1.5) * 100)}% - 2px)`, background: 'var(--ink)' }}
                    />
                  </div>
                  <span className="text-[13px]" style={{ color: 'var(--ink)' }}>
                    <b style={{ color: weightPaceLabel(weightPace) === 'Comfortable' ? 'var(--ok)' : weightPaceLabel(weightPace) === 'Ambitious' ? 'var(--warn)' : 'var(--bad)' }}>
                      {weightPace.toFixed(2)} kg per week.
                    </b>{' '}
                    {weightPaceLabelFull(weightPace)}.
                  </span>
                </Field>
              </div>
            )}

            {type && type !== 'streak' && type !== 'weight' && (
              <div className="flex flex-col gap-4">
                <Field label="Period">
                  <div className="flex flex-wrap gap-2">
                    {PERIOD_PRESETS.map((p) => (
                      <Chip key={p.id} active={periodPreset === p.id} onClick={() => setPeriodPreset(p.id)}>
                        {p.label}
                      </Chip>
                    ))}
                  </div>
                  {periodPreset === 'custom' && (
                    <input
                      type="date"
                      value={customEnd}
                      min={today}
                      onChange={(e) => setCustomEnd(e.target.value)}
                      className="min-h-11 rounded-lg border px-3 text-sm"
                      style={{ borderColor: 'var(--line)', background: 'var(--surface)', color: 'var(--ink)' }}
                    />
                  )}
                </Field>
                <Field label={type === 'workouts' ? 'Workout days' : type === 'pushups' ? 'Pushups' : type === 'cardio-minutes' ? 'Cardio minutes' : 'Kilometres'}>
                  <Stepper value={amount} min={1} max={100000} onChange={setAmountOverride} />
                  <span className="text-[13px]" style={{ color: 'var(--muted)' }}>
                    {type === 'workouts' && `Your plan has ${totals.workouts} workout days in that time.`}
                    {type === 'pushups' && `Your plan has about ${totals.pushups} pushups in that time.`}
                    {type === 'cardio-minutes' && `Your plan has ${totals.cardioMinutes} cardio minutes in that time.`}
                    {type === 'cardio-km' && 'Treadmill and cycle combined.'}
                  </span>
                </Field>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </BottomSheet>
  );
}
