// The sound engine (board 12). Three buses (taps, effects, music) and a small
// reverb into one limiter, mixed with the person's own audio on iPhone. Rich
// moments play recorded CC0 files from /sounds; small ones are made in code.
// Reward sounds play in one key (C, because the chest has no music), so they
// never clash with the music cues.
//
// Client safe: nothing touches window or AudioContext at import time except a
// one-time gesture listener, and every call is a silent no-op on the server, in
// a browser without Web Audio, or before the first tap. Files load after that
// first tap. Sounds off is silence for everything; Music off is no music.

export type Prefs = { sound: boolean; vibrate: boolean; music: boolean };

// ---------- prefs: this device only ----------
export const PREFS_KEY = 'wt:prefs';

let prefs: Prefs = { sound: true, vibrate: true, music: true };
let loadedPrefs = false;

function loadPrefs(): Prefs {
  if (loadedPrefs) return prefs;
  loadedPrefs = true;
  try {
    const raw = typeof window !== 'undefined' ? window.localStorage.getItem(PREFS_KEY) : null;
    if (raw) {
      const parsed = JSON.parse(raw);
      prefs = { sound: parsed.sound !== false, vibrate: parsed.vibrate !== false, music: parsed.music !== false };
    }
  } catch {
    // ignore storage errors, keep defaults
  }
  return prefs;
}

function savePrefs() {
  try {
    window.localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  } catch {
    // ignore storage errors
  }
}

export function getPrefs(): Prefs {
  return { ...loadPrefs() };
}

export function setSoundEnabled(on: boolean) {
  loadPrefs();
  prefs.sound = on;
  savePrefs();
  if (!on) stopMusic(0.1);
}

export function setVibrateEnabled(on: boolean) {
  loadPrefs();
  prefs.vibrate = on;
  savePrefs();
}

export function setMusicEnabled(on: boolean) {
  loadPrefs();
  prefs.music = on;
  savePrefs();
  if (!on) stopMusic(0.1);
}

// ---------- the table ----------
export type Group = 'ui' | 'fx';

export const BUS = { ui: 0.5, fx: 0.9, music: 0.5 } as const;
const SEND = { ui: 0.05, fx: 0.2, music: 0 } as const;

const NOTE: Record<string, number> = { C: 0, 'C#': 1, D: 2, 'D#': 3, E: 4, F: 5, 'F#': 6, G: 7, 'G#': 8, A: 9, 'A#': 10, B: 11 };
const MAJOR = [0, 2, 4, 5, 7, 9, 11];

/** The key reward sounds are played in. The chest has no music, so it is C. */
export const REWARD_KEY = 'C';
/** The key of each recorded effect that is tuned to the reward key. */
const FILE_KEY: Record<string, string> = { 'sparkle-a': 'D' };

export type Slot = {
  id: string;
  group: Group;
  /** A file id, `code:name`, or `layer:a+b` to play two together. */
  value: string;
  gain: number;
  /** Recorded and pitched to the reward key. */
  tuned?: boolean;
};

// The signed-off pick for every slot (docs/V13_PLAN.md, "Sound and music").
export const SLOTS: Slot[] = [
  { id: 'land', group: 'fx', value: 'chest-land-a', gain: 1 },
  { id: 'crack', group: 'fx', value: 'chest-tap-b', gain: 0.8 },
  { id: 'burst', group: 'fx', value: 'layer:chest-open-b+bloom', gain: 0.9 },
  { id: 'whoosh', group: 'fx', value: 'whoosh-air', gain: 0.6 },
  { id: 'reveal', group: 'fx', value: 'code:bells', gain: 0.9, tuned: true },
  { id: 'sparkle', group: 'fx', value: 'sparkle-a', gain: 0.5, tuned: true },
  { id: 'coins', group: 'fx', value: 'coins-c', gain: 0.55 },
  { id: 'shatter', group: 'fx', value: 'shatter-glass', gain: 0.8 },
  { id: 'tier', group: 'fx', value: 'code:shimmer', gain: 0.8, tuned: true },
  { id: 'riser', group: 'fx', value: 'code:riser', gain: 0.7 },
  { id: 'chime', group: 'fx', value: 'code:chime', gain: 0.45 },
  { id: 'done', group: 'fx', value: 'code:marimba', gain: 0.45 },
  { id: 'beat', group: 'fx', value: 'code:brass', gain: 0.6 },
  { id: 'record', group: 'fx', value: 'code:fanfare', gain: 0.55 },
  { id: 'goal', group: 'fx', value: 'code:seal', gain: 0.6 },
  { id: 'error', group: 'ui', value: 'error-a', gain: 0.6 },
  { id: 'tap', group: 'ui', value: 'code:pop', gain: 1 },
  { id: 'tock', group: 'ui', value: 'code:tock', gain: 1 },
  { id: 'tick', group: 'ui', value: 'code:tick', gain: 0.8 },
  { id: 'switch', group: 'ui', value: 'code:switch', gain: 1 },
  { id: 'chip', group: 'ui', value: 'code:pip', gain: 1 },
  { id: 'close', group: 'ui', value: 'code:puff', gain: 1 },
  { id: 'open', group: 'ui', value: 'code:lift', gain: 1 },
  { id: 'modal', group: 'ui', value: 'code:modal', gain: 1 },
  { id: 'lap', group: 'ui', value: 'lap-a', gain: 0.55 },
];

export type MusicTrack = { id: string; file: string; gain: number; loop?: boolean };
// Chest opening has no music (the user's choice), so it is not here.
export const MUSIC: MusicTrack[] = [
  { id: 'level', file: 'm-level-joth', gain: 0.85 },
  { id: 'rank', file: 'm-rank-c', gain: 0.85 },
  { id: 'victory', file: 'm-victory-a', gain: 0.85 },
];

const slotById = new Map(SLOTS.map((s) => [s.id, s]));
const musicById = new Map(MUSIC.map((m) => [m.id, m]));

/** Every recorded file the table can play, without the extension. */
export function recordedFiles(): string[] {
  const out = new Set<string>();
  for (const s of SLOTS) {
    for (const v of s.value.replace(/^layer:/, '').split('+')) {
      if (!v.startsWith('code:') && !SYN_NAMES.has(v)) out.add(v);
    }
  }
  for (const m of MUSIC) out.add(m.file);
  return [...out];
}

// ---------- the engine ----------
type CtxWindow = Window & { webkitAudioContext?: typeof AudioContext };
type Buses = { ui: GainNode; fx: GainNode; music: GainNode };
type OscOpts = { g?: number; bus?: keyof Buses; at?: number; att?: number; detune?: number };
type NoiseOpts = { g?: number; bus?: keyof Buses; at?: number; type?: BiquadFilterType; f0?: number; f1?: number | null; q?: number; att?: number };

let unlocked = false;
let ctx: AudioContext | null = null;
let bus: Buses | null = null;
let noiseBuf: AudioBuffer | null = null;
let current: { s: AudioBufferSourceNode; g: GainNode } | null = null;
const buffers = new Map<string, AudioBuffer>();
const pending = new Map<string, Promise<AudioBuffer | null>>();

function canSound(): boolean {
  return typeof window !== 'undefined' && unlocked && loadPrefs().sound;
}

function ensure(): AudioContext | null {
  if (!canSound()) return null;
  try {
    if (!ctx) {
      // Mix with the person's own music instead of stopping it (Safari 16.4 and later).
      try {
        const nav = navigator as Navigator & { audioSession?: { type: string } };
        if (nav.audioSession) nav.audioSession.type = 'ambient';
      } catch {
        // ignore
      }
      const Ctor = window.AudioContext || (window as CtxWindow).webkitAudioContext;
      if (!Ctor) return null;
      const c = new Ctor();
      const lim = c.createDynamicsCompressor();
      lim.threshold.value = -8;
      lim.ratio.value = 8;
      lim.attack.value = 0.003;
      lim.release.value = 0.15;
      const out = c.createGain();
      out.gain.value = 0.85;
      out.connect(lim).connect(c.destination);
      // A short bright room: 1.6 s of decaying noise.
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
      rev.connect(wet).connect(out);
      const made = {} as Buses;
      (Object.keys(BUS) as (keyof Buses)[]).forEach((b) => {
        const g = c.createGain();
        g.gain.value = BUS[b];
        g.connect(out);
        const s = c.createGain();
        s.gain.value = SEND[b];
        g.connect(s).connect(rev);
        made[b] = g;
      });
      ctx = c;
      bus = made;
    }
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    return ctx;
  } catch {
    return null;
  }
}

function load(id: string): Promise<AudioBuffer | null> {
  const have = buffers.get(id);
  if (have) return Promise.resolve(have);
  const wait = pending.get(id);
  if (wait) return wait;
  const c = ensure();
  if (!c) return Promise.resolve(null);
  const p = fetch(`/sounds/${id}.mp3`)
    .then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error('missing'))))
    .then((a) => new Promise<AudioBuffer>((ok, no) => c.decodeAudioData(a, ok, no)))
    .then((b) => {
      buffers.set(id, b);
      return b;
    })
    .catch(() => {
      pending.delete(id);
      return null;
    });
  pending.set(id, p);
  return p;
}

function file(id: string, { group = 'fx', gain = 1, rate = 1 }: { group?: Group; gain?: number; rate?: number } = {}) {
  const c = ensure();
  if (!c || !bus) return;
  const b = buffers.get(id);
  if (!b) {
    // Not loaded yet: play it late only if it arrives quickly enough to still fit the moment.
    const t = performance.now();
    void load(id).then((got) => got && performance.now() - t < 400 && file(id, { group, gain, rate }));
    return;
  }
  const s = c.createBufferSource();
  s.buffer = b;
  s.playbackRate.value = rate;
  const g = c.createGain();
  g.gain.value = gain;
  s.connect(g).connect(bus[group]);
  s.start();
}

function osc(type: OscillatorType, f0: number, f1: number | null, dur: number, { g = 0.3, bus: to = 'ui', at = 0, att = 0.004, detune = 0 }: OscOpts = {}) {
  const c = ensure();
  if (!c || !bus) return;
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
  o.connect(gn).connect(bus[to]);
  o.start(t);
  o.stop(t + dur + 0.03);
}

function noise(dur: number, { g = 0.2, bus: to = 'ui', at = 0, type = 'bandpass', f0 = 1000, f1 = null, q = 1, att = 0.004 }: NoiseOpts = {}) {
  const c = ensure();
  if (!c || !bus) return;
  if (!noiseBuf) {
    noiseBuf = c.createBuffer(1, c.sampleRate, c.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  const t = c.currentTime + at;
  const s = c.createBufferSource();
  s.buffer = noiseBuf;
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
  s.connect(f).connect(gn).connect(bus[to]);
  s.start(t, Math.random() * 0.5);
  s.stop(t + dur + 0.03);
}

// ---------- music ----------
function playMusic(id: string) {
  stopMusic(0.2);
  const track = musicById.get(id);
  const p = loadPrefs();
  if (!track || !p.sound || !p.music) return;
  const c = ensure();
  if (!c || !bus) return;
  void load(track.file).then((b) => {
    // Sounds or Music may have been switched off while the file loaded.
    if (!b || !bus || !loadPrefs().sound || !loadPrefs().music) return;
    const s = c.createBufferSource();
    s.buffer = b;
    s.loop = Boolean(track.loop);
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, c.currentTime);
    g.gain.exponentialRampToValueAtTime(track.gain, c.currentTime + 0.25);
    s.connect(g).connect(bus.music);
    s.start();
    current = { s, g };
    s.onended = () => {
      if (current?.s === s) current = null;
    };
  });
}

/** Plays a music cue ('level', 'rank', 'victory'). One track at a time. */
export function music(id: string) {
  playMusic(id);
}

export function stopMusic(fade = 0.6) {
  const m = current;
  if (!m || !ctx) return;
  const t = ctx.currentTime;
  m.g.gain.cancelScheduledValues(t);
  m.g.gain.setValueAtTime(Math.max(0.0001, m.g.gain.value), t);
  m.g.gain.exponentialRampToValueAtTime(0.0001, t + fade);
  m.s.stop(t + fade + 0.05);
  current = null;
}

/** Big hits pull the music down for a moment so they land. */
export function duck(ms = 450, to = 0.35) {
  if (!ctx || !bus) return;
  const g = bus.music.gain;
  const t = ctx.currentTime;
  g.cancelScheduledValues(t);
  g.setValueAtTime(BUS.music * to, t);
  g.linearRampToValueAtTime(BUS.music, t + ms / 1000);
}

// ---------- instruments made in code ----------
/** Frequency of a scale degree (0 = the key's tonic) in the reward key. */
export function deg(d: number, o = 5, key: string = REWARD_KEY): number {
  const k = NOTE[key] ?? 0;
  const oct = Math.floor(d / 7);
  const st = MAJOR[((d % 7) + 7) % 7] + 12 * oct;
  return 440 * 2 ** ((12 * (o + 1) + k + st - 69) / 12);
}

type NoteOpts = { at?: number; g?: number; dur?: number; bus?: keyof Buses };
const INS = {
  bell(f: number, { at = 0, g = 0.12, dur = 1.1, bus: to = 'fx' }: NoteOpts = {}) {
    (
      [
        [1, 1, 1],
        [2, 0.45, 0.6],
        [3, 0.2, 0.4],
        [4.2, 0.1, 0.25],
      ] as const
    ).forEach(([m, a, d]) => osc('sine', f * m, null, dur * d, { g: g * a, at, bus: to, att: 0.003 }));
  },
  marimba(f: number, { at = 0, g = 0.14, bus: to = 'fx' }: NoteOpts = {}) {
    osc('sine', f, null, 0.42, { g, at, bus: to, att: 0.002 });
    osc('sine', f * 4, null, 0.07, { g: g * 0.25, at, bus: to, att: 0.002 });
  },
  brass(f: number, { at = 0, g = 0.06, dur = 0.4, bus: to = 'fx' }: NoteOpts = {}) {
    const c = ensure();
    if (!c || !bus) return;
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
    lp.connect(gn).connect(bus[to]);
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
  thump(f = 120, { at = 0, g = 0.5, bus: to = 'fx' }: NoteOpts = {}) {
    osc('sine', f, f * 0.42, 0.26, { g, at, bus: to });
  },
};

/** The sounds made in code. Each is a no-op while sound is off or locked. */
export const SYN = {
  pop: () => {
    osc('sine', 420, 660, 0.09, { g: 0.32 });
    noise(0.02, { f0: 3200, q: 2, g: 0.04 });
  },
  tock: () => {
    osc('triangle', 320, 230, 0.08, { g: 0.38 });
    noise(0.035, { f0: 1700, q: 3, g: 0.13 });
  },
  tick: () => osc('square', 2300, null, 0.016, { g: 0.05 }),
  pip: (p = 1) => osc('sine', 1150 * p, 1450 * p, 0.05, { g: 0.18 }),
  switchOn: () => {
    osc('triangle', 700, null, 0.03, { g: 0.2 });
    osc('triangle', 1100, null, 0.035, { g: 0.2, at: 0.05 });
  },
  switchOff: () => {
    osc('triangle', 1000, null, 0.03, { g: 0.18 });
    osc('triangle', 640, null, 0.035, { g: 0.18, at: 0.05 });
  },
  puff: () => noise(0.09, { type: 'lowpass', f0: 700, f1: 240, q: 0.7, g: 0.12 }),
  lift: () => {
    noise(0.14, { type: 'lowpass', f0: 260, f1: 1200, q: 0.8, g: 0.09 });
    osc('sine', 180, 280, 0.12, { g: 0.08 });
  },
  modal: () => {
    SYN.pip(0.7);
    noise(0.2, { f0: 500, f1: 2800, q: 1.2, g: 0.12 });
  },
  chime: () => {
    osc('sine', 1318.5, null, 0.5, { g: 0.09, bus: 'fx' });
    osc('sine', 1975.5, null, 0.6, { g: 0.07, at: 0.07, bus: 'fx' });
  },
  // The set tick: two semitones higher for each set in a row.
  set: (n = 0) => {
    const f = 523.25 * 2 ** ((Math.min(n, 12) * 2) / 12);
    osc('sine', f, f * 1.5, 0.12, { g: 0.2 });
    osc('triangle', f * 2, null, 0.08, { g: 0.05, at: 0.02 });
    noise(0.02, { f0: 4000, q: 2, g: 0.03 });
  },
  untick: () => osc('sine', 500, 360, 0.1, { g: 0.18 }),
  coin: (p = 1) => {
    osc('sine', 1975 * p, null, 0.14, { g: 0.09, bus: 'fx' });
    osc('sine', 2637 * p, null, 0.2, { g: 0.07, at: 0.04, bus: 'fx' });
  },
  // XP counting up: a coin, then ticks climbing.
  xp: (n = 6) => {
    SYN.coin(1);
    for (let i = 0; i < n; i++) osc('square', 1600 * 2 ** (i / 12), null, 0.012, { g: 0.035, at: 0.05 + i * 0.035 });
  },
  riser: (dur = 0.9) => {
    osc('sawtooth', 160, 760, dur, { g: 0.04, att: dur * 0.9, bus: 'fx' });
    noise(dur, { type: 'highpass', f0: 500, f1: 5000, g: 0.07, att: dur * 0.9, bus: 'fx' });
  },
  thud: () => {
    INS.thump(120, { g: 0.7 });
    noise(0.1, { type: 'lowpass', f0: 500, g: 0.3, bus: 'fx' });
  },
  // The lid bursts: a swell into a bright major chord.
  bloom: () => {
    noise(0.28, { type: 'lowpass', f0: 300, f1: 4000, q: 0.7, g: 0.12, bus: 'fx', att: 0.24 });
    INS.thump(110, { at: 0.24, g: 0.5 });
    [0, 2, 4, 7].forEach((d, i) => INS.bell(deg(d, 5), { at: 0.25 + i * 0.012, g: 0.07, dur: 1.4 }));
    SYN.sparkle(0.3);
  },
  // The badge appears: a rising bell arpeggio over a soft low hit.
  bells: () => {
    INS.thump(150, { g: 0.32 });
    [0, 2, 4, 7, 9].forEach((d, i) => INS.bell(deg(d, 5), { at: 0.02 + i * 0.055, g: 0.09, dur: i === 4 ? 1.6 : 0.9 }));
    noise(0.6, { type: 'highpass', f0: 7000, f1: 4000, g: 0.03, bus: 'fx', at: 0.05 });
  },
  sparkle: (at = 0) => {
    [7, 9, 11, 14, 16, 18].forEach((d, i) => osc('sine', deg(d, 5), null, 0.18, { g: 0.05, at: at + i * 0.04, bus: 'fx' }));
  },
  // Tier up: climbing the scale, then landing on the chord an octave up.
  shimmer: () => {
    for (let i = 0; i < 8; i++) INS.bell(deg(i, 5), { at: i * 0.07, g: 0.05, dur: 0.5 });
    noise(0.6, { type: 'highpass', f0: 2000, f1: 8000, g: 0.04, bus: 'fx', att: 0.5 });
    [7, 9, 11, 14].forEach((d) => INS.bell(deg(d, 5), { at: 0.62, g: 0.07, dur: 1.6 }));
  },
  // Exercise complete: a marimba run.
  marimba: () => [0, 2, 4, 7].forEach((d, i) => INS.marimba(deg(d, 5), { at: i * 0.05, g: 0.1 })),
  // Beat last time: a brass lift with a proper tail, not a cut-off stab.
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
  // Weekly goal met: a soft press, then a bright rising chord.
  seal: () => {
    INS.thump(95, { g: 0.35 });
    noise(0.05, { type: 'lowpass', f0: 600, g: 0.12, bus: 'fx' });
    [0, 4, 7].forEach((d, i) => INS.bell(deg(d, 5), { at: 0.12 + i * 0.06, g: 0.07, dur: 1.1 }));
  },
};
const SYN_NAMES = new Set(Object.keys(SYN));

// ---------- playing a slot ----------
export type PlayOpts = { gain?: number; rate?: number; on?: boolean };

// Semitones from a file's key to the reward key, kept within a tritone.
function shift(id: string): number {
  const from = FILE_KEY[id];
  if (!from) return 1;
  let d = (((NOTE[REWARD_KEY] - NOTE[from]) % 12) + 12) % 12;
  if (d > 6) d -= 12;
  return 2 ** (d / 12);
}

function playValue(s: Slot, value: string, opts: PlayOpts) {
  if (value.startsWith('layer:')) {
    value
      .slice(6)
      .split('+')
      .forEach((v) => playValue(s, SYN_NAMES.has(v) ? `code:${v}` : v, opts));
    return;
  }
  if (value.startsWith('code:')) {
    const name = value.slice(5);
    if (name === 'switch') return opts.on === false ? SYN.switchOff() : SYN.switchOn();
    return (SYN as Record<string, () => void>)[name]?.();
  }
  file(value, { group: s.group, gain: s.gain * (opts.gain ?? 1), rate: (opts.rate ?? 1) * (s.tuned ? shift(value) : 1) });
}

/** Plays a slot with its signed-off sound. Unknown ids and locked audio are silent. */
export function play(slotId: string, opts: PlayOpts = {}) {
  const s = slotById.get(slotId);
  if (!s) return;
  try {
    if (!canSound()) return;
    playValue(s, s.value, opts);
  } catch {
    // never let a sound break the app
  }
}

/** Fetches the files a moment is about to need: slot ids and music ids. */
export function preload(ids: string[]) {
  if (!canSound()) return;
  for (const id of ids) {
    const m = musicById.get(id);
    const values = m ? [m.file] : (slotById.get(id)?.value.replace(/^layer:/, '').split('+') ?? []);
    for (const v of values) if (!v.startsWith('code:') && !SYN_NAMES.has(v)) void load(v);
  }
}

// ---------- haptics ----------
// Android vibrates; iPhone browsers have no web vibration, so this is a no-op there.
export const HAPTIC = { light: 8, medium: 14, heavy: 24, success: [10, 40, 18], reward: [12, 30, 12, 30, 28], error: [30, 40, 30] } as const;
export type HapticKind = keyof typeof HAPTIC;

export function buzz(kind: HapticKind) {
  if (!loadPrefs().vibrate) return;
  try {
    if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(HAPTIC[kind] as number | number[]);
  } catch {
    // ignore
  }
}

// ---------- unlocking ----------
/**
 * Marks audio as allowed (a tap or key press happened), starts the audio
 * context and fetches the picked effect files. Call it from a gesture; the
 * first tap anywhere does it automatically.
 */
export function unlock() {
  if (typeof window === 'undefined') return;
  unlocked = true;
  try {
    if (!ensure()) return;
    preload(SLOTS.filter((s) => !s.value.startsWith('code:')).map((s) => s.id));
  } catch {
    // ignore
  }
}

if (typeof window !== 'undefined') {
  const first = () => {
    window.removeEventListener('pointerdown', first, true);
    window.removeEventListener('keydown', first, true);
    unlock();
  };
  window.addEventListener('pointerdown', first, true);
  window.addEventListener('keydown', first, true);
}
