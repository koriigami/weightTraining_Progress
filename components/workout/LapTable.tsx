'use client';

import { X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { cardioRate } from '@/lib/liveStats';
import { fastestLap, fmtLapTime, lapBars, lapRate, lapSummary, parseLapTime } from '@/lib/laps';
import type { Lap } from '@/lib/routines';
import { parseTyped } from '@/lib/setColumns';
import type { Units } from '@/lib/setColumns';
import type { LapPatch } from '@/lib/session';
import { distanceLabel, fmtDistance, fmtNumber, kmToUnit, unitToKm } from '@/lib/units';

type RunKind = 'run' | 'ride' | undefined;

/**
 * One box of a lap row. It keeps what is being typed ("1:3" on the way to "1:38")
 * and stores a value only when the text is one. An outside change (another lap
 * moving up after a remove, another unit) updates the box; typing never fights it.
 */
function LapInput({ stored, show, parse, allowed, placeholder, label, onCommit }: {
  stored: number | undefined;
  show: string;
  /** The stored number a text means: undefined for an empty box, null for text that is not one (yet). */
  parse: (text: string) => number | undefined | null;
  allowed: RegExp;
  placeholder: string;
  label: string;
  onCommit: (value: number | undefined) => void;
}) {
  const [text, setText] = useState(show);

  useEffect(() => {
    const typed = parse(text);
    if (typed === null) return;
    if ((typed ?? 0) !== (stored ?? 0)) setText(show);
    // Only an outside change of the stored value or the unit should reset the text.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stored, show]);

  return (
    <input
      className="wt-cell"
      autoComplete="off"
      enterKeyHint="done"
      maxLength={8}
      placeholder={placeholder}
      aria-label={label}
      value={text}
      onFocus={(e) => e.target.select()}
      onChange={(e) => {
        const next = e.target.value;
        if (!allowed.test(next)) return;
        setText(next);
        const typed = parse(next);
        if (typed !== null) onCommit(typed);
      }}
      onBlur={() => setText(show)}
    />
  );
}

const timeText = (sec: number): string => (sec >= 1 ? fmtLapTime(sec) : '');

/**
 * The laps of a run as a table: Lap, Time, Distance, Pace (Speed for a ride).
 * The fastest lap has a green row and a "Fastest" tag. With `onUpdate` and
 * `onRemove` the Time and Distance are boxes and each row has a remove button;
 * without them it is read only (the workout page). `running` adds the lap that
 * is still going as the last row, in green, with its time ticking.
 */
export function LapTable({ laps, units, kind, running, onUpdate, onRemove }: {
  laps: readonly Lap[];
  units: Units;
  kind: RunKind;
  running?: { sec: number; km?: number };
  onUpdate?: (lapIndex: number, patch: LapPatch) => void;
  onRemove?: (lapIndex: number) => void;
}) {
  const editable = Boolean(onUpdate && onRemove);
  const best = fastestLap(laps);
  const unit = units.distance;
  const rateLabel = cardioRate(kind, undefined, undefined).label;
  return (
    <table className={editable ? 'wt-laps ed' : 'wt-laps'}>
      <colgroup>
        <col className="n" />
        <col />
        <col />
        <col />
        {editable && <col className="x" />}
      </colgroup>
      <thead>
        <tr>
          <th scope="col">Lap</th>
          <th scope="col">Time</th>
          <th scope="col">{editable ? distanceLabel(unit) : 'Distance'}</th>
          <th scope="col">{rateLabel}</th>
          {editable && (
            <th scope="col">
              <span className="sr-only">Remove</span>
            </th>
          )}
        </tr>
      </thead>
      <tbody>
        {laps.map((lap, i) => {
          const n = i + 1;
          const rate = lapRate(kind, lap, unit);
          const isBest = best === i;
          return (
            <tr key={i} className={isBest ? 'best' : undefined}>
              <td className="n">{n}</td>
              <td>
                {editable ? (
                  <LapInput
                    stored={lap.sec}
                    show={timeText(lap.sec)}
                    parse={parseLapTime}
                    allowed={/^[\d:.,]*$/}
                    placeholder="0:00"
                    label={`Lap ${n} time`}
                    onCommit={(sec) => onUpdate?.(i, { sec })}
                  />
                ) : (
                  fmtLapTime(lap.sec)
                )}
              </td>
              <td>
                {editable ? (
                  <LapInput
                    stored={lap.km}
                    show={lap.km ? fmtNumber(kmToUnit(lap.km, unit)) : ''}
                    parse={(t) => {
                      const typed = parseTyped(t);
                      return typed === undefined || typed === null ? typed : unitToKm(typed, unit);
                    }}
                    allowed={/^[\d.,]*$/}
                    placeholder="-"
                    label={`Lap ${n} distance (${unit})`}
                    onCommit={(km) => onUpdate?.(i, { km })}
                  />
                ) : lap.km ? (
                  fmtDistance(lap.km, unit)
                ) : (
                  '-'
                )}
              </td>
              <td>
                {rate || (isBest ? '' : '-')}
                {isBest && <small className="fast">Fastest</small>}
              </td>
              {editable && (
                <td className="x">
                  <button type="button" className="wt-rmset" aria-label={`Remove lap ${n}`} onClick={() => onRemove?.(i)}>
                    <X size={16} aria-hidden="true" />
                  </button>
                </td>
              )}
            </tr>
          );
        })}
        {running && (
          <tr className="live" data-testid="lap-running">
            <td className="n">{laps.length + 1}</td>
            <td>{fmtLapTime(running.sec)}</td>
            <td>{running.km ? fmtNumber(kmToUnit(running.km, unit)) : '...'}</td>
            <td>running</td>
            {editable && <td className="x" />}
          </tr>
        )}
      </tbody>
    </table>
  );
}

/** One bar per lap, taller is faster, the fastest in green, with the lap numbers under them while there are few. */
export function LapBars({ laps }: { laps: readonly Lap[] }) {
  const heights = lapBars(laps);
  const best = fastestLap(laps);
  const gap = laps.length > 40 ? 1 : laps.length > 20 ? 3 : 5;
  return (
    <div>
      <div className="wt-lapbars" style={{ gap }} role="img" aria-label="Lap speed, taller is faster">
        {heights.map((h, i) => (
          <i key={i} className={best === i ? 'best' : undefined} style={{ height: `${Math.round(h * 100)}%` }} />
        ))}
      </div>
      {laps.length <= 12 && (
        <div className="wt-lapbars-lbl" style={{ gap }} aria-hidden="true">
          {laps.map((_, i) => (
            <span key={i}>{i + 1}</span>
          ))}
        </div>
      )}
    </div>
  );
}

/** The laps of a saved run on its workout page: the summary line, the bars and the table. */
export function RunLaps({ laps, units, kind }: { laps: readonly Lap[]; units: Units; kind: RunKind }) {
  return (
    <div className="wt-runlaps" data-testid="run-laps">
      <div className="wt-lapsum">{lapSummary(laps, kind, units.distance)}</div>
      {fastestLap(laps) !== null && <LapBars laps={laps} />}
      <LapTable laps={laps} units={units} kind={kind} />
    </div>
  );
}
