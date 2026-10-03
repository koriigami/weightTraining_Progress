// Board 12: wiring. The switches at the top, the reward stage, the galleries
// in both art directions, the sound and music pickers, and the 34 cards.
import { S, SYN, SLOTS, MUSIC, PICK, setPick, play, buzz } from './sound.js';
import { DUR, EASE, SPRINGS, springFrames, springMs } from './motion.js';
import { RewardStage, REWARDS, TIER_UI } from './stage.js';
import { CARDS } from './cards.js';
import { chestSVG, medalSVG, CHEST_LOOK, todayChestSVG, todayMedalSVG, todayBadgeSVG } from './artvec.js';

const $ = (s) => document.querySelector(s);

// ---------- the switches at the top ----------
function toggle(id, on, set) {
  const b = $(id);
  b.setAttribute('aria-checked', String(on));
  b.addEventListener('click', () => {
    const v = b.getAttribute('aria-checked') !== 'true';
    b.setAttribute('aria-checked', String(v));
    set(v);
    if (v) SYN.switchOn();
  });
}
toggle('#t-sound', true, (v) => {
  S.on = v;
  if (!v) S.stopMusic(0.1);
});
toggle('#t-music', true, (v) => {
  S.music = v;
  if (!v) S.stopMusic(0.2);
});
toggle('#t-hapt', true, (v) => (S.haptics = v));
toggle('#t-red', false, (v) => (document.documentElement.dataset.reduced = v ? '1' : '0'));
// browsers start audio only after a tap
document.addEventListener('pointerdown', () => S.ensure(), { once: true });

// ---------- 3D, loaded once and shared ----------
let art3d = null;
async function get3d() {
  if (art3d) return art3d;
  const m = await import('./art3d.js');
  art3d = new m.Art({ width: 300, height: 260 });
  return art3d;
}
const still3d = (a, obj, o) => a.still(obj, o);
const MEDAL_CAM = { cam: [0, 0.2, 5.4], look: [0, 0, 0], rotY: -0.28, shadow: false };

// ---------- 1. today and new ----------
const gold = REWARDS.gold[0];
$('#now-today').innerHTML = `<div style="display:flex;flex-direction:column;align-items:center">${todayMedalSVG(['#FFE58A', '#C78A00'], 'trophy', 92)}${todayChestSVG(160)}</div>`;
$('#now-a').innerHTML = `<div style="display:flex;flex-direction:column;align-items:center;gap:0">${medalSVG('gold', 'diamond', 'trophy', { size: 104 })}${chestSVG('gold', { size: 160 })}</div>`;

// ---------- 3. the reward stage ----------
const stage = new RewardStage($('#stagehost'));
$('#stagehost').addEventListener('no3d', () => {
  $('#no3d').style.display = 'block';
  document.querySelectorAll('#stage .seg button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.mode === 'vec')));
});
const chestChips = $('#chestchips');
chestChips.innerHTML = Object.entries(CHEST_LOOK)
  .map(([k, c]) => `<button type="button" class="chip${k === 'gold' ? ' on' : ''}" aria-pressed="${k === 'gold'}" data-k="${k}">${c.name}</button>`)
  .join('');
chestChips.addEventListener('click', (e) => {
  const b = e.target.closest('.chip');
  if (!b) return;
  chestChips.querySelectorAll('.chip').forEach((c) => {
    c.classList.toggle('on', c === b);
    c.setAttribute('aria-pressed', String(c === b));
  });
  stage.key = b.dataset.k;
  stage.stopRun();
  stage.idle();
  play('chip');
});
$('#countchips').addEventListener('click', (e) => {
  const b = e.target.closest('.chip');
  if (!b) return;
  $('#countchips')
    .querySelectorAll('.chip')
    .forEach((c) => {
      c.classList.toggle('on', c === b);
      c.setAttribute('aria-pressed', String(c === b));
    });
  stage.count = Number(b.dataset.n);
  play('chip');
});
document.querySelectorAll('#stage .seg button').forEach((b) =>
  b.addEventListener('click', async () => {
    document.querySelectorAll('#stage .seg button').forEach((o) => o.setAttribute('aria-pressed', String(o === b)));
    play('tick');
    await stage.setMode(b.dataset.mode);
  }),
);
$('#playstage').addEventListener('click', () => {
  S.ensure();
  stage.play();
  // on a phone the stage sits above the button: bring it into view
  const r = $('#stagehost').getBoundingClientRect();
  if (r.top < 0 || r.bottom > innerHeight) $('#stagehost').scrollIntoView({ behavior: 'smooth', block: 'center' });
  $('#stagehost .rstage').focus({ preventScroll: true });
});
stage.host.addEventListener('done', () => {});

// start in 3D when it is on screen, so the page loads light
let stageStarted = false;
new IntersectionObserver((ents) => {
  if (stageStarted || !ents.some((e) => e.isIntersecting)) return;
  stageStarted = true;
  stage.setMode('three');
}).observe($('#stagehost'));

// ---------- 4. chests ----------
const CHEST_FOR = {
  bronze: 'Bronze badges',
  silver: 'Silver badges',
  gold: 'Gold badges',
  diamond: 'Diamond badges',
  master: 'Master badges',
  legend: 'Legend badges',
  monthly: 'Monthly badges, in the badge colour',
  royal: 'Special badges and milestones',
  pillow: 'Secret rest badges',
};
$('#chestgrid').innerHTML = Object.entries(CHEST_LOOK)
  .map(
    ([k, c]) => `<div class="cbox"><div class="two blue"><div><span class="tag">A</span>${chestSVG(k, { size: 160 })}</div><div data-3d="${k}"><span class="tag">B</span></div></div><div class="cap2"><b>${c.name} chest</b><small>For ${CHEST_FOR[k]}. Opens with ${c.taps} ${c.taps === 1 ? 'tap' : 'taps'}.</small></div></div>`,
  )
  .join('');

// ---------- 5. badges ----------
const TIERS = ['bronze', 'silver', 'gold', 'diamond', 'master', 'legend'];
const FAM = [
  ['shield', 'target', 'Finisher'],
  ['hex', 'dumbbell', 'Iron Mover'],
  ['diamond', 'trophy', 'Record Breaker'],
  ['circle', 'run', 'Road Runner'],
  ['square', 'week', 'Streak Keeper'],
  ['circle', 'star', 'All-Rounder'],
];
$('#m-today').innerHTML = TIERS.map((t, i) => `<div>${todayBadgeSVG(t, FAM[i][0], FAM[i][1] === 'week' ? 'calcheck' : FAM[i][1], 96)}${TIER_UI[t].label}</div>`).join('');
$('#m-a').innerHTML = TIERS.map((t, i) => `<div>${medalSVG(t, FAM[i][0], FAM[i][1], { size: 110 })}${TIER_UI[t].label}<small style="font-weight:600;opacity:.85">${FAM[i][2]}</small></div>`).join('');
$('#m-b').innerHTML = TIERS.map((t, i) => `<div><div data-3dm="${t},${FAM[i][0]},${FAM[i][1]}" style="aspect-ratio:1;width:100%;max-width:120px"></div>${TIER_UI[t].label}<small style="font-weight:600;opacity:.85">${FAM[i][2]}</small></div>`).join('');
const OTHER = [
  ['monthly', 'square', 'week', 'Month Clear', 'Monthly'],
  ['special', 'star', 'crown', 'Clean Sweep', 'Special'],
  ['secret', 'diamond', 'moon', 'Well Rested', 'Secret'],
];
$('#m-other').innerHTML =
  OTHER.map(([t, s, ic, n, l]) => `<div>${medalSVG(t, s, ic, { size: 110 })}A: ${l}<small style="font-weight:600;opacity:.85">${n}</small></div>`).join('') +
  OTHER.map(([t, s, ic, n, l]) => `<div><div data-3dm="${t},${s},${ic}" style="aspect-ratio:1;width:100%;max-width:120px"></div>B: ${l}<small style="font-weight:600;opacity:.85">${n}</small></div>`).join('');

const PAL = {
  bronze: ['#d98a4a', '#c4561e', '#ffb469', 'Bronze metal, burnt orange enamel'],
  silver: ['#e3e9f0', '#4a6c9c', '#cfe7ff', 'Silver, steel blue enamel'],
  gold: ['#ffd84a', '#d81e2c', '#ffe27a', 'Gold, ruby enamel, laurels'],
  diamond: ['#eef7ff', '#2f8fe8', '#9ef0ff', 'Platinum, sapphire, cut face'],
  master: ['#2c2230', '#22102a', '#ff8a2a', 'Obsidian, ember cracks'],
  legend: ['#ffe9f6', '#3b1f8f', '#ffd0f4', 'Pearl rainbow rim, violet'],
};
$('#palette').innerHTML = Object.entries(PAL)
  .map(([t, [a, b, c, d]]) => `<div class="sw2"><div class="c"><span style="background:${a}"></span><span style="background:${b}"></span><span style="background:${c}"></span></div><b>${TIER_UI[t].label}</b><small>${d}</small></div>`)
  .join('');
$('#lock-stone').insertAdjacentHTML('afterbegin', `<div class="ring">${medalSVG('locked', 'hex', 'lock', { size: 110 })}</div>`);
$('#lock-faded').insertAdjacentHTML('afterbegin', `<div class="faded">${medalSVG('gold', 'hex', 'dumbbell', { size: 110 })}</div>`);

// The 3D pictures render when their section comes into view, a few at a time.
const queue = [];
let busy = false;
async function pump() {
  if (busy) return;
  busy = true;
  let a;
  try {
    a = await get3d();
  } catch {
    document.querySelectorAll('[data-3d],[data-3dm]').forEach((el) => (el.innerHTML += '<small style="color:#fff">3D unavailable</small>'));
    queue.length = 0;
    busy = false;
    return;
  }
  while (queue.length) {
    const el = queue.shift();
    if (el.dataset.done) continue;
    el.dataset.done = '1';
    let url;
    if (el.dataset['3d']) url = still3d(a, a.chest(el.dataset['3d']), { w: 340, h: 300, cam: [0, 2.0, 5.5], look: [0, 0.8, 0], rotY: -0.42 });
    else {
      const [t, s, ic] = el.dataset['3dm'].split(',');
      url = still3d(a, a.medal(t, s, ic), { w: 240, h: 240, ...MEDAL_CAM });
    }
    el.insertAdjacentHTML('beforeend', `<img src="${url}" alt="" style="width:100%;height:auto;display:block">`);
    await new Promise((r) => setTimeout(r, 16));
  }
  busy = false;
}
const io3 = new IntersectionObserver(
  (ents) => {
    ents.forEach((e) => {
      if (!e.isIntersecting) return;
      io3.unobserve(e.target);
      queue.push(e.target);
    });
    pump();
  },
  { rootMargin: '400px' },
);
document.querySelectorAll('[data-3d],[data-3dm]').forEach((el) => io3.observe(el));
// the B panel in section 1
const nowB = document.createElement('div');
nowB.style.cssText = 'display:flex;flex-direction:column;align-items:center';
nowB.innerHTML = `<div data-3dm="gold,diamond,trophy" style="width:124px;height:124px;margin-bottom:-14px"></div><div data-3d="gold" style="width:200px;height:176px"></div>`;
$('#now-b').append(nowB);
nowB.querySelectorAll('[data-3d],[data-3dm]').forEach((el) => io3.observe(el));

// ---------- 6. tokens and springs ----------
const TOK = [
  ['Press', DUR.press, EASE.out, 'Buttons going down'],
  ['Quick', DUR.quick, EASE.out, 'Fades, number rolls, toasts out'],
  ['Base', DUR.base, EASE.out, 'Rows filling, page changes'],
  ['Slow', DUR.slow, EASE.out, 'Light, rays, pillars'],
  ['Reward', DUR.reward, EASE.out, 'Medals and chests, up to 900 ms'],
  ['Overshoot', 320, EASE.over, 'Modals and chips popping in'],
  ['Wipe', 600, EASE.wipe, 'Stage changes, the sky wipe'],
  ['In', 430, EASE.in, 'Things falling: the chest drop'],
];
$('#tokens').innerHTML = TOK.map(([n, ms, e, w]) => `<button type="button" class="tok" data-ms="${ms}" data-e="${e}"><b>${n}</b><small>${ms} ms · <code>${e}</code></small><div class="track"><i></i></div><small>${w}</small></button>`).join('');
const SPR = [
  ['Snappy', 'snappy', 'Controls: tabs, segments, sheets'],
  ['Bouncy', 'bouncy', 'Slams, pops, landings, release'],
  ['Heavy', 'heavy', 'Big things rising: shields, chests'],
];
$('#springs').innerHTML = SPR.map(([n, k, w]) => {
  const s = SPRINGS[k];
  return `<button type="button" class="tok" data-spring="${k}"><b>${n}</b><small>stiffness ${s.k}, damping ${s.c}, mass ${s.m} · settles in ${springMs(s)} ms</small><div class="track"><i></i></div><small>${w}</small></button>`;
}).join('');
document.querySelectorAll('.tok').forEach((t) =>
  t.addEventListener('click', () => {
    const dot = t.querySelector('.track i');
    const w = t.querySelector('.track').clientWidth - 26;
    play('tick');
    if (t.dataset.spring) {
      const { frames, ms } = springFrames(0, w, (v) => `translateX(${v}px)`, SPRINGS[t.dataset.spring]);
      dot.animate(frames, { duration: ms, easing: 'linear', fill: 'forwards' });
    } else {
      dot.animate([{ transform: 'translateX(0)' }, { transform: `translateX(${w}px)` }], { duration: Number(t.dataset.ms), easing: t.dataset.e, fill: 'forwards' });
    }
    setTimeout(() => dot.getAnimations().forEach((a) => a.cancel()), 1600);
  }),
);

// ---------- 7. the 34 ----------
const groups = [...new Set(CARDS.map((c) => c.g))];
const HPT = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="7" y="3" width="10" height="18" rx="2"/><path d="M3 9v6M21 9v6"/></svg>';
let n = 0;
$('#cardgroups').innerHTML = groups
  .map(
    (g) =>
      `<div class="grp"><h3>${g}</h3><div class="cards">${CARDS.filter((c) => c.g === g)
        .map((c) => {
          const i = CARDS.indexOf(c);
          n++;
          return `<article class="card${c.tall ? ' tall' : ''}" data-card="${i}"><h4><span class="n">${n}</span>${c.t}</h4><div class="demo"></div><dl class="meta"><dt>When</dt><dd>${c.when}</dd><dt>Motion</dt><dd>${c.motion}</dd><dt>Sound</dt><dd>${c.sound}</dd><dt>Haptic</dt><dd>${c.haptic}</dd><dt>Where</dt><dd>${c.where}</dd></dl><span class="hpt" title="Haptic">${HPT}</span></article>`;
        })
        .join('')}</div></div>`,
  )
  .join('');
const ctx = {
  toStage() {
    $('#stage').scrollIntoView({ behavior: 'smooth', block: 'start' });
  },
};
document.querySelectorAll('[data-card]').forEach((el) => {
  try {
    CARDS[Number(el.dataset.card)].build(el.querySelector('.demo'), ctx);
  } catch (e) {
    el.querySelector('.demo').textContent = 'This demo could not start: ' + e.message;
    console.error(e);
  }
});

// ---------- 8 and 9. sounds and music ----------
const PL = '<svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><path d="M8 5v14l11-7z" fill="currentColor"/></svg>';
function slotRow(s, isMusic) {
  return `<div class="slot2" data-slot="${s.id}" data-music="${isMusic ? 1 : 0}"><div><b>${s.label}</b><small>${isMusic ? 'Music' : s.group === 'ui' ? 'Tap sound' : 'Effect'}</small></div><div class="opts">${s.opts
    .map(([v, l]) => `<button type="button" class="opt" data-v="${v}" aria-pressed="${PICK[s.id] === v}"><span class="pl">${PL}</span>${l}${v === s.pick ? ' <span class="mine">My pick</span>' : ''}</button>`)
    .join('')}</div></div>`;
}
$('#slots').innerHTML = SLOTS.map((s) => slotRow(s, false)).join('');
$('#musics').innerHTML = MUSIC.map((s) => slotRow(s, true)).join('');
document.querySelectorAll('.slot2').forEach((row) =>
  row.addEventListener('click', (e) => {
    const b = e.target.closest('.opt');
    if (!b) return;
    S.ensure();
    const id = row.dataset.slot;
    setPick(id, b.dataset.v);
    row.querySelectorAll('.opt').forEach((o) => o.setAttribute('aria-pressed', String(o === b)));
    if (row.dataset.music === '1') S.playMusic(b.dataset.v, { loop: false });
    else play(id, {}, b.dataset.v);
  }),
);

// ---------- 10. settings ----------
const ROW = (icon, label, sub, sw, isNew) =>
  `<div class="row"><span class="ibox">${icon}</span><span><span>${label}${isNew ? ' <span class="new">New</span>' : ''}</span>${sub ? `<small>${sub}</small>` : ''}</span>${sw === null ? '<span class="chev">&rsaquo;</span>' : `<button type="button" class="mswitch" role="switch" aria-checked="${sw}" aria-label="${label}"><i style="transform:translateX(${sw ? 22 : 0}px)"></i></button>`}</div>`;
const I = (p) => `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg>`;
$('#setmock').innerHTML = `<p class="sl">App</p><div class="pn">${ROW(I('<path d="M11 5L6 9H2v6h4l5 4zM15.5 8.5a5 5 0 0 1 0 7M19 5a10 10 0 0 1 0 14"/>'), 'Sounds', 'Taps and effects', true)}${ROW(I('<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>'), 'Music', 'Only in reward moments', true, true)}${ROW(I('<rect x="7" y="3" width="10" height="18" rx="2"/><path d="M3 9v6M21 9v6"/>'), 'Haptics', 'Android phones', true)}${ROW(I('<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6M12 17h.01"/>'), 'How Levl works', '', null)}${ROW(I('<path d="M12 3l1.8 4.2L18 9l-4.2 1.8L12 15l-1.8-4.2L6 9l4.2-1.8z"/>'), "What's new", '', null)}</div>`;
document.querySelectorAll('#setmock .mswitch').forEach((sw) =>
  sw.addEventListener('click', () => {
    const on = sw.getAttribute('aria-checked') !== 'true';
    sw.setAttribute('aria-checked', String(on));
    const k = sw.querySelector('i');
    const { frames, ms } = springFrames(on ? 0 : 22, on ? 22 : 0, (v) => `translateX(${v}px)`, SPRINGS.bouncy);
    k.animate(frames, { duration: ms, easing: 'linear', fill: 'forwards' });
    play('switch', { on });
    buzz('light', sw);
  }),
);

document.body.dataset.done = '1';
