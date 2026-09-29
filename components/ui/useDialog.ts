'use client';

import { useEffect, useRef } from 'react';
import type { RefObject } from 'react';

const FOCUSABLE =
  'a[href], button:not([disabled]):not([tabindex="-1"]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

// Page scroll is locked while any dialog is open. A counter keeps two stacked
// dialogs from restoring the wrong value.
let scrollLocks = 0;
let savedOverflow = '';

function lockScroll() {
  if (scrollLocks++ === 0) {
    savedOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
  }
}

function unlockScroll() {
  if (--scrollLocks === 0) document.body.style.overflow = savedOverflow;
}

// Only the top-most dialog reacts to Escape and Tab.
const stack: symbol[] = [];

/**
 * Shared dialog behaviour: moves focus in on open (to [data-autofocus] if there
 * is one, else the first control, else the dialog itself), traps Tab, calls
 * onEscape on Escape, locks page scroll, and gives focus back to whatever
 * opened the dialog when it closes.
 */
export function useDialog(open: boolean, ref: RefObject<HTMLElement | null>, onEscape: () => void) {
  const escRef = useRef(onEscape);
  escRef.current = onEscape;

  useEffect(() => {
    if (!open) return undefined;
    const id = Symbol('dialog');
    stack.push(id);
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    lockScroll();

    const raf = requestAnimationFrame(() => {
      const root = ref.current;
      if (!root) return;
      const target = root.querySelector<HTMLElement>('[data-autofocus]') ?? root.querySelector<HTMLElement>(FOCUSABLE) ?? root;
      target.focus();
    });

    function onKeyDown(e: KeyboardEvent) {
      if (stack[stack.length - 1] !== id) return;
      if (e.key === 'Escape') {
        e.stopPropagation();
        e.preventDefault();
        escRef.current();
        return;
      }
      if (e.key !== 'Tab') return;
      const root = ref.current;
      if (!root) return;
      const items = Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (items.length === 0) {
        e.preventDefault();
        root.focus();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      if (e.shiftKey && (active === first || active === root)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      } else if (!root.contains(active)) {
        e.preventDefault();
        first.focus();
      }
    }
    document.addEventListener('keydown', onKeyDown, true);

    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener('keydown', onKeyDown, true);
      const at = stack.indexOf(id);
      if (at !== -1) stack.splice(at, 1);
      unlockScroll();
      if (opener && document.contains(opener)) opener.focus();
    };
    // ref is a stable object
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);
}
