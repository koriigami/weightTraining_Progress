// Prints the golden numbers for tests/fixtures/legacyState.json as JSON.
//
// The golden file (legacyGolden.json) was produced by running this script
// against the scoring code as it was at commit 39a2b2a, before workouts existed:
//
//   git archive 39a2b2a lib data | tar -x -C /tmp/legacy
//   cp -r tests /tmp/legacy/tests && cp package.json tsconfig.json /tmp/legacy
//   ln -s "$PWD/node_modules" /tmp/legacy/node_modules
//   (cd /tmp/legacy && npx vite-node tests/fixtures/genLegacyGolden.ts > legacyGolden.json)
//
// Running it against the current code must print the same thing.
import legacy from './legacyState.json';
import {
  clearedStreakSeries,
  computeProgress,
  planDay,
  totalXp,
  workoutDates,
  xpForDay,
} from '../../lib/progress';
import type { AppState } from '../../lib/progress';
import { allEarnedBadges } from '../../lib/badges';
import { goalProgressValue, goalStatus } from '../../lib/goals';

const state = legacy as unknown as AppState;
const TODAYS = ['2026-09-29', '2026-10-12', '2026-10-25', '2026-11-05'];

const streaks = clearedStreakSeries(state);
const dayXp: Record<string, number> = {};
for (const date of workoutDates()) {
  const xp = xpForDay(planDay(date)!, state.days[date], streaks[date]);
  if (xp) dayXp[date] = xp;
}

const perToday = TODAYS.map((today) => {
  const p = computeProgress(state, today);
  return {
    today,
    totalXp: totalXp(state, today),
    level: p.level,
    rank: p.rank,
    xpIntoLevel: p.xpIntoLevel,
    stats: p.stats,
    badges: allEarnedBadges(state, today)
      .map((b) => `${b.id}@${b.earnedAt}`)
      .sort(),
    goals: state.goals.map((g) => ({
      id: g.id,
      status: goalStatus(g, state, today),
      progress: goalProgressValue(g, state, today),
    })),
  };
});

console.log(JSON.stringify({ dayXp, streaks, perToday }, null, 2));
