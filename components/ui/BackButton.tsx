'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronDown, ChevronLeft } from 'lucide-react';

/** Round 3D gold back button with a chevron, used on every sub-page. */
export function BackButton({ href, onClick, label = 'Back', icon = 'left', className }: { href?: string; onClick?: () => void; label?: string; icon?: 'left' | 'down'; className?: string }) {
  const router = useRouter();
  const cls = `wt-backbtn${className ? ` ${className}` : ''}`;
  const Icon = icon === 'down' ? ChevronDown : ChevronLeft;
  if (href) {
    return (
      <Link href={href} aria-label={label} className={cls}>
        <Icon size={20} strokeWidth={2.4} aria-hidden="true" />
      </Link>
    );
  }
  return (
    <button type="button" aria-label={label} className={cls} onClick={onClick ?? (() => router.back())}>
      <Icon size={20} strokeWidth={2.4} aria-hidden="true" />
    </button>
  );
}
