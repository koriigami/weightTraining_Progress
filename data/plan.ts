export type Exercise = {
  name: string;
  sets: number;
  reps: string;
  notes?: string;
};

export type DayType =
  | 'push-a'
  | 'push-b'
  | 'pull-a'
  | 'pull-b'
  | 'legs'
  | 'full-body'
  | 'rest'
  | 'pre-start';

export type WorkoutDay = {
  date: string;
  weekNumber: 1 | 2 | 3 | 4 | 5 | 6;
  dayType: DayType;
  title: string;
  strength: Exercise[];
  cardio?: { modality: 'treadmill' | 'cycle'; minutes: number; notes?: string };
  core?: Exercise[];
  focus: string;
};

type WeekNumber = WorkoutDay['weekNumber'];
type SessionType = 'push-a' | 'push-b' | 'pull-a' | 'pull-b' | 'legs' | 'full-body';

// Monday, Sep 21 2026 — the calendar's first day (program starts the next day).
const START_DATE = '2026-09-21';
const DAY_ONE = '2026-09-22';

function dateAt(offsetDays: number): string {
  const d = new Date(`${START_DATE}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

// Mon=0 ... Sun=6, per week.
const WEEK_LAYOUT: Record<WeekNumber, DayType[]> = {
  1: ['pre-start', 'push-a', 'rest', 'pull-a', 'rest', 'legs', 'push-b'],
  2: ['push-a', 'pull-a', 'rest', 'legs', 'rest', 'push-b', 'pull-b'],
  3: ['push-a', 'pull-a', 'legs', 'rest', 'push-b', 'pull-b', 'full-body'],
  4: ['push-a', 'pull-a', 'legs', 'rest', 'push-b', 'pull-b', 'full-body'],
  5: ['push-a', 'pull-a', 'legs', 'rest', 'push-b', 'pull-b', 'full-body'],
  6: ['push-a', 'pull-a', 'legs', 'rest', 'push-b', 'pull-b', 'full-body'],
};

const TITLES: Record<SessionType, string> = {
  'push-a': 'Push A — Chest Focus',
  'push-b': 'Push B — Shoulder Focus',
  'pull-a': 'Pull A — Back Focus',
  'pull-b': 'Pull B — Biceps Focus',
  legs: 'Legs — Quads, Glutes, Hamstrings',
  'full-body': 'Full Body — Compound Circuit',
};

const WEEK_FOCUS: Record<WeekNumber, string> = {
  1: 'Baseline — learn form at a comfortable weight. Cardio eases in lightly.',
  2: 'Core work begins (planks, crunches) on weekends. Bump reps toward the top of your range.',
  3: 'Milestone 1 — bump dumbbell weight on lifts that hit 12 reps easily last week.',
  4: 'Add tempo — a slow 3-second lowering phase on your main lifts.',
  5: 'Milestone 2 — bump weight again where you can, and add supersets.',
  6: 'Peak week — highest volume early, then lighter to close the program out.',
};

const REST_FOCUS = 'Recovery day — a light walk or stretch is fine. Aim for 8 hours of sleep tonight.';
const PRE_START_FOCUS = 'Program starts tomorrow — first workout Tue, Sep 22 (Push A).';

// Day-of-week cardio modality, Mon=0 ... Sun=6.
const CARDIO_BY_DOW: Array<'treadmill' | 'cycle'> = [
  'treadmill', // Mon
  'cycle', // Tue
  'treadmill', // Wed
  'cycle', // Thu
  'cycle', // Fri
  'treadmill', // Sat
  'cycle', // Sun
];

const CARDIO_MINUTES: Record<WeekNumber, number> = {
  1: 10,
  2: 10,
  3: 15,
  4: 15,
  5: 18,
  6: 15,
};

function cardioNotes(week: WeekNumber, dow: number): string | undefined {
  if (week === 6) return 'Deload — easy pace';
  if (week === 1 && CARDIO_BY_DOW[dow] === 'cycle') return 'Easing back into cycling — keep it light';
  return undefined;
}

function pushA(week: WeekNumber): Exercise[] {
  switch (week) {
    case 1:
      return [
        { name: 'Pushups', sets: 3, reps: '8-10', notes: 'From knees if needed' },
        { name: 'DB Chest Flyes (floor)', sets: 3, reps: '12' },
        { name: 'DB Shoulder Press', sets: 3, reps: '10' },
        { name: 'DB Tricep Overhead Extension', sets: 3, reps: '10' },
      ];
    case 2:
      return [
        { name: 'Pushups', sets: 3, reps: '10-12' },
        { name: 'DB Chest Flyes (floor)', sets: 3, reps: '12-15' },
        { name: 'DB Shoulder Press', sets: 3, reps: '10-12' },
        { name: 'DB Tricep Overhead Extension', sets: 3, reps: '10-12' },
      ];
    case 3:
      return [
        { name: 'Pushups', sets: 3, reps: '10-12' },
        { name: 'DB Chest Flyes (floor)', sets: 3, reps: '10-12', notes: 'Bump weight if possible' },
        { name: 'DB Shoulder Press', sets: 3, reps: '8-10', notes: 'Bump weight ~1-2kg' },
        { name: 'DB Tricep Overhead Extension', sets: 3, reps: '8-10', notes: 'Bump weight ~1-2kg' },
      ];
    case 4:
      return [
        { name: 'Pushups', sets: 3, reps: '10-12', notes: '3-sec slow lowering' },
        { name: 'DB Chest Flyes (floor)', sets: 3, reps: '10-12' },
        { name: 'DB Shoulder Press', sets: 3, reps: '8-10', notes: '3-sec slow lowering' },
        { name: 'DB Tricep Overhead Extension', sets: 3, reps: '8-10', notes: '3-sec slow lowering' },
      ];
    case 5:
      return [
        { name: 'Pushups + DB Shoulder Press', sets: 4, reps: '8-10 each', notes: 'Superset — bump weight' },
        { name: 'DB Chest Flyes + DB Tricep Ext.', sets: 4, reps: '8-10 each', notes: 'Superset' },
      ];
    case 6:
      return [
        { name: 'Pushups', sets: 1, reps: 'max reps', notes: 'Benchmark — record your number' },
        { name: 'DB Chest Flyes (floor)', sets: 4, reps: '8-10' },
        { name: 'DB Shoulder Press', sets: 4, reps: '8-10' },
        { name: 'DB Tricep Overhead Extension', sets: 3, reps: '8-10' },
      ];
  }
}

function pushB(week: WeekNumber): Exercise[] {
  switch (week) {
    case 1:
      return [
        { name: 'DB Shoulder Press', sets: 3, reps: '10' },
        { name: 'DB Lateral Raises', sets: 3, reps: '12' },
        { name: 'DB Front Raises', sets: 3, reps: '10' },
        { name: 'DB Tricep Kickbacks', sets: 3, reps: '10' },
        { name: 'Pushups', sets: 2, reps: '8', notes: 'Light — second push day' },
      ];
    case 2:
      return [
        { name: 'DB Shoulder Press', sets: 3, reps: '10-12' },
        { name: 'DB Lateral Raises', sets: 3, reps: '12-15' },
        { name: 'DB Front Raises', sets: 3, reps: '10-12' },
        { name: 'DB Tricep Kickbacks', sets: 3, reps: '10-12' },
        { name: 'Pushups', sets: 2, reps: '10' },
      ];
    case 3:
      return [
        { name: 'DB Shoulder Press', sets: 3, reps: '8-10', notes: 'Bump weight ~1-2kg' },
        { name: 'DB Lateral Raises', sets: 3, reps: '10-12', notes: 'Bump weight if last week was easy' },
        { name: 'DB Front Raises', sets: 3, reps: '10', notes: 'Bump weight ~1-2kg' },
        { name: 'DB Tricep Kickbacks', sets: 3, reps: '8-10', notes: 'Bump weight ~1-2kg' },
        { name: 'Pushups', sets: 2, reps: '10-12' },
      ];
    case 4:
      return [
        { name: 'DB Shoulder Press', sets: 3, reps: '8-10', notes: '3-sec slow lowering' },
        { name: 'DB Lateral Raises', sets: 3, reps: '10-12' },
        { name: 'DB Front Raises', sets: 3, reps: '10' },
        { name: 'DB Tricep Kickbacks', sets: 3, reps: '8-10', notes: '3-sec slow lowering' },
        { name: 'Pushups', sets: 2, reps: '10-12' },
      ];
    case 5:
      return [
        { name: 'DB Shoulder Press + DB Front Raises', sets: 4, reps: '8-10 each', notes: 'Superset — bump weight' },
        { name: 'DB Lateral Raises', sets: 4, reps: '10-12' },
        { name: 'DB Tricep Kickbacks + Pushups', sets: 4, reps: '8-10 each', notes: 'Superset' },
      ];
    case 6:
      return [
        { name: 'DB Shoulder Press', sets: 4, reps: '8-10' },
        { name: 'DB Lateral Raises', sets: 4, reps: '10-12' },
        { name: 'DB Front Raises', sets: 3, reps: '8-10' },
        { name: 'DB Tricep Kickbacks', sets: 3, reps: '8-10' },
        { name: 'Pushups', sets: 2, reps: '10-12' },
      ];
  }
}

function pullA(week: WeekNumber): Exercise[] {
  switch (week) {
    case 1:
      return [
        { name: 'DB Bent-over Rows', sets: 3, reps: '10' },
        { name: 'DB Single-arm Rows', sets: 3, reps: '10/side', notes: 'Brace on a chair' },
        { name: 'DB Reverse Flyes', sets: 3, reps: '12' },
        { name: 'DB Bicep Curls', sets: 3, reps: '10' },
      ];
    case 2:
      return [
        { name: 'DB Bent-over Rows', sets: 3, reps: '10-12' },
        { name: 'DB Single-arm Rows', sets: 3, reps: '10-12/side' },
        { name: 'DB Reverse Flyes', sets: 3, reps: '12-15' },
        { name: 'DB Bicep Curls', sets: 3, reps: '10-12' },
      ];
    case 3:
      return [
        { name: 'DB Bent-over Rows', sets: 3, reps: '8-10', notes: 'Bump weight ~1-2kg' },
        { name: 'DB Single-arm Rows', sets: 3, reps: '8-10/side', notes: 'Bump weight if possible' },
        { name: 'DB Reverse Flyes', sets: 3, reps: '10-12' },
        { name: 'DB Bicep Curls', sets: 3, reps: '8-10', notes: 'Bump weight ~1-2kg' },
      ];
    case 4:
      return [
        { name: 'DB Bent-over Rows', sets: 3, reps: '8-10', notes: '3-sec slow lowering' },
        { name: 'DB Single-arm Rows', sets: 3, reps: '8-10/side', notes: '3-sec slow lowering' },
        { name: 'DB Reverse Flyes', sets: 3, reps: '10-12' },
        { name: 'DB Bicep Curls', sets: 3, reps: '8-10', notes: '3-sec slow lowering' },
      ];
    case 5:
      return [
        { name: 'DB Bent-over Rows + Bicep Curls', sets: 4, reps: '8 each', notes: 'Superset — bump weight' },
        { name: 'DB Single-arm Rows', sets: 4, reps: '8/side' },
        { name: 'DB Reverse Flyes', sets: 4, reps: '10-12' },
      ];
    case 6:
      return [
        { name: 'DB Bent-over Rows', sets: 4, reps: '8-10' },
        { name: 'DB Single-arm Rows', sets: 4, reps: '8-10/side' },
        { name: 'DB Reverse Flyes', sets: 3, reps: '10-12' },
        { name: 'DB Bicep Curls', sets: 3, reps: '8-10' },
      ];
  }
}

function pullB(week: WeekNumber): Exercise[] {
  switch (week) {
    case 1:
    case 2:
      return [
        { name: 'DB Hammer Curls', sets: 3, reps: '10-12' },
        { name: 'DB Spider Curls', sets: 3, reps: '10-12' },
        { name: 'DB Bicep Curls', sets: 3, reps: '10-12' },
        { name: 'DB Reverse Flyes', sets: 3, reps: '12-15' },
        { name: 'Supermans', sets: 3, reps: '12-15' },
      ];
    case 3:
      return [
        { name: 'DB Hammer Curls', sets: 3, reps: '8-10', notes: 'Bump weight ~1-2kg' },
        { name: 'DB Spider Curls', sets: 3, reps: '8-10', notes: 'Bump weight if possible' },
        { name: 'DB Bicep Curls', sets: 3, reps: '8-10' },
        { name: 'DB Reverse Flyes', sets: 3, reps: '10-12' },
        { name: 'Supermans', sets: 3, reps: '15' },
      ];
    case 4:
      return [
        { name: 'DB Hammer Curls', sets: 3, reps: '8-10', notes: '3-sec slow lowering' },
        { name: 'DB Spider Curls', sets: 3, reps: '8-10', notes: '3-sec slow lowering' },
        { name: 'DB Bicep Curls', sets: 3, reps: '8-10' },
        { name: 'DB Reverse Flyes', sets: 3, reps: '10-12' },
        { name: 'Supermans', sets: 3, reps: '15' },
      ];
    case 5:
      return [
        { name: 'DB Hammer Curls + Spider Curls', sets: 4, reps: '8 each', notes: 'Superset — bump weight' },
        { name: 'DB Bicep Curls + DB Reverse Flyes', sets: 4, reps: '8-10 each', notes: 'Superset' },
        { name: 'Supermans', sets: 4, reps: '15' },
      ];
    case 6:
      return [
        { name: 'DB Hammer Curls', sets: 4, reps: '8-10' },
        { name: 'DB Spider Curls', sets: 3, reps: '8-10' },
        { name: 'DB Bicep Curls', sets: 3, reps: '8-10' },
        { name: 'DB Reverse Flyes', sets: 3, reps: '10-12' },
        { name: 'Supermans', sets: 3, reps: '15' },
      ];
  }
}

function legs(week: WeekNumber): Exercise[] {
  switch (week) {
    case 1:
      return [
        { name: 'Bodyweight Squats', sets: 3, reps: '12' },
        { name: 'Sumo Squats', sets: 3, reps: '12' },
        { name: 'DB Goblet Squats', sets: 3, reps: '10' },
        { name: 'Glute Bridges', sets: 3, reps: '12' },
        { name: 'Calf Raises', sets: 3, reps: '15' },
      ];
    case 2:
      return [
        { name: 'Bodyweight Squats', sets: 3, reps: '15' },
        { name: 'Sumo Squats', sets: 3, reps: '15' },
        { name: 'DB Goblet Squats', sets: 3, reps: '10-12' },
        { name: 'Glute Bridges', sets: 3, reps: '15' },
        { name: 'Calf Raises', sets: 3, reps: '15-20' },
      ];
    case 3:
      return [
        { name: 'Sumo Squats', sets: 3, reps: '12-15' },
        { name: 'DB Goblet Squats', sets: 3, reps: '8-10', notes: 'Bump weight ~1-2kg' },
        { name: 'DB Sumo Squats', sets: 3, reps: '8-10', notes: 'Add a dumbbell, bump weight' },
        { name: 'Glute Bridges', sets: 3, reps: '15' },
        { name: 'Calf Raises', sets: 3, reps: '20' },
      ];
    case 4:
      return [
        { name: 'Sumo Squats', sets: 3, reps: '12-15' },
        { name: 'DB Goblet Squats', sets: 3, reps: '8-10', notes: '3-sec slow lowering' },
        { name: 'DB Sumo Squats', sets: 3, reps: '8-10', notes: '3-sec slow lowering' },
        { name: 'Glute Bridges', sets: 3, reps: '15' },
        { name: 'Calf Raises', sets: 3, reps: '20' },
      ];
    case 5:
      return [
        { name: 'DB Goblet Squats + Glute Bridges', sets: 4, reps: '8 / 15', notes: 'Superset — bump weight on squats' },
        { name: 'DB Sumo Squats', sets: 4, reps: '8', notes: 'Bump weight if possible' },
        { name: 'Calf Raises', sets: 4, reps: '20' },
      ];
    case 6:
      return [
        { name: 'DB Goblet Squats', sets: 4, reps: '8-10' },
        { name: 'DB Sumo Squats', sets: 4, reps: '8-10' },
        { name: 'Glute Bridges', sets: 3, reps: '15' },
        { name: 'Calf Raises', sets: 3, reps: '20' },
      ];
  }
}

function fullBody(week: WeekNumber): Exercise[] {
  switch (week) {
    case 1:
    case 2:
    case 3:
      return [
        { name: 'Bodyweight Squats', sets: 3, reps: '15' },
        { name: 'Pushups', sets: 3, reps: '12' },
        { name: 'DB Bent-over Rows', sets: 3, reps: '10/side', notes: 'Bump weight if possible' },
        { name: 'DB Shoulder Press', sets: 3, reps: '10', notes: 'Bump weight if possible' },
      ];
    case 4:
      return [
        { name: 'Bodyweight Squats', sets: 3, reps: '15', notes: '3-sec slow lowering' },
        { name: 'Pushups', sets: 3, reps: '12', notes: '3-sec slow lowering' },
        { name: 'DB Bent-over Rows', sets: 3, reps: '10/side' },
        { name: 'DB Shoulder Press', sets: 3, reps: '10' },
      ];
    case 5:
      return [
        { name: 'Squats + Pushups', sets: 4, reps: '12 / 10', notes: 'Superset circuit' },
        { name: 'DB Rows + DB Shoulder Press', sets: 4, reps: '10 each', notes: 'Superset — bump weight' },
      ];
    case 6:
      return [
        { name: 'Bodyweight Squats', sets: 2, reps: '12', notes: 'Deload — lighter effort, focus on form' },
        { name: 'Pushups', sets: 2, reps: '10' },
        { name: 'DB Bent-over Rows', sets: 2, reps: '10/side' },
        { name: 'DB Shoulder Press', sets: 2, reps: '10' },
      ];
  }
}

const SESSION_BUILDERS: Record<SessionType, (week: WeekNumber) => Exercise[]> = {
  'push-a': pushA,
  'push-b': pushB,
  'pull-a': pullA,
  'pull-b': pullB,
  legs,
  'full-body': fullBody,
};

function coreExercises(week: WeekNumber): Exercise[] | undefined {
  switch (week) {
    case 1:
      return undefined;
    case 2:
      return [
        { name: 'Plank', sets: 2, reps: '20 sec' },
        { name: 'Crunches', sets: 2, reps: '12' },
      ];
    case 3:
      return [
        { name: 'Plank', sets: 2, reps: '30 sec' },
        { name: 'Crunches', sets: 3, reps: '15' },
      ];
    case 4:
      return [
        { name: 'Plank', sets: 3, reps: '30 sec' },
        { name: 'Crunches', sets: 3, reps: '15' },
      ];
    case 5:
      return [
        { name: 'Plank', sets: 3, reps: '40 sec' },
        { name: 'Crunches', sets: 3, reps: '20' },
      ];
    case 6:
      return [
        { name: 'Plank', sets: 2, reps: '30 sec', notes: 'Deload' },
        { name: 'Crunches', sets: 2, reps: '15' },
      ];
  }
}

function isSessionType(dayType: DayType): dayType is SessionType {
  return dayType !== 'rest' && dayType !== 'pre-start';
}

function buildPlan(): WorkoutDay[] {
  const days: WorkoutDay[] = [];

  for (let week = 1; week <= 6; week++) {
    const weekNumber = week as WeekNumber;
    const layout = WEEK_LAYOUT[weekNumber];

    for (let dow = 0; dow < 7; dow++) {
      const offset = (week - 1) * 7 + dow;
      const date = dateAt(offset);
      const dayType = layout[dow];

      if (dayType === 'pre-start') {
        days.push({
          date,
          weekNumber,
          dayType,
          title: 'Program Starts Tomorrow',
          strength: [],
          focus: PRE_START_FOCUS,
        });
        continue;
      }

      if (dayType === 'rest') {
        days.push({
          date,
          weekNumber,
          dayType,
          title: 'Rest Day',
          strength: [],
          focus: REST_FOCUS,
        });
        continue;
      }

      if (!isSessionType(dayType)) continue;

      const isDayOne = date === DAY_ONE;
      const isWeekend = dow === 5 || dow === 6; // Sat, Sun

      days.push({
        date,
        weekNumber,
        dayType,
        title: TITLES[dayType],
        strength: SESSION_BUILDERS[dayType](weekNumber),
        cardio: isDayOne
          ? undefined
          : {
              modality: CARDIO_BY_DOW[dow],
              minutes: CARDIO_MINUTES[weekNumber],
              notes: cardioNotes(weekNumber, dow),
            },
        core: weekNumber >= 2 && isWeekend ? coreExercises(weekNumber) : undefined,
        focus: WEEK_FOCUS[weekNumber],
      });
    }
  }

  return days;
}

export const plan: WorkoutDay[] = buildPlan();
