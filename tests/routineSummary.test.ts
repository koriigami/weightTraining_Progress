import { describe, expect, it } from 'vitest';
import { routineMeta, setsSummary } from '../lib/routineSummary';
import { STARTER_ROUTINES } from '../lib/routines';

const kg = { weight: 'kg' as const, distance: 'km' as const };

describe('setsSummary', () => {
  it('weights and reps', () => {
    expect(setsSummary('weight_reps', [{ kg: 5, reps: 10 }, { kg: 5, reps: 10 }, { kg: 5, reps: 10 }], kg)).toBe('3 × 10 · 5 kg');
  });

  it('ranges when sets differ', () => {
    expect(setsSummary('weight_reps', [{ kg: 5, reps: 10 }, { kg: 7.5, reps: 8 }, { kg: 7.5, reps: 10 }], kg)).toBe('3 × 8 to 10 · 5 to 7.5 kg');
  });

  it('leaves out an unset weight', () => {
    expect(setsSummary('weight_reps', [{ kg: 0, reps: 10 }, { kg: 0, reps: 10 }], kg)).toBe('2 × 10');
    expect(setsSummary('weight_reps', [{ kg: 5 }, { kg: 5 }], kg)).toBe('2 sets · 5 kg');
  });

  it('shows pounds when asked', () => {
    expect(setsSummary('weight_reps', [{ kg: 5, reps: 10 }], { weight: 'lb', distance: 'km' })).toBe('1 × 10 · 11 lb');
  });

  it('bodyweight reps, and time', () => {
    expect(setsSummary('reps', [{ reps: 10 }, { reps: 10 }, { reps: 10 }], kg)).toBe('3 × 10');
    expect(setsSummary('reps', [{}, {}], kg)).toBe('2 sets');
    expect(setsSummary('time', [{ sec: 40 }, { sec: 40 }, { sec: 40 }], kg)).toBe('3 × 40s');
  });

  it('a single cardio set shows distance and pace', () => {
    expect(setsSummary('distance_time', [{ min: 30, km: 5 }], kg)).toBe('30 min · 5 km · 6:00 /km');
    expect(setsSummary('distance_time', [{ min: 20 }], kg)).toBe('20 min');
  });

  it('repeated cardio sets and intervals', () => {
    expect(setsSummary('distance_time', Array.from({ length: 6 }, () => ({ min: 2, km: 0.4 })), kg)).toBe('6 × 2 min · 0.4 km');
    expect(setsSummary('intervals', Array.from({ length: 8 }, () => ({ on: 1, off: 1.5 })), kg)).toBe('8 × 1 on, 1.5 off');
  });

  it('cardio in miles', () => {
    expect(setsSummary('distance_time', [{ min: 30, km: 5 }], { weight: 'kg', distance: 'mi' })).toBe('30 min · 3.11 mi · 9:39 /mi');
  });
});

describe('routineMeta', () => {
  it('counts exercises, sets and minutes', () => {
    const fullBodyA = STARTER_ROUTINES.find((r) => r.id === 'starter-full-body-a')!;
    expect(routineMeta(fullBodyA.items)).toBe('5 exercises · 15 sets · about 40 min');
  });

  it('singular forms', () => {
    expect(routineMeta([{ exerciseId: 'run', sets: [{ min: 30, km: 5 }] }])).toBe('1 exercise · 1 set · about 30 min');
  });
});
