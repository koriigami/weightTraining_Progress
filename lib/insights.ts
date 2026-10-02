// Insights for the owner: group numbers about how people use the app. Pure
// functions. The group numbers name no one and show no set or weight, and any group
// smaller than the minimum is null (the page shows a lock). The minimum is 5 while
// sign-ups are open and 1 while Levl is invite-only, so a small invited group can
// see its own numbers. The one place that names people is the People rows below
// (personRow), for the owner only, and they hold no set, weight or note either.
// No node imports here: the Insights page uses the label helpers in the browser.
import { addDaysStr, daysBetween, mondayOf } from './date';
import { computeProgress, levelForXp } from './progress';
import type { SignupMode } from './signups';
import type { AppState, Rank } from './progress';
import { resolvePrefs } from './routines';
import { scoreState, trainingDays } from './workoutScoring';

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

// ---------------- People (owner only) ----------------

// What /api/insights returns: the group numbers, then the People card. `people` is
// already the count in the group numbers, so the rows are `roster`, sorted (sortRoster).
// `invitedNotJoined` is the invite list and ALLOWED_EMAILS less everyone who has signed in.
export type InsightsResponse = InsightsResult & { roster: PersonRow[]; invitedNotJoined: string[] };

// One row per person for the People card: who they are and how often they train. It
// never holds a set, weight, body weight, note, goal, joint limit or photo, and the
// route sends it to the owner only.
export type PersonRow = {
  name: string;
  email: string;
  joined: string; // YYYY-MM-DD
  setUp: boolean; // finished the first-run setup
  level: number; // the level the person sees in their own app
  rank: Rank;
  lastWorkout: string | null; // YYYY-MM-DD
  daysSince: number | null; // whole days since the last workout, 0 for today
  workouts30: number; // workouts in the last 30 days, today included
  trainingDays7: number; // training days (20 minutes or more) in the last 7 days, today included
  workoutsTotal: number;
};

/** The parts of a profile the People card reads. The photo is not one of them. */
export type RosterProfile = { name?: string; email?: string; createdAt?: string } | null | undefined;

/**
 * One person's row. The 7 and 30 day windows end today and include it. Level and rank
 * come from computeProgress, so they match the app. A workout dated tomorrow (a phone
 * ahead of the server's clock) counts as today for "days since". Someone with no
 * stored prefs predates setup and reads as set up, as in the app (resolvePrefs).
 */
export function personRow(state: AppState, profile: RosterProfile, today: string): PersonRow {
  const scores = scoreState(state, today);
  const { level, rank } = computeProgress(state, today);
  const dates = scores.map((s) => s.date);
  const lastWorkout = dates.reduce<string | null>((m, d) => (m === null || d > m ? d : m), null);
  const from7 = addDaysStr(today, -6);
  const from30 = addDaysStr(today, -29);
  return {
    name: profile?.name ?? '',
    email: profile?.email ?? '',
    joined: profile?.createdAt ? profile.createdAt.slice(0, 10) : (dates[0] ?? today),
    setUp: resolvePrefs(state).onboarded,
    level,
    rank,
    lastWorkout,
    daysSince: lastWorkout === null ? null : Math.max(0, daysBetween(lastWorkout, today)),
    workouts30: dates.filter((d) => d >= from30).length,
    trainingDays7: trainingDays(scores).filter((d) => d >= from7).length,
    workoutsTotal: scores.length,
  };
}

/** Most recent workout first. People with no workout come last, then by name. */
export function sortRoster(rows: readonly PersonRow[]): PersonRow[] {
  return [...rows].sort((a, b) => {
    if (a.lastWorkout !== b.lastWorkout) {
      if (a.lastWorkout === null) return 1;
      if (b.lastWorkout === null) return -1;
      return a.lastWorkout < b.lastWorkout ? 1 : -1;
    }
    return a.name.localeCompare(b.name) || a.email.localeCompare(b.email);
  });
}

// Same form as lib/invites.ts normaliseEmail, which is server only and so not imported here.
const norm = (e: string) => e.trim().toLowerCase();

/** Emails on the invite list or in ALLOWED_EMAILS that nobody has signed in with yet. Normalised, no repeats, sorted. */
export function invitedNotJoined(invites: readonly string[], allowed: readonly string[], joinedEmails: readonly string[]): string[] {
  const joined = new Set(joinedEmails.map(norm));
  return [...new Set([...invites, ...allowed].map(norm).filter((e) => e !== '' && !joined.has(e)))].sort();
}

/** "Today", "Yesterday", "3 days ago", or "No workout yet". */
export function agoLabel(daysSince: number | null): string {
  if (daysSince === null) return 'No workout yet';
  return daysSince <= 0 ? 'Today' : daysSince === 1 ? 'Yesterday' : `${daysSince} days ago`;
}

const count = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** The compact phone line: "Level 6 · D rank · last workout 3 days ago · 2 training days in the last 7 days". */
export function personSummary(row: PersonRow): string {
  const parts = [`Level ${row.level}`, `${row.rank} rank`];
  if (row.daysSince === null) parts.push('no workout yet');
  else parts.push(`last workout ${agoLabel(row.daysSince).toLowerCase()}`, `${count(row.trainingDays7, 'training day', 'training days')} in the last 7 days`);
  return parts.join(' · ');
}
