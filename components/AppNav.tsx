'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { useProgress } from './ProgressProvider';
import { Rank } from '@/lib/progress';

const NAV_LINKS = [
  { href: '/', label: 'Calendar' },
  { href: '/profile', label: 'Profile' },
  { href: '/achievements', label: 'Achievements' },
  { href: '/goals', label: 'Goals' },
];

const RANK_COLORS: Record<Rank, string> = {
  E: 'bg-neutral-200 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300',
  D: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
  C: 'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300',
  B: 'bg-purple-100 text-purple-700 dark:bg-purple-500/15 dark:text-purple-300',
  A: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
  S: 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300',
};

export function AppNav() {
  const pathname = usePathname();
  const { progress } = useProgress();
  const [open, setOpen] = useState(false);

  return (
    <header className="border-b border-neutral-200 bg-white/80 backdrop-blur dark:border-neutral-800 dark:bg-neutral-950/80">
      <div className="mx-auto max-w-5xl px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Home Workout</span>
            <span
              className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${RANK_COLORS[progress.rank]}`}
              title={`Level ${progress.level}`}
            >
              {progress.rank} · L{progress.level}
            </span>
          </div>

          <nav className="hidden items-center gap-4 md:flex">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`text-sm font-medium ${
                  pathname === link.href
                    ? 'text-neutral-900 dark:text-neutral-100'
                    : 'text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <button
            onClick={() => setOpen((o) => !o)}
            aria-label="Menu"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-neutral-600 dark:text-neutral-300 md:hidden"
          >
            <span className="text-lg">{open ? '✕' : '☰'}</span>
          </button>
        </div>

        {open && (
          <nav className="mt-2 flex flex-col gap-1 border-t border-neutral-100 pt-2 dark:border-neutral-800 md:hidden">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className={`rounded-lg px-2 py-2.5 text-sm font-medium ${
                  pathname === link.href
                    ? 'bg-neutral-100 text-neutral-900 dark:bg-neutral-900 dark:text-neutral-100'
                    : 'text-neutral-600 dark:text-neutral-300'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        )}
      </div>
    </header>
  );
}
