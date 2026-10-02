'use client';

import { createContext, useContext } from 'react';

/** start: begins a workout now. log: adds one you already did (it never touches a workout in progress). */
export type StartMode = 'start' | 'log';

type ShellValue = {
  /** Opens the Start sheet (routines, Cardio, Custom workout). */
  openStart: () => void;
  /** Opens the same sheet in log mode, titled "Log a workout". */
  openLog: () => void;
  /** Opens the exercise picker for a custom workout. No workout exists until Start workout (or Log workout, in log mode). */
  openCustom: (mode?: StartMode) => void;
  /** Opens the Cardio picker, optionally with an activity already highlighted. */
  openCardio: (activityId?: string, mode?: StartMode) => void;
  /** Opens the Sign out confirmation. */
  askSignOut: () => void;
};

export const ShellContext = createContext<ShellValue | null>(null);

export function useShell(): ShellValue {
  const ctx = useContext(ShellContext);
  if (!ctx) throw new Error('useShell must be used within AppShell');
  return ctx;
}
