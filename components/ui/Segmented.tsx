'use client';

import type { ReactNode } from 'react';
import { cn } from './cn';

export type SegmentedOption<T extends string> = { value: T; label: ReactNode; ariaLabel?: string };

/**
 * An equal-width segmented control. The active segment is green and 3D.
 * sm is the compact inline one, lg is the roomy one used in onboarding.
 */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
  size = 'md',
  className,
}: {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  ariaLabel: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  return (
    <div role="group" aria-label={ariaLabel} className={cn('wt-seg', size === 'lg' && 'wt-seg-lg', size === 'sm' && 'wt-seg-sm', className)}>
      {options.map((o) => (
        <button key={o.value} type="button" aria-pressed={o.value === value} aria-label={o.ariaLabel} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}
