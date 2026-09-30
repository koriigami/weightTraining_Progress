import { describe, expect, it } from 'vitest';
import { emptyState } from '../lib/progress';
import type { AppState } from '../lib/progress';
import { migratePlanDays } from '../lib/migrations/planDays';
import { heatPercent, isInLast7Days, last7Days, last7Stats, muscleRows, muscleSets } from '../lib/muscleStats';
import { stateWith, workout } from './helpers';

// Tuesday 29 September 2026: the last 7 days are Wed 23 Sep to Tue 29 Sep.
const TODAY = '2026-09-29';

describe('last 7 days', () => {
  it('lists the 7 days ending today with their weekday letter and day number', () => {
    const days = last7Days([], TODAY);
    expect(days.map((d) => d.date)).toEqual(['2026-09-23', '2026-09-24', '2026-09-25', '2026-09-26', '2026-09-27', '2026-09-28', '2026-09-29']);
    expect(days.map((d) => d.label).join('')).toBe('WTFSSMT');
    expect(days.map((d) => d.day)).toEqual([23, 24, 25, 26, 27, 28, 29]);
    expect(days.filter((d) => d.today).map((d) => d.date)).toEqual([TODAY]);
  });

  it('marks the days something was trained', () => {
    const days = last7Days(['2026-09-26', '2026-09-28', '2026-09-20'], TODAY);
    expect(days.map((d) => d.trained)).toEqual([false, false, false, true, false, true, false]);
  });

  it('knows the window: 6 days back through today', () => {
    expect(isInLast7Days('2026-09-23', TODAY)).toBe(true);
    expect(isInLast7Days('2026-09-22', TODAY)).toBe(false);
    expect(isInLast7Days('2026-09-30', TODAY)).toBe(false);
  });
});

describe('muscle sets', () => {
  it('counts a set once for the main muscle and half for each muscle it also works', () => {
    // Bench press: chest main, triceps and shoulders secondary. The unticked set is not counted.
    const w = workout('2026-09-28', [{ id: 'db-bench', sets: [{ kg: 20, reps: 10 }, { kg: 20, reps: 10 }, { kg: 20, reps: 10 }, { kg: 20, reps: 10 }], undone: [3] }]);
    expect(muscleSets(stateWith([w]), TODAY)).toEqual({ chest: 3, triceps: 1.5, shoulders: 1.5 });
  });

  it('adds up across workouts and exercises', () => {
    const state = stateWith([
      workout('2026-09-28', [{ id: 'db-bench', sets: [{ kg: 20, reps: 10 }, { kg: 20, reps: 10 }] }]),
      workout('2026-09-25', [{ id: 'db-lat', sets: [{ kg: 5, reps: 12 }, { kg: 5, reps: 12 }] }, { id: 'db-curl', sets: [{ kg: 5, reps: 10 }] }]),
    ]);
    const m = muscleSets(state, TODAY);
    expect(m.chest).toBe(2);
    expect(m.shoulders).toBe(1 + 2); // half a set per bench set, and 2 lateral raises
    expect(m.biceps).toBe(1);
    expect(m.forearms).toBe(0.5);
  });

  it('counts time and bodyweight sets, but not cardio', () => {
    const state = stateWith([
      workout('2026-09-27', [{ id: 'plank', sets: [{ sec: 30 }, { sec: 30 }] }, { id: 'run', sets: [{ min: 20, km: 3 }] }, { id: 'runwalk', sets: [{ on: 1, off: 1 }] }]),
    ]);
    expect(muscleSets(state, TODAY)).toEqual({ abs: 2, obliques: 1 });
  });

  it('leaves out workouts older than 7 days and later than today', () => {
    const state = stateWith([
      workout('2026-09-22', [{ id: 'db-bench', sets: [{ kg: 20, reps: 10 }] }]),
      workout('2026-09-30', [{ id: 'db-bench', sets: [{ kg: 20, reps: 10 }] }]),
    ]);
    expect(muscleSets(state, TODAY)).toEqual({});
  });

  it('counts a migrated plan day like any workout', () => {
    // Sat 26 Sep: squats, pushups, rows, lateral raises, curls, 3 sets each. Only the first two ticked here.
    const state = migratePlanDays({ ...emptyState(), days: { '2026-09-26': { items: { s0: { at: '2026-09-26T08:00:00.000Z' }, s1: { at: '2026-09-26T09:00:00.000Z' } } } } }, { today: TODAY });
    expect(muscleSets(state, TODAY)).toEqual({ quads: 3, glutes: 1.5, chest: 3, triceps: 1.5, shoulders: 1.5, abs: 1.5 });
    expect(muscleSets(state, '2026-10-05')).toEqual({}); // outside the window
  });
});

describe('muscle rows and heat', () => {
  it('sorts by sets and scales intensity to the busiest muscle', () => {
    const rows = muscleRows({ chest: 6, triceps: 3, biceps: 1.5, abs: 0 });
    expect(rows.map((r) => r.muscle)).toEqual(['chest', 'triceps', 'biceps']);
    expect(rows.map((r) => r.intensity)).toEqual([1, 0.5, 0.25]);
  });

  it('is empty when nothing was worked', () => {
    expect(muscleRows({})).toEqual([]);
  });

  it('heat runs from 30% for a few sets to 100% for the most', () => {
    expect(heatPercent(0)).toBe(30);
    expect(heatPercent(0.5)).toBe(65);
    expect(heatPercent(1)).toBe(100);
    expect(heatPercent(2)).toBe(100);
  });

  it('last7Stats puts the chips, rows and intensity together', () => {
    const state = stateWith([workout('2026-09-28', [{ id: 'db-bench', sets: [{ kg: 20, reps: 10 }, { kg: 20, reps: 10 }] }])]);
    const s = last7Stats(state, TODAY);
    expect(s.days.find((d) => d.date === '2026-09-28')?.trained).toBe(true);
    expect(s.rows[0]).toMatchObject({ muscle: 'chest', sets: 2, intensity: 1 });
    expect(s.intensity).toEqual({ chest: 1, triceps: 0.5, shoulders: 0.5 });
  });
});
