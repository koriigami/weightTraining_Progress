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

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Main"
      data-testid="bottom-nav"
      className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-4 border-t md:hidden"
      style={{
        background: 'var(--surface)',
        borderColor: 'var(--line)',
        paddingBottom: 'env(safe-area-inset-bottom)',
        height: 'calc(80px + env(safe-area-inset-bottom))',
      }}
    >
      {TABS.map((tab) => {
        const active = isActive(pathname, tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? 'page' : undefined}
            className="flex flex-col items-center justify-center gap-1 text-xs"
            style={{ color: active ? 'var(--ink)' : 'var(--muted)', fontWeight: active ? 700 : 500 }}
          >
            <span className="relative flex h-8 w-16 items-center justify-center rounded-2xl">
              {active && (
                <motion.span
                  layoutId="bottom-nav-pill"
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
