'use client';

import { useEffect, useRef, useState } from 'react';
import { reducedMotion } from '@/lib/anim';
import { VICTORY, runningTotals, victoryTimes } from '@/lib/interactions';
import { SYN, buzz, music, play, preload } from '@/lib/sound';

export type VictoryFxInput = {
  /** The XP of each row in the XP card in order, not counting the final total row. */
  rowXps: number[];
  /** The row that is the weekly goal, or -1. It gets the green seal. */
  weeklyRow: number;
  crowns: number;
  total: number;
  /** A level up inside the same rank plays on the level bar. */
  levelUp: { from: number; to: number } | null;
  /** The bar before and after, in percent. A rank up starts from empty. */
  pctFrom: number;
  pctTo: number;
  level: number;
};

export type VictoryFx = {
  /** The XP rows that have slid in, counting the final total row last. */
  rowsShown: number;
  rolled: number;
  barPct: number;
  /** True for the frame the bar jumps back to empty after a level up. */
  barSnap: boolean;
  level: number;
  flash: boolean;
  /** Counts up each time the level number should pop. */
  popKey: number;
  /** Counts up when the total lands, so the big number can bump. */
  totalKey: number;
  seal: boolean;
};

/**
 * Plays Victory's parts in order (board 12): the music and the banner, the crowns
 * landing one by one, the XP lines sliding in with a coin each while the big total
 * rolls up, then the level bar filling. A level up inside the rank fills the bar to
 * the end, flashes white, pops the level number and plays the level-up music; several
 * levels at once are one level up. Under reduced motion everything starts at its end
 * state. Sounds follow the Sounds and Music settings.
 */
export function useVictoryFx(input: VictoryFxInput): VictoryFx {
  const cfg = useRef(input);
  cfg.current = input;
  const still = useRef(reducedMotion());
  const end = (): VictoryFx => ({
    rowsShown: input.rowXps.length + 1,
    rolled: input.total,
    barPct: input.pctTo,
    barSnap: false,
    level: input.levelUp ? input.levelUp.to : input.level,
    flash: false,
    popKey: 0,
    totalKey: 0,
    seal: true,
  });
  const [fx, setFx] = useState<VictoryFx>(() =>
    still.current
      ? end()
      : { rowsShown: 0, rolled: 0, barPct: input.pctFrom, barSnap: false, level: input.levelUp ? input.levelUp.from : input.level, flash: false, popKey: 0, totalKey: 0, seal: false }
  );
  const patch = (p: Partial<VictoryFx>) => setFx((f) => ({ ...f, ...p }));

  // Once everything has played, a later change (a renamed title, a late score) just shows the new numbers.
  const finished = useRef(still.current);
  useEffect(() => {
    if (finished.current) setFx((f) => ({ ...f, rolled: input.total, barPct: input.pctTo, rowsShown: input.rowXps.length + 1, level: input.levelUp ? input.levelUp.to : input.level }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [input.total, input.pctTo, input.rowXps.length, input.level, input.levelUp?.to]);

  useEffect(() => {
    const c = cfg.current;
    preload(['victory', 'level']);
    music('victory');
    buzz('heavy');
    if (still.current) {
      if (c.levelUp) music('level');
      return undefined;
    }

    const timers: ReturnType<typeof setTimeout>[] = [];
    const at = (ms: number, fn: () => void) => timers.push(setTimeout(fn, ms));
    const times = victoryTimes(c.crowns, c.rowXps.length + 1);
    const sums = runningTotals(c.rowXps, c.total);

    // The crowns drop in, a clink each and a little higher every time.
    times.crowns.forEach((t, i) =>
      at(t, () => {
        SYN.clink(1 + i * 0.07);
        buzz('light');
      })
    );

    // The XP lines slide in 300 ms apart; a coin each, and the big total rolls up to the sum so far.
    c.rowXps.forEach((xp, i) =>
      at(times.lines[i], () => {
        patch({ rowsShown: i + 1 });
        if (xp > 0) SYN.coin(1 + i * 0.08);
        buzz('light');
        if (i === c.weeklyRow) {
          play('goal');
          buzz('success');
          patch({ seal: true });
        }
        const from = i > 0 ? sums[i - 1] : 0;
        const to = sums[i];
        for (let k = 1; k <= 6; k++) {
          at(times.lines[i] + k * 20, () => {
            patch({ rolled: Math.round(from + ((to - from) * k) / 6) });
            if (to > from) SYN.roll(1 + to / 200);
          });
        }
      })
    );
    // The last row, "Added to your XP": the total lands and bumps.
    at(times.lines[c.rowXps.length], () => patch({ rowsShown: c.rowXps.length + 1, rolled: c.total, totalKey: 1 }));

    // The level bar fills over 900 ms, with rising ticks. A level up fills it to the end first.
    const target = c.levelUp ? 100 : c.pctTo;
    at(times.bar, () => {
      patch({ barPct: target });
      for (let i = 0; i < 18; i++) at(i * 30, () => SYN.roll(0.8 + i / 20));
    });
    if (c.levelUp) {
      const up = c.levelUp;
      at(times.barEnd, () => patch({ flash: true }));
      at(times.barEnd + VICTORY.levelHoldMs, () => {
        music('level');
        buzz('medium');
        setFx((f) => ({ ...f, level: up.to, popKey: f.popKey + 1, barSnap: true, barPct: 0 }));
      });
      at(times.barEnd + VICTORY.levelHoldMs + 60, () => patch({ barSnap: false, barPct: c.pctTo }));
      at(times.barEnd + 420, () => patch({ flash: false }));
      at(times.barEnd + VICTORY.levelHoldMs + 60 + VICTORY.barFillMs, () => {
        finished.current = true;
      });
    } else {
      at(times.barEnd, () => {
        finished.current = true;
      });
    }
    return () => timers.forEach(clearTimeout);
  }, []);

  return fx;
}
