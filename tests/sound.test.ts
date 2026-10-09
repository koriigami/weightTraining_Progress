import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { DUR, SPRINGS, spring, springFrames, springMs } from '../lib/motion';
import { MUSIC, SLOTS, deg, getPrefs, play, recordedFiles } from '../lib/sound';

describe('motion tokens', () => {
  it('every spring starts at 0 and settles on 1', () => {
    for (const s of Object.values(SPRINGS)) {
      expect(spring(0, s)).toBeCloseTo(0, 5);
      expect(spring(3, s)).toBeCloseTo(1, 3);
      expect(springMs(s)).toBeLessThan(3000);
    }
  });

  it('the bouncy spring overshoots and the snappy one settles sooner', () => {
    const peak = Math.max(...Array.from({ length: 100 }, (_, i) => spring(i / 100, SPRINGS.bouncy)));
    expect(peak).toBeGreaterThan(1);
    expect(springMs(SPRINGS.snappy)).toBeLessThan(springMs(SPRINGS.bouncy));
  });

  it('springFrames runs from the start value to the end value', () => {
    const { frames, ms } = springFrames(0.5, 1, (v) => `scale(${v})`);
    expect(frames[0].transform).toBe('scale(0.5)');
    expect(Number(/scale\((.*)\)/.exec(frames[frames.length - 1].transform)![1])).toBeCloseTo(1, 2);
    expect(frames.length).toBeGreaterThanOrEqual(13);
    expect(ms).toBe(springMs());
  });

  it('durations climb from a press to a reward', () => {
    const d = Object.values(DUR);
    expect([...d].sort((a, b) => a - b)).toEqual(d);
  });
});

describe('sound table', () => {
  const shipped = readdirSync(join(__dirname, '..', 'public', 'sounds'))
    .filter((f) => f.endsWith('.mp3'))
    .map((f) => f.replace(/\.mp3$/, ''))
    .sort();

  it('has every slot of the plan once', () => {
    const ids = SLOTS.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.sort()).toEqual(
      [
        'land', 'crack', 'burst', 'whoosh', 'reveal', 'sparkle', 'coins', 'shatter', 'tier', 'riser', 'chime', 'done', 'beat',
        'record', 'goal', 'error', 'tap', 'tock', 'tick', 'switch', 'chip', 'close', 'open', 'modal', 'lap',
      ].sort()
    );
  });

  it('plays exactly the shipped files: no missing file, no spare file', () => {
    expect(recordedFiles().sort()).toEqual(shipped);
  });

  it('has music for level, rank and victory, and none for the chest', () => {
    expect(MUSIC.map((m) => m.id)).toEqual(['level', 'rank', 'victory']);
    expect(MUSIC.map((m) => m.file)).toEqual(['m-level-joth', 'm-rank-c', 'm-victory-a']);
  });

  it('reward notes are in C', () => {
    expect(deg(0, 4)).toBeCloseTo(261.63, 1);
    expect(deg(7, 4)).toBeCloseTo(523.25, 1);
  });

  it('is silent without a browser', () => {
    expect(() => play('tap')).not.toThrow();
    expect(() => play('nothing')).not.toThrow();
  });
});

describe('device prefs', () => {
  it('start with sound, vibration and music on', () => {
    expect(getPrefs()).toEqual({ sound: true, vibrate: true, music: true });
  });
});
