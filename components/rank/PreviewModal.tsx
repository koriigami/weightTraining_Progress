'use client';

import type { ReactNode } from 'react';
import { Check, Lock } from 'lucide-react';
import { Badge } from '@/components/Badge';
import { GameModal } from '@/components/ui/GameModal';
import { cn } from '@/components/ui/cn';
import { tierLabel } from '@/lib/badgeCards';
import type { BadgeCard } from '@/lib/badgeCards';

/** What the preview dialog shows. Ranks and badges both build one. */
export type Preview = {
  title: string;
  unlocked: boolean;
  art: ReactNode;
  body: string;
  ladder?: BadgeCard['ladder'];
};

/**
 * The centered preview for a rank gate or a badge: the full-colour design, an
 * Unlocked or Locked ribbon, and what it takes. Tapping outside closes it.
 */
export function PreviewModal({ preview, onClose }: { preview: Preview | null; onClose: () => void }) {
  return (
    <GameModal
      open={preview !== null}
      title={preview?.title ?? ''}
      art={preview?.art}
      badge={
        preview && (
          <span className={cn('wt-lock-rib', preview.unlocked && 'open')}>
            {preview.unlocked ? <Check size={14} aria-hidden="true" /> : <Lock size={14} aria-hidden="true" />}
            {preview.unlocked ? 'Unlocked' : 'Locked'}
          </span>
        )
      }
      extra={preview?.ladder && preview.ladder.length > 0 ? <Ladder ladder={preview.ladder} /> : undefined}
      cancelLabel="Got it"
      onCancel={onClose}
    >
      {preview?.body ?? ''}
    </GameModal>
  );
}

function Ladder({ ladder }: { ladder: NonNullable<Preview['ladder']> }) {
  return (
    <ol className="wt-ladder" aria-label="Tiers">
      {ladder.map((l) => (
        <li key={l.tier} aria-label={`${tierLabel(l.tier)}, ${l.threshold.toLocaleString('en-US')}, ${l.earned ? 'earned' : 'not yet'}`}>
          <Badge shape="circle" tier={l.tier} text={l.tier[0].toUpperCase()} locked={!l.earned} size={34} label="" />
          <span aria-hidden="true">{l.threshold.toLocaleString('en-US')}</span>
        </li>
      ))}
    </ol>
  );
}
