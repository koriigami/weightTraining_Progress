'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronDown, ChevronLeft } from 'lucide-react';
import { springTo } from '@/lib/anim';
import { SPRINGS } from '@/lib/motion';
import { play } from '@/lib/sound';

// The arrow nudges 4 to 6 px the way it points and springs back, with the soft puff.
function nudge(el: HTMLElement, icon: 'left' | 'down') {
  play('close');
  const arrow = el.firstElementChild;
  void springTo(arrow, -6, 0, icon === 'down' ? (v) => `translateY(${-v}px)` : (v) => `translateX(${v}px)`, SPRINGS.bouncy);
}

/** Round 3D gold back button with a chevron, used on every sub-page. */
export function BackButton({ href, onClick, label = 'Back', icon = 'left', className }: { href?: string; onClick?: () => void; label?: string; icon?: 'left' | 'down'; className?: string }) {
  const router = useRouter();
  const cls = `wt-backbtn${className ? ` ${className}` : ''}`;
  const Icon = icon === 'down' ? ChevronDown : ChevronLeft;
  if (href) {
    return (
      <Link href={href} aria-label={label} className={cls} onClick={(e) => nudge(e.currentTarget, icon)}>
        <Icon size={20} strokeWidth={2.4} aria-hidden="true" />
      </Link>
    );
  }
  return (
    <button
      type="button"
      aria-label={label}
      className={cls}
      onClick={(e) => {
        nudge(e.currentTarget, icon);
        (onClick ?? (() => router.back()))();
      }}
    >
      <Icon size={20} strokeWidth={2.4} aria-hidden="true" />
    </button>
  );
}
