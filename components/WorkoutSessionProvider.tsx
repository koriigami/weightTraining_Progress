'use client';

import { useSession } from 'next-auth/react';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import * as feedback from '@/lib/feedback';
import { instantiateRoutine, setXp, workoutItemsFromRoutine } from '@/lib/routines';
import type { LoggedSet, Routine, WorkoutTotals } from '@/lib/routines';
import * as S from '@/lib/session';
import type { LapPatch, Removal, Session, SessionResult, SetPatch, WorkoutInput } from '@/lib/session';
import { useWakeLock } from '@/lib/useWakeLock';
import { useProgress } from '@/components/ProgressProvider';
import type { SaveWorkoutResult } from '@/components/ProgressProvider';

export type FinishResult = SaveWorkoutResult;

/** What the Victory screen shows: the saved workout, flagged when it was logged after the fact instead of finished live. */
export type FinishedWorkout = Extract<FinishResult, { ok: true }> & { logged?: boolean };

type WorkoutSessionValue = {
  /** The workout in progress, or null. Kept in localStorage per user, so a reload does not lose it. */
  session: Session | null;
  /** False until the stored session has been read. Wait for it before redirecting away from /workout. */
  ready: boolean;
  /** Ticked sets, volume and XP so far (set XP only, without the daily bonus). */
  totals: WorkoutTotals;
  counts: { done: number; total: number; unticked: number };
  /** The last workout finish() or logWorkout() saved, for the Victory screen. Lives in memory only. */
  lastFinished: FinishedWorkout | null;
  clearLastFinished: () => void;

  /** Start a workout from a routine. Returns an error message, or null. */
  start: (routineId: string) => string | null;
  /** Start a custom workout with the exercises picked before Start. The clock starts now. */
  startCustom: (exerciseIds: string[]) => string | null;
  /** Starts a workout from a ready-made routine that is not saved (Try now). Dumbbell weights are set for this person. */
  startTemplate: (routine: Routine) => string | null;
  /** Start a cardio workout: one distance exercise (an id from CARDIO_CHOICES), one set to fill in. */
  startCardio: (exerciseId: string) => string | null;
  /** Rejects an exercise that is already in the workout. Returns an error message, or null. */
  addExercise: (exerciseId: string) => string | null;
  /** Returns an undo function, or null when there was nothing at that index. */
  removeExercise: (index: number) => (() => void) | null;
  replaceExercise: (index: number, exerciseId: string) => string | null;
  moveExercise: (index: number, direction: -1 | 1) => void;
  addSet: (index: number) => string | null;
  removeSet: (index: number, setIndex: number) => string | null;
  updateSet: (index: number, setIndex: number, patch: SetPatch) => void;
  /** The cardio card's Time and Distance. Time above zero counts as done, and typing a Time stops it following the clock. */
  updateCardio: (index: number, patch: SetPatch) => void;
  /** Tap on Lap: stamps the time since the last lap on the cardio card, with the chosen distance in km. Does nothing under a second after the last lap, and leaves the Time following the clock. */
  addLap: (index: number, km?: number) => void;
  /** Corrects a stamped lap's time (whole seconds) or distance (km). */
  updateLap: (index: number, lapIndex: number, patch: LapPatch) => void;
  removeLap: (index: number, lapIndex: number) => void;
  /** Returns whether the set is now ticked and the XP it is worth, for the "+5 XP" pop. */
  toggleSet: (index: number, setIndex: number) => { done: boolean; xp: number } | null;
  setTitle: (title: string) => void;
  setItemNotes: (index: number, notes: string) => void;
  discard: () => void;
  /**
   * Saves the workout. Needs at least one ticked set. Unticked sets are dropped.
   * The workout stays in progress until the save works, so nothing is lost on
   * a failure. On success it resolves to the saved workout plus XP before and
   * after, and the celebration events to play on the Victory screen.
   */
  finish: () => Promise<FinishResult>;
  /**
   * Saves a workout done earlier (the Log screen's payload from buildLoggedWorkout). Like
   * finish() it holds the celebration back for the Victory screen, but it never reads or
   * changes the workout in progress, so a live workout is untouched.
   */
  logWorkout: (workout: WorkoutInput) => Promise<FinishResult>;
};

const WorkoutSessionContext = createContext<WorkoutSessionValue | null>(null);

function read(userId: string): Session | null {
  try {
    return S.parseStoredSession(localStorage.getItem(S.sessionKey(userId)));
  } catch {
    return null;
  }
}

function write(userId: string, session: Session | null) {
  try {
    if (session) localStorage.setItem(S.sessionKey(userId), S.serializeSession(session));
    else localStorage.removeItem(S.sessionKey(userId));
  } catch {
    // Storage can be blocked or full. The workout still works for this visit.
  }
}

const EMPTY_TOTALS: WorkoutTotals = { sets: 0, volume: 0, xp: 0, exercises: 0, cardioMinutes: 0, km: 0 };

export function WorkoutSessionProvider({ children }: { children: React.ReactNode }) {
  const { data: auth } = useSession();
  const userId = auth?.user?.id ?? null;
  const { routines, workouts, lookup, saveWorkout, prefs } = useProgress();

  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  const [lastFinished, setLastFinished] = useState<FinishedWorkout | null>(null);

  const sessionRef = useRef<Session | null>(null);
  const userRef = useRef<string | null>(userId);
  userRef.current = userId;
  const lookupRef = useRef(lookup);
  lookupRef.current = lookup;
  const routinesRef = useRef(routines);
  routinesRef.current = routines;
  const prefsRef = useRef(prefs);
  prefsRef.current = prefs;
  const workoutsRef = useRef(workouts);
  workoutsRef.current = workouts;
  const finishing = useRef<Promise<FinishResult> | null>(null);

  // One place that changes the workout: the ref (for instant reads), React state
  // (for the screen) and localStorage.
  const commit = useCallback((next: Session | null) => {
    sessionRef.current = next;
    setSession(next);
    if (userRef.current) write(userRef.current, next);
  }, []);

  // Load this user's workout in progress when the signed-in user is known.
  useEffect(() => {
    if (!userId) {
      sessionRef.current = null;
      setSession(null);
      setReady(false);
      return;
    }
    const stored = read(userId);
    sessionRef.current = stored;
    setSession(stored);
    setReady(true);
  }, [userId]);

  // Another tab started, edited or finished the workout.
  useEffect(() => {
    if (!userId) return undefined;
    function onStorage(e: StorageEvent) {
      if (e.key !== S.sessionKey(userId as string)) return;
      const next = read(userId as string);
      sessionRef.current = next;
      setSession(next);
    }
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [userId]);

  const apply = useCallback(
    (result: SessionResult): string | null => {
      if (!result.ok) return result.error;
      commit(result.session);
      return null;
    },
    [commit]
  );

  // Last time's numbers for a new exercise, when the pref is on.
  const prefill = useCallback((): S.Prefill | undefined => (prefsRef.current.prefillLast ? S.prefillFrom(workoutsRef.current) : undefined), []);

  const start = useCallback(
    (routineId: string) => {
      if (sessionRef.current) return 'Finish or discard your current workout first.';
      const routine = routinesRef.current.find((r) => r.id === routineId);
      if (!routine) return 'That routine no longer exists.';
      commit(S.sessionFromRoutine(routine, new Date()));
      return null;
    },
    [commit]
  );

  const startCustom = useCallback(
    (exerciseIds: string[]) => {
      if (sessionRef.current) return 'Finish or discard your current workout first.';
      const result = S.customSession(new Date(), exerciseIds, lookupRef.current, { prefill: prefill() });
      if (!result.ok) return result.error;
      commit(result.session);
      return null;
    },
    [commit, prefill]
  );

  const startTemplate = useCallback(
    (routine: Routine) => {
      if (sessionRef.current) return 'Finish or discard your current workout first.';
      const personal = instantiateRoutine(routine, routine.id, prefsRef.current);
      const items = workoutItemsFromRoutine(personal);
      commit(S.newSession(new Date(), { title: routine.title, items, plan: S.planFromItems(items) }));
      return null;
    },
    [commit]
  );

  const startCardio = useCallback(
    (exerciseId: string) => {
      if (sessionRef.current) return 'Finish or discard your current workout first.';
      const result = S.cardioSession(exerciseId, new Date(), lookupRef.current);
      if (!result.ok) return result.error;
      commit(result.session);
      return null;
    },
    [commit]
  );

  const addExercise = useCallback(
    (exerciseId: string) => {
      const cur = sessionRef.current;
      if (!cur) return 'No workout in progress.';
      return apply(S.addExercise(cur, exerciseId, lookupRef.current, prefill()));
    },
    [apply, prefill]
  );

  const removeExercise = useCallback(
    (index: number) => {
      const cur = sessionRef.current;
      if (!cur) return null;
      const removal: Removal | null = S.removeExercise(cur, index);
      if (!removal) return null;
      commit(removal.session);
      return () => {
        const now = sessionRef.current;
        if (now) commit(S.restoreExercise(now, removal.removed, removal.index));
      };
    },
    [commit]
  );

  const replaceExercise = useCallback(
    (index: number, exerciseId: string) => {
      const cur = sessionRef.current;
      if (!cur) return 'No workout in progress.';
      return apply(S.replaceExercise(cur, index, exerciseId, lookupRef.current));
    },
    [apply]
  );

  const moveExercise = useCallback(
    (index: number, direction: -1 | 1) => {
      const cur = sessionRef.current;
      if (cur) commit(S.moveExercise(cur, index, direction));
    },
    [commit]
  );

  const addSet = useCallback(
    (index: number) => {
      const cur = sessionRef.current;
      if (!cur) return 'No workout in progress.';
      return apply(S.addSet(cur, index, lookupRef.current));
    },
    [apply]
  );

  const removeSet = useCallback(
    (index: number, setIndex: number) => {
      const cur = sessionRef.current;
      if (!cur) return 'No workout in progress.';
      return apply(S.removeSet(cur, index, setIndex));
    },
    [apply]
  );

  const updateSet = useCallback(
    (index: number, setIndex: number, patch: SetPatch) => {
      const cur = sessionRef.current;
      if (cur) commit(S.updateSet(cur, index, setIndex, patch));
    },
    [commit]
  );

  const updateCardio = useCallback(
    (index: number, patch: SetPatch) => {
      const cur = sessionRef.current;
      if (cur) commit(S.updateCardio(cur, index, patch));
    },
    [commit]
  );

  const addLap = useCallback(
    (index: number, km?: number) => {
      const cur = sessionRef.current;
      if (!cur) return;
      const next = S.addLap(cur, index, new Date(), km);
      if (next === cur) return;
      commit(next);
      feedback.lap();
    },
    [commit]
  );

  const updateLap = useCallback(
    (index: number, lapIndex: number, patch: LapPatch) => {
      const cur = sessionRef.current;
      if (cur) commit(S.updateLap(cur, index, lapIndex, patch));
    },
    [commit]
  );

  const removeLap = useCallback(
    (index: number, lapIndex: number) => {
      const cur = sessionRef.current;
      if (cur) commit(S.removeLap(cur, index, lapIndex));
    },
    [commit]
  );

  const toggleSet = useCallback(
    (index: number, setIndex: number) => {
      const cur = sessionRef.current;
      const item = cur?.items[index];
      const before: LoggedSet | undefined = item?.sets[setIndex];
      if (!cur || !item || !before) return null;
      commit(S.toggleSet(cur, index, setIndex));
      const done = !before.done;
      // The last set of an exercise has its own sound; any other tick climbs, and an untick falls.
      if (!done) feedback.setUnticked();
      else if (item.sets.every((x, k) => (k === setIndex ? true : Boolean(x.done)))) feedback.exerciseDone();
      else feedback.setTicked();
      const e = lookupRef.current(item.exerciseId);
      return { done, xp: done && e ? setXp(e, before) : 0 };
    },
    [commit]
  );

  const setTitle = useCallback(
    (title: string) => {
      const cur = sessionRef.current;
      if (cur) commit(S.setTitle(cur, title));
    },
    [commit]
  );

  const setItemNotes = useCallback(
    (index: number, notes: string) => {
      const cur = sessionRef.current;
      if (cur) commit(S.setItemNotes(cur, index, notes));
    },
    [commit]
  );

  const discard = useCallback(() => commit(null), [commit]);

  const finish = useCallback((): Promise<FinishResult> => {
    // A second tap while the first is saving gets the same answer.
    if (finishing.current) return finishing.current;
    const cur = sessionRef.current;
    if (!cur) return Promise.resolve({ ok: false, error: 'No workout in progress.' });
    const built = S.buildWorkoutInput(cur, { now: new Date(), lookup: lookupRef.current });
    if (!built.ok) return Promise.resolve(built);
    const run = (async (): Promise<FinishResult> => {
      try {
        // The overlays wait for the Victory screen, which plays them from `events`.
        const saved = await saveWorkout(built.workout, { celebrate: false });
        if (!saved.ok) return saved;
        // Only clear the workout if it has not been replaced in the meantime.
        if (sessionRef.current === cur) commit(null);
        setLastFinished(saved);
        return saved;
      } finally {
        finishing.current = null;
      }
    })();
    finishing.current = run;
    return run;
  }, [commit, saveWorkout]);

  const logWorkout = useCallback(
    async (workout: WorkoutInput): Promise<FinishResult> => {
      const saved = await saveWorkout(workout, { celebrate: false });
      if (!saved.ok) return saved;
      setLastFinished({ ...saved, logged: true });
      return saved;
    },
    [saveWorkout]
  );

  // Time on a cardio card follows the clock until it is typed in.
  const following = Boolean(session?.follow?.length);
  useEffect(() => {
    if (!following) return undefined;
    const tick = () => {
      const cur = sessionRef.current;
      if (!cur) return;
      const next = S.syncFollow(cur, new Date());
      if (next !== cur) commit(next);
    };
    tick();
    const id = setInterval(tick, 5000);
    return () => clearInterval(id);
  }, [following, session?.startedAt, commit]);

  // Keep the screen awake while a workout is running, when the pref is on.
  useWakeLock(Boolean(session) && prefs.keepAwake);

  const totals = useMemo(() => (session ? S.sessionTotals(session, lookup) : EMPTY_TOTALS), [session, lookup]);
  const counts = useMemo(() => (session ? S.setCounts(session) : { done: 0, total: 0, unticked: 0 }), [session]);
  const clearLastFinished = useCallback(() => setLastFinished(null), []);

  const value: WorkoutSessionValue = {
    session,
    ready,
    totals,
    counts,
    lastFinished,
    clearLastFinished,
    start,
    startCustom,
    startTemplate,
    startCardio,
    addExercise,
    removeExercise,
    replaceExercise,
    moveExercise,
    addSet,
    removeSet,
    updateSet,
    updateCardio,
    addLap,
    updateLap,
    removeLap,
    toggleSet,
    setTitle,
    setItemNotes,
    discard,
    finish,
    logWorkout,
  };

  return <WorkoutSessionContext.Provider value={value}>{children}</WorkoutSessionContext.Provider>;
}

export function useWorkoutSession(): WorkoutSessionValue {
  const ctx = useContext(WorkoutSessionContext);
  if (!ctx) throw new Error('useWorkoutSession must be used within WorkoutSessionProvider');
  return ctx;
}

/** The time now in ms, ticking every second while a workout is running. Null until the client is ready, or without a workout. */
export function useNow(startedAt: string | undefined): number | null {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    if (!startedAt) {
      setNow(null);
      return undefined;
    }
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [startedAt]);
  return startedAt ? now : null;
}

/** The time since the workout started, as "12m 05s", ticking every second. Empty until the client is ready. */
export function useElapsed(startedAt: string | undefined): string {
  const now = useNow(startedAt);
  if (!startedAt || now === null) return '';
  return S.formatElapsed(now - Date.parse(startedAt));
}
