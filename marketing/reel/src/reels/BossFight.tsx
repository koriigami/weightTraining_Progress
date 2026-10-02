// Reel 2, pillar 1 (gym life, as a game): "Leg day is a boss fight." Each set is a
// hit: the boss loses HP and you gain 5 XP. Eight sets and the daily bonus make
// +90 XP, as the app scores it. With `overlay` the sky is left out (except on the
// end card), so it renders with a transparent background to lay over your own clip.
import React from 'react';
import { AbsoluteFill, Audio, Easing, interpolate, staticFile, useCurrentFrame } from 'remotion';
import { BODY, C, DISPLAY, Display, Fonts, Sky, Tag } from '../brand';
import { SkyWipe, Sparks, dropIn, rise, roll, s2f, shake, slam } from '../motion';
import { Card, Logo, XpChip, XpSheet } from '../ui';
import cues from './boss.cues.json';

export const bossFrames = s2f(cues.duration);
const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;
const T = (s: number) => s2f(s);

const SETS: [string, string][] = [
  ['Squat (Barbell)', '60 kg × 8'],
  ['Squat (Barbell)', '60 kg × 8'],
  ['Squat (Barbell)', '60 kg × 8'],
  ['Romanian Deadlift (Barbell)', '50 kg × 10'],
  ['Romanian Deadlift (Barbell)', '50 kg × 10'],
  ['Leg Press (Machine)', '120 kg × 12'],
  ['Leg Press (Machine)', '120 kg × 12'],
  ['Walking Lunge', '12 reps'],
];
const HIT0 = 1.0;
const STEP = 0.5;
const hitAt = (i: number) => T(HIT0 + i * STEP);

const Center: React.FC<{ y: number; children: React.ReactNode; style?: React.CSSProperties }> = ({ y, children, style }) => (
  <div style={{ position: 'absolute', left: 0, right: 0, top: y, display: 'flex', flexDirection: 'column', alignItems: 'center', ...style }}>{children}</div>
);

// The boss's HP bar: the XP bar's shape in red, draining in chunks, flashing white on a hit.
const HpBar: React.FC<{ hp: number; flash: number }> = ({ hp, flash }) => (
  <div style={{ position: 'relative', width: 900, height: 92, borderRadius: 46, background: 'rgba(60,10,5,.35)', border: `7px solid ${C.stroke}`, overflow: 'hidden', boxShadow: `0 10px 0 ${C.stroke}` }}>
    <div style={{ height: '100%', width: `${hp}%`, background: 'linear-gradient(180deg, #ff9a8f, #e5534b 55%, #a5261d)', borderRadius: '0 40px 40px 0' }} />
    <div style={{ position: 'absolute', inset: 0, background: '#fff', opacity: flash }} />
    <div style={{ position: 'absolute', inset: 0, background: 'repeating-linear-gradient(90deg, transparent 0 calc(12.5% - 5px), rgba(0,0,0,.3) calc(12.5% - 5px) 12.5%)' }} />
    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: 34, fontFamily: DISPLAY, fontSize: 52, color: '#fff', WebkitTextStroke: `8px ${C.ink}`, paintOrder: 'stroke fill' }}>
      HP {Math.round(hp)}%
    </div>
  </div>
);

const Fight: React.FC = () => {
  const f = useCurrentFrame();
  const done = SETS.filter((_, i) => f >= hitAt(i)).length;
  const last = done - 1;
  const killed = f >= T(5.0);
  // HP falls 12.5 a set over 5 frames; the eighth set lands the kill at 5.0 s.
  let hp = 100;
  SETS.forEach((_, i) => {
    const at = i === SETS.length - 1 ? T(5.0) : hitAt(i);
    hp -= interpolate(f, [at, at + 5], [0, 12.5], { ...clamp, easing: Easing.out(Easing.cubic) });
  });
  const lastHit = killed ? T(5.0) : last >= 0 ? hitAt(last) : -99;
  const flash = interpolate(f - lastHit, [0, 4], [0.9, 0], clamp);
  const xp = Math.min(done, SETS.length) * 5;
  const row = last >= 0 && !killed ? SETS[Math.min(last, SETS.length - 1)] : null;
  return (
    <AbsoluteFill>
      <Center y={380} style={{ gap: 24 }}>
        <div style={dropIn(f, T(0.0))}>
          <Tag tone="red">Boss fight</Tag>
        </div>
        <div style={slam(f, T(0.0))}>
          <Display size={210}>LEG DAY</Display>
        </div>
      </Center>
      <Center y={820} style={rise(f, T(0.5))}>
        <HpBar hp={Math.max(0, hp)} flash={flash} />
      </Center>
      {SETS.map((_, i) => {
        const t = f - hitAt(i) - 1;
        if (t < 0 || t > 22 || (i === SETS.length - 1 && f < T(5.0))) return null;
        return (
          <div key={i} style={{ position: 'absolute', left: 620 - (i % 3) * 170, top: 790 - t * 9, opacity: interpolate(t, [0, 3, 16, 22], [0, 1, 1, 0]), transform: `scale(${interpolate(t, [0, 5], [0.5, 1], clamp)})` }}>
            <XpChip xp={5} />
          </div>
        );
      })}
      {row && (
        <Center y={1110} key={last} style={{ ...rise(f, hitAt(last), 80) }}>
          <Card style={{ width: 900, padding: '34px 48px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontFamily: BODY, fontWeight: 700, fontSize: 46, color: C.ink }}>{row[0]}</div>
              <div style={{ fontFamily: BODY, fontWeight: 600, fontSize: 40, color: C.muted }}>Set {last + 1} of 8 · {row[1]}</div>
            </div>
            <div style={{ fontFamily: DISPLAY, fontSize: 64, color: C.xpInk }}>+{xp}</div>
          </Card>
        </Center>
      )}
      {killed && (
        <Center y={1080}>
          <div style={slam(f, T(5.05))}>
            <Display size={150} color={C.xpHi}>{'BOSS\nDEFEATED'}</Display>
          </div>
        </Center>
      )}
      <Sparks at={T(5.05)} x={540} y={1220} reach={520} n={34} />
    </AbsoluteFill>
  );
};

const Reward: React.FC = () => {
  const f = useCurrentFrame();
  const shown = f >= T(7.15) ? 3 : f >= T(6.8) ? 2 : f >= T(6.5) ? 1 : 0;
  const total = roll(f, T(7.15), 12, 40, 90);
  return (
    <AbsoluteFill>
      <Center y={400} style={slam(f, T(6.3))}>
        <Display size={130}>{'Fight won.\nXP earned.'}</Display>
      </Center>
      <Center y={900} style={rise(f, T(6.3), 160)}>
        <XpSheet rows={[['8 sets', '5 XP a set', 40], ['Daily bonus', '20 minutes or more', 50]]} total={total} shown={shown} />
      </Center>
    </AbsoluteFill>
  );
};

const End: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill>
      <Sky />
      <Center y={520} style={{ gap: 80 }}>
        <div style={slam(f, T(8.6))}>
          <Logo size={190} />
        </div>
        <div style={dropIn(f, T(8.9))}>
          <Display size={130}>{'Every set\nearns XP.'}</Display>
        </div>
        <div style={{ marginTop: 40, ...rise(f, T(9.4), 60) }}>
          <Tag style={{ fontSize: 40 }}>Join the waitlist · link in bio</Tag>
        </div>
      </Center>
    </AbsoluteFill>
  );
};

export const BossFight: React.FC<{ overlay?: boolean }> = ({ overlay = false }) => {
  const f = useCurrentFrame();
  const hits = [0, ...SETS.map((_, i) => HIT0 + i * STEP).slice(0, 7), 5.0, 5.05, 6.3, 8.6].map(T);
  const scene = f < T(6.2) ? 1 : f < T(8.53) ? 2 : 3;
  return (
    <AbsoluteFill style={{ background: overlay ? 'transparent' : C.cream }}>
      <Fonts />
      <AbsoluteFill style={{ transform: shake(f, hits, 16) }}>
        {!overlay && scene < 3 && <Sky />}
        {scene === 1 && <Fight />}
        {scene === 2 && <Reward />}
        {scene === 3 && <End />}
      </AbsoluteFill>
      {!overlay && <SkyWipe at={T(5.95)} />}
      <SkyWipe at={T(8.3)} />
      {!overlay && <Audio src={staticFile('boss.wav')} />}
    </AbsoluteFill>
  );
};
