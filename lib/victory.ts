// The numbers on the Victory screen: the XP lines a finished workout earned, and
// the text of the Share card. Pure functions.
import { exerciseById } from '../data/exercises';
import { setXp, WORKOUT_XP } from './routines';
import type { ExerciseLookup, WorkoutLog } from './routines';
import { fmtNumber, fmtVolume, fmtWeight } from './units';
import type { WeightUnit } from './units';
import type { WorkoutScore } from './workoutScoring';

export type XpLine = { key: string; title: string; xp: number; sub?: string };

const num = (v: number | undefined): number => (typeof v === 'number' && Number.isFinite(v) ? v : 0);

// The XP lines, in the order the design shows them: sets done, cardio minutes,
// workout finished, personal records, weekly goal. `score` is the workout's own
// score (from scoreState). Without it (a workout that does not count yet) only
// the set lines show.
export function xpLines(workout: Pick<WorkoutLog, 'items' | 'prs'>, score: WorkoutScore | undefined, lookup: ExerciseLookup = exerciseById, weeklyGoal = 3, weight: WeightUnit = 'kg'): XpLine[] {
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
  lines.push({ key: 'finish', title: 'Workout finished', xp: score.finishXp });
  for (const pr of score.prs) {
    const name = lookup(pr.exerciseId)?.name ?? 'Exercise';
    lines.push({ key: `pr-${pr.exerciseId}`, title: 'New personal record', xp: WORKOUT_XP.pr, sub: `${name}: ${fmtWeight(pr.kg, weight)} × ${pr.reps}` });
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
  return `${s.title}: ${parts.join(', ')}. +${s.xp} XP. Home Workout, ${s.rankTitle}.`;
}
