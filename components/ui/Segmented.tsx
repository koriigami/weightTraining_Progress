'use client';

import { useEffect, useRef } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { springTo } from '@/lib/anim';
import { SPRINGS } from '@/lib/motion';
import { buzz, play } from '@/lib/sound';
import { cn } from './cn';

export type SegmentedOption<T extends string> = { value: T; label: ReactNode; ariaLabel?: string };

/**
 * An equal-width segmented control. The active segment is a green 3D thumb that
 * slides under the labels (snappy spring). The thumb is sized and placed in
 * shares of the control (see .wt-seg-thumb), so it covers its label at any width.
 * sm is the compact inline one: its segments are not equal width, so it colours
 * the pressed segment instead of sliding a thumb. lg is the roomy one used in onboarding.
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
  const index = Math.max(
    0,
    options.findIndex((o) => o.value === value)
  );
  const thumb = useRef<HTMLSpanElement>(null);
  const prev = useRef(index);

  useEffect(() => {
    const from = prev.current;
    prev.current = index;
    if (from !== index) void springTo(thumb.current, from, index, (v) => `translateX(calc(${v} * (100% + var(--seg-gap))))`, SPRINGS.snappy);
  }, [index]);

  return (
    <div role="group" aria-label={ariaLabel} className={cn('wt-seg', size === 'lg' && 'wt-seg-lg', size === 'sm' && 'wt-seg-sm', className)} style={{ '--n': options.length, '--i': index } as CSSProperties}>
      {size !== 'sm' && <span ref={thumb} className="wt-seg-thumb" aria-hidden="true" />}
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={o.value === value}
          aria-label={o.ariaLabel}
          onClick={() => {
            if (o.value !== value) {
              play('tick');
              buzz('light');
            }
            onChange(o.value);
          }}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
