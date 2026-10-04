// Board 13: the Rank Road with chests. A regular lifter's history is simulated with
// the real XP rules (WORKOUT_XP in lib/routines.ts, XP and xpForLevel in
// lib/progress.ts, the badge thresholds in lib/badges.ts), and the road is drawn
// from it: today's light road with a chest at each rank gate.
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
  // where each badge sits: on the level you reached that day; a rank-crossing workout's
  // badges came out of the new rank's chest, so they sit on its gate
  const at = {};
  for (const e of h) {
    const crossed = rankForLevel(e.level) !== rankForLevel(e.before);
    const row = crossed ? gateFor(e.level) : e.level;
    (at[row] ||= []).push(...e.badges);
  }
  const into = xp - xpForLevel(level);
  const needed = xpForLevel(level + 1) - xpForLevel(level);
  const top = Math.max(32, level + 2);
  return { xp, level, rank: rankForLevel(level), at, into, needed, top, week: last ? last.week : 0, workouts: upTo };
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

// ---------- the road (look A, signed off): today's light road with a chest at each rank ----------
// Round 2: gate cards take their rank's colours (from look B), say the rank and the level
// once, and name the chest in a few words. Your progress to the next level runs along
// the road's own line instead of a bar in a card. `badges: false` draws the road
// without the medals on the rows, for the open question on the board.
export function roadA(road, { just = null, badges = true } = {}) {
  const cur = road.level;
  const ng = nextGate(cur);
  const meds = (list, max) => (badges ? medals(list, max) : '');
  const rows = [];
  for (let l = road.top; l >= 1; l--) {
    const done = l < cur;
    const now = l === cur;
    const pct = now ? Math.round((road.into / road.needed) * 100) : 0;
    if (GATES[l]) {
      const r = GATES[l];
      const chest = RANK_CHEST[r];
      const state = l <= cur ? (gateFor(cur) === l ? 'current' : 'past') : 'locked';
      const where = state === 'current' ? `<small class="gl">Your rank, since level ${l}</small>` : state === 'past' ? `<small class="gl">Level ${l}</small>` : `<span class="lockchip">${LOCK} Level ${l}</span>`;
      rows.push(
        `<li class="rrow gate g-${state} r-${r}${done ? ' done' : ''}${now ? ' cur' : ''}${just === l ? ' just' : ''}" data-l="${l}"${now ? ` data-pct="${pct}"` : ''}><span class="node"><span class="sh${l > cur ? ' locked' : ''}">${shield(r, 54)}${l > cur ? `<i class="lk">${LOCK}</i>` : ''}</span></span><div class="gcard"><div class="gtop"><div class="gtext"><div class="gt">${r} rank</div>${where}<small class="gc2">${CHEST_NAME[chest]} chest: title and frame</small></div><div class="gchest">${chestImg(chest, '', l <= cur)}${l <= cur ? `<i class="ok">${TICK}</i>` : ''}</div></div>${meds(road.at[l], 6)}</div></li>`,
      );
    } else {
      const label = now ? '<span class="nowk">You are here</span>' : done ? 'Cleared' : `${fmt(xpForLevel(l) - road.xp)} XP to go`;
      rows.push(
        `<li class="rrow${done ? ' done' : ''}${now ? ' cur' : ''}" data-l="${l}"${now ? ` data-pct="${pct}"` : ''}><span class="node">${now ? `<span class="pulse">${shield(road.rank, 44, l)}</span>` : `<span class="dot">${l}</span>`}</span><div class="rt"><b>Level ${l}</b><small>${label}</small>${meds(road.at[l])}</div></li>`,
      );
    }
  }
  const chip = ng ? `<div class="nextchip"><span class="chip">${STAR} Next rank: ${GATES[ng]} at level ${ng}</span></div>` : '';
  return `${chip}<ol class="road">${rows.join('')}</ol>`;
}

// Your progress to the next level, drawn on the road's line between your level and the
// next one, with a glowing tip where you are.
export function placeFill(scroller) {
  const roadEl = scroller.querySelector('.road');
  const cur = roadEl?.querySelector('.rrow.cur');
  const up = cur?.previousElementSibling;
  if (!cur || !up) return;
  roadEl.querySelector('.fillnow')?.remove();
  // the visible stretch: from the top of your shield to the bottom of the next level's dot,
  // measured on screen and divided by any scale the road is drawn at
  const rr = roadEl.getBoundingClientRect();
  const k = rr.height / roadEl.offsetHeight || 1;
  const edge = (li, side) => {
    const r = li.querySelector('.node > *').getBoundingClientRect();
    return ((side === 'top' ? r.top : r.bottom) - rr.top) / k;
  };
  const from = edge(cur, 'top');
  const to = edge(up, 'bottom');
  const h = (from - to) * (Number(cur.dataset.pct) / 100);
  const f = document.createElement('i');
  f.className = 'fillnow';
  f.style.top = `${from - h}px`;
  f.style.height = `${h}px`;
  roadEl.append(f);
}

export function scrollToNow(scroller, sel = '.cur') {
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
