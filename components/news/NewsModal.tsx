'use client';

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@/components/ui/Button';
import { useDialog } from '@/components/ui/useDialog';
import { newsKicker } from '@/lib/news';
import { play } from '@/lib/sound';
import type { NewsCardPage } from '@/lib/news';
import { useBackToClose } from '@/lib/useBackToClose';

const TITLE = "What's new";

/**
 * The What's new card: the game modal with one page per change, a picture from the real
 * screen, the words, dots and one full-width button (Next, then Got it on the last page).
 * Got it, Escape, Back and a tap on the scrim all close the whole card, and onClose is
 * called once whichever way it closed. The picture and words scroll inside it on a short
 * screen, and the dots and the button stay in view.
 */
export function NewsModal({ pages, onClose }: { pages: NewsCardPage[]; onClose: () => void }) {
  const [at, setAt] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const uid = useId();
  const titleId = `${uid}-t`;
  const bodyId = `${uid}-b`;
  const doneRef = useRef(false);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  // The card pops in with a pip and a lift, and leaves with the soft puff.
  useEffect(() => play('modal'), []);

  const finish = useCallback(() => {
    if (doneRef.current) return;
    doneRef.current = true;
    play('close');
    onCloseRef.current();
  }, []);
  // Back runs finish. Every other way to close asks Back to, so the history entry the card pushed is used up.
  const close = useBackToClose(true, finish);
  useDialog(true, ref, close);

  // The next page's picture is ready before it is asked for.
  useEffect(() => {
    const next = pages[at + 1];
    if (next) new Image().src = next.image;
  }, [at, pages]);

  // Each page starts at its top.
  useEffect(() => {
    scrollRef.current?.scrollTo(0, 0);
  }, [at]);

  if (typeof document === 'undefined' || pages.length === 0) return null;
  const page = pages[Math.min(at, pages.length - 1)];
  const last = at >= pages.length - 1;

  return createPortal(
    <div className="wt-gm-wrap">
      <button type="button" tabIndex={-1} className="wt-scrim" aria-label="Close" onClick={close} />
      {/* The card opens by itself, so focus starts on its title, not on Next: no focus ring before
          anyone has used the keyboard, and a screen reader reads the title and words first. */}
      <div ref={ref} className="wt-gmodal wt-news" role="dialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={bodyId} tabIndex={-1}>
        <div className="wt-gm-rib">
          <h2 id={titleId} className="gt" tabIndex={-1} data-autofocus>
            {TITLE}
          </h2>
        </div>
        <div ref={scrollRef} id={bodyId} className="wt-news-scroll" aria-live="polite" aria-atomic="true">
          <p className="wt-news-kick">{newsKicker(page.label, at, pages.length)}</p>
          <div className="wt-news-pic">
            {page.rules && <span className="wt-news-tag">XP rules changed</span>}
            <img src={page.image} alt={page.title} />
          </div>
          <div className="wt-gm-body">
            <h3 className="wt-news-h">{page.title}</h3>
            <p>{page.text}</p>
          </div>
        </div>
        <div className="wt-news-foot">
          <div className="wt-news-dots" aria-hidden="true">
            {pages.map((p, k) => (
              <i key={`${p.entryId}-${k}`} className={k === at ? 'on' : undefined} />
            ))}
          </div>
          <div className="wt-gm-btns one">
            <Button onClick={() => (last ? close() : setAt(at + 1))}>
              {last ? 'Got it' : 'Next'}
            </Button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
