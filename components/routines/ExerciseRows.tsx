'use client';

import type { RoutineItem } from '@/lib/routines';
import { setsSummary } from '@/lib/routineSummary';
import { useProgress } from '@/components/ProgressProvider';
import { Thumb } from '@/components/ui/Thumb';

/**
 * Every exercise of a routine as a row: thumb, name and "3 × 10 · 5 kg". After
 * `max` rows a "+N more" row stands in for the rest, so cards stay a sane height
 * (`showMore` false leaves it out, for a card that only previews the first few).
 */
export function ExerciseRows({ items, max = 6, showMore = true }: { items: RoutineItem[]; max?: number; showMore?: boolean }) {
  const { lookup, prefs } = useProgress();
  const shown = items.slice(0, max);
  const more = items.length - shown.length;
  return (
    <ul className="wt-rrows" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
      {shown.map((item) => {
        const e = lookup(item.exerciseId);
        if (!e) return null;
        return (
          <li key={item.exerciseId} className="wt-rrow">
            <Thumb exercise={e} size={30} />
            <span className="rn" title={e.name}>
              {e.name}
            </span>
            <span className="rs">{setsSummary(e.metric, item.sets, prefs.units)}</span>
          </li>
        );
      })}
      {showMore && more > 0 && <li className="wt-rrow more">+{more} more</li>}
    </ul>
  );
}
