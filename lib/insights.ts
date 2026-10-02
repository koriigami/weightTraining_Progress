// Insights for the owner: group numbers about how people use the app. Pure
// functions. Nothing that leaves here names a person or shows a set or a weight,
// and any group smaller than the minimum is null (the page shows a lock). The
// minimum is 5 while sign-ups are open and 1 while Levl is invite-only, so a small
// invited group can see its own numbers.
import { addDaysStr, daysBetween, mondayOf } from './date';
import { levelForXp } from './progress';
import type { SignupMode } from './signups';
import type { AppState } from './progress';
import { scoreState } from './workoutScoring';

export const MIN_GROUP = 5; // open sign-ups
export const MIN_GROUP_INVITE = 1; // invite-only

export const minGroupFor = (mode: SignupMode): number => (mode === 'invite' ? MIN_GROUP_INVITE : MIN_GROUP);
export type InsightsRange = '4w' | '12w' | 'all';
export const RANGES: InsightsRange[] = ['4w', '12w', 'all'];
export const MAX_ALL_WEEKS = 52;

// About how long a strength set takes, as in estimateMinutes. Used only to tell
// strength people from cardio people.
const MINUTES_PER_SET = 2.5;
// Levels that start the D, C and B ranks.
const RANK_LEVELS = { d: 5, c: 10, b: 15 } as const;
type RankKey = keyof typeof RANK_LEVELS;

export type FactWorkout = {
  date: string;
  cardioMin: number;
  strengthSets: number;
  trainingDay: boolean; // the workout that made its date a training day
  source: 'live' | 'log'; // a workout saved before the field existed counts as live
  laps: boolean; // a run, walk or ride with laps
};

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
  const byId = new Map((state.workouts ?? []).map((w) => [w.id, w]));
  const workouts: FactWorkout[] = scores.map((s) => {
    const w = byId.get(s.id);
    return {
      date: s.date,
      cardioMin: s.cardioMinutes,
      strengthSets: Math.round(s.parts.sets / 5),
      trainingDay: s.trainingDay,
      source: w?.source === 'log' ? 'log' : 'live',
      laps: Boolean(w?.items.some((it) => it.sets.some((x) => x.done && (x.laps?.length ?? 0) > 0))),
    };
  });
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
export type CountBucket = { label: string; count: number | null };
export type WeekBar = { monday: string; people: number | null; current: boolean };

// Counts about the invite list, worked out on the server. Never the emails.
export type InviteCounts = { invited: number; signedIn: number };

export type InsightsResult = {
  range: InsightsRange;
  min: number; // the smallest group shown: 5 while open, 1 while invite-only
  enough: boolean; // false until `min` people have joined; nothing else is filled then
  people: number | null;
  active: number | null; // people with a workout this week
  activePct: number | null;
  perWeek: number | null; // workouts a week per active person
  daysToD: number | null; // median
  weekly: WeekBar[];
  funnel: Bucket[]; // activation
  lastWorkout: Bucket[]; // everyone, by how long ago their last workout was
  made: CountBucket[]; // workouts in range, by how they were made
  invites: InviteCounts;
  ranks: RankBucket[];
  pace: Bucket[]; // workouts a week
  mostly: Bucket[];
};

const hideBelow = (min: number, n: number): number | null => (n === 0 || n >= min ? n : null);
const atLeastOf = (min: number, n: number): number | null => (min <= 1 || n >= min ? n : null);

function median(xs: number[], min: number): number | null {
  if (xs.length < min) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return Math.round(s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2);
}

const weeksBetween = (fromMonday: string, toMonday: string) => Math.round(daysBetween(fromMonday, toMonday) / 7);

export function weeksIn(range: InsightsRange): number | null {
  return range === '4w' ? 4 : range === '12w' ? 12 : null;
}

export type AggregateOptions = { min?: number; invites?: InviteCounts };

export function aggregate(people: PersonFacts[], today: string, range: InsightsRange, opts: AggregateOptions = {}): InsightsResult {
  const min = opts.min ?? MIN_GROUP;
  const invites = opts.invites ?? { invited: 0, signedIn: 0 };
  const hide = (n: number) => hideBelow(min, n);
  const atLeast = (n: number) => atLeastOf(min, n);
  const empty: InsightsResult = {
    range,
    min,
    enough: false,
    people: null,
    active: null,
    activePct: null,
    perWeek: null,
    daysToD: null,
    weekly: [],
    funnel: [],
    lastWorkout: [],
    made: [],
    invites,
    ranks: [],
    pace: [],
    mostly: [],
  };
  if (people.length < min || people.length === 0) return empty;

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
  const perWeek = active.length >= min ? Math.round((rates.reduce((a, b) => a + b, 0) / rates.length) * 10) / 10 : null;
  const paceCount = [0, 0, 0];
  for (const r of rates) paceCount[Math.round(r) <= 2 ? 0 : Math.round(r) <= 4 ? 1 : 2]++;

  const mostlyCount = [0, 0, 0]; // strength, both, cardio
  for (const { w } of active) {
    const cardio = w.reduce((s, x) => s + x.cardioMin, 0);
    const strength = w.reduce((s, x) => s + x.strengthSets, 0) * MINUTES_PER_SET;
    const share = cardio / (cardio + strength || 1);
    mostlyCount[share < 0.25 ? 0 : share > 0.75 ? 2 : 1]++;
  }
  const grouped = (labels: string[], counts: number[]): Bucket[] => labels.map((label, i) => ({ label, people: active.length >= min ? atLeast(counts[i]) : null }));

  // A week that has not come yet is not counted, so a new person is not "missing" it.
  const activeInWeekN = (n: number) => people.filter((p, i) => weekOf[i].has(addDaysStr(mondayOf(p.joined), 7 * n))).length;
  const funnel: Bucket[] = [
    { label: 'Signed in', people: people.length },
    { label: 'Set up the app', people: atLeast(people.filter((p) => p.onboarded).length) },
    { label: 'First workout', people: atLeast(people.filter((p) => p.workouts.length > 0).length) },
    { label: 'Second training day', people: atLeast(people.filter((p) => p.workouts.filter((w) => w.trainingDay).length >= 2).length) },
    { label: 'Active in week 2', people: atLeast(activeInWeekN(1)) },
  ];

  // Everyone, not just the range: how long ago each person last trained.
  const lastCount = [0, 0, 0, 0, 0]; // today, 1 to 7, 8 to 14, over 14, never
  for (const p of people) {
    const last = p.workouts.reduce<string | null>((m, w) => (m === null || w.date > m ? w.date : m), null);
    const ago = last === null ? null : daysBetween(last, today);
    lastCount[ago === null ? 4 : ago <= 0 ? 0 : ago <= 7 ? 1 : ago <= 14 ? 2 : 3]++;
  }
  const lastWorkout: Bucket[] = ['Today', '1 to 7 days ago', '8 to 14 days ago', 'More than 14 days', 'Never'].map((label, i) => ({ label, people: atLeast(lastCount[i]) }));

  // Workouts in the range, by how they were made. Hidden while fewer than `min` people trained in it.
  const inRange = active.flatMap(({ w }) => w);
  const madeCount = [inRange.filter((w) => w.source === 'live').length, inRange.filter((w) => w.source === 'log').length, inRange.filter((w) => w.laps).length];
  const made: CountBucket[] = ['Started live', 'Logged afterwards', 'Runs with laps'].map((label, i) => ({ label, count: active.length >= min ? madeCount[i] : null }));

  // Only people who reached the rank inside the range are counted.
  const rankDays = (k: RankKey) =>
    people.flatMap((p) => {
      const at = p.rankDates[k];
      return at !== null && (fixed === null || at >= start) ? [Math.max(0, daysBetween(p.joined, at))] : [];
    });
  const ranks: RankBucket[] = (Object.keys(RANK_LEVELS) as RankKey[]).map((k) => ({
    label: `${k.toUpperCase()} rank (level ${RANK_LEVELS[k]})`,
    days: median(rankDays(k), min),
  }));

  return {
    range,
    min,
    enough: true,
    people: people.length,
    active: atLeast(activeNow),
    activePct: activeNow >= min ? Math.round((activeNow / people.length) * 100) : null,
    perWeek,
    daysToD: ranks[0].days,
    weekly,
    funnel,
    lastWorkout,
    made,
    invites,
    ranks,
    pace: grouped(['1 to 2', '3 to 4', '5 or more'], paceCount),
    mostly: grouped(['Strength', 'Strength and cardio', 'Cardio'], mostlyCount),
  };
}

export function parseRange(v: string | null | undefined): InsightsRange {
  return v === '4w' || v === '12w' || v === 'all' ? v : '12w';
}
