import { describe, expect, it } from 'vitest';
import { markText, shareText, xpLines, xpTotal } from '../lib/victory';
import { scoreState } from '../lib/workoutScoring';
import { stateWith, workout } from './helpers';

describe('victory XP lines', () => {
  it('lists sets done, finish and the total matches the workout XP', () => {
    const state = stateWith([workout('2026-10-10', [{ id: 'db-ohp', sets: [{ kg: 5, reps: 10 }, { kg: 5, reps: 10 }, { kg: 5, reps: 10 }, { kg: 5, reps: 10 }] }, { id: 'pushup', sets: [{ reps: 10 }, { reps: 10 }, { reps: 10 }] }])]);
    const score = scoreState(state)[0];
    const lines = xpLines(state.workouts![0], score);
    expect(lines.map((l) => [l.title, l.xp])).toEqual([
      ['7 sets done', 35],
      ['Workout finished', 50], // seven sets are 21 minutes: the daily bonus
    ]);
    expect(lines[0].sub).toBe('5 XP a set');
    expect(xpTotal(lines, score.xp)).toEqual({ total: score.xp, other: 0 });
  });

  it('splits cardio from strength', () => {
    const state = stateWith([workout('2026-10-10', [{ id: 'pushup', sets: [{ reps: 10 }] }, { id: 'run', sets: [{ min: 20, km: 3 }] }, { id: 'runwalk', sets: [{ on: 1, off: 1.5 }] }])]);
    const score = scoreState(state)[0];
    const lines = xpLines(state.workouts![0], score);
    expect(lines.map((l) => l.key)).toEqual(['sets', 'cardio', 'finish']);
    expect(lines[1]).toMatchObject({ title: 'Cardio, 22.5 min', xp: 20 + 10 + 3 });
    expect(xpTotal(lines, score.xp).total).toBe(score.xp);
  });

  it('adds a line for each record and for the weekly goal', () => {
    // Three training days in one week reach the default goal of 3. The last one is a record.
    const seven = (kg: number, reps: number) => Array.from({ length: 7 }, () => ({ kg, reps }));
    const w1 = workout('2026-10-05', [{ id: 'db-ohp', sets: seven(5, 10) }]);
    const w2 = workout('2026-10-06', [{ id: 'db-ohp', sets: seven(5, 10) }]);
    const w3 = workout('2026-10-07', [{ id: 'db-ohp', sets: [{ kg: 7.5, reps: 8 }, ...seven(5, 10).slice(1)] }]);
    const state = stateWith([w1, w2, w3]);
    const score = scoreState(state).find((s) => s.id === w3.id)!;
    const lines = xpLines(w3, score, undefined, 3);
    expect(lines.map((l) => l.key)).toEqual(['sets', 'record-db-ohp', 'finish', 'weekly']);
    expect(lines.find((l) => l.key === 'record-db-ohp')).toMatchObject({ title: 'New record', xp: 25, sub: 'Shoulder Press (Dumbbell): 7.5 kg × 8' });
    expect(lines.find((l) => l.key === 'weekly')).toMatchObject({ title: 'Weekly goal hit', xp: 50, sub: '3 workouts this week' });
    expect(xpTotal(lines, score.xp).total).toBe(score.xp);
  });

  it('shows record weights in the user\'s unit', () => {
    const w1 = workout('2026-10-05', [{ id: 'db-ohp', sets: [{ kg: 5, reps: 10 }] }]);
    const w2 = workout('2026-10-06', [{ id: 'db-ohp', sets: [{ kg: 10, reps: 8 }] }]);
    const score = scoreState(stateWith([w1, w2])).find((s) => s.id === w2.id)!;
    expect(xpLines(w2, score, undefined, 3, 'lb').find((l) => l.key.startsWith('record-'))!.sub).toBe('Shoulder Press (Dumbbell): 22 lb × 8');
  });

  it('shows a beat as its own line, worth 10, and a record instead of it when both hold', () => {
    // Five plank holds in each workout, the same every day, make every day a training day without adding marks.
    const planks = { id: 'plank', sets: Array.from({ length: 5 }, () => ({ sec: 30 })) };
    const w1 = workout('2026-10-05', [{ id: 'db-ohp', sets: [{ kg: 10, reps: 8 }] }, { id: 'pushup', sets: [{ reps: 10 }] }, planks]);
    const w2 = workout('2026-10-06', [{ id: 'db-ohp', sets: [{ kg: 12, reps: 8 }] }, { id: 'pushup', sets: [{ reps: 12 }] }, planks]);
    const w3 = workout('2026-10-07', [{ id: 'db-ohp', sets: [{ kg: 10, reps: 10 }] }, { id: 'pushup', sets: [{ reps: 13 }] }, planks]);
    const scores = scoreState(stateWith([w1, w2, w3]));
    const l2 = xpLines(w2, scores[1]);
    expect(l2.map((l) => [l.key, l.xp])).toEqual([['sets', 35], ['record-db-ohp', 25], ['record-pushup', 25], ['finish', 50]]);
    // Ten kilos for 10 reps is not heavier than 12 kg, so no record. Fewer kilos than last time is no beat either.
    const l3 = xpLines(w3, scores[2]);
    expect(l3.map((l) => l.key)).toEqual(['sets', 'record-pushup', 'finish', 'weekly']); // the third training day of the week
    const beat = xpLines(w3, { ...scores[2], marks: [{ exerciseId: 'pushup', kind: 'beat', reps: 13 }], beatXp: 10 });
    expect(beat.find((l) => l.key === 'beat-pushup')).toMatchObject({ title: 'Beat last time', xp: 10, sub: 'Push Up: 13 reps' });
  });

  it('says what was missed, with no XP, when the plan is not finished', () => {
    const w = workout('2026-10-05', [{ id: 'pushup', sets: [{ reps: 10 }] }], { plan: [{ exerciseId: 'pushup', sets: 2 }, { exerciseId: 'plank', sets: 1 }] });
    const score = scoreState(stateWith([w]))[0];
    const lines = xpLines(w, score);
    expect(lines.map((l) => [l.key, l.xp])).toEqual([['sets', 5], ['missed', 0]]);
    expect(lines[1].title).toBe('Missed: Push Up, Plank not done');
  });

  it('shows a finish line worth 0 once the day already paid its daily bonus', () => {
    const day = (h: string) => workout('2026-10-05', [{ id: 'pushup', sets: Array.from({ length: 7 }, () => ({ reps: 10 })) }], { when: `2026-10-05T${h}:00`, startedAt: `2026-10-05T${h}:00:00.000Z` });
    const ws = [day('08'), day('12'), day('18')];
    const scores = scoreState(stateWith(ws));
    expect(xpLines(ws[0], scores[0]).find((l) => l.key === 'finish')!.xp).toBe(50);
    expect(xpLines(ws[1], scores[1]).find((l) => l.key === 'finish')).toMatchObject({ xp: 0 });
    expect(xpLines(ws[2], scores[2]).find((l) => l.key === 'finish')).toMatchObject({ xp: 0 });
  });

  it('describes a mark by its metric', () => {
    expect(markText({ exerciseId: 'a', kind: 'beat', sec: 45 })).toBe('45 s');
    expect(markText({ exerciseId: 'a', kind: 'record', km: 5, min: 28 })).toBe('5 km in 28 min');
    expect(markText({ exerciseId: 'a', kind: 'beat', km: 0, min: 30 })).toBe('30 min');
    expect(markText({ exerciseId: 'a', kind: 'record', kg: 10, reps: 5 }, 'lb')).toBe('22 lb × 5');
  });

  it('shows only the set lines when there is no score', () => {
    const w = workout('2026-10-10', [{ id: 'pushup', sets: [{ reps: 10 }] }]);
    expect(xpLines(w, undefined).map((l) => l.key)).toEqual(['sets']);
  });

  it('ignores sets that were not ticked', () => {
    const w = workout('2026-10-10', [{ id: 'pushup', sets: [{ reps: 10 }, { reps: 10 }], undone: [1] }]);
    expect(xpLines(w, undefined)[0]).toMatchObject({ title: '1 set done', xp: 5 });
  });
});

describe('xpTotal', () => {
  it('counts XP from a new badge as extra', () => {
    const lines = [{ key: 'a', title: 'a', xp: 55 }];
    expect(xpTotal(lines, 80)).toEqual({ total: 80, other: 25 });
  });

  it('never shows less than the lines add up to', () => {
    expect(xpTotal([{ key: 'a', title: 'a', xp: 55 }], 50)).toEqual({ total: 55, other: 0 });
  });
});

describe('share text', () => {
  const s = { title: 'Push A', sets: 12, volumeKg: 505.4, minutes: 46, xp: 135, rankTitle: 'D-Rank Hunter' };

  it('is one plain sentence with the stats and the XP', () => {
    expect(shareText(s)).toBe('Push A: 12 sets, 505 kg lifted, 46 min. +135 XP. Levl, D-Rank Hunter.');
  });

  it('leaves out what is missing and follows the unit', () => {
    expect(shareText({ ...s, volumeKg: 0, minutes: null, sets: 1 })).toBe('Push A: 1 set. +135 XP. Levl, D-Rank Hunter.');
    expect(shareText(s, 'lb')).toContain('1,114 lb lifted');
  });

  it('has no em dash', () => {
    expect(shareText(s)).not.toContain(String.fromCharCode(0x2014));
  });

  it('reads a strength workout the same whatever distance it is given', () => {
    expect(shareText({ ...s, kind: 'strength', km: 3 })).toBe(shareText(s));
    expect(shareText(s, 'kg', 'mi')).toBe(shareText(s));
  });

  describe('cardio', () => {
    const run = { title: 'Morning Run', sets: 1, volumeKg: 0, minutes: 31, xp: 46, rankTitle: 'E-Rank Hunter', kind: 'cardio' as const, km: 5.2, rate: '5:58 /km' };

    it('leads with the distance, then the time and the pace', () => {
      expect(shareText(run)).toBe('Morning Run: 5.2 km, 31 min, 5:58 /km. +46 XP. Levl, E-Rank Hunter.');
    });

    it('follows the distance unit and takes a speed as the rate', () => {
      expect(shareText({ ...run, km: 18.4, minutes: 46, rate: '24 km/h' })).toBe('Morning Run: 18.4 km, 46 min, 24 km/h. +46 XP. Levl, E-Rank Hunter.');
      expect(shareText({ ...run, rate: '9:36 /mi' }, 'kg', 'mi')).toBe('Morning Run: 3.23 mi, 31 min, 9:36 /mi. +46 XP. Levl, E-Rank Hunter.');
    });

    it('leaves out what is missing and never says 0 km', () => {
      expect(shareText({ ...run, km: 0, rate: '' })).toBe('Morning Run: 31 min. +46 XP. Levl, E-Rank Hunter.');
      expect(shareText({ ...run, km: undefined, rate: undefined, minutes: null })).toBe('Morning Run. +46 XP. Levl, E-Rank Hunter.');
      expect(shareText({ ...run, minutes: null, rate: undefined })).toBe('Morning Run: 5.2 km. +46 XP. Levl, E-Rank Hunter.');
    });

    it('has no em dash', () => {
      expect(shareText(run)).not.toContain(String.fromCharCode(0x2014));
    });
  });

  describe('mixed', () => {
    const mixed = { title: 'Legs and a Jog', sets: 14, volumeKg: 1240, minutes: 58, xp: 196, rankTitle: 'D-Rank Hunter', kind: 'mixed' as const, km: 2.1 };

    it('adds the distance after the strength parts', () => {
      expect(shareText(mixed)).toBe('Legs and a Jog: 14 sets, 1.2 t lifted, 58 min, 2.1 km. +196 XP. Levl, D-Rank Hunter.');
      expect(shareText(mixed, 'lb', 'mi')).toBe('Legs and a Jog: 14 sets, 2.7k lb lifted, 58 min, 1.3 mi. +196 XP. Levl, D-Rank Hunter.');
    });

    it('has no distance when there was none', () => {
      expect(shareText({ ...mixed, km: 0 })).toBe('Legs and a Jog: 14 sets, 1.2 t lifted, 58 min. +196 XP. Levl, D-Rank Hunter.');
      expect(shareText({ ...mixed, km: undefined })).toBe('Legs and a Jog: 14 sets, 1.2 t lifted, 58 min. +196 XP. Levl, D-Rank Hunter.');
    });
  });
});
