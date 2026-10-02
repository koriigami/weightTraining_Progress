// XP integrity check: replays histories under rules v4 and compares them with the
// same histories under v3, where every paid goal week was +50. It checks that XP,
// level and rank never go down, and that the difference is exactly the ladder
// (+10 for each week in a row, up to +100). To print the before and after table for
// review, run: XP_REPORT=1 npx vitest run tests/xpIntegrity.test.ts --silent=false
// (vitest hides console output unless silent is off). See "XP integrity check" in
// docs/AGENTS.md.
import { describe, expect, it } from 'vitest';
import { addDaysStr, mondayOf } from '../lib/date';
import { levelForXp, rankForLevel, totalXp } from '../lib/progress';
import type { AppState, Rank } from '../lib/progress';
import { scoreState, trainingDaysOf } from '../lib/workoutScoring';
import { migratedPlanState } from './fixtures/legacyPlanState';
import { stateWith, trainingDay } from './helpers';

const TODAY = '2026-12-31';
const RANK_ORDER: Rank[] = ['E', 'D', 'C', 'B', 'A', 'S'];
const rankIndex = (xp: number) => RANK_ORDER.indexOf(rankForLevel(levelForXp(xp)));
const START = mondayOf('2026-03-04'); // a Monday, well before TODAY

// Weekly goal of 3 (the default), one training day of 21 minutes per entry. `pattern[i]` is
// the number of training days in the i-th Monday to Sunday week.
const history = (pattern: number[]): AppState =>
  stateWith(pattern.flatMap((n, i) => Array.from({ length: n }, (_, d) => trainingDay(addDaysStr(START, 7 * i + d)))));

const HISTORIES: { name: string; state: AppState }[] = [
  { name: 'Plan migration fixture, 5 weeks', state: migratedPlanState('2026-11-02') },
  { name: 'Steady 3 a week, 26 weeks', state: history(Array(26).fill(3)) },
  { name: 'On and off, 18 weeks', state: history([3, 3, 3, 2, 3, 3, 0, 0, 4, 3, 3, 3, 3, 3, 3, 3, 1, 3]) },
  { name: '4 a week, 8 weeks', state: history(Array(8).fill(4)) },
  { name: 'Never reaches the goal', state: history([2, 2, 1, 2, 0, 2]) },
];

// The extra XP the ladder pays over a flat +50, worked out on its own from the
// training days: group them by Monday to Sunday week, walk the weeks that reach the
// goal and count each run. The literals are the rule (50, +10 a week, 100 at most).
function ladderExtra(state: AppState, goal: number): number {
  const perWeek = new Map<string, number>();
  for (const d of trainingDaysOf(state, TODAY)) perWeek.set(mondayOf(d), (perWeek.get(mondayOf(d)) ?? 0) + 1);
  let extra = 0;
  let run = 0;
  const weeks = [...perWeek.keys()].sort();
  for (let w = weeks[0]; weeks.length > 0 && w <= weeks[weeks.length - 1]; w = addDaysStr(w, 7)) {
    run = (perWeek.get(w) ?? 0) >= goal ? run + 1 : 0;
    if (run > 0) extra += Math.min(100, 50 + 10 * (run - 1)) - 50;
  }
  return extra;
}

type Row = { name: string; goalWeeks: number; bestRun: number; before: number; after: number; delta: number };

function replay(name: string, state: AppState): Row & { paid: number[] } {
  const scores = scoreState(state, TODAY);
  const paid = scores.filter((s) => s.weeklyXp > 0);
  const delta = paid.reduce((sum, s) => sum + s.weeklyXp - 50, 0);
  const after = totalXp(state, TODAY);
  return { name, goalWeeks: paid.length, bestRun: Math.max(0, ...paid.map((s) => s.parts.weekRun ?? 0)), before: after - delta, after, delta, paid: paid.map((s) => s.weeklyXp) };
}

describe('XP integrity: rules v4 against v3', () => {
  const rows = HISTORIES.map((h) => replay(h.name, h.state));

  it('never takes XP, level or rank away: every goal week pays 50 to 100 and the total only goes up', () => {
    for (const r of rows) {
      expect(r.paid.every((x) => x >= 50 && x <= 100), r.name).toBe(true);
      expect(r.after, r.name).toBeGreaterThanOrEqual(r.before);
      expect(levelForXp(r.after), r.name).toBeGreaterThanOrEqual(levelForXp(r.before));
      expect(rankIndex(r.after), r.name).toBeGreaterThanOrEqual(rankIndex(r.before));
    }
  });

  it('adds exactly the ladder: the difference is what a run of goal weeks pays over +50', () => {
    for (const h of HISTORIES) {
      const r = rows.find((x) => x.name === h.name)!;
      expect(r.delta, h.name).toBe(ladderExtra(h.state, 3));
    }
  });

  it('leaves a history that never reaches the goal exactly as it was', () => {
    const r = rows.find((x) => x.name === 'Never reaches the goal')!;
    expect([r.goalWeeks, r.delta, r.after - r.before]).toEqual([0, 0, 0]);
  });

  it('pays the plan migration fixture its five weeks in a row: 50, 60, 70, 80, 90', () => {
    const r = rows.find((x) => x.name.startsWith('Plan migration'))!;
    expect(r.paid).toEqual([50, 60, 70, 80, 90]);
    expect(r.delta).toBe(0 + 10 + 20 + 30 + 40);
  });

  it('reaches the cap on a long run: 26 steady weeks pay 50 up to 100 and then 100 each', () => {
    const r = rows.find((x) => x.name.startsWith('Steady'))!;
    expect(r.paid.slice(0, 7)).toEqual([50, 60, 70, 80, 90, 100, 100]);
    expect(r.paid).toHaveLength(26);
    expect(r.delta).toBe(10 + 20 + 30 + 40 + 50 * 21);
  });

  it('prints the before and after table with XP_REPORT=1', () => {
    if (!process.env.XP_REPORT) return;
    const line = (c: string[]) => c.map((x, i) => (i === 0 ? x.padEnd(34) : x.padStart(i < 3 ? 6 : 9))).join(' ');
    const out = [
      '',
      'XP under rules v3 (every goal week +50) and v4 (growing goal bonus). Total XP counts workouts, weigh-ins, badges and goals.',
      line(['History', 'Goals', 'Run', 'XP v3', 'XP v4', 'Gain', 'Level v3', 'Level v4', 'Rank v3', 'Rank v4']),
      ...rows.map((r) =>
        line([r.name, String(r.goalWeeks), String(r.bestRun), String(r.before), String(r.after), `+${r.delta}`, String(levelForXp(r.before)), String(levelForXp(r.after)), rankForLevel(levelForXp(r.before)), rankForLevel(levelForXp(r.after))])
      ),
      '',
    ];
    console.log(out.join('\n'));
  });
});
