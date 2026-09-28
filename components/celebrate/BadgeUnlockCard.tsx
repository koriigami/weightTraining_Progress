'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { Badge } from '@/components/Badge';
import { describeEarnedBadge } from '@/lib/badgeDisplay';
import type { EarnedBadgeSummary } from '@/lib/badges';
import { useBackToClose } from '@/lib/useBackToClose';
import * as feedback from '@/lib/feedback';
import { celebrationBurst } from './confetti';

export function BadgeUnlockCard({ badge, onDone }: { badge: EarnedBadgeSummary; onDone: () => void }) {
  const reduceMotion = Boolean(useReducedMotion());
  const [dismissable, setDismissable] = useState(false);
  const [shine, setShine] = useState(false);
  const revealed = useRef(false);
  const close = useBackToClose(true, onDone);

  const { name, description, xp, badgeProps } = describeEarnedBadge(badge);

  useEffect(() => {
    feedback.warm();
  }, []);

  function onFlipComplete() {
    if (revealed.current) return;
    revealed.current = true;
    setShine(true);
    celebrationBurst();
    feedback.badgeReveal();
    setDismissable(true);
  }

  return (
    <motion.div
      className="fixed inset-0 z-[1000] grid cursor-pointer place-items-center overflow-hidden text-white"
      style={{ background: 'rgba(4,5,14,.86)' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: reduceMotion ? 0 : 0.18 }}
      onClick={() => dismissable && close()}
    >
      <motion.div
        className="celebrate-rays"
        style={{ background: 'repeating-conic-gradient(from 0deg, #7CC0FF 0 7deg, transparent 7deg 18deg)' }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.55 }}
        transition={{ duration: reduceMotion ? 0 : 0.4, delay: reduceMotion ? 0 : 0.15 }}
      />

      <div className="relative flex flex-col items-center gap-4 px-4" style={{ perspective: 1000 }}>
        <motion.div
          className="relative"
          style={{ width: 'min(300px, 84vw)', aspectRatio: '3 / 4', transformStyle: 'preserve-3d' }}
          initial={{ rotateY: 180, scale: 0.8 }}
          animate={reduceMotion ? { rotateY: 0, scale: 1 } : { rotateY: [180, -12, 0], scale: [0.8, 1.04, 1] }}
          transition={reduceMotion ? { duration: 0 } : { duration: 0.7, times: [0, 0.7, 1], ease: [0.3, 1.2, 0.5, 1], delay: 0.2 }}
          onAnimationComplete={onFlipComplete}
        >
          <div
            className="absolute inset-0 flex flex-col items-center justify-center gap-2 overflow-hidden rounded-3xl border-2 p-5"
            style={{
              background: 'radial-gradient(circle at 50% 35%, #2B2F55, #12142A)',
              borderColor: '#3A3F70',
              backfaceVisibility: 'hidden',
            }}
          >
            <Badge {...badgeProps} size={180} />
            <span className="text-xs font-bold uppercase tracking-[0.14em] text-[#FFD66B]">{badgeProps.tier ? badgeProps.tier : 'Earned'}</span>
            <h3 className="font-display text-2xl tracking-wide text-white">{name}</h3>
            <p className="text-center text-sm text-[#C3C7DC]">{description}</p>
            {xp > 0 && (
              <span
                className="rounded-full px-3 py-1 text-sm font-bold text-[#3B2600]"
                style={{ background: 'linear-gradient(180deg,#FFE08A,#F0B12A)' }}
              >
                +{xp} XP
              </span>
            )}
            {shine && (
              <motion.div
                className="pointer-events-none absolute -inset-[40%]"
                style={{ background: 'linear-gradient(115deg, transparent 40%, rgba(255,255,255,.55) 50%, transparent 60%)' }}
                initial={{ x: '-100%' }}
                animate={{ x: '100%' }}
                transition={{ duration: reduceMotion ? 0 : 0.9, ease: 'easeInOut' }}
              />
            )}
          </div>
          <div
            className="absolute inset-0 flex items-center justify-center rounded-3xl border-2"
            style={{
              background: 'repeating-linear-gradient(45deg, #1B1E3A 0 12px, #20244A 12px 24px)',
              borderColor: '#3A3F70',
              backfaceVisibility: 'hidden',
              transform: 'rotateY(180deg)',
            }}
          >
            <b className="font-display text-6xl text-[#3A3F70]">?</b>
          </div>
        </motion.div>

        {dismissable && (
          <motion.button
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.2 }}
            onClick={(e) => {
              e.stopPropagation();
              close();
            }}
            className="min-h-11 rounded-full px-6 text-sm font-semibold text-[#3B2600] shadow-[0_3px_0_#9A6300]"
            style={{ background: 'linear-gradient(180deg,#FFD66B,#E09A12)' }}
          >
            Nice
          </motion.button>
        )}
      </div>
    </motion.div>
  );
}
