// The Levl motion vocabulary. Every reel is built from these few moves, so the
// videos feel like one brand and like the app (the slam, roll and sparks come from
// the app's reward moments in components/celebrate/Moment.tsx and globals.css).
// Times are in frames at 30 fps.
import React from 'react';
import { AbsoluteFill, Easing, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { C, Cloud } from './brand';

export const FPS = 30;
export const s2f = (s: number) => Math.round(s * FPS);
const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;

// Slam: lands from big and tilted, overshoots, settles. The app's wt-m-slam.
export function slam(f: number, at: number) {
  const k = spring({ frame: f - at, fps: FPS, config: { damping: 11, stiffness: 190, mass: 0.7 } });
  return {
    opacity: interpolate(f - at, [0, 3], [0, 1], clamp),
    transform: `scale(${interpolate(k, [0, 1], [2.4, 1])}) rotate(${interpolate(k, [0, 1], [-9, 0])}deg)`,
  };
}

// Drop in: falls a little from above with a bounce. The app's wt-dropin.
export function dropIn(f: number, at: number, from = -60) {
  const k = spring({ frame: f - at, fps: FPS, config: { damping: 10, stiffness: 170, mass: 0.6 } });
  return { opacity: interpolate(f - at, [0, 4], [0, 1], clamp), transform: `translateY(${interpolate(k, [0, 1], [from, 0])}px)` };
}

// Rise: comes up from below, for cards and labels.
export function rise(f: number, at: number, from = 120) {
  const k = spring({ frame: f - at, fps: FPS, config: { damping: 15, stiffness: 140 } });
  return { opacity: interpolate(f - at, [0, 5], [0, 1], clamp), transform: `translateY(${interpolate(k, [0, 1], [from, 0])}px)` };
}

// Roll: a number counting from `from` to `to`. The app's useRoll.
export function roll(f: number, at: number, dur: number, from: number, to: number) {
  return Math.round(interpolate(f, [at, at + dur], [from, to], { ...clamp, easing: Easing.out(Easing.cubic) }));
}

// Out: a quick shrink and fade to clear the stage before the next beat.
export function out(f: number, at: number, dur = 6) {
  return { opacity: interpolate(f, [at, at + dur], [1, 0], clamp), transform: `scale(${interpolate(f, [at, at + dur], [1, 0.85], clamp)})` };
}

// Impact shake for the whole frame: a few pixels that die out in 8 frames after each hit.
export function shake(f: number, hits: number[], power = 14) {
  let x = 0;
  let y = 0;
  for (const h of hits) {
    const t = f - h;
    if (t < 0 || t > 8) continue;
    const a = power * (1 - t / 8);
    x += Math.sin(t * 2.7 + h) * a;
    y += Math.cos(t * 3.1 + h) * a * 0.6;
  }
  return `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
}

// Sparks: little squares flying out from a point at impact. The app's wt-m-spark.
export const Sparks: React.FC<{ at: number; x: number; y: number; n?: number; reach?: number }> = ({ at, x, y, n = 26, reach = 340 }) => {
  const f = useCurrentFrame();
  const t = f - at;
  if (t < 0 || t > 40) return null;
  return (
    <>
      {Array.from({ length: n }, (_, i) => {
        const a = (i / n) * Math.PI * 2;
        const d = reach * (0.55 + ((i * 37) % 45) / 100);
        const k = interpolate(t - (i % 5), [0, 32], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
        return (
          <i
            key={i}
            style={{
              position: 'absolute',
              left: x + Math.cos(a) * d * k - 10,
              top: y + Math.sin(a) * d * k - 10,
              width: 20,
              height: 20,
              borderRadius: 4,
              background: i % 3 ? C.xpHi : '#27a844',
              opacity: 1 - k,
              transform: `rotate(${k * 220}deg) scale(${1 - k * 0.5})`,
            }}
          />
        );
      })}
    </>
  );
};

// Sky wipe: a bank of clouds rolls up the screen and hides the cut. Levl's own
// transition, used instead of slides and fades. Covers the frame at `at + 7`.
export const SkyWipe: React.FC<{ at: number }> = ({ at }) => {
  const f = useCurrentFrame();
  const { height } = useVideoConfig();
  const t = f - at;
  if (t < 0 || t > 16) return null;
  const y = interpolate(t, [0, 7, 16], [height + 200, -150, -height - 900], { easing: Easing.inOut(Easing.cubic) });
  return (
    <AbsoluteFill style={{ transform: `translateY(${y}px)` }}>
      <div style={{ position: 'absolute', left: -100, right: -100, top: 280, height: height + 100, background: '#fff' }} />
      {[0, 1, 2, 3, 4].map((i) => (
        <Cloud key={i} x={-260 + i * 300} y={40 + (i % 2) * 70} s={2.2} o={1} />
      ))}
      {[0, 1, 2, 3, 4].map((i) => (
        <div key={`b${i}`} style={{ position: 'absolute', left: -260 + i * 300, top: height + 300, transform: 'scaleY(-1)' }}>
          <Cloud x={0} y={0} s={2.2} o={1} />
        </div>
      ))}
    </AbsoluteFill>
  );
};

// Gloss: a white shine that sweeps across a bar or a card once. The app's wt-m-sweep.
export const Gloss: React.FC<{ at: number; dur?: number; radius?: number }> = ({ at, dur = 18, radius = 0 }) => {
  const f = useCurrentFrame();
  const p = interpolate(f, [at, at + dur], [-60, 160], { ...clamp, easing: Easing.inOut(Easing.cubic) });
  if (f < at || f > at + dur) return null;
  return <div style={{ position: 'absolute', inset: 0, borderRadius: radius, background: `linear-gradient(110deg, transparent ${p - 18}%, rgba(255,255,255,.85) ${p}%, transparent ${p + 18}%)`, pointerEvents: 'none' }} />;
};
