// Routines, logged workouts and preferences. Pure types and helpers, no React.
//
// A routine is one day's worth of exercises: an ordered list of exercises, each
// with planned sets. Frequency (timesPerWeek) is optional and never forces a
// schedule. A workout is what actually got done, set by set.
//
// Units are stored canonically: weight in kg, distance in km. Prefs.units only
// changes how the UI shows and reads numbers.
import { plan } from '../data/plan';
import type { DayType } from '../data/plan';
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

export type LoggedSet = SetPlan & { done: boolean };

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

// A personal record set in one workout: the best set for the exercise beat the
// best set of every earlier workout (heavier, or the same weight for more reps).
export type WorkoutPr = { exerciseId: string; kg: number; reps: number };

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
  prs: WorkoutPr[];
};

export type Prefs = {
  units: { weight: 'kg' | 'lb'; distance: 'km' | 'mi' };
  equipment: { kind: 'gym' | 'home' | 'none'; has: string[]; dumbbellKg: number[] };
  avoid: string[]; // AvoidTag ids
  limits: string[]; // Joint ids
  weeklyGoal: number;
  sound: boolean;
  haptic: boolean;
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
};

export const DEFAULT_WEEKLY_GOAL = 3;

export const WORKOUT_XP = {
  strengthSet: 5,
  cardioMinuteCap: 30,
  cardioDistanceBonus: 10,
  finish: 50,
  pr: 25,
  weeklyGoal: 50,
};

export function defaultPrefs(): Prefs {
  return {
    units: { weight: 'kg', distance: 'km' },
    equipment: { kind: 'home', has: [], dumbbellKg: [] },
    avoid: [],
    limits: [],
    weeklyGoal: DEFAULT_WEEKLY_GOAL,
    sound: true,
    haptic: true,
    onboarded: false,
  };
}

// New users get explicit prefs with onboarded: false (newUserState), so a state
// with no prefs at all is someone who predates onboarding, such as the owner's
// migrated progress. They read as the defaults and count as onboarded, so the
// app never sends them through the first-run flow.
export function resolvePrefs(state: Pick<AppState, 'prefs'>): Prefs {
  return state.prefs ?? { ...defaultPrefs(), onboarded: true };
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

// XP for one ticked set. Strength is a flat 5. Cardio is a minute for a minute,
// capped at 30 a set, plus 10 when a distance is logged. An interval set is its
// work plus easy minutes.
export function setXp(e: ExerciseDef, s: SetPlan): number {
  if (e.metric === 'distance_time') {
    return Math.min(WORKOUT_XP.cardioMinuteCap, Math.round(num(s.min))) + (num(s.km) > 0 ? WORKOUT_XP.cardioDistanceBonus : 0);
  }
  if (e.metric === 'intervals') return Math.round(num(s.on) + num(s.off));
  return WORKOUT_XP.strengthSet;
}

export type WorkoutTotals = {
  sets: number; // ticked sets
  volume: number; // kg lifted, weight_reps only
  xp: number; // set XP only, without finish, PR or weekly bonuses
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

// ---------------- The owner's plan as routines ----------------

// Names in data/plan.ts mapped to library ids.
export const PLAN_NAME_TO_ID: Record<string, string> = {
  Pushups: 'pushup',
  'DB Chest Flyes (floor)': 'db-fly',
  'DB Shoulder Press': 'db-ohp',
  'DB Tricep Overhead Extension': 'db-ohext',
  'DB Lateral Raises': 'db-lat',
  'DB Front Raises': 'db-front',
  'DB Tricep Kickbacks': 'db-kick',
  'DB Bent-over Rows': 'db-row',
  'DB Single-arm Rows': 'db-row1',
  'DB Reverse Flyes': 'db-rear',
  'DB Bicep Curls': 'db-curl',
  'DB Hammer Curls': 'db-hammer',
  'DB Spider Curls': 'db-spider',
  Supermans: 'superman',
  'Bodyweight Squats': 'bw-squat',
  'Sumo Squats': 'sumo-squat',
  'DB Goblet Squats': 'db-goblet',
  'DB Sumo Squats': 'db-sumo',
  'Glute Bridges': 'bridge',
  'Calf Raises': 'db-calf',
  Plank: 'plank',
  Crunches: 'crunch',
};

const SEED_SESSIONS: { dayType: DayType; id: string; title: string }[] = [
  { dayType: 'push-a', id: 'seed-push-a', title: 'Push A' },
  { dayType: 'pull-a', id: 'seed-pull-a', title: 'Pull A' },
  { dayType: 'legs', id: 'seed-legs', title: 'Legs' },
  { dayType: 'push-b', id: 'seed-push-b', title: 'Push B' },
  { dayType: 'pull-b', id: 'seed-pull-b', title: 'Pull B' },
  { dayType: 'full-body', id: 'seed-full-body', title: 'Full Body' },
];

// The plan's rep text ('8-10', '10/side', '20 sec', 'max reps') as a target.
// A range plans for its top end. 'max reps' plans nothing.
function parsePlanReps(text: string): { reps?: number; sec?: number } {
  const secs = text.match(/(\d+)\s*sec/i);
  if (secs) return { sec: Number(secs[1]) };
  const nums = text.match(/\d+/g);
  if (!nums) return {};
  return { reps: Number(nums[nums.length - 1]) };
}

// Starting dumbbell weight when the plan gives none: 10 kg for rows and leg
// work, 5 kg for everything else.
function seedDumbbellKg(e: ExerciseDef): number {
  const heavy = ['upperback', 'lats', 'quads', 'hamstrings', 'glutes', 'calves'];
  return heavy.includes(e.primary) ? 10 : 5;
}

function seedItem(exerciseId: string, count: number, repsText: string, notes: string | undefined): RoutineItem {
  const e = exerciseById(exerciseId)!;
  const target = parsePlanReps(repsText);
  const set: SetPlan = {};
  if (e.metric === 'weight_reps') {
    set.kg = e.equipment === 'dumbbell' ? seedDumbbellKg(e) : 0;
    if (target.reps !== undefined) set.reps = target.reps;
  } else if (e.metric === 'time') {
    if (target.sec !== undefined) set.sec = target.sec;
  } else if (target.reps !== undefined) {
    set.reps = target.reps;
  }
  const noteParts: string[] = [];
  if (notes && !/deload/i.test(notes)) noteParts.push(notes);
  if (/\/side/.test(repsText)) noteParts.push('Per side');
  const item: RoutineItem = { exerciseId, sets: Array.from({ length: count }, () => ({ ...set })) };
  if (noteParts.length) item.notes = noteParts.join('. ');
  return item;
}

// The six sessions of the 6-week plan as routines, using week 6 sets and reps.
// Dumbbell weights are not in the plan, so they start at the defaults above.
export function seedOwnerRoutines(): Routine[] {
  return SEED_SESSIONS.map(({ dayType, id, title }) => {
    const days = plan.filter((d) => d.dayType === dayType && d.weekNumber === 6);
    const day = days[days.length - 1];
    const items: RoutineItem[] = [];
    for (const ex of [...day.strength, ...(day.core ?? [])]) {
      const exerciseId = PLAN_NAME_TO_ID[ex.name];
      if (exerciseId) items.push(seedItem(exerciseId, ex.sets, ex.reps, ex.notes));
    }
    if (day.cardio) {
      items.push({ exerciseId: day.cardio.modality === 'treadmill' ? 'treadmill' : 'bike', sets: [{ min: day.cardio.minutes }] });
    }
    return { id, title, timesPerWeek: 1, items };
  });
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
