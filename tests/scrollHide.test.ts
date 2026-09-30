import { describe, expect, it } from 'vitest';
import { nextHidden } from '../lib/scrollHide';

describe('collapsing title', () => {
  it('stays put near the top', () => {
    expect(nextHidden(false, 0, 30)).toBe(false);
    expect(nextHidden(false, 20, 40)).toBe(false); // 40 is not past 40
  });

  it('hides when scrolling down past 40px', () => {
    expect(nextHidden(false, 40, 60)).toBe(true);
  });

  it('ignores movement under 4px', () => {
    expect(nextHidden(false, 100, 103)).toBe(false);
    expect(nextHidden(true, 100, 97)).toBe(true);
  });

  it('shows again on any scroll up beyond the threshold', () => {
    expect(nextHidden(true, 300, 290)).toBe(false);
  });

  it('shows again back at the top', () => {
    expect(nextHidden(true, 12, 5)).toBe(false);
    expect(nextHidden(true, 5, 5)).toBe(false);
  });

  it('keeps its state while scrolling in place', () => {
    expect(nextHidden(true, 200, 200)).toBe(true);
    expect(nextHidden(false, 200, 200)).toBe(false);
  });
});
