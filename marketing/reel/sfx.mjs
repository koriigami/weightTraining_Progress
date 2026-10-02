// Renders a reel's sound track from its cue sheet (src/reels/<name>.cues.json) to
// public/<name>.wav. The sounds are the app's own: the same synthesized tones as
// lib/feedback.ts (tick, level up, rank up, whoosh, chest), plus a quiet beat made from
// the same parts so cuts land on it. No recorded audio, no voice.
// Usage: node sfx.mjs comeback
import { OfflineAudioContext } from 'node-web-audio-api';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const name = process.argv[2];
const sheet = JSON.parse(readFileSync(new URL(`./src/reels/${name}.cues.json`, import.meta.url)));
const RATE = 48000;
const ctx = new OfflineAudioContext(1, Math.ceil(sheet.duration * RATE), RATE);
const master = ctx.createGain();
master.gain.value = 0.35;
master.connect(ctx.destination);

// Seeded noise, so a render sounds the same every time.
let seed = 7;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647) * 2 - 1;

function tone(f, t, peak, decay, type = 'sine', dest = master) {
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.value = f;
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(peak, t + 0.004);
  g.gain.exponentialRampToValueAtTime(0.0001, t + decay);
  o.connect(g);
  g.connect(dest);
  o.start(t);
  o.stop(t + decay + 0.05);
  return o;
}
function bell(f, t, peak = 0.4, decay = 0.8) {
  tone(f, t, peak, decay);
  tone(f * 2.76, t, peak * 0.35, decay * 0.6);
  tone(f * 5.4, t, peak * 0.12, decay * 0.4);
}
function drop(from, to, t, peak, dur) {
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.frequency.setValueAtTime(from, t);
  o.frequency.exponentialRampToValueAtTime(to, t + dur);
  g.gain.setValueAtTime(peak, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g);
  g.connect(master);
  o.start(t);
  o.stop(t + dur + 0.02);
}
function noise(t, dur, cutoff, peak, type = 'lowpass', sweepTo) {
  const buf = ctx.createBuffer(1, Math.max(1, Math.floor(RATE * dur)), RATE);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = rnd() * (1 - i / d.length);
  const src = ctx.createBufferSource();
  const filter = ctx.createBiquadFilter();
  const g = ctx.createGain();
  src.buffer = buf;
  filter.type = type;
  filter.frequency.setValueAtTime(cutoff, t);
  if (sweepTo) filter.frequency.exponentialRampToValueAtTime(sweepTo, t + dur);
  g.gain.setValueAtTime(peak, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(filter);
  filter.connect(g);
  g.connect(master);
  src.start(t);
}

// The app's sounds, as in lib/feedback.ts.
const app = {
  tick: (t) => {
    tone(1320, t, 0.22, 0.07);
    tone(2640, t, 0.05, 0.05);
  },
  dayCleared: (t) => {
    bell(1046.5, t, 0.35, 0.9);
    bell(1568, t + 0.09, 0.35, 1.1);
  },
  levelUp: (t) => {
    drop(140, 48, t, 0.4, 0.3);
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => bell(f, t + 0.04 + i * 0.08, 0.3, 0.9));
    [2093, 2637].forEach((f) => {
      const o = tone(f, t + 0.35, 0.07, 0.9);
      const lfo = ctx.createOscillator();
      const lg = ctx.createGain();
      lfo.frequency.value = 6;
      lg.gain.value = 8;
      lfo.connect(lg);
      lg.connect(o.frequency);
      lfo.start(t + 0.35);
      lfo.stop(t + 1.3);
    });
  },
  rankUp: (t) => {
    drop(90, 40, t, 0.6, 0.35);
    noise(t, 0.12, 800, 0.4);
    [392, 523.25, 659.25, 783.99, 1046.5].forEach((f, i) => bell(f, t + 0.15 + i * 0.09, 0.28, 0.9));
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 2500;
    lp.connect(master);
    [261.63, 329.63, 392].forEach((f) => {
      const s = ctx.createOscillator();
      const sg = ctx.createGain();
      s.type = 'sawtooth';
      s.frequency.value = f;
      sg.gain.setValueAtTime(0, t + 0.6);
      sg.gain.linearRampToValueAtTime(0.06, t + 0.66);
      sg.gain.setValueAtTime(0.06, t + 1.5);
      sg.gain.exponentialRampToValueAtTime(0.0001, t + 1.9);
      s.connect(sg);
      sg.connect(lp);
      s.start(t + 0.6);
      s.stop(t + 2);
    });
  },
  whoosh: (t) => noise(t, 0.4, 260, 0.35, 'bandpass', 2400),
  sparkle: (t) => [1568, 2093, 2637, 3136].forEach((f, i) => tone(f, t + i * 0.05, 0.18, 0.25)),
};

// Made for the reels from the same parts.
const extra = {
  // A slam: the level up thud without the chime, for text and cards landing.
  thud: (t) => {
    drop(150, 45, t, 0.55, 0.28);
    noise(t, 0.06, 900, 0.25);
  },
  // A +XP chip: one bright note.
  pop: (t) => {
    tone(1568, t, 0.16, 0.18);
    tone(3136, t, 0.04, 0.1);
  },
  // A hit on the boss: low knock and a click.
  hit: (t) => {
    drop(220, 60, t, 0.45, 0.14);
    noise(t, 0.05, 3000, 0.2, 'highpass');
  },
  // Something breaking: noise falling in pitch.
  crack: (t) => {
    noise(t, 0.35, 4000, 0.4, 'bandpass', 300);
    drop(300, 70, t, 0.3, 0.25);
  },
  // A rising sweep into a reveal.
  riser: (t, d = 0.8) => noise(t, d, 300, 0.22, 'bandpass', 5000),
  // Counting: ticks spread over `d` seconds.
  count: (t, d = 0.6, n = 8) => {
    for (let i = 0; i < n; i++) tone(1320 + i * 40, t + (i * d) / n, 0.1, 0.05);
  },
};

// The beat: a soft kick on every beat and a hat on the off beat, from beatFrom to beatTo.
if (sheet.bpm) {
  const step = 60 / sheet.bpm;
  for (let t = sheet.beatFrom ?? 0; t < (sheet.beatTo ?? sheet.duration) - 0.01; t += step) {
    drop(120, 42, t, 0.32, 0.22);
    noise(t + step / 2, 0.04, 7000, 0.07, 'highpass');
  }
}

for (const c of sheet.cues) {
  const fn = app[c.kind] ?? extra[c.kind];
  if (!fn) throw new Error(`Unknown sound: ${c.kind}`);
  fn(c.t, c.d, c.n);
}

const buf = await ctx.startRendering();
const data = buf.getChannelData(0);
let peak = 0;
for (const v of data) peak = Math.max(peak, Math.abs(v));
const gain = peak > 0 ? 0.89 / peak : 1;

// 16-bit PCM WAV, stereo (the same signal on both sides).
const n = data.length;
const out = Buffer.alloc(44 + n * 4);
out.write('RIFF', 0);
out.writeUInt32LE(36 + n * 4, 4);
out.write('WAVEfmt ', 8);
out.writeUInt32LE(16, 16);
out.writeUInt16LE(1, 20);
out.writeUInt16LE(2, 22);
out.writeUInt32LE(RATE, 24);
out.writeUInt32LE(RATE * 4, 28);
out.writeUInt16LE(4, 32);
out.writeUInt16LE(16, 34);
out.write('data', 36);
out.writeUInt32LE(n * 4, 40);
for (let i = 0; i < n; i++) {
  const s = Math.round(Math.max(-1, Math.min(1, data[i] * gain)) * 32767);
  out.writeInt16LE(s, 44 + i * 4);
  out.writeInt16LE(s, 46 + i * 4);
}
mkdirSync(new URL('./public/', import.meta.url), { recursive: true });
writeFileSync(new URL(`./public/${name}.wav`, import.meta.url), out);
console.log(`public/${name}.wav, ${sheet.duration} s, peak ${peak.toFixed(2)}`);
