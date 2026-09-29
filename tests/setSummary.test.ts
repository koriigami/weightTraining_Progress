import { describe, expect, it } from 'vitest';
import { fmtSetSummary } from '../lib/setSummary';

describe('fmtSetSummary', () => {
  it('reads a set for each kind of exercise', () => {
    expect(fmtSetSummary('weight_reps', { kg: 5, reps: 10 })).toBe('5 kg × 10');
    expect(fmtSetSummary('reps', { reps: 12 })).toBe('12 reps');
    expect(fmtSetSummary('reps', {})).toBe('Max reps');
    expect(fmtSetSummary('time', { sec: 40 })).toBe('40s');
    expect(fmtSetSummary('intervals', { on: 1, off: 1.5 })).toBe('1 min on, 1.5 min off');
    expect(fmtSetSummary('distance_time', { min: 30, km: 5 })).toBe('30 min, 5 km, 6:00 /km');
    expect(fmtSetSummary('distance_time', { min: 20 })).toBe('20 min');
  });

  it('follows the user\'s units', () => {
    const imperial = { weight: 'lb' as const, distance: 'mi' as const };
    expect(fmtSetSummary('weight_reps', { kg: 5, reps: 10 }, imperial)).toBe('11 lb × 10');
    expect(fmtSetSummary('distance_time', { min: 30, km: 5 }, imperial)).toBe('30 min, 3.11 mi, 9:39 /mi');
  });

  it('still takes a bare distance unit', () => {
    expect(fmtSetSummary('distance_time', { min: 30, km: 5 }, 'mi')).toBe('30 min, 3.11 mi, 9:39 /mi');
  });
});
