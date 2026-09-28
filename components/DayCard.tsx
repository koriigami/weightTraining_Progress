'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { WorkoutDay } from '@/data/plan';
import { ExerciseRow } from './ExerciseRow';
import { CardioSheet } from './CardioSheet';
import { useProgress } from './ProgressProvider';
import { todayStr, formatDateLong } from '@/lib/date';
import {
  XP,
  clearedStreakSeries,
  dayDoneCount,
  dayItemCount,
  isDayCleared,
  isPerfectDay,
  isValidItemKey,
  xpForDay,
} from '@/lib/progress';
import { cardBurst } from './celebrate/confetti';

const BADGE_STYLES: Record<WorkoutDay['dayType'], string> = {
  'push-a': 'bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-300',
  'push-b': 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
  'pull-a': 'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300',
  'pull-b': 'bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300',
  legs: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
  'full-body': 'bg-purple-100 text-purple-700 dark:bg-purple-500/15 dark:text-purple-300',
  rest: 'bg-neutral-200 text-neutral-600 dark:bg-neutral-700/40 dark:text-neutral-300',
  'pre-start': 'bg-neutral-200 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400',
};

const BADGE_LABELS: Record<WorkoutDay['dayType'], string> = {
  'push-a': 'PUSH A',
  'push-b': 'PUSH B',
  'pull-a': 'PULL A',
  'pull-b': 'PULL B',
  legs: 'LEGS',
  'full-body': 'FULL BODY',
  rest: 'REST',
  'pre-start': 'NOT STARTED',
};

function Ring({ frac, size, stroke, color }: { frac: number; size: number; stroke: number; color: string }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
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

export function DayCard({ day }: { day: WorkoutDay }) {
  const { state, tick, untick, completeAll } = useProgress();
  const [today, setToday] = useState<string | null>(null);
  const [cardioOpen, setCardioOpen] = useState(false);
  const cardRef = useRef<HTMLDivElement | null>(null);
  const reduceMotion = useReducedMotion();
  const wasCleared = useRef(false);

  useEffect(() => {
    setToday(todayStr());
  }, []);

  const isWorkoutDay = day.dayType !== 'rest' && day.dayType !== 'pre-start';
  const isRestOrPreStart = day.dayType === 'rest' || day.dayType === 'pre-start';

  // Every hook above (and the two below) must run on every render of this
  // component, regardless of day type: the rest/pre-start branch used to
  // return before the cardBurst effect was declared, so switching the
  // selected day between a workout day and a rest/pre-start day changed how
  // many hooks this same component instance called, and React crashed with
  // "Rendered fewer hooks than expected." All hooks now run unconditionally;
  // only the JSX returned at the end differs by day type.
  const log = state.days[day.date];
  const cleared = !isRestOrPreStart && isDayCleared(day, log);
  const perfect = !isRestOrPreStart && isPerfectDay(day, log);
  const total = dayItemCount(day);
  const done = dayDoneCount(day, log);
  const canEdit = today !== null && isWorkoutDay && day.date <= today;
  const isFuture = today !== null && day.date > today;
  const streakAfter = clearedStreakSeries(state)[day.date] ?? 0;
  const xpToday = log ? xpForDay(day, log, streakAfter) : 0;

  useEffect(() => {
    if (cleared && !wasCleared.current && cardRef.current) {
      if (!reduceMotion) {
        const rect = cardRef.current.getBoundingClientRect();
        cardBurst(rect);
      }
    }
    wasCleared.current = cleared;
  }, [cleared, reduceMotion]);

  if (isRestOrPreStart) {
    return (
      <div className="rounded-2xl border p-5" style={{ borderColor: 'var(--line)', background: 'var(--surface-2)' }}>
        <span className={`inline-block rounded-full px-2.5 py-1 text-xs font-bold tracking-wide ${BADGE_STYLES[day.dayType]}`}>
          {BADGE_LABELS[day.dayType]}
        </span>
        <h2 className="mt-3 text-lg font-semibold" style={{ color: 'var(--ink)' }}>
          {day.dayType === 'rest' ? 'Rest day. Recovery matters' : 'Not started yet'}
        </h2>
        <p className="mt-1 text-sm" style={{ color: 'var(--muted)' }}>
          {day.focus}
        </p>
      </div>
    );
  }

  function toggle(key: string) {
    if (!canEdit || !isValidItemKey(day, key)) return;
    if (key === 'cardio') {
      // Tapping cardio always opens the sheet: to log it, or to edit/remove it.
      setCardioOpen(true);
      return;
    }
    const isDone = Boolean(log?.items[key]);
    if (isDone) {
      untick(day.date, key, 'Unticked');
    } else {
      const isCore = key.startsWith('k');
      tick(day.date, key, isCore ? XP.core : XP.strength);
    }
  }

  return (
    <div
      ref={cardRef}
      data-testid="day-card"
      className="relative rounded-2xl border p-5 shadow-sm"
      style={{ borderColor: 'var(--line)', background: 'var(--surface)' }}
    >
      <div className="flex items-center justify-between gap-2">
        <span className={`inline-block rounded-full px-2.5 py-1 text-xs font-bold tracking-wide ${BADGE_STYLES[day.dayType]}`}>
          {BADGE_LABELS[day.dayType]}
        </span>
        <div className="flex items-center gap-2 text-xs tabular-nums" style={{ color: 'var(--muted)' }}>
          <Ring frac={total > 0 ? done / total : 0} size={36} stroke={4} color="var(--ok)" />
          <span>
            {done} / {total}
          </span>
        </div>
      </div>

      <h2 className="mt-2 text-lg font-semibold" style={{ color: 'var(--ink)' }}>
        {day.title}
      </h2>
      {xpToday > 0 && (
        <p className="mt-0.5 text-xs font-semibold" style={{ color: 'var(--accent)' }}>
          +{xpToday} XP today
        </p>
      )}

      {day.strength.length > 0 && (
        <div className="mt-3 divide-y" style={{ borderColor: 'var(--line)' }}>
          {day.strength.map((ex, i) => {
            const key = `s${i}`;
            return (
              <ExerciseRow
                key={key}
                exercise={ex}
                done={Boolean(log?.items[key])}
                xpAmount={XP.strength}
                onToggle={() => toggle(key)}
                disabled={!canEdit}
              />
            );
          })}
        </div>
      )}

      {day.core && day.core.length > 0 && (
        <div className="mt-3 border-t pt-3" style={{ borderColor: 'var(--line)' }}>
          <div className="mb-1 text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--muted)' }}>
            Core
          </div>
          <div className="divide-y" style={{ borderColor: 'var(--line)' }}>
            {day.core.map((ex, i) => {
              const key = `k${i}`;
              return (
                <ExerciseRow
                  key={key}
                  exercise={ex}
                  done={Boolean(log?.items[key])}
                  xpAmount={XP.core}
                  onToggle={() => toggle(key)}
                  disabled={!canEdit}
                />
              );
            })}
          </div>
        </div>
      )}

      {day.cardio && (
        <div className="mt-3 rounded-xl px-1" style={{ background: 'var(--surface-2)' }}>
          <ExerciseRow
            exercise={{ name: day.cardio.modality === 'treadmill' ? 'Treadmill' : 'Cycle', sets: 0, reps: '', notes: day.cardio.notes }}
            done={Boolean(log?.cardio)}
            xpAmount={log?.cardio?.km !== undefined ? XP.cardio + XP.cardioKmBonus : XP.cardio}
            onToggle={() => toggle('cardio')}
            disabled={!canEdit}
            subtitle={log?.cardio ? `${log.cardio.minutes} min${log.cardio.km !== undefined ? ` · ${log.cardio.km} km` : ''}` : `${day.cardio.minutes} min`}
          />
        </div>
      )}

      {!day.cardio && <div className="mt-3 text-xs" style={{ color: 'var(--muted)' }}>No cardio today</div>}

      <p className="mt-3 text-xs" style={{ color: 'var(--muted)' }}>
        {day.focus}
      </p>

      {canEdit && done < total && (
        <button
          onClick={() => completeAll(day.date)}
          className="mt-3 min-h-12 w-full rounded-full text-[15px] font-semibold transition active:scale-[0.98]"
          style={{ background: 'var(--accent-soft)', color: 'var(--ink)' }}
        >
          Complete all
        </button>
      )}

      {isFuture && (
        <p className="mt-3 text-center text-xs font-medium" style={{ color: 'var(--muted)' }}>
          Opens {formatDateLong(day.date)}
        </p>
      )}

      {cleared && (
        <motion.div
          className="pointer-events-none absolute right-3.5 top-14 select-none rounded-[10px] border-[3px] px-3 py-0.5 font-display text-xl"
          style={{ color: 'var(--ok)', borderColor: 'var(--ok)', transform: 'rotate(-8deg)' }}
          initial={{ opacity: 0, scale: 2.4 }}
          animate={{ opacity: 1, scale: [2.4, 0.92, 1] }}
          transition={{ duration: reduceMotion ? 0 : 0.42, times: [0, 0.7, 1], ease: [0.3, 1.4, 0.5, 1] }}
        >
          {perfect ? 'PERFECT' : 'CLEARED'}
        </motion.div>
      )}

      {day.cardio && (
        <CardioSheet open={cardioOpen} onClose={() => setCardioOpen(false)} date={day.date} day={day} />
      )}
    </div>
  );
}
