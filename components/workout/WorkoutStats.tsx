'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, Info } from 'lucide-react';
import type { DailyBonusLive, LiveXp, StatTile } from '@/lib/liveStats';
import { cn } from '@/components/ui/cn';

function XpValue({ xp }: { xp: number }) {
  const prev = useRef(xp);
  const [bump, setBump] = useState(0);
  useEffect(() => {
    if (xp > prev.current) setBump((n) => n + 1);
    prev.current = xp;
  }, [xp]);
  return (
    <b key={bump} className={cn('wt-xpv', bump > 0 && 'wt-bump')} data-testid="xp-stat">
      +{xp}
    </b>
  );
}

const POP_W = 288;

/** "XP so far": where the XP came from, and how far today is towards the daily bonus. Opens from the info icon on the XP tile. */
function XpPopover({ anchor, parts, bonus, onClose }: { anchor: HTMLElement; parts: LiveXp; bonus: DailyBonusLive; onClose: () => void }) {
  const id = useId();
  const ref = useRef<HTMLDivElement>(null);
  const rect = anchor.getBoundingClientRect();
  const left = Math.max(12, Math.min(rect.right - POP_W, window.innerWidth - POP_W - 12));
  const rows: [string, number][] = [
    ['Sets ticked', parts.sets],
    ['Records and beat last time', parts.marks],
    ['Cardio', parts.cardio],
  ];

  useEffect(() => {
    ref.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };
    document.addEventListener('keydown', onKey, true);
    return () => document.removeEventListener('keydown', onKey, true);
  }, [onClose]);

  return createPortal(
    <>
      <button type="button" tabIndex={-1} className="wt-xppop-scrim" aria-label="Close" onClick={onClose} />
      <div ref={ref} tabIndex={-1} className="wt-xppop" role="dialog" aria-labelledby={id} style={{ top: rect.bottom + 8, left, width: POP_W }} data-testid="xp-popover">
        <b id={id} className="wt-xppop-h">
          XP so far
        </b>
        {rows.map(([label, value]) => (
          <div key={label} className="wt-xppop-row">
            <span>{label}</span>
            <b>+{value}</b>
          </div>
        ))}
        {bonus.state === 'earned' ? (
          <div className="wt-xppop-day">
            <span className="wt-mk">
              <Check size={14} aria-hidden="true" />
              {bonus.text}
            </span>
          </div>
        ) : (
          <div className="wt-xppop-row day">
            <span>Daily bonus</span>
            <span>{bonus.text}</span>
          </div>
        )}
        <button type="button" className="wt-textbtn sm" onClick={onClose}>
          Got it
        </button>
      </div>
    </>,
    document.body
  );
}

/**
 * The live stats of a workout in progress. The tiles fit what is being logged
 * (see statTiles) and the last one is always XP, with an info icon that opens the
 * "XP so far" popover. `side` is the two-by-two version for the desktop Summary card.
 */
export function WorkoutStats({ tiles, xp, parts, bonus, side }: { tiles: StatTile[]; xp: number; parts: LiveXp; bonus: DailyBonusLive; side?: boolean }) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  return (
    <div className={cn('wt-logstats', side && 'side')} data-testid="log-stats">
      {tiles.map((t) => (
        <div key={t.key} className="wt-stat">
          <small>{t.label}</small>
          <b style={t.key === 'duration' || t.key === 'time' ? { color: 'var(--link)' } : undefined}>{t.value}</b>
        </div>
      ))}
      <div className="wt-stat">
        <small>
          XP
          <button
            type="button"
            className="wt-infobtn"
            aria-label="How XP adds up"
            aria-haspopup="dialog"
            aria-expanded={anchor !== null}
            onClick={(e) => {
              const el = e.currentTarget;
              setAnchor((cur) => (cur ? null : el));
            }}
          >
            <Info size={14} aria-hidden="true" />
          </button>
        </small>
        <XpValue xp={xp} />
      </div>
      {anchor && <XpPopover anchor={anchor} parts={parts} bonus={bonus} onClose={() => setAnchor(null)} />}
    </div>
  );
}
