'use client';

import { useEffect, useRef } from 'react';
import { Minus, Plus } from 'lucide-react';
import { anim } from '@/lib/anim';
import { STEP_FIRST_MS, STEP_START_MS, nextStepGap, rollPitch } from '@/lib/interactions';
import { DUR, EASE } from '@/lib/motion';
import { SYN, buzz } from '@/lib/sound';
import { cn } from './cn';

/**
 * A big number with round gold minus and plus buttons. Used for amounts and the
 * weekly goal. `format` writes the number for people, e.g. "2.5 kg".
 *
 * One number is on screen at a time: a step rolls the new value in from below (or
 * above) in 160 ms, replacing the last at once. Hold a button to repeat, faster
 * the longer you hold; lifting, sliding off, a cancelled touch or losing focus stops it.
 */
export function Stepper({
  value,
  onChange,
  min = 0,
  max = 999,
  step = 1,
  format,
  label,
  className,
}: {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  format?: (value: number) => string;
  /** What the number is, for screen readers: "Weekly goal". */
  label: string;
  className?: string;
}) {
  const round = (n: number) => Math.round(n * 100) / 100;
  const num = useRef<HTMLSpanElement>(null);
  const shown = useRef(value);
  // The value as the last step left it, so a held button keeps counting before the parent re-renders.
  const cur = useRef(value);
  cur.current = value;
  const timer = useRef(0);
  const latest = useRef({ onChange, min, max, step });
  latest.current = { onChange, min, max, step };

  // Roll the number in the way it moved. A new roll cancels the last, so numbers never stack.
  useEffect(() => {
    const was = shown.current;
    shown.current = value;
    const el = num.current;
    if (!el || value === was) return;
    el.getAnimations().forEach((a) => a.cancel());
    const dir = value > was ? 1 : -1;
    void anim(el, [{ transform: `translateY(${55 * dir}%)`, opacity: 0.25 }, { transform: 'translateY(0)', opacity: 1 }], { duration: DUR.quick, easing: EASE.out });
  }, [value]);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  function stop() {
    window.clearTimeout(timer.current);
    timer.current = 0;
  }

  // Returns false when the number cannot move any further.
  function go(dir: 1 | -1): boolean {
    const l = latest.current;
    const next = Math.min(l.max, Math.max(l.min, round(cur.current + dir * l.step)));
    if (next === cur.current) return false;
    cur.current = next;
    SYN.roll(rollPitch(next));
    buzz('light');
    l.onChange(next);
    return true;
  }

  function hold(dir: 1 | -1) {
    stop();
    if (!go(dir)) return;
    let gap = STEP_START_MS;
    const again = () => {
      if (!go(dir)) return stop();
      gap = nextStepGap(gap);
      timer.current = window.setTimeout(again, gap);
    };
    timer.current = window.setTimeout(again, STEP_FIRST_MS);
  }

  const button = (dir: 1 | -1, text: string, disabled: boolean) => (
    <button
      type="button"
      className="wt-stepbtn"
      aria-label={`${text} ${label.toLowerCase()}`}
      disabled={disabled}
      onPointerDown={(e) => {
        e.preventDefault();
        hold(dir);
      }}
      onPointerUp={stop}
      onPointerLeave={stop}
      onPointerCancel={stop}
      onBlur={stop}
      onContextMenu={(e) => e.preventDefault()}
      // A mouse or touch press is handled on pointer down; a click with no pointer (the keyboard, a screen reader) steps once.
      onClick={(e) => {
        if (e.detail === 0) go(dir);
      }}
    >
      {dir === 1 ? <Plus size={22} strokeWidth={3} aria-hidden="true" /> : <Minus size={22} strokeWidth={3} aria-hidden="true" />}
    </button>
  );

  return (
    <div className={cn('wt-stepper', className)} role="group" aria-label={label}>
      {button(-1, 'Less', value <= min)}
      <output aria-live="polite">
        <span ref={num} className="wt-stepnum">
          {format ? format(value) : value}
        </span>
      </output>
      {button(1, 'More', value >= max)}
    </div>
  );
}
