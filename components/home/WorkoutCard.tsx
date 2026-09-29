'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { formatDateShort } from '@/lib/date';
import type { FeedItem } from '@/lib/feed';
import { fmtVolume } from '@/lib/units';
import type { WeightUnit } from '@/lib/units';
import { Avatar } from '@/components/ui/Avatar';
import { Card } from '@/components/ui/Card';
import { Tag } from '@/components/ui/Chip';
import { Thumb } from '@/components/ui/Thumb';

// "19:40" as "7:40 PM".
function clock(time: string): string {
  const [h, m] = time.split(':').map(Number);
  return new Date(2000, 0, 1, h, m).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

const SHOWN = 3;

/**
 * A workout in the feed: who, when, the title, time, volume, sets and XP, and the
 * first three exercises with thumbs. A day of the old 6-week plan looks the same,
 * tagged "6-week plan", with sets and XP only. Photos are not supported yet.
 */
export function WorkoutCard({ item, weight }: { item: FeedItem; weight: WeightUnit }) {
  const { data: auth } = useSession();
  const [open, setOpen] = useState(false);
  const name = auth?.user?.name || auth?.user?.email || 'You';
  const extra = item.exercises.length - SHOWN;
  const lines = open ? item.exercises : item.exercises.slice(0, SHOWN);

  return (
    <Card as="article" className="wt-wcard" aria-label={`${item.title}, ${formatDateShort(item.date)}`}>
      <div className="wt-wc-top">
        <Avatar name={name} image={auth?.user?.image} size="sm" />
        <div className="grow">
          <b>{name}</b>
          <small>
            {formatDateShort(item.date)}
            {item.time ? ` · ${clock(item.time)}` : ''}
          </small>
        </div>
        {item.kind === 'plan' && <Tag>6-week plan</Tag>}
      </div>
      <h3>{item.title}</h3>
      {item.notes && <p style={{ margin: 0 }}>{item.notes}</p>}
      <div className="wt-wc-stats">
        {item.minutes !== null && (
          <div className="wt-stat">
            <small>Time</small>
            <b>{item.minutes} min</b>
          </div>
        )}
        {item.volumeKg !== null && (
          <div className="wt-stat">
            <small>Volume</small>
            <b>{fmtVolume(item.volumeKg, weight)}</b>
          </div>
        )}
        <div className="wt-stat">
          <small>Sets</small>
          <b>{item.sets}</b>
        </div>
        <div className="wt-stat">
          <small>XP</small>
          <b className="wt-xpv">+{item.xp}</b>
        </div>
      </div>
      {item.exercises.length > 0 && (
        <div className="wt-wc-ex">
          {lines.map((e) => (
            <div key={e.key} className="wt-wc-line">
              {e.exercise ? <Thumb exercise={e.exercise} size={32} /> : <span className="wt-thumb" style={{ width: 32, height: 32 }} />}
              <span>
                {e.detail} {e.name}
              </span>
            </div>
          ))}
          {extra > 0 && (
            <button type="button" className="wt-textbtn sm" style={{ alignSelf: 'flex-start' }} aria-expanded={open} onClick={() => setOpen((o) => !o)}>
              {open ? 'Show fewer' : `See ${extra} more ${extra === 1 ? 'exercise' : 'exercises'}`}
            </button>
          )}
        </div>
      )}
    </Card>
  );
}
