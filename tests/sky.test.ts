import { describe, expect, it } from 'vitest';
import { CLOUD_STAMPS, hashSeed, mulberry32, skyClouds } from '../lib/sky';
import type { Rect } from '../lib/sky';

const W = 1080;
const H = 1350;
const DATE: Rect = { x: 560, y: 56, w: 470, h: 70 };
const MORE: Rect = { x: 130, y: 1090, w: 400, h: 60 };

const overlap = (a: Rect, b: Rect) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

describe('seeds', () => {
  it('hashes a string to a fixed 32 bit number', () => {
    expect(hashSeed('w-full#0')).toBe(2521956723);
    expect(hashSeed('')).toBe(0x811c9dc5); // the FNV offset basis
    expect(hashSeed('w-full#1')).not.toBe(hashSeed('w-full#0'));
  });

  it('gives the same numbers for the same seed, all in [0, 1)', () => {
    const r = mulberry32(hashSeed('w-full#0'));
    expect([r(), r(), r()]).toEqual([0.7192230611108243, 0.17241502995602787, 0.8015260042157024]);
    const again = mulberry32(hashSeed('w-full#0'));
    expect(again()).toBe(0.7192230611108243);
    const many = mulberry32(7);
    for (let i = 0; i < 1000; i++) {
      const v = many();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});

describe('sky clouds', () => {
  const sky = (seed: string, over: Partial<Parameters<typeof skyClouds>[1]> = {}) => skyClouds(seed, { width: W, height: H, keepOut: [DATE, MORE], ...over });

  it('is the same sky for the same seed', () => {
    expect(sky('w-full#0')).toEqual(sky('w-full#0'));
  });

  it('is another sky for another roll or another workout', () => {
    expect(sky('w-full#1')).not.toEqual(sky('w-full#0'));
    expect(sky('w-run#0')).not.toEqual(sky('w-full#0'));
  });

  it('matches the design board sky for the same seed', () => {
    // Numbers taken from the board's skyClouds (docs/design/share-card/card-reference.js).
    const clouds = skyClouds('w-full#0', { width: W, height: H, keepOut: [{ x: 560, y: 56, w: 470, h: 70 }] });
    expect(clouds).toHaveLength(16);
    expect(clouds[0]).toMatchObject({ stamp: 1, layer: 'far', flip: false });
    expect(clouds[0].x).toBeCloseTo(917.7517780814319, 9);
    expect(clouds[0].y).toBeCloseTo(317.0099203325808, 9);
    expect(clouds[0].s).toBeCloseTo(0.9034490179736168, 9);
    expect(clouds[0].opacity).toBeCloseTo(0.31364665323868396, 9);
    expect(clouds[15]).toMatchObject({ stamp: 1, layer: 'near', flip: false });
    expect(clouds[15].x).toBeCloseTo(1000.3373131144791, 9);
    expect(clouds[15].y).toBeCloseTo(891.0877126604319, 9);
  });

  it('fills the count on an open card: the first 45% far, the rest near', () => {
    const clouds = skyClouds('w-full#0', { width: W, height: H });
    expect(clouds).toHaveLength(16);
    expect(clouds.map((c) => c.layer)).toEqual([...Array(7).fill('far'), ...Array(9).fill('near')]);
    expect(skyClouds('w-full#0', { width: W, height: H, count: 22 })).toHaveLength(22);
    expect(skyClouds('w-full#0', { width: W, height: H, count: 0 })).toEqual([]);
  });

  it('keeps every cloud centre inside -10%..110% of the width and 0..100% of the height', () => {
    for (let roll = 0; roll < 30; roll++) {
      for (const c of sky(`w-full#${roll}`)) {
        expect(c.x).toBeGreaterThanOrEqual(-0.1 * W);
        expect(c.x).toBeLessThanOrEqual(1.1 * W);
        expect(c.y).toBeGreaterThanOrEqual(0);
        expect(c.y).toBeLessThanOrEqual(H);
      }
    }
  });

  it('uses the two stamps at the scales of their layer, with the box of the scaled stamp', () => {
    for (const c of sky('w-full#3')) {
      const stamp = CLOUD_STAMPS[c.stamp];
      expect(c.box.w).toBeCloseTo(stamp.w * c.s, 9);
      expect(c.box.h).toBeCloseTo(stamp.h * c.s, 9);
      expect(c.box.x + c.box.w / 2).toBeCloseTo(c.x, 9);
      expect(c.box.y + c.box.h / 2).toBeCloseTo(c.y, 9);
      if (c.layer === 'far') {
        expect(c.s).toBeGreaterThanOrEqual(0.8);
        expect(c.s).toBeLessThan(1.4);
        expect(c.opacity).toBeGreaterThanOrEqual(0.2);
        expect(c.opacity).toBeLessThan(0.32);
      } else {
        expect(c.s).toBeGreaterThanOrEqual(1.3);
        expect(c.s).toBeLessThan(2.3);
        expect(c.opacity).toBeGreaterThanOrEqual(0.42);
        expect(c.opacity).toBeLessThan(0.68);
      }
    }
  });

  it('never overlaps a keep-out rect', () => {
    for (let roll = 0; roll < 30; roll++) {
      for (const c of sky(`w-long#${roll}`)) {
        expect(overlap(c.box, DATE)).toBe(false);
        expect(overlap(c.box, MORE)).toBe(false);
      }
    }
  });

  it('never overlaps a cloud of the same layer in the middle 70% of its width', () => {
    const clouds = sky('w-full#5');
    for (const a of clouds) {
      for (const b of clouds) {
        if (a === b || a.layer !== b.layer) continue;
        const core = { x: a.box.x + a.box.w * 0.15, y: a.box.y, w: a.box.w * 0.7, h: a.box.h };
        // The later cloud was checked against the earlier one, so test in that direction.
        if (clouds.indexOf(b) < clouds.indexOf(a)) expect(overlap(core, b.box)).toBe(false);
      }
    }
  });

  it('never makes more clouds than asked for', () => {
    for (const count of [1, 5, 16, 22, 40]) {
      expect(skyClouds('w-full#0', { width: W, height: H, count }).length).toBeLessThanOrEqual(count);
    }
  });

  it('ends with fewer clouds, not a loop, when the card is crowded', () => {
    const crowded = skyClouds('w-full#0', { width: 300, height: 200, count: 200 });
    expect(crowded.length).toBeGreaterThan(0);
    expect(crowded.length).toBeLessThan(200);
  });

  it('returns no clouds, and quickly, when a keep-out covers the whole card', () => {
    const t = Date.now();
    expect(skyClouds('w-full#0', { width: W, height: H, keepOut: [{ x: -500, y: -500, w: 2000, h: 2500 }] })).toEqual([]);
    expect(Date.now() - t).toBeLessThan(250);
  });
});
