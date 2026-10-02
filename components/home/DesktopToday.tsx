'use client';

import Link from 'next/link';
import { History, Play, Plus } from 'lucide-react';
import { routineWeekLine } from '@/lib/todayCard';
import type { TodayModel } from '@/lib/todayCard';
import type { UpNextItem } from '@/lib/week';
import { ExerciseRows } from '@/components/routines/ExerciseRows';
import { useStartRoutine } from '@/components/routines/useStartRoutine';
import { useShell } from '@/components/nav/ShellContext';
import { Button } from '@/components/ui/Button';
import { Card, SectionLabel } from '@/components/ui/Card';
import { ComebackHint, DoneChip, DoneRows, ViewLink } from './TodayCard';

const SLOTS = 3;

/**
 * Desktop: "Today's workout" as a row of three cards. Ready is two routines and a
 * dashed "Something else". Done today turns finished workouts into green Done cards,
 * keeps "Something else", and fills what is left with routines still to do. After a
 * week with no training day a calm comeback hint sits under the heading.
 */
export function DesktopToday({ model, routines, hasRoutines, comeback = false }: { model: TodayModel; routines: UpNextItem[]; hasRoutines: boolean; comeback?: boolean }) {
  const start = useStartRoutine();
  const { openStart, openLog } = useShell();

  const routineCard = (it: UpNextItem) => (
    <Card key={it.routine.id} as="article" className="wt-upcard" aria-label={it.routine.title}>
      <h3>{it.routine.title}</h3>
      <small className="wt-upcard-meta">{routineWeekLine(it)}</small>
      <ExerciseRows items={it.routine.items} max={3} showMore={false} />
      <Button icon={<Play size={14} fill="currentColor" aria-hidden="true" />} aria-label={`Start ${it.routine.title}`} onClick={() => start(it.routine.id)}>
        Start
      </Button>
    </Card>
  );

  const other = (
    <Card key="other" as="article" className="wt-upcard empty" aria-label="Something else">
      <h3>Something else</h3>
      <small className="wt-upcard-meta">Another routine, cardio or a custom workout, or one you already did.</small>
      <div className="wt-upcard-btns">
        <Button variant="secondary" icon={<Plus size={16} aria-hidden="true" />} onClick={openStart}>
          Choose
        </Button>
        <Button variant="secondary" icon={<History size={16} aria-hidden="true" />} onClick={openLog}>
          Log workout
        </Button>
      </div>
    </Card>
  );

  if (model.kind === 'done') {
    const done = model.workouts.map((w) => (
      <Card key={w.id} as="article" className="wt-upcard done" aria-label={w.title}>
        <h3>
          {w.title} <DoneChip />
        </h3>
        <small className="wt-upcard-meta">{w.meta}</small>
        <DoneRows rows={w.rows} />
        <div className="wt-upcard-foot">
          <ViewLink id={w.id} title={w.title} />
        </div>
      </Card>
    ));
    const fill = routines.slice(0, Math.max(0, SLOTS - 1 - done.length)).map(routineCard);
    return (
      <>
        <SectionLabel right={<b className="wt-xpv">+{model.xp} XP</b>}>Done today</SectionLabel>
        {comeback && <ComebackHint />}
        <div className="wt-upnext">
          {done}
          {fill}
          {other}
        </div>
      </>
    );
  }

  return (
    <>
      <SectionLabel
        right={
          <Link href="/routines" className="wt-textbtn sm">
            All routines
          </Link>
        }
      >
        Today&apos;s workout
      </SectionLabel>
      {comeback && <ComebackHint />}
      <div className="wt-upnext">
        {routines.slice(0, SLOTS - 1).map(routineCard)}
        {!hasRoutines && (
          <Card className="wt-upcard" style={{ justifyContent: 'center' }}>
            <h3>No routines yet</h3>
            <small className="wt-upcard-meta">Build one, or start a custom workout and log as you go.</small>
            <Link href="/routine/new" className="wt-textbtn sm">
              Create routine
            </Link>
          </Card>
        )}
        {other}
      </div>
    </>
  );
}
