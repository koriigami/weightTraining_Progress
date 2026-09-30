// Tapping the Rank tab while Rank is already open: the nav fires this window
// event, and the Rank page answers by showing the Road and scrolling back to
// your level. A window event keeps the nav and the page free of each other.
export const RANK_RETAP_EVENT = 'wt:rank-retap';

export function fireRankRetap(): void {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(RANK_RETAP_EVENT));
}

/**
 * The click handler of a nav link. Tapping Rank while Rank is open does not navigate (Next
 * would scroll the page back to the top); it fires the event instead. Other links go on as usual.
 */
export function onRetap(e: { preventDefault: () => void }, active: boolean, key: string): void {
  if (!active || key !== 'rank') return;
  e.preventDefault();
  fireRankRetap();
}
