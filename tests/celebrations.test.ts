import { describe, expect, it } from 'vitest';
import { allEarnedBadges } from '../lib/badges';
import type { EarnedBadgeSummary } from '../lib/badges';
import { buildBadgeCards, cardToEarned } from '../lib/badgeCards';
import { contrastWithWhite, ribbonBackground } from '../lib/badgeColors';
import { describeMomentBadge } from '../lib/badgeDisplay';
import { VICTORY_HOLD_MS, eventKey, mergeQueue, momentCopy, orderEvents, rankMomentForGate } from '../lib/celebrations';
import type { CelebrationEvent } from '../lib/celebrations';
import { xpForLevel } from '../lib/progress';
import type { AppState } from '../lib/progress';
import legacy from './fixtures/legacyState.json';
import { stateWith, workout } from './helpers';

// Built from its code, so this file has no em dash in it.
const EM_DASH = String.fromCharCode(8212);

const badge = (id: string): CelebrationEvent => ({
  kind: 'badge',
  badge: { id: `special:${id}`, kind: 'special', badge: 'awakening', earnedAt: '2026-09-27' },
});
const badgeN = (n: number): CelebrationEvent => ({
  kind: 'badge',
  badge: { id: `lifetime:finisher:t${n}`, kind: 'lifetime', family: 'finisher', tier: 'bronze', earnedAt: '2026-09-27' },
});
const level = (to: number): CelebrationEvent => ({ kind: 'levelup', from: to - 1, to, rank: 'E', xpNow: xpForLevel(to) });
const rank = (): CelebrationEvent => ({ kind: 'rankup', fromRank: 'E', toRank: 'D', level: 5, xpNow: xpForLevel(5) });

describe('celebration queue', () => {
  it('plays level ups and rank ups before badges, and keeps each kind in the order it came', () => {
    const out = orderEvents([badgeN(1), badgeN(2), level(3), rank()]);
    expect(out.map((e) => e.kind)).toEqual(['rankup', 'levelup', 'badge', 'badge']);
    expect(out.filter((e) => e.kind === 'badge').map((e) => (e.kind === 'badge' ? e.badge.id : ''))).toEqual(['lifetime:finisher:t1', 'lifetime:finisher:t2']);
  });

  it('never moves the moment that is already on screen', () => {
    const q = mergeQueue([badgeN(1)], [level(3)]);
    expect(q.map((e) => e.kind)).toEqual(['badge', 'levelup']);
  });

  it('puts new level ups ahead of badges that are still waiting', () => {
    const q = mergeQueue([badgeN(1), badgeN(2)], [rank()]);
    expect(q.map((e) => e.kind)).toEqual(['badge', 'rankup', 'badge']);
  });

  it('does not queue the same moment twice', () => {
    const q = mergeQueue([level(3), badgeN(1)], [level(3), badgeN(1), badgeN(2)]);
    expect(q).toHaveLength(3);
    expect(mergeQueue([], [])).toEqual([]);
  });

  it('a replay is its own moment, even when the same badge is waiting', () => {
    const b = badgeN(1);
    const q = mergeQueue([b], [{ ...b, replay: true }]);
    expect(q).toHaveLength(2);
    expect(eventKey(q[1])).toBe(`replay-${eventKey(b)}`);
  });

  it('Victory holds the moments back for about 1.8 seconds', () => {
    expect(VICTORY_HOLD_MS).toBe(1800);
  });
});

describe('replaying a rank', () => {
  it('a gate replays the rank up that reached it', () => {
    expect(rankMomentForGate(5)).toEqual({ kind: 'rankup', fromRank: 'E', toRank: 'D', level: 5, xpNow: xpForLevel(5), from: 4, replay: true });
    expect(rankMomentForGate(30)).toMatchObject({ fromRank: 'A', toRank: 'S', level: 30 });
  });

  it('the first rank has nothing before it, and a level that is not a gate has no moment', () => {
    expect(rankMomentForGate(1)).toMatchObject({ fromRank: null, toRank: 'E', level: 1 });
    expect(rankMomentForGate(7)).toBeNull();
  });
});

describe('moment wording', () => {
  it('has a dialog label, a title and a sentence for screen readers, with no em dash', () => {
    for (const e of [level(6), rank(), badgeN(1), badge('awakening')]) {
      const c = momentCopy(e);
      expect(c.label.length).toBeGreaterThan(0);
      expect(c.title).toMatch(/!$/);
      expect(c.announce.endsWith('Tap to continue.')).toBe(true);
      expect(c.announce).not.toContain(EM_DASH);
    }
    expect(momentCopy(level(6)).title).toBe('LEVEL UP!');
    expect(momentCopy(rank()).title).toBe('RANK UP!');
    expect(momentCopy(badgeN(1)).title).toBe('NEW BADGE!');
  });

  it('a level up says the level and the XP to the next; a rank up says the new title', () => {
    expect(momentCopy(level(6)).announce).toBe('Level up. You reached level 6. 600 XP to level 7. Tap to continue.');
    expect(momentCopy(rank()).announce).toBe('Rank up. You are now a D-Rank Hunter. Level 5, new title and profile frame. Tap to continue.');
  });

  it('a badge says its name, tier and what it measures, and the XP only the first time', () => {
    const b: EarnedBadgeSummary = { id: 'lifetime:finisher:bronze', kind: 'lifetime', family: 'finisher', tier: 'bronze', earnedAt: '2026-09-27' };
    expect(momentCopy({ kind: 'badge', badge: b }).announce).toBe('New badge. Finisher, Bronze. Workouts finished: 1 workout. Plus 25 XP. Tap to continue.');
    expect(momentCopy({ kind: 'badge', badge: b, replay: true }).announce).toBe('New badge. Finisher, Bronze. Workouts finished: 1 workout. Tap to continue.');
  });
});

describe('badge medal for the unlock moment', () => {
  it('a lifetime tier: the tier ribbon and medal colours, the threshold in words', () => {
    const m = describeMomentBadge({ id: 'x', kind: 'lifetime', family: 'iron-mover', tier: 'gold', earnedAt: '2026-09-27' });
    expect(m).toMatchObject({ name: 'Iron Mover', ribbon: 'Gold', what: 'Tonnes lifted: 10 t', icon: 'dumbbell' });
    expect(m.medal).toEqual(['#FFE58A', '#C78A00']);
    // The gold ribbon is the tier's dark gold, darkened until the white text on it reads.
    expect(m.ribbonColor).toBe(ribbonBackground('#C78A00'));
    expect(contrastWithWhite(m.ribbonColor)).toBeGreaterThanOrEqual(4.5);
  });

  it('every tier from Bronze to Legend has its own ribbon colour, and white text reads on it', () => {
    const tiers = ['bronze', 'silver', 'gold', 'diamond', 'master', 'legend'] as const;
    const colors = tiers.map((tier) => describeMomentBadge({ id: 'x', kind: 'lifetime', family: 'finisher', tier, earnedAt: '2026-09-27' }).ribbonColor);
    expect(new Set(colors).size).toBe(6);
    for (const c of colors) expect(contrastWithWhite(c)).toBeGreaterThanOrEqual(4.5);
  });

  it('a ribbon colour that already reads is left alone, and a light one is darkened', () => {
    expect(ribbonBackground('#8C4A1F')).toBe('#8C4A1F');
    expect(contrastWithWhite('#7D8796')).toBeLessThan(4.5);
    const darker = ribbonBackground('#7D8796');
    expect(darker).not.toBe('#7D8796');
    expect(contrastWithWhite(darker)).toBeGreaterThanOrEqual(4.5);
    expect(contrastWithWhite('#000000')).toBe(21);
  });

  it('a monthly badge and a special badge reuse the same moment', () => {
    const month = describeMomentBadge({ id: 'm', kind: 'monthly', badge: 'perfect-month', month: '2026-10', earnedAt: '2026-10-30' });
    expect(month).toMatchObject({ name: 'Perfect Month', ribbon: 'Monthly', what: 'Every scheduled workout day cleared, October 2026' });
    const special = describeMomentBadge({ id: 's', kind: 'special', badge: 'awakening', earnedAt: '2026-09-27' });
    expect(special).toMatchObject({ name: 'Awakening', ribbon: 'Special', what: 'First day cleared' });
    expect(month.what).not.toContain(EM_DASH);
  });
});

describe('replaying a badge', () => {
  const today = '2026-09-30';
  const legacyState = legacy as unknown as AppState;

  it('every earned card maps back to an earned badge, and locked cards do not', () => {
    const cards = buildBadgeCards(legacyState, today);
    const all = [...cards.workouts, ...cards.lifetime, ...cards.month.cards, ...cards.trophies, ...cards.milestones];
    const earnedIds = new Set(allEarnedBadges(legacyState, today).map((b) => b.id));
    let earned = 0;
    for (const c of all) {
      const e = cardToEarned(c);
      if (!c.earned) {
        expect(e).toBeNull();
        continue;
      }
      earned++;
      expect(e).not.toBeNull();
      expect(earnedIds.has(e!.id)).toBe(true);
    }
    expect(earned).toBeGreaterThan(0);
  });

  it('a workout badge replays at the tier the card shows', () => {
    const state = stateWith([workout('2026-09-28', [{ id: 'pushup', sets: [{ reps: 10 }] }])]);
    const finisher = buildBadgeCards(state, today).workouts[0];
    expect(cardToEarned(finisher)).toMatchObject({ kind: 'lifetime', family: 'finisher', tier: 'bronze', id: 'lifetime:finisher:bronze' });
  });
});
