'use client';

import Link from 'next/link';
import { Play, Plus } from 'lucide-react';
import { formatDateShort } from '@/lib/date';
import type { UpNextItem } from '@/lib/week';
import { ExerciseRows } from '@/components/routines/ExerciseRows';
import { useShell } from '@/components/nav/ShellContext';
import { useStartRoutine } from '@/components/routines/useStartRoutine';
import { Button } from '@/components/ui/Button';
import { Card, CardHead } from '@/components/ui/Card';

/** "4 exercises · 0 of 1 this week", or when it was last done for a routine with no weekly count. */
function line(item: UpNextItem): string {
  const n = item.routine.items.length;
  const base = `${n} ${n === 1 ? 'exercise' : 'exercises'}`;
  if (item.target !== null) return `${base} · ${item.done} of ${item.target} this week`;
  return item.lastDate ? `${base} · last done ${formatDateShort(item.lastDate)}` : base;
}

const NOTHING_YET = "No routines yet. Build one, or start a custom workout and log as you go.";
const ALL_DONE = "Every routine has reached its weekly count. Nice work. Start something else if you want more.";

/** Phone: the Up next card with a Start button per routine and Custom workout. */
export function UpNextCard({ items, allDone, hasRoutines }: { items: UpNextItem[]; allDone: boolean; hasRoutines: boolean }) {
  const start = useStartRoutine();
  const { openCustom } = useShell();
  return (
    <Card aria-label="Up next">
      <CardHead
        title="Up next"
        right={
          <Link href="/routines" className="wt-textbtn sm">
            All routines
          </Link>
        }
      />
      <div className="wt-sugg">
        {items.map((it) => (
          <div key={it.routine.id} className="wt-sugg-row">
            <div className="grow">
              <b>{it.routine.title}</b>
              <small>{line(it)}</small>
            </div>
            <Button size="sm" aria-label={`Start ${it.routine.title}`} icon={<Play size={14} fill="currentColor" aria-hidden="true" />} onClick={() => start(it.routine.id)}>
              Start
            </Button>
          </div>
        ))}
        {items.length === 0 && <p style={{ margin: 0, color: 'var(--muted)' }}>{hasRoutines ? (allDone ? ALL_DONE : '') : NOTHING_YET}</p>}
      </div>
      <Button variant="secondary" block icon={<Plus size={18} aria-hidden="true" />} onClick={openCustom}>
        Custom workout
      </Button>
    </Card>
  );
}

/** Desktop: a row of routine cards, then a "Something else?" card. */
export function UpNextRow({ items, allDone, hasRoutines, onSomethingElse }: { items: UpNextItem[]; allDone: boolean; hasRoutines: boolean; onSomethingElse: () => void }) {
  const start = useStartRoutine();
  return (
    <div className="wt-upnext">
      {items.map((it) => (
        <Card key={it.routine.id} as="article" className="wt-upcard" aria-label={it.routine.title}>
          <h3>{it.routine.title}</h3>
          <small style={{ color: 'var(--muted)' }}>{line(it)}</small>
          <ExerciseRows items={it.routine.items} max={3} />
          <Button icon={<Play size={14} fill="currentColor" aria-hidden="true" />} aria-label={`Start ${it.routine.title}`} onClick={() => start(it.routine.id)}>
            Start
          </Button>
        </Card>
      ))}
      {items.length === 0 && (
        <Card className="wt-upcard" style={{ gridColumn: 'span 2', justifyContent: 'center' }}>
          <h3>{hasRoutines && allDone ? 'All done this week' : 'No routines yet'}</h3>
          <p style={{ margin: 0, color: 'var(--muted)' }}>{hasRoutines ? ALL_DONE : NOTHING_YET}</p>
        </Card>
      )}
      <Card className="wt-upcard empty">
        <b className="gt" style={{ fontSize: 20 }}>
          Something else?
        </b>
        <small style={{ color: 'var(--muted)' }}>Start a custom workout, pick another routine, or log some cardio.</small>
        <Button variant="secondary" icon={<Play size={16} fill="currentColor" aria-hidden="true" />} onClick={onSomethingElse}>
          Start
        </Button>
      </Card>
    </div>
  );
}
