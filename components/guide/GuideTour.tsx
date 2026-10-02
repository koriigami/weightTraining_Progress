'use client';

import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@/components/ui/Button';
import { useDialog } from '@/components/ui/useDialog';
import { GUIDE_STEPS, GUIDE_WELCOME, GUIDE_XP, bevelDepth, flatRingRadius, keepRingOnScreen, placeOnScreen, ringRect, scrollToFit, stepTargets, stepWords, unionBox } from '@/lib/guide';
import type { GuideStep, Layout, Ring } from '@/lib/guide';
import { useBackToClose } from '@/lib/useBackToClose';
import { useDesktopLayout } from '@/lib/useMediaQuery';

// Bars that stay on screen over the page and hide what scrolls under them: the phone's Home
// bar and the computer's page header at the top, the tab bar at the bottom of a phone.
const TOP_BARS = '.wt-rbar-wrap, .wt-ph';
const DOCK = '.wt-dock';

const shown = (el: Element) => el.getClientRects().length > 0;

// Every element a step lights up on this layout. The other layout's copies are display: none.
function findTargets(step: GuideStep, layout: Layout): HTMLElement[] {
  const found: HTMLElement[] = [];
  for (const name of stepTargets(step, layout)) {
    document.querySelectorAll<HTMLElement>(`[data-guide="${name}"]`).forEach((el) => shown(el) && found.push(el));
  }
  return found;
}

// The ring for those elements: their union, the deepest bevel and the largest corner.
function measure(els: HTMLElement[]): Ring {
  const boxes = els.map((el) => {
    const r = el.getBoundingClientRect();
    return { x: r.left, y: r.top, width: r.width, height: r.height };
  });
  const styles = els.map((el) => getComputedStyle(el));
  const bevel = Math.max(...styles.map((s) => bevelDepth(s.boxShadow)));
  const radius = Math.max(...styles.map((s) => parseFloat(s.borderTopLeftRadius) || 0));
  const ring = ringRect(unionBox(boxes), bevel, radius);
  // A tab or a sidebar link has no bevel and a tighter corner than a card.
  const shaped = bevel === 0 ? { ...ring, radius: flatRingRadius(radius) } : ring;
  return keepRingOnScreen(shaped, { width: window.innerWidth, height: window.innerHeight });
}

// The part of the screen the page's own bars do not cover.
function freeBand(): { top: number; bottom: number } {
  let top = 12;
  let bottom = window.innerHeight;
  document.querySelectorAll(TOP_BARS).forEach((el) => {
    if (shown(el)) top = Math.max(top, el.getBoundingClientRect().bottom + 8);
  });
  const dock = document.querySelector(DOCK);
  if (dock && shown(dock)) bottom = Math.min(bottom, dock.getBoundingClientRect().top - 8);
  return { top, bottom };
}

// Fixed and sticky things stay on screen whatever the page scrolls, so scrolling to them is pointless.
function pinned(el: HTMLElement): boolean {
  for (let p: HTMLElement | null = el; p; p = p.parentElement) {
    const position = getComputedStyle(p).position;
    if (position === 'fixed' || position === 'sticky') return true;
  }
  return false;
}

// What scrolls the page around this element: the main area on a computer, the window on a phone.
function scrollParent(el: HTMLElement): Element {
  for (let p = el.parentElement; p; p = p.parentElement) {
    const overflow = getComputedStyle(p).overflowY;
    if ((overflow === 'auto' || overflow === 'scroll') && p.scrollHeight > p.clientHeight) return p;
  }
  return document.scrollingElement ?? document.documentElement;
}

const sameRing = (a: Ring, b: Ring) =>
  Math.abs(a.x - b.x) < 0.5 && Math.abs(a.y - b.y) < 0.5 && Math.abs(a.width - b.width) < 0.5 && Math.abs(a.height - b.height) < 0.5 && Math.abs(a.radius - b.radius) < 0.5;

// Where the ring is, and the screen it was measured on. `animate` is false for a re-measure after a
// scroll or a resize, so the ring follows the page at once and only a new step slides.
type Spot = { ring: Ring; animate: boolean; vw: number; vh: number };

/**
 * The first-run guide: a welcome card, seven spotlight steps and the How XP works card. Each step
 * dims the screen and lights up the real elements named by `data-guide` (lib/guide.ts) with a gold
 * ring and a step card beside it. The welcome and XP cards are the game modal.
 *
 * Nothing behind it can be tapped, and the page does not scroll except to bring a step's elements
 * into view. Skip, Escape, Back and Start training all end it, and `onClose` is called once
 * whichever way it ended. Focus moves to each card's title, never to a button, so no focus ring
 * shows before anyone uses the keyboard; each card is a labelled dialog, so a screen reader reads
 * its title and words.
 */
export function GuideTour({ onClose }: { onClose: () => void }) {
  const desktop = useDesktopLayout();
  const layout: Layout = desktop ? 'desktop' : 'phone';
  // 0 is the welcome card, 1 to steps.length the spotlight steps, steps.length + 1 the XP card.
  const [at, setAt] = useState(0);
  const [steps, setSteps] = useState<GuideStep[]>(GUIDE_STEPS);
  const [spot, setSpot] = useState<Spot | null>(null);
  const [cardH, setCardH] = useState(190);
  const rootRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const uid = useId();
  const titleId = `${uid}-t`;
  const bodyId = `${uid}-b`;
  const scrolled = useRef(new Map<Element, number>()); // where the page was before the tour moved it
  const fitted = useRef(-1); // the step whose card has been made to fit

  const doneRef = useRef(false);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  // Puts the page back where it was, so the person lands on Home as they left it.
  const restoreScroll = useCallback(() => {
    scrolled.current.forEach((top, el) => el.scrollTo({ top, behavior: 'instant' }));
    scrolled.current.clear();
  }, []);

  const finish = useCallback(() => {
    if (doneRef.current) return;
    doneRef.current = true;
    restoreScroll();
    onCloseRef.current();
  }, [restoreScroll]);
  // Back runs finish. Every other way to end it asks Back to, so the history entry the guide pushed is used up.
  const close = useBackToClose(true, finish);
  useDialog(true, rootRef, close);

  const step = at >= 1 && at <= steps.length ? steps[at - 1] : null;
  const onXp = at > steps.length;

  const remember = useCallback((el: HTMLElement) => {
    const parent = scrollParent(el);
    if (!scrolled.current.has(parent)) scrolled.current.set(parent, parent.scrollTop);
    return parent;
  }, []);

  // Finds a step's elements, scrolls them into view when the page's own bars would hide them, and
  // measures the ring. Null when none of them is on screen.
  const locate = useCallback(
    (s: GuideStep): Ring | null => {
      const els = findTargets(s, layout);
      if (els.length === 0) return null;
      if (!els.every(pinned)) {
        const band = freeBand();
        const now = measure(els);
        if (now.y < band.top || now.y + now.height > band.bottom) {
          remember(els[0]);
          els[0].scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'instant' });
        }
      }
      return measure(els);
    },
    [layout, remember]
  );

  // Goes to a spotlight step, or past the last one to the XP card. A step whose elements are not on
  // screen is skipped.
  const showStep = useCallback(
    (list: GuideStep[], from: number) => {
      for (let n = from; n <= list.length; n++) {
        const ring = locate(list[n - 1]);
        if (ring) {
          setSpot({ ring, animate: true, vw: window.innerWidth, vh: window.innerHeight });
          setAt(n);
          return;
        }
      }
      restoreScroll();
      setSpot(null);
      setAt(list.length + 1);
    },
    [locate, restoreScroll]
  );

  function start() {
    // Only the steps whose elements are on this screen are played, so "N of 7" is true.
    const list = GUIDE_STEPS.filter((s) => findTargets(s, layout).length > 0);
    setSteps(list);
    showStep(list, 1);
  }

  // Keeps the ring on its elements while the page scrolls or resizes, and when they change size.
  useEffect(() => {
    if (!step) return undefined;
    let raf = 0;
    const update = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const els = findTargets(step, layout);
        if (els.length === 0) {
          showStep(steps, at + 1); // the layout changed under it and this step has nothing to show
          return;
        }
        const ring = measure(els);
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        setSpot((prev) => (prev && sameRing(prev.ring, ring) && prev.vw === vw && prev.vh === vh ? prev : { ring, animate: false, vw, vh }));
      });
    };
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true); // the main area scrolls on a computer, and scroll does not bubble
    const observer = new ResizeObserver(update);
    findTargets(step, layout).forEach((el) => observer.observe(el));
    update();
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
      observer.disconnect();
    };
  }, [step, layout, steps, at, showStep]);

  // Measures the step card, and when a short screen leaves room for it on neither side of a ring,
  // scrolls the page once more so both fit.
  useLayoutEffect(() => {
    const card = cardRef.current;
    if (!step || !card) return;
    const h = card.offsetHeight;
    setCardH(h);
    if (fitted.current === at || !spot) return;
    fitted.current = at;
    const band = freeBand();
    const dy = scrollToFit(spot.ring, window.innerHeight, h, band.top, band.bottom);
    if (Math.abs(dy) < 1) return;
    const els = findTargets(step, layout);
    if (els.length === 0) return;
    remember(els[0]).scrollBy(0, dy);
    const ring = measure(els);
    setSpot((prev) => prev && { ...prev, ring });
    // spot is read once per step, from the render that showed it
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [at, layout, spot?.vw]);

  // Each card opens with focus on its title.
  useEffect(() => {
    rootRef.current?.querySelector<HTMLElement>('[data-autofocus]')?.focus({ preventScroll: true });
  }, [at]);

  if (typeof document === 'undefined') return null;

  const welcome = (
    <div key="welcome" className="wt-gm-wrap">
      <div className="wt-guide-dim" aria-hidden="true" />
      <div className="wt-gmodal wt-guide-card" role="dialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={bodyId}>
        <div className="wt-gm-rib">
          <h2 id={titleId} className="gt" tabIndex={-1} data-autofocus>
            {GUIDE_WELCOME.ribbon}
          </h2>
        </div>
        <div className="wt-guide-scroll">
          <div className="wt-gm-art">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.svg" alt="" width={84} height={84} />
          </div>
          <div className="wt-gm-body">
            <p id={bodyId}>{GUIDE_WELCOME.text}</p>
          </div>
        </div>
        <div className="wt-guide-foot">
          <div className="wt-gm-btns">
            <Button variant="secondary" onClick={close}>
              {GUIDE_WELCOME.skip}
            </Button>
            <Button onClick={start}>{GUIDE_WELCOME.start}</Button>
          </div>
        </div>
      </div>
    </div>
  );

  const xp = (
    <div key="xp" className="wt-gm-wrap">
      <div className="wt-guide-dim" aria-hidden="true" />
      <div className="wt-gmodal wt-guide-card" role="dialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={bodyId}>
        <div className="wt-gm-rib">
          <h2 id={titleId} className="gt" tabIndex={-1} data-autofocus>
            {GUIDE_XP.ribbon}
          </h2>
        </div>
        <div className="wt-guide-scroll">
          <div className="wt-gm-body wt-guide-first">
            <p id={bodyId}>{GUIDE_XP.text}</p>
            <ul className="wt-guide-xp" role="list">
              {GUIDE_XP.rows.map((row) => (
                <li key={row.label}>
                  <span>{row.label}</span>
                  <b>{row.value}</b>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="wt-guide-foot">
          <div className="wt-gm-btns one">
            <Button onClick={close}>{GUIDE_XP.button}</Button>
          </div>
          <p className="wt-guide-note">{GUIDE_XP.foot}</p>
        </div>
      </div>
    </div>
  );

  let card = welcome;
  if (onXp) card = xp;
  else if (step && spot) {
    const words = stepWords(step, layout);
    const width = desktop ? 340 : Math.min(300, spot.vw - 24);
    const place = placeOnScreen(spot.ring, { width: spot.vw, height: spot.vh }, layout, width, cardH);
    const style = { left: place.left, top: place.top, bottom: place.bottom, width, '--ax': `${place.arrow}px`, '--ay': `${place.arrow}px` } as CSSProperties;
    card = (
      <div
        key={at}
        ref={cardRef}
        className={`wt-gb ${place.side}`}
        style={style}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={bodyId}
      >
        <div className="wt-gb-top">
          <span className="wt-gb-cnt">
            {at} of {steps.length}
          </span>
          <button type="button" className="wt-gb-skip" onClick={close}>
            Skip
          </button>
        </div>
        <h2 id={titleId} className="wt-gb-h" tabIndex={-1} data-autofocus>
          {words.title}
        </h2>
        <p id={bodyId}>{words.text}</p>
        <Button size="sm" block onClick={() => showStep(steps, at + 1)}>
          Next
        </Button>
      </div>
    );
  }

  const spotlight = step && spot;
  return createPortal(
    <div ref={rootRef} className="wt-guide" tabIndex={-1}>
      {spotlight && <div className="wt-guide-catch" />}
      {spotlight && (
        <div
          className="wt-guide-ring"
          aria-hidden="true"
          style={{
            left: spot.ring.x,
            top: spot.ring.y,
            width: spot.ring.width,
            height: spot.ring.height,
            borderRadius: spot.ring.radius,
            transition: spot.animate ? undefined : 'none',
          }}
        />
      )}
      {card}
    </div>,
    document.body
  );
}
