'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { SlidersHorizontal } from 'lucide-react';
import { WorkoutCard } from '@/components/home/WorkoutCard';
import { GoalsSection } from '@/components/goals/GoalsSection';
import { MonthStrip } from '@/components/profile/MonthStrip';
import { ProfileHeader } from '@/components/profile/ProfileHeader';
import { StatsSection } from '@/components/profile/StatsSection';
import { WeightCard } from '@/components/profile/WeightCard';
import { useProgress } from '@/components/ProgressProvider';
import { Button, ButtonLink } from '@/components/ui/Button';
import { Card, SectionLabel } from '@/components/ui/Card';
import { PageHeader } from '@/components/ui/PageHeader';
import { Screen } from '@/components/ui/Screen';
import { buildFeed } from '@/lib/feed';
import { profileTiles } from '@/lib/profileStats';
import { useWideLayout } from '@/lib/useMediaQuery';
import { useToday } from '@/lib/useToday';
import { weekSummary } from '@/lib/week';

const PAGE = 10;

/** Your workouts, newest first. */
function WorkoutsFeed() {
  const { state, lookup, prefs } = useProgress();
  const [shown, setShown] = useState(PAGE);
  const feed = useMemo(() => buildFeed(state, lookup), [state, lookup]);
  return (
    <section aria-label="Workouts" className="wt-stack">
      <SectionLabel>Workouts</SectionLabel>
      {feed.length === 0 ? (
        <Card tone="dashed" className="text-center">
          <p style={{ margin: 0, color: 'var(--muted)' }}>No workouts yet. Finish one and it shows up here.</p>
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
    </section>
  );
}

export default function ProfilePage() {
  const { state, progress } = useProgress();
  const today = useToday();
  const wide = useWideLayout();
  const streak = useMemo(() => weekSummary(state, today).streak, [state, today]);
  const workouts = useMemo(() => profileTiles(state, today).workouts, [state, today]);

  const header = <ProfileHeader rank={progress.rank} level={progress.level} workouts={workouts} weekStreak={streak} />;
  const actions = (
    <>
      <Link href="/settings" className="wt-backbtn md:hidden" aria-label="Settings">
        <SlidersHorizontal size={20} aria-hidden="true" />
      </Link>
      <ButtonLink href="/settings" variant="secondary" className="hidden md:inline-flex" icon={<SlidersHorizontal size={18} aria-hidden="true" />}>
        Settings
      </ButtonLink>
    </>
  );

  // Wide: header, Stats and Workouts on the left, and Goals, Weight and This month in a
  // sticky column on the right. Otherwise everything runs in one column, in that order.
  if (wide) {
    return (
      <Screen header={<PageHeader title="Profile" large actions={actions} />} aside={<><GoalsSection /><WeightCard /><MonthStrip /></>}>
        {header}
        <StatsSection />
        <WorkoutsFeed />
      </Screen>
    );
  }
  return (
    <Screen header={<PageHeader title="Profile" large actions={actions} />}>
      {header}
      <StatsSection />
      <GoalsSection />
      <WeightCard />
      <MonthStrip />
      <WorkoutsFeed />
    </Screen>
  );
}
