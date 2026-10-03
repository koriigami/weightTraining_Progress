import { Redis } from '@upstash/redis';
import { emptyState } from './progress';
import type { AppState, Goal } from './progress';
import { defaultPrefs } from './routines';
import { completionToDayLog, hasLegacyDays, migratePlanDays } from './migrations/planDays';
import type { LegacyDayLog, LegacyState } from './migrations/planDays';
import { todayStr } from './date';
import { cleanDates, cleanList } from './invites';
import type { InviteDates } from './invites';
import { isOwnerEmail } from './owner';
import { rescoreWorkouts } from './workoutScoring';
import { latestNewsId } from './news';

const STATE_KEY_V2 = 'wt:state:v2';
const STATE_KEY_V1 = 'wt:state';

// Next.js dev re-evaluates route modules when a new route is compiled, which would
// reset a plain module-scope variable. globalThis survives that, so the dev-only
// memory store is attached there instead.
const globalForStore = globalThis as unknown as { __wtMemoryStateV2?: AppState; __wtMemoryState?: V1AppState };

function hasRedisEnv(): boolean {
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
  return Boolean(url && token);
}

function getRedis(): Redis {
  if (!hasRedisEnv()) {
    throw new Error('Redis env vars are missing in production. Set up Upstash Redis and redeploy.');
  }
  return Redis.fromEnv();
}

function useMemoryStore(): boolean {
  return !hasRedisEnv() && process.env.NODE_ENV !== 'production';
}

// ---------------- v1 -> v2 migration ----------------

type V1Goal = {
  id: string;
  type: 'workouts' | 'pushups' | 'cardio-minutes' | 'streak' | 'weight';
  target: number;
  start: string;
  deadline: string;
};

type V1AppState = {
  completions: Record<string, { at: string }>;
  weights: Record<string, number>;
  goals: V1Goal[];
};

// A v1 completion becomes a plan day log with every strength, core and cardio item
// ticked (at = v1 at), cardio minutes = planned minutes, no km. It is turned into
// workouts on read, like any other state that still has plan days. v1 weight goals
// get direction 'lose' and a baseline (first weight on or after the goal's
// start, else 110).
// A goal's createdAt anchors anti-farming: progress only counts from then on.
// A goal migrated from before createdAt existed gets the start of its start
// date, so all of its (already-trusted, pre-feature) history still counts.
function backfillCreatedAt(start: string): string {
  return `${start}T00:00:00Z`;
}

export function migrateV1ToV2(v1: V1AppState): LegacyState {
  const days: Record<string, LegacyDayLog> = {};
  for (const [date, c] of Object.entries(v1.completions)) {
    const log = completionToDayLog(date, c.at);
    if (log) days[date] = log;
  }

  const goals: Goal[] = v1.goals.map((g): Goal => {
    if (g.type === 'weight') {
      const weightDates = Object.keys(v1.weights)
        .filter((d) => d >= g.start)
        .sort();
      const baseline = weightDates.length ? v1.weights[weightDates[0]] : 110;
      return {
        id: g.id,
        type: 'weight',
        target: g.target,
        start: g.start,
        deadline: g.deadline,
        createdAt: backfillCreatedAt(g.start),
        direction: 'lose',
        baseline,
      };
    }
    return {
      id: g.id,
      type: g.type,
      target: g.target,
      start: g.start,
      deadline: g.deadline,
      createdAt: backfillCreatedAt(g.start),
    };
  });

  return { version: 2, days, weights: { ...v1.weights }, goals };
}

// Fills in createdAt for any goal saved before the field existed (v2 states
// written before this migration). Idempotent: a goal that already has it is
// left untouched.
export function backfillGoalCreatedAt<T extends AppState>(state: T): T {
  if (state.goals.every((g) => typeof g.createdAt === 'string')) return state;
  return {
    ...state,
    goals: state.goals.map((g) => (typeof g.createdAt === 'string' ? g : { ...g, createdAt: backfillCreatedAt(g.start) })),
  };
}

// Someone new starts with no routines, has not been through onboarding yet and
// has no "XP was worked out again" notes to see. The guide waits for them, and the
// updates up to today count as seen: they only hear about what changes after they joined.
export function newUserState(): AppState {
  return {
    ...emptyState(),
    routines: [],
    prefs: defaultPrefs(),
    rulesV2Note: false,
    rulesV3Note: false,
    rulesV4Note: false,
    guideDone: false,
    newsSeen: latestNewsId(),
  };
}

export type Profile = { email: string; name: string; image: string; createdAt: string };

// Minimal key-value surface so the same logic runs on Redis and on the dev memory store.
export type KV = {
  get<T>(key: string): Promise<T | null>;
  set(key: string, value: unknown): Promise<void>;
  // Every key that matches a glob pattern such as `wt:user:*:state`.
  scan(pattern: string): Promise<string[]>;
};

const stateKey = (userId: string) => `wt:user:${userId}:state`;
const profileKey = (userId: string) => `wt:user:${userId}:profile`;
// The state exactly as it was before the plan days became workouts, kept once.
// The emails allowed to sign in while invite-only, a list of lowercased emails.
const INVITES_KEY = 'wt:invites';
// The day each invite was added, by email. Kept apart from the list so the list sign-in reads never changes shape.
const INVITE_DATES_KEY = 'wt:invites:dates';
const backupKey = (userId: string) => `wt:user:${userId}:backup:v7`;
// The state exactly as it was before the weekly goal bonus started to grow (v11), kept once.
const backupKeyV11 = (userId: string) => `wt:user:${userId}:backup:v11`;

export function createStore(kv: KV) {
  // Brings a state read for the first time under v8, v10 or v11 up to date. A state
  // that still has plan days is copied untouched to the v7 backup (only if that key
  // is free), its days become workouts and the result is saved. A state without the
  // rulesV2Note flag gets it, once: true when it already had workouts or plan days,
  // false otherwise. The rulesV3Note flag works the same way for the daily bonus
  // rules, and rulesV4Note for the weekly goal bonus that grows. Either one works
  // every workout's stored XP out again, so what the workout pages show matches the
  // new rules. For v4 a state that already has workouts is also copied untouched to
  // the v11 backup first (only if that key is free), since their stored XP is
  // replaced. A state with none of these is returned as it is, and nothing is
  // written for a goal that only needed its createdAt filled in. guideDone and
  // newsSeen are never filled in here: a state without them is someone who joined
  // before they existed, and that is what they are read as.
  async function upgrade(userId: string, raw: LegacyState): Promise<AppState> {
    const state = backfillGoalCreatedAt(raw);
    const hadDays = hasLegacyDays(raw);
    const noteUnset = raw.rulesV2Note === undefined;
    const noteV3Unset = raw.rulesV3Note === undefined;
    const noteV4Unset = raw.rulesV4Note === undefined;
    if (!hadDays && !('days' in raw) && !noteUnset && !noteV3Unset && !noteV4Unset) return state;
    if (hadDays && (await kv.get(backupKey(userId))) === null) await kv.set(backupKey(userId), raw);
    const migrated = migratePlanDays(state, { today: todayStr() });
    const hadData = hadDays || (raw.workouts ?? []).length > 0;
    let next: AppState = noteUnset ? { ...migrated, rulesV2Note: hadData } : migrated;
    if (noteV3Unset || noteV4Unset) {
      const workouts = next.workouts ?? [];
      if (noteV4Unset && (raw.workouts ?? []).length > 0 && (await kv.get(backupKeyV11(userId))) === null) await kv.set(backupKeyV11(userId), raw);
      if (workouts.length > 0) next = { ...next, workouts: rescoreWorkouts(next, workouts, todayStr()) };
      if (noteV3Unset) next = { ...next, rulesV3Note: workouts.length > 0 };
      if (noteV4Unset) next = { ...next, rulesV4Note: workouts.length > 0 };
    }
    await kv.set(stateKey(userId), next);
    return next;
  }

  return {
    async getState(userId: string, email?: string | null): Promise<AppState> {
      const existing = await kv.get<LegacyState>(stateKey(userId));
      if (existing) return upgrade(userId, existing);
      if (isOwnerEmail(email)) {
        // Copy the legacy single-user progress once. Legacy keys are never written or deleted.
        const v2 = await kv.get<LegacyState>(STATE_KEY_V2);
        const v1 = v2 ? null : await kv.get<V1AppState>(STATE_KEY_V1);
        const legacy = v2 ?? (v1 ? migrateV1ToV2(v1) : null);
        if (legacy) return upgrade(userId, structuredClone(legacy));
        // The owner has no prefs of their own, which reads as their setup and skips onboarding.
        return { ...emptyState(), routines: [], rulesV2Note: false, rulesV3Note: false, rulesV4Note: false, guideDone: false, newsSeen: latestNewsId() };
      }
      return newUserState();
    },
    async saveState(userId: string, state: AppState): Promise<void> {
      await kv.set(stateKey(userId), state);
    },
    async getProfile(userId: string): Promise<Profile | null> {
      return kv.get<Profile>(profileKey(userId));
    },
    // The id of everyone who has signed in or saved a state, for the owner's Insights. Someone
    // who signed in and left before saving anything has a profile and no state, and still counts.
    async listUserIds(): Promise<string[]> {
      const [states, profiles] = await Promise.all([kv.scan('wt:user:*:state'), kv.scan('wt:user:*:profile')]);
      const ids = new Set([
        ...states.map((k) => k.slice('wt:user:'.length, -':state'.length)),
        ...profiles.map((k) => k.slice('wt:user:'.length, -':profile'.length)),
      ]);
      return [...ids];
    },
    // The invite list. Server only: it is never sent to a browser.
    async getInvites(): Promise<string[]> {
      return cleanList(await kv.get<string[]>(INVITES_KEY));
    },
    async saveInvites(emails: string[]): Promise<void> {
      await kv.set(INVITES_KEY, cleanList(emails));
    },
    async getInviteDates(): Promise<InviteDates> {
      return cleanDates(await kv.get<InviteDates>(INVITE_DATES_KEY));
    },
    async saveInviteDates(dates: InviteDates): Promise<void> {
      await kv.set(INVITE_DATES_KEY, cleanDates(dates));
    },
    async saveProfile(userId: string, p: Omit<Profile, 'createdAt'>): Promise<void> {
      const prev = await kv.get<Profile>(profileKey(userId));
      await kv.set(profileKey(userId), { ...p, createdAt: prev?.createdAt ?? new Date().toISOString() });
    },
  };
}

const globalKv = globalThis as unknown as { __wtMemoryKv?: Map<string, unknown> };

// Dev-only memory store. The legacy slots can be seeded (globalThis.__wtMemoryStateV2 / __wtMemoryState)
// and are read-only here. Per-user data lives in the Map.
const memoryKv: KV = {
  async get<T>(key: string) {
    if (key === STATE_KEY_V2) return (globalForStore.__wtMemoryStateV2 as T) ?? null;
    if (key === STATE_KEY_V1) return (globalForStore.__wtMemoryState as T) ?? null;
    return ((globalKv.__wtMemoryKv ??= new Map()).get(key) as T) ?? null;
  },
  async set(key, value) {
    (globalKv.__wtMemoryKv ??= new Map()).set(key, structuredClone(value));
  },
  async scan(pattern) {
    const [head, tail] = pattern.split('*');
    return [...(globalKv.__wtMemoryKv ??= new Map()).keys()].filter((k) => k.startsWith(head) && k.endsWith(tail));
  },
};

const redisKv: KV = {
  async get<T>(key: string) {
    return getRedis().get<T>(key);
  },
  async set(key, value) {
    await getRedis().set(key, value);
  },
  async scan(pattern) {
    const redis = getRedis();
    const keys: string[] = [];
    let cursor = '0';
    do {
      const [next, batch] = await redis.scan(cursor, { match: pattern, count: 200 });
      cursor = String(next);
      keys.push(...batch);
    } while (cursor !== '0');
    return [...new Set(keys)];
  },
};

function active() {
  return createStore(useMemoryStore() ? memoryKv : redisKv);
}

export const getState = (userId: string, email?: string | null) => active().getState(userId, email);
export const saveState = (userId: string, state: AppState) => active().saveState(userId, state);
export const getProfile = (userId: string) => active().getProfile(userId);
export const listUserIds = () => active().listUserIds();
export const saveProfile = (userId: string, p: Omit<Profile, 'createdAt'>) => active().saveProfile(userId, p);
export const getInvites = () => active().getInvites();
export const saveInvites = (emails: string[]) => active().saveInvites(emails);
export const getInviteDates = () => active().getInviteDates();
export const saveInviteDates = (dates: InviteDates) => active().saveInviteDates(dates);
