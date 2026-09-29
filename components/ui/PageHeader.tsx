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
  actions,
  large,
  narrow,
}: {
  title: string;
  /** Show the round gold back button. A string is a link target, true uses history. */
  back?: boolean | string;
  onBack?: () => void;
  /** Buttons on the right, e.g. Finish. */
  actions?: ReactNode;
  /** The big left-aligned game title used on tab screens. */
  large?: boolean;
  /** Match a narrow screen body (740px on desktop). */
  narrow?: boolean;
}) {
  return (
    <header className={cn('wt-ph', large && 'large', narrow && 'narrow')}>
      <div className="wt-ph-in">
        {(back || !large) && (
          <div className="wt-ph-lead">{back && <BackButton href={typeof back === 'string' ? back : undefined} onClick={onBack} />}</div>
        )}
        <h1 className="wt-ph-title">{title}</h1>
        <div className="wt-ph-actions">{actions}</div>
      </div>
    </header>
  );
}
