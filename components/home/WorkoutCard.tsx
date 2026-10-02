'use client';

import Link from 'next/link';
import { ChevronRight, ClipboardList } from 'lucide-react';
import { formatWhen } from '@/lib/date';
import { feedTiles } from '@/lib/feed';
import { feltPhrase } from '@/lib/feel';
import type { FeedItem } from '@/lib/feed';
import type { Units } from '@/lib/setColumns';
import { FeelFace } from '@/components/ui/FeelFace';
import { Thumb } from '@/components/ui/Thumb';

const SHOWN = 3;

// "2026-10-10" and "19:40" as the one app-wide format, "Sat 10 Oct · 7:40 pm".
function whenOf(item: FeedItem): string {
  return formatWhen(item.time ? `${item.date}T${item.time}` : item.date);
}

/**
 * A workout in a list (Home, Profile, Calendar): the whole card is one link to the
 * workout page. It shows the date, the title, the routine it came from, how many
 * exercises were added to it, how it felt (a small face by the title), the stats and the first three exercises. The rest are
 * counted ("+2 more"), since a link cannot hold a button.
 */
export function WorkoutCard({ item, units }: { item: FeedItem; units: Units }) {
  const extra = item.exercises.length - SHOWN;
  const tiles = feedTiles(item, units);
  return (
    <Link href={`/workout/view?id=${encodeURIComponent(item.id)}`} className="wt-card wt-wcard" aria-label={`Open ${item.title}, ${whenOf(item)}`}>
      <div className="wt-wc-top">
        <span className="grow">{whenOf(item)}</span>
        <ChevronRight size={18} aria-hidden="true" />
      </div>
      <div className="wt-wctitle">
        <h3>{item.title}</h3>
        {item.feel && <FeelFace feel={item.feel} size={26} label={feltPhrase(item.feel)} />}
      </div>
      {(item.routine || item.added > 0) && (
        <div className="wt-metaline">
          {item.routine && (
            <span className="wt-rchip">
              <ClipboardList size={13} aria-hidden="true" />
              <span>{item.routine}</span>
            </span>
          )}
          {item.added > 0 && <span className="wt-addtag">+{item.added} added</span>}
        </div>
      )}
      {item.notes && <p style={{ margin: 0 }}>{item.notes}</p>}
      <div className="wt-wc-stats">
        {tiles.map((t) => (
          <div key={t.key} className="wt-stat">
            <small>{t.label}</small>
            <b>{t.value}</b>
          </div>
        ))}
        <div className="wt-stat">
          <small>XP</small>
          <b className="wt-xpv">+{item.xp}</b>
        </div>
      </div>
      {item.exercises.length > 0 && (
        <div className="wt-wc-ex">
          {item.exercises.slice(0, SHOWN).map((e) => (
            <div key={e.key} className="wt-wc-line">
              {e.exercise ? <Thumb exercise={e.exercise} size={32} /> : <span className="wt-thumb" style={{ width: 32, height: 32 }} />}
              <span>{e.line}</span>
              {e.custom && <span className="wt-custag">Custom</span>}
              {e.added && <span className="wt-addtag">Added</span>}
            </div>
          ))}
          {extra > 0 && <span className="wt-wc-more">+{extra} more {extra === 1 ? 'exercise' : 'exercises'}</span>}
        </div>
      )}
    </Link>
  );
}
