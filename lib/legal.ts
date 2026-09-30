// Who runs Levl and how to reach them, shared by the Privacy and Terms pages and the links to them.

export const STUDIO = 'Kagadmodyaa Studio';
export const STUDIO_URL = 'https://www.kagadmodyaa.com';
export const CONTACT_EMAIL = 'hello@kagadmodyaa.com';
export const STUDIO_PLACE = 'Nagpur, India';
/** Shown as "Last updated" on both pages. Change it whenever either page changes. */
export const LEGAL_UPDATED = '30 September 2026';
export const MIN_AGE = 18;

export const PUBLIC_PATHS = ['/privacy', '/terms'] as const;

/** Pages anyone can read, signed in or not. They render without the app shell. */
export function isPublicPath(pathname: string): boolean {
  return (PUBLIC_PATHS as readonly string[]).includes(pathname.replace(/\/+$/, '') || '/');
}
