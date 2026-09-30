import { describe, expect, it } from 'vitest';
import { trainedDates, upNextRoutines, weekDots, weekSummary } from '../lib/week';
import { emptyState } from '../lib/progress';
import type { AppState } from '../lib/progress';
import { defaultPrefs } from '../lib/routines';
import type { Routine } from '../lib/routines';
import { stateWith, workout } from './helpers';

// Tuesday 29 September 2026. Its week runs Monday 28 Sep to Sunday 4 Oct.
const TODAY = '2026-09-29';

describe('week dots', () => {
  it('runs Monday to Sunday with the day of the month', () => {
    const dots = weekDots([], TODAY);
    expect(dots.map((d) => d.label).join('')).toBe('MTWTFSS');
    expect(dots.map((d) => d.date)).toEqual(['2026-09-28', '2026-09-29', '2026-09-30', '2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04']);
    expect(dots.map((d) => d.day)).toEqual([28, 29, 30, 1, 2, 3, 4]);
  });

  it('marks today with a ring, done days, and days still to come', () => {
    const dots = weekDots(['2026-09-28', '2026-09-30'], TODAY);
    expect(dots.map((d) => d.done)).toEqual([true, false, true, false, false, false, false]);
    expect(dots.filter((d) => d.today).map((d) => d.date)).toEqual([TODAY]);
    expect(dots.map((d) => d.future)).toEqual([false, false, true, true, true, true, true]);
  });

  it('a Sunday is still in the week that started on Monday', () => {
    const dots = weekDots([], '2026-10-04');
    expect(dots[0].date).toBe('2026-09-28');
    expect(dots[6].today).toBe(true);
  });

  it('dates outside the week are not shown', () => {
    expect(weekDots(['2026-09-27', '2026-10-05'], TODAY).some((d) => d.done)).toBe(false);
  });
});

describe('trained dates', () => {
  it('counts logged workouts with a ticked set', () => {
    const state: AppState = stateWith([
      workout('2026-10-10', [{ id: 'pushup', sets: [{ reps: 10 }] }]),
      workout('2026-10-11', [{ id: 'pushup', sets: [{ reps: 10 }], undone: [0] }]), // nothing ticked
    ]);
    expect(trainedDates(state)).toEqual(['2026-10-10']);
  });

  it('two workouts on one day count twice', () => {
    const state = stateWith([workout('2026-09-29', [{ id: 'pushup', sets: [{ reps: 10 }] }]), workout('2026-09-29', [{ id: 'plank', sets: [{ sec: 30 }] }])]);
    expect(trainedDates(state)).toEqual(['2026-09-29', '2026-09-29']);
  });
});

describe('week summary', () => {
  it('counts this week, the goal and the weekly streak', () => {
    const state = stateWith(
      [
        workout('2026-09-14', [{ id: 'pushup', sets: [{ reps: 10 }] }]), // two weeks ago
        workout('2026-09-22', [{ id: 'pushup', sets: [{ reps: 10 }] }]), // last week
        workout('2026-09-28', [{ id: 'pushup', sets: [{ reps: 10 }] }]),
      ],
      { prefs: { ...defaultPrefs(), weeklyGoal: 4 } }
    );
    const s = weekSummary(state, TODAY);
    expect(s.count).toBe(1);
    expect(s.goal).toBe(4);
    expect(s.streak).toBe(3);
    expect(s.dots[0].done).toBe(true);
  });

  it('is empty for a new user, with the default goal', () => {
    const s = weekSummary(emptyState(), TODAY);
    expect(s).toMatchObject({ count: 0, goal: 3, streak: 0 });
    expect(s.dots.every((d) => !d.done)).toBe(true);
  });

  it('a week without a workout yet keeps the streak alive until it ends', () => {
    const state = stateWith([workout('2026-09-22', [{ id: 'pushup', sets: [{ reps: 10 }] }])]);
    expect(weekSummary(state, TODAY).streak).toBe(1);
    expect(weekSummary(state, '2026-10-07').streak).toBe(0);
  });
});

describe('up next', () => {
  const routine = (id: string, timesPerWeek?: number): Routine => ({
    id,
    title: id,
    ...(timesPerWeek ? { timesPerWeek } : {}),
    items: [{ exerciseId: 'pushup', sets: [{ reps: 10 }] }],
  });
  const done = (date: string, routineId: string) => workout(date, [{ id: 'pushup', sets: [{ reps: 10 }] }], { routineId });

  it('lists routines below their weekly count', () => {
    const routines = [routine('push', 2), routine('pull', 1), routine('legs', 1)];
    const workouts = [done('2026-09-28', 'push'), done('2026-09-29', 'pull')];
    const r = upNextRoutines(routines, workouts, TODAY, 5);
    expect(r.allDone).toBe(false);
    expect(r.items.map((i) => [i.routine.id, i.done, i.target])).toEqual([
      ['legs', 0, 1], // never done comes first
      ['push', 1, 2],
    ]);
  });

  it('counts only this week, and only workouts started from the routine', () => {
    const routines = [routine('push', 1)];
    const workouts = [done('2026-09-27', 'push'), workout('2026-09-28', [{ id: 'pushup', sets: [{ reps: 10 }] }])];
    const r = upNextRoutines(routines, workouts, TODAY);
    expect(r.items[0]).toMatchObject({ done: 0, lastDate: '2026-09-27' });
  });

  it('shows the least recently done first', () => {
    const routines = [routine('a', 2), routine('b', 2)];
    const workouts = [done('2026-09-20', 'a'), done('2026-09-10', 'b')];
    expect(upNextRoutines(routines, workouts, TODAY).items.map((i) => i.routine.id)).toEqual(['b', 'a']);
  });

  it('is limited to the number asked for', () => {
    const routines = [routine('a', 1), routine('b', 1), routine('c', 1)];
    expect(upNextRoutines(routines, [], TODAY, 2).items).toHaveLength(2);
  });

  it('says everything is done when every weekly count has been reached', () => {
    const routines = [routine('push', 1), routine('pull')];
    const r = upNextRoutines(routines, [done('2026-09-28', 'push')], TODAY);
    expect(r).toEqual({ items: [], allDone: true });
  });

  it('suggests the least recently done routines when none has a weekly count', () => {
    const routines = [routine('a'), routine('b'), routine('c')];
    const workouts = [done('2026-09-20', 'a'), done('2026-09-25', 'c')];
    const r = upNextRoutines(routines, workouts, TODAY, 2);
    expect(r.allDone).toBe(false);
    expect(r.items.map((i) => i.routine.id)).toEqual(['b', 'a']);
    expect(r.items[0].target).toBeNull();
  });

  it('is empty with no routines', () => {
    expect(upNextRoutines([], [], TODAY)).toEqual({ items: [], allDone: false });
  });
});
