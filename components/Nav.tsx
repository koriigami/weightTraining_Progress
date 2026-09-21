'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const TABS = [
  { href: '/', label: 'Today' },
  { href: '/plan', label: 'Plan' },
];

export function Nav() {
  const pathname = usePathname();

  return (
    <>
      <nav className="hidden border-b border-neutral-200 bg-white/80 backdrop-blur sm:block dark:border-neutral-800 dark:bg-neutral-950/80">
        <div className="mx-auto flex max-w-3xl items-center gap-6 px-6 py-3">
          <span className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Home Workout</span>
          <div className="flex gap-1">
            {TABS.map((tab) => (
              <Link
                key={tab.href}
                href={tab.href}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                  pathname === tab.href
                    ? 'bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900'
                    : 'text-neutral-500 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800'
                }`}
              >
                {tab.label}
              </Link>
            ))}
          </div>
        </div>
      </nav>

      <nav className="fixed inset-x-0 bottom-0 z-10 border-t border-neutral-200 bg-white/90 pb-[env(safe-area-inset-bottom)] backdrop-blur sm:hidden dark:border-neutral-800 dark:bg-neutral-950/90">
        <div className="flex">
          {TABS.map((tab) => (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex-1 py-3 text-center text-sm font-medium ${
                pathname === tab.href
                  ? 'text-neutral-900 dark:text-neutral-50'
                  : 'text-neutral-400 dark:text-neutral-500'
              }`}
            >
              {tab.label}
            </Link>
          ))}
        </div>
      </nav>
    </>
  );
}
