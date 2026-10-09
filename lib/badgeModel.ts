// What the 3D art draws for a badge or a chest. Pure: no three.js here, so the
// mapping and the picked options can be tested. components/art3d reads this.
//
// The options are the ones signed off on board 12 (see docs/V13_PLAN.md). The
// art module holds the look for each id; this file says which id is used.
import { MONTHLY_COLORS } from './badgeColors';
import type { PaletteKey } from './badgeColors';
import type { BadgeArt } from './badgeCards';
import type { BadgeShape } from './badges';

export type MedalTier = PaletteKey | 'locked';
export type ChestKey = 'bronze' | 'silver' | 'gold' | 'diamond' | 'master' | 'legend' | 'monthly' | 'royal' | 'pillow';

/**
 * The medal looks picked on board 12, as changes to the tier's palette: Gold
 * is the sunburst, Master is the violet flame. Legend's star-burst frame is
 * the only frame the art builds, so it needs no entry.
 */
export type MedalLook = { enamel?: string; enamelDeep?: string; icon?: string; rays?: boolean; crack?: string; rimColor?: string };
export const MEDAL_LOOKS: Partial<Record<MedalTier, MedalLook>> = {
  gold: { enamel: '#ffd34a', enamelDeep: '#b8790a', rays: true, icon: '#6b3f00' },
  master: { crack: '#b05cff', rimColor: '#1d1230', enamel: '#3a1a5c', enamelDeep: '#12061f', icon: '#e2c4ff' },
};

export type ChestBody = 'wood' | 'gold' | 'facet' | 'obsidian' | 'opal' | 'velvet' | 'pillow' | 'lacquer';
export type ChestDef = {
  /** Whose palette colours the glow from inside. */
  tier: PaletteKey;
  body: ChestBody;
  wood?: string;
  paint?: string;
  bodyColor?: string;
  crack?: string;
  /** The lid in a different material from the body (Monthly's two-tone). */
  lidBody?: 'lacquer';
  lidPaint?: string;
  strap: StrapKind;
  gem?: string | 'rainbow' | null;
  gemSize?: number;
  crown?: boolean;
  crownMetal?: StrapKind;
};
export type StrapKind = 'iron' | 'deepgold' | 'gold' | 'brightsilver' | 'frost' | 'darksilver' | 'antiquegold' | 'brass';

/**
 * The nine chests with the board 12 picks already applied: Silver slate wood
 * and polished silver, Diamond faceted, Master void, Legend opal, Monthly
 * two-tone, Royal antique gold with a ruby. Bronze, Gold and Pillow are as
 * first drawn.
 */
export const CHEST_DEFS: Record<ChestKey, ChestDef> = {
  bronze: { tier: 'bronze', body: 'wood', wood: '#a65e2c', strap: 'iron', gem: null },
  silver: { tier: 'silver', body: 'wood', wood: '#3c4a62', strap: 'brightsilver', gem: '#2f6dff' },
  gold: { tier: 'gold', body: 'gold', strap: 'deepgold', gem: '#ff2a3d' },
  diamond: { tier: 'diamond', body: 'facet', strap: 'frost', gem: '#e8fbff', gemSize: 0.18 },
  master: { tier: 'master', body: 'obsidian', bodyColor: '#1a0f2a', crack: '#b05cff', strap: 'darksilver', gem: '#c58bff' },
  legend: { tier: 'legend', body: 'opal', strap: 'gold', gem: 'rainbow' },
  monthly: { tier: 'silver', body: 'wood', wood: '#6a3a1c', lidBody: 'lacquer', lidPaint: '#ff5d73', strap: 'gold', gem: '#ffd54a' },
  royal: { tier: 'gold', body: 'velvet', paint: '#6d2fd6', strap: 'antiquegold', gem: '#e0103a', crown: true, crownMetal: 'antiquegold' },
  pillow: { tier: 'silver', body: 'pillow', paint: '#b9a6ff', strap: 'gold' },
};

/** Everything the medal builder needs. `colors` repaints the enamel (monthly badges keep their own colour). */
export type MedalModel = {
  tier: MedalTier;
  shape: BadgeShape;
  icon?: string;
  text?: string;
  month?: string;
  colors?: [string, string];
  look?: MedalLook;
};

/**
 * Card art to a medal. A locked badge is stone in its own shape and icon. A
 * monthly badge (it has a colour set) is a Monthly medal with its month tab
 * and its own colour. A special badge is the Special medal. The rest are
 * their tier.
 */
export function medalModel(art: BadgeArt, locked = false): MedalModel {
  const base = { shape: art.shape, icon: art.icon, text: art.text };
  if (locked) return { ...base, tier: 'locked', month: art.month };
  if (art.colorKey) {
    return { ...base, tier: 'monthly', month: art.month, colors: MONTHLY_COLORS[art.colorKey] };
  }
  if (art.special) return { ...base, tier: 'special', look: MEDAL_LOOKS.special };
  const tier = art.tier ?? 'bronze';
  return { ...base, tier, look: MEDAL_LOOKS[tier] };
}

/** A stable cache key for a rendered medal at a pixel size. */
export const medalKey = (m: MedalModel, px: number): string =>
  ['medal', m.tier, m.shape, m.icon ?? '', m.text ?? '', m.month ?? '', m.colors?.join('') ?? '', px].join('|');

/** The badge icons as stroke paths on a 24 unit grid, the same drawings as components/Badge. */
export const ICON_PATHS: Record<string, string[]> = {
  flame: ['M12 3c.5 3 4 4.6 4 9a4 4 0 0 1-8 0c0-2 .8-3.2 2-4.2.1 1.8 1 2.8 2 2.8 0-2.6-.8-4.8 0-7.6z'],
  dumbbell: ['M6.5 6.5v11M17.5 6.5v11M3.5 9.5v5M20.5 9.5v5M6.5 12h11'],
  timer: ['M12 6a7.5 7.5 0 1 0 0.01 0Z', 'M12 9.5v4l2.5 2M9.5 3h5'],
  run: ['M14.5 2.7a1.8 1.8 0 1 0 0.01 0Z', 'M8 20l3-6 3 2.5V21M6 11.5l3.5-3.5 4 2 3 3.5'],
  star: ['M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.8L12 16.8 6.8 19.6l1-5.8-4.3-4.1 5.9-.8z'],
  trophy: ['M8 4h8v5a4 4 0 0 1-8 0zM8 6H4.5a3 3 0 0 0 3.5 4M16 6h3.5a3 3 0 0 1-3.5 4M12 13v4M8.5 20h7M10 17h4'],
  crown: ['M4 18h16M5 18L3.5 8l5 3.5L12 5l3.5 6.5 5-3.5L19 18'],
  target: ['M12 3.5a8.5 8.5 0 1 0 0.01 0Z', 'M12 7.5a4.5 4.5 0 1 0 0.01 0Z'],
  chevrons: ['M6 13l6-6 6 6M6 19l6-6 6 6'],
  bike: ['M6 13a3.5 3.5 0 1 0 0.01 0Z', 'M18 13a3.5 3.5 0 1 0 0.01 0Z', 'M6 16.5l4-8h4.5l3.5 8M10 8.5l3 8M13 5.5h3'],
  week: ['M6 5h12a2.5 2.5 0 0 1 2.5 2.5v10a2.5 2.5 0 0 1-2.5 2.5H6a2.5 2.5 0 0 1-2.5-2.5v-10A2.5 2.5 0 0 1 6 5z', 'M3.5 10h17M8 3v4M16 3v4M7.5 14h9'],
  calcheck: ['M6 5h12a2.5 2.5 0 0 1 2.5 2.5v10a2.5 2.5 0 0 1-2.5 2.5H6a2.5 2.5 0 0 1-2.5-2.5v-10A2.5 2.5 0 0 1 6 5z', 'M3.5 10h17M8 3v4M16 3v4M9 15l2 2 4-4'],
  down: ['M3 6l6.5 6.5 4-4L21 16M21 10v6h-6'],
  scale: ['M6.5 4h11a3 3 0 0 1 3 3v10a3 3 0 0 1-3 3h-11a3 3 0 0 1-3-3V7a3 3 0 0 1 3-3z', 'M8 9a5 5 0 0 1 8 0M12 9.5l1.5-1.5'],
};
