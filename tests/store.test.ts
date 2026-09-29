import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createStore, newUserState, withOwnerRoutines } from '../lib/store';
import type { KV } from '../lib/store';
import { emptyState } from '../lib/progress';
import type { AppState } from '../lib/progress';
import legacy from './fixtures/legacyState.json';

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
  };
}

const OWNER = 'owner@example.com';
const legacyState = legacy as unknown as AppState;
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
  it('copies the legacy progress for the owner once, seeds routines, and leaves the legacy key alone', async () => {
    const kv = memoryKv({ 'wt:state:v2': legacyState });
    const store = createStore(kv);
    const s = await store.getState('owner-sub', OWNER);
    expect(s.days).toEqual(legacyState.days);
    expect(s.weights).toEqual(legacyState.weights);
    expect(s.routines?.map((r) => r.title)).toEqual(['Push A', 'Pull A', 'Legs', 'Push B', 'Pull B', 'Full Body']);
    expect(s.workouts).toBeUndefined();
    expect(s.version).toBe(2);
    expect((kv.data.get('wt:user:owner-sub:state') as AppState).routines).toHaveLength(6);
    expect(kv.data.get('wt:state:v2')).toEqual(legacyState);
  });

  it('seeds routines for an owner whose state was already migrated, once', async () => {
    const kv = memoryKv({ 'wt:user:owner-sub:state': legacyState });
    const store = createStore(kv);
    const first = await store.getState('owner-sub', OWNER);
    expect(first.routines).toHaveLength(6);
    expect(first.days).toEqual(legacyState.days);
    // Deleting every routine leaves an empty list, which is not seeded again.
    await store.saveState('owner-sub', { ...first, routines: [] });
    expect((await store.getState('owner-sub', OWNER)).routines).toEqual([]);
  });

  it('seeds routines for an owner with nothing saved yet', async () => {
    const s = await createStore(memoryKv()).getState('owner-sub', OWNER);
    expect(s.routines).toHaveLength(6);
    expect(s.days).toEqual({});
  });

  it('gives everyone else empty routines and prefs that are not onboarded', async () => {
    const store = createStore(memoryKv({ 'wt:state:v2': legacyState }));
    const s = await store.getState('other-sub', 'other@example.com');
    expect(s.routines).toEqual([]);
    expect(s.prefs?.onboarded).toBe(false);
    expect(s.days).toEqual({});
    // Someone else's saved state is not given routines.
    const kv = memoryKv({ 'wt:user:other-sub:state': emptyState() });
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

describe('helpers', () => {
  it('withOwnerRoutines only fills in missing routines', () => {
    expect(withOwnerRoutines(emptyState()).routines).toHaveLength(6);
    const own = { ...emptyState(), routines: [] };
    expect(withOwnerRoutines(own)).toBe(own);
  });
});
