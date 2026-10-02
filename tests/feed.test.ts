import { describe, expect, it } from 'vitest';
import { buildFeed, workoutToFeedItem } from '../lib/feed';
import { emptyState } from '../lib/progress';
import { scoreState } from '../lib/workoutScoring';
import { stateWith, workout } from './helpers';

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
    expect(item).toMatchObject({ title: 'Push A', date: '2026-10-10', time: '18:05', minutes: 46, volumeKg: 100, sets: 3, xp: 90, notes: null });
    expect(item.exercises.map((e) => [e.name, e.detail])).toEqual([
      ['Shoulder Press (Dumbbell)', '2 sets'],
      ['Push Up', '1 set'],
    ]);
    expect(item.exercises[0].exercise).toMatchObject({ primary: 'shoulders' });
  });

  it('carries how it felt for the face by the title, or null', () => {
    const w = workout('2026-10-10', [{ id: 'pushup', sets: [{ reps: 10 }] }]);
    expect(workoutToFeedItem({ ...w, feel: 'good', effort: 6 })!.feel).toBe('good');
    expect(workoutToFeedItem(w)!.feel).toBeNull();
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
    expect(buildFeed(scored)[0].xp).toBe(5); // one set is 3 minutes, so no daily bonus
  });
});

describe('the feed', () => {
  it('is newest first', () => {
    const state = stateWith([
      workout('2026-10-12', [{ id: 'pushup', sets: [{ reps: 10 }] }], { id: 'same-day', when: '2026-10-12T07:00' }),
      workout('2026-10-20', [{ id: 'pushup', sets: [{ reps: 10 }] }], { id: 'later', when: '2026-10-20T07:00' }),
      workout('2026-10-01', [{ id: 'pushup', sets: [{ reps: 10 }] }], { id: 'earlier', when: '2026-10-01T07:00' }),
    ]);
    expect(buildFeed(state).map((i) => i.id)).toEqual(['later', 'same-day', 'earlier']);
  });

  it('is empty for a new user', () => {
    expect(buildFeed(emptyState())).toEqual([]);
  });
});
