import { describe, expect, it } from 'vitest';
import { emptyState } from '../lib/progress';
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
    // 2 sets of 20 kg x 10 are 10 XP. Under 20 minutes, so no daily bonus.
    const s = weeklySeries(stateWith([bench('2026-09-30'), bench('2026-08-12', 3)]), TODAY);
    expect(s[7]).toMatchObject({ xp: 10, sets: 2, volumeKg: 400 });
    expect(s[0]).toMatchObject({ xp: 15, sets: 3, volumeKg: 600 });
    // Seven sets are 21 minutes and pay the daily bonus once.
    expect(weeklySeries(stateWith([bench('2026-09-30', 7)]), TODAY)[7]).toMatchObject({ xp: 35 + 50, sets: 7 });
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
