'use client';

import type { ReactNode } from 'react';
import { Lock } from 'lucide-react';
import { Badge, MONTHLY_COLORS } from '@/components/Badge';
import type { BadgeArt as Art } from '@/lib/badgeCards';

/** A badge medal from a card view-model. Full colour unless a padlock is wanted, see LockedArt. */
export function BadgeArt({ art, size = 64, decorative }: { art: Art; size?: number; decorative?: boolean }) {
  return (
    <Badge
      shape={art.shape}
      tier={art.tier}
      colors={art.colorKey ? MONTHLY_COLORS[art.colorKey] : undefined}
      icon={art.icon}
      dy={art.dy}
      text={art.text}
      month={art.month}
      size={size}
      label={decorative ? '' : art.label}
    />
  );
}

/**
 * Locked art stays visible: the design a little muted, with a padlock medallion
 * on the corner. Tapping it opens a full-colour preview.
 */
export function LockedArt({ children }: { children: ReactNode }) {
  return (
    <span className="wt-locked-art">
      {children}
      <span className="wt-lkm" aria-hidden="true">
        <Lock size={12} />
      </span>
    </span>
  );
}
