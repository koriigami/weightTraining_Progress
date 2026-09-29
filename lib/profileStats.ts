// The numbers on Profile that are not the weekly chart: the four stat tiles and
// the weight card. Pure.
import { goalStatus } from './goals';
import { computeStats } from './progress';
import type { AppState } from './progress';
import { stateLookup, workoutTotals } from './routines';
import { computeWorkoutStats, maxWorkoutDate } from './workoutScoring';
import { trainedDates } from './week';

export type ProfileTiles = {
  workouts: number; // sessions: logged workouts plus days of the 6-week plan with something ticked
  volumeKg: number; // lifted in logged workouts
  prs: number;
  cardioKm: number; // logged distance of every kind, plus the km of the 6-week plan
};

export function profileTiles(state: AppState, today: string): ProfileTiles {
  const w = computeWorkoutStats(state, today);
  const legacy = computeStats(state, today);
  const lookup = stateLookup(state);
  const maxDate = maxWorkoutDate(today);
  let km = 0;
  for (const wo of state.workouts ?? []) {
    if (wo.date > maxDate) continue;
    const t = workoutTotals(wo.items, lookup);
    if (t.sets > 0) km += t.km;
  }
  return {
    workouts: trainedDates(state).length,
    volumeKg: w.volumeKg,
    prs: w.prs,
    cardioKm: km + legacy.treadmillKm + legacy.cycleKm,
  };
}

export type WeightPoint = { date: string; kg: number };

export type WeightSummary = {
  points: WeightPoint[]; // the last few weigh-ins, oldest first
  current: number | null;
  currentDate: string | null;
  changeKg: number | null; // current minus the first point, null with fewer than two
  since: string | null; // the date of the first point when there is a change
  target: number | null; // the newest active weight goal
};

export function weightSummary(state: AppState, today: string, limit = 8): WeightSummary {
  const all = Object.keys(state.weights ?? {})
    .sort()
    .map((date) => ({ date, kg: state.weights[date] }));
  const points = all.slice(-limit);
  const last = points.length ? points[points.length - 1] : null;
  const first = points.length > 1 ? points[0] : null;

  const goals = state.goals
    .filter((g) => g.type === 'weight' && goalStatus(g, state, today) === 'active')
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));

  return {
    points,
    current: last ? last.kg : null,
    currentDate: last ? last.date : null,
    changeKg: last && first ? Math.round((last.kg - first.kg) * 10) / 10 : null,
    since: first ? first.date : null,
    target: goals.length ? goals[0].target : null,
  };
}
