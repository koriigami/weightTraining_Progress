// Small pictures of the 3D medals and chests, rendered once from the models and
// cached as data URLs. One shared offscreen renderer does all the drawing, one
// picture at a time. three.js is loaded here, on first use, with a dynamic
// import, so it is never part of a page's first load. When WebGL is missing
// every call resolves to null and the caller keeps its vector art.
import type { BadgeArt } from '@/lib/badgeCards';
import { medalKey, medalModel } from '@/lib/badgeModel';
import type { ChestKey, MedalModel } from '@/lib/badgeModel';
import type { Art } from './art';
import { webglAvailable } from './webgl';

let art: Promise<Art | null> | null = null;
const done = new Map<string, string>();
const pending = new Map<string, Promise<string | null>>();
let queue: Promise<unknown> = Promise.resolve();

function sharedArt(): Promise<Art | null> {
  art ??= (async () => {
    if (!webglAvailable()) return null;
    try {
      // The text on a medal is drawn in the display font, so have it ready first.
      await document.fonts?.load("96px 'Levl Display'").catch(() => undefined);
      const m = await import('./art');
      return new m.Art();
    } catch {
      return null;
    }
  })();
  return art;
}

// Texture work for one picture is a few tens of ms. Run them one by one with a
// breath between so a screen of badges never blocks scrolling.
function enqueue(key: string, draw: (a: Art) => string): Promise<string | null> {
  const hit = done.get(key);
  if (hit) return Promise.resolve(hit);
  const wait = pending.get(key);
  if (wait) return wait;
  const job = queue.then(async () => {
    const a = await sharedArt();
    if (!a) return null;
    try {
      const url = draw(a);
      done.set(key, url);
      return url;
    } catch {
      return null;
    } finally {
      await new Promise((r) => setTimeout(r, 0));
    }
  });
  queue = job;
  const out = job.finally(() => pending.delete(key));
  pending.set(key, out);
  return out;
}

/** Picture sizes are bucketed so the same badge at 64 and 72 px shares one render. */
export const pictureSize = (size: number): number => (size <= 48 ? 128 : size <= 80 ? 192 : size <= 140 ? 288 : 384);

// How far the camera stands: the medal fills the picture, with room for Legend's halo and the month tab.
const medalDistance = (m: MedalModel): number => (m.tier === 'legend' ? 5.6 : m.month ? 4.9 : 4.3);

/** The picture of a medal for a card's art, or null when it cannot be drawn. */
export function badgePicture(art: BadgeArt, size: number, locked = false): Promise<string | null> {
  return medalPicture(medalModel(art, locked), size);
}

export function medalPicture(model: MedalModel, size: number): Promise<string | null> {
  const px = pictureSize(size);
  return enqueue(medalKey(model, px), (a) => {
    const medal = a.medal(model);
    return a.still(medal, { w: px, h: px, cam: [0, 0, medalDistance(model)], look: [0, 0, 0], rotY: -0.16 });
  });
}

/** The picture of a chest, shut or with the lid open and the light coming out. */
export function chestPicture(key: ChestKey, { open = false, size = 192 }: { open?: boolean; size?: number } = {}): Promise<string | null> {
  const px = pictureSize(size);
  return enqueue(`chest|${key}|${open ? 'open' : 'shut'}|${px}`, (a) => {
    const chest = a.chest(key);
    if (open) {
      const { hinge, inner } = chest.userData;
      if (hinge) hinge.rotation.x = -1.95;
      if (inner) inner.material.opacity = 1;
    }
    return a.still(chest, { w: px, h: px, cam: [0, 2.7, 7.4], look: [0, 0.85, 0], rotY: -0.42, shadow: true });
  });
}
