import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { RankShield, RankShieldArt } from '../components/RankShield';
import { BodyShapes, BodySvg } from '../components/ui/MuscleMap';

const html = (el: ReturnType<typeof createElement>): string => renderToStaticMarkup(el);
const fill = () => '#123456';

describe('RankShield', () => {
  it('still draws the letter and the level in the app font, in the same svg', () => {
    const m = html(createElement(RankShield, { rank: 'E', level: 4 }));
    expect(m).toMatch(/^<svg viewBox="0 0 120 132" width="96" height="96" role="img" aria-label="E-Rank Hunter, level 4"/);
    expect(m).toContain('>E</text>');
    expect(m).toContain('>LV 4</text>');
    expect(m).toContain('font-size="54"');
    expect(m).toContain('var(--font-display, &#x27;Arial Rounded MT Bold&#x27;)');
  });

  it('draws a bigger letter and no level without one', () => {
    const m = html(createElement(RankShield, { rank: 'B' }));
    expect(m).toContain('aria-label="B-Rank Hunter"');
    expect(m).toContain('font-size="60"');
    expect(m).not.toContain('LV');
  });

  it('keeps its ids safe, unique and pointing at something, whatever useId returns', () => {
    const m = html(createElement('div', null, createElement(RankShield, { rank: 'S', level: 9 }), createElement(RankShield, { rank: 'C', level: 2 })));
    const ids = [...m.matchAll(/\sid="([^"]*)"/g)].map((x) => x[1]);
    expect(ids).toHaveLength(2 * 4 + 1); // a, f, c, t for each, and the glow of the S rank
    for (const id of ids) expect(id).toMatch(/^shield-[A-Za-z0-9_-]+-[afcgt]$/);
    expect(new Set(ids).size).toBe(ids.length);
    for (const r of [...m.matchAll(/url\(#([^)]*)\)/g)].map((x) => x[1])) expect(ids).toContain(r);
  });
});

describe('RankShieldArt', () => {
  it('is a <g> with the defs, the shapes and the ids of its prefix', () => {
    const m = html(createElement('svg', null, createElement(RankShieldArt, { rank: 'S', level: 31, idPrefix: 'p', fontFamily: 'Foo' })));
    expect(m).toMatch(/^<svg><g><defs>/);
    for (const id of ['p-a', 'p-f', 'p-c', 'p-g', 'p-t']) expect(m).toContain(`id="${id}"`);
    expect(m).toContain('font-family="Foo"');
    expect(m).not.toContain('var(');
    expect(m).toContain('>S</text>');
    expect(m).toContain('>LV 31</text>');
  });

  it('has no glow filter below S rank', () => {
    const m = html(createElement('svg', null, createElement(RankShieldArt, { rank: 'A', level: 20, idPrefix: 'p', fontFamily: 'Foo' })));
    expect(m).not.toContain('id="p-g"');
  });
});

describe('BodySvg and BodyShapes', () => {
  it('BodySvg still draws with the app colours by default', () => {
    const m = html(createElement(BodySvg, { view: 'front', fillFor: fill, label: 'Front muscles' }));
    expect(m).toMatch(/^<svg viewBox="0 0 100 200" width="100" height="200" role="img" aria-label="Front muscles"/);
    expect(m).toContain('fill="var(--skin)"');
    expect(m).toContain('stroke="var(--bodyline, var(--surface))"');
    expect(m).toContain('stroke-width="1.2"');
    expect(m).toContain('fill="#123456"');
    expect(m).toContain('transform="matrix(-1 0 0 1 100 0)"');
  });

  it('BodySvg is hidden from screen readers without a label', () => {
    expect(html(createElement(BodySvg, { view: 'back', fillFor: fill }))).toContain('aria-hidden="true"');
  });

  it('draws the same shapes for BodySvg and for BodyShapes in a <g>', () => {
    for (const view of ['front', 'back'] as const) {
      const inner = html(createElement(BodySvg, { view, fillFor: fill })).replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '');
      expect(inner).toBe(html(createElement(BodyShapes, { view, fillFor: fill })));
      expect(inner).toMatch(/^<g><path d="M31 34/);
    }
  });

  it('BodyShapes takes literal colours and a line width', () => {
    const m = html(createElement(BodyShapes, { view: 'back', fillFor: fill, skin: '#f5ead1', line: '#fffdf6', strokeWidth: 2 }));
    expect(m).not.toContain('var(');
    expect(m).toContain('fill="#f5ead1"');
    expect(m).toContain('stroke="#fffdf6"');
    expect(m).toContain('stroke-width="2"');
    expect(m).not.toContain('stroke-width="1.2"');
  });

  it('has the same number of shapes in both views as before (base, left twice, centre)', () => {
    const count = (view: 'front' | 'back') => (html(createElement(BodyShapes, { view, fillFor: fill })).match(/<(path|ellipse|circle|rect) /g) ?? []).length;
    expect(count('front')).toBe(1 + 10 * 2 + 9);
    expect(count('back')).toBe(1 + 12 * 2 + 4);
  });
});
