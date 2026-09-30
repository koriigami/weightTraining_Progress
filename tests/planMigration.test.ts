// The v8 move from the 6-week plan to logged workouts: migratePlanDays turns
// every logged plan day into a workout and drops `days`, and the store does it
// once on read after keeping a backup of the raw state.
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { migratePlanDays } from '../lib/migrations/planDays';
import type { LegacyState } from '../lib/migrations/planDays';
import { computeProgress, emptyState, totalXp, XP } from '../lib/progress';
import type { AppState } from '../lib/progress';
import { allEarnedBadges } from '../lib/badges';
import { goalReward, goalStatus } from '../lib/goals';
import { createStore } from '../lib/store';
import type { KV } from '../lib/store';
import { workoutXpTotal } from '../lib/workoutScoring';
import { legacyPlanState } from './fixtures/legacyPlanState';
import { seedRoutines } from './fixtures/seedRoutines';

const TODAY = '2026-11-02';

const withRoutines = (): LegacyState => ({ ...legacyPlanState, routines: seedRoutines() });
const migrate = (s: LegacyState) => migratePlanDays(s, { today: TODAY });
const byDate = (s: AppState, date: string) => (s.workouts ?? []).find((w) => w.id === `w-plan-${date}`)!;
const set = (n: number, s: Record<string, number>) => Array.from({ length: n }, () => ({ ...s, done: true }));

describe('migratePlanDays', () => {
  it('makes one workout per logged plan day and removes days', () => {
    const out = migrate(withRoutines());
    expect(out).not.toHaveProperty('days');
    const dates = Object.keys(legacyPlanState.days!);
    expect(out.workouts).toHaveLength(dates.length);
    expect(out.workouts!.map((w) => w.id).sort()).toEqual(dates.map((d) => `w-plan-${d}`).sort());
    // Everything else is carried over as it was.
    expect(out.weights).toEqual(legacyPlanState.weights);
    expect(out.goals).toEqual(legacyPlanState.goals);
    expect(out.routines).toEqual(seedRoutines());
  });

  it('turns a strength day: title, routine, times, items, reps and the routine kg', () => {
    // Saturday 26 Sep, the first day: Full Body, five items ticked, no cardio scheduled.
    const w = byDate(migrate(withRoutines()), '2026-09-26');
    expect(w).toMatchObject({
      id: 'w-plan-2026-09-26',
      date: '2026-09-26',
      when: '2026-09-26T18:00',
      title: 'Full Body',
      routineId: 'seed-full-body',
      startedAt: '2026-09-26T18:00:00.000Z',
      finishedAt: '2026-09-26T18:45:00.000Z',
    });
    expect(w.items).toEqual([
      { exerciseId: 'bw-squat', sets: set(3, { reps: 12 }) },
      { exerciseId: 'pushup', sets: set(3, { reps: 10 }) }, // 8-10 plans its top end
      { exerciseId: 'db-row', sets: set(3, { kg: 10, reps: 10 }) }, // kg from the routine's first set
      { exerciseId: 'db-lat', sets: set(3, { kg: 0, reps: 12 }) }, // not in the routine
      { exerciseId: 'db-curl', sets: set(3, { kg: 0, reps: 10 }) },
    ]);
    expect(w.plan).toEqual([
      { exerciseId: 'bw-squat', sets: 3 },
      { exerciseId: 'pushup', sets: 3 },
      { exerciseId: 'db-row', sets: 3 },
      { exerciseId: 'db-lat', sets: 3 },
      { exerciseId: 'db-curl', sets: 3 },
    ]);
    expect(w.planComplete).toBe(true);
  });

  it('has no routineId and no kg when the routine is not there', () => {
    const w = byDate(migrate({ ...legacyPlanState, routines: [] }), '2026-09-26');
    expect(w.routineId).toBeUndefined();
    expect(w.title).toBe('Full Body');
    expect(w.items[2]).toEqual({ exerciseId: 'db-row', sets: set(3, { kg: 0, reps: 10 }) });
    // Someone with a different routine list keeps the title but not the link.
    const other = byDate(migrate({ ...legacyPlanState, routines: [{ id: 'mine', title: 'Mine', items: [] }] }), '2026-09-26');
    expect(other.routineId).toBeUndefined();
  });

  it('keeps cardio as one bike or treadmill set, with km only when it was recorded', () => {
    const out = migrate(withRoutines());
    // Sunday 27 Sep, cycle day, 10 minutes and 5.5 km.
    expect(byDate(out, '2026-09-27').items.at(-1)).toEqual({ exerciseId: 'bike', sets: [{ min: 10, km: 5.5, done: true }] });
    expect(byDate(out, '2026-09-27').plan!.at(-1)).toEqual({ exerciseId: 'bike', sets: 1 });
    // Monday 28 Sep, treadmill day, 15 minutes and no distance.
    expect(byDate(out, '2026-09-28').items.at(-1)).toEqual({ exerciseId: 'treadmill', sets: [{ min: 15, done: true }] });
    // A km of 0 means no distance.
    const zero: LegacyState = { ...legacyPlanState, days: { '2026-09-27': { items: {}, cardio: { minutes: 10, km: 0, at: '2026-09-27T18:00:00.000Z' } } } };
    const w = byDate(migrate(zero), '2026-09-27');
    expect(w.items).toEqual([{ exerciseId: 'bike', sets: [{ min: 10, done: true }] }]);
    expect(w.plan).toHaveLength(6); // the five strength items and the ride, all scheduled
  });

  it('plans every scheduled item but logs only the ticked ones', () => {
    // Tuesday 29 Sep: two of five items ticked, no cardio. A ride was scheduled.
    const w = byDate(migrate(withRoutines()), '2026-09-29');
    expect(w.items.map((i) => i.exerciseId)).toEqual(['sumo-squat', 'pushup']);
    expect(w.plan!.map((p) => p.exerciseId)).toEqual(['sumo-squat', 'pushup', 'db-row', 'db-ohp', 'db-curl', 'db-ohext', 'bike']);
    expect(w.plan!.at(-1)).toEqual({ exerciseId: 'bike', sets: 1 });
    expect(w.planComplete).toBe(false);
    expect(w.planMissing).toEqual(['db-row', 'db-ohp', 'db-curl', 'db-ohext', 'bike']);
  });

  it('turns core items, with time items in seconds', () => {
    // Sunday 4 Oct: six strength items and both core items.
    const w = byDate(migrate(withRoutines()), '2026-10-04');
    expect(w.items.slice(-2)).toEqual([
      { exerciseId: 'plank', sets: set(2, { sec: 20 }) },
      { exerciseId: 'crunch', sets: set(2, { reps: 12 }) },
    ]);
  });

  it('leaves out plan names that are more than one exercise, and keeps the rest of the day', () => {
    const out = migrate(withRoutines());
    // Monday 19 Oct is a week 5 push day: both items are supersets, so only the run is left.
    const push = byDate(out, '2026-10-19');
    expect(push.title).toBe('Push A');
    expect(push.items).toEqual([{ exerciseId: 'treadmill', sets: [{ min: 18, km: 2.2, done: true }] }]);
    expect(push.plan).toEqual([{ exerciseId: 'treadmill', sets: 1 }]);
    // Tuesday 20 Oct: the rows and curls superset is skipped, the single-arm rows (8/side) and reverse flyes stay.
    const pull = byDate(out, '2026-10-20');
    expect(pull.items).toEqual([
      { exerciseId: 'db-row1', sets: set(4, { kg: 10, reps: 8 }) },
      { exerciseId: 'db-rear', sets: set(4, { kg: 5, reps: 12 }) },
      { exerciseId: 'bike', sets: [{ min: 23, done: true }] },
    ]);
    expect(pull.plan).toEqual([
      { exerciseId: 'db-row1', sets: 4 },
      { exerciseId: 'db-rear', sets: 4 },
      { exerciseId: 'bike', sets: 1 },
    ]);
  });

  it('skips "max reps" items, days that were not workout days and dates outside the plan', () => {
    const days: LegacyState['days'] = {
      // Week 6 Push A opens with a pushup benchmark of "max reps".
      '2026-10-26': { items: { s0: { at: '2026-10-26T08:00:00.000Z' }, s1: { at: '2026-10-26T08:10:00.000Z' } } },
      '2026-09-21': { items: { s0: { at: '2026-09-21T08:00:00.000Z' } } }, // before the program began
      '2026-10-08': { items: { s0: { at: '2026-10-08T08:00:00.000Z' } } }, // a rest day
      '2027-01-01': { items: { s0: { at: '2027-01-01T08:00:00.000Z' } } }, // not in the plan
      '2026-10-27': { items: {} }, // nothing ticked and no cardio
    };
    const out = migrate({ ...legacyPlanState, days });
    expect(out.workouts!.map((w) => w.id)).toEqual(['w-plan-2026-10-26']);
    const w = out.workouts![0];
    expect(w.items.map((i) => i.exerciseId)).toEqual(['db-fly']);
    expect(w.plan!.map((p) => p.exerciseId)).not.toContain('pushup');
  });

  it('is idempotent: a second run changes nothing', () => {
    const once = migrate(withRoutines());
    const twice = migrate(once as LegacyState);
    expect(twice).toEqual(once);
    // Even with the days put back, the workouts that exist are not made again.
    const again = migrate({ ...once, days: legacyPlanState.days });
    expect(again.workouts).toEqual(once.workouts);
    expect(again).not.toHaveProperty('days');
  });

  it('appends to the workouts that already exist and leaves them as they are', () => {
    const mine = {
      id: 'mine',
      date: '2026-10-30',
      when: '2026-10-30T07:00',
      title: 'Mine',
      startedAt: '2026-10-30T07:00:00.000Z',
      finishedAt: '2026-10-30T07:30:00.000Z',
      items: [{ exerciseId: 'pushup', sets: [{ reps: 10, done: true }] }],
      xp: 0,
    };
    const out = migrate({ ...withRoutines(), workouts: [mine] });
    expect(out.workouts![0]).toMatchObject({ id: 'mine', title: 'Mine' });
    expect(out.workouts).toHaveLength(1 + Object.keys(legacyPlanState.days!).length);
  });

  it('scores the workouts with the v2 rules', () => {
    const out = migrate(withRoutines());
    const w = byDate(out, '2026-09-26');
    // 15 sets of 5 XP. It is the first workout of the day, so it also earns the finish bonus and no records or beats (nothing before it).
    expect(w.xpParts).toMatchObject({ sets: 75, cardio: 0 });
    expect(w.xp).toBeGreaterThan(75);
    expect(out.workouts!.every((x) => typeof x.xp === 'number' && x.xpParts && x.marks)).toBe(true);
  });

  it('leaves states without plan days alone', () => {
    const s = emptyState();
    expect(migrate(s)).toEqual(s);
    expect(migrate({ ...s, days: {} })).toEqual(s);
  });
});

describe('XP after the migration', () => {
  it('comes from workouts, weigh-ins, badges and goals, never from days', () => {
    const state = migrate(withRoutines());
    const xp = totalXp(state, TODAY);
    let badges = 0;
    for (const b of allEarnedBadges(state, TODAY)) badges += b.kind === 'lifetime' ? XP.badgeTier[b.tier] : b.kind === 'monthly' ? XP.monthlyBadge : XP.specialBadge;
    const goals = state.goals.filter((g) => goalStatus(g, state, TODAY) === 'achieved').reduce((n, g) => n + goalReward(g), 0);
    expect(xp).toBe(workoutXpTotal(state, TODAY) + Object.keys(state.weights).length * XP.weighIn + badges + goals);
    expect(computeProgress(state, TODAY).xp).toBe(xp);
  });

  it('gets nothing from days themselves: the raw legacy state scores the same with or without them', () => {
    const noDays: LegacyState = { ...legacyPlanState, days: {} };
    expect(totalXp(legacyPlanState, TODAY)).toBe(totalXp(noDays, TODAY));
    expect(workoutXpTotal(legacyPlanState, TODAY)).toBe(0);
  });

  it('keeps the goals working on the migrated workouts', () => {
    const state = migrate(withRoutines());
    const g2 = state.goals.find((g) => g.id === 'g2')!; // 8 workouts since 26 Sep
    expect(goalStatus(g2, state, TODAY)).toBe('achieved');
  });
});

// ---------------- The store ----------------

function memoryKv(seed: Record<string, unknown> = {}): KV & { data: Map<string, unknown>; writes: string[] } {
  const data = new Map<string, unknown>(Object.entries(structuredClone(seed)));
  const writes: string[] = [];
  return {
    data,
    writes,
    async get<T>(key: string) {
      return (data.get(key) as T) ?? null;
    },
    async set(key, value) {
      writes.push(key);
      data.set(key, structuredClone(value));
    },
    async scan(pattern) {
      const [head, tail] = pattern.split('*');
      return [...data.keys()].filter((k) => k.startsWith(head) && k.endsWith(tail));
    },
  };
}

const OWNER = 'owner@example.com';
const STATE = 'wt:user:sub:state';
const BACKUP = 'wt:user:sub:backup:v7';
let prevOwner: string | undefined;

beforeEach(() => {
  prevOwner = process.env.OWNER_EMAIL;
  process.env.OWNER_EMAIL = OWNER;
});
afterEach(() => {
  if (prevOwner === undefined) delete process.env.OWNER_EMAIL;
  else process.env.OWNER_EMAIL = prevOwner;
});

describe('the store on read', () => {
  it('backs up the raw state, migrates it and saves', async () => {
    const raw = withRoutines();
    const kv = memoryKv({ [STATE]: raw });
    const s = await createStore(kv).getState('sub', OWNER);
    expect(s).not.toHaveProperty('days');
    expect(s.workouts).toHaveLength(Object.keys(legacyPlanState.days!).length);
    expect(byDate(s, '2026-09-26').routineId).toBe('seed-full-body');
    expect(kv.data.get(BACKUP)).toEqual(raw); // untouched, days and all
    expect(kv.data.get(STATE)).toEqual(s);
    expect(kv.data.get(STATE)).not.toHaveProperty('days');
  });

  it('writes the backup once and never overwrites it', async () => {
    const raw = withRoutines();
    const kv = memoryKv({ [STATE]: raw });
    const store = createStore(kv);
    await store.getState('sub', OWNER);
    expect(kv.writes.filter((k) => k === BACKUP)).toHaveLength(1);
    // Reading again finds nothing to migrate and writes nothing.
    const before = kv.writes.length;
    await store.getState('sub', OWNER);
    expect(kv.writes).toHaveLength(before);
    // Plan days that turn up again (a stale writer) are migrated, but the backup stays the first one.
    await store.saveState('sub', { ...(kv.data.get(STATE) as AppState), days: { '2026-09-26': { items: { s0: { at: '2026-09-26T08:00:00.000Z' } } } } } as unknown as AppState);
    await store.getState('sub', OWNER);
    expect(kv.data.get(BACKUP)).toEqual(raw);
    expect(kv.writes.filter((k) => k === BACKUP)).toHaveLength(1);
  });

  it('does not overwrite a backup that is already there', async () => {
    const old = { version: 2, weights: { '2026-01-01': 90 }, goals: [], days: {} };
    const kv = memoryKv({ [STATE]: withRoutines(), [BACKUP]: old });
    await createStore(kv).getState('sub', OWNER);
    expect(kv.data.get(BACKUP)).toEqual(old);
    expect(kv.writes).not.toContain(BACKUP);
  });

  it('copies the owner legacy progress once, migrated, with the legacy key untouched and a backup', async () => {
    const kv = memoryKv({ 'wt:state:v2': legacyPlanState });
    const s = await createStore(kv).getState('sub', OWNER);
    expect(s).not.toHaveProperty('days');
    expect(s.workouts).toHaveLength(Object.keys(legacyPlanState.days!).length);
    expect(s.routines).toBeUndefined(); // no seeding any more
    expect(byDate(s, '2026-09-26').routineId).toBeUndefined();
    expect(kv.data.get(BACKUP)).toEqual(legacyPlanState);
    expect(kv.data.get('wt:state:v2')).toEqual(legacyPlanState);
    expect(kv.data.get(STATE)).toEqual(s);
  });

  it('migrates a pre-v2 owner state from the oldest legacy key', async () => {
    const v1 = {
      completions: { '2026-09-26': { at: '2026-09-26T10:00:00.000Z' }, '2026-09-27': { at: '2026-09-27T10:00:00.000Z' }, '2026-10-08': { at: '2026-10-08T10:00:00.000Z' } },
      weights: { '2026-09-26': 110 },
      goals: [],
    };
    const kv = memoryKv({ 'wt:state': v1 });
    const s = await createStore(kv).getState('sub', OWNER);
    // The rest day is dropped. 27 Sep was a cycle day, so the ride is there with its planned minutes.
    expect(s.workouts!.map((w) => w.id)).toEqual(['w-plan-2026-09-26', 'w-plan-2026-09-27']);
    expect(byDate(s, '2026-09-27').items.at(-1)).toEqual({ exerciseId: 'bike', sets: [{ min: 10, done: true }] });
    expect(kv.data.get('wt:state')).toEqual(v1);
  });

  it('sets the note flag for a state that had plan days or workouts, and for nobody else', async () => {
    const days = await createStore(memoryKv({ [STATE]: legacyPlanState })).getState('sub', OWNER);
    expect(days.rulesV2Note).toBe(true);

    const w = byDate(migrate(legacyPlanState), '2026-09-26');
    const withWorkouts = { ...emptyState(), workouts: [w] };
    expect((await createStore(memoryKv({ [STATE]: withWorkouts })).getState('sub', 'x@example.com')).rulesV2Note).toBe(true);

    // A saved state with nothing in it is marked as having no note, so a first workout later does not trigger it.
    const kv = memoryKv({ [STATE]: emptyState() });
    const store = createStore(kv);
    expect((await store.getState('sub', 'x@example.com')).rulesV2Note).toBe(false);
    await store.saveState('sub', { ...emptyState(), rulesV2Note: false, workouts: [w] });
    expect((await store.getState('sub', 'x@example.com')).rulesV2Note).toBe(false);

    // New users and a brand new owner start without it.
    expect((await createStore(memoryKv()).getState('sub', 'new@example.com')).rulesV2Note).toBe(false);
    expect((await createStore(memoryKv()).getState('sub', OWNER)).rulesV2Note).toBe(false);
  });

  it('leaves the flag alone once the note has been seen', async () => {
    const kv = memoryKv({ [STATE]: { ...emptyState(), workouts: [byDate(migrate(legacyPlanState), '2026-09-26')], rulesV2Note: false } });
    expect((await createStore(kv).getState('sub', 'x@example.com')).rulesV2Note).toBe(false);
    expect(kv.writes).toEqual([]);
  });

  it('never seeds routines: an owner keeps what they have and starts with none otherwise', async () => {
    const kv = memoryKv({ [STATE]: { ...emptyState(), rulesV2Note: false } });
    expect((await createStore(kv).getState('sub', OWNER)).routines).toBeUndefined();
    expect((await createStore(memoryKv()).getState('sub', OWNER)).routines).toEqual([]);
    const mine = seedRoutines().slice(0, 2);
    const kv2 = memoryKv({ [STATE]: { ...emptyState(), routines: mine, rulesV2Note: false } });
    expect((await createStore(kv2).getState('sub', OWNER)).routines).toEqual(mine);
  });
});
