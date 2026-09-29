'use client';

import { Children, cloneElement, forwardRef, isValidElement, useId } from 'react';
import type { InputHTMLAttributes, ReactElement, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';
import { Search } from 'lucide-react';
import { cn } from './cn';

/**
 * A labelled form row. Pass one Input, Select or Textarea as the child: it gets
 * the id, the hint and error wiring for free.
 */
export function Field({ label, hint, error, children, className }: { label: string; hint?: ReactNode; error?: ReactNode; children: ReactNode; className?: string }) {
  const uid = useId();
  const child = Children.only(children) as ReactElement<{ id?: string; 'aria-describedby'?: string; 'aria-invalid'?: boolean }>;
  const id = (isValidElement(child) && child.props.id) || `${uid}-f`;
  const describedBy = [hint ? `${id}-hint` : '', error ? `${id}-err` : ''].filter(Boolean).join(' ') || undefined;
  return (
    <div className={cn('wt-field', className)}>
      <label htmlFor={id}>{label}</label>
      {isValidElement(child) ? cloneElement(child, { id, 'aria-describedby': describedBy, 'aria-invalid': error ? true : undefined }) : child}
      {hint && (
        <span id={`${id}-hint`} className="wt-field-hint">
          {hint}
        </span>
      )}
      {error && (
        <span id={`${id}-err`} className="wt-field-error" role="alert">
          {error}
        </span>
      )}
    </div>
  );
}

/** A cream text field with a gold focus ring. */
export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input({ className, ...rest }, ref) {
  return <input ref={ref} className={cn('wt-input', className)} {...rest} />;
});

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(function Select({ className, children, ...rest }, ref) {
  return (
    <select ref={ref} className={cn('wt-input', className)} {...rest}>
      {children}
    </select>
  );
});

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(function Textarea({ className, ...rest }, ref) {
  return <textarea ref={ref} className={cn('wt-input', className)} {...rest} />;
});

/** The search box with a magnifier. Needs an aria-label. */
export const SearchField = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function SearchField({ className, ...rest }, ref) {
  return (
    <label className={cn('wt-search', className)}>
      <Search size={20} aria-hidden="true" />
      <input ref={ref} type="search" {...rest} />
    </label>
  );
});
