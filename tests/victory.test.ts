import { describe, expect, it } from 'vitest';
import { shareText, xpLines, xpTotal } from '../lib/victory';
import { scoreState } from '../lib/workoutScoring';
import { stateWith, workout } from './helpers';

describe('victory XP lines', () => {
  it('lists sets done, finish and the total matches the workout XP', () => {
    const state = stateWith([workout('2026-10-10', [{ id: 'db-ohp', sets: [{ kg: 5, reps: 10 }, { kg: 5, reps: 10 }, { kg: 5, reps: 10 }] }, { id: 'pushup', sets: [{ reps: 10 }] }])]);
    const score = scoreState(state)[0];
    const lines = xpLines(state.workouts![0], score);
    expect(lines.map((l) => [l.title, l.xp])).toEqual([
      ['4 sets done', 20],
      ['Workout finished', 50],
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

  it('adds a line for each personal record and for the weekly goal', () => {
    // Three workouts in one week reach the default goal of 3. The last one is a PR.
    const w1 = workout('2026-10-05', [{ id: 'db-ohp', sets: [{ kg: 5, reps: 10 }] }]);
    const w2 = workout('2026-10-06', [{ id: 'db-ohp', sets: [{ kg: 5, reps: 10 }] }]);
    const w3 = workout('2026-10-07', [{ id: 'db-ohp', sets: [{ kg: 7.5, reps: 8 }] }, { id: 'pushup', sets: [{ reps: 10 }] }]);
    const state = stateWith([w1, w2, w3]);
    const score = scoreState(state).find((s) => s.id === w3.id)!;
    const lines = xpLines(w3, score, undefined, 3);
    expect(lines.map((l) => l.key)).toEqual(['sets', 'finish', 'pr-db-ohp', 'weekly']);
    expect(lines.find((l) => l.key === 'pr-db-ohp')).toMatchObject({ title: 'New personal record', xp: 25, sub: 'Shoulder Press (Dumbbell): 7.5 kg × 8' });
    expect(lines.find((l) => l.key === 'weekly')).toMatchObject({ title: 'Weekly goal hit', xp: 50, sub: '3 workouts this week' });
    expect(xpTotal(lines, score.xp).total).toBe(score.xp);
  });

  it('shows record weights in the user\'s unit', () => {
    const w1 = workout('2026-10-05', [{ id: 'db-ohp', sets: [{ kg: 5, reps: 10 }] }]);
    const w2 = workout('2026-10-06', [{ id: 'db-ohp', sets: [{ kg: 10, reps: 8 }] }]);
    const score = scoreState(stateWith([w1, w2])).find((s) => s.id === w2.id)!;
    expect(xpLines(w2, score, undefined, 3, 'lb').find((l) => l.key.startsWith('pr-'))!.sub).toBe('Shoulder Press (Dumbbell): 22 lb × 8');
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
    expect(shareText(s)).toBe('Push A: 12 sets, 505 kg lifted, 46 min. +135 XP. Home Workout, D-Rank Hunter.');
  });

  it('leaves out what is missing and follows the unit', () => {
    expect(shareText({ ...s, volumeKg: 0, minutes: null, sets: 1 })).toBe('Push A: 1 set. +135 XP. Home Workout, D-Rank Hunter.');
    expect(shareText(s, 'lb')).toContain('1,114 lb lifted');
  });

  it('has no em dash', () => {
    expect(shareText(s)).not.toContain(String.fromCharCode(0x2014));
  });
});
