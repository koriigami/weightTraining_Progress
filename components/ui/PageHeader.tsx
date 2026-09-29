'use client';

import type { ReactNode } from 'react';
import { BackButton } from './BackButton';
import { cn } from './cn';

/**
 * A screen's top bar.
 * Phone: a bar with the title (centered next to a back button, or left-aligned
 * in the game font when `large`, as on the tab screens).
 * Desktop: a sticky header row with the title on the left and actions on the right.
 */
export function PageHeader({
  title,
  back,
  onBack,
  backLabel,
  backIcon,
  lead,
  actions,
  sub,
  large,
  narrow,
}: {
  title: string;
  /** Show the round gold back button. A string is a link target, true uses history. */
  back?: boolean | string;
  onBack?: () => void;
  /** The accessible name of the back button. */
  backLabel?: string;
  /** A down chevron for a screen that minimizes instead of going back. */
  backIcon?: 'left' | 'down';
  /** Replaces the back button, e.g. a Cancel text button. */
  lead?: ReactNode;
  /** Buttons on the right, e.g. Finish. */
  actions?: ReactNode;
  /** A row under the bar that stays pinned with it, e.g. the live stats while logging. */
  sub?: ReactNode;
  /** The big left-aligned game title used on tab screens. */
  large?: boolean;
  /** Match a narrow screen body (740px on desktop). */
  narrow?: boolean;
}) {
  return (
    <header className={cn('wt-ph', large && 'large', narrow && 'narrow')}>
      <div className="wt-ph-in">
        {(lead || back || !large) && (
          <div className="wt-ph-lead">
            {lead ?? (back && <BackButton href={typeof back === 'string' ? back : undefined} onClick={onBack} label={backLabel} icon={backIcon} />)}
          </div>
        )}
        <h1 className="wt-ph-title">{title}</h1>
        <div className="wt-ph-actions">{actions}</div>
      </div>
      {sub && <div className="wt-ph-sub">{sub}</div>}
    </header>
  );
}
