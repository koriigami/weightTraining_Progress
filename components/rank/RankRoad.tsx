'use client';

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Check, Lock, Star } from 'lucide-react';
import { BadgeImage } from '@/components/art3d/BadgeImage';
import { ChestImage } from '@/components/art3d/ChestImage';
import { RankShield } from '@/components/RankShield';
import { Chip } from '@/components/ui/Chip';
import { cn } from '@/components/ui/cn';
import type { EarnedBadgeSummary } from '@/lib/badges';
import { RANK_RETAP_EVENT } from '@/lib/rankRetap';
import { buildRoad, chestLine, gateWhere, nextRankText, visibleMedals } from '@/lib/rankRoad';
import type { GateRow, LevelRow, Road, RowBadges } from '@/lib/rankRoad';
import { earnedBadgeArt } from '@/lib/rewardStage';
import { RANK_TITLES } from '@/lib/progress';
import { LockedArt } from './BadgeArt';

const reducedMotion = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** The small medals on a row: what you earned there, each with a tick. Tapping one opens its badge view. */
function Medals({ list, max, onBadge }: { list: EarnedBadgeSummary[]; max: number; onBadge: (b: EarnedBadgeSummary) => void }) {
  if (list.length === 0) return null;
  const { shown, more } = visibleMedals(list, max);
  return (
    <div className="wt-meds">
      {shown.map((b) => {
        const art = earnedBadgeArt(b);
        return (
          <button key={b.id} type="button" className="wt-mw" onClick={() => onBadge(b)} aria-label={`${art.label}, earned. Open`} data-badge={b.id}>
            <BadgeImage art={art} size={34} decorative />
            <i className="wt-tk" aria-hidden="true">
              <Check size={9} strokeWidth={4} />
            </i>
          </button>
        );
      })}
      {more > 0 && <span className="wt-more">+{more}</span>}
    </div>
  );
}

function GateCard({ row, onBadge }: { row: GateRow; onBadge: (b: EarnedBadgeSummary) => void }) {
  const where = gateWhere(row);
  return (
    <div className="wt-gate-card">
      <div className="wt-gtop">
        <div className="wt-gtext">
          <div className="gt">{row.rank} rank</div>
          {where ? (
            <small>{where}</small>
          ) : (
            <span className="wt-lockchip">
              <Lock size={12} aria-hidden="true" /> Level {row.level}
            </span>
          )}
          <small className="wt-gc2">{chestLine(row)}</small>
        </div>
        <div className="wt-gchest">
          <ChestImage chest={row.chest} open={row.reached} size={92} />
          {row.reached && (
            <i className="wt-ok" aria-label="Chest opened" role="img">
              <Check size={12} strokeWidth={4} aria-hidden="true" />
            </i>
          )}
        </div>
      </div>
      <Medals list={row.badges} max={6} onBadge={onBadge} />
    </div>
  );
}

/**
 * The Rank Road: level 32 at the top, down to level 1, with a rank gate at
 * levels 1, 5, 10, 15, 20 and 30. It opens with your level centered, and the
 * "Next rank" chip above the road scrolls to the next gate (it sits in the flow,
 * so it never covers a gate card). Locked shields stay visible with a padlock.
 * The road's gold line fills from your shield toward the next level as you earn
 * XP. Tapping a gate or a medal calls back: the page decides what opens.
 */
export function RankRoad({ xp, badges, onGate, onBadge }: { xp: number; badges: RowBadges; onGate: (gate: GateRow) => void; onBadge: (b: EarnedBadgeSummary) => void }) {
  const road = useMemo(() => buildRoad(xp, badges), [xp, badges]);
  const olRef = useRef<HTMLOListElement>(null);
  const curRef = useRef<HTMLLIElement>(null);
  const nextRef = useRef<HTMLLIElement>(null);
  const [fill, setFill] = useState<{ top: number; height: number } | null>(null);

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

  // The fill runs from the top of your shield up toward the bottom of the next level's dot,
  // by how far you are through the level. Measured in layout, so it follows the real row heights.
  useLayoutEffect(() => {
    const ol = olRef.current;
    const cur = curRef.current;
    const up = cur?.previousElementSibling;
    if (!ol || !cur || !up) {
      setFill(null);
      return;
    }
    const measure = () => {
      const rr = ol.getBoundingClientRect();
      const k = rr.height / ol.offsetHeight || 1;
      const edge = (li: Element, side: 'top' | 'bottom') => {
        const node = li.querySelector('.wt-node > *');
        if (!node) return 0;
        const r = node.getBoundingClientRect();
        return ((side === 'top' ? r.top : r.bottom) - rr.top) / k;
      };
      const from = edge(cur, 'top');
      const to = edge(up, 'bottom');
      const h = Math.max(0, (from - to) * (road.levelPct / 100));
      setFill((f) => (f && Math.abs(f.top - (from - h)) < 0.5 && Math.abs(f.height - h) < 0.5 ? f : { top: from - h, height: h }));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(ol);
    window.addEventListener('resize', measure);
    void document.fonts?.ready.then(measure);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [road]);

  const nextGate = road.rows.find((r): r is GateRow => r.kind === 'gate' && r.level === road.nextGate);
  const nextText = nextRankText(road);

  function toNext() {
    nextRef.current?.scrollIntoView({ block: 'center', behavior: reducedMotion() ? 'auto' : 'smooth' });
  }

  return (
    <div className="wt-road-wrap">
      {nextGate && nextText && (
        <div className="wt-nextchip">
          <Chip icon={<Star size={14} aria-hidden="true" />} onClick={toNext}>
            {nextText}
          </Chip>
        </div>
      )}
      <ol ref={olRef} className="wt-road" aria-label="Rank Road, level 32 at the top">
        {road.rows.map((row) => {
          if (row.kind === 'level') return <LevelItem key={`l${row.level}`} row={row} road={road} liRef={row.state === 'now' ? curRef : undefined} onBadge={onBadge} />;
          return (
            <li
              key={`g${row.level}`}
              ref={row.now ? curRef : row.level === road.nextGate ? nextRef : undefined}
              className={cn('wt-road-row wt-gate', `g-${row.state}`, `r-${row.rank}`, row.level < road.level && 'done', row.now && 'cur')}
              aria-current={row.now ? 'step' : undefined}
            >
              <button
                type="button"
                className="wt-node wt-gate-btn"
                onClick={() => onGate(row)}
                aria-label={`${RANK_TITLES[row.rank]}, ${row.reached ? 'unlocked. Replay rank up' : 'locked. See what it takes'}`}
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
              <GateCard row={row} onBadge={onBadge} />
            </li>
          );
        })}
        {fill && <i className="wt-fillnow" style={{ top: fill.top, height: fill.height }} aria-hidden="true" />}
      </ol>
    </div>
  );
}

function LevelItem({ row, road, liRef, onBadge }: { row: LevelRow; road: Road; liRef?: React.RefObject<HTMLLIElement | null>; onBadge: (b: EarnedBadgeSummary) => void }) {
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
        {now ? <small className="wt-now">You are here</small> : <small>{row.state === 'done' ? 'Cleared' : `${row.xpToGo.toLocaleString('en-US')} XP to go`}</small>}
        <Medals list={row.badges} max={5} onBadge={onBadge} />
      </div>
    </li>
  );
}
