import { describe, expect, it } from 'vitest';
import { distanceLabel, fmtDistance, fmtNumber, fmtVolume, fmtWeight, kgToUnit, kmToUnit, unitToKg, unitToKm, weightLabel } from '../lib/units';

describe('units', () => {
  it('kg is shown as it is', () => {
    expect(kgToUnit(7.5, 'kg')).toBe(7.5);
    expect(fmtWeight(7.5, 'kg')).toBe('7.5 kg');
    expect(weightLabel('kg')).toBe('Kg');
  });

  it('shows pounds with one decimal', () => {
    expect(kgToUnit(5, 'lb')).toBe(11);
    expect(kgToUnit(20, 'lb')).toBe(44.1);
    expect(fmtWeight(5, 'lb')).toBe('11 lb');
    expect(weightLabel('lb')).toBe('Lbs');
  });

  it('a typed pound value survives the round trip through kg', () => {
    for (const lb of [5, 11, 25, 45, 135, 225, 12.5, 2.5]) {
      expect(kgToUnit(unitToKg(lb, 'lb'), 'lb')).toBe(lb);
    }
  });

  it('a typed mile value survives the round trip through km', () => {
    for (const mi of [0.5, 1, 3.1, 6.2, 13.1, 26.2]) {
      expect(kmToUnit(unitToKm(mi, 'mi'), 'mi')).toBe(mi);
    }
    expect(fmtDistance(5, 'mi')).toBe('3.11 mi');
    expect(fmtDistance(5, 'km')).toBe('5 km');
    expect(distanceLabel('mi')).toBe('Mi');
  });

  it('formats numbers without trailing zeros', () => {
    expect(fmtNumber(5)).toBe('5');
    expect(fmtNumber(2.50)).toBe('2.5');
    expect(fmtNumber(1.256)).toBe('1.26');
  });

  it('formats a small volume in whole units with separators', () => {
    expect(fmtVolume(850.4, 'kg')).toBe('850 kg');
    expect(fmtVolume(400, 'lb')).toBe('882 lb');
    expect(fmtVolume(999, 'lb')).toBe('2,202 lb');
    expect(fmtVolume(0, 'kg')).toBe('0 kg');
  });

  it('writes a big volume in tonnes, with one decimal and no trailing zero', () => {
    expect(fmtVolume(5700, 'kg')).toBe('5.7 t');
    expect(fmtVolume(1000, 'kg')).toBe('1 t');
    expect(fmtVolume(1240.4, 'kg')).toBe('1.2 t');
    expect(fmtVolume(10000, 'kg')).toBe('10 t');
    expect(fmtVolume(123456, 'kg')).toBe('123.5 t');
  });

  it('a pounds person sees the same weight as thousands of pounds, switching at the same point', () => {
    expect(fmtVolume(5700, 'lb')).toBe('12.6k lb');
    expect(fmtVolume(1000, 'lb')).toBe('2.2k lb');
    expect(fmtVolume(10000, 'lb')).toBe('22k lb');
    // Just under and at 1,000 kg lifted, in both units.
    expect(fmtVolume(999.4, 'kg')).toBe('999 kg');
    expect(fmtVolume(999.4, 'lb')).toBe('2,203 lb');
    expect(fmtVolume(1000, 'kg')).toBe('1 t');
    expect(fmtVolume(1000, 'lb')).toMatch(/k lb$/);
  });
});
