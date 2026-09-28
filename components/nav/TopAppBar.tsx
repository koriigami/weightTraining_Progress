'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { RankShield } from '@/components/RankShield';
import { useProgress } from '@/components/ProgressProvider';

const TITLES: Record<string, string> = {
  '/': 'Calendar',
  '/profile': 'Profile',
  '/badges': 'Badges',
  '/goals': 'Goals',
};

export function TopAppBar() {
  const pathname = usePathname();
  const { progress } = useProgress();
  const title = TITLES[pathname] ?? 'Home Workout';

  const frac = progress.xpIntoLevel.needed > 0 ? progress.xpIntoLevel.current / progress.xpIntoLevel.needed : 0;
  const r = 9;
  const c = 2 * Math.PI * r;

  return (
    <header
      className="sticky top-0 z-20 flex h-16 items-center justify-between border-b px-4"
      style={{ background: 'var(--surface)', borderColor: 'var(--line)', paddingTop: 'env(safe-area-inset-top)' }}
    >
      <h1 className="text-xl font-semibold" style={{ color: 'var(--ink)' }}>
        {title}
      </h1>
      <Link
        href="/profile"
        aria-label={`Level ${progress.level}, ${progress.rank} rank. Open profile`}
        className="flex min-h-10 items-center gap-1.5 rounded-full py-1 pl-1 pr-2.5"
        style={{ background: 'var(--surface-2)' }}
      >
        <RankShield rank={progress.rank} size={28} />
        <b className="font-display text-base" style={{ color: 'var(--ink)' }}>
          {progress.level}
        </b>
        <svg width={22} height={22} viewBox="0 0 22 22" aria-hidden="true">
          <circle cx={11} cy={11} r={r} fill="none" stroke="var(--line)" strokeWidth={3} />
          <circle
            cx={11}
            cy={11}
            r={r}
            fill="none"
            stroke="var(--accent)"
            strokeWidth={3}
            strokeLinecap="round"
            strokeDasharray={`${(c * frac).toFixed(1)} ${c.toFixed(1)}`}
            transform="rotate(-90 11 11)"
          />
        </svg>
      </Link>
    </header>
  );
}
