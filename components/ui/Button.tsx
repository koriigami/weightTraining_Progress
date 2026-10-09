'use client';

import Link from 'next/link';
import { forwardRef } from 'react';
import type { ComponentPropsWithoutRef, ReactNode } from 'react';
import { cn } from './cn';
import { usePress, withPress } from './usePress';

export type ButtonVariant = 'primary' | 'secondary' | 'tertiary' | 'soft-destructive' | 'solid-destructive';
export type ButtonSize = 'sm' | 'md' | 'lg';

const VARIANT_CLASS: Record<ButtonVariant, string> = {
  primary: 'wt-btn-p',
  secondary: 'wt-btn-t',
  tertiary: 'wt-btn-g',
  'soft-destructive': 'wt-btn-ds',
  'solid-destructive': 'wt-btn-dd',
};

// Green buttons pop, gold ones tock (board 12). The flat dashed one does not squish.
const SLOT: Record<ButtonVariant, 'tap' | 'tock'> = { primary: 'tap', 'solid-destructive': 'tap', secondary: 'tock', tertiary: 'tock', 'soft-destructive': 'tock' };

const SIZE_CLASS: Record<ButtonSize, string> = { sm: 'wt-btn-sm', md: '', lg: 'wt-btn-lg' };

type Shared = {
  /** primary: green 3D. secondary: gold. tertiary: dashed in-card add. soft-destructive starts a destructive action, solid-destructive confirms it inside a dialog. */
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Full width. */
  block?: boolean;
  /** Shows a spinner over the label. The label stays, so the button keeps its width. */
  loading?: boolean;
  /** Leading icon. */
  icon?: ReactNode;
  /** Trailing icon. */
  iconRight?: ReactNode;
  className?: string;
  children?: ReactNode;
};

function classes({ variant = 'primary', size = 'md', block, loading, className }: Shared) {
  return cn('wt-btn', VARIANT_CLASS[variant], SIZE_CLASS[size], block && 'wt-btn-block', loading && 'is-loading', className);
}

export type ButtonProps = Shared & Omit<ComponentPropsWithoutRef<'button'>, keyof Shared>;

/** The chunky 3D button. The squish is CSS (:active); the press sound and the spring back on release are usePress. Disabled is desaturated and flat. */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size, block, loading, icon, iconRight, className, children, disabled, type = 'button', ...rest },
  ref
) {
  const press = usePress<HTMLButtonElement>(SLOT[variant], !disabled && !loading, variant !== 'tertiary');
  return (
    <button
      ref={ref}
      type={type}
      className={classes({ variant, size, block, loading, className })}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
      {...withPress(press, rest)}
    >
      {icon}
      {children}
      {iconRight}
    </button>
  );
});

export type ButtonLinkProps = Shared & Omit<ComponentPropsWithoutRef<typeof Link>, keyof Shared>;

/** The same button as a link, for navigation. */
export function ButtonLink({ variant = 'primary', size, block, loading, icon, iconRight, className, children, ...rest }: ButtonLinkProps) {
  const press = usePress<HTMLAnchorElement>(SLOT[variant], !loading, variant !== 'tertiary');
  return (
    <Link className={classes({ variant, size, block, loading, className })} aria-busy={loading || undefined} {...rest} {...withPress(press, rest)}>
      {icon}
      {children}
      {iconRight}
    </Link>
  );
}
