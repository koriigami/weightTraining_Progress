import { describe, expect, it } from 'vitest';
import { exerciseById, MUSCLE_ORDER } from '../data/exercises';
import type { Muscle } from '../data/exercises';
import { fitTitle, LILITA_WIDTHS, muscleChips, shareCardData, shareFileName, textWidth, TITLE_MAX } from '../lib/shareCard';
import type { ShareCard } from '../lib/shareCard';
import type { WorkoutLog } from '../lib/routines';
import { workout } from './helpers';

const NOW = new Date('2026-10-12T12:00:00');
const EM_DASH = String.fromCharCode(0x2014);
const KG = { weight: 'kg' as const, distance: 'km' as const };

// A workout with a set length: 45 minutes unless told otherwise.
function logged(items: Parameters<typeof workout>[1], over: Partial<WorkoutLog> & { minutes?: number | null } = {}): WorkoutLog {
  const { minutes = 45, ...rest } = over;
  const finishedAt = minutes === null ? '' : new Date(Date.parse('2026-10-10T07:00:00.000Z') + minutes * 60000).toISOString();
  return workout('2026-10-10', items, { when: '2026-10-10T18:05', startedAt: '2026-10-10T07:00:00.000Z', finishedAt, xp: 123, ...rest });
}

function card(w: WorkoutLog, units: { weight: 'kg' | 'lb'; distance: 'km' | 'mi' } = KG): ShareCard {
  return shareCardData({ workout: w, lookup: exerciseById, units, rank: 'E', level: 4, now: NOW });
}

const pairs = (c: ShareCard) => c.stats.map((s) => [s.label, s.value]);

// Bench 3 x 20 kg x 10, rows 3 x 10 kg x 10, curls 2 x 5 kg x 8: 980 kg, 8 sets.
const strength = () =>
  logged(
    [
      { id: 'db-bench', sets: [{ kg: 20, reps: 10 }, { kg: 20, reps: 10 }, { kg: 20, reps: 10 }] },
      { id: 'db-row', sets: [{ kg: 10, reps: 10 }, { kg: 10, reps: 10 }, { kg: 10, reps: 10 }] },
      { id: 'db-curl', sets: [{ kg: 5, reps: 8 }, { kg: 5, reps: 8 }] },
    ],
    { title: 'Push A' }
  );

describe('title fitting', () => {
  it('measures a line in Lilita One, with an unknown character as a wide one', () => {
    expect(textWidth('', 88)).toBe(0);
    expect(textWidth('M', 100)).toBeCloseTo(0.907 * 100 * 1.02, 9);
    expect(textWidth('Push', 88)).toBeCloseTo(((570 + 544 + 450 + 501) / 1000) * 88 * 1.02, 9);
    expect(textWidth('\u{1F600}', 100)).toBeCloseTo(0.62 * 100 * 1.02, 9);
  });

  it('has a width for every printable ASCII character and the two marks the app uses', () => {
    for (let c = 0x20; c <= 0x7e; c++) expect(LILITA_WIDTHS[String.fromCharCode(c)], String.fromCharCode(c)).toBeGreaterThan(0);
    expect(LILITA_WIDTHS['…']).toBe(909);
    expect(LILITA_WIDTHS['·']).toBe(309);
    expect(Object.keys(LILITA_WIDTHS)).toHaveLength(97);
  });

  it('keeps a short title whole at the biggest size', () => {
    expect(fitTitle('Push A')).toEqual({ size: 88, text: 'Push A' });
    expect(fitTitle('Legs and a Jog')).toEqual({ size: 88, text: 'Legs and a Jog' });
  });

  it('shrinks a longer title through the steps until all of it fits', () => {
    // 802 px at 88 is too wide for 764, 729 px at 80 fits.
    expect(fitTitle('Hypertrophy Session')).toEqual({ size: 80, text: 'Hypertrophy Session' });
    // 807 px at 72 is too wide, 717 px at 64 fits.
    expect(fitTitle('Heavy Leg Day With Extra')).toEqual({ size: 64, text: 'Heavy Leg Day With Extra' });
  });

  it('cuts at the last whole word that fits at the smallest size, and adds an ellipsis', () => {
    expect(fitTitle('Upper Body Power and Conditioning Day')).toEqual({ size: 64, text: 'Upper Body Power and…' });
    expect(fitTitle('Heavy Leg Day With Extra Calves')).toEqual({ size: 64, text: 'Heavy Leg Day With…' });
  });

  it('cuts a single word that is too long, letter by letter', () => {
    const r = fitTitle('Pneumonoultramicroscopicsilicovolcanoconiosis');
    expect(r).toEqual({ size: 64, text: 'Pneumonoultramicrosco…' });
    expect(textWidth(r.text, r.size)).toBeLessThanOrEqual(TITLE_MAX);
    expect(textWidth('Pneumonoultramicroscop…', 64)).toBeGreaterThan(TITLE_MAX);
  });

  it('cuts a first word that is too long even when words follow it', () => {
    expect(fitTitle('Pneumonoultramicroscopicsilicovolcanoconiosis day').text).toBe('Pneumonoultramicrosco…');
  });

  it('never cuts an emoji in half', () => {
    const r = fitTitle('\u{1F600}'.repeat(30));
    expect(r.text.endsWith('…')).toBe(true);
    expect([...r.text.slice(0, -1)].every((ch) => ch === '\u{1F600}')).toBe(true);
    expect(textWidth(r.text, r.size)).toBeLessThanOrEqual(TITLE_MAX);
  });

  it('collapses whitespace', () => {
    expect(fitTitle('  Leg \t  Day\n')).toEqual({ size: 88, text: 'Leg Day' });
  });

  it('names a workout with no title', () => {
    expect(fitTitle('')).toEqual({ size: 88, text: 'Workout' });
    expect(fitTitle(' \n\t ')).toEqual({ size: 88, text: 'Workout' });
  });

  it('always fits the line, whatever the title', () => {
    const titles = ['W'.repeat(40), 'Wide words like WWW MMM and more', 'a b c d e f g h i j k l m n o p q r s t u v w x y z', 'Morning Run', '1234567890'.repeat(5)];
    for (const t of titles) {
      const r = fitTitle(t);
      expect(textWidth(r.text, r.size), t).toBeLessThanOrEqual(TITLE_MAX);
      expect([88, 80, 72, 64]).toContain(r.size);
    }
  });

  it('follows the width and the steps it is given', () => {
    expect(fitTitle('Push A', 100, [40, 30])).toEqual({ size: 30, text: 'Push A' });
    expect(fitTitle('Push A', 10000, [40, 30])).toEqual({ size: 40, text: 'Push A' });
  });
});

describe('file name', () => {
  it('is levl, a lowercase slug of the title and the day', () => {
    expect(shareFileName('Push A', '2026-10-10')).toBe('levl-push-a-2026-10-10.png');
    expect(shareFileName('Push A - Chest & Triceps!', '2026-10-10')).toBe('levl-push-a-chest-triceps-2026-10-10.png');
    expect(shareFileName('  5x5 (Heavy)  ', '2026-01-02')).toBe('levl-5x5-heavy-2026-01-02.png');
  });

  it('is "workout" when nothing of the title is a letter or a digit', () => {
    expect(shareFileName('', '2026-10-10')).toBe('levl-workout-2026-10-10.png');
    expect(shareFileName('!!! ???', '2026-10-10')).toBe('levl-workout-2026-10-10.png');
    expect(shareFileName('\u{1F4AA}\u{1F525}', '2026-10-10')).toBe('levl-workout-2026-10-10.png');
  });

  it('is at most 40 characters of slug, and never ends the slug with a dash', () => {
    expect(shareFileName('a'.repeat(60), '2026-10-10')).toBe(`levl-${'a'.repeat(40)}-2026-10-10.png`);
    expect(shareFileName(`${'a'.repeat(39)} bbb`, '2026-10-10')).toBe(`levl-${'a'.repeat(39)}-2026-10-10.png`);
  });

  it('only has letters, digits and dashes in the slug', () => {
    expect(shareFileName('Café über / 100%', '2026-10-10')).toMatch(/^levl-[a-z0-9]+(-[a-z0-9]+)*-2026-10-10\.png$/);
  });
});

describe('muscle chips', () => {
  it('takes the three busiest muscles, most sets first, and counts the rest', () => {
    const r = muscleChips({ chest: 6, triceps: 3, biceps: 4.5, abs: 2, quads: 1 }, ['chest', 'biceps']);
    expect(r.chips.map((c) => [c.muscle, c.label, c.sets, c.main])).toEqual([
      ['chest', 'Chest', 6, true],
      ['biceps', 'Biceps', 4.5, true],
      ['triceps', 'Triceps', 3, false],
    ]);
    expect(r.moreCount).toBe(2);
  });

  it('breaks ties in body order', () => {
    const r = muscleChips({ quads: 2, abs: 2, chest: 2, upperback: 2, shoulders: 2 }, []);
    expect(r.chips.map((c) => c.muscle)).toEqual(['chest', 'shoulders', 'upperback']);
    expect(MUSCLE_ORDER.indexOf('chest')).toBeLessThan(MUSCLE_ORDER.indexOf('shoulders'));
    expect(r.moreCount).toBe(2);
  });

  it('writes the sets as "5 sets", "1 set" and "1.5 sets"', () => {
    const r = muscleChips({ chest: 5, abs: 1.5, calves: 1 }, []);
    expect(r.chips.map((c) => c.setsLabel)).toEqual(['5 sets', '1.5 sets', '1 set']);
  });

  it('skips muscles with no sets and has no more-count with three or fewer', () => {
    expect(muscleChips({ chest: 2, abs: 0, quads: 1 }, ['chest'])).toMatchObject({ moreCount: 0, chips: [{ muscle: 'chest' }, { muscle: 'quads' }] });
    expect(muscleChips({}, [])).toEqual({ chips: [], moreCount: 0 });
  });

  it('counts every muscle past the third, not only the main ones', () => {
    const sets: Partial<Record<Muscle, number>> = {};
    MUSCLE_ORDER.filter((m) => m !== 'cardio').forEach((m, i) => (sets[m] = 10 - i * 0.5));
    expect(muscleChips(sets, []).moreCount).toBe(12);
  });
});

describe('a strength card', () => {
  const c = card(strength());

  it('lists Sets, Time and Volume, in that order, with no hero', () => {
    expect(c.kind).toBe('strength');
    expect(pairs(c)).toEqual([['Sets', '8'], ['Time', '45 min'], ['Volume', '980 kg']]);
    expect(c.stats.map((s) => s.key)).toEqual(['sets', 'time', 'volume']);
    expect(c.hero).toBeNull();
  });

  it('carries the workout itself', () => {
    expect(c).toMatchObject({ title: 'Push A', titleSize: 88, fullTitle: 'Push A', xp: 123, rank: 'E', level: 4, rankTitle: 'E-Rank Hunter' });
    expect(c.dateLabel).toBe('Sat 10 Oct · 6:05 pm');
    expect(c.fileName).toBe('levl-push-a-2026-10-10.png');
  });

  it('uses the workout id as the sky seed and its own XP', () => {
    const w = strength();
    const made = card(w);
    expect(made.seedBase).toBe(w.id);
    expect(made.xp).toBe(w.xp);
    expect(card({ ...w, xp: 0 }).xp).toBe(0);
    expect(card({ ...w, xp: 4321 }).xp).toBe(4321);
  });

  it('lights the muscles worked, with the top three by sets as chips and the rest counted', () => {
    // biceps 3.5, chest 3, upperback 3, then triceps, shoulders and lats at 1.5, forearms 1.
    expect(c.muscles?.chips.map((x) => [x.muscle, x.setsLabel, x.main])).toEqual([
      ['biceps', '3.5 sets', true],
      ['chest', '3 sets', true],
      ['upperback', '3 sets', true],
    ]);
    expect(c.muscles?.moreCount).toBe(4);
    expect(c.muscles?.primary).toEqual(['chest', 'upperback', 'biceps']);
    expect(c.muscles?.secondary).toEqual(['triceps', 'shoulders', 'lats', 'forearms']);
  });

  it('follows the weight unit', () => {
    expect(pairs(card(strength(), { weight: 'lb', distance: 'km' }))[2]).toEqual(['Volume', '2,161 lb']);
  });

  it('shows big volumes the short way', () => {
    const heavy = logged([{ id: 'db-bench', sets: [{ kg: 100, reps: 12 }, { kg: 100, reps: 12 }] }]);
    expect(pairs(card(heavy))[2]).toEqual(['Volume', '2.4 t']);
    expect(pairs(card(heavy, { weight: 'lb', distance: 'km' }))[2]).toEqual(['Volume', '5.3k lb']);
  });

  it('writes the time like the rest of the app', () => {
    expect(pairs(card(logged([{ id: 'pushup', sets: [{ reps: 10 }] }], { minutes: 65 })))[1]).toEqual(['Time', '1h 05m']);
    expect(pairs(card(logged([{ id: 'pushup', sets: [{ reps: 10 }] }], { minutes: 0 })))[1]).toEqual(['Time', '1 min']);
  });

  it('leaves Time out when the workout has no length', () => {
    expect(pairs(card(logged([{ id: 'pushup', sets: [{ reps: 10 }] }], { minutes: null })))).toEqual([['Sets', '1']]);
  });

  it('says what it is, as text, for a share sheet that cannot take a picture', () => {
    expect(c.text).toBe('Push A: 8 sets, 980 kg lifted, 45 min. +123 XP. Levl, E-Rank Hunter.');
  });

  it('counts only ticked sets', () => {
    const w = logged([{ id: 'db-bench', sets: [{ kg: 20, reps: 10 }, { kg: 20, reps: 10 }, { kg: 20, reps: 10 }], undone: [2] }, { id: 'db-curl', sets: [{ kg: 5, reps: 8 }], undone: [0] }]);
    const made = card(w);
    expect(pairs(made).slice(0, 1)).toEqual([['Sets', '2']]);
    expect(made.muscles?.primary).toEqual(['chest']); // the curl was never ticked
    expect(made.muscles?.chips.map((x) => [x.muscle, x.sets])).toEqual([['chest', 2], ['shoulders', 1], ['triceps', 1]]);
  });

  it('has no muscles when nothing was ticked', () => {
    const made = card(logged([{ id: 'db-bench', sets: [{ kg: 20, reps: 10 }], undone: [0] }]));
    expect(made.muscles).toBeNull();
    expect(made.kind).toBe('strength');
    expect(pairs(made)).toEqual([['Sets', '0'], ['Time', '45 min']]);
  });
});

describe('a bodyweight card', () => {
  const made = card(logged([{ id: 'pushup', sets: [{ reps: 10 }, { reps: 10 }, { reps: 10 }] }, { id: 'plank', sets: [{ sec: 30 }, { sec: 30 }] }], { title: 'Push-up Ladder' }));

  it('has no Volume', () => {
    expect(made.kind).toBe('strength');
    expect(pairs(made)).toEqual([['Sets', '5'], ['Time', '45 min']]);
    expect(made.text).toBe('Push-up Ladder: 5 sets, 45 min. +123 XP. Levl, E-Rank Hunter.');
  });

  it('counts holds and reps alike for the muscles', () => {
    // abs 1.5 from the push-ups and 2 from the plank, chest 3, then shoulders before triceps, obliques last.
    expect(made.muscles?.chips.map((x) => [x.muscle, x.sets, x.main])).toEqual([['abs', 3.5, true], ['chest', 3, true], ['shoulders', 1.5, false]]);
    expect(made.muscles?.moreCount).toBe(2);
    expect(made.fileName).toBe('levl-push-up-ladder-2026-10-10.png');
  });
});

describe('a mixed card', () => {
  const made = card(logged([{ id: 'db-bench', sets: [{ kg: 20, reps: 10 }, { kg: 20, reps: 10 }, { kg: 20, reps: 10 }] }, { id: 'run', sets: [{ min: 12, km: 2.1 }] }], { title: 'Legs and a Jog' }));

  it('adds the distance after the strength stats', () => {
    expect(made.kind).toBe('mixed');
    expect(pairs(made)).toEqual([['Sets', '4'], ['Time', '45 min'], ['Volume', '600 kg'], ['Distance', '2.1 km']]);
    expect(made.hero).toBeNull();
  });

  it('leaves the distance out when there is none', () => {
    const noKm = card(logged([{ id: 'db-bench', sets: [{ kg: 20, reps: 10 }] }, { id: 'run', sets: [{ min: 12 }] }]));
    expect(noKm.kind).toBe('mixed');
    expect(noKm.stats.map((s) => s.key)).toEqual(['sets', 'time', 'volume']);
  });

  it('lights only the lifting muscles, not the legs a run works', () => {
    expect(made.muscles?.primary).toEqual(['chest']);
    expect(made.muscles?.secondary).toEqual(['triceps', 'shoulders']);
    expect(made.muscles?.moreCount).toBe(0);
  });

  it('puts the distance in the text, in the user\'s unit', () => {
    expect(made.text).toBe('Legs and a Jog: 4 sets, 600 kg lifted, 45 min, 2.1 km. +123 XP. Levl, E-Rank Hunter.');
    expect(card(logged([{ id: 'db-bench', sets: [{ kg: 20, reps: 10 }] }, { id: 'run', sets: [{ min: 12, km: 2.1 }] }]), { weight: 'lb', distance: 'mi' }).text).toContain(', 1.3 mi. +123 XP');
  });
});

describe('a run card', () => {
  const made = card(logged([{ id: 'run', sets: [{ min: 31, km: 5.2 }] }], { title: 'Morning Run', minutes: 31, xp: 46 }));

  it('has a big Distance, then Time and Pace', () => {
    expect(made.kind).toBe('cardio');
    expect(made.hero).toEqual({ key: 'distance', label: 'Distance', value: '5.2 km' });
    expect(pairs(made)).toEqual([['Time', '31 min'], ['Pace', '5:58 /km']]);
    expect(made.muscles).toBeNull();
  });

  it('says it as text', () => {
    expect(made.text).toBe('Morning Run: 5.2 km, 31 min, 5:58 /km. +46 XP. Levl, E-Rank Hunter.');
  });

  it('follows the distance unit', () => {
    const mi = card(logged([{ id: 'run', sets: [{ min: 31, km: 5.2 }] }], { title: 'Morning Run', minutes: 31 }), { weight: 'kg', distance: 'mi' });
    expect(mi.hero?.value).toBe('3.23 mi');
    expect(pairs(mi)).toEqual([['Time', '31 min'], ['Pace', '9:36 /mi']]);
  });

  it('adds up several distance exercises', () => {
    const two = card(logged([{ id: 'run', sets: [{ min: 20, km: 3 }] }, { id: 'walk', sets: [{ min: 10, km: 1 }] }], { minutes: 30 }));
    expect(two.hero?.value).toBe('4 km');
    expect(pairs(two)).toEqual([['Time', '30 min'], ['Pace', '7:30 /km']]);
  });
});

describe('a ride card', () => {
  const made = card(logged([{ id: 'cycle', sets: [{ min: 46, km: 18.4 }] }], { title: 'Evening Ride', minutes: 46, xp: 40 }));

  it('shows Speed, not Pace', () => {
    expect(made.kind).toBe('cardio');
    expect(made.hero).toEqual({ key: 'distance', label: 'Distance', value: '18.4 km' });
    expect(pairs(made)).toEqual([['Time', '46 min'], ['Speed', '24 km/h']]);
    expect(made.text).toBe('Evening Ride: 18.4 km, 46 min, 24 km/h. +40 XP. Levl, E-Rank Hunter.');
  });

  it('shows the speed in miles an hour', () => {
    const mi = card(logged([{ id: 'cycle', sets: [{ min: 46, km: 18.4 }] }], { minutes: 46 }), { weight: 'kg', distance: 'mi' });
    expect(pairs(mi)).toEqual([['Time', '46 min'], ['Speed', '15 mph']]);
  });

  it('shows Pace again when a run is mixed in', () => {
    const both = card(logged([{ id: 'cycle', sets: [{ min: 30, km: 10 }] }, { id: 'run', sets: [{ min: 30, km: 5 }] }], { minutes: 60 }));
    expect(both.stats.map((s) => s.label)).toEqual(['Time', 'Pace']);
  });
});

describe('a cardio card with no distance', () => {
  const made = card(logged([{ id: 'elliptical', sets: [{ min: 20 }] }], { title: 'Cross trainer', minutes: 20 }));

  it('leads with Time, and has no Pace, no "0 km" and no dash', () => {
    expect(made.kind).toBe('cardio');
    expect(made.hero).toEqual({ key: 'time', label: 'Time', value: '20 min' });
    expect(made.stats).toEqual([]);
    expect(made.text).toBe('Cross trainer: 20 min. +123 XP. Levl, E-Rank Hunter.');
    expect(JSON.stringify(made)).not.toContain('0 km');
    expect(JSON.stringify(made.stats)).not.toContain('"-"');
  });

  it('has no Pace when the distance has no minutes', () => {
    const noMin = card(logged([{ id: 'run', sets: [{ km: 3 }] }], { minutes: 25 }));
    expect(noMin.hero?.value).toBe('3 km');
    expect(pairs(noMin)).toEqual([['Time', '25 min']]);
    expect(noMin.text).toBe('Workout: 3 km, 25 min. +123 XP. Levl, E-Rank Hunter.');
  });

  it('falls back to the cardio minutes when the workout has no length', () => {
    const intervals = card(logged([{ id: 'runwalk', sets: [{ on: 1, off: 1.5 }, { on: 1, off: 1.5 }] }], { minutes: null }));
    expect(intervals.hero).toEqual({ key: 'time', label: 'Time', value: '5 min' });
    expect(intervals.text).toBe('Workout: 5 min. +123 XP. Levl, E-Rank Hunter.');
    expect(intervals.stats).toEqual([]);
    expect(intervals.muscles).toBeNull();
  });
});

describe('the whole card', () => {
  const long = logged([{ id: 'db-bench', sets: [{ kg: 20, reps: 10 }] }], { title: 'Upper Body Power and Conditioning Day' });

  it('fits a long title on one line and keeps the full one', () => {
    const made = card(long);
    expect(made.fullTitle).toBe('Upper Body Power and Conditioning Day');
    expect(made.title).toBe('Upper Body Power and…');
    expect(made.titleSize).toBe(64);
    expect(made.text.startsWith('Upper Body Power and Conditioning Day: ')).toBe(true);
  });

  it('gives a workout with no title a name for the card, the text and the file', () => {
    const made = card({ ...long, title: '  ' });
    expect(made).toMatchObject({ title: 'Workout', titleSize: 88, fullTitle: '  ', fileName: 'levl-workout-2026-10-10.png' });
    expect(made.text.startsWith('Workout: ')).toBe(true);
  });

  it('shows the rank title of the rank it is given', () => {
    const made = shareCardData({ workout: long, lookup: exerciseById, units: KG, rank: 'S', level: 31, now: NOW });
    expect(made).toMatchObject({ rank: 'S', level: 31, rankTitle: 'S-Rank Hunter' });
    expect(made.text.endsWith('Levl, S-Rank Hunter.')).toBe(true);
  });

  it('adds the year to the date only when it is not this year', () => {
    expect(card(long).dateLabel).toBe('Sat 10 Oct · 6:05 pm');
    expect(shareCardData({ workout: long, lookup: exerciseById, units: KG, rank: 'E', level: 4, now: new Date('2027-01-05T12:00:00') }).dateLabel).toBe('Sat 10 Oct 2026 · 6:05 pm');
  });

  it('is the same card every time', () => {
    const w = strength();
    expect(card(w)).toEqual(card(w));
  });

  it('never writes an em dash, in any text of any card', () => {
    const strings = (v: unknown): string[] => (typeof v === 'string' ? [v] : Array.isArray(v) ? v.flatMap(strings) : v && typeof v === 'object' ? Object.values(v).flatMap(strings) : []);
    const cards = [
      card(strength()),
      card(strength(), { weight: 'lb', distance: 'mi' }),
      card(long),
      card(logged([{ id: 'pushup', sets: [{ reps: 10 }] }], { minutes: null })),
      card(logged([{ id: 'db-bench', sets: [{ kg: 20, reps: 10 }] }, { id: 'run', sets: [{ min: 12, km: 2.1 }] }])),
      card(logged([{ id: 'run', sets: [{ min: 31, km: 5.2 }] }], { minutes: 31 })),
      card(logged([{ id: 'cycle', sets: [{ min: 46, km: 18.4 }] }], { minutes: 46 })),
      card(logged([{ id: 'elliptical', sets: [{ min: 20 }] }])),
      card(logged([{ id: 'runwalk', sets: [{ on: 1, off: 1 }] }], { minutes: null })),
      card({ ...long, title: '' }),
    ];
    for (const c of cards) {
      const all = strings(c);
      expect(all.length).toBeGreaterThan(5);
      for (const s of all) expect(s.includes(EM_DASH), s).toBe(false);
    }
  });
});
