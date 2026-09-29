import { Redis } from '@upstash/redis';
import { emptyState, planDay, strengthKeys, coreKeys } from './progress';
import type { AppState, DayLog, Goal } from './progress';
import { defaultPrefs, seedOwnerRoutines } from './routines';

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

// A v1 completion becomes a DayLog with every strength, core and cardio item
// ticked (at = v1 at), cardio minutes = planned minutes, no km. v1 weight goals
// get direction 'lose' and a baseline (first weight on or after the goal's
// start, else 110).
// A goal's createdAt anchors anti-farming: progress only counts from then on.
// A goal migrated from before createdAt existed gets the start of its start
// date, so all of its (already-trusted, pre-feature) history still counts.
function backfillCreatedAt(start: string): string {
  return `${start}T00:00:00Z`;
}

export function migrateV1ToV2(v1: V1AppState): AppState {
  const days: Record<string, DayLog> = {};
  for (const [date, c] of Object.entries(v1.completions)) {
    const day = planDay(date);
    if (!day) continue;
    const items: Record<string, { at: string }> = {};
    strengthKeys(day).forEach((k) => {
      items[k] = { at: c.at };
    });
    coreKeys(day).forEach((k) => {
      items[k] = { at: c.at };
    });
    const log: DayLog = { items };
    if (day.cardio) log.cardio = { minutes: day.cardio.minutes, at: c.at };
    days[date] = log;
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
export function backfillGoalCreatedAt(state: AppState): AppState {
  if (state.goals.every((g) => typeof g.createdAt === 'string')) return state;
  return {
    ...state,
    goals: state.goals.map((g) => (typeof g.createdAt === 'string' ? g : { ...g, createdAt: backfillCreatedAt(g.start) })),
  };
}

// Someone new who is not the owner starts with no routines and has not been
// through onboarding yet.
export function newUserState(): AppState {
  return { ...emptyState(), routines: [], prefs: defaultPrefs() };
}

// The owner's plan sessions become routines, once: only while routines has never
// been set. An owner who deletes them all keeps an empty list.
export function withOwnerRoutines(state: AppState): AppState {
  return state.routines === undefined ? { ...state, routines: seedOwnerRoutines() } : state;
}

export type Profile = { email: string; name: string; image: string; createdAt: string };

// Minimal key-value surface so the same logic runs on Redis and on the dev memory store.
export type KV = {
  get<T>(key: string): Promise<T | null>;
  set(key: string, value: unknown): Promise<void>;
};

const stateKey = (userId: string) => `wt:user:${userId}:state`;
const profileKey = (userId: string) => `wt:user:${userId}:profile`;

function isOwner(email: string | undefined | null): boolean {
  const owner = process.env.OWNER_EMAIL?.trim().toLowerCase();
  return Boolean(owner && email && email.trim().toLowerCase() === owner);
}

export function createStore(kv: KV) {
  return {
    async getState(userId: string, email?: string | null): Promise<AppState> {
      const existing = await kv.get<AppState>(stateKey(userId));
      if (existing) {
        const state = backfillGoalCreatedAt(existing);
        if (isOwner(email) && state.routines === undefined) {
          const seeded = withOwnerRoutines(state);
          await kv.set(stateKey(userId), seeded);
          return seeded;
        }
        return state;
      }
      if (isOwner(email)) {
        // Copy the legacy single-user progress once. Legacy keys are never written or deleted.
        const v2 = await kv.get<AppState>(STATE_KEY_V2);
        const v1 = v2 ? null : await kv.get<V1AppState>(STATE_KEY_V1);
        const legacy = v2 ?? (v1 ? migrateV1ToV2(v1) : null);
        if (legacy) {
          const copied = withOwnerRoutines(backfillGoalCreatedAt(structuredClone(legacy)));
          await kv.set(stateKey(userId), copied);
          return copied;
        }
        return withOwnerRoutines(emptyState());
      }
      return newUserState();
    },
    async saveState(userId: string, state: AppState): Promise<void> {
      await kv.set(stateKey(userId), state);
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
};

const redisKv: KV = {
  async get<T>(key: string) {
    return getRedis().get<T>(key);
  },
  async set(key, value) {
    await getRedis().set(key, value);
  },
};

function active() {
  return createStore(useMemoryStore() ? memoryKv : redisKv);
}

export const getState = (userId: string, email?: string | null) => active().getState(userId, email);
export const saveState = (userId: string, state: AppState) => active().saveState(userId, state);
export const saveProfile = (userId: string, p: Omit<Profile, 'createdAt'>) => active().saveProfile(userId, p);
