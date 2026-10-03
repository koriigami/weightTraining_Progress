// Board 12 (round 2): wiring. The switches at the top, the reward stage, the 3D
// chest and badge galleries with their options, the 34 cards, and the sound and
// music pickers. Option picks feed the stage and are remembered on this device.
import { S, SYN, SHIMMER, SLOTS, MUSIC, PICK, setPick, play, buzz, setRewardKey } from './sound.js';
import { DUR, EASE, SPRINGS, springFrames, springMs, setSpeed } from './motion.js';
import { RewardStage, TIER_UI, RANK_CHEST } from './stage.js';
import { CARDS } from './cards.js';
import { CHEST_LOOK } from './artvec.js';

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
    else SYN.switchOff();
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
toggle('#t-slow', false, (v) => setSpeed(v ? 0.5 : 1));
toggle('#t-red', false, (v) => (document.documentElement.dataset.reduced = v ? '1' : '0'));
// browsers start audio only after a tap
document.addEventListener('pointerdown', () => S.ensure(), { once: true });

// ---------- the options and my picks ----------
const CHEST_OPTS = {
  silver: { cap: 'More contrast: slate-navy wood, polished silver and a sapphire.', pick: 'a' },
  diamond: { cap: 'No spikes. Faceted crystal or clear ice, with frosted trims and a large cut diamond.', pick: 'a' },
  master: { cap: 'Round 1, plus two more: molten gold trims with lava seams, or black-violet glass.', pick: 'b' },
  legend: { cap: 'Redesigned, no spikes. Aurora’s bands drift slowly on the stage.', pick: 'b' },
  monthly: { cap: 'Less white. In the app it takes the month’s colour.', pick: 'c' },
  royal: { cap: 'New gold tones, each with its own gem.', pick: 'a' },
};
const MEDAL_OPTS = {
  gold: { cap: 'No red and no laurels. Four enamels on the gold.', pick: 'emerald', shape: 'diamond', icon: 'trophy' },
  master: { cap: 'Round 1’s ember, or two new crack colours.', pick: 'molten', shape: 'square', icon: 'week' },
  legend: { cap: 'No laurels, and no longer just a circle: three frames around the same face.', pick: 'halo', shape: 'circle', icon: 'star' },
};
const ART_KEY = 'levl-b12-art-r2';
const chosen = { chest: {}, medal: {} };
for (const [k, o] of Object.entries(CHEST_OPTS)) chosen.chest[k] = o.pick;
for (const [k, o] of Object.entries(MEDAL_OPTS)) chosen.medal[k] = o.pick;
try {
  const saved = JSON.parse(localStorage.getItem(ART_KEY) || '{}');
  Object.assign(chosen.chest, saved.chest || {});
  Object.assign(chosen.medal, saved.medal || {});
} catch {}
const saveArt = () => {
  try {
    localStorage.setItem(ART_KEY, JSON.stringify(chosen));
  } catch {}
};

// ---------- 3D, loaded once and shared ----------
let artP = null;
function get3d() {
  if (!artP)
    artP = import('./art3d.js').then((m) => {
      const a = new m.Art({ width: 300, height: 260 });
      a.mod = m;
      return a;
    });
  return artP;
}

// ---------- 2. the reward stage ----------
const stage = new RewardStage($('#stagehost'));
stage.variant = chosen.chest;
stage.medalVariant = chosen.medal;
$('#stagehost').addEventListener('no3d', () => ($('#no3d').style.display = 'block'));
const chestChips = $('#chestchips');
// the rule: your rank decides your chest; the themed three are for monthly, special and secret badges
const RANK_OF = Object.fromEntries(Object.entries(RANK_CHEST).map(([r, k]) => [k, r]));
chestChips.innerHTML = Object.entries(CHEST_LOOK)
  .map(([k, c]) => `<button type="button" class="chip${k === 'gold' ? ' on' : ''}" aria-pressed="${k === 'gold'}" data-k="${k}">${RANK_OF[k] ? `${RANK_OF[k]} rank: ` : ''}${c.name}</button>`)
  .join('');
function pickChest(k) {
  chestChips.querySelectorAll('.chip').forEach((c) => {
    c.classList.toggle('on', c.dataset.k === k);
    c.setAttribute('aria-pressed', String(c.dataset.k === k));
  });
  stage.key = k;
  stage.stopRun();
  stage.idle();
}
chestChips.addEventListener('click', (e) => {
  const b = e.target.closest('.chip');
  if (!b) return;
  pickChest(b.dataset.k);
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
function showStage() {
  // on a phone the stage sits above the buttons: bring it into view
  const r = $('#stagehost').getBoundingClientRect();
  if (r.top < 0 || r.bottom > innerHeight) $('#stagehost').scrollIntoView({ behavior: 'smooth', block: 'center' });
  $('#stagehost .rstage').focus({ preventScroll: true });
}
async function runStage(kind) {
  S.ensure();
  await start3d();
  showStage();
  if (kind === 'finish') stage.playFinish();
  else if (kind === 'rank') stage.playFinish({ rankUp: 'D' });
  else stage.play();
}
$('#playstage').addEventListener('click', () => runStage('open'));
$('#playfinish').addEventListener('click', () => runStage('finish'));
$('#playrank').addEventListener('click', () => runStage('rank'));
stage.host.addEventListener('done', () => stage.idle());

// start in 3D when it is on screen, so the page loads light
let started = null;
function start3d() {
  if (!started) started = stage.start3d();
  return started;
}
new IntersectionObserver((ents) => {
  if (ents.some((e) => e.isIntersecting)) start3d();
}).observe($('#stagehost'));

// ---------- 3. chests ----------
const CHEST_FOR = {
  bronze: 'Bronze badges',
  silver: 'Silver badges',
  gold: 'Gold badges',
  diamond: 'Diamond badges',
  master: 'Master badges',
  legend: 'Legend badges',
  monthly: 'Monthly badges',
  royal: 'Special badges',
  pillow: 'Secret rest badges',
};
const CHEST_CAM = { w: 360, h: 308, cam: [0, 2.0, 5.5], look: [0, 0.8, 0], rotY: -0.42 };
$('#chest-kept').innerHTML = ['bronze', 'gold', 'pillow']
  .map((k) => `<div class="otile"><div class="oimg blue" data-3d="chest:${k}"></div><div class="otxt"><b>${CHEST_LOOK[k].name}</b><small>For ${CHEST_FOR[k]}. Signed off.</small></div></div>`)
  .join('');
const tile = (kind, k, o, mine, on) =>
  `<button type="button" class="otile" data-kind="${kind}" data-k="${k}" data-v="${o.id}" aria-pressed="${on}">${mine ? '<span class="pick">My pick</span>' : ''}<div class="oimg blue" data-3d="${kind}:${k}:${o.id}"></div><div class="otxt"><b>${o.name}</b><small>${on ? 'Used on the stage' : 'Tap to use'}</small></div></button>`;

// option groups render once the 3D module is in (it holds the option lists)
async function buildOptions() {
  let a;
  try {
    a = await get3d();
  } catch (e) {
    $('#chest-opts').innerHTML = $('#medal-opts').innerHTML = '<p class="offline" style="display:block">3D could not start in this browser.</p>';
    return;
  }
  const { CHEST_OPTIONS, MEDAL_OPTIONS } = a.mod;
  $('#chest-opts').innerHTML = Object.entries(CHEST_OPTS)
    .map(([k, info]) => {
      const opts = CHEST_OPTIONS[k];
      return `<div class="ogrp" data-grp="chest:${k}"><h3>${CHEST_LOOK[k].name} chest</h3><p class="cap">${info.cap} For ${CHEST_FOR[k]}; ${CHEST_LOOK[k].taps} ${CHEST_LOOK[k].taps === 1 ? 'tap' : 'taps'}.</p><div class="otiles">${opts
        .map((o) => tile('chest', k, o, o.id === info.pick && opts.length > 1, chosen.chest[k] === o.id))
        .join('')}</div><button type="button" class="btn sm bs" data-try="${k}">Open it on the stage</button></div>`;
    })
    .join('');
  $('#medal-opts').innerHTML = Object.entries(MEDAL_OPTS)
    .map(([t, info]) => {
      const opts = MEDAL_OPTIONS[t];
      return `<div class="ogrp" data-grp="medal:${t}"><h3>${TIER_UI[t].label}</h3><p class="cap">${info.cap}</p><div class="otiles">${opts
        .map((o) => tile('medal', t, o, o.id === info.pick, chosen.medal[t] === o.id))
        .join('')}</div><button type="button" class="btn sm bs" data-try="${t}">Open a ${TIER_UI[t].label} badge on the stage</button></div>`;
    })
    .join('');
  document.querySelectorAll('#chest-opts [data-3d],#medal-opts [data-3d]').forEach((el) => io3.observe(el));
}
document.addEventListener('click', (e) => {
  const t = e.target.closest('button.otile');
  if (t) {
    const { kind, k, v } = t.dataset;
    chosen[kind][k] = v;
    saveArt();
    t.closest('.otiles')
      .querySelectorAll('.otile')
      .forEach((o) => {
        const on = o === t;
        o.setAttribute('aria-pressed', String(on));
        o.querySelector('.otxt small').textContent = on ? 'Used on the stage' : 'Tap to use';
      });
    play('chip');
    if (kind === 'chest' && stage.key === k) {
      stage.stopRun();
      stage.idle();
    }
    if (kind === 'medal') rerender(`#m-tiers [data-3d^="medal:${k}:"]`, `medal:${k}:${v}`);
    return;
  }
  const tryBtn = e.target.closest('[data-try]');
  if (tryBtn) {
    pickChest(tryBtn.dataset.try);
    $('#stage').scrollIntoView({ behavior: 'smooth', block: 'start' });
    S.ensure();
    start3d().then(() => setTimeout(() => stage.play(), 500));
  }
});

// ---------- 4. badges ----------
const TIERS = ['bronze', 'silver', 'gold', 'diamond', 'master', 'legend'];
const FAM = [
  ['shield', 'target', 'Finisher'],
  ['hex', 'dumbbell', 'Iron Mover'],
  ['diamond', 'trophy', 'Record Breaker'],
  ['circle', 'run', 'Road Runner'],
  ['square', 'week', 'Streak Keeper'],
  ['circle', 'star', 'All-Rounder'],
];
const mtile = (spec, label, sub) => `<div><div class="mimg" data-3d="${spec}" style="aspect-ratio:1;width:100%;max-width:130px"></div>${label}<small style="font-weight:600;opacity:.85">${sub}</small></div>`;
$('#m-tiers').innerHTML = TIERS.map((t, i) => mtile(`medal:${t}:${chosen.medal[t] || ''}:${FAM[i][0]}:${FAM[i][1]}`, TIER_UI[t].label, FAM[i][2])).join('');
$('#m-other').innerHTML = [
  ['monthly', 'square', 'week', 'Month Clear'],
  ['special', 'star', 'crown', 'Clean Sweep'],
  ['secret', 'diamond', 'moon', 'Well Rested'],
]
  .map(([t, s, ic, n]) => mtile(`medal:${t}::${s}:${ic}`, TIER_UI[t].label, n))
  .join('');
$('#lock-stone').insertAdjacentHTML('afterbegin', '<div class="lockpic"><span class="ring2"></span><span class="lockimg" data-3d="lock"></span></div>');

// The 3D pictures render when they come near the screen, one frame at a time.
const queue = [];
let busy = false;
function render(a, spec) {
  const [kind, k, v, shape, icon] = spec.split(':');
  if (kind === 'chest') return a.still(a.chest(k, v || undefined), CHEST_CAM);
  if (kind === 'lock') return a.still(a.medal('locked', 'hex', 'lock'), { w: 216, h: 216, cam: [0, 0, 4.6], look: [0, 0, 0], rotY: 0, shadow: false });
  // a medal: an option tile, or the tier rows
  const info = MEDAL_OPTS[k];
  const m = a.medal(k, shape || info?.shape || 'hex', icon || info?.icon || 'star', null, { variant: v || undefined, month: k === 'monthly' ? 'OCT 26' : undefined });
  const far = k === 'legend' ? 7.2 : 5.4;
  const tileShape = spec.split(':').length > 3;
  return a.still(m, { w: tileShape ? 260 : 360, h: tileShape ? 260 : 308, cam: [0, 0.2, far], look: [0, 0, 0], rotY: -0.28, shadow: false });
}
async function pump() {
  if (busy) return;
  busy = true;
  let a;
  try {
    a = await get3d();
  } catch {
    document.querySelectorAll('[data-3d]').forEach((el) => (el.innerHTML = '<small style="color:#fff">3D unavailable</small>'));
    queue.length = 0;
    busy = false;
    return;
  }
  while (queue.length) {
    const el = queue.shift();
    if (el.dataset.done === el.dataset['3d']) continue;
    el.dataset.done = el.dataset['3d'];
    let url;
    try {
      url = render(a, el.dataset['3d']);
    } catch (e) {
      console.error('3D picture failed', el.dataset['3d'], e);
      continue;
    }
    el.querySelector('img')?.remove();
    el.insertAdjacentHTML('beforeend', `<img src="${url}" alt="" style="width:100%;height:100%;object-fit:contain;display:block">`);
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
  { rootMargin: '500px' },
);
function rerender(sel, prefix) {
  document.querySelectorAll(sel).forEach((el) => {
    const parts = el.dataset['3d'].split(':');
    const next = prefix.split(':');
    parts[2] = next[2];
    el.dataset['3d'] = parts.join(':');
    queue.push(el);
  });
  pump();
}
document.querySelectorAll('[data-3d]').forEach((el) => io3.observe(el));
new IntersectionObserver((ents, ob) => {
  if (!ents.some((e) => e.isIntersecting)) return;
  ob.disconnect();
  buildOptions();
}, { rootMargin: '800px' }).observe($('#chests'));

// ---------- 5. the 34 ----------
const groups = [...new Set(CARDS.map((c) => c.g))];
const HPT = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="7" y="3" width="10" height="18" rx="2"/><path d="M3 9v6M21 9v6"/></svg>';
const slotName = Object.fromEntries([...SLOTS, ...MUSIC].map((s) => [s.id, s.label]));
let n = 0;
$('#cardgroups').innerHTML = groups
  .map(
    (g) =>
      `<div class="grp"><h3>${g}</h3><div class="cards">${CARDS.filter((c) => c.g === g)
        .map((c) => {
          const i = CARDS.indexOf(c);
          n++;
          const slots = (c.slots || []).map((id) => `<a href="#slot-${id}">${slotName[id] || id}</a>`).join(', ');
          return `<article class="card${c.tall ? ' tall' : ''}" data-card="${i}"><h4><span class="n">${n}</span>${c.t}${c.changed ? ' <span class="new">Changed</span>' : ''}</h4><div class="demo"></div><dl class="meta"><dt>When</dt><dd>${c.when}</dd><dt>Motion</dt><dd>${c.motion}</dd><dt>Sound</dt><dd>${c.sound}${slots ? ` <span class="slotref">(section 6: ${slots})</span>` : ''}</dd><dt>Haptic</dt><dd>${c.haptic}</dd><dt>Where</dt><dd>${c.where}</dd></dl><span class="hpt" title="Haptic">${HPT}</span></article>`;
        })
        .join('')}</div></div>`,
  )
  .join('');
const ctx = {
  toStage() {
    $('#stage').scrollIntoView({ behavior: 'smooth', block: 'start' });
  },
  playFinish() {
    $('#stage').scrollIntoView({ behavior: 'smooth', block: 'start' });
    S.ensure();
    start3d().then(() => setTimeout(() => stage.playFinish(), 500));
  },
  get3d,
  chosen,
};
document.querySelectorAll('[data-card]').forEach((el) => {
  try {
    CARDS[Number(el.dataset.card)].build(el.querySelector('.demo'), ctx);
  } catch (e) {
    el.querySelector('.demo').textContent = 'This demo could not start: ' + e.message;
    console.error(e);
  }
});

// ---------- 6 and 7. sounds and music ----------
// What the analysis found (tools/contour.py): key, and "rises" when the pitch climbs.
const TAG = {
  'reveal-hit': 'F major, rises',
  'reveal-pickup': 'F major, rises',
  'reveal-upper': 'C# major',
  'sparkle-a': 'D major',
  'sparkle-c': 'G# major, rises',
  'riser-a': 'rises',
  'chime-a': 'D major, rises',
  'done-pizzi': 'D# major, rises',
  'done-steel': 'D# major',
  'beat-pizzi': 'D major, rises',
  'beat-steel': 'D major, rises',
  'record-a': 'C major, rises',
  'record-b': 'F major',
  'goal-steel': 'A# major',
  'm-chest-pop-a': 'F major',
  'm-chest-pop-b': 'D major',
  'm-chest-pop-c': 'G major',
  'm-chest-cin-a': 'F major',
  'm-chest-cin-b': 'D major',
  'm-chest-cin-c': 'C major',
  'm-chest-fit-a': 'F major',
  'm-chest-fit-b': 'F major',
  'm-chest-fit-c': 'F major',
  'm-level-joth': 'G major',
  'm-level-rise': 'F major',
  'm-level-success': 'C major',
  'm-level-win': 'F major',
  'm-rank-a': 'E major',
  'm-rank-b': 'C major',
  'm-rank-c': 'C major',
};
const IN_KEY = new Set(['reveal', 'sparkle', 'tier', 'chime', 'done', 'beat', 'record', 'goal']);
const PL = '<svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><path d="M8 5v14l11-7z" fill="currentColor"/></svg>';
function chip(s, [v, l]) {
  const tag = TAG[v] || (IN_KEY.has(s.id) && v.startsWith('code') ? 'in key' : '');
  return `<button type="button" class="opt" data-v="${v}" aria-pressed="${PICK[s.id] === v}"><span class="pl">${PL}</span>${l}${tag ? ` <span class="atag">${tag}</span>` : ''}${v === s.pick ? ' <span class="mine">My pick</span>' : ''}</button>`;
}
function slotRow(s, isMusic) {
  const body = isMusic
    ? s.groups.map(([g, o]) => `${g ? `<span class="ghead">${g}</span>` : ''}${o.map((x) => chip(s, x)).join('')}`).join('')
    : s.opts.map((x) => chip(s, x)).join('');
  return `<div class="slot2" id="slot-${s.id}" data-slot="${s.id}" data-music="${isMusic ? 1 : 0}"><div><b>${s.label}</b><span class="where">${isMusic ? (s.id === 'm-chest' ? 'The reward stage, from the drop to the end' : s.id === 'm-level' ? 'Level up (32)' : 'Rank up (33)') : s.where}</span></div><div class="opts">${body}</div></div>`;
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
    setRewardKey();
    if (row.dataset.music === '1') {
      if (b.dataset.v === 'off') S.stopMusic(0.2);
      else if (b.dataset.v === 'code:shimmer') {
        // a preview: the bed, then three taps lifting it
        S.playMusic('code:shimmer', { loop: true });
        [0, 1, 2].forEach((i) => setTimeout(() => SHIMMER.lift(i), 900 * (i + 1)));
        setTimeout(() => S.stopMusic(0.6), 4200);
      } else if (b.dataset.v.startsWith('code:')) SYN[b.dataset.v.slice(5)]?.();
      else S.playMusic(b.dataset.v, { loop: false });
    } else play(id, {}, b.dataset.v);
  }),
);

// ---------- 8. tokens and springs ----------
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

// ---------- 9. settings ----------
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

// ---------- 11. what I need from you ----------
const optLabel = (list, sid) => list.find(([v]) => v === sid)?.[1] || sid;
const slot = (id) => SLOTS.find((s) => s.id === id);
const mus = (id) => MUSIC.find((s) => s.id === id);
get3d()
  .then((a) => a.mod)
  .catch(() => null)
  .then((m) => {
    const cName = (k) => m?.CHEST_OPTIONS[k].find((o) => o.id === CHEST_OPTS[k].pick)?.name || CHEST_OPTS[k].pick;
    const mName = (t) => m?.MEDAL_OPTIONS[t].find((o) => o.id === MEDAL_OPTS[t].pick)?.name || MEDAL_OPTS[t].pick;
    const P = (t) => `<span class="pick">My pick: ${t}</span>`;
    $('#decide-list').innerHTML = [
      `<b>Chest music:</b> one piece, or the shimmer, or none (section 7). ${P(optLabel(mus('m-chest').opts, mus('m-chest').pick))}`,
      `<b>The badge sound:</b> ${P(optLabel(slot('reveal').opts, slot('reveal').pick))}. And the lid: ${P(optLabel(slot('burst').opts, slot('burst').pick))}`,
      `<b>The reward stage:</b> the layout, the swirl, the new card, the tray and the summary without a heading. ${P('as shown')}`,
      `<b>The full finish:</b> Finish, a short roll and rise, Victory, then the chest. ${P('as shown')}`,
      `<b>Chests:</b> Silver, Crystal (${cName('diamond')}), Obsidian (${cName('master')}), Prismatic (${cName('legend')}), Monthly (${cName('monthly')}), Royal (${cName('royal')}). ${P('as marked in section 3')}`,
      `<b>Badges:</b> Gold (${mName('gold')}), Master (${mName('master')}), Legend (${mName('legend')}). ${P('as marked in section 4')}`,
      `<b>The rank up on the stage:</b> the old shield breaks, the new one rises, then the new rank's chest with the title and frame first. ${P('as shown')}`,
      `<b>The interactions marked Changed</b> in section 5: keep, or tell me what still feels off.`,
      `<b>New sound options:</b> exercise complete, beat last time, weekly goal, back and close, sheet open, level up. ${P('the ones marked in sections 6 and 7')}`,
      `<b>The Rank Road with chests:</b> on board 13, with its own questions.`,
    ]
      .map((t) => `<li>${t}</li>`)
      .join('');
  });

document.body.dataset.done = '1';
