// The reward stage's effects, ported from docs/design/12-motion/fx.js: sparks,
// stars, dust, rings, shards, light that spirals in, and coins that fly to a
// point, all drawn on one canvas in stage pixels (390 by 780). The canvas is the
// size of the screen, so effects are not cut off at the stage edge; `place` maps
// stage pixels onto it. None of it runs under reduced motion, and `shatterEl`
// still breaks the element, it just lands in place.
import { reducedMotion } from '@/lib/anim';

type Particle = {
  k: 'spark' | 'star' | 'puff' | 'ring' | 'shard' | 'swirl' | 'coin';
  x: number;
  y: number;
  vx?: number;
  vy?: number;
  g?: number;
  life: number;
  t: number;
  size?: number;
  color?: string;
  rot?: number;
  vr?: number;
  delay?: number;
  // ring
  r0?: number;
  r1?: number;
  width?: number;
  // swirl
  cx?: number;
  cy?: number;
  a?: number;
  r?: number;
  // coin
  from?: Pt;
  to?: Pt;
  i?: number;
  onLand?: (i: number) => void;
};

export type Pt = { x: number; y: number };

export class StageFx {
  private ctx: CanvasRenderingContext2D | null;
  private p: Particle[] = [];
  private running = false;
  private last = 0;
  private w = 0;
  private h = 0;
  private dpr = 1;
  private m = { k: 1, ox: 0, oy: 0 };

  constructor(private canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext('2d');
    this.loop = this.loop.bind(this);
  }

  /**
   * Sizes the canvas to the screen (`w` by `h` CSS px) and maps stage pixels onto
   * it: the stage is drawn at scale `k` with its top left at (`ox`, `oy`) on screen.
   */
  place(w: number, h: number, k: number, ox: number, oy: number) {
    this.dpr = Math.min(2, window.devicePixelRatio || 1);
    this.w = w;
    this.h = h;
    this.m = { k, ox, oy };
    this.canvas.width = Math.round(w * this.dpr);
    this.canvas.height = Math.round(h * this.dpr);
    // In stage pixels the canvas starts at (-ox/k, -oy/k) and is w/k wide.
    this.canvas.style.left = `${-ox / k}px`;
    this.canvas.style.top = `${-oy / k}px`;
    this.canvas.style.width = `${w / k}px`;
    this.canvas.style.height = `${h / k}px`;
  }

  private add(list: Particle[]) {
    if (reducedMotion()) return;
    this.p.push(...list);
    if (!this.running) {
      this.running = true;
      this.last = performance.now();
      requestAnimationFrame(this.loop);
    }
  }

  clear() {
    this.p = [];
  }

  /** A ring of fast streaks and stars, in a tier colour. */
  burst(x: number, y: number, color = '#ffe27a', n = 60, speed = 1) {
    const out: Particle[] = [];
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const v = (180 + Math.random() * 420) * speed;
      out.push({ k: i % 3 ? 'spark' : 'star', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 80, g: 420, life: 0.7 + Math.random() * 0.6, t: 0, size: 3 + Math.random() * 6, color: i % 4 ? color : '#ffffff', rot: Math.random() * 6 });
    }
    this.add(out);
  }

  stars(x: number, y: number, n = 16, color = '#fff6c4', spread = 120) {
    const out: Particle[] = [];
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = Math.random() * spread;
      out.push({ k: 'star', x: x + Math.cos(a) * r * 0.3, y: y + Math.sin(a) * r * 0.3, vx: Math.cos(a) * r, vy: Math.sin(a) * r - 30, g: 60, life: 0.6 + Math.random() * 0.6, t: 0, size: 4 + Math.random() * 7, color, rot: 0 });
    }
    this.add(out);
  }

  dust(x: number, y: number, n = 18, color = 'rgba(255,240,215,.55)') {
    const out: Particle[] = [];
    for (let i = 0; i < n; i++) {
      const side = i % 2 ? 1 : -1;
      out.push({ k: 'puff', x: x + side * (40 + Math.random() * 60), y: y + Math.random() * 6, vx: side * (60 + Math.random() * 140), vy: -20 - Math.random() * 50, g: 30, life: 0.5 + Math.random() * 0.4, t: 0, size: 10 + Math.random() * 16, color });
    }
    this.add(out);
  }

  ring(x: number, y: number, color = '#fff', r0 = 20, r1 = 160, life = 0.5, width = 6) {
    this.add([{ k: 'ring', x, y, r0, r1, life, t: 0, color, width }]);
  }

  shards(x: number, y: number, colors = ['#c3ccd7', '#7d8896', '#ffffff'], n = 18) {
    const out: Particle[] = [];
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const v = 120 + Math.random() * 320;
      out.push({ k: 'shard', x: x + (Math.random() - 0.5) * 60, y: y + (Math.random() - 0.5) * 70, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 120, g: 900, life: 0.9 + Math.random() * 0.4, t: 0, size: 8 + Math.random() * 14, color: colors[i % colors.length], rot: Math.random() * 6, vr: (Math.random() - 0.5) * 14 });
    }
    this.add(out);
  }

  /** Light that spirals in to a point, for the moment before a badge rises. */
  spiral(x: number, y: number, color = '#ffe27a', n = 28, scale = 1) {
    const out: Particle[] = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 4 + Math.random() * 0.4;
      const r = (120 + Math.random() * 90) * scale;
      out.push({ k: 'swirl', cx: x, cy: y, a, r, delay: (i % 7) * 0.03, life: 0.6 + Math.random() * 0.15, t: 0, size: 3 + Math.random() * 4, color: i % 3 ? color : '#ffffff', x: x + Math.cos(a) * r, y: y + Math.sin(a) * r * 0.55 });
    }
    this.add(out);
  }

  /** Coins that arc from one point to another; `onLand(i)` fires as each arrives. */
  coins(from: Pt, to: Pt, n = 6, onLand?: (i: number) => void, gap = 0.07) {
    const out: Particle[] = [];
    for (let i = 0; i < n; i++) {
      const cx = (from.x + to.x) / 2 + (Math.random() - 0.5) * 160;
      const cy = Math.min(from.y, to.y) - 60 - Math.random() * 80;
      out.push({ k: 'coin', x: from.x, y: from.y, from, to, cx, cy, delay: i * gap, life: 0.55, t: 0, size: 9, i, onLand });
    }
    this.add(out);
  }

  private loop(now: number) {
    const x = this.ctx;
    if (!x) {
      this.running = false;
      return;
    }
    const dt = Math.min(0.05, (now - this.last) / 1000);
    this.last = now;
    const s = this.m.k * this.dpr;
    x.setTransform(1, 0, 0, 1, 0, 0);
    x.clearRect(0, 0, this.canvas.width, this.canvas.height);
    x.setTransform(s, 0, 0, s, (this.m.ox / this.m.k) * s, (this.m.oy / this.m.k) * s);
    this.p = this.p.filter((p) => {
      if (p.delay && p.delay > 0) {
        p.delay -= dt;
        return true;
      }
      p.t += dt;
      const k = p.t / p.life;
      if (k >= 1) {
        if (p.k === 'coin') p.onLand?.(p.i ?? 0);
        return false;
      }
      if (p.k === 'coin' && p.from && p.to) {
        const e = k * k * (3 - 2 * k);
        const u = 1 - e;
        p.x = u * u * p.from.x + 2 * u * e * (p.cx ?? 0) + e * e * p.to.x;
        p.y = u * u * p.from.y + 2 * u * e * (p.cy ?? 0) + e * e * p.to.y;
        this.coin(p.x, p.y, (p.size ?? 9) * (1 - k * 0.4), p.t * 14);
        return true;
      }
      if (p.k === 'swirl') {
        // in towards the centre, turning faster as it closes
        const e = k * k;
        const r = (p.r ?? 0) * (1 - e);
        const a = (p.a ?? 0) + e * 5;
        const px = (p.cx ?? 0) + Math.cos(a) * r;
        const py = (p.cy ?? 0) + Math.sin(a) * r * 0.55;
        x.globalAlpha = k < 0.2 ? k / 0.2 : 1;
        x.strokeStyle = p.color ?? '#fff';
        x.lineWidth = (p.size ?? 3) * 0.6;
        x.lineCap = 'round';
        x.beginPath();
        x.moveTo(p.x, p.y);
        x.lineTo(px, py);
        x.stroke();
        p.x = px;
        p.y = py;
        x.globalAlpha = 1;
        return true;
      }
      if (p.k === 'ring') {
        const r0 = p.r0 ?? 0;
        const r = r0 + ((p.r1 ?? 0) - r0) * (1 - (1 - k) ** 3);
        x.globalAlpha = 1 - k;
        x.strokeStyle = p.color ?? '#fff';
        x.lineWidth = (p.width ?? 4) * (1 - k);
        x.beginPath();
        x.arc(p.x, p.y, r, 0, Math.PI * 2);
        x.stroke();
        x.globalAlpha = 1;
        return true;
      }
      p.vy = (p.vy ?? 0) + (p.g ?? 0) * dt;
      p.vx = (p.vx ?? 0) * 0.985;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      const a = k < 0.15 ? k / 0.15 : 1 - (k - 0.15) / 0.85;
      x.globalAlpha = Math.max(0, a);
      const size = p.size ?? 4;
      if (p.k === 'spark') {
        x.strokeStyle = p.color ?? '#fff';
        x.lineWidth = size * 0.5;
        x.lineCap = 'round';
        x.beginPath();
        x.moveTo(p.x, p.y);
        x.lineTo(p.x - p.vx * 0.03, p.y - p.vy * 0.03);
        x.stroke();
      } else if (p.k === 'star') {
        this.star(p.x, p.y, size * (1 - k * 0.5), p.color ?? '#fff');
      } else if (p.k === 'puff') {
        x.fillStyle = p.color ?? '#fff';
        x.beginPath();
        x.arc(p.x, p.y, size * (0.6 + k), 0, Math.PI * 2);
        x.fill();
      } else if (p.k === 'shard') {
        p.rot = (p.rot ?? 0) + (p.vr ?? 0) * dt;
        x.save();
        x.translate(p.x, p.y);
        x.rotate(p.rot);
        x.fillStyle = p.color ?? '#fff';
        x.beginPath();
        x.moveTo(0, -size);
        x.lineTo(size * 0.6, size * 0.5);
        x.lineTo(-size * 0.5, size * 0.4);
        x.closePath();
        x.fill();
        x.restore();
      }
      x.globalAlpha = 1;
      return true;
    });
    if (this.p.length) requestAnimationFrame(this.loop);
    else {
      this.running = false;
      x.setTransform(1, 0, 0, 1, 0, 0);
      x.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
  }

  private star(cx: number, cy: number, r: number, color: string) {
    const x = this.ctx!;
    x.fillStyle = color;
    x.beginPath();
    x.moveTo(cx, cy - r);
    x.quadraticCurveTo(cx, cy, cx + r, cy);
    x.quadraticCurveTo(cx, cy, cx, cy + r);
    x.quadraticCurveTo(cx, cy, cx - r, cy);
    x.quadraticCurveTo(cx, cy, cx, cy - r);
    x.fill();
  }

  private coin(cx: number, cy: number, r: number, spin: number) {
    const x = this.ctx!;
    const sx = Math.abs(Math.cos(spin)) * 0.75 + 0.25;
    x.save();
    x.translate(cx, cy);
    x.scale(sx, 1);
    const g = x.createLinearGradient(0, -r, 0, r);
    g.addColorStop(0, '#fff3a8');
    g.addColorStop(0.5, '#ffc21a');
    g.addColorStop(1, '#c7870a');
    x.fillStyle = g;
    x.strokeStyle = '#8f5c00';
    x.lineWidth = 1.5;
    x.beginPath();
    x.arc(0, 0, r, 0, Math.PI * 2);
    x.fill();
    x.stroke();
    x.fillStyle = 'rgba(255,255,255,.7)';
    x.fillRect(-r * 0.15, -r * 0.55, r * 0.3, r * 1.1);
    x.restore();
  }
}

/**
 * Breaks an element into `n` pieces: copies clipped to wedges around an impact
 * point, each flying out, turning and falling under gravity. The stage may be
 * drawn scaled, so positions are worked out in its own pixels.
 */
export function shatterEl(stage: HTMLElement, target: HTMLElement, n = 10) {
  const sr = stage.getBoundingClientRect();
  const tr = target.getBoundingClientRect();
  const k = sr.width / (stage.offsetWidth || sr.width) || 1;
  const box = document.createElement('div');
  box.className = 'wt-mshards';
  box.setAttribute('aria-hidden', 'true');
  box.style.cssText = `left:${(tr.left - sr.left) / k}px;top:${(tr.top - sr.top) / k}px;width:${tr.width / k}px;height:${tr.height / k}px`;
  stage.append(box);
  const cx = 0.52;
  const cy = 0.42;
  const TAU = Math.PI * 2;
  const angles = Array.from({ length: n }, (_, i) => ((i + 0.25 + Math.random() * 0.5) / n) * TAU);
  const edge = (a: number): [number, number] => {
    const dx = Math.cos(a);
    const dy = Math.sin(a);
    let t = Infinity;
    if (dx > 1e-6) t = Math.min(t, (1 - cx) / dx);
    if (dx < -1e-6) t = Math.min(t, -cx / dx);
    if (dy > 1e-6) t = Math.min(t, (1 - cy) / dy);
    if (dy < -1e-6) t = Math.min(t, -cy / dy);
    return [cx + dx * t, cy + dy * t];
  };
  const corners = (
    [
      [1, 0],
      [1, 1],
      [0, 1],
      [0, 0],
    ] as [number, number][]
  ).map(([x, y]) => ({ p: [x, y] as [number, number], a: (Math.atan2(y - cy, x - cx) + TAU) % TAU }));
  target.style.opacity = '0';
  const still = reducedMotion();
  angles.forEach((a0, i) => {
    let a1 = angles[(i + 1) % n];
    if (a1 <= a0) a1 += TAU;
    const inside = corners
      .map((c) => ({ ...c, a: c.a < a0 ? c.a + TAU : c.a }))
      .filter((c) => c.a > a0 && c.a < a1)
      .sort((x, y) => x.a - y.a)
      .map((c) => c.p);
    const pts = [[cx, cy], edge(a0), ...inside, edge(a1)];
    const piece = document.createElement('div');
    piece.className = 'wt-mshard';
    piece.innerHTML = target.innerHTML;
    piece.style.clipPath = `polygon(${pts.map(([x, y]) => `${(x * 100).toFixed(1)}% ${(y * 100).toFixed(1)}%`).join(',')})`;
    box.append(piece);
    const mid = (a0 + a1) / 2;
    const v = 110 + Math.random() * 120;
    const vx = Math.cos(mid) * v;
    const vy = Math.sin(mid) * v - 90;
    const spin = (Math.random() < 0.5 ? -1 : 1) * (120 + Math.random() * 260);
    const frames: Keyframe[] = [];
    for (let j = 0; j <= 8; j++) {
      const t = (j / 8) * 0.9;
      frames.push({ transform: `translate(${(vx * t).toFixed(1)}px,${(vy * t + 0.5 * 700 * t * t).toFixed(1)}px) rotate(${(spin * t).toFixed(1)}deg)`, opacity: j > 5 ? 1 - (j - 5) / 3 : 1 });
    }
    if (!still) piece.animate(frames, { duration: 900, easing: 'linear', fill: 'forwards' });
  });
  window.setTimeout(() => box.remove(), 1000);
}
