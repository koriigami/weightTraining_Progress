import type { Metadata, Viewport } from 'next';
import { Lilita_One } from 'next/font/google';
import './globals.css';
import { CelebrationProvider } from '@/components/celebrate/CelebrationProvider';
import { ProgressProvider } from '@/components/ProgressProvider';
import { TopAppBar } from '@/components/nav/TopAppBar';
import { BottomNav } from '@/components/nav/BottomNav';
import { NavRail } from '@/components/nav/NavRail';

const lilitaOne = Lilita_One({ subsets: ['latin'], weight: '400', variable: '--font-display' });

export const metadata: Metadata = {
  title: 'Home Workout',
  description: '6-week home workout plan',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Workout',
  },
  icons: {
    icon: '/icon-192.png',
    apple: '/icon-192.png',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f3f4f9' },
    { media: '(prefers-color-scheme: dark)', color: '#0d0f1d' },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={lilitaOne.variable}>
      <body className="antialiased" style={{ background: 'var(--bg)', color: 'var(--ink)' }}>
        <CelebrationProvider>
          <ProgressProvider>
            <TopAppBar />
            <NavRail />
            <main className="mx-auto max-w-5xl px-4 pb-bottom-nav pt-4 sm:pt-6 md:pb-6 md:pl-24 md:pr-6">{children}</main>
            <BottomNav />
          </ProgressProvider>
        </CelebrationProvider>
      </body>
    </html>
  );
}
