// How a workout felt: one of five faces, and an optional effort from 1 to 10.
// Neither earns XP. Pure, so the form, the API checks and the tests share it.
import { addDaysStr } from './date';
import type { Feel, WorkoutLog } from './routines';

export type { Feel };

// Rough to Great, in the order the faces sit in a row. The colour is a token from
// the top of globals.css, so one place holds every colour.
export const FEELS: readonly { key: Feel; label: string; colour: string }[] = [
  { key: 'rough', label: 'Rough', colour: 'var(--feel-rough)' },
  { key: 'tough', label: 'Tough', colour: 'var(--feel-tough)' },
  { key: 'ok', label: 'OK', colour: 'var(--feel-ok)' },
  { key: 'good', label: 'Good', colour: 'var(--feel-good)' },
  { key: 'great', label: 'Great', colour: 'var(--feel-great)' },
];

export const EFFORT_MIN = 1;
export const EFFORT_MAX = 10;
// The slider starts here when someone adds an effort.
export const EFFORT_START = 6;
// Profile counts the last 30 days, today included.
export const FEEL_DAYS = 30;

export function isFeel(v: unknown): v is Feel {
  return typeof v === 'string' && FEELS.some((f) => f.key === v);
}

// A whole number from 1 to 10. Decimals, strings and 0 are not an effort.
export function isEffort(v: unknown): v is number {
  return typeof v === 'number' && Number.isInteger(v) && v >= EFFORT_MIN && v <= EFFORT_MAX;
}

export function feelLabel(feel: Feel): string {
  return FEELS.find((f) => f.key === feel)?.label ?? '';
}

// "Felt good", for a screen reader or a tooltip.
export function feltPhrase(feel: Feel): string {
  return `Felt ${feel === 'ok' ? 'OK' : feelLabel(feel).toLowerCase()}`;
}

// 1 to 3 Easy, 4 to 6 Moderate, 7 and 8 Hard, 9 and 10 All out.
export function effortWord(n: number): string {
  return n <= 3 ? 'Easy' : n <= 6 ? 'Moderate' : n <= 8 ? 'Hard' : 'All out';
}

// The slider's readout: "6, Moderate".
export function effortReadout(n: number): string {
  return `${n}, ${effortWord(n)}`;
}

export type FeelSummary = {
  counts: Record<Feel, number>; // workouts per face
  faces: number; // workouts with a face
  effortAvg: number | null; // over the workouts with an effort only, one decimal. null when there are none
  effortCount: number; // workouts with an effort
  rated: number; // workouts with a face or an effort
};

// How the last 30 days felt: today and the 29 days before it. A workout with no
// rating is left out of every number, and the effort average only counts workouts
// that have an effort.
export function feelSummary(workouts: readonly WorkoutLog[], today: string): FeelSummary {
  const from = addDaysStr(today, 1 - FEEL_DAYS);
  const counts: Record<Feel, number> = { rough: 0, tough: 0, ok: 0, good: 0, great: 0 };
  let faces = 0;
  let rated = 0;
  let effortCount = 0;
  let effortSum = 0;
  for (const w of workouts) {
    if (w.date < from || w.date > today) continue;
    const face = isFeel(w.feel);
    const effort = isEffort(w.effort);
    if (face) {
      counts[w.feel as Feel] += 1;
      faces += 1;
    }
    if (effort) {
      effortCount += 1;
      effortSum += w.effort as number;
    }
    if (face || effort) rated += 1;
  }
  return { counts, faces, effortAvg: effortCount > 0 ? Math.round((effortSum / effortCount) * 10) / 10 : null, effortCount, rated };
}
