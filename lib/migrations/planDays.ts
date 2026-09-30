// The one-time move from the 6-week plan to logged workouts (v8).
//
// Before v8 the app ran a fixed 6-week plan: `state.days` held ticked plan items
// and cardio per date, scored with their own day rules. v8 removes the plan.
// migratePlanDays turns every logged plan day into a WorkoutLog, so the person's
// history stays on the calendar, in the feed and in workout-based badges, and
// drops `days`. This file holds the only remaining copy of the plan data.
import { exerciseById } from '../../data/exercises';
import type { AppState } from '../progress';
import type { LoggedSet, PlanItem, Routine, WorkoutItem, WorkoutLog } from '../routines';
import { rescoreWorkouts } from '../workoutScoring';

type Exercise = {
  name: string;
  sets: number;
  reps: string;
  notes?: string;
};

type DayType =
  | 'push-a'
  | 'push-b'
  | 'pull-a'
  | 'pull-b'
  | 'legs'
  | 'full-body'
  | 'rest'
  | 'pre-start';

type WorkoutDay = {
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

// Monday, Sep 21 2026 is the calendar's first day. The program itself didn't
// actually start until Saturday, Sep 26 (see DAY_ONE and WEEK_LAYOUT below).
const START_DATE = '2026-09-21';
const DAY_ONE = '2026-09-26';

function dateAt(offsetDays: number): string {
  const d = new Date(`${START_DATE}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

// Mon=0 ... Sun=6, per week.
const WEEK_LAYOUT: Record<WeekNumber, DayType[]> = {
  1: ['pre-start', 'pre-start', 'pre-start', 'pre-start', 'pre-start', 'full-body', 'full-body'],
  2: ['full-body', 'full-body', 'rest', 'full-body', 'rest', 'full-body', 'full-body'],
  3: ['push-a', 'pull-a', 'legs', 'rest', 'push-b', 'pull-b', 'full-body'],
  4: ['push-a', 'pull-a', 'legs', 'rest', 'push-b', 'pull-b', 'full-body'],
  5: ['push-a', 'pull-a', 'legs', 'rest', 'push-b', 'pull-b', 'full-body'],
  6: ['push-a', 'pull-a', 'legs', 'rest', 'push-b', 'pull-b', 'full-body'],
};

const TITLES: Record<SessionType, string> = {
  'push-a': 'Push A: Chest Focus',
  'push-b': 'Push B: Shoulder Focus',
  'pull-a': 'Pull A: Back Focus',
  'pull-b': 'Pull B: Biceps Focus',
  legs: 'Legs: Quads, Glutes, Hamstrings',
  'full-body': 'Full Body: Compound Circuit',
};

const WEEK_FOCUS: Record<WeekNumber, string> = {
  1: 'Full-body sessions to build a base. Learn each movement at a comfortable weight.',
  2: 'Still full-body. Core work starts on weekends. Push a little more volume as it gets easier.',
  3: 'Milestone 1. Bump dumbbell weight on lifts that hit 12 reps easily last week.',
  4: 'Add tempo. Slow the lowering phase to about 3 seconds on your main lifts.',
  5: 'Milestone 2. Bump weight again where you can, and add supersets.',
  6: 'Peak week. Highest volume early, then lighter to close the program out.',
};

const REST_FOCUS = 'Recovery day. A light walk or stretch is fine. Aim for 8 hours of sleep tonight.';
const PRE_START_FOCUS = 'This program began on Saturday, September 26.';

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
  if (week === 6) return 'Deload, easy pace';
  if (week === 1 && CARDIO_BY_DOW[dow] === 'cycle') return 'Easing back into cycling, keep it light';
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
        { name: 'Pushups + DB Shoulder Press', sets: 4, reps: '8-10 each', notes: 'Superset, bump weight' },
        { name: 'DB Chest Flyes + DB Tricep Ext.', sets: 4, reps: '8-10 each', notes: 'Superset' },
      ];
    case 6:
      return [
        { name: 'Pushups', sets: 1, reps: 'max reps', notes: 'Benchmark, record your number' },
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
        { name: 'Pushups', sets: 2, reps: '8', notes: 'Light, second push day' },
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
        { name: 'DB Shoulder Press + DB Front Raises', sets: 4, reps: '8-10 each', notes: 'Superset, bump weight' },
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
        { name: 'DB Bent-over Rows + Bicep Curls', sets: 4, reps: '8 each', notes: 'Superset, bump weight' },
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
        { name: 'DB Hammer Curls + Spider Curls', sets: 4, reps: '8 each', notes: 'Superset, bump weight' },
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
        { name: 'DB Goblet Squats + Glute Bridges', sets: 4, reps: '8 / 15', notes: 'Superset, bump weight on squats' },
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
      return [
        { name: 'Bodyweight Squats', sets: 3, reps: '12' },
        { name: 'Pushups', sets: 3, reps: '8-10', notes: 'Knees ok' },
        { name: 'DB Bent-over Rows', sets: 3, reps: '10' },
        { name: 'DB Lateral Raises', sets: 3, reps: '12' },
        { name: 'DB Bicep Curls', sets: 3, reps: '10' },
      ];
    case 2:
      return [
        { name: 'Sumo Squats', sets: 3, reps: '12-15' },
        { name: 'Pushups', sets: 3, reps: '10-12' },
        { name: 'DB Bent-over Rows', sets: 3, reps: '10-12' },
        { name: 'DB Shoulder Press', sets: 3, reps: '10-12' },
        { name: 'DB Bicep Curls', sets: 3, reps: '10-12' },
        { name: 'DB Tricep Overhead Extension', sets: 3, reps: '10' },
      ];
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
        { name: 'DB Rows + DB Shoulder Press', sets: 4, reps: '10 each', notes: 'Superset, bump weight' },
      ];
    case 6:
      return [
        { name: 'Bodyweight Squats', sets: 2, reps: '12', notes: 'Deload, lighter effort, focus on form' },
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
          title: 'Not Started Yet',
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

const plan: WorkoutDay[] = buildPlan();

// ---------------- Migration ----------------

// Names in the plan mapped to library ids. Names that are not here (the week 5
// supersets such as "Pushups + DB Shoulder Press") map to no single exercise and
// are left out of the migrated workouts.
const PLAN_NAME_TO_ID: Record<string, string> = {
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

// The routine title for each kind of session, and the id its seeded routine had.
const SESSION_ROUTINES: Record<SessionType, { id: string; title: string }> = {
  'push-a': { id: 'seed-push-a', title: 'Push A' },
  'pull-a': { id: 'seed-pull-a', title: 'Pull A' },
  legs: { id: 'seed-legs', title: 'Legs' },
  'push-b': { id: 'seed-push-b', title: 'Push B' },
  'pull-b': { id: 'seed-pull-b', title: 'Pull B' },
  'full-body': { id: 'seed-full-body', title: 'Full Body' },
};

// The legacy shape of a day's log. ItemKey is 's0'.. for strength, 'k0'.. for core.
export type LegacyDayLog = {
  items: Record<string, { at: string }>;
  cardio?: { minutes: number; km?: number; at: string };
};

// A saved state that may still carry the plan log. AppState no longer has `days`.
export type LegacyState = AppState & { days?: Record<string, LegacyDayLog> };

/** True when the state still holds plan days to migrate. */
export function hasLegacyDays(state: LegacyState): boolean {
  return Object.keys(state.days ?? {}).length > 0;
}

const dayByDate = new Map(plan.map((d) => [d.date, d]));

/**
 * The day log a pre-v2 completion of `date` stands for: every strength and core
 * item ticked at `at`, and the planned cardio minutes with no distance. Undefined
 * for a date that was not a workout day.
 */
export function completionToDayLog(date: string, at: string): LegacyDayLog | undefined {
  const day = dayByDate.get(date);
  if (!day || day.dayType === 'rest' || day.dayType === 'pre-start') return undefined;
  const items: LegacyDayLog['items'] = {};
  day.strength.forEach((_, i) => {
    items[`s${i}`] = { at };
  });
  (day.core ?? []).forEach((_, i) => {
    items[`k${i}`] = { at };
  });
  return { items, ...(day.cardio ? { cardio: { minutes: day.cardio.minutes, at } } : {}) };
}

// The plan's rep text ('8-10', '10/side', '20 sec') as a target. A range plans
// its top end and '10/side' is 10. Text with no number ('max reps') gives an
// empty result, and that item is left out of the migration.
function parsePlanReps(text: string): { reps?: number; sec?: number } {
  const secs = text.match(/(\d+)\s*sec/i);
  if (secs) return { sec: Number(secs[1]) };
  const nums = text.match(/\d+/g);
  return nums ? { reps: Number(nums[nums.length - 1]) } : {};
}

// A plan day as a workout: the ticked items with the plan's sets and reps and the
// routine's kg, every set done. Returns null when nothing usable was ticked.
//
// Times are fixed so the result never depends on the server's time zone: `when`
// reads 18:00 on the day, startedAt is 18:00 UTC and finishedAt 45 minutes later.
function workoutFromDay(day: WorkoutDay, log: LegacyDayLog, routines: readonly Routine[]): WorkoutLog | null {
  const session = SESSION_ROUTINES[day.dayType as SessionType];
  const routine = routines.find((r) => r.id === session.id);
  const items: WorkoutItem[] = [];
  const planned: PlanItem[] = [];
  const seen = new Set<string>();

  const scheduled = [...day.strength.map((ex, i) => ({ ex, key: `s${i}` })), ...(day.core ?? []).map((ex, i) => ({ ex, key: `k${i}` }))];
  for (const { ex, key } of scheduled) {
    const exerciseId = PLAN_NAME_TO_ID[ex.name];
    const def = exerciseId ? exerciseById(exerciseId) : undefined;
    if (!exerciseId || !def || seen.has(exerciseId)) continue;
    const target = parsePlanReps(ex.reps);
    const usable = def.metric === 'time' ? target.sec !== undefined : target.reps !== undefined;
    if (!usable) continue;
    seen.add(exerciseId);
    planned.push({ exerciseId, sets: ex.sets });
    if (!log.items[key]) continue;

    const routineKg = routine?.items.find((it) => it.exerciseId === exerciseId)?.sets[0]?.kg;
    const set: LoggedSet =
      def.metric === 'time'
        ? { sec: target.sec, done: true }
        : def.metric === 'weight_reps'
          ? { kg: typeof routineKg === 'number' ? routineKg : 0, reps: target.reps, done: true }
          : { reps: target.reps, done: true };
    items.push({ exerciseId, sets: Array.from({ length: ex.sets }, () => ({ ...set })) });
  }

  // Cardio: the plan's block is one set. It is logged when minutes were saved,
  // and keeps its distance only when one was recorded (0 or none means no distance).
  if (day.cardio) {
    const exerciseId = day.cardio.modality === 'treadmill' ? 'treadmill' : 'bike';
    planned.push({ exerciseId, sets: 1 });
    const c = log.cardio;
    if (c && Number.isFinite(c.minutes) && c.minutes > 0) {
      const km = typeof c.km === 'number' && Number.isFinite(c.km) && c.km > 0 ? c.km : undefined;
      items.push({ exerciseId, sets: [{ min: c.minutes, ...(km !== undefined ? { km } : {}), done: true }] });
    }
  }

  if (items.length === 0) return null;
  const routineId = routine ? session.id : undefined;
  return {
    id: `w-plan-${day.date}`,
    date: day.date,
    when: `${day.date}T18:00`,
    title: session.title,
    ...(routineId ? { routineId } : {}),
    startedAt: `${day.date}T18:00:00.000Z`,
    finishedAt: `${day.date}T18:45:00.000Z`,
    items,
    xp: 0,
    plan: planned,
  };
}

/**
 * Turns the plan days in `state.days` into workouts and removes `days`.
 *
 * Every date that was a workout day in the plan and has a ticked item or logged
 * cardio becomes the workout `w-plan-{date}`. A date that already has that
 * workout is skipped, and so is one that has nothing usable, so running it again
 * changes nothing (and once `days` is gone there is nothing to do). Workouts are
 * appended after the existing ones and everything is scored again with
 * rescoreWorkouts. Weigh-ins, goals and routines are untouched: goals already
 * count workouts, so they keep working on the migrated ones.
 */
export function migratePlanDays(state: LegacyState, opts: { today: string }): AppState {
  const { days, ...rest } = state;
  const existing = rest.workouts ?? [];
  const have = new Set(existing.map((w) => w.id));
  const added: WorkoutLog[] = [];
  for (const date of Object.keys(days ?? {}).sort()) {
    if (have.has(`w-plan-${date}`)) continue;
    const day = dayByDate.get(date);
    if (!day || day.dayType === 'rest' || day.dayType === 'pre-start') continue;
    const w = workoutFromDay(day, days![date], rest.routines ?? []);
    if (w) added.push(w);
  }
  if (added.length === 0) return rest;
  return { ...rest, workouts: rescoreWorkouts(rest, [...existing, ...added], opts.today) };
}
