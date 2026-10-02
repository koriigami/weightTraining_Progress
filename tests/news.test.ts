// The update list behind What's new: which updates a person has not seen yet, and
// what closing one does.
import { existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { MAX_NEWS_PAGES, NEWS, advanceNewsSeen, closesRulesUpdate, latestNewsId, unseenEntries, unseenPages } from '../lib/news';
import type { NewsEntry } from '../lib/news';

// A made-up list, newest first: 2026-12 (2 pages), 2026-11 (3 pages, one about the rules), 2026-10 (2 pages).
const page = (title: string, rules = false) => ({ title, text: `${title} text`, image: `/news/${title}.jpg`, ...(rules ? { rules: true } : {}) });
const entry = (id: string, label: string, pages: ReturnType<typeof page>[]): NewsEntry => ({ id, date: `${id}-01`, label, pages });
const LIST: NewsEntry[] = [
  entry('2026-12', 'December 2026', [page('d1'), page('d2')]),
  entry('2026-11', 'November 2026', [page('n1'), page('n2', true), page('n3')]),
  entry('2026-10', 'October 2026', [page('o1'), page('o2')]),
];
const titles = (pages: { title: string }[]) => pages.map((p) => p.title);

describe('the real update list', () => {
  it('starts with October 2026: four pages, and only the goal bonus page is about the rules', () => {
    expect(NEWS[0]).toMatchObject({ id: '2026-10', date: '2026-10-02', label: 'October 2026' });
    expect(titles(NEWS[0].pages)).toEqual(['Laps for runners', 'Log a workout you already did', 'How did it feel?', 'Your goal bonus grows']);
    expect(NEWS[0].pages.map((p) => p.rules === true)).toEqual([false, false, false, true]);
  });

  it('is newest first with ids that are not repeated, so adding an update at the top works', () => {
    const dates = NEWS.map((e) => e.date);
    expect(dates).toEqual([...dates].sort().reverse());
    expect(new Set(NEWS.map((e) => e.id)).size).toBe(NEWS.length);
    expect(latestNewsId()).toBe(NEWS[0].id);
  });

  it('has every picture in public/', () => {
    for (const p of NEWS.flatMap((e) => e.pages)) expect(existsSync(new URL(`../public${p.image}`, import.meta.url)), p.image).toBe(true);
  });
});

describe('unseenEntries', () => {
  it('counts every update as unseen when nothing is remembered, or the id is not in the list', () => {
    expect(unseenEntries(undefined, LIST).map((e) => e.id)).toEqual(['2026-12', '2026-11', '2026-10']);
    expect(unseenEntries('2019-01', LIST).map((e) => e.id)).toEqual(['2026-12', '2026-11', '2026-10']);
  });

  it('keeps only the updates newer than the one seen', () => {
    expect(unseenEntries('2026-10', LIST).map((e) => e.id)).toEqual(['2026-12', '2026-11']);
    expect(unseenEntries('2026-11', LIST).map((e) => e.id)).toEqual(['2026-12']);
  });

  it('has nothing unseen once the newest is seen', () => {
    expect(unseenEntries('2026-12', LIST)).toEqual([]);
    expect(unseenEntries(latestNewsId())).toEqual([]);
  });
});

describe('unseenPages', () => {
  it('gives every page of the real update to someone who has seen nothing', () => {
    expect(titles(unseenPages(undefined))).toEqual(titles(NEWS[0].pages));
  });

  it('gives nothing when the newest update is seen', () => {
    expect(unseenPages(latestNewsId())).toEqual([]);
    expect(unseenPages('2026-12', LIST)).toEqual([]);
  });

  it('gives only the updates after an older one that was seen, newest update first', () => {
    expect(titles(unseenPages('2026-11', LIST))).toEqual(['d1', 'd2']);
    expect(titles(unseenPages('2026-10', LIST))).toEqual(['d1', 'd2', 'n1', 'n2', 'n3']);
  });

  it('stops at five pages, newest first', () => {
    expect(MAX_NEWS_PAGES).toBe(5);
    expect(titles(unseenPages(undefined, LIST))).toEqual(['d1', 'd2', 'n1', 'n2', 'n3']); // o1 and o2 do not fit
  });

  it('says which update each page is from, and keeps the rules tag', () => {
    const pages = unseenPages('2026-10', LIST);
    expect(pages.map((p) => p.entryId)).toEqual(['2026-12', '2026-12', '2026-11', '2026-11', '2026-11']);
    expect([pages[0].label, pages[2].label]).toEqual(['December 2026', 'November 2026']);
    expect(pages.find((p) => p.title === 'n2')?.rules).toBe(true);
  });
});

describe('advanceNewsSeen', () => {
  it('moves forward to the update that was closed', () => {
    expect(advanceNewsSeen(undefined, '2026-11', LIST)).toBe('2026-11');
    expect(advanceNewsSeen('2026-10', '2026-12', LIST)).toBe('2026-12');
  });

  it('never moves back to an older update, and stays on the same one', () => {
    expect(advanceNewsSeen('2026-12', '2026-10', LIST)).toBe('2026-12');
    expect(advanceNewsSeen('2026-11', '2026-11', LIST)).toBe('2026-11');
  });
});

describe('closesRulesUpdate', () => {
  it('is true when the update closed has a rules page', () => {
    expect(closesRulesUpdate('2026-10', '2026-11', LIST)).toBe(true);
  });

  it('is false for an update with no rules page', () => {
    expect(closesRulesUpdate('2026-11', '2026-12', LIST)).toBe(false);
    expect(closesRulesUpdate(undefined, '2026-10', LIST)).toBe(false);
  });

  it('counts an older unseen update that has a rules page when a newer one is closed', () => {
    expect(closesRulesUpdate('2026-10', '2026-12', LIST)).toBe(true);
  });

  it('is false for an update that was seen before, or one that is not in the list', () => {
    expect(closesRulesUpdate('2026-12', '2026-11', LIST)).toBe(false);
    expect(closesRulesUpdate(undefined, '2030-01', LIST)).toBe(false);
  });
});
