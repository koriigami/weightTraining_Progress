'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'motion/react';
import { Calendar, User, Award, Target } from 'lucide-react';

const TABS = [
  { href: '/', label: 'Calendar', Icon: Calendar },
  { href: '/profile', label: 'Profile', Icon: User },
  { href: '/badges', label: 'Badges', Icon: Award },
  { href: '/goals', label: 'Goals', Icon: Target },
];

function isActive(pathname: string, href: string) {
  return href === '/' ? pathname === '/' : pathname.startsWith(href);
}

export function NavRail() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Main"
      data-testid="nav-rail"
      className="fixed inset-y-0 left-0 z-30 hidden w-20 flex-col items-center gap-3 border-r pt-6 md:flex"
      style={{ background: 'var(--surface)', borderColor: 'var(--line)' }}
    >
      {TABS.map((tab) => {
        const active = isActive(pathname, tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className="flex flex-col items-center gap-1 py-1 text-[11px]"
            style={{ color: active ? 'var(--ink)' : 'var(--muted)', fontWeight: active ? 700 : 500 }}
          >
            <span className="relative flex h-8 w-14 items-center justify-center rounded-2xl">
              {active && (
                <motion.span
                  layoutId="nav-rail-pill"
                  className="absolute inset-0 rounded-2xl"
                  style={{ background: 'var(--pill)' }}
                  transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                />
              )}
              <tab.Icon size={22} strokeWidth={2} className="relative" style={{ color: active ? 'var(--pill-ink)' : 'var(--muted)' }} />
            </span>
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
