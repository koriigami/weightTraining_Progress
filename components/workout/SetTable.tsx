'use client';

import { useEffect, useState } from 'react';
import { Check, Plus, X } from 'lucide-react';
import type { ExerciseDef } from '@/data/exercises';
import { displayValue, liveHeader, liveValue, parseTyped, patchFor, setColumns } from '@/lib/setColumns';
import type { SetColumn, Units } from '@/lib/setColumns';
import type { SetPlan } from '@/lib/routines';
import type { SetPatch } from '@/lib/session';
import { anim, springTo } from '@/lib/anim';
import { centreOf, coinFly, ring } from '@/lib/fx';
import { DUR, EASE, SPRINGS } from '@/lib/motion';
import { Button } from '@/components/ui/Button';
import { cn } from '@/components/ui/cn';

/**
 * One number box. It keeps what is being typed ("7." is fine), and only stores a
 * number when the text is one. An outside change (a replaced exercise, another
 * unit) updates the box, but typing never fights the stored value.
 */
export function NumberCell({ column, set, units, label, onCommit, className = 'wt-cell', id }: { column: SetColumn; set: SetPlan; units: Units; label: string; onCommit: (patch: SetPatch) => void; className?: string; id?: string }) {
  const shown = displayValue(column, set, units);
  const [text, setText] = useState(shown);
  const stored = set[column.key];

  useEffect(() => {
    const typed = parseTyped(text);
    if (typed === null) return;
    if (patchFor(column, typed, units)[column.key] !== stored) setText(shown);
    // Only an outside change of the stored value or the unit should reset the text.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stored, units.weight, units.distance]);

  return (
    <input
      id={id}
      className={className}
      inputMode="decimal"
      autoComplete="off"
      maxLength={7}
      placeholder="0"
      aria-label={label}
      value={text}
      onFocus={(e) => e.target.select()}
      onChange={(e) => {
        const next = e.target.value;
        const typed = parseTyped(next);
        // A lone "." is a number in the making. Anything else that is not a number is ignored.
        if (typed === null && next.trim() !== '.') return;
        setText(next);
        if (typed !== null) onCommit(patchFor(column, typed, units));
      }}
      onBlur={() => setText(shown)}
    />
  );
}

export type SetTableProps = {
  mode: 'editor' | 'log';
  exercise: ExerciseDef;
  sets: (SetPlan & { done?: boolean })[];
  units: Units;
  /** The previous best, already formatted. Shown in the log's Previous column. */
  previous: string;
  onUpdate: (setIndex: number, patch: SetPatch) => void;
  onRemove: (setIndex: number) => void;
  onAdd: () => void;
  /** Log only. Returns the result of ticking, for the XP pop. */
  onToggle?: (setIndex: number) => { done: boolean; xp: number } | null;
};

// Ticking a set: the tick stamps from 135% (bouncy), an ink ring spreads, and a coin flies
// to the XP tile. Unticking is the reverse and softer: the tick dips to 85% and back.
function tickFx(tick: HTMLElement, done: boolean, xp: number) {
  if (!done) {
    void anim(tick, [{ transform: 'scale(1)' }, { transform: 'scale(.85)' }, { transform: 'scale(1)' }], { duration: DUR.quick, easing: EASE.out });
    return;
  }
  void springTo(tick, 1.35, 1, (v) => `scale(${v})`, SPRINGS.bouncy);
  ring(centreOf(tick), '#2ba438', 10, 34, 350, 4);
  const tile = xp > 0 ? document.querySelector<HTMLElement>('[data-testid="xp-stat"]') : null;
  if (tile && tile.getClientRects().length > 0) coinFly(tick, tile, () => void springTo(tile, 1.3, 1, (v) => `scale(${v})`, SPRINGS.bouncy));
}

function SetRow({ index, mode, exercise, set, units, previous, cols, template, canRemove, onUpdate, onRemove, onToggle }: {
  index: number;
  mode: 'editor' | 'log';
  exercise: ExerciseDef;
  set: SetPlan & { done?: boolean };
  units: Units;
  previous: string;
  cols: SetColumn[];
  template: string;
  canRemove: boolean;
  onUpdate: SetTableProps['onUpdate'];
  onRemove: SetTableProps['onRemove'];
  onToggle?: SetTableProps['onToggle'];
}) {
  const [pop, setPop] = useState<{ id: number; xp: number } | null>(null);
  const log = mode === 'log';
  const done = Boolean(set.done);
  const n = index + 1;

  return (
    <div className={cn('wt-srow', done && 'done')} style={{ gridTemplateColumns: template }} role="group" aria-label={`Set ${n}`}>
      <span className="wt-setno" aria-hidden="true">
        {n}
      </span>
      {log && <span className="wt-prev">{liveValue(exercise.metric, set, previous, units)}</span>}
      {cols.map((c) => (
        <NumberCell key={c.key} column={c} set={set} units={units} label={`Set ${n} ${c.label}`} onCommit={(patch) => onUpdate(index, patch)} />
      ))}
      {log && (
        <button
          type="button"
          className="wt-tick"
          aria-pressed={done}
          aria-label={`Set ${n} done`}
          onClick={(e) => {
            const r = onToggle?.(index);
            if (r) tickFx(e.currentTarget, r.done, r.xp);
            if (r?.done && r.xp > 0) setPop({ id: Date.now(), xp: r.xp });
          }}
        >
          <Check size={18} aria-hidden="true" />
        </button>
      )}
      {canRemove ? (
        <button type="button" className="wt-rmset" aria-label={`Remove set ${n}`} onClick={() => onRemove(index)}>
          <X size={16} aria-hidden="true" />
        </button>
      ) : (
        <span />
      )}
      {pop && (
        <span key={pop.id} className="wt-pop" data-testid="xp-pop" onAnimationEnd={() => setPop(null)}>
          +{pop.xp} XP
        </span>
      )}
    </div>
  );
}

/**
 * The sets of one exercise. The editor has the set number and the number boxes.
 * The log adds the previous best (or a live pace for distance cardio, or the
 * round length for intervals) and the tick, and pops "+5 XP" when a set is ticked.
 */
export function SetTable({ mode, exercise, sets, units, previous, onUpdate, onRemove, onAdd, onToggle }: SetTableProps) {
  const cols = setColumns(exercise.metric, units);
  const log = mode === 'log';
  const fields = cols.map(() => 'minmax(0, 1fr)').join(' ');
  const template = log ? `32px minmax(0, 1.2fr) ${fields} 42px 30px` : `40px ${fields} 30px`;

  return (
    <>
      <div className="wt-settbl">
        <div className="wt-srow hdr" style={{ gridTemplateColumns: template }} aria-hidden="true">
          <span>Set</span>
          {log && <span>{liveHeader(exercise.metric)}</span>}
          {cols.map((c) => (
            <span key={c.key}>{c.label}</span>
          ))}
          {log && (
            <span>
              <Check size={16} style={{ verticalAlign: 'middle' }} />
            </span>
          )}
          <span />
        </div>
        {sets.map((s, j) => (
          <SetRow
            key={j}
            index={j}
            mode={mode}
            exercise={exercise}
            set={s}
            units={units}
            previous={previous}
            cols={cols}
            template={template}
            canRemove={sets.length > 1}
            onUpdate={onUpdate}
            onRemove={onRemove}
            onToggle={onToggle}
          />
        ))}
      </div>
      <Button variant="tertiary" size="sm" block icon={<Plus size={16} aria-hidden="true" />} onClick={onAdd}>
        Add set
      </Button>
    </>
  );
}
