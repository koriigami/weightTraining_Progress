'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { eventKey, mergeQueue } from '@/lib/celebrations';
import type { CelebrationEvent } from '@/lib/celebrations';
import { Moment } from './Moment';

export type { CelebrationEvent };

export type EnqueueOptions = {
  /**
   * Hold the events back for this many ms, or until the first tap or key press if
   * that comes sooner. The Victory screen uses it so its banner plays first.
   */
  delayMs?: number;
};

type Ctx = {
  /** Queues reward moments. Level ups and rank ups play first, then badges, one at a time. */
  enqueue: (events: CelebrationEvent[], opts?: EnqueueOptions) => void;
  /** Plays a moment again, like tapping an earned badge or an unlocked rank on the Rank screen. */
  replay: (event: CelebrationEvent) => void;
};

const CelebrationContext = createContext<Ctx | null>(null);

export function CelebrationProvider({ children }: { children: React.ReactNode }) {
  const [queue, setQueue] = useState<CelebrationEvent[]>([]);
  const current = queue[0] ?? null;

  const commit = useCallback((events: CelebrationEvent[]) => {
    setQueue((q) => mergeQueue(q, events));
  }, []);

  // Events held back for a moment, and what is waiting to let them go.
  const held = useRef<CelebrationEvent[]>([]);
  const timer = useRef<number | null>(null);
  const stopListening = useRef<(() => void) | null>(null);

  const release = useCallback(() => {
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = null;
    stopListening.current?.();
    stopListening.current = null;
    const events = held.current;
    held.current = [];
    if (events.length) commit(events);
  }, [commit]);

  const enqueue = useCallback(
    (events: CelebrationEvent[], opts?: EnqueueOptions) => {
      if (events.length === 0) return;
      const delay = opts?.delayMs ?? 0;
      if (delay <= 0) {
        commit(events);
        return;
      }
      held.current = [...held.current, ...events];
      if (timer.current !== null) return;
      timer.current = window.setTimeout(release, delay);
      const onFirst = () => release();
      document.addEventListener('pointerdown', onFirst, true);
      document.addEventListener('keydown', onFirst, true);
      stopListening.current = () => {
        document.removeEventListener('pointerdown', onFirst, true);
        document.removeEventListener('keydown', onFirst, true);
      };
    },
    [commit, release]
  );

  const replay = useCallback((event: CelebrationEvent) => commit([{ ...event, replay: true }]), [commit]);

  const advance = useCallback(() => {
    setQueue((q) => q.slice(1));
  }, []);

  useEffect(
    () => () => {
      if (timer.current !== null) window.clearTimeout(timer.current);
      stopListening.current?.();
    },
    []
  );

  // Stable, so a moment starting or ending does not re-render everything that can queue one.
  const value = useMemo(() => ({ enqueue, replay }), [enqueue, replay]);

  return (
    <CelebrationContext.Provider value={value}>
      {children}
      {current && <Moment key={eventKey(current)} event={current} onDone={advance} />}
    </CelebrationContext.Provider>
  );
}

export function useCelebration(): Ctx {
  const ctx = useContext(CelebrationContext);
  if (!ctx) throw new Error('useCelebration must be used within CelebrationProvider');
  return ctx;
}
