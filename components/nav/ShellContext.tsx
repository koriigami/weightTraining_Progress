'use client';

import { createContext, useContext } from 'react';

type ShellValue = {
  /** Opens the Start sheet (routines, Cardio, Custom workout). */
  openStart: () => void;
  /** Opens the exercise picker for a custom workout. No workout exists until Start workout. */
  openCustom: () => void;
  /** Opens the Cardio picker, optionally with an activity already highlighted. */
  openCardio: (activityId?: string) => void;
  /** Opens the Sign out confirmation. */
  askSignOut: () => void;
};

export const ShellContext = createContext<ShellValue | null>(null);

export function useShell(): ShellValue {
  const ctx = useContext(ShellContext);
  if (!ctx) throw new Error('useShell must be used within AppShell');
  return ctx;
}
