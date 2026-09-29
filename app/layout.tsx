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
