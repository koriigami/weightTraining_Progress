'use client';

import { useEffect, useMemo, useState } from 'react';
import { useCelebration } from '@/components/celebrate/CelebrationProvider';
import { useProgress } from '@/components/ProgressProvider';
import { BadgeView } from '@/components/rank/BadgeView';
import type { BadgeViewData } from '@/components/rank/BadgeView';
import { BadgesPanel } from '@/components/rank/BadgesPanel';
import { RankRoad } from '@/components/rank/RankRoad';
import { Card } from '@/components/ui/Card';
import { PageHeader } from '@/components/ui/PageHeader';
import { Screen } from '@/components/ui/Screen';
import { Segmented } from '@/components/ui/Segmented';
import { buildBadgeCards, cardForBadge, cardToEarned } from '@/lib/badgeCards';
import type { BadgeCard } from '@/lib/badgeCards';
import { rankMomentForGate } from '@/lib/celebrations';
import { RANK_RETAP_EVENT } from '@/lib/rankRetap';
import type { EarnedBadgeSummary } from '@/lib/badges';
import { roadBadges } from '@/lib/rankRoad';
import type { GateRow } from '@/lib/rankRoad';
import { useDesktopLayout, useWideLayout } from '@/lib/useMediaQuery';
import { useToday } from '@/lib/useToday';

type Tab = 'road' | 'badges';

export default function RankPage() {
  const { progress, state } = useProgress();
  const celebration = useCelebration();
  const today = useToday();
  const desktop = useDesktopLayout();
  const wide = useWideLayout();
  const [tab, setTab] = useState<Tab>('road');
  const [view, setView] = useState<BadgeViewData | null>(null);
  // Tapping the Rank tab again shows the Road (the road itself scrolls to your level).
  useEffect(() => {
    const show = () => setTab('road');
    window.addEventListener(RANK_RETAP_EVENT, show);
    return () => window.removeEventListener(RANK_RETAP_EVENT, show);
  }, []);
  const cards = useMemo(() => buildBadgeCards(state, today), [state, today]);

  const onRoad = useMemo(() => roadBadges(state, today), [state, today]);

  // An unlocked rank replays its moment. A rank still ahead opens the badge view with its shield in stone.
  function openGate(g: GateRow) {
    const moment = g.reached ? rankMomentForGate(g.level) : null;
    if (moment) celebration.replay({ ...moment, xpNow: progress.xp });
    else setView({ kind: 'gate', row: g });
  }
  // Any badge opens the badge view; the view has the button that replays the unlock.
  function openBadge(c: BadgeCard) {
    setView({ kind: 'badge', card: c, earned: cardToEarned(c) });
  }
  function openRoadBadge(b: EarnedBadgeSummary) {
    const card = cardForBadge(cards, b);
    if (card) setView({ kind: 'badge', card, earned: b });
  }
  function replayBadge(b: EarnedBadgeSummary) {
    celebration.replay({ kind: 'badge', badge: b, level: progress.level, xpNow: progress.xp });
  }

  const road = <RankRoad xp={progress.xp} badges={onRoad} onGate={openGate} onBadge={openRoadBadge} />;
  const badges = <BadgesPanel cards={cards} today={today} onOpen={openBadge} />;

  const tabs = (
    <Segmented
      ariaLabel="Rank view"
      value={tab}
      onChange={setTab}
      options={[
        { value: 'road', label: 'Rank Road' },
        { value: 'badges', label: 'Badges' },
      ]}
    />
  );

  return (
    <Screen header={<PageHeader title="Rank" large collapse sub={desktop ? undefined : <div className="wt-ph-tabs">{tabs}</div>} />} aside={wide ? badges : undefined}>
      {wide ? (
        <Card className="wt-roadcard">{road}</Card>
      ) : (
        <>
          {desktop && tabs}
          {tab === 'road' ? road : badges}
        </>
      )}
      <BadgeView view={view} onClose={() => setView(null)} onReplay={replayBadge} />
    </Screen>
  );
}
