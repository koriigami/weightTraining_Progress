// Feed posts, 1080 x 1350, made with the same pieces as the reels.
// Post A, pillar 2 (save-worthy training): a 3-slide carousel, "The busy week split".
// Post B, pillar 3 (the comeback): one image, "Took a month off? Your level waited."
// XP follows the rules: 5 XP a set, +50 daily bonus at 20 minutes, +50 weekly goal
// bonus for the first week in a row, growing by 10 a week to 100.
import React from 'react';
import { AbsoluteFill } from 'remotion';
import { BODY, C, DISPLAY, Display, Fonts, Sky, Tag } from '../brand';
import { Card, DayTile, HunterCard, Logo, XpChip } from '../ui';

const Frame: React.FC<{ children: React.ReactNode; page?: string }> = ({ children, page }) => (
  <AbsoluteFill style={{ background: C.cream }}>
    <Fonts />
    <Sky drift={0} />
    <div style={{ position: 'absolute', top: 56, left: 0, right: 0, display: 'flex', justifyContent: 'center' }}>
      <Logo size={86} />
    </div>
    {page && <div style={{ position: 'absolute', top: 72, right: 60, fontFamily: BODY, fontWeight: 800, fontSize: 34, color: C.muted, background: C.surface, borderRadius: 999, padding: '6px 22px', border: `3px solid ${C.line}` }}>{page}</div>}
    {children}
  </AbsoluteFill>
);

const Col: React.FC<{ top: number; gap?: number; children: React.ReactNode }> = ({ top, gap = 30, children }) => (
  <div style={{ position: 'absolute', top, left: 60, right: 60, display: 'flex', flexDirection: 'column', alignItems: 'center', gap }}>{children}</div>
);

const DAYS: { name: string; ex: [string, string][] }[] = [
  { name: 'Day A', ex: [['Squat (Barbell)', '3 × 8'], ['Bench Press (Dumbbell)', '3 × 10'], ['Bent Over Row (Dumbbell)', '3 × 10'], ['Lateral Raise (Dumbbell)', '2 × 12']] },
  { name: 'Day B', ex: [['Romanian Deadlift (Barbell)', '3 × 10'], ['Shoulder Press (Dumbbell)', '3 × 10'], ['Lat Pulldown (Cable)', '3 × 12'], ['Hammer Curl (Dumbbell)', '2 × 12']] },
  { name: 'Day C', ex: [['Goblet Squat (Dumbbell)', '3 × 12'], ['Incline Bench Press (Dumbbell)', '3 × 10'], ['Seated Row (Cable)', '3 × 12'], ['Triceps Pushdown (Cable)', '2 × 12']] },
];

export const SplitCover: React.FC = () => (
  <Frame page="1/3">
    <Col top={250} gap={40}>
      <Tag>Save for your busy weeks</Tag>
      <Display size={150}>{'The busy\nweek split'}</Display>
      <div style={{ fontFamily: BODY, fontWeight: 700, fontSize: 48, color: C.ink, textAlign: 'center' }}>3 full-body days · 45 minutes each</div>
      <div style={{ display: 'flex', gap: 26, marginTop: 30 }}>
        {['A', 'B', 'C'].map((d) => (
          <div key={d} style={{ width: 230, height: 230, borderRadius: 50, background: `linear-gradient(180deg, ${C.p1}, ${C.p2})`, boxShadow: `0 14px 0 ${C.pBevel}`, display: 'grid', placeItems: 'center', fontFamily: DISPLAY, fontSize: 130, color: '#fff', WebkitTextStroke: `12px ${C.pBevel}`, paintOrder: 'stroke fill' }}>{d}</div>
        ))}
      </div>
      <div style={{ fontFamily: BODY, fontWeight: 700, fontSize: 40, color: C.muted, marginTop: 30 }}>Swipe for the workouts</div>
    </Col>
  </Frame>
);

export const SplitDays: React.FC = () => (
  <Frame page="2/3">
    <Col top={170} gap={18}>
      {DAYS.map((d) => (
        <Card key={d.name} style={{ width: 960, padding: '20px 40px 16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
            <div style={{ fontFamily: DISPLAY, fontSize: 52, color: C.ink }}>{d.name}</div>
            <div style={{ fontFamily: BODY, fontWeight: 700, fontSize: 32, color: C.muted }}>11 sets · 45 min</div>
          </div>
          {d.ex.map(([n, s]) => (
            <div key={n} style={{ display: 'flex', justifyContent: 'space-between', fontFamily: BODY, fontSize: 34, padding: '6px 0', borderTop: `3px solid ${C.line}` }}>
              <span style={{ fontWeight: 600, color: C.ink }}>{n}</span>
              <span style={{ fontWeight: 800, color: C.ink }}>{s}</span>
            </div>
          ))}
        </Card>
      ))}
      <div style={{ fontFamily: BODY, fontWeight: 700, fontSize: 34, color: C.muted, textAlign: 'center' }}>Rest 60 to 90 s between sets. Add weight when every set feels easy.</div>
    </Col>
  </Frame>
);

export const SplitXp: React.FC = () => (
  <Frame page="3/3">
    <Col top={230} gap={34}>
      <Display size={120}>{'Log it in Levl.\nWatch it add up.'}</Display>
      <Card style={{ width: 960, padding: '30px 50px', fontFamily: BODY, fontSize: 42, color: C.ink }}>
        {[
          ['11 sets', '5 XP a set', '+55'],
          ['Daily bonus', '20 minutes or more', '+50'],
        ].map(([w, s, x]) => (
          <div key={w} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 0', borderBottom: `3px solid ${C.line}` }}>
            <div>
              <div style={{ fontWeight: 600 }}>{w}</div>
              <div style={{ fontSize: 32, color: C.muted, fontWeight: 600 }}>{s}</div>
            </div>
            <div style={{ fontWeight: 800 }}>{x}</div>
          </div>
        ))}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 18 }}>
          <div style={{ fontWeight: 800 }}>Each day</div>
          <div style={{ fontFamily: DISPLAY, fontSize: 60, color: C.xpInk }}>+105 XP</div>
        </div>
      </Card>
      <XpChip xp={50} what="Weekly goal bonus for all 3 days" />
      <div style={{ fontFamily: BODY, fontWeight: 700, fontSize: 36, color: C.muted, textAlign: 'center' }}>The weekly bonus grows by 10 every week in a row, up to +100.</div>
      <Tag style={{ marginTop: 10 }}>Join the waitlist · link in bio</Tag>
    </Col>
  </Frame>
);

export const ComebackPost: React.FC = () => (
  <Frame>
    <Col top={210} gap={34}>
      <Display size={130}>{'Took a month off?'}</Display>
      <div style={{ fontFamily: BODY, fontWeight: 800, fontSize: 56, color: C.ink }}>Your level waited.</div>
      <div style={{ marginTop: 20 }}>
        <HunterCard rank="D" level={9} into={410} need={900} streak={0} days="1/3" />
      </div>
      <div style={{ display: 'flex', gap: 18, marginTop: 10 }}>
        {(['rest', 'rest', 'rest', 'rest', 'today', 'none', 'none'] as const).map((k, i) => (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
            <div style={{ fontFamily: BODY, fontWeight: 700, fontSize: 34, color: C.muted }}>{'MTWTFSS'[i]}</div>
            <DayTile kind={k} size={96} />
          </div>
        ))}
      </div>
      <div style={{ marginTop: 16 }}>
        <XpChip xp={25} what="Comeback bonus" big />
      </div>
      <div style={{ fontFamily: BODY, fontWeight: 700, fontSize: 38, color: C.muted, textAlign: 'center' }}>No XP lost for time away. Ever.</div>
    </Col>
  </Frame>
);
