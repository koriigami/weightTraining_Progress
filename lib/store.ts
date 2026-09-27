import { Redis } from '@upstash/redis';
import { AppState, emptyState } from './progress';

const STATE_KEY = 'wt:state';

// Next.js dev re-evaluates route modules when a new route is compiled, which would
// reset a plain module-scope variable. globalThis survives that, so the dev-only
// memory store is attached there instead.
const globalForStore = globalThis as unknown as { __wtMemoryState?: AppState };

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

export async function getState(): Promise<AppState> {
  if (useMemoryStore()) {
    if (!globalForStore.__wtMemoryState) globalForStore.__wtMemoryState = emptyState();
    return globalForStore.__wtMemoryState;
  }
  const redis = getRedis();
  const state = await redis.get<AppState>(STATE_KEY);
  return state ?? emptyState();
}

export async function saveState(state: AppState): Promise<void> {
  if (useMemoryStore()) {
    globalForStore.__wtMemoryState = state;
    return;
  }
  const redis = getRedis();
  await redis.set(STATE_KEY, state);
}
