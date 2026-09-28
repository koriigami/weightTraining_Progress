'use client';

import { createContext, useCallback, useContext, useState } from 'react';
import { AnimatePresence } from 'motion/react';
import type { EarnedBadgeSummary } from '@/lib/badges';
import type { Rank } from '@/lib/progress';
import { LevelUpOverlay } from './LevelUpOverlay';
import { BadgeUnlockCard } from './BadgeUnlockCard';

export type CelebrationEvent =
  | { kind: 'badge'; badge: EarnedBadgeSummary }
  | { kind: 'levelup'; from: number; to: number; rank: Rank; xpNow: number }
  | { kind: 'rankup'; fromRank: Rank; toRank: Rank; level: number; xpNow: number };

type Ctx = { enqueue: (events: CelebrationEvent[]) => void };

const CelebrationContext = createContext<Ctx | null>(null);

export function CelebrationProvider({ children }: { children: React.ReactNode }) {
  const [queue, setQueue] = useState<CelebrationEvent[]>([]);
  const current = queue[0] ?? null;

  const enqueue = useCallback((events: CelebrationEvent[]) => {
    if (events.length === 0) return;
    setQueue((q) => [...q, ...events]);
  }, []);

  const advance = useCallback(() => {
    setQueue((q) => q.slice(1));
  }, []);

  let key = '';
  if (current) {
    key = current.kind === 'badge' ? `badge-${current.badge.id}` : current.kind === 'levelup' ? `lvl-${current.to}` : `rank-${current.toRank}`;
  }

  return (
    <CelebrationContext.Provider value={{ enqueue }}>
      {children}
      <AnimatePresence mode="wait">
        {current?.kind === 'badge' && <BadgeUnlockCard key={key} badge={current.badge} onDone={advance} />}
        {(current?.kind === 'levelup' || current?.kind === 'rankup') && <LevelUpOverlay key={key} event={current} onDone={advance} />}
      </AnimatePresence>
    </CelebrationContext.Provider>
  );
}

export function useCelebration(): Ctx {
  const ctx = useContext(CelebrationContext);
  if (!ctx) throw new Error('useCelebration must be used within CelebrationProvider');
  return ctx;
}
