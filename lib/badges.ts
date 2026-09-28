import { plan } from '../data/plan';
import { addDaysStr, mondayOf } from './date';
import {
  START_WEIGHT,
  isDayCleared,
  isPerfectDay,
  isWorkoutDay,
  planDay,
  pushupsInLog,
  workoutDates,
} from './progress';
import type { AppState, BadgeTier, Goal } from './progress';
import { goalStatusAsOf } from './goals';

export type BadgeShape = 'shield' | 'hex' | 'circle' | 'diamond' | 'square' | 'star';

export type LifetimeFamilyId =
  | 'iron-will'
  | 'pushup-path'
  | 'grinder'
  | 'engine'
  | 'road-runner'
  | 'rider'
  | 'shedding'
  | 'scale-keeper';

export const LIFETIME_FAMILIES: Record<
  LifetimeFamilyId,
  { name: string; metric: string; shape: BadgeShape; icon: string; tiers: number[]; unit: string; dy?: number }
> = {
  'iron-will': { name: 'Iron Will', metric: 'Best streak', shape: 'shield', icon: 'flame', tiers: [3, 7, 14, 30, 60, 100], unit: 'days' },
  'pushup-path': {
    name: 'Pushup Path',
    metric: 'Lifetime pushups',
    shape: 'hex',
    icon: 'chevrons',
    tiers: [100, 500, 1000, 2500, 5000, 10000],
    unit: '',
  },
  grinder: { name: 'Grinder', metric: 'Days cleared', shape: 'hex', icon: 'dumbbell', tiers: [5, 15, 30, 60, 120, 200], unit: 'days' },
  engine: { name: 'Engine', metric: 'Cardio minutes', shape: 'circle', icon: 'timer', dy: -6, tiers: [60, 300, 600, 1200, 2500, 5000], unit: 'min' },
  'road-runner': {
    name: 'Road Runner',
    metric: 'Treadmill km',
    shape: 'circle',
    icon: 'run',
    dy: -4,
    tiers: [10, 50, 100, 250, 500, 1000],
    unit: 'km',
  },
  rider: { name: 'Rider', metric: 'Cycle km', shape: 'circle', icon: 'bike', dy: -9, tiers: [25, 100, 250, 500, 1000, 2000], unit: 'km' },
  shedding: { name: 'Shedding', metric: 'Kg lost from 110', shape: 'diamond', icon: 'down', dy: 4, tiers: [1, 3, 5, 7, 10, 15], unit: 'kg' },
  'scale-keeper': {
    name: 'Scale Keeper',
    metric: 'Weigh-ins',
    shape: 'square',
    icon: 'calcheck',
    tiers: [7, 30, 60, 100, 200, 365],
    unit: '',
  },
};

const TIER_NAMES: BadgeTier[] = ['bronze', 'silver', 'gold', 'diamond', 'master', 'legend'];

type Sample = { date: string; value: number };

function ironWillSeries(state: AppState): Sample[] {
  const out: Sample[] = [];
  let running = 0;
  let best = 0;
  for (const date of workoutDates()) {
    const day = planDay(date)!;
    if (isDayCleared(day, state.days[date])) running++;
    else running = 0;
    best = Math.max(best, running);
    out.push({ date, value: best });
  }
  return out;
}

function pushupPathSeries(state: AppState): Sample[] {
  let total = 0;
  const out: Sample[] = [];
  for (const date of workoutDates()) {
    total += pushupsInLog(planDay(date)!, state.days[date]);
    out.push({ date, value: total });
  }
  return out;
}

function grinderSeries(state: AppState): Sample[] {
  let total = 0;
  const out: Sample[] = [];
  for (const date of workoutDates()) {
    if (isDayCleared(planDay(date)!, state.days[date])) total++;
    out.push({ date, value: total });
  }
  return out;
}

function engineSeries(state: AppState): Sample[] {
  let total = 0;
  const out: Sample[] = [];
  for (const date of workoutDates()) {
    const log = state.days[date];
    if (log?.cardio) total += log.cardio.minutes;
    out.push({ date, value: total });
  }
  return out;
}

function modalityKmSeries(state: AppState, modality: 'treadmill' | 'cycle'): Sample[] {
  let total = 0;
  const out: Sample[] = [];
  for (const date of workoutDates()) {
    const day = planDay(date)!;
    const log = state.days[date];
    if (log?.cardio?.km !== undefined && day.cardio?.modality === modality) total += log.cardio.km;
    out.push({ date, value: total });
  }
  return out;
}

function sheddingSeries(state: AppState): Sample[] {
  const dates = Object.keys(state.weights).sort();
  let peak = 0;
  const out: Sample[] = [];
  for (const date of dates) {
    peak = Math.max(peak, START_WEIGHT - state.weights[date]);
    out.push({ date, value: peak });
  }
  return out;
}

function scaleKeeperSeries(state: AppState): Sample[] {
  const dates = Object.keys(state.weights).sort();
  return dates.map((date, i) => ({ date, value: i + 1 }));
}

const SERIES_BUILDERS: Record<LifetimeFamilyId, (state: AppState) => Sample[]> = {
  'iron-will': ironWillSeries,
  'pushup-path': pushupPathSeries,
  grinder: grinderSeries,
  engine: engineSeries,
  'road-runner': (s) => modalityKmSeries(s, 'treadmill'),
  rider: (s) => modalityKmSeries(s, 'cycle'),
  shedding: sheddingSeries,
  'scale-keeper': scaleKeeperSeries,
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

function familyProgress(id: LifetimeFamilyId, state: AppState): FamilyProgress {
  const meta = LIFETIME_FAMILIES[id];
  const series = SERIES_BUILDERS[id](state);
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

export type MonthlyBadgeId =
  | 'month-clear'
  | 'pushup-month'
  | 'cardio-month'
  | '20k-walk-run'
  | '40k-ride'
  | 'perfect-month'
  | 'weigh-in-month';

export const MONTHLY_BADGES: Record<MonthlyBadgeId, { name: string; icon?: string; text?: string; rule: string; colorKey: string }> = {
  'month-clear': { name: 'Month Clear', icon: 'week', rule: '12 days cleared', colorKey: 'clear' },
  'pushup-month': { name: 'Pushup Month', text: '300', rule: '300 pushups', colorKey: 'pushup' },
  'cardio-month': { name: 'Cardio Month', text: '150', rule: '150 cardio minutes', colorKey: 'cardio' },
  '20k-walk-run': { name: '20K Walk/Run', text: '20K', rule: '20 km treadmill', colorKey: 'run' },
  '40k-ride': { name: '40K Ride', text: '40K', rule: '40 km cycle', colorKey: 'ride' },
  'perfect-month': { name: 'Perfect Month', icon: 'crown', rule: 'Every scheduled workout day cleared', colorKey: 'perfect' },
  'weigh-in-month': { name: 'Weigh-in Month', icon: 'scale', rule: '20 weigh-ins', colorKey: 'weigh' },
};

export type MonthBadgeInfo = { earned: boolean; earnedAt?: string; value: number; target: number; eligible: boolean };

export type MonthProgress = {
  month: string; // YYYY-MM
  badges: Record<MonthlyBadgeId, MonthBadgeInfo>;
};

function monthsToConsider(state: AppState): string[] {
  const set = new Set<string>();
  for (const d of plan) set.add(d.date.slice(0, 7));
  for (const d of Object.keys(state.weights)) set.add(d.slice(0, 7));
  for (const d of Object.keys(state.days)) set.add(d.slice(0, 7));
  return Array.from(set).sort();
}

function scheduledWorkoutDaysInMonth(month: string) {
  return plan.filter((d) => isWorkoutDay(d) && d.date.slice(0, 7) === month);
}

function monthProgress(month: string, state: AppState): MonthProgress {
  const scheduled = scheduledWorkoutDaysInMonth(month);
  const weighInsInMonth = Object.keys(state.weights)
    .filter((d) => d.slice(0, 7) === month)
    .sort();

  function runningAt(target: number, kind: 'clear' | 'pushups' | 'cardio' | 'tread' | 'cycle'): { value: number; earnedAt?: string } {
    let running = 0;
    let earnedAt: string | undefined;
    for (const d of scheduled) {
      const log = state.days[d.date];
      if (kind === 'clear') {
        if (isDayCleared(d, log)) running++;
      } else if (kind === 'pushups') {
        running += pushupsInLog(d, log);
      } else if (kind === 'cardio') {
        running += log?.cardio?.minutes ?? 0;
      } else if (kind === 'tread') {
        if (log?.cardio?.km !== undefined && d.cardio?.modality === 'treadmill') running += log.cardio.km;
      } else if (kind === 'cycle') {
        if (log?.cardio?.km !== undefined && d.cardio?.modality === 'cycle') running += log.cardio.km;
      }
      if (earnedAt === undefined && running >= target) earnedAt = d.date;
    }
    return { value: running, earnedAt };
  }

  const clear = runningAt(12, 'clear');
  const pushup = runningAt(300, 'pushups');
  const cardio = runningAt(150, 'cardio');
  const tread = runningAt(20, 'tread');
  const cycle = runningAt(40, 'cycle');

  const perfectEligible = scheduled.length >= 8;
  const clearedCount = clear.value;
  const perfectEarned = perfectEligible && scheduled.length > 0 && clearedCount === scheduled.length;
  const perfectEarnedAt = perfectEarned
    ? scheduled
        .filter((d) => isDayCleared(d, state.days[d.date]))
        .map((d) => d.date)
        .sort()
        .slice(-1)[0]
    : undefined;

  const weighTarget = 20;
  const weighEarnedAt = weighInsInMonth.length >= weighTarget ? weighInsInMonth[weighTarget - 1] : undefined;

  const badges: Record<MonthlyBadgeId, MonthBadgeInfo> = {
    'month-clear': { earned: clear.value >= 12, earnedAt: clear.earnedAt, value: clear.value, target: 12, eligible: true },
    'pushup-month': { earned: pushup.value >= 300, earnedAt: pushup.earnedAt, value: pushup.value, target: 300, eligible: true },
    'cardio-month': { earned: cardio.value >= 150, earnedAt: cardio.earnedAt, value: cardio.value, target: 150, eligible: true },
    '20k-walk-run': { earned: tread.value >= 20, earnedAt: tread.earnedAt, value: tread.value, target: 20, eligible: true },
    '40k-ride': { earned: cycle.value >= 40, earnedAt: cycle.earnedAt, value: cycle.value, target: 40, eligible: true },
    'perfect-month': {
      earned: perfectEarned,
      earnedAt: perfectEarnedAt,
      value: clearedCount,
      target: scheduled.length,
      eligible: perfectEligible,
    },
    'weigh-in-month': { earned: weighInsInMonth.length >= weighTarget, earnedAt: weighEarnedAt, value: weighInsInMonth.length, target: weighTarget, eligible: true },
  };

  return { month, badges };
}

export function computeMonthlyProgress(state: AppState): MonthProgress[] {
  return monthsToConsider(state).map((m) => monthProgress(m, state));
}

// ---------------- Special badges ----------------

export type SpecialBadgeId = 'awakening' | 'perfect-day' | 'full-week' | 'goal-getter' | 'program-complete';

export const SPECIAL_BADGES: Record<SpecialBadgeId, { name: string; description: string; icon: string }> = {
  awakening: { name: 'Awakening', description: 'First day cleared', icon: 'flame' },
  'perfect-day': { name: 'Perfect Day', description: 'Every item ticked', icon: 'star' },
  'full-week': { name: 'Full Week', description: 'A whole week cleared', icon: 'week' },
  'goal-getter': { name: 'Goal Getter', description: 'First goal achieved', icon: 'target' },
  'program-complete': { name: 'Program Complete', description: 'All 6 weeks cleared', icon: 'trophy' },
};

function firstGoalAchievedDate(goal: Goal, state: AppState, today: string): string | null {
  const end = goal.deadline < today ? goal.deadline : today;
  let d = goal.start;
  let guard = 0;
  while (d <= end && guard < 400) {
    if (goalStatusAsOf(goal, state, d) === 'achieved') return d;
    d = addDaysStr(d, 1);
    guard++;
  }
  return null;
}

function computeSpecialBadges(state: AppState, today: string): Partial<Record<SpecialBadgeId, { earnedAt: string }>> {
  const result: Partial<Record<SpecialBadgeId, { earnedAt: string }>> = {};

  for (const date of workoutDates()) {
    if (isDayCleared(planDay(date)!, state.days[date])) {
      result.awakening = { earnedAt: date };
      break;
    }
  }

  for (const date of workoutDates()) {
    if (isPerfectDay(planDay(date)!, state.days[date])) {
      result['perfect-day'] = { earnedAt: date };
      break;
    }
  }

  {
    const mondays = Array.from(new Set(plan.map((d) => mondayOf(d.date)))).sort();
    for (const monday of mondays) {
      const sunday = addDaysStr(monday, 6);
      const weekWorkoutDays = plan.filter((d) => isWorkoutDay(d) && d.date >= monday && d.date <= sunday);
      if (weekWorkoutDays.length === 0) continue;
      if (weekWorkoutDays.every((d) => isDayCleared(d, state.days[d.date]))) {
        result['full-week'] = { earnedAt: weekWorkoutDays.map((d) => d.date).sort().slice(-1)[0] };
        break;
      }
    }
  }

  {
    const all = plan.filter(isWorkoutDay);
    if (all.length > 0 && all.every((d) => isDayCleared(d, state.days[d.date]))) {
      result['program-complete'] = { earnedAt: all.map((d) => d.date).sort().slice(-1)[0] };
    }
  }

  {
    let earliest: string | null = null;
    for (const goal of state.goals) {
      const d = firstGoalAchievedDate(goal, state, today);
      if (d && (earliest === null || d < earliest)) earliest = d;
    }
    if (earliest) result['goal-getter'] = { earnedAt: earliest };
  }

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
  (Object.keys(LIFETIME_FAMILIES) as LifetimeFamilyId[]).forEach((id) => {
    lifetime[id] = familyProgress(id, state);
  });
  return {
    lifetime,
    monthly: computeMonthlyProgress(state),
    special: computeSpecialBadges(state, today),
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
