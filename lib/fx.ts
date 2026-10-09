// Little one-off effects drawn with plain elements and the Web Animations API:
// an ink ring, a burst of stars, a coin that flies to a tile, and a shower of
// coins. Client only; each one removes itself, and none run under reduced motion.
import { reducedMotion } from './anim';

type Point = { x: number; y: number };

const centre = (el: Element): Point => {
  const r = el.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
};

function piece(css: string, html = ''): HTMLElement {
  const el = document.createElement('span');
  el.setAttribute('aria-hidden', 'true');
  el.style.cssText = `position:fixed;left:0;top:0;pointer-events:none;z-index:95;${css}`;
  el.innerHTML = html;
  document.body.appendChild(el);
  return el;
}

function run(el: HTMLElement, frames: Keyframe[], opts: KeyframeAnimationOptions): Promise<void> {
  return el.animate(frames, { fill: 'forwards', ...opts }).finished.then(
    () => el.remove(),
    () => el.remove()
  );
}

/** A ring that spreads from a point and fades. */
export function ring(at: Point, color = '#2ba438', from = 10, to = 34, ms = 350, width = 4): void {
  if (typeof document === 'undefined' || reducedMotion()) return;
  const el = piece(`width:${to * 2}px;height:${to * 2}px;margin:${-to}px 0 0 ${-to}px;border-radius:50%;border:${width}px solid ${color}`);
  void run(el, [{ transform: `translate(${at.x}px,${at.y}px) scale(${from / to})`, opacity: 0.9 }, { transform: `translate(${at.x}px,${at.y}px) scale(1)`, opacity: 0 }], { duration: ms, easing: 'cubic-bezier(.2,.8,.2,1)' });
}

const STAR = '<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M12 1l2.9 7.3L22 9.2l-5.6 4.9L18 22l-6-3.9L6 22l1.6-7.9L2 9.2l7.1-.9z"/></svg>';

/** A ring of stars that fly out from a point and fade. */
export function stars(at: Point, n = 16, color = '#ffd34d', reach = 90): void {
  if (typeof document === 'undefined' || reducedMotion()) return;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + Math.random() * 0.3;
    const d = reach * (0.6 + Math.random() * 0.5);
    const el = piece(`margin:-7px 0 0 -7px;color:${color}`, STAR);
    void run(
      el,
      [
        { transform: `translate(${at.x}px,${at.y}px) scale(.3) rotate(0deg)`, opacity: 1 },
        { transform: `translate(${at.x + Math.cos(a) * d}px,${at.y + Math.sin(a) * d}px) scale(1) rotate(160deg)`, opacity: 1, offset: 0.6 },
        { transform: `translate(${at.x + Math.cos(a) * d * 1.15}px,${at.y + Math.sin(a) * d * 1.15 + 10}px) scale(.2) rotate(220deg)`, opacity: 0 },
      ],
      { duration: 650 + Math.random() * 250, easing: 'cubic-bezier(.2,.8,.2,1)' }
    );
  }
}

const COIN = '<span style="display:block;width:14px;height:14px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#fff6c4,#ffc21a 60%,#c7870a);border:1.5px solid #c7870a"></span>';

/** A coin that arcs from one element to another, then calls `done`. */
export function coinFly(from: Element, to: Element, done?: () => void): void {
  if (typeof document === 'undefined' || reducedMotion()) {
    done?.();
    return;
  }
  const a = centre(from);
  const b = centre(to);
  const el = piece('margin:-7px 0 0 -7px', COIN);
  void run(
    el,
    [
      { transform: `translate(${a.x}px,${a.y}px) scale(.6)`, opacity: 1 },
      { transform: `translate(${(a.x + b.x) / 2}px,${Math.min(a.y, b.y) - 36}px) scale(1.1)`, opacity: 1, offset: 0.45 },
      { transform: `translate(${b.x}px,${b.y}px) scale(.7)`, opacity: 1 },
    ],
    { duration: 520, easing: 'cubic-bezier(.5,0,.75,0)' }
  ).then(() => done?.());
}

/** Coins that rain from the top of the screen and bounce once. */
export function coinShower(n = 26): void {
  if (typeof document === 'undefined' || reducedMotion()) return;
  const w = window.innerWidth;
  const h = Math.min(window.innerHeight, 700);
  for (let i = 0; i < n; i++) {
    const x = 24 + Math.random() * (w - 48);
    const floor = h * (0.55 + Math.random() * 0.35);
    const el = piece('margin:-7px 0 0 -7px', COIN);
    void run(
      el,
      [
        { transform: `translate(${x}px,-20px)`, opacity: 1 },
        { transform: `translate(${x + 8}px,${floor}px)`, opacity: 1, offset: 0.6, easing: 'cubic-bezier(.2,.8,.2,1)' },
        { transform: `translate(${x + 14}px,${floor - 26}px)`, opacity: 1, offset: 0.78, easing: 'cubic-bezier(.5,0,.75,0)' },
        { transform: `translate(${x + 18}px,${floor}px)`, opacity: 0 },
      ],
      { duration: 1000 + Math.random() * 500, delay: Math.random() * 450, easing: 'cubic-bezier(.5,0,.75,0)' }
    );
  }
}

/** The centre of an element, for placing a ring or a burst on it. */
export const centreOf = centre;
