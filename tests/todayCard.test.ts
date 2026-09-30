import { describe, expect, it } from 'vitest';
import { doneWorkout, estimateRoutineMinutes, routineLine, routinesDue, routineWeekLine, todayModel, todayRoutine, weekChip } from '../lib/todayCard';
import { routineWeekStats } from '../lib/week';
import { emptyState } from '../lib/progress';
import { stateLookup } from '../lib/routines';
import type { Routine } from '../lib/routines';
import { stateWith, workout } from './helpers';

// Tuesday 29 September 2026.
const TODAY = '2026-09-29';
const units = { distance: 'km' as const };

const set = (reps = 10) => ({ reps });
const push: Routine = {
  id: 'r-push',
  title: 'Push A',
  timesPerWeek: 1,
  items: [
    { exerciseId: 'pushup', sets: [set(), set(), set()] },
    { exerciseId: 'db-fly', sets: [{ kg: 5, reps: 10 }, { kg: 5, reps: 10 }, { kg: 5, reps: 10 }] },
    { exerciseId: 'db-ohp', sets: [{ kg: 5, reps: 10 }, { kg: 5, reps: 10 }, { kg: 5, reps: 10 }] },
    { exerciseId: 'db-row', sets: [{ kg: 5, reps: 10 }, { kg: 5, reps: 10 }, { kg: 5, reps: 10 }] },
    { exerciseId: 'treadmill', sets: [{ min: 15, km: 2 }] },
  ],
};
const legs: Routine = { id: 'r-legs', title: 'Legs', timesPerWeek: 2, items: [{ exerciseId: 'bw-squat', sets: [set(), set()] }] };

describe('estimate and lines', () => {
  it('counts 3 minutes a strength set and the planned cardio minutes, rounded to 5', () => {
    // 12 strength sets = 36, plus 15 cardio minutes = 51, which rounds to 50.
    expect(estimateRoutineMinutes(push.items)).toBe(50);
    expect(routineLine(push)).toBe('5 exercises · 50 min');
  });

  it('is never under 5 minutes, and reads 1 exercise in the singular', () => {
    const one: Routine = { id: 'x', title: 'X', items: [{ exerciseId: 'pushup', sets: [set()] }] };
    expect(estimateRoutineMinutes(one.items)).toBe(5);
    expect(routineLine(one)).toBe('1 exercise · 5 min');
  });

  it('counts interval work and rest as cardio minutes', () => {
    expect(estimateRoutineMinutes([{ exerciseId: 'hiit-run', sets: [{ on: 5, off: 5 }, { on: 5, off: 5 }] }], (id) => ({ id, metric: 'intervals' }) as never)).toBe(20);
  });

  it('writes the weekly chip only for a routine with a weekly count', () => {
    expect(weekChip(routineWeekStats(push, [], TODAY))).toBe('0 of 1 this week');
    expect(weekChip(routineWeekStats({ ...push, timesPerWeek: undefined }, [], TODAY))).toBeNull();
    expect(routineWeekLine(routineWeekStats(legs, [], TODAY))).toBe('1 exercise · 0 of 2 this week');
  });
});

describe('routines due', () => {
  it('leads with the routine below its weekly count', () => {
    const w = workout('2026-09-28', [{ id: 'bw-squat', sets: [{ reps: 10 }] }], { routineId: 'r-legs' });
    // Legs is 1 of 2, Push A is 0 of 1: both are pending, Push A was never done so it comes first.
    expect(todayRoutine([legs, push], [w], TODAY)?.routine.id).toBe('r-push');
  });

  it('falls back to the least recent routine when every weekly count is reached', () => {
    const a = workout('2026-09-28', [{ id: 'pushup', sets: [{ reps: 10 }] }], { routineId: 'r-push' });
    const b = workout('2026-09-27', [{ id: 'bw-squat', sets: [{ reps: 10 }] }], { routineId: 'r-legs' });
    const b2 = workout('2026-09-26', [{ id: 'bw-squat', sets: [{ reps: 10 }] }], { routineId: 'r-legs' });
    const due = routinesDue([push, legs], [a, b, b2], TODAY, 2);
    expect(due.map((d) => d.routine.id)).toEqual(['r-legs', 'r-push']);
  });

  it('pads with the routines that are done when fewer are pending', () => {
    const a = workout('2026-09-28', [{ id: 'pushup', sets: [{ reps: 10 }] }], { routineId: 'r-push' });
    expect(routinesDue([push, legs], [a], TODAY, 2).map((d) => d.routine.id)).toEqual(['r-legs', 'r-push']);
  });

  it('has nothing to lead with when there are no routines', () => {
    expect(todayRoutine([], [], TODAY)).toBeNull();
  });
});

describe('today model', () => {
  it('is Ready when nothing was logged today', () => {
    const y = workout('2026-09-28', [{ id: 'pushup', sets: [{ reps: 10 }] }]);
    const m = todayModel(stateWith([y], { routines: [push] }), TODAY, units);
    expect(m.kind).toBe('ready');
    if (m.kind === 'ready') expect(m.routine?.routine.id).toBe('r-push');
  });

  it('is Ready with no routine for a new account', () => {
    const m = todayModel(stateWith([], { routines: [] }), TODAY, units);
    expect(m).toEqual({ kind: 'ready', routine: null });
  });

  it('is Done when a workout is dated today, with the XP total and one entry per workout', () => {
    const a = workout(TODAY, [{ id: 'pushup', sets: [{ reps: 10 }, { reps: 10 }] }], { title: 'Push A', xp: 105, when: `${TODAY}T08:00` });
    const b = workout(TODAY, [{ id: 'bike', sets: [{ min: 32, km: 11.2 }] }], { title: 'Evening ride', xp: 90, when: `${TODAY}T20:00` });
    const m = todayModel(stateWith([b, a], { routines: [push] }), TODAY, units);
    expect(m.kind).toBe('done');
    if (m.kind !== 'done') return;
    expect(m.xp).toBe(195);
    expect(m.workouts.map((w) => w.title)).toEqual(['Push A', 'Evening ride']);
  });

  it('ignores a workout with nothing ticked', () => {
    const a = workout(TODAY, [{ id: 'pushup', sets: [{ reps: 10 }], undone: [0] }]);
    expect(todayModel(stateWith([a], { routines: [push] }), TODAY, units).kind).toBe('ready');
  });
});

describe('done workout lines', () => {
  const lookup = stateLookup(emptyState());

  it('writes minutes, sets and XP for a strength workout', () => {
    const w = workout(TODAY, [{ id: 'pushup', sets: Array.from({ length: 12 }, () => ({ reps: 10 })) }], { xp: 105, startedAt: `${TODAY}T08:00:00.000Z`, finishedAt: `${TODAY}T08:52:00.000Z` });
    expect(doneWorkout(w, lookup, units)?.meta).toBe('52 min · 12 sets · +105 XP');
  });

  it('writes distance and XP for cardio, and minutes when there is no distance', () => {
    const ride = workout(TODAY, [{ id: 'bike', sets: [{ min: 32, km: 11.2 }] }], { xp: 90 });
    expect(doneWorkout(ride, lookup, units)?.meta).toBe('11.2 km · +90 XP');
    expect(doneWorkout(ride, lookup, { distance: 'mi' })?.meta).toBe('6.96 mi · +90 XP');
    const walk = workout(TODAY, [{ id: 'walk', sets: [{ min: 20 }] }], { xp: 40 });
    expect(doneWorkout(walk, lookup, units)?.meta).toBe('20 min · +40 XP');
  });

  it('lists the first three ticked exercises, with minutes for cardio', () => {
    const w = workout(TODAY, [
      { id: 'pushup', sets: [{ reps: 10 }] },
      { id: 'db-fly', sets: [{ kg: 5, reps: 10 }], undone: [0] },
      { id: 'db-ohp', sets: [{ kg: 5, reps: 10 }] },
      { id: 'db-row', sets: [{ kg: 5, reps: 10 }] },
      { id: 'treadmill', sets: [{ min: 12, km: 1.5 }] },
    ]);
    const d = doneWorkout(w, lookup, units);
    expect(d?.rows.map((r) => r.key)).toEqual(['pushup', 'db-ohp', 'db-row']);
    const cardio = doneWorkout(workout(TODAY, [{ id: 'treadmill', sets: [{ min: 12, km: 1.5 }] }]), lookup, units);
    expect(cardio?.rows[0].minutes).toBe(12);
    expect(d?.rows[0].minutes).toBeNull();
  });
});
