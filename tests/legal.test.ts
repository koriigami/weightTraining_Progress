import { describe, expect, it } from 'vitest';
import { isPublicPath } from '@/lib/legal';
import sitemap from '@/app/sitemap';

describe('public legal pages', () => {
  it('treats /privacy and /terms as public, with or without a trailing slash', () => {
    expect(isPublicPath('/privacy')).toBe(true);
    expect(isPublicPath('/terms/')).toBe(true);
  });

  it('keeps every app page behind sign-in', () => {
    for (const p of ['/', '/routines', '/profile', '/settings', '/privacy-extra', '/insights']) {
      expect(isPublicPath(p)).toBe(false);
    }
  });

  it('lists both pages in the sitemap', () => {
    const urls = sitemap().map((e) => new URL(e.url).pathname);
    expect(urls).toEqual(expect.arrayContaining(['/', '/privacy', '/terms']));
  });
});
