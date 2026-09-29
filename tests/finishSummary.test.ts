import { describe, expect, it } from 'vitest';
import { fmtUnticked, untickedSentence, untickedSets } from '../lib/finishSummary';
import type { WorkoutItem } from '../lib/routines';

const items: WorkoutItem[] = [
  { exerciseId: 'pushup', sets: [{ reps: 10, done: true }, { reps: 10, done: false }, { reps: 10, done: false }] },
  { exerciseId: 'db-ohp', sets: [{ kg: 5, reps: 10, done: true }, { kg: 5, reps: 10, done: true }] },
  { exerciseId: 'plank', sets: [{ sec: 30, done: false }] },
  { exerciseId: 'bridge', sets: [{ reps: 10, done: false }, { reps: 10, done: false }] },
];

describe('unticked sets', () => {
  it('lists the sets that are not ticked, by exercise, with 1-based numbers', () => {
    expect(untickedSets(items)).toEqual([
      { exerciseId: 'pushup', name: 'Push Up', sets: [2, 3], total: 3 },
      { exerciseId: 'plank', name: 'Plank', sets: [1], total: 1 },
      { exerciseId: 'bridge', name: 'Glute Bridge', sets: [1, 2], total: 2 },
    ]);
  });

  it('is empty when everything is ticked', () => {
    expect(untickedSets([items[1]])).toEqual([]);
    expect(untickedSets([])).toEqual([]);
  });

  it('says which sets in words', () => {
    expect(fmtUnticked({ sets: [2], total: 3 })).toBe('Set 2');
    expect(fmtUnticked({ sets: [2, 3], total: 4 })).toBe('Sets 2 and 3');
    expect(fmtUnticked({ sets: [1, 2, 4], total: 5 })).toBe('Sets 1, 2 and 4');
    expect(fmtUnticked({ sets: [1, 2, 3], total: 3 })).toBe('All 3 sets');
    expect(fmtUnticked({ sets: [1], total: 1 })).toBe('The set');
  });

  it('has a sentence for the dialog', () => {
    expect(untickedSentence(0)).toBe('Every set is ticked. Nice work.');
    expect(untickedSentence(1)).toBe("1 set is not ticked. It won't be saved.");
    expect(untickedSentence(3)).toBe("3 sets are not ticked. They won't be saved.");
  });
});
