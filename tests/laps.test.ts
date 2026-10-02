import { describe, expect, it } from 'vitest';
import { BAR_FLOOR, closeLap, fastestLap, finishLaps, fmtLapTime, lapBars, lapDistanceChoices, lapSummary, lapTotals, parseLapTime, readLaps } from '../lib/laps';
import type { Lap } from '../lib/routines';
import { scoreWorkouts } from '../lib/workoutScoring';
import { workout } from './helpers';

describe('closeLap', () => {
  it('subtracts the laps already stamped from the time since Start', () => {
    expect(closeLap([], 362)).toEqual({ sec: 362 });
    expect(closeLap([{ sec: 362 }, { sec: 348 }], 1100)).toEqual({ sec: 390 });
  });

  it('refuses a lap under 1 second, so a double tap adds nothing', () => {
    expect(closeLap([{ sec: 100 }], 100)).toBeNull();
    expect(closeLap([{ sec: 100 }], 100.9)).toBeNull();
    expect(closeLap([{ sec: 100 }], 101)).toEqual({ sec: 1 });
    expect(closeLap([], Number.NaN)).toBeNull();
  });

  it('carries the chosen distance, and none when there is not one', () => {
    expect(closeLap([], 100, 0.4)).toEqual({ sec: 100, km: 0.4 });
    expect(closeLap([], 100, 0)).toEqual({ sec: 100 });
    expect(closeLap([], 100, undefined)).toEqual({ sec: 100 });
  });
});

describe('fastestLap', () => {
  it('ranks by pace when any lap has a distance, among the laps that have one', () => {
    // 1 km in 6:00, 0.4 km in 1:38 (4:05 /km), 1 km in 6:10, and a lap with no distance that is the shortest.
    const laps: Lap[] = [{ sec: 360, km: 1 }, { sec: 98, km: 0.4 }, { sec: 370, km: 1 }, { sec: 30 }];
    expect(fastestLap(laps)).toBe(1);
  });

  it('ranks by time when no lap has a distance', () => {
    expect(fastestLap([{ sec: 104 }, { sec: 98 }, { sec: 101 }])).toBe(1);
  });

  it('is null for fewer than 2 laps, and the first of equal laps wins', () => {
    expect(fastestLap([])).toBeNull();
    expect(fastestLap([{ sec: 98, km: 0.4 }])).toBeNull();
    expect(fastestLap([{ sec: 100 }, { sec: 100 }])).toBe(0);
  });

  it('skips a lap that has no time yet', () => {
    expect(fastestLap([{ sec: 0 }, { sec: 98 }])).toBeNull();
    expect(fastestLap([{ sec: 0 }, { sec: 98 }, { sec: 90 }])).toBe(2);
  });
});

describe('lapTotals', () => {
  it('adds up the count, the seconds and the distance', () => {
    expect(lapTotals([{ sec: 104, km: 0.4 }, { sec: 98, km: 0.4 }, { sec: 60 }])).toEqual({ count: 3, sec: 262, km: 0.8 });
    expect(lapTotals([])).toEqual({ count: 0, sec: 0, km: 0 });
  });
});

describe('lap times', () => {
  it('are shown as m:ss, and h:mm:ss from an hour', () => {
    expect(fmtLapTime(98)).toBe('1:38');
    expect(fmtLapTime(5)).toBe('0:05');
    expect(fmtLapTime(3600)).toBe('1:00:00');
    expect(fmtLapTime(3930)).toBe('1:05:30');
  });

  it('are typed as m:ss or h:mm:ss, and a plain number is minutes', () => {
    expect(parseLapTime('1:38')).toBe(98);
    expect(parseLapTime('12:05')).toBe(725);
    expect(parseLapTime('1:05:30')).toBe(3930);
    expect(parseLapTime('5')).toBe(300);
    expect(parseLapTime('1.5')).toBe(90);
    expect(parseLapTime('5,5')).toBe(330);
  });

  it('read an empty box as empty, and text that is not a time yet as null', () => {
    expect(parseLapTime('')).toBeUndefined();
    expect(parseLapTime('  ')).toBeUndefined();
    expect(parseLapTime('1:')).toBeNull();
    expect(parseLapTime('1:3')).toBeNull();
    expect(parseLapTime('1:75')).toBeNull();
    expect(parseLapTime('.')).toBeNull();
    expect(parseLapTime('abc')).toBeNull();
    expect(parseLapTime('1441')).toBeNull(); // over a day
  });
});

describe('the summary line', () => {
  it('names the fastest lap by pace when the laps have a distance', () => {
    const laps: Lap[] = [{ sec: 104, km: 0.4 }, { sec: 98, km: 0.4 }, { sec: 101, km: 0.4 }, { sec: 103, km: 0.4 }, { sec: 106, km: 0.4 }];
    expect(lapSummary(laps, 'run', 'km')).toBe('5 laps · fastest lap 2, 4:05 /km');
  });

  it('names it by time when they do not, and by speed for a ride', () => {
    expect(lapSummary([{ sec: 104 }, { sec: 98 }], 'run', 'km')).toBe('2 laps · fastest lap 2, 1:38');
    expect(lapSummary([{ sec: 3600, km: 20 }, { sec: 3600, km: 25 }], 'ride', 'km')).toBe('2 laps · fastest lap 2, 25 km/h');
  });

  it('is just the count for a single lap', () => {
    expect(lapSummary([{ sec: 98 }], 'run', 'km')).toBe('1 lap');
  });
});

describe('the lap chart', () => {
  it('makes the fastest bar full height and the slowest sit at the floor', () => {
    const bars = lapBars([{ sec: 104 }, { sec: 98 }, { sec: 110 }]);
    expect(bars[1]).toBe(1);
    expect(bars[2]).toBeCloseTo(BAR_FLOOR, 5);
    expect(bars[0]).toBeGreaterThan(BAR_FLOOR);
    expect(bars[0]).toBeLessThan(1);
  });
});

describe('lap distance chips', () => {
  it('start with No distance, then 400 m and 1 km, or 0.25 mi and 1 mi in miles', () => {
    expect(lapDistanceChoices('km')).toEqual([{ label: 'No distance' }, { label: '400 m', km: 0.4 }, { label: '1 km', km: 1 }]);
    const mi = lapDistanceChoices('mi');
    expect(mi.map((c) => c.label)).toEqual(['No distance', '0.25 mi', '1 mi']);
    expect(mi[1].km).toBeCloseTo(0.402, 3);
    expect(mi[2].km).toBeCloseTo(1.609, 3);
  });
});

describe('cleaning laps', () => {
  it('readLaps keeps a lap with no time yet, rounds seconds, clamps, and caps at 200', () => {
    expect(readLaps([{ sec: 0 }, { sec: 98.6, km: 0.4 }, { sec: 999999, km: 500 }, { sec: 'x' }, 5, null])).toEqual([{ sec: 0 }, { sec: 99, km: 0.4 }, { sec: 86400, km: 100 }]);
    expect(readLaps(Array.from({ length: 250 }, () => ({ sec: 60 })))).toHaveLength(200);
    expect(readLaps('nope')).toEqual([]);
  });

  it('finishLaps drops laps with no time, and is undefined when none are left', () => {
    expect(finishLaps([{ sec: 0 }, { sec: 98, km: 0.4 }, { sec: 60, km: 0 }])).toEqual([{ sec: 98, km: 0.4 }, { sec: 60 }]);
    expect(finishLaps([{ sec: 0 }])).toBeUndefined();
    expect(finishLaps(undefined)).toBeUndefined();
  });
});

describe('laps and scoring', () => {
  it('a run with laps scores the same XP, record and beat as the same run without them', () => {
    const laps: Lap[] = [{ sec: 120, km: 0.4 }, { sec: 98, km: 0.4 }, { sec: 400, km: 1.2 }];
    const history = workout('2026-10-01', [{ id: 'run', sets: [{ min: 30, km: 4 }] }]);
    const plain = workout('2026-10-08', [{ id: 'run', sets: [{ min: 32, km: 5 }] }]);
    const lapped = { ...plain, items: [{ exerciseId: 'run', sets: [{ min: 32, km: 5, done: true, laps }] }] };
    const [, a] = scoreWorkouts([history, plain], { weeklyGoal: 3 });
    const [, b] = scoreWorkouts([history, lapped], { weeklyGoal: 3 });
    expect(b).toEqual(a);
    expect(b.xp).toBeGreaterThan(0);
    expect(b.marks).toEqual([{ exerciseId: 'run', kind: 'record', km: 5, min: 32 }]);
  });

  it('a fast lap never counts as a record against a longer run', () => {
    const history = workout('2026-10-01', [{ id: 'run', sets: [{ min: 60, km: 10 }] }]);
    const fast = workout('2026-10-08', [{ id: 'run', sets: [{ min: 8, km: 2, laps: [{ sec: 90, km: 0.4 }, { sec: 80, km: 0.4 }] }] }]);
    const scores = scoreWorkouts([history, fast], { weeklyGoal: 3 });
    expect(scores[1].marks).toEqual([]);
  });
});
