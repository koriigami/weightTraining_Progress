// Badge colours as plain data, so the pure display helpers and their tests do
// not have to load a React component. components/Badge re-exports these.
import type { BadgeTier } from './progress';

export type BadgeMaterial = { rim: string[]; face: [string, string]; label: string };

/** Every tier a medal or a chest can have: the six ranks plus the themed ones. */
export type PaletteKey = BadgeTier | 'monthly' | 'special' | 'secret';

export type TierColors = {
  label: string;
  chest: string; // the chest's name, "Wooden" for bronze
  taps: 1 | 2 | 3;
  metal: string; // rim and lid metal, the light colour
  metalDeep: string;
  enamel: string; // face and body, the main colour
  enamelDeep: string;
  glow: string; // light behind the medal and out of the chest
  color: string; // text and ribbon colour on a light page
};

// The one palette. Values are the PALETTE in docs/design/12-motion/art3d.js and
// the TIER_UI in docs/design/12-motion/stage.js. The 3D art reads it as is.
export const TIER_PALETTE: Record<PaletteKey, TierColors> = {
  bronze: { label: 'Bronze', chest: 'Wooden', taps: 1, metal: '#c27a43', metalDeep: '#7a4220', enamel: '#d9772f', enamelDeep: '#7a3410', glow: '#ffb469', color: '#a4521f' },
  silver: { label: 'Silver', chest: 'Silver', taps: 1, metal: '#e4ebf2', metalDeep: '#7d8a99', enamel: '#5f7fa8', enamelDeep: '#243b5e', glow: '#cfe7ff', color: '#5f7086' },
  gold: { label: 'Gold', chest: 'Golden', taps: 2, metal: '#ffcf4a', metalDeep: '#b07a0c', enamel: '#e0262f', enamelDeep: '#6e0b14', glow: '#ffe27a', color: '#b8790a' },
  diamond: { label: 'Diamond', chest: 'Crystal', taps: 2, metal: '#eaf6ff', metalDeep: '#7fa9c9', enamel: '#3fb5ff', enamelDeep: '#1a3fb8', glow: '#9ef0ff', color: '#1f7fc4' },
  master: { label: 'Master', chest: 'Obsidian', taps: 3, metal: '#3a2c38', metalDeep: '#120b12', enamel: '#2a1630', enamelDeep: '#0b0510', glow: '#ff8a2a', color: '#b4410f' },
  legend: { label: 'Legend', chest: 'Prismatic', taps: 3, metal: '#fff4fb', metalDeep: '#c7b2ff', enamel: '#3b1f8f', enamelDeep: '#10063a', glow: '#ffd0f4', color: '#6d3fd6' },
  monthly: { label: 'Monthly', chest: 'Monthly', taps: 1, metal: '#f6f2ea', metalDeep: '#b8a888', enamel: '#16b896', enamelDeep: '#0b5e4c', glow: '#ffc4cc', color: '#0e8c73' },
  special: { label: 'Special', chest: 'Royal', taps: 2, metal: '#ffc93a', metalDeep: '#9a5d00', enamel: '#7a3fe0', enamelDeep: '#2e0f6b', glow: '#e2d4ff', color: '#6d2fd6' },
  secret: { label: 'Secret', chest: 'Pillow', taps: 1, metal: '#f3ecff', metalDeep: '#9a86d6', enamel: '#9b7bff', enamelDeep: '#3b1f8f', glow: '#efe6ff', color: '#6b4fd6' },
};

/** A locked badge: stone, from the board's `locked` entry. */
export const LOCKED_COLORS = { metal: '#b9b2a6', enamel: '#9a9285', enamelDeep: '#5e574b', icon: '#ece6da', glow: '#ffffff' };

// The flat vector medal (components/Badge) reads these until the 3D art replaces
// it, so they come from the palette too. Legend keeps its rainbow rim.
const material = (k: PaletteKey): BadgeMaterial => ({ rim: [TIER_PALETTE[k].metal, TIER_PALETTE[k].metalDeep], face: [TIER_PALETTE[k].enamel, TIER_PALETTE[k].enamelDeep], label: TIER_PALETTE[k].label });

export const TIERS: Record<BadgeTier | 'locked', BadgeMaterial> = {
  bronze: material('bronze'),
  silver: material('silver'),
  gold: material('gold'),
  diamond: material('diamond'),
  master: material('master'),
  legend: { ...material('legend'), rim: ['#FF6B8A', '#FFD24A', '#5EE0A3', '#7CC0FF', '#B272F0'] },
  locked: { rim: [LOCKED_COLORS.metal, '#6C7080'], face: [LOCKED_COLORS.enamel, LOCKED_COLORS.enamelDeep], label: 'Locked' },
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
// a dark colour per tier. The ribbon uses the dark one.
export const MEDAL_TIERS: Record<BadgeTier, [string, string]> = {
  bronze: [TIER_PALETTE.bronze.metal, TIER_PALETTE.bronze.color],
  silver: [TIER_PALETTE.silver.metal, TIER_PALETTE.silver.color],
  gold: [TIER_PALETTE.gold.metal, TIER_PALETTE.gold.color],
  diamond: [TIER_PALETTE.diamond.metal, TIER_PALETTE.diamond.color],
  master: [TIER_PALETTE.master.glow, TIER_PALETTE.master.color],
  legend: [TIER_PALETTE.legend.glow, TIER_PALETTE.legend.color],
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
