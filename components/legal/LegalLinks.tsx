import Link from 'next/link';

/** Small Privacy and Terms links for the sign-in and invite-only cards. */
export function LegalLinks() {
  return (
    <nav className="wt-legal-links" aria-label="Legal">
      <Link href="/privacy">Privacy</Link>
      <Link href="/terms">Terms</Link>
    </nav>
  );
}
