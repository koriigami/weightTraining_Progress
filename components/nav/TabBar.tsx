'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Dumbbell, Plus } from 'lucide-react';
import { onRetap } from '@/lib/rankRetap';
import { useElapsed, useWorkoutSession } from '@/components/WorkoutSessionProvider';
import { TAB_ITEMS } from './items';
import type { NavItem } from './items';

function Tab({ item, pathname }: { item: NavItem; pathname: string }) {
  const on = item.active(pathname);
  const Icon = item.icon;
  return (
    <Link href={item.href} className="wt-tab" aria-current={on ? 'page' : undefined} onClick={(e) => onRetap(e, on, item.key)}>
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
      <nav className="wt-tabbar" aria-label="Main" data-testid="tab-bar">
        {TAB_ITEMS.left.map((item) => (
          <Tab key={item.key} item={item} pathname={pathname} />
        ))}
        <button type="button" className="wt-startfab" aria-label="Workout: start a workout" onClick={onStart}>
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
