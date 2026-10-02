'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { Lock } from 'lucide-react';
import { BucketBars, CountBars, HBar, RankBars, WeekBars } from '@/components/insights/InsightsCharts';
import { Card, CardHead } from '@/components/ui/Card';
import { PageHeader } from '@/components/ui/PageHeader';
import { Screen } from '@/components/ui/Screen';
import { Segmented } from '@/components/ui/Segmented';
import type { InsightsRange, InsightsResult } from '@/lib/insights';

const RANGE_OPTIONS: { value: InsightsRange; label: string }[] = [
  { value: '4w', label: '4 weeks' },
  { value: '12w', label: '12 weeks' },
  { value: 'all', label: 'All time' },
];

type Load = { state: 'loading' } | { state: 'missing' } | { state: 'error' } | { state: 'ready'; data: InsightsResult };

const num = (n: number | null, suffix = '') => (n === null ? null : `${n}${suffix}`);

function Tile({ label, value, sub, min }: { label: string; value: string | null; sub: string; min: number }) {
  return (
    <div className="wt-ins-tile">
      <small>{label}</small>
      <b>{value ?? <Lock size={22} aria-label={`Hidden, fewer than ${min} people`} />}</b>
      <span>{sub}</span>
    </div>
  );
}

function NotFound() {
  return (
    <Screen header={<PageHeader title="Not found" narrow />} narrow>
      <Card tone="dashed" className="text-center">
        <p style={{ margin: 0, color: 'var(--muted)' }}>There is nothing at this address.</p>
      </Card>
    </Screen>
  );
}

// Static like every page: the numbers come from GET /api/insights, which answers 404 to anyone but the owner.
export default function InsightsPage() {
  const { data: auth, status } = useSession();
  const owner = Boolean(auth?.user?.isOwner);
  const [range, setRange] = useState<InsightsRange>('12w');
  const [load, setLoad] = useState<Load>({ state: 'loading' });

  useEffect(() => {
    if (status !== 'authenticated' || !owner) return;
    let live = true;
    setLoad({ state: 'loading' });
    fetch(`/api/insights?range=${range}`, { cache: 'no-store' })
      .then(async (res) => {
        if (!live) return;
        if (res.status === 404) setLoad({ state: 'missing' });
        else if (!res.ok) setLoad({ state: 'error' });
        else setLoad({ state: 'ready', data: (await res.json()) as InsightsResult });
      })
      .catch(() => live && setLoad({ state: 'error' }));
    return () => {
      live = false;
    };
  }, [range, status, owner]);

  if (status === 'loading') return null;
  if (!owner || load.state === 'missing') return <NotFound />;

  const range$ = <Segmented size="sm" ariaLabel="Range" options={RANGE_OPTIONS} value={range} onChange={setRange} />;
  const header = <PageHeader title="Insights" back="/settings" actions={range$} />;

  if (load.state === 'loading') {
    return (
      <Screen header={header}>
        <p role="status" style={{ color: 'var(--muted)' }}>
          Loading
        </p>
      </Screen>
    );
  }
  if (load.state === 'error') {
    return (
      <Screen header={header}>
        <Card tone="dashed" className="text-center">
          <p style={{ margin: 0, color: 'var(--muted)' }}>Could not load Insights. Try again in a moment.</p>
        </Card>
      </Screen>
    );
  }

  const d = load.data;
  if (!d.enough) {
    return (
      <Screen header={header}>
        <Card tone="dashed" className="text-center">
          <p style={{ margin: 0, color: 'var(--muted)' }}>{d.min === 1 ? 'Insights appear once the first person has signed in.' : `Insights appear once ${d.min} people have joined.`}</p>
        </Card>
      </Screen>
    );
  }

  const min = d.min;
  const top = (items: { people: number | null }[]) => Math.max(1, ...items.map((i) => i.people ?? 0));
  return (
    <Screen header={header}>
      <div className="wt-ins-tiles">
        <Tile min={min} label="People" value={num(d.people)} sub="joined" />
        <Tile min={min} label="Active this week" value={num(d.active)} sub={d.activePct === null ? `fewer than ${min} people` : `${d.activePct}% of people`} />
        <Tile min={min} label="Workouts a week" value={num(d.perWeek)} sub="per active person" />
        <Tile min={min} label="Days to D rank" value={num(d.daysToD)} sub="median" />
      </div>
      <div className="wt-ins-grid">
        <Card>
          <CardHead title="Active people each week" right={<small>logged at least 1 workout</small>} />
          <WeekBars weeks={d.weekly} min={min} />
        </Card>
        <Card>
          <CardHead title="Activation" right={<small>people</small>} />
          <BucketBars items={d.funnel} max={top(d.funnel)} min={min} />
        </Card>
        <Card>
          <CardHead title="Days to reach each rank" right={<small>median</small>} />
          <RankBars items={d.ranks} min={min} />
        </Card>
        <Card>
          <CardHead title="How people train" right={<small>active people</small>} />
          <span className="wt-ins-eyebrow">Workouts a week</span>
          <BucketBars items={d.pace} max={top(d.pace)} min={min} />
          <span className="wt-ins-eyebrow">Mostly</span>
          <BucketBars items={d.mostly} max={top(d.mostly)} min={min} />
        </Card>
        <Card>
          <CardHead title="Last workout" right={<small>everyone</small>} />
          <BucketBars items={d.lastWorkout} max={top(d.lastWorkout)} min={min} />
        </Card>
        <Card>
          <CardHead title="How workouts were made" right={<small>workouts in range</small>} />
          <CountBars items={d.made} min={min} />
        </Card>
        <Card className="wt-ins-wide">
          <CardHead title="Invites" right={<small>people</small>} />
          <HBar label="Invited" value={d.invites.invited} max={Math.max(1, d.invites.invited)} min={min} />
          <HBar label="Have signed in" value={d.invites.signedIn} max={Math.max(1, d.invites.invited)} min={min} />
        </Card>
      </div>
      <div className="wt-ins-privacy">
        <Lock size={18} aria-hidden="true" />
        <span>
          {min === 1
            ? 'Small groups are shown while Levl is invite-only. No names, sets or weights.'
            : `Groups under ${min} people show a lock instead of a number, so nobody can be picked out. Nothing on this page names a person or shows their sets.`}
        </span>
      </div>
    </Screen>
  );
}
