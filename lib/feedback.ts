// Synthesized sound effects (Web Audio API, no audio files) plus haptics.
// Ported from the design reference's FB module. Every function is wrapped so
// a missing AudioContext or navigator.vibrate is a silent no-op.

export type Prefs = { sound: boolean; vibrate: boolean };

const PREFS_KEY = 'wt:prefs';

let prefs: Prefs = { sound: true, vibrate: true };
let loadedPrefs = false;

function loadPrefs(): Prefs {
  if (loadedPrefs) return prefs;
  loadedPrefs = true;
  try {
    const raw = typeof window !== 'undefined' ? window.localStorage.getItem(PREFS_KEY) : null;
    if (raw) {
      const parsed = JSON.parse(raw);
      prefs = { sound: parsed.sound !== false, vibrate: parsed.vibrate !== false };
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
}

export function setVibrateEnabled(on: boolean) {
  loadPrefs();
  prefs.vibrate = on;
  savePrefs();
}

type CtxWindow = Window & { webkitAudioContext?: typeof AudioContext };

let ctx: AudioContext | null = null;
let master: GainNode | null = null;

function ac(): AudioContext | null {
  loadPrefs();
  if (!prefs.sound) return null;
  if (typeof window === 'undefined') return null;
  try {
    if (!ctx) {
      const w = window as CtxWindow;
      const Ctor = window.AudioContext || w.webkitAudioContext;
      if (!Ctor) return null;
      ctx = new Ctor();
      master = ctx.createGain();
      master.gain.value = 0.35;
      master.connect(ctx.destination);
    }
    if (ctx.state === 'suspended') {
      // Best-effort; resume() is async and may itself reject silently.
      ctx.resume().catch(() => {});
    }
    return ctx.state === 'running' || ctx.state === 'suspended' ? ctx : null;
  } catch {
    return null;
  }
}

function tone(f: number, t: number, peak: number, decay: number, type: OscillatorType = 'sine', dest?: AudioNode) {
  if (!ctx || !master) return null;
  try {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.value = f;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(peak, t + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, t + decay);
    o.connect(g);
    g.connect(dest ?? master);
    o.start(t);
    o.stop(t + decay + 0.05);
    return o;
  } catch {
    return null;
  }
}

function bell(f: number, t: number, peak = 0.4, decay = 0.8) {
  tone(f, t, peak, decay);
  tone(f * 2.76, t, peak * 0.35, decay * 0.6);
  tone(f * 5.4, t, peak * 0.12, decay * 0.4);
}

function vibrate(pattern: number | number[]) {
  loadPrefs();
  if (!prefs.vibrate) return;
  try {
    if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(pattern);
  } catch {
    // ignore
  }
}

// Prime the AudioContext on a user gesture, so later celebrations (which may
// be triggered on load, without a fresh gesture) can still play if the
// context is already running.
export function warm() {
  try {
    ac();
  } catch {
    // ignore
  }
}

export function tick() {
  vibrate(10);
  const context = ac();
  if (!context) return;
  try {
    const t = context.currentTime;
    tone(1320, t, 0.22, 0.07);
    tone(2640, t, 0.05, 0.05);
  } catch {
    // ignore
  }
}

export function dayCleared() {
  vibrate([15, 40, 25]);
  const context = ac();
  if (!context) return;
  try {
    const t = context.currentTime;
    bell(1046.5, t, 0.35, 0.9);
    bell(1568, t + 0.09, 0.35, 1.1);
  } catch {
    // ignore
  }
}

export function levelUp() {
  vibrate([30, 60, 40]);
  const context = ac();
  if (!context || !master) return;
  try {
    const t = context.currentTime;
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => bell(f, t + i * 0.08, 0.3, 0.9));
    [2093, 2637].forEach((f) => {
      const o = tone(f, t + 0.35, 0.07, 0.9);
      if (!o) return;
      const lfo = context.createOscillator();
      const lfoGain = context.createGain();
      lfo.frequency.value = 6;
      lfoGain.gain.value = 8;
      lfo.connect(lfoGain);
      lfoGain.connect(o.frequency);
      lfo.start(t + 0.35);
      lfo.stop(t + 1.3);
    });
  } catch {
    // ignore
  }
}

export function rankUp() {
  vibrate([40, 50, 40, 50, 80]);
  const context = ac();
  if (!context || !master) return;
  try {
    const t = context.currentTime;

    const sweep = context.createOscillator();
    const sweepGain = context.createGain();
    sweep.frequency.setValueAtTime(90, t);
    sweep.frequency.exponentialRampToValueAtTime(40, t + 0.3);
    sweepGain.gain.setValueAtTime(0.6, t);
    sweepGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
    sweep.connect(sweepGain);
    sweepGain.connect(master);
    sweep.start(t);
    sweep.stop(t + 0.4);

    const buf = context.createBuffer(1, Math.max(1, Math.floor(context.sampleRate * 0.12)), context.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
    const noise = context.createBufferSource();
    const lowpass = context.createBiquadFilter();
    const noiseGain = context.createGain();
    noise.buffer = buf;
    lowpass.type = 'lowpass';
    lowpass.frequency.value = 800;
    noiseGain.gain.value = 0.4;
    noise.connect(lowpass);
    lowpass.connect(noiseGain);
    noiseGain.connect(master);
    noise.start(t);

    [392, 523.25, 659.25, 783.99, 1046.5].forEach((f, i) => bell(f, t + 0.15 + i * 0.09, 0.28, 0.9));

    const chordFilter = context.createBiquadFilter();
    chordFilter.type = 'lowpass';
    chordFilter.frequency.value = 2500;
    chordFilter.connect(master);
    [261.63, 329.63, 392].forEach((f) => {
      const s = context.createOscillator();
      const sg = context.createGain();
      s.type = 'sawtooth';
      s.frequency.value = f;
      sg.gain.setValueAtTime(0, t + 0.6);
      sg.gain.linearRampToValueAtTime(0.06, t + 0.66);
      sg.gain.setValueAtTime(0.06, t + 1.5);
      sg.gain.exponentialRampToValueAtTime(0.0001, t + 1.9);
      s.connect(sg);
      sg.connect(chordFilter);
      s.start(t + 0.6);
      s.stop(t + 2);
    });
  } catch {
    // ignore
  }
}

export function badgeReveal() {
  vibrate([20, 40, 20]);
  const context = ac();
  if (!context) return;
  try {
    const t = context.currentTime;
    [1568, 2093, 2637, 3136].forEach((f, i) => tone(f, t + i * 0.05, 0.18, 0.25));
  } catch {
    // ignore
  }
}
