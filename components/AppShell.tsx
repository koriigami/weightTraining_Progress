'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { ProgressProvider, useProgress } from '@/components/ProgressProvider';
import { WorkoutSessionProvider, useWorkoutSession } from '@/components/WorkoutSessionProvider';
import { SignInScreen } from '@/components/SignInScreen';
import { anim } from '@/lib/anim';
import { DUR, EASE } from '@/lib/motion';
import { isPublicPath } from '@/lib/legal';
import { Sidebar } from '@/components/nav/Sidebar';
import { TabBar } from '@/components/nav/TabBar';
import { StartSheet } from '@/components/nav/StartSheet';
import { CardioSheet } from '@/components/nav/CardioSheet';
import { CustomWorkoutPicker } from '@/components/nav/CustomWorkoutPicker';
import { SignOutDialog } from '@/components/nav/SignOutDialog';
import { ShellContext } from '@/components/nav/ShellContext';
import type { StartMode } from '@/components/nav/ShellContext';
import { isTabRoot } from '@/components/nav/items';
import { cn } from '@/components/ui/cn';

function ShellSkeleton() {
  return (
    <div className="flex min-h-screen items-center justify-center" role="status" aria-busy="true" aria-label="Loading">
      <div className="h-10 w-10 animate-pulse rounded-full motion-reduce:animate-none" style={{ background: 'var(--surface)', boxShadow: 'var(--card-shadow)' }} />
    </div>
  );
}

// The phone dock (tab bar plus the workout-in-progress bar) is about 72px plus
// the home-indicator inset, and the bar adds 56px. Screens and toasts keep
// clear of it through --dock-h.
const TABBAR_H = '72px';
const MINIBAR_H = '56px';

function Frame({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { loading, authorized, prefs, showToast } = useProgress();
  const { session } = useWorkoutSession();
  const [start, setStart] = useState<{ open: boolean; mode: StartMode }>({ open: false, mode: 'start' });
  const [custom, setCustom] = useState<{ open: boolean; mode: StartMode }>({ open: false, mode: 'start' });
  // `key` makes the Cardio sheet start fresh (with its highlight) each time it opens.
  const [cardio, setCardio] = useState<{ open: boolean; key: number; act: string | null; mode: StartMode }>({ open: false, key: 0, act: null, mode: 'start' });
  const [signOutOpen, setSignOutOpen] = useState(false);

  // Hold the page back until the first load finishes, so nobody sees an empty
  // home (or gets sent to onboarding) before their data arrives. Later
  // refetches (after a failed save) never blank the page again.
  const booted = useRef(false);
  if (!loading) booted.current = true;
  const booting = !booted.current;

  const bare = pathname === '/onboarding';
  const needsOnboarding = !booting && authorized && !prefs.onboarded && !bare;

  useEffect(() => {
    if (needsOnboarding) router.replace('/onboarding');
  }, [needsOnboarding, router]);

  // A page change: the new page rises 8 px and fades in (200 ms). Nothing slides sideways.
  const main = useRef<HTMLElement>(null);
  const shownPath = useRef(pathname);
  useEffect(() => {
    if (shownPath.current === pathname) return;
    shownPath.current = pathname;
    void anim(main.current, [{ transform: 'translateY(8px)', opacity: 0 }, { transform: 'translateY(0)', opacity: 1 }], { duration: DUR.base - 40, easing: EASE.out });
  }, [pathname]);

  const tabs = isTabRoot(pathname);
  const showMini = tabs && Boolean(session) && pathname !== '/workout';
  const dock = tabs ? `calc(${TABBAR_H} + env(safe-area-inset-bottom)${showMini ? ` + ${MINIBAR_H}` : ''})` : '0px';

  const running = useRef(false);
  running.current = Boolean(session);
  const value = useMemo(() => {
    // A workout in progress has to be finished or discarded before another starts.
    // Logging one you already did never touches it, so only start mode is blocked.
    const busy = (mode: StartMode) => {
      if (mode === 'log' || !running.current) return false;
      showToast('Finish or discard your current workout first.');
      return true;
    };
    // Handlers are sometimes passed straight to onClick, so anything but 'log' means start.
    const modeOf = (mode?: unknown): StartMode => (mode === 'log' ? 'log' : 'start');
    return {
      openStart: () => setStart({ open: true, mode: 'start' }),
      openLog: () => setStart({ open: true, mode: 'log' }),
      openCustom: (mode?: StartMode) => {
        const m = modeOf(mode);
        if (!busy(m)) setCustom({ open: true, mode: m });
      },
      openCardio: (act?: string, mode?: StartMode) => {
        const m = modeOf(mode);
        if (!busy(m)) setCardio((c) => ({ open: true, key: c.key + 1, act: typeof act === 'string' ? act : null, mode: m }));
      },
      askSignOut: () => setSignOutOpen(true),
    };
  }, [showToast]);

  return (
    <ShellContext.Provider value={value}>
      <a className="wt-skip" href="#main">
        Skip to content
      </a>
      <div className={cn('wt-shell', bare && 'bare')} style={{ '--dock-h': dock } as CSSProperties}>
        {!bare && <Sidebar onStart={value.openStart} onSignOut={value.askSignOut} />}
        <main ref={main} id="main" tabIndex={-1} className={cn('wt-main', tabs && 'has-dock')} style={{ outline: 'none' }}>
          {booting || needsOnboarding ? <ShellSkeleton /> : children}
        </main>
        {!bare && tabs && <TabBar onStart={value.openStart} showMini={showMini} />}
      </div>
      <StartSheet open={start.open} mode={start.mode} onClose={() => setStart((s) => ({ ...s, open: false }))} />
      <CustomWorkoutPicker open={custom.open} mode={custom.mode} onClose={() => setCustom((c) => ({ ...c, open: false }))} />
      <CardioSheet key={cardio.key} open={cardio.open} mode={cardio.mode} initial={cardio.act} onClose={() => setCardio((c) => ({ ...c, open: false }))} />
      <SignOutDialog open={signOutOpen} onClose={() => setSignOutOpen(false)} />
    </ShellContext.Provider>
  );
}

export function AppShell({ hasGoogle, hasDev, inviteOnly, children }: { hasGoogle: boolean; hasDev: boolean; inviteOnly: boolean; children: React.ReactNode }) {
  const { status } = useSession();
  const pathname = usePathname();

  // Public pages such as the invite-only notice and the Privacy and Terms pages render without the shell.
  if (pathname.startsWith('/auth/') || isPublicPath(pathname)) return <>{children}</>;
  // The session is fetched on the client, so wait for it before choosing a screen.
  if (status === 'loading') return <ShellSkeleton />;
  if (status === 'unauthenticated') return <SignInScreen hasGoogle={hasGoogle} hasDev={hasDev} inviteOnly={inviteOnly} />;

  return (
    <ProgressProvider>
      <WorkoutSessionProvider>
        <Frame>{children}</Frame>
      </WorkoutSessionProvider>
    </ProgressProvider>
  );
}
