'use client';

import { useEffect, useMemo, useState } from 'react';
import { useCelebration } from '@/components/celebrate/CelebrationProvider';
import { useProgress } from '@/components/ProgressProvider';
import { RankShield } from '@/components/RankShield';
import { BadgesPanel, badgePreview } from '@/components/rank/BadgesPanel';
import { PreviewModal } from '@/components/rank/PreviewModal';
import type { Preview } from '@/components/rank/PreviewModal';
import { RankRoad } from '@/components/rank/RankRoad';
import { Card } from '@/components/ui/Card';
import { PageHeader } from '@/components/ui/PageHeader';
import { Screen } from '@/components/ui/Screen';
import { Segmented } from '@/components/ui/Segmented';
import { buildBadgeCards, cardToEarned } from '@/lib/badgeCards';
import type { BadgeCard } from '@/lib/badgeCards';
import { rankMomentForGate } from '@/lib/celebrations';
import { RANK_RETAP_EVENT } from '@/lib/rankRetap';
import { gatePreview } from '@/lib/rankRoad';
import type { GateRow } from '@/lib/rankRoad';
import { useDesktopLayout, useWideLayout } from '@/lib/useMediaQuery';
import { useToday } from '@/lib/useToday';

type Tab = 'road' | 'badges';

function gateToPreview(gate: GateRow): Preview {
  const p = gatePreview(gate);
  const shield = <RankShield rank={gate.rank} size={120} />;
  return { title: p.title, unlocked: p.unlocked, art: shield, body: p.body };
}

export default function RankPage() {
  const { progress, state } = useProgress();
  const celebration = useCelebration();
  const today = useToday();
  const desktop = useDesktopLayout();
  const wide = useWideLayout();
  const [tab, setTab] = useState<Tab>('road');
  const [preview, setPreview] = useState<Preview | null>(null);
  // Tapping the Rank tab again shows the Road (the road itself scrolls to your level).
  useEffect(() => {
    const show = () => setTab('road');
    window.addEventListener(RANK_RETAP_EVENT, show);
    return () => window.removeEventListener(RANK_RETAP_EVENT, show);
  }, []);
  const cards = useMemo(() => buildBadgeCards(state, today), [state, today]);

  // An unlocked rank or an earned badge replays its moment. Anything still locked opens the preview.
  function openGate(g: GateRow) {
    const moment = g.reached ? rankMomentForGate(g.level) : null;
    if (moment) celebration.replay(moment);
    else setPreview(gateToPreview(g));
  }
  function openBadge(c: BadgeCard) {
    const earned = cardToEarned(c);
    if (earned) celebration.replay({ kind: 'badge', badge: earned });
    else setPreview(badgePreview(c));
  }

  const road = <RankRoad xp={progress.xp} onPreview={openGate} />;
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
      <PreviewModal preview={preview} onClose={() => setPreview(null)} />
    </Screen>
  );
}
