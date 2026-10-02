'use client';

import { Suspense, useMemo, useState } from 'react';
import { HeroLevel } from '@/components/HeroLevel';
import { HomeIntro } from '@/components/home/HomeIntro';
import { WeekCard } from '@/components/home/WeekCard';
import { DesktopToday } from '@/components/home/DesktopToday';
import { ResourceBar } from '@/components/home/ResourceBar';
import { RulesNote } from '@/components/home/RulesNote';
import { TodayCard } from '@/components/home/TodayCard';
import { WorkoutCard } from '@/components/home/WorkoutCard';
import { useProgress } from '@/components/ProgressProvider';
import { Button } from '@/components/ui/Button';
import { Card, SectionLabel } from '@/components/ui/Card';
import { PageHeader } from '@/components/ui/PageHeader';
import { Screen } from '@/components/ui/Screen';
import { buildFeed } from '@/lib/feed';
import { useDesktopLayout } from '@/lib/useMediaQuery';
import { useToday } from '@/lib/useToday';
import { routinesDue, todayModel } from '@/lib/todayCard';
import { weekSummary } from '@/lib/week';

const PAGE = 10;

export default function HomePage() {
  const { state, routines, workouts, lookup, prefs } = useProgress();
  const desktop = useDesktopLayout();
  const today = useToday();
  const [shown, setShown] = useState(PAGE);

  const week = useMemo(() => weekSummary(state, today), [state, today]);
  const model = useMemo(() => todayModel(state, today, prefs.units), [state, today, prefs.units]);
  const due = useMemo(() => routinesDue(routines, workouts, today, 2), [routines, workouts, today]);
  const feed = useMemo(() => buildFeed(state, lookup), [state, lookup]);

  const feedBlock = (
    <>
      <SectionLabel>Recent workouts</SectionLabel>
      {feed.length === 0 ? (
        <Card tone="dashed" className="text-center">
          <p style={{ margin: 0, color: 'var(--muted)' }}>No workouts yet. Start a routine or a custom workout, and it shows up here.</p>
        </Card>
      ) : (
        <div className="wt-feed">
          {feed.slice(0, shown).map((item) => (
            <WorkoutCard key={item.id} item={item} units={prefs.units} />
          ))}
        </div>
      )}
      {feed.length > shown && (
        <Button variant="secondary" block onClick={() => setShown((n) => n + PAGE)}>
          Show more workouts
        </Button>
      )}
    </>
  );

  // After the screen on both layouts, in the same place, so a window resize does not restart it.
  const intro = (
    <Suspense fallback={null}>
      <HomeIntro />
    </Suspense>
  );

  if (desktop) {
    return (
      <>
        <Screen header={<PageHeader title="Home" large />}>
          <RulesNote />
          <div className="wt-homegrid">
            <HeroLevel />
            <WeekCard week={week} />
          </div>
          <DesktopToday model={model} routines={due} hasRoutines={routines.length > 0} comeback={week.comeback} />
          {feedBlock}
        </Screen>
        {intro}
      </>
    );
  }

  return (
    <>
      <Screen header={<ResourceBar week={week} />}>
        <RulesNote />
        <TodayCard model={model} comeback={week.comeback} />
        <WeekCard week={week} />
        {feedBlock}
      </Screen>
      {intro}
    </>
  );
}
