// What the log screen's stats row shows, and the numbers behind the XP popover.
// Pure functions: the screen only lays them out.
import { exerciseById, isCardioExercise } from '../data/exercises';
import { WORKOUT_XP, pace, workoutTotals } from './routines';
import type { ExerciseLookup, WorkoutItem, WorkoutTotals } from './routines';
import { fmtDistance, fmtNumber, fmtVolume } from './units';
import type { DistanceUnit, WeightUnit } from './units';
import type { LiveMark } from './workoutScoring';

// strength: no cardio in the workout. cardio: nothing but cardio. mixed: both.
// An empty workout reads as strength.
export type StatsKind = 'strength' | 'cardio' | 'mixed';

export function statsKind(items: readonly { exerciseId: string }[], lookup: ExerciseLookup = exerciseById): StatsKind {
  let cardio = 0;
  let other = 0;
  for (const item of items) {
    const e = lookup(item.exerciseId);
    if (!e) continue;
    if (isCardioExercise(e)) cardio++;
    else other++;
  }
  if (cardio === 0) return 'strength';
  return other === 0 ? 'cardio' : 'mixed';
}

const KM_PER_MILE = 1.609344;

// "21 km/h" or "12 mph": whole from 10 up, one decimal below. Empty without both numbers.
export function fmtSpeed(min: number | undefined, km: number | undefined, unit: DistanceUnit = 'km'): string {
  if (!min || !km || min <= 0 || km <= 0) return '';
  const perHour = (unit === 'mi' ? km / KM_PER_MILE : km) / (min / 60);
  const shown = perHour >= 10 ? String(Math.round(perHour)) : fmtNumber(Math.round(perHour * 10) / 10);
  return `${shown} ${unit === 'mi' ? 'mph' : 'km/h'}`;
}

// A ride shows speed, a run or walk shows pace.
export type CardioRate = { label: 'Speed' | 'Pace'; value: string };

export function cardioRate(kind: 'run' | 'ride' | undefined, min: number | undefined, km: number | undefined, unit: DistanceUnit = 'km'): CardioRate {
  if (kind === 'ride') return { label: 'Speed', value: fmtSpeed(min, km, unit) };
  return { label: 'Pace', value: pace(min, km, unit) };
}

// "32 min", "1h 05m".
export function fmtMinutes(min: number): string {
  const m = Math.round(min);
  if (m < 60) return `${m} min`;
  return `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, '0')}m`;
}

export type StatTile = { key: string; label: string; value: string };

// Ticked distance cardio: minutes, km, and whether every one of them was a ride.
export function distanceCardio(items: readonly WorkoutItem[], lookup: ExerciseLookup = exerciseById): { min: number; km: number; kind: 'run' | 'ride' } {
  let min = 0;
  let km = 0;
  let rides = 0;
  let others = 0;
  for (const item of items) {
    const e = lookup(item.exerciseId);
    if (e?.metric !== 'distance_time') continue;
    for (const s of item.sets) {
      if (!s.done) continue;
      min += s.min ?? 0;
      km += s.km ?? 0;
    }
    if (e.cardioKind === 'ride') rides++;
    else others++;
  }
  return { min, km, kind: rides > 0 && others === 0 ? 'ride' : 'run' };
}

// The tiles before XP. Strength: Duration, Volume, Sets. Cardio: Time, Distance,
// Speed or Pace. Mixed: Duration, Volume, Distance (or "Cardio N min" with no distance).
export function statTiles(
  items: readonly WorkoutItem[],
  totals: WorkoutTotals,
  opts: { elapsed: string; weight: WeightUnit; distance: DistanceUnit; lookup?: ExerciseLookup }
): StatTile[] {
  const kind = statsKind(items, opts.lookup);
  const duration: StatTile = { key: 'duration', label: 'Duration', value: opts.elapsed || '0s' };
  const volume: StatTile = { key: 'volume', label: 'Volume', value: fmtVolume(totals.volume, opts.weight) };
  if (kind === 'strength') return [duration, volume, { key: 'sets', label: 'Sets', value: String(totals.sets) }];
  if (kind === 'mixed') {
    const distance: StatTile =
      totals.km > 0
        ? { key: 'distance', label: 'Distance', value: fmtDistance(totals.km, opts.distance) }
        : { key: 'cardio', label: 'Cardio', value: fmtMinutes(totals.cardioMinutes) };
    return [duration, volume, distance];
  }
  const dc = distanceCardio(items, opts.lookup);
  const rate = cardioRate(dc.kind, dc.min, dc.km, opts.distance);
  return [
    { key: 'time', label: 'Time', value: fmtMinutes(totals.cardioMinutes) },
    { key: 'distance', label: 'Distance', value: fmtDistance(totals.km, opts.distance) },
    { key: 'rate', label: rate.label, value: rate.value || '-' },
  ];
}

// ---------------- XP so far ----------------

export type LiveXp = { sets: number; marks: number; cardio: number; total: number };

// Set XP split into strength sets and cardio, plus the beat and record chips.
export function liveXp(items: readonly WorkoutItem[], marks: readonly LiveMark[], lookup: ExerciseLookup = exerciseById): LiveXp {
  let cardio = 0;
  let all = 0;
  for (const item of items) {
    const e = lookup(item.exerciseId);
    if (!e) continue;
    const t = workoutTotals([item], lookup);
    all += t.xp;
    if (isCardioExercise(e)) cardio += t.xp;
  }
  const bonus = marks.reduce((sum, m) => sum + m.xp, 0);
  return { sets: all - cardio, marks: bonus, cardio, total: all + bonus };
}

// ---------------- The daily bonus, live ----------------

/** "12 of 20 min today", or "that day" for a past day. Whole minutes, rounded down, so it never reads 20 of 20 before the bar is reached. */
export function minutesTodayText(minutes: number, today = true): string {
  return `${Math.floor(Math.max(0, minutes))} of ${WORKOUT_XP.dailyMinutes} min ${today ? 'today' : 'that day'}`;
}

// short: still under the bar. earned: this workout takes the day over it.
// paid: an earlier workout today already paid the bonus.
export type DailyBonusLive = { state: 'short' | 'earned' | 'paid'; text: string };

/**
 * The popover's daily bonus line. `minutes` is the whole day: the saved workouts
 * of today plus the one in progress (dayMinutes). `paidBefore` is true when the
 * saved workouts alone already reached the bar (dailyBonusPaid).
 */
export function dailyBonusLive(minutes: number, paidBefore: boolean): DailyBonusLive {
  if (paidBefore) return { state: 'paid', text: 'Already earned today' };
  if (minutes >= WORKOUT_XP.dailyMinutes) return { state: 'earned', text: 'Daily bonus earned' };
  return { state: 'short', text: minutesTodayText(minutes) };
}
