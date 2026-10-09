'use client';

import { useLayoutEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Dumbbell, Plus } from 'lucide-react';
import { springTo } from '@/lib/anim';
import { SPRINGS } from '@/lib/motion';
import { onRetap } from '@/lib/rankRetap';
import { buzz, play } from '@/lib/sound';
import { useElapsed, useWorkoutSession } from '@/components/WorkoutSessionProvider';
import { TAB_ITEMS } from './items';
import type { NavItem } from './items';

function Tab({ item, pathname }: { item: NavItem; pathname: string }) {
  const on = item.active(pathname);
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      className="wt-tab"
      data-guide={item.key}
      aria-current={on ? 'page' : undefined}
      onClick={(e) => {
        if (!on) {
          play('tick');
          buzz('light');
        }
        onRetap(e, on, item.key);
      }}
    >
      <span className="pill">
        <Icon size={24} aria-hidden="true" />
      </span>
      {item.label}
    </Link>
  );
}

/** The phone's bottom dock: a "workout in progress" bar and the tab bar with the raised WORKOUT button. */
export function TabBar({ onStart, showMini }: { onStart: () => void; showMini: boolean }) {
  const pathname = usePathname();
  const { session } = useWorkoutSession();
  const elapsed = useElapsed(session?.startedAt);
  const nav = useRef<HTMLElement>(null);
  const pill = useRef<HTMLSpanElement>(null);
  const at = useRef<number | null>(null);
  const activeKey = [...TAB_ITEMS.left, ...TAB_ITEMS.right].find((i) => i.active(pathname))?.key ?? null;

  // The pill slides to the tab you open (snappy spring) and its icon pops to 115% and settles.
  useLayoutEffect(() => {
    const bar = nav.current;
    const p = pill.current;
    if (!bar || !p) return undefined;
    const place = (animate: boolean) => {
      const slot = bar.querySelector<HTMLElement>('.wt-tab[aria-current="page"] .pill');
      if (!slot) {
        p.style.opacity = '0';
        at.current = null;
        return;
      }
      const b = bar.getBoundingClientRect();
      const r = slot.getBoundingClientRect();
      const x = r.left - b.left;
      const from = at.current;
      at.current = x;
      p.style.opacity = '1';
      p.style.top = `${r.top - b.top}px`;
      p.style.transform = `translateX(${x}px)`;
      if (animate && from !== null && from !== x) {
        void springTo(p, from, x, (v) => `translateX(${v}px)`, SPRINGS.snappy);
        void springTo(slot.firstElementChild, 1.15, 1, (v) => `scale(${v})`, SPRINGS.bouncy);
      }
    };
    place(true);
    const watch = new ResizeObserver(() => place(false));
    watch.observe(bar);
    return () => watch.disconnect();
  }, [activeKey]);

  return (
    <div className="wt-dock" data-testid="dock">
      {showMini && session && (
        <Link href="/workout" className="wt-minibar" data-testid="minibar">
          <Dumbbell size={20} aria-hidden="true" />
          <b>{session.title || 'Workout'}</b>
          <span aria-label="Time so far">{elapsed}</span>
          <span className="r">Resume</span>
        </Link>
      )}
      <nav ref={nav} className="wt-tabbar" aria-label="Main" data-testid="tab-bar">
        <span ref={pill} className="wt-tabpill" aria-hidden="true" />
        {TAB_ITEMS.left.map((item) => (
          <Tab key={item.key} item={item} pathname={pathname} />
        ))}
        <button
          type="button"
          className="wt-startfab"
          data-guide="workout"
          aria-label="Workout: start a workout"
          onPointerDown={() => {
            play('tap');
            buzz('light');
          }}
          onClick={onStart}
        >
          <Plus size={22} strokeWidth={3} aria-hidden="true" />
          WORKOUT
        </button>
        {TAB_ITEMS.right.map((item) => (
          <Tab key={item.key} item={item} pathname={pathname} />
        ))}
      </nav>
    </div>
  );
}
