'use client';

import { useRef } from 'react';
import type { KeyboardEvent, PointerEvent } from 'react';
import { springTo } from '@/lib/anim';
import { buzz, play } from '@/lib/sound';

type Handlers<T extends HTMLElement> = {
  onPointerDown: (e: PointerEvent<T>) => void;
  onPointerUp: (e: PointerEvent<T>) => void;
  onPointerLeave: (e: PointerEvent<T>) => void;
  onPointerCancel: (e: PointerEvent<T>) => void;
  onKeyDown: (e: KeyboardEvent<T>) => void;
  onKeyUp: (e: KeyboardEvent<T>) => void;
};

/**
 * The press of a 3D button (board 12): the sound and a light buzz the moment it
 * goes down, and on release a spring back from the squish (down 3 px and 3%
 * smaller; the CSS :active state is the squish itself). `slot` is 'tap' for
 * green buttons and 'tock' for gold ones. `squish` is false for flat buttons.
 */
export function usePress<T extends HTMLElement>(slot: 'tap' | 'tock', enabled: boolean, squish = true): Handlers<T> {
  const down = useRef(false);

  const start = () => {
    if (!enabled || down.current) return;
    down.current = true;
    play(slot);
    buzz('light');
  };
  const end = (el: T) => {
    if (!down.current) return;
    down.current = false;
    if (squish) void springTo(el, 1, 0, (v) => `translateY(${3 * v}px) scale(${1 - 0.03 * v})`);
  };
  const isKey = (e: KeyboardEvent<T>) => e.key === 'Enter' || e.key === ' ';

  return {
    onPointerDown: () => start(),
    onPointerUp: (e) => end(e.currentTarget),
    onPointerLeave: (e) => end(e.currentTarget),
    onPointerCancel: (e) => end(e.currentTarget),
    onKeyDown: (e) => {
      if (isKey(e) && !e.repeat) start();
    },
    onKeyUp: (e) => {
      if (isKey(e)) end(e.currentTarget);
    },
  };
}

/** Runs the press handler first, then the one the caller passed. */
export function withPress<T extends HTMLElement>(press: Handlers<T>, own: Partial<Handlers<T>>): Handlers<T> {
  const out = {} as Handlers<T>;
  (Object.keys(press) as (keyof Handlers<T>)[]).forEach((k) => {
    out[k] = ((e: never) => {
      (press[k] as (e: never) => void)(e);
      (own[k] as ((e: never) => void) | undefined)?.(e);
    }) as never;
  });
  return out;
}
