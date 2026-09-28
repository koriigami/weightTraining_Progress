'use client';

import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { ProgressProvider } from '@/components/ProgressProvider';
import { SignInScreen } from '@/components/SignInScreen';
import { TopAppBar } from '@/components/nav/TopAppBar';
import { BottomNav } from '@/components/nav/BottomNav';
import { NavRail } from '@/components/nav/NavRail';

export function AppShell({ hasGoogle, hasDev, children }: { hasGoogle: boolean; hasDev: boolean; children: React.ReactNode }) {
  const { data: session } = useSession();
  const pathname = usePathname();

  // Public pages such as the invite-only notice render without the shell.
  if (pathname.startsWith('/auth/')) return <>{children}</>;
  if (!session?.user?.id) return <SignInScreen hasGoogle={hasGoogle} hasDev={hasDev} />;

  return (
    <ProgressProvider>
      <TopAppBar />
      <NavRail />
      <main className="mx-auto max-w-5xl px-4 pb-bottom-nav pt-4 sm:pt-6 md:pb-6 md:pl-24 md:pr-6">{children}</main>
      <BottomNav />
    </ProgressProvider>
  );
}
