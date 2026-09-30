import type { Rect } from '@/lib/sky';

// The share card's colours and fonts as literals. The card is an SVG turned into
// an image, which cannot read CSS variables, so these copy the globals.css tokens
// (tests/shareCardSvg.test.ts checks that they have not drifted).
export const CARD = {
  skyTop: '#4aa8f5',
  skyMid: '#2f8fe8',
  skyBottom: '#1d5fbf',
  frame: '#f5c542',
  stroke: '#0e3a7a', // the navy outline and drop of the game text
  xp: '#fff28f',
  cream: '#fff8e8', // --surface, the plaques
  ink: '#2e1f0c',
  muted: '#795f3f',
  bevel: '#d7ba7c', // the plaque's lower edge
  okSoft: '#ddf5d2', // --ok-soft, the muscle chips
  hi: '#27a844', // main muscles
  sec: '#a9de8f', // "also works" muscles
  muscle: '#eadcba', // the rest
  skin: '#f5ead1',
  bodyline: '#fffdf6',
} as const;

// 'Levl Display' (Lilita One) and 'Levl Body' (Figtree) are the @font-face names in globals.css.
export const FONT_DISPLAY = "'Levl Display', 'Arial Rounded MT Bold', 'Trebuchet MS', sans-serif";
export const FONT_BODY = "'Levl Body', system-ui, -apple-system, 'Segoe UI', sans-serif";

export const CARD_W = 1080;
export const CARD_H = 1350;

// Where the date is drawn: no cloud may sit behind it, or the white text is lost.
export const DATE_KEEP_OUT: Rect = { x: 560, y: 56, w: 470, h: 70 };
