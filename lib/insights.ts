// Insights for the owner: group numbers about how people use the app. Pure
// functions. Nothing that leaves here names a person or shows a set or a weight,
// and any group of fewer than 5 people is null (the page shows a lock).
import { addDaysStr, daysBetween, mondayOf } from './date';
import { levelForXp } from './progress';
import type { AppState } from './progress';
import { scoreState } from './workoutScoring';

export const MIN_GROUP = 5;
export type InsightsRange = '4w' | '12w' | 'all';
export const RANGES: InsightsRange[] = ['4w', '12w', 'all'];
export const MAX_ALL_WEEKS = 52;

// About how long a strength set takes, as in estimateMinutes. Used only to tell
// strength people from cardio people.
const MINUTES_PER_SET = 2.5;
// Levels that start the D, C and B ranks.
const RANK_LEVELS = { d: 5, c: 10, b: 15 } as const;
type RankKey = keyof typeof RANK_LEVELS;

export type FactWorkout = { date: string; cardioMin: number; strengthSets: number };

// What is kept about one person while the numbers are added up. It never leaves the server.
export type PersonFacts = {
  joined: string; // YYYY-MM-DD
  onboarded: boolean;
  workouts: FactWorkout[]; // scored workouts, oldest first
  rankDates: Record<RankKey, string | null>; // the workout date that crossed the rank's level
};

// Joined = profile createdAt. Ranks come from workout XP alone, replayed in date
// order, so they run a little behind the real level (weigh-ins, badges and goals are not counted).
export function personFacts(state: AppState, createdAt: string | undefined, today: string): PersonFacts {
  const scores = scoreState(state, today);
  const workouts = scores.map((s) => ({ date: s.date, cardioMin: s.cardioMinutes, strengthSets: Math.round(s.parts.sets / 5) }));
  const joined = createdAt ? createdAt.slice(0, 10) : (workouts[0]?.date ?? today);
  const rankDates: PersonFacts['rankDates'] = { d: null, c: null, b: null };
  let xp = 0;
  for (const s of scores) {
    xp += s.xp;
    const level = levelForXp(xp);
    for (const k of Object.keys(RANK_LEVELS) as RankKey[]) {
      if (rankDates[k] === null && level >= RANK_LEVELS[k]) rankDates[k] = s.date;
    }
  }
  return { joined, onboarded: Boolean(state.prefs?.onboarded), workouts, rankDates };
}

export type Bucket = { label: string; people: number | null };
export type RankBucket = { label: string; days: number | null };
export type WeekBar = { monday: string; people: number | null; current: boolean };

export type InsightsResult = {
  range: InsightsRange;
  enough: boolean; // false until 5 people have joined; nothing else is filled then
  people: number | null;
  active: number | null; // people with a workout this week
  activePct: number | null;
  perWeek: number | null; // workouts a week per active person
  daysToD: number | null; // median
  weekly: WeekBar[];
  funnel: Bucket[];
  ranks: RankBucket[];
  pace: Bucket[]; // workouts a week
  mostly: Bucket[];
};

const hide = (n: number): number | null => (n === 0 || n >= MIN_GROUP ? n : null);
const atLeast = (n: number): number | null => (n >= MIN_GROUP ? n : null);

function median(xs: number[]): number | null {
  if (xs.length < MIN_GROUP) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return Math.round(s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2);
}

const weeksBetween = (fromMonday: string, toMonday: string) => Math.round(daysBetween(fromMonday, toMonday) / 7);

export function weeksIn(range: InsightsRange): number | null {
  return range === '4w' ? 4 : range === '12w' ? 12 : null;
}

export function aggregate(people: PersonFacts[], today: string, range: InsightsRange): InsightsResult {
  const empty: InsightsResult = {
    range,
    enough: false,
    people: null,
    active: null,
    activePct: null,
    perWeek: null,
    daysToD: null,
    weekly: [],
    funnel: [],
    ranks: [],
    pace: [],
    mostly: [],
  };
  if (people.length < MIN_GROUP) return empty;

  const nowMonday = mondayOf(today);
  const fixed = weeksIn(range);
  let weeks = fixed ?? 1;
  if (fixed === null) {
    const first = people.flatMap((p) => p.workouts.map((w) => w.date)).sort()[0];
    weeks = Math.min(MAX_ALL_WEEKS, first ? weeksBetween(mondayOf(first), nowMonday) + 1 : 1);
  }
  const start = addDaysStr(nowMonday, -7 * (weeks - 1));
  const inWindow = (p: PersonFacts) => p.workouts.filter((w) => w.date >= start);
  const mondays = Array.from({ length: weeks }, (_, i) => addDaysStr(start, 7 * i));

  const weekOf = people.map((p) => new Set(p.workouts.map((w) => mondayOf(w.date))));
  const weekly: WeekBar[] = mondays.map((m) => ({ monday: m, people: hide(weekOf.filter((s) => s.has(m)).length), current: m === nowMonday }));

  const active = people.map((p, i) => ({ p, w: inWindow(p), i })).filter((x) => x.w.length > 0);
  const activeNow = weekOf.filter((s) => s.has(nowMonday)).length;

  // Workouts a week: the person's workouts in the window over the weeks since their first one in it.
  const rates = active.map(({ w }) => w.length / (weeksBetween(mondayOf(w[0].date), nowMonday) + 1));
  const perWeek = active.length >= MIN_GROUP ? Math.round((rates.reduce((a, b) => a + b, 0) / rates.length) * 10) / 10 : null;
  const paceCount = [0, 0, 0];
  for (const r of rates) paceCount[Math.round(r) <= 2 ? 0 : Math.round(r) <= 4 ? 1 : 2]++;

  const mostlyCount = [0, 0, 0]; // strength, both, cardio
  for (const { w } of active) {
    const cardio = w.reduce((s, x) => s + x.cardioMin, 0);
    const strength = w.reduce((s, x) => s + x.strengthSets, 0) * MINUTES_PER_SET;
    const share = cardio / (cardio + strength || 1);
    mostlyCount[share < 0.25 ? 0 : share > 0.75 ? 2 : 1]++;
  }
  const grouped = (labels: string[], counts: number[]): Bucket[] => labels.map((label, i) => ({ label, people: active.length >= MIN_GROUP ? atLeast(counts[i]) : null }));

  // A week that has not come yet is not counted, so a new person is not "missing" it.
  const activeInWeekN = (n: number) => people.filter((p, i) => weekOf[i].has(addDaysStr(mondayOf(p.joined), 7 * n))).length;
  const funnel: Bucket[] = [
    { label: 'Signed in', people: people.length },
    { label: 'Set up the app', people: atLeast(people.filter((p) => p.onboarded).length) },
    { label: 'First workout', people: atLeast(people.filter((p) => p.workouts.length > 0).length) },
    { label: 'Active in week 2', people: atLeast(activeInWeekN(1)) },
    { label: 'Active in week 4', people: atLeast(activeInWeekN(3)) },
  ];

  // Only people who reached the rank inside the range are counted.
  const rankDays = (k: RankKey) =>
    people.flatMap((p) => {
      const at = p.rankDates[k];
      return at !== null && (fixed === null || at >= start) ? [Math.max(0, daysBetween(p.joined, at))] : [];
    });
  const ranks: RankBucket[] = (Object.keys(RANK_LEVELS) as RankKey[]).map((k) => ({
    label: `${k.toUpperCase()} rank (level ${RANK_LEVELS[k]})`,
    days: median(rankDays(k)),
  }));

  return {
    range,
    enough: true,
    people: people.length,
    active: atLeast(activeNow),
    activePct: activeNow >= MIN_GROUP ? Math.round((activeNow / people.length) * 100) : null,
    perWeek,
    daysToD: ranks[0].days,
    weekly,
    funnel,
    ranks,
    pace: grouped(['1 to 2', '3 to 4', '5 or more'], paceCount),
    mostly: grouped(['Strength', 'Strength and cardio', 'Cardio'], mostlyCount),
  };
}

export function parseRange(v: string | null | undefined): InsightsRange {
  return v === '4w' || v === '12w' || v === 'all' ? v : '12w';
}
