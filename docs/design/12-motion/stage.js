// Board 12: the reward stage (round 2). One sequence for every chest: drop, wait,
// taps, burst; then each badge swirls out, gets its card, and pays its XP into the
// level bar with the XP-lines sound. Earlier badges fly into a tray at the top,
// which becomes the summary at the end. Also the full flows: Finish, Victory and
// the chest; and a rank up, whose new chest holds the title and profile frame.
import { StageVec } from './stagevec.js';
import { FX, shatterEl } from './fx.js';
import { S, SYN, SHIMMER, PICK, play, music, preload, buzz, setRewardKey } from './sound.js';
import { wait, reduced, TIME } from './motion.js';
import { CHEST_LOOK, shieldSVG, RANKS } from './artvec.js';

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

// Real badges from lib/badges.ts. `next` and `p` are the line to the next tier.
const R = {
  finisher: { tier: 'bronze', shape: 'shield', icon: 'target', name: 'Finisher', what: 'Training days: 1', xp: 25, next: 'Next: Silver at 10 training days', p: 0.1 },
  pushup: { tier: 'bronze', shape: 'hex', icon: 'chevrons', name: 'Pushup Path', what: 'Push-up reps logged: 100', xp: 25, next: 'Next: Silver at 500 reps', p: 0.2 },
  engine: { tier: 'bronze', shape: 'circle', icon: 'timer', name: 'Engine', what: 'Workout cardio minutes: 60', xp: 25, next: 'Next: Silver at 300 minutes', p: 0.2 },
  iron: { tier: 'silver', shape: 'hex', icon: 'dumbbell', name: 'Iron Mover', what: 'Sets logged: 250', xp: 50, next: 'Next: Gold at 500 sets', p: 0.5 },
  record: { tier: 'gold', shape: 'diamond', icon: 'trophy', name: 'Record Breaker', what: 'Personal records: 15', xp: 100, next: 'Next: Diamond at 30 records', p: 0.5 },
  runner: { tier: 'diamond', shape: 'circle', icon: 'run', name: 'Road Runner', what: 'Run and treadmill km: 250 km', xp: 200, next: 'Next: Master at 500 km', p: 0.5 },
  streak: { tier: 'master', shape: 'square', icon: 'week', name: 'Streak Keeper', what: 'Weeks in a row with a training day: 26', xp: 350, next: 'Next: Legend at 52 weeks', p: 0.5 },
  rounder: { tier: 'legend', shape: 'circle', icon: 'star', name: 'All-Rounder', what: 'Muscle groups trained: 16', xp: 500, next: 'The top tier', p: 1 },
  month: { tier: 'monthly', shape: 'square', icon: 'week', name: 'Month Clear', what: '25 training days in October 2026', xp: 75, next: 'A new monthly badge every month', p: 1, month: 'OCT 26' },
  sweep: { tier: 'special', shape: 'star', icon: 'crown', name: 'Clean Sweep', what: 'Finish a routine with every planned set ticked', xp: 50, next: 'A special badge', p: 1 },
  rested: { tier: 'secret', shape: 'diamond', icon: 'moon', name: 'Well Rested', what: 'A secret badge', xp: 0, next: '1 of 9 secrets found', p: 0.11 },
};
// The rule (decided in round 2): your rank decides your chest.
export const RANK_CHEST = { E: 'bronze', D: 'silver', C: 'gold', B: 'diamond', A: 'master', S: 'legend' };
const RANK_TITLE = { E: 'E-Rank Hunter', D: 'D-Rank Hunter', C: 'C-Rank Hunter', B: 'B-Rank Hunter', A: 'A-Rank Hunter', S: 'S-Rank Hunter' };
const NEXT_RANK = { E: ['D', 5], D: ['C', 10], C: ['B', 15], B: ['A', 20], A: ['S', 30] };
// the avatar in its rank frame, as the app draws it (components/ui/Avatar.tsx), with the shield on its corner
function frameSVG(rank, size = 170) {
  const r = RANKS[rank];
  const id = 'fr' + rank + Math.random().toString(36).slice(2, 7);
  return `<svg viewBox="0 0 120 120" width="${size}" height="${size}" aria-hidden="true"><defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${r.rim[1]}"/><stop offset=".5" stop-color="${r.rim[4]}"/><stop offset="1" stop-color="${r.rim[1]}"/></linearGradient><linearGradient id="${id}a" x1="0" y1="0" x2=".6" y2="1"><stop offset="0" stop-color="#18a58a"/><stop offset="1" stop-color="#0b6b5a"/></linearGradient></defs><circle cx="56" cy="56" r="50" fill="url(#${id})"/><circle cx="56" cy="56" r="42" fill="url(#${id}a)"/><circle cx="56" cy="46" r="13" fill="#e9fff8"/><path d="M33 84a23 23 0 0 1 46 0z" fill="#e9fff8"/><g transform="translate(78 76) scale(.3)">${shieldSVG(rank, null, { size: 120 }).replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '')}</g></svg>`;
}
function rankItems(rank) {
  const [nr, nl] = NEXT_RANK[rank] || [null, null];
  const ui = { color: RANKS[rank].rim[4], glow: RANKS[rank].rim[1] };
  const next = nr ? `Next: ${RANK_TITLE[nr]} at level ${nl}` : 'The top rank';
  return [
    { kind: 'title', ui, label: 'New title', name: RANK_TITLE[rank], what: 'Shown on your profile and your share card', next, p: 0, xpText: 'Unlocked', html: shieldSVG(rank, null, { size: 170 }) },
    { kind: 'frame', ui, label: 'Profile frame', name: `${rank}-Rank frame`, what: 'Your photo in the colours of your rank', next, p: 0, xpText: 'Unlocked', html: frameSVG(rank, 170) },
  ];
}

export const REWARDS = { bronze: [R.finisher], silver: [R.iron], gold: [R.record], diamond: [R.runner], master: [R.streak], legend: [R.rounder], monthly: [R.month], royal: [R.sweep], pillow: [R.rested] };

// Two lower (or equal) badges open first, never the chest's own.
const ORDER = ['bronze', 'silver', 'gold', 'diamond', 'master', 'legend'];
const POOL = [R.pushup, R.engine, R.finisher, R.iron];
function extras(main) {
  const top = ORDER.indexOf(main.tier);
  return POOL.filter((r) => r.name !== main.name && (top < 0 || ORDER.indexOf(r.tier) <= top)).slice(-2);
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
          <div class="rs-tray" aria-hidden="true"></div>
          <div class="rs-name"><b></b><small></small></div>
          <div class="rs-count" aria-hidden="true"><b>1</b></div>
          <div class="rs-hint">Tap to open<span class="rs-pips"></span></div>
          <div class="rs-card"><div class="rc-band"><span></span></div><h3></h3><p class="rc-what"></p><div class="rc-next"><span></span><div class="rc-bar"><i></i></div></div><div class="rs-xp"></div></div>
          <div class="rs-cont">Tap to continue</div>
          <div class="rs-got"><div class="rs-grid"></div><div class="rs-tot"></div></div>
          <button type="button" class="btn bp rs-done">Continue</button>
          <div class="rs-item" aria-hidden="true"></div>
          <div class="rs-fly" aria-hidden="true"></div>
          <div class="rs-flash"></div>
          <div class="rs-workout" aria-hidden="true">
            <div class="rw-head"><b>Push day</b><span class="rw-time">52:10</span></div>
            ${['Bench press', 'Overhead press', 'Incline dumbbell press']
              .map((n) => `<div class="rw-row"><span>${n}</span><small>3 of 3 sets</small><i>&#10003;</i></div>`)
              .join('')}
            <button type="button" class="btn bp rw-finish">Finish workout<i class="charge"></i></button>
            <div class="rw-dim"></div>
          </div>
          <div class="rs-rankup" aria-hidden="true"><div class="ru-pillar"></div><h3>RANK UP!</h3><div class="ru-sh"></div><div class="ru-title"><span></span></div></div>
          <div class="rs-victory" aria-hidden="true">
            <div class="rv-hero"><div class="rays"></div><h3>VICTORY!</h3><p>Push day complete</p><div class="rv-xp">+<b>0</b> XP</div><div class="rv-crowns"></div></div>
            <ul class="rv-lines"></ul>
          </div>
        </div>
      </div>`;
    this.root = host.querySelector('.rstage');
    this.q = (s) => this.root.querySelector(s);
    this.fx = new FX(this.q('.rs-fx'), W, H);
    this.vec = new StageVec(this.q('.rs-art'), { w: W, h: H });
    this.vec.el.style.display = 'none';
    this.three = null;
    this.mode = 'vec';
    this.key = 'gold';
    this.variant = {};
    this.count = 1;
    this.run = 0;
    this.tapWaiter = null;
    // a tap while a reward is still building is kept for "continue"; taps during the drop are not
    const tap = () => {
      if (this.tapWaiter) this.tapWaiter();
      else if (this.keepTap) this.kept = true;
    };
    this.root.addEventListener('pointerdown', (e) => {
      if (e.target.closest('.rs-done,.rw-finish')) return;
      tap();
    });
    this.root.addEventListener('keydown', (e) => {
      if ((e.key === 'Enter' || e.key === ' ') && !e.target.closest('.rs-done,.rw-finish')) {
        e.preventDefault();
        tap();
      }
    });
    this.q('.rs-done').addEventListener('click', () => this.finish());
    this.fit();
    new ResizeObserver(() => this.fit()).observe(host);
  }

  fit() {
    const k = this.host.clientWidth / W;
    this.root.style.transform = `scale(${k})`;
    this.host.style.height = `${H * k}px`;
  }

  // The stage runs in 3D; the vector stage is only a fallback when WebGL fails.
  async start3d() {
    if (this.three || this.no3d) return;
    try {
      const { Stage3D } = await import('./stage3d.js');
      this.three = new Stage3D(this.q('.rs-art'), { w: W, h: H });
      this.mode = 'three';
    } catch (e) {
      this.no3d = true;
      this.mode = 'vec';
      this.vec.el.style.display = '';
      this.host.dispatchEvent(new CustomEvent('no3d', { detail: String(e) }));
    }
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

  idle() {
    this.reset();
    this.art.setChest(this.key, this.variant[this.key]);
    this.art.rest();
  }

  reset() {
    for (const s of ['.rs-hint', '.rs-card', '.rs-cont', '.rs-got', '.rs-count', '.rs-name', '.rs-done', '.rs-tray', '.rs-workout', '.rs-victory', '.rs-rankup']) this.q(s).classList.remove('on', 'dim', 'won', 'out', 'beam');
    this.q('.rs-fly').innerHTML = '';
    this.q('.rs-item').innerHTML = '';
    this.q('.rs-tray').innerHTML = '';
    this.root.classList.remove('lit', 'open');
    this.root.style.setProperty('--glow', TIER_UI[this.tierOf(this.key)].glow);
    this.xp = 1240;
    this.shown = 1240;
    this.need = 1500;
    this.level = 12;
    this.drawBar(false);
  }

  tierOf(key) {
    return { royal: 'special', pillow: 'secret', monthly: 'monthly' }[key] || key;
  }

  drawBar(glint = true) {
    this.q('.rs-lv').textContent = this.level;
    this.q('.rs-bar i').style.width = `${Math.min(100, (this.shown / this.need) * 100)}%`;
    this.q('.rs-xpn').textContent = `${Math.round(this.shown).toLocaleString('en-US')} / ${this.need.toLocaleString('en-US')} XP`;
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

  flash(o = 0.85, ms = 260) {
    if (reduced()) return;
    this.q('.rs-flash').animate([{ opacity: 0 }, { opacity: o }, { opacity: 0 }], { duration: ms, easing: 'ease-out' });
  }

  placeCounter() {
    const p = this.art.chestCorner ? this.art.chestCorner() : { x: 290, y: 430 };
    const c = this.q('.rs-count');
    c.style.left = `${p.x - 22}px`;
    c.style.top = `${p.y - 22}px`;
  }

  // ---------- the full flows: Finish, Victory, then the chest (or a rank up first) ----------
  async playFinish({ rankUp = null } = {}) {
    this.stopRun();
    const token = this.run;
    const live = () => {
      if (token !== this.run) throw new Cancelled();
    };
    try {
      S.ensure();
      preload(['riser']);
      S.load(PICK['m-victory'] || 'm-victory-a');
      this.reset();
      if (this.three) this.three.chest.visible = this.three.shadow.visible = false;
      const wk = this.q('.rs-workout');
      wk.classList.add('on');
      const btn = this.q('.rw-finish');
      await new Promise((ok) => {
        btn.onclick = () => {
          btn.onclick = null;
          ok();
        };
      });
      live();
      S.ensure();
      // a short, quiet drum roll into a rise (round 1 was too much)
      SYN.drumroll(0.9);
      play('riser');
      btn.classList.add('charging');
      wk.classList.add('dim');
      buzz('medium', this.host);
      await wait(900);
      live();
      btn.classList.remove('charging');
      // Victory, as the app shows it
      const v = this.q('.rs-victory');
      v.classList.add('on');
      wk.classList.remove('on', 'dim');
      music('m-victory');
      buzz('heavy', this.host);
      const hero = v.querySelector('h3');
      hero.animate([{ transform: 'scale(2.4)', opacity: 0 }, { transform: 'scale(.95)', opacity: 1, offset: 0.7 }, { transform: 'scale(1)' }], { duration: 420, easing: 'cubic-bezier(.2,1.6,.4,1)' });
      this.fx.stars(W / 2, 150, 18, '#fff28f', 160);
      const lines = [
        ['12 sets done', 60],
        ['Beat last time', 10],
        ['Workout finished', 50],
        ['New badge', 50],
      ];
      const ul = v.querySelector('.rv-lines');
      ul.innerHTML = '';
      const tot = v.querySelector('.rv-xp b');
      const crowns = v.querySelector('.rv-crowns');
      crowns.innerHTML = '';
      let sum = 0;
      for (let i = 0; i < 3; i++) {
        const c = document.createElement('span');
        c.className = 'cr';
        c.innerHTML = '<svg viewBox="0 0 24 24" width="30" height="30"><path d="M4 18h16M5 18L3.5 8l5 3.5L12 5l3.5 6.5 5-3.5L19 18" fill="#ffd34d" stroke="#c7870a" stroke-width="2" stroke-linejoin="round"/></svg>';
        crowns.append(c);
        c.animate([{ transform: 'translateY(-40px)', opacity: 0 }, { transform: 'translateY(4px)', opacity: 1, offset: 0.7 }, { transform: 'translateY(0)' }], { duration: 360, easing: 'ease-out' });
        SYN.clink(1 + i * 0.07);
        await wait(180);
        live();
      }
      for (const [label, xp] of lines) {
        const li = document.createElement('li');
        li.innerHTML = `<span>${label}</span><b>+${xp}</b>`;
        ul.append(li);
        li.animate([{ transform: 'translateX(-24px)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 220, easing: 'ease-out' });
        const from = sum;
        sum += xp;
        SYN.xp(4);
        for (let k = 1; k <= 6; k++) {
          await wait(20);
          tot.textContent = String(Math.round(from + ((sum - from) * k) / 6));
        }
        await wait(110);
        live();
      }
      // the app holds Victory for 1.8 s before any reward moment (VICTORY_HOLD_MS)
      await wait(1800);
      live();
      v.classList.add('out');
      await wait(300);
      live();
      v.classList.remove('on', 'out');
      if (rankUp) {
        await this.rankUpMoment(rankUp, live);
        await this.play({ keepRun: true, token, rankUp });
      } else await this.play({ keepRun: true, token });
    } catch (e) {
      if (!(e instanceof Cancelled)) throw e;
    }
  }

  // The rank up, as card 33 shows it: the old shield breaks, a pillar of light, the
  // new shield rises and its title unrolls. Then the new rank's chest drops.
  async rankUpMoment(rank, live) {
    const prev = { D: 'E', C: 'D', B: 'C', A: 'B', S: 'A' }[rank] || 'E';
    const box = this.q('.rs-rankup');
    const sh = box.querySelector('.ru-sh');
    const title = box.querySelector('.ru-title');
    title.querySelector('span').textContent = RANK_TITLE[rank];
    title.classList.remove('on');
    sh.innerHTML = shieldSVG(prev, null, { size: 170 });
    sh.style.opacity = '1';
    box.classList.add('on');
    if (this.three) this.three.chest.visible = this.three.shadow.visible = false;
    await wait(500);
    live();
    if (!reduced()) await sh.animate(Array.from({ length: 12 }, (_, i) => ({ transform: `translate(calc(-50% + ${(i % 2 ? 1 : -1) * (1 + i * 0.4)}px),0)` })), { duration: 480, easing: 'linear' }).finished.catch(() => {});
    live();
    this.flash(0.6, 180);
    play('shatter');
    buzz('heavy', this.host);
    shatterEl(this.q('.rs-shake'), sh, 10);
    this.fx.shards(W / 2, 300, RANKS[prev].face, 10);
    await wait(380);
    live();
    SYN.riser(0.6);
    box.classList.add('beam');
    await wait(420);
    live();
    music('m-rank');
    sh.innerHTML = shieldSVG(rank, null, { size: 190 });
    sh.style.opacity = '1';
    sh.animate([{ transform: 'translate(-50%,120px) scale(.6)', opacity: 0 }, { transform: 'translate(-50%,-8px) scale(1.06)', opacity: 1, offset: 0.7 }, { transform: 'translate(-50%,0) scale(1)', opacity: 1 }], { duration: 700, easing: 'cubic-bezier(.2,.8,.2,1)' });
    await wait(700);
    live();
    buzz('reward', this.host);
    this.fx.stars(W / 2, 300, 22, RANKS[rank].rim[1], 160);
    title.classList.add('on');
    await wait(1700);
    live();
    box.classList.add('out');
    await wait(300);
    live();
    box.classList.remove('on', 'out', 'beam');
  }

  // A title or a frame comes out like a medal, drawn in the page instead of in 3D.
  async itemOut(r, hooks = {}) {
    const el = this.q('.rs-item');
    const mp = this.art.medalPoint ? this.art.medalPoint() : { x: W / 2, y: 232 };
    const cp = this.art.chestPoint(1);
    el.innerHTML = r.html;
    el.style.left = `${mp.x - 85}px`;
    el.style.top = `${mp.y - 85}px`;
    const dy = cp.y - mp.y;
    hooks.onRise?.();
    await el.animate(
      [
        { transform: `translate(0,${dy}px) scale(.2) rotateY(0deg)`, opacity: 0.4, filter: 'brightness(.3)' },
        { transform: `translate(40px,${dy * 0.4}px) scale(.45) rotateY(540deg)`, opacity: 1, filter: 'brightness(.4)', offset: 0.6 },
        { transform: 'translate(0,-20px) scale(.6) rotateY(1080deg)', opacity: 1, filter: 'brightness(.5)' },
      ],
      { duration: 700, easing: 'linear', fill: 'forwards' },
    ).finished.catch(() => {});
    await wait(260);
    hooks.onFlip?.();
    await el.animate(
      [
        { transform: 'translate(0,-20px) scale(.6) rotateY(1080deg)', filter: 'brightness(.5)' },
        { transform: 'translate(0,-6px) scale(1.12) rotateY(1440deg)', filter: 'brightness(1.4)', offset: 0.55 },
        { transform: 'translate(0,0) scale(1) rotateY(1440deg)', filter: 'brightness(1)' },
      ],
      { duration: 520, easing: 'ease-out', fill: 'forwards' },
    ).finished.catch(() => {});
  }

  // ---------- the chest ----------
  async play({ keepRun = false, token: given, rankUp = null } = {}) {
    if (!keepRun) this.stopRun();
    const token = given ?? this.run;
    const live = () => {
      if (token !== this.run) throw new Cancelled();
    };
    const pause = async (ms) => {
      await wait(ms);
      live();
    };
    try {
      S.ensure();
      setRewardKey();
      preload(['land', 'crack', 'burst', 'whoosh', 'reveal', 'sparkle', 'm-chest']);
      if (!keepRun) this.reset();
      const key = rankUp ? RANK_CHEST[rankUp] : this.key;
      const look = CHEST_LOOK[key];
      const taps = look.taps;
      const main = REWARDS[key][0];
      const badges = this.count > 1 ? [...extras(main), main] : [main];
      badges.forEach((r) => (r.variant = this.medalVariant?.[r.tier]));
      // a rank up's chest opens with the title and the frame, then the day's badges
      const list = rankUp ? [...rankItems(rankUp), ...badges] : badges;
      const art = this.art;
      art.setChest(key, this.variant[key]);
      const name = this.q('.rs-name');
      name.querySelector('b').textContent = `${look.name} chest`;
      const rankOf = Object.keys(RANK_CHEST).find((k) => RANK_CHEST[k] === key);
      name.querySelector('small').textContent = rankUp ? `New at ${rankUp} rank` : rankOf ? `${rankOf}-Rank chest` : '';
      name.classList.add('on');
      music('m-chest');
      await pause(260);
      await art.drop(() => {
        play('land');
        buzz('heavy', this.host);
        const p = art.chestPoint(0.05);
        this.fx.dust(p.x, p.y);
        this.shake(7);
      });
      live();
      const cnt = this.q('.rs-count');
      cnt.querySelector('b').textContent = list.length;
      this.placeCounter();
      cnt.classList.add('on');
      const hint = this.q('.rs-hint');
      const pips = this.q('.rs-pips');
      pips.innerHTML = taps > 1 ? Array.from({ length: taps }, () => '<i></i>').join('') : '';
      hint.classList.add('on');
      for (let i = 0; i < taps; i++) {
        await this.waitTap();
        live();
        play('crack', { rate: 1 + i * 0.09 });
        SHIMMER.lift(i);
        buzz('medium', this.host);
        pips.children[i]?.classList.add('on');
        this.root.classList.add('lit');
        this.root.style.setProperty('--lit', String((i + 1) / taps));
        const p = art.chestPoint(1);
        this.fx.stars(p.x, p.y, 6 + i * 4, TIER_UI[this.tierOf(key)].glow, 90);
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
      this.flash();
      play('burst');
      S.duck();
      buzz('reward', this.host);
      this.root.classList.add('open');
      const bp = art.chestPoint(1);
      this.fx.burst(bp.x, bp.y, TIER_UI[this.tierOf(key)].glow, 70);
      this.shake(9, 220);
      await art.burst();
      live();
      if (art.settle) await art.settle();
      live();
      this.placeCounter();
      // the tray: one slot per badge when there are several
      const tray = this.q('.rs-tray');
      if (list.length > 1) {
        tray.innerHTML = list.map(() => '<i></i>').join('');
        tray.classList.add('on');
      }
      for (let k = 0; k < list.length; k++) {
        const r = list[k];
        const ui = r.ui || TIER_UI[r.tier];
        const cp = art.chestPoint(1);
        this.fx.spiral(cp.x, cp.y, ui.glow);
        const out = r.html ? (rr, hooks) => this.itemOut(rr, hooks) : (rr, hooks) => art.medalOut(rr, hooks);
        await out(r, {
          onRise: () => {
            play('whoosh');
            // the counter is what is left in the chest: it drops as the medal leaves
            const left = list.length - k - 1;
            if (left > 0) {
              cnt.querySelector('b').textContent = left;
              cnt.animate([{ transform: 'scale(1.35)' }, { transform: 'scale(1)' }], { duration: 260, easing: 'cubic-bezier(.2,1.6,.4,1)' });
            } else cnt.classList.remove('on');
          },
          onFlip: () => {
            this.flash(0.55, 200);
            play('reveal');
            buzz('medium', this.host);
            const mp = art.medalPoint();
            this.fx.ring(mp.x, mp.y, ui.glow, 40, 200, 0.55, 8);
            this.fx.stars(mp.x, mp.y, 22, '#fff6c4', 170);
          },
        });
        live();
        this.keepTap = true;
        this.kept = false;
        await this.showCard(r, live);
        if (list.length === 1) break;
        this.q('.rs-cont').classList.add('on');
        await this.waitTap();
        live();
        this.keepTap = false;
        this.q('.rs-cont').classList.remove('on');
        this.q('.rs-card').classList.remove('on');
        await this.toTray(r, k);
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
      this.q('.rs-done').classList.add('on');
    } catch (e) {
      if (!(e instanceof Cancelled)) throw e;
    }
  }

  async showCard(r, live) {
    const ui = r.ui || TIER_UI[r.tier];
    const card = this.q('.rs-card');
    card.style.setProperty('--tc', ui.color);
    card.querySelector('.rc-band span').textContent = r.label || ui.label;
    card.querySelector('h3').textContent = r.name;
    card.querySelector('.rc-what').textContent = r.what;
    card.querySelector('.rc-next span').textContent = r.next;
    const bar = card.querySelector('.rc-bar i');
    bar.style.width = '0%';
    const xpEl = card.querySelector('.rs-xp');
    xpEl.textContent = r.xpText || (r.xp ? `+${r.xp} XP` : 'No XP for secrets');
    xpEl.classList.toggle('none', !r.xp && !r.xpText);
    xpEl.classList.toggle('unl', Boolean(r.xpText));
    card.classList.remove('on');
    void card.offsetWidth;
    card.classList.add('on');
    play('sparkle');
    setTimeout(() => (bar.style.width = `${Math.round(r.p * 100)}%`), 420 / TIME.speed);
    await wait(reduced() ? 0 : 820);
    live();
    if (!r.xp) return;
    // coins from the +XP pill to the level bar; the number counts up as they land
    const n = Math.min(8, Math.max(4, Math.round(r.xp / 25)));
    const per = r.xp / n;
    const xr = xpEl.getBoundingClientRect();
    const sr = this.root.getBoundingClientRect();
    const k = sr.width / W;
    const from = { x: (xr.left - sr.left + xr.width / 2) / k, y: (xr.top - sr.top + xr.height / 2) / k };
    const to = { x: 200, y: 32 };
    await new Promise((ok) => {
      if (reduced()) {
        this.addXp(r.xp);
        return ok();
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

  // The level bar's number rolls up to its new value with the XP-lines ticks.
  addXp(v) {
    this.xp += v;
    const from = this.shown;
    const to = this.xp;
    const t0 = performance.now();
    const dur = 260 / TIME.speed;
    let ticks = 0;
    const step = (now) => {
      const p = Math.min(1, (now - t0) / dur);
      this.shown = from + (to - from) * p;
      if (this.shown >= this.need) {
        this.xp -= this.need;
        this.shown -= this.need;
        this.level += 1;
        this.need = 1600;
        this.fx.ring(40, 32, '#fff28f', 6, 60, 0.5, 5);
        SYN.fanfare();
        this.drawBar(true);
        return;
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

  // The medal leaves the stage as a picture and flies into its tray slot.
  async toTray(r, k) {
    const art = this.art;
    const slot = this.q('.rs-tray').children[k];
    const itemEl = this.q('.rs-item');
    const mb = r.html ? { x: parseFloat(itemEl.style.left) + 85, y: parseFloat(itemEl.style.top) + 85, size: 170 } : art.medalBox ? art.medalBox() : { x: W / 2, y: 300, size: 190 };
    // the picture is framed with a little room, so it starts a touch larger than the medal
    const box = { ...mb, size: r.html ? 170 : mb.size * 1.1 };
    const url = r.html || art.medalImage(r);
    const img = url.startsWith('<svg') ? document.createElement('div') : new Image();
    if (img.tagName === 'DIV') img.innerHTML = url;
    else img.src = url;
    img.className = 'rs-flyer';
    img.style.cssText = `left:${box.x - box.size / 2}px;top:${box.y - box.size / 2}px;width:${box.size}px;height:${box.size}px`;
    this.q('.rs-fly').append(img);
    if (r.html) itemEl.innerHTML = '';
    else art.removeMedal ? art.removeMedal() : art.medalAway?.();
    const sr = slot.getBoundingClientRect();
    const rr = this.root.getBoundingClientRect();
    const kk = rr.width / W;
    const tx = (sr.left - rr.left + sr.width / 2) / kk - box.x;
    const ty = (sr.top - rr.top + sr.height / 2) / kk - box.y;
    const sc = (sr.width / kk) / box.size;
    SYN.swirl();
    await img.animate([{ transform: 'translate(0,0) scale(1)' }, { transform: `translate(${tx * 0.5}px,${ty * 0.5 - 30}px) scale(${(1 + sc) / 2}) rotate(-12deg)`, offset: 0.55 }, { transform: `translate(${tx}px,${ty}px) scale(${sc})` }], { duration: 480, easing: 'cubic-bezier(.5,0,.3,1)', fill: 'forwards' }).finished.catch(() => {});
    img.remove();
    slot.innerHTML = url.startsWith('<svg') ? url : `<img src="${url}" alt="">`;
    slot.classList.add('got');
    slot.animate([{ transform: 'scale(1.4)' }, { transform: 'scale(1)' }], { duration: 260, easing: 'cubic-bezier(.2,1.6,.4,1)' });
    SYN.clink(1.1 + k * 0.08);
  }

  // The tray grows into the summary: each badge moves from its slot to its tile.
  async summary(list, live) {
    const box = this.q('.rs-got');
    const grid = box.querySelector('.rs-grid');
    const tray = this.q('.rs-tray');
    const slots = [...tray.children];
    grid.innerHTML = list
      .map((r, i) => `<div class="rs-gi" style="--tc:${(r.ui || TIER_UI[r.tier]).color}">${slots[i].innerHTML}<b>${r.name}</b><small>${r.xpText || (r.xp ? `+${r.xp} XP` : 'Secret')}</small></div>`)
      .join('');
    const tot = box.querySelector('.rs-tot');
    const total = list.reduce((a, r) => a + (r.xp || 0), 0);
    tot.textContent = '';
    box.classList.add('on');
    const rr = this.root.getBoundingClientRect();
    const items = [...grid.children];
    items.forEach((it, i) => {
      const a = slots[i].getBoundingClientRect();
      const b = it.querySelector('img,svg').getBoundingClientRect();
      const dx = (a.left + a.width / 2 - (b.left + b.width / 2)) / (rr.width / W);
      const dy = (a.top + a.height / 2 - (b.top + b.height / 2)) / (rr.width / W);
      it.animate([{ transform: `translate(${dx}px,${dy}px) scale(${a.width / b.width})`, opacity: 1 }, { transform: 'none', opacity: 1 }], { duration: 520, delay: i * 70, easing: 'cubic-bezier(.2,1.3,.4,1)', fill: 'backwards' });
    });
    tray.classList.remove('on');
    items.forEach((it, i) => setTimeout(() => it.classList.add('on'), (200 + i * 70) / TIME.speed));
    await wait(650);
    live();
    const steps = 12;
    for (let i = 1; i <= steps; i++) {
      await wait(reduced() ? 0 : 35);
      live();
      tot.textContent = `+${Math.round((total * i) / steps)} XP`;
      if (i % 2 === 0) SYN.roll(1 + i / 20);
    }
    SYN.coin(1.2);
    // Continue comes last
    await wait(500);
    live();
  }

  finish() {
    S.stopMusic(0.8);
    this.host.dispatchEvent(new CustomEvent('done'));
  }
}
