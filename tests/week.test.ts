import { describe, expect, it } from 'vitest';
import { comebackPending, dayKind, dayRules, goalRun, goalRunText, trainedDates, upNextRoutines, weekDots, weekSummary } from '../lib/week';
import { emptyState } from '../lib/progress';
import type { AppState } from '../lib/progress';
import { defaultPrefs } from '../lib/routines';
import type { Routine } from '../lib/routines';
import { scoreWorkouts } from '../lib/workoutScoring';
import { addDaysStr } from '../lib/date';
import { stateWith, trainingDay, workout } from './helpers';

// Tuesday 29 September 2026. Its week runs Monday 28 Sep to Sunday 4 Oct.
const TODAY = '2026-09-29';
// The first logged workout in the week tests below: Monday, the start of the week.
const FIRST = '2026-09-28';

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

describe('rest days on the week strip', () => {
  it('a past day of this week without a training day is a rest day, a training day is not', () => {
    const dots = weekDots(['2026-09-28'], '2026-10-01', undefined, FIRST); // Thursday
    expect(dots.map((d) => d.rest)).toEqual([false, true, true, false, false, false, false]);
    expect(dots[0].done).toBe(true);
  });

  it('shows no rest days until a first workout is given', () => {
    const dots = weekDots(['2026-09-28'], '2026-10-01');
    expect(dots.some((d) => d.rest)).toBe(false);
  });

  it('before the goal is met the days ahead stay open', () => {
    const dots = weekDots(['2026-09-28', '2026-09-29'], TODAY, 3, FIRST); // 2 of 3
    expect(dots.filter((d) => d.future).some((d) => d.rest)).toBe(false);
    expect(weekDots(['2026-09-28', '2026-09-29', '2026-09-30'], TODAY, undefined, FIRST).filter((d) => d.future).some((d) => d.rest)).toBe(false); // no goal given
  });

  it('once the weekly goal is met the days still to come are rest days too', () => {
    const dots = weekDots(['2026-09-28', '2026-09-29', '2026-09-30'], '2026-09-30', 3, FIRST);
    expect(dots.map((d) => d.rest)).toEqual([false, false, false, true, true, true, true]);
  });

  it('today never shows Rest, even with the goal met on an earlier day', () => {
    const dots = weekDots(['2026-09-28', '2026-09-29', '2026-09-30'], '2026-10-01', 3, FIRST);
    const today = dots.find((d) => d.today)!;
    expect(today).toMatchObject({ done: false, rest: false });
    expect(dots.slice(4).every((d) => d.rest)).toBe(true);
  });

  it('a training day today keeps the tick, not Rest', () => {
    const dots = weekDots(['2026-09-28', '2026-09-29', '2026-09-30'], '2026-09-30', 3, FIRST);
    expect(dots[2]).toMatchObject({ done: true, rest: false, today: true });
  });

  it('the summary applies the weekly goal from the prefs', () => {
    const state = stateWith([trainingDay('2026-09-28'), trainingDay('2026-09-29')], { prefs: { ...defaultPrefs(), weeklyGoal: 2 } });
    expect(weekSummary(state, '2026-09-30').dots.map((d) => d.rest)).toEqual([false, false, false, true, true, true, true]);
  });

  it('the summary starts rest days at the first logged workout, so a new account sees none', () => {
    expect(weekSummary(emptyState(), '2026-09-30').dots.some((d) => d.rest)).toBe(false);
    const dots = weekSummary(stateWith([trainingDay('2026-09-29')]), '2026-10-01').dots; // first workout on Tuesday
    expect(dots.map((d) => d.rest)).toEqual([false, false, true, false, false, false, false]);
  });
});

describe('day kind', () => {
  // Thursday 1 October, first workout on Monday 28 September, one training day.
  const rules = dayRules(['2026-09-28'], '2026-09-28', '2026-10-01', 3);

  it('a past day without a training day, on or after the first workout, is a rest day', () => {
    expect(dayKind('2026-09-29', rules)).toBe('rest');
    expect(dayKind('2026-09-28', rules)).toBe('training');
    expect(dayKind('2026-09-30', dayRules([], '2026-09-10', '2026-10-01'))).toBe('rest'); // an earlier week too
  });

  it('a day before the first workout is open', () => {
    expect(dayKind('2026-09-27', rules)).toBe('open');
    expect(dayKind('2026-09-01', rules)).toBe('open');
  });

  it('with no workouts at all there are no rest days', () => {
    const none = dayRules([], null, '2026-10-01', 3);
    expect(dayKind('2026-09-29', none)).toBe('open');
    expect(dayKind('2026-09-10', none)).toBe('open');
  });

  it('today is open until it becomes a training day', () => {
    expect(dayKind('2026-10-01', rules)).toBe('open');
    expect(dayKind('2026-10-01', dayRules(['2026-09-28', '2026-10-01'], '2026-09-28', '2026-10-01', 3))).toBe('training');
    const met = dayRules(['2026-09-28', '2026-09-29', '2026-09-30'], '2026-09-28', '2026-10-01', 3);
    expect(dayKind('2026-10-01', met)).toBe('open'); // even with the goal met
  });

  it('a day with only a short workout is a rest day', () => {
    const short = workout('2026-09-28', [{ id: 'pushup', sets: [{ reps: 10 }, { reps: 10 }] }]);
    const s = weekSummary(stateWith([short]), '2026-09-30');
    expect(s.rules.training.has('2026-09-28')).toBe(false);
    expect(dayKind('2026-09-28', s.rules)).toBe('rest');
    expect(s.dots[0]).toMatchObject({ done: false, rest: true });
  });

  it('once the weekly goal is met the rest of this week is rest, and next week stays open', () => {
    const met = dayRules(['2026-09-28', '2026-09-29', '2026-09-30'], '2026-09-28', '2026-09-30', 3);
    expect(met.goalMetThisWeek).toBe(true);
    expect(dayKind('2026-10-01', met)).toBe('rest');
    expect(dayKind('2026-10-04', met)).toBe('rest'); // Sunday
    expect(dayKind('2026-10-05', met)).toBe('open'); // next Monday
    const notYet = dayRules(['2026-09-28', '2026-09-29'], '2026-09-28', '2026-09-30', 3);
    expect(notYet.goalMetThisWeek).toBe(false);
    expect(dayKind('2026-10-01', notYet)).toBe('open');
  });

  it('only training days in the current week count towards the goal, and no goal means it is never met', () => {
    expect(dayRules(['2026-09-21', '2026-09-22', '2026-09-23'], '2026-09-21', '2026-09-30', 3).goalMetThisWeek).toBe(false);
    expect(dayRules(['2026-09-28', '2026-09-29', '2026-09-30'], '2026-09-28', '2026-09-30').goalMetThisWeek).toBe(false);
  });
});

describe('comeback hint', () => {
  // Today is Tuesday 29 September: last week is 21 to 27 September, this week starts on the 28th.
  it('shows when last week and this week have no training day but an earlier one exists', () => {
    expect(comebackPending(['2026-09-08'], TODAY)).toBe(true);
  });

  it('is off for someone who has never trained, or trained only last week', () => {
    expect(comebackPending([], TODAY)).toBe(false);
    expect(comebackPending(['2026-09-22'], TODAY)).toBe(false);
  });

  it('is off once a training day lands this week', () => {
    expect(comebackPending(['2026-09-08', '2026-09-28'], TODAY)).toBe(false);
  });

  it('only counts training days: a short workout does not turn it off, or on', () => {
    const short = workout('2026-09-28', [{ id: 'pushup', sets: [{ reps: 10 }, { reps: 10 }] }]);
    expect(weekSummary(stateWith([trainingDay('2026-09-08'), short]), TODAY).comeback).toBe(true);
    expect(weekSummary(stateWith([short]), TODAY).comeback).toBe(false);
  });
});

describe('goal run', () => {
  // Today is Wednesday 14 October. This week is 12 to 18 October. Monday 21 September starts the first of the weeks below.
  const TODAY_G = '2026-10-14';
  const MON_G = '2026-09-21';
  const wk = (n: number, days: number) => Array.from({ length: days }, (_, i) => addDaysStr(MON_G, 7 * n + i)); // week 0 is 21 Sep, week 3 is 12 Oct

  it('has no run and pays +50 with no history', () => {
    expect(goalRun([], 3, TODAY_G)).toEqual({ run: 0, met: false, weeks: 0, thisWeek: 50, nextWeek: 50 });
  });

  it('before the goal is met: the run up to last week, and what this week pays', () => {
    const g = goalRun([...wk(0, 3), ...wk(1, 3), ...wk(2, 3), ...wk(3, 2)], 3, TODAY_G);
    expect(g).toMatchObject({ run: 3, met: false, weeks: 3, thisWeek: 80 });
    expect(goalRunText(g)).toEqual({ title: 'Goal bonus this week: +80 XP', sub: 'Goal met 3 weeks in a row' });
  });

  it('after the goal is met: the run counts this week, and next week pays one step more', () => {
    const g = goalRun([...wk(0, 3), ...wk(1, 3), ...wk(2, 3), ...wk(3, 3)], 3, TODAY_G);
    expect(g).toEqual({ run: 3, met: true, weeks: 4, thisWeek: 80, nextWeek: 90 });
    expect(goalRunText(g)).toEqual({ title: 'Goal met 4 weeks in a row: +80 XP', sub: 'Next week pays +90 XP' });
  });

  it('the first goal week says "this week", and a run of one says "1 week" in the singular', () => {
    const first = goalRun(wk(3, 3), 3, TODAY_G);
    expect(first).toMatchObject({ run: 0, met: true, weeks: 1, thisWeek: 50, nextWeek: 60 });
    expect(goalRunText(first)).toEqual({ title: 'Goal met this week: +50 XP', sub: 'Next week pays +60 XP' });
    expect(goalRunText(goalRun(wk(2, 3), 3, TODAY_G))).toEqual({ title: 'Goal bonus this week: +60 XP', sub: 'Goal met 1 week in a row' });
  });

  it('shows no second line before the goal is met when there is no run', () => {
    expect(goalRunText(goalRun(wk(3, 1), 3, TODAY_G))).toEqual({ title: 'Goal bonus this week: +50 XP' });
  });

  it('stops at +100: the sixth week and every one after pays the same', () => {
    const six = [0, 1, 2, 3].flatMap((n) => wk(n, 3));
    const early = goalRun([...[-2, -1].flatMap((n) => wk(n, 3)), ...six], 3, TODAY_G); // six weeks counting this one
    expect(early).toMatchObject({ run: 5, met: true, weeks: 6, thisWeek: 100, nextWeek: 100 });
    expect(goalRunText(early)).toEqual({ title: 'Goal met 6 weeks in a row: +100 XP', sub: 'Next week pays +100 XP' });
  });

  it('a missed week or a week under the goal ends the run', () => {
    expect(goalRun([...wk(0, 3), ...wk(1, 3), ...wk(2, 2)], 3, TODAY_G).run).toBe(0); // last week short
    expect(goalRun([...wk(0, 3), ...wk(2, 3)], 3, TODAY_G).run).toBe(1); // week 1 missed, then last week met
    expect(goalRun([...wk(0, 3), ...wk(1, 3)], 3, TODAY_G).run).toBe(0); // last week missed
  });

  it('this week never ends the run before it is over', () => {
    expect(goalRun([...wk(1, 3), ...wk(2, 3)], 3, TODAY_G)).toMatchObject({ run: 2, met: false, thisWeek: 70 });
  });

  it('uses the goal it is given for every week, and never loops for a goal below 1', () => {
    const days = [...wk(0, 2), ...wk(1, 2), ...wk(2, 2), ...wk(3, 2)];
    expect(goalRun(days, 2, TODAY_G)).toMatchObject({ run: 3, met: true, weeks: 4 });
    expect(goalRun(days, 3, TODAY_G)).toMatchObject({ run: 0, met: false });
    expect(goalRun(days, 0, TODAY_G)).toMatchObject({ run: 0, met: false });
  });

  it('is part of the week summary, from the prefs goal and training days only', () => {
    const short = workout(addDaysStr(MON_G, 14), [{ id: 'pushup', sets: [{ reps: 10 }] }]);
    const days = [...wk(0, 3), ...wk(1, 3)].map((d) => trainingDay(d));
    const s = weekSummary(stateWith([...days, short]), TODAY_G);
    expect(s.goalRun).toMatchObject({ run: 0, met: false, thisWeek: 50 }); // the short week 2 is not a goal week
    expect(weekSummary(stateWith([...days, ...wk(2, 3).map((d) => trainingDay(d))]), TODAY_G).goalRun).toMatchObject({ run: 3, met: false, thisWeek: 80 });
  });

  it('agrees with scoring: on every workout that pays the goal bonus, the run and the amount are what Home shows', () => {
    // Weeks of 3, 3, 2, 4, 3, 3, 1, 3, 3, 3 training days, so runs build, break and build again.
    const perWeek = [3, 3, 2, 4, 3, 3, 1, 3, 3, 3];
    const days = perWeek.flatMap((n, i) => Array.from({ length: n }, (_, d) => addDaysStr('2026-08-03', 7 * i + d)));
    const scores = scoreWorkouts(days.map((d) => trainingDay(d)), { weeklyGoal: 3 });
    const paid = scores.filter((s) => s.weeklyXp > 0);
    expect(paid.map((s) => s.weeklyXp)).toEqual([50, 60, 50, 60, 70, 50, 60, 70]);
    for (const s of paid) {
      const upTo = days.filter((d) => d <= s.date);
      const g = goalRun(upTo, 3, s.date);
      expect(g.met).toBe(true);
      expect(g.weeks).toBe(s.parts.weekRun);
      expect(g.thisWeek).toBe(s.weeklyXp);
    }
  });
});

describe('trained dates', () => {
  it('counts logged workouts with a ticked set, as sessions', () => {
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
  it('counts this week, the goal and the weekly streak, in training days', () => {
    const state = stateWith(
      [
        trainingDay('2026-09-14'), // two weeks ago
        trainingDay('2026-09-22'), // last week
        trainingDay('2026-09-28'),
        trainingDay('2026-09-28'), // a second workout the same day is the same training day
      ],
      { prefs: { ...defaultPrefs(), weeklyGoal: 4 } }
    );
    const s = weekSummary(state, TODAY);
    expect(s.count).toBe(1);
    expect(s.goal).toBe(4);
    expect(s.streak).toBe(3);
    expect(s.dots[0].done).toBe(true);
  });

  it('a day under 20 minutes is not marked, counted or kept in the streak', () => {
    const state = stateWith([trainingDay('2026-09-22'), workout('2026-09-28', [{ id: 'pushup', sets: [{ reps: 10 }, { reps: 10 }] }])]);
    const s = weekSummary(state, TODAY);
    expect(s.count).toBe(0);
    expect(s.dots[0].done).toBe(false);
    expect(s.streak).toBe(1); // last week; this week has no training day yet but is still open
    expect(weekSummary(state, '2026-10-07').streak).toBe(0);
  });

  it('is empty for a new user, with the default goal', () => {
    const s = weekSummary(emptyState(), TODAY);
    expect(s).toMatchObject({ count: 0, goal: 3, streak: 0 });
    expect(s.dots.every((d) => !d.done)).toBe(true);
  });

  it('a week without a training day yet keeps the streak alive until it ends', () => {
    const state = stateWith([trainingDay('2026-09-22')]);
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
