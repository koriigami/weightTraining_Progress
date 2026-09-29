'use client';

import { daysBetween, lastDayOfMonth } from '@/lib/date';
import { SectionLabel } from '@/components/ui/Card';
import { XpBar } from '@/components/ui/XpBar';
import { cn } from '@/components/ui/cn';
import type { BadgeCard, BadgeCards } from '@/lib/badgeCards';
import { BadgeArt, LockedArt } from './BadgeArt';
import type { Preview } from './PreviewModal';

/** The preview dialog for a badge: full colour, Unlocked or Locked, and what it takes. */
export function badgePreview(card: BadgeCard): Preview {
  return {
    title: card.name,
    unlocked: card.earned,
    art: <BadgeArt art={card.art} size={120} />,
    body: card.hint,
    ladder: card.ladder,
  };
}

/** A badge as a game card: medal, tier name, progress bar and "x of y". Locked ones stay visible, muted, with a padlock. */
function BadgeCardButton({ card, extra, onOpen }: { card: BadgeCard; extra?: string; onOpen: (card: BadgeCard) => void }) {
  const art = <BadgeArt art={card.art} size={64} decorative />;
  return (
    <button type="button" className={cn('wt-bcard', !card.earned && 'locked')} onClick={() => onOpen(card)} data-badge={card.id}>
      {card.earned ? art : <LockedArt>{art}</LockedArt>}
      <b>{card.name}</b>
      <small>
        {card.tierName} · {card.what}
      </small>
      <XpBar thin value={card.pct} label={`${card.name}: ${card.progressText}`} />
      <small>
        {card.progressText}
        {extra}
      </small>
    </button>
  );
}

function Grid({ cards, onOpen, extra }: { cards: BadgeCard[]; onOpen: (card: BadgeCard) => void; extra?: (card: BadgeCard) => string | undefined }) {
  return (
    <div className="wt-bgrid">
      {cards.map((c) => (
        <BadgeCardButton key={c.id} card={c} extra={extra?.(c)} onOpen={onOpen} />
      ))}
    </div>
  );
}

/**
 * Every badge, earned or not: the new workout families, the lifetime badges from
 * the 6-week plan, this month's badges, the trophy case of earned monthly
 * badges, and the milestones.
 */
export function BadgesPanel({ cards, today, onOpen }: { cards: BadgeCards; today: string; onOpen: (card: BadgeCard) => void }) {
  const daysLeft = Math.max(0, daysBetween(today, lastDayOfMonth(today)));
  return (
    <div className="wt-badges">
      <p className="wt-badges-hint">Tap an earned badge to watch it unlock again. Locked badges stay visible: tap one to see what it takes.</p>

      <SectionLabel>Workouts</SectionLabel>
      <Grid cards={cards.workouts} onOpen={onOpen} />

      <SectionLabel>Lifetime</SectionLabel>
      <Grid cards={cards.lifetime} onOpen={onOpen} />

      {cards.month.cards.length > 0 && (
        <>
          <SectionLabel>This month</SectionLabel>
          <p className="wt-badges-hint" style={{ marginTop: -6 }}>
            {cards.month.label}
          </p>
          <Grid cards={cards.month.cards} onOpen={onOpen} extra={(c) => (c.earned ? undefined : ` · ${daysLeft} ${daysLeft === 1 ? 'day' : 'days'} left`)} />
        </>
      )}

      {cards.trophies.length > 0 && (
        <>
          <SectionLabel>Trophy case</SectionLabel>
          <div className="wt-trophies">
            {cards.trophies.map((c) => (
              <button key={c.id} type="button" className="wt-trophy" onClick={() => onOpen(c)} data-badge={c.id}>
                <BadgeArt art={c.art} size={72} decorative />
                <small>{c.name}</small>
              </button>
            ))}
          </div>
        </>
      )}

      <SectionLabel>Milestones</SectionLabel>
      <Grid cards={cards.milestones} onOpen={onOpen} />
    </div>
  );
}
