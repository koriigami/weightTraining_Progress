import { describe, expect, it } from 'vitest';
import { EXPLORE_CHIPS, exploreGroups, exploreOrder, findStarter, fitsEquipment, isStarterAdded } from '../lib/explore';
import { STARTER_GROUPS, STARTER_ROUTINES, availableEquipment, defaultPrefs, instantiateRoutine } from '../lib/routines';

describe('explore groups', () => {
  it('has a chip for each type', () => {
    expect(EXPLORE_CHIPS.map((c) => c.label)).toEqual(['All', 'Strength', 'Running', 'Walking', 'Cycling']);
  });

  it('shows Running, Walking and Cycling as groups', () => {
    const titles = exploreGroups('all', 'home').map((g) => g.title);
    expect(titles).toEqual(expect.arrayContaining(['Running', 'Walking', 'Cycling']));
    expect(exploreGroups('running', 'home').map((g) => g.title)).toEqual(['Running']);
    expect(exploreGroups('running', 'home')[0].routines.map((r) => r.title)).toEqual(['Easy Run', 'Couch to 5K: Week 1', '6 x 400 m Intervals', 'Long Run']);
    expect(exploreGroups('walking', 'home')[0].routines.map((r) => r.title)).toEqual(['Brisk Walk', 'Incline Treadmill Walk']);
    expect(exploreGroups('cycling', 'home')[0].routines.map((r) => r.title)).toEqual(['Zone 2 Ride', 'Bike Intervals']);
  });

  it('strength chip keeps the three strength groups in order', () => {
    expect(exploreGroups('strength', 'gym').map((g) => g.title)).toEqual(['Dumbbells at home', 'Gym', 'No equipment']);
  });

  it('puts strength first for most people and running and walking first with no equipment', () => {
    expect(exploreOrder('home')).toEqual(['strength', 'running', 'walking', 'cycling']);
    expect(exploreGroups('all', 'home')[0].kind).toBe('strength');
    const none = exploreGroups('all', 'none').map((g) => g.kind);
    expect(none.slice(0, 2)).toEqual(['running', 'walking']);
    expect(none).toHaveLength(STARTER_GROUPS.length);
  });

  it('does not change the source list', () => {
    const before = STARTER_GROUPS.map((g) => g.id);
    exploreGroups('all', 'none');
    expect(STARTER_GROUPS.map((g) => g.id)).toEqual(before);
  });
});

describe('fits your equipment', () => {
  it('needs every exercise to use equipment the person has', () => {
    const home = availableEquipment({ ...defaultPrefs(), equipment: { kind: 'home', has: ['dumbbell'], dumbbellKg: [] } });
    expect(fitsEquipment(findStarter('starter-arms-shoulders')!, home)).toBe(true);
    expect(fitsEquipment(findStarter('starter-gym-push')!, home)).toBe(false);
    expect(fitsEquipment(findStarter('starter-easy-run')!, home)).toBe(true);
    expect(fitsEquipment(findStarter('starter-zone2')!, home)).toBe(false);
  });

  it('a gym has everything', () => {
    const gym = availableEquipment({ ...defaultPrefs(), equipment: { kind: 'gym', has: [], dumbbellKg: [] } });
    expect(STARTER_ROUTINES.every((r) => fitsEquipment(r, gym))).toBe(true);
  });
});

describe('added starters', () => {
  const starter = findStarter('starter-full-body-a')!;

  it('finds a starter by id', () => {
    expect(starter.title).toBe('Full Body A');
    expect(findStarter('nope')).toBeUndefined();
  });

  it('is added once a copy is in My routines, even after its weights change', () => {
    expect(isStarterAdded(starter, [])).toBe(false);
    const copy = instantiateRoutine(starter, 'r-1');
    expect(isStarterAdded(starter, [copy])).toBe(true);
    copy.items[0].sets[0].kg = 99;
    expect(isStarterAdded(starter, [copy])).toBe(true);
  });

  it('is not added when the title or the exercises differ', () => {
    const renamed = { ...instantiateRoutine(starter, 'r-1'), title: 'My own' };
    expect(isStarterAdded(starter, [renamed])).toBe(false);
    const other = instantiateRoutine(findStarter('starter-full-body-b')!, 'r-2');
    expect(isStarterAdded(starter, [{ ...other, title: 'Full Body A' }])).toBe(false);
  });
});
