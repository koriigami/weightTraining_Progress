import { describe, expect, it } from 'vitest';
import { LIFETIME_FAMILIES, MONTHLY_BADGES, SPECIAL_BADGES } from '../lib/badges';
import type { BadgeArt } from '../lib/badgeCards';
import { MONTHLY_COLORS } from '../lib/badgeColors';
import { CHEST_DEFS, ICON_PATHS, MEDAL_LOOKS, medalKey, medalModel } from '../lib/badgeModel';

const art = (over: Partial<BadgeArt>): BadgeArt => ({ shape: 'hex', icon: 'flame', label: 'x', ...over });

describe('medalModel', () => {
  it('uses the tier, shape and icon of a lifetime badge', () => {
    const m = medalModel(art({ shape: 'shield', tier: 'diamond', icon: 'trophy' }));
    expect(m).toMatchObject({ tier: 'diamond', shape: 'shield', icon: 'trophy' });
  });

  it('falls back to bronze when the card has no tier', () => {
    expect(medalModel(art({})).tier).toBe('bronze');
  });

  it('draws a locked badge as stone in its own shape and icon', () => {
    const m = medalModel(art({ shape: 'star', tier: 'gold', icon: 'run' }), true);
    expect(m).toMatchObject({ tier: 'locked', shape: 'star', icon: 'run' });
    expect(m.look).toBeUndefined();
  });

  it('draws a monthly badge as Monthly with its month tab, text and own colour', () => {
    const m = medalModel(art({ shape: 'circle', colorKey: 'run', text: '30', month: 'OCT 26' }));
    expect(m).toMatchObject({ tier: 'monthly', month: 'OCT 26', text: '30', colors: MONTHLY_COLORS.run });
  });

  it('draws a special badge as Special, whatever tier the card carries', () => {
    expect(medalModel(art({ shape: 'star', tier: 'gold', special: true })).tier).toBe('special');
  });

  it('maps every real badge to an icon the 3D art can draw', () => {
    const icons = [
      ...Object.values(LIFETIME_FAMILIES).map((f) => f.icon),
      ...Object.values(MONTHLY_BADGES).map((b) => b.icon),
      ...Object.values(SPECIAL_BADGES).map((b) => b.icon),
    ].filter(Boolean) as string[];
    for (const icon of icons) expect(ICON_PATHS[icon], icon).toBeDefined();
  });
});

describe('picked options', () => {
  it('Gold is the sunburst and Master the violet flame', () => {
    expect(MEDAL_LOOKS.gold?.rays).toBe(true);
    expect(MEDAL_LOOKS.master?.crack).toBe('#b05cff');
    expect(medalModel(art({ tier: 'gold' })).look).toBe(MEDAL_LOOKS.gold);
    expect(medalModel(art({ tier: 'master' })).look).toBe(MEDAL_LOOKS.master);
  });

  it('Bronze, Silver and Diamond keep the base look', () => {
    for (const tier of ['bronze', 'silver', 'diamond'] as const) expect(medalModel(art({ tier })).look).toBeUndefined();
  });

  it('chests carry the picked options', () => {
    expect(CHEST_DEFS.silver).toMatchObject({ wood: '#3c4a62', strap: 'brightsilver' });
    expect(CHEST_DEFS.diamond.body).toBe('facet');
    expect(CHEST_DEFS.master).toMatchObject({ bodyColor: '#1a0f2a', crack: '#b05cff' });
    expect(CHEST_DEFS.legend.body).toBe('opal');
    expect(CHEST_DEFS.monthly).toMatchObject({ body: 'wood', lidBody: 'lacquer' });
    expect(CHEST_DEFS.royal).toMatchObject({ strap: 'antiquegold', gem: '#e0103a', crown: true });
  });

  it('gives each medal picture its own cache key by look, month and size', () => {
    const a = medalModel(art({ tier: 'gold' }));
    expect(medalKey(a, 128)).not.toBe(medalKey(a, 192));
    expect(medalKey(a, 128)).not.toBe(medalKey(medalModel(art({ tier: 'gold' }), true), 128));
    expect(medalKey(a, 128)).toBe(medalKey(medalModel(art({ tier: 'gold' })), 128));
  });
});
