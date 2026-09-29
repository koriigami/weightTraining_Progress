import { describe, expect, it } from 'vitest';
import { EXERCISES, QUICK_MUSCLE_GROUPS, exerciseById } from '../data/exercises';
import type { CustomExercise, Equipment, ExerciseDef } from '../data/exercises';
import {
  avoidReasons,
  clearFilters,
  emptyFilters,
  exerciseSubtitle,
  filterExercises,
  filterPills,
  groupExercises,
  isQuickPickOn,
  libraryOrder,
  matchesFilters,
  removePill,
  toggleInList,
  toggleQuickPick,
} from '../lib/exerciseFilter';
import { availableEquipment, defaultPrefs } from '../lib/routines';

const prefs = defaultPrefs();
const push = QUICK_MUSCLE_GROUPS.find((g) => g.id === 'push')!.muscles;

describe('multi-select filters', () => {
  it('toggles items in and out of a list', () => {
    expect(toggleInList(['chest'], 'lats')).toEqual(['chest', 'lats']);
    expect(toggleInList(['chest', 'lats'], 'chest')).toEqual(['lats']);
  });

  it('a quick pick selects all its muscles and a second tap removes them', () => {
    const on = toggleQuickPick([], push);
    expect(on).toEqual(['chest', 'shoulders', 'triceps']);
    expect(isQuickPickOn(on, push)).toBe(true);
    expect(toggleQuickPick(on, push)).toEqual([]);
  });

  it('a quick pick keeps other selected muscles and does not repeat one', () => {
    const on = toggleQuickPick(['biceps', 'chest'], push);
    expect(on).toEqual(['biceps', 'chest', 'shoulders', 'triceps']);
    expect(toggleQuickPick(on, push)).toEqual(['biceps']);
  });

  it('shows one removable pill per muscle and per equipment, muscles first', () => {
    const f = { ...emptyFilters(), muscles: ['chest' as const, 'lats' as const], equipment: ['dumbbell' as Equipment] };
    const pills = filterPills(f);
    expect(pills.map((p) => p.label)).toEqual(['Chest', 'Lats', 'Dumbbell']);
    expect(removePill(f, pills[1]).muscles).toEqual(['chest']);
    expect(removePill(f, pills[2]).equipment).toEqual([]);
  });

  it('clears muscles, equipment or both, and keeps the search text', () => {
    const f = { ...emptyFilters(), query: 'press', muscles: ['chest' as const], equipment: ['barbell' as Equipment] };
    expect(clearFilters(f, 'muscles')).toMatchObject({ muscles: [], equipment: ['barbell'], query: 'press' });
    expect(clearFilters(f, 'equipment')).toMatchObject({ muscles: ['chest'], equipment: [] });
    expect(clearFilters(f)).toMatchObject({ muscles: [], equipment: [], query: 'press' });
  });
});

describe('filtering', () => {
  it('matches a name search without caring about case', () => {
    const list = filterExercises(EXERCISES, { ...emptyFilters(), query: 'PUSH UP' }, prefs).list;
    expect(list.map((e) => e.id)).toContain('pushup');
    expect(list.every((e) => e.name.toLowerCase().includes('push up'))).toBe(true);
  });

  it('matches an exercise that works any selected muscle, as main or secondary', () => {
    const f = { ...emptyFilters(), muscles: push };
    const { list } = filterExercises(EXERCISES, f, prefs);
    expect(list.length).toBeGreaterThan(20);
    for (const e of list) expect(push.includes(e.primary) || e.secondary.some((m) => push.includes(m))).toBe(true);
    // A pure biceps curl does not work chest, shoulders or triceps.
    expect(list.map((e) => e.id)).not.toContain('db-curl');
    // Push Up works chest (main) and triceps (also).
    expect(list.map((e) => e.id)).toContain('pushup');
  });

  it('ANDs the search, the muscles and the equipment', () => {
    const f = { ...emptyFilters(), query: 'press', muscles: push, equipment: ['barbell' as Equipment] };
    const { list } = filterExercises(EXERCISES, f, prefs);
    expect(list.length).toBeGreaterThan(0);
    for (const e of list) {
      expect(e.equipment).toBe('barbell');
      expect(e.name.toLowerCase()).toContain('press');
    }
  });

  it('holds back exercises the person avoids, and shows them on request', () => {
    const avoiding = { ...prefs, avoid: ['lunges' as const], limits: [] };
    const f = { ...emptyFilters(), muscles: ['quads' as const] };
    const hiddenRun = filterExercises(EXERCISES, f, avoiding);
    expect(hiddenRun.hidden.map((e) => e.id)).toContain('db-lunge');
    expect(hiddenRun.list.map((e) => e.id)).not.toContain('db-lunge');
    const shown = filterExercises(EXERCISES, { ...f, showAvoided: true }, avoiding);
    expect(shown.hidden).toEqual([]);
    expect(shown.list.map((e) => e.id)).toContain('db-lunge');
  });

  it('hides exercises that load a joint they go easy on', () => {
    const easy = { ...prefs, avoid: [], limits: ['knees' as const] };
    const { hidden } = filterExercises(EXERCISES, emptyFilters(), easy);
    expect(hidden.map((e) => e.id)).toContain('legext');
    expect(avoidReasons(hidden, easy)).toEqual(['knees']);
  });

  it('names what caused the hiding, once each', () => {
    const p = { ...prefs, avoid: ['lunges' as const, 'jumping' as const], limits: [] };
    const { hidden } = filterExercises(EXERCISES, emptyFilters(), p);
    expect(avoidReasons(hidden, p)).toEqual(expect.arrayContaining(['lunges', 'jumping']));
    expect(new Set(avoidReasons(hidden, p)).size).toBe(avoidReasons(hidden, p).length);
  });

  it('puts the person\'s own exercises first', () => {
    const custom: CustomExercise = { id: 'custom-towel', name: 'Towel Row', equipment: 'bodyweight', primary: 'upperback', secondary: [], metric: 'reps', custom: true };
    const all = libraryOrder(EXERCISES, [custom]);
    expect(all[0].id).toBe('custom-towel');
    expect(all).toHaveLength(EXERCISES.length + 1);
    expect(libraryOrder(EXERCISES, undefined)).toHaveLength(EXERCISES.length);
  });

  it('matchesFilters treats an empty filter as everything', () => {
    expect(EXERCISES.every((e) => matchesFilters(e, emptyFilters()))).toBe(true);
  });
});

describe('grouping', () => {
  const home = { ...prefs, equipment: { kind: 'home' as const, has: ['dumbbell'], dumbbellKg: [] } };
  const mine = availableEquipment(home);

  it('without a muscle filter groups by your equipment, then the rest', () => {
    const groups = groupExercises(EXERCISES, emptyFilters(), mine);
    expect(groups.map((g) => g.title)).toEqual(['For your equipment', 'Other equipment']);
    expect(groups[0].exercises.every((e) => mine.has(e.equipment))).toBe(true);
    expect(groups[1].exercises.every((e) => !mine.has(e.equipment))).toBe(true);
  });

  it('with muscles selected, one group per muscle then an also-works group', () => {
    const f = { ...emptyFilters(), muscles: ['chest' as const, 'triceps' as const] };
    const { list } = filterExercises(EXERCISES, f, prefs);
    const groups = groupExercises(list, f, mine);
    expect(groups.map((g) => g.title)).toEqual(['Chest', 'Triceps', 'Also works these']);
    expect(groups[0].exercises.every((e) => e.primary === 'chest')).toBe(true);
    expect(groups[2].exercises.every((e) => e.primary !== 'chest' && e.primary !== 'triceps')).toBe(true);
    // Every match is in exactly one group.
    expect(groups.flatMap((g) => g.exercises)).toHaveLength(list.length);
  });

  it('names the also-works group after a single muscle', () => {
    const f = { ...emptyFilters(), muscles: ['chest' as const] };
    const groups = groupExercises(filterExercises(EXERCISES, f, prefs).list, f, mine);
    expect(groups[groups.length - 1].title).toBe('Also works chest');
  });

  it('puts exercises for your equipment first inside a muscle group', () => {
    const f = { ...emptyFilters(), muscles: ['chest' as const] };
    const chest = groupExercises(filterExercises(EXERCISES, f, prefs).list, f, mine)[0].exercises;
    const firstOther = chest.findIndex((e) => !mine.has(e.equipment));
    expect(firstOther).toBeGreaterThan(0);
    expect(chest.slice(firstOther).every((e) => !mine.has(e.equipment))).toBe(true);
  });

  it('drops empty groups', () => {
    const only = [exerciseById('pushup')!];
    expect(groupExercises(only, emptyFilters(), mine).map((g) => g.key)).toEqual(['mine']);
    expect(groupExercises([], emptyFilters(), mine)).toEqual([]);
  });
});

describe('subtitle', () => {
  it('lists the main muscle and up to two others', () => {
    expect(exerciseSubtitle(exerciseById('pushup')!)).toBe('Chest · Triceps, Shoulders');
    expect(exerciseSubtitle(exerciseById('db-lat')!)).toBe('Shoulders');
  });

  it('says what equipment is needed when it is not theirs', () => {
    const e: ExerciseDef = exerciseById('bb-bench')!;
    expect(exerciseSubtitle(e, { needs: true })).toBe('Chest · Triceps, Shoulders · Needs barbell');
    expect(exerciseSubtitle(exerciseById('pullup')!, { needs: true })).toContain('Needs pull-up bar');
  });
});
