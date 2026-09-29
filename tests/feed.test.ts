import { describe, expect, it } from 'vitest';
import { buildFeed, planDayToFeedItem, workoutToFeedItem } from '../lib/feed';
import { clearedStreakSeries, emptyState, planDay, xpForDay } from '../lib/progress';
import type { AppState } from '../lib/progress';
import { scoreState } from '../lib/workoutScoring';
import { stateWith, workout } from './helpers';

// A day of the old plan: 2026-10-12 is a Push A day (week 4), 2026-10-15 a rest day.
const PLAN_DATE = '2026-10-12';

function legacyState(): AppState {
  const day = planDay(PLAN_DATE)!;
  expect(day.dayType).toBe('push-a');
  return {
    ...emptyState(),
    days: {
      [PLAN_DATE]: {
        items: { s0: { at: `${PLAN_DATE}T08:00:00.000Z` }, s2: { at: `${PLAN_DATE}T09:00:00.000Z` } },
        cardio: { minutes: 15, at: `${PLAN_DATE}T18:00:00.000Z` },
      },
    },
  };
}

describe('workouts in the feed', () => {
  it('shows title, date, time, duration, volume, sets, XP and the exercises', () => {
    const w = workout(
      '2026-10-10',
      [
        { id: 'db-ohp', sets: [{ kg: 5, reps: 10 }, { kg: 5, reps: 10 }] },
        { id: 'pushup', sets: [{ reps: 10 }] },
      ],
      { title: 'Push A', when: '2026-10-10T18:05', startedAt: '2026-10-10T17:20:00.000Z', finishedAt: '2026-10-10T18:05:30.000Z', xp: 90 }
    );
    const item = workoutToFeedItem(w)!;
    expect(item).toMatchObject({ kind: 'workout', title: 'Push A', date: '2026-10-10', time: '18:05', minutes: 46, volumeKg: 100, sets: 3, xp: 90, notes: null });
    expect(item.exercises.map((e) => [e.name, e.detail])).toEqual([
      ['Shoulder Press (Dumbbell)', '2 sets'],
      ['Push Up', '1 set'],
    ]);
    expect(item.exercises[0].exercise).toMatchObject({ primary: 'shoulders' });
  });

  it('has no volume for a workout without weights, and skips exercises with no ticked set', () => {
    const w = workout('2026-10-10', [
      { id: 'pushup', sets: [{ reps: 10 }] },
      { id: 'plank', sets: [{ sec: 30 }], undone: [0] },
    ]);
    const item = workoutToFeedItem(w)!;
    expect(item.volumeKg).toBeNull();
    expect(item.exercises.map((e) => e.name)).toEqual(['Push Up']);
  });

  it('describes cardio by time and distance', () => {
    const w = workout('2026-10-10', [
      { id: 'run', sets: [{ min: 30, km: 5 }] },
      { id: 'runwalk', sets: [{ on: 1, off: 1.5 }, { on: 1, off: 1.5 }] },
    ]);
    expect(workoutToFeedItem(w)!.exercises.map((e) => e.detail)).toEqual(['30 min, 5 km', '5 min intervals']);
  });

  it('shows notes, and skips a workout with nothing ticked', () => {
    const w = workout('2026-10-10', [{ id: 'pushup', sets: [{ reps: 10 }] }], { notes: '  Felt strong  ' });
    expect(workoutToFeedItem(w)!.notes).toBe('Felt strong');
    expect(workoutToFeedItem(workout('2026-10-10', [{ id: 'pushup', sets: [{ reps: 10 }], undone: [0] }]))).toBeNull();
  });

  it('shows the workout XP saved with it', () => {
    const state = stateWith([workout('2026-10-10', [{ id: 'pushup', sets: [{ reps: 10 }] }])]);
    const scored = { ...state, workouts: state.workouts!.map((w) => ({ ...w, xp: scoreState(state)[0].xp })) };
    expect(buildFeed(scored)[0].xp).toBe(5 + 50);
  });
});

describe('legacy plan days in the feed', () => {
  it('turns a plan day into a 6-week plan workout', () => {
    const state = legacyState();
    const day = planDay(PLAN_DATE)!;
    const item = planDayToFeedItem(state, PLAN_DATE, clearedStreakSeries(state))!;
    expect(item.kind).toBe('plan');
    expect(item.id).toBe(`plan-${PLAN_DATE}`);
    expect(item.title).toBe(day.title);
    expect(item.date).toBe(PLAN_DATE);
    expect(item.time).toBeNull();
    expect(item.minutes).toBeNull();
    expect(item.volumeKg).toBeNull();
  });

  it('takes sets from the ticked items and lists them with the cardio', () => {
    const state = legacyState();
    const day = planDay(PLAN_DATE)!;
    const item = planDayToFeedItem(state, PLAN_DATE, clearedStreakSeries(state))!;
    expect(item.sets).toBe(day.strength[0].sets + day.strength[2].sets);
    expect(item.exercises).toHaveLength(3);
    expect(item.exercises[0].detail).toBe(`${day.strength[0].sets} sets`);
    expect(item.exercises[0].exercise).not.toBeNull(); // Pushups map to the library
    expect(item.exercises[2]).toMatchObject({ key: 'cardio', detail: '15 min' });
  });

  it('takes XP from the legacy per-day helpers', () => {
    const state = legacyState();
    const streaks = clearedStreakSeries(state);
    const item = planDayToFeedItem(state, PLAN_DATE, streaks)!;
    expect(item.xp).toBe(xpForDay(planDay(PLAN_DATE)!, state.days[PLAN_DATE], streaks[PLAN_DATE]));
    expect(item.xp).toBe(15 + 15 + 20);
  });

  it('skips days with nothing ticked, rest days and days that are not in the plan', () => {
    const state: AppState = {
      ...emptyState(),
      days: {
        '2026-10-12': { items: {} },
        '2026-10-15': { items: { s0: { at: '2026-10-15T08:00:00.000Z' } } }, // a rest day
        '2027-01-01': { items: { s0: { at: '2027-01-01T08:00:00.000Z' } } },
      },
    };
    expect(buildFeed(state)).toEqual([]);
  });
});

describe('the mixed feed', () => {
  it('is newest first, with a workout before a plan day on the same date', () => {
    const state: AppState = {
      ...legacyState(),
      workouts: [
        workout('2026-10-12', [{ id: 'pushup', sets: [{ reps: 10 }] }], { id: 'same-day', when: '2026-10-12T07:00' }),
        workout('2026-10-20', [{ id: 'pushup', sets: [{ reps: 10 }] }], { id: 'later', when: '2026-10-20T07:00' }),
        workout('2026-10-01', [{ id: 'pushup', sets: [{ reps: 10 }] }], { id: 'earlier', when: '2026-10-01T07:00' }),
      ],
    };
    expect(buildFeed(state).map((i) => i.id)).toEqual(['later', 'same-day', `plan-${PLAN_DATE}`, 'earlier']);
  });

  it('is empty for a new user', () => {
    expect(buildFeed(emptyState())).toEqual([]);
  });
});
