// Board 12: 2D effects drawn over a stage: sparks, stars, dust, rings, shards
// and coins that fly to a target. One canvas per stage, sized in stage pixels.
import { reduced } from './motion.js';

export class FX {
  constructor(canvas, w, h) {
    this.c = canvas;
    this.w = w;
    this.h = h;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    this.x = canvas.getContext('2d');
    this.x.scale(dpr, dpr);
    this.p = [];
    this.running = false;
    this.loop = this.loop.bind(this);
  }

  add(list) {
    if (reduced()) return;
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

  // a ring of fast streaks and stars, in a tier colour
  burst(x, y, color = '#ffe27a', n = 60, speed = 1) {
    const out = [];
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const v = (180 + Math.random() * 420) * speed;
      out.push({ k: i % 3 ? 'spark' : 'star', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 80, g: 420, life: 0.7 + Math.random() * 0.6, t: 0, size: 3 + Math.random() * 6, color: i % 4 ? color : '#ffffff', rot: Math.random() * 6 });
    }
    this.add(out);
  }

  stars(x, y, n = 16, color = '#fff6c4', spread = 120) {
    const out = [];
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = Math.random() * spread;
      out.push({ k: 'star', x: x + Math.cos(a) * r * 0.3, y: y + Math.sin(a) * r * 0.3, vx: Math.cos(a) * r, vy: Math.sin(a) * r - 30, g: 60, life: 0.6 + Math.random() * 0.6, t: 0, size: 4 + Math.random() * 7, color, rot: 0 });
    }
    this.add(out);
  }

  dust(x, y, n = 18, color = 'rgba(255,240,215,.55)') {
    const out = [];
    for (let i = 0; i < n; i++) {
      const side = i % 2 ? 1 : -1;
      out.push({ k: 'puff', x: x + side * (40 + Math.random() * 60), y: y + Math.random() * 6, vx: side * (60 + Math.random() * 140), vy: -20 - Math.random() * 50, g: 30, life: 0.5 + Math.random() * 0.4, t: 0, size: 10 + Math.random() * 16, color });
    }
    this.add(out);
  }

  ring(x, y, color = '#fff', r0 = 20, r1 = 160, life = 0.5, width = 6) {
    this.add([{ k: 'ring', x, y, r0, r1, life, t: 0, color, width }]);
  }

  shards(x, y, colors = ['#c3ccd7', '#7d8896', '#ffffff'], n = 18) {
    const out = [];
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const v = 120 + Math.random() * 320;
      out.push({ k: 'shard', x: x + (Math.random() - 0.5) * 60, y: y + (Math.random() - 0.5) * 70, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 120, g: 900, life: 0.9 + Math.random() * 0.4, t: 0, size: 8 + Math.random() * 14, color: colors[i % colors.length], rot: Math.random() * 6, vr: (Math.random() - 0.5) * 14 });
    }
    this.add(out);
  }

  // Coins that arc from one point to another; onLand(i) fires as each arrives.
  coins(from, to, n = 6, onLand, gap = 0.07) {
    const out = [];
    for (let i = 0; i < n; i++) {
      const cx = (from.x + to.x) / 2 + (Math.random() - 0.5) * 160;
      const cy = Math.min(from.y, to.y) - 60 - Math.random() * 80;
      out.push({ k: 'coin', x: from.x, y: from.y, from, to, cx, cy, delay: i * gap, life: 0.55, t: 0, size: 9, i, onLand });
    }
    this.add(out);
  }

  // Coins that fall from the top and bounce once, for the daily bonus.
  shower(n = 24) {
    const out = [];
    for (let i = 0; i < n; i++) out.push({ k: 'fall', x: Math.random() * this.w, y: -20 - Math.random() * 120, vx: (Math.random() - 0.5) * 40, vy: 80 + Math.random() * 120, g: 900, life: 1.6, t: 0, size: 7 + Math.random() * 4, rot: Math.random() * 6, floor: this.h - 10 - Math.random() * 30 });
    this.add(out);
  }

  loop(now) {
    const dt = Math.min(0.05, (now - this.last) / 1000);
    this.last = now;
    const x = this.x;
    x.clearRect(0, 0, this.w, this.h);
    this.p = this.p.filter((p) => {
      if (p.delay > 0) {
        p.delay -= dt;
        return true;
      }
      p.t += dt;
      const k = p.t / p.life;
      if (k >= 1) {
        if (p.k === 'coin') p.onLand?.(p.i);
        return false;
      }
      if (p.k === 'coin') {
        const e = k * k * (3 - 2 * k);
        const u = 1 - e;
        p.x = u * u * p.from.x + 2 * u * e * p.cx + e * e * p.to.x;
        p.y = u * u * p.from.y + 2 * u * e * p.cy + e * e * p.to.y;
        this.coin(p.x, p.y, p.size * (1 - k * 0.4), p.t * 14);
        return true;
      }
      if (p.k === 'ring') {
        const r = p.r0 + (p.r1 - p.r0) * (1 - (1 - k) ** 3);
        x.globalAlpha = 1 - k;
        x.strokeStyle = p.color;
        x.lineWidth = p.width * (1 - k);
        x.beginPath();
        x.arc(p.x, p.y, r, 0, Math.PI * 2);
        x.stroke();
        x.globalAlpha = 1;
        return true;
      }
      p.vy += (p.g || 0) * dt;
      p.vx *= 0.985;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.k === 'fall') {
        if (p.y > p.floor) {
          p.y = p.floor;
          p.vy *= -0.35;
          p.vx *= 0.6;
        }
        x.globalAlpha = k > 0.8 ? (1 - k) / 0.2 : 1;
        this.coin(p.x, p.y, p.size, p.t * 10 + p.rot);
        x.globalAlpha = 1;
        return true;
      }
      const a = k < 0.15 ? k / 0.15 : 1 - (k - 0.15) / 0.85;
      x.globalAlpha = Math.max(0, a);
      if (p.k === 'spark') {
        x.strokeStyle = p.color;
        x.lineWidth = p.size * 0.5;
        x.lineCap = 'round';
        x.beginPath();
        x.moveTo(p.x, p.y);
        x.lineTo(p.x - p.vx * 0.03, p.y - p.vy * 0.03);
        x.stroke();
      } else if (p.k === 'star') {
        this.star(p.x, p.y, p.size * (1 - k * 0.5), p.color);
      } else if (p.k === 'puff') {
        x.fillStyle = p.color;
        x.beginPath();
        x.arc(p.x, p.y, p.size * (0.6 + k), 0, Math.PI * 2);
        x.fill();
      } else if (p.k === 'shard') {
        p.rot += p.vr * dt;
        x.save();
        x.translate(p.x, p.y);
        x.rotate(p.rot);
        x.fillStyle = p.color;
        x.beginPath();
        x.moveTo(0, -p.size);
        x.lineTo(p.size * 0.6, p.size * 0.5);
        x.lineTo(-p.size * 0.5, p.size * 0.4);
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
      x.clearRect(0, 0, this.w, this.h);
    }
  }

  star(cx, cy, r, color) {
    const x = this.x;
    x.fillStyle = color;
    x.beginPath();
    x.moveTo(cx, cy - r);
    x.quadraticCurveTo(cx, cy, cx + r, cy);
    x.quadraticCurveTo(cx, cy, cx, cy + r);
    x.quadraticCurveTo(cx, cy, cx - r, cy);
    x.quadraticCurveTo(cx, cy, cx, cy - r);
    x.fill();
  }

  coin(cx, cy, r, spin) {
    const x = this.x;
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
