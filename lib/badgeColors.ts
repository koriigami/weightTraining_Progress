// Badge colours as plain data, so the pure display helpers and their tests do
// not have to load a React component. components/Badge re-exports these.
import type { BadgeTier } from './progress';

export type BadgeMaterial = { rim: string[]; face: [string, string]; label: string };

export const TIERS: Record<BadgeTier | 'locked', BadgeMaterial> = {
  bronze: { rim: ['#E3A86B', '#8C5A2B'], face: ['#B87B45', '#5E3A1A'], label: 'Bronze' },
  silver: { rim: ['#F4F7FA', '#8E9AA6'], face: ['#B7C2CD', '#56616E'], label: 'Silver' },
  gold: { rim: ['#FFE27A', '#B8860B'], face: ['#E8B83A', '#7A5600'], label: 'Gold' },
  diamond: { rim: ['#9EF0FF', '#6A5CFF'], face: ['#5DB6F5', '#3423C9'], label: 'Diamond' },
  master: { rim: ['#FFB36B', '#C2410C'], face: ['#3A2A3F', '#120C18'], label: 'Master' },
  legend: { rim: ['#FF6B8A', '#FFD24A', '#5EE0A3', '#7CC0FF', '#B272F0'], face: ['#3A1F7A', '#120A33'], label: 'Legend' },
  locked: { rim: ['#B3B7C4', '#6C7080'], face: ['#8C90A0', '#4D5160'], label: 'Locked' },
};

// Keyed by the colorKey each monthly badge carries in lib/badges.ts.
export const MONTHLY_COLORS: Record<string, [string, string]> = {
  clear: ['#7FF0D6', '#0E8C73'],
  pushup: ['#FFC38A', '#D2530F'],
  cardio: ['#FF9DA8', '#C21F3C'],
  run: ['#FFB199', '#E0461F'],
  ride: ['#9FD8FF', '#1466C2'],
  goal: ['#FFE27A', '#B8860B'],
  weigh: ['#D6B8FF', '#6B2FC9'],
};

// The hexagon medal in the badge unlock moment and its tier ribbon: a light and
// a dark colour per tier, from board 05. The ribbon uses the dark one.
export const MEDAL_TIERS: Record<BadgeTier, [string, string]> = {
  bronze: ['#F0B383', '#8C4A1F'],
  silver: ['#EEF2F7', '#7D8796'],
  gold: ['#FFE58A', '#C78A00'],
  diamond: ['#B5F0FF', '#1F8FC4'],
  master: ['#DCC2FF', '#6D28D9'],
  legend: ['#FFB8C6', '#BE123C'],
};

const channel = (v: number): number => {
  const c = v / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
};

const parseHex = (hex: string): [number, number, number] => {
  const h = hex.replace('#', '');
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)) as [number, number, number];
};

/** WCAG contrast of white text on a solid colour, 1 to 21. */
export function contrastWithWhite(hex: string): number {
  const [r, g, b] = parseHex(hex);
  const lum = 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
  return 1.05 / (lum + 0.05);
}

/**
 * The colour itself when white text reads on it at 4.5:1, else the same hue
 * darkened until it does. The tier ribbon in the unlock moment writes white on it.
 */
export function ribbonBackground(hex: string, min = 4.5): string {
  let [r, g, b] = parseHex(hex);
  let out = hex;
  for (let i = 0; i < 30 && contrastWithWhite(out) < min; i++) {
    r = Math.round(r * 0.93);
    g = Math.round(g * 0.93);
    b = Math.round(b * 0.93);
    out = `#${[r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')}`;
  }
  return out;
}
