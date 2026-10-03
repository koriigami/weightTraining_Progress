// Board 12: the 34 interactions. Each card has a live demo built from the app's
// real components (sizes from app/globals.css), its timing, sound and haptic.
import { S, SYN, PICK, play, music, buzz, preload } from './sound.js';
import { springFrames, SPRINGS, EASE, DUR, wait, reduced } from './motion.js';
import { FX } from './fx.js';
import { chestSVG, medalSVG, shieldSVG } from './artvec.js';

const h = (html) => {
  const t = document.createElement('template');
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
};
const anim = (el, frames, opts) => {
  const a = el.animate(frames, { fill: 'forwards', ...opts, duration: reduced() ? 1 : opts.duration });
  return a.finished.catch(() => {});
};
const spring = (el, from, to, make, s = SPRINGS.bouncy) => {
  const { frames, ms } = springFrames(from, to, make, s);
  return anim(el, frames, { duration: ms, easing: 'linear' });
};
// pressable: squish on press, spring back on release
function pressable(el, onPress, { depth = 3, sound = 'tap', haptic = 'light' } = {}) {
  let down = false;
  el.addEventListener('pointerdown', () => {
    down = true;
    S.ensure();
    el.classList.add('pr');
    anim(el, [{ transform: 'translateY(0) scale(1)' }, { transform: `translateY(${depth}px) scale(.97)` }], { duration: DUR.press, easing: EASE.out });
    play(sound);
    buzz(haptic, el);
  });
  const up = () => {
    if (!down) return;
    down = false;
    el.classList.remove('pr');
    spring(el, 1, 0, (v) => `translateY(${depth * v}px) scale(${1 - 0.03 * v})`, SPRINGS.bouncy);
    onPress?.();
  };
  el.addEventListener('pointerup', up);
  el.addEventListener('pointerleave', () => {
    if (!down) return;
    down = false;
    el.classList.remove('pr');
    spring(el, 1, 0, (v) => `translateY(${depth * v}px) scale(${1 - 0.03 * v})`, SPRINGS.bouncy);
  });
  el.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      el.dispatchEvent(new PointerEvent('pointerdown'));
      setTimeout(() => el.dispatchEvent(new PointerEvent('pointerup')), 90);
    }
  });
}
const fxFor = (el, w, h2) => {
  const c = h('<canvas class="cfx" aria-hidden="true"></canvas>');
  el.appendChild(c);
  return new FX(c, w, h2);
};
const ICON = {
  home: '<path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
  list: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
  trophy: '<path d="M8 4h8v5a4 4 0 0 1-8 0zM8 6H4.5a3 3 0 0 0 3.5 4M16 6h3.5a3 3 0 0 1-3.5 4M12 13v4M8.5 20h7M10 17h4"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  back: '<path d="M15 5l-7 7 7 7"/>',
  x: '<path d="M6 6l12 12M18 6L6 18"/>',
  crown: '<path d="M4 18h16M5 18L3.5 8l5 3.5L12 5l3.5 6.5 5-3.5L19 18"/>',
  flame: '<path d="M12 3c.5 3 4 4.6 4 9a4 4 0 0 1-8 0c0-2 .8-3.2 2-4.2.1 1.8 1 2.8 2 2.8 0-2.6-.8-4.8 0-7.6z"/>',
  up: '<path d="M12 19V5M5 12l7-7 7 7"/>',
  music: '<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>',
};
const svg = (name, size = 20, sw = 2.2) => `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON[name]}</svg>`;
const playBtn = (label = 'Play') => h(`<button type="button" class="btn bs sm play">${label}</button>`);

export const CARDS = [
  // ---------------- taps and controls ----------------
  {
    g: 'Taps and controls',
    t: 'Green button press',
    when: 'Any green button',
    motion: 'Down 3 px and 3% smaller in 80 ms. On release it springs back with a small overshoot (bouncy spring).',
    sound: 'Soft pop, quiet tap bus',
    haptic: 'Light',
    where: 'Start workout, Finish, Save, every green button',
    build(el) {
      const b = h('<button type="button" class="btn bp">Start workout</button>');
      el.append(b);
      pressable(b, null, { sound: 'tap' });
    },
  },
  {
    g: 'Taps and controls',
    t: 'Gold button press',
    when: 'Any gold button',
    motion: 'The same squish as green, 3 px.',
    sound: 'Wooden tock',
    haptic: 'Light',
    where: 'Log workout, Edit, secondary actions',
    build(el) {
      const b = h('<button type="button" class="btn bs">Log workout</button>');
      el.append(b);
      pressable(b, null, { sound: 'tock' });
    },
  },
  {
    g: 'Taps and controls',
    t: 'Tab switch',
    when: 'Tapping a tab',
    motion: 'The pill slides to the new tab (snappy spring), the icon pops to 115% and settles.',
    sound: 'Tick',
    haptic: 'Light',
    where: 'The tab bar and the computer sidebar',
    build(el) {
      const bar = h(`<div class="mtabs"><span class="mpill"></span>${['home', 'list', 'trophy', 'user'].map((ic, i) => `<button type="button" class="mtab${i ? '' : ' on'}" aria-label="${['Home', 'Routines', 'Rank', 'Profile'][i]}"><span class="ic">${svg(ic, 22)}</span><span>${['Home', 'Routines', 'Rank', 'Profile'][i]}</span></button>`).join('')}</div>`);
      el.append(bar);
      const pill = bar.querySelector('.mpill');
      let cur = 0;
      const tabs = [...bar.querySelectorAll('.mtab')];
      const x = (i) => tabs[i].offsetLeft + tabs[i].offsetWidth / 2 - 26;
      requestAnimationFrame(() => (pill.style.transform = `translateX(${x(0)}px)`));
      tabs.forEach((t, i) =>
        t.addEventListener('click', () => {
          if (i === cur) return;
          const from = x(cur);
          const to = x(i);
          tabs[cur].classList.remove('on');
          t.classList.add('on');
          cur = i;
          spring(pill, from, to, (v) => `translateX(${v}px)`, SPRINGS.snappy);
          spring(t.querySelector('.ic'), 1.15, 1, (v) => `scale(${v})`, SPRINGS.bouncy);
          play('tick');
          buzz('light', el);
        }),
      );
    },
  },
  {
    g: 'Taps and controls',
    t: 'Segmented control',
    when: 'Switching Week, Month, Year',
    motion: 'The green thumb slides under the labels (snappy spring); labels cross-fade in 160 ms.',
    sound: 'Tick',
    haptic: 'Light',
    where: 'Statistics, Calendar, Profile charts',
    build(el) {
      const seg = h('<div class="mseg"><span class="thumb"></span><button type="button" class="on">Week</button><button type="button">Month</button><button type="button">Year</button></div>');
      el.append(seg);
      const th = seg.querySelector('.thumb');
      const bs = [...seg.querySelectorAll('button')];
      let cur = 0;
      const place = (i) => bs[i].offsetLeft;
      requestAnimationFrame(() => {
        th.style.width = `${bs[0].offsetWidth}px`;
        th.style.transform = `translateX(${place(0)}px)`;
      });
      bs.forEach((b, i) =>
        b.addEventListener('click', () => {
          if (i === cur) return;
          spring(th, place(cur), place(i), (v) => `translateX(${v}px)`, SPRINGS.snappy);
          bs[cur].classList.remove('on');
          b.classList.add('on');
          cur = i;
          play('tick');
          buzz('light', el);
        }),
      );
    },
  },
  {
    g: 'Taps and controls',
    t: 'Switch',
    when: 'Turning a setting on or off',
    motion: 'The knob springs across with a small overshoot and stretches while it moves; the track fades to green in 160 ms.',
    sound: 'Two notes: up for on, down for off',
    haptic: 'Light',
    where: 'Settings: Sounds, Music, Haptics',
    build(el) {
      const row = h(`<div class="msetrow"><span class="ibox">${svg('music', 20)}</span><span>Music</span><button type="button" role="switch" aria-checked="true" class="mswitch" aria-label="Music"><i></i></button></div>`);
      el.append(row);
      const sw = row.querySelector('.mswitch');
      const knob = sw.querySelector('i');
      knob.style.transform = 'translateX(22px)';
      sw.addEventListener('click', () => {
        const on = sw.getAttribute('aria-checked') !== 'true';
        sw.setAttribute('aria-checked', String(on));
        const [a, b] = on ? [0, 22] : [22, 0];
        anim(knob, [{ width: '24px' }, { width: '32px', offset: 0.4 }, { width: '24px' }], { duration: 220, easing: EASE.out, fill: 'none' });
        spring(knob, a, b, (v) => `translateX(${v}px)`, SPRINGS.bouncy);
        play('switch', { on });
        buzz('light', el);
      });
    },
  },
  {
    g: 'Taps and controls',
    t: 'Chip select',
    when: 'Picking equipment or a filter',
    motion: 'The chip bounces to 110% and back (bouncy); the tick pops in.',
    sound: 'Pip, a step higher for each chip picked',
    haptic: 'Light',
    where: 'Setup questions, filters, Equipment',
    build(el) {
      const wrap = h(`<div class="mchips">${['Barbell', 'Dumbbells', 'Bands', 'Bodyweight'].map((c, i) => `<button type="button" class="chip${i === 1 ? ' on' : ''}" aria-pressed="${i === 1}">${c}</button>`).join('')}</div>`);
      el.append(wrap);
      wrap.querySelectorAll('.chip').forEach((c) =>
        c.addEventListener('click', () => {
          const on = c.getAttribute('aria-pressed') !== 'true';
          c.setAttribute('aria-pressed', String(on));
          c.classList.toggle('on', on);
          spring(c, on ? 1.1 : 0.94, 1, (v) => `scale(${v})`, SPRINGS.bouncy);
          const n = wrap.querySelectorAll('.chip.on').length;
          // the pitch climbs with each pick when the code-made pip is used
          if (on) PICK.chip === 'code' ? SYN.pip(1 + n * 0.12) : play('chip');
          else SYN.untick();
          buzz('light', el);
        }),
      );
    },
  },
  {
    g: 'Taps and controls',
    t: 'Stepper',
    when: 'Changing weight or reps with minus and plus',
    motion: 'The number rolls: the old one slides up and out, the new one in from below, 160 ms. Hold to repeat, faster the longer you hold.',
    sound: 'A tiny tick per step, pitch following the number',
    haptic: 'Light on each step (selection)',
    where: 'Set table, Log workout, goals',
    build(el) {
      const st = h(`<div class="mstep"><button type="button" class="sbtn" aria-label="Less">-</button><div class="sval"><span class="num">60</span></div><span class="sunit">kg</span><button type="button" class="sbtn" aria-label="More">+</button></div>`);
      el.append(st);
      let v = 60;
      const box = st.querySelector('.sval');
      const step = (d) => {
        v = Math.max(0, v + d);
        const old = box.querySelector('.num');
        const nw = h(`<span class="num">${v}</span>`);
        box.append(nw);
        const dir = d > 0 ? 1 : -1;
        anim(old, [{ transform: 'translateY(0)', opacity: 1 }, { transform: `translateY(${-100 * dir}%)`, opacity: 0 }], { duration: DUR.quick, easing: EASE.out }).then(() => old.remove());
        anim(nw, [{ transform: `translateY(${100 * dir}%)`, opacity: 0 }, { transform: 'translateY(0)', opacity: 1 }], { duration: DUR.quick, easing: EASE.out });
        SYN.roll(0.8 + (v % 20) / 25);
        buzz('light', el);
      };
      st.querySelectorAll('.sbtn').forEach((b, i) => {
        let t;
        let gap;
        const d = i ? 2.5 : -2.5;
        const go = () => {
          step(d);
          gap = Math.max(50, gap * 0.82);
          t = setTimeout(go, gap);
        };
        b.addEventListener('pointerdown', () => {
          S.ensure();
          step(d);
          gap = 160;
          t = setTimeout(go, 420);
        });
        const stop = () => clearTimeout(t);
        b.addEventListener('pointerup', stop);
        b.addEventListener('pointerleave', stop);
        b.addEventListener('keydown', (e) => e.key === 'Enter' && step(d));
      });
    },
  },
  {
    g: 'Taps and controls',
    t: 'Back and close',
    when: 'The back arrow or a close button',
    motion: 'The arrow nudges 4 px the way it goes and springs back; the close cross turns a quarter as the sheet leaves.',
    sound: 'Soft swish',
    haptic: 'None',
    where: 'Every page header, sheets, modals',
    build(el) {
      const hd = h(`<div class="mhead"><button type="button" class="ib back" aria-label="Back">${svg('back', 22, 2.6)}</button><b>Bench press</b><button type="button" class="ib close" aria-label="Close">${svg('x', 20, 2.6)}</button></div>`);
      el.append(hd);
      hd.querySelector('.back').addEventListener('click', (e) => {
        spring(e.currentTarget.firstElementChild, -6, 0, (v) => `translateX(${v}px)`, SPRINGS.bouncy);
        play('back');
      });
      hd.querySelector('.close').addEventListener('click', (e) => {
        const ic = e.currentTarget.firstElementChild;
        anim(ic, [{ transform: 'rotate(0)' }, { transform: 'rotate(90deg)' }], { duration: DUR.base, easing: EASE.out }).then(() => setTimeout(() => (ic.getAnimations().forEach((a) => a.cancel())), 400));
        play('back');
      });
    },
  },
  // ---------------- overlays ----------------
  {
    g: 'Overlays',
    t: 'Sheet in and out',
    when: 'Opening and closing a bottom sheet',
    motion: 'In: rises with a snappy spring, the scrim fades in 160 ms. Out: a real exit, 200 ms down and away. Today sheets vanish with no exit.',
    sound: 'Paper swish up on open, down on close',
    haptic: 'None',
    where: 'Add exercise, Log workout, every sheet',
    tall: true,
    build(el) {
      const area = h(`<div class="marea"><div class="mscrim"></div><div class="msheet" role="dialog" aria-label="Add exercise"><i class="grab"></i><b>Add exercise</b><p>Pick from your list or search.</p><button type="button" class="btn bs sm shut">Close</button></div></div>`);
      const open = playBtn('Open the sheet');
      el.append(area, open);
      const sh = area.querySelector('.msheet');
      const sc = area.querySelector('.mscrim');
      open.addEventListener('click', () => {
        area.classList.add('on');
        anim(sc, [{ opacity: 0 }, { opacity: 1 }], { duration: DUR.quick, easing: 'linear' });
        spring(sh, 100, 0, (v) => `translateY(${v}%)`, SPRINGS.snappy);
        play('sheet');
      });
      const close = () => {
        anim(sc, [{ opacity: 1 }, { opacity: 0 }], { duration: 200, easing: 'linear' });
        anim(sh, [{ transform: 'translateY(0)' }, { transform: 'translateY(105%)' }], { duration: 200, easing: EASE.in }).then(() => area.classList.remove('on'));
        SYN.swish();
      };
      area.querySelector('.shut').addEventListener('click', close);
      sc.addEventListener('click', close);
    },
  },
  {
    g: 'Overlays',
    t: 'Game modal pop',
    when: 'A game modal opens or closes',
    motion: 'In: from 70% with an overshoot (320 ms), the ribbon drops in 80 ms later. Out: to 92% and fades in 160 ms.',
    sound: 'Rising pop in, swish out',
    haptic: 'Light on open',
    where: "What's new, the guide's cards, confirmations",
    tall: true,
    build(el) {
      const area = h(`<div class="marea"><div class="mscrim"></div><div class="mgm" role="dialog" aria-label="Nice work"><div class="rib"><h4>Nice work</h4></div><p>You trained 3 days this week.</p><button type="button" class="btn bp sm shut">Got it</button></div></div>`);
      const open = playBtn('Open the modal');
      el.append(area, open);
      const m = area.querySelector('.mgm');
      const sc = area.querySelector('.mscrim');
      const rib = area.querySelector('.rib');
      open.addEventListener('click', () => {
        area.classList.add('on');
        anim(sc, [{ opacity: 0 }, { opacity: 1 }], { duration: DUR.quick, easing: 'linear' });
        anim(m, [{ transform: 'translate(-50%,-50%) scale(.7)', opacity: 0 }, { transform: 'translate(-50%,-50%) scale(1)', opacity: 1 }], { duration: 320, easing: EASE.over });
        anim(rib, [{ transform: 'translateY(-16px)', opacity: 0 }, { transform: 'translateY(0)', opacity: 1 }], { duration: 260, delay: 80, easing: EASE.over });
        SYN.pip(0.7);
        SYN.swishUp();
        buzz('light', el);
      });
      area.querySelector('.shut').addEventListener('click', () => {
        anim(sc, [{ opacity: 1 }, { opacity: 0 }], { duration: DUR.quick, easing: 'linear' });
        anim(m, [{ transform: 'translate(-50%,-50%) scale(1)', opacity: 1 }, { transform: 'translate(-50%,-50%) scale(.92)', opacity: 0 }], { duration: DUR.quick, easing: EASE.in }).then(() => area.classList.remove('on'));
        SYN.swish();
      });
    },
  },
  {
    g: 'Overlays',
    t: 'Toast',
    when: 'Something was saved, or could not be',
    motion: 'Rises 60 px with a bounce, stays 2 s, sinks 20 px and fades in 200 ms. An error shakes once sideways.',
    sound: 'A chime for good news, a low note for an error',
    haptic: 'Success, or the error pattern',
    where: 'Every save, sign-in problems, offline',
    tall: true,
    build(el) {
      const area = h('<div class="marea toastarea"><div class="mtoast"></div></div>');
      const row = h('<div class="pair"><button type="button" class="btn bs sm">Saved</button><button type="button" class="btn bs sm">Could not save</button></div>');
      el.append(area, row);
      const t = area.querySelector('.mtoast');
      let timer;
      const show = (ok) => {
        clearTimeout(timer);
        t.textContent = ok ? 'Workout saved' : 'Could not save. Check your connection.';
        t.classList.toggle('bad', !ok);
        t.style.opacity = '1';
        spring(t, 60, 0, (v) => `translate(-50%, ${v}px)`, SPRINGS.bouncy).then(() => {
          if (!ok) anim(t, [{ transform: 'translate(-50%,0)' }, { transform: 'translate(calc(-50% - 8px),0)' }, { transform: 'translate(calc(-50% + 8px),0)' }, { transform: 'translate(-50%,0)' }], { duration: 260, easing: 'linear' });
        });
        play(ok ? 'chime' : 'error');
        buzz(ok ? 'success' : 'error', el);
        timer = setTimeout(() => anim(t, [{ transform: 'translate(-50%,0)', opacity: 1 }, { transform: 'translate(-50%,20px)', opacity: 0 }], { duration: 200, easing: EASE.in }), 2000);
      };
      row.children[0].addEventListener('click', () => show(true));
      row.children[1].addEventListener('click', () => show(false));
    },
  },
  {
    g: 'Overlays',
    t: 'Page change',
    when: 'Moving to another tab',
    motion: 'The new page rises 8 px and fades in, 200 ms. Nothing slides sideways.',
    sound: 'None (the tab tick is enough)',
    haptic: 'None',
    where: 'Every tab and page',
    build(el) {
      const area = h('<div class="mpage"><div class="pg"></div></div>');
      const seg = h(`<div class="mtabs two"><button type="button" class="mtab on"><span class="ic">${svg('home', 22)}</span><span>Home</span></button><button type="button" class="mtab"><span class="ic">${svg('trophy', 22)}</span><span>Rank</span></button></div>`);
      el.append(area, seg);
      const pg = area.querySelector('.pg');
      const pages = {
        Home: '<div class="ln w8"></div><div class="ln w5"></div><div class="blk g"></div>',
        Rank: '<div class="ln w6"></div><div class="blk b"></div><div class="ln w9"></div>',
      };
      pg.innerHTML = pages.Home;
      seg.querySelectorAll('button').forEach((b) =>
        b.addEventListener('click', () => {
          seg.querySelectorAll('button').forEach((o) => o.classList.toggle('on', o === b));
          SYN.tick();
          pg.innerHTML = pages[b.textContent.trim()];
          anim(pg, [{ transform: 'translateY(8px)', opacity: 0 }, { transform: 'translateY(0)', opacity: 1 }], { duration: 200, easing: EASE.out });
        }),
      );
    },
  },
  // ---------------- training ----------------
  {
    g: 'Training',
    t: 'Set tick',
    when: 'Ticking a set',
    motion: 'The tick stamps from 135% (bouncy), an ink ring spreads, the row fills green from the left in 240 ms, and a +5 coin flies to the XP tile, which bumps.',
    sound: 'A rising pop: two steps higher for each set in a row',
    haptic: 'Light',
    where: 'The set table in a workout',
    tall: true,
    build(el) {
      const box = h(`<div class="mset"><div class="xpt">XP <b>+0</b></div>${[1, 2, 3]
        .map((n) => `<div class="srow"><span class="sno">${n}</span><span class="cell">60 kg</span><span class="cell">8</span><button type="button" class="tick" aria-label="Set ${n} done">${svg('check', 20, 3)}</button></div>`)
        .join('')}</div>`);
      el.append(box);
      const fx = fxFor(box, 300, 200);
      let xp = 0;
      let streak = 0;
      const tile = box.querySelector('.xpt b');
      box.querySelectorAll('.srow').forEach((row) => {
        const t = row.querySelector('.tick');
        t.addEventListener('click', () => {
          S.ensure();
          const done = !row.classList.contains('done');
          row.classList.toggle('done', done);
          if (done) {
            spring(t, 1.35, 1, (v) => `scale(${v})`, SPRINGS.bouncy);
            anim(row, [{ backgroundSize: '0% 100%' }, { backgroundSize: '100% 100%' }], { duration: DUR.base, easing: EASE.out, fill: 'none' });
            const r = t.getBoundingClientRect();
            const b = box.getBoundingClientRect();
            const k = 300 / b.width;
            const from = { x: (r.left - b.left + r.width / 2) * k, y: (r.top - b.top + r.height / 2) * k };
            fx.ring(from.x, from.y, '#2ba438', 10, 34, 0.35, 4);
            const tr = tile.getBoundingClientRect();
            fx.coins(from, { x: (tr.left - b.left + 10) * k, y: (tr.top - b.top + 8) * k }, 1, () => {
              xp += 5;
              tile.textContent = `+${xp}`;
              spring(tile, 1.3, 1, (v) => `scale(${v})`, SPRINGS.bouncy);
              SYN.coin(1.1);
            });
            SYN.set(streak++);
            buzz('light', el);
          } else {
            streak = 0;
            xp = Math.max(0, xp - 5);
            tile.textContent = `+${xp}`;
            anim(t, [{ transform: 'scale(1)' }, { transform: 'scale(.85)' }, { transform: 'scale(1)' }], { duration: DUR.quick, easing: EASE.out, fill: 'none' });
            SYN.untick();
          }
        });
      });
    },
  },
  {
    g: 'Training',
    t: 'Untick',
    when: 'Unticking a set by mistake',
    motion: 'The reverse, softer: the tick shrinks to 85% and back, green fades out in 160 ms, the XP tile counts down. No coin, no sparkle.',
    sound: 'A soft falling note',
    haptic: 'None',
    where: 'The set table',
    build(el) {
      const row = h(`<div class="mset one"><div class="srow done"><span class="sno">2</span><span class="cell">60 kg</span><span class="cell">8</span><button type="button" class="tick" aria-label="Set 2 done">${svg('check', 20, 3)}</button></div></div>`);
      el.append(row);
      const r = row.querySelector('.srow');
      r.querySelector('.tick').addEventListener('click', (e) => {
        const done = !r.classList.contains('done');
        r.classList.toggle('done', done);
        anim(e.currentTarget, [{ transform: 'scale(1)' }, { transform: 'scale(.85)' }, { transform: 'scale(1)' }], { duration: DUR.quick, easing: EASE.out, fill: 'none' });
        done ? SYN.set(0) : SYN.untick();
      });
    },
  },
  {
    g: 'Training',
    t: 'Exercise complete',
    when: 'The last set of an exercise is ticked',
    motion: 'A gold light runs once round the card edge (600 ms) and a green check badge pops onto the title.',
    sound: 'Chime',
    haptic: 'Success',
    where: 'Each exercise card in a workout',
    build(el) {
      const card = h(`<div class="mex"><div class="sweep"></div><div class="exh"><b>Bench press</b><span class="ok">${svg('check', 14, 3.4)}</span></div><small>3 of 3 sets</small></div>`);
      const b = playBtn('Tick the last set');
      el.append(card, b);
      b.addEventListener('click', () => {
        card.classList.remove('done');
        void card.offsetWidth;
        card.classList.add('done');
        spring(card.querySelector('.ok'), 0, 1, (v) => `scale(${v})`, SPRINGS.bouncy);
        play('chime');
        buzz('success', el);
      });
    },
  },
  {
    g: 'Training',
    t: 'Beat last time',
    when: 'A set beats the same set last time',
    motion: 'The chip slams in from 220% to 100% (bouncy spring), the card gives a 4 px jolt.',
    sound: 'Brass stab',
    haptic: 'Medium',
    where: 'Under the set, in the workout',
    build(el) {
      const card = h(`<div class="mex"><div class="exh"><b>Squat</b></div><small>Set 3: 82.5 kg x 6</small><div class="slot"></div></div>`);
      const b = playBtn('Lift more than last time');
      el.append(card, b);
      b.addEventListener('click', () => {
        const slot = card.querySelector('.slot');
        slot.innerHTML = `<span class="bchip up">${svg('up', 14, 3)} Beat last time +10</span>`;
        spring(slot.firstChild, 2.2, 1, (v) => `scale(${v})`, SPRINGS.bouncy);
        anim(card, [{ transform: 'translateY(0)' }, { transform: 'translateY(4px)' }, { transform: 'translateY(0)' }], { duration: 160, delay: 120, easing: 'linear', fill: 'none' });
        play('stab');
        buzz('medium', el);
      });
    },
  },
  {
    g: 'Training',
    t: 'New record',
    when: 'A personal record',
    motion: 'A crown chip slams in, a ring of stars bursts from it, and the crown glints.',
    sound: 'Short fanfare',
    haptic: 'Success',
    where: 'Under the set, then on Victory',
    build(el) {
      const card = h(`<div class="mex"><div class="exh"><b>Deadlift</b></div><small>Set 1: 120 kg x 5</small><div class="slot"></div></div>`);
      const b = playBtn('Set a record');
      el.append(card, b);
      const fx = fxFor(card, 300, 120);
      b.addEventListener('click', () => {
        const slot = card.querySelector('.slot');
        slot.innerHTML = `<span class="bchip rec">${svg('crown', 14, 2.6)} New record +25</span>`;
        spring(slot.firstChild, 2.2, 1, (v) => `scale(${v})`, SPRINGS.bouncy);
        setTimeout(() => {
          const c = slot.firstChild.getBoundingClientRect();
          const r = card.getBoundingClientRect();
          const k = 300 / r.width;
          fx.stars((c.left - r.left + c.width / 2) * k, (c.top - r.top + c.height / 2) * k, 16, '#ffd34d', 90);
        }, 120);
        play('record');
        buzz('success', el);
      });
    },
  },
  {
    g: 'Training',
    t: 'Lap',
    when: 'Tapping Lap during a run or ride',
    motion: 'The new lap drops into the list (8 px, 200 ms). When it is your fastest, its row flashes green once.',
    sound: 'Stopwatch click',
    haptic: 'Medium',
    where: 'The cardio timer',
    tall: true,
    build(el) {
      const box = h('<div class="mlap"><div class="clock">0:00.0</div><ol class="laps"></ol></div>');
      const row = h('<div class="pair"><button type="button" class="btn bp sm go">Start</button><button type="button" class="btn bs sm lap">Lap</button></div>');
      el.append(box, row);
      let t0 = 0;
      let raf = 0;
      let lastLap = 0;
      let best = Infinity;
      const clock = box.querySelector('.clock');
      const fmt = (ms) => `${Math.floor(ms / 60000)}:${String(Math.floor((ms / 1000) % 60)).padStart(2, '0')}.${Math.floor((ms / 100) % 10)}`;
      const tick = () => {
        // the board runs the clock at 30x so laps come quickly
        clock.textContent = fmt((performance.now() - t0) * 30);
        raf = requestAnimationFrame(tick);
      };
      row.querySelector('.go').addEventListener('click', (e) => {
        if (raf) {
          cancelAnimationFrame(raf);
          raf = 0;
          e.currentTarget.textContent = 'Start';
          return;
        }
        t0 = performance.now();
        lastLap = 0;
        best = Infinity;
        box.querySelector('.laps').innerHTML = '';
        e.currentTarget.textContent = 'Stop';
        tick();
      });
      row.querySelector('.lap').addEventListener('click', () => {
        if (!raf) return;
        const now = (performance.now() - t0) * 30;
        const lap = now - lastLap;
        lastLap = now;
        const ol = box.querySelector('.laps');
        const li = h(`<li><span>Lap ${ol.children.length + 1}</span><b>${fmt(lap)}</b></li>`);
        ol.prepend(li);
        anim(li, [{ transform: 'translateY(-8px)', opacity: 0 }, { transform: 'translateY(0)', opacity: 1 }], { duration: 200, easing: EASE.out });
        if (lap < best && ol.children.length > 1) anim(li, [{ background: '#bff0a8' }, { background: '#e9f8e1' }], { duration: 700, easing: 'ease-out' });
        best = Math.min(best, lap);
        play('lap');
        buzz('medium', el);
      });
    },
  },
  {
    g: 'Training',
    t: 'Training day reached',
    when: 'The workout passes 20 minutes',
    motion: 'A banner drops from the top with a bounce while coins rain down and bounce once; it leaves after 2 s.',
    sound: 'Coin shower',
    haptic: 'Success',
    where: 'During a workout, once a day',
    tall: true,
    build(el) {
      const area = h('<div class="marea sky"><div class="mclock">19:57</div><div class="mbanner">Training day! <b>+50 XP</b></div></div>');
      const b = playBtn('Pass 20 minutes');
      el.append(area, b);
      const fx = fxFor(area, 300, 200);
      const ban = area.querySelector('.mbanner');
      b.addEventListener('click', async () => {
        S.ensure();
        const ck = area.querySelector('.mclock');
        for (const t of ['19:58', '19:59', '20:00']) {
          await wait(260);
          ck.textContent = t;
          SYN.tick();
        }
        ban.style.opacity = '1';
        spring(ban, -80, 0, (v) => `translate(-50%, ${v}px)`, SPRINGS.bouncy);
        fx.shower(26);
        play('coins');
        setTimeout(() => SYN.coin(1.2), 300);
        buzz('success', el);
        setTimeout(() => anim(ban, [{ transform: 'translate(-50%,0)', opacity: 1 }, { transform: 'translate(-50%,-30px)', opacity: 0 }], { duration: 220, easing: EASE.in }), 2200);
      });
    },
  },
  {
    g: 'Training',
    t: 'Finish',
    when: 'Tapping Finish workout',
    motion: 'The screen dims and a ring charges round the button for 1.2 s, then the Victory stage takes over.',
    sound: 'Drum roll into a rise, then the Victory music',
    haptic: 'Heavy at the hand-over',
    where: 'The bottom of a workout',
    tall: true,
    build(el) {
      const area = h('<div class="marea fin"><div class="mclock">52:10</div><p class="fsub">5 exercises, 18 sets ticked</p><div class="dim"></div><div class="vic"><div class="rays"></div><h4>VICTORY</h4></div></div>');
      const b = h('<button type="button" class="btn bp finbtn">Finish workout<i class="charge"></i></button>');
      el.append(area, b);
      b.addEventListener('click', async () => {
        S.ensure();
        preload(['m-victory']);
        area.classList.remove('won');
        area.classList.add('on');
        SYN.drumroll(1.2);
        SYN.riser(1.2);
        b.classList.add('charging');
        await wait(1200);
        b.classList.remove('charging');
        area.classList.add('won');
        spring(area.querySelector('h4'), 2.4, 1, (v) => `scale(${v})`, SPRINGS.bouncy);
        music('m-victory');
        buzz('heavy', el);
        setTimeout(() => area.classList.remove('on', 'won'), 3200);
      });
    },
  },
  // ---------------- victory and progress ----------------
  {
    g: 'Victory and progress',
    t: 'Victory entrance',
    when: 'Victory opens after Finish',
    motion: 'The blue stage fades in, rays turn, the banner slams from 240% (bouncy), stars burst behind it.',
    sound: 'The Victory sting (music)',
    haptic: 'Heavy',
    where: 'Victory',
    tall: true,
    build(el) {
      const st = h('<div class="mstage"><div class="rays"></div><h4 class="vtitle">VICTORY</h4><p class="vsub">Push day, 52 minutes</p></div>');
      const b = playBtn();
      el.append(st, b);
      const fx = fxFor(st, 300, 220);
      b.addEventListener('click', () => {
        S.ensure();
        st.classList.remove('on');
        void st.offsetWidth;
        st.classList.add('on');
        spring(st.querySelector('.vtitle'), 2.4, 1, (v) => `translateX(-50%) scale(${v})`, SPRINGS.bouncy);
        setTimeout(() => fx.stars(150, 90, 22, '#fff28f', 160), 180);
        music('m-victory');
        buzz('heavy', el);
      });
    },
  },
  {
    g: 'Victory and progress',
    t: 'XP lines count in',
    when: 'The XP breakdown on Victory',
    motion: 'Each line slides in from the left 120 ms after the last; its chip flies into the total, which rolls up.',
    sound: 'A coin per line, ticks while the total rolls',
    haptic: 'Light per line',
    where: 'Victory',
    tall: true,
    build(el) {
      const box = h('<div class="mxp"><ul></ul><div class="tot">+<b>0</b> XP</div></div>');
      const b = playBtn();
      el.append(box, b);
      const lines = [
        ['Sets ticked, 12 x 5', 60],
        ['Beat last time', 10],
        ['New record', 25],
        ['Training day', 50],
      ];
      b.addEventListener('click', async () => {
        S.ensure();
        const ul = box.querySelector('ul');
        const tot = box.querySelector('.tot b');
        ul.innerHTML = '';
        let sum = 0;
        tot.textContent = '0';
        for (let i = 0; i < lines.length; i++) {
          const li = h(`<li><span>${lines[i][0]}</span><b>+${lines[i][1]}</b></li>`);
          ul.append(li);
          anim(li, [{ transform: 'translateX(-24px)', opacity: 0 }, { transform: 'translateX(0)', opacity: 1 }], { duration: 220, easing: EASE.out });
          SYN.coin(1 + i * 0.08);
          buzz('light', el);
          const start = sum;
          sum += lines[i][1];
          for (let k = 1; k <= 6; k++) {
            await wait(20);
            tot.textContent = String(Math.round(start + ((sum - start) * k) / 6));
            SYN.roll(1 + sum / 200);
          }
          await wait(120);
        }
        spring(box.querySelector('.tot'), 1.2, 1, (v) => `scale(${v})`, SPRINGS.bouncy);
      });
    },
  },
  {
    g: 'Victory and progress',
    t: 'XP bar fill',
    when: 'XP lands on the level bar',
    motion: 'The bar fills over 900 ms with a glint running along it; crossing a level it flashes white, the level number pops, and the rest fills from empty.',
    sound: 'Rising ticks while it fills, a short fanfare on the level',
    haptic: 'Medium on the level',
    where: 'Victory, the Home level bar',
    build(el) {
      const box = h('<div class="mbar"><span class="lv">12</span><div class="bar"><i></i><b></b></div></div>');
      const b = playBtn();
      el.append(box, b);
      const fill = box.querySelector('i');
      const lv = box.querySelector('.lv');
      b.addEventListener('click', async () => {
        S.ensure();
        lv.textContent = '12';
        let p = 0.72;
        fill.style.width = '72%';
        box.querySelector('.bar').classList.add('glint');
        const steps = 18;
        for (let i = 0; i < steps; i++) {
          await wait(30);
          p += 0.5 / steps;
          if (p >= 1) {
            p -= 1;
            fill.style.width = '100%';
            box.classList.add('flash');
            await wait(120);
            box.classList.remove('flash');
            lv.textContent = '13';
            spring(lv, 1.5, 1, (v) => `scale(${v})`, SPRINGS.bouncy);
            SYN.fanfare();
            buzz('medium', el);
          }
          fill.style.width = `${p * 100}%`;
          SYN.roll(0.8 + i / 20);
        }
        box.querySelector('.bar').classList.remove('glint');
      });
    },
  },
  {
    g: 'Victory and progress',
    t: 'Crowns landing',
    when: 'One crown per exercise finished, on Victory',
    motion: 'Each crown drops from 40 px above with a bounce, 180 ms apart, and glints as it lands.',
    sound: 'A clink per crown, each a little higher',
    haptic: 'Light per crown',
    where: 'Victory',
    build(el) {
      const row = h(`<div class="mcrowns">${Array.from({ length: 5 }, () => `<span class="cr">${svg('crown', 30, 2)}</span>`).join('')}</div>`);
      const b = playBtn();
      el.append(row, b);
      b.addEventListener('click', async () => {
        S.ensure();
        row.innerHTML = '';
        for (let i = 0; i < 5; i++) {
          const c = h(`<span class="cr">${svg('crown', 30, 2)}</span>`);
          row.append(c);
          spring(c, -40, 0, (v) => `translateY(${v}px)`, SPRINGS.bouncy);
          SYN.clink(1 + i * 0.07);
          buzz('light', el);
          await wait(180);
        }
      });
    },
  },
  {
    g: 'Victory and progress',
    t: 'How it felt',
    when: 'Picking a face after a workout',
    motion: 'The face squashes to 85% and bounces to 115%, then settles; the others dim a little.',
    sound: 'A note per face, low for Rough, high for Great',
    haptic: 'Light',
    where: 'Victory and the workout page',
    build(el) {
      const cols = ['#e5534b', '#f08a3c', '#e8b83a', '#7bc74d', '#2ba438'];
      const names = ['Rough', 'Tough', 'OK', 'Good', 'Great'];
      const mouths = ['M8 16q4-3 8 0', 'M8 15.5q4-1.5 8 0', 'M8 15h8', 'M8 14.5q4 2 8 0', 'M7.5 14q4.5 4 9 0'];
      const row = h(`<div class="mfaces">${cols.map((c, i) => `<button type="button" class="face" aria-label="${names[i]}" style="--c:${c}"><svg viewBox="0 0 24 24" width="34" height="34"><circle cx="12" cy="12" r="10" fill="var(--c)"/><circle cx="9" cy="10" r="1.3" fill="#2e1f0c"/><circle cx="15" cy="10" r="1.3" fill="#2e1f0c"/><path d="${mouths[i]}" stroke="#2e1f0c" stroke-width="1.6" fill="none" stroke-linecap="round"/></svg><small>${names[i]}</small></button>`).join('')}</div>`);
      el.append(row);
      row.querySelectorAll('.face').forEach((f, i) =>
        f.addEventListener('click', () => {
          row.querySelectorAll('.face').forEach((o) => o.classList.toggle('on', o === f));
          row.classList.add('picked');
          anim(f.querySelector('svg'), [{ transform: 'scale(1)' }, { transform: 'scale(.85)', offset: 0.25 }, { transform: 'scale(1.15)', offset: 0.6 }, { transform: 'scale(1)' }], { duration: 360, easing: 'ease-out', fill: 'none' });
          SYN.face(i);
          buzz('light', el);
        }),
      );
    },
  },
  {
    g: 'Victory and progress',
    t: 'Weekly goal met',
    when: 'The training day that meets the weekly goal',
    motion: "Today's tile flips green (rotate 180 degrees, 320 ms), the flame grows, and a Goal bonus stamp slams onto the card.",
    sound: 'A flip, then a stamp and a chime',
    haptic: 'Success',
    where: 'Home, This week; Victory',
    build(el) {
      const days = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
      const card = h(`<div class="mweek"><div class="wk">${days.map((d, i) => `<span class="dt${[0, 2, 3].includes(i) ? ' on' : ''}${i === 4 ? ' today' : ''}">${d}</span>`).join('')}</div><div class="wf"><span class="fl">${svg('flame', 22, 2)}</span><span class="gtxt">3 of 4 days</span></div><div class="stampslot"></div></div>`);
      const b = playBtn('Train today');
      el.append(card, b);
      b.addEventListener('click', async () => {
        S.ensure();
        const t = card.querySelector('.today');
        t.classList.remove('on');
        card.querySelector('.stampslot').innerHTML = '';
        card.querySelector('.gtxt').textContent = '3 of 4 days';
        await anim(t, [{ transform: 'rotateY(0)' }, { transform: 'rotateY(90deg)' }], { duration: 160, easing: EASE.in, fill: 'none' });
        t.classList.add('on');
        SYN.flip(4);
        await anim(t, [{ transform: 'rotateY(-90deg)' }, { transform: 'rotateY(0)' }], { duration: 160, easing: EASE.out, fill: 'none' });
        card.querySelector('.gtxt').textContent = '4 of 4 days, goal met';
        spring(card.querySelector('.fl'), 1.6, 1, (v) => `scale(${v})`, SPRINGS.bouncy);
        await wait(250);
        const s = h('<span class="gstamp">Goal bonus +60</span>');
        card.querySelector('.stampslot').append(s);
        spring(s, 2.2, 1, (v) => `scale(${v}) rotate(-6deg)`, SPRINGS.bouncy);
        play('stamp');
        setTimeout(() => play('chime'), 120);
        buzz('success', el);
      });
    },
  },
  // ---------------- rewards ----------------
  {
    g: 'Rewards',
    t: 'Chest drop-in',
    when: 'A reward moment starts',
    motion: 'The chest falls for 430 ms (speeding up), lands with a squash (124% wide, 76% tall) and springs back; dust puffs out and the screen shakes 7 px.',
    sound: 'Heavy thud, the chest music starts',
    haptic: 'Heavy',
    where: 'Every badge moment',
    tall: true,
    build(el) {
      const st = h('<div class="mstage"><div class="mchest"><div class="sq"></div></div></div>');
      const b = playBtn();
      el.append(st, b);
      const fx = fxFor(st, 300, 220);
      st.querySelector('.sq').innerHTML = chestSVG('silver', { size: 150 });
      b.addEventListener('click', async () => {
        S.ensure();
        preload(['land']);
        const box = st.querySelector('.mchest');
        await anim(box, [{ transform: 'translate(-50%,-300px)' }, { transform: 'translate(-50%,0)' }], { duration: 430, easing: EASE.in });
        play('land');
        buzz('heavy', el);
        fx.dust(150, 196, 14);
        anim(st, [{ transform: 'translate(0,0)' }, { transform: 'translate(5px,-3px)' }, { transform: 'translate(-5px,2px)' }, { transform: 'translate(0,0)' }], { duration: 160, easing: 'linear', fill: 'none' });
        spring(st.querySelector('.sq'), 1, 0, (v) => `scale(${1 + 0.24 * v}, ${1 - 0.24 * v})`, SPRINGS.bouncy);
      });
    },
  },
  {
    g: 'Rewards',
    t: 'Chest idle',
    when: 'The chest waits for a tap',
    motion: 'It breathes (3% over 1.2 s), glints twinkle on the trim, light leaks from the lid seam, and "Tap to open" bobs.',
    sound: 'The chest music only',
    haptic: 'None',
    where: 'Every badge moment',
    tall: true,
    build(el) {
      const st = h('<div class="mstage"><div class="mchest idle"><div class="sq"></div></div><div class="mhint">Tap to open</div></div>');
      el.append(st);
      st.querySelector('.sq').innerHTML = chestSVG('gold', { size: 150 });
      st.querySelector('.seam').style.opacity = '.8';
    },
  },
  {
    g: 'Rewards',
    t: 'Chest opens',
    when: 'Tapping the chest',
    motion: 'Each tap jolts and wobbles the chest and lets out more light. The last tap flashes the screen, the lid bursts off, a beam rises and sparks fly in the tier colour. Rare chests shiver for 0.8 s first.',
    sound: 'A latch per tap, each higher; a rise before rare chests; the lid burst with a sparkle',
    haptic: 'Medium per tap, the reward pattern on the burst',
    where: 'Every badge moment',
    tall: true,
    build(el, ctx) {
      const st = h('<div class="mstage tapme" role="button" tabindex="0" aria-label="Tap the chest to open it"><div class="rays"></div><div class="mchest idle"><div class="sq"></div></div><div class="mhint">Tap to open</div></div>');
      const b = h('<div class="pair"><button type="button" class="btn bs sm">Reset</button><button type="button" class="btn bs sm">Go to the stage</button></div>');
      el.append(st, b);
      const fx = fxFor(st, 300, 220);
      let taps = 0;
      const reset = () => {
        taps = 0;
        st.classList.remove('lit', 'open');
        st.querySelector('.sq').innerHTML = chestSVG('silver', { size: 150 });
        st.querySelector('.mhint').style.opacity = '1';
      };
      reset();
      const tap = async () => {
        S.ensure();
        if (taps >= 2) return;
        taps++;
        const sq = st.querySelector('.sq');
        play('crack', { rate: 1 + taps * 0.09 });
        buzz('medium', el);
        st.querySelector('.seam').style.opacity = String(taps / 2);
        st.classList.add('lit');
        anim(sq, [{ transform: 'rotate(0)' }, { transform: 'rotate(6deg) scale(1.08,.9)', offset: 0.2 }, { transform: 'rotate(-5deg)', offset: 0.45 }, { transform: 'rotate(3deg)', offset: 0.7 }, { transform: 'rotate(0)' }], { duration: 380, easing: 'linear', fill: 'none' });
        if (taps < 2) return;
        st.querySelector('.mhint').style.opacity = '0';
        await wait(380);
        st.classList.add('open');
        play('burst');
        SYN.sparkle();
        buzz('reward', el);
        fx.burst(150, 150, '#cfe7ff', 46, 0.6);
        anim(st.querySelector('.lid'), [{ transform: 'translate(0,0)', opacity: 1 }, { transform: 'translate(0,-110px) rotate(-16deg)', opacity: 0 }], { duration: 520, easing: EASE.out });
        st.querySelector('.inside').style.opacity = '1';
      };
      st.addEventListener('pointerdown', tap);
      st.addEventListener('keydown', (e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), tap()));
      b.children[0].addEventListener('click', reset);
      b.children[1].addEventListener('click', () => ctx.toStage());
    },
  },
  {
    g: 'Rewards',
    t: 'Badge reveal',
    when: 'A medal comes out of the chest',
    motion: 'The medal spins up out of the chest (two turns, 820 ms), overshoots and settles; a ring bursts; the tier ribbon unrolls, then the name, then +XP. The counter on the chest drops by one.',
    sound: 'Whoosh, the medal landing, a sparkle as the ribbon unrolls',
    haptic: 'Medium on landing',
    where: 'Every badge moment',
    tall: true,
    build(el) {
      const st = h('<div class="mstage"><div class="rays on"></div><div class="mmedal"></div><div class="mrib"><span>Gold</span></div><div class="mcount"><b>3</b></div></div>');
      const b = playBtn();
      el.append(st, b);
      const fx = fxFor(st, 300, 220);
      st.querySelector('.mmedal').innerHTML = medalSVG('gold', 'diamond', 'trophy', { size: 110 });
      st.querySelector('.mrib').classList.add('on');
      let left = 3;
      b.addEventListener('click', async () => {
        S.ensure();
        preload(['whoosh', 'stamp', 'sparkle']);
        const m = st.querySelector('.mmedal');
        m.innerHTML = medalSVG('gold', 'diamond', 'trophy', { size: 110 });
        st.querySelector('.mrib').classList.remove('on');
        play('whoosh');
        await anim(m, [{ transform: 'translate(-50%,120px) scale(.25) rotateY(1440deg)' }, { transform: 'translate(-50%,-8px) scale(1.08) rotateY(180deg)', offset: 0.72 }, { transform: 'translate(-50%,0) scale(1) rotateY(0)' }], { duration: 820, easing: 'cubic-bezier(.15,.7,.3,1)' });
        play('stamp');
        buzz('medium', el);
        fx.ring(150, 82, '#ffe27a', 20, 120, 0.5, 6);
        st.querySelector('.mrib').classList.add('on');
        play('sparkle');
        left = left > 1 ? left - 1 : 3;
        const c = st.querySelector('.mcount b');
        c.textContent = left;
        spring(c.parentElement, 1.35, 1, (v) => `scale(${v})`, SPRINGS.bouncy);
      });
    },
  },
  {
    g: 'Rewards',
    t: 'Tier up',
    when: 'A badge you have reaches its next tier',
    motion: 'The old medal shakes as cracks spread over it (500 ms), breaks into shards, and the new tier stamps down from 160% with a ring. "Bronze to Silver" sits under it.',
    sound: 'A crack, the shatter, then the medal landing',
    haptic: 'Heavy on the stamp',
    where: 'Badge moments for a family you already have',
    tall: true,
    build(el) {
      const st = h('<div class="mstage"><div class="mmedal"></div><svg class="cracks" viewBox="0 0 110 110" width="110" height="110" aria-hidden="true"><path d="M55 10 L50 34 L62 46 L48 64 L58 84 M50 34 L30 40 M62 46 L84 40 M48 64 L28 74" fill="none" stroke="#2e1f0c" stroke-width="2.4" stroke-linecap="round"/></svg><div class="tierto">Bronze <span>to</span> Silver</div></div>');
      const b = playBtn();
      el.append(st, b);
      const fx = fxFor(st, 300, 220);
      const m = st.querySelector('.mmedal');
      const cracks = st.querySelector('.cracks path');
      const reset = () => {
        cracks.getAnimations().forEach((a) => a.cancel());
        m.innerHTML = medalSVG('bronze', 'hex', 'dumbbell', { size: 110 });
        m.style.opacity = '1';
        cracks.style.strokeDasharray = '260';
        cracks.style.strokeDashoffset = '260';
        st.querySelector('.tierto').classList.remove('on');
      };
      reset();
      b.addEventListener('click', async () => {
        S.ensure();
        preload(['crack', 'shatter', 'stamp']);
        reset();
        play('crack');
        anim(cracks, [{ strokeDashoffset: 260 }, { strokeDashoffset: 0 }], { duration: 500, easing: 'linear' });
        await anim(m, Array.from({ length: 12 }, (_, i) => ({ transform: `translate(calc(-50% + ${(i % 2 ? 1 : -1) * (1 + i * 0.3)}px), 0)` })), { duration: 500, easing: 'linear', fill: 'none' });
        play('shatter');
        fx.shards(150, 82, ['#d98a4a', '#8c4a1f', '#ffd1a1'], 22);
        m.style.opacity = '0';
        cracks.getAnimations().forEach((a) => a.cancel());
        cracks.style.strokeDashoffset = '260';
        await wait(260);
        m.innerHTML = medalSVG('silver', 'hex', 'dumbbell', { size: 110 });
        m.style.opacity = '1';
        await spring(m, 1.6, 1, (v) => `translate(-50%,0) scale(${v})`, SPRINGS.bouncy);
        play('stamp');
        fx.ring(150, 82, '#cfe7ff', 20, 120, 0.5, 6);
        buzz('heavy', el);
        st.querySelector('.tierto').classList.add('on');
      });
    },
  },
  {
    g: 'Rewards',
    t: 'Level up',
    when: 'A workout takes you to the next level',
    motion: 'The shield slams from 200% (bouncy), a ring bursts, the level number rolls 12 to 13 and a gold glint crosses the shield.',
    sound: 'The level-up fanfare (music)',
    haptic: 'Heavy',
    where: 'After Victory',
    tall: true,
    build(el) {
      const st = h('<div class="mstage"><div class="rays on"></div><h4 class="mk">LEVEL UP!</h4><div class="mshield"></div><div class="mnum">12</div></div>');
      const b = playBtn();
      el.append(st, b);
      const fx = fxFor(st, 300, 220);
      const sh = st.querySelector('.mshield');
      sh.innerHTML = shieldSVG('C', 12, { size: 96 });
      b.addEventListener('click', async () => {
        S.ensure();
        preload(['m-level']);
        sh.innerHTML = shieldSVG('C', 13, { size: 96 });
        st.querySelector('.mnum').textContent = '12';
        music('m-level');
        await spring(sh, 2, 1, (v) => `translate(-50%,0) scale(${v})`, SPRINGS.bouncy);
        fx.ring(150, 100, '#fff28f', 30, 140, 0.55, 7);
        fx.stars(150, 100, 16, '#fff6c4', 120);
        buzz('heavy', el);
        sh.classList.remove('gl');
        void sh.offsetWidth;
        sh.classList.add('gl');
        await wait(250);
        const n = st.querySelector('.mnum');
        n.textContent = '13';
        spring(n, 1.6, 1, (v) => `translate(-50%,0) scale(${v})`, SPRINGS.bouncy);
      });
    },
  },
  {
    g: 'Rewards',
    t: 'Rank up',
    when: 'A level that starts a new rank',
    motion: 'The old shield shakes and shatters, a pillar of light rises (400 ms), the new shield rises through it with a glow, and the title banner unrolls.',
    sound: 'The shatter, a rise, then the rank-up fanfare (music)',
    haptic: 'Heavy, then the reward pattern',
    where: 'After Victory, rarely',
    tall: true,
    build(el) {
      const st = h('<div class="mstage"><div class="pillar"></div><div class="mshield"></div><div class="mtitle"><span>C-Rank Hunter</span></div></div>');
      const b = playBtn();
      el.append(st, b);
      const fx = fxFor(st, 300, 220);
      const sh = st.querySelector('.mshield');
      sh.innerHTML = shieldSVG('D', 9, { size: 90 });
      b.addEventListener('click', async () => {
        S.ensure();
        preload(['shatter', 'm-rank']);
        st.classList.remove('beam');
        st.querySelector('.mtitle').classList.remove('on');
        sh.innerHTML = shieldSVG('D', 9, { size: 90 });
        sh.style.opacity = '1';
        await anim(sh, Array.from({ length: 12 }, (_, i) => ({ transform: `translate(calc(-50% + ${(i % 2 ? 1 : -1) * (1 + i * 0.35)}px),0)` })), { duration: 480, easing: 'linear', fill: 'none' });
        play('shatter');
        fx.shards(150, 96, ['#6fe0ab', '#0f7a4f', '#e6fff1'], 22);
        sh.style.opacity = '0';
        SYN.riser(0.6);
        st.classList.add('beam');
        await wait(420);
        music('m-rank');
        sh.innerHTML = shieldSVG('C', 10, { size: 100 });
        sh.style.opacity = '1';
        await anim(sh, [{ transform: 'translate(-50%,80px) scale(.6)', opacity: 0 }, { transform: 'translate(-50%,-6px) scale(1.06)', opacity: 1, offset: 0.7 }, { transform: 'translate(-50%,0) scale(1)', opacity: 1 }], { duration: 700, easing: EASE.out });
        buzz('reward', el);
        fx.stars(150, 96, 20, '#bfe1ff', 140);
        st.querySelector('.mtitle').classList.add('on');
      });
    },
  },
  // ---------------- ambient ----------------
  {
    g: 'Ambient',
    t: 'Badge tilt',
    when: 'Moving a finger over a medal',
    motion: 'The medal tilts up to 16 degrees toward the finger with a perspective of 600 px; the glare slides across. It springs back flat when you let go.',
    sound: 'None',
    haptic: 'None',
    where: 'The Badges tab and the badge view',
    tall: true,
    build(el) {
      const st = h(`<div class="mtilt"><div class="tiltme">${medalSVG('legend', 'star', 'star', { size: 130 })}<i class="glarebox"></i></div><small>Move your finger or mouse over the medal</small></div>`);
      el.append(st);
      const m = st.querySelector('.tiltme');
      const gl = st.querySelector('.glarebox');
      let rx = 0;
      let ry = 0;
      st.addEventListener('pointermove', (e) => {
        const r = m.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - 0.5;
        const y = (e.clientY - r.top) / r.height - 0.5;
        rx = -y * 32;
        ry = x * 32;
        m.style.transform = `perspective(600px) rotateX(${Math.max(-16, Math.min(16, rx))}deg) rotateY(${Math.max(-16, Math.min(16, ry))}deg)`;
        gl.style.background = `radial-gradient(circle at ${(x + 0.5) * 100}% ${(y + 0.5) * 100}%, rgba(255,255,255,.55), rgba(255,255,255,0) 45%)`;
      });
      st.addEventListener('pointerleave', () => {
        const a = rx;
        const b = ry;
        spring(m, 1, 0, (v) => `perspective(600px) rotateX(${a * v * 0.5}deg) rotateY(${b * v * 0.5}deg)`, SPRINGS.bouncy).then(() => (m.style.transform = ''));
        m.getAnimations().forEach((x) => x.finished.then(() => x.cancel()));
        gl.style.background = '';
      });
    },
  },
];
