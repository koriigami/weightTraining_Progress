import React from 'react';
import { AbsoluteFill, Audio, Img, Sequence, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import vo from '../src_vo.json';

const FPS = 30;
const PAD = 12; // frames of breathing room after each line
const INK = '#2e1f0c';
const font = `@font-face{font-family:'Levl Display';src:url(${staticFile('lilita.woff2')})}@font-face{font-family:'Levl Body';src:url(${staticFile('figtree.woff2')})}`;

const scenes = ['hook', 'levl-carousel-2', 'levl-story-2-rank', 'levl-story-3-laps', 'levl-story-4-log', 'end'];
const lens = vo.map((v) => Math.ceil(v.sec * FPS) + PAD);
const starts = lens.map((_, i) => lens.slice(0, i).reduce((a, b) => a + b, 0));
export const reelFrames = lens.reduce((a, b) => a + b, 0) + 30;

const Sky: React.FC = () => <AbsoluteFill style={{ background: 'linear-gradient(180deg,#86ccff 0,#e6f5ff 45%,#fbeacb 100%)' }} />;

const Title: React.FC<{ children: React.ReactNode; size?: number; delay?: number }> = ({ children, size = 120, delay = 0 }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: f - delay, fps, config: { damping: 12, mass: 0.6 } });
  return (
    <div style={{ fontFamily: 'Levl Display', fontSize: size, lineHeight: 1.02, color: '#fff', textAlign: 'center', WebkitTextStroke: `14px ${INK}`, paintOrder: 'stroke fill', textShadow: `0 10px 0 ${INK}`, transform: `scale(${s})`, opacity: s }}>{children}</div>
  );
};

const Hook: React.FC = () => {
  const f = useCurrentFrame();
  const shake = f > 45 ? Math.sin(f * 1.3) * interpolate(f, [45, 60], [6, 0], { extrapolateRight: 'clamp' }) : 0;
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ background: '#e9e4da' }} />
      <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', gap: 70, padding: 80 }}>
        <Title size={140}>You lift.<br />You run.</Title>
        <div style={{ transform: `translateX(${shake}px)`, opacity: f > 40 ? 1 : 0 }}>
          <div style={{ fontFamily: 'Levl Body', fontWeight: 800, fontSize: 56, color: INK, textAlign: 'center', marginBottom: 28 }}>And then? Nothing happens.</div>
          <div style={{ width: 760, height: 44, borderRadius: 22, background: '#cfc6b6', boxShadow: `inset 0 0 0 5px ${INK}` }} />
          <div style={{ fontFamily: 'Levl Body', fontWeight: 700, fontSize: 40, color: '#8a7d68', textAlign: 'center', marginTop: 18 }}>0 XP</div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

const Shot: React.FC<{ src: string; wide?: boolean; len: number }> = ({ src, wide, len }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({ frame: f, fps, config: { damping: 16 } });
  const zoom = interpolate(f, [0, len], [1, 1.07]);
  return (
    <AbsoluteFill>
      <Sky />
      <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', transform: `translateY(${(1 - enter) * 300}px) scale(${zoom})`, opacity: enter }}>
        <Img src={staticFile(`${src}.png`)} style={wide ? { width: 1080, borderRadius: 0 } : { width: 1080, height: 1920 }} />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

const XpPops: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <>
      {[0, 14, 28].map((d, i) => {
        const t = f - 10 - d;
        if (t < 0) return null;
        const y = interpolate(t, [0, 30], [0, -260], { extrapolateRight: 'clamp' });
        const o = interpolate(t, [0, 5, 24, 32], [0, 1, 1, 0], { extrapolateRight: 'clamp' });
        return <div key={i} style={{ position: 'absolute', left: 180 + i * 300, top: 1220 + y, opacity: o, fontFamily: 'Levl Display', fontSize: 110, color: '#ffd23f', WebkitTextStroke: `12px ${INK}`, paintOrder: 'stroke fill' }}>+5 XP</div>;
      })}
    </>
  );
};

const End: React.FC = () => (
  <AbsoluteFill>
    <Sky />
    <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', gap: 60 }}>
      <Title size={200}>Levl</Title>
      <Title size={96} delay={8}>Your workouts,<br />now a game.</Title>
      <Sequence from={30} layout="none">
        <div style={{ fontFamily: 'Levl Display', fontSize: 64, color: '#fff', background: 'linear-gradient(180deg,#86ea64,#2ba438)', boxShadow: '0 10px 0 #186a20', borderRadius: 36, padding: '26px 56px' }}>Free · link in bio</div>
      </Sequence>
    </AbsoluteFill>
  </AbsoluteFill>
);

const Caption: React.FC<{ text: string }> = ({ text }) => (
  <div style={{ position: 'absolute', left: 60, right: 60, bottom: 330, display: 'flex', justifyContent: 'center' }}>
    <div style={{ fontFamily: 'Levl Body', fontWeight: 800, fontSize: 46, lineHeight: 1.25, color: '#fff', background: 'rgba(46,31,12,.88)', borderRadius: 26, padding: '18px 30px', textAlign: 'center' }}>{text}</div>
  </div>
);

export const Reel: React.FC = () => (
  <AbsoluteFill style={{ background: '#fbeacb' }}>
    <style>{font}</style>
    {scenes.map((s, i) => (
      <Sequence key={s} from={starts[i]} durationInFrames={i === scenes.length - 1 ? lens[i] + 30 : lens[i]}>
        {s === 'hook' ? <Hook /> : s === 'end' ? <End /> : <Shot src={s} wide={s.includes('carousel')} len={lens[i]} />}
        {s === 'levl-carousel-2' && <XpPops />}
        {s !== 'hook' && s !== 'end' && <Caption text={vo[i].text.replace('In Level', 'In Levl')} />}
        <Audio src={staticFile(vo[i].file)} />
      </Sequence>
    ))}
  </AbsoluteFill>
);
