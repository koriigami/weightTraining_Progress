'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { HeroLevel } from '@/components/HeroLevel';
import { WeekCard } from '@/components/home/WeekCard';
import { UpNextCard, UpNextRow } from '@/components/home/UpNext';
import { WorkoutCard } from '@/components/home/WorkoutCard';
import { useShell } from '@/components/nav/ShellContext';
import { useProgress } from '@/components/ProgressProvider';
import { Button } from '@/components/ui/Button';
import { Card, SectionLabel } from '@/components/ui/Card';
import { PageHeader } from '@/components/ui/PageHeader';
import { Screen } from '@/components/ui/Screen';
import { hasPlanDays } from '@/lib/badgeCards';
import { buildFeed } from '@/lib/feed';
import { useDesktopLayout } from '@/lib/useMediaQuery';
import { useToday } from '@/lib/useToday';
import { upNextRoutines, weekSummary } from '@/lib/week';

const PAGE = 10;

export default function HomePage() {
  const { state, routines, workouts, lookup, prefs } = useProgress();
  const { openStart } = useShell();
  const desktop = useDesktopLayout();
  const today = useToday();
  const [shown, setShown] = useState(PAGE);

  const week = useMemo(() => weekSummary(state, today), [state, today]);
  const upNext = useMemo(() => upNextRoutines(routines, workouts, today, 2), [routines, workouts, today]);
  const feed = useMemo(() => buildFeed(state, lookup), [state, lookup]);

  const feedBlock = (
    <>
      <SectionLabel>Recent workouts</SectionLabel>
      {feed.length === 0 ? (
        <Card tone="dashed" className="text-center">
          <p style={{ margin: 0, color: 'var(--muted)' }}>No workouts yet. Start a routine or an empty workout, and it shows up here.</p>
        </Card>
      ) : (
        <div className="wt-feed">
          {feed.slice(0, shown).map((item) => (
            <WorkoutCard key={item.id} item={item} weight={prefs.units.weight} />
          ))}
        </div>
      )}
      {feed.length > shown && (
        <Button variant="secondary" block onClick={() => setShown((n) => n + PAGE)}>
          Show more workouts
        </Button>
      )}
      {/* Only for someone with days logged on the original plan. Everyone can still reach it from Calendar. */}
      {hasPlanDays(state) && (
        <Link href="/calendar/plan" className="wt-textbtn" style={{ alignSelf: 'flex-start' }}>
          Open the 6-week plan calendar
        </Link>
      )}
    </>
  );

  if (desktop) {
    return (
      <Screen header={<PageHeader title="Home" large />}>
        <div className="wt-homegrid">
          <HeroLevel />
          <WeekCard week={week} />
        </div>
        <SectionLabel>Up next</SectionLabel>
        <UpNextRow items={upNext.items} allDone={upNext.allDone} hasRoutines={routines.length > 0} onSomethingElse={openStart} />
        {feedBlock}
      </Screen>
    );
  }

  return (
    <Screen header={<PageHeader title="Home" large />}>
      <HeroLevel />
      <WeekCard week={week} />
      <UpNextCard items={upNext.items} allDone={upNext.allDone} hasRoutines={routines.length > 0} />
      {feedBlock}
    </Screen>
  );
}
