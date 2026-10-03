// Board 12, direction B: real 3D chests and medals, built in code with three.js.
// Nothing is loaded from a model file: every chest is the same rounded body, a
// barrel lid on a back hinge, metal straps, a lock and a gem, dressed per tier.
// The board loads this only when a 3D demo is on screen.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { SVGLoader } from 'three/addons/loaders/SVGLoader.js';

// ---------- small helpers ----------
const rand = (seed) => () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
const col = (c) => new THREE.Color(c);

function canvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

function tex(c, srgb = true, repeat = [1, 1]) {
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat[0], repeat[1]);
  t.anisotropy = 4;
  return t;
}

// A height map (grey canvas) turned into a tangent-space normal map.
function heightToNormal(src, strength = 2) {
  const w = src.width;
  const h = src.height;
  const s = src.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, w, h).data;
  const out = canvas(w, h);
  const ctx = out.getContext('2d');
  const img = ctx.createImageData(w, h);
  const H = (x, y) => s[(((y + h) % h) * w + ((x + w) % w)) * 4] / 255;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const dx = (H(x + 1, y) - H(x - 1, y)) * strength;
      const dy = (H(x, y + 1) - H(x, y - 1)) * strength;
      const len = Math.hypot(dx, dy, 1);
      const i = (y * w + x) * 4;
      img.data[i] = ((-dx / len) * 0.5 + 0.5) * 255;
      img.data[i + 1] = ((dy / len) * 0.5 + 0.5) * 255;
      img.data[i + 2] = ((1 / len) * 0.5 + 0.5) * 255;
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return out;
}

// Wood: planks running across, with grain. Returns colour and normal canvases.
function woodCanvases(base, seed = 7, planks = 4) {
  const r = rand(seed);
  const W = 512;
  const c = canvas(W, W);
  const hgt = canvas(W, W);
  const x = c.getContext('2d');
  const hx = hgt.getContext('2d');
  hx.fillStyle = '#9a9a9a';
  hx.fillRect(0, 0, W, W);
  const ph = W / planks;
  const b = col(base);
  for (let p = 0; p < planks; p++) {
    const shade = 0.86 + r() * 0.24;
    const pc = b.clone().multiplyScalar(shade);
    x.fillStyle = `#${pc.getHexString()}`;
    x.fillRect(0, p * ph, W, ph);
    // grain: long wavy strokes
    for (let g = 0; g < 26; g++) {
      const y0 = p * ph + 4 + r() * (ph - 8);
      const amp = 1 + r() * 3;
      const k = 0.006 + r() * 0.01;
      const dark = r() < 0.6;
      x.strokeStyle = dark ? `rgba(40,16,4,${0.08 + r() * 0.16})` : `rgba(255,220,170,${0.05 + r() * 0.08})`;
      hx.strokeStyle = dark ? 'rgba(60,60,60,.25)' : 'rgba(200,200,200,.15)';
      x.lineWidth = hx.lineWidth = 0.6 + r() * 1.6;
      x.beginPath();
      hx.beginPath();
      const ph0 = r() * 6;
      for (let xx = 0; xx <= W; xx += 8) {
        const yy = y0 + Math.sin(xx * k + ph0) * amp;
        if (xx === 0) {
          x.moveTo(xx, yy);
          hx.moveTo(xx, yy);
        } else {
          x.lineTo(xx, yy);
          hx.lineTo(xx, yy);
        }
      }
      x.stroke();
      hx.stroke();
    }
    // a knot or two
    if (r() < 0.7) {
      const kx = r() * W;
      const ky = p * ph + ph * (0.3 + r() * 0.4);
      for (let i = 5; i > 0; i--) {
        x.strokeStyle = `rgba(50,20,6,${0.12 + i * 0.03})`;
        x.lineWidth = 1.2;
        x.beginPath();
        x.ellipse(kx, ky, i * 5, i * 2.2, 0, 0, Math.PI * 2);
        x.stroke();
      }
    }
    // the groove between planks
    x.fillStyle = 'rgba(30,10,2,.75)';
    x.fillRect(0, p * ph, W, 3);
    x.fillStyle = 'rgba(255,230,190,.18)';
    x.fillRect(0, p * ph + 3, W, 2);
    hx.fillStyle = '#000';
    hx.fillRect(0, p * ph - 1, W, 5);
  }
  hx.filter = 'blur(1.2px)';
  hx.drawImage(hgt, 0, 0);
  return { color: c, normal: heightToNormal(hgt, 3.2) };
}

// Glowing cracks for obsidian: random branching walks, as an emissive map.
function crackCanvas(seed = 3, glow = '#ff7a1a') {
  const r = rand(seed);
  const W = 512;
  const c = canvas(W, W);
  const x = c.getContext('2d');
  x.fillStyle = '#000';
  x.fillRect(0, 0, W, W);
  x.lineCap = 'round';
  const walk = (px, py, a, len, w) => {
    x.lineWidth = w;
    x.beginPath();
    x.moveTo(px, py);
    for (let i = 0; i < len; i++) {
      a += (r() - 0.5) * 0.9;
      px += Math.cos(a) * 9;
      py += Math.sin(a) * 9;
      x.lineTo(px, py);
      if (r() < 0.08 && w > 1) walk(px, py, a + (r() - 0.5) * 2, len / 2, w * 0.6);
    }
    x.stroke();
  };
  x.shadowColor = glow;
  x.shadowBlur = 14;
  x.strokeStyle = glow;
  for (let i = 0; i < 7; i++) walk(r() * W, r() * W, r() * 6.28, 28, 3.2);
  x.shadowBlur = 0;
  x.strokeStyle = '#ffe2a8';
  for (let i = 0; i < 3; i++) walk(r() * W, r() * W, r() * 6.28, 18, 1.2);
  return c;
}

// A soft round sprite, for glow, dust and sparks.
function dotTexture(inner = 'rgba(255,255,255,1)', outer = 'rgba(255,255,255,0)') {
  const c = canvas(128, 128);
  const x = c.getContext('2d');
  const g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, inner);
  g.addColorStop(0.25, inner);
  g.addColorStop(1, outer);
  x.fillStyle = g;
  x.fillRect(0, 0, 128, 128);
  return tex(c);
}

function starTexture() {
  const c = canvas(128, 128);
  const x = c.getContext('2d');
  const g = x.createRadialGradient(64, 64, 0, 64, 64, 22);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g;
  x.fillRect(0, 0, 128, 128);
  x.fillStyle = '#fff';
  x.beginPath();
  x.moveTo(64, 2);
  x.quadraticCurveTo(68, 60, 126, 64);
  x.quadraticCurveTo(68, 68, 64, 126);
  x.quadraticCurveTo(60, 68, 2, 64);
  x.quadraticCurveTo(60, 60, 64, 2);
  x.fill();
  return tex(c);
}

// ---------- tiers ----------
// Every chest and medal colour lives here, so the moment, the Badges tab and the
// chest read one palette (today the app has two, TIERS and MEDAL_TIERS).
export const PALETTE = {
  bronze: { name: 'Bronze', chest: 'Wooden', metal: '#c27a43', metalDeep: '#7a4220', enamel: '#d9772f', enamelDeep: '#7a3410', glow: '#ffb469', taps: 1 },
  silver: { name: 'Silver', chest: 'Silver', metal: '#e4ebf2', metalDeep: '#7d8a99', enamel: '#5f7fa8', enamelDeep: '#243b5e', glow: '#cfe7ff', taps: 1 },
  gold: { name: 'Gold', chest: 'Golden', metal: '#ffcf4a', metalDeep: '#b07a0c', enamel: '#e0262f', enamelDeep: '#6e0b14', glow: '#ffe27a', taps: 2 },
  diamond: { name: 'Diamond', chest: 'Crystal', metal: '#eaf6ff', metalDeep: '#7fa9c9', enamel: '#3fb5ff', enamelDeep: '#1a3fb8', glow: '#9ef0ff', taps: 2 },
  master: { name: 'Master', chest: 'Obsidian', metal: '#3a2c38', metalDeep: '#120b12', enamel: '#2a1630', enamelDeep: '#0b0510', glow: '#ff8a2a', taps: 3 },
  legend: { name: 'Legend', chest: 'Prismatic', metal: '#fff4fb', metalDeep: '#c7b2ff', enamel: '#3b1f8f', enamelDeep: '#10063a', glow: '#ffd0f4', taps: 3 },
  monthly: { name: 'Monthly', chest: 'Monthly', metal: '#f6f2ea', metalDeep: '#b8a888', enamel: '#16b896', enamelDeep: '#0b5e4c', glow: '#ffc4cc', taps: 1 },
  special: { name: 'Special', chest: 'Royal', metal: '#ffc93a', metalDeep: '#9a5d00', enamel: '#7a3fe0', enamelDeep: '#2e0f6b', glow: '#e2d4ff', taps: 2 },
  secret: { name: 'Secret', chest: 'Pillow', metal: '#f3ecff', metalDeep: '#9a86d6', enamel: '#9b7bff', enamelDeep: '#3b1f8f', glow: '#efe6ff', taps: 1 },
  locked: { name: 'Locked', metal: '#b9b2a6', enamel: '#9a9285', enamelDeep: '#5e574b', icon: '#ece6da', glow: '#ffffff' },
};

// Round 2 medal options: Gold loses its red, Master gets two more looks, Legend a silhouette.
export const MEDAL_OPTIONS = {
  gold: [
    { id: 'blue', name: 'Royal blue', enamel: '#2a6ff0', enamelDeep: '#0b2a6e' },
    { id: 'emerald', name: 'Emerald', enamel: '#1fc27c', enamelDeep: '#06452b' },
    { id: 'onyx', name: 'Onyx', enamel: '#45454f', enamelDeep: '#0a0a0e', icon: '#ffe08a' },
    { id: 'sunburst', name: 'Sunburst gold', enamel: '#ffd34a', enamelDeep: '#b8790a', rays: true, icon: '#6b3f00' },
  ],
  master: [
    { id: 'ember', name: 'Ember (round 1)' },
    { id: 'molten', name: 'Molten gold', crack: '#ffcc33', rimColor: '#1c1612', enamel: '#2a2018', enamelDeep: '#050403', icon: '#ffd76a' },
    { id: 'violet', name: 'Violet flame', crack: '#b05cff', rimColor: '#1d1230', enamel: '#3a1a5c', enamelDeep: '#12061f', icon: '#e2c4ff' },
  ],
  legend: [
    { id: 'halo', name: 'Star-burst' },
    { id: 'wings', name: 'Winged crest' },
    { id: 'crown', name: 'Crowned' },
  ],
};

export const CHESTS = {
  bronze: { tier: 'bronze', body: 'wood', wood: '#a65e2c', strap: 'iron', gem: null },
  silver: { tier: 'silver', body: 'wood', wood: '#6f7f96', strap: 'silver', gem: '#3f8cff' },
  gold: { tier: 'gold', body: 'gold', strap: 'deepgold', gem: '#ff2a3d' },
  diamond: { tier: 'diamond', body: 'crystal', strap: 'silver', gem: '#bff6ff' },
  master: { tier: 'master', body: 'obsidian', strap: 'darkiron', gem: '#ff7a1a' },
  legend: { tier: 'legend', body: 'pearl', strap: 'gold', gem: 'rainbow' },
  monthly: { tier: 'silver', body: 'paint', paint: '#ff6b7d', strap: 'white', gem: '#ffd54a', label: 'Monthly' },
  royal: { tier: 'gold', body: 'velvet', paint: '#6d2fd6', strap: 'gold', gem: '#ffffff', crown: true, label: 'Royal' },
  pillow: { tier: 'silver', body: 'pillow', paint: '#b9a6ff', label: 'Pillow' },
};

// Round 2 options. Each overrides its chest's base look; the first is the default.
export const CHEST_OPTIONS = {
  silver: [{ id: 'a', name: 'Slate wood, polished silver', def: { wood: '#3c4a62', strap: 'brightsilver', gem: '#2f6dff' } }],
  diamond: [
    { id: 'a', name: 'Faceted crystal', def: { body: 'facet', strap: 'frost', gem: '#e8fbff', gemSize: 0.18 } },
    { id: 'b', name: 'Clear ice', def: { body: 'ice', strap: 'platinum', gem: '#5fe3ff', gemSize: 0.16 } },
  ],
  master: [
    { id: 'a', name: 'Ember (round 1)', def: {} },
    { id: 'b', name: 'Volcanic', def: { crack: '#ffb020', strap: 'molten', gem: '#ff4a1a' } },
    { id: 'c', name: 'Void', def: { bodyColor: '#1a0f2a', crack: '#b05cff', strap: 'darksilver', gem: '#c58bff' } },
  ],
  legend: [
    { id: 'a', name: 'Opal', def: { body: 'opal', strap: 'gold', gem: 'rainbow' } },
    { id: 'b', name: 'Starlight', def: { body: 'stars', strap: 'iridgold', gem: '#ffffff' } },
    { id: 'c', name: 'Aurora', def: { body: 'aurora', strap: 'brightsilver', gem: '#7fffd4' } },
  ],
  monthly: [
    { id: 'a', name: 'Lacquer and gold', def: { body: 'lacquer', paint: '#ff5d73', strap: 'gold', gem: '#ffd54a' } },
    { id: 'b', name: 'Stained wood, month plate', def: { body: 'paint', paint: '#e8505f', strap: 'brightsilver', gem: null, plate: 'OCT' } },
    { id: 'c', name: 'Two-tone', def: { body: 'wood', wood: '#6a3a1c', lidBody: 'lacquer', lidPaint: '#ff5d73', strap: 'gold', gem: '#ffd54a' } },
  ],
  royal: [
    { id: 'a', name: 'Antique gold, ruby', def: { strap: 'antiquegold', gem: '#e0103a', crownMetal: 'antiquegold' } },
    { id: 'b', name: 'Rose gold, emerald', def: { strap: 'rosegold', gem: '#14b866', crownMetal: 'rosegold' } },
    { id: 'c', name: 'Warm gold, amethyst', def: { strap: 'warmgold', gem: '#a259ff', crownMetal: 'warmgold' } },
  ],
};

export function chestDef(key, variant) {
  const opts = CHEST_OPTIONS[key];
  const o = opts ? opts.find((x) => x.id === variant) || opts[0] : null;
  return { ...CHESTS[key], ...(o ? o.def : {}), key, variant: o ? o.id : '' };
}

// Facets: random flat cells, each leaning its own way, as a normal map.
function facetNormals(seed = 9, cells = 70, tilt = 0.45) {
  const r = rand(seed);
  const S = 256;
  const pts = Array.from({ length: cells }, () => [r() * S, r() * S, (r() - 0.5) * 2 * tilt, (r() - 0.5) * 2 * tilt]);
  const c = canvas(S, S);
  const x = c.getContext('2d');
  const img = x.createImageData(S, S);
  for (let y = 0; y < S; y++)
    for (let xx = 0; xx < S; xx++) {
      let best = 1e9;
      let bp = pts[0];
      for (const p of pts) {
        // wrap so the texture tiles
        const dx = Math.min(Math.abs(p[0] - xx), S - Math.abs(p[0] - xx));
        const dy = Math.min(Math.abs(p[1] - y), S - Math.abs(p[1] - y));
        const d = dx * dx + dy * dy;
        if (d < best) {
          best = d;
          bp = p;
        }
      }
      const v = new THREE.Vector3(bp[2], bp[3], 1).normalize();
      const i = (y * S + xx) * 4;
      img.data[i] = (v.x * 0.5 + 0.5) * 255;
      img.data[i + 1] = (v.y * 0.5 + 0.5) * 255;
      img.data[i + 2] = (v.z * 0.5 + 0.5) * 255;
      img.data[i + 3] = 255;
    }
  x.putImageData(img, 0, 0);
  return c;
}

// Opal: pastel rainbow with bright flecks.
function opalCanvas() {
  const r = rand(17);
  const c = canvas(512, 512);
  const x = c.getContext('2d');
  const g = x.createLinearGradient(0, 0, 512, 512);
  ['#fff3fb', '#ffe0f1', '#fff1cf', '#dcffe8', '#d6f2ff', '#e9dcff', '#fff3fb'].forEach((cc, i, a) => g.addColorStop(i / (a.length - 1), cc));
  x.fillStyle = g;
  x.fillRect(0, 0, 512, 512);
  const fl = ['#ff9ad5', '#7fe3ff', '#9cff9c', '#ffd36e', '#b99cff'];
  for (let i = 0; i < 260; i++) {
    x.fillStyle = fl[i % fl.length];
    x.globalAlpha = 0.25 + r() * 0.4;
    x.beginPath();
    x.ellipse(r() * 512, r() * 512, 2 + r() * 9, 1 + r() * 4, r() * 3, 0, Math.PI * 2);
    x.fill();
  }
  x.globalAlpha = 1;
  return c;
}

// Starlight: a deep violet sky; the stars are also the glow map.
function starCanvases() {
  const r = rand(31);
  const base = canvas(512, 512);
  const glow = canvas(512, 512);
  const b = base.getContext('2d');
  const gl = glow.getContext('2d');
  const g = b.createLinearGradient(0, 0, 512, 512);
  g.addColorStop(0, '#2a1670');
  g.addColorStop(0.5, '#1b0f4a');
  g.addColorStop(1, '#0d0730');
  b.fillStyle = g;
  b.fillRect(0, 0, 512, 512);
  gl.fillStyle = '#000';
  gl.fillRect(0, 0, 512, 512);
  const cols = ['#ffffff', '#ffe7a8', '#bfe0ff', '#ffc6f0'];
  for (let i = 0; i < 220; i++) {
    const x = r() * 512;
    const y = r() * 512;
    const s = r() < 0.08 ? 2.6 : 0.6 + r() * 1.2;
    for (const ctx of [b, gl]) {
      ctx.fillStyle = cols[i % cols.length];
      ctx.beginPath();
      ctx.arc(x, y, s, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  return { base, glow };
}

// Aurora: soft bands of green, teal and pink as a glow map; it drifts on stage.
function auroraCanvas() {
  const c = canvas(512, 256);
  const x = c.getContext('2d');
  x.fillStyle = '#000';
  x.fillRect(0, 0, 512, 256);
  const bands = [
    ['#3dffb0', 70, 0.9],
    ['#2ad4ff', 120, 0.7],
    ['#ff7ad9', 175, 0.55],
  ];
  x.filter = 'blur(10px)';
  for (const [col, y0, a] of bands) {
    x.strokeStyle = col;
    x.globalAlpha = a;
    x.lineWidth = 26;
    x.beginPath();
    for (let xx = 0; xx <= 512; xx += 8) {
      const y = y0 + Math.sin((xx / 512) * Math.PI * 4 + y0) * 22;
      xx ? x.lineTo(xx, y) : x.moveTo(xx, y);
    }
    x.stroke();
  }
  x.filter = 'none';
  x.globalAlpha = 1;
  return c;
}

function textCanvas(text, bg, fg, w = 256, h = 160, size = 96) {
  const c = canvas(w, h);
  const x = c.getContext('2d');
  x.fillStyle = bg;
  x.fillRect(0, 0, w, h);
  x.fillStyle = fg;
  x.font = `${size}px 'Levl Display', 'Arial Rounded MT Bold', sans-serif`;
  x.textAlign = 'center';
  x.textBaseline = 'middle';
  x.fillText(text, w / 2, h / 2 + 6);
  return c;
}

// ---------- the renderer ----------
export class Art {
  constructor({ width = 400, height = 400, canvasEl = null, alpha = true } = {}) {
    this.renderer = new THREE.WebGLRenderer({ canvas: canvasEl || undefined, antialias: true, alpha, preserveDrawingBuffer: true });
    this.renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    this.renderer.setSize(width, height, false);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.NeutralToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.setClearColor(0x000000, 0);
    const pm = new THREE.PMREMGenerator(this.renderer);
    this.env = pm.fromScene(new RoomEnvironment(), 0.04).texture;
    this.scene = new THREE.Scene();
    this.scene.environment = this.env;
    this.scene.environmentIntensity = 0.85;
    this.camera = new THREE.PerspectiveCamera(30, width / height, 0.1, 100);
    this.camera.position.set(0, 2.5, 6.4);
    this.camera.lookAt(0, 0.8, 0);
    const key = new THREE.DirectionalLight('#fff0d8', 2.6);
    key.position.set(-3, 5, 4);
    const rim = new THREE.DirectionalLight('#9fd2ff', 2.2);
    rim.position.set(4, 3, -4);
    const fill = new THREE.DirectionalLight('#ffe9c7', 0.6);
    fill.position.set(2, 0.5, 5);
    this.scene.add(key, rim, fill, new THREE.HemisphereLight('#cfe6ff', '#3a2a18', 0.5));
    this.cache = {};
  }

  resize(w, h) {
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  // ---- materials ----
  metal(kind) {
    const k = 'm-' + kind;
    if (this.cache[k]) return this.cache[k];
    const M = {
      iron: { color: '#59606b', metalness: 0.85, roughness: 0.42 },
      darkiron: { color: '#2b2630', metalness: 0.9, roughness: 0.3 },
      silver: { color: '#e9eef4', metalness: 1, roughness: 0.22 },
      white: { color: '#f6f2ea', metalness: 0.2, roughness: 0.3 },
      gold: { color: '#ffc93a', metalness: 1, roughness: 0.2 },
      deepgold: { color: '#d68a12', metalness: 1, roughness: 0.32 },
      brass: { color: '#e0a640', metalness: 1, roughness: 0.3 },
      brightsilver: { color: '#f7f9fc', metalness: 1, roughness: 0.12 },
      frost: { color: '#dff3ff', metalness: 0.85, roughness: 0.3 },
      platinum: { color: '#eef4fa', metalness: 1, roughness: 0.16 },
      molten: { color: '#d9962e', metalness: 1, roughness: 0.26, emissive: '#ff5a00', emissiveIntensity: 0.08 },
      darksilver: { color: '#9aa0b4', metalness: 1, roughness: 0.2 },
      antiquegold: { color: '#c8961e', metalness: 1, roughness: 0.34 },
      rosegold: { color: '#e7a38f', metalness: 1, roughness: 0.2 },
      warmgold: { color: '#f0b030', metalness: 1, roughness: 0.15 },
    }[kind];
    if (kind === 'iridgold') return (this.cache[k] = new THREE.MeshPhysicalMaterial({ color: '#ffd76a', metalness: 1, roughness: 0.18, iridescence: 1, iridescenceIOR: 1.8, iridescenceThicknessRange: [200, 900] }));
    return (this.cache[k] = new THREE.MeshStandardMaterial(M));
  }

  bodyMaterial(def) {
    const k = 'b-' + def.body + (def.wood || def.paint || '') + (def.bodyColor || '') + (def.crack || '');
    if (this.cache[k]) return this.cache[k];
    let m;
    if (def.body === 'wood') {
      const w = woodCanvases(def.wood, def.wood.length * 13);
      m = new THREE.MeshStandardMaterial({ map: tex(w.color), normalMap: tex(w.normal, false), normalScale: new THREE.Vector2(0.9, 0.9), roughness: 0.62, metalness: 0 });
    } else if (def.body === 'gold') {
      m = new THREE.MeshPhysicalMaterial({ color: '#ffc531', metalness: 1, roughness: 0.18, clearcoat: 0.6, clearcoatRoughness: 0.15 });
    } else if (def.body === 'crystal') {
      m = new THREE.MeshPhysicalMaterial({ color: '#7fdcff', metalness: 0, roughness: 0.04, transmission: 0.55, thickness: 0.8, ior: 1.6, clearcoat: 1, emissive: '#1d7fff', emissiveIntensity: 0.18, flatShading: true });
    } else if (def.body === 'facet') {
      m = new THREE.MeshPhysicalMaterial({ color: '#9fe7ff', metalness: 0.05, roughness: 0.05, transmission: 0.35, thickness: 0.8, ior: 1.5, clearcoat: 1, emissive: '#2a8cff', emissiveIntensity: 0.22, iridescence: 0.25, normalMap: tex(facetNormals(9, 60, 0.5), false, [1.5, 1.5]), normalScale: new THREE.Vector2(1, 1) });
    } else if (def.body === 'ice') {
      m = new THREE.MeshPhysicalMaterial({ color: '#c8f3ff', metalness: 0, roughness: 0.08, transmission: 0.6, thickness: 1.2, ior: 1.31, clearcoat: 1, emissive: '#4fc3ff', emissiveIntensity: 0.15, normalMap: tex(facetNormals(4, 26, 0.25), false), normalScale: new THREE.Vector2(0.8, 0.8) });
    } else if (def.body === 'obsidian') {
      const ck = crackCanvas(11, def.crack || '#ff7a1a');
      m = new THREE.MeshPhysicalMaterial({ color: def.bodyColor || '#17111c', metalness: 0.2, roughness: 0.12, clearcoat: 1, clearcoatRoughness: 0.05, emissive: '#ffffff', emissiveMap: tex(ck), emissiveIntensity: 1.6 });
    } else if (def.body === 'opal') {
      m = new THREE.MeshPhysicalMaterial({ map: tex(opalCanvas()), metalness: 0.1, roughness: 0.12, clearcoat: 1, clearcoatRoughness: 0.04, iridescence: 1, iridescenceIOR: 1.5, iridescenceThicknessRange: [150, 900] });
    } else if (def.body === 'stars') {
      const st = starCanvases();
      m = new THREE.MeshPhysicalMaterial({ map: tex(st.base), emissive: '#ffffff', emissiveMap: tex(st.glow), emissiveIntensity: 1.3, metalness: 0.1, roughness: 0.22, clearcoat: 1, clearcoatRoughness: 0.06 });
    } else if (def.body === 'aurora') {
      const t = tex(auroraCanvas());
      m = new THREE.MeshPhysicalMaterial({ color: '#0d1c3a', emissive: '#ffffff', emissiveMap: t, emissiveIntensity: 1.1, metalness: 0.15, roughness: 0.2, clearcoat: 1, clearcoatRoughness: 0.05 });
      m.userData.drift = t;
    } else if (def.body === 'lacquer') {
      m = new THREE.MeshPhysicalMaterial({ color: def.paint, roughness: 0.28, metalness: 0.05, clearcoat: 1, clearcoatRoughness: 0.08 });
    } else if (def.body === 'pearl') {
      const c = canvas(256, 256);
      const x = c.getContext('2d');
      const gr = x.createLinearGradient(0, 0, 256, 256);
      ['#ffd6ec', '#ffe9c2', '#e2ffd8', '#d4f1ff', '#e6d9ff', '#ffd6ec'].forEach((cc, i, a) => gr.addColorStop(i / (a.length - 1), cc));
      x.fillStyle = gr;
      x.fillRect(0, 0, 256, 256);
      m = new THREE.MeshPhysicalMaterial({ map: tex(c), metalness: 0.15, roughness: 0.1, clearcoat: 1, clearcoatRoughness: 0.05, iridescence: 1, iridescenceIOR: 1.6, iridescenceThicknessRange: [100, 1100] });
    } else if (def.body === 'paint') {
      const w = woodCanvases(def.paint, 21);
      m = new THREE.MeshPhysicalMaterial({ map: tex(w.color), normalMap: tex(w.normal, false), normalScale: new THREE.Vector2(0.5, 0.5), roughness: 0.35, clearcoat: 0.7, clearcoatRoughness: 0.2 });
    } else if (def.body === 'velvet') {
      m = new THREE.MeshPhysicalMaterial({ color: def.paint, roughness: 0.85, sheen: 1, sheenColor: '#ff9df0', sheenRoughness: 0.35 });
    } else {
      m = new THREE.MeshPhysicalMaterial({ color: def.paint || '#cccccc', roughness: 0.8, sheen: 1, sheenColor: '#ffffff', sheenRoughness: 0.5 });
    }
    return (this.cache[k] = m);
  }

  glowTex(c) {
    const k = 'g-' + c;
    if (this.cache[k]) return this.cache[k];
    const cv = canvas(256, 256);
    const x = cv.getContext('2d');
    const g = x.createRadialGradient(128, 128, 0, 128, 128, 150);
    g.addColorStop(0, '#ffffff');
    g.addColorStop(0.35, c);
    g.addColorStop(1, '#3a1d06');
    x.fillStyle = g;
    x.fillRect(0, 0, 256, 256);
    return (this.cache[k] = tex(cv));
  }

  // The lid's extruded sides map the texture along the curve, so turn wood a quarter.
  lidMaterial(def, body) {
    if (def.lidBody) return this.bodyMaterial({ body: def.lidBody, paint: def.lidPaint });
    if (!body.map || def.body === 'opal' || def.body === 'stars') return body;
    const k = 'l-' + def.body + (def.wood || def.paint || '');
    if (this.cache[k]) return this.cache[k];
    const m = body.clone();
    m.map = body.map.clone();
    m.map.rotation = Math.PI / 2;
    m.map.needsUpdate = true;
    if (body.normalMap) {
      m.normalMap = body.normalMap.clone();
      m.normalMap.rotation = Math.PI / 2;
      m.normalMap.needsUpdate = true;
    }
    return (this.cache[k] = m);
  }

  gemMaterial(c) {
    if (c === 'rainbow') return new THREE.MeshPhysicalMaterial({ color: '#ffffff', metalness: 0, roughness: 0.02, iridescence: 1, iridescenceIOR: 2, clearcoat: 1, emissive: '#ffb8f0', emissiveIntensity: 0.4, flatShading: true });
    return new THREE.MeshPhysicalMaterial({ color: c, metalness: 0, roughness: 0.04, clearcoat: 1, emissive: c, emissiveIntensity: 0.55, flatShading: true });
  }

  // ---- geometry ----
  lidShape(d, h) {
    const s = new THREE.Shape();
    s.moveTo(-d / 2, 0);
    s.lineTo(d / 2, 0);
    s.lineTo(d / 2, h * 0.32);
    s.bezierCurveTo(d / 2, h * 1.18, -d / 2, h * 1.18, -d / 2, h * 0.32);
    s.lineTo(-d / 2, 0);
    return s;
  }

  lidGeo(w, d, h, bevel = 0.07) {
    const g = new THREE.ExtrudeGeometry(this.lidShape(d - bevel * 2, h - bevel), { depth: w - bevel * 2, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 4, curveSegments: 20 });
    g.translate(0, 0, -(w - bevel * 2) / 2);
    g.rotateY(Math.PI / 2);
    return g;
  }

  gemGeo(r = 0.13) {
    const pts = [new THREE.Vector2(0, -r * 0.9), new THREE.Vector2(r, 0), new THREE.Vector2(r * 0.62, r * 0.42), new THREE.Vector2(0, r * 0.42)];
    const g = new THREE.LatheGeometry(pts, 8);
    g.rotateX(Math.PI / 2);
    return g;
  }

  // The chest, standing on y = 0 and facing +z. userData has the parts the stage animates.
  chest(key, variant) {
    const def = chestDef(key, variant);
    if (def.body === 'pillow') return this.pillow(def);
    const W = 2.0;
    const D = 1.42;
    const H = 0.92;
    const LH = 0.78;
    const g = new THREE.Group();
    const body = this.bodyMaterial(def);
    const strap = this.metal(def.strap);
    const box = new THREE.Mesh(new RoundedBoxGeometry(W, H, D, 5, 0.1), body);
    box.position.y = H / 2;
    g.add(box);
    // straps and rims on the body
    for (const sx of [-0.62, 0.62]) {
      const s = new THREE.Mesh(new RoundedBoxGeometry(0.24, H + 0.02, D + 0.07, 4, 0.05), strap);
      s.position.set(sx, H / 2, 0);
      g.add(s);
      for (const ry of [0.22, 0.52, 0.82]) {
        const rv = new THREE.Mesh(new THREE.SphereGeometry(0.032, 12, 8), strap);
        rv.position.set(sx, ry * H, D / 2 + 0.045);
        g.add(rv);
      }
    }
    // the top rim is a frame, so the glow inside shows when the lid lifts
    const rimTop = new THREE.Group();
    for (const [w, d, x, z] of [[W + 0.07, 0.16, 0, (D + 0.07) / 2 - 0.08], [W + 0.07, 0.16, 0, -(D + 0.07) / 2 + 0.08], [0.16, D + 0.07, (W + 0.07) / 2 - 0.08, 0], [0.16, D + 0.07, -(W + 0.07) / 2 + 0.08, 0]]) {
      const bar = new THREE.Mesh(new RoundedBoxGeometry(w, 0.13, d, 3, 0.05), strap);
      bar.position.set(x, 0, z);
      rimTop.add(bar);
    }
    rimTop.position.y = H - 0.05;
    const rimBot = new THREE.Mesh(new RoundedBoxGeometry(W + 0.1, 0.15, D + 0.1, 4, 0.06), strap);
    rimBot.position.y = 0.075;
    g.add(rimTop, rimBot);
    // corner guards
    for (const sx of [-1, 1])
      for (const sz of [-1, 1]) {
        const cg = new THREE.Mesh(new RoundedBoxGeometry(0.2, H + 0.04, 0.2, 3, 0.06), strap);
        cg.position.set(sx * (W / 2 - 0.04), H / 2, sz * (D / 2 - 0.04));
        g.add(cg);
      }
    // the glow inside, seen when the lid lifts
    const inner = new THREE.Mesh(new THREE.PlaneGeometry(W - 0.22, D - 0.22), new THREE.MeshBasicMaterial({ map: this.glowTex(PALETTE[def.tier].glow), transparent: true, opacity: 0, toneMapped: false }));
    inner.rotation.x = -Math.PI / 2;
    inner.position.y = H + 0.012;
    // a dark well under the glow, so an open chest reads as hollow
    const well = new THREE.Mesh(new THREE.PlaneGeometry(W - 0.22, D - 0.22), new THREE.MeshBasicMaterial({ color: '#1a0e06' }));
    well.rotation.x = -Math.PI / 2;
    well.position.y = H + 0.006;
    g.add(well);
    g.add(inner);
    // the lid, hinged at the back
    const hinge = new THREE.Group();
    hinge.position.set(0, H, -D / 2);
    g.add(hinge);
    const lid = new THREE.Group();
    lid.position.z = D / 2;
    hinge.add(lid);
    const lidMesh = new THREE.Mesh(this.lidGeo(W, D, LH), this.lidMaterial(def, body));
    lid.add(lidMesh);
    for (const sx of [-0.62, 0.62]) {
      const s = new THREE.Mesh(this.lidGeo(0.24, D + 0.07, LH + 0.04, 0.04), strap);
      s.position.x = sx;
      lid.add(s);
    }
    const lidRim = new THREE.Mesh(new RoundedBoxGeometry(W + 0.07, 0.1, D + 0.07, 4, 0.04), strap);
    lidRim.position.y = 0.05;
    lid.add(lidRim);
    // lock plate and gem on the front of the lid
    const plate = new THREE.Mesh(new RoundedBoxGeometry(0.46, 0.5, 0.12, 4, 0.05), def.strap === 'iron' ? this.metal('brass') : strap);
    plate.position.set(0, -0.02, D / 2 + 0.05);
    lid.add(plate);
    let gem = null;
    if (def.plate) {
      const face = new THREE.Mesh(new THREE.PlaneGeometry(0.38, 0.3), new THREE.MeshStandardMaterial({ map: tex(textCanvas(def.plate, '#fff6e8', '#9c1630', 256, 160, 112)), roughness: 0.5 }));
      face.position.set(0, -0.02, D / 2 + 0.112);
      face.scale.set(1.05, 1.05, 1);
      lid.add(face);
    } else if (def.gem) {
      gem = new THREE.Mesh(this.gemGeo(def.gemSize || 0.14), this.gemMaterial(def.gem));
      gem.position.set(0, 0.0, D / 2 + 0.12);
      lid.add(gem);
    } else {
      const kh = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.02, 16), new THREE.MeshStandardMaterial({ color: '#1a0d05' }));
      kh.rotation.x = Math.PI / 2;
      kh.position.set(0, 0.04, D / 2 + 0.115);
      const ks = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.1, 0.02), kh.material);
      ks.position.set(0, -0.02, D / 2 + 0.115);
      lid.add(kh, ks);
    }
    if (def.crown) this.crown(lid, LH, def.crownMetal || 'gold', def.gem || '#ff3b5c');
    g.userData = { hinge, lid, gem, inner, H, D, W, def, glow: PALETTE[def.tier].glow, drift: body.userData.drift };
    return g;
  }

  crystals(lid, LH, n, rainbow = false) {
    const r = rand(5);
    const m = rainbow ? this.gemMaterial('rainbow') : new THREE.MeshPhysicalMaterial({ color: '#a8ecff', roughness: 0.05, clearcoat: 1, emissive: '#3fb5ff', emissiveIntensity: 0.35, flatShading: true, transmission: 0.3, thickness: 0.4 });
    for (let i = 0; i < n; i++) {
      const h = 0.35 + r() * 0.35;
      const c = new THREE.Mesh(new THREE.CylinderGeometry(0, 0.09 + r() * 0.05, h, 6), m);
      const bx = (i - (n - 1) / 2) * 0.32 + (r() - 0.5) * 0.1;
      c.position.set(bx, LH * 0.9 + h / 2 - 0.08, -0.05 + (r() - 0.5) * 0.25);
      c.rotation.z = (r() - 0.5) * 0.8 - bx * 0.35;
      c.rotation.x = (r() - 0.5) * 0.4;
      lid.add(c);
    }
  }

  crown(lid, LH, metal = 'gold', gemColor = '#ff3b5c') {
    const gold = this.metal(metal);
    const c = new THREE.Group();
    const band = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.3, 0.16, 32, 1, true), gold);
    band.material = gold.clone();
    band.material.side = THREE.DoubleSide;
    c.add(band);
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      const sp = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.22, 4), gold);
      sp.position.set(Math.sin(a) * 0.31, 0.18, Math.cos(a) * 0.31);
      const ball = new THREE.Mesh(new THREE.SphereGeometry(0.04, 12, 8), this.gemMaterial(gemColor));
      ball.position.set(Math.sin(a) * 0.31, 0.31, Math.cos(a) * 0.31);
      c.add(sp, ball);
    }
    c.position.set(0, LH * 0.98, 0);
    lid.add(c);
  }

  // A puffy cushion with piping, a tufted button and corner tassels. It opens with a puff.
  pillow(def) {
    const g = new THREE.Group();
    const A = 1.05;
    const B = 0.85;
    const T = (u, v) => 0.56 * Math.sqrt(Math.max(0, (1 - u ** 4) * (1 - v ** 4))) - 0.07 * Math.exp(-(u * u + v * v) / 0.03);
    const n = 48;
    const pos = [];
    const idx = [];
    for (const side of [1, -1]) {
      const base = pos.length / 3;
      for (let j = 0; j <= n; j++)
        for (let i = 0; i <= n; i++) {
          const u = (i / n) * 2 - 1;
          const v = (j / n) * 2 - 1;
          pos.push(u * A, side * T(u, v), v * B);
        }
      for (let j = 0; j < n; j++)
        for (let i = 0; i < n; i++) {
          const a = base + j * (n + 1) + i;
          const b = a + 1;
          const c = a + n + 1;
          const d = c + 1;
          if (side > 0) idx.push(a, c, b, b, c, d);
          else idx.push(a, b, c, b, d, c);
        }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setIndex(idx);
    geo.computeVertexNormals();
    const cushion = new THREE.Group();
    cushion.add(new THREE.Mesh(geo, this.bodyMaterial(def)));
    // piping along the seam
    const pts = [];
    for (let k = 0; k <= 80; k++) {
      const t = (k / 80) * Math.PI * 2;
      const c = Math.cos(t);
      const s2 = Math.sin(t);
      pts.push(new THREE.Vector3(Math.sign(c) * Math.abs(c) ** 0.5 * A, 0, Math.sign(s2) * Math.abs(s2) ** 0.5 * B));
    }
    const pipe = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, true), 160, 0.032, 10, true), new THREE.MeshPhysicalMaterial({ color: '#ffd166', roughness: 0.55, sheen: 1, sheenColor: '#fff3c4' }));
    cushion.add(pipe);
    const btn = new THREE.Mesh(new THREE.SphereGeometry(0.1, 24, 12), this.metal('gold'));
    btn.scale.y = 0.55;
    btn.position.y = T(0, 0) + 0.02;
    cushion.add(btn);
    const tm = new THREE.MeshPhysicalMaterial({ color: '#ffd166', roughness: 0.6, sheen: 1, sheenColor: '#fff3c4' });
    for (const sx of [-1, 1])
      for (const sz of [-1, 1]) {
        const knot = new THREE.Mesh(new THREE.SphereGeometry(0.07, 14, 10), tm);
        knot.position.set(sx * A * 1.0, 0, sz * B * 1.0);
        const t = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.3, 14, 1, true), tm);
        t.position.set(sx * (A + 0.09), -0.06, sz * (B + 0.09));
        t.rotation.z = -sx * 0.9;
        t.rotation.x = sz * 0.9;
        cushion.add(knot, t);
      }
    cushion.position.y = 0.6;
    cushion.rotation.x = 0.28;
    g.add(cushion);
    const inner = new THREE.Mesh(new THREE.PlaneGeometry(0.1, 0.1), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 }));
    g.add(inner);
    g.userData = { cushion, inner, H: 0.8, D: 1.7, W: 2.1, def, glow: '#e9dcff', pillow: true };
    return g;
  }

  // ---- medals ----
  shapePath(shape) {
    // the app's badge shapes, on a 120 unit canvas centred at 60,60
    const SH = {
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
    const data = new SVGLoader().parse(`<svg xmlns="http://www.w3.org/2000/svg"><path d="${SH[shape]}"/></svg>`);
    const s = SVGLoader.createShapes(data.paths[0])[0];
    // to medal units: 120 svg units = 2 world units, y up, centred
    const pts = s.getPoints(48).map((v) => new THREE.Vector2((v.x - 60) / 60, -(v.y - 60) / 60));
    return new THREE.Shape(pts);
  }

  // The face art: the badge icon embossed, as colour and normal maps.
  // The face art: the badge icon embossed, as colour and normal maps. The icon
  // fills about 36% of the medal, as on the vector medals (round 1 was 54%).
  faceMaps(icon, text, tier, P) {
    const S = 512;
    const hc = canvas(S, S);
    const hx = hc.getContext('2d');
    hx.fillStyle = '#000';
    hx.fillRect(0, 0, S, S);
    const draw = (ctx, color, lw) => {
      ctx.save();
      ctx.strokeStyle = color;
      ctx.fillStyle = color;
      ctx.lineCap = ctx.lineJoin = 'round';
      if (text) {
        ctx.font = `${text.length > 3 ? 100 : 128}px 'Levl Display', 'Arial Rounded MT Bold', sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, S / 2, S / 2 + 10);
      } else if (icon) {
        ctx.translate(S / 2, S / 2);
        ctx.scale(7.6, 7.6);
        ctx.translate(-12, -12.2);
        ctx.lineWidth = lw;
        const d = ICON_PATHS[icon] || [];
        for (const seg of d) ctx.stroke(new Path2D(seg));
      }
      ctx.restore();
    };
    hx.filter = 'blur(7px)';
    draw(hx, '#fff', 3.4);
    hx.filter = 'blur(2px)';
    draw(hx, '#fff', 2.6);
    const normal = heightToNormal(hc, 6);
    if (tier === 'diamond') {
      // cut facets: twelve flat planes leaning out from the centre, under the icon
      const nx = normal.getContext('2d', { willReadFrequently: true });
      const img = nx.getImageData(0, 0, S, S);
      const N = 12;
      for (let y = 0; y < S; y++)
        for (let x = 0; x < S; x++) {
          const i = (y * S + x) * 4;
          if (Math.abs(img.data[i] - 128) > 6 || Math.abs(img.data[i + 1] - 128) > 6) continue;
          const a = Math.atan2(y - S / 2, x - S / 2);
          const k = Math.floor(((a + Math.PI) / (Math.PI * 2)) * N);
          const t = ((k + 0.5) / N) * Math.PI * 2 - Math.PI;
          const ring = Math.hypot(x - S / 2, y - S / 2) < S * 0.2 ? 0.12 : 0.38;
          const v = new THREE.Vector3(Math.cos(t) * ring, -Math.sin(t) * ring, 1).normalize();
          img.data[i] = (v.x * 0.5 + 0.5) * 255;
          img.data[i + 1] = (v.y * 0.5 + 0.5) * 255;
          img.data[i + 2] = (v.z * 0.5 + 0.5) * 255;
        }
      nx.putImageData(img, 0, 0);
    }
    const cc = canvas(S, S);
    const cx = cc.getContext('2d');
    const g = cx.createLinearGradient(0, 0, S * 0.3, S);
    g.addColorStop(0, P.enamel);
    g.addColorStop(1, P.enamelDeep);
    cx.fillStyle = g;
    cx.fillRect(0, 0, S, S);
    if (P.rays) {
      // a sunburst: alternating light and dark rays from the centre
      for (let k = 0; k < 24; k++) {
        cx.fillStyle = k % 2 ? 'rgba(255,255,255,.22)' : 'rgba(120,70,0,.18)';
        cx.beginPath();
        cx.moveTo(S / 2, S / 2);
        cx.arc(S / 2, S / 2, S, (k / 24) * Math.PI * 2, ((k + 1) / 24) * Math.PI * 2);
        cx.fill();
      }
    }
    // fine engine-turned rings in the enamel
    cx.globalAlpha = 0.09;
    cx.strokeStyle = '#fff';
    for (let r = 20; r < S; r += 14) {
      cx.beginPath();
      cx.arc(S / 2, S / 2, r, 0, Math.PI * 2);
      cx.stroke();
    }
    cx.globalAlpha = 1;
    draw(cx, P.icon || (tier === 'master' ? '#ffb15a' : '#fff6dc'), 2.6);
    return { color: tex(cc), normal: tex(normal, false) };
  }

  // A medal: a bevelled metal rim in the family's shape, an enamel face with the
  // icon embossed, a raised bezel, and the tier's details. No laurels (round 2).
  medal(tier, shape = 'hex', icon = 'flame', text = null, { variant, month } = {}) {
    const opts = MEDAL_OPTIONS[tier];
    const o = opts ? opts.find((x) => x.id === variant) || opts[0] : null;
    const P = { ...PALETTE[tier], ...(o || {}) };
    const g = new THREE.Group();
    const outer = this.shapePath(shape);
    let rimMat;
    if (tier === 'legend') rimMat = new THREE.MeshPhysicalMaterial({ color: '#ffffff', metalness: 0.6, roughness: 0.15, iridescence: 1, iridescenceIOR: 1.8, clearcoat: 1 });
    else if (tier === 'master') rimMat = new THREE.MeshPhysicalMaterial({ color: P.rimColor || '#241a26', metalness: 0.5, roughness: 0.2, clearcoat: 1, emissive: '#ffffff', emissiveMap: tex(crackCanvas(23, P.crack || '#ff7a1a')), emissiveIntensity: 1.4 });
    else if (tier === 'locked') rimMat = this.stone();
    else rimMat = new THREE.MeshStandardMaterial({ color: P.metal, metalness: 1, roughness: tier === 'bronze' ? 0.38 : 0.2 });
    const rim = new THREE.Mesh(new THREE.ExtrudeGeometry(outer, { depth: 0.16, bevelEnabled: true, bevelThickness: 0.07, bevelSize: 0.07, bevelSegments: 5, curveSegments: 24 }), rimMat);
    rim.position.z = -0.08;
    g.add(rim);
    const innerPts = outer.getPoints().map((v) => v.clone().multiplyScalar(0.8));
    const inner = new THREE.Shape(innerPts);
    const maps = this.faceMaps(icon, text, tier, P);
    const faceGeo = new THREE.ShapeGeometry(inner, 24);
    const uv = faceGeo.attributes.uv;
    const pos = faceGeo.attributes.position;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, pos.getX(i) / 2 + 0.5, pos.getY(i) / 2 + 0.5);
    const stone = tier === 'locked';
    const face = new THREE.Mesh(
      faceGeo,
      new THREE.MeshPhysicalMaterial({ map: maps.color, normalMap: maps.normal, normalScale: new THREE.Vector2(1.4, 1.4), roughness: stone ? 0.9 : 0.25, metalness: stone ? 0 : 0.1, clearcoat: stone ? 0 : 1, clearcoatRoughness: 0.08, emissive: tier === 'master' ? P.crack || '#ff7a1a' : '#000000', emissiveIntensity: tier === 'master' ? 0.08 : 0 }),
    );
    face.position.z = 0.155;
    g.add(face);
    const bezelShape = new THREE.Shape(outer.getPoints().map((v) => v.clone().multiplyScalar(0.86)));
    bezelShape.holes.push(new THREE.Path(innerPts.slice().reverse()));
    const bezel = new THREE.Mesh(new THREE.ExtrudeGeometry(bezelShape, { depth: 0.04, bevelEnabled: true, bevelThickness: 0.025, bevelSize: 0.02, bevelSegments: 3 }), rimMat);
    bezel.position.z = 0.13;
    g.add(bezel);
    if (tier === 'diamond') this.facets(g);
    if (tier === 'legend') this.legendFrame(g, P.id || 'halo', new THREE.MeshPhysicalMaterial({ color: '#ffe7a6', metalness: 0.9, roughness: 0.18, iridescence: 1, iridescenceIOR: 1.7, iridescenceThicknessRange: [250, 950], clearcoat: 1 }));
    if (month) this.monthRibbon(g, month, P);
    g.userData = { tier, rimMat };
    return g;
  }

  // rough stone for locked badges
  stone() {
    if (this.cache.stone) return this.cache.stone;
    const r = rand(41);
    const c = canvas(256, 256);
    const x = c.getContext('2d');
    x.fillStyle = '#808080';
    x.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 1400; i++) {
      x.fillStyle = `rgba(${r() < 0.5 ? '0,0,0' : '255,255,255'},${0.05 + r() * 0.12})`;
      x.beginPath();
      x.arc(r() * 256, r() * 256, 0.5 + r() * 3.5, 0, Math.PI * 2);
      x.fill();
    }
    return (this.cache.stone = new THREE.MeshStandardMaterial({ color: '#b9b2a6', roughness: 0.95, metalness: 0, normalMap: tex(heightToNormal(c, 2.5), false, [2, 2]) }));
  }

  // Legend's silhouette, so it never reads as a plain circle.
  legendFrame(g, kind, mat) {
    if (kind === 'halo') {
      const st = new THREE.Shape();
      for (let i = 0; i < 48; i++) {
        const rr = i % 2 ? 1.14 : 1.34;
        const a = Math.PI / 2 + (i * Math.PI) / 24;
        i ? st.lineTo(Math.cos(a) * rr, Math.sin(a) * rr) : st.moveTo(Math.cos(a) * rr, Math.sin(a) * rr);
      }
      const halo = new THREE.Mesh(new THREE.ExtrudeGeometry(st, { depth: 0.05, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.03, bevelSegments: 2 }), mat);
      halo.position.z = -0.2;
      g.add(halo);
    } else if (kind === 'wings') {
      for (const side of [-1, 1]) {
        const w = new THREE.Shape();
        w.moveTo(0, 0.35);
        w.bezierCurveTo(0.35, 0.6, 0.75, 0.55, 0.95, 0.2);
        w.lineTo(0.72, 0.18);
        w.lineTo(0.88, -0.05);
        w.lineTo(0.62, -0.06);
        w.lineTo(0.74, -0.3);
        w.lineTo(0.4, -0.25);
        w.bezierCurveTo(0.25, -0.35, 0.05, -0.3, 0, -0.2);
        w.lineTo(0, 0.35);
        const m = new THREE.Mesh(new THREE.ExtrudeGeometry(w, { depth: 0.06, bevelEnabled: true, bevelThickness: 0.025, bevelSize: 0.025, bevelSegments: 2 }), mat);
        m.scale.set(side * 0.85, 0.85, 1);
        m.position.set(side * 0.86, 0.1, -0.1);
        g.add(m);
      }
    } else {
      const c = new THREE.Group();
      const band = new THREE.Mesh(new RoundedBoxGeometry(0.72, 0.14, 0.12, 3, 0.04), mat);
      c.add(band);
      [-0.3, -0.15, 0, 0.15, 0.3].forEach((x, i) => {
        const h = i === 2 ? 0.3 : i % 2 ? 0.2 : 0.24;
        const sp = new THREE.Mesh(new THREE.ConeGeometry(0.06, h, 4), mat);
        sp.position.set(x, 0.07 + h / 2, 0);
        const ball = new THREE.Mesh(new THREE.SphereGeometry(0.035, 12, 8), this.gemMaterial(['#ff5c8a', '#7fe3ff', '#ffe27a', '#7fe3ff', '#ff5c8a'][i]));
        ball.position.set(x, 0.07 + h + 0.02, 0);
        c.add(sp, ball);
      });
      c.scale.setScalar(1.35);
      c.position.set(0, 1.08, 0.02);
      g.add(c);
    }
  }

  // Monthly badges carry their month on a ribbon tab, as today's do.
  monthRibbon(g, month, P) {
    const r = new THREE.Shape();
    r.moveTo(-0.75, 0.16);
    r.lineTo(0.75, 0.16);
    r.lineTo(0.62, 0);
    r.lineTo(0.75, -0.16);
    r.lineTo(-0.75, -0.16);
    r.lineTo(-0.62, 0);
    r.lineTo(-0.75, 0.16);
    const m = new THREE.Mesh(new THREE.ExtrudeGeometry(r, { depth: 0.05, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.02, bevelSegments: 2 }), new THREE.MeshStandardMaterial({ color: P.enamelDeep, roughness: 0.4 }));
    m.position.set(0, -0.98, 0.18);
    g.add(m);
    const t = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 0.28), new THREE.MeshBasicMaterial({ map: tex(textCanvas(month, 'rgba(0,0,0,0)', '#ffffff', 512, 128, 92)), transparent: true }));
    t.position.set(0, -0.98, 0.252);
    g.add(t);
  }

  facets(g) {
    const m = new THREE.MeshPhysicalMaterial({ color: '#dff8ff', roughness: 0.02, clearcoat: 1, emissive: '#7fe0ff', emissiveIntensity: 0.4, flatShading: true });
    const d = new THREE.Mesh(new THREE.OctahedronGeometry(0.16), m);
    d.scale.set(0.8, 1.1, 0.5);
    d.position.set(0, 1.06, 0.12);
    g.add(d);
  }

  // A contact shadow under an object.
  shadow(r = 1.4, o = 0.5) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(r * 2, r * 2), new THREE.MeshBasicMaterial({ map: dotTexture('rgba(0,0,0,1)', 'rgba(0,0,0,0)'), transparent: true, opacity: o, depthWrite: false }));
    m.rotation.x = -Math.PI / 2;
    m.position.y = 0.002;
    return m;
  }

  // Draws one object on its own and returns an image URL (for galleries).
  still(obj, { w = 360, h = 300, cam = [0, 2.5, 6.4], look = [0, 0.8, 0], rotY = -0.42, shadow = true } = {}) {
    this.resize(w, h);
    const holder = new THREE.Group();
    obj.rotation.y = rotY;
    holder.add(obj);
    if (shadow) holder.add(this.shadow(1.7, 0.55));
    this.scene.add(holder);
    this.camera.position.set(...cam);
    this.camera.lookAt(...look);
    this.renderer.render(this.scene, this.camera);
    const url = this.renderer.domElement.toDataURL('image/png');
    this.scene.remove(holder);
    return url;
  }
}

// The badge icons as stroke paths on a 24 unit grid (the same as components/Badge.tsx).
export const ICON_PATHS = {
  flame: ['M12 3c.5 3 4 4.6 4 9a4 4 0 0 1-8 0c0-2 .8-3.2 2-4.2.1 1.8 1 2.8 2 2.8 0-2.6-.8-4.8 0-7.6z'],
  dumbbell: ['M6.5 6.5v11M17.5 6.5v11M3.5 9.5v5M20.5 9.5v5M6.5 12h11'],
  timer: ['M12 6 a7.5 7.5 0 1 0 0.01 0Z', 'M12 9.5v4l2.5 2M9.5 3h5'],
  run: ['M14.5 2.7a1.8 1.8 0 1 0 0.01 0Z', 'M8 20l3-6 3 2.5V21M6 11.5l3.5-3.5 4 2 3 3.5'],
  star: ['M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.8L12 16.8 6.8 19.6l1-5.8-4.3-4.1 5.9-.8z'],
  trophy: ['M8 4h8v5a4 4 0 0 1-8 0zM8 6H4.5a3 3 0 0 0 3.5 4M16 6h3.5a3 3 0 0 1-3.5 4M12 13v4M8.5 20h7M10 17h4'],
  crown: ['M4 18h16M5 18L3.5 8l5 3.5L12 5l3.5 6.5 5-3.5L19 18'],
  target: ['M12 3.5a8.5 8.5 0 1 0 0.01 0Z', 'M12 7.5a4.5 4.5 0 1 0 0.01 0Z'],
  chevrons: ['M6 13l6-6 6 6M6 19l6-6 6 6'],
  bike: ['M6 13a3.5 3.5 0 1 0 0.01 0Z', 'M18 13a3.5 3.5 0 1 0 0.01 0Z', 'M6 16.5l4-8h4.5l3.5 8M10 8.5l3 8M13 5.5h3'],
  week: ['M6 5h12a2.5 2.5 0 0 1 2.5 2.5v10a2.5 2.5 0 0 1-2.5 2.5H6a2.5 2.5 0 0 1-2.5-2.5v-10A2.5 2.5 0 0 1 6 5z', 'M3.5 10h17M8 3v4M16 3v4M7.5 14h9'],
  moon: ['M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z'],
  lock: ['M7.5 10.5h9a2.5 2.5 0 0 1 2.5 2.5v5a2.5 2.5 0 0 1-2.5 2.5h-9A2.5 2.5 0 0 1 5 18v-5a2.5 2.5 0 0 1 2.5-2.5z', 'M8 10.5V8a4 4 0 0 1 8 0v2.5'],
  calcheck: ['M6 5h12a2.5 2.5 0 0 1 2.5 2.5v10a2.5 2.5 0 0 1-2.5 2.5H6a2.5 2.5 0 0 1-2.5-2.5v-10A2.5 2.5 0 0 1 6 5z', 'M3.5 10h17M8 3v4M16 3v4M9 15l2 2 4-4'],
};

export { THREE, dotTexture, starTexture };
