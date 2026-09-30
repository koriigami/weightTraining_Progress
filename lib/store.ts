import { Redis } from '@upstash/redis';
import { emptyState } from './progress';
import type { AppState, Goal } from './progress';
import { defaultPrefs } from './routines';
import { completionToDayLog, hasLegacyDays, migratePlanDays } from './migrations/planDays';
import type { LegacyDayLog, LegacyState } from './migrations/planDays';
import { todayStr } from './date';
import { isOwnerEmail } from './owner';

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
// has no "XP was worked out again" note to see.
export function newUserState(): AppState {
  return { ...emptyState(), routines: [], prefs: defaultPrefs(), rulesV2Note: false };
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
const backupKey = (userId: string) => `wt:user:${userId}:backup:v7`;

export function createStore(kv: KV) {
  // Brings a state read for the first time under v8 up to date. A state that still
  // has plan days is copied untouched to the v7 backup (only if that key is free),
  // its days become workouts and the result is saved. A state without the
  // rulesV2Note flag gets it, once: true when it already had workouts or plan days,
  // false otherwise. A state with neither is returned as it is, and nothing is
  // written for a goal that only needed its createdAt filled in.
  async function upgrade(userId: string, raw: LegacyState): Promise<AppState> {
    const state = backfillGoalCreatedAt(raw);
    const hadDays = hasLegacyDays(raw);
    const noteUnset = raw.rulesV2Note === undefined;
    if (!hadDays && !('days' in raw) && !noteUnset) return state;
    if (hadDays && (await kv.get(backupKey(userId))) === null) await kv.set(backupKey(userId), raw);
    const migrated = migratePlanDays(state, { today: todayStr() });
    const hadData = hadDays || (raw.workouts ?? []).length > 0;
    const next: AppState = noteUnset ? { ...migrated, rulesV2Note: hadData } : migrated;
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
        return { ...emptyState(), routines: [], rulesV2Note: false };
      }
      return newUserState();
    },
    async saveState(userId: string, state: AppState): Promise<void> {
      await kv.set(stateKey(userId), state);
    },
    async getProfile(userId: string): Promise<Profile | null> {
      return kv.get<Profile>(profileKey(userId));
    },
    // The id of everyone who has a saved state, for the owner's Insights.
    async listUserIds(): Promise<string[]> {
      const keys = await kv.scan('wt:user:*:state');
      return keys.map((k) => k.slice('wt:user:'.length, -':state'.length));
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
