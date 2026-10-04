// Board 13 (round 2): wiring. The moment chips, the road on a phone and a computer,
// the road with and without badges, the chest table, and the rank up that hands
// back to the road.
import { S, SYN } from '../12-motion/sound.js';
import { RewardStage } from '../12-motion/stage.js';
import { simulate, roadAt, roadA, placeFill, scrollToNow, fillPics, firstChests, RANK_CHEST, CHEST_NAME } from './road.js';

const $ = (s) => document.querySelector(s);

// ---------- switches ----------
function toggle(id, set) {
  const b = $(id);
  b.addEventListener('click', () => {
    const v = b.getAttribute('aria-checked') !== 'true';
    b.setAttribute('aria-checked', String(v));
    set(v);
    if (v) SYN.switchOn();
    else SYN.switchOff();
  });
}
toggle('#t-sound', (v) => {
  S.on = v;
  if (!v) S.stopMusic(0.1);
});
toggle('#t-music', (v) => {
  S.music = v;
  if (!v) S.stopMusic(0.2);
});
document.addEventListener('pointerdown', () => S.ensure(), { once: true });

// The chest and medal looks follow your picks on board 12 when this browser has them.
const art = { chest: { silver: 'a', diamond: 'a', master: 'b', legend: 'b', monthly: 'c', royal: 'a' }, medal: { gold: 'emerald', master: 'molten', legend: 'halo' } };
try {
  const saved = JSON.parse(localStorage.getItem('levl-b12-art-r2') || '{}');
  Object.assign(art.chest, saved.chest || {});
  Object.assign(art.medal, saved.medal || {});
} catch {}
const picOpts = { chestVariant: art.chest, medalVariant: art.medal };

// ---------- the lifter ----------
const hist = simulate();
const reach = (level) => hist.findIndex((e) => e.level >= level) + 1;
const STATES = [
  ['New, level 1', 0],
  ['D rank, level 7', reach(7)],
  ['Level 9, C is next', reach(9)],
  ['Just reached C', reach(10)],
  ['S rank, level 30', reach(30)],
];

// ---------- 1. the chests and when they first open ----------
const RANKS = ['E', 'D', 'C', 'B', 'A', 'S'];
const FROM = { E: 1, D: 5, C: 10, B: 15, A: 20, S: 30 };
const firsts = firstChests(hist);
// the casual lifter, from the same rules (2 a week, 10 sets, misses every 4th week)
const CASUAL = { bronze: 'Week 1', silver: 'Week 3', gold: 'Week 17', diamond: 'Week 43', master: 'After the first year', legend: 'After the first year' };
$('#firsts').innerHTML = RANKS.map((r) => {
  const c = RANK_CHEST[r];
  return `<tr><td><b>${CHEST_NAME[c]}</b></td><td>${r}</td><td>${FROM[r]}</td><td>${firsts[c] ? `Week ${firsts[c]}` : 'Later'}</td><td>${CASUAL[c]}</td></tr>`;
}).join('');
const THEMED = [
  ['monthly', 'Monthly badges'],
  ['royal', 'Special badges'],
  ['pillow', 'Secret rest badges'],
];
$('#chests').innerHTML =
  RANKS.map((r) => `<div class="ctile"><div class="cimg"><img data-pic="c:${RANK_CHEST[r]}:" alt="${CHEST_NAME[RANK_CHEST[r]]} chest"></div><b>${CHEST_NAME[RANK_CHEST[r]]}</b><small>${r} rank, from level ${FROM[r]}</small></div>`).join('') +
  THEMED.map(([k, w]) => `<div class="ctile"><div class="cimg"><img data-pic="c:${k}:" alt="${CHEST_NAME[k]} chest"></div><b>${CHEST_NAME[k]}</b><small>${w}</small></div>`).join('');

// ---------- 2 and 3. the road on a phone and on a computer ----------
const NAV_I = {
  Home: '<path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
  Routines: '<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V3h6v1M9 10h6M9 14h6"/>',
  Rank: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/>',
  Profile: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
};
const navIcon = (n) => `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${NAV_I[n]}</svg>`;
const NAV = `<span>${navIcon('Home')}Home</span><span>${navIcon('Routines')}Routines</span><span class="wo">+ WORKOUT</span><span class="on">${navIcon('Rank')}Rank</span><span>${navIcon('Profile')}Profile</span>`;
document.querySelectorAll('.anav').forEach((n) => (n.innerHTML = NAV));

let cur = 1;
function show(i, { just = null } = {}) {
  cur = i;
  const road = roadAt(hist, STATES[i][1]);
  const A = $('#roadA');
  const D = $('#roadD');
  A.innerHTML = roadA(road, { just });
  D.innerHTML = roadA(road, { just });
  requestAnimationFrame(() =>
    [A, D].forEach((s) => {
      placeFill(s);
      scrollToNow(s);
    }),
  );
  [A, D].forEach((s) => fillPics(s, picOpts));
  document.querySelectorAll('#states .chip').forEach((c, k) => {
    c.classList.toggle('on', k === i);
    c.setAttribute('aria-pressed', String(k === i));
  });
}
$('#states').innerHTML = STATES.map(([label], i) => `<button type="button" class="chip" aria-pressed="false" data-i="${i}">${label}</button>`).join('');
$('#states').addEventListener('click', (e) => {
  const b = e.target.closest('.chip');
  if (!b) return;
  SYN.pip(1);
  show(Number(b.dataset.i));
});

// ---------- the open question: badges on the road, or not ----------
{
  const road = roadAt(hist, STATES[4][1]);
  [
    ['#roadQ1', true],
    ['#roadQ2', false],
  ].forEach(([id, badges]) => {
    const q = $(id);
    q.innerHTML = roadA(road, { badges });
    fillPics(q, picOpts);
    requestAnimationFrame(() => {
      placeFill(q);
      const el = q.querySelector('[data-l="27"]');
      if (el) q.scrollTop = el.offsetTop - 40;
    });
  });
}

// the computer layout is drawn at its real size and scaled to fit the board
const deskwrap = $('#deskwrap');
const desk = deskwrap.querySelector('.desk');
const fitDesk = () => {
  const k = Math.min(1, deskwrap.clientWidth / 1212);
  desk.style.transform = `scale(${k})`;
  deskwrap.style.height = `${772 * k}px`;
};
new ResizeObserver(fitDesk).observe(deskwrap);
fitDesk();

// ---------- 4. crossing a rank, then back to the road ----------
const stage = new RewardStage($('#stagehost'));
stage.variant = art.chest;
stage.medalVariant = art.medal;
let started = null;
const start3d = () => (started ||= stage.start3d());
new IntersectionObserver((ents) => ents.some((e) => e.isIntersecting) && start3d()).observe($('#stagehost'));
const X = $('#roadX');
function showX(i, just = null) {
  const road = roadAt(hist, STATES[i][1]);
  X.innerHTML = roadA(road, { just });
  fillPics(X, picOpts);
  requestAnimationFrame(() => {
    placeFill(X);
    const el = just ? X.querySelector(`[data-l="${just}"]`) : X.querySelector('.cur');
    if (el) X.scrollTop = el.offsetTop - X.clientHeight / 2 + el.offsetHeight / 2;
  });
}
showX(2);
$('#playcross').addEventListener('click', async () => {
  S.ensure();
  showX(2);
  await start3d();
  const r = $('#stagehost').getBoundingClientRect();
  if (r.top < 0 || r.bottom > innerHeight) $('#stagehost').scrollIntoView({ behavior: 'smooth', block: 'center' });
  stage.playFinish({ rankUp: 'C' });
});
stage.host.addEventListener('done', () => {
  stage.idle();
  showX(3, 10);
  SYN.clink(1.2);
});

// chest pictures for section 1, then the road
fillPics($('#chests'), picOpts);
show(1);
document.body.dataset.done = '1';
