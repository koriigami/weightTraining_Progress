// Everything the share card shows, worked out from a workout. Pure: the SVG only
// lays it out. One builder serves the Victory screen and the workout page.
import { isCardioExercise, MUSCLE_ORDER, MUSCLES } from '../data/exercises';
import type { ExerciseDef, Muscle } from '../data/exercises';
import { formatWhen } from './date';
import { feedTiles, workoutSummary } from './feed';
import type { FeedItem } from './feed';
import type { StatsKind } from './liveStats';
import { musclesOfExercises } from './muscles';
import { workoutMuscleSets } from './muscleStats';
import type { MuscleSets } from './muscleStats';
import { RANK_TITLES } from './progress';
import type { Rank } from './progress';
import type { ExerciseLookup, WorkoutLog } from './routines';
import { fmtDistance, fmtNumber } from './units';
import type { DistanceUnit, WeightUnit } from './units';
import { shareText } from './victory';

// ---------------- the title ----------------

// Lilita One advance widths per 1000 em, measured in Chromium (docs/design/share-card/lilita-widths.json).
export const LILITA_WIDTHS: Record<string, number> = {
  '0': 639, '1': 406, '2': 525, '3': 528, '4': 598, '5': 524, '6': 575, '7': 500, '8': 570, '9': 565,
  A: 655, B: 594, C: 561, D: 616, E: 493, F: 472, G: 621, H: 644, I: 429, J: 462, K: 620, L: 435, M: 907,
  N: 648, O: 696, P: 570, Q: 706, R: 590, S: 531, T: 502, U: 628, V: 661, W: 953, X: 683, Y: 615, Z: 563,
  a: 517, b: 520, c: 424, d: 565, e: 486, f: 375, g: 516, h: 501, i: 273, j: 271, k: 531, l: 272, m: 788,
  n: 551, o: 513, p: 555, q: 511, r: 396, s: 450, t: 368, u: 544, v: 521, w: 752, x: 557, y: 537, z: 454,
  ' ': 188, '!': 287, '"': 460, '#': 833, '$': 531, '%': 798, '&': 667, "'": 301,
  '(': 430, ')': 422, '*': 557, '+': 602, ',': 305, '-': 525, '.': 229, '/': 573,
  ':': 277, ';': 277, '<': 484, '=': 580, '>': 450, '?': 584, '@': 867, '[': 385,
  '\\': 587, ']': 385, '^': 687, _: 636, '`': 350, '{': 362, '|': 628, '}': 362,
  '~': 459, '…': 909, '·': 309,
};

const UNKNOWN_WIDTH = 620; // a character the table does not know counts as a wide one

/** How wide a line of Lilita One is at a font size, in card pixels. The 2% is for the outline. */
export function textWidth(s: string, size: number): number {
  return ([...s].reduce((sum, ch) => sum + (LILITA_WIDTHS[ch] ?? UNKNOWN_WIDTH), 0) / 1000) * size * 1.02;
}

/** The title runs from x 236 (right of the shield) to x 1000 on the 1080 px card. */
export const TITLE_MAX = 764;

/**
 * The title on one line, always: the largest size where all of it fits, else at
 * the smallest size cut after the last whole word that fits, plus "…". A first
 * word that is too long is cut letter by letter. No title reads "Workout".
 */
export function fitTitle(title: string, max = TITLE_MAX, steps: readonly number[] = [88, 80, 72, 64]): { size: number; text: string } {
  const t = title.trim().replace(/\s+/g, ' ') || 'Workout';
  for (const size of steps) if (textWidth(t, size) <= max) return { size, text: t };
  const size = steps[steps.length - 1];
  const words = t.split(' ');
  for (let n = words.length - 1; n >= 1; n--) {
    const text = `${words.slice(0, n).join(' ')}…`;
    if (textWidth(text, size) <= max) return { size, text };
  }
  const letters = [...words[0]]; // by code point, so an emoji is never cut in half
  while (letters.length > 1 && textWidth(`${letters.join('')}…`, size) > max) letters.pop();
  return { size, text: `${letters.join('')}…` };
}

/** "levl-push-a-2026-10-10.png": the title as a short lowercase slug, then the day. */
export function shareFileName(title: string, date: string): string {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
    .replace(/-+$/, '');
  return `levl-${slug || 'workout'}-${date.slice(0, 10)}.png`;
}

// ---------------- the muscles ----------------

export type MuscleChip = { muscle: Muscle; label: string; sets: number; setsLabel: string; main: boolean };

/**
 * The three busiest muscles as chips (most sets first, ties in body order), and
 * how many more were worked. `main` is a main muscle of the workout, not an "also works".
 */
export function muscleChips(sets: MuscleSets, primary: readonly Muscle[]): { chips: MuscleChip[]; moreCount: number } {
  const worked = (Object.entries(sets) as [Muscle, number][])
    .filter(([, n]) => n > 0)
    .sort((a, b) => b[1] - a[1] || MUSCLE_ORDER.indexOf(a[0]) - MUSCLE_ORDER.indexOf(b[0]));
  const chips = worked.slice(0, 3).map(([muscle, n]) => ({
    muscle,
    label: MUSCLES[muscle],
    sets: n,
    setsLabel: `${fmtNumber(n)} ${n === 1 ? 'set' : 'sets'}`,
    main: primary.includes(muscle),
  }));
  return { chips, moreCount: worked.length - chips.length };
}

// ---------------- the card ----------------

export type ShareStat = { key: string; label: string; value: string };

export type ShareCard = {
  seedBase: string; // the workout id: the sky seed is `${seedBase}#${roll}`
  title: string; // fits on one line at titleSize, may end in "…"
  titleSize: number;
  fullTitle: string; // what the workout is called
  dateLabel: string;
  kind: StatsKind;
  stats: ShareStat[]; // the plaques, top to bottom
  hero: ShareStat | null; // the big plaque of a cardio card
  xp: number;
  rank: Rank;
  level: number;
  rankTitle: string;
  muscles: { primary: Muscle[]; secondary: Muscle[]; chips: MuscleChip[]; moreCount: number } | null; // null: nothing to light up
  text: string; // the sentence for a share sheet that cannot take a picture
  fileName: string;
};

type Units = { weight: WeightUnit; distance: DistanceUnit };

// The plaques, reusing the feed's tiles. Strength: Sets, Time, Volume. Mixed adds
// Distance. Cardio: a big Distance (or Time with no distance), then Time and Pace
// or Speed. Anything that would read "0 km" or "-" is left out.
function cardStats(item: FeedItem, units: Units): { hero: ShareStat | null; stats: ShareStat[] } {
  const tiles = feedTiles(item, units);
  const get = (key: string): ShareStat | undefined => tiles.find((t) => t.key === key);
  const stats: ShareStat[] = [];
  const add = (t: ShareStat | undefined) => {
    if (t) stats.push(t);
  };
  if (item.kind === 'cardio') {
    if (item.km <= 0) return { hero: get('time') ?? null, stats };
    add(get('time'));
    const rate = get('rate');
    if (rate && rate.value !== '' && rate.value !== '-') stats.push(rate);
    return { hero: get('distance') ?? null, stats };
  }
  add(get('sets'));
  if (item.minutes !== null) add(get('time'));
  if (item.volumeKg !== null && item.volumeKg > 0) add(get('volume'));
  if (item.kind === 'mixed' && item.km > 0) stats.push({ key: 'distance', label: 'Distance', value: fmtDistance(item.km, units.distance) });
  return { hero: null, stats };
}

// The muscles of the ticked, non-cardio exercises. Null when none is worked.
function cardMuscles(workout: WorkoutLog, lookup: ExerciseLookup): ShareCard['muscles'] {
  const done = workout.items.filter((item) => item.sets.some((s) => s.done));
  const defs = done.map((item) => lookup(item.exerciseId)).filter((e): e is ExerciseDef => e !== undefined && !isCardioExercise(e));
  const { primary, secondary } = musclesOfExercises(defs);
  const { chips, moreCount } = muscleChips(workoutMuscleSets(done, lookup), primary);
  return chips.length > 0 ? { primary, secondary, chips, moreCount } : null;
}

export function shareCardData({
  workout,
  lookup,
  units,
  rank,
  level,
  now,
}: {
  workout: WorkoutLog;
  lookup: ExerciseLookup;
  units: Units;
  rank: Rank;
  level: number;
  now?: Date;
}): ShareCard {
  const item = workoutSummary(workout, lookup);
  const { hero, stats } = cardStats(item, units);
  const fit = fitTitle(workout.title);
  const rankTitle = RANK_TITLES[rank];
  // A cardio workout's time is the feed's: the workout's length, else the cardio minutes.
  const minutes = item.kind === 'cardio' && item.minutes === null && item.cardioMinutes > 0 ? Math.round(item.cardioMinutes) : item.minutes;
  const text = shareText(
    {
      title: workout.title.trim() || 'Workout',
      sets: item.sets,
      volumeKg: item.volumeKg ?? 0,
      minutes,
      xp: workout.xp,
      rankTitle,
      kind: item.kind,
      km: item.km,
      rate: stats.find((s) => s.key === 'rate')?.value ?? '',
    },
    units.weight,
    units.distance
  );
  return {
    seedBase: workout.id,
    title: fit.text,
    titleSize: fit.size,
    fullTitle: workout.title,
    dateLabel: formatWhen(workout.when, now),
    kind: item.kind,
    stats,
    hero,
    xp: workout.xp,
    rank,
    level,
    rankTitle,
    muscles: cardMuscles(workout, lookup),
    text,
    fileName: shareFileName(workout.title, workout.date),
  };
}
