'use client';

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { RankShield } from '@/components/RankShield';
import { cn } from '@/components/ui/cn';
import { useDialog } from '@/components/ui/useDialog';
import { momentCopy } from '@/lib/celebrations';
import type { CelebrationEvent } from '@/lib/celebrations';
import { xpIntoLevel } from '@/lib/progress';
import { useBackToClose } from '@/lib/useBackToClose';
import * as feedback from '@/lib/feedback';
import { momentBurst } from './confetti';

// A tap in the first moments is ignored, so the tap that started a moment (or a
// double tap) cannot skip it before anyone sees it.
const ARM_MS = 300;
const LEAVE_MS = 160;

const reducedNow = () => typeof window !== 'undefined' && Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);

// A number that rolls from `from` to `to` after `delay` ms. Reduced motion shows the end at once.
function useRoll(from: number, to: number, delay: number, duration: number, reduced: boolean): number {
  const [value, setValue] = useState(reduced ? to : from);
  useEffect(() => {
    if (reduced) {
      setValue(to);
      return undefined;
    }
    let raf = 0;
    const t0 = performance.now() + delay;
    const step = (now: number) => {
      const k = Math.min(1, Math.max(0, (now - t0) / duration));
      setValue(Math.round(from + (to - from) * k));
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [from, to, delay, duration, reduced]);
  return value;
}

const SPARKS = 22;

// A ring of little squares that fly outward from the shield or the chest.
// `base` is when the first one goes, in seconds: the moment of impact.
function Sparks({ base }: { base: number }) {
  return (
    <div className="wt-m-sparks" aria-hidden="true">
      {Array.from({ length: SPARKS }, (_, i) => {
        const a = (i / SPARKS) * Math.PI * 2;
        const d = 120 + ((i * 37) % 80);
        const style = {
          '--x': `${Math.round(Math.cos(a) * d)}px`,
          '--y': `${Math.round(Math.sin(a) * d)}px`,
          '--d': `${(base + (i % 5) * 0.06).toFixed(2)}s`,
          '--c': i % 3 ? 'var(--xp-hi)' : 'var(--hi)',
        } as CSSProperties;
        return <i key={i} style={style} />;
      })}
    </div>
  );
}

type LevelUpEvent = Extract<CelebrationEvent, { kind: 'levelup' }>;

function LevelBody({ event, reduced }: { event: LevelUpEvent; reduced: boolean }) {
  const rolled = useRoll(event.from, event.to, 900, 700, reduced);
  const { current, needed } = xpIntoLevel(event.xpNow);
  return (
    <>
      <div className="gt wt-m-k">LEVEL UP!</div>
      <div className="wt-m-stage">
        <div className="wt-slam">
          <RankShield rank={event.rank} level={event.to} size={150} />
        </div>
      </div>
      <div className="gt wt-m-num">{rolled}</div>
      <div className="wt-m-sub">
        {Math.max(0, needed - current).toLocaleString('en-US')} XP to level {event.to + 1}
      </div>
    </>
  );
}

/**
 * The level up moment, full screen. Ranks and badges play on the reward stage
 * (RewardStage.tsx); a level up inside a rank plays on Victory's own level bar,
 * so this is only for a level that came in somewhere else (a workout logged or
 * edited from the history). Ported from board 05 with the same keyframes and timings. It is a dialog: focus moves
 * into it, Tab stays inside, and focus goes back afterwards. Tap, Enter, Space
 * or Esc continue. Screen readers get the text as a sentence. With reduced
 * motion it shows its end state with nothing spinning.
 */
export function Moment({ event, onDone }: { event: LevelUpEvent; onDone: () => void }) {
  const [reduced] = useState(reducedNow);
  const rootRef = useRef<HTMLDivElement>(null);
  const tapRef = useRef<HTMLButtonElement>(null);
  const descId = useId();
  const [leaving, setLeaving] = useState(false);
  const doneRef = useRef(false);
  const armedAt = useRef(0);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;
  const copy = momentCopy(event);

  // The moment ends here, whichever way it was asked to (a tap, Esc, or Back).
  const finish = useCallback(() => {
    if (doneRef.current) return;
    doneRef.current = true;
    setLeaving(true);
    window.setTimeout(() => onDoneRef.current(), reducedNow() ? 0 : LEAVE_MS);
  }, []);
  const close = useBackToClose(true, finish);

  const request = useCallback(() => {
    if (doneRef.current || performance.now() < armedAt.current) return;
    close();
  }, [close]);

  useDialog(true, rootRef, request);

  useEffect(() => {
    armedAt.current = performance.now() + ARM_MS;
  }, []);

  // Enter and Space continue from anywhere. On the button itself the browser's own click does it.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      if (document.activeElement === tapRef.current) return;
      e.preventDefault();
      request();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [request]);

  // Sounds, haptics and the confetti pop follow the animation: they land with the
  // shield or the lid. Nothing waits when motion is reduced.
  useEffect(() => {
    feedback.warm();
    const timers: number[] = [];
    const at = (ms: number, fn: () => void) => timers.push(window.setTimeout(fn, reduced ? Math.min(ms, 150) : ms));
    at(650, () => {
      feedback.levelUp();
      momentBurst();
    });
    return () => timers.forEach((t) => window.clearTimeout(t));
    // The moment is keyed by its event, so it plays once per mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sparkBase = 0.45;

  return (
    <div
      ref={rootRef}
      className={cn('wt-moment', 'wt-moment-levelup', leaving && 'leaving')}
      role="dialog"
      aria-modal="true"
      aria-label={copy.label}
      aria-describedby={descId}
      tabIndex={-1}
      data-moment="levelup"
      onClick={request}
    >
      <div className="wt-m-glow" aria-hidden="true" />
      <div className="wt-m-rays" aria-hidden="true" />
      <Sparks base={sparkBase} />
      <div className="wt-m-body" aria-hidden="true">
        <LevelBody event={event} reduced={reduced} />
      </div>
      <p id={descId} className="sr-only">
        {copy.announce}
      </p>
      <button ref={tapRef} type="button" className="wt-m-tap" data-autofocus>
        Tap to continue
      </button>
    </div>
  );
}
