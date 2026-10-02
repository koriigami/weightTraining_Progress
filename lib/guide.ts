// The first-run guide: its words, where its ring and step card go, and when
// Home may show it or What's new. Pure logic and data, no React and no browser
// access. The tour itself is components/guide/GuideTour.tsx.

export type GuideWords = { title: string; text: string };

export type GuideStep = {
  id: string;
  // The `data-guide` name of the element the ring wraps.
  target: string;
  // More `data-guide` names one ring covers together with the target, on a computer.
  alsoOnDesktop?: string[];
  phone: GuideWords;
  desktop: GuideWords;
};

const same = (title: string, text: string): { phone: GuideWords; desktop: GuideWords } => ({ phone: { title, text }, desktop: { title, text } });

// The seven spotlight steps, in order. Where phone and computer say different things
// (the Workout button, the tabs and the sidebar), both are here.
export const GUIDE_STEPS: GuideStep[] = [
  { id: 'level', target: 'level', ...same('Your level', 'Every bit of XP fills this bar. Level up to climb from rank E to S.') },
  { id: 'today', target: 'today', ...same('Today', 'Your next routine waits here. Trained without the app? Log workout adds it afterwards.') },
  {
    id: 'workout',
    target: 'workout',
    phone: { title: 'Start a workout', text: 'Tap Workout to start a routine, a run or a custom workout. Tick each set as you go.' },
    desktop: { title: 'Start a workout', text: 'Start a routine, a run or a custom workout. Tick each set as you go.' },
  },
  {
    id: 'week',
    target: 'week',
    ...same('Your week', 'A day counts once you train for 20 minutes. Reach your weekly goal for a bonus that grows each week in a row.'),
  },
  {
    id: 'routines',
    target: 'routines',
    alsoOnDesktop: ['exercises'],
    phone: { title: 'Routines', text: 'Save the workouts you repeat, or pick a ready-made one. Every exercise is here too.' },
    desktop: { title: 'Routines and Exercises', text: 'Save the workouts you repeat, pick a ready-made one, or browse every exercise.' },
  },
  { id: 'rank', target: 'rank', ...same('Rank', 'The Rank Road shows every level and rank ahead, and the badges you can earn.') },
  {
    id: 'profile',
    target: 'profile',
    phone: { title: 'Profile', text: 'Your stats, goals, weight and calendar. Settings is in here too.' },
    desktop: { title: 'Profile', text: 'Your stats, goals, weight and calendar. Settings is in your account menu, bottom left.' },
  },
];

// The card before the steps, in the game modal look.
export const GUIDE_WELCOME = {
  ribbon: 'Welcome to Levl',
  text: 'Levl turns your training into a game. Every set earns XP, and XP takes you from rank E to rank S.',
  skip: 'Skip',
  start: 'Show me around',
};

// The card after the steps. The numbers are the rules in lib/workoutScoring.ts and
// docs/design/xp-reference.html: change them together.
export const GUIDE_XP = {
  ribbon: 'How XP works',
  text: 'XP comes from showing up, never from how heavy you lift.',
  rows: [
    { label: 'Each set you tick', value: '+5' },
    { label: 'Each minute of cardio', value: '+1' },
    { label: 'Beat last time, or a record', value: '+10 or +25' },
    { label: 'A day with 20 minutes of training', value: '+50' },
    { label: 'Your weekly goal, growing each week in a row', value: '+50 to +100' },
  ],
  button: 'Start training',
  foot: 'You can play this guide again from Settings.',
};

// ---------------- The ring ----------------

export type Box = { x: number; y: number; width: number; height: number };
export type Ring = Box & { radius: number };

// Splits a box-shadow list at the commas that are not inside rgb() or rgba().
function shadowLayers(boxShadow: string): string[] {
  const layers: string[] = [];
  let depth = 0;
  let from = 0;
  for (let i = 0; i < boxShadow.length; i++) {
    const c = boxShadow[i];
    if (c === '(') depth++;
    else if (c === ')') depth = Math.max(0, depth - 1);
    else if (c === ',' && depth === 0) {
      layers.push(boxShadow.slice(from, i));
      from = i + 1;
    }
  }
  layers.push(boxShadow.slice(from));
  return layers;
}

// How far the element's bevel hangs below it, read from its computed box-shadow:
// the deepest shadow that is not inset and has no blur and no spread (4 on a card,
// 5 on the Workout button, 0 on a tab). Softer drop shadows are not a bevel.
export function bevelDepth(boxShadow: string): number {
  let deepest = 0;
  for (const layer of shadowLayers(boxShadow)) {
    if (/\binset\b/i.test(layer)) continue;
    // The colour can come first or last, and is a function such as rgba(...) or a word.
    const lengths = layer
      .replace(/[a-z-]+\([^)]*\)/gi, ' ')
      .split(/\s+/)
      .filter((t) => /^[+-]?(\d+\.?\d*|\.\d+)(px)?$/.test(t))
      .map(parseFloat);
    const [, y = 0, blur = 0, spread = 0] = lengths;
    if (lengths.length >= 2 && blur === 0 && spread === 0 && y > deepest) deepest = y;
  }
  return deepest;
}

// The gold ring around an element: the same gap on all four sides, with the bottom
// gap measured from the bottom of the bevel, and a corner radius that grows with it.
export function ringRect(rect: Box, bevel: number, radius: number, gap = 4): Ring {
  return {
    x: rect.x - gap,
    y: rect.y - gap,
    width: rect.width + 2 * gap,
    height: rect.height + bevel + 2 * gap,
    radius: radius + gap,
  };
}

// ---------------- The step card ----------------

export type BubblePlace = {
  side: 'below' | 'above' | 'right';
  left: number;
  // below and right give `top`, above gives `bottom` (from the bottom of the viewport),
  // so the card can grow upward without knowing its height.
  top?: number;
  bottom?: number;
  // How far the card's arrow sits along its edge: from its left edge for below and above,
  // from its top edge for right.
  arrow: number;
};

const EDGE = 12; // the least distance between the card and the side of the screen
const GAP = 16; // from the ring to a card above or below it
const SIDE_GAP = 18; // and to a card beside it
const SIDEBAR = 260; // a ring that ends before this is in the computer sidebar
const ARROW = 18; // the arrow is a square, rotated

// Where the step card goes. On a phone it is below the ring when the ring's centre is
// in the top half of the screen, and above it otherwise, centred on the ring and kept
// 12 px inside the screen. On a computer a ring in the sidebar gets the card to its
// right, centred on it and kept inside the screen; any other ring is treated like a phone.
// The card's height is only needed beside the sidebar, and 180 is a fair guess.
export function bubblePlace(
  ring: Box,
  viewport: { width: number; height: number },
  layout: 'phone' | 'desktop',
  bubbleWidth: number,
  bubbleHeight = 180
): BubblePlace {
  const centreY = ring.y + ring.height / 2;
  if (layout === 'desktop' && ring.x + ring.width < SIDEBAR) {
    const top = Math.min(Math.max(16, centreY - bubbleHeight / 2), Math.max(16, viewport.height - bubbleHeight - 16));
    const arrow = Math.min(Math.max(ARROW, centreY - top - ARROW / 2), bubbleHeight - 2 * ARROW);
    return { side: 'right', left: ring.x + ring.width + SIDE_GAP, top, arrow };
  }
  const centreX = ring.x + ring.width / 2;
  const left = Math.min(Math.max(EDGE, centreX - bubbleWidth / 2), viewport.width - bubbleWidth - EDGE);
  const arrow = Math.min(Math.max(ARROW, centreX - left - ARROW / 2), bubbleWidth - 2 * ARROW);
  if (centreY < viewport.height / 2) return { side: 'below', left, top: ring.y + ring.height + GAP, arrow };
  return { side: 'above', left, bottom: viewport.height - ring.y + GAP, arrow };
}

// ---------------- What Home shows ----------------

// What Home may show when it opens: the guide first, What's new on a later open, and
// never more than one a load. Nothing before the setup questions are done, and
// nothing while a workout is in progress. guideDone is false while the guide waits.
// A missing guideDone is someone who joined before the guide, who only gets updates.
export function introToShow(input: {
  guideDone: boolean | undefined;
  onboarded: boolean;
  unseenCount: number;
  sessionActive: boolean;
  shownThisLoad: boolean;
}): 'guide' | 'news' | null {
  if (!input.onboarded || input.sessionActive || input.shownThisLoad) return null;
  if (input.guideDone === false) return 'guide';
  return input.unseenCount > 0 ? 'news' : null;
}
