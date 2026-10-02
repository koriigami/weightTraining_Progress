// Reel 1, pillar 3 (the comeback): "Missed a week? Streak apps reset you. Levl keeps
// every XP, and pays you to come back." The numbers follow the real rules: level 12
// needs 1,200 XP; +25 comeback, +50 daily bonus and 8 sets at 5 XP take 1,090 to
// 1,205, which is level 13 with 5 XP in and 1,295 to go.
import React from 'react';
import { AbsoluteFill, Audio, Easing, interpolate, staticFile, useCurrentFrame } from 'remotion';
import { BODY, C, DISPLAY, Display, Fonts, Sky, Tag } from '../brand';
import { Gloss, SkyWipe, Sparks, dropIn, rise, roll, s2f, shake, slam } from '../motion';
import { Card, Flame, HunterCard, Logo, Shield, WeekStrip, XpBar, XpChip } from '../ui';
import cues from './comeback.cues.json';

export const comebackFrames = s2f(cues.duration);
const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;
const T = (s: number) => s2f(s);

const Center: React.FC<{ y: number; children: React.ReactNode; style?: React.CSSProperties }> = ({ y, children, style }) => (
  <div style={{ position: 'absolute', left: 0, right: 0, top: y, display: 'flex', flexDirection: 'column', alignItems: 'center', ...style }}>{children}</div>
);

// Scene 1: the hook and the broken streak.
const Hook: React.FC = () => {
  const f = useCurrentFrame();
  const broke = f >= T(2.5);
  const half = (side: -1 | 1) => {
    const t = f - T(2.5);
    if (t < 0) return {};
    return {
      clipPath: side < 0 ? 'inset(0 50% 0 0)' : 'inset(0 0 0 50%)',
      transform: `translate(${side * t * 12}px, ${t * t * 2.2}px) rotate(${side * t * 1.6}deg)`,
      opacity: interpolate(t, [10, 22], [1, 0], clamp),
    };
  };
  const streakCard = (
    <Card style={{ width: 760, display: 'flex', alignItems: 'center', gap: 34, padding: '40px 56px' }}>
      <Flame size={120} />
      <div>
        <div style={{ fontFamily: DISPLAY, fontSize: 120, color: C.ink, lineHeight: 1 }}>23 days</div>
        <div style={{ fontFamily: BODY, fontWeight: 700, fontSize: 44, color: C.muted }}>workout streak</div>
      </div>
    </Card>
  );
  return (
    <AbsoluteFill>
      <Center y={360}>
        <div style={slam(f, T(0))}>
          <Display size={170}>Missed</Display>
        </div>
        <div style={slam(f, T(0.5))}>
          <Display size={170}>a week?</Display>
        </div>
      </Center>
      <Center y={840} style={rise(f, T(0.9))}>
        <WeekStrip days={['done', 'done', 'none', 'none', 'none', 'none', 'none']} tile={100} />
      </Center>
      <Center y={1080} style={{ gap: 30 }}>
        <div style={dropIn(f, T(1.5))}>
          <Tag tone="red">Streak apps</Tag>
        </div>
        <div style={{ position: 'relative', ...rise(f, T(1.5)) }}>
          {!broke && streakCard}
          {broke && (
            <>
              <div style={half(-1)}>{streakCard}</div>
              <div style={{ position: 'absolute', inset: 0, ...half(1) }}>{streakCard}</div>
              <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', ...slam(f, T(2.6)) }}>
                <Display size={260} color={C.bad}>0</Display>
              </div>
            </>
          )}
        </div>
        <div style={{ marginTop: 10, ...slam(f, T(2.75)) }}>
          <Display size={96}>Back to zero.</Display>
        </div>
      </Center>
    </AbsoluteFill>
  );
};

// Scene 2: Levl keeps the XP, and the come back fills the bar.
const Keep: React.FC = () => {
  const f = useCurrentFrame();
  const chips: { at: number; xp: number; what: string }[] = [
    { at: 5.75, xp: 25, what: 'Comeback bonus' },
    { at: 6.25, xp: 50, what: 'Daily bonus' },
    { at: 6.75, xp: 40, what: '8 sets' },
  ];
  // XP into level 12: 1,090, then each chip lands 0.3 s after it appears.
  let into = 1090;
  let sum = 1090;
  for (const c of chips) {
    into = f >= T(c.at + 0.3) ? roll(f, T(c.at + 0.3), 8, sum, sum + c.xp) : into;
    sum += c.xp;
  }
  const shown = Math.min(into, 1200);
  const head = f < T(5.5) ? 'Your XP stays.' : 'Welcome back.';
  const headAt = f < T(5.5) ? T(3.75) : T(5.5);
  return (
    <AbsoluteFill>
      <Center y={300} style={{ gap: 26 }}>
        <div style={dropIn(f, T(3.55))}>
          <Tag tone="green">Levl</Tag>
        </div>
        <div key={head} style={slam(f, headAt)}>
          <Display size={130}>{head}</Display>
        </div>
      </Center>
      <Center y={720} style={rise(f, T(4.0))}>
        <div style={{ position: 'relative', transform: `scale(${interpolate(f, [T(5.6), T(6.4)], [1, 1.1], { ...clamp, easing: Easing.inOut(Easing.cubic) })})` }}>
          <HunterCard
            rank="C"
            level={12}
            into={shown}
            need={1200}
            streak={0}
            days="1/3"
            bar={
              <XpBar height={76} pct={(shown / 1200) * 100} label={`${shown.toLocaleString('en-US')} / 1,200`}>
                <Gloss at={T(4.6)} />
                <Gloss at={T(7.2)} />
              </XpBar>
            }
          />
        </div>
      </Center>
      {chips.map((c, i) => {
        const at = T(c.at);
        const t = f - at;
        if (t < 0) return null;
        const fly = interpolate(t, [9, 17], [0, 1], { ...clamp, easing: Easing.in(Easing.cubic) });
        const y = 1120;
        return (
          <Center key={c.what} y={y} style={{ ...slam(f, at), opacity: 1 - interpolate(fly, [0.7, 1], [0, 1], clamp) }}>
            <div style={{ transform: `translate(${fly * 120}px, ${-fly * (y - 830)}px) scale(${1 - fly * 0.6})` }}>
              <XpChip xp={c.xp} what={c.what} big />
            </div>
          </Center>
        );
      })}
    </AbsoluteFill>
  );
};

// Scene 3: the app's level up moment.
const LevelUp: React.FC = () => {
  const f = useCurrentFrame();
  const lvl = roll(f, T(8.4), 14, 12, 13);
  return (
    <AbsoluteFill style={{ background: C.scrim }}>
      <AbsoluteFill style={{ background: `radial-gradient(circle at 50% 46%, rgba(255,222,110,.55), transparent 55%)`, opacity: interpolate(f, [T(8.15), T(8.4)], [0, 1], clamp) }} />
      <Center y={330} style={dropIn(f, T(8.0), -90)}>
        <div style={{ fontFamily: DISPLAY, fontSize: 150, color: C.xpHi, WebkitTextStroke: `16px ${C.ink}`, paintOrder: 'stroke fill', textShadow: `0 12px 0 ${C.ink}` }}>LEVEL UP!</div>
      </Center>
      <Center y={600}>
        <div style={slam(f, T(8.15))}>
          <Shield rank="C" level={13} size={380} id="lu" />
        </div>
      </Center>
      <Sparks at={T(8.25)} x={540} y={810} reach={460} n={30} />
      <Center y={1070}>
        <div style={{ fontFamily: DISPLAY, fontSize: 220, color: '#fff', WebkitTextStroke: `18px ${C.ink}`, paintOrder: 'stroke fill', textShadow: `0 14px 0 ${C.ink}`, opacity: interpolate(f, [T(8.3), T(8.4)], [0, 1], clamp) }}>{lvl}</div>
        <div style={{ fontFamily: BODY, fontWeight: 700, fontSize: 50, color: '#fff', opacity: interpolate(f, [T(8.9), T(9.2)], [0, 0.92], clamp) }}>1,295 XP to level 14</div>
      </Center>
    </AbsoluteFill>
  );
};

// Scene 4: the end card.
const End: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill>
      <Center y={520} style={{ gap: 80 }}>
        <div style={slam(f, T(10.0))}>
          <Logo size={190} />
        </div>
        <div style={dropIn(f, T(10.4))}>
          <Display size={120}>{'Miss a week.\nKeep every XP.'}</Display>
        </div>
        <div style={{ marginTop: 40, ...rise(f, T(11.0), 60) }}>
          <Tag style={{ fontSize: 40 }}>Join the waitlist · link in bio</Tag>
        </div>
      </Center>
    </AbsoluteFill>
  );
};

export const Comeback: React.FC = () => {
  const f = useCurrentFrame();
  const hits = [0, 0.5, 2.5, 2.75, 3.75, 5.5, 5.75, 6.25, 6.75, 8.15, 10.0].map(T);
  const scene = f < T(3.53) ? 1 : f < T(8.0) ? 2 : f < T(9.93) ? 3 : 4;
  return (
    <AbsoluteFill style={{ background: C.cream }}>
      <Fonts />
      <AbsoluteFill style={{ transform: shake(f, hits) }}>
        {scene !== 3 && <Sky />}
        {scene === 1 && <Hook />}
        {scene === 2 && <Keep />}
        {scene === 3 && <LevelUp />}
        {scene === 4 && <End />}
      </AbsoluteFill>
      <SkyWipe at={T(3.3)} />
      <SkyWipe at={T(9.7)} />
      <Audio src={staticFile('comeback.wav')} />
    </AbsoluteFill>
  );
};
