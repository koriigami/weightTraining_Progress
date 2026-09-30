import { describe, expect, it } from 'vitest';
import { aggregate, parseRange, personFacts } from '../lib/insights';
import type { PersonFacts } from '../lib/insights';
import { insightsStatus, isOwnerEmail } from '../lib/owner';
import { defaultPrefs } from '../lib/routines';
import { stateWith, workout } from './helpers';

// Wednesday 30 September 2026. Its week starts Monday 28 Sep.
const TODAY = '2026-09-30';

const person = (over: Partial<PersonFacts> & { dates?: string[] } = {}): PersonFacts => {
  const { dates = [], ...rest } = over;
  return {
    joined: '2026-08-01',
    onboarded: true,
    workouts: dates.map((date) => ({ date, cardioMin: 0, strengthSets: 9 })),
    rankDates: { d: null, c: null, b: null },
    ...rest,
  };
};
const many = (n: number, over: Partial<PersonFacts> & { dates?: string[] } = {}) => Array.from({ length: n }, () => person(over));

describe('owner guard', () => {
  it('matches the owner email ignoring case and spaces', () => {
    expect(isOwnerEmail(' Owner@Example.com ', 'owner@example.com')).toBe(true);
    expect(isOwnerEmail('other@example.com', 'owner@example.com')).toBe(false);
  });

  it('is never the owner when OWNER_EMAIL is unset or the user has no email', () => {
    expect(isOwnerEmail('a@b.c', undefined)).toBe(false);
    expect(isOwnerEmail('a@b.c', '  ')).toBe(false);
    expect(isOwnerEmail(undefined, 'owner@example.com')).toBe(false);
  });

  it('answers 404 to anyone but the owner, signed in or not', () => {
    expect(insightsStatus('owner@example.com', 'owner@example.com')).toBe(200);
    expect(insightsStatus('someone@example.com', 'owner@example.com')).toBe(404);
    expect(insightsStatus(null, 'owner@example.com')).toBe(404);
    expect(insightsStatus('owner@example.com', undefined)).toBe(404);
  });
});

describe('aggregate', () => {
  it('returns no numbers until 5 people have joined', () => {
    const r = aggregate(many(4, { dates: ['2026-09-29'] }), TODAY, '12w');
    expect(r.enough).toBe(false);
    expect(r.people).toBeNull();
    expect(r.weekly).toEqual([]);
  });

  it('counts people, this week and the weekly series', () => {
    const people = [...many(6, { dates: ['2026-09-29'] }), ...many(5, { dates: ['2026-09-22'] })];
    const r = aggregate(people, TODAY, '4w');
    expect(r.people).toBe(11);
    expect(r.active).toBe(6);
    expect(r.activePct).toBe(55);
    expect(r.weekly.map((w) => w.monday)).toEqual(['2026-09-07', '2026-09-14', '2026-09-21', '2026-09-28']);
    expect(r.weekly.map((w) => w.people)).toEqual([0, 0, 5, 6]);
    expect(r.weekly.map((w) => w.current)).toEqual([false, false, false, true]);
  });

  it('hides any group of 1 to 4 people as null, but not an empty one', () => {
    const people = [...many(5, { dates: ['2026-09-29'] }), ...many(3, { dates: ['2026-09-22', '2026-09-29'] })];
    const r = aggregate(people, TODAY, '4w');
    expect(r.weekly.map((w) => w.people)).toEqual([0, 0, null, 8]);
    const few = aggregate([...many(4, { dates: ['2026-09-29'] }), person()], TODAY, '4w');
    expect(few.active).toBeNull();
    expect(few.activePct).toBeNull();
    expect(few.perWeek).toBeNull();
    expect(few.pace.every((b) => b.people === null)).toBe(true);
    expect(few.funnel.find((f) => f.label === 'Signed in')?.people).toBe(5);
    expect(few.funnel.find((f) => f.label === 'First workout')?.people).toBeNull();
  });

  it('limits the series and workouts a week to the range', () => {
    const old = ['2026-06-02', '2026-06-09', '2026-06-16', '2026-06-23'];
    const people = many(5, { dates: [...old, '2026-09-29'] });
    const four = aggregate(people, TODAY, '4w');
    const all = aggregate(people, TODAY, 'all');
    expect(four.weekly).toHaveLength(4);
    expect(all.weekly.length).toBeGreaterThan(12);
    expect(all.weekly[0].monday).toBe('2026-06-01');
    expect(four.perWeek).toBe(1);
    expect(all.perWeek).toBeLessThan(1);
    const stale = aggregate([...many(5, { dates: old }), person({ dates: ['2026-09-29'] })], TODAY, '4w');
    expect(stale.pace.every((b) => b.people === null)).toBe(true);
  });

  it('puts active people in workouts-a-week groups and strength or cardio groups', () => {
    const week = ['2026-09-28', '2026-09-29', '2026-09-30'];
    const three = many(5, { dates: week }); // 3 a week
    const one = many(5, { dates: ['2026-09-29'] }); // 1 a week
    const cardio = many(5, { workouts: [{ date: '2026-09-29', cardioMin: 40, strengthSets: 0 }] });
    const r = aggregate([...three, ...one, ...cardio], TODAY, '4w');
    expect(r.pace.map((b) => b.people)).toEqual([10, 5, null]);
    expect(r.mostly.map((b) => b.people)).toEqual([10, null, 5]);
  });

  it('takes the funnel from setup, first workouts and weeks since joining', () => {
    const joined = '2026-09-07'; // week 2 starts 14 Sep, week 4 on 28 Sep
    const habit = many(5, { joined, dates: ['2026-09-08', '2026-09-15', '2026-09-29'] });
    const idle = many(2, { joined, onboarded: false });
    const r = aggregate([...habit, ...idle], TODAY, '12w');
    expect(r.funnel).toEqual([
      { label: 'Signed in', people: 7 },
      { label: 'Set up the app', people: 5 },
      { label: 'First workout', people: 5 },
      { label: 'Active in week 2', people: 5 },
      { label: 'Active in week 4', people: 5 },
    ]);
  });

  it('gives median days to each rank, hidden below 5 people', () => {
    const reached = (days: number[]) => days.map((d, i) => person({ joined: '2026-08-01', rankDates: { d: `2026-08-${String(1 + d).padStart(2, '0')}`, c: i === 0 ? '2026-09-20' : null, b: null } }));
    const r = aggregate([...reached([5, 10, 12, 20, 25]), person()], TODAY, 'all');
    expect(r.ranks[0]).toEqual({ label: 'D rank (level 5)', days: 12 });
    expect(r.daysToD).toBe(12);
    expect(r.ranks[1].days).toBeNull();
    expect(r.ranks[2].days).toBeNull();
  });

  it('never carries names, emails, ids or set data', () => {
    const json = JSON.stringify(aggregate(many(6, { dates: ['2026-09-29'] }), TODAY, '12w'));
    expect(Object.keys(JSON.parse(json)).sort()).toEqual(['active', 'activePct', 'daysToD', 'enough', 'funnel', 'mostly', 'pace', 'people', 'perWeek', 'range', 'ranks', 'weekly']);
  });

  it('falls back to 12 weeks for an unknown range', () => {
    expect(parseRange('4w')).toBe('4w');
    expect(parseRange('all')).toBe('all');
    expect(parseRange('x')).toBe('12w');
    expect(parseRange(null)).toBe('12w');
  });
});

describe('personFacts', () => {
  it('reads the join date, setup, workouts and the day a rank was reached', () => {
    // 200 sets of 5 XP is 1000 XP or more, level 5 (D rank), reached on the second day.
    const day = (date: string, sets: number) => workout(date, [{ id: 'db-ohp', sets: Array.from({ length: sets }, () => ({ kg: 10, reps: 10 })) }]);
    const state = stateWith([day('2026-09-10', 20), day('2026-09-12', 200), day('2026-09-14', 10)], { prefs: { ...defaultPrefs(), onboarded: true } });
    const f = personFacts(state, '2026-09-08T10:00:00.000Z', TODAY);
    expect(f.joined).toBe('2026-09-08');
    expect(f.onboarded).toBe(true);
    expect(f.workouts.map((w) => w.date)).toEqual(['2026-09-10', '2026-09-12', '2026-09-14']);
    expect(f.rankDates.d).toBe('2026-09-12');
    expect(f.rankDates.c).toBeNull();
  });

  it('uses the first workout when there is no profile date', () => {
    const f = personFacts(stateWith([workout('2026-09-10', [{ id: 'db-ohp', sets: [{ kg: 10, reps: 10 }] }])]), undefined, TODAY);
    expect(f.joined).toBe('2026-09-10');
    expect(f.onboarded).toBe(false);
  });
});
