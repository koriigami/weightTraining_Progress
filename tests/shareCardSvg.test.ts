import { readFileSync, existsSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { CARD, CARD_H, CARD_W, DATE_KEEP_OUT, FONT_BODY, FONT_DISPLAY } from '../components/share/cardTheme';
import { ShareCardSvg } from '../components/share/ShareCardSvg';
import { exerciseById } from '../data/exercises';
import { shareCardData } from '../lib/shareCard';
import { skyClouds } from '../lib/sky';
import type { ShareCard } from '../lib/shareCard';
import type { WorkoutLog } from '../lib/routines';
import { workout } from './helpers';

const NOW = new Date('2026-10-12T12:00:00');
const KG = { weight: 'kg' as const, distance: 'km' as const };

// A workout with a set length: 45 minutes unless told otherwise.
function logged(items: Parameters<typeof workout>[1], over: Partial<WorkoutLog> & { minutes?: number | null } = {}): WorkoutLog {
  const { minutes = 45, ...rest } = over;
  const finishedAt = minutes === null ? '' : new Date(Date.parse('2026-10-10T07:00:00.000Z') + minutes * 60000).toISOString();
  return workout('2026-10-10', items, { when: '2026-10-10T18:05', startedAt: '2026-10-10T07:00:00.000Z', finishedAt, xp: 123, ...rest });
}

function card(w: WorkoutLog, rank: ShareCard['rank'] = 'E', level = 4): ShareCard {
  return shareCardData({ workout: w, lookup: exerciseById, units: KG, rank, level, now: NOW });
}

const svg = (c: ShareCard, roll = 0, idPrefix?: string): string => renderToStaticMarkup(createElement(ShareCardSvg, { card: c, roll, idPrefix }));

// Bench, rows and curls: seven muscles, so three chips and "+4 more muscles".
const strength = (title = 'Push A') =>
  logged(
    [
      { id: 'db-bench', sets: [{ kg: 20, reps: 10 }, { kg: 20, reps: 10 }, { kg: 20, reps: 10 }] },
      { id: 'db-row', sets: [{ kg: 10, reps: 10 }, { kg: 10, reps: 10 }, { kg: 10, reps: 10 }] },
      { id: 'db-curl', sets: [{ kg: 5, reps: 8 }, { kg: 5, reps: 8 }] },
    ],
    { title }
  );
// Curls alone: two muscles, so no "+N more" line.
const fewMuscles = () => logged([{ id: 'db-curl', sets: [{ kg: 5, reps: 8 }, { kg: 5, reps: 8 }] }], { title: 'Arms' });
const mixed = () => logged([{ id: 'bb-squat', sets: [{ kg: 60, reps: 8 }, { kg: 60, reps: 8 }] }, { id: 'run', sets: [{ min: 12, km: 2.1 }] }], { title: 'Legs and a Jog' });
const run = () => logged([{ id: 'run', sets: [{ min: 31, km: 5.2 }] }], { title: 'Morning Run', minutes: 31, xp: 46 });
const timeOnly = () => logged([{ id: 'run', sets: [{ min: 30 }] }], { title: 'Treadmill', minutes: 30 });
const nothingTicked = () => logged([{ id: 'db-bench', sets: [{ kg: 20, reps: 10 }], undone: [0] }], { title: 'Skipped' });

const cards: Record<string, ShareCard> = {
  strength: card(strength()),
  fewMuscles: card(fewMuscles()),
  mixed: card(mixed(), 'D', 7),
  run: card(run()),
  timeOnly: card(timeOnly()),
  nothingTicked: card(nothingTicked()),
  sRank: card(strength(), 'S', 31),
  long: card(strength('Upper Body Power and Conditioning Day'), 'C', 12),
};

const ids = (markup: string): string[] => [...markup.matchAll(/\sid="([^"]*)"/g)].map((m) => m[1]);
const sky = (markup: string): string => /<g data-part="sky">([\s\S]*?)<\/g><rect/.exec(markup)?.[1] ?? '';

describe('the card SVG root', () => {
  it('is 1080 x 1350, with width and height attributes for browsers that need them to rasterise', () => {
    const markup = svg(cards.strength);
    expect(markup).toMatch(/^<svg /);
    expect(markup).toContain('xmlns="http://www.w3.org/2000/svg"');
    expect(markup).toContain('viewBox="0 0 1080 1350"');
    expect(markup).toMatch(/^<svg [^>]*\bwidth="1080"/);
    expect(markup).toMatch(/^<svg [^>]*\bheight="1350"/);
    expect([CARD_W, CARD_H]).toEqual([1080, 1350]);
  });

  it('names the workout for screen readers', () => {
    expect(svg(cards.strength)).toContain('role="img" aria-label="Push A workout card"');
    expect(svg(card(strength('')))).toContain('aria-label="Workout workout card"');
  });

  it('puts a long title on one line, and the workout\'s own name in the label', () => {
    const markup = svg(cards.long);
    expect(markup).toContain('Upper Body Power and…');
    expect(markup).toContain('aria-label="Upper Body Power and Conditioning Day workout card"');
  });
});

describe('what an exported picture can hold', () => {
  for (const [name, c] of Object.entries(cards)) {
    it(`${name}: no CSS variables, currentColor, foreignObject, image, link or external URL`, () => {
      const markup = svg(c);
      expect(markup).not.toContain('var(');
      expect(markup).not.toContain('currentColor');
      expect(markup).not.toMatch(/foreignObject/i);
      expect(markup).not.toContain('<image');
      expect(markup).not.toContain('href');
      expect(markup.match(/http/g)).toHaveLength(1);
      expect(markup).toContain('xmlns="http://www.w3.org/2000/svg"');
    });

    it(`${name}: every id is safe and unique, and every url(#id) points at one`, () => {
      const markup = svg(c);
      const found = ids(markup);
      expect(found.length).toBeGreaterThan(8);
      for (const id of found) expect(id).toMatch(/^[A-Za-z0-9_-]+$/);
      expect(new Set(found).size).toBe(found.length);
      const refs = [...markup.matchAll(/url\(#([^)]*)\)/g)].map((m) => m[1]);
      expect(refs.length).toBeGreaterThan(8);
      for (const ref of refs) expect(found, ref).toContain(ref);
    });
  }

  it('starts every id with the prefix, so two cards on one page do not clash', () => {
    const a = ids(svg(cards.strength, 0, 'one'));
    const b = ids(svg(cards.strength, 0, 'two'));
    expect(a.every((id) => id.startsWith('one-'))).toBe(true);
    expect(b.every((id) => id.startsWith('two-'))).toBe(true);
    expect(a.map((id) => id.slice(4))).toEqual(b.map((id) => id.slice(4)));
    expect(ids(svg(cards.strength)).every((id) => id.startsWith('lvc-'))).toBe(true);
  });

  it('draws with the two card fonts and the literal colours', () => {
    const markup = svg(cards.strength);
    // React writes the apostrophes of a font list as &#x27;.
    const attr = (s: string) => s.replace(/'/g, '&#x27;');
    expect(markup).toContain(`font-family="${attr(FONT_DISPLAY)}"`);
    expect(markup).toContain(`font-family="${attr(FONT_BODY)}"`);
    for (const c of [CARD.frame, CARD.stroke, CARD.xp, CARD.cream, CARD.ink, CARD.muted, CARD.bevel, CARD.okSoft, CARD.hi, CARD.sec, CARD.muscle, CARD.skin, CARD.bodyline]) expect(markup).toContain(c);
  });
});

describe('escaping', () => {
  it('escapes a title with & and <', () => {
    const c = card(strength('Chest & <Back> "Day"'));
    const markup = svg(c);
    expect(markup).toContain('Chest &amp; &lt;Back&gt; &quot;Day&quot;');
    expect(markup).not.toContain('<Back>');
    expect(markup).not.toContain('Chest & ');
    expect(markup).toContain('aria-label="Chest &amp; &lt;Back&gt; &quot;Day&quot; workout card"');
  });
});

describe('a strength card', () => {
  const markup = svg(cards.strength);

  it('has the parts: sky, body, stats and xp, in that order', () => {
    const parts = [...markup.matchAll(/data-part="(\w+)"/g)].map((m) => m[1]);
    expect(parts).toEqual(['sky', 'stats', 'body', 'xp']);
  });

  it('shows the front and back body with the two-tone colours', () => {
    const body = /<g data-part="body">([\s\S]*)<\/g><rect x="106"/.exec(markup)?.[1] ?? '';
    expect(body).toContain('translate(139 386) scale(1.8)');
    expect(body).toContain('translate(341 386) scale(1.8)');
    expect(body).toContain(`fill="${CARD.hi}"`); // chest, upper back and biceps
    expect(body).toContain(`fill="${CARD.sec}"`); // triceps, shoulders, lats, forearms
    expect(body).toContain(`fill="${CARD.muscle}"`);
    expect(body).toContain(`fill="${CARD.skin}"`);
    expect(body).toContain(`stroke="${CARD.bodyline}"`);
  });

  it('shows three chips and "+4 more muscles"', () => {
    expect(markup.match(/ rx="39"/g)).toHaveLength(3);
    for (const t of ['>Biceps<', '>Chest<', '>Upper back<', '>3.5 sets<', '>3 sets<']) expect(markup).toContain(t);
    expect(markup).toContain('>+4 more muscles<');
    expect(markup).toContain('y="1072"');
  });

  it('stacks Sets, Time and Volume on the right, with the XP under', () => {
    for (const t of ['>SETS<', '>8<', '>TIME<', '>45 min<', '>VOLUME<', '>980 kg<']) expect(markup).toContain(t);
    expect(markup).toContain('>+123 XP<');
    expect(markup).toContain(`fill="${CARD.xp}"`);
    expect(markup.match(/<rect x="610" /g)).toHaveLength(6); // three plaques, each a tan edge and a cream face
    expect(markup).toContain('<rect x="610" y="360" width="390" height="229.33333333333334" rx="30" fill="#fff8e8">');
  });

  it('has the rank shield with its letter and level, and the title at x 236', () => {
    expect(markup).toContain('>E</text>');
    expect(markup).toContain('>LV 4</text>');
    expect(markup).toMatch(/<text x="236" y="[\d.]+" text-anchor="start"[^>]*font-size="88"[^>]*>Push A<\/text>/);
    expect(markup).toContain('translate(78 150) scale(1.12)');
  });

  it('draws the game text as a navy drop copy and then the face', () => {
    const drops = [...markup.matchAll(/<text [^>]*fill="#0e3a7a"[^>]*transform="translate\(0 ([\d.]+)\)">([^<]*)<\/text>/g)];
    expect(drops.map((m) => m[2])).toEqual(['Levl', 'Push A', '+123 XP']);
    expect(drops.map((m) => m[1])).toEqual(['3.5', '7.0', '10.6']);
    expect(markup).toContain('stroke-linejoin="round"');
    expect(markup).toContain('paint-order="stroke"');
  });

  it('puts the mark, "Levl" and the date on one centre line', () => {
    expect(markup).toContain('translate(76 58.4) scale(.58)');
    expect(markup).toMatch(/<text x="160" y="109\.[78]"[^>]*>Levl<\/text>/);
    expect(markup).toMatch(/<text x="1004" y="103\.4" text-anchor="end"[^>]*>Sat 10 Oct · 6:05 pm<\/text>/);
  });

  it('has no "+N more" line with three or fewer muscles', () => {
    const few = svg(cards.fewMuscles);
    expect(cards.fewMuscles.muscles?.moreCount).toBe(0);
    expect(few).toContain('data-part="body"');
    expect(few).not.toContain('more muscle');
    expect(few).not.toContain('+0');
  });

  it('says "+1 more muscle" for one', () => {
    const c = cards.strength;
    const one = svg({ ...c, muscles: c.muscles && { ...c.muscles, moreCount: 1 } });
    expect(one).toContain('>+1 more muscle<');
    expect(one).not.toContain('muscles<');
  });

  it('lays four plaques out for a mixed card, with the body', () => {
    const m = svg(cards.mixed);
    expect(m).toContain('data-part="body"');
    for (const t of ['>SETS<', '>TIME<', '>VOLUME<', '>DISTANCE<', '>2.1 km<', '>Quads<']) expect(m).toContain(t);
    expect(m.match(/<rect x="610" /g)).toHaveLength(8); // four plaques
    expect(m).toContain('>D</text>');
    expect(m).toContain('>LV 7</text>');
  });

  it('gives an S rank shield its glow filter', () => {
    const s = svg(cards.sRank);
    expect(s).toContain('>S</text>');
    expect(s).toContain('id="lvc-s-g"');
    expect(markup).not.toContain('id="lvc-s-g"');
  });

  it('draws the clouds of skyClouds, none of them behind the date', () => {
    const clouds = skyClouds(`${cards.strength.seedBase}#0`, { width: CARD_W, height: CARD_H, count: 16, keepOut: [DATE_KEEP_OUT] });
    expect(clouds).toHaveLength(16);
    expect(sky(markup).match(/<g transform=/g)).toHaveLength(clouds.length);
    for (const { box } of clouds) expect(box.x < DATE_KEEP_OUT.x + DATE_KEEP_OUT.w && DATE_KEEP_OUT.x < box.x + box.w && box.y < DATE_KEEP_OUT.y + DATE_KEEP_OUT.h && DATE_KEEP_OUT.y < box.y + box.h).toBe(false);
  });
});

describe('a cardio card', () => {
  const markup = svg(cards.run);

  it('has no body, and the same parts otherwise', () => {
    expect(markup).not.toContain('data-part="body"');
    expect([...markup.matchAll(/data-part="(\w+)"/g)].map((m) => m[1])).toEqual(['sky', 'stats', 'xp']);
    expect(markup).not.toContain('more muscle');
  });

  it('shows the distance big, then Time and Pace in a row', () => {
    for (const t of ['>DISTANCE<', '>5.2 km<', '>TIME<', '>31 min<', '>PACE<', '>5:58 /km<', '>+46 XP<']) expect(markup).toContain(t);
    expect(markup).toContain('<rect x="80" y="360" width="920" height="430" rx="36"');
    expect(markup).toContain('<text x="540" y="440.0" text-anchor="middle"'); // the label, as on the board
    expect(markup).toContain('<rect x="80" y="824" width="448" height="276" rx="30"');
    expect(markup).toContain('<rect x="552" y="824" width="448" height="276" rx="30"');
  });

  it('gives a run with no distance one plaque the whole height', () => {
    const t = svg(cards.timeOnly);
    expect(cards.timeOnly.hero?.label).toBe('Time');
    expect(cards.timeOnly.stats).toEqual([]);
    expect(t).toContain('<rect x="80" y="360" width="920" height="740" rx="36"');
    expect(t).toContain('>TIME<');
    expect(t).toContain('>30 min<');
    expect(t).not.toContain('data-part="body"');
  });

  it('still draws a card when there is no hero and no muscles (nothing ticked)', () => {
    const n = svg(cards.nothingTicked);
    expect(cards.nothingTicked.hero).toBeNull();
    expect(cards.nothingTicked.muscles).toBeNull();
    expect(n).not.toContain('data-part="body"');
    for (const t of ['>SETS<', '>0<', '>TIME<', '>+123 XP<']) expect(n).toContain(t);
  });

  it('draws nothing in the middle, and does not throw, for a card with nothing to show', () => {
    const empty = svg({ ...cards.run, hero: null, stats: [] });
    expect(empty).toContain('<g data-part="stats"></g>');
    expect(empty).toContain('>+46 XP<');
  });

  it('shrinks a long value to fit its plaque', () => {
    const long = svg({ ...cards.run, hero: { key: 'distance', label: 'Distance', value: '1,234.56 km' } });
    const size = Number(/font-size="(\d+)"[^>]*>1,234\.56 km</.exec(long)?.[1]);
    expect(size).toBeGreaterThan(100);
    expect(size).toBeLessThan(200);
  });
});

describe('the sky', () => {
  it('is the same for the same card and roll', () => {
    expect(svg(cards.strength, 0)).toBe(svg(cards.strength, 0));
    expect(svg(cards.run, 3)).toBe(svg(cards.run, 3));
  });

  it('changes with the roll, and nothing else does', () => {
    const a = svg(cards.strength, 0);
    const b = svg(cards.strength, 1);
    expect(sky(a).length).toBeGreaterThan(500);
    expect(sky(a)).not.toBe(sky(b));
    expect(a.replace(sky(a), '')).toBe(b.replace(sky(b), ''));
  });

  it('follows the workout', () => {
    expect(sky(svg(cards.strength))).not.toBe(sky(svg(cards.run)));
  });

  it('sits between the sky gradient and the glow', () => {
    const markup = svg(cards.strength);
    const at = (s: string) => markup.indexOf(s);
    expect(at('fill="url(#lvc-sky)"')).toBeLessThan(at('data-part="sky"'));
    expect(at('data-part="sky"')).toBeLessThan(at('fill="url(#lvc-glow)"'));
    expect(at('fill="url(#lvc-glow)"')).toBeLessThan(at('stroke="#f5c542"'));
  });
});

describe('the theme', () => {
  const css = readFileSync(new URL('../app/globals.css', import.meta.url), 'utf8');
  const token = (name: string): string => new RegExp(`${name}:\\s*(#[0-9a-fA-F]{6})\\s*;`).exec(css)?.[1]?.toLowerCase() ?? '';

  it('copies the globals.css tokens, so the picture matches the app', () => {
    const pairs: [keyof typeof CARD, string][] = [
      ['hi', '--hi'],
      ['sec', '--sec'],
      ['muscle', '--muscle'],
      ['skin', '--skin'],
      ['bodyline', '--bodyline'],
      ['ink', '--ink'],
      ['muted', '--muted'],
      ['cream', '--surface'],
      ['okSoft', '--ok-soft'],
      ['xp', '--xp-hi'],
      ['stroke', '--hero-stroke'],
    ];
    for (const [key, name] of pairs) expect(CARD[key].toLowerCase(), `${key} is ${name}`).toBe(token(name));
  });

  it('has a sky that is the --hero gradient', () => {
    const hero = /--hero:\s*linear-gradient\(([^)]*)\)/.exec(css)?.[1] ?? '';
    for (const c of [CARD.skyTop, CARD.skyMid, CARD.skyBottom]) expect(hero.toLowerCase()).toContain(c);
  });

  it('names fonts that globals.css declares, and ships the files', () => {
    expect(css).toMatch(/@font-face\s*{[^}]*font-family:\s*'Levl Display';[^}]*\/fonts\/lilita\.woff2[^}]*font-display:\s*block/);
    expect(css).toMatch(/@font-face\s*{[^}]*font-family:\s*'Levl Body';[^}]*\/fonts\/figtree\.woff2[^}]*font-weight:\s*300 900[^}]*font-display:\s*block/);
    expect(FONT_DISPLAY.startsWith("'Levl Display'")).toBe(true);
    expect(FONT_BODY.startsWith("'Levl Body'")).toBe(true);
    for (const f of ['lilita.woff2', 'figtree.woff2', 'OFL.txt']) expect(existsSync(new URL(`../public/fonts/${f}`, import.meta.url)), f).toBe(true);
  });

  it('keeps the date rectangle where the top bar draws it', () => {
    expect(DATE_KEEP_OUT).toEqual({ x: 560, y: 56, w: 470, h: 70 });
  });
});
