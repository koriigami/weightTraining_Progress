import { describe, expect, it } from 'vitest';
import { LIFETIME_FAMILIES, allEarnedBadges, computeBadges } from '../lib/badges';
import type { FamilyProgress } from '../lib/badges';
import { LEGACY_FAMILIES, WORKOUT_FAMILIES, badgeCardsFrom, buildBadgeCards, lifetimeCard, specialCard, tierLabel } from '../lib/badgeCards';
import { emptyState } from '../lib/progress';
import type { AppState } from '../lib/progress';
import legacy from './fixtures/legacyState.json';
import { stateWith, workout } from './helpers';

const TODAY = '2026-09-30';
const legacyState = legacy as unknown as AppState;

const run = (date: string, km: number) => workout(date, [{ id: 'run', sets: [{ min: 30, km }] }]);
const push = (date: string) => workout(date, [{ id: 'pushup', sets: [{ reps: 10 }] }]);

describe('badge cards', () => {
  it('shows every family: the 5 new ones, then the 8 that predate routines', () => {
    const cards = buildBadgeCards(emptyState(), TODAY);
    expect(cards.workouts.map((c) => c.name)).toEqual(['Finisher', 'Iron Mover', 'Record Breaker', 'Streak Keeper', 'All-Rounder']);
    expect(cards.lifetime.map((c) => c.name)).toEqual(['Iron Will', 'Pushup Path', 'Grinder', 'Engine', 'Road Runner', 'Rider', 'Shedding', 'Scale Keeper']);
    expect([...WORKOUT_FAMILIES, ...LEGACY_FAMILIES].sort()).toEqual(Object.keys(LIFETIME_FAMILIES).sort());
    expect(cards.milestones.map((c) => c.name)).toEqual(['Awakening', 'Perfect Day', 'Full Week', 'Goal Getter', 'Program Complete']);
  });

  it('a family nobody has started is locked, drawn in its first tier, with progress towards it', () => {
    const c = buildBadgeCards(emptyState(), TODAY).workouts[0];
    expect(c).toMatchObject({ earned: false, tierName: 'Locked', value: 0, target: 1, pct: 0, progressText: '0 of 1 workouts' });
    expect(c.art.tier).toBe('bronze');
    expect(c.hint).toBe('Bronze unlocks at 1 workouts. You are at 0 workouts. Workouts finished.');
    const iron = buildBadgeCards(emptyState(), TODAY).lifetime[0];
    expect(iron.progressText).toBe('0 of 3 days');
  });

  it('an earned tier shows its name, and the bar counts towards the next one', () => {
    const state = stateWith([push('2026-09-28'), push('2026-09-29'), push('2026-09-30')]);
    const c = buildBadgeCards(state, TODAY).workouts[0];
    expect(c).toMatchObject({ earned: true, tierName: 'Bronze', value: 3, target: 10, pct: 30, progressText: '3 of 10 workouts' });
    expect(c.art.tier).toBe('bronze');
    expect(c.earnedAt).toBe('2026-09-28');
    expect(c.hint).toBe('Bronze tier. Workouts finished. 3 workouts so far. Silver unlocks at 10 workouts.');
    expect(c.ladder.map((l) => [l.tier, l.threshold, l.earned])).toEqual([
      ['bronze', 1, true],
      ['silver', 10, false],
      ['gold', 25, false],
      ['diamond', 50, false],
      ['master', 100, false],
      ['legend', 250, false],
    ]);
  });

  it('shows the highest tier earned', () => {
    const state = stateWith(Array.from({ length: 12 }, (_, i) => push(`2026-09-${String(10 + i).padStart(2, '0')}`)));
    const c = buildBadgeCards(state, '2026-09-30').workouts[0];
    expect(c.tierName).toBe('Silver');
    expect(c.art.tier).toBe('silver');
    expect(c.target).toBe(25);
  });

  it('the top tier has no next target', () => {
    const fam: FamilyProgress = { id: 'finisher', value: 300, tierIndex: 6, earned: [], nextThreshold: null, progressToNext: null };
    const c = lifetimeCard('finisher', fam);
    expect(c).toMatchObject({ earned: true, tierName: 'Legend', target: null, pct: 100, progressText: '300 workouts, top tier' });
    expect(c.hint).toBe('Legend tier, the top one. Workouts finished. 300 workouts so far.');
  });

  it('Road Runner and Rider say they count logged km, and count them', () => {
    expect(LIFETIME_FAMILIES['road-runner'].metric).toBe('Run and treadmill km');
    expect(LIFETIME_FAMILIES.rider.metric).toBe('Ride km');
    const state = stateWith([run('2026-09-29', 12)]);
    const cards = buildBadgeCards(state, TODAY);
    const rr = cards.lifetime.find((c) => c.family === 'road-runner')!;
    expect(rr).toMatchObject({ earned: true, tierName: 'Bronze', value: 12, target: 50, progressText: '12 of 50 km', what: 'Run and treadmill km' });
    const rider = cards.lifetime.find((c) => c.family === 'rider')!;
    expect(rider).toMatchObject({ earned: false, what: 'Ride km' });
  });

  it('tonnes and other decimals are written plainly', () => {
    const heavy = workout('2026-09-29', [{ id: 'db-bench', sets: [{ kg: 50, reps: 10 }, { kg: 50, reps: 10 }, { kg: 50, reps: 10 }] }]);
    const c = buildBadgeCards(stateWith([heavy]), TODAY).workouts[1];
    expect(c.name).toBe('Iron Mover');
    expect(c.value).toBe(1.5);
    expect(c.progressText).toBe('1.5 of 5 t');
    expect(c.earned).toBe(true);
  });

  it('milestones are earned or not, with nothing to count', () => {
    expect(specialCard('awakening', undefined)).toMatchObject({ earned: false, tierName: 'Locked', pct: 0, progressText: 'Not yet', hint: 'First day cleared.' });
    expect(specialCard('awakening', { earnedAt: '2026-09-26' })).toMatchObject({ earned: true, tierName: 'Earned', pct: 100, earnedAt: '2026-09-26' });
    const cards = buildBadgeCards(legacyState, '2026-10-31').milestones;
    expect(cards.find((c) => c.name === 'Awakening')?.earned).toBe(true);
  });

  it('this month lists the monthly badges with their progress and earned state', () => {
    const cards = buildBadgeCards(legacyState, '2026-10-31');
    expect(cards.month.key).toBe('2026-10');
    expect(cards.month.label).toBe('October 2026');
    const b = computeBadges(legacyState, '2026-10-31').monthly.find((m) => m.month === '2026-10')!;
    for (const c of cards.month.cards) {
      const id = c.id.split(':')[2] as keyof typeof b.badges;
      expect(c.earned).toBe(b.badges[id].earned);
      expect(c.progressText).toBe(`${b.badges[id].value} of ${b.badges[id].target}`.replace(/(\d+\.\d+)/g, (m) => String(Number(m))));
    }
    expect(cards.month.cards.length).toBeGreaterThan(0);
    expect(cards.month.cards.every((c) => c.art.month === 'OCT 26')).toBe(true);
  });

  it('the trophy case has every earned monthly badge, newest month first', () => {
    const cards = buildBadgeCards(legacyState, '2026-10-31');
    const earnedMonthly = allEarnedBadges(legacyState, '2026-10-31').filter((b) => b.kind === 'monthly');
    expect(cards.trophies).toHaveLength(earnedMonthly.length);
    expect(cards.trophies.every((c) => c.earned)).toBe(true);
    const months = cards.trophies.map((c) => c.id.split(':')[1]);
    expect(months).toEqual([...months].sort().reverse());
  });

  it('a person with nothing has no trophies and no earned card anywhere', () => {
    const cards = badgeCardsFrom(computeBadges(emptyState(), TODAY), TODAY);
    expect(cards.trophies).toEqual([]);
    expect([...cards.workouts, ...cards.lifetime, ...cards.month.cards, ...cards.milestones].some((c) => c.earned)).toBe(false);
  });

  it('names the tier with a capital', () => {
    expect(tierLabel('bronze')).toBe('Bronze');
    expect(tierLabel('legend')).toBe('Legend');
  });
});
