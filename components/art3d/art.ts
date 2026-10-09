// Chests and medals built in code with three.js, ported from the board 12 reference
// (docs/design/12-motion/art3d.js) with the picked options only. Nothing is loaded from a
// model file. Only ever imported dynamically (see pictures.ts), so three.js stays out of
// every page's first load.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { SVGLoader } from 'three/addons/loaders/SVGLoader.js';

import { LOCKED_COLORS, TIER_PALETTE } from '@/lib/badgeColors';
import { CHEST_DEFS, ICON_PATHS } from '@/lib/badgeModel';
import type { ChestDef, ChestKey, MedalModel, StrapKind } from '@/lib/badgeModel';
import type { BadgeShape } from '@/lib/badges';

// ---------- small helpers ----------
const rand = (seed: number) => () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
const col = (c: string) => new THREE.Color(c);

function canvas(w: number, h: number) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

function tex(c: HTMLCanvasElement, srgb = true, repeat = [1, 1]) {
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat[0], repeat[1]);
  t.anisotropy = 4;
  return t;
}

// A height map (grey canvas) turned into a tangent-space normal map.
function heightToNormal(src: HTMLCanvasElement, strength = 2) {
  const w = src.width;
  const h = src.height;
  const s = src.getContext('2d', { willReadFrequently: true })!.getImageData(0, 0, w, h).data;
  const out = canvas(w, h);
  const ctx = out.getContext('2d')!;
  const img = ctx.createImageData(w, h);
  const H = (x: number, y: number) => s[(((y + h) % h) * w + ((x + w) % w)) * 4] / 255;
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
function woodCanvases(base: string, seed = 7, planks = 4) {
  const r = rand(seed);
  const W = 512;
  const c = canvas(W, W);
  const hgt = canvas(W, W);
  const x = c.getContext('2d')!;
  const hx = hgt.getContext('2d')!;
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
  const x = c.getContext('2d')!;
  x.fillStyle = '#000';
  x.fillRect(0, 0, W, W);
  x.lineCap = 'round';
  const walk = (px: number, py: number, a: number, len: number, w: number): void => {
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
export function dotTexture(inner = 'rgba(255,255,255,1)', outer = 'rgba(255,255,255,0)') {
  const c = canvas(128, 128);
  const x = c.getContext('2d')!;
  const g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, inner);
  g.addColorStop(0.25, inner);
  g.addColorStop(1, outer);
  x.fillStyle = g;
  x.fillRect(0, 0, 128, 128);
  return tex(c);
}

// Facets: random flat cells, each leaning its own way, as a normal map.
function facetNormals(seed = 9, cells = 70, tilt = 0.45) {
  const r = rand(seed);
  const S = 256;
  const pts = Array.from({ length: cells }, () => [r() * S, r() * S, (r() - 0.5) * 2 * tilt, (r() - 0.5) * 2 * tilt]);
  const c = canvas(S, S);
  const x = c.getContext('2d')!;
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
  const x = c.getContext('2d')!;
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

function textCanvas(text: string, bg: string, fg: string, w = 256, h = 160, size = 96) {
  const c = canvas(w, h);
  const x = c.getContext('2d')!;
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
type Mat = THREE.MeshStandardMaterial | THREE.MeshPhysicalMaterial;

export class Art {
  renderer: THREE.WebGLRenderer;
  env: THREE.Texture;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  cache: Record<string, any> = {};

  constructor({ width = 256, height = 256 } = {}) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    this.renderer.setPixelRatio(1);
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
  }

  resize(w: number, h: number) {
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  // ---- materials ----
  metal(kind: StrapKind) {
    const k = 'm-' + kind;
    if (this.cache[k]) return this.cache[k];
    const M: Record<StrapKind, THREE.MeshStandardMaterialParameters> = {
      iron: { color: '#59606b', metalness: 0.85, roughness: 0.42 },
      gold: { color: '#ffc93a', metalness: 1, roughness: 0.2 },
      deepgold: { color: '#d68a12', metalness: 1, roughness: 0.32 },
      brass: { color: '#e0a640', metalness: 1, roughness: 0.3 },
      brightsilver: { color: '#f7f9fc', metalness: 1, roughness: 0.12 },
      frost: { color: '#dff3ff', metalness: 0.85, roughness: 0.3 },
      darksilver: { color: '#9aa0b4', metalness: 1, roughness: 0.2 },
      antiquegold: { color: '#c8961e', metalness: 1, roughness: 0.34 },
    };
    return (this.cache[k] = new THREE.MeshStandardMaterial(M[kind]));
  }

  bodyMaterial(def: Pick<ChestDef, 'body' | 'wood' | 'paint' | 'bodyColor' | 'crack'>): Mat {
    const k = 'b-' + def.body + (def.wood || def.paint || '') + (def.bodyColor || '') + (def.crack || '');
    if (this.cache[k]) return this.cache[k];
    let m: Mat;
    if (def.body === 'wood') {
      const w = woodCanvases(def.wood!, def.wood!.length * 13);
      m = new THREE.MeshStandardMaterial({ map: tex(w.color), normalMap: tex(w.normal, false), normalScale: new THREE.Vector2(0.9, 0.9), roughness: 0.62, metalness: 0 });
    } else if (def.body === 'gold') {
      m = new THREE.MeshPhysicalMaterial({ color: '#ffc531', metalness: 1, roughness: 0.18, clearcoat: 0.6, clearcoatRoughness: 0.15 });
    } else if (def.body === 'facet') {
      m = new THREE.MeshPhysicalMaterial({ color: '#9fe7ff', metalness: 0.05, roughness: 0.05, transmission: 0.35, thickness: 0.8, ior: 1.5, clearcoat: 1, emissive: '#2a8cff', emissiveIntensity: 0.22, iridescence: 0.25, normalMap: tex(facetNormals(9, 60, 0.5), false, [1.5, 1.5]), normalScale: new THREE.Vector2(1, 1) });
    } else if (def.body === 'obsidian') {
      const ck = crackCanvas(11, def.crack || '#ff7a1a');
      m = new THREE.MeshPhysicalMaterial({ color: def.bodyColor || '#17111c', metalness: 0.2, roughness: 0.12, clearcoat: 1, clearcoatRoughness: 0.05, emissive: '#ffffff', emissiveMap: tex(ck), emissiveIntensity: 1.6 });
    } else if (def.body === 'opal') {
      m = new THREE.MeshPhysicalMaterial({ map: tex(opalCanvas()), metalness: 0.1, roughness: 0.12, clearcoat: 1, clearcoatRoughness: 0.04, iridescence: 1, iridescenceIOR: 1.5, iridescenceThicknessRange: [150, 900] });
    } else if (def.body === 'lacquer') {
      m = new THREE.MeshPhysicalMaterial({ color: def.paint!, roughness: 0.28, metalness: 0.05, clearcoat: 1, clearcoatRoughness: 0.08 });
    } else if (def.body === 'velvet') {
      m = new THREE.MeshPhysicalMaterial({ color: def.paint!, roughness: 0.85, sheen: 1, sheenColor: '#ff9df0', sheenRoughness: 0.35 });
    } else {
      m = new THREE.MeshPhysicalMaterial({ color: def.paint || '#cccccc', roughness: 0.8, sheen: 1, sheenColor: '#ffffff', sheenRoughness: 0.5 });
    }
    return (this.cache[k] = m);
  }

  glowTex(c: string) {
    const k = 'g-' + c;
    if (this.cache[k]) return this.cache[k];
    const cv = canvas(256, 256);
    const x = cv.getContext('2d')!;
    const g = x.createRadialGradient(128, 128, 0, 128, 128, 150);
    g.addColorStop(0, '#ffffff');
    g.addColorStop(0.35, c);
    g.addColorStop(1, '#3a1d06');
    x.fillStyle = g;
    x.fillRect(0, 0, 256, 256);
    return (this.cache[k] = tex(cv));
  }

  // The lid's extruded sides map the texture along the curve, so turn wood a quarter.
  lidMaterial(def: ChestDef, body: Mat): Mat {
    if (def.lidBody) return this.bodyMaterial({ body: def.lidBody, paint: def.lidPaint });
    if (!body.map || def.body === 'opal') return body;
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

  gemMaterial(c: string) {
    if (c === 'rainbow') return new THREE.MeshPhysicalMaterial({ color: '#ffffff', metalness: 0, roughness: 0.02, iridescence: 1, iridescenceIOR: 2, clearcoat: 1, emissive: '#ffb8f0', emissiveIntensity: 0.4, flatShading: true });
    return new THREE.MeshPhysicalMaterial({ color: c, metalness: 0, roughness: 0.04, clearcoat: 1, emissive: c, emissiveIntensity: 0.55, flatShading: true });
  }

  // ---- geometry ----
  lidShape(d: number, h: number) {
    const s = new THREE.Shape();
    s.moveTo(-d / 2, 0);
    s.lineTo(d / 2, 0);
    s.lineTo(d / 2, h * 0.32);
    s.bezierCurveTo(d / 2, h * 1.18, -d / 2, h * 1.18, -d / 2, h * 0.32);
    s.lineTo(-d / 2, 0);
    return s;
  }

  lidGeo(w: number, d: number, h: number, bevel = 0.07) {
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
  chest(key: ChestKey) {
    const def = CHEST_DEFS[key];
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
    const inner = new THREE.Mesh(new THREE.PlaneGeometry(W - 0.22, D - 0.22), new THREE.MeshBasicMaterial({ map: this.glowTex(TIER_PALETTE[def.tier].glow), transparent: true, opacity: 0, toneMapped: false }));
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
    let gem: THREE.Mesh | null = null;
    if (def.gem) {
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
    g.userData = { hinge, lid, gem, inner, H, D, W, def, glow: TIER_PALETTE[def.tier].glow };
    return g;
  }

  crown(lid: THREE.Group, LH: number, metal: StrapKind = 'gold', gemColor = '#ff3b5c') {
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
  pillow(def: ChestDef) {
    const g = new THREE.Group();
    const A = 1.05;
    const B = 0.85;
    const T = (u: number, v: number) => 0.56 * Math.sqrt(Math.max(0, (1 - u ** 4) * (1 - v ** 4))) - 0.07 * Math.exp(-(u * u + v * v) / 0.03);
    const n = 48;
    const pos: number[] = [];
    const idx: number[] = [];
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
    const pts: THREE.Vector3[] = [];
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
  shapePath(shape: BadgeShape) {
    // the app's badge shapes, on a 120 unit canvas centred at 60,60
    const SH: Record<BadgeShape, string> = {
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

  // The face art: the badge icon embossed, as colour and normal maps. The icon
  // fills about 36% of the medal, as on the vector medals (round 1 was 54%).
  faceMaps(icon: string | undefined, text: string | undefined, tier: MedalModel['tier'], P: Look) {
    const S = 512;
    const hc = canvas(S, S);
    const hx = hc.getContext('2d')!;
    hx.fillStyle = '#000';
    hx.fillRect(0, 0, S, S);
    const draw = (ctx: CanvasRenderingContext2D, color: string, lw: number) => {
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
      const nx = normal.getContext('2d', { willReadFrequently: true })!;
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
    const cx = cc.getContext('2d')!;
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
  medal({ tier, shape, icon, text, month, colors, look }: MedalModel) {
    const base = tier === 'locked' ? LOCKED_COLORS : TIER_PALETTE[tier];
    const P: Look = { ...base, ...look };
    if (colors) {
      P.enamel = colors[0];
      P.enamelDeep = colors[1];
    }
    const g = new THREE.Group();
    const outer = this.shapePath(shape);
    let rimMat: THREE.Material;
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
    if (tier === 'legend') this.legendFrame(g, new THREE.MeshPhysicalMaterial({ color: '#ffe7a6', metalness: 0.9, roughness: 0.18, iridescence: 1, iridescenceIOR: 1.7, iridescenceThicknessRange: [250, 950], clearcoat: 1 }));
    if (month) this.monthRibbon(g, month, P);
    g.userData = { tier, rimMat };
    return g;
  }

  // rough stone for locked badges
  stone() {
    if (this.cache.stone) return this.cache.stone;
    const r = rand(41);
    const c = canvas(256, 256);
    const x = c.getContext('2d')!;
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

  // Legend's silhouette (the star-burst halo behind the rim), so it never reads as a plain circle.
  legendFrame(g: THREE.Group, mat: THREE.Material) {
    const st = new THREE.Shape();
    for (let i = 0; i < 48; i++) {
      const rr = i % 2 ? 1.14 : 1.34;
      const a = Math.PI / 2 + (i * Math.PI) / 24;
      if (i) st.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
      else st.moveTo(Math.cos(a) * rr, Math.sin(a) * rr);
    }
    const halo = new THREE.Mesh(new THREE.ExtrudeGeometry(st, { depth: 0.05, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.03, bevelSegments: 2 }), mat);
    halo.position.z = -0.2;
    g.add(halo);
  }

  // Monthly badges carry their month on a ribbon tab, as today's do.
  monthRibbon(g: THREE.Group, month: string, P: Look) {
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

  facets(g: THREE.Group) {
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

  // Draws one object on its own and returns an image URL. The object and its one-off
  // textures are freed after, the shared materials and the environment are kept.
  still(obj: THREE.Object3D, { w, h, cam, look, rotY, shadow = false }: StillOptions): string {
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
    this.free(holder);
    return url;
  }

  free(root: THREE.Object3D) {
    const shared = new Set(Object.values(this.cache));
    root.traverse((o) => {
      const mesh = o as THREE.Mesh;
      mesh.geometry?.dispose();
      const mats = ([] as THREE.Material[]).concat(mesh.material ?? []);
      for (const m of mats) {
        if (shared.has(m)) continue;
        for (const v of Object.values(m)) if (v instanceof THREE.Texture && !shared.has(v)) v.dispose();
        m.dispose();
      }
    });
  }

  dispose() {
    this.renderer.dispose();
  }
}

type StillOptions = { w: number; h: number; cam: [number, number, number]; look: [number, number, number]; rotY: number; shadow?: boolean };

/** Palette colours a medal reads, plus the picked look's changes. */
type Look = { metal: string; enamel: string; enamelDeep: string; icon?: string; glow: string; rays?: boolean; crack?: string; rimColor?: string };

