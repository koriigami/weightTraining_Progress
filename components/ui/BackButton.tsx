'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';

/** Round 3D gold back button with a chevron, used on every sub-page. */
export function BackButton({ href, onClick, label = 'Back', className }: { href?: string; onClick?: () => void; label?: string; className?: string }) {
  const router = useRouter();
  const cls = `wt-backbtn${className ? ` ${className}` : ''}`;
  if (href) {
    return (
      <Link href={href} aria-label={label} className={cls}>
        <ChevronLeft size={20} strokeWidth={2.4} aria-hidden="true" />
      </Link>
    );
  }
  return (
    <button type="button" aria-label={label} className={cls} onClick={onClick ?? (() => router.back())}>
      <ChevronLeft size={20} strokeWidth={2.4} aria-hidden="true" />
    </button>
  );
}
