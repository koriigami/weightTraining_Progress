// Levl share card: one self-contained SVG. Every colour is literal, fonts are named
// 'Levl Display' (Lilita One) and 'Levl Body' (Figtree), ids carry a prefix.
const CW = 1080;
const C = {
  sky: ['#4aa8f5', '#2f8fe8', '#1d5fbf'], frame: '#f5c542', stroke: '#0e3a7a', xp: '#fff28f',
  cream: '#fff8e8', ink: '#2e1f0c', muted: '#795f3f', bevel: '#d7ba7c', okSoft: '#ddf5d2',
  hi: '#27a844', sec: '#a9de8f', muscle: '#eadcba', skin: '#f5ead1', bodyline: '#fffdf6',
};
const FD = "'Levl Display','Arial Rounded MT Bold','Trebuchet MS',sans-serif";
const FB = "'Levl Body',system-ui,-apple-system,'Segoe UI',sans-serif";
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// ---------------- seeded sky ----------------
function hashSeed(s) { let h = 0x811c9dc5; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); } return h >>> 0; }
function mulberry32(a) { return function () { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
// The two clouds of the app's --cloud art, centred on 0,0.
const STAMPS = [
  { w: 176, h: 64, e: [[-36, 12, 52, 20], [4, -4, 40, 28], [44, 10, 44, 18]] },
  { w: 120, h: 37, e: [[-26, 5.5, 34, 13], [2, -2.5, 24, 16], [30, 5.5, 30, 12]] },
];
const overlap = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
function skyClouds(seed, { width, height, count = 16, keepOut = [] }) {
  const r = mulberry32(hashSeed(seed));
  const out = [];
  for (let tries = 0; out.length < count && tries < count * 60; tries++) {
    const layer = out.length < Math.round(count * 0.45) ? 'far' : 'near';
    const stamp = r() < 0.55 ? 0 : 1;
    const s = layer === 'far' ? 0.8 + r() * 0.6 : 1.3 + r() * 1.0;
    const w = STAMPS[stamp].w * s, h = STAMPS[stamp].h * s;
    const x = -0.08 * width + r() * 1.16 * width, y = 0.02 * height + r() * 0.96 * height;
    const box = { x: x - w / 2, y: y - h / 2, w, h };
    if (keepOut.some((k) => overlap(box, k))) continue;
    if (out.some((o) => o.layer === layer && overlap({ x: box.x + w * 0.15, y: box.y, w: w * 0.7, h }, o.box))) continue;
    out.push({ x, y, s, flip: r() < 0.5, stamp, layer, opacity: layer === 'far' ? 0.2 + r() * 0.12 : 0.42 + r() * 0.26, box });
  }
  return out;
}
function cloudSvg(c) {
  const sx = c.flip ? -c.s : c.s;
  return `<g transform="translate(${c.x.toFixed(1)} ${c.y.toFixed(1)}) scale(${sx.toFixed(3)} ${c.s.toFixed(3)})" fill="#fff" opacity="${c.opacity.toFixed(2)}">${STAMPS[c.stamp].e.map(([x, y, rx, ry]) => `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}"/>`).join('')}</g>`;
}
function tiledSky(p, H) {
  // The current look: the --cloud tile repeated in a grid (300x64 on a ~420 px card).
  const k = CW / 420, tw = 300 * k, th = 64 * k;
  let g = '';
  for (let y = 0; y < H + th; y += th) for (let x = 0; x < CW + tw; x += tw)
    g += `<g transform="translate(${x.toFixed(1)} ${y.toFixed(1)}) scale(${(tw / 420).toFixed(3)} ${(th / 90).toFixed(3)})"><ellipse cx="70" cy="62" rx="52" ry="20"/><ellipse cx="110" cy="46" rx="40" ry="28"/><ellipse cx="150" cy="60" rx="44" ry="18"/><ellipse cx="300" cy="32" rx="34" ry="13"/><ellipse cx="328" cy="24" rx="24" ry="16"/><ellipse cx="356" cy="32" rx="30" ry="12"/></g>`;
  return `<g fill="#fff" opacity=".3">${g}</g>`;
}

// ---------------- text helpers ----------------
// Lilita One advance widths per 1000 em, measured in Chromium. Unknown characters count as 'M'-ish.
const LILITA = {"0": 639, "1": 406, "2": 525, "3": 528, "4": 598, "5": 524, "6": 575, "7": 500, "8": 570, "9": 565, " ": 188, "!": 287, "\"": 460, "#": 833, "$": 531, "%": 798, "&": 667, "'": 301, "(": 430, ")": 422, "*": 557, "+": 602, ",": 305, "-": 525, ".": 229, "/": 573, ":": 277, ";": 277, "<": 484, "=": 580, ">": 450, "?": 584, "@": 867, "A": 655, "B": 594, "C": 561, "D": 616, "E": 493, "F": 472, "G": 621, "H": 644, "I": 429, "J": 462, "K": 620, "L": 435, "M": 907, "N": 648, "O": 696, "P": 570, "Q": 706, "R": 590, "S": 531, "T": 502, "U": 628, "V": 661, "W": 953, "X": 683, "Y": 615, "Z": 563, "[": 385, "\\": 587, "]": 385, "^": 687, "_": 636, "`": 350, "a": 517, "b": 520, "c": 424, "d": 565, "e": 486, "f": 375, "g": 516, "h": 501, "i": 273, "j": 271, "k": 531, "l": 272, "m": 788, "n": 551, "o": 513, "p": 555, "q": 511, "r": 396, "s": 450, "t": 368, "u": 544, "v": 521, "w": 752, "x": 557, "y": 537, "z": 454, "{": 362, "|": 628, "}": 362, "~": 459, "…": 909, "·": 309};
const textW = (s, size) => ([...s].reduce((a, ch) => a + (LILITA[ch] ?? 620), 0) / 1000) * size * 1.02;
// Letter height of both fonts is 0.71 em, so a line of text is centred on cy when its baseline is cy + 0.355 * size.
const baseFor = (cy, size) => cy + 0.355 * size;
// One line, always: shrink through the steps, then cut at the last whole word that fits and add an ellipsis.
function fitOne(title, max, steps = [88, 80, 72, 64]) {
  const t = title.trim().replace(/\s+/g, ' ');
  for (const size of steps) if (textW(t, size) <= max) return { size, text: t };
  const size = steps[steps.length - 1], words = t.split(' ');
  for (let n = words.length - 1; n >= 1; n--) { const c = words.slice(0, n).join(' ') + '\u2026'; if (textW(c, size) <= max) return { size, text: c }; }
  let c = words[0]; while (c.length > 1 && textW(c + '\u2026', size) > max) c = c.slice(0, -1);
  return { size, text: c + '\u2026' };
}
// Lilita One averages about 0.5 em per character, digits a little more.
const estW = (s, size, k = 0.52) => [...s].reduce((w, ch) => w + (ch === ' ' ? 0.26 : /[mwMW]/.test(ch) ? 0.78 : /[il.,:'1]/.test(ch) ? 0.3 : k), 0) * size;
function fitTitle(title, max, steps = [96, 84, 72]) {
  for (const s of steps) if (estW(title, s) <= max) return { size: s, lines: [title] };
  const words = title.split(/\s+/);
  for (const s of [72, 64]) {
    let best = null;
    for (let i = 1; i < words.length; i++) {
      const a = words.slice(0, i).join(' '), b = words.slice(i).join(' ');
      const w = Math.max(estW(a, s), estW(b, s));
      if (w <= max && (!best || w < best.w)) best = { w, lines: [a, b] };
    }
    if (best) return { size: s, lines: best.lines };
  }
  let t = title; while (t.length > 1 && estW(t + '...', 64) > max * 2 - 40) t = t.slice(0, -1);
  const words2 = (t.trim() + '...').split(' '); const mid = Math.ceil(words2.length / 2);
  return { size: 64, lines: [words2.slice(0, mid).join(' '), words2.slice(mid).join(' ')].filter(Boolean) };
}
// Game title text: a navy drop copy, then white (or gold) with a navy outline.
function gameText(x, y, str, size, { fill = '#fff', anchor = 'middle', drop = 0.08, sw = 0.16 } = {}) {
  const common = `x="${x}" y="${y}" text-anchor="${anchor}" font-family="${FD}" font-size="${size}" stroke="${C.stroke}" stroke-width="${(size * sw).toFixed(1)}" stroke-linejoin="round" paint-order="stroke"`;
  return `<text ${common} fill="${C.stroke}" transform="translate(0 ${(size * drop).toFixed(1)})">${esc(str)}</text><text ${common} fill="${fill}">${esc(str)}</text>`;
}

// ---------------- art ----------------
const SHIELD = 'M60 4 C80 12 98 12 112 10 V58 C112 92 90 116 60 128 C30 116 8 92 8 58 V10 C22 12 40 12 60 4 Z';
const RANK_MATERIALS = {
  E: { rim: ['#DCE2EA', '#5B6470'], face: ['#98A3B1', '#3E4652'] }, D: { rim: ['#A6F3CF', '#0F7A4F'], face: ['#3DC98A', '#0A5236'] },
  C: { rim: ['#BFE1FF', '#1D4ED8'], face: ['#5AA2FF', '#14318F'] }, B: { rim: ['#E7CCFF', '#6B21A8'], face: ['#B272F0', '#46106F'] },
  A: { rim: ['#FFF0A8', '#A36B00'], face: ['#FFC933', '#7A4E00'] }, S: { rim: ['#FFC2CE', '#9F1239'], face: ['#FF5C7C', '#6E0B27'], glow: '#FF4D6D' },
};
const LETTER_DX = { C: -3, D: 3, B: 1.5 };
function shieldArt(p, rank, level) {
  const m = RANK_MATERIALS[rank], k = 'translate(60 66) scale(.82) translate(-60 -66)';
  return `<defs><linearGradient id="${p}a" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${m.rim[0]}"/><stop offset="1" stop-color="${m.rim[1]}"/></linearGradient><linearGradient id="${p}f" x1="0" y1="0" x2=".6" y2="1"><stop offset="0" stop-color="${m.face[0]}"/><stop offset="1" stop-color="${m.face[1]}"/></linearGradient><clipPath id="${p}c"><path d="${SHIELD}" transform="${k}"/></clipPath>${m.glow ? `<filter id="${p}g" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="7"/></filter>` : ''}<filter id="${p}t" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="3" stdDeviation="0" flood-color="#000" flood-opacity=".35"/></filter></defs>
${m.glow ? `<path d="${SHIELD}" fill="${m.glow}" opacity=".55" filter="url(#${p}g)"/>` : ''}<path d="${SHIELD}" fill="url(#${p}a)"/><path d="${SHIELD}" fill="url(#${p}f)" transform="${k}"/><g clip-path="url(#${p}c)"><path d="M0 0 H120 V52 C80 44 40 60 0 50 Z" fill="#fff" opacity=".16"/></g><path d="${SHIELD}" fill="none" stroke="rgba(255,255,255,.6)" stroke-width="1.3" transform="${k}"/>
<text x="${60 + (LETTER_DX[rank] || 0)}" y="69" text-anchor="middle" font-family="${FD}" font-size="54" fill="#fff" filter="url(#${p}t)">${rank}</text><text x="60" y="93" text-anchor="middle" font-family="${FD}" font-size="15" fill="#fff" opacity=".92">LV ${level}</text>`;
}
function markArt(p) {
  const G = (id, s) => `<linearGradient id="${p}${id}" x1="0" y1="0" x2="0" y2="1">${s.map(([o, c]) => `<stop offset="${o}" stop-color="${c}"/>`).join('')}</linearGradient>`;
  const ch = (y, g, o) => `<path d="M34 ${y + 20} L60 ${y} L86 ${y + 20}" fill="none" stroke="url(#${p}${g})" stroke-opacity="${o}" stroke-width="11" stroke-linecap="round" stroke-linejoin="round"/>`;
  return `<defs>${G('b', [[0, '#5FD24A'], [0.5, '#2BA438'], [1, '#1E8A2E']])}${G('c', [[0, '#FFFFFF'], [1, '#F2FFE9']])}${G('t', [[0, '#FFF2A6'], [1, '#FFC21A']])}${G('r', [[0, '#FFF2A6'], [1, '#E0A316']])}</defs><rect x="4" y="8" width="112" height="108" rx="30" fill="#186A20"/><rect x="4" y="4" width="112" height="108" rx="30" fill="url(#${p}b)"/><rect x="10.5" y="10.5" width="99" height="95" rx="24" fill="none" stroke="url(#${p}r)" stroke-opacity=".85" stroke-width="1.5"/>${ch(28, 't', 1)}${ch(48, 'c', 0.85)}${ch(68, 'c', 0.5)}`;
}
const BODY = {
  front: { base: 'M31 34 Q50 28 69 34 L66 86 Q50 94 34 86 Z',
    left: [['shoulders', 'e', 29, 43, 8, 7.5], ['chest', 'r', 35, 36, 14, 15, 5], ['biceps', 'e', 24, 60, 5, 10.5], ['forearms', 'e', 20.5, 83, 4.3, 11.5], [null, 'c', 19, 100, 4], ['obliques', 'r', 34.5, 54, 5.5, 27, 2.75], ['quads', 'r', 35.5, 96, 13, 46, 6.5], [null, 'c', 42, 147, 4.5], ['calves', 'r', 37.5, 154, 9, 34, 4.5], [null, 'e', 41, 193, 5.5, 3]],
    center: [[null, 'c', 50, 15, 10], [null, 'r', 45.5, 25, 9, 8, 3], ['abs', 'r', 41.5, 54, 8, 8.5, 2.5], ['abs', 'r', 50.5, 54, 8, 8.5, 2.5], ['abs', 'r', 41.5, 64, 8, 8.5, 2.5], ['abs', 'r', 50.5, 64, 8, 8.5, 2.5], ['abs', 'r', 41.5, 74, 8, 9, 2.5], ['abs', 'r', 50.5, 74, 8, 9, 2.5], [null, 'r', 37, 85, 26, 9, 4]] },
  back: { base: 'M31 34 Q50 28 69 34 L66 86 Q50 94 34 86 Z',
    left: [['shoulders', 'e', 29, 43, 8, 7.5], ['upperback', 'r', 40, 45, 9, 13, 3], ['lats', 'p', 'M33.5 48 L39 48 L42.5 60 L42.5 82 L39.5 82 Q30 66 33.5 48 Z'], ['triceps', 'e', 24, 60, 5, 10.5], ['forearms', 'e', 20.5, 83, 4.3, 11.5], [null, 'c', 19, 100, 4], ['glutes', 'r', 36, 86, 13.5, 17, 7], ['hamstrings', 'r', 35.5, 105, 13, 38, 6.5], [null, 'c', 42, 147, 4.5], ['calves', 'e', 41.5, 165, 6, 14], [null, 'r', 38.5, 178, 6, 10, 3], [null, 'e', 41, 193, 5.5, 3]],
    center: [[null, 'c', 50, 15, 10], [null, 'r', 45.5, 25, 9, 8, 3], ['traps', 'p', 'M42 28 H58 L70 39 L58 44 L50 51 L42 44 L30 39 Z'], ['lowerback', 'r', 44, 62, 12, 22, 4]] },
};
function shape(s, fill) {
  const [, t, ...a] = s, st = `fill="${fill}" stroke="${C.bodyline}" stroke-width="1.2"`;
  if (t === 'e') return `<ellipse cx="${a[0]}" cy="${a[1]}" rx="${a[2]}" ry="${a[3]}" ${st}/>`;
  if (t === 'c') return `<circle cx="${a[0]}" cy="${a[1]}" r="${a[2]}" ${st}/>`;
  if (t === 'r') return `<rect x="${a[0]}" y="${a[1]}" width="${a[2]}" height="${a[3]}" rx="${a[4]}" ${st}/>`;
  return `<path d="${a[0]}" ${st}/>`;
}
function bodyArt(view, fillFor) {
  const b = BODY[view], f = (s) => (s[0] ? fillFor(s[0]) : C.skin);
  return `<path d="${b.base}" fill="${C.skin}"/>${b.left.map((s) => shape(s, f(s))).join('')}<g transform="matrix(-1 0 0 1 100 0)">${b.left.map((s) => shape(s, f(s))).join('')}</g>${b.center.map((s) => shape(s, f(s))).join('')}`;
}
function mixHex(a, b, pct) {
  const p = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const x = p(a), y = p(b), t = pct / 100;
  return '#' + x.map((v, i) => Math.round(v + (y[i] - v) * t).toString(16).padStart(2, '0')).join('');
}
function fillFor(muscles, mode) {
  if (mode === 'heat') {
    const max = Math.max(...Object.values(muscles.sets));
    return (m) => (muscles.sets[m] ? mixHex(C.muscle, C.hi, 30 + 70 * (muscles.sets[m] / max)) : C.muscle);
  }
  return (m) => (muscles.primary.includes(m) ? C.hi : muscles.secondary.includes(m) ? C.sec : C.muscle);
}
const LABEL = { chest: 'Chest', shoulders: 'Shoulders', triceps: 'Triceps', biceps: 'Biceps', forearms: 'Forearms', upperback: 'Upper back', lats: 'Lats', traps: 'Traps', lowerback: 'Lower back', abs: 'Abs', obliques: 'Obliques', glutes: 'Glutes', quads: 'Quads', hamstrings: 'Hamstrings', calves: 'Calves' };
const ORDER = Object.keys(LABEL);
function topChips(muscles, n = 3) {
  return Object.entries(muscles.sets).sort((a, b) => b[1] - a[1] || ORDER.indexOf(a[0]) - ORDER.indexOf(b[0])).slice(0, n)
    .map(([m, s]) => ({ m, label: LABEL[m], sets: `${s} ${s === 1 ? 'set' : 'sets'}`, main: muscles.primary.includes(m) }));
}

// ---------------- building blocks ----------------
function plaque(x, y, w, h, r = 30) {
  return `<rect x="${x}" y="${y + 8}" width="${w}" height="${h}" rx="${r}" fill="${C.bevel}"/><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${C.cream}"/><rect x="${x + 3}" y="${y + 3}" width="${w - 6}" height="${h - 6}" rx="${r - 3}" fill="none" stroke="#fff" stroke-opacity=".7" stroke-width="3"/>`;
}
function statPlaque(x, y, w, h, label, value, base = 70) {
  const size = Math.min(base, Math.floor((w - 48) / textW(value, 1)));
  const block = 26 * 0.71 + 22 + size * 0.71, top = y + (h - block) / 2;
  return `${plaque(x, y, w, h)}<text x="${x + w / 2}" y="${(top + 26 * 0.71).toFixed(1)}" text-anchor="middle" font-family="${FB}" font-weight="800" font-size="26" letter-spacing="3" fill="${C.muted}">${esc(label.toUpperCase())}</text><text x="${x + w / 2}" y="${(top + block).toFixed(1)}" text-anchor="middle" font-family="${FD}" font-size="${size}" fill="${C.ink}">${esc(value)}</text>`;
}
function statsRow(x, y, w, h, stats) {
  const gap = 24, n = stats.length, pw = (w - gap * (n - 1)) / n;
  return stats.map(([l, v], i) => statPlaque(x + i * (pw + gap), y, pw, h, l, v, n > 3 ? 58 : 70)).join('');
}
function chipRow(x, y, w, chip) {
  const h = 78;
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${h / 2}" fill="${C.okSoft}"/><circle cx="${x + 40}" cy="${y + h / 2}" r="13" fill="${chip.main ? C.hi : C.sec}"/><text x="${x + 68}" y="${y + h / 2 + 13}" font-family="${FD}" font-size="38" fill="${C.ink}">${esc(chip.label)}</text><text x="${x + w - 30}" y="${y + h / 2 + 11}" text-anchor="end" font-family="${FB}" font-weight="700" font-size="30" fill="${C.muted}">${esc(chip.sets)}</text>`;
}
function bodies(x, y, fw, fill, gap = 22) {
  const k = fw / 100;
  return `<g transform="translate(${x} ${y}) scale(${k})">${bodyArt('front', fill)}</g><g transform="translate(${x + fw + gap} ${y}) scale(${k})">${bodyArt('back', fill)}</g>`;
}
// The mark's face (y 4..112 of 120) is centred on cy, and so are the letters of "Levl" and the date.
function topBar(p, y, date) {
  const cy = y - 4;
  return `<g transform="translate(76 ${(cy - 58 * 0.58).toFixed(1)}) scale(.58)">${markArt(p + 'm')}</g>${gameText(160, baseFor(cy, 50).toFixed(1), 'Levl', 50, { anchor: 'start', drop: 0.07, sw: 0.14 })}<text x="1004" y="${baseFor(cy, 32).toFixed(1)}" text-anchor="end" font-family="${FB}" font-weight="700" font-size="32" fill="#fff" fill-opacity=".94">${esc(date)}</text>`;
}
function frame(H) {
  return `<rect x="22" y="22" width="1036" height="${H - 44}" rx="44" fill="none" stroke="${C.frame}" stroke-width="10"/><rect x="36" y="36" width="1008" height="${H - 72}" rx="32" fill="none" stroke="#fff" stroke-opacity=".28" stroke-width="3"/>`;
}
function background(p, H, sky, seed, keepOut) {
  const clouds = sky === 'tiled' ? tiledSky(p, H) : skyClouds(seed, { width: CW, height: H, count: H > 1500 ? 22 : 16, keepOut }).map(cloudSvg).join('');
  return `<defs><linearGradient id="${p}sky" x1="0" y1="0" x2=".35" y2="1"><stop offset="0" stop-color="${C.sky[0]}"/><stop offset=".38" stop-color="${C.sky[1]}"/><stop offset="1" stop-color="${C.sky[2]}"/></linearGradient><radialGradient id="${p}glow" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(960 40) scale(520)"><stop offset="0" stop-color="#fff" stop-opacity=".38"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient></defs><rect width="${CW}" height="${H}" fill="url(#${p}sky)"/><g data-part="sky">${clouds}</g><rect width="${CW}" height="${H}" fill="url(#${p}glow)"/>`;
}
const svgOpen = (H, label) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${CW} ${H}" width="${CW}" height="${H}" role="img" aria-label="${esc(label)}">`;

// ---------------- layouts ----------------
// A Stacked, 4:5 (C Story reuses it with more room).
function layoutA(d, o) {
  const story = o.layout === 'C', H = story ? 1920 : 1350, p = o.idp;
  const Y = story ? { top: 290, shield: 360, title: 660, stats: 720, body: 950, bodyH: 470, xp: 1580, foot: 1640 }
                  : { top: 96, shield: 142, title: 412, stats: 468, body: 666, bodyH: 372, xp: 1186, foot: 1262 };
  const t = fitTitle(d.title, 900);
  const titleY = t.lines.length === 2 ? Y.title - t.size * 0.55 : Y.title;
  const cardio = d.kind === 'cardio';
  const keepOut = [{ x: 560, y: Y.top - 40, w: 470, h: 70 }, { x: 250, y: Y.foot - 40, w: 580, h: 56 }];
  let mid = '';
  if (cardio) {
    const bigH = story ? 420 : 350, big = d.hero;
    mid += `${plaque(80, Y.stats, 920, bigH, 36)}<text x="540" y="${Y.stats + 70}" text-anchor="middle" font-family="${FB}" font-weight="800" font-size="28" letter-spacing="3" fill="${C.muted}">${esc(big[0].toUpperCase())}</text><text x="540" y="${Y.stats + bigH * 0.5 + 95}" text-anchor="middle" font-family="${FD}" font-size="${Math.min(190, Math.floor(820 / estW(big[1], 1, 0.56)))}" fill="${C.ink}">${esc(big[1])}</text>`;
    mid += statsRow(80, Y.stats + bigH + 36, 920, story ? 180 : 150, d.stats);
  } else {
    mid += statsRow(80, Y.stats, 920, 150, d.stats);
    const fw = story ? 180 : 145, by = Y.body;
    mid += `${plaque(80, by, 920, Y.bodyH, 36)}<g data-part="body">${bodies(118, by + (Y.bodyH - fw * 2) / 2, fw, fillFor(d.muscles, o.fill))}</g>`;
    const chips = topChips(d.muscles), cx = 118 + fw * 2 + 22 + 44, cw = 1000 - 38 - cx;
    const top = by + 52;
    mid += `<text x="${cx + 6}" y="${top + 8}" font-family="${FB}" font-weight="800" font-size="26" letter-spacing="3" fill="${C.muted}">MUSCLES WORKED</text>`;
    mid += chips.map((c, i) => chipRow(cx, top + 34 + i * (story ? 110 : 92), cw, c)).join('');
  }
  return `${svgOpen(H, `${d.title} workout card`)}${background(p, H, o.sky, o.seed, keepOut)}${frame(H)}${topBar(p, Y.top, d.date)}
<g transform="translate(${540 - (story ? 85 : 66)} ${Y.shield}) scale(${story ? 1.42 : 1.1})">${shieldArt(p + 's', d.rank, d.level)}</g>
${t.lines.map((l, i) => gameText(540, titleY + i * t.size * 1.08, l, t.size)).join('')}
<g data-part="stats">${mid}</g>
<g data-part="xp">${gameText(540, Y.xp, `+${d.xp} XP`, story ? 150 : 128, { fill: C.xp })}</g>
<text x="540" y="${Y.foot}" text-anchor="middle" font-family="${FB}" font-weight="800" font-size="32" fill="#fff" fill-opacity=".94">${esc(d.rankTitle)} · LV ${d.level}</text></svg>`;
}
// B Split, 4:5. Round 2: no rank line, one-line title centred on the shield, top 3 chips and "+N more".
function layoutB(d, o) {
  const H = 1350, p = o.idp;
  const SHIELD_Y = 150, SHIELD_K = 1.12, cy = SHIELD_Y + 66 * SHIELD_K;
  const t = fitOne(d.title, 1000 - 236);
  let mid = '', keepOut = [{ x: 560, y: 56, w: 470, h: 70 }];
  if (d.kind === 'cardio') {
    const big = d.hero, bigH = 430;
    mid += `${plaque(80, 360, 920, bigH, 36)}<text x="540" y="440" text-anchor="middle" font-family="${FB}" font-weight="800" font-size="28" letter-spacing="3" fill="${C.muted}">${esc(big[0].toUpperCase())}</text><text x="540" y="${360 + bigH / 2 + 100}" text-anchor="middle" font-family="${FD}" font-size="${Math.min(200, Math.floor(820 / (textW(big[1], 1))))}" fill="${C.ink}">${esc(big[1])}</text>`;
    mid += statsRow(80, 360 + bigH + 34, 920, 1100 - (360 + bigH + 34), d.stats);
  } else {
    const fw = 180, pairW = fw * 2 + 22, bx = 80 + (500 - pairW) / 2;
    mid += `${plaque(80, 360, 500, 740, 36)}<g data-part="body">${bodies(bx, 386, fw, fillFor(d.muscles, o.fill), 22)}</g>`;
    const all = topChips(d.muscles, 99), chips = all.slice(0, 3), more = all.length - chips.length;
    mid += chips.map((c, i) => chipRow(106, 772 + i * 88, 448, c)).join('');
    if (more > 0) {
      const y = 772 + 3 * 88 + 36;
      mid += `<text x="330" y="${y}" text-anchor="middle" font-family="${FB}" font-weight="700" font-size="30" fill="${C.muted}">+${more} more ${more === 1 ? 'muscle' : 'muscles'}</text>`;
    }
    const n = d.stats.length, gap = 26, ph = (740 - gap * (n - 1)) / n;
    mid += d.stats.map(([l, v], i) => statPlaque(610, 360 + i * (ph + gap), 390, ph, l, v, n > 3 ? 70 : 80)).join('');
  }
  return `${svgOpen(H, `${d.title} workout card`)}${background(p, H, o.sky, o.seed, keepOut)}${frame(H)}${topBar(p, 96, d.date)}
<g transform="translate(78 ${SHIELD_Y}) scale(${SHIELD_K})">${shieldArt(p + 's', d.rank, d.level)}</g>
${gameText(236, baseFor(cy, t.size).toFixed(1), t.text, t.size, { anchor: 'start' })}
<g data-part="stats">${mid}</g>
<g data-part="xp">${gameText(540, 1236, `+${d.xp} XP`, 132, { fill: C.xp })}</g></svg>`;
}
function renderCard(d, o) {
  o = { layout: 'B', fill: 'two', sky: 'random', seed: d.id + '#0', idp: 'lvc', ...o };
  return o.layout === 'B' ? layoutB(d, o) : layoutA(d, o);
}

// ---------------- sample workouts ----------------
const RANK_TITLES = { E: 'E-Rank Hunter', D: 'D-Rank Hunter', C: 'C-Rank Hunter', B: 'B-Rank Hunter', A: 'A-Rank Hunter', S: 'S-Rank Hunter' };
const FULL_MUSCLES = { sets: { shoulders: 5, quads: 4, chest: 4, upperback: 4, biceps: 4, triceps: 3.5, glutes: 2, hamstrings: 2, lats: 2, abs: 2, traps: 1.5, forearms: 1, obliques: 1 },
  primary: ['quads', 'chest', 'upperback', 'shoulders', 'biceps', 'abs'], secondary: ['glutes', 'hamstrings', 'triceps', 'lats', 'traps', 'forearms', 'obliques'] };
const SAMPLES = {
  full: { id: 'w-full', title: 'Full Body', date: 'Tue 29 Sep · 6:00 pm', kind: 'strength', stats: [['Sets', '19'], ['Time', '45 min'], ['Volume', '900 kg']], xp: 238, rank: 'E', level: 4, muscles: FULL_MUSCLES },
  run: { id: 'w-run', title: 'Morning Run', date: 'Wed 30 Sep · 6:40 am', kind: 'cardio', hero: ['Distance', '5.2 km'], stats: [['Time', '31 min'], ['Pace', '5:58 /km']], xp: 46, rank: 'E', level: 4 },
  ride: { id: 'w-ride', title: 'Evening Ride', date: 'Wed 30 Sep · 7:15 pm', kind: 'cardio', hero: ['Distance', '18.4 km'], stats: [['Time', '46 min'], ['Speed', '24.0 km/h']], xp: 40, rank: 'E', level: 4 },
  mixed: { id: 'w-mixed', title: 'Legs and a Jog', date: 'Thu 1 Oct · 7:05 pm', kind: 'mixed', stats: [['Sets', '14'], ['Time', '58 min'], ['Volume', '1,240 kg'], ['Distance', '2.1 km']], xp: 196, rank: 'D', level: 7,
    muscles: { sets: { quads: 6, glutes: 5, hamstrings: 4, calves: 3, abs: 1 }, primary: ['quads', 'hamstrings', 'calves'], secondary: ['glutes', 'abs'] } },
  bodyweight: { id: 'w-bw', title: 'Push-up Ladder', date: 'Fri 2 Oct · 7:30 am', kind: 'strength', stats: [['Sets', '8'], ['Time', '18 min']], xp: 70, rank: 'E', level: 4,
    muscles: { sets: { chest: 8, triceps: 4, shoulders: 4, abs: 2 }, primary: ['chest'], secondary: ['triceps', 'shoulders', 'abs'] } },
  long: { id: 'w-long', title: 'Upper Body Power and Conditioning Day', date: 'Sat 3 Oct · 9:00 am', kind: 'strength', stats: [['Sets', '22'], ['Time', '1 h 5 min'], ['Volume', '3,450 kg']], xp: 262, rank: 'C', level: 12,
    muscles: { sets: { chest: 6, upperback: 6, shoulders: 5, lats: 4, triceps: 4, biceps: 3 }, primary: ['chest', 'upperback', 'shoulders', 'lats'], secondary: ['triceps', 'biceps'] } },
  arms: { id: 'w-arms', title: 'Arms', date: 'Mon 5 Oct · 6:10 pm', kind: 'strength', stats: [['Sets', '12'], ['Time', '32 min'], ['Volume', '1,020 kg']], xp: 150, rank: 'D', level: 6,
    muscles: { sets: { biceps: 6, triceps: 6, forearms: 3 }, primary: ['biceps', 'triceps'], secondary: ['forearms'] } },
  srank: { id: 'w-s', title: 'Pull A', date: 'Sun 4 Oct · 6:20 pm', kind: 'strength', stats: [['Sets', '24'], ['Time', '52 min'], ['Volume', '6,820 kg']], xp: 244, rank: 'S', level: 31,
    muscles: { sets: { upperback: 9, lats: 8, biceps: 6, traps: 4, forearms: 3, lowerback: 2 }, primary: ['upperback', 'lats', 'biceps'], secondary: ['traps', 'forearms', 'lowerback'] } },
};
for (const d of Object.values(SAMPLES)) d.rankTitle = RANK_TITLES[d.rank];
if (typeof module !== 'undefined') module.exports = { renderCard, SAMPLES, skyClouds, hashSeed, mulberry32 };
