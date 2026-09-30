// The reward moments (level up, rank up, badge unlock) as plain data, and the
// pure rules for queueing them. No React here, so the order and the wording can
// be tested. The components live in components/celebrate.
import { describeMomentBadge } from './badgeDisplay';
import type { EarnedBadgeSummary } from './badges';
import { RANK_TITLES, rankForLevel, xpForLevel, xpIntoLevel } from './progress';
import type { Rank } from './progress';
import { GATE_RANK } from './rankRoad';

export type CelebrationEvent =
  | { kind: 'badge'; badge: EarnedBadgeSummary; replay?: boolean }
  | { kind: 'levelup'; from: number; to: number; rank: Rank; xpNow: number; replay?: boolean }
  /** fromRank is null for the very first rank, which nobody ranks up into. */
  | { kind: 'rankup'; fromRank: Rank | null; toRank: Rank; level: number; xpNow: number; /** the level before, for the old shield */ from?: number; replay?: boolean };

/** How long the Victory screen plays on its own before the moments start, unless someone taps sooner. */
export const VICTORY_HOLD_MS = 1800;

// Level ups and rank ups come first, then badges. A rank up already says the level.
const PRIORITY: Record<CelebrationEvent['kind'], number> = { rankup: 0, levelup: 1, badge: 2 };

export function eventKey(e: CelebrationEvent): string {
  const base = e.kind === 'badge' ? `badge-${e.badge.id}` : e.kind === 'levelup' ? `lvl-${e.to}` : `rank-${e.toRank}-${e.level}`;
  return e.replay ? `replay-${base}` : base;
}

/** Level ups and rank ups first, then badges. Events of one kind keep the order they came in. */
export function orderEvents(events: CelebrationEvent[]): CelebrationEvent[] {
  return events
    .map((e, i) => ({ e, i }))
    .sort((a, b) => PRIORITY[a.e.kind] - PRIORITY[b.e.kind] || a.i - b.i)
    .map((x) => x.e);
}

/**
 * The queue after new events arrive. The first one may be on screen already, so
 * it never moves. The rest are put in order, and an event that is already
 * waiting is not added twice.
 */
export function mergeQueue(queue: CelebrationEvent[], incoming: CelebrationEvent[]): CelebrationEvent[] {
  if (incoming.length === 0) return queue;
  const [head, ...rest] = queue;
  const seen = new Set(queue.map(eventKey));
  const fresh = incoming.filter((e) => {
    const k = eventKey(e);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
  if (fresh.length === 0) return queue;
  const tail = orderEvents([...rest, ...fresh]);
  return head ? [head, ...tail] : tail;
}

/** The rank up that took you to a rank gate, for replaying it from the Rank Road. */
export function rankMomentForGate(level: number): CelebrationEvent | null {
  const rank = GATE_RANK[level];
  if (!rank) return null;
  const before = level > 1 ? rankForLevel(level - 1) : null;
  return { kind: 'rankup', fromRank: before, toRank: rank, level, xpNow: xpForLevel(level), from: level > 1 ? level - 1 : undefined, replay: true };
}

export type MomentCopy = {
  /** What the dialog is called. */
  label: string;
  /** The big game title. */
  title: string;
  /** Everything on the moment as plain sentences, for screen readers. */
  announce: string;
};

const TAP = 'Tap to continue.';

export function momentCopy(e: CelebrationEvent): MomentCopy {
  if (e.kind === 'levelup') {
    const { current, needed } = xpIntoLevel(e.xpNow);
    const toGo = Math.max(0, needed - current);
    return { label: 'Level up', title: 'LEVEL UP!', announce: `Level up. You reached level ${e.to}. ${toGo} XP to level ${e.to + 1}. ${TAP}` };
  }
  if (e.kind === 'rankup') {
    return {
      label: 'Rank up',
      title: 'RANK UP!',
      announce: `Rank up. You are now a ${RANK_TITLES[e.toRank]}. Level ${e.level}, new title and profile frame. ${TAP}`,
    };
  }
  const b = describeMomentBadge(e.badge);
  return {
    label: 'New badge',
    title: 'NEW BADGE!',
    announce: `New badge. ${b.name}, ${b.ribbon}. ${b.what}.${!e.replay && b.xp > 0 ? ` Plus ${b.xp} XP.` : ''} ${TAP}`,
  };
}

/** What the person has already seen: the highest level ever reached, and every badge celebrated. It only grows. */
export type SeenMoments = { level: number; badgeIds: string[] };

/**
 * Drops the moments for things already seen. Deleting or editing a workout can
 * lower the level, and a later workout can climb back over it: that is not a new
 * level up. Nothing here ever creates a moment for a level that goes down.
 */
export function unseenEvents(events: CelebrationEvent[], seen: SeenMoments | null): CelebrationEvent[] {
  if (!seen) return events;
  return events.filter((e) => {
    if (e.kind === 'badge') return !seen.badgeIds.includes(e.badge.id);
    if (e.kind === 'levelup') return e.to > seen.level && e.to > e.from;
    return e.level > seen.level && (e.from === undefined || e.level > e.from);
  });
}

/** The record after a new snapshot: the level is the highest ever reached and the badges are a union, so it never shrinks. */
export function growSeen(prev: SeenMoments | null, level: number, badgeIds: string[]): SeenMoments {
  if (!prev) return { level, badgeIds };
  return { level: Math.max(prev.level, level), badgeIds: Array.from(new Set([...prev.badgeIds, ...badgeIds])) };
}
