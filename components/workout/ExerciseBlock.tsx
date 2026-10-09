'use client';

import { useLayoutEffect, useRef } from 'react';
import { ArrowUp, Check, Crown, EllipsisVertical } from 'lucide-react';
import type { ExerciseDef } from '@/data/exercises';
import { anim, springTo } from '@/lib/anim';
import { centreOf, stars } from '@/lib/fx';
import { SPRINGS } from '@/lib/motion';
import { buzz, play } from '@/lib/sound';
import type { Units } from '@/lib/setColumns';
import type { LoggedSet, SetPlan } from '@/lib/routines';
import type { SetPatch } from '@/lib/session';
import { Thumb } from '@/components/ui/Thumb';
import type { LiveMark } from '@/lib/workoutScoring';
import { CardioFields, CardioPill } from './CardioCard';
import type { CardioLapControls } from './CardioCard';
import { SetTable } from './SetTable';

export type BlockItem = { exerciseId: string; notes?: string; sets: (SetPlan & { done?: boolean; laps?: LoggedSet['laps'] })[] };

export type ExerciseBlockProps = {
  mode: 'editor' | 'log';
  exercise: ExerciseDef;
  item: BlockItem;
  units: Units;
  previous: string;
  onOpenExercise: () => void;
  onMenu: () => void;
  onNotes: (notes: string) => void;
  onUpdateSet: (setIndex: number, patch: SetPatch) => void;
  onAddSet: () => void;
  onRemoveSet: (setIndex: number) => void;
  onToggleSet?: (setIndex: number) => { done: boolean; xp: number } | null;
  /** Log only: the live "Beat last time" or "Record" chip. */
  mark?: LiveMark;
  /** Log only, distance cardio with one set: shows the roomy cardio card instead of the set table. */
  cardio?: { follow: boolean; onChange: (patch: SetPatch) => void; laps?: CardioLapControls };
};

/** The gold Record or green Beat last time chip, with its XP. */
export function MarkChip({ mark }: { mark: Pick<LiveMark, 'kind' | 'xp'> }) {
  return mark.kind === 'record' ? (
    <span className="wt-mk rec" data-testid="mark-chip">
      <Crown size={14} aria-hidden="true" />
      Record +{mark.xp}
    </span>
  ) : (
    <span className="wt-mk" data-testid="mark-chip">
      <ArrowUp size={14} aria-hidden="true" />
      Beat last time +{mark.xp}
    </span>
  );
}

/**
 * One exercise as it is edited in a routine or logged in a workout: the name
 * (opens the exercise), the three-dot menu, a notes line, the set table and
 * Add set. The editor and the log share it.
 */
export function ExerciseBlock({ mode, exercise, item, units, previous, onOpenExercise, onMenu, onNotes, onUpdateSet, onAddSet, onRemoveSet, onToggleSet, mark, cardio }: ExerciseBlockProps) {
  const card = mode === 'log' && cardio && item.sets.length === 1 ? cardio : null;
  const block = useRef<HTMLElement>(null);
  const sweep = useRef<HTMLSpanElement>(null);
  const check = useRef<HTMLSpanElement>(null);
  const complete = mode === 'log' && item.sets.length > 0 && item.sets.every((x) => x.done);
  const wasComplete = useRef(complete);
  const markKind = mark?.kind;
  const wasMark = useRef(markKind);

  // Exercise complete: a gold light runs once round the card edge (600 ms) and the check pops onto the title.
  // The sound is played where the set is ticked (see toggleSet), so a screen opened on a finished exercise stays quiet.
  useLayoutEffect(() => {
    if (complete && !wasComplete.current) {
      void anim(sweep.current, [{ '--a': '0deg', opacity: 1 }, { '--a': '360deg', opacity: 1 }], { duration: 600, easing: 'linear' });
      void springTo(check.current, 0, 1, (v) => `scale(${v})`, SPRINGS.bouncy);
    }
    wasComplete.current = complete;
  }, [complete]);

  // Beat last time and a new record: the chip slams in from 220% (bouncy) and the card gives a 4 px jolt.
  // A record also bursts a ring of stars from its crown.
  useLayoutEffect(() => {
    if (markKind && markKind !== wasMark.current) {
      const chip = block.current?.querySelector<HTMLElement>('[data-testid="mark-chip"]');
      void springTo(chip, 2.2, 1, (v) => `scale(${v})`, SPRINGS.bouncy);
      void anim(block.current, [{ transform: 'translateY(0)' }, { transform: 'translateY(4px)' }, { transform: 'translateY(0)' }], { duration: 160, delay: 120, easing: 'linear' });
      if (markKind === 'record' && chip) setTimeout(() => stars(centreOf(chip), 16, '#ffd34d', 90), 120);
      play(markKind === 'record' ? 'record' : 'beat');
      buzz(markKind === 'record' ? 'success' : 'medium');
    }
    wasMark.current = markKind;
  }, [markKind]);

  return (
    <section ref={block} className="wt-exblock" aria-label={exercise.name}>
      {mode === 'log' && <span ref={sweep} className="wt-exsweep" aria-hidden="true" />}
      <div className="wt-eb-top">
        <Thumb exercise={exercise} size={40} />
        <button type="button" className="wt-eb-name" onClick={onOpenExercise}>
          {exercise.name}
          {complete && (
            <span ref={check} className="wt-exok" role="img" aria-label="All sets done">
              <Check size={14} strokeWidth={3.4} aria-hidden="true" />
            </span>
          )}
        </button>
        {card && <CardioPill set={item.sets[0]} onToggle={() => onToggleSet?.(0)} />}
        <button type="button" className="wt-iconbtn" aria-label={`More for ${exercise.name}`} aria-haspopup="dialog" onClick={onMenu}>
          <EllipsisVertical size={20} aria-hidden="true" />
        </button>
      </div>
      {card ? (
        <>
          <CardioFields exercise={exercise} set={item.sets[0]} units={units} follow={card.follow} previous={previous} onChange={card.onChange} laps={card.laps} />
          {mark && <MarkChip mark={mark} />}
        </>
      ) : (
        <>
          {mark && <MarkChip mark={mark} />}
          <input className="wt-notes-in" placeholder="Add notes here" aria-label={`Notes for ${exercise.name}`} maxLength={300} value={item.notes ?? ''} onChange={(e) => onNotes(e.target.value)} />
          <SetTable
            mode={mode}
            exercise={exercise}
            sets={item.sets}
            units={units}
            previous={previous}
            onUpdate={onUpdateSet}
            onRemove={onRemoveSet}
            onAdd={onAddSet}
            onToggle={onToggleSet}
          />
        </>
      )}
    </section>
  );
}
