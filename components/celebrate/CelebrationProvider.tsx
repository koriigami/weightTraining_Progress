'use client';

import dynamic from 'next/dynamic';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { eventKey, mergeQueue, nextUp } from '@/lib/celebrations';
import type { CelebrationEvent, NextUp } from '@/lib/celebrations';
import { Moment } from './Moment';

// The reward stage and the 3D art behind it load only when a chest is about to open.
const RewardStage = dynamic(() => import('./RewardStage'), { ssr: false });

export type { CelebrationEvent };

export type EnqueueOptions = {
  /**
   * Hold the events back for this many ms, or until `release` is called if that
   * comes sooner. The Victory screen uses it so its own counting plays first.
   */
  delayMs?: number;
};

type Ctx = {
  /** Queues reward moments. A rank up and its chest play first, then the chest for badges, one stage at a time. */
  enqueue: (events: CelebrationEvent[], opts?: EnqueueOptions) => void;
  /** Plays a moment again, like tapping an earned badge or an unlocked rank on the Rank screen. */
  replay: (event: CelebrationEvent) => void;
  /** Lets held events go now (Victory calls it when Done is tapped before its hold is over). */
  release: () => void;
};

const CelebrationContext = createContext<Ctx | null>(null);

// Whether a moment is on screen, waiting in the queue, or held back for the Victory
// screen. It is its own context so only what needs it re-renders as moments come and go.
const CelebratingContext = createContext(false);

export function CelebrationProvider({ children }: { children: React.ReactNode }) {
  const [queue, setQueue] = useState<CelebrationEvent[]>([]);
  const [holding, setHolding] = useState(false);
  // What is on screen. It is fixed when it starts, so events that join the queue
  // while a chest is open wait for the next stage instead of changing this one.
  const [active, setActive] = useState<NextUp | null>(null);

  const commit = useCallback((events: CelebrationEvent[]) => {
    setQueue((q) => mergeQueue(q, events));
  }, []);

  // Events held back for a moment, and the timer that lets them go.
  const held = useRef<CelebrationEvent[]>([]);
  const timer = useRef<number | null>(null);

  const release = useCallback(() => {
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = null;
    const events = held.current;
    held.current = [];
    setHolding(false);
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
      setHolding(true);
      if (timer.current === null) timer.current = window.setTimeout(release, delay);
    },
    [commit, release]
  );

  const replay = useCallback((event: CelebrationEvent) => commit([{ ...event, replay: true }]), [commit]);

  // When nothing is on screen, start the next thing in the queue.
  useEffect(() => {
    if (active) return;
    const next = nextUp(queue);
    if (!next) return;
    setActive(next);
  }, [queue, active]);

  const finish = useCallback((events: CelebrationEvent[]) => {
    const keys = new Set(events.map(eventKey));
    setQueue((q) => q.filter((e) => !keys.has(eventKey(e))));
    setActive(null);
  }, []);

  useEffect(
    () => () => {
      if (timer.current !== null) window.clearTimeout(timer.current);
    },
    []
  );

  // Stable, so a moment starting or ending does not re-render everything that can queue one.
  const value = useMemo(() => ({ enqueue, replay, release }), [enqueue, replay, release]);

  return (
    <CelebrationContext.Provider value={value}>
      <CelebratingContext.Provider value={active !== null || queue.length > 0 || holding}>
        {children}
        {active?.kind === 'levelup' && <Moment key={eventKey(active.event)} event={active.event} onDone={() => finish([active.event])} />}
        {active?.kind === 'stage' && <RewardStage key={active.key} events={active.events} onDone={() => finish(active.events)} />}
      </CelebratingContext.Provider>
    </CelebrationContext.Provider>
  );
}

export function useCelebration(): Ctx {
  const ctx = useContext(CelebrationContext);
  if (!ctx) throw new Error('useCelebration must be used within CelebrationProvider');
  return ctx;
}

/** True while a reward moment is showing, queued or held back. Things that would cover the screen wait for false. */
export function useCelebrating(): boolean {
  return useContext(CelebratingContext);
}
