import { describe, expect, it } from 'vitest';
import { FEELS, effortReadout, effortWord, feelSummary, feltPhrase } from '../lib/feel';
import { workout } from './helpers';

const TODAY = '2026-10-10';
const rated = (date: string, over: Record<string, unknown> = {}) => workout(date, [{ id: 'pushup', sets: [{ reps: 10 }] }], over);

describe('effortWord', () => {
  it('names each band at its edges: 1 to 3 Easy, 4 to 6 Moderate, 7 and 8 Hard, 9 and 10 All out', () => {
    expect([1, 3].map(effortWord)).toEqual(['Easy', 'Easy']);
    expect([4, 6].map(effortWord)).toEqual(['Moderate', 'Moderate']);
    expect([7, 8].map(effortWord)).toEqual(['Hard', 'Hard']);
    expect([9, 10].map(effortWord)).toEqual(['All out', 'All out']);
  });

  it('reads as the slider shows it', () => {
    expect(effortReadout(6)).toBe('6, Moderate');
  });
});

describe('faces', () => {
  it('run from Rough to Great and are described for a screen reader', () => {
    expect(FEELS.map((f) => f.key)).toEqual(['rough', 'tough', 'ok', 'good', 'great']);
    expect(feltPhrase('good')).toBe('Felt good');
    expect(feltPhrase('ok')).toBe('Felt OK');
  });
});

describe('feelSummary', () => {
  it('counts the last 30 days: today and the 29 days before, nothing older or later', () => {
    const s = feelSummary(
      [
        rated('2026-10-10', { feel: 'great' }),
        rated('2026-09-11', { feel: 'good' }), // 29 days back, the first day in
        rated('2026-09-10', { feel: 'rough' }), // 30 days back, out
        rated('2026-10-11', { feel: 'rough' }), // tomorrow, out
      ],
      TODAY
    );
    expect(s.counts).toEqual({ rough: 0, tough: 0, ok: 0, good: 1, great: 1 });
    expect(s.faces).toBe(2);
  });

  it('leaves out workouts with no face and no effort', () => {
    const s = feelSummary([rated('2026-10-09'), rated('2026-10-08', { feel: 'ok' }), rated('2026-10-07', { effort: 4 })], TODAY);
    expect(s.rated).toBe(2);
    expect(s.faces).toBe(1);
  });

  it('averages the effort over the workouts that have one, to one decimal', () => {
    const s = feelSummary(
      [
        rated('2026-10-09', { feel: 'good', effort: 6 }),
        rated('2026-10-08', { feel: 'good', effort: 7 }),
        rated('2026-10-07', { effort: 6 }),
        rated('2026-10-06', { effort: 7 }),
        rated('2026-10-05', { effort: 6 }),
        rated('2026-10-04', { feel: 'tough' }), // a face but no effort: not in the average
      ],
      TODAY
    );
    expect(s.effortCount).toBe(5);
    expect(s.effortAvg).toBe(6.4);
    expect(s.faces).toBe(3);
    expect(s.rated).toBe(6);
  });

  it('says nothing was rated when no workout in the window has a face or an effort', () => {
    expect(feelSummary([], TODAY)).toMatchObject({ faces: 0, effortAvg: null, effortCount: 0, rated: 0 });
    expect(feelSummary([rated('2026-10-09'), rated('2026-08-01', { feel: 'great', effort: 9 })], TODAY).rated).toBe(0);
  });
});
