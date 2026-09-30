// The random sky of the share card. Pure.
//
// The clouds are the two stamps of the app's --cloud art, scattered by a seeded
// generator. The seed is the workout id and a roll number (`${id}#${roll}`), so a
// card always shows the same sky until the New sky dice adds one to the roll.
// Same algorithm and constants as the design board, so the skies match.

/** FNV-1a, 32 bit: a string as a seed number. */
export function hashSeed(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** A small seeded generator: the same seed gives the same numbers in [0, 1). */
export function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export type Rect = { x: number; y: number; w: number; h: number };

export type Cloud = {
  x: number; // centre
  y: number;
  s: number; // scale
  flip: boolean; // mirrored left to right
  stamp: 0 | 1;
  layer: 'far' | 'near';
  opacity: number;
  box: Rect; // where the cloud sits, for the overlap checks
};

// The two clouds of the --cloud art as ellipses [cx, cy, rx, ry], centred on 0,0.
export const CLOUD_STAMPS: { w: number; h: number; e: [number, number, number, number][] }[] = [
  { w: 176, h: 64, e: [[-36, 12, 52, 20], [4, -4, 40, 28], [44, 10, 44, 18]] },
  { w: 120, h: 37, e: [[-26, 5.5, 34, 13], [2, -2.5, 24, 16], [30, 5.5, 30, 12]] },
];

const overlap = (a: Rect, b: Rect): boolean => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

/**
 * Up to `count` clouds (default 16) for a width x height card, the same every time
 * for the same seed. Clouds may cross the edges, never overlap a keep-out rect
 * (the date, the "+N more" line) and never overlap another cloud of their layer.
 * The budget is `count * 60` tries, so a crowded or covered card ends with fewer
 * clouds instead of looping.
 */
export function skyClouds(seed: string, opts: { width: number; height: number; count?: number; keepOut?: Rect[] }): Cloud[] {
  const { width, height, count = 16, keepOut = [] } = opts;
  const r = mulberry32(hashSeed(seed));
  const out: Cloud[] = [];
  for (let tries = 0; out.length < count && tries < count * 60; tries++) {
    const layer = out.length < Math.round(count * 0.45) ? 'far' : 'near';
    const stamp = r() < 0.55 ? 0 : 1;
    const s = layer === 'far' ? 0.8 + r() * 0.6 : 1.3 + r() * 1.0;
    const w = CLOUD_STAMPS[stamp].w * s;
    const h = CLOUD_STAMPS[stamp].h * s;
    const x = -0.08 * width + r() * 1.16 * width;
    const y = 0.02 * height + r() * 0.96 * height;
    const box = { x: x - w / 2, y: y - h / 2, w, h };
    if (keepOut.some((k) => overlap(box, k))) continue;
    // Same layer clouds may touch at the puffy ends, so only the middle 70% counts.
    if (out.some((o) => o.layer === layer && overlap({ x: box.x + w * 0.15, y: box.y, w: w * 0.7, h }, o.box))) continue;
    const flip = r() < 0.5;
    const opacity = layer === 'far' ? 0.2 + r() * 0.12 : 0.42 + r() * 0.26;
    out.push({ x, y, s, flip, stamp, layer, opacity, box });
  }
  return out;
}
