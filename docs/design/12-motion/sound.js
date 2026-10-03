// Board 12: the sound library. Three buses (taps, effects, music) into one
// limiter. Rich moments play recorded CC0 files; tiny taps are made in code so
// they cost nothing to load. Every slot lists its candidates so you can swap.
const BASE = '12-motion/sounds/';

// Bus levels: taps sit well under effects; music sits under both.
export const BUS = { ui: 0.32, fx: 0.85, music: 0.5 };

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

  ensure() {
    if (!this.ctx) {
      // Mix with the person's own music instead of stopping it (Safari 16.4 and later).
      try {
        if (navigator.audioSession) navigator.audioSession.type = 'ambient';
      } catch {}
      const C = window.AudioContext || window.webkitAudioContext;
      if (!C) return null;
      this.ctx = new C();
      const lim = this.ctx.createDynamicsCompressor();
      lim.threshold.value = -8;
      lim.ratio.value = 8;
      lim.attack.value = 0.003;
      lim.release.value = 0.15;
      this.out = this.ctx.createGain();
      this.out.gain.value = 0.9;
      this.out.connect(lim).connect(this.ctx.destination);
      for (const b of Object.keys(BUS)) {
        const g = this.ctx.createGain();
        g.gain.value = BUS[b];
        g.connect(this.out);
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
    s.playbackRate.value = rate;
    const g = c.createGain();
    g.gain.value = gain;
    s.connect(g).connect(this.bus[bus]);
    s.start(c.currentTime + at);
    return s;
  },

  osc(type, f0, f1, dur, { g = 0.3, bus = 'ui', at = 0, att = 0.004 } = {}) {
    if (!this.on) return;
    const c = this.ensure();
    if (!c) return;
    const t = c.currentTime + at;
    const o = c.createOscillator();
    o.type = type;
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

  // Music: one track at a time, faded in and out, loops when asked.
  playMusic(id, { loop = false, gain = 1, fade = 0.25 } = {}) {
    this.stopMusic(0.2);
    if (!this.on || !this.music || !id || id === 'off') return;
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

// ---------- the sounds made in code ----------
const pent = [523.25, 587.33, 659.25, 783.99, 880, 1046.5, 1174.66, 1318.5, 1567.98, 1760, 2093];
export const SYN = {
  pop: () => {
    S.osc('sine', 420, 660, 0.09, { g: 0.4 });
    S.noise(0.02, { f0: 3200, q: 2, g: 0.05 });
  },
  tock: () => {
    S.osc('triangle', 320, 230, 0.08, { g: 0.45 });
    S.noise(0.035, { f0: 1700, q: 3, g: 0.16 });
  },
  tick: () => S.osc('square', 2300, null, 0.016, { g: 0.07 }),
  pip: (p = 1) => S.osc('sine', 1150 * p, 1450 * p, 0.05, { g: 0.22 }),
  switchOn: () => {
    S.osc('triangle', 700, null, 0.03, { g: 0.25 });
    S.osc('triangle', 1100, null, 0.035, { g: 0.25, at: 0.05 });
  },
  switchOff: () => {
    S.osc('triangle', 1000, null, 0.03, { g: 0.22 });
    S.osc('triangle', 640, null, 0.035, { g: 0.22, at: 0.05 });
  },
  swish: () => S.noise(0.16, { f0: 2600, f1: 500, q: 1.2, g: 0.16 }),
  swishUp: () => S.noise(0.2, { f0: 500, f1: 2800, q: 1.2, g: 0.14 }),
  chime: () => {
    S.osc('sine', 1318.5, null, 0.5, { g: 0.16, bus: 'fx' });
    S.osc('sine', 1975.5, null, 0.6, { g: 0.12, at: 0.07, bus: 'fx' });
  },
  low: () => S.osc('triangle', 330, 247, 0.22, { g: 0.28 }),
  // the set tick: two semitones higher for every set in a row
  set: (n = 0) => {
    const f = 523.25 * 2 ** ((Math.min(n, 12) * 2) / 12);
    S.osc('sine', f, f * 1.5, 0.12, { g: 0.32 });
    S.osc('triangle', f * 2, null, 0.08, { g: 0.08, at: 0.02 });
    S.noise(0.02, { f0: 4000, q: 2, g: 0.04 });
  },
  untick: () => S.osc('sine', 500, 360, 0.1, { g: 0.18 }),
  coin: (p = 1) => {
    S.osc('sine', 1975 * p, null, 0.14, { g: 0.12, bus: 'fx' });
    S.osc('sine', 2637 * p, null, 0.2, { g: 0.09, at: 0.04, bus: 'fx' });
  },
  clink: (p = 1) => {
    S.osc('sine', 2800 * p, 3200 * p, 0.12, { g: 0.12, bus: 'fx' });
    S.noise(0.03, { f0: 6000, q: 3, g: 0.08, bus: 'fx' });
  },
  riser: (dur = 1) => {
    S.osc('sawtooth', 140, 880, dur, { g: 0.07, att: dur * 0.9, bus: 'fx' });
    S.noise(dur, { type: 'highpass', f0: 400, f1: 6000, g: 0.12, att: dur * 0.9, bus: 'fx' });
  },
  drumroll: (dur = 1.2) => {
    for (let t = 0; t < dur; t += 0.045) S.noise(0.05, { at: t, f0: 900, q: 0.8, g: 0.04 + (t / dur) * 0.18, bus: 'fx' });
  },
  thud: () => {
    S.osc('sine', 120, 48, 0.28, { g: 0.7, bus: 'fx' });
    S.noise(0.1, { type: 'lowpass', f0: 500, g: 0.3, bus: 'fx' });
  },
  whoosh: () => S.noise(0.32, { f0: 400, f1: 3200, q: 0.9, g: 0.2, bus: 'fx' }),
  sparkle: () => {
    for (let i = 0; i < 6; i++) S.osc('sine', pent[5 + ((i * 3) % 6)], null, 0.18, { g: 0.07, at: i * 0.045, bus: 'fx' });
  },
  stab: () => {
    for (const f of [261.6, 329.6, 392]) S.osc('sawtooth', f, f * 1.01, 0.28, { g: 0.07, bus: 'fx' });
  },
  fanfare: () => {
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => S.osc('triangle', f, null, i === 3 ? 0.5 : 0.14, { g: 0.18, at: i * 0.1, bus: 'fx' }));
  },
  stamp: () => {
    S.osc('sine', 170, 60, 0.2, { g: 0.6, bus: 'fx' });
    S.noise(0.06, { f0: 900, q: 1, g: 0.25, bus: 'fx' });
  },
  shatter: () => {
    for (let i = 0; i < 7; i++) S.osc('sine', 2500 + Math.random() * 3000, null, 0.12, { g: 0.06, at: i * 0.02, bus: 'fx' });
    S.noise(0.25, { type: 'highpass', f0: 3000, g: 0.25, bus: 'fx' });
  },
  face: (i) => {
    const f = [392, 440, 523.25, 587.33, 659.25][i];
    S.osc('sine', f, f * 1.02, 0.22, { g: 0.26 });
    S.osc('sine', f * 2, null, 0.12, { g: 0.06, at: 0.01 });
  },
  flip: (i = 0) => {
    S.noise(0.04, { f0: 2400, q: 1.5, g: 0.1 });
    S.osc('sine', pent[i % pent.length], null, 0.12, { g: 0.1, at: 0.02 });
  },
  roll: (p = 1) => S.osc('square', 1800 * p, null, 0.012, { g: 0.05 }),
};

// ---------- slots: what plays where, with candidates ----------
// Each option: [value, label]. 'code' means the sound made in code above.
export const SLOTS = [
  { id: 'land', group: 'fx', label: 'Chest lands', code: SYN.thud, opts: [['chest-land-a', 'Heavy wood (Kenney)'], ['chest-land-b', 'Plank (Kenney)'], ['chest-land-c', 'Soft thump (Kenney)'], ['code', 'Made in code']], pick: 'chest-land-a' },
  { id: 'crack', group: 'fx', label: 'Tap on the chest', code: SYN.tock, opts: [['chest-tap-b', 'Metal latch (Kenney)'], ['chest-tap-a', 'Wood knock (Kenney)'], ['chest-tap-c', 'Lock (rubberduck)'], ['code', 'Made in code']], pick: 'chest-tap-b' },
  { id: 'burst', group: 'fx', label: 'Lid bursts open', code: SYN.thud, opts: [['chest-open-a', 'Chest opens (Oiboo)'], ['chest-open-b', 'Creak (Kenney)'], ['chest-open-c', 'Pack opens (Kenney)']], pick: 'chest-open-a' },
  { id: 'whoosh', group: 'fx', label: 'Medal flies out', code: SYN.whoosh, opts: [['whoosh-a', 'Card slide (Kenney)'], ['whoosh-b', 'Card out (Kenney)'], ['code', 'Made in code']], pick: 'whoosh-a' },
  { id: 'stamp', group: 'fx', label: 'Medal lands', code: SYN.stamp, opts: [['stamp-b', 'Bell (Kenney)'], ['stamp-a', 'Metal hit (Kenney)'], ['stamp-c', 'Plate (Kenney)'], ['code', 'Made in code']], pick: 'stamp-b' },
  { id: 'sparkle', group: 'fx', label: 'Sparkle', code: SYN.sparkle, opts: [['sparkle-a', 'Gem (rubberduck)'], ['sparkle-b', 'Glass (Kenney)'], ['sparkle-c', 'Harp (Spring Spring)'], ['code', 'Made in code']], pick: 'sparkle-a' },
  { id: 'coins', group: 'fx', label: 'Coin shower', code: () => SYN.coin(1), opts: [['coins-a', 'Coins in hand (Kenney)'], ['coins-b', 'Coins (rubberduck)'], ['coins-c', 'Sack of gold (Amarikah)']], pick: 'coins-a' },
  { id: 'shatter', group: 'fx', label: 'Shield or medal shatters', code: SYN.shatter, opts: [['shatter-a', 'Glass (Kenney)'], ['shatter-b', 'Glass, longer (Kenney)'], ['code', 'Made in code']], pick: 'shatter-a' },
  { id: 'chime', group: 'fx', label: 'Good news', code: SYN.chime, opts: [['chime-a', 'Confirm (Kenney)'], ['chime-b', 'Glass chime (Kenney)'], ['chime-c', 'Rise (Kenney)'], ['code', 'Made in code']], pick: 'chime-a' },
  { id: 'error', group: 'ui', label: 'Something went wrong', code: SYN.low, opts: [['code', 'Low note, made in code'], ['error-a', 'Error (Kenney)']], pick: 'code' },
  { id: 'stab', group: 'fx', label: 'Beat last time', code: SYN.stab, opts: [['stab-a', 'Hit jingle (Kenney)'], ['stab-b', 'Pizzicato (Kenney)'], ['code', 'Brass, made in code']], pick: 'stab-a' },
  { id: 'record', group: 'fx', label: 'New record', code: SYN.fanfare, opts: [['record-a', 'Pizzicato jingle (Kenney)'], ['record-b', 'Hit jingle (Kenney)'], ['code', 'Made in code']], pick: 'record-a' },
  { id: 'riser', group: 'fx', label: 'Build-up before a big reveal', code: () => SYN.riser(1), opts: [['code', 'Made in code, any length'], ['riser-a', 'Rise (wobbleboxx)'], ['riser-b', 'Long rise (wobbleboxx)']], pick: 'code' },
  { id: 'tap', group: 'ui', label: 'Green button', code: SYN.pop, opts: [['code', 'Soft pop, made in code'], ['tap-a', 'Click (Kenney)'], ['tap-b', 'Click 2 (Kenney)'], ['tap-c', 'Pluck (Kenney)']], pick: 'code' },
  { id: 'tock', group: 'ui', label: 'Gold button', code: SYN.tock, opts: [['code', 'Wood tock, made in code'], ['tock-a', 'Light wood (Kenney)']], pick: 'code' },
  { id: 'tick', group: 'ui', label: 'Tabs and segments', code: SYN.tick, opts: [['code', 'Tick, made in code'], ['tick-a', 'Tick (Kenney)'], ['tick-b', 'Select (Kenney)']], pick: 'code' },
  { id: 'switch', group: 'ui', label: 'Switch', code: null, opts: [['code', 'Two notes, made in code'], ['switch-a', 'Switch (Kenney)'], ['switch-b', 'Toggle (Kenney)']], pick: 'code' },
  { id: 'chip', group: 'ui', label: 'Chip', code: () => SYN.pip(1), opts: [['code', 'Pip, made in code'], ['chip-a', 'Chip (Kenney)']], pick: 'code' },
  { id: 'back', group: 'ui', label: 'Back and close', code: SYN.swish, opts: [['code', 'Swish, made in code'], ['back-a', 'Back (Kenney)'], ['back-b', 'Minimise (Kenney)']], pick: 'code' },
  { id: 'sheet', group: 'ui', label: 'Sheet opens', code: SYN.swishUp, opts: [['code', 'Paper swish, made in code'], ['sheet-a', 'Maximise (Kenney)']], pick: 'code' },
  { id: 'lap', group: 'ui', label: 'Lap', code: SYN.tick, opts: [['lap-a', 'Metal click (Kenney)'], ['code', 'Made in code']], pick: 'lap-a' },
];

export const MUSIC = [
  { id: 'm-chest', label: 'Chest opening (loops while it opens)', opts: [['m-chest-a', 'Medieval fair loop (Woli34)'], ['m-chest-b', 'Medieval market day (RandomMind)'], ['m-chest-c', 'Treasure hunter (TAD)'], ['off', 'No music']], pick: 'm-chest-a', loop: true, gain: 0.8 },
  { id: 'm-level', label: 'Level up', opts: [['m-level-a', 'Trumpet fanfare (gchoc)'], ['m-level-b', 'Trop la win (Komiku)'], ['m-level-c', 'Happy tuba fanfare (Trex0n)'], ['off', 'No music']], pick: 'm-level-a' },
  { id: 'm-rank', label: 'Rank up', opts: [['m-rank-a', 'Victory fanfare short (cynicmusic)'], ['m-rank-b', '1-Ton fanfare (Zane Little)'], ['m-rank-c', 'Triumphant (Emma_MA)'], ['off', 'No music']], pick: 'm-rank-a' },
  { id: 'm-victory', label: 'Victory', opts: [['m-victory-a', 'Medieval victory theme (RandomMind)'], ['m-victory-b', 'Victory (Umplix)'], ['m-victory-c', 'Achievement awarded (SkyleTheFrench)'], ['off', 'No music']], pick: 'm-victory-a' },
];

// The current picks, remembered on this device only.
const KEY = 'levl-b12-picks';
export const PICK = {};
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

// Plays a slot with its current pick (or a given option).
export function play(id, opts = {}, value = PICK[id]) {
  const s = slotById[id];
  if (!s) return;
  if (value === 'code') {
    if (id === 'switch') return opts.on === false ? SYN.switchOff() : SYN.switchOn();
    return s.code?.();
  }
  S.file(value, { bus: s.group, ...opts });
}

export function music(id, value = PICK[id]) {
  const m = musicById[id];
  if (!m) return;
  S.playMusic(value, { loop: Boolean(m.loop), gain: m.gain ?? 1 });
}

// Warm the files a demo is about to need.
export function preload(ids) {
  ids.forEach((id) => {
    const v = PICK[id];
    if (v && v !== 'code' && v !== 'off') S.load(v);
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
