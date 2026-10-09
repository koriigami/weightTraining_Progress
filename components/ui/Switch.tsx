'use client';

import { useRef } from 'react';
import { anim, springTo } from '@/lib/anim';
import { EASE, SPRINGS } from '@/lib/motion';
import { buzz, play } from '@/lib/sound';
import { cn } from './cn';

/**
 * A game switch: green and 3D when on. Give it an accessible name with `label`,
 * or point at a visible one with `labelledBy`. The knob springs across and
 * stretches while it moves, and two notes play: up for on, down for off.
 */
export function Switch({
  checked,
  onChange,
  label,
  labelledBy,
  className,
  disabled,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label?: string;
  labelledBy?: string;
  className?: string;
  disabled?: boolean;
}) {
  const knob = useRef<HTMLElement>(null);
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={labelledBy ? undefined : label}
      aria-labelledby={labelledBy}
      disabled={disabled}
      className={cn('wt-switch', className)}
      onClick={() => {
        const next = !checked;
        const [a, b] = next ? [0, 22] : [22, 0];
        void anim(knob.current, [{ width: '24px' }, { width: '32px', offset: 0.4 }, { width: '24px' }], { duration: 220, easing: EASE.out });
        void springTo(knob.current, a, b, (v) => `translateX(${v}px)`, SPRINGS.bouncy);
        play('switch', { on: next });
        buzz('light');
        onChange(next);
      }}
    >
      <i ref={knob} />
    </button>
  );
}
