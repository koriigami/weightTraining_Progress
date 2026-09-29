// The exercise library. Every exercise maps to muscle groups, so the library
// can be filtered by equipment and muscle, and so a routine can show which
// muscles it hits. Custom exercises (per user) use the same shape.

export type Muscle =
  | 'chest'
  | 'shoulders'
  | 'triceps'
  | 'biceps'
  | 'forearms'
  | 'upperback'
  | 'lats'
  | 'traps'
  | 'lowerback'
  | 'abs'
  | 'obliques'
  | 'glutes'
  | 'quads'
  | 'hamstrings'
  | 'calves'
  | 'cardio';

export type Equipment =
  | 'bodyweight'
  | 'dumbbell'
  | 'barbell'
  | 'kettlebell'
  | 'band'
  | 'pullup-bar'
  | 'bench'
  | 'machine'
  | 'cable'
  | 'cardio-machine'
  | 'bicycle';

// What a set records. weight_reps: kg and reps. reps: bodyweight reps. time:
// seconds held. distance_time: minutes and km (pace is worked out from them).
// intervals: work and easy minutes.
export type Metric = 'weight_reps' | 'reps' | 'time' | 'distance_time' | 'intervals';

// The "anything to avoid" chips in onboarding. An exercise carrying a tag is
// hidden or flagged when the user avoids it.
export type AvoidTag = 'lunges' | 'burpees' | 'jumping' | 'deadlifts' | 'overhead';

// Joints an exercise loads heavily, for the "go easy on" limits.
export type Joint = 'knees' | 'shoulders' | 'lower-back' | 'wrists' | 'elbows';

export type ExerciseDef = {
  id: string;
  name: string;
  equipment: Equipment;
  primary: Muscle;
  secondary: Muscle[];
  metric: Metric;
  avoidTag?: AvoidTag;
  stresses?: Joint[];
  // Distance cardio only. Feeds the Road Runner (run) and Rider (ride) badges.
  cardioKind?: 'run' | 'ride';
};

export type CustomExercise = ExerciseDef & { custom: true };

export const MUSCLE_ORDER: Muscle[] = [
  'chest',
  'shoulders',
  'triceps',
  'biceps',
  'forearms',
  'upperback',
  'lats',
  'traps',
  'lowerback',
  'abs',
  'obliques',
  'glutes',
  'quads',
  'hamstrings',
  'calves',
  'cardio',
];

export const MUSCLES: Record<Muscle, string> = {
  chest: 'Chest',
  shoulders: 'Shoulders',
  triceps: 'Triceps',
  biceps: 'Biceps',
  forearms: 'Forearms',
  upperback: 'Upper back',
  lats: 'Lats',
  traps: 'Traps',
  lowerback: 'Lower back',
  abs: 'Abs',
  obliques: 'Obliques',
  glutes: 'Glutes',
  quads: 'Quads',
  hamstrings: 'Hamstrings',
  calves: 'Calves',
  cardio: 'Cardio',
};

export const EQUIPMENT_ORDER: Equipment[] = [
  'bodyweight',
  'dumbbell',
  'barbell',
  'kettlebell',
  'band',
  'pullup-bar',
  'bench',
  'machine',
  'cable',
  'cardio-machine',
  'bicycle',
];

export const EQUIPMENT: Record<Equipment, string> = {
  bodyweight: 'None',
  dumbbell: 'Dumbbell',
  barbell: 'Barbell',
  kettlebell: 'Kettlebell',
  band: 'Band',
  'pullup-bar': 'Pull-up bar',
  bench: 'Bench',
  machine: 'Machine',
  cable: 'Cable',
  'cardio-machine': 'Cardio machine',
  bicycle: 'Bicycle',
};

export const AVOID_TAGS: Record<AvoidTag, string> = {
  lunges: 'Lunges',
  burpees: 'Burpees',
  jumping: 'Jumping',
  deadlifts: 'Deadlifts',
  overhead: 'Overhead pressing',
};

export const JOINTS: Record<Joint, string> = {
  knees: 'Knees',
  shoulders: 'Shoulders',
  'lower-back': 'Lower back',
  wrists: 'Wrists',
  elbows: 'Elbows',
};

// Quick picks at the top of the muscle filter. Matching is "works any of these".
export const QUICK_MUSCLE_GROUPS: { id: string; label: string; muscles: Muscle[] }[] = [
  { id: 'push', label: 'Push', muscles: ['chest', 'shoulders', 'triceps'] },
  { id: 'pull', label: 'Pull', muscles: ['upperback', 'lats', 'biceps'] },
  { id: 'legs', label: 'Legs', muscles: ['quads', 'hamstrings', 'glutes', 'calves'] },
  { id: 'core', label: 'Core', muscles: ['abs', 'obliques', 'lowerback'] },
  { id: 'arms', label: 'Arms', muscles: ['biceps', 'triceps', 'forearms'] },
];

type Extra = { avoid?: AvoidTag; stress?: Joint[]; kind?: 'run' | 'ride' };

function ex(
  id: string,
  name: string,
  equipment: Equipment,
  primary: Muscle,
  secondary: Muscle[],
  metric: Metric,
  extra: Extra = {}
): ExerciseDef {
  const def: ExerciseDef = { id, name, equipment, primary, secondary, metric };
  if (extra.avoid) def.avoidTag = extra.avoid;
  if (extra.stress) def.stresses = extra.stress;
  if (extra.kind) def.cardioKind = extra.kind;
  return def;
}

const WR: Metric = 'weight_reps';
const R: Metric = 'reps';
const T: Metric = 'time';
const DT: Metric = 'distance_time';
const IV: Metric = 'intervals';

export const EXERCISES: ExerciseDef[] = [
  // Chest
  ex('db-bench', 'Bench Press (Dumbbell)', 'dumbbell', 'chest', ['triceps', 'shoulders'], WR),
  ex('bb-bench', 'Bench Press (Barbell)', 'barbell', 'chest', ['triceps', 'shoulders'], WR),
  ex('db-floor', 'Floor Press (Dumbbell)', 'dumbbell', 'chest', ['triceps'], WR),
  ex('pushup', 'Push Up', 'bodyweight', 'chest', ['triceps', 'shoulders', 'abs'], R, { stress: ['wrists'] }),
  ex('db-fly', 'Chest Fly (Dumbbell)', 'dumbbell', 'chest', ['shoulders'], WR),
  ex('cable-fly', 'Cable Fly Crossover', 'cable', 'chest', ['shoulders'], WR),
  ex('db-incline', 'Incline Bench Press (Dumbbell)', 'dumbbell', 'chest', ['shoulders', 'triceps'], WR),
  ex('bb-incline', 'Incline Bench Press (Barbell)', 'barbell', 'chest', ['shoulders', 'triceps'], WR),
  ex('mc-chest', 'Chest Press (Machine)', 'machine', 'chest', ['triceps', 'shoulders'], WR),
  ex('pec-deck', 'Pec Deck (Machine)', 'machine', 'chest', ['shoulders'], WR),
  ex('diamond-pushup', 'Diamond Push Up', 'bodyweight', 'chest', ['triceps', 'shoulders'], R, { stress: ['wrists'] }),
  ex('band-chest', 'Chest Press (Band)', 'band', 'chest', ['triceps', 'shoulders'], R),

  // Shoulders
  ex('db-ohp', 'Shoulder Press (Dumbbell)', 'dumbbell', 'shoulders', ['triceps'], WR, { avoid: 'overhead', stress: ['shoulders'] }),
  ex('bb-ohp', 'Overhead Press (Barbell)', 'barbell', 'shoulders', ['triceps', 'traps'], WR, { avoid: 'overhead', stress: ['shoulders'] }),
  ex('db-arnold', 'Arnold Press (Dumbbell)', 'dumbbell', 'shoulders', ['triceps'], WR, { avoid: 'overhead', stress: ['shoulders'] }),
  ex('kb-press', 'Overhead Press (Kettlebell)', 'kettlebell', 'shoulders', ['triceps', 'abs'], WR, { avoid: 'overhead', stress: ['shoulders'] }),
  ex('pike-pushup', 'Pike Push Up', 'bodyweight', 'shoulders', ['triceps', 'chest'], R, { avoid: 'overhead', stress: ['shoulders', 'wrists'] }),
  ex('db-lat', 'Lateral Raise (Dumbbell)', 'dumbbell', 'shoulders', [], WR),
  ex('db-front', 'Front Raise (Dumbbell)', 'dumbbell', 'shoulders', ['chest'], WR),
  ex('db-rear', 'Reverse Fly (Dumbbell)', 'dumbbell', 'shoulders', ['upperback', 'traps'], WR),
  ex('face-pull', 'Face Pull (Cable)', 'cable', 'shoulders', ['upperback', 'traps'], WR),
  ex('band-pull', 'Band Pull Apart', 'band', 'shoulders', ['upperback'], R),

  // Back
  ex('db-row', 'Bent Over Row (Dumbbell)', 'dumbbell', 'upperback', ['lats', 'biceps'], WR, { stress: ['lower-back'] }),
  ex('db-row1', 'Single Arm Row (Dumbbell)', 'dumbbell', 'upperback', ['lats', 'biceps'], WR),
  ex('bb-row', 'Bent Over Row (Barbell)', 'barbell', 'upperback', ['lats', 'biceps', 'lowerback'], WR, { stress: ['lower-back'] }),
  ex('seated-row', 'Seated Row (Cable)', 'cable', 'upperback', ['lats', 'biceps'], WR),
  ex('mc-row', 'Seated Row (Machine)', 'machine', 'upperback', ['lats', 'biceps'], WR),
  ex('band-row', 'Row (Band)', 'band', 'upperback', ['lats', 'biceps'], R),
  ex('inverted-row', 'Inverted Row', 'pullup-bar', 'upperback', ['lats', 'biceps'], R),
  ex('pullup', 'Pull Up', 'pullup-bar', 'lats', ['biceps', 'upperback'], R),
  ex('chinup', 'Chin Up', 'pullup-bar', 'lats', ['biceps', 'upperback'], R),
  ex('hang', 'Dead Hang', 'pullup-bar', 'lats', ['forearms'], T),
  ex('assist-pullup', 'Assisted Pull Up (Machine)', 'machine', 'lats', ['biceps', 'upperback'], WR),
  ex('pulldown', 'Lat Pulldown (Cable)', 'cable', 'lats', ['biceps'], WR),
  ex('db-pullover', 'Pullover (Dumbbell)', 'dumbbell', 'lats', ['chest'], WR),
  ex('db-shrug', 'Shrug (Dumbbell)', 'dumbbell', 'traps', [], WR),
  ex('bb-shrug', 'Shrug (Barbell)', 'barbell', 'traps', ['forearms'], WR),

  // Biceps and forearms
  ex('db-curl', 'Bicep Curl (Dumbbell)', 'dumbbell', 'biceps', ['forearms'], WR),
  ex('db-hammer', 'Hammer Curl (Dumbbell)', 'dumbbell', 'biceps', ['forearms'], WR),
  ex('db-spider', 'Spider Curl (Dumbbell)', 'dumbbell', 'biceps', [], WR),
  ex('db-conc', 'Concentration Curl (Dumbbell)', 'dumbbell', 'biceps', [], WR),
  ex('bb-curl', 'Bicep Curl (Barbell)', 'barbell', 'biceps', ['forearms'], WR),
  ex('cable-curl', 'Bicep Curl (Cable)', 'cable', 'biceps', ['forearms'], WR),
  ex('band-curl', 'Bicep Curl (Band)', 'band', 'biceps', ['forearms'], R),
  ex('wrist-curl', 'Wrist Curl (Dumbbell)', 'dumbbell', 'forearms', [], WR, { stress: ['wrists'] }),
  ex('rev-curl', 'Reverse Curl (Barbell)', 'barbell', 'forearms', ['biceps'], WR),

  // Triceps
  ex('db-ohext', 'Overhead Tricep Extension (Dumbbell)', 'dumbbell', 'triceps', [], WR, { stress: ['elbows'] }),
  ex('db-kick', 'Tricep Kickback (Dumbbell)', 'dumbbell', 'triceps', [], WR),
  ex('pushdown', 'Triceps Pushdown (Cable)', 'cable', 'triceps', [], WR),
  ex('band-pushdown', 'Triceps Pushdown (Band)', 'band', 'triceps', [], R),
  ex('skull', 'Skull Crusher (Barbell)', 'barbell', 'triceps', [], WR, { stress: ['elbows'] }),
  ex('close-bench', 'Close Grip Bench Press (Barbell)', 'barbell', 'triceps', ['chest', 'shoulders'], WR),
  ex('dips', 'Bench Dip', 'bodyweight', 'triceps', ['chest', 'shoulders'], R, { stress: ['shoulders'] }),

  // Legs
  ex('bw-squat', 'Squat (Bodyweight)', 'bodyweight', 'quads', ['glutes'], R, { stress: ['knees'] }),
  ex('sumo-squat', 'Sumo Squat (Bodyweight)', 'bodyweight', 'quads', ['glutes'], R, { stress: ['knees'] }),
  ex('db-goblet', 'Goblet Squat (Dumbbell)', 'dumbbell', 'quads', ['glutes'], WR, { stress: ['knees'] }),
  ex('db-sumo', 'Sumo Squat (Dumbbell)', 'dumbbell', 'quads', ['glutes'], WR, { stress: ['knees'] }),
  ex('kb-goblet', 'Goblet Squat (Kettlebell)', 'kettlebell', 'quads', ['glutes'], WR, { stress: ['knees'] }),
  ex('bb-squat', 'Squat (Barbell)', 'barbell', 'quads', ['glutes', 'lowerback'], WR, { stress: ['knees', 'lower-back'] }),
  ex('legpress', 'Leg Press (Machine)', 'machine', 'quads', ['glutes'], WR, { stress: ['knees'] }),
  ex('legext', 'Leg Extension (Machine)', 'machine', 'quads', [], WR, { stress: ['knees'] }),
  ex('wall-sit', 'Wall Sit', 'bodyweight', 'quads', ['glutes'], T, { stress: ['knees'] }),
  ex('jump-squat', 'Jump Squat', 'bodyweight', 'quads', ['glutes', 'calves'], R, { avoid: 'jumping', stress: ['knees'] }),
  ex('stepup', 'Step Up (Bench)', 'bench', 'quads', ['glutes'], R, { stress: ['knees'] }),
  ex('db-lunge', 'Lunge (Dumbbell)', 'dumbbell', 'quads', ['glutes'], WR, { avoid: 'lunges', stress: ['knees'] }),
  ex('rev-lunge', 'Reverse Lunge', 'bodyweight', 'quads', ['glutes'], R, { avoid: 'lunges', stress: ['knees'] }),
  ex('split-squat', 'Bulgarian Split Squat (Dumbbell)', 'dumbbell', 'quads', ['glutes'], WR, { avoid: 'lunges', stress: ['knees'] }),
  ex('walk-lunge', 'Walking Lunge', 'bodyweight', 'quads', ['glutes'], R, { avoid: 'lunges', stress: ['knees'] }),
  ex('db-rdl', 'Romanian Deadlift (Dumbbell)', 'dumbbell', 'hamstrings', ['glutes', 'lowerback'], WR, { stress: ['lower-back'] }),
  ex('bb-rdl', 'Romanian Deadlift (Barbell)', 'barbell', 'hamstrings', ['glutes', 'lowerback'], WR, { avoid: 'deadlifts', stress: ['lower-back'] }),
  ex('good-morning', 'Good Morning (Barbell)', 'barbell', 'hamstrings', ['glutes', 'lowerback'], WR, { stress: ['lower-back'] }),
  ex('legcurl', 'Leg Curl (Machine)', 'machine', 'hamstrings', [], WR),
  ex('bb-dead', 'Deadlift (Barbell)', 'barbell', 'glutes', ['hamstrings', 'lowerback'], WR, { avoid: 'deadlifts', stress: ['lower-back'] }),
  ex('bridge', 'Glute Bridge', 'bodyweight', 'glutes', ['hamstrings'], R),
  ex('bb-thrust', 'Hip Thrust (Barbell)', 'barbell', 'glutes', ['hamstrings'], WR),
  ex('bench-thrust', 'Hip Thrust (Bench)', 'bench', 'glutes', ['hamstrings'], R),
  ex('kb-swing', 'Kettlebell Swing', 'kettlebell', 'glutes', ['hamstrings', 'lowerback'], WR),
  ex('db-calf', 'Calf Raise (Dumbbell)', 'dumbbell', 'calves', [], WR),
  ex('calf-raise', 'Calf Raise (Bodyweight)', 'bodyweight', 'calves', [], R),

  // Core
  ex('crunch', 'Crunch', 'bodyweight', 'abs', [], R),
  ex('situp', 'Sit Up', 'bodyweight', 'abs', ['obliques'], R),
  ex('bicycle-crunch', 'Bicycle Crunch', 'bodyweight', 'abs', ['obliques'], R),
  ex('legraise', 'Lying Leg Raise', 'bodyweight', 'abs', [], R),
  ex('hanging-raise', 'Hanging Leg Raise', 'pullup-bar', 'abs', ['forearms', 'obliques'], R),
  ex('cable-crunch', 'Cable Crunch', 'cable', 'abs', ['obliques'], WR),
  ex('deadbug', 'Dead Bug', 'bodyweight', 'abs', ['obliques'], R),
  ex('mountain', 'Mountain Climber', 'bodyweight', 'abs', ['shoulders', 'quads'], R),
  ex('plank', 'Plank', 'bodyweight', 'abs', ['obliques'], T),
  ex('twist', 'Russian Twist', 'bodyweight', 'obliques', ['abs'], R),
  ex('side-plank', 'Side Plank', 'bodyweight', 'obliques', ['abs', 'shoulders'], T),
  ex('woodchop', 'Wood Chop (Cable)', 'cable', 'obliques', ['abs', 'shoulders'], WR),
  ex('superman', 'Superman', 'bodyweight', 'lowerback', ['glutes'], R),
  ex('bird-dog', 'Bird Dog', 'bodyweight', 'lowerback', ['glutes', 'abs'], R),
  ex('hyper', 'Back Extension', 'bodyweight', 'lowerback', ['glutes', 'hamstrings'], R, { stress: ['lower-back'] }),
  ex('kb-getup', 'Turkish Get Up (Kettlebell)', 'kettlebell', 'abs', ['shoulders', 'glutes'], WR, { stress: ['shoulders'] }),

  // Cardio
  ex('burpee', 'Burpee', 'bodyweight', 'cardio', ['quads', 'chest'], R, { avoid: 'burpees', stress: ['wrists'] }),
  ex('jumpjack', 'Jumping Jack', 'bodyweight', 'cardio', ['calves'], R, { avoid: 'jumping' }),
  ex('jump-rope', 'Jump Rope', 'bodyweight', 'cardio', ['calves', 'shoulders'], T, { avoid: 'jumping' }),
  ex('high-knees', 'High Knees', 'bodyweight', 'cardio', ['quads', 'abs'], T, { avoid: 'jumping' }),
  ex('treadmill', 'Treadmill', 'cardio-machine', 'cardio', ['quads', 'hamstrings', 'calves'], DT, { kind: 'run' }),
  ex('incline-walk', 'Incline Treadmill Walk', 'cardio-machine', 'cardio', ['calves', 'glutes', 'hamstrings'], DT, { kind: 'run' }),
  ex('bike', 'Stationary Bike', 'cardio-machine', 'cardio', ['quads', 'hamstrings', 'calves'], DT, { kind: 'ride' }),
  ex('elliptical', 'Elliptical', 'cardio-machine', 'cardio', ['quads', 'glutes', 'hamstrings'], DT),
  ex('stairs', 'Stair Climber', 'cardio-machine', 'cardio', ['quads', 'glutes', 'calves'], DT),
  ex('rower', 'Rowing Machine', 'cardio-machine', 'cardio', ['lats', 'quads', 'upperback'], DT),
  ex('run', 'Running', 'bodyweight', 'cardio', ['quads', 'hamstrings', 'calves', 'glutes'], DT, { kind: 'run' }),
  ex('walk', 'Walking', 'bodyweight', 'cardio', ['quads', 'calves'], DT, { kind: 'run' }),
  ex('hike', 'Hiking', 'bodyweight', 'cardio', ['quads', 'glutes', 'calves'], DT, { kind: 'run' }),
  ex('cycle', 'Cycling (Outdoor)', 'bicycle', 'cardio', ['quads', 'hamstrings', 'calves', 'glutes'], DT, { kind: 'ride' }),
  ex('runwalk', 'Run/Walk Intervals', 'bodyweight', 'cardio', ['quads', 'hamstrings', 'calves'], IV),
  ex('run-int', 'Running Intervals', 'bodyweight', 'cardio', ['quads', 'hamstrings', 'calves', 'glutes'], IV),
  ex('bike-int', 'Bike Intervals', 'cardio-machine', 'cardio', ['quads', 'hamstrings', 'calves'], IV),
];

const byId: Record<string, ExerciseDef> = Object.fromEntries(EXERCISES.map((e) => [e.id, e]));

export function exerciseById(id: string): ExerciseDef | undefined {
  return byId[id];
}

export function isCardioExercise(e: ExerciseDef): boolean {
  return e.metric === 'distance_time' || e.metric === 'intervals';
}
