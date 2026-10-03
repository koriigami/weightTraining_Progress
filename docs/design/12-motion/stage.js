// Board 12: the reward stage. One sequence for every chest, played by either
// art direction: drop, wait, taps, burst, then each reward with its ribbon,
// name and XP coins, the counter, and a You got summary at the end.
import { StageVec } from './stagevec.js';
import { FX } from './fx.js';
import { S, SYN, play, music, preload, buzz } from './sound.js';
import { wait, reduced } from './motion.js';
import { CHEST_LOOK } from './artvec.js';

export const TIER_UI = {
  bronze: { label: 'Bronze', color: '#a4521f', glow: '#ffb469' },
  silver: { label: 'Silver', color: '#5f7086', glow: '#cfe7ff' },
  gold: { label: 'Gold', color: '#b8790a', glow: '#ffe27a' },
  diamond: { label: 'Diamond', color: '#1f7fc4', glow: '#9ef0ff' },
  master: { label: 'Master', color: '#b4410f', glow: '#ff8a2a' },
  legend: { label: 'Legend', color: '#6d3fd6', glow: '#ffd0f4' },
  monthly: { label: 'Monthly', color: '#0e8c73', glow: '#ffc4cc' },
  special: { label: 'Special', color: '#6d2fd6', glow: '#e2d4ff' },
  secret: { label: 'Secret', color: '#6b4fd6', glow: '#efe6ff' },
};

// Real badges from lib/badges.ts, one per chest. Three-reward chests add two
// lower ones first, so the best comes last.
const R = {
  finisher: { tier: 'bronze', shape: 'shield', icon: 'target', name: 'Finisher', what: 'Training days: 1', xp: 25 },
  pushup: { tier: 'bronze', shape: 'hex', icon: 'chevrons', name: 'Pushup Path', what: 'Push-up reps logged: 100', xp: 25 },
  engine: { tier: 'bronze', shape: 'circle', icon: 'timer', name: 'Engine', what: 'Workout cardio minutes: 60', xp: 25 },
  iron: { tier: 'silver', shape: 'hex', icon: 'dumbbell', name: 'Iron Mover', what: 'Sets logged: 250', xp: 50 },
  record: { tier: 'gold', shape: 'diamond', icon: 'trophy', name: 'Record Breaker', what: 'Personal records: 15', xp: 100 },
  runner: { tier: 'diamond', shape: 'circle', icon: 'run', name: 'Road Runner', what: 'Run and treadmill km: 250 km', xp: 200 },
  streak: { tier: 'master', shape: 'square', icon: 'week', name: 'Streak Keeper', what: 'Weeks in a row with a training day: 26', xp: 350 },
  rounder: { tier: 'legend', shape: 'circle', icon: 'star', name: 'All-Rounder', what: 'Muscle groups trained: 16', xp: 500 },
  month: { tier: 'monthly', shape: 'square', icon: 'week', name: 'Month Clear', what: '25 training days, October 2026', xp: 75 },
  sweep: { tier: 'special', shape: 'star', icon: 'crown', name: 'Clean Sweep', what: 'Finish a routine with every planned set ticked', xp: 50 },
  rested: { tier: 'secret', shape: 'diamond', icon: 'moon', name: 'Well Rested', what: 'A secret badge. 1 of 9 found.', xp: 0 },
};
export const REWARDS = {
  bronze: [R.finisher],
  silver: [R.iron],
  gold: [R.record],
  diamond: [R.runner],
  master: [R.streak],
  legend: [R.rounder],
  monthly: [R.month],
  royal: [R.sweep],
  pillow: [R.rested],
};
// Two lower (or equal) badges to open first, never the same as the chest's own.
const ORDER = ['bronze', 'silver', 'gold', 'diamond', 'master', 'legend'];
const POOL = [R.pushup, R.engine, R.finisher, R.iron];
function extras(main) {
  const top = ORDER.indexOf(main.tier);
  const ok = POOL.filter((r) => r.name !== main.name && (top < 0 || ORDER.indexOf(r.tier) <= top));
  return ok.slice(-2);
}

const W = 390;
const H = 780;

class Cancelled extends Error {}

export class RewardStage {
  constructor(host) {
    this.host = host;
    host.innerHTML = `
      <div class="rstage" tabindex="0" role="button" aria-label="Reward stage. Tap to open the chest or to continue.">
        <div class="rs-shake">
          <div class="rs-bg"></div><div class="rs-rays"></div>
          <div class="rs-art"></div>
          <canvas class="rs-fx" aria-hidden="true"></canvas>
          <div class="rs-top"><span class="rs-lv">12</span><div class="rs-bar"><i></i><b></b></div><span class="rs-xpn">1,240 / 1,500 XP</span></div>
          <div class="rs-name"></div>
          <div class="rs-count" aria-hidden="true"><b>1</b></div>
          <div class="rs-hint">Tap to open<span class="rs-pips"></span></div>
          <div class="rs-card"><div class="rs-rib"><span></span></div><h3></h3><p></p><div class="rs-xp"></div></div>
          <div class="rs-cont">Tap to continue</div>
          <div class="rs-got"><div class="rs-gotrib"><h3>You got</h3></div><div class="rs-grid"></div><div class="rs-tot"></div><button type="button" class="btn bp rs-done">Continue</button></div>
          <div class="rs-flash"></div>
        </div>
      </div>`;
    this.root = host.querySelector('.rstage');
    this.q = (s) => this.root.querySelector(s);
    this.fx = new FX(this.q('.rs-fx'), W, H);
    this.vec = new StageVec(this.q('.rs-art'), { w: W, h: H });
    this.three = null;
    this.mode = 'vec';
    this.key = 'gold';
    this.count = 1;
    this.run = 0;
    this.tapWaiter = null;
    // A tap that comes while a reward is still building is kept for "continue",
    // so a quick tapper is never ignored. Taps during the drop are not kept.
    const tap = () => {
      if (this.tapWaiter) this.tapWaiter();
      else if (this.keepTap) this.kept = true;
    };
    this.root.addEventListener('pointerdown', (e) => {
      if (e.target.closest('.rs-done')) return;
      tap();
    });
    this.root.addEventListener('keydown', (e) => {
      if ((e.key === 'Enter' || e.key === ' ') && !e.target.closest('.rs-done')) {
        e.preventDefault();
        tap();
      }
    });
    this.q('.rs-done').addEventListener('click', () => this.finish());
    this.xp = 1240;
    this.need = 1500;
    this.level = 12;
    this.fit();
    new ResizeObserver(() => this.fit()).observe(host);
  }

  fit() {
    const k = this.host.clientWidth / W;
    this.root.style.transform = `scale(${k})`;
    this.host.style.height = `${H * k}px`;
  }

  async setMode(mode) {
    this.stopRun();
    this.mode = mode;
    if (mode === 'three' && !this.three) {
      try {
        const { Stage3D } = await import('./stage3d.js');
        this.three = new Stage3D(this.q('.rs-art'), { w: W, h: H });
      } catch (e) {
        this.mode = 'vec';
        this.host.dispatchEvent(new CustomEvent('no3d', { detail: String(e) }));
      }
    }
    this.q('.rs-vec').style.display = this.mode === 'vec' ? '' : 'none';
    // the 3D scene only draws while it is the one on show
    if (this.three && this.mode === 'vec') this.three.stop();
    if (this.three) this.three.el.style.display = this.mode === 'three' ? '' : 'none';
    this.idle();
  }

  get art() {
    return this.mode === 'three' && this.three ? this.three : this.vec;
  }

  stopRun() {
    this.run++;
    this.tapWaiter = null;
    this.keepTap = this.kept = false;
    S.stopMusic(0.3);
    this.fx.clear();
  }

  // The stage at rest: the chest waiting, before anyone presses Play.
  idle() {
    this.reset();
    this.art.setChest(this.key);
    this.art.rest();
    this.q('.rs-name').textContent = '';
  }

  reset() {
    for (const s of ['.rs-hint', '.rs-card', '.rs-cont', '.rs-got', '.rs-count', '.rs-name']) this.q(s).classList.remove('on');
    this.root.classList.remove('lit', 'open');
    this.root.style.setProperty('--glow', TIER_UI[this.tierOf(this.key)].glow);
    this.xp = 1240;
    this.need = 1500;
    this.level = 12;
    this.drawBar(false);
  }

  tierOf(key) {
    return { royal: 'special', pillow: 'secret', monthly: 'monthly' }[key] || key;
  }

  drawBar(glint = true) {
    this.q('.rs-lv').textContent = this.level;
    this.q('.rs-bar i').style.width = `${Math.min(100, (this.xp / this.need) * 100)}%`;
    this.q('.rs-xpn').textContent = `${this.xp.toLocaleString('en-US')} / ${this.need.toLocaleString('en-US')} XP`;
    if (glint) {
      const b = this.q('.rs-bar b');
      b.classList.remove('go');
      void b.offsetWidth;
      b.classList.add('go');
    }
  }

  waitTap() {
    if (this.kept) {
      this.kept = false;
      return Promise.resolve();
    }
    return new Promise((ok) => {
      this.tapWaiter = () => {
        this.tapWaiter = null;
        S.ensure();
        ok();
      };
    });
  }

  shake(px = 6, ms = 180) {
    if (reduced()) return;
    this.q('.rs-shake').animate(
      [{ transform: 'translate(0,0)' }, { transform: `translate(${px}px,${-px / 2}px)` }, { transform: `translate(${-px}px,${px / 3}px)` }, { transform: `translate(${px / 2}px,0)` }, { transform: 'translate(0,0)' }],
      { duration: ms },
    );
  }

  flash() {
    if (reduced()) return;
    this.q('.rs-flash').animate([{ opacity: 0 }, { opacity: 0.85 }, { opacity: 0 }], { duration: 260, easing: 'ease-out' });
  }

  async play() {
    this.stopRun();
    const token = this.run;
    const live = () => {
      if (token !== this.run) throw new Cancelled();
    };
    const pause = async (ms) => {
      await wait(ms);
      live();
    };
    try {
      S.ensure();
      preload(['land', 'crack', 'burst', 'whoosh', 'stamp', 'sparkle', 'coins', 'm-chest']);
      this.reset();
      const key = this.key;
      const look = CHEST_LOOK[key];
      const taps = look.taps;
      const list = this.count > 1 ? [...extras(REWARDS[key][0]), ...REWARDS[key]] : REWARDS[key];
      const art = this.art;
      art.setChest(key);
      const name = this.q('.rs-name');
      name.textContent = `${look.name} chest`;
      name.classList.add('on');
      music('m-chest');
      await pause(260);
      await art.drop(() => {
        play('land');
        buzz('heavy', this.host);
        const p = art.chestPoint(0.1);
        this.fx.dust(p.x, (art === this.vec ? 650 : p.y) - 4);
        this.shake(7);
      });
      live();
      const cnt = this.q('.rs-count');
      cnt.querySelector('b').textContent = list.length;
      cnt.classList.add('on');
      const hint = this.q('.rs-hint');
      const pips = this.q('.rs-pips');
      pips.innerHTML = taps > 1 ? Array.from({ length: taps }, () => '<i></i>').join('') : '';
      hint.classList.add('on');
      for (let i = 0; i < taps; i++) {
        await this.waitTap();
        live();
        play('crack', { rate: 1 + i * 0.09 });
        buzz('medium', this.host);
        pips.children[i]?.classList.add('on');
        this.root.classList.add('lit');
        this.root.style.setProperty('--lit', String((i + 1) / taps));
        const p = art.chestPoint(1);
        this.fx.stars(p.x, (art === this.vec ? 530 : p.y), 6 + i * 4, TIER_UI[this.tierOf(key)].glow, 90);
        await art.tap(i, taps);
        live();
      }
      hint.classList.remove('on');
      name.classList.remove('on');
      if (taps >= 3) {
        play('riser');
        await art.charge(reduced() ? 10 : 800);
        live();
      }
      // the burst: light first, then sound and the lid, then sparks
      this.flash();
      play('burst');
      SYN.sparkle();
      S.duck();
      buzz('reward', this.host);
      this.root.classList.add('open');
      const bp = art.chestPoint(1);
      this.fx.burst(bp.x, art === this.vec ? 540 : bp.y, TIER_UI[this.tierOf(key)].glow, 70);
      this.shake(9, 220);
      await art.burst();
      live();
      if (art.sink) await art.sink();
      const got = [];
      for (let k = 0; k < list.length; k++) {
        const r = list[k];
        const ui = TIER_UI[r.tier];
        cnt.querySelector('b').textContent = list.length - k;
        play('whoosh');
        await art.medalOut(r);
        live();
        play('stamp');
        buzz('medium', this.host);
        this.keepTap = true;
        this.kept = false;
        const mp = art.medalPoint();
        this.fx.ring(mp.x, mp.y, ui.glow, 40, 190, 0.55, 8);
        this.fx.stars(mp.x, mp.y, 18, '#fff6c4', 150);
        await this.showCard(r, live);
        // the counter drops; at zero it goes away rather than showing 0
        if (list.length - k - 1 > 0) {
          cnt.querySelector('b').textContent = list.length - k - 1;
          cnt.animate([{ transform: 'scale(1.35)' }, { transform: 'scale(1)' }], { duration: 260, easing: 'cubic-bezier(.2,1.6,.4,1)' });
        } else cnt.classList.remove('on');
        got.push(r);
        this.q('.rs-cont').classList.add('on');
        await this.waitTap();
        live();
        this.keepTap = false;
        this.q('.rs-cont').classList.remove('on');
        this.q('.rs-card').classList.remove('on');
        if (list.length > 1) {
          SYN.swish();
          await art.medalAway();
          live();
        }
      }
      cnt.classList.remove('on');
      if (list.length > 1) {
        await art.hideChest();
        live();
        await this.youGot(got, live);
      } else {
        this.q('.rs-got').classList.remove('on');
        this.finish();
      }
    } catch (e) {
      if (!(e instanceof Cancelled)) throw e;
    }
  }

  async showCard(r, live) {
    const ui = TIER_UI[r.tier];
    const card = this.q('.rs-card');
    card.style.setProperty('--tc', ui.color);
    card.querySelector('.rs-rib span').textContent = ui.label;
    card.querySelector('h3').textContent = r.name;
    card.querySelector('p').textContent = r.what;
    const xpEl = card.querySelector('.rs-xp');
    xpEl.textContent = r.xp ? `+${r.xp} XP` : 'No XP for secrets';
    xpEl.classList.toggle('none', !r.xp);
    card.classList.remove('on');
    void card.offsetWidth;
    card.classList.add('on');
    play('sparkle');
    await wait(reduced() ? 0 : 700);
    live();
    if (!r.xp) return;
    // coins fly from the +XP chip to the bar; each one adds its share
    const n = Math.min(8, Math.max(4, Math.round(r.xp / 25)));
    const per = r.xp / n;
    const from = { x: W / 2, y: 548 };
    const to = { x: 200, y: 36 };
    play('coins');
    await new Promise((ok) => {
      if (reduced()) {
        this.addXp(r.xp);
        return ok();
      }
      let landed = 0;
      this.fx.coins(from, to, n, (i) => {
        SYN.coin(1 + i * 0.06);
        this.addXp(per);
        if (++landed === n) ok();
      });
    });
    live();
  }

  addXp(v) {
    this.xp = Math.round(this.xp + v);
    if (this.xp >= this.need) {
      this.xp -= this.need;
      this.level += 1;
      this.need = 1600;
      this.fx.ring(40, 36, '#fff28f', 6, 60, 0.5, 5);
      SYN.fanfare();
    }
    this.drawBar(true);
  }

  async youGot(got, live) {
    const box = this.q('.rs-got');
    const grid = box.querySelector('.rs-grid');
    const art = this.art;
    grid.innerHTML = got
      .map((r) => {
        const img = art.medalImage(r);
        const pic = img.startsWith('<svg') ? img : `<img src="${img}" alt="">`;
        return `<div class="rs-gi" style="--tc:${TIER_UI[r.tier].color}">${pic}<b>${r.name}</b><small>${r.xp ? `+${r.xp} XP` : 'Secret'}</small></div>`;
      })
      .join('');
    const tot = box.querySelector('.rs-tot');
    const total = got.reduce((a, r) => a + r.xp, 0);
    tot.textContent = '';
    box.querySelector('.rs-done').classList.remove('on');
    box.classList.add('on');
    const items = [...grid.children];
    for (let i = 0; i < items.length; i++) {
      await wait(110);
      live();
      items[i].classList.add('on');
      SYN.pop();
    }
    // the total counts up, then the button arrives last
    const steps = 12;
    for (let i = 1; i <= steps; i++) {
      await wait(reduced() ? 0 : 35);
      live();
      tot.textContent = `+${Math.round((total * i) / steps)} XP in total`;
      if (i % 3 === 0) SYN.roll(1 + i / 20);
    }
    await wait(500);
    live();
    box.querySelector('.rs-done').classList.add('on');
  }

  finish() {
    S.stopMusic(0.8);
    this.host.dispatchEvent(new CustomEvent('done'));
  }
}
