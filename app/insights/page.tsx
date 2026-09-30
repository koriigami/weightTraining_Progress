'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { Lock } from 'lucide-react';
import { BucketBars, RankBars, WeekBars } from '@/components/insights/InsightsCharts';
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

function Tile({ label, value, sub }: { label: string; value: string | null; sub: string }) {
  return (
    <div className="wt-ins-tile">
      <small>{label}</small>
      <b>{value ?? <Lock size={22} aria-label="Hidden, fewer than 5 people" />}</b>
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
          <p style={{ margin: 0, color: 'var(--muted)' }}>Insights appear once 5 people have joined.</p>
        </Card>
      </Screen>
    );
  }

  const top = (items: { people: number | null }[]) => Math.max(1, ...items.map((i) => i.people ?? 0));
  return (
    <Screen header={header}>
      <div className="wt-ins-tiles">
        <Tile label="People" value={num(d.people)} sub="joined" />
        <Tile label="Active this week" value={num(d.active)} sub={d.activePct === null ? 'fewer than 5 people' : `${d.activePct}% of people`} />
        <Tile label="Workouts a week" value={num(d.perWeek)} sub="per active person" />
        <Tile label="Days to D rank" value={num(d.daysToD)} sub="median" />
      </div>
      <div className="wt-ins-grid">
        <Card>
          <CardHead title="Active people each week" right={<small>logged at least 1 workout</small>} />
          <WeekBars weeks={d.weekly} />
        </Card>
        <Card>
          <CardHead title="From sign-in to habit" right={<small>people</small>} />
          <BucketBars items={d.funnel} max={top(d.funnel)} />
        </Card>
        <Card>
          <CardHead title="Days to reach each rank" right={<small>median</small>} />
          <RankBars items={d.ranks} />
        </Card>
        <Card>
          <CardHead title="How people train" right={<small>active people</small>} />
          <span className="wt-ins-eyebrow">Workouts a week</span>
          <BucketBars items={d.pace} max={top(d.pace)} />
          <span className="wt-ins-eyebrow">Mostly</span>
          <BucketBars items={d.mostly} max={top(d.mostly)} />
        </Card>
      </div>
      <div className="wt-ins-privacy">
        <Lock size={18} aria-hidden="true" />
        <span>Groups under 5 people show a lock instead of a number, so nobody can be picked out. Nothing on this page names a person or shows their sets.</span>
      </div>
    </Screen>
  );
}
