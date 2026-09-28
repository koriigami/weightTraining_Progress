import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';
import Credentials from 'next-auth/providers/credentials';
import type { Provider } from 'next-auth/providers';
import { saveProfile } from '@/lib/store';

export function allowedEmails(): string[] {
  return (process.env.ALLOWED_EMAILS ?? '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export const hasGoogle = Boolean(process.env.AUTH_GOOGLE_ID);
// Dev sign-in exists only outside production and only when Google is not configured.
export const hasDevProvider = process.env.NODE_ENV !== 'production' && !hasGoogle;

const providers: Provider[] = [];
if (hasGoogle) providers.push(Google);
if (hasDevProvider) {
  providers.push(
    Credentials({
      id: 'dev',
      name: 'Dev sign-in',
      credentials: { email: { label: 'Email', type: 'email' } },
      async authorize(credentials) {
        const email = String(credentials?.email ?? '').trim().toLowerCase();
        if (!email || !allowedEmails().includes(email)) return null;
        return { id: `dev:${email}`, email, name: email.split('@')[0] };
      },
    })
  );
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers,
  session: { strategy: 'jwt' },
  trustHost: true,
  pages: { signIn: '/', error: '/auth/denied' },
  callbacks: {
    async signIn({ user }) {
      const email = user.email?.trim().toLowerCase();
      if (!email || !allowedEmails().includes(email)) return false;
      return true;
    },
    async jwt({ token, user, account }) {
      // On sign-in, `user.id` is the Google sub (or the dev id).
      if (user?.id) {
        token.id = account?.providerAccountId ?? user.id;
        try {
          await saveProfile(token.id as string, {
            email: user.email ?? '',
            name: user.name ?? '',
            image: user.image ?? '',
          });
        } catch {
          // A profile write failure must not block sign-in.
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) session.user.id = (token.id as string) ?? token.sub ?? '';
      return session;
    },
  },
});
