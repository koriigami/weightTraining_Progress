import { describe, expect, it } from 'vitest';
import { LIFETIME_FAMILIES, MONTHLY_BADGES, SPECIAL_BADGES, allEarnedBadges, computeBadges } from '../lib/badges';
import type { FamilyProgress } from '../lib/badges';
import {
  LEGACY_FAMILIES,
  WORKOUT_FAMILIES,
  badgeCardsFrom,
  badgeFacts,
  buildBadgeCards,
  cardForBadge,
  lifetimeCard,
  specialCard,
  tierLabel,
} from '../lib/badgeCards';
import { emptyState } from '../lib/progress';
import { migratedPlanState } from './fixtures/legacyPlanState';
import { stateWith, trainingDay, workout } from './helpers';

const TODAY = '2026-09-30';
const legacyState = migratedPlanState();

const run = (date: string, km: number) => workout(date, [{ id: 'run', sets: [{ min: 30, km }] }]);
const push = (date: string) => trainingDay(date);

describe('badge cards', () => {
  it('shows every family: the 5 that score the workout, then the other 6', () => {
    const cards = buildBadgeCards(legacyState, TODAY);
    expect(cards.workouts.map((c) => c.name)).toEqual(['Finisher', 'Iron Mover', 'Record Breaker', 'Streak Keeper', 'All-Rounder']);
    expect(cards.lifetime.map((c) => c.name)).toEqual(['Pushup Path', 'Engine', 'Road Runner', 'Rider', 'Shedding', 'Scale Keeper']);
    expect([...WORKOUT_FAMILIES, ...LEGACY_FAMILIES].sort()).toEqual(Object.keys(LIFETIME_FAMILIES).sort());
    expect(cards.milestones.map((c) => c.name)).toEqual(['Clean Sweep', 'Goal Getter']);
  });

  it('a family nobody has started is locked, drawn in its first tier, with progress towards it', () => {
    const c = buildBadgeCards(emptyState(), TODAY).workouts[0];
    expect(c).toMatchObject({ earned: false, tierName: 'Locked', value: 0, target: 1, pct: 0, progressText: '0 of 1 training day' });
    expect(c.art.tier).toBe('bronze');
    expect(c.hint).toBe('Bronze unlocks at 1 training day. You are at 0 training days. Training days.');
    const iron = buildBadgeCards(legacyState, TODAY).lifetime[0];
    expect(iron.name).toBe('Pushup Path');
  });

  it('an earned tier shows its name, and the bar counts towards the next one', () => {
    const state = stateWith([push('2026-09-28'), push('2026-09-29'), push('2026-09-30')]);
    const c = buildBadgeCards(state, TODAY).workouts[0];
    expect(c).toMatchObject({ earned: true, tierName: 'Bronze', value: 3, target: 10, pct: 30, progressText: '3 of 10 training days' });
    expect(c.art.tier).toBe('bronze');
    expect(c.earnedAt).toBe('2026-09-28');
    expect(c.hint).toBe('Bronze tier. Training days. 3 training days so far. Silver unlocks at 10 training days.');
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
    expect(c).toMatchObject({ earned: true, tierName: 'Legend', target: null, pct: 100, progressText: '300 training days, top tier' });
    expect(c.hint).toBe('Legend tier, the top one. Training days. 300 training days so far.');
  });

  it('Finisher counts training days and Streak Keeper weeks in a row with one', () => {
    expect(LIFETIME_FAMILIES.finisher.metric).toBe('Training days');
    expect(LIFETIME_FAMILIES['streak-keeper'].metric).toBe('Weeks in a row with a training day');
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

  it('Iron Mover counts sets logged', () => {
    const heavy = workout('2026-09-29', [{ id: 'db-bench', sets: [{ kg: 50, reps: 10 }, { kg: 50, reps: 10 }, { kg: 50, reps: 10 }] }]);
    const c = buildBadgeCards(stateWith([heavy]), TODAY).workouts[1];
    expect(c.name).toBe('Iron Mover');
    expect(c.value).toBe(3);
    expect(c.progressText).toBe('3 of 50 sets');
    expect(c.earned).toBe(false);
  });

  it('milestones are earned or not, with nothing to count', () => {
    expect(specialCard('clean-sweep', undefined)).toMatchObject({ earned: false, tierName: 'Locked', pct: 0, progressText: 'Not yet', hint: 'Finish a routine with every planned set ticked.' });
    expect(specialCard('clean-sweep', { earnedAt: '2026-09-26' })).toMatchObject({ earned: true, tierName: 'Earned', pct: 100, earnedAt: '2026-09-26' });
    const swept = workout('2026-09-26', [{ id: 'pushup', sets: [{ reps: 10 }, { reps: 10 }] }], { routineId: 'r1', plan: [{ exerciseId: 'pushup', sets: 2 }] });
    const cards = buildBadgeCards(stateWith([swept]), '2026-10-31').milestones;
    expect(cards.find((c) => c.name === 'Clean Sweep')?.earned).toBe(true);
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

  describe('the v2 catalogue', () => {
    const names = (b: ReturnType<typeof buildBadgeCards>) => [...b.workouts, ...b.lifetime, ...b.month.cards, ...b.trophies, ...b.milestones].map((c) => c.name);
    const RETIRED = ['Iron Will', 'Grinder', 'Perfect Month', 'Awakening', 'Perfect Day', 'Full Week', 'Program Complete'];

    it('shows the same badges to everyone, and none of the retired ones', () => {
      const a = buildBadgeCards(emptyState(), TODAY);
      const b = buildBadgeCards(legacyState, '2026-10-31');
      for (const n of RETIRED) {
        expect(names(a), n).not.toContain(n);
        expect(names(b), n).not.toContain(n);
      }
      expect(a.month.cards.map((c) => c.name)).toEqual(['Month Clear', 'Goal Month', 'Pushup Month', 'Cardio Month', '50K Walk/Run', '100K Ride', 'Weigh-in Month']);
      expect(a.milestones.map((c) => c.name)).toEqual(['Clean Sweep', 'Goal Getter']);
    });

    it('keeps the ids of the kept badges', () => {
      expect(Object.keys(LIFETIME_FAMILIES).sort()).toEqual(['all-rounder', 'engine', 'finisher', 'iron-mover', 'pushup-path', 'record-breaker', 'rider', 'road-runner', 'scale-keeper', 'shedding', 'streak-keeper']);
      expect(Object.keys(MONTHLY_BADGES).sort()).toEqual(['20k-walk-run', '40k-ride', 'cardio-month', 'goal-month', 'month-clear', 'pushup-month', 'weigh-in-month']);
      expect(Object.keys(SPECIAL_BADGES).sort()).toEqual(['clean-sweep', 'goal-getter']);
    });
  });
});

describe('the badge view', () => {
  const state = stateWith([push('2026-09-01'), push('2026-09-03')]);
  const cards = buildBadgeCards(state, TODAY);

  it('finds the family card for any tier a person earned', () => {
    const bronze = allEarnedBadges(state, TODAY).find((b) => b.id === 'lifetime:finisher:bronze')!;
    expect(cardForBadge(cards, bronze)?.name).toBe('Finisher');
  });

  it('names the tier tapped, the date earned and the way to the next tier', () => {
    const bronze = allEarnedBadges(state, TODAY).find((b) => b.id === 'lifetime:finisher:bronze')!;
    const card = cardForBadge(cards, bronze)!;
    const f = badgeFacts(card, bronze);
    expect(f.tier).toBe('Bronze');
    expect(f.earnedLine).toBe('Earned Sep 1, 2026');
    expect(f.progress).toBe(`Silver: ${card.progressText}`);
  });

  it('says Locked with no date for a badge nobody has', () => {
    const rider = cards.lifetime.find((c) => c.name === 'Rider')!;
    const f = badgeFacts(rider, null);
    expect(f.tier).toBe('Locked');
    expect(f.earnedLine).toBeNull();
  });
});
