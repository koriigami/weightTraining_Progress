import Link from 'next/link';
import type { ReactNode } from 'react';
import { CONTACT_EMAIL, LEGAL_UPDATED, STUDIO, STUDIO_PLACE, STUDIO_URL } from '@/lib/legal';

/** The frame for the Privacy and Terms pages: brand bar, one readable card, and a footer. Public, no app shell. */
export function LegalPage({
  title,
  current,
  short,
  children,
}: {
  title: string;
  current: 'privacy' | 'terms';
  /** Three or so plain lines shown first, before the full text. */
  short: ReactNode[];
  children: ReactNode;
}) {
  return (
    <div className="wt-legal">
      <header className="wt-legal-top">
        <Link href="/" className="wt-legal-brand" aria-label="Levl, home">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.svg" alt="" width={34} height={34} aria-hidden="true" />
          <span className="gt">Levl</span>
        </Link>
        <nav className="wt-legal-nav" aria-label="Legal">
          <Link href="/privacy" aria-current={current === 'privacy' ? 'page' : undefined}>
            Privacy
          </Link>
          <Link href="/terms" aria-current={current === 'terms' ? 'page' : undefined}>
            Terms
          </Link>
        </nav>
      </header>

      <article className="wt-card wt-legal-doc">
        <h1 className="gt">{title}</h1>
        <p className="wt-legal-meta">Last updated {LEGAL_UPDATED}</p>
        <div className="wt-legal-short">
          <h2>The short version</h2>
          <ul>
            {short.map((line, i) => (
              <li key={i}>{line}</li>
            ))}
          </ul>
        </div>
        {children}
      </article>

      <footer className="wt-legal-foot">
        <p>
          Levl is built by{' '}
          <a href={STUDIO_URL} target="_blank" rel="noopener noreferrer">
            {STUDIO}
          </a>
          , {STUDIO_PLACE}.
        </p>
        <p>
          <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
          <span aria-hidden="true"> · </span>
          <Link href="/">Back to Levl</Link>
        </p>
      </footer>
    </div>
  );
}

/** One numbered section of a legal page. */
export function LegalSection({ n, title, children }: { n: number; title: string; children: ReactNode }) {
  const id = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return (
    <section className="wt-legal-sec" aria-labelledby={id}>
      <h2 id={id}>
        <span className="wt-legal-n">{n}.</span> {title}
      </h2>
      {children}
    </section>
  );
}

export function Mail() {
  return <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>;
}
