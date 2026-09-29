import { describe, expect, it } from 'vitest';
import { exerciseHistory, fmtPreviousBest, previousBestSet } from '../lib/exerciseHistory';
import { workout } from './helpers';

const units = { weight: 'kg' as const, distance: 'km' as const };

describe('previous best for weights and reps', () => {
  it('is the heaviest earlier set, then the most reps', () => {
    const ws = [
      workout('2026-10-01', [{ id: 'db-ohp', sets: [{ kg: 5, reps: 12 }, { kg: 7.5, reps: 8 }] }]),
      workout('2026-10-05', [{ id: 'db-ohp', sets: [{ kg: 7.5, reps: 10 }, { kg: 5, reps: 15 }] }]),
    ];
    expect(previousBestSet(ws, 'db-ohp', 'weight_reps')).toEqual({ kg: 7.5, reps: 10 });
  });

  it('ignores sets that were not ticked and other exercises', () => {
    const ws = [
      workout('2026-10-01', [{ id: 'db-ohp', sets: [{ kg: 5, reps: 10 }, { kg: 20, reps: 10 }], undone: [1] }]),
      workout('2026-10-02', [{ id: 'db-curl', sets: [{ kg: 50, reps: 10 }] }]),
    ];
    expect(previousBestSet(ws, 'db-ohp', 'weight_reps')).toEqual({ kg: 5, reps: 10 });
  });

  it('is null with no history', () => {
    expect(previousBestSet([], 'db-ohp', 'weight_reps')).toBeNull();
    const ws = [workout('2026-10-01', [{ id: 'db-ohp', sets: [{ kg: 5, reps: 10 }], undone: [0] }])];
    expect(previousBestSet(ws, 'db-ohp', 'weight_reps')).toBeNull();
  });
});

describe('previous best for other kinds', () => {
  it('reps: the most reps in a set', () => {
    const ws = [workout('2026-10-01', [{ id: 'pushup', sets: [{ reps: 10 }, { reps: 14 }, { reps: 12 }] }])];
    expect(previousBestSet(ws, 'pushup', 'reps')).toEqual({ reps: 14 });
  });

  it('time: the longest hold', () => {
    const ws = [workout('2026-10-01', [{ id: 'plank', sets: [{ sec: 30 }, { sec: 45 }] }])];
    expect(previousBestSet(ws, 'plank', 'time')).toEqual({ sec: 45 });
  });

  it('distance: the farthest, then the longest', () => {
    const ws = [
      workout('2026-10-01', [{ id: 'run', sets: [{ min: 30, km: 5 }] }]),
      workout('2026-10-08', [{ id: 'run', sets: [{ min: 20, km: 3 }, { min: 40, km: 5 }] }]),
    ];
    expect(previousBestSet(ws, 'run', 'distance_time')).toEqual({ min: 40, km: 5 });
  });

  it('intervals have no best', () => {
    const ws = [workout('2026-10-01', [{ id: 'runwalk', sets: [{ on: 1, off: 1 }] }])];
    expect(previousBestSet(ws, 'runwalk', 'intervals')).toBeNull();
  });
});

describe('formatting the previous best', () => {
  it('reads like the log column', () => {
    expect(fmtPreviousBest('weight_reps', { kg: 5, reps: 12 }, units)).toBe('5 kg × 12');
    expect(fmtPreviousBest('weight_reps', { kg: 5, reps: 12 }, { ...units, weight: 'lb' })).toBe('11 lb × 12');
    expect(fmtPreviousBest('reps', { reps: 14 }, units)).toBe('14 reps');
    expect(fmtPreviousBest('time', { sec: 45 }, units)).toBe('45s');
    expect(fmtPreviousBest('distance_time', { min: 40, km: 5 }, units)).toBe('5 km in 40 min');
    expect(fmtPreviousBest('distance_time', { min: 40 }, units)).toBe('40 min');
    expect(fmtPreviousBest('weight_reps', null, units)).toBe('New');
  });
});

describe('exercise history', () => {
  it('counts workouts, finds the last date and the best set', () => {
    const ws = [
      workout('2026-10-01', [{ id: 'db-ohp', sets: [{ kg: 5, reps: 10 }] }]),
      workout('2026-10-08', [{ id: 'db-ohp', sets: [{ kg: 7.5, reps: 8 }] }]),
      workout('2026-10-09', [{ id: 'db-curl', sets: [{ kg: 5, reps: 10 }] }]),
      workout('2026-10-10', [{ id: 'db-ohp', sets: [{ kg: 20, reps: 8 }], undone: [0] }]),
    ];
    expect(exerciseHistory(ws, 'db-ohp', 'weight_reps')).toEqual({ best: { kg: 7.5, reps: 8 }, lastDate: '2026-10-08', workouts: 2 });
    expect(exerciseHistory(ws, 'bb-squat', 'weight_reps')).toEqual({ best: null, lastDate: null, workouts: 0 });
  });
});
