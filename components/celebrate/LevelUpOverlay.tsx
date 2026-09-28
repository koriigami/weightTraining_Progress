'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { RankShield, RANK_MATERIALS } from '@/components/RankShield';
import { RANK_TITLES, xpIntoLevel } from '@/lib/progress';
import { useBackToClose } from '@/lib/useBackToClose';
import * as feedback from '@/lib/feedback';
import { celebrationBurst } from './confetti';
import type { CelebrationEvent } from './CelebrationProvider';

type Event = Extract<CelebrationEvent, { kind: 'levelup' } | { kind: 'rankup' }>;

function useCountUp(from: number, to: number, active: boolean, durationMs: number): number {
  const [value, setValue] = useState(from);
  useEffect(() => {
    if (!active) return;
    if (durationMs <= 0) {
      setValue(to);
      return;
    }
    let raf = 0;
    const t0 = performance.now();
    function tick(t: number) {
      const k = Math.min(1, (t - t0) / durationMs);
      setValue(Math.round(from + (to - from) * k));
      if (k < 1) raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, from, to, durationMs]);
  return value;
}

function GradientHeadline({ text, reduceMotion }: { text: string; reduceMotion: boolean }) {
  const letters = [...text];
  return (
    <div className="font-display" style={{ fontSize: 'clamp(40px,9vw,64px)', lineHeight: 1.1, letterSpacing: 1 }}>
      {letters.map((ch, i) => (
        <motion.span
          key={i}
          initial={{ opacity: 0, y: 18, scale: 0.6 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: reduceMotion ? 0 : 0.26, delay: reduceMotion ? 0 : i * 0.04, ease: [0.3, 1.5, 0.5, 1] }}
          style={{
            display: 'inline-block',
            background: 'linear-gradient(180deg,#FFF6C8 0%,#FFD24A 45%,#E08A00 100%)',
            WebkitBackgroundClip: 'text',
            backgroundClip: 'text',
            color: 'transparent',
            filter: 'drop-shadow(0 3px 0 #6B3E00)',
          }}
        >
          {ch === ' ' ? ' ' : ch}
        </motion.span>
      ))}
    </div>
  );
}

function Shard({ angle, dist, color, clip, duration }: { angle: number; dist: number; color: string; clip: string; duration: number }) {
  return (
    <motion.div
      className="absolute left-1/2 top-1/2 h-10 w-10 -ml-5 -mt-5"
      style={{ background: color, clipPath: clip }}
      initial={{ x: 0, y: 0, rotate: 0, opacity: 1 }}
      animate={{ x: Math.cos(angle) * dist, y: Math.sin(angle) * dist, rotate: Math.random() * 540 - 270, opacity: 0 }}
      transition={{ duration, ease: [0.2, 0.7, 0.3, 1] }}
    />
  );
}

export function LevelUpOverlay({ event, onDone }: { event: Event; onDone: () => void }) {
  const reduceMotion = Boolean(useReducedMotion());
  const isRankUp = event.kind === 'rankup';
  const level = isRankUp ? event.level : event.to;
  const fromLevel = isRankUp ? event.level - 1 : event.from;
  const rank = isRankUp ? event.toRank : event.rank;
  const rayColor = isRankUp ? '#FFD24A' : RANK_MATERIALS[rank].rim[0];
  const dur = (ms: number) => (reduceMotion ? 0 : ms) / 1000;

  const [shatter, setShatter] = useState(false); // rank-up only: old shield begins breaking apart
  const [newShieldIn, setNewShieldIn] = useState(!isRankUp); // level-up shows its one shield immediately
  const [shake, setShake] = useState(false);
  const [showHeadline, setShowHeadline] = useState(false);
  const [showSub, setShowSub] = useState(false);
  const [dismissable, setDismissable] = useState(false);
  const impactPlayed = useRef(false);
  const continueRef = useRef<HTMLButtonElement | null>(null);

  const close = useBackToClose(true, onDone);

  // Escape and Enter both dismiss, once dismissable; a mouse or touch is
  // never required to move past this overlay.
  useEffect(() => {
    if (!dismissable) return;
    continueRef.current?.focus();
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' || e.key === 'Enter') {
        e.preventDefault();
        close();
      }
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dismissable]);

  const shards = useMemo(
    () =>
      Array.from({ length: 16 }, (_, i) => ({
        angle: Math.random() * Math.PI * 2,
        dist: 160 + Math.random() * 180,
        color: i % 3 ? RANK_MATERIALS[isRankUp ? event.fromRank : rank].face[0] : RANK_MATERIALS[isRankUp ? event.fromRank : rank].rim[0],
        clip: `polygon(${Math.random() * 50}% 0,100% ${Math.random() * 60}%,${30 + Math.random() * 50}% 100%,0 ${40 + Math.random() * 60}%)`,
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  useEffect(() => {
    feedback.warm();
    const timers: ReturnType<typeof setTimeout>[] = [];
    const at = (ms: number, fn: () => void) => timers.push(setTimeout(fn, reduceMotion ? 0 : ms));

    if (!isRankUp) {
      at(250, () => setShowHeadline(true));
      at(1200, () => setShowSub(true));
      at(1900, () => setDismissable(true));
    } else {
      at(700, () => setShatter(true));
      at(1000, () => setNewShieldIn(true));
      at(1250, () => setShowHeadline(true));
      at(1900, () => setShowSub(true));
      at(2600, () => setDismissable(true));
    }
    return () => timers.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduceMotion, isRankUp]);

  function onShieldImpact() {
    if (impactPlayed.current) return;
    impactPlayed.current = true;
    setShake(true);
    celebrationBurst();
    if (isRankUp) {
      feedback.rankUp();
      setTimeout(celebrationBurst, reduceMotion ? 0 : 350);
    } else {
      feedback.levelUp();
    }
  }

  const displayLevel = useCountUp(fromLevel, level, newShieldIn, dur(600) * 1000);
  const xp = xpIntoLevel(event.xpNow);
  const subline = isRankUp
    ? `You are now a ${RANK_TITLES[rank]}.`
    : `Level ${level}. ${Math.max(0, xp.needed - xp.current)} XP to level ${level + 1}.`;

  return (
    <motion.div
      className="fixed inset-0 z-[1000] grid cursor-pointer place-items-center overflow-hidden text-white"
      style={{ background: 'rgba(4,5,14,.86)' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: dur(180) }}
      onClick={() => dismissable && close()}
    >
      <motion.div
        className="celebrate-rays"
        style={{ background: `repeating-conic-gradient(from 0deg, ${rayColor} 0 7deg, transparent 7deg 18deg)` }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.55 }}
        transition={{ duration: dur(400), delay: dur(150) }}
      />

      <motion.div
        className="relative flex flex-col items-center gap-3 px-4 text-center"
        animate={shake ? { x: [0, -6, 5, -3, 0] } : {}}
        transition={{ duration: dur(160) }}
      >
        <div className="relative" style={{ width: 180, height: 210 }}>
          {!isRankUp && (
            <motion.div
              className="absolute inset-0"
              initial={{ scale: 2.2, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={reduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 260, damping: 14, delay: 0.25 }}
              onAnimationComplete={onShieldImpact}
            >
              <RankShield rank={rank} level={displayLevel} size={180} />
            </motion.div>
          )}

          {isRankUp && (shatter || !newShieldIn) && (
            <motion.div
              className="absolute inset-0"
              initial={{ scale: 0.6, opacity: 0 }}
              animate={shatter ? { scale: [1, 1.25], opacity: [1, 0] } : { scale: 1, opacity: 1 }}
              transition={shatter ? { duration: dur(220) } : { duration: dur(300) }}
            >
              <RankShield rank={event.fromRank} level={fromLevel} size={180} />
              {shatter && shards.map((s, i) => <Shard key={i} angle={s.angle} dist={s.dist} color={s.color} clip={s.clip} duration={dur(700) || 0.01} />)}
            </motion.div>
          )}

          {isRankUp && newShieldIn && (
            <motion.div
              className="absolute inset-0"
              initial={{ scale: 2.2, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={reduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 260, damping: 14 }}
              onAnimationComplete={onShieldImpact}
            >
              <RankShield rank={rank} level={displayLevel} size={180} />
            </motion.div>
          )}
        </div>

        {showHeadline && <GradientHeadline text={isRankUp ? 'RANK UP' : 'LEVEL UP'} reduceMotion={reduceMotion} />}

        {showSub && (
          <>
            <motion.p className="text-base text-[#D9DCEB]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: dur(300) }}>
              {subline}
            </motion.p>
            {dismissable ? (
              <motion.button
                ref={continueRef}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  close();
                }}
                initial={{ opacity: 0 }}
                animate={{ opacity: [0.6, 1, 0.6] }}
                transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
                className="mt-2 min-h-11 rounded-full border border-white/30 px-5 text-xs font-semibold uppercase tracking-[0.12em] text-[#B9BDD2] focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                Continue
              </motion.button>
            ) : (
              <motion.p
                className="mt-1 text-xs uppercase tracking-[0.12em] text-[#B9BDD2]"
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.8 }}
                transition={{ duration: dur(200) }}
              >
                Tap to continue
              </motion.p>
            )}
          </>
        )}
      </motion.div>
    </motion.div>
  );
}
