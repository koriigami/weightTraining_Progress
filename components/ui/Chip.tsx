'use client';

import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Check, X } from 'lucide-react';
import { springTo } from '@/lib/anim';
import { CHIP_STREAK_MS, chipPitch, stepStreak } from '@/lib/interactions';
import type { Streak } from '@/lib/interactions';
import { SPRINGS } from '@/lib/motion';
import { SYN, buzz, play } from '@/lib/sound';
import { cn } from './cn';

// Chips picked in a row climb a step each (the pip), until a pause.
let picks: Streak | null = null;

/** The chip sound and bounce. `on` is what the chip becomes; undefined is a plain action chip. */
function chipFx(el: HTMLElement, on: boolean | undefined) {
  if (on === false) {
    picks = null;
    SYN.untick();
  } else if (on === true) {
    picks = stepStreak(picks, Date.now(), CHIP_STREAK_MS);
    SYN.pip(chipPitch(picks.n));
  } else {
    play('chip');
  }
  buzz('light');
  void springTo(el, on === false ? 0.94 : 1.1, 1, (v) => `scale(${v})`, SPRINGS.bouncy);
}

type ChipProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'aria-pressed'> & {
  /** On: green with a bevel. Off: gold. Leave it out for a plain action chip. */
  pressed?: boolean;
  icon?: ReactNode;
};

/** A 3D toggle chip for filters and quick picks. */
export function Chip({ pressed, icon, className, children, type = 'button', onClick, ...rest }: ChipProps) {
  return (
    <button
      type={type}
      className={cn('wt-chip', className)}
      aria-pressed={pressed}
      onClick={(e) => {
        chipFx(e.currentTarget, pressed === undefined ? undefined : !pressed);
        onClick?.(e);
      }}
      {...rest}
    >
      {icon}
      {children}
    </button>
  );
}

/** A selected filter shown as a green pill with a remove cross. */
export function RemovableChip({ label, onRemove, className }: { label: string; onRemove: () => void; className?: string }) {
  return (
    <button
      type="button"
      className={cn('wt-pillx', className)}
      onClick={(e) => {
        chipFx(e.currentTarget, false);
        onRemove();
      }}
      aria-label={`Remove ${label}`}
    >
      {label}
      <span className="x">
        <X size={12} aria-hidden="true" />
      </span>
    </button>
  );
}

/** A checkbox tile for multi-select sheets (muscles, equipment). */
export function CheckChip({ checked, onChange, children, className }: { checked: boolean; onChange: (next: boolean) => void; children: ReactNode; className?: string }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      className={cn('wt-ck', className)}
      onClick={(e) => {
        chipFx(e.currentTarget, !checked);
        onChange(!checked);
      }}
    >
      <span className="box">
        <Check size={14} aria-hidden="true" />
      </span>
      {children}
    </button>
  );
}

/** A small static label. */
export function Tag({ tone = 'default', children, className }: { tone?: 'default' | 'ok'; children: ReactNode; className?: string }) {
  return <span className={cn('wt-tag', tone === 'ok' && 'ok', className)}>{children}</span>;
}
