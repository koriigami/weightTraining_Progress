'use client';

import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Check, X } from 'lucide-react';
import { cn } from './cn';

type ChipProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'aria-pressed'> & {
  /** On: green with a bevel. Off: gold. Leave it out for a plain action chip. */
  pressed?: boolean;
  icon?: ReactNode;
};

/** A 3D toggle chip for filters and quick picks. */
export function Chip({ pressed, icon, className, children, type = 'button', ...rest }: ChipProps) {
  return (
    <button type={type} className={cn('wt-chip', className)} aria-pressed={pressed} {...rest}>
      {icon}
      {children}
    </button>
  );
}

/** A selected filter shown as a green pill with a remove cross. */
export function RemovableChip({ label, onRemove, className }: { label: string; onRemove: () => void; className?: string }) {
  return (
    <button type="button" className={cn('wt-pillx', className)} onClick={onRemove} aria-label={`Remove ${label}`}>
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
    <button type="button" role="checkbox" aria-checked={checked} className={cn('wt-ck', className)} onClick={() => onChange(!checked)}>
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
