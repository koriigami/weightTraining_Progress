import { describe, expect, it } from 'vitest';
import {
  DUMBBELL_CHIPS,
  avoidSummary,
  dumbbellChoices,
  dumbbellList,
  equipmentSummary,
  isDumbbellOn,
  toggleDumbbell,
  toggleIn,
  unitsSummary,
  weeklyGoalSummary,
} from '../lib/prefsSummary';
import { defaultPrefs, ownerPrefs } from '../lib/routines';

describe('summaries', () => {
  it('units read as "Kg · Km"', () => {
    expect(unitsSummary({ weight: 'kg', distance: 'km' })).toBe('Kg · Km');
    expect(unitsSummary({ weight: 'lb', distance: 'mi' })).toBe('Lbs · Miles');
  });

  it('equipment: gym, none, or the ticked list with the dumbbell weights', () => {
    expect(equipmentSummary({ ...defaultPrefs(), equipment: { kind: 'gym', has: [], dumbbellKg: [] } })).toBe('Full gym');
    expect(equipmentSummary({ ...defaultPrefs(), equipment: { kind: 'none', has: ['dumbbell'], dumbbellKg: [5] } })).toBe('No equipment');
    expect(equipmentSummary(ownerPrefs())).toBe('Dumbbells, Cardio machine (2, 3, 5, 10 kg)');
    expect(equipmentSummary(defaultPrefs())).toBe('Home, no equipment picked');
    expect(equipmentSummary({ ...defaultPrefs(), equipment: { kind: 'home', has: ['band', 'bench'], dumbbellKg: [] } })).toBe('Bands, Bench');
  });

  it('avoid: exercises then joints, or None', () => {
    expect(avoidSummary({ avoid: [], limits: [] })).toBe('None');
    expect(avoidSummary({ avoid: ['lunges', 'overhead'], limits: ['lower-back'] })).toBe('Lunges, Overhead pressing, Lower back');
  });

  it('weekly goal', () => {
    expect(weeklyGoalSummary(1)).toBe('1 workout a week');
    expect(weeklyGoalSummary(3)).toBe('3 workouts a week');
  });
});

describe('dumbbell chips', () => {
  it('offers the chips from the design in kg', () => {
    expect(DUMBBELL_CHIPS.kg).toEqual([1, 2, 3, 4, 5, 7.5, 10, 12.5, 15, 20]);
  });

  it('stores what a chip says in kg, whatever the unit', () => {
    expect(toggleDumbbell([], 5, 'kg')).toEqual([5]);
    expect(toggleDumbbell([2, 5], 3, 'kg')).toEqual([2, 3, 5]);
    expect(toggleDumbbell([2, 3, 5], 3, 'kg')).toEqual([2, 5]);
    const lb = toggleDumbbell([], 10, 'lb');
    expect(lb).toHaveLength(1);
    expect(lb[0]).toBeCloseTo(4.536, 3);
    expect(isDumbbellOn(lb, 10, 'lb')).toBe(true);
    expect(toggleDumbbell(lb, 10, 'lb')).toEqual([]);
  });

  it('shows a saved weight that is not on the standard list', () => {
    expect(dumbbellChoices('kg', [2.5, 5])).toEqual([1, 2, 2.5, 3, 4, 5, 7.5, 10, 12.5, 15, 20]);
    expect(dumbbellChoices('lb', [2])).toContain(4.4);
  });

  it('writes the list in the unit', () => {
    expect(dumbbellList([10, 2, 5], 'kg')).toBe('2, 5, 10 kg');
    expect(dumbbellList([4.536], 'lb')).toBe('10 lb');
  });

  it('toggleIn adds and removes', () => {
    expect(toggleIn(['a'], 'b')).toEqual(['a', 'b']);
    expect(toggleIn(['a', 'b'], 'a')).toEqual(['b']);
  });
});
