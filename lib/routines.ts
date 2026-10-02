// Routines, logged workouts and preferences. Pure types and helpers, no React.
//
// A routine is one day's worth of exercises: an ordered list of exercises, each
// with planned sets. Frequency (timesPerWeek) is optional and never forces a
// schedule. A workout is what actually got done, set by set.
//
// Units are stored canonically: weight in kg, distance in km. Prefs.units only
// changes how the UI shows and reads numbers.
import { EXERCISES, EQUIPMENT_ORDER, exerciseById } from '../data/exercises';
import type { CustomExercise, Equipment, ExerciseDef } from '../data/exercises';
import type { AppState } from './progress';

// ---------------- Types ----------------

// One set. Which fields apply depends on the exercise's metric: weight_reps
// uses kg and reps, reps uses reps, time uses sec, distance_time uses min and
// km, intervals uses on and off (work and easy minutes).
export type SetPlan = {
  kg?: number;
  reps?: number;
  sec?: number;
  min?: number;
  km?: number;
  on?: number;
  off?: number;
};

// One lap of a run, walk or ride: its time in whole seconds, and its distance in
// km when the person gave one. A distance_time set may carry laps (see lib/laps.ts).
// The set keeps the run's own total time and distance, so scoring never reads laps.
export type Lap = { sec: number; km?: number };

export type LoggedSet = SetPlan & { done: boolean; laps?: Lap[] };

export type RoutineItem = {
  exerciseId: string;
  notes?: string;
  sets: SetPlan[];
};

export type Routine = {
  id: string;
  title: string;
  notes?: string;
  timesPerWeek?: number;
  items: RoutineItem[];
};

export type WorkoutItem = {
  exerciseId: string;
  notes?: string;
  sets: LoggedSet[];
};

// One exercise of the plan a workout set out to do: the sets it aimed for.
export type PlanItem = { exerciseId: string; sets: number };

// A bonus earned for one exercise in one workout. A record is an all-time best,
// a beat is a better set than last time. The fields that apply depend on the
// exercise's metric, and hold the set that earned it.
export type WorkoutMark = {
  exerciseId: string;
  kind: 'record' | 'beat';
  kg?: number;
  reps?: number;
  sec?: number;
  km?: number;
  min?: number;
};

// Where a workout's XP came from, worked out by rescoreWorkouts. `finish` is the
// key the finish bonus was stored under before rules v3. It now holds the daily
// bonus, so nothing stored needs to move. `comeback` was added in v3: workouts
// scored before then have none, and a missing value reads as 0.
export type XpParts = { sets: number; cardio: number; beat: number; record: number; finish: number; weekly: number; comeback?: number };

export type WorkoutLog = {
  id: string;
  date: string; // YYYY-MM-DD, the day it counts on (edited to log later)
  when: string; // YYYY-MM-DDTHH:mm, local date and time shown to the user
  title: string;
  routineId?: string;
  startedAt: string; // ISO instant
  finishedAt: string; // ISO instant
  items: WorkoutItem[];
  xp: number; // snapshot of what this workout earned, kept in step by rescoreWorkouts
  notes?: string;
  photo?: string; // small string only. Photo storage is planned for a later version
  // How it was made: 'live' is started and finished in the app, 'log' is Log workout
  // afterwards. A workout saved before this existed has none and counts as live.
  source?: 'live' | 'log';
  // What the workout set out to do, taken at Start. Workouts saved before v8 have
  // none: their own items and ticked sets stand in as the plan.
  plan?: PlanItem[];
  // The results below are derived: rescoreWorkouts writes them, and the server
  // ignores whatever the client sends.
  marks?: WorkoutMark[];
  xpParts?: XpParts;
  planComplete?: boolean;
  planMissing?: string[]; // exerciseIds of plan items not done
  prs?: { exerciseId: string; kg: number; reps: number }[]; // stored before v8, read by nothing
};

export type Prefs = {
  units: { weight: 'kg' | 'lb'; distance: 'km' | 'mi' };
  equipment: { kind: 'gym' | 'home' | 'none'; has: string[]; dumbbellKg: number[] };
  avoid: string[]; // AvoidTag ids
  limits: string[]; // Joint ids
  weeklyGoal: number;
  sound: boolean;
  haptic: boolean;
  keepAwake: boolean; // keep the screen on while a workout is running
  prefillLast: boolean; // new sets start with last time's numbers
  onboarded: boolean;
};

export type ExerciseLookup = (id: string) => ExerciseDef | undefined;

// ---------------- Limits and constants ----------------

export const LIMITS = {
  routines: 200,
  workouts: 2000,
  customExercises: 200,
  itemsPerList: 40,
  setsPerItem: 30,
  setsPerWorkout: 300,
  lapsPerSet: 200,
};

export const DEFAULT_WEEKLY_GOAL = 3;

export const WORKOUT_XP = {
  strengthSet: 5,
  cardioMinuteCap: 30,
  cardioDistanceBonus: 10,
  intervalCap: 30,
  beat: 10,
  record: 25,
  weeklyGoal: 50,
  // The daily bonus: once a day, when the day's training adds up to dailyMinutes.
  // A ticked strength set that earns XP counts minutesPerSet minutes, cardio counts
  // its own minutes. The first training day after a whole empty week pays comeback.
  daily: 50,
  dailyMinutes: 20,
  minutesPerSet: 3,
  comeback: 25,
};

// A ticked strength set only earns XP with something behind it: a rep, or a
// five second hold.
export const MIN_SET_SECONDS = 5;

export function defaultPrefs(): Prefs {
  return {
    units: { weight: 'kg', distance: 'km' },
    equipment: { kind: 'home', has: [], dumbbellKg: [] },
    avoid: [],
    limits: [],
    weeklyGoal: DEFAULT_WEEKLY_GOAL,
    sound: true,
    haptic: true,
    keepAwake: true,
    prefillLast: true,
    onboarded: false,
  };
}

// The owner's migrated progress has no stored prefs (it predates onboarding), so
// it reads as the owner's own setup: dumbbells at home and a cardio machine, no
// lunges, three workouts a week. Without this the dumbbell exercises in the
// owner's routines would all show "Needs dumbbell". Nothing is written: the
// first time they save a setting, these become their stored prefs.
export function ownerPrefs(): Prefs {
  return {
    ...defaultPrefs(),
    equipment: { kind: 'home', has: ['dumbbell', 'cardio-machine'], dumbbellKg: [2, 3, 5, 10] },
    avoid: ['lunges'],
    weeklyGoal: 3,
    onboarded: true,
  };
}

// New users get explicit prefs with onboarded: false (newUserState), so a state
// with no prefs at all is someone who predates onboarding, such as the owner's
// migrated progress. They read as the owner's setup and count as onboarded, so
// the app never sends them through the first-run flow.
export function resolvePrefs(state: Pick<AppState, 'prefs'>): Prefs {
  const p = state.prefs;
  if (!p) return ownerPrefs();
  // Prefs saved before v8 have no keepAwake or prefillLast: both default on.
  return { ...p, keepAwake: p.keepAwake ?? true, prefillLast: p.prefillLast ?? true };
}

export function weeklyGoalOf(state: Pick<AppState, 'prefs'>): number {
  const g = state.prefs?.weeklyGoal;
  return typeof g === 'number' && g >= 1 ? g : DEFAULT_WEEKLY_GOAL;
}

// ---------------- Exercise lookup ----------------

// Library exercises first, then the user's own custom ones.
export function makeLookup(custom: CustomExercise[] | undefined): ExerciseLookup {
  if (!custom || custom.length === 0) return exerciseById;
  const map = new Map(custom.map((c) => [c.id, c as ExerciseDef]));
  return (id) => exerciseById(id) ?? map.get(id);
}

export function stateLookup(state: Pick<AppState, 'customExercises'>): ExerciseLookup {
  return makeLookup(state.customExercises);
}

// The library plus the user's custom exercises, for pickers and lists.
export function allExercises(custom: CustomExercise[] | undefined): ExerciseDef[] {
  return custom && custom.length ? [...EXERCISES, ...custom] : EXERCISES;
}

// ---------------- Avoid list and equipment ----------------

export function isAvoided(e: ExerciseDef, prefs: Pick<Prefs, 'avoid' | 'limits'>): boolean {
  if (e.avoidTag && prefs.avoid.includes(e.avoidTag)) return true;
  return Boolean(e.stresses && e.stresses.some((j) => prefs.limits.includes(j)));
}

// Equipment the user has. Gym is everything, none is bodyweight only, and home
// is bodyweight plus what they ticked. It only sets the library's default filter.
export function availableEquipment(prefs: Pick<Prefs, 'equipment'>): Set<Equipment> {
  if (prefs.equipment.kind === 'gym') return new Set(EQUIPMENT_ORDER);
  const set = new Set<Equipment>(['bodyweight']);
  if (prefs.equipment.kind === 'home') {
    for (const key of prefs.equipment.has) {
      if ((EQUIPMENT_ORDER as string[]).includes(key)) set.add(key as Equipment);
    }
  }
  return set;
}

// ---------------- Pace, XP, totals ----------------

const KM_PER_MILE = 1.609344;

// "5:30 /km" from minutes and kilometres, or '' when either is missing.
export function pace(min: number | undefined, km: number | undefined, unit: 'km' | 'mi' = 'km'): string {
  if (!min || !km || min <= 0 || km <= 0) return '';
  const dist = unit === 'mi' ? km / KM_PER_MILE : km;
  const perUnit = min / dist;
  let mm = Math.floor(perUnit);
  let ss = Math.round((perUnit - mm) * 60);
  if (ss === 60) {
    mm++;
    ss = 0;
  }
  return `${mm}:${String(ss).padStart(2, '0')} /${unit}`;
}

const num = (v: number | undefined): number => (typeof v === 'number' && Number.isFinite(v) ? v : 0);

// XP for one ticked set. Strength is a flat 5, but only with a rep (or five
// seconds for a hold). Cardio is a minute for a minute, capped at 30 a set, plus
// 10 when a distance is logged, and needs a minute. An interval set is its work
// plus easy minutes, also capped at 30.
export function setXp(e: ExerciseDef, s: SetPlan): number {
  switch (e.metric) {
    case 'distance_time': {
      const min = num(s.min);
      if (min <= 0) return 0;
      return Math.min(WORKOUT_XP.cardioMinuteCap, Math.round(min)) + (num(s.km) > 0 ? WORKOUT_XP.cardioDistanceBonus : 0);
    }
    case 'intervals':
      return Math.min(WORKOUT_XP.intervalCap, Math.round(num(s.on) + num(s.off)));
    case 'time':
      return num(s.sec) >= MIN_SET_SECONDS ? WORKOUT_XP.strengthSet : 0;
    default:
      return num(s.reps) >= 1 ? WORKOUT_XP.strengthSet : 0;
  }
}

export type WorkoutTotals = {
  sets: number; // ticked sets
  volume: number; // kg lifted, weight_reps only
  xp: number; // set XP only, without beat, record, daily, weekly or comeback bonuses
  exercises: number; // exercises with at least one ticked set
  cardioMinutes: number;
  km: number;
};

export function workoutTotals(items: WorkoutItem[], lookup: ExerciseLookup = exerciseById): WorkoutTotals {
  const t: WorkoutTotals = { sets: 0, volume: 0, xp: 0, exercises: 0, cardioMinutes: 0, km: 0 };
  for (const item of items) {
    const e = lookup(item.exerciseId);
    if (!e) continue;
    let any = false;
    for (const s of item.sets) {
      if (!s.done) continue;
      any = true;
      t.sets++;
      t.xp += setXp(e, s);
      if (e.metric === 'weight_reps') t.volume += num(s.kg) * num(s.reps);
      if (e.metric === 'distance_time') {
        t.cardioMinutes += num(s.min);
        t.km += num(s.km);
      } else if (e.metric === 'intervals') {
        t.cardioMinutes += num(s.on) + num(s.off);
      }
    }
    if (any) t.exercises++;
  }
  return t;
}

// Rough length of a routine in minutes, rounded to 5. Strength sets take about
// two and a half minutes each, cardio takes what it says.
export function estimateMinutes(items: RoutineItem[], lookup: ExerciseLookup = exerciseById): number {
  let m = 0;
  for (const item of items) {
    const e = lookup(item.exerciseId);
    if (e?.metric === 'distance_time') for (const s of item.sets) m += num(s.min);
    else if (e?.metric === 'intervals') for (const s of item.sets) m += num(s.on) + num(s.off);
    else m += item.sets.length * 2.5;
  }
  return Math.max(5, Math.round(m / 5) * 5);
}

// ---------------- Duplicate guard ----------------

// No exercise twice in one routine or workout. Returns the first repeated id.
export function findDuplicateExercise(items: { exerciseId: string }[]): string | null {
  const seen = new Set<string>();
  for (const item of items) {
    if (seen.has(item.exerciseId)) return item.exerciseId;
    seen.add(item.exerciseId);
  }
  return null;
}

export function hasExercise(items: { exerciseId: string }[], exerciseId: string): boolean {
  return items.some((i) => i.exerciseId === exerciseId);
}

// ---------------- Defaults for new sets ----------------

// A blank planned set for an exercise, with only the fields its metric uses.
export function blankSet(e: ExerciseDef): SetPlan {
  switch (e.metric) {
    case 'weight_reps':
      return { kg: 0, reps: 10 };
    case 'reps':
      return { reps: 10 };
    case 'time':
      return { sec: 30 };
    case 'distance_time':
      return { min: 20 };
    case 'intervals':
      return { on: 1, off: 1 };
  }
}

// ---------------- Ready-made routines ----------------

export type StarterGroup = {
  id: string;
  title: string;
  kind: 'strength' | 'running' | 'walking' | 'cycling';
  routines: Routine[];
};

// Starting weight for a strength starter by equipment, before personalizing.
function starterKg(e: ExerciseDef): number | undefined {
  switch (e.equipment) {
    case 'dumbbell':
      return 5;
    case 'barbell':
      return 20;
    case 'cable':
      return 15;
    case 'machine':
      return 30;
    case 'kettlebell':
      return 12;
    default:
      return undefined;
  }
}

function strengthStarter(id: string, title: string, exerciseIds: string[]): Routine {
  const items = exerciseIds.map((exerciseId): RoutineItem => {
    const e = exerciseById(exerciseId)!;
    let set: SetPlan;
    if (e.metric === 'weight_reps') set = { kg: starterKg(e) ?? 0, reps: 10 };
    else if (e.metric === 'time') set = { sec: 40 };
    else if (e.metric === 'distance_time') set = { min: 20 };
    else set = { reps: 10 };
    return { exerciseId, sets: e.metric === 'distance_time' ? [set] : [{ ...set }, { ...set }, { ...set }] };
  });
  return { id, title, items };
}

const rep = (n: number, s: SetPlan): SetPlan[] => Array.from({ length: n }, () => ({ ...s }));

function cardioStarter(id: string, title: string, items: RoutineItem[], notes?: string): Routine {
  return notes ? { id, title, notes, items } : { id, title, items };
}

export const STARTER_GROUPS: StarterGroup[] = [
  {
    id: 'dumbbells',
    title: 'Dumbbells at home',
    kind: 'strength',
    routines: [
      strengthStarter('starter-full-body-a', 'Full Body A', ['db-goblet', 'db-floor', 'db-row', 'db-ohp', 'plank']),
      strengthStarter('starter-full-body-b', 'Full Body B', ['db-rdl', 'pushup', 'db-pullover', 'db-lat', 'twist']),
      strengthStarter('starter-arms-shoulders', 'Arms and Shoulders', ['db-ohp', 'db-lat', 'db-curl', 'db-hammer', 'db-ohext']),
    ],
  },
  {
    id: 'gym',
    title: 'Gym',
    kind: 'strength',
    routines: [
      strengthStarter('starter-gym-push', 'Push', ['bb-bench', 'bb-ohp', 'cable-fly', 'db-lat', 'pushdown']),
      strengthStarter('starter-gym-pull', 'Pull', ['pulldown', 'bb-row', 'face-pull', 'bb-curl']),
      strengthStarter('starter-gym-legs', 'Legs', ['bb-squat', 'legpress', 'legcurl', 'db-calf']),
    ],
  },
  {
    id: 'none',
    title: 'No equipment',
    kind: 'strength',
    routines: [
      strengthStarter('starter-bodyweight', 'Bodyweight Full Body', ['bw-squat', 'pushup', 'bridge', 'plank', 'crunch']),
      strengthStarter('starter-walk-core', 'Walk and Core', ['walk', 'plank', 'legraise']),
    ],
  },
  {
    id: 'running',
    title: 'Running',
    kind: 'running',
    routines: [
      cardioStarter('starter-easy-run', 'Easy Run', [{ exerciseId: 'run', sets: [{ min: 30, km: 5 }] }]),
      cardioStarter(
        'starter-c25k-1',
        'Couch to 5K: Week 1',
        [
          { exerciseId: 'walk', sets: [{ min: 5, km: 0.4 }] },
          { exerciseId: 'runwalk', sets: rep(8, { on: 1, off: 1.5 }) },
        ],
        'Walk 5 min to cool down.'
      ),
      cardioStarter(
        'starter-400m',
        '6 x 400 m Intervals',
        [
          { exerciseId: 'walk', sets: [{ min: 10, km: 1 }] },
          { exerciseId: 'run', sets: rep(6, { min: 2, km: 0.4 }) },
        ],
        'Walk 90 seconds between reps.'
      ),
      cardioStarter('starter-long-run', 'Long Run', [{ exerciseId: 'run', sets: [{ min: 60, km: 10 }] }]),
    ],
  },
  {
    id: 'walking',
    title: 'Walking',
    kind: 'walking',
    routines: [
      cardioStarter('starter-brisk-walk', 'Brisk Walk', [{ exerciseId: 'walk', sets: [{ min: 30, km: 3 }] }]),
      cardioStarter('starter-incline-walk', 'Incline Treadmill Walk', [{ exerciseId: 'incline-walk', sets: [{ min: 25, km: 2 }] }]),
    ],
  },
  {
    id: 'cycling',
    title: 'Cycling',
    kind: 'cycling',
    routines: [
      cardioStarter('starter-zone2', 'Zone 2 Ride', [{ exerciseId: 'cycle', sets: [{ min: 45, km: 18 }] }]),
      cardioStarter('starter-bike-intervals', 'Bike Intervals', [
        { exerciseId: 'bike', sets: [{ min: 10, km: 4 }] },
        { exerciseId: 'bike-int', sets: rep(8, { on: 1, off: 2 }) },
      ]),
    ],
  },
];

export const STARTER_ROUTINES: Routine[] = STARTER_GROUPS.flatMap((g) => g.routines);

// A copy of a routine under a new id, with dumbbell weights set to the middle of
// the dumbbells the user has (when they listed any).
export function instantiateRoutine(source: Routine, id: string, prefs?: Pick<Prefs, 'equipment'>): Routine {
  const copy: Routine = structuredClone(source);
  copy.id = id;
  const dbs = prefs ? [...prefs.equipment.dumbbellKg].sort((a, b) => a - b) : [];
  if (dbs.length === 0) return copy;
  const mid = dbs[Math.floor(dbs.length / 2)];
  for (const item of copy.items) {
    const e = exerciseById(item.exerciseId);
    if (e?.metric === 'weight_reps' && e.equipment === 'dumbbell') for (const s of item.sets) s.kg = mid;
  }
  return copy;
}

// A workout prefilled from a routine: same exercises and planned sets, none ticked.
export function workoutItemsFromRoutine(routine: Routine): WorkoutItem[] {
  return routine.items.map((item) => ({
    exerciseId: item.exerciseId,
    ...(item.notes ? { notes: item.notes } : {}),
    sets: item.sets.map((s) => ({ ...s, done: false })),
  }));
}
