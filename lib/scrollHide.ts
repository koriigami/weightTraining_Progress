// The collapsing title of a large page header: it hides once you scroll down past
// 40px and comes back on any scroll up. Small wobbles (under 4px) change nothing.
export const HIDE_AFTER = 40;
export const HIDE_THRESHOLD = 4;
const AT_TOP = 10;

/** Whether the title is hidden after a scroll from `last` to `y`, given whether it was hidden before. */
export function nextHidden(hidden: boolean, last: number, y: number): boolean {
  if (y < AT_TOP) return false; // back at the top
  if (y > last + HIDE_THRESHOLD && y > HIDE_AFTER) return true;
  if (y < last - HIDE_THRESHOLD) return false;
  return hidden;
}
