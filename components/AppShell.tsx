'use client';

import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { ProgressProvider } from '@/components/ProgressProvider';
import { SignInScreen } from '@/components/SignInScreen';
import { TopAppBar } from '@/components/nav/TopAppBar';
import { BottomNav } from '@/components/nav/BottomNav';
import { NavRail } from '@/components/nav/NavRail';

function ShellSkeleton() {
  return (
    <div
      className="flex min-h-screen items-center justify-center"
      style={{ background: 'var(--bg)' }}
      role="status"
      aria-busy="true"
      aria-label="Loading"
    >
      <div className="h-10 w-10 animate-pulse rounded-full motion-reduce:animate-none" style={{ background: 'var(--surface-2)' }} />
    </div>
  );
}

export function AppShell({ hasGoogle, hasDev, children }: { hasGoogle: boolean; hasDev: boolean; children: React.ReactNode }) {
  const { status } = useSession();
  const pathname = usePathname();

  // Public pages such as the invite-only notice render without the shell.
  if (pathname.startsWith('/auth/')) return <>{children}</>;
  // The session is fetched on the client, so wait for it before choosing a screen.
  if (status === 'loading') return <ShellSkeleton />;
  if (status === 'unauthenticated') return <SignInScreen hasGoogle={hasGoogle} hasDev={hasDev} />;

  return (
    <ProgressProvider>
      <TopAppBar />
      <NavRail />
      <main className="mx-auto max-w-5xl px-4 pb-bottom-nav pt-4 sm:pt-6 md:pb-6 md:pl-24 md:pr-6">{children}</main>
      <BottomNav />
    </ProgressProvider>
  );
}
