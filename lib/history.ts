// The numbers behind the Past workouts screens: the XP breakdown, the wording of
// the delete confirm, and the toast after XP changes. Pure functions.
import { exerciseById } from '../data/exercises';
import type { Metric } from '../data/exercises';
import { levelForXp, rankForLevel } from './progress';
import { WORKOUT_XP } from './routines';
import type { ExerciseLookup, LoggedSet, WorkoutLog } from './routines';
import { fmtDistance, fmtNumber, fmtWeight } from './units';
import type { DistanceUnit, WeightUnit } from './units';
import { bonusLines, markText } from './victory';
import { trainingMinutes } from './workoutScoring';

// ---------------- Delete ----------------

// What removing `xp` from `totalXp` does to the level and the rank. Both are
// null when nothing drops. Levels only ever go down here, never up.
export function dropAfterRemoving(totalXp: number, xp: number): { level: number | null; rank: string | null } {
  const from = levelForXp(totalXp);
  const to = levelForXp(Math.max(0, totalXp - Math.max(0, xp)));
  if (to >= from) return { level: null, rank: null };
  return { level: to, rank: rankForLevel(to) !== rankForLevel(from) ? rankForLevel(to) : null };
}

// The body of the Delete confirm: what goes, and (only when it applies) the level
// or rank you fall back to. A rank drop is said instead of a level drop.
export function deleteSentence(p: { title: string; whenLabel: string; xp: number; totalXp: number }): string {
  const drop = dropAfterRemoving(p.totalXp, p.xp);
  const back = drop.rank ? ` You'll go back to ${drop.rank} rank.` : drop.level ? ` You'll go back to level ${drop.level}.` : '';
  return `${p.title} from ${p.whenLabel} and its ${p.xp} XP will be removed.${back} This can't be undone.`;
}

// ---------------- Toasts ----------------

// "Workout deleted" or "Workout deleted · Level 6" when the level changed.
export function deletedToast(fromLevel: number, toLevel: number): string {
  return toLevel !== fromLevel ? `Workout deleted · Level ${toLevel}` : 'Workout deleted';
}

// After a saved edit: "XP updated · Level 7" when the level changed, else "Changes saved".
export function editedToast(fromLevel: number, toLevel: number): string {
  return toLevel !== fromLevel ? `XP updated · Level ${toLevel}` : 'Changes saved';
}

// ---------------- The XP earned modal ----------------

export type BreakdownLine = { key: string; title: string; sub?: string; xp: number };

const num = (v: number | undefined): number => (typeof v === 'number' && Number.isFinite(v) ? v : 0);

// The lines of "XP earned", in the order of the design: sets, cardio, record,
// beat last time, daily bonus, comeback, weekly goal. The total is the workout's
// own XP. Lines with nothing behind them are left out, except the daily bonus,
// which always says why it paid or did not. `dayMinutes` is the date's training
// minutes once this workout is counted (WorkoutScore.dayMinutes). Without it the
// day is taken to be this workout alone.
export function xpBreakdown(
  w: Pick<WorkoutLog, 'items' | 'marks' | 'xpParts' | 'xp'>,
  opts: { lookup?: ExerciseLookup; weight?: WeightUnit; distance?: DistanceUnit; weeklyGoal?: number; dayMinutes?: number; pastDay?: boolean } = {}
): { lines: BreakdownLine[]; total: number } {
  const lookup = opts.lookup ?? exerciseById;
  const parts = w.xpParts ?? { sets: 0, cardio: 0, beat: 0, record: 0, finish: 0, weekly: 0, comeback: 0 };
  const nameOf = (id: string) => lookup(id)?.name ?? 'Exercise';
  let strengthSets = 0;
  let cardioMinutes = 0;
  for (const item of w.items) {
    const e = lookup(item.exerciseId);
    if (!e) continue;
    for (const s of item.sets) {
      if (!s.done) continue;
      if (e.metric === 'distance_time') cardioMinutes += num(s.min);
      else if (e.metric === 'intervals') cardioMinutes += num(s.on) + num(s.off);
      else if (parts.sets > 0) strengthSets++;
    }
  }
  const marks = w.marks ?? [];
  const records = marks.filter((m) => m.kind === 'record');
  const beats = marks.filter((m) => m.kind === 'beat');
  const lines: BreakdownLine[] = [];
  if (parts.sets > 0) lines.push({ key: 'sets', title: `${strengthSets} ${strengthSets === 1 ? 'set' : 'sets'}`, sub: `${WORKOUT_XP.strengthSet} XP a set`, xp: parts.sets });
  if (parts.cardio > 0) lines.push({ key: 'cardio', title: 'Cardio', sub: `${fmtNumber(cardioMinutes)} min, 1 XP a minute plus 10 with distance`, xp: parts.cardio });
  if (records.length > 0) {
    lines.push({ key: 'record', title: 'Record', sub: records.map((m) => `${nameOf(m.exerciseId)}, ${markText(m, opts.weight, opts.distance)}`).join('; '), xp: parts.record });
  }
  if (beats.length > 0) lines.push({ key: 'beat', title: 'Beat last time', sub: beats.map((m) => nameOf(m.exerciseId)).join(', '), xp: parts.beat });
  const minutes = trainingMinutes(w.items, lookup);
  lines.push(
    ...bonusLines({ dailyXp: parts.finish, comebackXp: parts.comeback ?? 0, weeklyXp: parts.weekly, weekRun: parts.weekRun, minutes, dayMinutes: opts.dayMinutes ?? minutes, weeklyGoal: opts.weeklyGoal ?? 3, pastDay: opts.pastDay })
  );
  return { lines, total: w.xp };
}

// ---------------- One set as a line ----------------

// "12.5 kg × 10", "10 reps", "40 s", "32 min · 11.2 km", "1 min on · 1.5 min off".
export function setLine(metric: Metric, s: Pick<LoggedSet, 'kg' | 'reps' | 'sec' | 'min' | 'km' | 'on' | 'off'>, units: { weight: WeightUnit; distance: DistanceUnit } = { weight: 'kg', distance: 'km' }): string {
  switch (metric) {
    case 'weight_reps':
      return `${fmtWeight(num(s.kg), units.weight)} × ${num(s.reps)}`;
    case 'reps':
      return `${num(s.reps)} ${num(s.reps) === 1 ? 'rep' : 'reps'}`;
    case 'time':
      return `${fmtNumber(num(s.sec))} s`;
    case 'distance_time':
      return `${fmtNumber(num(s.min))} min${num(s.km) > 0 ? ` · ${fmtDistance(num(s.km), units.distance)}` : ''}`;
    case 'intervals':
      return `${fmtNumber(num(s.on))} min on · ${fmtNumber(num(s.off))} min off`;
  }
}
