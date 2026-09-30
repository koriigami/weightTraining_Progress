'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useEffect, useId, useRef, useState } from 'react';
import { EllipsisVertical, LogOut, Settings, User } from 'lucide-react';
import { RankShield } from '@/components/RankShield';
import { useProgress } from '@/components/ProgressProvider';
import { useElapsed, useWorkoutSession } from '@/components/WorkoutSessionProvider';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { SIDEBAR_ITEMS } from './items';

function AccountMenu({ onSignOut }: { onSignOut: () => void }) {
  const [open, setOpen] = useState(false);
  const { data: auth } = useSession();
  const { progress } = useProgress();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const name = auth?.user?.name || auth?.user?.email || 'Account';

  useEffect(() => {
    if (!open) return;
    menuRef.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus();
  }, [open]);

  function close(refocus = true) {
    setOpen(false);
    if (refocus) triggerRef.current?.focus();
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') {
      e.stopPropagation();
      close();
      return;
    }
    const items = Array.from(menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? []);
    const at = items.indexOf(document.activeElement as HTMLElement);
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      items[(at + 1) % items.length]?.focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      items[(at - 1 + items.length) % items.length]?.focus();
    } else if (e.key === 'Home') {
      e.preventDefault();
      items[0]?.focus();
    } else if (e.key === 'End') {
      e.preventDefault();
      items[items.length - 1]?.focus();
    } else if (e.key === 'Tab') {
      setOpen(false);
    }
  }

  return (
    <>
      {open && (
        <>
          <button type="button" tabIndex={-1} className="wt-acct-scrim" aria-label="Close menu" onClick={() => close(false)} />
          <div ref={menuRef} id={menuId} className="wt-acct-pop" role="menu" aria-label="Account" onKeyDown={onKeyDown}>
            <Link href="/profile" role="menuitem" onClick={() => setOpen(false)}>
              <User size={18} aria-hidden="true" /> Profile
            </Link>
            <Link href="/settings" role="menuitem" onClick={() => setOpen(false)}>
              <Settings size={18} aria-hidden="true" /> Settings
            </Link>
            <button
              type="button"
              role="menuitem"
              className="danger"
              onClick={() => {
                setOpen(false);
                onSignOut();
              }}
            >
              <LogOut size={18} aria-hidden="true" /> Sign out
            </button>
          </div>
        </>
      )}
      <button
        ref={triggerRef}
        type="button"
        className="wt-userrow"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        aria-label={`Account menu for ${name}`}
        onClick={() => setOpen((o) => !o)}
        data-testid="account-button"
      >
        <Avatar name={name} image={auth?.user?.image} rank={progress.rank} />
        <span className="grow">
          <b>{name}</b>
          <small>
            Level {progress.level} · {progress.rank} rank
          </small>
        </span>
        <EllipsisVertical size={20} aria-hidden="true" />
      </button>
    </>
  );
}

/** The desktop sidebar: logo, + Workout, the sections, the workout in progress, and the account menu. */
export function Sidebar({ onStart, onSignOut }: { onStart: () => void; onSignOut: () => void }) {
  const pathname = usePathname();
  const { progress } = useProgress();
  const { session } = useWorkoutSession();
  const elapsed = useElapsed(session?.startedAt);

  return (
    <aside className="wt-side" data-testid="sidebar" aria-label="Sidebar">
      <Link href="/" className="wt-logo" aria-label="Home Workout, home">
        <RankShield rank={progress.rank} size={28} />
        <span className="gt">Home Workout</span>
      </Link>
      <Button size="lg" onClick={onStart}>
        + Workout
      </Button>
      <nav aria-label="Main" className="flex flex-col gap-1" data-testid="side-nav">
        {SIDEBAR_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <Link key={item.key} href={item.href} className="wt-navi" aria-current={item.active(pathname) ? 'page' : undefined}>
              <Icon size={22} aria-hidden="true" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
      <div className="wt-side-foot">
        {session && pathname !== '/workout' && (
          <Link href="/workout" className="wt-side-active" data-testid="side-active">
            <small>Workout in progress</small>
            <b>
              {session.title || 'Workout'}
              {elapsed ? ` · ${elapsed}` : ''}
            </b>
            <small>Tap to resume</small>
          </Link>
        )}
        <AccountMenu onSignOut={onSignOut} />
      </div>
    </aside>
  );
}
