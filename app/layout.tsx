import type { Metadata, Viewport } from 'next';
import { Lilita_One } from 'next/font/google';
import './globals.css';
import { CelebrationProvider } from '@/components/celebrate/CelebrationProvider';
import { SessionProvider } from 'next-auth/react';
import { AppShell } from '@/components/AppShell';
import { auth, hasDevProvider, hasGoogle } from '@/auth';

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

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  return (
    <html lang="en" className={lilitaOne.variable}>
      <body className="antialiased" style={{ background: 'var(--bg)', color: 'var(--ink)' }}>
        <SessionProvider session={session}>
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
