import { describe, expect, it } from 'vitest';
import { xpForLevel } from '../lib/progress';
import { GATE_LEVELS, buildRoad, chestLine, gateFor, gatePreview, gateState, gateWhere, levelsWord, nextGateAbove, nextRankText, roadBadges, visibleMedals } from '../lib/rankRoad';
import type { GateRow, LevelRow } from '../lib/rankRoad';
import { stateWith, trainingDay } from './helpers';

const atLevel = (l: number, extra = 0) => buildRoad(xpForLevel(l) + extra);
const gates = (l: number) => Object.fromEntries((atLevel(l).rows.filter((r) => r.kind === 'gate') as GateRow[]).map((g) => [g.level, g.state]));

describe('the road', () => {
  it('runs from level 32 at the top down to level 1', () => {
    const road = atLevel(1);
    expect(road.rows).toHaveLength(32);
    expect(road.rows[0]).toMatchObject({ level: 32 });
    expect(road.rows[31]).toMatchObject({ level: 1 });
  });

  it('puts a rank gate at levels 1, 5, 10, 15, 20 and 30', () => {
    const g = atLevel(1).rows.filter((r) => r.kind === 'gate') as GateRow[];
    expect(g.map((r) => r.level)).toEqual([30, 20, 15, 10, 5, 1]);
    expect(g.map((r) => r.rank)).toEqual(['S', 'A', 'B', 'C', 'D', 'E']);
    expect(g.map((r) => r.title)).toEqual(['S-Rank Hunter', 'A-Rank Hunter', 'B-Rank Hunter', 'C-Rank Hunter', 'D-Rank Hunter', 'E-Rank Hunter']);
    expect(GATE_LEVELS).toEqual([1, 5, 10, 15, 20, 30]);
  });

  it('grows past 32 for someone who got further', () => {
    expect(atLevel(34).rows[0]).toMatchObject({ level: 34 });
  });
});

describe('gate state per level', () => {
  it('level 1: E is your rank, D is next, the rest are locked', () => {
    expect(gates(1)).toEqual({ 1: 'current', 5: 'next', 10: 'locked', 15: 'locked', 20: 'locked', 30: 'locked' });
  });

  it('level 4: still E, with D one level away', () => {
    expect(gates(4)).toEqual({ 1: 'current', 5: 'next', 10: 'locked', 15: 'locked', 20: 'locked', 30: 'locked' });
    const d = atLevel(4).rows.find((r) => r.kind === 'gate' && r.level === 5) as GateRow;
    expect(d.levelsToGo).toBe(1);
    expect(d.reached).toBe(false);
  });

  it('level 5: D is your rank the moment you reach its gate, and E is unlocked earlier', () => {
    expect(gates(5)).toEqual({ 1: 'past', 5: 'current', 10: 'next', 15: 'locked', 20: 'locked', 30: 'locked' });
    const d = atLevel(5).rows.find((r) => r.kind === 'gate' && r.level === 5) as GateRow;
    expect(d.now).toBe(true);
    expect(d.reached).toBe(true);
  });

  it('level 9: D until level 10', () => {
    expect(gates(9)).toEqual({ 1: 'past', 5: 'current', 10: 'next', 15: 'locked', 20: 'locked', 30: 'locked' });
  });

  it('level 10: C takes over, and D is unlocked earlier', () => {
    expect(gates(10)).toEqual({ 1: 'past', 5: 'past', 10: 'current', 15: 'next', 20: 'locked', 30: 'locked' });
  });

  it('level 12: C, with B next and A, S locked', () => {
    expect(gates(12)).toEqual({ 1: 'past', 5: 'past', 10: 'current', 15: 'next', 20: 'locked', 30: 'locked' });
  });

  it('level 29: A, with S next', () => {
    expect(gates(29)).toEqual({ 1: 'past', 5: 'past', 10: 'past', 15: 'past', 20: 'current', 30: 'next' });
  });

  it('level 30: S is your rank and nothing is left to unlock', () => {
    expect(gates(30)).toEqual({ 1: 'past', 5: 'past', 10: 'past', 15: 'past', 20: 'past', 30: 'current' });
    expect(atLevel(30).nextGate).toBeNull();
  });

  it('gateFor, nextGateAbove and gateState agree', () => {
    expect(gateFor(1)).toBe(1);
    expect(gateFor(9)).toBe(5);
    expect(gateFor(32)).toBe(30);
    expect(nextGateAbove(9)).toBe(10);
    expect(nextGateAbove(30)).toBeNull();
    expect(gateState(15, 12)).toBe('next');
    expect(gateState(20, 12)).toBe('locked');
  });
});

describe('the rows around your level', () => {
  it('marks levels below yours as done, yours as now, and the rest as ahead', () => {
    const road = atLevel(12, 100);
    const level = (n: number) => road.rows.find((r) => r.level === n)!;
    expect(level(11)).toMatchObject({ kind: 'level', state: 'done' });
    expect(level(12)).toMatchObject({ kind: 'level', state: 'now' });
    expect(level(13)).toMatchObject({ kind: 'level', state: 'ahead' });
    expect(road.into).toBe(100);
    expect(road.needed).toBe(xpForLevel(13) - xpForLevel(12));
    expect(road.levelPct).toBe(Math.round((100 / road.needed) * 100));
  });

  it('counts the XP to go on levels above yours, and 0 once a level is reached', () => {
    const xp = xpForLevel(12) + 100;
    const road = buildRoad(xp);
    const level = (n: number) => road.rows.find((r) => r.level === n)!;
    expect(level(13)).toMatchObject({ kind: 'level', xpToGo: xpForLevel(13) - xp });
    expect(level(14)).toMatchObject({ kind: 'level', xpToGo: xpForLevel(14) - xp });
    expect(level(12)).toMatchObject({ kind: 'level', xpToGo: 0 });
    expect(level(11)).toMatchObject({ kind: 'level', xpToGo: 0 });
  });

  it('counts the levels to the next gate', () => {
    const road = atLevel(12);
    const n = road.rows.find((r) => r.kind === 'gate' && r.level === 15) as GateRow;
    expect(n.levelsToGo).toBe(3);
  });

  it('counts the XP to a locked gate', () => {
    const xp = xpForLevel(4) + 290;
    const road = buildRoad(xp);
    const a = road.rows.find((r) => r.kind === 'gate' && r.level === 20) as GateRow;
    expect(a.xpToGo).toBe(xpForLevel(20) - xp);
    expect(a.levelsToGo).toBe(16);
  });

  it('starts at level 1 with no XP', () => {
    const road = buildRoad(0);
    expect(road.level).toBe(1);
    expect(road.rank).toBe('E');
    expect(road.rows.find((r) => r.level === 1)).toMatchObject({ kind: 'gate', state: 'current', now: true });
  });
});

describe('gate preview', () => {
  it('says when a rank was unlocked', () => {
    const d = atLevel(12).rows.find((r) => r.kind === 'gate' && r.level === 5) as GateRow;
    expect(gatePreview(d)).toEqual({
      title: 'D rank',
      unlocked: true,
      body: 'You unlocked this at level 5. It gave you the title D-Rank Hunter and the D-Rank profile frame.',
    });
  });

  it('says what a locked rank takes', () => {
    const xp = xpForLevel(4) + 100;
    const a = buildRoad(xp).rows.find((r) => r.kind === 'gate' && r.level === 20) as GateRow;
    const p = gatePreview(a);
    expect(p.unlocked).toBe(false);
    expect(p.title).toBe('A rank');
    expect(p.body).toContain('Reach level 20');
    expect(p.body).toContain((xpForLevel(20) - xp).toLocaleString('en-US'));
    expect(p.body).toContain('A-Rank profile frame');
  });

  it('words where you stand on a gate: your rank, an earlier one, or none for a locked one', () => {
    const at12 = atLevel(12);
    const gate = (l: number) => at12.rows.find((r) => r.kind === 'gate' && r.level === l) as GateRow;
    expect(gateWhere(gate(10))).toBe('Your rank, since level 10');
    expect(gateWhere(gate(5))).toBe('Level 5');
    expect(gateWhere(gate(15))).toBeNull();
  });

  it('names the rank chest on the gate', () => {
    const gate = atLevel(1).rows.find((r) => r.kind === 'gate' && r.level === 10) as GateRow;
    expect(chestLine(gate)).toBe('Golden chest: title and frame');
  });

  it('writes the next rank chip with the letter only, and nothing at the top rank', () => {
    expect(nextRankText(atLevel(9))).toBe('Next rank: C at level 10');
    expect(nextRankText(atLevel(30))).toBeNull();
  });

  it('keeps the latest medals that fit and counts the rest', () => {
    expect(visibleMedals([1, 2, 3, 4, 5, 6, 7], 5)).toEqual({ shown: [3, 4, 5, 6, 7], more: 2 });
    expect(visibleMedals([1, 2], 5)).toEqual({ shown: [1, 2], more: 0 });
  });

  it('words levels to go', () => {
    expect(levelsWord(1)).toBe('1 level');
    expect(levelsWord(3)).toBe('3 levels');
  });
});

describe('the chest and the badges on the road', () => {
  // Twelve training days two days apart: 110 XP after the first, 1,230 after the tenth.
  const days = Array.from({ length: 12 }, (_, i) => `2026-09-${String(i * 2 + 1).padStart(2, '0')}`);
  const state = stateWith(days.map((d) => trainingDay(d)));
  const placed = roadBadges(state, '2026-10-01');
  const ids = (level: number) => (placed.get(level) ?? []).map((b) => b.id).sort();

  it('gives each gate its rank chest', () => {
    const g = atLevel(1).rows.filter((r) => r.kind === 'gate') as GateRow[];
    expect(g.map((r) => r.chest)).toEqual(['legend', 'master', 'diamond', 'gold', 'silver', 'bronze']);
  });

  it('puts a badge on the level you were at the day you earned it', () => {
    expect(ids(2)).toEqual(['lifetime:finisher:bronze', 'lifetime:pushup-path:bronze']);
    expect(ids(3)).toEqual(['lifetime:streak-keeper:bronze']);
    expect(ids(4)).toEqual(['lifetime:iron-mover:bronze', 'lifetime:pushup-path:silver']);
  });

  it('puts the badges of a rank-crossing day on the gate', () => {
    // The tenth training day takes level 4 to level 5 and earns Finisher Silver.
    expect(ids(5)).toContain('lifetime:finisher:silver');
    expect(ids(4)).not.toContain('lifetime:finisher:silver');
  });

  it('carries the badges onto the rows of a built road, and none onto rows ahead', () => {
    const road = buildRoad(1450, placed);
    const row = (l: number) => road.rows.find((r) => r.level === l) as LevelRow | GateRow;
    expect(row(2).badges).toHaveLength(2);
    expect(row(5).badges.map((b) => b.id)).toContain('lifetime:finisher:silver');
    expect(row(6).badges).toEqual([]);
  });
});
