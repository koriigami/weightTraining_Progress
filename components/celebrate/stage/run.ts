// The reward stage's sequence, ported from docs/design/12-motion/stage.js: the
// rank-up moment, then one chest. The chest drops with its land sound, dust and a
// shake; takes its taps (each a latch and a jolt, three-tap chests charge before
// they burst); stays open in the lower third; and lets each item out: light
// spirals into the chest, the item rises spinning, pauses backlit, flips to its
// face, and gets its card while its XP flies to the level bar. Several items fly
// to a tray, which grows into the summary. The markup is RewardStage.tsx's; this
// file drives it. Everything is in stage pixels (390 by 780).
import { RANK_MATERIALS } from '@/components/RankShield';
import { webglAvailable } from '@/components/art3d/webgl';
import { reducedMotion } from '@/lib/anim';
import { TIER_PALETTE } from '@/lib/badgeColors';
import { medalModel } from '@/lib/badgeModel';
import { RANK_TITLES } from '@/lib/progress';
import { CHEST_FOR_RANK, CHEST_PALETTE, chestName, chestTaps } from '@/lib/rewards';
import { barAt, itemsLeft, summaryXp } from '@/lib/rewardStage';
import type { StageItem, StagePlan } from '@/lib/rewardStage';
import { SYN, buzz, duck, music, play, preload, stopMusic, unlock } from '@/lib/sound';
import type { ArtDriver } from './driver';
import { FlatStage } from './flat';
import { StageFx, shatterEl } from './fx';

const W = 390;
const H = 780;

class Cancelled extends Error {}

const wait = (ms: number): Promise<void> => (reducedMotion() || ms <= 0 ? Promise.resolve() : new Promise((r) => window.setTimeout(r, ms)));

type Ui = { color: string; glow: string };

/** The colours that frame an item's card: its tier, or its rank's shield. */
function uiOf(item: StageItem): Ui {
  if (item.rank) return { color: RANK_MATERIALS[item.rank].rim[1], glow: RANK_MATERIALS[item.rank].rim[0] };
  const p = TIER_PALETTE[item.palette ?? 'bronze'];
  return { color: p.color, glow: p.glow };
}

export class StageRun {
  private run = 0;
  private art: ArtDriver | null = null;
  private artReady: Promise<void> | null = null;
  private fx: StageFx;
  private tapWaiter: (() => void) | null = null;
  private keepTap = false;
  private kept = false;
  private layoutK = 1;
  // the level bar
  private xp = 0;
  private shown = 0;
  private lastLevel = 1;
  private closed = false;

  constructor(
    private root: HTMLElement,
    private plan: StagePlan,
    private hooks: { onReady: () => void; announce: (text: string) => void }
  ) {
    this.fx = new StageFx(this.q<HTMLCanvasElement>('.wt-rs-fx'));
    if (plan.xp) {
      this.xp = plan.xp.from;
      this.shown = plan.xp.from;
      this.lastLevel = barAt(plan.xp.from).level;
    }
    this.drawBar(false);
  }

  private q<T extends HTMLElement = HTMLElement>(sel: string): T {
    return this.root.querySelector(sel) as T;
  }

  /** Maps the stage onto the screen: scale `k`, top left at (`ox`, `oy`), on a `w` by `h` screen. */
  layout(w: number, h: number, k: number, ox: number, oy: number) {
    this.layoutK = k;
    this.fx.place(w, h, k, ox, oy);
    this.art?.resize(k);
  }

  /** A tap or key press anywhere on the stage. */
  tap() {
    if (this.tapWaiter) this.tapWaiter();
    else if (this.keepTap) this.kept = true;
  }

  /** Stops everything: used when the stage closes. */
  stop() {
    this.closed = true;
    this.run++;
    this.tapWaiter = null;
    this.keepTap = this.kept = false;
    stopMusic(0.4);
    this.fx.clear();
    this.art?.dispose();
    this.art = null;
  }

  private live(token: number) {
    if (token !== this.run) throw new Cancelled();
  }

  private waitTap(): Promise<void> {
    if (this.kept) {
      this.kept = false;
      return Promise.resolve();
    }
    return new Promise((ok) => {
      this.tapWaiter = () => {
        this.tapWaiter = null;
        unlock();
        ok();
      };
    });
  }

  private tpl(name: string): string {
    return this.root.querySelector(`[data-tpl="${name}"]`)?.innerHTML ?? '';
  }

  private shake(px = 6, ms = 180) {
    if (reducedMotion()) return;
    this.q('.wt-rs-shake').animate(
      [{ transform: 'translate(0,0)' }, { transform: `translate(${px}px,${-px / 2}px)` }, { transform: `translate(${-px}px,${px / 3}px)` }, { transform: `translate(${px / 2}px,0)` }, { transform: 'translate(0,0)' }],
      { duration: ms }
    );
  }

  private flash(o = 0.85, ms = 260) {
    if (reducedMotion()) return;
    this.q('.wt-rw-flash').animate([{ opacity: 0 }, { opacity: o }, { opacity: 0 }], { duration: ms, easing: 'ease-out' });
  }

  // ---------- the level bar ----------
  private drawBar(glint = true) {
    const top = this.q('.wt-rs-top');
    if (!this.plan.xp) {
      top.style.display = 'none';
      return;
    }
    const b = barAt(this.shown);
    this.q('.wt-rs-lv').textContent = String(b.level);
    this.q('.wt-rs-bar i').style.width = `${b.pct}%`;
    this.q('.wt-rs-xpn').textContent = `${Math.round(b.current).toLocaleString('en-US')} / ${b.needed.toLocaleString('en-US')} XP`;
    if (glint) {
      const g = this.q('.wt-rs-bar b');
      g.classList.remove('go');
      void g.offsetWidth;
      g.classList.add('go');
    }
  }

  /** The level bar's number rolls up to its new value with the XP-lines ticks. */
  private addXp(v: number) {
    this.xp += v;
    const from = this.shown;
    const to = this.xp;
    const t0 = performance.now();
    const dur = reducedMotion() ? 1 : 260;
    let ticks = 0;
    const step = (now: number) => {
      const p = Math.min(1, (now - t0) / dur);
      this.shown = from + (to - from) * p;
      const level = barAt(this.shown).level;
      if (level > this.lastLevel) {
        this.lastLevel = level;
        this.fx.ring(40, 32, '#fff28f', 6, 60, 0.5, 5);
        SYN.fanfare();
      }
      if (p * 3 > ticks) {
        ticks++;
        SYN.roll(1 + this.shown / 4000);
      }
      this.drawBar(p === 1);
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  // ---------- the art ----------
  private mountArt(): Promise<void> {
    this.artReady ??= (async () => {
      const host = this.q('.wt-rs-art');
      let art: ArtDriver | null = null;
      if (webglAvailable()) {
        try {
          const m = await import('@/components/art3d/stage3d');
          art = new m.Stage3D(host);
        } catch {
          art = null;
        }
      }
      const made = art ?? new FlatStage(host);
      if (this.closed) {
        made.dispose();
        return;
      }
      this.art = made;
      made.resize(this.layoutK);
    })();
    return this.artReady;
  }

  // ---------- the whole thing ----------
  async start() {
    const token = ++this.run;
    try {
      unlock();
      preload(['land', 'crack', 'burst', 'whoosh', 'reveal', 'sparkle', 'shatter', 'rank']);
      void this.mountArt();
      if (this.plan.rankUp) await this.rankUpMoment(token);
      await this.playChest(token);
    } catch (e) {
      if (!(e instanceof Cancelled)) throw e;
    }
  }

  /**
   * The rank up: the old shield shakes, flashes and breaks into pieces, a pillar
   * of light, the new shield rises and its title unrolls. A first rank has no old
   * shield to break.
   */
  private async rankUpMoment(token: number) {
    const live = () => this.live(token);
    const ru = this.plan.rankUp!;
    const box = this.q('.wt-rs-rankup');
    const sh = this.q('.wt-ru-sh');
    const title = this.q('.wt-ru-title');
    title.querySelector('span')!.textContent = RANK_TITLES[ru.toRank];
    title.classList.remove('on');
    box.classList.remove('beam', 'out');
    sh.style.opacity = '1';
    box.classList.add('on');
    this.hooks.announce(`Rank up. You are now a ${RANK_TITLES[ru.toRank]}.`);
    if (ru.fromRank) {
      sh.innerHTML = this.tpl('shield-from');
      await wait(500);
      live();
      if (!reducedMotion()) {
        await sh
          .animate(
            Array.from({ length: 12 }, (_, i) => ({ transform: `translate(calc(-50% + ${(i % 2 ? 1 : -1) * (1 + i * 0.4)}px),0)` })),
            { duration: 480, easing: 'linear' }
          )
          .finished.catch(() => undefined);
        live();
      }
      this.flash(0.6, 180);
      play('shatter');
      buzz('heavy');
      shatterEl(this.q('.wt-rs-shake'), sh, 10);
      this.fx.shards(W / 2, 300, [RANK_MATERIALS[ru.fromRank].face[0], RANK_MATERIALS[ru.fromRank].rim[1], '#ffffff'], 10);
      await wait(380);
      live();
    } else {
      await wait(300);
      live();
    }
    SYN.riser(0.6);
    box.classList.add('beam');
    await wait(420);
    live();
    music('rank');
    sh.innerHTML = this.tpl('shield-to');
    sh.style.opacity = '1';
    if (!reducedMotion()) {
      sh.animate(
        [
          { transform: 'translate(-50%,120px) scale(.6)', opacity: 0 },
          { transform: 'translate(-50%,-8px) scale(1.06)', opacity: 1, offset: 0.7 },
          { transform: 'translate(-50%,0) scale(1)', opacity: 1 },
        ],
        { duration: 700, easing: 'cubic-bezier(.2,.8,.2,1)' }
      );
    }
    await wait(700);
    live();
    buzz('reward');
    this.fx.stars(W / 2, 300, 22, RANK_MATERIALS[ru.toRank].rim[0], 160);
    title.classList.add('on');
    await wait(1700);
    live();
    box.classList.add('out');
    await wait(300);
    live();
    box.classList.remove('on', 'out', 'beam');
  }

  // A title or a frame (or a flat medal) comes out like a medal, drawn in the page instead of in 3D.
  private async itemOut(html: string, hooks: { onRise?: () => void; onFlip?: () => void }) {
    const art = this.art!;
    const el = this.q('.wt-rs-item');
    const mp = art.medalPoint();
    const cp = art.chestPoint(1);
    el.innerHTML = html;
    el.style.left = `${mp.x - 85}px`;
    el.style.top = `${mp.y - 85}px`;
    const dy = cp.y - mp.y;
    hooks.onRise?.();
    if (reducedMotion()) {
      hooks.onFlip?.();
      return;
    }
    await el
      .animate(
        [
          { transform: `translate(0,${dy}px) scale(.2) rotateY(0deg)`, opacity: 0.4, filter: 'brightness(.3)' },
          { transform: `translate(40px,${dy * 0.4}px) scale(.45) rotateY(540deg)`, opacity: 1, filter: 'brightness(.4)', offset: 0.6 },
          { transform: 'translate(0,-20px) scale(.6) rotateY(1080deg)', opacity: 1, filter: 'brightness(.5)' },
        ],
        { duration: 700, easing: 'linear', fill: 'forwards' }
      )
      .finished.catch(() => undefined);
    await wait(260);
    hooks.onFlip?.();
    await el
      .animate(
        [
          { transform: 'translate(0,-20px) scale(.6) rotateY(1080deg)', filter: 'brightness(.5)' },
          { transform: 'translate(0,-6px) scale(1.12) rotateY(1440deg)', filter: 'brightness(1.4)', offset: 0.55 },
          { transform: 'translate(0,0) scale(1) rotateY(1440deg)', filter: 'brightness(1)' },
        ],
        { duration: 520, easing: 'ease-out', fill: 'forwards' }
      )
      .finished.catch(() => undefined);
  }

  /** The markup the page draws for an item itself, or null when the 3D stage draws it. */
  private domArt(item: StageItem): string | null {
    if (item.kind === 'title') return this.tpl('item-title');
    if (item.kind === 'frame') return this.tpl('item-frame');
    const art = this.art!;
    return art.medalOut ? null : (art.medalMarkup?.(medalModel(item.art!)) ?? null);
  }

  // ---------- the chest ----------
  private async playChest(token: number) {
    const live = () => this.live(token);
    const pause = async (ms: number) => {
      await wait(ms);
      live();
    };
    const { chest } = this.plan;
    const list = chest.items;
    const key = chest.key;
    const taps = chestTaps(key);
    const glow = TIER_PALETTE[CHEST_PALETTE[key]].glow;
    const root = this.root;
    root.style.setProperty('--glow', glow);

    const name = this.q('.wt-rs-name');
    name.querySelector('b')!.textContent = `${chestName(key)} chest`;
    name.querySelector('small')!.textContent = this.plan.rankUp ? `New at ${chest.rank} rank` : CHEST_FOR_RANK[chest.rank] === key ? `${chest.rank}-Rank chest` : '';
    name.classList.add('on');
    await this.mountArt();
    live();
    const art = this.art!;
    art.setChest(key);
    this.hooks.announce(`${chestName(key)} chest. ${list.length === 1 ? '1 reward' : `${list.length} rewards`}. Tap to open.`);
    await pause(260);
    await art.drop(() => {
      play('land');
      buzz('heavy');
      const p = art.chestPoint(0.05);
      this.fx.dust(p.x, p.y);
      this.shake(7);
    });
    live();

    const cnt = this.q('.wt-rs-count');
    cnt.querySelector('b')!.textContent = String(list.length);
    this.placeCounter();
    cnt.classList.add('on');
    const hint = this.q('.wt-rs-hint');
    const pips = this.q('.wt-rs-pips');
    pips.innerHTML = taps > 1 ? Array.from({ length: taps }, () => '<i></i>').join('') : '';
    hint.classList.add('on');
    for (let i = 0; i < taps; i++) {
      await this.waitTap();
      live();
      play('crack', { rate: 1 + i * 0.09 });
      buzz('medium');
      pips.children[i]?.classList.add('on');
      root.classList.add('lit');
      root.style.setProperty('--lit', String((i + 1) / taps));
      const p = art.chestPoint(1);
      this.fx.stars(p.x, p.y, 6 + i * 4, glow, 90);
      await art.tap(i, taps);
      live();
    }
    hint.classList.remove('on');
    name.classList.remove('on');
    if (taps >= 3) {
      play('riser');
      await art.charge(reducedMotion() ? 10 : 800);
      live();
    }
    this.flash();
    play('burst');
    duck();
    buzz('reward');
    root.classList.add('open');
    const bp = art.chestPoint(1);
    this.fx.burst(bp.x, bp.y, glow, 70);
    this.shake(9, 220);
    await art.burst();
    live();
    await art.settle();
    live();
    this.placeCounter();

    // the tray: one slot per item when there are several
    const tray = this.q('.wt-rs-tray');
    if (list.length > 1) {
      tray.innerHTML = list.map(() => '<i></i>').join('');
      tray.classList.add('on');
    }
    for (let k = 0; k < list.length; k++) {
      const item = list[k];
      const ui = uiOf(item);
      const cp = art.chestPoint(1);
      this.fx.spiral(cp.x, cp.y, ui.glow);
      const html = this.domArt(item);
      const hooks = {
        onRise: () => {
          play('whoosh');
          // the counter is what is left in the chest: it drops as the item leaves
          const left = itemsLeft(list.length, k + 1);
          if (left > 0) {
            cnt.querySelector('b')!.textContent = String(left);
            if (!reducedMotion()) cnt.animate([{ transform: 'scale(1.35)' }, { transform: 'scale(1)' }], { duration: 260, easing: 'cubic-bezier(.2,1.6,.4,1)' });
          } else cnt.classList.remove('on');
        },
        onFlip: () => {
          this.flash(0.55, 200);
          play('reveal');
          buzz('medium');
          const mp = art.medalPoint();
          this.fx.ring(mp.x, mp.y, ui.glow, 40, 200, 0.55, 8);
          this.fx.stars(mp.x, mp.y, 22, '#fff6c4', 170);
        },
      };
      if (html !== null) await this.itemOut(html, hooks);
      else await art.medalOut!(medalModel(item.art!), hooks);
      live();
      this.hooks.announce(`${item.name}. ${item.band}. ${item.what}.${item.xp ? ` Plus ${item.xp} XP.` : ''}`);
      this.keepTap = true;
      this.kept = false;
      await this.showCard(item, live);
      if (list.length === 1) break;
      this.q('.wt-rs-cont').classList.add('on');
      await this.waitTap();
      live();
      this.keepTap = false;
      this.q('.wt-rs-cont').classList.remove('on');
      this.q('.wt-rs-card').classList.remove('on');
      await this.toTray(item, k, html);
      live();
    }
    if (list.length > 1) {
      SYN.swirl();
      await art.hideChest();
      live();
      await this.summary(list, live);
    } else {
      await pause(500);
    }
    this.hooks.onReady();
  }

  private placeCounter() {
    const p = this.art?.chestCorner() ?? { x: 290, y: 430 };
    const c = this.q('.wt-rs-count');
    c.style.left = `${p.x - 22}px`;
    c.style.top = `${p.y - 22}px`;
  }

  private async showCard(item: StageItem, live: () => void) {
    const ui = uiOf(item);
    const card = this.q('.wt-rs-card');
    card.style.setProperty('--tc', ui.color);
    card.querySelector('.wt-rc-band span')!.textContent = item.band;
    card.querySelector('h3')!.textContent = item.name;
    card.querySelector('.wt-rc-what')!.textContent = item.what;
    card.querySelector('.wt-rc-next span')!.textContent = item.next;
    const bar = card.querySelector<HTMLElement>('.wt-rc-bar i')!;
    bar.style.width = '0%';
    const xpEl = card.querySelector<HTMLElement>('.wt-rs-xp')!;
    xpEl.textContent = item.xpText ?? `+${item.xp} XP`;
    xpEl.classList.toggle('unl', Boolean(item.xpText));
    card.classList.remove('on');
    void card.offsetWidth;
    card.classList.add('on');
    play('sparkle');
    window.setTimeout(() => (bar.style.width = `${Math.round(item.p * 100)}%`), 420);
    await wait(820);
    live();
    if (!item.xp || !this.plan.xp) return;
    // coins from the +XP pill to the level bar; the number counts up as they land
    const n = Math.min(8, Math.max(4, Math.round(item.xp / 25)));
    const per = item.xp / n;
    const xr = xpEl.getBoundingClientRect();
    const sr = this.root.querySelector('.wt-rs')!.getBoundingClientRect();
    const k = sr.width / W;
    const from = { x: (xr.left - sr.left + xr.width / 2) / k, y: (xr.top - sr.top + xr.height / 2) / k };
    const to = { x: 200, y: 32 };
    await new Promise<void>((ok) => {
      if (reducedMotion()) {
        this.addXp(item.xp);
        ok();
        return;
      }
      let landed = 0;
      this.fx.coins(from, to, n, (i) => {
        SYN.coin(1 + i * 0.05);
        this.addXp(per);
        if (++landed === n) ok();
      });
    });
    live();
  }

  /** The item leaves the stage as a picture and flies into its tray slot. */
  private async toTray(item: StageItem, k: number, html: string | null) {
    const art = this.art!;
    const slot = this.q('.wt-rs-tray').children[k] as HTMLElement;
    const itemEl = this.q('.wt-rs-item');
    const model = item.art ? medalModel(item.art) : null;
    const mb = html !== null ? { x: parseFloat(itemEl.style.left) + 85, y: parseFloat(itemEl.style.top) + 85, size: 170 } : (art.medalBox() ?? { x: W / 2, y: 300, size: 190 });
    // the picture is framed with a little room, so it starts a touch larger than the medal
    const box = { ...mb, size: html !== null ? 170 : mb.size * 1.1 };
    const url = html ?? art.medalImage(model!);
    const markup = url.startsWith('<');
    const img = markup ? document.createElement('div') : new Image();
    if (markup) img.innerHTML = url;
    else (img as HTMLImageElement).src = url;
    img.className = 'wt-rs-flyer';
    img.style.cssText = `left:${box.x - box.size / 2}px;top:${box.y - box.size / 2}px;width:${box.size}px;height:${box.size}px`;
    this.q('.wt-rs-fly').append(img);
    if (html !== null) itemEl.innerHTML = '';
    else art.removeMedal();
    const sr = slot.getBoundingClientRect();
    const rr = this.root.querySelector('.wt-rs')!.getBoundingClientRect();
    const kk = rr.width / W;
    const tx = (sr.left - rr.left + sr.width / 2) / kk - box.x;
    const ty = (sr.top - rr.top + sr.height / 2) / kk - box.y;
    const sc = sr.width / kk / box.size;
    SYN.swirl();
    if (!reducedMotion()) {
      await img
        .animate([{ transform: 'translate(0,0) scale(1)' }, { transform: `translate(${tx * 0.5}px,${ty * 0.5 - 30}px) scale(${(1 + sc) / 2}) rotate(-12deg)`, offset: 0.55 }, { transform: `translate(${tx}px,${ty}px) scale(${sc})` }], {
          duration: 480,
          easing: 'cubic-bezier(.5,0,.3,1)',
          fill: 'forwards',
        })
        .finished.catch(() => undefined);
    }
    img.remove();
    slot.innerHTML = markup ? url : `<img src="${url}" alt="">`;
    slot.classList.add('got');
    if (!reducedMotion()) slot.animate([{ transform: 'scale(1.4)' }, { transform: 'scale(1)' }], { duration: 260, easing: 'cubic-bezier(.2,1.6,.4,1)' });
    SYN.clink(1.1 + k * 0.08);
  }

  /** The tray grows into the summary: each item moves from its slot to its tile. */
  private async summary(list: StageItem[], live: () => void) {
    const box = this.q('.wt-rs-got');
    const grid = box.querySelector<HTMLElement>('.wt-rs-grid')!;
    const tray = this.q('.wt-rs-tray');
    const slots = [...tray.children] as HTMLElement[];
    grid.innerHTML = '';
    list.forEach((item, i) => {
      const tile = document.createElement('div');
      tile.className = 'wt-rs-gi';
      tile.style.setProperty('--tc', uiOf(item).color);
      tile.innerHTML = slots[i].innerHTML;
      const b = document.createElement('b');
      b.textContent = item.name;
      const s = document.createElement('small');
      s.textContent = item.xpText ?? `+${item.xp} XP`;
      tile.append(b, s);
      grid.append(tile);
    });
    const tot = box.querySelector<HTMLElement>('.wt-rs-tot')!;
    const total = summaryXp(list);
    tot.textContent = '';
    box.classList.add('on');
    const rr = this.root.querySelector('.wt-rs')!.getBoundingClientRect();
    const items = [...grid.children] as HTMLElement[];
    if (!reducedMotion()) {
      items.forEach((it, i) => {
        const a = slots[i].getBoundingClientRect();
        const b = it.querySelector('img,svg')!.getBoundingClientRect();
        const dx = (a.left + a.width / 2 - (b.left + b.width / 2)) / (rr.width / W);
        const dy = (a.top + a.height / 2 - (b.top + b.height / 2)) / (rr.width / W);
        it.animate([{ transform: `translate(${dx}px,${dy}px) scale(${a.width / b.width})`, opacity: 1 }, { transform: 'none', opacity: 1 }], { duration: 520, delay: i * 70, easing: 'cubic-bezier(.2,1.3,.4,1)', fill: 'backwards' });
      });
    }
    tray.classList.remove('on');
    items.forEach((it, i) => window.setTimeout(() => it.classList.add('on'), reducedMotion() ? 0 : 200 + i * 70));
    await wait(650);
    live();
    if (total > 0) {
      const steps = 12;
      for (let i = 1; i <= steps; i++) {
        await wait(35);
        live();
        tot.textContent = `+${Math.round((total * i) / steps)} XP`;
        if (i % 2 === 0) SYN.roll(1 + i / 20);
      }
      SYN.coin(1.2);
    }
    this.hooks.announce(`${list.length} rewards.${total > 0 ? ` ${total} XP in all.` : ''}`);
    // Continue comes last
    await wait(500);
    live();
  }
}
