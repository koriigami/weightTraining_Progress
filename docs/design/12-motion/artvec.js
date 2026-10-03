// Board 12, direction A: premium vector chests and medals, drawn as layered SVG.
// Light to load and crisp at any size. The lid is its own group so it can fly
// open; the gem, glints and cracks are their own layers so they can glow.

let uid = 0;
const nid = (p) => `${p}${++uid}`;

// ---------- materials as gradients ----------
// A metal is a hard horizon: light top, a bright band, a dark lower half.
const METALS = {
  iron: ['#9aa3ad', '#6b7480', '#3d434c', '#575f69', '#2a2f36'],
  darkiron: ['#6a5c6c', '#3b313d', '#1b141c', '#2c232d', '#0d090e'],
  silver: ['#ffffff', '#e3e9f0', '#9aa7b6', '#c5ced8', '#6c7888'],
  white: ['#ffffff', '#fbf6ec', '#d9cdb4', '#efe6d4', '#b8a888'],
  gold: ['#fff6c4', '#ffd84a', '#d9930c', '#f2b72c', '#9a5d00'],
  deepgold: ['#ffd98a', '#e7a12a', '#a8600a', '#c97f17', '#6e3a00'],
  brass: ['#ffe7a6', '#e9b24c', '#a86c14', '#c98a2a', '#6e4206'],
  bronze: ['#ffd1a1', '#d98a4a', '#8c4a1f', '#b06a33', '#5e2e10'],
  platinum: ['#ffffff', '#eef7ff', '#9fc1db', '#cfe3f3', '#6f93b3'],
  obsidian: ['#5a4a5e', '#2c2230', '#100a12', '#1c141f', '#060407'],
  pearl: ['#ffffff', '#ffe9f6', '#c9b6ff', '#e6dcff', '#9a86d6'],
};

function metalGrad(id, kind, vertical = true) {
  const m = METALS[kind];
  const xy = vertical ? 'x1="0" y1="0" x2="0" y2="1"' : 'x1="0" y1="0" x2="1" y2="1"';
  return `<linearGradient id="${id}" ${xy}><stop offset="0" stop-color="${m[0]}"/><stop offset=".38" stop-color="${m[1]}"/><stop offset=".52" stop-color="${m[2]}"/><stop offset=".7" stop-color="${m[3]}"/><stop offset="1" stop-color="${m[4]}"/></linearGradient>`;
}

const CHEST_LOOK = {
  bronze: { name: 'Wooden', body: 'wood', wood: ['#d98a4a', '#a6592a', '#6e3412'], strap: 'iron', plate: 'brass', gem: null, glow: '#ffb469', taps: 1 },
  silver: { name: 'Silver', body: 'wood', wood: ['#b9c6d8', '#7f8ea6', '#4a566c'], strap: 'silver', plate: 'silver', gem: ['#9fd0ff', '#2f6fe0', '#173a8a'], glow: '#cfe7ff', taps: 1 },
  gold: { name: 'Golden', body: 'metal', metal: 'gold', strap: 'deepgold', plate: 'deepgold', gem: ['#ff9aa2', '#e0262f', '#6e0b14'], glow: '#ffe27a', taps: 2 },
  diamond: { name: 'Crystal', body: 'crystal', strap: 'platinum', plate: 'platinum', gem: ['#ffffff', '#9ef0ff', '#3fb5ff'], glow: '#9ef0ff', taps: 2 },
  master: { name: 'Obsidian', body: 'obsidian', strap: 'darkiron', plate: 'darkiron', gem: ['#ffe2a8', '#ff7a1a', '#a3300a'], glow: '#ff8a2a', taps: 3 },
  legend: { name: 'Prismatic', body: 'prism', strap: 'gold', plate: 'gold', gem: ['#ffffff', '#ffd0f4', '#9b7bff'], glow: '#ffd0f4', taps: 3 },
  monthly: { name: 'Monthly', body: 'wood', wood: ['#ffb0ba', '#ff6b7d', '#b8243c'], strap: 'white', plate: 'gold', gem: ['#fff2b0', '#ffd54a', '#b8860b'], glow: '#ffc4cc', taps: 1 },
  royal: { name: 'Royal', body: 'velvet', velvet: ['#b98bff', '#6d2fd6', '#2e0f6b'], strap: 'gold', plate: 'gold', gem: ['#ffffff', '#e7e0ff', '#9b8bd8'], crown: true, glow: '#e2d4ff', taps: 2 },
  pillow: { name: 'Pillow', body: 'pillow', glow: '#efe6ff', taps: 1 },
};
export { CHEST_LOOK };

function bodyFill(id, look) {
  if (look.body === 'wood') {
    const [a, b, c] = look.wood;
    return `<linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${a}"/><stop offset=".45" stop-color="${b}"/><stop offset="1" stop-color="${c}"/></linearGradient>`;
  }
  if (look.body === 'metal') return metalGrad(id, look.metal);
  if (look.body === 'crystal') return `<linearGradient id="${id}" x1="0" y1="0" x2=".3" y2="1"><stop offset="0" stop-color="#e6fbff"/><stop offset=".4" stop-color="#7fdcff"/><stop offset="1" stop-color="#2a6fd6"/></linearGradient>`;
  if (look.body === 'obsidian') return `<linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3a2c40"/><stop offset=".5" stop-color="#1a1220"/><stop offset="1" stop-color="#08050a"/></linearGradient>`;
  if (look.body === 'prism')
    return `<linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffd6ec"/><stop offset=".25" stop-color="#ffeec2"/><stop offset=".5" stop-color="#d8ffe0"/><stop offset=".75" stop-color="#cfeaff"/><stop offset="1" stop-color="#e2d2ff"/><animateTransform attributeName="gradientTransform" type="rotate" values="0 .5 .5;360 .5 .5" dur="6s" repeatCount="indefinite"/></linearGradient>`;
  if (look.body === 'velvet') {
    const [a, b, c] = look.velvet;
    return `<radialGradient id="${id}" cx=".35" cy=".25" r="1"><stop offset="0" stop-color="${a}"/><stop offset=".45" stop-color="${b}"/><stop offset="1" stop-color="${c}"/></radialGradient>`;
  }
  return '';
}

function gemSvg(cx, cy, r, g, id) {
  // an octagonal cut: a table on top, eight facets round it
  const pts = (rr, rot = Math.PI / 8) => Array.from({ length: 8 }, (_, i) => [cx + rr * Math.cos(rot + (i * Math.PI) / 4), cy + rr * Math.sin(rot + (i * Math.PI) / 4)]);
  const o = pts(r);
  const t = pts(r * 0.52);
  const shades = [0.95, 0.75, 0.45, 0.3, 0.35, 0.55, 0.85, 1];
  let s = `<radialGradient id="${id}" cx=".4" cy=".35" r=".8"><stop offset="0" stop-color="${g[0]}"/><stop offset=".5" stop-color="${g[1]}"/><stop offset="1" stop-color="${g[2]}"/></radialGradient>`;
  s += `<g class="gem"><circle cx="${cx}" cy="${cy}" r="${r * 1.9}" fill="${g[1]}" opacity=".0" class="gem-glow"/>`;
  s += `<polygon points="${o.map((p) => p.join(',')).join(' ')}" fill="url(#${id})" stroke="${g[2]}" stroke-width="1.2"/>`;
  for (let i = 0; i < 8; i++) {
    const j = (i + 1) % 8;
    s += `<polygon points="${o[i].join(',')} ${o[j].join(',')} ${t[j].join(',')} ${t[i].join(',')}" fill="#fff" opacity="${(shades[i] * 0.35).toFixed(2)}"/>`;
  }
  s += `<polygon points="${t.map((p) => p.join(',')).join(' ')}" fill="${g[1]}"/><polygon points="${t.map((p) => p.join(',')).join(' ')}" fill="#fff" opacity=".28"/>`;
  s += `<path d="M${cx - r * 0.35} ${cy - r * 0.2} l${r * 0.25} ${-r * 0.22}" stroke="#fff" stroke-width="${r * 0.18}" stroke-linecap="round" opacity=".9"/></g>`;
  return s;
}

// The lid's dome on a 200 x 190 canvas: x from 18 to 182, front edge at y = 96.
const LID = 'M18 98 V70 C18 36 46 24 100 24 C154 24 182 36 182 70 V98 Z';
const BODY = 'M22 92 H178 Q184 92 184 100 V158 Q184 170 172 170 H28 Q16 170 16 158 V100 Q16 92 22 92 Z';

export function chestSVG(key, { size = 200, cls = '' } = {}) {
  const L = CHEST_LOOK[key];
  if (L.body === 'pillow') return pillowSVG({ size, cls });
  const id = nid('c');
  const strap = L.strap;
  const dark = { wood: L.wood?.[2], metal: '#7a4a00', crystal: '#1d4fae', obsidian: '#050306', prism: '#8f78d8', velvet: L.velvet?.[2] }[L.body] || '#2a1406';
  let defs = bodyFill(`${id}b`, L) + metalGrad(`${id}m`, strap) + metalGrad(`${id}p`, L.plate || strap) + metalGrad(`${id}mh`, strap, false);
  defs += `<linearGradient id="${id}ao" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#000" stop-opacity=".45"/><stop offset="1" stop-color="#000" stop-opacity="0"/></linearGradient>`;
  defs += `<radialGradient id="${id}sh" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#000" stop-opacity=".45"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient>`;
  defs += `<linearGradient id="${id}spec" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".5" stop-color="#fff" stop-opacity=".55"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>`;
  defs += `<clipPath id="${id}cb"><path d="${BODY}"/></clipPath><clipPath id="${id}cl"><path d="${LID}"/></clipPath>`;
  defs += `<filter id="${id}glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="2.4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>`;

  // texture inside the body and lid
  const texture = (clip, y0, y1) => {
    let t = '';
    if (L.body === 'wood') {
      for (let y = y0 + 16; y < y1; y += 17) t += `<path d="M10 ${y} H190" stroke="${L.wood[2]}" stroke-width="2.4" opacity=".55"/><path d="M10 ${y + 2} H190" stroke="#fff" stroke-width="1" opacity=".16"/>`;
      for (let i = 0; i < 9; i++) {
        const y = y0 + 6 + ((i * 37) % (y1 - y0 - 8));
        t += `<path d="M${14 + ((i * 53) % 120)} ${y} q 14 -2 28 0 t 28 0" stroke="${L.wood[2]}" stroke-width="1" fill="none" opacity=".35"/>`;
      }
    } else if (L.body === 'crystal') {
      const f = [
        [16, y0, 70, y0, 40, y1],
        [70, y0, 130, y0, 100, y1],
        [130, y0, 184, y0, 160, y1],
        [40, y1, 100, y1, 70, y0],
        [100, y1, 160, y1, 130, y0],
      ];
      f.forEach((p, i) => (t += `<polygon points="${p[0]},${p[1]} ${p[2]},${p[3]} ${p[4]},${p[5]}" fill="#fff" opacity="${[0.28, 0.12, 0.22, 0.06, 0.16][i]}"/>`));
    } else if (L.body === 'obsidian') {
      t += `<g filter="url(#${id}glow)" class="cracks" stroke="#ff8a2a" stroke-width="1.6" fill="none" stroke-linecap="round"><path d="M30 ${y0 + 8} l12 10 -4 12 14 8 M120 ${y0 + 4} l-8 14 10 10 -6 14 M150 ${y1 - 6} l10 -12 14 -4 M70 ${y1 - 4} l6 -14 -10 -10"/></g>`;
    } else if (L.body === 'velvet') {
      for (let x = 30; x < 190; x += 26) for (let y = y0 + 12; y < y1; y += 22) t += `<circle cx="${x + (y % 44 ? 13 : 0)}" cy="${y}" r="2" fill="#fff" opacity=".18"/>`;
    }
    return `<g clip-path="url(#${clip})">${t}</g>`;
  };

  const strapRect = (x) => `<rect x="${x}" y="90" width="20" height="82" rx="5" fill="url(#${id}mh)" stroke="${METALS[strap][4]}" stroke-width="1.6"/><circle cx="${x + 10}" cy="110" r="2.6" fill="${METALS[strap][0]}" stroke="${METALS[strap][4]}"/><circle cx="${x + 10}" cy="150" r="2.6" fill="${METALS[strap][0]}" stroke="${METALS[strap][4]}"/>`;
  const lidStrap = (x) => `<path d="M${x} 98 V${x < 100 ? 44 : 44} C${x} 34 ${x + 4} 30 ${x + 10} 28.5 C${x + 16} 30 ${x + 20} 34 ${x + 20} 44 V98 Z" fill="url(#${id}mh)" stroke="${METALS[strap][4]}" stroke-width="1.6"/>`;

  const body = `
    <ellipse cx="100" cy="172" rx="92" ry="12" fill="url(#${id}sh)"/>
    <path d="${BODY}" fill="url(#${id}b)" stroke="${dark}" stroke-width="2.4"/>
    ${texture(`${id}cb`, 92, 170)}
    <rect x="16" y="92" width="168" height="22" fill="url(#${id}ao)" clip-path="url(#${id}cb)"/>
    ${strapRect(42)}${strapRect(138)}
    <rect x="12" y="160" width="176" height="12" rx="6" fill="url(#${id}m)" stroke="${METALS[strap][4]}" stroke-width="1.6"/>
    <path d="M24 166 H176" stroke="#fff" stroke-width="1.4" opacity=".5" stroke-linecap="round"/>`;

  const seam = `<g class="seam" opacity="0"><path d="M24 101 H176" stroke="${L.glow}" stroke-width="7" stroke-linecap="round" filter="url(#${id}glow)"/><path d="M30 101 H170" stroke="#fff" stroke-width="2.4" stroke-linecap="round"/></g>`;
  const inside = `<g class="inside" opacity="0"><ellipse cx="100" cy="94" rx="80" ry="10" fill="${L.glow}"/><ellipse cx="100" cy="94" rx="50" ry="6" fill="#fff"/></g>`;

  const crown = L.crown
    ? `<g transform="translate(100 24)"><path d="M-26 0 L-30 -24 L-15 -12 L0 -30 L15 -12 L30 -24 L26 0 Z" fill="url(#${id}m)" stroke="${METALS.gold[4]}" stroke-width="1.6" stroke-linejoin="round"/><circle cx="-30" cy="-25" r="3.5" fill="#ff3b5c"/><circle cx="0" cy="-31" r="4" fill="#ff3b5c"/><circle cx="30" cy="-25" r="3.5" fill="#ff3b5c"/><path d="M-24 -4 H24" stroke="#fff" stroke-width="1.5" opacity=".6"/></g>`
    : '';
  const shards =
    L.body === 'crystal' || L.body === 'prism'
      ? [
          [70, 30, 12, 34, -14],
          [96, 26, 14, 44, 0],
          [124, 30, 11, 30, 16],
        ]
          .map(
            ([x, y, w, h, r]) =>
              `<g transform="rotate(${r} ${x} ${y})"><polygon points="${x - w / 2},${y} ${x},${y - h} ${x + w / 2},${y}" fill="${L.body === 'prism' ? '#ffe9fb' : '#9ef0ff'}" stroke="${L.body === 'prism' ? '#b59cf0' : '#1d6fd6'}" stroke-width="1.4"/><polygon points="${x},${y} ${x},${y - h} ${x + w / 2},${y}" fill="#fff" opacity=".45"/></g>`,
          )
          .join('')
      : '';

  const lid = `
    <g class="lid">
      ${crown}${shards}
      <path d="${LID}" fill="url(#${id}b)" stroke="${dark}" stroke-width="2.4"/>
      ${texture(`${id}cl`, 24, 98)}
      <path d="M32 54 C40 36 70 31 100 31" stroke="url(#${id}spec)" stroke-width="7" fill="none" stroke-linecap="round" opacity=".8"/>
      ${lidStrap(42)}${lidStrap(138)}
      <rect x="14" y="86" width="172" height="14" rx="6" fill="url(#${id}m)" stroke="${METALS[strap][4]}" stroke-width="1.6"/>
      <path d="M22 90 H178" stroke="#fff" stroke-width="1.4" opacity=".55" stroke-linecap="round"/>
      <g class="plate">
        <rect x="83" y="78" width="34" height="38" rx="9" fill="url(#${id}p)" stroke="${METALS[L.plate || strap][4]}" stroke-width="1.8"/>
        <path d="M88 83 H112" stroke="#fff" stroke-width="1.4" opacity=".6" stroke-linecap="round"/>
        ${L.gem ? gemSvg(100, 97, 10, L.gem, `${id}g`) : `<circle cx="100" cy="94" r="4" fill="#1a0d05"/><path d="M98 96 h4 l1.2 9 h-6.4 z" fill="#1a0d05"/>`}
      </g>
    </g>`;

  const glints = `<g class="glints"><path class="gl" d="M150 40 l2 6 6 2 -6 2 -2 6 -2 -6 -6 -2 6 -2z" fill="#fff"/><path class="gl" d="M36 120 l1.6 4.6 4.6 1.6 -4.6 1.6 -1.6 4.6 -1.6 -4.6 -4.6 -1.6 4.6 -1.6z" fill="#fff"/></g>`;

  return `<svg class="vchest ${cls}" viewBox="0 -14 200 200" width="${size}" height="${size}" overflow="visible" aria-hidden="true"><defs>${defs}</defs><g class="chest-all">${body}${seam}${inside}${lid}${glints}</g></svg>`;
}

function pillowSVG({ size, cls }) {
  const id = nid('p');
  return `<svg class="vchest pillow ${cls}" viewBox="0 -14 200 200" width="${size}" height="${size}" overflow="visible" aria-hidden="true"><defs>
    <radialGradient id="${id}f" cx=".4" cy=".3" r=".9"><stop offset="0" stop-color="#f6f0ff"/><stop offset=".55" stop-color="#c8b6ff"/><stop offset="1" stop-color="#7d63d6"/></radialGradient>
    <radialGradient id="${id}sh" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#000" stop-opacity=".4"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient>
    ${metalGrad(`${id}g`, 'gold')}</defs>
    <g class="chest-all">
    <ellipse cx="100" cy="166" rx="88" ry="11" fill="url(#${id}sh)"/>
    <g class="lid">
    <path d="M22 66 C60 52 140 52 178 66 C190 100 190 130 178 154 C140 168 60 168 22 154 C10 130 10 100 22 66 Z" fill="url(#${id}f)" stroke="#5b43b8" stroke-width="2.4"/>
    <path d="M40 76 C70 66 130 66 160 76" stroke="#fff" stroke-width="5" opacity=".45" fill="none" stroke-linecap="round"/>
    <path d="M100 110 m-16 -10 q16 6 32 0 M100 110 m-16 10 q16 -6 32 0" stroke="#7d63d6" stroke-width="1.6" fill="none" opacity=".6"/>
    <circle cx="100" cy="110" r="6" fill="url(#${id}g)" stroke="#9a5d00"/>
    ${[
      [22, 66],
      [178, 66],
      [22, 154],
      [178, 154],
    ]
      .map(([x, y]) => `<g transform="translate(${x} ${y}) rotate(${x < 100 ? (y < 100 ? -40 : 40) : y < 100 ? 40 : -40})"><circle r="5" fill="url(#${id}g)" stroke="#9a5d00"/><path d="M-5 3 L0 22 L5 3 Z" fill="#ffd166" stroke="#c98a0b"/></g>`)
      .join('')}
    </g>
    <g class="inside" opacity="0"><ellipse cx="100" cy="100" rx="60" ry="30" fill="#efe6ff"/></g>
    <g class="glints"><path class="gl" d="M150 64 l2 6 6 2 -6 2 -2 6 -2 -6 -6 -2 6 -2z" fill="#fff"/></g>
    </g></svg>`;
}

// ---------- medals ----------
export const MEDAL_LOOK = {
  bronze: { rim: 'bronze', enamel: ['#f39a52', '#c4561e', '#6e2a0a'], icon: '#fff3e0' },
  silver: { rim: 'silver', enamel: ['#8fb0d8', '#4a6c9c', '#1e3456'], icon: '#ffffff' },
  gold: { rim: 'gold', enamel: ['#ff6b6b', '#d81e2c', '#6e0b14'], icon: '#fff3c4', laurel: true },
  diamond: { rim: 'platinum', enamel: ['#8fe6ff', '#2f8fe8', '#1a2f9e'], icon: '#ffffff', facets: true },
  master: { rim: 'obsidian', enamel: ['#4a2a52', '#22102a', '#0b0510'], icon: '#ffb15a', cracks: true },
  legend: { rim: 'pearl', enamel: ['#6a4bd6', '#3b1f8f', '#10063a'], icon: '#ffffff', laurel: true, prism: true },
  locked: { rim: 'stone', enamel: ['#b7b0a4', '#8a8274', '#5e574b'], icon: '#ece6da' },
  monthly: { rim: 'white', enamel: ['#7ff0d6', '#16b896', '#0b5e4c'], icon: '#ffffff' },
  special: { rim: 'gold', enamel: ['#b98bff', '#7a3fe0', '#2e0f6b'], icon: '#fff3c4', laurel: true },
  secret: { rim: 'pearl', enamel: ['#d6c4ff', '#9b7bff', '#3b1f8f'], icon: '#ffffff' },
};

METALS.stone = ['#e6e0d4', '#c9c1b2', '#8f8676', '#aaa192', '#6b6356'];

export const SHAPES = {
  shield: 'M60 6 L106 20 V56 C106 84 88 104 60 114 C32 104 14 84 14 56 V20 Z',
  hex: 'M60 6 L107 33 V87 L60 114 L13 87 V33 Z',
  circle: 'M60 10 A50 50 0 1 1 59.99 10 Z',
  diamond: 'M60 6 Q64 6 68 10 L110 52 Q114 60 110 68 L68 110 Q60 116 52 110 L10 68 Q6 60 10 52 L52 10 Q56 6 60 6 Z',
  square: 'M34 12 H86 Q108 12 108 34 V86 Q108 108 86 108 H34 Q12 108 12 86 V34 Q12 12 34 12 Z',
  star: (() => {
    let p = '';
    for (let i = 0; i < 16; i++) {
      const r = i % 2 ? 40 : 55;
      const a = -Math.PI / 2 + (i * Math.PI) / 8;
      p += (i ? 'L' : 'M') + (60 + r * Math.cos(a)).toFixed(1) + ' ' + (60 + r * Math.sin(a)).toFixed(1) + ' ';
    }
    return p + 'Z';
  })(),
};

export const ICONS = {
  flame: '<path d="M12 3c.5 3 4 4.6 4 9a4 4 0 0 1-8 0c0-2 .8-3.2 2-4.2.1 1.8 1 2.8 2 2.8 0-2.6-.8-4.8 0-7.6z"/>',
  chevrons: '<path d="M6 13l6-6 6 6M6 19l6-6 6 6"/>',
  dumbbell: '<path d="M6.5 6.5v11M17.5 6.5v11M3.5 9.5v5M20.5 9.5v5M6.5 12h11"/>',
  timer: '<circle cx="12" cy="13.5" r="7.5"/><path d="M12 9.5v4l2.5 2M9.5 3h5"/>',
  run: '<circle cx="14.5" cy="4.5" r="1.8"/><path d="M8 20l3-6 3 2.5V21M6 11.5l3.5-3.5 4 2 3 3.5"/>',
  bike: '<circle cx="6" cy="16.5" r="3.5"/><circle cx="18" cy="16.5" r="3.5"/><path d="M6 16.5l4-8h4.5l3.5 8M10 8.5l3 8M13 5.5h3"/>',
  star: '<path d="M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.8L12 16.8 6.8 19.6l1-5.8-4.3-4.1 5.9-.8z"/>',
  trophy: '<path d="M8 4h8v5a4 4 0 0 1-8 0zM8 6H4.5a3 3 0 0 0 3.5 4M16 6h3.5a3 3 0 0 1-3.5 4M12 13v4M8.5 20h7M10 17h4"/>',
  crown: '<path d="M4 18h16M5 18L3.5 8l5 3.5L12 5l3.5 6.5 5-3.5L19 18"/>',
  target: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="1"/>',
  calcheck: '<rect x="3.5" y="5" width="17" height="15" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4M9 15l2 2 4-4"/>',
  week: '<rect x="3.5" y="5" width="17" height="15" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4M7.5 14h9"/>',
  moon: '<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/>',
  lock: '<rect x="5" y="10.5" width="14" height="10" rx="2.5"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5"/>',
};

function laurelSvg(fill, stroke) {
  let s = '';
  for (const side of [-1, 1]) {
    // a stem from the bottom centre, round the side, ending high
    const P0 = [60 + side * 6, 118];
    const P1 = [60 + side * 66, 118];
    const P2 = [60 + side * 62, 34];
    const at = (t) => [0, 1].map((k) => (1 - t) * (1 - t) * P0[k] + 2 * (1 - t) * t * P1[k] + t * t * P2[k]);
    const tan = (t) => [0, 1].map((k) => 2 * (1 - t) * (P1[k] - P0[k]) + 2 * t * (P2[k] - P1[k]));
    s += `<path d="M${P0} Q${P1} ${P2}" stroke="${stroke}" stroke-width="2.4" fill="none" stroke-linecap="round"/>`;
    for (let i = 0; i < 8; i++) {
      const t = 0.1 + i * 0.115;
      const [x, y] = at(t);
      const [tx, ty] = tan(t);
      const a = (Math.atan2(ty, tx) * 180) / Math.PI;
      const k = 1 - i * 0.05;
      for (const o of [-1, 1]) s += `<ellipse cx="${x}" cy="${y}" rx="${8 * k}" ry="${3.6 * k}" transform="rotate(${a + o * 34} ${x} ${y}) translate(${7 * k} 0)" fill="${fill}" stroke="${stroke}" stroke-width="1"/>`;
    }
  }
  return s;
}

export function medalSVG(tier, shape = 'hex', icon = 'flame', { size = 120, text = null, cls = '' } = {}) {
  const M = MEDAL_LOOK[tier];
  const id = nid('m');
  const path = SHAPES[shape];
  const inner = 'translate(60 60) scale(.8) translate(-60 -60)';
  const bez = 'translate(60 60) scale(.88) translate(-60 -60)';
  const rimM = METALS[M.rim];
  let defs = metalGrad(`${id}r`, M.rim, false) + metalGrad(`${id}rv`, M.rim);
  if (M.prism) defs = `<linearGradient id="${id}r" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffd6ec"/><stop offset=".2" stop-color="#fff2c4"/><stop offset=".4" stop-color="#d8ffe0"/><stop offset=".6" stop-color="#cfeaff"/><stop offset=".8" stop-color="#e2d2ff"/><stop offset="1" stop-color="#ffd6ec"/><animateTransform attributeName="gradientTransform" type="rotate" values="0 .5 .5;360 .5 .5" dur="5s" repeatCount="indefinite"/></linearGradient>` + metalGrad(`${id}rv`, M.rim);
  defs += `<radialGradient id="${id}e" cx=".38" cy=".3" r=".85"><stop offset="0" stop-color="${M.enamel[0]}"/><stop offset=".55" stop-color="${M.enamel[1]}"/><stop offset="1" stop-color="${M.enamel[2]}"/></radialGradient>`;
  defs += `<clipPath id="${id}c"><path d="${path}" transform="${inner}"/></clipPath>`;
  defs += `<linearGradient id="${id}gl" x1="0" y1="0" x2="1" y2="1"><stop offset=".35" stop-color="#fff" stop-opacity="0"/><stop offset=".5" stop-color="#fff" stop-opacity=".5"/><stop offset=".65" stop-color="#fff" stop-opacity="0"/></linearGradient>`;
  defs += `<filter id="${id}ds" x="-20%" y="-20%" width="140%" height="150%"><feDropShadow dx="0" dy="3.5" stdDeviation="2.5" flood-color="#000" flood-opacity=".35"/></filter>`;
  defs += `<filter id="${id}glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="1.8" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>`;
  const iconG = (color, dx, dy, w, op) =>
    text
      ? `<text x="${60 + dx}" y="${71 + dy}" text-anchor="middle" font-family="'Levl Display','Arial Rounded MT Bold',sans-serif" font-size="${text.length > 3 ? 22 : 30}" fill="${color}" opacity="${op}">${text}</text>`
      : `<g transform="translate(${38 + dx} ${38 + dy}) scale(1.85)" fill="none" stroke="${color}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" opacity="${op}">${ICONS[icon] || ''}</g>`;
  let face = `<path d="${path}" transform="${inner}" fill="url(#${id}e)"/>`;
  face += `<g clip-path="url(#${id}c)">`;
  // guilloche rings
  for (let r = 8; r < 70; r += 5) face += `<circle cx="60" cy="60" r="${r}" fill="none" stroke="#fff" stroke-width=".5" opacity=".1"/>`;
  if (M.facets) for (let i = 0; i < 12; i++) {
    const a1 = (i / 12) * Math.PI * 2;
    const a2 = ((i + 1) / 12) * Math.PI * 2;
    face += `<polygon points="60,60 ${60 + 70 * Math.cos(a1)},${60 + 70 * Math.sin(a1)} ${60 + 70 * Math.cos(a2)},${60 + 70 * Math.sin(a2)}" fill="#fff" opacity="${[0.16, 0.04, 0.1, 0, 0.12, 0.02][i % 6]}"/>`;
  }
  if (M.cracks) face += `<g stroke="#ff8a2a" stroke-width="1.2" fill="none" filter="url(#${id}glow)" opacity=".85"><path d="M24 40 l10 6 -2 10 10 6 M96 30 l-8 10 8 8 -4 12 M80 98 l-6 -10 -12 -2"/></g>`;
  face += `<ellipse cx="44" cy="28" rx="52" ry="26" fill="#fff" opacity=".14"/>`;
  face += `</g>`;
  // embossed icon: a dark shadow below, the icon, a thin highlight above
  face += iconG('#000', 0, 2.2, 2.8, 0.35) + iconG(M.icon, 0, 0, 2.4, 1) + iconG('#fff', 0, -0.8, 0.9, 0.55);
  const laurel = M.laurel ? `<g class="laurel">${laurelSvg(M.prism ? `url(#${id}r)` : `url(#${id}rv)`, M.prism ? '#9a86d6' : '#8a5300')}</g>` : '';
  const glare = `<g clip-path="url(#${id}c)"><rect class="glare" x="-60" y="0" width="60" height="120" fill="url(#${id}gl)" transform="skewX(-18)"/></g>`;
  return `<svg class="vmedal ${cls}" viewBox="-8 -4 136 134" width="${size}" height="${size}" overflow="visible" aria-hidden="true"><defs>${defs}</defs>
    ${laurel}
    <g filter="url(#${id}ds)">
      <path d="${path}" fill="url(#${id}r)" stroke="${rimM[4]}" stroke-width="2"/>
      <path d="${path}" transform="translate(60 60) scale(.955) translate(-60 -60)" fill="none" stroke="#fff" stroke-width="1.4" opacity=".55"/>
      <path d="${path}" transform="${bez}" fill="url(#${id}rv)" stroke="${rimM[4]}" stroke-width="1.2" opacity=".95"/>
      ${face}
      <path d="${path}" transform="${inner}" fill="none" stroke="#000" stroke-opacity=".35" stroke-width="1.6"/>
      ${glare}
    </g></svg>`;
}

// Today's art, for the before and after: ported from components/celebrate/Chest.tsx and Medal.
export function todayChestSVG(size = 160) {
  const id = nid('t');
  return `<svg width="${size}" height="${(size * 136) / 160}" viewBox="0 0 160 136" overflow="visible" aria-hidden="true"><defs><linearGradient id="${id}b" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#b8642a"/><stop offset="1" stop-color="#7a3c14"/></linearGradient><linearGradient id="${id}g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFE68F"/><stop offset="1" stop-color="#C98A0B"/></linearGradient></defs>
  <rect x="8" y="62" width="144" height="68" rx="10" fill="url(#${id}b)" stroke="#1A0B05" stroke-width="3"/><rect x="30" y="62" width="14" height="68" fill="url(#${id}g)" stroke="#1A0B05" stroke-width="2"/><rect x="116" y="62" width="14" height="68" fill="url(#${id}g)" stroke="#1A0B05" stroke-width="2"/>
  <path d="M8 64 V42 Q8 16 80 16 Q152 16 152 42 V64 Z" fill="url(#${id}b)" stroke="#1A0B05" stroke-width="3"/><path d="M30 64 V20 H44 V64 Z M116 64 V20 H130 V64 Z" fill="url(#${id}g)" stroke="#1A0B05" stroke-width="2"/><rect x="66" y="50" width="28" height="26" rx="6" fill="url(#${id}g)" stroke="#1A0B05" stroke-width="2.5"/><circle cx="80" cy="62" r="4" fill="#1A0B05"/></svg>`;
}

export function todayMedalSVG(colors = ['#FFE58A', '#C78A00'], icon = 'trophy', size = 100) {
  const id = nid('tm');
  return `<svg width="${size}" height="${size}" viewBox="0 0 64 64" aria-hidden="true"><defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${colors[0]}"/><stop offset="1" stop-color="${colors[1]}"/></linearGradient></defs><path d="M32 2 58 17v30L32 62 6 47V17Z" fill="url(#${id})" stroke="rgba(0,0,0,.4)" stroke-width="2.5"/><path d="M32 9 52 20.5v23L32 55 12 43.5v-23Z" fill="rgba(0,0,0,.2)" stroke="rgba(255,255,255,.5)" stroke-width="1.5"/><path d="M12 20.5 32 9l20 11.5v6C40 22 24 22 12 27Z" fill="#fff" opacity=".18"/><g transform="translate(20 20)" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ICONS[icon]}</g></svg>`;
}

// Today's Badges tab art (components/Badge.tsx), simplified to the same layers.
const TODAY_TIERS = {
  bronze: { rim: ['#E3A86B', '#8C5A2B'], face: ['#B87B45', '#5E3A1A'] },
  silver: { rim: ['#F4F7FA', '#8E9AA6'], face: ['#B7C2CD', '#56616E'] },
  gold: { rim: ['#FFE27A', '#B8860B'], face: ['#E8B83A', '#7A5600'] },
  diamond: { rim: ['#9EF0FF', '#6A5CFF'], face: ['#5DB6F5', '#3423C9'] },
  master: { rim: ['#FFB36B', '#C2410C'], face: ['#3A2A3F', '#120C18'] },
  legend: { rim: ['#FF6B8A', '#7CC0FF'], face: ['#3A1F7A', '#120A33'] },
};
export function todayBadgeSVG(tier, shape, icon, size = 96) {
  const id = nid('tb');
  const t = TODAY_TIERS[tier];
  const p = SHAPES[shape];
  const inner = 'translate(60 60) scale(.84) translate(-60 -60)';
  return `<svg viewBox="0 0 120 124" width="${size}" height="${size}" aria-hidden="true"><defs><linearGradient id="${id}a" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${t.rim[0]}"/><stop offset="1" stop-color="${t.rim[1]}"/></linearGradient><linearGradient id="${id}f" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${t.face[0]}"/><stop offset="1" stop-color="${t.face[1]}"/></linearGradient><clipPath id="${id}c"><path d="${p}" transform="${inner}"/></clipPath></defs><path d="${p}" fill="url(#${id}a)"/><path d="${p}" transform="${inner}" fill="url(#${id}f)"/><g clip-path="url(#${id}c)"><ellipse cx="60" cy="22" rx="62" ry="34" fill="#fff" opacity=".18"/></g><path d="${p}" transform="${inner}" fill="none" stroke="rgba(255,255,255,.55)" stroke-width="1.2"/><g transform="translate(36 36) scale(2)" fill="none" stroke="#fff" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round">${ICONS[icon]}</g></svg>`;
}

// ---------- rank shields, in the same finish as the medals ----------
export const RANKS = {
  E: { rim: ['#ffffff', '#dce2ea', '#8e98a5', '#b8c1cc', '#5b6470'], face: ['#c3ccd7', '#7d8896', '#3e4652'] },
  D: { rim: ['#e6fff1', '#a6f3cf', '#2fa877', '#64d6a4', '#0f7a4f'], face: ['#6fe0ab', '#2aa872', '#0a5236'] },
  C: { rim: ['#ffffff', '#bfe1ff', '#4a86e8', '#8cc0ff', '#1d4ed8'], face: ['#8cc4ff', '#3b7cf0', '#14318f'] },
  B: { rim: ['#ffffff', '#e7ccff', '#9b55db', '#c99cf5', '#6b21a8'], face: ['#cf9cff', '#9246df', '#46106f'] },
  A: { rim: ['#fff8d0', '#fff0a8', '#d99a0c', '#ffd34d', '#a36b00'], face: ['#ffd95a', '#f0a810', '#7a4e00'] },
  S: { rim: ['#fff0f3', '#ffc2ce', '#e0365c', '#ff8aa2', '#9f1239'], face: ['#ff8aa2', '#ef2d58', '#6e0b27'], glow: '#ff4d6d' },
};
const SHIELD = 'M60 4 C80 12 98 12 112 10 V58 C112 92 90 116 60 128 C30 116 8 92 8 58 V10 C22 12 40 12 60 4 Z';
export function shieldSVG(rank, level = null, { size = 150, cls = '' } = {}) {
  const R = RANKS[rank];
  const id = nid('s');
  const inner = 'translate(60 66) scale(.8) translate(-60 -66)';
  const rimGrad = `<linearGradient id="${id}r" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${R.rim[0]}"/><stop offset=".38" stop-color="${R.rim[1]}"/><stop offset=".52" stop-color="${R.rim[2]}"/><stop offset=".7" stop-color="${R.rim[3]}"/><stop offset="1" stop-color="${R.rim[4]}"/></linearGradient>`;
  const face = `<radialGradient id="${id}f" cx=".38" cy=".28" r=".85"><stop offset="0" stop-color="${R.face[0]}"/><stop offset=".55" stop-color="${R.face[1]}"/><stop offset="1" stop-color="${R.face[2]}"/></radialGradient>`;
  const glow = R.glow ? `<filter id="${id}g" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="8"/></filter>` : '';
  return `<svg class="vshield ${cls}" viewBox="-6 -4 132 140" width="${size}" height="${(size * 140) / 132}" overflow="visible" aria-hidden="true"><defs>${rimGrad}${face}${glow}
    <clipPath id="${id}c"><path d="${SHIELD}" transform="${inner}"/></clipPath>
    <linearGradient id="${id}gl" x1="0" y1="0" x2="1" y2="1"><stop offset=".35" stop-color="#fff" stop-opacity="0"/><stop offset=".5" stop-color="#fff" stop-opacity=".5"/><stop offset=".65" stop-color="#fff" stop-opacity="0"/></linearGradient>
    <filter id="${id}ds" x="-20%" y="-20%" width="140%" height="150%"><feDropShadow dx="0" dy="4" stdDeviation="3" flood-color="#000" flood-opacity=".35"/></filter></defs>
    ${R.glow ? `<path d="${SHIELD}" fill="${R.glow}" opacity=".6" filter="url(#${id}g)"/>` : ''}
    <g filter="url(#${id}ds)">
    <path d="${SHIELD}" fill="url(#${id}r)" stroke="${R.rim[4]}" stroke-width="2"/>
    <path d="${SHIELD}" transform="translate(60 66) scale(.95) translate(-60 -66)" fill="none" stroke="#fff" stroke-width="1.4" opacity=".6"/>
    <path d="${SHIELD}" transform="${inner}" fill="url(#${id}f)"/>
    <g clip-path="url(#${id}c)">${Array.from({ length: 14 }, (_, i) => `<circle cx="60" cy="60" r="${8 + i * 5}" fill="none" stroke="#fff" stroke-width=".5" opacity=".1"/>`).join('')}<path d="M0 0 H120 V52 C80 44 40 60 0 50 Z" fill="#fff" opacity=".16"/><rect class="glare" x="-60" y="0" width="60" height="140" fill="url(#${id}gl)" transform="skewX(-18)"/></g>
    <path d="${SHIELD}" transform="${inner}" fill="none" stroke="#000" stroke-opacity=".3" stroke-width="1.6"/>
    <text x="60" y="${level != null ? 72 : 86}" text-anchor="middle" font-family="'Levl Display','Arial Rounded MT Bold',sans-serif" font-size="${level != null ? 56 : 62}" fill="#fff" stroke="rgba(0,0,0,.35)" stroke-width="5" paint-order="stroke" class="rk">${rank}</text>
    ${level != null ? `<text x="60" y="97" text-anchor="middle" font-family="'Levl Display','Arial Rounded MT Bold',sans-serif" font-size="15" fill="#fff" opacity=".95" class="lv">LV ${level}</text>` : ''}
    </g></svg>`;
}
