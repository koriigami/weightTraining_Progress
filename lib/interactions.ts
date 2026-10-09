// The small rules behind the tap, set and Victory interactions (board 12). Pure,
// so the timing, the pitch and the order can be tested without a screen.

/** A run of picks: how many came before this one, and when the last one was. */
export type Streak = { n: number; at: number };

/**
 * The streak after one more pick. It continues while the picks come within
 * `windowMs` of each other, and starts again at 0 after a pause. The first pick
 * of a run is 0.
 */
export function stepStreak(prev: Streak | null, now: number, windowMs: number): Streak {
  if (prev && now - prev.at <= windowMs) return { n: prev.n + 1, at: now };
  return { n: 0, at: now };
}

/** Sets ticked in a row climb two semitones each. A rest between sets longer than this starts the climb again. */
export const SET_STREAK_MS = 180_000;
/** Chips picked in a row climb a step each. */
export const CHIP_STREAK_MS = 1500;

/** The pip pitch for the nth chip picked in a row. */
export const chipPitch = (n: number): number => 1 + Math.min(Math.max(n, 0), 8) * 0.12;

/** The stepper's tick follows the number it lands on. */
export const rollPitch = (v: number): number => 0.8 + (Math.abs(Math.round(v)) % 20) / 25;

/** Hold-to-repeat: a first pause, then steps that come faster the longer you hold. */
export const STEP_FIRST_MS = 420;
export const STEP_START_MS = 160;
export const STEP_MIN_MS = 50;
export const nextStepGap = (gap: number): number => Math.max(STEP_MIN_MS, gap * 0.82);

/** Toasts have no type, so a message that says something went wrong gets the error sound. */
export function isErrorToast(text: string): boolean {
  return /couldn'?t|could not|can'?t|cannot|failed|error|not saved|no connection|offline|try again|went wrong|invalid|not allowed/i.test(text);
}

// ---------- Victory ----------
export const VICTORY = { crownsAt: 200, crownGap: 180, lineGap: 300, linePause: 100, barPause: 250, barFillMs: 900, levelHoldMs: 140 } as const;

export type VictoryTimes = {
  /** When each crown lands. */
  crowns: number[];
  /** When each XP line slides in; the last one is the "Added to your XP" total. */
  lines: number[];
  /** When the level bar starts to fill. */
  bar: number;
  /** When the bar has filled to the end, which is when a level up flashes. */
  barEnd: number;
};

/**
 * When each part of Victory plays, in ms after it opens: the crowns land one by
 * one, then the XP lines slide in 300 ms apart, then the level bar fills.
 * `lines` counts every row, including the final total.
 */
export function victoryTimes(crowns: number, lines: number): VictoryTimes {
  const crownTimes = Array.from({ length: crowns }, (_, i) => VICTORY.crownsAt + i * VICTORY.crownGap);
  const start = (crowns > 0 ? crownTimes[crowns - 1] : VICTORY.crownsAt) + VICTORY.linePause + 200;
  const lineTimes = Array.from({ length: lines }, (_, i) => start + i * VICTORY.lineGap);
  const bar = (lines > 0 ? lineTimes[lines - 1] : start) + VICTORY.barPause + 200;
  return { crowns: crownTimes, lines: lineTimes, bar, barEnd: bar + VICTORY.barFillMs };
}

/** The running XP total after each line, so the big number rolls to the sum as lines land. Never past `total`. */
export function runningTotals(xps: number[], total: number): number[] {
  let sum = 0;
  return xps.map((x) => {
    sum += Math.max(0, x);
    return Math.min(sum, total);
  });
}
