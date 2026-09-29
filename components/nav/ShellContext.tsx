'use client';

import { createContext, useContext } from 'react';

type ShellValue = {
  /** Opens the Start sheet (empty workout, quick log, routines). */
  openStart: () => void;
  /** Opens the Sign out confirmation. */
  askSignOut: () => void;
};

export const ShellContext = createContext<ShellValue | null>(null);

export function useShell(): ShellValue {
  const ctx = useContext(ShellContext);
  if (!ctx) throw new Error('useShell must be used within AppShell');
  return ctx;
}
