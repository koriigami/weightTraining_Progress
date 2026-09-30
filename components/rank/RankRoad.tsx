'use client';

import { useEffect, useMemo, useRef } from 'react';
import { Lock, Star } from 'lucide-react';
import { RankShield } from '@/components/RankShield';
import { Chip } from '@/components/ui/Chip';
import { XpBar } from '@/components/ui/XpBar';
import { cn } from '@/components/ui/cn';
import { RANK_RETAP_EVENT } from '@/lib/rankRetap';
import { buildRoad, levelsWord } from '@/lib/rankRoad';
import type { GateRow, LevelRow, Road } from '@/lib/rankRoad';
import { RANK_TITLES } from '@/lib/progress';
import { LockedArt } from './BadgeArt';

const reducedMotion = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function GateCard({ row, road }: { row: GateRow; road: Road }) {
  const letter = row.rank;
  let body: React.ReactNode;
  if (row.state === 'past') {
    body = (
      <>
        <div className="wt-ru-k">Unlocked at level {row.level}</div>
        <div className="gt">{row.title}</div>
        <small>Title and {letter}-Rank profile frame</small>
      </>
    );
  } else if (row.state === 'current') {
    body = (
      <>
        <div className="wt-ru-k">Your rank · since level {row.level}</div>
        <div className="gt">{row.title}</div>
        {road.nextGate !== null ? (
          <>
            <XpBar thin value={row.rankProgress} label={`${row.rankProgress}% of the way to ${row.nextTitle}`} />
            <small>
              {levelsWord(row.nextLevelsToGo ?? 0)} to {row.nextTitle}
            </small>
          </>
        ) : (
          <small>The top rank</small>
        )}
      </>
    );
  } else if (row.state === 'next') {
    body = (
      <>
        <div className="wt-ru-k">Next rank · {levelsWord(row.levelsToGo)} to go</div>
        <div className="gt">{row.title}</div>
        <small>Unlocks the title and a {letter}-Rank profile frame</small>
        <XpBar thin value={row.rankProgress} label={`${row.rankProgress}% of the way to ${row.title}`} />
      </>
    );
  } else {
    body = (
      <>
        <div className="wt-ru-k">Rank gate · level {row.level}</div>
        <div className="gt">{row.title}</div>
        <small>Unlocks the title and a {letter}-Rank profile frame</small>
        <span className="wt-lockchip">
          <Lock size={12} aria-hidden="true" /> Reach level {row.level}
        </span>
      </>
    );
  }
  return (
    <div className="wt-gate-card">
      {body}
      {row.now && (
        <>
          <XpBar thin value={road.levelPct} label={`${road.into} of ${road.needed} XP to level ${road.level + 1}`} />
          <small>
            <span className="wt-now">Now</span> · {road.into} / {road.needed} XP to level {road.level + 1}
          </small>
        </>
      )}
    </div>
  );
}

/**
 * The Rank Road: level 32 at the top, down to level 1, with a rank gate at
 * levels 1, 5, 10, 15, 20 and 30. It opens with your level centered, and the
 * "Next rank" chip above the road scrolls to the next gate (it sits in the flow,
 * so it never covers a gate card). Locked shields stay visible with a padlock.
 * Tapping a locked gate opens a preview, and an unlocked one replays its rank up.
 */
export function RankRoad({ xp, onPreview }: { xp: number; onPreview: (gate: GateRow) => void }) {
  const road = useMemo(() => buildRoad(xp), [xp]);
  const curRef = useRef<HTMLLIElement>(null);
  const nextRef = useRef<HTMLLIElement>(null);

  // Open on your level. A second pass once fonts and layout have settled.
  useEffect(() => {
    const center = () => curRef.current?.scrollIntoView({ block: 'center' });
    center();
    const id = requestAnimationFrame(() => requestAnimationFrame(center));
    return () => cancelAnimationFrame(id);
  }, []);

  // Tapping the Rank tab again brings you back to your level.
  useEffect(() => {
    const back = () => curRef.current?.scrollIntoView({ block: 'center', behavior: reducedMotion() ? 'auto' : 'smooth' });
    window.addEventListener(RANK_RETAP_EVENT, back);
    return () => window.removeEventListener(RANK_RETAP_EVENT, back);
  }, []);

  const nextGate = road.rows.find((r): r is GateRow => r.kind === 'gate' && r.level === road.nextGate);

  function toNext() {
    nextRef.current?.scrollIntoView({ block: 'center', behavior: reducedMotion() ? 'auto' : 'smooth' });
  }

  return (
    <div className="wt-road-wrap">
      {nextGate && (
        <div className="wt-nextchip">
          <Chip icon={<Star size={14} aria-hidden="true" />} onClick={toNext}>
            Next rank: {nextGate.title} at level {nextGate.level}
          </Chip>
        </div>
      )}
      <ol className="wt-road" aria-label="Rank Road, level 32 at the top">
        {road.rows.map((row) => {
          if (row.kind === 'level') return <LevelItem key={`l${row.level}`} row={row} road={road} liRef={row.state === 'now' ? curRef : undefined} />;
          return (
            <li
              key={`g${row.level}`}
              ref={row.now ? curRef : row.level === road.nextGate ? nextRef : undefined}
              className={cn('wt-road-row wt-gate', `g-${row.state}`, row.level < road.level && 'done', row.now && 'cur')}
              aria-current={row.now ? 'step' : undefined}
            >
              <button
                type="button"
                className="wt-node wt-gate-btn"
                onClick={() => onPreview(row)}
                aria-label={`${RANK_TITLES[row.rank]}, ${row.reached ? 'unlocked. Replay rank up' : 'locked. Preview'}`}
              >
                {row.reached ? (
                  <span className={row.now ? 'wt-pulse' : undefined}>
                    <RankShield rank={row.rank} size={54} />
                  </span>
                ) : (
                  <LockedArt>
                    <RankShield rank={row.rank} size={54} />
                  </LockedArt>
                )}
              </button>
              <GateCard row={row} road={road} />
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function LevelItem({ row, road, liRef }: { row: LevelRow; road: Road; liRef?: React.RefObject<HTMLLIElement | null> }) {
  const now = row.state === 'now';
  return (
    <li ref={liRef} className={cn('wt-road-row', row.state === 'done' && 'done', now && 'cur')} aria-current={now ? 'step' : undefined}>
      <span className="wt-node">
        {now ? (
          <span className="wt-pulse">
            <RankShield rank={road.rank} level={row.level} size={44} />
          </span>
        ) : (
          <span className="wt-dot">{row.level}</span>
        )}
      </span>
      <div className="wt-road-t">
        <b>Level {row.level}</b>
        <small>{row.xp.toLocaleString('en-US')} XP</small>
        {now && (
          <>
            <XpBar thin value={road.levelPct} label={`${road.into} of ${road.needed} XP to level ${row.level + 1}`} />
            <small>
              <span className="wt-now">Now</span> · {road.into} / {road.needed} XP to level {row.level + 1}
            </small>
          </>
        )}
      </div>
    </li>
  );
}
