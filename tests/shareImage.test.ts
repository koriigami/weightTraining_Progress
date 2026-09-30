import { describe, expect, it } from 'vitest';
import { buildFontCss, finalizeSvg, SHARE_WITH_TEXT } from '../lib/shareImage';

const EM_DASH = String.fromCharCode(0x2014);
const LILITA = 'data:font/woff2;base64,AAAA+/1=';
const FIGTREE = 'data:font/woff2;base64,BBBB+/2=';
const CSS = '.x{fill:red}';
const NS = 'xmlns="http://www.w3.org/2000/svg"';

describe('buildFontCss', () => {
  const css = buildFontCss(LILITA, FIGTREE);

  it('declares both families by the names the card uses', () => {
    expect(css).toContain("font-family:'Levl Display'");
    expect(css).toContain("font-family:'Levl Body'");
    expect(css.match(/@font-face/g)).toHaveLength(2);
  });

  it('inlines each font file as a woff2 data uri, each under its own family', () => {
    const [display, body] = css.split('@font-face').slice(1);
    expect(display).toContain(LILITA);
    expect(display).not.toContain(FIGTREE);
    expect(body).toContain(FIGTREE);
    expect(body).not.toContain(LILITA);
    expect(css.match(/format\('woff2'\)/g)).toHaveLength(2);
  });

  it('gives Figtree the whole weight range, and Lilita One none (it has one weight)', () => {
    const [display, body] = css.split('@font-face').slice(1);
    expect(body).toContain('font-weight:300 900');
    expect(display).not.toContain('font-weight');
  });
});

describe('finalizeSvg', () => {
  const inner = '<rect width="1080" height="1350" stroke-width="3"/><text x="10">Hi &amp; bye</text></svg>';

  it('puts the style right after the root tag', () => {
    const out = finalizeSvg(`<svg viewBox="0 0 10 10" ${NS} width="1" height="2">${inner}`, CSS, 1080, 1350);
    expect(out).toContain(`height="1350"><style>${CSS}</style><rect`);
    expect(out.match(/<style>/g)).toHaveLength(1);
  });

  it('adds the namespace, width and height when they are missing', () => {
    const out = finalizeSvg(`<svg viewBox="0 0 10 10">${inner}`, CSS, 1080, 1350);
    const root = out.slice(0, out.indexOf('>') + 1);
    expect(root).toContain(NS);
    expect(root).toContain('width="1080"');
    expect(root).toContain('height="1350"');
    expect(root).toContain('viewBox="0 0 10 10"');
  });

  it('replaces them when they are there, and does not repeat them', () => {
    const out = finalizeSvg(`<svg xmlns='http://www.w3.org/2000/svg' width="100%" height='auto' viewBox="0 0 10 10">${inner}`, CSS, 1080, 1350);
    const root = out.slice(0, out.indexOf('>') + 1);
    expect(root.match(/xmlns=/g)).toHaveLength(1);
    expect(root.match(/ width=/g)).toHaveLength(1);
    expect(root.match(/ height=/g)).toHaveLength(1);
    expect(root).toContain('width="1080"');
    expect(root).toContain('height="1350"');
    expect(root).not.toContain('100%');
    expect(root).not.toContain('auto');
  });

  it('leaves the rest of the markup untouched, stroke-width included', () => {
    const out = finalizeSvg(`<svg viewBox="0 0 10 10" ${NS}>${inner}`, CSS, 1080, 1350);
    expect(out.endsWith(`<style>${CSS}</style>${inner}`)).toBe(true);
    expect(out).toContain('stroke-width="3"');
  });

  it('only touches the root: a nested svg keeps its own size', () => {
    const nested = '<svg width="5" height="6"><rect/></svg></svg>';
    const out = finalizeSvg(`<svg ${NS} width="1" height="2">${nested}`, CSS, 1080, 1350);
    expect(out.endsWith(`<style>${CSS}</style>${nested}`)).toBe(true);
  });

  it('finds the root when an attribute value holds a ">"', () => {
    const out = finalizeSvg(`<svg aria-label="a > b" ${NS}>${inner}`, CSS, 1080, 1350);
    expect(out).toContain(`height="1350"><style>${CSS}</style><rect`);
    expect(out).toContain('aria-label="a > b"');
  });

  it('keeps anything before the root (an xml declaration)', () => {
    const out = finalizeSvg(`<?xml version="1.0"?>\n<svg ${NS}>${inner}`, CSS, 1080, 1350);
    expect(out.startsWith('<?xml version="1.0"?>\n<svg ')).toBe(true);
    expect(out).toContain(`<style>${CSS}</style><rect`);
  });

  it('gives a root that closes itself a style of its own', () => {
    const out = finalizeSvg(`<svg ${NS}/>`, CSS, 1080, 1350);
    expect(out).toBe(`<svg ${NS} width="1080" height="1350"><style>${CSS}</style></svg>`);
  });

  it('returns text with no svg in it as it is', () => {
    expect(finalizeSvg('hello', CSS, 1080, 1350)).toBe('hello');
  });
});

describe('shareImage module', () => {
  it('shares the picture only', () => {
    expect(SHARE_WITH_TEXT).toBe(false);
  });

  it('has no em dash in the font css or the markup it builds', () => {
    const out = finalizeSvg('<svg></svg>', buildFontCss(LILITA, FIGTREE), 1080, 1350);
    expect(out).not.toContain(EM_DASH);
  });
});
