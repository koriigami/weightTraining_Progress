import { describe, expect, it } from 'vitest';
import { emptyState, planDay, xpForDay } from '../lib/progress';
import type { AppState, DayLog } from '../lib/progress';
import { CHART_WEEKS, metricValue, niceMax, weekLabels, weeklySeries } from '../lib/weekly';
import { stateWith, workout } from './helpers';

// Wednesday 30 September 2026. Its week runs Monday 28 Sep to Sunday 4 Oct, and
// the 8 weeks on the chart start on Monday 10 Aug.
const TODAY = '2026-09-30';

const bench = (date: string, sets = 2, kg = 20, reps = 10) => workout(date, [{ id: 'db-bench', sets: Array.from({ length: sets }, () => ({ kg, reps })) }]);

describe('weeklySeries', () => {
  it('gives the last 8 Monday-based weeks, oldest first, ending with the week of today', () => {
    const s = weeklySeries(emptyState(), TODAY);
    expect(s).toHaveLength(CHART_WEEKS);
    expect(s.map((p) => p.monday)).toEqual(['2026-08-10', '2026-08-17', '2026-08-24', '2026-08-31', '2026-09-07', '2026-09-14', '2026-09-21', '2026-09-28']);
    expect(s.map((p) => p.current)).toEqual([false, false, false, false, false, false, false, true]);
    expect(s.every((p) => p.xp === 0 && p.sets === 0 && p.volumeKg === 0)).toBe(true);
  });

  it('a Sunday belongs to the week that started on the Monday before', () => {
    const s = weeklySeries(emptyState(), '2026-10-04');
    expect(s[7].monday).toBe('2026-09-28');
    expect(s[7].current).toBe(true);
  });

  it('adds XP, sets and volume of logged workouts to their week', () => {
    // 2 sets of 20 kg x 10: 10 XP for the sets and 10 for finishing (the finish bonus is the XP of the planned sets).
    const s = weeklySeries(stateWith([bench('2026-09-30'), bench('2026-08-12', 3)]), TODAY);
    expect(s[7]).toMatchObject({ xp: 20, sets: 2, volumeKg: 400 });
    expect(s[0]).toMatchObject({ xp: 30, sets: 3, volumeKg: 600 });
    expect(s[3]).toMatchObject({ xp: 0, sets: 0, volumeKg: 0 });
  });

  it('adds up several workouts in one week', () => {
    const s = weeklySeries(stateWith([bench('2026-09-28'), bench('2026-09-30'), bench('2026-10-01')]), TODAY);
    expect(s[7].sets).toBe(6);
    expect(s[7].volumeKg).toBe(1200);
  });

  it('leaves out workouts older than 8 weeks and later than tomorrow', () => {
    const s = weeklySeries(stateWith([bench('2026-08-09'), bench('2026-10-03')]), TODAY);
    expect(s.reduce((sum, p) => sum + p.sets, 0)).toBe(0);
  });

  it('ignores a workout with no ticked set', () => {
    const w = workout('2026-09-30', [{ id: 'db-bench', sets: [{ kg: 20, reps: 10 }], undone: [0] }]);
    expect(weeklySeries(stateWith([w]), TODAY)[7].xp).toBe(0);
  });

  it('adds days of the old 6-week plan with their legacy XP and sets, and no volume', () => {
    // Saturday 26 Sep, the first plan day: 5 strength items of 3 sets each.
    const log: DayLog = { items: Object.fromEntries([0, 1, 2, 3, 4].map((i) => [`s${i}`, { at: '2026-09-26T08:00:00.000Z' }])) };
    const state: AppState = { ...emptyState(), days: { '2026-09-26': log } };
    const s = weeklySeries(state, TODAY);
    // 5 x 15, the day-cleared bonus (50 + 10 for a streak of 1) and the perfect-day bonus (25).
    expect(xpForDay(planDay('2026-09-26')!, log, 1)).toBe(160);
    expect(s[6]).toMatchObject({ monday: '2026-09-21', xp: 160, sets: 15, volumeKg: 0 });
    expect(s[7].xp).toBe(0);
  });

  it('a plan day with only part ticked counts only the ticked sets', () => {
    const state: AppState = { ...emptyState(), days: { '2026-09-28': { items: { s0: { at: '2026-09-28T08:00:00.000Z' }, s1: { at: '2026-09-28T09:00:00.000Z' } } } } };
    const p = weeklySeries(state, TODAY)[7];
    expect(p.xp).toBe(30);
    expect(p.sets).toBe(planDay('2026-09-28')!.strength.slice(0, 2).reduce((n, e) => n + e.sets, 0));
  });

  it('puts workouts and plan days of the same week together', () => {
    const log: DayLog = { items: { s0: { at: '2026-09-28T08:00:00.000Z' } } };
    const state = stateWith([bench('2026-09-29')], { days: { '2026-09-28': log } });
    const p = weeklySeries(state, TODAY)[7];
    expect(p.xp).toBe(20 + 15);
  });

  it('metricValue picks the value for a metric', () => {
    const p = { monday: '2026-09-28', xp: 5, sets: 6, volumeKg: 7, current: true };
    expect([metricValue(p, 'xp'), metricValue(p, 'sets'), metricValue(p, 'volume')]).toEqual([5, 6, 7]);
  });
});

describe('chart helpers', () => {
  it('niceMax rounds up to a round top for the scale', () => {
    expect(niceMax([0, 0])).toBe(10);
    expect(niceMax([185])).toBe(200);
    expect(niceMax([315, 20])).toBe(500);
    expect(niceMax([500])).toBe(500);
    expect(niceMax([501])).toBe(1000);
    expect(niceMax([60000])).toBe(100000);
  });

  it('shows the day number under every bar and the month once', () => {
    const labels = weekLabels(weeklySeries(emptyState(), TODAY));
    expect(labels.map((l) => l.day)).toEqual(['10', '17', '24', '31', '7', '14', '21', '28']);
    expect(labels.map((l) => l.month)).toEqual(['Aug', null, null, null, 'Sep', null, null, null]);
  });
});
