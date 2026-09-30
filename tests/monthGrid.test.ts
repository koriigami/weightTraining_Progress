import { describe, expect, it } from 'vitest';
import { emptyState } from '../lib/progress';
import type { AppState } from '../lib/progress';
import { monthGrid, monthOf, monthSessionCount, sessionsByDate, sessionsOn, shiftMonth } from '../lib/monthGrid';
import { stateWith, workout } from './helpers';

describe('month grid', () => {
  it('starts on Monday: September 2026 opens on a Tuesday, so one blank comes first', () => {
    const g = monthGrid('2026-09');
    expect(g.label).toBe('September 2026');
    expect(g.leading).toBe(1);
    expect(g.days).toHaveLength(30);
    expect(g.days[0]).toEqual({ date: '2026-09-01', day: 1 });
    expect(g.days[29]).toEqual({ date: '2026-09-30', day: 30 });
  });

  it('a month that opens on a Monday has no blanks, and one that opens on a Sunday has six', () => {
    expect(monthGrid('2026-06').leading).toBe(0); // 1 June 2026 is a Monday
    expect(monthGrid('2026-02').leading).toBe(6); // 1 February 2026 is a Sunday
  });

  it('knows how long a month is, leap years included', () => {
    expect(monthGrid('2026-02').days).toHaveLength(28);
    expect(monthGrid('2028-02').days).toHaveLength(29);
    expect(monthGrid('2026-12').days).toHaveLength(31);
  });

  it('shifts months across a year end', () => {
    expect(shiftMonth('2026-09', 1)).toBe('2026-10');
    expect(shiftMonth('2026-12', 1)).toBe('2027-01');
    expect(shiftMonth('2026-01', -1)).toBe('2025-12');
    expect(shiftMonth('2026-09', -9)).toBe('2025-12');
    expect(monthOf('2026-09-29')).toBe('2026-09');
  });
});

describe('day lookup', () => {
  const state: AppState = stateWith(
    [
      workout('2026-09-29', [{ id: 'pushup', sets: [{ reps: 10 }] }], { id: 'a', title: 'Push A' }),
      workout('2026-09-29', [{ id: 'plank', sets: [{ sec: 30 }] }], { id: 'b', title: 'Core' }),
      workout('2026-10-02', [{ id: 'pushup', sets: [{ reps: 10 }] }], { id: 'c', title: 'Push B' }),
      workout('2026-10-03', [{ id: 'pushup', sets: [{ reps: 10 }], undone: [0] }], { id: 'd', title: 'Nothing ticked' }),
    ]
  );
  const by = sessionsByDate(state);

  it('lists every workout on a date', () => {
    expect(sessionsOn(by, '2026-09-29').map((i) => i.title).sort()).toEqual(['Core', 'Push A']);
  });

  it('is empty on a day with nothing, and for a workout with no ticked set', () => {
    expect(sessionsOn(by, '2026-09-30')).toEqual([]);
    expect(sessionsOn(by, '2026-10-03')).toEqual([]);
  });

  it('counts sessions per month', () => {
    expect(monthSessionCount(by, '2026-09')).toBe(2);
    expect(monthSessionCount(by, '2026-10')).toBe(1);
    expect(monthSessionCount(by, '2026-11')).toBe(0);
  });

  it('is empty for a new person', () => {
    const empty = sessionsByDate(emptyState());
    expect(empty.size).toBe(0);
    expect(monthSessionCount(empty, '2026-09')).toBe(0);
  });
});
