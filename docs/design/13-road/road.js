// Board 13: the Rank Road with chests. A regular lifter's history is simulated with
// the real XP rules (WORKOUT_XP in lib/routines.ts, XP and xpForLevel in
// lib/progress.ts, the badge thresholds in lib/badges.ts), and the road is drawn
// from it in two looks: today's light road (A) and a Trophy Road (B).
import { shieldSVG } from '../12-motion/artvec.js';

// ---------- the rules, as the app has them ----------
export const xpForLevel = (n) => 50 * n * (n - 1);
export function levelForXp(xp) {
  let l = 1;
  while (xpForLevel(l + 1) <= xp) l++;
  return l;
}
export const rankForLevel = (l) => (l >= 30 ? 'S' : l >= 20 ? 'A' : l >= 15 ? 'B' : l >= 10 ? 'C' : l >= 5 ? 'D' : 'E');
export const GATES = { 1: 'E', 5: 'D', 10: 'C', 15: 'B', 20: 'A', 30: 'S' };
const GATE_LEVELS = [1, 5, 10, 15, 20, 30];
export const TITLE = (r) => `${r}-Rank Hunter`;
// The rule decided on board 12 round 2: your rank decides your chest.
export const RANK_CHEST = { E: 'bronze', D: 'silver', C: 'gold', B: 'diamond', A: 'master', S: 'legend' };
export const CHEST_NAME = { bronze: 'Wooden', silver: 'Silver', gold: 'Golden', diamond: 'Crystal', master: 'Obsidian', legend: 'Prismatic', monthly: 'Monthly', royal: 'Royal', pillow: 'Pillow' };
export const TIERS = ['bronze', 'silver', 'gold', 'diamond', 'master', 'legend'];
const TIER_LABEL = ['Bronze', 'Silver', 'Gold', 'Diamond', 'Master', 'Legend'];
const BADGE_XP = [25, 50, 100, 200, 350, 500];
export const FAMILIES = {
  finisher: { name: 'Finisher', shape: 'shield', icon: 'target', tiers: [1, 10, 25, 50, 100, 250], unit: 'training days' },
  iron: { name: 'Iron Mover', shape: 'hex', icon: 'dumbbell', tiers: [50, 250, 500, 1000, 2500, 5000], unit: 'sets' },
  record: { name: 'Record Breaker', shape: 'diamond', icon: 'trophy', tiers: [1, 5, 15, 30, 60, 100], unit: 'records' },
  streak: { name: 'Streak Keeper', shape: 'square', icon: 'week', tiers: [2, 4, 8, 12, 26, 52], unit: 'weeks in a row' },
  rounder: { name: 'All-Rounder', shape: 'circle', icon: 'star', tiers: [3, 6, 9, 12, 14, 16], unit: 'muscle groups' },
  scale: { name: 'Scale Keeper', shape: 'square', icon: 'calcheck', tiers: [7, 30, 60, 100, 200, 365], unit: 'weigh-ins' },
};
const gateFor = (level) => GATE_LEVELS.filter((g) => g <= level).pop();
const nextGate = (level) => GATE_LEVELS.find((g) => g > level) ?? null;
const fmt = (n) => Math.round(n).toLocaleString('en-US');

// ---------- a regular lifter: 3 workouts a week, 15 sets, goal 3, weighs in twice a week ----------
// Beats and records per workout are estimates; everything else is the app's own numbers.
export function simulate({ perWeek = 3, sets = 15, beats = [1, 2], prEarly = 1, prLate = 0.33, groups = [[0, 6], [2, 9], [5, 12], [11, 14], [25, 16]], weigh = 2, weeks = 110 } = {}) {
  let xp = 0;
  let prs = 0;
  let run = 0;
  const got = Object.fromEntries(Object.keys(FAMILIES).map((f) => [f, 0]));
  const tot = Object.fromEntries(Object.keys(FAMILIES).map((f) => [f, 0]));
  const out = [];
  let n = 0;
  for (let wk = 0; wk < weeks; wk++) {
    for (let d = 0; d < perWeek; d++) {
      n++;
      const before = levelForXp(xp);
      xp += sets * 5 + 50 + beats[n % beats.length] * 10;
      prs += wk < 8 ? prEarly : prLate;
      while (prs >= 1) {
        xp += 25;
        prs -= 1;
        tot.record++;
      }
      tot.finisher++;
      tot.iron += sets;
      tot.streak = wk + 1;
      tot.rounder = Math.max(...groups.filter(([w]) => w <= wk).map(([, g]) => g));
      tot.scale = Math.floor((wk + (d + 1) / perWeek) * weigh);
      if (d === 0) xp += weigh * 10;
      if (d === perWeek - 1) {
        run++;
        xp += Math.min(100, 50 + 10 * (run - 1));
      }
      const badges = [];
      for (const [f, info] of Object.entries(FAMILIES)) {
        const k = info.tiers.filter((t) => tot[f] >= t).length;
        while (got[f] < k) {
          xp += BADGE_XP[got[f]];
          badges.push({ fam: f, tier: got[f] });
          got[f]++;
        }
      }
      out.push({ n, week: wk + 1, xp, before, level: levelForXp(xp), badges, totals: { ...tot }, got: { ...got } });
    }
  }
  return out;
}

// The road for the moment after workout `upTo` (0 = a brand new account).
export function roadAt(hist, upTo) {
  const h = hist.slice(0, upTo);
  const last = h[h.length - 1];
  const xp = last ? last.xp : 0;
  const level = levelForXp(xp);
  const totals = last ? last.totals : Object.fromEntries(Object.keys(FAMILIES).map((f) => [f, 0]));
  const got = last ? last.got : Object.fromEntries(Object.keys(FAMILIES).map((f) => [f, 0]));
  // where each badge sits: on the level you reached that day; a rank-crossing workout's
  // badges came out of the new rank's chest, so they sit on its gate
  const at = {};
  for (const e of h) {
    const crossed = rankForLevel(e.level) !== rankForLevel(e.before);
    const row = crossed ? gateFor(e.level) : e.level;
    (at[row] ||= []).push(...e.badges);
  }
  // Up next: the badges closest to unlocking
  const upNext = Object.entries(FAMILIES)
    .filter(([f]) => got[f] < 6)
    .map(([f, info]) => ({ fam: f, tier: got[f], have: totals[f], need: info.tiers[got[f]], p: Math.min(0.99, totals[f] / info.tiers[got[f]]) }))
    .sort((a, b) => b.p - a.p)
    .slice(0, 3);
  const into = xp - xpForLevel(level);
  const needed = xpForLevel(level + 1) - xpForLevel(level);
  const top = Math.max(32, level + 2);
  return { xp, level, rank: rankForLevel(level), at, upNext, into, needed, top, week: last ? last.week : 0, workouts: upTo };
}

// ---------- pictures: medals and chests from board 12's 3D models, cached ----------
let artP = null;
const cache = new Map();
function art() {
  if (!artP)
    artP = import('../12-motion/art3d.js').then((m) => {
      const a = new m.Art({ width: 200, height: 200 });
      return a;
    });
  return artP;
}
export async function medalPic(fam, tier, variant) {
  const info = FAMILIES[fam];
  const key = `m:${fam}:${tier}:${variant || ''}`;
  if (!cache.has(key)) {
    const a = await art();
    const far = TIERS[tier] === 'legend' ? 6.8 : 4.6;
    cache.set(key, a.still(a.medal(TIERS[tier], info.shape, info.icon, null, { variant }), { w: 120, h: 120, cam: [0, 0.15, far], look: [0, 0, 0], rotY: -0.22, shadow: false }));
  }
  return cache.get(key);
}
export async function chestPic(chest, variant, open = false) {
  const key = `c:${chest}:${variant || ''}:${open}`;
  if (!cache.has(key)) {
    const a = await art();
    const c = a.chest(chest, variant);
    if (open) {
      if (c.userData.hinge) c.userData.hinge.rotation.x = -1.95;
      if (c.userData.inner) c.userData.inner.material.opacity = 1;
    }
    cache.set(key, a.still(c, { w: 260, h: 220, cam: [0, 2.2, 6.0], look: [0, 0.75, 0], rotY: -0.42 }));
  }
  return cache.get(key);
}
// Pictures are filled in after the markup is on the page.
export async function fillPics(root, opts = {}) {
  const els = [...root.querySelectorAll('img[data-pic]:not([src])')];
  for (const img of els) {
    const [kind, a, b, c] = img.dataset.pic.split(':');
    try {
      img.src = kind === 'm' ? await medalPic(a, Number(b), opts.medalVariant?.[TIERS[Number(b)]]) : await chestPic(a, opts.chestVariant?.[a], c === 'open');
    } catch {
      img.alt = '';
    }
    await new Promise((r) => setTimeout(r, 0));
  }
}
const medal = (b, cls = '') => `<img class="pm ${cls}" data-pic="m:${b.fam}:${b.tier}" alt="${FAMILIES[b.fam].name}, ${TIER_LABEL[b.tier]}" title="${FAMILIES[b.fam].name}, ${TIER_LABEL[b.tier]}">`;
const chestImg = (chest, cls = '', open = false) => `<img class="pc ${cls}" data-pic="c:${chest}:${open ? 'open' : ''}" alt="${CHEST_NAME[chest]} chest">`;
const shield = (r, size, level = null) => shieldSVG(r, level, { size });
const LOCK = '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>';
const TICK = '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="#fff" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
const STAR = '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round" aria-hidden="true"><path d="M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.8L12 16.8 6.8 19.6l1-5.8-4.3-4.1 5.9-.8z"/></svg>';

function medals(list, max = 5) {
  if (!list?.length) return '';
  const shown = list.slice(-max);
  const more = list.length - shown.length;
  return `<div class="meds">${shown.map((b) => `<span class="mw">${medal(b)}<i class="tk">${TICK}</i></span>`).join('')}${more ? `<span class="more">+${more}</span>` : ''}</div>`;
}
function upNext(road) {
  return `<div class="upn"><p class="upk">Up next</p>${road.upNext
    .map(
      (u) =>
        `<div class="upr">${medal({ fam: u.fam, tier: u.tier }, 'dim')}<div class="upt"><b>${FAMILIES[u.fam].name} <span>${TIER_LABEL[u.tier]}</span></b><div class="minibar"><i style="width:${Math.round(u.p * 100)}%"></i></div><small>${fmt(u.have)} of ${fmt(u.need)} ${FAMILIES[u.fam].unit}</small></div></div>`,
    )
    .join('')}</div>`;
}
const inside = (r) => `<small class="inside">Inside: the ${r}-Rank title and frame</small>`;

// ---------- look A: today's light road, with chests at the gates and badges on the rows ----------
export function roadA(road, { just = null } = {}) {
  const cur = road.level;
  const ng = nextGate(cur);
  const rows = [];
  for (let l = road.top; l >= 1; l--) {
    const done = l < cur;
    const now = l === cur;
    if (GATES[l]) {
      const r = GATES[l];
      const chest = RANK_CHEST[r];
      const state = l <= cur ? (gateFor(cur) === l ? 'current' : 'past') : l === ng ? 'next' : 'locked';
      const lv = l - cur;
      const gpct = ng ? Math.round(((road.xp - xpForLevel(gateFor(cur))) / (xpForLevel(ng) - xpForLevel(gateFor(cur)))) * 100) : 100;
      let body;
      if (state === 'past') body = `<div class="k">Unlocked at level ${l} · ${CHEST_NAME[chest]} chest opened</div><div class="gt">${TITLE(r)}</div>${inside(r)}`;
      else if (state === 'current')
        body = `<div class="k">Your rank · since level ${l}</div><div class="gt">${TITLE(r)}</div><small>Your chests are ${CHEST_NAME[chest]} now</small>${ng ? `<div class="bar"><i style="width:${gpct}%"></i></div><small>${ng - cur} ${ng - cur === 1 ? 'level' : 'levels'} to ${TITLE(GATES[ng])}</small>` : '<small>The top rank</small>'}`;
      else if (state === 'next')
        body = `<div class="k">Next rank · ${lv} ${lv === 1 ? 'level' : 'levels'} to go</div><div class="gt">${TITLE(r)}</div><small>Opens the ${CHEST_NAME[chest]} chest: the title and a ${r}-Rank frame. From then on your chests are ${CHEST_NAME[chest]}.</small><div class="bar"><i style="width:${gpct}%"></i></div>`;
      else body = `<div class="k">Rank gate · level ${l}</div><div class="gt">${TITLE(r)}</div><small>Opens the ${CHEST_NAME[chest]} chest: the title and a ${r}-Rank frame</small><span class="lockchip">${LOCK} Reach level ${l}</span>`;
      const nowPart = now ? `<div class="bar"><i style="width:${Math.round((road.into / road.needed) * 100)}%"></i></div><small><span class="nowk">Now</span> · ${fmt(road.into)} / ${fmt(road.needed)} XP to level ${l + 1}</small>` : '';
      const extra = `${nowPart}${road.at[l]?.length ? `<p class="came">Came in this chest</p>${medals(road.at[l], 6)}` : ''}${now ? upNext(road) : ''}`;
      rows.push(
        `<li class="rrow gate g-${state}${done ? ' done' : ''}${now ? ' cur' : ''}${just === l ? ' just' : ''}" data-l="${l}"><span class="node"><span class="sh${l > cur ? ' locked' : ''}">${shield(r, 54)}${l > cur ? `<i class="lk">${LOCK}</i>` : ''}</span></span><div class="gcard"><div class="gtop"><div class="gtext">${body}</div><div class="gchest">${chestImg(chest, '', l <= cur)}${l <= cur ? `<i class="ok">${TICK}</i>` : ''}</div></div>${extra ? `<div class="gmore">${extra}</div>` : ''}</div></li>`,
      );
    } else {
      const label = now ? `${fmt(xpForLevel(l))} XP` : done ? 'Cleared' : `${fmt(xpForLevel(l) - road.xp)} XP to go`;
      rows.push(
        `<li class="rrow${done ? ' done' : ''}${now ? ' cur' : ''}" data-l="${l}"><span class="node">${now ? `<span class="pulse">${shield(road.rank, 44, l)}</span>` : `<span class="dot">${l}</span>`}</span><div class="rt"><b>Level ${l}</b><small>${label}</small>${now ? `<div class="bar"><i style="width:${Math.round((road.into / road.needed) * 100)}%"></i></div><small><span class="nowk">Now</span> · ${fmt(road.into)} / ${fmt(road.needed)} XP to level ${l + 1}</small>${upNext(road)}` : ''}${medals(road.at[l])}</div></li>`,
      );
    }
  }
  const chip = ng ? `<div class="nextchip"><span class="chip">${STAR} Next rank: ${TITLE(GATES[ng])} at level ${ng}</span></div>` : '';
  return `${chip}<ol class="road">${rows.join('')}</ol>`;
}

// ---------- look B: a Trophy Road on the stage blue, tiles on a rail with a marker ----------
export function roadB(road, { just = null } = {}) {
  const cur = road.level;
  const ng = nextGate(cur);
  const tiles = [];
  for (let l = road.top; l >= 1; l--) {
    const done = l < cur;
    const now = l === cur;
    const ahead = l > cur;
    if (GATES[l]) {
      const r = GATES[l];
      const chest = RANK_CHEST[r];
      const reached = l <= cur;
      const state = reached ? `<span class="pill ok">${TICK} Opened at level ${l}</span>` : l === ng ? `<span class="pill next">${l - cur} ${l - cur === 1 ? 'level' : 'levels'} to go</span>` : `<span class="pill lock">${LOCK} Level ${l}</span>`;
      tiles.push(
        `<div class="tile gate r-${r}${reached ? ' reached' : ''}${now ? ' now' : ''}${just === l ? ' just' : ''}" data-l="${l}"><span class="tl">${l}</span><div class="gl"><span class="sh">${shield(r, 46)}</span><div><b>${TITLE(r)}</b><small>${CHEST_NAME[chest]} chest: title and frame</small>${state}</div></div><div class="gc">${chestImg(chest, '', reached)}${reached ? `<i class="ok">${TICK}</i>` : ''}</div>${road.at[l]?.length ? medals(road.at[l], 6) : ''}${now ? `<div class="gnow"><div class="bar"><i style="width:${Math.round((road.into / road.needed) * 100)}%"></i></div><small>${fmt(road.into)} / ${fmt(road.needed)} XP to level ${l + 1}</small>${upNext(road)}</div>` : ''}</div>`,
      );
    } else {
      tiles.push(
        `<div class="tile lvl${done ? ' done' : ''}${now ? ' now' : ''}${ahead ? ' ahead' : ''}" data-l="${l}"><span class="tl">${l}</span>${now ? `<div class="tnow"><b>Level ${l}</b><div class="bar"><i style="width:${Math.round((road.into / road.needed) * 100)}%"></i></div><small>${fmt(road.into)} / ${fmt(road.needed)} XP</small>${upNext(road)}</div>` : done ? road.at[l]?.length ? medals(road.at[l], 6) : '<small class="cleared">Cleared</small>' : `<small class="xpa">${fmt(xpForLevel(l))} XP</small>`}</div>`,
      );
    }
  }
  return `<div class="troad"><div class="rail"><i></i></div><div class="marker">You · ${cur}</div>${tiles.join('')}</div>`;
}

// Puts the rail fill and the marker at your tile, and scrolls it into view.
export function placeB(scroller) {
  const troad = scroller.querySelector('.troad');
  const now = troad?.querySelector('.tile.now');
  if (!now) return;
  const top = now.offsetTop + now.offsetHeight / 2;
  troad.querySelector('.rail i').style.top = `${top}px`;
  const m = troad.querySelector('.marker');
  m.style.top = `${top - 14}px`;
}
export function scrollToNow(scroller, sel = '.cur, .now') {
  const el = scroller.querySelector(sel);
  if (el) scroller.scrollTop = el.offsetTop - scroller.clientHeight / 2 + el.offsetHeight / 2;
}

// ---------- the numbers for the board ----------
// When each chest first opens, for a regular and a casual lifter.
export function firstChests(hist) {
  const out = {};
  for (const e of hist) {
    const r = rankForLevel(e.level);
    const c = RANK_CHEST[r];
    const crossed = r !== rankForLevel(e.before);
    if ((crossed || e.badges.length) && !out[c]) out[c] = e.week;
  }
  return out;
}
