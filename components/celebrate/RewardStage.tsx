'use client';

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { RankShield, RankShieldArt, RANK_MATERIALS } from '@/components/RankShield';
import { Button } from '@/components/ui/Button';
import { cn } from '@/components/ui/cn';
import { useDialog } from '@/components/ui/useDialog';
import { reducedMotion } from '@/lib/anim';
import type { Rank } from '@/lib/progress';
import { planStage } from '@/lib/rewardStage';
import type { StagePlan } from '@/lib/rewardStage';
import type { CelebrationEvent } from '@/lib/celebrations';
import { useBackToClose } from '@/lib/useBackToClose';
import { StageRun } from './stage/run';

const W = 390;
const H = 780;
const LEAVE_MS = 160;
// A tap in the first moments is ignored, so the tap that started the stage (or a double tap) cannot open the chest unseen.
const ARM_MS = 300;

/** The profile frame as the app draws it: a photo in the rank's colours with the shield on its corner. Drawn with a plain silhouette, since it is a picture of what you unlocked. */
function FrameArt({ rank }: { rank: Rank }) {
  const id = `fr${useId().replace(/[^A-Za-z0-9_-]/g, '')}`;
  const m = RANK_MATERIALS[rank];
  return (
    <svg viewBox="0 0 120 120" width={170} height={170} aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id={`${id}r`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={m.rim[0]} />
          <stop offset=".5" stopColor={m.rim[1]} />
          <stop offset="1" stopColor={m.rim[0]} />
        </linearGradient>
        <linearGradient id={`${id}a`} x1="0" y1="0" x2=".6" y2="1">
          <stop offset="0" stopColor="#18a58a" />
          <stop offset="1" stopColor="#0b6b5a" />
        </linearGradient>
      </defs>
      <circle cx="56" cy="56" r="50" fill={`url(#${id}r)`} />
      <circle cx="56" cy="56" r="42" fill={`url(#${id}a)`} />
      <circle cx="56" cy="46" r="13" fill="#e9fff8" />
      <path d="M33 84a23 23 0 0 1 46 0z" fill="#e9fff8" />
      <g transform="translate(78 76) scale(.3)">
        <RankShieldArt rank={rank} idPrefix={`${id}s`} fontFamily="var(--font-display, 'Arial Rounded MT Bold')" />
      </g>
    </svg>
  );
}

/**
 * The reward stage: the rank-up moment if a rank was crossed, then one chest.
 * Ported from board 12 (docs/design/12-motion/stage.js). The sequence is
 * ./stage/run; this is its markup, its fit to the screen and its dialog
 * behaviour. The stage is drawn 390 by 780 and scaled to fit the screen.
 *
 * It is a dialog: focus moves in, Tab stays inside, Esc and Back close it, and
 * the screen reader hears each step. Taps open the chest and move on; Continue
 * (last) closes it. With reduced motion every step shows its end state.
 */
function Stage({ plan, onDone }: { plan: StagePlan; onDone: () => void }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const runRef = useRef<StageRun | null>(null);
  const liveRef = useRef<HTMLParagraphElement>(null);
  const [ready, setReady] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const doneRef = useRef(false);
  const armedAt = useRef(0);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  const finish = useCallback(() => {
    if (doneRef.current) return;
    doneRef.current = true;
    setLeaving(true);
    runRef.current?.stop();
    window.setTimeout(() => onDoneRef.current(), reducedMotion() ? 0 : LEAVE_MS);
  }, []);
  const close = useBackToClose(true, finish);
  useDialog(true, rootRef, close);

  // Fit the 390 by 780 stage to the screen, centred.
  const fit = useCallback(() => {
    const el = stageRef.current;
    if (!el) return;
    const w = window.innerWidth;
    const h = window.innerHeight;
    const k = Math.min(w / W, h / H, 1.7);
    const ox = (w - W * k) / 2;
    const oy = (h - H * k) / 2;
    el.style.transform = `translate(${ox}px,${oy}px) scale(${k})`;
    runRef.current?.layout(w, h, k, ox, oy);
  }, []);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return undefined;
    armedAt.current = performance.now() + ARM_MS;
    const run = new StageRun(root, plan, {
      onReady: () => setReady(true),
      announce: (text) => {
        if (liveRef.current) liveRef.current.textContent = text;
      },
    });
    runRef.current = run;
    fit();
    void run.start();
    window.addEventListener('resize', fit);
    return () => {
      window.removeEventListener('resize', fit);
      run.stop();
      runRef.current = null;
    };
    // The stage is keyed by its plan, so it plays once per mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const tap = useCallback(() => {
    if (doneRef.current || performance.now() < armedAt.current) return;
    runRef.current?.tap();
  }, []);

  // Enter and Space tap from anywhere, except on the Continue button, where the browser's own click does it.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      if ((e.target as HTMLElement | null)?.closest?.('.wt-rs-done')) return;
      e.preventDefault();
      tap();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [tap]);

  const { rankUp, chest } = plan;
  const titleRank = chest.items.find((i) => i.kind === 'title')?.rank;
  const frameRank = chest.items.find((i) => i.kind === 'frame')?.rank;

  return (
    <div
      ref={rootRef}
      className={cn('wt-rw', leaving && 'leaving')}
      role="dialog"
      aria-modal="true"
      aria-label="Rewards"
      tabIndex={-1}
      data-moment="rewards"
      onPointerDown={(e) => {
        if ((e.target as HTMLElement).closest('.wt-rs-done')) return;
        tap();
      }}
    >
      <div className="wt-rw-bg" aria-hidden="true" />
      <div ref={stageRef} className="wt-rs" aria-hidden="true">
        <div className="wt-rs-shake">
          <div className="wt-rs-rays" />
          <div className="wt-rs-art" />
          <canvas className="wt-rs-fx" />
          <div className="wt-rs-top">
            <span className="wt-rs-lv">1</span>
            <div className="wt-rs-bar">
              <i />
              <b />
            </div>
            <span className="wt-rs-xpn" />
          </div>
          <div className="wt-rs-tray" />
          <div className="wt-rs-name">
            <b />
            <small />
          </div>
          <div className="wt-rs-count">
            <b>1</b>
          </div>
          <div className="wt-rs-hint">
            Tap to open<span className="wt-rs-pips" />
          </div>
          <div className="wt-rs-card">
            <div className="wt-rc-band">
              <span />
            </div>
            <h3 />
            <p className="wt-rc-what" />
            <div className="wt-rc-next">
              <span />
              <div className="wt-rc-bar">
                <i />
              </div>
            </div>
            <div className="wt-rs-xp" />
          </div>
          <div className="wt-rs-cont">Tap to continue</div>
          <div className="wt-rs-got">
            <div className="wt-rs-grid" />
            <div className="wt-rs-tot" />
          </div>
          <div className="wt-rs-item" />
          <div className="wt-rs-fly" />
          <div className="wt-rs-rankup">
            <div className="wt-ru-pillar" />
            <h3>RANK UP!</h3>
            <div className="wt-ru-sh" />
            <div className="wt-ru-title">
              <span />
            </div>
          </div>
        </div>
      </div>
      <div className="wt-rw-flash" aria-hidden="true" />
      <div className={cn('wt-rs-donebox', ready && 'on')}>
        <Button size="lg" block className="wt-rs-done" disabled={!ready} onClick={close} data-autofocus={ready ? true : undefined}>
          Continue
        </Button>
      </div>
      <p ref={liveRef} className="sr-only" aria-live="polite" />
      <div className="wt-rs-tpl" aria-hidden="true">
        {rankUp?.fromRank && (
          <div data-tpl="shield-from">
            <RankShield rank={rankUp.fromRank} size={170} />
          </div>
        )}
        {rankUp && (
          <div data-tpl="shield-to">
            <RankShield rank={rankUp.toRank} size={190} />
          </div>
        )}
        {titleRank && (
          <div data-tpl="item-title">
            <RankShield rank={titleRank} size={170} />
          </div>
        )}
        {frameRank && (
          <div data-tpl="item-frame">
            <FrameArt rank={frameRank} />
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Plays the stage for a batch of waiting events. The plan is decided once, so
 * events that join the queue later wait for the next stage. A batch with no chest
 * in it (nothing to open) closes at once.
 */
export default function RewardStage({ events, onDone }: { events: CelebrationEvent[]; onDone: () => void }) {
  const [plan] = useState(() => planStage(events));
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;
  useEffect(() => {
    if (!plan) onDoneRef.current();
  }, [plan]);
  return plan ? <Stage plan={plan} onDone={onDone} /> : null;
}
