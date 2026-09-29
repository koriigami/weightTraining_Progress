import { describe, expect, it } from 'vitest';
import { displayValue, fillOnTick, liveHeader, liveValue, parseTyped, patchFor, setColumns } from '../lib/setColumns';

const kg = { weight: 'kg' as const, distance: 'km' as const };
const imperial = { weight: 'lb' as const, distance: 'mi' as const };

describe('columns by kind of exercise', () => {
  it('has the columns the design shows', () => {
    expect(setColumns('weight_reps', kg).map((c) => c.label)).toEqual(['Kg', 'Reps']);
    expect(setColumns('weight_reps', imperial).map((c) => c.label)).toEqual(['Lbs', 'Reps']);
    expect(setColumns('reps', kg).map((c) => c.label)).toEqual(['Reps']);
    expect(setColumns('time', kg).map((c) => c.label)).toEqual(['Seconds']);
    expect(setColumns('distance_time', kg).map((c) => c.label)).toEqual(['Min', 'Km']);
    expect(setColumns('distance_time', imperial).map((c) => c.label)).toEqual(['Min', 'Mi']);
    expect(setColumns('intervals', kg).map((c) => c.label)).toEqual(['Work min', 'Easy min']);
  });

  it('the last column is previous, pace or round', () => {
    expect(liveHeader('weight_reps')).toBe('Previous');
    expect(liveHeader('reps')).toBe('Previous');
    expect(liveHeader('distance_time')).toBe('Pace');
    expect(liveHeader('intervals')).toBe('Round');
  });
});

describe('what a box shows and stores', () => {
  const [kgCol, repsCol] = setColumns('weight_reps', imperial);
  const [minCol, kmCol] = setColumns('distance_time', imperial);

  it('shows stored kg in the user\'s unit and blanks for nothing', () => {
    expect(displayValue(kgCol, { kg: 5 }, imperial)).toBe('11');
    expect(displayValue(kgCol, { kg: 5 }, kg)).toBe('5');
    expect(displayValue(kgCol, {}, kg)).toBe('');
    expect(displayValue(repsCol, { reps: 10 }, imperial)).toBe('10');
    expect(displayValue(kmCol, { km: 5 }, imperial)).toBe('3.11');
    expect(displayValue(minCol, { min: 30.5 }, imperial)).toBe('30.5');
  });

  it('stores what was typed as kg and km', () => {
    expect(patchFor(kgCol, 135, imperial)).toEqual({ kg: 61.235 });
    expect(patchFor(kgCol, 7.5, kg)).toEqual({ kg: 7.5 });
    expect(patchFor(kmCol, 3.1, imperial)).toEqual({ km: 4.989 });
    expect(patchFor(repsCol, 9.6, kg)).toEqual({ reps: 10 });
    expect(patchFor(minCol, 2.5, kg)).toEqual({ min: 2.5 });
    expect(patchFor(kgCol, undefined, kg)).toEqual({ kg: undefined });
  });

  it('parses typed text', () => {
    expect(parseTyped('')).toBeUndefined();
    expect(parseTyped('  ')).toBeUndefined();
    expect(parseTyped('7.5')).toBe(7.5);
    expect(parseTyped('7,5')).toBe(7.5);
    expect(parseTyped('10')).toBe(10);
    expect(parseTyped('7.')).toBe(7);
    expect(parseTyped('.5')).toBe(0.5);
    expect(parseTyped('.')).toBeNull();
    expect(parseTyped('abc')).toBeNull();
    expect(parseTyped('-3')).toBeNull();
    expect(parseTyped('1e3')).toBeNull();
  });
});

describe('the live column', () => {
  it('shows a pace for distance cardio as the numbers change', () => {
    expect(liveValue('distance_time', { min: 30, km: 5 }, 'New', kg)).toBe('6:00 /km');
    expect(liveValue('distance_time', { min: 30 }, 'New', kg)).toBe('');
    expect(liveValue('distance_time', { min: 30, km: 5 }, 'New', imperial)).toBe('9:39 /mi');
  });

  it('shows the length of a round for intervals', () => {
    expect(liveValue('intervals', { on: 1, off: 1.5 }, 'New', kg)).toBe('2.5 min');
    expect(liveValue('intervals', {}, 'New', kg)).toBe('');
  });

  it('shows the previous best for strength', () => {
    expect(liveValue('weight_reps', { kg: 5 }, '5 kg × 12', kg)).toBe('5 kg × 12');
  });
});

describe('ticking a set with empty boxes', () => {
  it('fills a missing weight with 0 and missing reps with the previous best or 10', () => {
    expect(fillOnTick('weight_reps', {}, null)).toEqual({ kg: 0, reps: 10 });
    expect(fillOnTick('weight_reps', { kg: 5 }, { kg: 5, reps: 12 })).toEqual({ reps: 12 });
    expect(fillOnTick('weight_reps', { reps: 8 }, null)).toEqual({ kg: 0 });
    expect(fillOnTick('reps', {}, { reps: 14 })).toEqual({ reps: 14 });
    expect(fillOnTick('reps', {}, null)).toEqual({ reps: 10 });
  });

  it('leaves a full set, and other kinds of exercise, alone', () => {
    expect(fillOnTick('weight_reps', { kg: 5, reps: 10 }, null)).toBeNull();
    expect(fillOnTick('reps', { reps: 10 }, null)).toBeNull();
    expect(fillOnTick('time', {}, null)).toBeNull();
    expect(fillOnTick('distance_time', {}, null)).toBeNull();
    expect(fillOnTick('intervals', {}, null)).toBeNull();
  });

  it('keeps a typed 0 reps as it is', () => {
    expect(fillOnTick('reps', { reps: 0 }, null)).toBeNull();
  });
});
