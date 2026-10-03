// Board 12: the sound library. Three buses (taps, effects, music) and a small
// reverb into one limiter. Rich moments play recorded CC0 files; small ones are
// made in code. Every reward sound plays in the key of the chest music, so the
// effects never clash with it (round 1's sad-sounding badge was a bell a tritone
// away from the music).
const BASE = '12-motion/sounds/';

export const BUS = { ui: 0.5, fx: 0.9, music: 0.5 };
const SEND = { ui: 0.05, fx: 0.2, music: 0 };

const NOTE = { C: 0, 'C#': 1, D: 2, 'D#': 3, E: 4, F: 5, 'F#': 6, G: 7, 'G#': 8, A: 9, 'A#': 10, B: 11 };
const MAJOR = [0, 2, 4, 5, 7, 9, 11];

// Keys found by analysing each file (tools/contour.py): music, and tonal effects.
export const MUSIC_KEY = {
  'm-chest-pop-a': 'F',
  'm-chest-pop-b': 'D',
  'm-chest-pop-c': 'G',
  'm-chest-cin-a': 'F',
  'm-chest-cin-b': 'D',
  'm-chest-cin-c': 'C',
  'm-chest-fit-a': 'F',
  'm-chest-fit-b': 'F',
  'm-chest-fit-c': 'F',
  'code:shimmer': 'C',
  off: 'C',
};
const FILE_KEY = { 'reveal-hit': 'F', 'reveal-pickup': 'F', 'reveal-upper': 'C#', 'sparkle-a': 'D', 'sparkle-c': 'G#', 'riser-a': 'C', 'riser-b': 'C#' };

export const S = {
  ctx: null,
  out: null,
  bus: {},
  buf: new Map(),
  pending: new Map(),
  on: true,
  music: true,
  haptics: true,
  cur: null,
  noiseBuf: null,
  key: 'C',
  speed: 1,

  ensure() {
    if (!this.ctx) {
      // Mix with the person's own music instead of stopping it (Safari 16.4 and later).
      try {
        if (navigator.audioSession) navigator.audioSession.type = 'ambient';
      } catch {}
      const C = window.AudioContext || window.webkitAudioContext;
      if (!C) return null;
      const c = (this.ctx = new C());
      const lim = c.createDynamicsCompressor();
      lim.threshold.value = -8;
      lim.ratio.value = 8;
      lim.attack.value = 0.003;
      lim.release.value = 0.15;
      this.out = c.createGain();
      this.out.gain.value = 0.85;
      this.out.connect(lim).connect(c.destination);
      // a short bright room: 1.6 s of decaying noise
      const len = Math.floor(c.sampleRate * 1.6);
      const ir = c.createBuffer(2, len, c.sampleRate);
      for (let ch = 0; ch < 2; ch++) {
        const d = ir.getChannelData(ch);
        let lp = 0;
        for (let i = 0; i < len; i++) {
          lp = lp * 0.55 + (Math.random() * 2 - 1) * 0.45;
          d[i] = lp * Math.exp((-i / c.sampleRate) * 3.2) * (i < c.sampleRate * 0.012 ? 0 : 1);
        }
      }
      const rev = c.createConvolver();
      rev.buffer = ir;
      const wet = c.createGain();
      wet.gain.value = 0.9;
      rev.connect(wet).connect(this.out);
      for (const b of Object.keys(BUS)) {
        const g = c.createGain();
        g.gain.value = BUS[b];
        g.connect(this.out);
        const s = c.createGain();
        s.gain.value = SEND[b];
        g.connect(s).connect(rev);
        this.bus[b] = g;
      }
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
    return this.ctx;
  },

  load(id) {
    if (this.buf.has(id)) return Promise.resolve(this.buf.get(id));
    if (this.pending.has(id)) return this.pending.get(id);
    const c = this.ensure();
    if (!c) return Promise.resolve(null);
    const p = fetch(BASE + id + '.mp3')
      .then((r) => r.arrayBuffer())
      .then((a) => new Promise((ok, no) => c.decodeAudioData(a, ok, no)))
      .then((b) => {
        this.buf.set(id, b);
        return b;
      })
      .catch(() => null);
    this.pending.set(id, p);
    return p;
  },

  file(id, { bus = 'fx', gain = 1, rate = 1, at = 0 } = {}) {
    if (!this.on) return;
    const c = this.ensure();
    if (!c) return;
    const b = this.buf.get(id);
    if (!b) {
      const t = performance.now();
      this.load(id).then(() => performance.now() - t < 400 && this.file(id, { bus, gain, rate, at }));
      return;
    }
    const s = c.createBufferSource();
    s.buffer = b;
    s.playbackRate.value = rate * this.speedRate();
    const g = c.createGain();
    g.gain.value = gain;
    s.connect(g).connect(this.bus[bus]);
    s.start(c.currentTime + at);
    return s;
  },

  // half-speed preview slows sounds a little too, without dropping an octave
  speedRate() {
    return this.speed < 1 ? 0.85 : 1;
  },

  osc(type, f0, f1, dur, { g = 0.3, bus = 'ui', at = 0, att = 0.004, detune = 0 } = {}) {
    if (!this.on) return;
    const c = this.ensure();
    if (!c) return;
    const t = c.currentTime + at;
    const o = c.createOscillator();
    o.type = type;
    o.detune.value = detune;
    o.frequency.setValueAtTime(f0, t);
    if (f1) o.frequency.exponentialRampToValueAtTime(f1, t + dur * 0.9);
    const gn = c.createGain();
    gn.gain.setValueAtTime(0.0001, t);
    gn.gain.exponentialRampToValueAtTime(g, t + att);
    gn.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(gn).connect(this.bus[bus]);
    o.start(t);
    o.stop(t + dur + 0.03);
  },

  noise(dur, { g = 0.2, bus = 'ui', at = 0, type = 'bandpass', f0 = 1000, f1 = null, q = 1, att = 0.004 } = {}) {
    if (!this.on) return;
    const c = this.ensure();
    if (!c) return;
    if (!this.noiseBuf) {
      this.noiseBuf = c.createBuffer(1, c.sampleRate, c.sampleRate);
      const d = this.noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    const t = c.currentTime + at;
    const s = c.createBufferSource();
    s.buffer = this.noiseBuf;
    s.loop = true;
    const f = c.createBiquadFilter();
    f.type = type;
    f.Q.value = q;
    f.frequency.setValueAtTime(f0, t);
    if (f1) f.frequency.exponentialRampToValueAtTime(f1, t + dur);
    const gn = c.createGain();
    gn.gain.setValueAtTime(0.0001, t);
    gn.gain.exponentialRampToValueAtTime(g, t + att);
    gn.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f).connect(gn).connect(this.bus[bus]);
    s.start(t, Math.random() * 0.5);
    s.stop(t + dur + 0.03);
  },

  // Music: one track at a time, faded in and out; loops on its bar line when asked.
  playMusic(id, { loop = false, gain = 1, fade = 0.25 } = {}) {
    this.stopMusic(0.2);
    if (!this.on || !this.music || !id || id === 'off') return;
    if (id === 'code:shimmer') return SHIMMER.start();
    const c = this.ensure();
    if (!c) return;
    this.load(id).then((b) => {
      if (!b) return;
      const s = c.createBufferSource();
      s.buffer = b;
      s.loop = loop;
      const g = c.createGain();
      g.gain.setValueAtTime(0.0001, c.currentTime);
      g.gain.exponentialRampToValueAtTime(gain, c.currentTime + fade);
      s.connect(g).connect(this.bus.music);
      s.start();
      this.cur = { s, g };
      s.onended = () => this.cur?.s === s && (this.cur = null);
    });
  },
  stopMusic(fade = 0.6) {
    SHIMMER.stop(fade);
    const m = this.cur;
    if (!m || !this.ctx) return;
    const t = this.ctx.currentTime;
    m.g.gain.cancelScheduledValues(t);
    m.g.gain.setValueAtTime(m.g.gain.value, t);
    m.g.gain.exponentialRampToValueAtTime(0.0001, t + fade);
    m.s.stop(t + fade + 0.05);
    this.cur = null;
  },
  // Big hits pull the music down for a moment so they land.
  duck(ms = 450, to = 0.35) {
    if (!this.ctx) return;
    const g = this.bus.music.gain;
    const t = this.ctx.currentTime;
    g.cancelScheduledValues(t);
    g.setValueAtTime(BUS.music * to, t);
    g.linearRampToValueAtTime(BUS.music, t + ms / 1000);
  },
};

// ---------- instruments made in code ----------
// Frequency of a scale degree (0 = the key's tonic) in the current key.
export function deg(d, o = 5, key = S.key) {
  const k = NOTE[key] ?? 0;
  const oct = Math.floor(d / 7);
  const st = MAJOR[((d % 7) + 7) % 7] + 12 * oct;
  return 440 * 2 ** ((12 * (o + 1) + k + st - 69) / 12);
}
const INS = {
  bell(f, { at = 0, g = 0.12, dur = 1.1, bus = 'fx' } = {}) {
    [
      [1, 1, 1],
      [2, 0.45, 0.6],
      [3, 0.2, 0.4],
      [4.2, 0.1, 0.25],
    ].forEach(([m, a, d]) => S.osc('sine', f * m, null, dur * d, { g: g * a, at, bus, att: 0.003 }));
  },
  marimba(f, { at = 0, g = 0.14, bus = 'fx' } = {}) {
    S.osc('sine', f, null, 0.42, { g, at, bus, att: 0.002 });
    S.osc('sine', f * 4, null, 0.07, { g: g * 0.25, at, bus, att: 0.002 });
  },
  pluck(f, { at = 0, g = 0.12, bus = 'fx' } = {}) {
    S.osc('triangle', f, null, 0.3, { g, at, bus, att: 0.002 });
    S.osc('sine', f * 2, null, 0.15, { g: g * 0.3, at, bus, att: 0.002 });
  },
  brass(f, { at = 0, g = 0.06, dur = 0.4, bus = 'fx' } = {}) {
    if (!S.on) return;
    const c = S.ensure();
    if (!c) return;
    const t = c.currentTime + at;
    const lp = c.createBiquadFilter();
    lp.type = 'lowpass';
    lp.Q.value = 1.5;
    lp.frequency.setValueAtTime(500, t);
    lp.frequency.exponentialRampToValueAtTime(2800, t + 0.06);
    lp.frequency.exponentialRampToValueAtTime(1300, t + dur);
    const gn = c.createGain();
    gn.gain.setValueAtTime(0.0001, t);
    gn.gain.exponentialRampToValueAtTime(g, t + 0.03);
    gn.gain.setValueAtTime(g, t + dur * 0.7);
    gn.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    lp.connect(gn).connect(S.bus[bus]);
    for (const dt of [-7, 7]) {
      const o = c.createOscillator();
      o.type = 'sawtooth';
      o.frequency.value = f;
      o.detune.value = dt;
      o.connect(lp);
      o.start(t);
      o.stop(t + dur + 0.05);
    }
  },
  thump(f = 120, { at = 0, g = 0.5, bus = 'fx' } = {}) {
    S.osc('sine', f, f * 0.42, 0.26, { g, at, bus });
  },
};

// ---------- the sounds made in code ----------
export const SYN = {
  pop: () => {
    S.osc('sine', 420, 660, 0.09, { g: 0.32 });
    S.noise(0.02, { f0: 3200, q: 2, g: 0.04 });
  },
  tock: () => {
    S.osc('triangle', 320, 230, 0.08, { g: 0.38 });
    S.noise(0.035, { f0: 1700, q: 3, g: 0.13 });
  },
  tick: () => S.osc('square', 2300, null, 0.016, { g: 0.05 }),
  pip: (p = 1) => S.osc('sine', 1150 * p, 1450 * p, 0.05, { g: 0.18 }),
  switchOn: () => {
    S.osc('triangle', 700, null, 0.03, { g: 0.2 });
    S.osc('triangle', 1100, null, 0.035, { g: 0.2, at: 0.05 });
  },
  switchOff: () => {
    S.osc('triangle', 1000, null, 0.03, { g: 0.18 });
    S.osc('triangle', 640, null, 0.035, { g: 0.18, at: 0.05 });
  },
  // closing: three subtle options (round 1's swish was too shrill)
  puff: () => S.noise(0.09, { type: 'lowpass', f0: 700, f1: 240, q: 0.7, g: 0.12 }),
  tuck: () => {
    S.osc('sine', 260, 170, 0.07, { g: 0.14 });
    S.noise(0.04, { type: 'lowpass', f0: 420, g: 0.05 });
  },
  paper: () => S.noise(0.06, { f0: 1400, q: 2, g: 0.05 }),
  // opening
  lift: () => {
    S.noise(0.14, { type: 'lowpass', f0: 260, f1: 1200, q: 0.8, g: 0.09 });
    S.osc('sine', 180, 280, 0.12, { g: 0.08 });
  },
  modal: () => {
    SYN.pip(0.7);
    S.noise(0.2, { f0: 500, f1: 2800, q: 1.2, g: 0.12 });
  },
  chime: () => {
    S.osc('sine', 1318.5, null, 0.5, { g: 0.09, bus: 'fx' });
    S.osc('sine', 1975.5, null, 0.6, { g: 0.07, at: 0.07, bus: 'fx' });
  },
  low: () => S.osc('triangle', 330, 247, 0.22, { g: 0.24 }),
  // the set tick: two semitones higher for each set in a row (quieter than round 1)
  set: (n = 0) => {
    const f = 523.25 * 2 ** ((Math.min(n, 12) * 2) / 12);
    S.osc('sine', f, f * 1.5, 0.12, { g: 0.2 });
    S.osc('triangle', f * 2, null, 0.08, { g: 0.05, at: 0.02 });
    S.noise(0.02, { f0: 4000, q: 2, g: 0.03 });
  },
  untick: () => S.osc('sine', 500, 360, 0.1, { g: 0.18 }),
  coin: (p = 1) => {
    S.osc('sine', 1975 * p, null, 0.14, { g: 0.09, bus: 'fx' });
    S.osc('sine', 2637 * p, null, 0.2, { g: 0.07, at: 0.04, bus: 'fx' });
  },
  clink: (p = 1) => {
    S.osc('sine', 2800 * p, 3200 * p, 0.12, { g: 0.1, bus: 'fx' });
    S.noise(0.03, { f0: 6000, q: 3, g: 0.06, bus: 'fx' });
  },
  roll: (p = 1) => S.osc('square', 1800 * p, null, 0.012, { g: 0.04 }),
  // XP counting up: the XP lines sound, a coin, then ticks climbing
  xp: (n = 6) => {
    SYN.coin(1);
    for (let i = 0; i < n; i++) S.osc('square', 1600 * 2 ** (i / 12), null, 0.012, { g: 0.035, at: 0.05 + i * 0.035 });
  },
  riser: (dur = 0.9) => {
    S.osc('sawtooth', 160, 760, dur, { g: 0.04, att: dur * 0.9, bus: 'fx' });
    S.noise(dur, { type: 'highpass', f0: 500, f1: 5000, g: 0.07, att: dur * 0.9, bus: 'fx' });
  },
  drumroll: (dur = 0.9) => {
    for (let t = 0; t < dur; t += 0.05) S.noise(0.05, { at: t, f0: 900, q: 0.8, g: 0.025 + (t / dur) * 0.1, bus: 'fx' });
  },
  thud: () => {
    INS.thump(120, { g: 0.7 });
    S.noise(0.1, { type: 'lowpass', f0: 500, g: 0.3, bus: 'fx' });
  },
  // the medal leaves the chest: a soft rising swirl
  swirl: () => {
    S.noise(0.5, { f0: 300, f1: 2600, q: 1.4, g: 0.1, bus: 'fx', att: 0.25 });
    S.osc('sine', deg(0, 4), deg(4, 5), 0.5, { g: 0.05, bus: 'fx', att: 0.2 });
  },
  // the lid bursts: a swell into a bright major chord
  bloom: () => {
    S.noise(0.28, { type: 'lowpass', f0: 300, f1: 4000, q: 0.7, g: 0.12, bus: 'fx', att: 0.24 });
    INS.thump(110, { at: 0.24, g: 0.5 });
    [0, 2, 4, 7].forEach((d, i) => INS.bell(deg(d, 5), { at: 0.25 + i * 0.012, g: 0.07, dur: 1.4 }));
    SYN.sparkle(0.3);
  },
  // the badge appears: a rising bell arpeggio over a soft low hit
  bells: () => {
    INS.thump(150, { g: 0.32 });
    [0, 2, 4, 7, 9].forEach((d, i) => INS.bell(deg(d, 5), { at: 0.02 + i * 0.055, g: 0.09, dur: i === 4 ? 1.6 : 0.9 }));
    S.noise(0.6, { type: 'highpass', f0: 7000, f1: 4000, g: 0.03, bus: 'fx', at: 0.05 });
  },
  sparkle: (at = 0) => {
    [7, 9, 11, 14, 16, 18].forEach((d, i) => S.osc('sine', deg(d, 5), null, 0.18, { g: 0.05, at: at + i * 0.04, bus: 'fx' }));
  },
  // tier up: climbing the scale, then landing on the chord an octave up
  shimmer: () => {
    for (let i = 0; i < 8; i++) INS.bell(deg(i, 5), { at: i * 0.07, g: 0.05, dur: 0.5 });
    S.noise(0.6, { type: 'highpass', f0: 2000, f1: 8000, g: 0.04, bus: 'fx', att: 0.5 });
    [7, 9, 11, 14].forEach((d) => INS.bell(deg(d, 5), { at: 0.62, g: 0.07, dur: 1.6 }));
  },
  // small successes
  two: () => {
    INS.bell(deg(4, 5), { g: 0.06, dur: 0.6 });
    INS.bell(deg(7, 5), { at: 0.09, g: 0.07, dur: 1 });
  },
  marimba: () => [0, 2, 4, 7].forEach((d, i) => INS.marimba(deg(d, 5), { at: i * 0.05, g: 0.1 })),
  // beat last time: a brass lift with a proper tail, not a cut-off stab
  brass: () => {
    INS.brass(deg(4, 4), { dur: 0.14, g: 0.05 });
    INS.brass(deg(7, 4), { at: 0.13, dur: 0.55, g: 0.06 });
    INS.brass(deg(9, 4), { at: 0.13, dur: 0.55, g: 0.03 });
    INS.bell(deg(14, 5), { at: 0.15, g: 0.04, dur: 0.8 });
  },
  fanfare: () => {
    [0, 0, 0, 2, 4].forEach((d, i) => INS.brass(deg(d + 7, 3), { at: [0, 0.12, 0.24, 0.36, 0.5][i], dur: i === 4 ? 0.7 : 0.1, g: 0.06 }));
    INS.thump(90, { at: 0.5, g: 0.4 });
    [7, 9, 11].forEach((d) => INS.bell(deg(d, 5), { at: 0.5, g: 0.05, dur: 1.4 }));
  },
  // weekly goal met: a soft press, then a bright rising chord
  seal: () => {
    INS.thump(95, { g: 0.35 });
    S.noise(0.05, { type: 'lowpass', f0: 600, g: 0.12, bus: 'fx' });
    [0, 4, 7].forEach((d, i) => INS.bell(deg(d, 5), { at: 0.12 + i * 0.06, g: 0.07, dur: 1.1 }));
  },
  shatter: () => {
    INS.thump(80, { g: 0.35 });
    S.noise(0.35, { type: 'highpass', f0: 2500, f1: 1200, g: 0.22, bus: 'fx' });
    for (let i = 0; i < 14; i++) S.osc('sine', 2400 + Math.random() * 4200, null, 0.08 + Math.random() * 0.12, { g: 0.04, at: 0.01 + i * 0.018, bus: 'fx' });
  },
  face: (i) => {
    const f = [392, 440, 523.25, 587.33, 659.25][i];
    S.osc('sine', f, f * 1.02, 0.22, { g: 0.22 });
    S.osc('sine', f * 2, null, 0.12, { g: 0.05, at: 0.01 });
  },
  flip: (i = 0) => {
    S.noise(0.04, { f0: 2400, q: 1.5, g: 0.08 });
    S.osc('sine', deg(i, 5), null, 0.12, { g: 0.08, at: 0.02 });
  },
};

// The shimmer bed: a soft chord with sparkles; each tap lifts it a step.
const SHIMMER = {
  nodes: null,
  timer: 0,
  step: 0,
  start() {
    const c = S.ensure();
    if (!c || !S.on || !S.music) return;
    this.stop(0.05);
    const out = c.createGain();
    out.gain.setValueAtTime(0.0001, c.currentTime);
    out.gain.exponentialRampToValueAtTime(0.5, c.currentTime + 0.6);
    out.connect(S.bus.music);
    const lp = c.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 900;
    lp.connect(out);
    const oscs = [0, 2, 4].map((d) => {
      const o = c.createOscillator();
      o.type = 'sawtooth';
      o.frequency.value = deg(d, 3, 'C');
      const g = c.createGain();
      g.gain.value = 0.05;
      o.connect(g).connect(lp);
      o.start();
      return o;
    });
    this.nodes = { out, lp, oscs };
    this.step = 0;
    const sparkle = () => {
      if (!this.nodes) return;
      const d = [7, 9, 11, 14, 16][Math.floor(Math.random() * 5)] + this.step;
      INS.bell(deg(d, 5, 'C'), { g: 0.025 + this.step * 0.008, dur: 0.6, bus: 'music' });
      this.timer = setTimeout(sparkle, 200 - this.step * 30);
    };
    sparkle();
  },
  // a tap: the chord climbs I, IV, V and the filter opens
  lift(i) {
    if (!this.nodes || !S.ctx) return;
    this.step = i + 1;
    const chords = [
      [0, 2, 4],
      [3, 5, 7],
      [4, 6, 8],
      [4, 6, 8],
    ];
    const t = S.ctx.currentTime;
    this.nodes.oscs.forEach((o, k) => o.frequency.setTargetAtTime(deg(chords[Math.min(3, this.step)][k], 3, 'C'), t, 0.05));
    this.nodes.lp.frequency.setTargetAtTime(900 + this.step * 900, t, 0.1);
  },
  stop(fade = 0.5) {
    clearTimeout(this.timer);
    const n = this.nodes;
    this.nodes = null;
    if (!n || !S.ctx) return;
    const t = S.ctx.currentTime;
    n.out.gain.cancelScheduledValues(t);
    n.out.gain.setValueAtTime(Math.max(0.0001, n.out.gain.value), t);
    n.out.gain.exponentialRampToValueAtTime(0.0001, t + fade);
    n.oscs.forEach((o) => o.stop(t + fade + 0.05));
  },
};
export { SHIMMER };

// ---------- slots: what plays where, with candidates ----------
// Options: [value, label]. 'code' or 'code:name' is a sound made in code;
// 'layer:a+b' plays two together. `where` says where you hear it.
const C = (name) => SYN[name];
export const SLOTS = [
  { id: 'land', group: 'fx', label: 'Chest lands', where: 'The chest landing on the reward stage (27)', gain: 1, opts: [['chest-land-a', 'Heavy wood (Kenney)'], ['chest-land-b', 'Plank (Kenney)'], ['chest-land-c', 'Soft thump (Kenney)'], ['code:thud', 'Made in code']], pick: 'chest-land-a' },
  { id: 'crack', group: 'fx', label: 'Tap on the chest', where: 'Each tap before the chest opens (29)', gain: 0.8, opts: [['chest-tap-b', 'Metal latch (Kenney)'], ['chest-tap-a', 'Wood knock (Kenney)'], ['code:tock', 'Made in code']], pick: 'chest-tap-b' },
  { id: 'burst', group: 'fx', label: 'Lid bursts open', where: 'The last tap, as the lid flies open (29)', gain: 0.9, opts: [['layer:chest-open-b+bloom', 'Creak with a bright bloom'], ['chest-open-b', 'Creak (Kenney)'], ['code:bloom', 'Bright bloom, made in code']], pick: 'layer:chest-open-b+bloom' },
  { id: 'whoosh', group: 'fx', label: 'Medal flies out', where: 'The medal leaving the chest (30)', gain: 0.6, opts: [['code:swirl', 'Rising swirl, made in code'], ['whoosh-b', 'Card out (Kenney)'], ['whoosh-air', 'Air move (Almitory)']], pick: 'code:swirl' },
  { id: 'reveal', group: 'fx', label: 'Badge appears', where: 'The medal flipping to its face (30); tuned to the chest music', gain: 0.9, tuned: true, opts: [['code:bells', 'Rising bells, made in code'], ['reveal-hit', 'Hit jingle (Kenney)'], ['reveal-pickup', 'Item pickup (Joth)'], ['reveal-upper', 'Upper (wobbleboxx)']], pick: 'code:bells' },
  { id: 'sparkle', group: 'fx', label: 'Ribbon unrolls', where: 'The tier ribbon unrolling on each reward card', gain: 0.5, tuned: true, opts: [['sparkle-a', 'Gem (rubberduck)'], ['sparkle-c', 'Harp (Spring Spring)'], ['code:sparkle', 'Made in code']], pick: 'sparkle-a' },
  { id: 'coins', group: 'fx', label: 'Coin shower', where: 'Training day reached (19), coins raining down', gain: 0.55, opts: [['coins-c', 'Sack of gold (Amarikah)'], ['coins-a', 'Coins in hand (Kenney)'], ['coins-b', 'Coins (rubberduck)']], pick: 'coins-c' },
  { id: 'shatter', group: 'fx', label: 'Shield shatters', where: 'The old rank shield breaking (33)', gain: 0.8, opts: [['shatter-glass', 'Glass break (TinyWorlds)'], ['shatter-rd', 'Glass breaking (rubberduck)'], ['shatter-ice', 'Ice shatter (IgnasD)'], ['code:shatter', 'Made in code']], pick: 'shatter-glass' },
  { id: 'tier', group: 'fx', label: 'Tier up', where: 'A medal turning into its next tier (31)', gain: 0.8, tuned: true, opts: [['code:shimmer', 'Climbing shimmer, made in code'], ['riser-a', 'Rise (wobbleboxx)'], ['riser-b', 'Rise 2 (wobbleboxx)']], pick: 'code:shimmer' },
  { id: 'riser', group: 'fx', label: 'Build-up', where: 'Before a 3-tap chest bursts, and after Finish before Victory (20)', gain: 0.7, opts: [['code', 'Made in code, any length'], ['riser-a', 'Rise (wobbleboxx)']], pick: 'code', code: () => SYN.riser(0.9) },
  { id: 'chime', group: 'fx', label: 'Good news', where: 'The Saved toast (11)', gain: 0.45, opts: [['code', 'Made in code'], ['chime-a', 'Confirm (Kenney)']], pick: 'code', code: C('chime') },
  { id: 'done', group: 'fx', label: 'Exercise complete', where: 'The last set of an exercise (15)', gain: 0.45, opts: [['code:two', 'Two rising bells, made in code'], ['code:marimba', 'Marimba run, made in code'], ['done-pizzi', 'Pizzicato (Kenney)'], ['done-steel', 'Steel drum (Kenney)']], pick: 'code:two' },
  { id: 'beat', group: 'fx', label: 'Beat last time', where: 'A set better than last time (16)', gain: 0.6, opts: [['code:brass', 'Brass lift, made in code'], ['beat-pizzi', 'Pizzicato run (Kenney)'], ['beat-steel', 'Steel drum (Kenney)']], pick: 'code:brass' },
  { id: 'record', group: 'fx', label: 'New record', where: 'A personal record (17)', gain: 0.55, opts: [['record-a', 'Pizzicato jingle (Kenney)'], ['record-b', 'Hit jingle (Kenney)'], ['code:fanfare', 'Made in code']], pick: 'record-a' },
  { id: 'goal', group: 'fx', label: 'Weekly goal met', where: 'This week reaching its goal (26)', gain: 0.6, opts: [['code:seal', 'Seal and chord, made in code'], ['goal-steel', 'Steel drum (Kenney)'], ['done-pizzi', 'Pizzicato (Kenney)']], pick: 'code:seal' },
  { id: 'error', group: 'ui', label: 'Something went wrong', where: 'The Could not save toast (11)', gain: 0.6, opts: [['error-a', 'Error (Kenney)'], ['code:low', 'Low note, made in code']], pick: 'error-a' },
  { id: 'tap', group: 'ui', label: 'Green button', where: 'Every green button (1)', gain: 1, opts: [['code:pop', 'Soft pop, made in code'], ['tap-a', 'Click (Kenney)'], ['tap-b', 'Click 2 (Kenney)'], ['tap-c', 'Pluck (Kenney)']], pick: 'code:pop' },
  { id: 'tock', group: 'ui', label: 'Gold button', where: 'Every gold button (2)', gain: 1, opts: [['code:tock', 'Wood tock, made in code'], ['tock-a', 'Light wood (Kenney)']], pick: 'code:tock' },
  { id: 'tick', group: 'ui', label: 'Tabs and segments', where: 'Tabs, segments, the page change (3, 4, 12)', gain: 0.8, opts: [['code:tick', 'Tick, made in code'], ['tick-a', 'Tick (Kenney)'], ['tick-b', 'Select (Kenney)']], pick: 'code:tick' },
  { id: 'switch', group: 'ui', label: 'Switch', where: 'Settings switches (5)', gain: 1, opts: [['code', 'Two notes, made in code'], ['switch-a', 'Switch (Kenney)'], ['switch-b', 'Toggle (Kenney)']], pick: 'code' },
  { id: 'chip', group: 'ui', label: 'Chip', where: 'Chips and filters (6)', gain: 1, opts: [['code', 'Pip, made in code'], ['chip-a', 'Chip (Kenney)']], pick: 'code', code: () => SYN.pip(1) },
  { id: 'close', group: 'ui', label: 'Back and close', where: 'Back arrows, close buttons, a sheet or modal closing (8, 9, 10)', gain: 1, opts: [['code:puff', 'Soft puff, made in code'], ['code:tuck', 'Low tuck, made in code'], ['code:paper', 'Paper, made in code'], ['close-k', 'Close, softened (Kenney)']], pick: 'code:puff' },
  { id: 'open', group: 'ui', label: 'Sheet opens', where: 'A bottom sheet rising (9)', gain: 1, opts: [['code:lift', 'Soft lift, made in code'], ['code:modal', 'Pip and lift (the modal sound you liked)'], ['open-k', 'Open, softened (Kenney)']], pick: 'code:lift' },
  { id: 'modal', group: 'ui', label: 'Game modal opens', where: 'A game modal popping in (10)', gain: 1, opts: [['code:modal', 'Pip and lift, made in code'], ['code:lift', 'Soft lift, made in code']], pick: 'code:modal' },
  { id: 'lap', group: 'ui', label: 'Lap', where: 'The Lap button (18)', gain: 0.55, opts: [['lap-a', 'Metal click (Kenney)'], ['code:tick', 'Made in code']], pick: 'lap-a' },
];

export const MUSIC = [
  {
    id: 'm-chest',
    label: 'Chest opening (loops while it opens)',
    loop: true,
    gain: 0.75,
    groups: [
      ['Bright game-pop', [['m-chest-pop-a', 'Cool City (MintoDog)'], ['m-chest-pop-b', 'Sci-fi Puzzle Clear (MintoDog)'], ['m-chest-pop-c', 'Racing Result, best (MintoDog)']]],
      ['Cinematic build', [['m-chest-cin-a', 'Cinematic percussion (Marwan Antonios)'], ['m-chest-cin-b', 'A Legend Will Rise (CodeManu)'], ['m-chest-cin-c', 'Battle Theme A (cynicmusic)']]],
      ['Upbeat workout electronic', [['m-chest-fit-a', 'Synth Wave Aerobics (Pro Sensory)'], ['m-chest-fit-b', 'Fever Stadium, climax (MintoDog)'], ['m-chest-fit-c', 'City Loop (wipics)']]],
      ['Shimmer, no melody', [['code:shimmer', 'Shimmer that lifts with each tap, made in code']]],
      ['None', [['off', 'No music']]],
    ],
    pick: 'm-chest-pop-a',
  },
  { id: 'm-level', label: 'Level up', gain: 0.85, groups: [['', [['m-level-joth', 'Level Up (Joth)'], ['m-level-success', 'Success stinger (SterlingRay)'], ['m-level-win', 'Win sound (Listener)'], ['m-level-rise', 'Rise (wobbleboxx)'], ['code:fanfare', 'Brass fanfare, made in code']]]], pick: 'm-level-joth' },
  { id: 'm-rank', label: 'Rank up (now 4 s)', gain: 0.85, groups: [['', [['m-rank-a', 'Victory fanfare (cynicmusic)'], ['m-rank-b', '1-Ton fanfare (Zane Little)'], ['m-rank-c', 'Triumphant (Emma_MA)']]]], pick: 'm-rank-a' },
];
for (const m of MUSIC) m.opts = m.groups.flatMap(([, o]) => o);

// The current picks, remembered on this device only. Round 2 starts fresh.
const KEY = 'levl-b12-picks-r2';
export const PICK = { 'm-victory': 'm-victory-a' };
for (const s of [...SLOTS, ...MUSIC]) PICK[s.id] = s.pick;
try {
  Object.assign(PICK, JSON.parse(localStorage.getItem(KEY) || '{}'));
} catch {}
export function setPick(id, v) {
  PICK[id] = v;
  try {
    localStorage.setItem(KEY, JSON.stringify(PICK));
  } catch {}
}

const slotById = Object.fromEntries(SLOTS.map((s) => [s.id, s]));
const musicById = Object.fromEntries(MUSIC.map((s) => [s.id, s]));

// semitones from a file's key to the music's key, kept within a tritone
function shift(id) {
  const from = FILE_KEY[id];
  if (!from) return 1;
  let d = ((NOTE[S.key] - NOTE[from]) % 12 + 12) % 12;
  if (d > 6) d -= 12;
  return 2 ** (d / 12);
}

function playValue(s, value, opts) {
  if (value.startsWith('layer:')) {
    value
      .slice(6)
      .split('+')
      .forEach((v) => playValue(s, SYN[v] ? 'code:' + v : v, opts));
    return;
  }
  if (value === 'code') {
    if (s.id === 'switch') return opts.on === false ? SYN.switchOff() : SYN.switchOn();
    return s.code?.();
  }
  if (value.startsWith('code:')) return SYN[value.slice(5)]?.();
  S.file(value, { bus: s.group, gain: (s.gain ?? 1) * (opts.gain ?? 1), rate: (opts.rate ?? 1) * (s.tuned ? shift(value) : 1) });
}

// Plays a slot with its current pick (or a given option).
export function play(id, opts = {}, value = PICK[id]) {
  const s = slotById[id];
  if (!s || !value) return;
  playValue(s, value, opts);
}

// The reward key follows the chest music.
export function setRewardKey() {
  S.key = MUSIC_KEY[PICK['m-chest']] || 'C';
}

export function music(id, value = PICK[id]) {
  const m = musicById[id];
  if (id === 'm-victory') return S.playMusic(value, { gain: 0.85 });
  if (!m) return;
  if (value === 'code:fanfare') return SYN.fanfare();
  S.playMusic(value, { loop: Boolean(m.loop), gain: m.gain ?? 1 });
}

// Warm the files a demo is about to need.
export function preload(ids) {
  ids.forEach((id) => {
    const v = PICK[id];
    if (!v) return;
    v.replace(/^layer:/, '')
      .split('+')
      .forEach((x) => {
        if (!x.startsWith('code') && x !== 'off' && !SYN[x]) S.load(x);
      });
  });
}

// ---------- haptics ----------
// Android vibrates; iPhone browsers have no web vibration at all, so the board
// also shows a small pulse where the haptic would land.
export const HAPTIC = { light: 8, medium: 14, heavy: 24, success: [10, 40, 18], reward: [12, 30, 12, 30, 28], error: [30, 40, 30] };
export function buzz(kind, el) {
  if (!S.haptics) return;
  try {
    navigator.vibrate?.(HAPTIC[kind]);
  } catch {}
  const card = el?.closest?.('[data-card]') || el;
  const dot = card?.querySelector?.('.hpt');
  if (dot) {
    dot.classList.remove('go');
    void dot.offsetWidth;
    dot.dataset.kind = kind;
    dot.classList.add('go');
  }
}
