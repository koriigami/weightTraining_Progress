// The Rank Road: one row per level, from level 32 at the top down to level 1,
// with a rank gate at levels 1, 5, 10, 15, 20 and 30. Pure.
//
// Each gate is in one of four states, from where you stand:
//   past     unlocked earlier (a rank below yours)
//   current  your rank
//   next     the next rank to unlock
//   locked   further away
import { RANK_TITLES, levelForXp, rankForLevel, xpForLevel, xpIntoLevel } from './progress';
import type { Rank } from './progress';

export const GATE_LEVELS = [1, 5, 10, 15, 20, 30] as const;
export const GATE_RANK: Record<number, Rank> = { 1: 'E', 5: 'D', 10: 'C', 15: 'B', 20: 'A', 30: 'S' };
export const ROAD_TOP_LEVEL = 32;

export type GateState = 'past' | 'current' | 'next' | 'locked';

export type GateRow = {
  kind: 'gate';
  level: number;
  rank: Rank;
  title: string;
  state: GateState;
  reached: boolean; // level <= your level, so the shield is in colour
  now: boolean; // it is also the level you are on
  levelsToGo: number; // levels to reach this gate, 0 once reached
  xpToGo: number; // XP to reach this gate, 0 once reached
  unlockXp: number; // XP the gate starts at
  nextTitle: string | null; // for your rank: the rank after it
  nextLevelsToGo: number | null; // for your rank: levels to the next gate
  rankProgress: number; // 0..100, for your rank and the next one: how far through the rank you are
};

export type LevelRow = {
  kind: 'level';
  level: number;
  xp: number; // XP the level starts at
  xpToGo: number; // XP to reach this level, 0 once reached
  state: 'done' | 'now' | 'ahead';
};

export type RoadRow = GateRow | LevelRow;

export type Road = {
  level: number;
  rank: Rank;
  xp: number;
  into: number; // XP into the current level
  needed: number; // XP the current level takes
  levelPct: number; // 0..100
  nextGate: number | null; // level of the next rank gate, null at the top rank
  rows: RoadRow[]; // top (highest level) first
};

/** The gate a level sits under: the highest gate level at or below it. */
export function gateFor(level: number): number {
  let g: number = GATE_LEVELS[0];
  for (const l of GATE_LEVELS) if (l <= level) g = l;
  return g;
}

/** The first gate above a level, or null at the top rank. */
export function nextGateAbove(level: number): number | null {
  return GATE_LEVELS.find((l) => l > level) ?? null;
}

export function gateState(gateLevel: number, level: number): GateState {
  const current = gateFor(level);
  if (gateLevel < current) return 'past';
  if (gateLevel === current) return 'current';
  return gateLevel === nextGateAbove(level) ? 'next' : 'locked';
}

const plural = (n: number, one: string, many: string) => (n === 1 ? one : many);

export function levelsWord(n: number): string {
  return `${n} ${plural(n, 'level', 'levels')}`;
}

export function buildRoad(xp: number): Road {
  const level = levelForXp(xp);
  const { current: into, needed } = xpIntoLevel(xp);
  const curGate = gateFor(level);
  const nextGate = nextGateAbove(level);
  const rankProgress = nextGate
    ? Math.round(((xp - xpForLevel(curGate)) / (xpForLevel(nextGate) - xpForLevel(curGate))) * 100)
    : 100;
  const top = Math.max(ROAD_TOP_LEVEL, level);

  const rows: RoadRow[] = [];
  for (let l = top; l >= 1; l--) {
    if (GATE_RANK[l]) {
      const rank = GATE_RANK[l];
      const state = gateState(l, level);
      const reached = l <= level;
      rows.push({
        kind: 'gate',
        level: l,
        rank,
        title: RANK_TITLES[rank],
        state,
        reached,
        now: l === level,
        levelsToGo: reached ? 0 : l - level,
        xpToGo: reached ? 0 : xpForLevel(l) - xp,
        unlockXp: xpForLevel(l),
        nextTitle: state === 'current' && nextGate ? RANK_TITLES[GATE_RANK[nextGate]] : null,
        nextLevelsToGo: state === 'current' && nextGate ? nextGate - level : null,
        rankProgress: state === 'current' || state === 'next' ? rankProgress : 0,
      });
    } else {
      rows.push({ kind: 'level', level: l, xp: xpForLevel(l), xpToGo: l > level ? xpForLevel(l) - xp : 0, state: l < level ? 'done' : l === level ? 'now' : 'ahead' });
    }
  }
  return {
    level,
    rank: rankForLevel(level),
    xp,
    into,
    needed,
    levelPct: needed > 0 ? Math.round((into / needed) * 100) : 0,
    nextGate,
    rows,
  };
}

/** What a tap on a rank gate shows: the shield in colour, a ribbon and what it takes. */
export function gatePreview(row: GateRow): { title: string; unlocked: boolean; body: string } {
  const letter = row.rank;
  if (row.reached) {
    return {
      title: row.title,
      unlocked: true,
      body: `You unlocked this at level ${row.level}. It gave you the title and the ${letter}-Rank profile frame.`,
    };
  }
  return {
    title: row.title,
    unlocked: false,
    body: `Reach level ${row.level} to unlock it. That is ${row.xpToGo.toLocaleString('en-US')} XP from where you are. It comes with the title and a ${letter}-Rank profile frame.`,
  };
}
