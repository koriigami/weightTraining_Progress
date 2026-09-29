import { BookOpen, ClipboardList, House, Shield, User } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export type NavItem = { key: string; href: string; label: string; icon: LucideIcon; active: (pathname: string) => boolean };

const home: NavItem = { key: 'home', href: '/', label: 'Home', icon: House, active: (p) => p === '/' };
const rank: NavItem = { key: 'rank', href: '/rank', label: 'Rank', icon: Shield, active: (p) => p === '/rank' || p === '/badges' };
const profile: NavItem = {
  key: 'profile',
  href: '/profile',
  label: 'Profile',
  icon: User,
  active: (p) => ['/profile', '/settings', '/stats', '/goals'].some((r) => p === r) || p === '/calendar' || p.startsWith('/calendar/'),
};

// Phone tabs: Home, Routines, START (raised, in the tab bar itself), Rank, Profile.
// The exercise library is reached from inside Routines on the phone.
export const TAB_ITEMS = {
  left: [
    home,
    {
      key: 'routines',
      href: '/routines',
      label: 'Routines',
      icon: ClipboardList,
      active: (p: string) => p === '/routines' || p === '/exercises' || p === '/explore' || p.startsWith('/explore/') || p.startsWith('/routine/'),
    },
  ] as NavItem[],
  right: [rank, profile] as NavItem[],
};

// Desktop sidebar: Exercises gets its own item.
export const SIDEBAR_ITEMS: NavItem[] = [
  home,
  { key: 'routines', href: '/routines', label: 'Routines', icon: ClipboardList, active: (p) => p === '/routines' || p === '/explore' || p.startsWith('/explore/') || p.startsWith('/routine/') },
  { key: 'exercises', href: '/exercises', label: 'Exercises', icon: BookOpen, active: (p) => p === '/exercises' },
  rank,
  profile,
];

// The screens that show the tab bar on the phone. Everything else is a pushed
// page with its own back button (and sometimes a pinned action bar).
const TAB_ROOTS = ['/', '/routines', '/explore', '/exercises', '/rank', '/profile'];

export function isTabRoot(pathname: string): boolean {
  return TAB_ROOTS.includes(pathname);
}
