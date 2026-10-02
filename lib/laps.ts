// Laps on a run, walk or ride, as pure functions. A lap is a time and an optional
// distance, kept on the cardio set next to the run's own total time and distance.
// Scoring never reads laps: XP, records and "beat last time" judge the whole run.
import { cardioRate } from './liveStats';
import { LIMITS } from './routines';
import type { Lap } from './routines';
import { unitToKm } from './units';
import type { DistanceUnit } from './units';

// What a lap may hold. The server rejects anything outside these.
export const LAP_SEC: [number, number] = [1, 86_400];
export const LAP_KM: [number, number] = [0, 100];

const round3 = (n: number): number => Math.round(n * 1000) / 1000;

// ---------------- Stamping and totals ----------------

/**
 * The lap a tap on Lap stamps: the seconds since Start minus the laps already
 * stamped, with the chosen distance. Null under 1 second, so a double tap never
 * adds an empty lap.
 */
export function closeLap(laps: readonly Lap[], elapsedSec: number, km?: number): Lap | null {
  const sec = Math.floor(elapsedSec - lapTotals(laps).sec);
  if (!(sec >= 1)) return null;
  return { sec: Math.min(LAP_SEC[1], sec), ...(typeof km === 'number' && km > 0 ? { km: Math.min(LAP_KM[1], round3(km)) } : {}) };
}

export type LapTotals = { count: number; sec: number; km: number };

// The number of laps, their seconds and their distance in km (laps without one add nothing).
export function lapTotals(laps: readonly Lap[]): LapTotals {
  let sec = 0;
  let km = 0;
  for (const l of laps) {
    sec += l.sec;
    km += l.km ?? 0;
  }
  return { count: laps.length, sec, km: round3(km) };
}

// ---------------- Fastest lap ----------------

// How fast each lap was, for ranking: km per second when any lap has a distance
// (a lap without one has no rank then), else the plain speed of the time. A lap
// with no time yet has no rank either.
function speeds(laps: readonly Lap[]): (number | null)[] {
  const byDistance = laps.some((l) => l.sec >= 1 && (l.km ?? 0) > 0);
  return laps.map((l) => {
    if (!(l.sec >= 1)) return null;
    if (byDistance) return (l.km ?? 0) > 0 ? (l.km as number) / l.sec : null;
    return 1 / l.sec;
  });
}

/**
 * The index of the fastest lap. When any lap has a distance, laps are ranked by
 * pace among the ones that have it; otherwise by time. Null when fewer than 2
 * laps can be compared. The first of equal laps wins.
 */
export function fastestLap(laps: readonly Lap[]): number | null {
  const s = speeds(laps);
  if (s.filter((v) => v !== null).length < 2) return null;
  let best = -1;
  s.forEach((v, i) => {
    if (v !== null && (best === -1 || v > (s[best] as number))) best = i;
  });
  return best;
}

// The shortest bar of the chart: the slowest lap still has a visible bar.
export const BAR_FLOOR = 0.45;

/** One height from BAR_FLOOR to 1 per lap, taller is faster. Laps that cannot be ranked sit at the floor. */
export function lapBars(laps: readonly Lap[]): number[] {
  const s = speeds(laps);
  const known = s.filter((v): v is number => v !== null);
  if (known.length === 0) return laps.map(() => BAR_FLOOR);
  const hi = Math.max(...known);
  const lo = Math.min(...known);
  return s.map((v) => (v === null ? BAR_FLOOR : hi === lo ? 1 : BAR_FLOOR + ((1 - BAR_FLOOR) * (v - lo)) / (hi - lo)));
}

// ---------------- Showing and typing ----------------

const pad = (n: number): string => String(n).padStart(2, '0');

// "1:38", and "1:05:30" from an hour. Whole seconds.
export function fmtLapTime(sec: number): string {
  const s = Math.max(0, Math.round(sec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return h > 0 ? `${h}:${pad(m)}:${pad(s % 60)}` : `${m}:${pad(s % 60)}`;
}

/**
 * What a lap time box means. `m:ss` or `h:mm:ss`, and a plain number is minutes
 * (5 is five minutes, 1.5 is a minute and a half). Whole seconds back. Undefined
 * for an empty box, null for text that is not a time (yet) or is over a day.
 */
export function parseLapTime(text: string): number | undefined | null {
  const t = text.trim().replace(',', '.');
  if (t === '') return undefined;
  let sec: number;
  const hms = /^(\d{1,2}):([0-5]\d):([0-5]\d)$/.exec(t);
  const ms = /^(\d{1,4}):([0-5]\d)$/.exec(t);
  if (hms) sec = Number(hms[1]) * 3600 + Number(hms[2]) * 60 + Number(hms[3]);
  else if (ms) sec = Number(ms[1]) * 60 + Number(ms[2]);
  else if (/^\d*\.?\d*$/.test(t) && t !== '.') sec = Math.round(Number(t) * 60);
  else return null;
  return Number.isFinite(sec) && sec <= LAP_SEC[1] ? sec : null;
}

// The pace (a run or walk) or speed (a ride) of one lap, or '' without a distance.
export function lapRate(kind: 'run' | 'ride' | undefined, lap: Lap, unit: DistanceUnit): string {
  return cardioRate(kind, lap.sec / 60, lap.km, unit).value;
}

/** "5 laps · fastest lap 2, 4:05 /km", or by time when no lap has a distance: "5 laps · fastest lap 2, 1:38". */
export function lapSummary(laps: readonly Lap[], kind: 'run' | 'ride' | undefined, unit: DistanceUnit): string {
  const count = `${laps.length} ${laps.length === 1 ? 'lap' : 'laps'}`;
  const best = fastestLap(laps);
  if (best === null) return count;
  const lap = laps[best];
  const how = (lap.km ?? 0) > 0 ? lapRate(kind, lap, unit) : fmtLapTime(lap.sec);
  return `${count} · fastest lap ${best + 1}, ${how}`;
}

// ---------------- Distance chips ----------------

export type LapDistanceChoice = { label: string; km?: number };

// "No distance" first (the default), then a short and a long lap in the person's unit.
export function lapDistanceChoices(unit: DistanceUnit): LapDistanceChoice[] {
  const none: LapDistanceChoice = { label: 'No distance' };
  if (unit === 'mi') return [none, { label: '0.25 mi', km: unitToKm(0.25, 'mi') }, { label: '1 mi', km: unitToKm(1, 'mi') }];
  return [none, { label: '400 m', km: 0.4 }, { label: '1 km', km: 1 }];
}

// ---------------- Cleaning ----------------

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

// A distance for a lap: above 0 and no more than the limit, else none.
function cleanKm(v: unknown): number | undefined {
  return typeof v === 'number' && Number.isFinite(v) && v > 0 ? Math.min(LAP_KM[1], round3(v)) : undefined;
}

/**
 * Laps read back from the device. Lenient: a lap with no time yet (a row added
 * and still empty) stays, with sec 0, so reloading does not make a row vanish.
 * Whole seconds, inside the limits, at most 200, anything else dropped.
 */
export function readLaps(raw: unknown): Lap[] {
  if (!Array.isArray(raw)) return [];
  const out: Lap[] = [];
  for (const r of raw) {
    if (!isObj(r) || typeof r.sec !== 'number' || !Number.isFinite(r.sec)) continue;
    const km = cleanKm(r.km);
    out.push({ sec: Math.min(LAP_SEC[1], Math.max(0, Math.round(r.sec))), ...(km !== undefined ? { km } : {}) });
    if (out.length === LIMITS.lapsPerSet) break;
  }
  return out;
}

/** The laps a finished or edited run is saved with: only laps that have a time. Undefined when none do. */
export function finishLaps(laps: readonly Lap[] | undefined): Lap[] | undefined {
  const out = readLaps(laps).filter((l) => l.sec >= LAP_SEC[0]);
  return out.length > 0 ? out : undefined;
}
