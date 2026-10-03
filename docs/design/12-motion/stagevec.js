// Board 12, direction A on the reward stage: the vector chest and medal, with
// the same steps as the 3D stage (drop, idle, tap, burst, medal out, away).
import { chestSVG, medalSVG, CHEST_LOOK } from './artvec.js';
import { springFrames, SPRINGS, EASE, reduced } from './motion.js';

const done = (a) => (reduced() ? Promise.resolve() : a.finished.catch(() => {}));
const anim = (el, frames, opts) => {
  const a = el.animate(frames, { fill: 'forwards', ...opts, duration: reduced() ? 1 : opts.duration });
  return done(a);
};

export class StageVec {
  constructor(host, { w = 390, h = 780 } = {}) {
    this.w = w;
    this.h = h;
    this.el = document.createElement('div');
    this.el.className = 'rs-vec';
    this.el.innerHTML = '<div class="rv-chest"><div class="rv-squash"><div class="rv-breathe"></div></div></div><div class="rv-medal"><div class="rv-flip"></div></div>';
    host.appendChild(this.el);
    this.box = this.el.querySelector('.rv-chest');
    this.sq = this.el.querySelector('.rv-squash');
    this.br = this.el.querySelector('.rv-breathe');
    this.mBox = this.el.querySelector('.rv-medal');
    this.mFlip = this.el.querySelector('.rv-flip');
  }

  start() {}
  stop() {}

  setChest(key) {
    this.key = key;
    this.br.innerHTML = chestSVG(key, { size: 250 });
    this.svg = this.br.querySelector('svg');
    this.lid = this.svg.querySelector('.lid');
    this.seam = this.svg.querySelector('.seam');
    this.inside = this.svg.querySelector('.inside');
    this.box.getAnimations().forEach((a) => a.cancel());
    this.sq.getAnimations().forEach((a) => a.cancel());
    this.box.classList.remove('idle');
    this.box.style.opacity = '0';
    this.mBox.style.opacity = '0';
    this.mBox.classList.remove('float');
    this.mFlip.innerHTML = '';
  }

  // centre of the chest and of the medal, in stage pixels
  chestPoint() {
    return { x: this.w / 2, y: 560 };
  }
  medalPoint() {
    return { x: this.w / 2, y: 300 };
  }

  rest() {
    this.box.style.opacity = '1';
    this.box.classList.add('idle');
  }

  async drop(onLand) {
    this.box.style.opacity = '1';
    await anim(this.box, [{ transform: 'translateY(-760px)' }, { transform: 'translateY(0)' }], { duration: 430, easing: EASE.in });
    onLand?.();
    const { frames, ms } = springFrames(1, 0, (v) => `scale(${1 + 0.16 * v}, ${1 - 0.24 * v})`, SPRINGS.bouncy);
    await anim(this.sq, frames, { duration: ms, easing: 'linear' });
    this.box.classList.add('idle');
  }

  async tap(i, n) {
    this.seam.style.transition = 'opacity .2s';
    this.seam.style.opacity = String(Math.min(1, (i + 1) / n));
    const k = i % 2 ? -1 : 1;
    anim(this.lid, [{ transform: 'translateY(0)' }, { transform: `translateY(-${8 + i * 4}px)` }, { transform: 'translateY(0)' }], { duration: 240, easing: EASE.out });
    await anim(
      this.sq,
      [
        { transform: 'rotate(0) scale(1,1)' },
        { transform: `rotate(${6 * k}deg) scale(1.08,.9)`, offset: 0.2 },
        { transform: `rotate(${-5 * k}deg) scale(.97,1.05)`, offset: 0.45 },
        { transform: `rotate(${3 * k}deg) scale(1.02,.98)`, offset: 0.7 },
        { transform: 'rotate(0) scale(1,1)' },
      ],
      { duration: 380, easing: 'linear' },
    );
  }

  async charge(ms) {
    this.seam.style.opacity = '1';
    const f = [];
    for (let i = 0; i <= 20; i++) f.push({ transform: `translateX(${(i % 2 ? 1 : -1) * (1 + i * 0.15)}px)` });
    await anim(this.sq, f, { duration: ms, easing: 'linear' });
  }

  async burst() {
    this.box.classList.remove('idle');
    this.inside.style.transition = 'opacity .25s';
    this.inside.style.opacity = '1';
    this.seam.style.opacity = '0';
    if (CHEST_LOOK[this.key].body === 'pillow') {
      await anim(this.sq, [{ transform: 'scale(1,1)' }, { transform: 'scale(1.22,.7)', offset: 0.35 }, { transform: 'scale(.94,1.08)', offset: 0.7 }, { transform: 'scale(1,1)' }], { duration: 480, easing: 'linear' });
      return;
    }
    await anim(
      this.lid,
      [
        { transform: 'translate(0,0) rotate(0)', opacity: 1 },
        { transform: 'translate(0,-120px) rotate(-14deg)', opacity: 1, offset: 0.55 },
        { transform: 'translate(-8px,-170px) rotate(-22deg)', opacity: 0 },
      ],
      { duration: 560, easing: EASE.out },
    );
  }

  async medalOut(r) {
    this.mFlip.innerHTML = medalSVG(r.tier, r.shape, r.icon, { size: 190, text: r.text || null });
    this.mBox.style.opacity = '1';
    this.mBox.classList.remove('float');
    await anim(
      this.mFlip,
      [
        { transform: 'translateY(250px) scale(.25) rotateY(1440deg)' },
        { transform: 'translateY(-14px) scale(1.08) rotateY(180deg)', offset: 0.72 },
        { transform: 'translateY(0) scale(1) rotateY(0deg)' },
      ],
      { duration: 820, easing: 'cubic-bezier(.15,.7,.3,1)' },
    );
    this.mBox.classList.add('float');
  }

  async medalAway() {
    this.mBox.classList.remove('float');
    await anim(this.mFlip, [{ transform: 'translate(0,0) scale(1)' }, { transform: 'translate(-300px,90px) scale(.3)' }], { duration: 320, easing: EASE.in });
    this.mBox.style.opacity = '0';
    this.mFlip.innerHTML = '';
  }

  sink() {
    return anim(this.box, [{ transform: 'translateY(0) scale(1)' }, { transform: 'translateY(84px) scale(.84)' }], { duration: 360, easing: EASE.out });
  }

  hideChest() {
    this.box.classList.remove('idle');
    return anim(this.box, [{ transform: 'translateY(84px) scale(.84)', opacity: 1 }, { transform: 'translateY(420px) scale(.84)', opacity: 0 }], { duration: 260, easing: EASE.in });
  }

  medalImage(r) {
    return medalSVG(r.tier, r.shape, r.icon, { size: 84, text: r.text || null });
  }
}
