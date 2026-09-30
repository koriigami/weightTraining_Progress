'use client';

import { useEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';
import type { ShareCard } from '@/lib/shareCard';
import { makeCardImage } from '@/lib/shareImage';

export type ShareImageStatus = 'idle' | 'rendering' | 'ready' | 'failed';

// The sheet slides up for about 300 ms: rendering in the middle of that would stutter it.
const OPEN_DELAY = 300;
// After a new sky or a new card, wait for the taps to stop.
const CHANGE_DELAY = 150;

// What the last finished render was for: a picture is only good for the card and roll it was made from.
type Made = { card: ShareCard; roll: number; file: File | null; url: string | null };

const nextFrame = (): Promise<void> => new Promise((resolve) => requestAnimationFrame(() => resolve()));

function revoke(urlRef: { current: string | null }) {
  if (urlRef.current) URL.revokeObjectURL(urlRef.current);
  urlRef.current = null;
}

/**
 * Makes the share picture ahead of the tap, so Share image can start the phone's
 * share menu at once (iPhones need the share to begin inside the tap itself).
 * It renders about 300 ms after the sheet opens, and again (debounced 150 ms) when
 * the roll or the card changes. A slow older render never replaces a newer one.
 * Only the latest object URL is kept; it is revoked on change, on close and on unmount.
 * While a new picture is being made the status is 'rendering' and file and url are null.
 */
export function useShareImage(
  svgRef: RefObject<SVGSVGElement | null>,
  { open, roll, card }: { open: boolean; roll: number; card: ShareCard }
): { file: File | null; url: string | null; status: ShareImageStatus } {
  const [made, setMade] = useState<Made | null>(null);
  const generation = useRef(0); // each render and each close takes the next number; a finished render with an old number is dropped
  const urlRef = useRef<string | null>(null); // the one live object URL
  const openedAt = useRef<number | null>(null);

  useEffect(() => {
    const gen = ++generation.current;
    revoke(urlRef); // the picture on show (if any) is for an older card or roll, or the sheet is closing
    if (!open) {
      openedAt.current = null;
      setMade(null);
      return undefined;
    }
    const now = performance.now();
    if (openedAt.current === null) openedAt.current = now;
    const wait = Math.max(CHANGE_DELAY, OPEN_DELAY - (now - openedAt.current));
    const timer = setTimeout(async () => {
      let file: File | null = null;
      try {
        await nextFrame(); // the SVG in the page has the new roll by now
        if (gen !== generation.current) return;
        const svg = svgRef.current;
        if (!svg) throw new Error('The card is not on the page');
        file = await makeCardImage(svg, card.fileName);
      } catch {
        // file stays null: the picture failed
      }
      if (gen !== generation.current) return;
      const url = file ? URL.createObjectURL(file) : null;
      urlRef.current = url;
      setMade({ card, roll, file, url });
    }, wait);
    return () => clearTimeout(timer);
  }, [open, roll, card, svgRef]);

  useEffect(
    () => () => {
      generation.current++;
      revoke(urlRef);
    },
    []
  );

  if (!open) return { file: null, url: null, status: 'idle' };
  if (!made || made.card !== card || made.roll !== roll) return { file: null, url: null, status: 'rendering' };
  if (!made.file) return { file: null, url: null, status: 'failed' };
  return { file: made.file, url: made.url, status: 'ready' };
}
