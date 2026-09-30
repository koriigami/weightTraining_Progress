import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createStore, newUserState } from '../lib/store';
import type { KV } from '../lib/store';
import { emptyState } from '../lib/progress';
import type { AppState } from '../lib/progress';
import { resolvePrefs } from '../lib/routines';
import { legacyPlanState } from './fixtures/legacyPlanState';

function memoryKv(seed: Record<string, unknown> = {}): KV & { data: Map<string, unknown> } {
  const data = new Map<string, unknown>(Object.entries(structuredClone(seed)));
  return {
    data,
    async get<T>(key: string) {
      return (data.get(key) as T) ?? null;
    },
    async set(key, value) {
      data.set(key, structuredClone(value));
    },
    async scan(pattern) {
      const [head, tail] = pattern.split('*');
      return [...data.keys()].filter((k) => k.startsWith(head) && k.endsWith(tail));
    },
  };
}

const OWNER = 'owner@example.com';
let prevOwner: string | undefined;

beforeEach(() => {
  prevOwner = process.env.OWNER_EMAIL;
  process.env.OWNER_EMAIL = OWNER;
});
afterEach(() => {
  if (prevOwner === undefined) delete process.env.OWNER_EMAIL;
  else process.env.OWNER_EMAIL = prevOwner;
});

describe('per-user state', () => {
  it('gives an owner with nothing saved no routines and no prefs, so they skip onboarding', async () => {
    const s = await createStore(memoryKv()).getState('owner-sub', OWNER);
    expect(s.routines).toEqual([]);
    expect(s.prefs).toBeUndefined();
    expect(resolvePrefs(s).onboarded).toBe(true);
    expect(s).not.toHaveProperty('days');
  });

  it('gives everyone else empty routines and prefs that are not onboarded', async () => {
    const store = createStore(memoryKv({ 'wt:state:v2': legacyPlanState }));
    const s = await store.getState('other-sub', 'other@example.com');
    expect(s.routines).toEqual([]);
    expect(s.prefs?.onboarded).toBe(false);
    expect(s.workouts).toBeUndefined();
    // Someone else's saved state is not given routines.
    const kv = memoryKv({ 'wt:user:other-sub:state': { ...emptyState(), rulesV2Note: false } });
    expect((await createStore(kv).getState('other-sub', 'other@example.com')).routines).toBeUndefined();
  });

  it('returns a saved state as it is, with the new fields intact', async () => {
    const kv = memoryKv();
    const store = createStore(kv);
    const saved: AppState = { ...newUserState(), routines: [{ id: 'r', title: 'R', items: [] }] };
    await store.saveState('u', saved);
    expect(await store.getState('u', 'u@example.com')).toEqual(saved);
  });
});

describe('listing users', () => {
  it('lists the ids that have a saved state, whatever they look like', async () => {
    const kv = memoryKv({
      'wt:user:123:state': emptyState(),
      'wt:user:dev:a@b.co:state': emptyState(),
      'wt:user:123:profile': {},
      'wt:user:123:backup:v7': {},
    });
    expect((await createStore(kv).listUserIds()).sort()).toEqual(['123', 'dev:a@b.co']);
  });
});
