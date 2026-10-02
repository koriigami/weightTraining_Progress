// The first-run guide: its steps and words, the gold ring, where the step card goes,
// and when Home may show the guide or What's new.
import { describe, expect, it } from 'vitest';
import { GUIDE_STEPS, GUIDE_XP, bevelDepth, bubblePlace, flatRingRadius, introToShow, keepRingOnScreen, placeOnScreen, ringRect, scrollToFit, stepTargets, stepWords, unionBox } from '../lib/guide';
import { WORKOUT_XP } from '../lib/routines';

// The real computed box-shadows (what getComputedStyle gives), resolved from app/globals.css.
// The card: --card-shadow.
const CARD = 'rgba(255, 255, 255, 0.6) 0px 0px 0px 3px inset, rgb(215, 186, 124) 0px 4px 0px 0px, rgba(120, 80, 20, 0.5) 0px 14px 24px -18px';
// .wt-startfab, the Workout button: a 5 px bevel, a soft glow, an inset highlight.
const START_BUTTON = 'rgb(24, 106, 32) 0px 5px 0px 0px, rgba(43, 164, 56, 0.35) 0px 0px 24px 0px, rgba(255, 255, 255, 0.4) 0px 2px 0px 0px inset';

describe('bevelDepth', () => {
  it('reads 4 from the card shadow, past the commas inside rgba()', () => {
    expect(bevelDepth(CARD)).toBe(4);
  });

  it('reads 5 from the Workout button, whose glow and highlight are not a bevel', () => {
    expect(bevelDepth(START_BUTTON)).toBe(5);
  });

  it('is 0 for none, an empty value and a tab', () => {
    expect(bevelDepth('none')).toBe(0);
    expect(bevelDepth('')).toBe(0);
  });

  it('is 0 when every shadow is inset, or soft', () => {
    expect(bevelDepth('rgba(255, 255, 255, 0.6) 0px 0px 0px 3px inset')).toBe(0);
    expect(bevelDepth('rgba(255, 255, 255, 0.4) 0px 6px 0px 0px inset')).toBe(0);
    expect(bevelDepth('rgba(120, 80, 20, 0.5) 0px 14px 24px -18px')).toBe(0);
    expect(bevelDepth('rgba(0, 0, 0, 0.2) 0px 4px 0px 2px')).toBe(0); // a spread is an outline, not a bevel
  });

  it('takes the deepest of several bevels, with the colour before or after the numbers', () => {
    expect(bevelDepth('rgb(1, 2, 3) 0px 3px 0px 0px, rgb(4, 5, 6) 0px 6px 0px 0px')).toBe(6);
    expect(bevelDepth('0px 3px 0px 0px rgb(1, 2, 3)')).toBe(3);
    expect(bevelDepth('0 3px 0 #d7ba7c, 0 10px 20px -8px #2ba438')).toBe(3);
  });
});

describe('ringRect', () => {
  const rect = { x: 12, y: 93, width: 366, height: 100 };

  it('keeps a 4 px gap on the top, left and right', () => {
    expect(ringRect(rect, 0, 22)).toMatchObject({ x: 8, y: 89, width: 374 });
  });

  it('measures the bottom gap from the bottom of the bevel', () => {
    expect(ringRect(rect, 4, 22).height).toBe(100 + 4 + 8);
    expect(ringRect(rect, 0, 22).height).toBe(108);
  });

  it('grows the corner radius by the gap, and takes another gap', () => {
    expect(ringRect(rect, 4, 22).radius).toBe(26);
    expect(ringRect(rect, 4, 22, 6)).toEqual({ x: 6, y: 87, width: 378, height: 116, radius: 28 });
  });
});

describe('keepRingOnScreen', () => {
  const PHONE = { width: 390, height: 844 };

  it('leaves a ring whose gold line fits on the screen alone', () => {
    const ring = { x: 8, y: 4, width: 374, height: 81, radius: 24 };
    expect(keepRingOnScreen(ring, PHONE)).toEqual(ring);
  });

  it('pulls in the side of a ring that touches the screen edge, so its gold line is not cut off', () => {
    // the Profile tab ends 4 px short of the right edge, so its ring box ends on the edge
    const profile = { x: 312, y: 775, width: 78, height: 59, radius: 16 };
    expect(keepRingOnScreen(profile, PHONE)).toEqual({ x: 312, y: 775, width: 74, height: 59, radius: 16 });
    expect(keepRingOnScreen({ x: 0, y: 2, width: 100, height: 100, radius: 10 }, PHONE)).toEqual({ x: 4, y: 4, width: 96, height: 98, radius: 10 });
    expect(keepRingOnScreen({ x: 10, y: 800, width: 100, height: 60, radius: 10 }, PHONE).height).toBe(844 - 4 - 800);
  });
});

describe('unionBox', () => {
  it('is the smallest box that holds every box', () => {
    const cards = [
      { x: 312, y: 375, width: 220, height: 253 },
      { x: 548, y: 375, width: 220, height: 253 },
      { x: 784, y: 375, width: 236, height: 240 },
    ];
    expect(unionBox(cards)).toEqual({ x: 312, y: 375, width: 708, height: 253 });
  });

  it('is the box itself for one, and empty for none', () => {
    expect(unionBox([{ x: 5, y: 6, width: 7, height: 8 }])).toEqual({ x: 5, y: 6, width: 7, height: 8 });
    expect(unionBox([])).toEqual({ x: 0, y: 0, width: 0, height: 0 });
  });
});

describe('flatRingRadius', () => {
  it('is the link radius plus 2 for a sidebar link', () => {
    expect(flatRingRadius(12)).toBe(14);
  });

  it('falls back to the icon pill for a phone tab, whose link has no radius', () => {
    expect(flatRingRadius(0)).toBe(16);
  });
});

describe('stepWords and stepTargets', () => {
  const routines = GUIDE_STEPS.find((s) => s.id === 'routines')!;
  const workout = GUIDE_STEPS.find((s) => s.id === 'workout')!;

  it('says the phone words on a phone and the computer words on a computer', () => {
    expect(stepWords(workout, 'phone').text).toBe('Tap Workout to start a routine, a run or a custom workout. Tick each set as you go.');
    expect(stepWords(workout, 'desktop').text).toBe('Start a routine, a run or a custom workout. Tick each set as you go.');
    expect(stepWords(routines, 'desktop').title).toBe('Routines and Exercises');
  });

  it('lights up the Exercises link with Routines on a computer only', () => {
    expect(stepTargets(routines, 'phone')).toEqual(['routines']);
    expect(stepTargets(routines, 'desktop')).toEqual(['routines', 'exercises']);
    expect(stepTargets(workout, 'desktop')).toEqual(['workout']);
  });
});

describe('bubblePlace', () => {
  const PHONE = { width: 390, height: 844 };
  const DESK = { width: 1440, height: 900 };

  it('goes below a ring whose centre is in the top half of a phone, and above one in the bottom half', () => {
    const top = bubblePlace({ x: 8, y: 4, width: 374, height: 81 }, PHONE, 'phone', 300);
    expect(top).toMatchObject({ side: 'below', top: 4 + 81 + 16 });
    expect(top.bottom).toBeUndefined();
    const bottom = bubblePlace({ x: 140, y: 764, width: 110, height: 75 }, PHONE, 'phone', 300);
    expect(bottom).toMatchObject({ side: 'above', bottom: 844 - 764 + 16 });
    expect(bottom.top).toBeUndefined();
  });

  it('centres on the ring and points its arrow at the ring centre', () => {
    const p = bubblePlace({ x: 140, y: 764, width: 110, height: 75 }, PHONE, 'phone', 300);
    expect(p.left).toBe(195 - 150); // ring centre 195, card 300 wide
    expect(p.arrow).toBe(150 - 9); // the middle of the card, less half the arrow
  });

  it('stays 12 px inside the screen, with the arrow still on the ring', () => {
    const left = bubblePlace({ x: 20, y: 700, width: 60, height: 60 }, PHONE, 'phone', 300);
    expect(left.left).toBe(12);
    expect(left.arrow).toBe(50 - 12 - 9); // the ring centre is at 50
    const right = bubblePlace({ x: 330, y: 700, width: 52, height: 60 }, PHONE, 'phone', 300);
    expect(right.left).toBe(390 - 300 - 12);
    expect(right.arrow).toBe(300 - 36); // the arrow stops short of the card's corner
  });

  it('goes to the right of a ring in the computer sidebar, centred on it', () => {
    const p = bubblePlace({ x: 8, y: 300, width: 235, height: 108 }, DESK, 'desktop', 340);
    expect(p).toMatchObject({ side: 'right', left: 8 + 235 + 18, top: 354 - 90 });
    expect(p.bottom).toBeUndefined();
    expect(p.arrow).toBe(90 - 9);
  });

  it('keeps a card beside the sidebar inside the screen', () => {
    expect(bubblePlace({ x: 8, y: 20, width: 235, height: 60 }, DESK, 'desktop', 340).top).toBe(16);
    expect(bubblePlace({ x: 8, y: 860, width: 235, height: 40 }, DESK, 'desktop', 340).top).toBe(900 - 180 - 16);
  });

  it('places a ring outside the sidebar like a phone, even on a computer', () => {
    const p = bubblePlace({ x: 308, y: 90, width: 605, height: 236 }, DESK, 'desktop', 340);
    expect(p).toMatchObject({ side: 'below', top: 90 + 236 + 16 });
  });

  it('uses the phone placement for a ring in the sidebar area when the layout is a phone', () => {
    expect(bubblePlace({ x: 8, y: 300, width: 235, height: 108 }, PHONE, 'phone', 300).side).toBe('below');
  });
});

describe('placeOnScreen', () => {
  const SMALL = { width: 320, height: 568 };
  const HEIGHT = 190;

  it('is bubblePlace when the card fits on its side', () => {
    const ring = { x: 8, y: 4, width: 374, height: 81 };
    const phone = { width: 390, height: 844 };
    expect(placeOnScreen(ring, phone, 'phone', 300, HEIGHT)).toEqual(bubblePlace(ring, phone, 'phone', 300, HEIGHT));
    const low = { x: 140, y: 764, width: 110, height: 75 };
    expect(placeOnScreen(low, phone, 'phone', 300, HEIGHT)).toEqual(bubblePlace(low, phone, 'phone', 300, HEIGHT));
  });

  it('keeps a card below a tall ring on the screen, 12 px from the bottom', () => {
    const p = placeOnScreen({ x: 12, y: 40, width: 296, height: 369 }, SMALL, 'phone', 296, HEIGHT);
    expect(p).toMatchObject({ side: 'below', top: 568 - HEIGHT - 12 });
  });

  it('keeps a card above a tall ring on the screen, 12 px from the top', () => {
    const p = placeOnScreen({ x: 12, y: 150, width: 296, height: 369 }, SMALL, 'phone', 296, HEIGHT);
    expect(p).toMatchObject({ side: 'above', bottom: 568 - 12 - HEIGHT });
    expect(p.top).toBeUndefined();
  });

  it('leaves a card beside the sidebar where bubblePlace put it', () => {
    const ring = { x: 8, y: 300, width: 235, height: 108 };
    expect(placeOnScreen(ring, { width: 1440, height: 900 }, 'desktop', 340, HEIGHT)).toEqual(bubblePlace(ring, { width: 1440, height: 900 }, 'desktop', 340, HEIGHT));
  });
});

describe('scrollToFit', () => {
  const HEIGHT = 190;

  it('is 0 when a side of the ring has room for the card', () => {
    expect(scrollToFit({ x: 12, y: 93, width: 366, height: 369 }, 844, HEIGHT, 96, 770)).toBe(0);
  });

  it('moves the ring to just under the top bar when neither side has room but the two fit together', () => {
    // a 236 px ring centred on a 568 px screen: 166 above and 166 below, and the card needs 206
    expect(scrollToFit({ x: 12, y: 166, width: 296, height: 236 }, 568, HEIGHT, 96, 488)).toBe(70);
  });

  it('picks the move that covers the least of the ring when the two cannot fit together', () => {
    // a 242 px ring and a 229 px card on a 568 px screen with an 85 px bar and a 72 px tab bar: the card
    // would cover 24 px of the ring below it and 11 px above it, against 92 px where the ring now is
    expect(scrollToFit({ x: 12, y: 165, width: 296, height: 242 }, 568, 229, 93, 488)).toBe(165 - (488 - 242));
  });

  it('is 0 when the ring is taller than the free area', () => {
    expect(scrollToFit({ x: 12, y: 100, width: 296, height: 400 }, 568, 229, 93, 488)).toBe(0);
  });
});

describe('introToShow', () => {
  const ready = { guideDone: false, onboarded: true, unseenCount: 0, sessionActive: false, shownThisLoad: false };

  it('shows the guide first, even when updates are waiting too', () => {
    expect(introToShow(ready)).toBe('guide');
    expect(introToShow({ ...ready, unseenCount: 4 })).toBe('guide');
  });

  it('shows What is new when there is no guide waiting and updates are unseen', () => {
    expect(introToShow({ ...ready, guideDone: true, unseenCount: 4 })).toBe('news');
    expect(introToShow({ ...ready, guideDone: undefined, unseenCount: 4 })).toBe('news'); // joined before the guide
  });

  it('shows nothing when the guide is done and every update is seen, or someone joined before the guide with nothing new', () => {
    expect(introToShow({ ...ready, guideDone: true })).toBeNull();
    expect(introToShow({ ...ready, guideDone: undefined })).toBeNull();
  });

  it('shows one thing a load: nothing once something was shown', () => {
    expect(introToShow({ ...ready, shownThisLoad: true })).toBeNull();
    expect(introToShow({ ...ready, guideDone: true, unseenCount: 4, shownThisLoad: true })).toBeNull();
  });

  it('shows nothing while a workout is in progress', () => {
    expect(introToShow({ ...ready, sessionActive: true })).toBeNull();
    expect(introToShow({ ...ready, guideDone: true, unseenCount: 4, sessionActive: true })).toBeNull();
  });

  it('shows nothing before the setup questions are done', () => {
    expect(introToShow({ ...ready, onboarded: false })).toBeNull();
    expect(introToShow({ ...ready, guideDone: true, unseenCount: 4, onboarded: false })).toBeNull();
  });
});

describe('the guide words', () => {
  it('has seven steps in order, each with a target and words for a phone and a computer', () => {
    expect(GUIDE_STEPS.map((s) => s.id)).toEqual(['level', 'today', 'workout', 'week', 'routines', 'rank', 'profile']);
    for (const s of GUIDE_STEPS) {
      expect(s.target, s.id).toBe(s.id);
      for (const w of [s.phone, s.desktop]) {
        expect(w.title.length, s.id).toBeGreaterThan(0);
        expect(w.text.length, s.id).toBeGreaterThan(0);
      }
    }
  });

  it('says different things on a phone and a computer only where the screens differ', () => {
    const differ = GUIDE_STEPS.filter((s) => s.phone.title !== s.desktop.title || s.phone.text !== s.desktop.text).map((s) => s.id);
    expect(differ).toEqual(['workout', 'routines', 'profile']);
    expect(GUIDE_STEPS.find((s) => s.id === 'routines')).toMatchObject({ alsoOnDesktop: ['exercises'], desktop: { title: 'Routines and Exercises' } });
    expect(GUIDE_STEPS.filter((s) => s.alsoOnDesktop).map((s) => s.id)).toEqual(['routines']);
  });

  it('lists the XP the rules pay, from the same numbers as the scoring', () => {
    const value = (label: string) => GUIDE_XP.rows.find((r) => r.label === label)?.value;
    expect(value('Each set you tick')).toBe(`+${WORKOUT_XP.strengthSet}`);
    expect(value('Beat last time, or a record')).toBe(`+${WORKOUT_XP.beat} or +${WORKOUT_XP.record}`);
    expect(value('A day with 20 minutes of training')).toBe(`+${WORKOUT_XP.daily}`);
    expect(value('Your weekly goal, growing each week in a row')).toBe(`+${WORKOUT_XP.weeklyGoal} to +${WORKOUT_XP.weeklyGoalMax}`);
    expect(WORKOUT_XP.dailyMinutes).toBe(20);
    expect(GUIDE_XP.rows).toHaveLength(5);
  });
});
