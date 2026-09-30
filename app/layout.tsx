import type { Metadata, Viewport } from 'next';
import { Figtree, Lilita_One } from 'next/font/google';
import './globals.css';
import { CelebrationProvider } from '@/components/celebrate/CelebrationProvider';
import { SessionProvider } from 'next-auth/react';
import { AppShell } from '@/components/AppShell';
import { hasDevProvider, hasGoogle } from '@/auth';
import { Sky } from '@/components/ui/Sky';

const figtree = Figtree({ subsets: ['latin'], variable: '--font-figtree', display: 'swap' });
const lilitaOne = Lilita_One({ subsets: ['latin'], weight: '400', variable: '--font-display', display: 'swap' });

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://weight-training-progress.vercel.app';
const title = 'Levl · Workout tracker that levels you up';
const description =
  'Levl is a game-style workout tracker. Log strength and cardio, beat your last session, earn XP and climb from E to S rank.';
const ogAlt = 'Levl: log workouts, beat last time, climb from E to S rank';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: title, template: '%s · Levl' },
  applicationName: 'Levl',
  description,
  manifest: '/manifest.webmanifest',
  openGraph: {
    type: 'website',
    siteName: 'Levl',
    title,
    description,
    url: '/',
    images: [{ url: '/og.png', width: 1200, height: 630, alt: ogAlt }],
  },
  twitter: {
    card: 'summary_large_image',
    title,
    description,
    images: ['/og.png'],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Levl',
  },
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/favicon-32.png', sizes: '32x32', type: 'image/png' },
    ],
    apple: '/apple-touch-icon.png',
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
  themeColor: '#86ccff',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${figtree.variable} ${lilitaOne.variable}`}>
      <body className="antialiased">
        <Sky />
        <SessionProvider>
          <CelebrationProvider>
            <AppShell hasGoogle={hasGoogle} hasDev={hasDevProvider}>
              {children}
            </AppShell>
          </CelebrationProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
