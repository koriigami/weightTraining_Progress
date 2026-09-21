export type Exercise = {
  name: string;
  sets: number;
  reps: string;
  notes?: string;
};

export type DayType = 'push' | 'pull' | 'legs' | 'full-body' | 'cardio-core' | 'rest';

export type WorkoutDay = {
  date: string;
  weekNumber: 1 | 2 | 3 | 4 | 5 | 6;
  dayType: DayType;
  title: string;
  strength: Exercise[];
  cardio?: { modality: 'treadmill' | 'cycle' | 'mixed'; minutes: number; notes?: string };
  core?: Exercise[];
  focus: string;
};

type WeekNumber = WorkoutDay['weekNumber'];

// Monday, Sep 21 2026 — day 1 of the program.
const START_DATE = '2026-09-21';

function dateAt(offsetDays: number): string {
  const d = new Date(`${START_DATE}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

const WEEK_FOCUS: Record<WeekNumber, string> = {
  1: 'Baseline — learn form at a comfortable weight. No cardio until Friday, no core yet.',
  2: 'Introduce core work (planks, crunches) and ease back into cycling.',
  3: 'Milestone 1 — bump dumbbell weight on lifts that hit 12 reps easily last week. Cardio up to 15 min.',
  4: 'Add tempo — a slow 3-second lowering phase on push and pull lifts.',
  5: 'Milestone 2 — bump weight again where you can, and add supersets. Cardio 15–20 min.',
  6: 'Peak week — highest volume, then a lighter Fri/Sat to close the program out.',
};

function pushDay(week: WeekNumber): Exercise[] {
  switch (week) {
    case 1:
      return [
        { name: 'Pushups', sets: 3, reps: '8-10', notes: 'From knees if needed' },
        { name: 'DB Shoulder Press', sets: 3, reps: '10' },
        { name: 'DB Lateral Raises', sets: 3, reps: '12' },
        { name: 'DB Tricep Overhead Extension', sets: 3, reps: '10' },
        { name: 'DB Chest Flyes (floor)', sets: 2, reps: '12' },
      ];
    case 2:
      return [
        { name: 'Pushups', sets: 3, reps: '10-12' },
        { name: 'DB Shoulder Press', sets: 3, reps: '10-12' },
        { name: 'DB Lateral Raises', sets: 3, reps: '12-15' },
        { name: 'DB Tricep Overhead Extension', sets: 3, reps: '10-12' },
        { name: 'DB Chest Flyes (floor)', sets: 3, reps: '12' },
      ];
    case 3:
      return [
        { name: 'Pushups', sets: 3, reps: '10-12' },
        { name: 'DB Shoulder Press', sets: 3, reps: '8-10', notes: 'Bump weight ~1-2kg' },
        { name: 'DB Lateral Raises', sets: 3, reps: '10-12', notes: 'Bump weight if last week was easy' },
        { name: 'DB Tricep Overhead Extension', sets: 3, reps: '8-10', notes: 'Bump weight ~1-2kg' },
        { name: 'DB Chest Flyes (floor)', sets: 3, reps: '10-12' },
      ];
    case 4:
      return [
        { name: 'Pushups', sets: 3, reps: '10-12', notes: '3-sec slow lowering' },
        { name: 'DB Shoulder Press', sets: 3, reps: '8-10', notes: '3-sec slow lowering' },
        { name: 'DB Lateral Raises', sets: 3, reps: '10-12' },
        { name: 'DB Tricep Overhead Extension', sets: 3, reps: '8-10', notes: '3-sec slow lowering' },
        { name: 'DB Chest Flyes (floor)', sets: 3, reps: '10-12' },
      ];
    case 5:
      return [
        { name: 'Pushups + DB Shoulder Press', sets: 4, reps: '8-10 each', notes: 'Superset — no rest between' },
        { name: 'DB Lateral Raises', sets: 4, reps: '10-12', notes: 'Bump weight if possible' },
        { name: 'DB Tricep Ext. + DB Chest Flyes', sets: 4, reps: '8-10 each', notes: 'Superset' },
      ];
    case 6:
      return [
        { name: 'Pushups', sets: 1, reps: 'max reps', notes: 'Benchmark — record your number' },
        { name: 'DB Shoulder Press', sets: 4, reps: '8-10' },
        { name: 'DB Lateral Raises', sets: 4, reps: '10-12' },
        { name: 'DB Tricep Overhead Extension', sets: 3, reps: '8-10' },
        { name: 'DB Chest Flyes (floor)', sets: 3, reps: '10-12' },
      ];
  }
}

function pullDay(week: WeekNumber): Exercise[] {
  switch (week) {
    case 1:
      return [
        { name: 'DB Bent-over Rows', sets: 3, reps: '10' },
        { name: 'DB Single-arm Rows', sets: 3, reps: '10/side', notes: 'Brace on a chair' },
        { name: 'DB Reverse Flyes', sets: 3, reps: '12' },
        { name: 'DB Bicep Curls', sets: 3, reps: '10' },
        { name: 'DB Hammer Curls', sets: 3, reps: '10' },
      ];
    case 2:
      return [
        { name: 'DB Bent-over Rows', sets: 3, reps: '10-12' },
        { name: 'DB Single-arm Rows', sets: 3, reps: '10-12/side' },
        { name: 'DB Reverse Flyes', sets: 3, reps: '12-15' },
        { name: 'DB Bicep Curls', sets: 3, reps: '10-12' },
        { name: 'DB Hammer Curls', sets: 3, reps: '10-12' },
      ];
    case 3:
      return [
        { name: 'DB Bent-over Rows', sets: 3, reps: '8-10', notes: 'Bump weight ~1-2kg' },
        { name: 'DB Single-arm Rows', sets: 3, reps: '8-10/side', notes: 'Bump weight if possible' },
        { name: 'DB Reverse Flyes', sets: 3, reps: '10-12' },
        { name: 'DB Bicep Curls', sets: 3, reps: '8-10', notes: 'Bump weight ~1-2kg' },
        { name: 'DB Spider Curls', sets: 3, reps: '10', notes: 'New — chest supported, strict form' },
      ];
    case 4:
      return [
        { name: 'DB Bent-over Rows', sets: 3, reps: '8-10', notes: '3-sec slow lowering' },
        { name: 'DB Single-arm Rows', sets: 3, reps: '8-10/side', notes: '3-sec slow lowering' },
        { name: 'DB Reverse Flyes', sets: 3, reps: '10-12' },
        { name: 'DB Bicep Curls', sets: 3, reps: '8-10', notes: '3-sec slow lowering' },
        { name: 'DB Spider Curls', sets: 3, reps: '10' },
      ];
    case 5:
      return [
        { name: 'DB Bent-over Rows + Bicep Curls', sets: 4, reps: '8 each', notes: 'Superset — bump weight' },
        { name: 'DB Single-arm Rows', sets: 4, reps: '8/side' },
        { name: 'DB Reverse Flyes', sets: 4, reps: '10-12' },
        { name: 'DB Hammer Curls + Spider Curls', sets: 4, reps: '8 each', notes: 'Superset' },
      ];
    case 6:
      return [
        { name: 'DB Bent-over Rows', sets: 4, reps: '8-10' },
        { name: 'DB Single-arm Rows', sets: 4, reps: '8-10/side' },
        { name: 'DB Reverse Flyes', sets: 3, reps: '10-12' },
        { name: 'DB Bicep Curls', sets: 3, reps: '8-10' },
        { name: 'DB Hammer Curls', sets: 3, reps: '8-10' },
      ];
  }
}

function legsDay(week: WeekNumber): Exercise[] {
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

function fullBodyStrength(week: WeekNumber): Exercise[] {
  switch (week) {
    case 1:
      return [
        { name: 'Bodyweight Squats', sets: 3, reps: '12' },
        { name: 'Pushups', sets: 2, reps: '10' },
        { name: 'DB Bent-over Rows', sets: 3, reps: '10/side' },
        { name: 'DB Shoulder Press', sets: 2, reps: '10' },
      ];
    case 2:
      return [
        { name: 'Bodyweight Squats', sets: 3, reps: '15' },
        { name: 'Pushups', sets: 2, reps: '12' },
        { name: 'DB Bent-over Rows', sets: 3, reps: '12/side' },
        { name: 'DB Shoulder Press', sets: 2, reps: '12' },
      ];
    case 3:
      return [
        { name: 'Bodyweight Squats', sets: 3, reps: '15' },
        { name: 'Pushups', sets: 3, reps: '12' },
        { name: 'DB Bent-over Rows', sets: 3, reps: '10/side', notes: 'Bump weight ~1-2kg' },
        { name: 'DB Shoulder Press', sets: 3, reps: '10', notes: 'Bump weight ~1-2kg' },
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

function fullBodyCardio(week: WeekNumber): WorkoutDay['cardio'] {
  switch (week) {
    case 1:
      return { modality: 'treadmill', minutes: 10, notes: 'Easy walk/light jog' };
    case 2:
      return { modality: 'treadmill', minutes: 12 };
    case 3:
      return { modality: 'treadmill', minutes: 15 };
    case 4:
      return { modality: 'treadmill', minutes: 15 };
    case 5:
      return { modality: 'treadmill', minutes: 18 };
    case 6:
      return { modality: 'treadmill', minutes: 15, notes: 'Deload — easy pace' };
  }
}

function cardioCoreCardio(week: WeekNumber): WorkoutDay['cardio'] {
  switch (week) {
    case 1:
      return { modality: 'treadmill', minutes: 10, notes: 'Easy walk/light jog' };
    case 2:
      return { modality: 'cycle', minutes: 10, notes: 'Easing back into cycling — keep it light' };
    case 3:
      return { modality: 'cycle', minutes: 15 };
    case 4:
      return { modality: 'cycle', minutes: 15, notes: 'Swap for treadmill if you want variety' };
    case 5:
      return { modality: 'cycle', minutes: 18 };
    case 6:
      return { modality: 'cycle', minutes: 15, notes: 'Deload — easy pace' };
  }
}

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

const REST_FOCUS = 'Recovery day — a light walk or stretch is fine. Aim for 8 hours of sleep tonight.';

function buildPlan(): WorkoutDay[] {
  const days: WorkoutDay[] = [];

  for (let week = 1; week <= 6; week++) {
    const weekNumber = week as WeekNumber;

    for (let dow = 0; dow < 7; dow++) {
      const offset = (week - 1) * 7 + dow;
      const date = dateAt(offset);

      switch (dow) {
        case 0: // Monday — Push
          days.push({
            date,
            weekNumber,
            dayType: 'push',
            title: 'Push — Chest, Shoulders, Triceps',
            strength: pushDay(weekNumber),
            focus: WEEK_FOCUS[weekNumber],
          });
          break;
        case 1: // Tuesday — Pull
          days.push({
            date,
            weekNumber,
            dayType: 'pull',
            title: 'Pull — Back, Biceps',
            strength: pullDay(weekNumber),
            focus: WEEK_FOCUS[weekNumber],
          });
          break;
        case 2: // Wednesday — Legs
          days.push({
            date,
            weekNumber,
            dayType: 'legs',
            title: 'Legs — Quads, Glutes, Hamstrings',
            strength: legsDay(weekNumber),
            focus: WEEK_FOCUS[weekNumber],
          });
          break;
        case 3: // Thursday — Rest
          days.push({
            date,
            weekNumber,
            dayType: 'rest',
            title: 'Rest Day',
            strength: [],
            focus: REST_FOCUS,
          });
          break;
        case 4: // Friday — Full body + conditioning
          days.push({
            date,
            weekNumber,
            dayType: 'full-body',
            title: 'Full Body — Compound Circuit + Cardio',
            strength: fullBodyStrength(weekNumber),
            cardio: fullBodyCardio(weekNumber),
            focus: WEEK_FOCUS[weekNumber],
          });
          break;
        case 5: // Saturday — Cardio + core
          days.push({
            date,
            weekNumber,
            dayType: 'cardio-core',
            title: weekNumber === 1 ? 'Cardio' : 'Cardio + Core',
            strength: [],
            cardio: cardioCoreCardio(weekNumber),
            core: coreExercises(weekNumber),
            focus: WEEK_FOCUS[weekNumber],
          });
          break;
        case 6: // Sunday — Rest
          days.push({
            date,
            weekNumber,
            dayType: 'rest',
            title: 'Rest Day',
            strength: [],
            focus: REST_FOCUS,
          });
          break;
      }
    }
  }

  return days;
}

export const plan: WorkoutDay[] = buildPlan();
