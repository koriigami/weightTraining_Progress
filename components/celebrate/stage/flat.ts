// The reward stage without WebGL: the same driver as the 3D stage, drawn with
// flat SVG. The chest is a simple vector chest that drops, jolts and opens; the
// medal is the vector hexagon. The sequence in ./run is the same, and the page
// flies the medals itself (see `medalMarkup`). Only used when 3D cannot start.
import { BADGE_ICONS } from '@/components/Badge';
import { anim, reducedMotion } from '@/lib/anim';
import { LOCKED_COLORS, TIER_PALETTE } from '@/lib/badgeColors';
import { CHEST_DEFS } from '@/lib/badgeModel';
import type { ChestKey, MedalModel } from '@/lib/badgeModel';
import { ease } from '@/lib/motion';
import type { ArtDriver } from './driver';
import type { Pt } from './fx';

const BODY: Record<ChestKey, string> = {
  bronze: '#a65e2c',
  silver: '#3c4a62',
  gold: '#d99a14',
  diamond: '#7fd3f7',
  master: '#2a1630',
  legend: '#b9a3ff',
  monthly: '#6a3a1c',
  royal: '#6d2fd6',
  pillow: '#b9a6ff',
};

const CHEST_W = 250;
const CHEST_H = 212; // CHEST_W * 170 / 200
const BASE_Y = 650; // where the chest stands, in stage pixels
const OPEN_BASE_Y = 700; // and where it settles when open
const OPEN_K = 0.8;

let ids = 0;

/** The vector medal as markup: a hexagon in the tier's colours with its icon or text. */
export function vectorMedal(model: MedalModel, size = 170): string {
  const id = `fm${++ids}`;
  const pal = model.tier === 'locked' ? { enamel: LOCKED_COLORS.enamel, enamelDeep: LOCKED_COLORS.enamelDeep, metal: LOCKED_COLORS.metal, metalDeep: '#6C7080' } : TIER_PALETTE[model.tier];
  const top = model.colors?.[0] ?? pal.enamel;
  const deep = model.colors?.[1] ?? pal.enamelDeep;
  const inner = model.text
    ? `<text x="32" y="39.5" text-anchor="middle" font-family="'Levl Display','Arial Rounded MT Bold',sans-serif" font-size="${model.text.length > 3 ? 15 : 19}" fill="#fff" stroke="rgba(0,0,0,.28)" stroke-width="2" paint-order="stroke">${model.text}</text>`
    : model.icon
      ? `<g transform="translate(20 20)" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${BADGE_ICONS[model.icon] ?? ''}</g>`
      : '';
  return `<svg viewBox="0 0 64 64" width="${size}" height="${size}" aria-hidden="true" focusable="false"><defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${top}"/><stop offset="1" stop-color="${deep}"/></linearGradient><linearGradient id="${id}r" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${pal.metal}"/><stop offset="1" stop-color="${pal.metalDeep}"/></linearGradient></defs><path d="M32 2 58 17v30L32 62 6 47V17Z" fill="url(#${id}r)" stroke="rgba(0,0,0,.4)" stroke-width="2.5"/><path d="M32 9 52 20.5v23L32 55 12 43.5v-23Z" fill="url(#${id})" stroke="rgba(255,255,255,.5)" stroke-width="1.5"/><path d="M12 20.5 32 9l20 11.5v6C40 22 24 22 12 27Z" fill="#fff" opacity=".18"/>${inner}</svg>`;
}

function chestSvg(key: ChestKey): string {
  const def = CHEST_DEFS[key];
  const pal = TIER_PALETTE[def.tier];
  const body = BODY[key];
  const metal = pal.metal;
  const line = '#1a0b05';
  return `<svg viewBox="0 0 200 170" width="${CHEST_W}" height="${CHEST_H}" overflow="visible" aria-hidden="true" focusable="false">
<ellipse cx="100" cy="163" rx="86" ry="8" fill="rgba(0,0,0,.35)"/>
<ellipse class="glow" cx="100" cy="82" rx="72" ry="13" fill="${pal.glow}" opacity="0"/>
<rect x="14" y="80" width="172" height="80" rx="10" fill="${body}" stroke="${line}" stroke-width="4"/>
<rect x="44" y="80" width="16" height="80" fill="${metal}" stroke="${line}" stroke-width="2.5"/>
<rect x="140" y="80" width="16" height="80" fill="${metal}" stroke="${line}" stroke-width="2.5"/>
<g class="lid" style="transform-box:view-box;transform-origin:100px 82px">
<path d="M14 82V58Q14 24 100 24Q186 24 186 58V82Z" fill="${body}" stroke="${line}" stroke-width="4"/>
<path d="M44 82V28H60V82ZM140 82V28H156V82Z" fill="${metal}" stroke="${line}" stroke-width="2.5"/>
<rect x="86" y="66" width="28" height="26" rx="6" fill="${metal}" stroke="${line}" stroke-width="3"/>
<circle cx="100" cy="78" r="4" fill="${line}"/>
</g></svg>`;
}

/** Runs `fn(p)` over `ms` with an easing, one frame at a time. Reduced motion jumps to the end. */
function tween(ms: number, fn: (p: number) => void, ez: (t: number) => number = ease.outCubic): Promise<void> {
  return new Promise((resolve) => {
    if (reducedMotion()) {
      fn(1);
      resolve();
      return;
    }
    const t0 = performance.now();
    const step = (now: number) => {
      const p = Math.min(1, (now - t0) / ms);
      fn(ez(p));
      if (p < 1) requestAnimationFrame(step);
      else resolve();
    };
    requestAnimationFrame(step);
  });
}

export class FlatStage implements ArtDriver {
  private box: HTMLDivElement;
  private wrap: HTMLDivElement;
  private y = 0; // how far the chest is moved from standing, in px (negative is up)
  private base = BASE_Y;
  private k = 1;
  private sq: [number, number] = [1, 1];
  private rot = 0;
  private opened = false;

  constructor(host: HTMLElement) {
    this.box = document.createElement('div');
    this.box.className = 'wt-rs-flat';
    this.wrap = document.createElement('div');
    this.wrap.className = 'wt-rs-flatchest';
    this.box.append(this.wrap);
    host.append(this.box);
    this.wrap.style.visibility = 'hidden';
  }

  private place() {
    const [sx, sy] = this.sq;
    const k = this.k;
    this.wrap.style.transform = `translate(0,${this.y}px) rotate(${this.rot}rad) scale(${k * sx},${k * sy})`;
  }

  setChest(key: ChestKey) {
    this.wrap.innerHTML = chestSvg(key);
    this.wrap.style.visibility = 'hidden';
    this.wrap.style.left = `${195 - CHEST_W / 2}px`;
    this.wrap.style.top = `${BASE_Y - CHEST_H}px`;
    this.wrap.style.transformOrigin = '50% 92%';
    this.y = 0;
    this.k = 1;
    this.sq = [1, 1];
    this.rot = 0;
    this.base = BASE_Y;
    this.opened = false;
    this.place();
  }

  rest() {
    this.wrap.style.visibility = 'visible';
  }

  async drop(onLand?: () => void) {
    this.wrap.style.visibility = 'visible';
    await tween(
      430,
      (p) => {
        this.y = -560 * (1 - p);
        this.place();
      },
      ease.inQuad
    );
    onLand?.();
    await tween(
      320,
      (p) => {
        const s = Math.sin(p * Math.PI) * (1 - p);
        this.sq = [1 + 0.16 * s, 1 - 0.24 * s];
        this.place();
      },
      ease.linear
    );
    this.sq = [1, 1];
    this.place();
  }

  async tap(i: number) {
    const kick = (i % 2 ? -1 : 1) * 0.1;
    const glow = this.wrap.querySelector<SVGElement>('.glow');
    if (glow) glow.setAttribute('opacity', String(0.25 + i * 0.2));
    await tween(
      380,
      (p) => {
        const w = Math.sin(p * Math.PI * 4) * (1 - p);
        this.rot = kick * w;
        const s = Math.sin(p * Math.PI) * (1 - p);
        this.sq = [1 + 0.1 * s, 1 - 0.14 * s];
        this.y = -Math.sin(p * Math.PI) * 24 * (1 - p);
        this.place();
      },
      ease.linear
    );
    this.rot = 0;
    this.y = 0;
    this.sq = [1, 1];
    this.place();
  }

  async charge(ms: number) {
    await tween(
      ms,
      (p) => {
        this.rot = Math.sin(p * 90) * 0.03 * p;
        this.place();
      },
      ease.linear
    );
    this.rot = 0;
    this.place();
  }

  async burst() {
    this.opened = true;
    const lid = this.wrap.querySelector<SVGElement>('.lid');
    const glow = this.wrap.querySelector<SVGElement>('.glow');
    glow?.setAttribute('opacity', '1');
    await anim(lid, [{ transform: 'translate(0,0) rotate(0deg)' }, { transform: 'translate(0,-34px) rotate(-16deg)' }], { duration: 320, easing: 'cubic-bezier(.2,1.6,.4,1)', fill: 'forwards' });
    lid?.setAttribute('style', `${lid.getAttribute('style') ?? ''};transform:translate(0,-34px) rotate(-16deg)`);
  }

  async settle() {
    const y0 = this.y;
    const to = OPEN_BASE_Y - BASE_Y;
    await tween(420, (p) => {
      this.y = y0 + (to - y0) * p;
      this.k = 1 - (1 - OPEN_K) * p;
      this.place();
    });
    this.base = OPEN_BASE_Y;
  }

  private heightNow() {
    return CHEST_H * this.k;
  }

  chestPoint(y = 0.9): Pt {
    // y is in chest widths up from the base, like the 3D stage's units
    const top = this.base - this.heightNow() * 0.08;
    return { x: 195, y: top - y * this.heightNow() * 0.45 };
  }

  chestCorner(): Pt {
    return { x: 195 + (CHEST_W * this.k) / 2 - 10, y: this.base - this.heightNow() * 0.92 };
  }

  medalPoint(): Pt {
    return { x: 195, y: 232 };
  }

  medalBox() {
    return null;
  }

  medalMarkup(model: MedalModel) {
    return vectorMedal(model, 170);
  }

  medalImage(model: MedalModel) {
    return vectorMedal(model, 170);
  }

  removeMedal() {}

  async hideChest() {
    const y0 = this.y;
    await tween(
      320,
      (p) => {
        this.y = y0 + 380 * p;
        this.place();
      },
      ease.inCubic
    );
    this.wrap.style.visibility = 'hidden';
  }

  hideAll() {
    this.wrap.style.visibility = 'hidden';
  }

  resize() {}

  dispose() {
    this.box.remove();
  }

  get isOpen() {
    return this.opened;
  }
}
