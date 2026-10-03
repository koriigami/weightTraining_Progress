// Board 12, the reward stage in 3D (round 2): the chest drops, waits, takes its
// taps and bursts; it then stays in view, open, while each medal swirls out of it,
// pauses backlit at the top, flips to its face and settles above its card.
import { Art, THREE, dotTexture } from './art3d.js';
import { Tweens, ease, SPRINGS, reduced, TIME } from './motion.js';

const OPEN_Y = -0.62; // the open chest's base, kept fully on screen
const OPEN_K = 0.8;

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
    this.aimCamera();
    this.tw = new Tweens();
    this.root = new THREE.Group();
    this.art.scene.add(this.root);
    this.light = new THREE.PointLight('#ffffff', 0, 6, 1.5);
    this.light.position.set(0, 1.3, 0.2);
    this.art.scene.add(this.light);
    this.beam = this.makeBeam();
    this.art.scene.add(this.beam);
    // the glow behind a medal: it is backlit before it turns to face you
    this.halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: dotTexture('rgba(255,255,255,1)', 'rgba(255,255,255,0)'), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
    this.halo.scale.setScalar(3.6);
    this.art.scene.add(this.halo);
    this.running = false;
    this.t = 0;
    this.idleOn = false;
    this.shake = 0;
    this.loop = this.loop.bind(this);
  }

  aimCamera() {
    const cam = this.art.camera;
    cam.fov = 34;
    cam.position.set(0, 3.0, 12.5);
    cam.lookAt(0, 2.0, 0);
    cam.updateProjectionMatrix();
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
    return new THREE.Mesh(new THREE.CylinderGeometry(1.5, 0.75, 4.2, 40, 1, true), m);
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
    const dt = Math.min(0.05, (now - (this.last || now)) / 1000) * TIME.speed;
    this.last = now;
    this.t += dt;
    this.tw.step(now);
    const c = this.chest;
    if (c) {
      const b = (c && this.idleOn && !reduced() ? 1 + Math.sin(this.t * 3.2) * 0.012 : 1) * this.k;
      if (this.idleOn && !reduced()) c.rotation.y = this.baseRot + Math.sin(this.t * 1.3) * 0.06;
      c.scale.set(b * this.sq[0], b * this.sq[1], b * this.sq[0]);
      if (c.userData.gem) c.userData.gem.material.emissiveIntensity = 0.5 + Math.sin(this.t * 4) * 0.25 + this.leak * 1.5;
      if (c.userData.seam) c.userData.seam.material.opacity = this.leak * (0.75 + Math.sin(this.t * 9) * 0.25);
      if (c.userData.drift) c.userData.drift.offset.x += dt * 0.04;
    }
    const m = this.medal;
    if (m && this.medalIdle && !reduced()) {
      m.rotation.y = Math.sin(this.t * 1.4) * 0.32;
      m.position.y = this.medalY + Math.sin(this.t * 2.1) * 0.04;
    }
    if (m?.userData.tier === 'legend') m.userData.rimMat.iridescenceThicknessRange = [100 + Math.sin(this.t) * 80, 900 + Math.cos(this.t * 0.7) * 200];
    if (m) this.halo.position.set(m.position.x, m.position.y, m.position.z - 0.4);
    this.beam.rotation.y += dt * 0.4;
    this.root.position.x = this.shake ? (Math.random() - 0.5) * this.shake : 0;
    this.art.renderer.render(this.art.scene, this.art.camera);
    requestAnimationFrame(this.loop);
  }

  // Where things are on screen, in stage pixels, for the 2D layer.
  project(v) {
    const p = v.clone().project(this.art.camera);
    return { x: ((p.x + 1) / 2) * this.w, y: ((1 - p.y) / 2) * this.h };
  }
  chestPoint(y = 0.9) {
    const c = this.chest;
    return this.project(new THREE.Vector3(0, (c ? c.position.y : 0) + y * this.k, 0));
  }
  // the top right corner of the chest, for the counter
  chestCorner() {
    const c = this.chest;
    return this.project(new THREE.Vector3(1.0 * this.k, (c ? c.position.y : 0) + 1.65 * this.k, 0.6));
  }
  medalPoint() {
    return this.project(new THREE.Vector3(0, this.medalY ?? 3.55, 0.6));
  }
  // the medal's on-screen box, so the 2D layer can take over from it
  medalBox() {
    const m = this.medal;
    if (!m) return null;
    const s = m.scale.x;
    const c = this.project(m.position.clone());
    const top = this.project(m.position.clone().add(new THREE.Vector3(0, 1.05 * s, 0)));
    const r = Math.abs(c.y - top.y);
    return { x: c.x, y: c.y, size: r * 2 };
  }

  setChest(key, variant) {
    this.tw.clear();
    this.root.clear();
    this.medal = null;
    this.medalIdle = false;
    this.leak = 0;
    this.sq = [1, 1];
    this.k = 1;
    this.light.intensity = 0;
    this.beam.material.opacity = 0;
    this.halo.material.opacity = 0;
    const c = this.art.chest(key, variant);
    if (!c.userData.pillow) {
      // a strip of light along the lid seam, for the light that leaks before it opens
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
    this.halo.material.color.set(c.userData.glow);
    this.placeBeam();
    c.visible = false;
    this.shadow.visible = false;
    this.start();
  }

  placeBeam() {
    const y = this.chest.position.y;
    this.beam.position.y = y + 1.1 * this.k + 2.1;
    this.light.position.y = y + 1.3 * this.k;
    this.shadow.position.y = y + 0.002;
  }

  rest() {
    this.chest.visible = this.shadow.visible = true;
    this.idleOn = true;
  }

  async drop(onLand) {
    const c = this.chest;
    c.visible = this.shadow.visible = true;
    this.idleOn = false;
    c.position.y = 6;
    this.shadow.material.opacity = 0;
    await this.tw.add(
      430,
      (p) => {
        c.position.y = 6 * (1 - p);
        // the shadow gathers as the chest falls toward it
        this.shadow.material.opacity = 0.6 * p * p;
        this.shadow.scale.setScalar(0.4 + 0.6 * p);
      },
      ease.inQuad,
    );
    onLand?.();
    this.shake = 0.18;
    setTimeout(() => (this.shake = 0), 160 / TIME.speed);
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
    const kick = (i % 2 ? -1 : 1) * 0.16;
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
    this.tw.add(300, (p) => (this.beam.material.opacity = 0.4 * p));
    this.tw.add(400, (p) => (c.userData.inner.material.opacity = p));
    if (c.userData.pillow) {
      await this.tw.add(420, (p) => {
        const s = Math.sin(p * Math.PI);
        this.sq = [1 + 0.25 * s, 1 - 0.35 * s];
      });
      return;
    }
    await this.tw.spring((v) => (c.userData.hinge.rotation.x = -1.95 * v), SPRINGS.bouncy);
  }

  // After the burst the open chest moves down and a little smaller, but stays whole.
  settle() {
    const c = this.chest;
    const y0 = c.position.y;
    return this.tw.add(420, (p) => {
      c.position.y = y0 + (OPEN_Y - y0) * p;
      this.k = 1 - (1 - OPEN_K) * p;
      this.shadow.scale.setScalar(1 - 0.2 * p);
      this.placeBeam();
    });
  }

  // The swirl: up out of the chest on a curve while spinning, a pause backlit at
  // the top, then a flip to the face with a punch. hooks: onRise, onFlip.
  async medalOut(r, hooks = {}) {
    if (this.medal) this.root.remove(this.medal);
    const m = this.art.medal(r.tier, r.shape, r.icon, r.text || null, { variant: r.variant, month: r.month });
    this.medal = m;
    this.root.add(m);
    this.medalIdle = false;
    this.medalY = 3.55;
    // a Legend frame reaches past the medal, so the whole thing is drawn a little smaller
    const f = r.tier === 'legend' ? 0.76 : 1;
    const y0 = this.chest.position.y + this.chest.userData.H * this.k;
    m.position.set(0, y0, 0.2);
    m.scale.setScalar(0.2 * f);
    hooks.onRise?.();
    // rise: a curved path, spinning fast, small and dark against its own glow
    await this.tw.add(
      700,
      (p) => {
        const e = ease.outCubic(p);
        m.position.y = y0 + (this.medalY + 0.25 - y0) * e;
        m.position.x = Math.sin(p * Math.PI) * 0.9;
        m.position.z = 0.2 + 0.2 * p;
        m.scale.setScalar(f * (0.2 + 0.45 * e));
        m.rotation.y = p * Math.PI * 6;
        this.halo.material.opacity = 0.85 * e;
      },
      ease.linear,
    );
    // the pause: backlit, still turning slowly
    await this.tw.add(260, (p) => {
      m.rotation.y = Math.PI * 6 + p * Math.PI * 0.5;
      this.halo.scale.setScalar(3.6 + Math.sin(p * Math.PI) * 0.6);
    });
    hooks.onFlip?.();
    // the flip and punch: it swings round to face you, big, then settles
    const r0 = m.rotation.y % (Math.PI * 2);
    await this.tw.add(
      520,
      (p) => {
        m.rotation.y = r0 + (Math.PI * 2 - r0) * ease.outBack(p, 1.4);
        m.scale.setScalar(f * (0.65 + 0.55 * Math.sin(Math.min(1, p * 1.6) * Math.PI * 0.5) - 0.3 * Math.max(0, p - 0.6)));
        m.position.y = this.medalY + 0.25 * (1 - p);
        m.position.z = 0.4 + 0.2 * p;
        this.halo.material.opacity = 0.85 * (1 - p * 0.6);
      },
      ease.linear,
    );
    m.rotation.y = 0;
    m.scale.setScalar(0.9 * f);
    this.medalIdle = true;
  }

  // the 3D medal steps aside; the 2D layer flies a picture of it to the tray
  removeMedal() {
    if (this.medal) this.root.remove(this.medal);
    this.medal = null;
    this.medalIdle = false;
    this.halo.material.opacity = 0;
  }

  hideChest() {
    const c = this.chest;
    const y0 = c.position.y;
    return this.tw
      .add(320, (p) => {
        c.position.y = y0 - 5 * ease.inCubic(p);
        this.beam.material.opacity = 0.4 * (1 - p);
        this.placeBeam();
      })
      .then(() => {
        c.visible = this.shadow.visible = false;
      });
  }

  // a picture of one medal, at twice its shown size, framed tight
  medalImage(r, px = 180) {
    const live = this.art.renderer.getSize(new THREE.Vector2());
    const m = this.art.medal(r.tier, r.shape, r.icon, r.text || null, { variant: r.variant, month: r.month });
    // framed tight: the medal (and any frame) fills about 90% of the picture
    const box = new THREE.Box3().setFromObject(m);
    const size = box.getSize(new THREE.Vector3());
    const c = box.getCenter(new THREE.Vector3());
    const half = Math.tan(((this.art.camera.fov / 2) * Math.PI) / 180);
    const d = Math.max(size.x, size.y) / 2 / half / 0.9 + size.z / 2;
    this.root.visible = false;
    this.beam.visible = this.halo.visible = false;
    const url = this.art.still(m, { w: px, h: px, cam: [c.x, c.y + 0.35, d], look: [c.x, c.y, 0], rotY: -0.28, shadow: false });
    this.root.visible = this.beam.visible = this.halo.visible = true;
    this.art.resize(live.x, live.y);
    this.aimCamera();
    return url;
  }
}
