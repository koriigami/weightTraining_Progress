import { describe, expect, it } from 'vitest';
import { agoLabel, aggregate, invitedNotJoined, minGroupFor, parseRange, personFacts, personRow, personSummary, sortRoster } from '../lib/insights';
import type { PersonFacts, PersonRow } from '../lib/insights';
import { inviteStatus } from '../lib/inviteStatus';
import { insightsStatus, isOwnerEmail } from '../lib/owner';
import { computeProgress } from '../lib/progress';
import { defaultPrefs } from '../lib/routines';
import { stateWith, trainingDay, workout } from './helpers';

// Wednesday 30 September 2026. Its week starts Monday 28 Sep.
const TODAY = '2026-09-30';

const person = (over: Partial<PersonFacts> & { dates?: string[] } = {}): PersonFacts => {
  const { dates = [], ...rest } = over;
  return {
    joined: '2026-08-01',
    onboarded: true,
    workouts: dates.map((date) => ({ date, cardioMin: 0, strengthSets: 9, trainingDay: true, source: 'live' as const, laps: false })),
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
    const cardio = many(5, { workouts: [{ date: '2026-09-29', cardioMin: 40, strengthSets: 0, trainingDay: true, source: 'live' as const, laps: false }] });
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
      { label: 'Second training day', people: 5 },
      { label: 'Active in week 2', people: 5 },
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
    expect(Object.keys(JSON.parse(json)).sort()).toEqual(['active', 'activePct', 'daysToD', 'enough', 'funnel', 'invites', 'lastWorkout', 'made', 'min', 'mostly', 'pace', 'people', 'perWeek', 'range', 'ranks', 'weekly']);
  });

  it('falls back to 12 weeks for an unknown range', () => {
    expect(parseRange('4w')).toBe('4w');
    expect(parseRange('all')).toBe('all');
    expect(parseRange('x')).toBe('12w');
    expect(parseRange(null)).toBe('12w');
  });
});

describe('small groups while invite-only', () => {
  it('uses 1 while invite-only and 5 while open', () => {
    expect(minGroupFor('invite')).toBe(1);
    expect(minGroupFor('open')).toBe(5);
  });

  it('shows the numbers for one person when the minimum is 1, and a lock when it is 5', () => {
    const one = [person({ dates: ['2026-09-29'] })];
    const small = aggregate(one, TODAY, '12w', { min: 1 });
    expect(small.enough).toBe(true);
    expect(small.people).toBe(1);
    expect(small.active).toBe(1);
    expect(aggregate(one, TODAY, '12w').enough).toBe(false);
  });

  it('shows no numbers for an empty group even when the minimum is 1', () => {
    expect(aggregate([], TODAY, '12w', { min: 1 }).enough).toBe(false);
  });
});

describe('activation, last workout, how workouts were made and invites', () => {
  const MIN1 = { min: 1 };

  it('counts a second training day, not a second workout on the same day', () => {
    const twice = person({ workouts: [
      { date: '2026-09-08', cardioMin: 0, strengthSets: 9, trainingDay: true, source: 'live', laps: false },
      { date: '2026-09-08', cardioMin: 0, strengthSets: 9, trainingDay: false, source: 'live', laps: false },
    ] });
    const two = person({ dates: ['2026-09-08', '2026-09-10'] });
    const r = aggregate([twice, two], TODAY, '12w', MIN1);
    expect(r.funnel.find((f) => f.label === 'Second training day')?.people).toBe(1);
  });

  it('puts everyone in one last-workout bucket, including people with none', () => {
    const r = aggregate([
      person({ dates: ['2026-09-30'] }),
      person({ dates: ['2026-09-29'] }),
      person({ dates: ['2026-09-23'] }), // 7 days ago
      person({ dates: ['2026-09-22'] }), // 8 days ago
      person({ dates: ['2026-09-01'] }),
      person(),
    ], TODAY, 'all', MIN1);
    expect(r.lastWorkout.map((b) => b.people)).toEqual([1, 2, 1, 1, 1]);
  });

  it('counts live, logged and lap workouts in the range, and old workouts without a source as live', () => {
    const w = (date: string, source: 'live' | 'log', laps = false) => ({ date, cardioMin: 0, strengthSets: 9, trainingDay: true, source, laps });
    const r = aggregate([person({ workouts: [w('2026-09-29', 'live'), w('2026-09-28', 'log'), w('2026-09-27', 'live', true), w('2026-06-01', 'log')] })], TODAY, '4w', MIN1);
    expect(r.made).toEqual([
      { label: 'Started live', count: 2 },
      { label: 'Logged afterwards', count: 1 },
      { label: 'Runs with laps', count: 1 },
    ]);
  });

  it('hides how workouts were made below the minimum', () => {
    const shown = aggregate(many(5, { dates: ['2026-09-29'] }), TODAY, '4w');
    expect(shown.made.map((b) => b.count)).toEqual([5, 0, 0]);
    const hidden = aggregate([...many(4, { dates: ['2026-09-29'] }), person()], TODAY, '4w');
    expect(hidden.enough).toBe(true);
    expect(hidden.made.every((b) => b.count === null)).toBe(true);
  });

  it('carries the invite counts through and nothing else about invites', () => {
    const r = aggregate(many(2), TODAY, '12w', { min: 1, invites: { invited: 4, signedIn: 2 } });
    expect(r.invites).toEqual({ invited: 4, signedIn: 2 });
  });
});

describe('personFacts', () => {
  it('reads a workout source, defaulting to live, and laps', () => {
    const run = workout('2026-09-10', [{ id: 'run', sets: [{ min: 20, km: 3 }] }], { source: 'log' });
    const f = personFacts(stateWith([run, workout('2026-09-11', [{ id: 'db-ohp', sets: [{ kg: 10, reps: 10 }] }])]), undefined, TODAY);
    expect(f.workouts.map((w) => w.source)).toEqual(['log', 'live']);
    expect(f.workouts.map((w) => w.laps)).toEqual([false, false]);
    const lapped = workout('2026-09-12', [{ id: 'run', sets: [{ min: 20, km: 3, laps: [{ sec: 600, km: 1.5 }, { sec: 600, km: 1.5 }] }] }]);
    expect(personFacts(stateWith([lapped]), undefined, TODAY).workouts[0].laps).toBe(true);
  });

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

describe('personRow', () => {
  const profile = { name: 'Asha Rao', email: 'asha@example.com', createdAt: '2026-09-08T10:00:00.000Z' };
  // A workout of two push-up sets: 6 minutes, so it counts as a workout but not a training day.
  const short = (date: string) => workout(date, [{ id: 'pushup', sets: [{ reps: 10 }, { reps: 10 }] }]);
  const rows = (...r: Partial<PersonRow>[]): PersonRow[] =>
    r.map((o, i) => ({ name: `P${i}`, email: `p${i}@example.com`, joined: '2026-09-01', setUp: true, level: 1, rank: 'E', lastWorkout: null, daysSince: null, workouts30: 0, trainingDays7: 0, workoutsTotal: 0, ...o }));

  it('shows the same level and rank the person sees in the app', () => {
    const big = workout('2026-09-12', [{ id: 'db-ohp', sets: Array.from({ length: 200 }, () => ({ kg: 10, reps: 10 })) }]);
    const state = stateWith([trainingDay('2026-09-10'), big, trainingDay('2026-09-14')], { weights: { '2026-09-11': 80 } });
    const p = computeProgress(state, TODAY);
    const row = personRow(state, profile, TODAY);
    expect(p.level).toBeGreaterThanOrEqual(5);
    expect(row.level).toBe(p.level);
    expect(row.rank).toBe(p.rank);
  });

  it('gives the last workout and whole days since it', () => {
    const row = personRow(stateWith([trainingDay('2026-09-20'), trainingDay('2026-09-27')]), profile, TODAY);
    expect(row.lastWorkout).toBe('2026-09-27');
    expect(row.daysSince).toBe(3);
    expect(personRow(stateWith([trainingDay(TODAY)]), profile, TODAY).daysSince).toBe(0);
  });

  it('counts a workout dated tomorrow as today, not as minus one day', () => {
    const row = personRow(stateWith([trainingDay('2026-10-01')]), profile, TODAY);
    expect(row.lastWorkout).toBe('2026-10-01');
    expect(row.daysSince).toBe(0);
  });

  it('counts training days in the last 7 days, today included', () => {
    const state = stateWith([trainingDay('2026-09-23'), trainingDay('2026-09-24'), short('2026-09-28'), trainingDay('2026-09-30')]);
    // 24 to 30 September is 7 days. The 23rd is out, the short workout is not a training day.
    expect(personRow(state, profile, TODAY).trainingDays7).toBe(2);
  });

  it('counts workouts in the last 30 days, today included, and all of them in total', () => {
    const state = stateWith([trainingDay('2026-08-31'), trainingDay('2026-09-01'), short('2026-09-15'), trainingDay('2026-09-30')]);
    // 1 to 30 September is 30 days: 31 August is out, 1 September is in, the short workout counts.
    const row = personRow(state, profile, TODAY);
    expect(row.workouts30).toBe(3);
    expect(row.workoutsTotal).toBe(4);
  });

  it('describes a person who has never trained', () => {
    const state = stateWith([], { prefs: defaultPrefs() });
    const row = personRow(state, profile, TODAY);
    expect(row).toMatchObject({ level: 1, rank: 'E', lastWorkout: null, daysSince: null, workouts30: 0, trainingDays7: 0, workoutsTotal: 0, setUp: false, joined: '2026-09-08' });
  });

  it('reads setup the way the app does, so an account with no stored prefs counts as set up', () => {
    expect(personRow(stateWith([], { prefs: { ...defaultPrefs(), onboarded: true } }), profile, TODAY).setUp).toBe(true);
    expect(personRow(stateWith([], { prefs: defaultPrefs() }), profile, TODAY).setUp).toBe(false);
    expect(personRow(stateWith([]), profile, TODAY).setUp).toBe(true);
  });

  it('falls back to the first workout, then today, for the join date, and to empty text without a profile', () => {
    expect(personRow(stateWith([trainingDay('2026-09-10')]), null, TODAY)).toMatchObject({ joined: '2026-09-10', name: '', email: '' });
    expect(personRow(stateWith([]), null, TODAY).joined).toBe(TODAY);
  });

  it('has only the allowed keys: nothing from inside a workout, no id, no photo', () => {
    const state = stateWith([trainingDay('2026-09-27')], { weights: { '2026-09-27': 81.5 } });
    const row = personRow(state, { ...profile, image: 'https://example.com/me.jpg' } as typeof profile, TODAY);
    expect(Object.keys(row).sort()).toEqual(['daysSince', 'email', 'joined', 'lastWorkout', 'level', 'name', 'rank', 'setUp', 'trainingDays7', 'workouts30', 'workoutsTotal']);
    expect(JSON.stringify(row)).not.toMatch(/81\.5|example\.com\/me/);
  });

  it('sorts the most recent workout first, people with none last, then by name', () => {
    const sorted = sortRoster(rows({ name: 'Zed', lastWorkout: '2026-09-20' }, { name: 'Bo' }, { name: 'Amy', lastWorkout: '2026-09-29' }, { name: 'Cy', lastWorkout: '2026-09-20' }, { name: 'Al' }));
    expect(sorted.map((r) => r.name)).toEqual(['Amy', 'Cy', 'Zed', 'Al', 'Bo']);
  });

  it('words the days since and the phone line', () => {
    expect([agoLabel(null), agoLabel(0), agoLabel(1), agoLabel(3)]).toEqual(['No workout yet', 'Today', 'Yesterday', '3 days ago']);
    const [a, b, c] = rows({ level: 6, rank: 'D', daysSince: 3, trainingDays7: 2 }, { daysSince: 0, trainingDays7: 1 }, {});
    expect(personSummary(a)).toBe('Level 6 · D rank · last workout 3 days ago · 2 training days in the last 7 days');
    expect(personSummary(b)).toBe('Level 1 · E rank · last workout today · 1 training day in the last 7 days');
    expect(personSummary(c)).toBe('Level 1 · E rank · no workout yet');
  });
});

describe('invitedNotJoined', () => {
  it('leaves out anyone who has signed in, whatever the case or spacing', () => {
    const list = invitedNotJoined(['a@example.com', 'b@example.com', 'c@example.com'], [], ['A@Example.com', ' c@example.com ']);
    expect(list).toEqual(['b@example.com']);
  });

  it('joins the invite list and ALLOWED_EMAILS, normalised, without repeats, sorted', () => {
    const list = invitedNotJoined(['zed@example.com', 'Amy@Example.com'], ['amy@example.com', ' bo@example.com ', ''], []);
    expect(list).toEqual(['amy@example.com', 'bo@example.com', 'zed@example.com']);
  });

  it('is empty when everyone invited has signed in', () => {
    expect(invitedNotJoined(['a@example.com'], ['a@example.com'], ['a@example.com'])).toEqual([]);
  });
});

describe('inviteStatus', () => {
  const row = (over: Partial<PersonRow>): PersonRow => ({ name: '', email: '', joined: '2026-09-30', setUp: true, level: 1, rank: 'E', lastWorkout: null, daysSince: null, workouts30: 0, trainingDays7: 0, workoutsTotal: 0, ...over });

  it('lists signed-in people oldest first with only what the routine needs', () => {
    const { signedIn } = inviteStatus([row({ name: 'B', email: 'B@Example.com', joined: '2026-10-02', level: 4 }), row({ name: 'A', email: 'a@example.com', joined: '2026-09-29', workoutsTotal: 2, lastWorkout: '2026-10-01' })], [], []);
    expect(signedIn).toEqual([
      { name: 'A', email: 'a@example.com', joined: '2026-09-29', workoutsTotal: 2, lastWorkout: '2026-10-01' },
      { name: 'B', email: 'b@example.com', joined: '2026-10-02', workoutsTotal: 0, lastWorkout: null },
    ]);
  });

  it('leaves signed-in people out of invitedNotJoined and skips profiles with no email', () => {
    const s = inviteStatus([row({ email: 'a@example.com' }), row({ email: '  ' })], ['a@example.com', 'c@example.com'], ['b@example.com']);
    expect(s.signedIn).toHaveLength(1);
    expect(s.invitedNotJoined).toEqual(['b@example.com', 'c@example.com']);
  });
});
