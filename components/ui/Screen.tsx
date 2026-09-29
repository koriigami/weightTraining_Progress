import type { ReactNode } from 'react';
import { cn } from './cn';

/**
 * The layout every screen uses.
 * - `header`: a PageHeader, sticky at the top.
 * - `footer`: the pinned main action. It is a sticky bottom bar on the phone
 *   only. On desktop the header carries the actions instead.
 * - `aside`: a desktop side column. From 1100px it sits to the right and stays
 *   put while the main column scrolls. Below that it stacks under the main content.
 * - `narrow`: a narrower body (740px) for forms and editors.
 */
export function Screen({
  header,
  footer,
  aside,
  narrow,
  className,
  children,
}: {
  header?: ReactNode;
  footer?: ReactNode;
  aside?: ReactNode;
  narrow?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn('wt-screen', className)}>
      {header}
      <div className={cn('wt-wrap', narrow && 'narrow')}>
        {aside ? (
          <div className="wt-dgrid">
            <div className="wt-dcol">{children}</div>
            <aside className="wt-dcol wt-dside">{aside}</aside>
          </div>
        ) : (
          <div className="wt-dcol">{children}</div>
        )}
      </div>
      {footer && <div className="wt-foot">{footer}</div>}
    </div>
  );
}
