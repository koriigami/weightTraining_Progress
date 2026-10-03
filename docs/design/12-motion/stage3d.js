// Board 12, direction B on the reward stage: the 3D chest and medal, driven by
// the same steps as the vector stage (drop, idle, tap, burst, medal out, away).
import { Art, THREE, PALETTE } from './art3d.js';
import { Tweens, ease, SPRINGS, reduced } from './motion.js';

export class Stage3D {
  constructor(host, { w = 390, h = 780 } = {}) {
    this.w = w;
    this.h = h;
    this.art = new Art({ width: w, height: h });
    this.art.renderer.setPixelRatio(Math.min(1.75, window.devicePixelRatio || 1));
    this.art.resize(w, h);
    this.el = this.art.renderer.domElement;
    this.el.className = 'rs-gl';
    host.appendChild(this.el);
    const cam = this.art.camera;
    cam.fov = 34;
    cam.position.set(0, 3.0, 12.5);
    cam.lookAt(0, 2.0, 0);
    cam.updateProjectionMatrix();
    this.tw = new Tweens();
    this.root = new THREE.Group();
    this.art.scene.add(this.root);
    this.light = new THREE.PointLight('#ffffff', 0, 6, 1.5);
    this.light.position.set(0, 1.3, 0.2);
    this.art.scene.add(this.light);
    this.beam = this.makeBeam();
    this.art.scene.add(this.beam);
    this.running = false;
    this.t = 0;
    this.idleOn = false;
    this.shake = 0;
    this.loop = this.loop.bind(this);
  }

  makeBeam() {
    const c = document.createElement('canvas');
    c.width = 4;
    c.height = 256;
    const x = c.getContext('2d');
    const g = x.createLinearGradient(0, 0, 0, 256);
    g.addColorStop(0, 'rgba(255,255,255,0)');
    g.addColorStop(0.55, 'rgba(255,255,255,.55)');
    g.addColorStop(1, 'rgba(255,255,255,.9)');
    x.fillStyle = g;
    x.fillRect(0, 0, 4, 256);
    const t = new THREE.CanvasTexture(c);
    const m = new THREE.MeshBasicMaterial({ map: t, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false });
    const b = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 0.75, 4.2, 40, 1, true), m);
    b.position.y = 0.95 + 2.1;
    return b;
  }

  start() {
    if (this.running) return;
    this.running = true;
    requestAnimationFrame(this.loop);
  }
  stop() {
    this.running = false;
  }

  loop(now) {
    if (!this.running) return;
    const dt = Math.min(0.05, (now - (this.last || now)) / 1000);
    this.last = now;
    this.t += dt;
    this.tw.step(now);
    const c = this.chest;
    if (c && this.idleOn && !reduced()) {
      c.rotation.y = this.baseRot + Math.sin(this.t * 1.3) * 0.06;
      const b = (1 + Math.sin(this.t * 3.2) * 0.012) * this.sinkK;
      c.scale.set(b * this.sq[0], b * this.sq[1], b * this.sq[0]);
    } else if (c) {
      c.scale.set(this.sq[0] * this.sinkK, this.sq[1] * this.sinkK, this.sq[0] * this.sinkK);
    }
    if (c?.userData.gem) c.userData.gem.material.emissiveIntensity = 0.5 + Math.sin(this.t * 4) * 0.25 + this.leak * 1.5;
    if (c?.userData.seam) c.userData.seam.material.opacity = this.leak * (0.75 + Math.sin(this.t * 9) * 0.25);
    if (this.medal && this.medalIdle && !reduced()) {
      this.medal.rotation.y = Math.sin(this.t * 1.4) * 0.38;
      this.medal.position.y = this.medalY + Math.sin(this.t * 2.1) * 0.05;
    }
    if (this.medal?.userData.tier === 'legend') this.medal.userData.rimMat.iridescenceThicknessRange = [100 + Math.sin(this.t) * 80, 900 + Math.cos(this.t * 0.7) * 200];
    this.beam.rotation.y += dt * 0.4;
    this.root.position.x = this.shake ? (Math.random() - 0.5) * this.shake : 0;
    this.art.renderer.render(this.art.scene, this.art.camera);
    requestAnimationFrame(this.loop);
  }

  // Where the chest and medal are on screen, in stage pixels, for the 2D effects.
  project(v) {
    const p = v.clone().project(this.art.camera);
    return { x: ((p.x + 1) / 2) * this.w, y: ((1 - p.y) / 2) * this.h };
  }
  chestPoint(y = 0.9) {
    return this.project(new THREE.Vector3(0, y, 0));
  }
  medalPoint() {
    return this.project(new THREE.Vector3(0, this.medalY ?? 3.3, 0.6));
  }

  setChest(key) {
    this.tw.clear();
    this.root.clear();
    this.medal = null;
    this.leak = 0;
    this.sq = [1, 1];
    this.sinkK = 1;
    this.light.intensity = 0;
    this.beam.material.opacity = 0;
    this.beam.position.y = 3.05;
    this.light.position.y = 1.3;
    const c = this.art.chest(key);
    // a strip of light along the lid seam, for the light that leaks before it opens
    if (!c.userData.pillow) {
      const seam = new THREE.Mesh(new THREE.BoxGeometry(c.userData.W + 0.12, 0.05, c.userData.D + 0.12), new THREE.MeshBasicMaterial({ color: c.userData.glow, transparent: true, opacity: 0, toneMapped: false, blending: THREE.AdditiveBlending }));
      seam.position.y = c.userData.H + 0.015;
      c.add(seam);
      c.userData.seam = seam;
    }
    this.baseRot = -0.32;
    c.rotation.y = this.baseRot;
    c.position.y = 0;
    this.chest = c;
    this.root.add(c);
    this.shadow = this.art.shadow(1.6, 0.6);
    this.root.add(this.shadow);
    this.light.color.set(c.userData.glow);
    this.beam.material.color.set(c.userData.glow);
    c.visible = false;
    this.shadow.visible = false;
    this.start();
  }

  // the chest standing still, before Play
  rest() {
    this.chest.visible = this.shadow.visible = true;
    this.idleOn = true;
  }

  async drop(onLand) {
    const c = this.chest;
    c.visible = this.shadow.visible = true;
    this.idleOn = false;
    c.position.y = 6;
    await this.tw.add(
      430,
      (p) => {
        c.position.y = 6 * (1 - p);
        this.shadow.material.opacity = 0.6 * p;
        this.shadow.scale.setScalar(0.5 + 0.5 * p);
      },
      ease.inQuad,
    );
    onLand?.();
    this.shake = 0.18;
    setTimeout(() => (this.shake = 0), 160);
    // squash on landing, then spring back
    await this.tw.spring((v) => {
      const s = 1 - v;
      this.sq = [1 + 0.16 * s, 1 - 0.24 * s];
    }, SPRINGS.bouncy);
    this.idleOn = true;
  }

  async tap(i, n) {
    const c = this.chest;
    this.leak = Math.min(1, (i + 1) / n);
    this.light.intensity = 3 * this.leak;
    const hinge = c.userData.hinge;
    const kick = (Math.random() < 0.5 ? -1 : 1) * 0.16;
    if (hinge) this.tw.add(260, (p) => (hinge.rotation.x = -Math.sin(p * Math.PI) * (0.08 + 0.04 * i)), ease.linear);
    await this.tw.add(
      380,
      (p) => {
        const w = Math.sin(p * Math.PI * 4) * (1 - p);
        c.rotation.z = kick * w;
        const s = Math.sin(p * Math.PI) * (1 - p);
        this.sq = [1 + 0.1 * s, 1 - 0.14 * s];
        c.position.y = Math.max(0, Math.sin(p * Math.PI) * 0.35 * (1 - p));
      },
      ease.linear,
    );
    c.rotation.z = 0;
  }

  // a quick shiver before the last tap opens a rare chest
  async charge(ms) {
    const c = this.chest;
    await this.tw.add(
      ms,
      (p) => {
        c.rotation.z = Math.sin(p * 90) * 0.03 * p;
        this.light.intensity = 3 + 4 * p;
        this.leak = 1;
      },
      ease.linear,
    );
    c.rotation.z = 0;
  }

  async burst() {
    const c = this.chest;
    this.idleOn = false;
    this.light.intensity = 9;
    this.tw.add(300, (p) => (this.beam.material.opacity = 0.42 * p));
    this.tw.add(400, (p) => (c.userData.inner.material.opacity = p));
    if (c.userData.pillow) {
      await this.tw.add(420, (p) => {
        const s = Math.sin(p * Math.PI);
        this.sq = [1 + 0.25 * s, 1 - 0.35 * s];
      });
      return;
    }
    const hinge = c.userData.hinge;
    await this.tw.spring((v) => (hinge.rotation.x = -1.95 * v), SPRINGS.bouncy);
  }

  async medalOut(reward) {
    if (this.medal) this.root.remove(this.medal);
    const m = this.art.medal(reward.tier, reward.shape, reward.icon, reward.text || null);
    this.medal = m;
    this.root.add(m);
    this.medalIdle = false;
    this.medalY = 3.3;
    const y0 = this.chest.userData.H;
    m.position.set(0, y0, 0.2);
    m.scale.setScalar(0.25);
    await this.tw.add(
      820,
      (p) => {
        m.position.y = y0 + (this.medalY - y0) * ease.outBack(p, 1.2);
        m.position.z = 0.2 + 0.4 * p;
        m.scale.setScalar(0.25 + 0.65 * ease.outCubic(p));
        m.rotation.y = (1 - ease.outCubic(p)) * Math.PI * 4;
      },
      ease.linear,
    );
    this.medalIdle = true;
  }

  async medalAway() {
    const m = this.medal;
    if (!m) return;
    this.medalIdle = false;
    const x0 = m.position.x;
    const y0 = m.position.y;
    await this.tw.add(
      320,
      (p) => {
        m.position.x = x0 - 3.5 * p;
        m.position.y = y0 - 0.6 * p;
        m.scale.setScalar(0.9 * (1 - p * 0.7));
        m.rotation.y = -p * 1.2;
      },
      ease.inCubic,
    );
    this.root.remove(m);
    this.medal = null;
  }

  sink() {
    const c = this.chest;
    return this.tw.add(360, (p) => {
      c.position.y = -1.15 * p;
      this.shadow.position.y = -1.15 * p + 0.002;
      this.sinkK = 1 - 0.15 * p;
      this.beam.position.y = 3.05 - 1.15 * p;
      this.light.position.y = 1.3 - 1.15 * p;
    });
  }

  hideChest() {
    return this.tw.add(260, (p) => {
      this.chest.position.y = -2.5 * ease.inCubic(p);
      this.beam.material.opacity *= 1 - p;
    });
  }

  // an image of one medal, for the You got grid
  medalImage(r) {
    const live = this.art.renderer.getSize(new THREE.Vector2());
    const m = this.art.medal(r.tier, r.shape, r.icon, r.text || null);
    this.root.visible = false;
    const url = this.art.still(m, { w: 160, h: 160, cam: [0, 0.2, 6.6], look: [0, 0, 0], rotY: -0.25, shadow: false });
    this.root.visible = true;
    this.art.resize(live.x, live.y);
    const cam = this.art.camera;
    cam.position.set(0, 3.0, 12.5);
    cam.lookAt(0, 2.0, 0);
    return url;
  }
}
