'use client';

import { Minus, Plus } from 'lucide-react';
import { cn } from './cn';

/**
 * A big number with round gold minus and plus buttons. Used for amounts and the
 * weekly goal. `format` writes the number for people, e.g. "2.5 kg".
 */
export function Stepper({
  value,
  onChange,
  min = 0,
  max = 999,
  step = 1,
  format,
  label,
  className,
}: {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  format?: (value: number) => string;
  /** What the number is, for screen readers: "Weekly goal". */
  label: string;
  className?: string;
}) {
  const round = (n: number) => Math.round(n * 100) / 100;
  return (
    <div className={cn('wt-stepper', className)} role="group" aria-label={label}>
      <button type="button" className="wt-stepbtn" aria-label={`Less ${label.toLowerCase()}`} disabled={value <= min} onClick={() => onChange(Math.max(min, round(value - step)))}>
        <Minus size={22} strokeWidth={3} aria-hidden="true" />
      </button>
      <output aria-live="polite">{format ? format(value) : value}</output>
      <button type="button" className="wt-stepbtn" aria-label={`More ${label.toLowerCase()}`} disabled={value >= max} onClick={() => onChange(Math.min(max, round(value + step)))}>
        <Plus size={22} strokeWidth={3} aria-hidden="true" />
      </button>
    </div>
  );
}
