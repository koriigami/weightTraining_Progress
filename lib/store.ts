import { Redis } from '@upstash/redis';
import { emptyState, planDay, strengthKeys, coreKeys } from './progress';
import type { AppState, DayLog, Goal } from './progress';

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

export async function getState(): Promise<AppState> {
  if (useMemoryStore()) {
    if (!globalForStore.__wtMemoryStateV2) {
      globalForStore.__wtMemoryStateV2 = globalForStore.__wtMemoryState
        ? migrateV1ToV2(globalForStore.__wtMemoryState)
        : emptyState();
    }
    globalForStore.__wtMemoryStateV2 = backfillGoalCreatedAt(globalForStore.__wtMemoryStateV2);
    return globalForStore.__wtMemoryStateV2;
  }
  const redis = getRedis();
  const v2 = await redis.get<AppState>(STATE_KEY_V2);
  if (v2) return backfillGoalCreatedAt(v2);
  const v1 = await redis.get<V1AppState>(STATE_KEY_V1);
  if (v1) {
    const migrated = migrateV1ToV2(v1);
    await redis.set(STATE_KEY_V2, migrated);
    return migrated;
  }
  return emptyState();
}

export async function saveState(state: AppState): Promise<void> {
  if (useMemoryStore()) {
    globalForStore.__wtMemoryStateV2 = state;
    return;
  }
  const redis = getRedis();
  await redis.set(STATE_KEY_V2, state);
}
