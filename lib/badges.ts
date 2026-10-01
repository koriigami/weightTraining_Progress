import { addDaysStr, lastDayOfMonth, mondayOf, monthKey } from './date';
import type { AppState, BadgeTier, Goal } from './progress';
import { goalStatusAsOf } from './goals';
import { weeklyGoalOf } from './routines';
import { scoreState } from './workoutScoring';
import type { WorkoutScore } from './workoutScoring';

export type BadgeShape = 'shield' | 'hex' | 'circle' | 'diamond' | 'square' | 'star';

export type LifetimeFamilyId =
  | 'pushup-path'
  | 'engine'
  | 'road-runner'
  | 'rider'
  | 'shedding'
  | 'scale-keeper'
  | 'finisher'
  | 'iron-mover'
  | 'record-breaker'
  | 'streak-keeper'
  | 'all-rounder';

export const LIFETIME_FAMILIES: Record<
  LifetimeFamilyId,
  { name: string; metric: string; shape: BadgeShape; icon: string; tiers: number[]; unit: string; dy?: number }
> = {
  'pushup-path': {
    name: 'Pushup Path',
    metric: 'Push-up reps logged',
    shape: 'hex',
    icon: 'chevrons',
    tiers: [100, 500, 1000, 2500, 5000, 10000],
    unit: '',
  },
  engine: { name: 'Engine', metric: 'Workout cardio minutes', shape: 'circle', icon: 'timer', dy: -6, tiers: [60, 300, 600, 1200, 2500, 5000], unit: 'min' },
  'road-runner': {
    name: 'Road Runner',
    metric: 'Run and treadmill km',
    shape: 'circle',
    icon: 'run',
    dy: -4,
    tiers: [10, 50, 100, 250, 500, 1000],
    unit: 'km',
  },
  rider: { name: 'Rider', metric: 'Ride km', shape: 'circle', icon: 'bike', dy: -9, tiers: [25, 100, 250, 500, 1000, 2000], unit: 'km' },
  shedding: { name: 'Shedding', metric: 'Kg lost since you started', shape: 'diamond', icon: 'down', dy: 4, tiers: [1, 3, 5, 7, 10, 15], unit: 'kg' },
  'scale-keeper': {
    name: 'Scale Keeper',
    metric: 'Weigh-ins',
    shape: 'square',
    icon: 'calcheck',
    tiers: [7, 30, 60, 100, 200, 365],
    unit: '',
  },
  // The families below score the workout itself: training days, sets, records, weeks and muscles.
  finisher: { name: 'Finisher', metric: 'Workouts finished', shape: 'shield', icon: 'target', tiers: [1, 10, 25, 50, 100, 250], unit: 'workouts' },
  'iron-mover': { name: 'Iron Mover', metric: 'Sets logged', shape: 'hex', icon: 'dumbbell', tiers: [50, 250, 500, 1000, 2500, 5000], unit: 'sets' },
  'record-breaker': {
    name: 'Record Breaker',
    metric: 'Personal records',
    shape: 'diamond',
    icon: 'trophy',
    dy: 2,
    tiers: [1, 5, 15, 30, 60, 100],
    unit: 'PRs',
  },
  'streak-keeper': {
    name: 'Streak Keeper',
    metric: 'Best weekly streak',
    shape: 'square',
    icon: 'week',
    tiers: [2, 4, 8, 12, 26, 52],
    unit: 'weeks',
  },
  'all-rounder': { name: 'All-Rounder', metric: 'Muscle groups trained', shape: 'circle', icon: 'star', tiers: [3, 6, 9, 12, 14, 16], unit: 'groups' },
};

const TIER_NAMES: BadgeTier[] = ['bronze', 'silver', 'gold', 'diamond', 'master', 'legend'];

type Sample = { date: string; value: number };

function pushupPathSeries(scores: WorkoutScore[]): Sample[] {
  let total = 0;
  return scores.map((s) => {
    total += s.pushupReps;
    return { date: s.date, value: total };
  });
}

function engineSeries(scores: WorkoutScore[]): Sample[] {
  let total = 0;
  return scores.map((s) => {
    total += s.cardioMinutes;
    return { date: s.date, value: Math.round(total) };
  });
}

// Distance from logged workouts, running total, at each workout that added some.
function kmSeries(scores: WorkoutScore[], pick: (s: WorkoutScore) => number): Sample[] {
  let total = 0;
  const out: Sample[] = [];
  for (const s of scores) {
    const km = pick(s);
    if (km <= 0) continue;
    total += km;
    out.push({ date: s.date, value: total });
  }
  return out;
}

// The weight Shedding counts from: the person's own first weigh-in. Measured
// against a fixed number, a first weigh-in of 75 kg would count as 35 kg lost and
// hand out every tier.
function sheddingBaseline(state: AppState, dates: string[]): number {
  return state.weights[dates[0]];
}

function sheddingSeries(state: AppState): Sample[] {
  const dates = Object.keys(state.weights).sort();
  const baseline = sheddingBaseline(state, dates);
  let peak = 0;
  const out: Sample[] = [];
  for (const date of dates) {
    peak = Math.max(peak, baseline - state.weights[date]);
    out.push({ date, value: peak });
  }
  return out;
}

function scaleKeeperSeries(state: AppState): Sample[] {
  const dates = Object.keys(state.weights).sort();
  return dates.map((date, i) => ({ date, value: i + 1 }));
}

// Finisher counts training days: a date that reached 20 minutes, counted once.
function finisherSeries(scores: WorkoutScore[]): Sample[] {
  let total = 0;
  const out: Sample[] = [];
  for (const s of scores) {
    if (!s.trainingDay) continue;
    total++;
    out.push({ date: s.date, value: total });
  }
  return out;
}

function ironMoverSeries(scores: WorkoutScore[]): Sample[] {
  let sets = 0;
  return scores.map((s) => {
    sets += s.sets;
    return { date: s.date, value: sets };
  });
}

function recordBreakerSeries(scores: WorkoutScore[]): Sample[] {
  let total = 0;
  return scores.map((s) => {
    total += s.records;
    return { date: s.date, value: total };
  });
}

// Weeks in a row with a training day. A week with only a short workout does not count.
function streakKeeperSeries(scores: WorkoutScore[]): Sample[] {
  const weeks = new Set<string>();
  let best = 0;
  return scores
    .filter((s) => s.trainingDay)
    .map((s) => {
      const week = mondayOf(s.date);
      weeks.add(week);
      let run = 0;
      for (let cur = week; weeks.has(cur); cur = addDaysStr(cur, -7)) run++;
      best = Math.max(best, run);
      return { date: s.date, value: best };
    });
}

function allRounderSeries(scores: WorkoutScore[]): Sample[] {
  const seen = new Set<string>();
  return scores.map((s) => {
    s.muscles.forEach((m) => seen.add(m));
    return { date: s.date, value: seen.size };
  });
}

const SERIES_BUILDERS: Record<LifetimeFamilyId, (state: AppState, scores: WorkoutScore[]) => Sample[]> = {
  'pushup-path': (_s, w) => pushupPathSeries(w),
  engine: (_s, w) => engineSeries(w),
  'road-runner': (_s, w) => kmSeries(w, (x) => x.runKm),
  rider: (_s, w) => kmSeries(w, (x) => x.rideKm),
  shedding: (s) => sheddingSeries(s),
  'scale-keeper': (s) => scaleKeeperSeries(s),
  finisher: (_s, w) => finisherSeries(w),
  'iron-mover': (_s, w) => ironMoverSeries(w),
  'record-breaker': (_s, w) => recordBreakerSeries(w),
  'streak-keeper': (_s, w) => streakKeeperSeries(w),
  'all-rounder': (_s, w) => allRounderSeries(w),
};

export type EarnedTier = { tier: BadgeTier; earnedAt: string; threshold: number };

export type FamilyProgress = {
  id: LifetimeFamilyId;
  value: number;
  tierIndex: number; // 0..4, how many tiers earned
  earned: EarnedTier[];
  nextThreshold: number | null;
  progressToNext: number | null; // 0..1
};

function familyProgress(id: LifetimeFamilyId, state: AppState, scores: WorkoutScore[]): FamilyProgress {
  const meta = LIFETIME_FAMILIES[id];
  const series = SERIES_BUILDERS[id](state, scores);
  const value = series.length ? series[series.length - 1].value : 0;
  const earned: EarnedTier[] = [];
  meta.tiers.forEach((threshold, i) => {
    const sample = series.find((s) => s.value >= threshold);
    if (sample) earned.push({ tier: TIER_NAMES[i], earnedAt: sample.date, threshold });
  });
  const tierIndex = earned.length;
  const nextThreshold = tierIndex < meta.tiers.length ? meta.tiers[tierIndex] : null;
  const prevThreshold = tierIndex > 0 ? meta.tiers[tierIndex - 1] : 0;
  const progressToNext =
    nextThreshold !== null ? Math.min(1, Math.max(0, (value - prevThreshold) / (nextThreshold - prevThreshold))) : null;
  return { id, value, tierIndex, earned, nextThreshold, progressToNext };
}

// ---------------- Monthly badges ----------------

// The ids of the two distance badges predate the 50 and 100 km targets. They stay
// so badges already earned and seen keep their identity.
export type MonthlyBadgeId = 'month-clear' | 'goal-month' | 'pushup-month' | 'cardio-month' | '20k-walk-run' | '40k-ride' | 'weigh-in-month';

export const MONTHLY_BADGES: Record<MonthlyBadgeId, { name: string; icon?: string; text?: string; rule: string; colorKey: string }> = {
  'month-clear': { name: 'Month Clear', icon: 'week', rule: 'Trained on 25 days', colorKey: 'clear' },
  'goal-month': { name: 'Goal Month', icon: 'target', rule: 'Weekly goal met every week', colorKey: 'goal' },
  'pushup-month': { name: 'Pushup Month', text: '1000', rule: '1,000 push-up reps', colorKey: 'pushup' },
  'cardio-month': { name: 'Cardio Month', text: '600', rule: '600 cardio minutes', colorKey: 'cardio' },
  '20k-walk-run': { name: '50K Walk/Run', text: '50K', rule: '50 km walking or running', colorKey: 'run' },
  '40k-ride': { name: '100K Ride', text: '100K', rule: '100 km riding', colorKey: 'ride' },
  'weigh-in-month': { name: 'Weigh-in Month', icon: 'scale', rule: '20 weigh-ins', colorKey: 'weigh' },
};

export type MonthBadgeInfo = { earned: boolean; earnedAt?: string; value: number; target: number; eligible: boolean };

export type MonthProgress = {
  month: string; // YYYY-MM
  badges: Record<MonthlyBadgeId, MonthBadgeInfo>;
};

// Months with a workout or a weigh-in, and the current one. A month in the
// future is never evaluated.
function monthsToConsider(state: AppState, scores: WorkoutScore[], today: string): string[] {
  const current = monthKey(today);
  const set = new Set<string>([current]);
  for (const s of scores) set.add(monthKey(s.date));
  for (const d of Object.keys(state.weights)) set.add(monthKey(d));
  return Array.from(set)
    .filter((m) => m <= current)
    .sort();
}

// Running total over the month's workouts, and the date it first reached the target.
function runningTotal(scores: WorkoutScore[], target: number, pick: (s: WorkoutScore) => number): { value: number; earnedAt?: string } {
  let running = 0;
  let earnedAt: string | undefined;
  for (const s of scores) {
    running += pick(s);
    if (earnedAt === undefined && running >= target) earnedAt = s.date;
  }
  return { value: running, earnedAt };
}

// Goal Month: every Monday to Sunday week that starts in the month has as many
// training days as the weekly goal, whatever month they fall in. The month is
// earned on the date the last of those weeks reached its goal.
function goalMonth(month: string, allScores: WorkoutScore[], weeklyGoal: number): { value: number; target: number; earnedAt?: string } {
  const first = `${month}-01`;
  const last = lastDayOfMonth(first);
  const weeks: string[] = [];
  for (let monday = mondayOf(first) < first ? addDaysStr(mondayOf(first), 7) : first; monday <= last; monday = addDaysStr(monday, 7)) weeks.push(monday);
  let met = 0;
  let earnedAt: string | undefined;
  for (const monday of weeks) {
    const sunday = addDaysStr(monday, 6);
    const done = allScores.filter((s) => s.trainingDay && s.date >= monday && s.date <= sunday);
    if (done.length < weeklyGoal) continue;
    met++;
    const hit = done[weeklyGoal - 1].date;
    if (earnedAt === undefined || hit > earnedAt) earnedAt = hit;
  }
  return { value: met, target: weeks.length, earnedAt: met === weeks.length && weeks.length > 0 ? earnedAt : undefined };
}

function monthProgress(month: string, state: AppState, allScores: WorkoutScore[]): MonthProgress {
  const scores = allScores.filter((s) => monthKey(s.date) === month);
  const weighInsInMonth = Object.keys(state.weights)
    .filter((d) => monthKey(d) === month)
    .sort();

  const days = scores.filter((s) => s.trainingDay).map((s) => s.date);
  const clearTarget = 25;
  const clear = { value: days.length, earnedAt: days.length >= clearTarget ? days[clearTarget - 1] : undefined };
  const goal = goalMonth(month, allScores, weeklyGoalOf(state));
  const pushup = runningTotal(scores, 1000, (s) => s.pushupReps);
  const cardio = runningTotal(scores, 600, (s) => s.cardioMinutes);
  const run = runningTotal(scores, 50, (s) => s.runKm);
  const ride = runningTotal(scores, 100, (s) => s.rideKm);

  const weighTarget = 20;
  const weighEarnedAt = weighInsInMonth.length >= weighTarget ? weighInsInMonth[weighTarget - 1] : undefined;

  const info = (r: { value: number; earnedAt?: string }, target: number): MonthBadgeInfo => ({
    earned: r.earnedAt !== undefined,
    earnedAt: r.earnedAt,
    value: Math.round(r.value * 10) / 10,
    target,
    eligible: true,
  });

  const badges: Record<MonthlyBadgeId, MonthBadgeInfo> = {
    'month-clear': info(clear, clearTarget),
    'goal-month': info(goal, goal.target),
    'pushup-month': info(pushup, 1000),
    'cardio-month': info(cardio, 600),
    '20k-walk-run': info(run, 50),
    '40k-ride': info(ride, 100),
    'weigh-in-month': { earned: weighInsInMonth.length >= weighTarget, earnedAt: weighEarnedAt, value: weighInsInMonth.length, target: weighTarget, eligible: true },
  };

  return { month, badges };
}

export function computeMonthlyProgress(state: AppState, today: string, scores: WorkoutScore[] = scoreState(state, today)): MonthProgress[] {
  return monthsToConsider(state, scores, today).map((m) => monthProgress(m, state, scores));
}

// ---------------- Special badges ----------------

export type SpecialBadgeId = 'clean-sweep' | 'goal-getter';

export const SPECIAL_BADGES: Record<SpecialBadgeId, { name: string; description: string; icon: string }> = {
  'clean-sweep': { name: 'Clean Sweep', description: 'Finish a routine with every planned set ticked', icon: 'crown' },
  'goal-getter': { name: 'Goal Getter', description: 'First goal achieved', icon: 'target' },
};

// The first day a goal counts as achieved. Goals keep their achievedAt stamp, so
// one whose progress was later edited away still gets the day it was stamped.
function firstGoalAchievedDate(goal: Goal, state: AppState, today: string): string | null {
  const end = goal.deadline < today ? goal.deadline : today;
  let d = goal.start;
  let guard = 0;
  while (d <= end && guard < 400) {
    if (goalStatusAsOf(goal, state, d) === 'achieved') return d;
    d = addDaysStr(d, 1);
    guard++;
  }
  return goal.achievedAt ? goal.achievedAt.slice(0, 10) : null;
}

function computeSpecialBadges(state: AppState, today: string, scores: WorkoutScore[]): Partial<Record<SpecialBadgeId, { earnedAt: string }>> {
  const result: Partial<Record<SpecialBadgeId, { earnedAt: string }>> = {};

  const sweep = scores.find((s) => s.cleanSweep);
  if (sweep) result['clean-sweep'] = { earnedAt: sweep.date };

  let earliest: string | null = null;
  for (const goal of state.goals) {
    const d = firstGoalAchievedDate(goal, state, today);
    if (d && (earliest === null || d < earliest)) earliest = d;
  }
  if (earliest) result['goal-getter'] = { earnedAt: earliest };

  return result;
}

// ---------------- Combined ----------------

export type BadgeState = {
  lifetime: Record<LifetimeFamilyId, FamilyProgress>;
  monthly: MonthProgress[];
  special: Partial<Record<SpecialBadgeId, { earnedAt: string }>>;
};

export function computeBadges(state: AppState, today: string): BadgeState {
  const lifetime = {} as Record<LifetimeFamilyId, FamilyProgress>;
  const scores = scoreState(state, today);
  (Object.keys(LIFETIME_FAMILIES) as LifetimeFamilyId[]).forEach((id) => {
    lifetime[id] = familyProgress(id, state, scores);
  });
  return {
    lifetime,
    monthly: computeMonthlyProgress(state, today, scores),
    special: computeSpecialBadges(state, today, scores),
  };
}

export type EarnedBadgeSummary =
  | { id: string; kind: 'lifetime'; family: LifetimeFamilyId; tier: BadgeTier; earnedAt: string }
  | { id: string; kind: 'monthly'; badge: MonthlyBadgeId; month: string; earnedAt: string }
  | { id: string; kind: 'special'; badge: SpecialBadgeId; earnedAt: string };

// Flat list of every currently-earned badge instance, used for XP totals and
// for diffing against localStorage's "seen" record to drive celebrations.
export function allEarnedBadges(state: AppState, today: string): EarnedBadgeSummary[] {
  const out: EarnedBadgeSummary[] = [];
  const b = computeBadges(state, today);
  (Object.keys(b.lifetime) as LifetimeFamilyId[]).forEach((fam) => {
    b.lifetime[fam].earned.forEach((t) => {
      out.push({ id: `lifetime:${fam}:${t.tier}`, kind: 'lifetime', family: fam, tier: t.tier, earnedAt: t.earnedAt });
    });
  });
  b.monthly.forEach((m) => {
    (Object.keys(m.badges) as MonthlyBadgeId[]).forEach((bid) => {
      const info = m.badges[bid];
      if (info?.earned && info.earnedAt) {
        out.push({ id: `monthly:${m.month}:${bid}`, kind: 'monthly', badge: bid, month: m.month, earnedAt: info.earnedAt });
      }
    });
  });
  (Object.keys(b.special) as SpecialBadgeId[]).forEach((sid) => {
    const info = b.special[sid];
    if (info) out.push({ id: `special:${sid}`, kind: 'special', badge: sid, earnedAt: info.earnedAt });
  });
  return out;
}
