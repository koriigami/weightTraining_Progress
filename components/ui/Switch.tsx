'use client';

import { cn } from './cn';

/** A game switch: green and 3D when on. Give it an accessible name with `label`. */
export function Switch({ checked, onChange, label, className, disabled }: { checked: boolean; onChange: (next: boolean) => void; label: string; className?: string; disabled?: boolean }) {
  return (
    <button type="button" role="switch" aria-checked={checked} aria-label={label} disabled={disabled} className={cn('wt-switch', className)} onClick={() => onChange(!checked)}>
      <i />
    </button>
  );
}
