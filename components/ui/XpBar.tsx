import type { CSSProperties } from 'react';
import { cn } from './cn';

/**
 * The outlined, segmented XP bar. Give it a percentage (`value`) or `current`
 * and `max`. `thin` is the slim variant, `variant="muscle"` the green one used
 * for sets per muscle. `animate` grows it from `from` to the value.
 */
export function XpBar({
  value,
  current,
  max,
  from,
  thin,
  variant = 'xp',
  animate,
  label,
  className,
}: {
  value?: number;
  current?: number;
  max?: number;
  from?: number;
  thin?: boolean;
  variant?: 'xp' | 'muscle';
  animate?: boolean;
  label?: string;
  className?: string;
}) {
  const raw = value ?? (max && max > 0 && current !== undefined ? (current / max) * 100 : 0);
  const pct = Math.max(0, Math.min(100, Number.isFinite(raw) ? raw : 0));
  const style = { width: `${pct}%`, '--to': `${pct}%`, '--from': `${Math.max(0, Math.min(100, from ?? 0))}%` } as CSSProperties;
  return (
    <div
      className={cn('wt-xpbar', thin && 'thin', variant === 'muscle' && 'mb', className)}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(pct)}
      aria-label={label ?? 'Progress'}
    >
      <i className={animate ? 'grow' : undefined} style={style} />
    </div>
  );
}
