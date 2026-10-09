import { describe, expect, it } from 'vitest';
import {
  CHIP_STREAK_MS,
  SET_STREAK_MS,
  STEP_MIN_MS,
  STEP_START_MS,
  VICTORY,
  chipPitch,
  isErrorToast,
  nextStepGap,
  rollPitch,
  runningTotals,
  stepStreak,
  victoryTimes,
} from '../lib/interactions';

describe('streaks', () => {
  it('the first pick of a run is 0 and each pick inside the window adds one', () => {
    const a = stepStreak(null, 1000, SET_STREAK_MS);
    const b = stepStreak(a, 1000 + 60_000, SET_STREAK_MS);
    const c = stepStreak(b, 1000 + 120_000, SET_STREAK_MS);
    expect([a.n, b.n, c.n]).toEqual([0, 1, 2]);
  });

  it('a pause longer than the window starts the climb again', () => {
    const a = stepStreak({ n: 5, at: 0 }, 0 + CHIP_STREAK_MS + 1, CHIP_STREAK_MS);
    expect(a.n).toBe(0);
  });
});

describe('pitch and repeat', () => {
  it('chips climb a step each and stop at eight', () => {
    expect(chipPitch(0)).toBe(1);
    expect(chipPitch(3)).toBeGreaterThan(chipPitch(2));
    expect(chipPitch(40)).toBe(chipPitch(8));
  });

  it('the stepper tick follows the number it lands on', () => {
    expect(rollPitch(60)).not.toBe(rollPitch(65));
    expect(rollPitch(-5)).toBe(rollPitch(5));
  });

  it('a held stepper button gets faster and never faster than 50 ms', () => {
    let gap = STEP_START_MS;
    for (let i = 0; i < 40; i++) {
      const next = nextStepGap(gap);
      expect(next).toBeLessThanOrEqual(gap);
      gap = next;
    }
    expect(gap).toBe(STEP_MIN_MS);
  });
});

describe('toasts', () => {
  it('a message that says something went wrong gets the error sound', () => {
    expect(isErrorToast("Couldn't save. Check your connection.")).toBe(true);
    expect(isErrorToast("Couldn't make the picture. Try again.")).toBe(true);
  });

  it('good news and notes do not', () => {
    expect(isErrorToast('Workout saved')).toBe(false);
    expect(isErrorToast('Tick at least one set first.')).toBe(false);
  });
});

describe('Victory timeline', () => {
  it('crowns land 180 ms apart', () => {
    const t = victoryTimes(4, 3);
    expect(t.crowns.map((x, i) => (i ? x - t.crowns[i - 1] : VICTORY.crownGap))).toEqual([180, 180, 180, 180]);
  });

  it('the XP lines start after the last crown and come 300 ms apart', () => {
    const t = victoryTimes(3, 4);
    expect(t.lines[0]).toBeGreaterThan(t.crowns[2]);
    expect(t.lines[3] - t.lines[2]).toBe(VICTORY.lineGap);
  });

  it('the level bar fills after the last line, over 900 ms', () => {
    const t = victoryTimes(2, 5);
    expect(t.bar).toBeGreaterThan(t.lines[4]);
    expect(t.barEnd - t.bar).toBe(900);
  });

  it('a workout with no crowns still has a timeline', () => {
    const t = victoryTimes(0, 1);
    expect(t.crowns).toEqual([]);
    expect(t.lines[0]).toBeGreaterThan(0);
  });

  it('the rolling total adds up line by line and never passes the total', () => {
    expect(runningTotals([60, 10, 25], 95)).toEqual([60, 70, 95]);
    expect(runningTotals([60, 60], 100)).toEqual([60, 100]);
  });
});
