'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import type { Exercise } from '@/data/plan';

export function ExerciseRow({
  exercise,
  done,
  xpAmount,
  onToggle,
  disabled,
  subtitle,
}: {
  exercise: Exercise;
  done: boolean;
  xpAmount: number;
  onToggle: () => void;
  disabled?: boolean;
  /** Overrides the trailing "sets x reps" text, e.g. for the cardio row. */
  subtitle?: string;
}) {
  const reduceMotion = useReducedMotion();
  const [chipKey, setChipKey] = useState(0);
  const wasDone = useRef(done);

  useEffect(() => {
    if (done && !wasDone.current) setChipKey((k) => k + 1);
    wasDone.current = done;
  }, [done]);

  return (
    <div
      role="checkbox"
      aria-checked={done}
      aria-disabled={disabled}
      tabIndex={disabled ? -1 : 0}
      onClick={() => !disabled && onToggle()}
      onKeyDown={(e) => {
        if (disabled) return;
        if (e.key === ' ' || e.key === 'Enter') {
          e.preventDefault();
          onToggle();
        }
      }}
      className={`relative flex min-h-[52px] select-none items-center gap-3 rounded-xl px-1 py-1 ${disabled ? '' : 'cursor-pointer active:bg-[var(--surface-2)]'}`}
    >
      <svg width={28} height={28} viewBox="0 0 28 28" aria-hidden="true" className="shrink-0">
        <motion.circle
          cx={14}
          cy={14}
          r={12}
          fill="none"
          stroke="var(--line)"
          strokeWidth={2.5}
          animate={{ fill: done ? 'var(--ok)' : 'rgba(0,0,0,0)', stroke: done ? 'var(--ok)' : 'var(--line)' }}
          transition={{ duration: reduceMotion ? 0 : 0.2 }}
        />
        <motion.path
          d="M8.5 14.5l3.8 3.8 7.2-8"
          fill="none"
          stroke="#fff"
          strokeWidth={3}
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={false}
          animate={{ pathLength: done ? 1 : 0, opacity: done ? 1 : 0 }}
          transition={{ duration: reduceMotion ? 0 : 0.28, delay: done && !reduceMotion ? 0.08 : 0 }}
        />
      </svg>
      <span className={`flex-1 truncate text-[15px] font-medium ${done ? '' : ''}`} style={{ color: done ? 'var(--muted)' : 'var(--ink)' }}>
        {exercise.name}
        {exercise.notes && <span className="ml-1.5 truncate text-xs font-normal" style={{ color: 'var(--muted)' }}>{exercise.notes}</span>}
      </span>
      <span className="shrink-0 text-[15px] tabular-nums" style={{ color: 'var(--muted)' }}>
        {subtitle ?? `${exercise.sets}×${exercise.reps}`}
      </span>

      <AnimatePresence>
        {chipKey > 0 && (
          <motion.span
            key={chipKey}
            className="pointer-events-none absolute right-14 top-1.5 rounded-full px-2.5 py-0.5 text-[13px] font-bold"
            style={{ color: '#3B2600', background: 'linear-gradient(180deg,#FFE08A,#F0B12A)' }}
            initial={{ y: 6, scale: 0.7, opacity: 0 }}
            animate={reduceMotion ? { y: -20, scale: 1, opacity: [0, 1, 0] } : { y: [6, -8, -30], scale: [0.7, 1.05, 1.05], opacity: [0, 1, 0] }}
            transition={{ duration: reduceMotion ? 0.3 : 0.9, times: [0, 0.3, 1], ease: 'easeOut' }}
          >
            +{xpAmount} XP
          </motion.span>
        )}
      </AnimatePresence>
    </div>
  );
}
