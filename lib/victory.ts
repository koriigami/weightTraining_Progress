// The numbers on the Victory screen: the XP lines a finished workout earned, and
// the text of the Share card. Pure functions.
import { exerciseById } from '../data/exercises';
import { minutesTodayText } from './liveStats';
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

// The bonus lines that follow the sets, cardio and marks: the daily bonus, the
// comeback and the weekly goal. Shared by the Victory screen and the workout page.
// The daily bonus always has a line. It is worth 50 on the workout that takes the
// day to 20 minutes, and otherwise 0 with the reason: an earlier workout already
// paid it, or the day is still short. `minutes` is this workout's own training
// minutes and `dayMinutes` the date's total once it is counted. `pastDay` words it
// for a workout on an earlier day ("that day" instead of "today"). `weekRun` is the
// weeks in a row the weekly goal had been met when it paid, and shows from the
// second week in a row.
export function bonusLines(p: { dailyXp: number; comebackXp: number; weeklyXp: number; weekRun?: number; minutes: number; dayMinutes: number; weeklyGoal: number; pastDay?: boolean }): XpLine[] {
  const lines: XpLine[] = [];
  if (p.dailyXp > 0) {
    lines.push({ key: 'daily', title: 'Daily bonus', xp: p.dailyXp });
  } else {
    const paidBefore = p.dayMinutes - p.minutes >= WORKOUT_XP.dailyMinutes;
    lines.push({ key: 'daily', title: 'Daily bonus', xp: 0, sub: paidBefore ? `Already earned ${p.pastDay ? 'that day' : 'today'}` : minutesTodayText(p.dayMinutes, !p.pastDay) });
  }
  if (p.comebackXp > 0) lines.push({ key: 'comeback', title: 'Comeback', xp: p.comebackXp, sub: 'First training day after a week off' });
  if (p.weeklyXp > 0) {
    const days = `${p.weeklyGoal} of ${p.weeklyGoal} training ${p.weeklyGoal === 1 ? 'day' : 'days'}`;
    const run = p.weekRun ?? 0;
    lines.push({ key: 'weekly', title: 'Weekly goal', xp: p.weeklyXp, sub: run >= 2 ? `${days}, ${run} weeks in a row` : `${days} this week` });
  }
  return lines;
}

// The XP lines, in the order the design shows them: sets done, cardio minutes,
// beat last time, records, then the daily bonus, comeback and weekly goal.
// `score` is the workout's own score (from scoreState). Without it (a workout
// that does not count yet) only the set lines show. `pastDay` is true for a workout on an earlier day.
export function xpLines(workout: Pick<WorkoutLog, 'items'>, score: WorkoutScore | undefined, lookup: ExerciseLookup = exerciseById, weeklyGoal = 3, weight: WeightUnit = 'kg', distance: DistanceUnit = 'km', pastDay = false): XpLine[] {
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
  lines.push(...bonusLines({ dailyXp: score.dailyXp, comebackXp: score.comebackXp, weeklyXp: score.weeklyXp, weekRun: score.parts.weekRun, minutes: score.minutes, dayMinutes: score.dayMinutes, weeklyGoal, pastDay }));
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
  kind?: 'strength' | 'mixed' | 'cardio'; // none reads as strength
  km?: number;
  rate?: string; // the pace or speed, already formatted: "5:58 /km", "24 km/h"
};

// The plain text handed to the phone's share sheet, or copied. Strength lists the
// sets and what was lifted. Mixed adds the distance. Cardio leads with the
// distance, then the time and the pace or speed.
export function shareText(s: ShareInput, weight: WeightUnit = 'kg', distance: DistanceUnit = 'km'): string {
  const km = s.km ?? 0;
  const parts: string[] = [];
  if (s.kind === 'cardio') {
    if (km > 0) parts.push(fmtDistance(km, distance));
    if (s.minutes !== null) parts.push(`${s.minutes} min`);
    if (s.rate) parts.push(s.rate);
  } else {
    parts.push(`${s.sets} ${s.sets === 1 ? 'set' : 'sets'}`);
    if (s.volumeKg > 0) parts.push(`${fmtVolume(s.volumeKg, weight)} lifted`);
    if (s.minutes !== null) parts.push(`${s.minutes} min`);
    if (s.kind === 'mixed' && km > 0) parts.push(fmtDistance(km, distance));
  }
  const head = parts.length > 0 ? `${s.title}: ${parts.join(', ')}.` : `${s.title}.`;
  return `${head} +${s.xp} XP. Levl, ${s.rankTitle}.`;
}
