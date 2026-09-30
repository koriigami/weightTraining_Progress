// The numbers on the Victory screen: the XP lines a finished workout earned, and
// the text of the Share card. Pure functions.
import { exerciseById } from '../data/exercises';
import { setXp, WORKOUT_XP } from './routines';
import type { ExerciseLookup, WorkoutLog, WorkoutMark } from './routines';
import { fmtDistance, fmtNumber, fmtVolume, fmtWeight } from './units';
import type { DistanceUnit, WeightUnit } from './units';
import type { WorkoutScore } from './workoutScoring';

export type XpLine = { key: string; title: string; xp: number; sub?: string };

const num = (v: number | undefined): number => (typeof v === 'number' && Number.isFinite(v) ? v : 0);

// The set a mark was earned with, in words: "7.5 kg × 8", "12 reps", "45 s", "3 km in 20 min".
export function markText(mark: WorkoutMark, weight: WeightUnit = 'kg', distance: DistanceUnit = 'km'): string {
  if (mark.kg !== undefined) return `${fmtWeight(mark.kg, weight)} × ${mark.reps ?? 0}`;
  if (mark.sec !== undefined) return `${fmtNumber(mark.sec)} s`;
  if (mark.km !== undefined && mark.km > 0) return `${fmtDistance(mark.km, distance)} in ${fmtNumber(mark.min ?? 0)} min`;
  if (mark.min !== undefined) return `${fmtNumber(mark.min)} min`;
  return `${fmtNumber(mark.reps ?? 0)} reps`;
}

// The XP lines, in the order the design shows them: sets done, cardio minutes,
// beat last time, records, the finish bonus (or what was missed), weekly goal.
// `score` is the workout's own score (from scoreState). Without it (a workout
// that does not count yet) only the set lines show.
export function xpLines(workout: Pick<WorkoutLog, 'items'>, score: WorkoutScore | undefined, lookup: ExerciseLookup = exerciseById, weeklyGoal = 3, weight: WeightUnit = 'kg', distance: DistanceUnit = 'km'): XpLine[] {
  let strengthSets = 0;
  let strengthXp = 0;
  let cardioXp = 0;
  let cardioMinutes = 0;
  for (const item of workout.items) {
    const e = lookup(item.exerciseId);
    if (!e) continue;
    for (const s of item.sets) {
      if (!s.done) continue;
      if (e.metric === 'distance_time' || e.metric === 'intervals') {
        cardioXp += setXp(e, s);
        cardioMinutes += e.metric === 'distance_time' ? num(s.min) : num(s.on) + num(s.off);
      } else {
        strengthSets++;
        strengthXp += setXp(e, s);
      }
    }
  }
  const lines: XpLine[] = [];
  if (strengthSets > 0) lines.push({ key: 'sets', title: `${strengthSets} ${strengthSets === 1 ? 'set' : 'sets'} done`, xp: strengthXp, sub: `${WORKOUT_XP.strengthSet} XP a set` });
  if (cardioXp > 0) lines.push({ key: 'cardio', title: `Cardio, ${fmtNumber(cardioMinutes)} min`, xp: cardioXp, sub: '1 XP a minute, plus 10 with distance' });
  if (!score) return lines;
  const nameOf = (id: string) => lookup(id)?.name ?? 'Exercise';
  for (const kind of ['beat', 'record'] as const) {
    for (const m of score.marks.filter((x) => x.kind === kind)) {
      lines.push({
        key: `${kind}-${m.exerciseId}`,
        title: kind === 'beat' ? 'Beat last time' : 'New record',
        xp: kind === 'beat' ? WORKOUT_XP.beat : WORKOUT_XP.record,
        sub: `${nameOf(m.exerciseId)}: ${markText(m, weight, distance)}`,
      });
    }
  }
  if (score.planComplete) {
    lines.push({ key: 'finish', title: 'Workout finished', xp: score.finishXp, ...(score.finishXp === 0 ? { sub: `Finish bonus is paid ${WORKOUT_XP.finishPerDay} times a day` } : {}) });
  } else if (score.planMissing.length > 0) {
    lines.push({ key: 'missed', title: `Missed: ${score.planMissing.map(nameOf).join(', ')} not done`, xp: 0 });
  }
  if (score.weeklyXp > 0) lines.push({ key: 'weekly', title: 'Weekly goal hit', xp: score.weeklyXp, sub: `${weeklyGoal} workouts this week` });
  return lines;
}

// Total of the lines, plus whatever else the save earned (a new badge pays XP too).
export function xpTotal(lines: readonly XpLine[], gained: number): { total: number; other: number } {
  const total = lines.reduce((sum, l) => sum + l.xp, 0);
  return { total: Math.max(total, gained), other: Math.max(0, gained - total) };
}

export type ShareInput = {
  title: string;
  sets: number;
  volumeKg: number;
  minutes: number | null;
  xp: number;
  rankTitle: string;
};

// The plain text handed to the phone's share sheet, or copied.
export function shareText(s: ShareInput, weight: WeightUnit = 'kg'): string {
  const parts = [`${s.sets} ${s.sets === 1 ? 'set' : 'sets'}`];
  if (s.volumeKg > 0) parts.push(`${fmtVolume(s.volumeKg, weight)} lifted`);
  if (s.minutes !== null) parts.push(`${s.minutes} min`);
  return `${s.title}: ${parts.join(', ')}. +${s.xp} XP. Levl, ${s.rankTitle}.`;
}
