'use client';

import { useSession } from 'next-auth/react';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { computeProgress, emptyState, levelForXp, rankForLevel, totalXp, xpIntoLevel } from '@/lib/progress';
import type { AppState, FullProgress, Goal, GoalDirection, Rank } from '@/lib/progress';
import type { CustomExercise } from '@/data/exercises';
import { applyRoutineAction } from '@/lib/routineActions';
import { resolvePrefs, stateLookup } from '@/lib/routines';
import type { ExerciseLookup, PlanItem, Prefs, Routine, WorkoutItem, WorkoutLog } from '@/lib/routines';
import type { WorkoutInput } from '@/lib/session';
import { allEarnedBadges } from '@/lib/badges';
import { todayStr } from '@/lib/date';
import { useToday } from '@/lib/useToday';
import * as feedback from '@/lib/feedback';
import { useCelebration } from '@/components/celebrate/CelebrationProvider';
import { growSeen, orderEvents, unseenEvents } from '@/lib/celebrations';
import type { CelebrationEvent } from '@/lib/celebrations';
import { Toast } from '@/components/ui/Toast';
import type { ToastState } from '@/components/ui/Toast';

type GoalPatch = { target: number; deadline: string; direction?: GoalDirection };

// Where a person stood on the XP ladder at one moment. finish() returns one from
// before a workout and one from after it, so the Victory screen can roll the
// counter and fill the bar from one to the other.
export type XpSnapshot = { xp: number; level: number; rank: Rank; current: number; needed: number };

export type SaveWorkoutResult =
  | {
      ok: true;
      workout: WorkoutLog;
      before: XpSnapshot;
      after: XpSnapshot;
      /** Level ups, rank ups and new badges this workout caused, level and rank ups first. Not played yet: hand them to useCelebration().enqueue when the moment is right. */
      events: CelebrationEvent[];
    }
  | { ok: false; error: string };

// A workout as edited on the Victory screen or the Edit workout screen. Only these
// fields can change. The server works XP, marks and the plan result out again.
export type WorkoutPatchInput = {
  id: string;
  title?: string;
  date?: string;
  when?: string;
  notes?: string | null;
  photo?: string | null;
  items?: WorkoutItem[];
  plan?: PlanItem[];
  startedAt?: string;
  finishedAt?: string;
};

/** Where the level stood before and after an edit or a delete, so the caller can say so. */
export type WorkoutChange = { ok: true; before: XpSnapshot; after: XpSnapshot } | { ok: false; error: string };

export type CustomExerciseInput = Omit<CustomExercise, 'id' | 'custom'> & { id?: string };
export type AddCustomExerciseResult = { ok: true; exercise: CustomExercise } | { ok: false; error: string };

type ProgressContextValue = {
  state: AppState;
  progress: FullProgress;
  loading: boolean;
  authorized: boolean;
  /** The dark wood toast. Shows for 4s, or 6s with an action such as Undo. */
  showToast: (text: string, actionLabel?: string, onAction?: () => void) => void;
  routines: Routine[];
  workouts: WorkoutLog[];
  /** The stored prefs, or the defaults. A user who predates onboarding reads as onboarded. */
  prefs: Prefs;
  customExercises: CustomExercise[];
  /** Finds an exercise by id: the library first, then the user's own. */
  lookup: ExerciseLookup;
  /** Every routine, workout, prefs and custom exercise action updates the screen at once and resolves to an error message, or null when it saved. */
  /** `after` puts a new routine right after that one instead of at the end. */
  saveRoutine: (routine: Routine, opts?: { after?: string }) => Promise<string | null>;
  deleteRoutine: (id: string) => Promise<string | null>;
  /** celebrate: false holds back the level-up and badge overlays (they come back in `events`). */
  saveWorkout: (workout: WorkoutInput, opts?: { celebrate?: boolean }) => Promise<SaveWorkoutResult>;
  updateWorkout: (patch: WorkoutPatchInput) => Promise<WorkoutChange>;
  deleteWorkout: (id: string) => Promise<WorkoutChange>;
  savePrefs: (prefs: Prefs) => Promise<string | null>;
  /** Puts the "XP was worked out again with the new rules" note on Home away for good. */
  dismissRulesNote: () => Promise<string | null>;
  /** The same for the "new daily bonus" note. */
  dismissRulesV3Note: () => Promise<string | null>;
  addCustomExercise: (exercise: CustomExerciseInput) => Promise<AddCustomExerciseResult>;
  logWeight: (date: string, kg: number) => void;
  addGoal: (goal: Omit<Goal, 'id' | 'createdAt'>) => Promise<string | null>;
  updateGoal: (goal: Goal, patch: GoalPatch) => Promise<string | null>;
  deleteGoal: (goal: Goal) => void;
};

const ProgressContext = createContext<ProgressContextValue | null>(null);

const seenKey = (userId: string) => `wt:seen:${userId}`;

// "Couldn't save": network failure, 401, or a server-side rejection with no
// message of its own.
const GENERIC_SAVE_ERROR = "Couldn't save. Check your connection.";

type PostOutcome = { ok: true; data: AppState } | { ok: false; error: string };

type Seen = { level: number; badgeIds: string[] };

function readSeen(userId: string): Seen | null {
  try {
    const raw = localStorage.getItem(seenKey(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (typeof parsed?.level !== 'number' || !Array.isArray(parsed?.badgeIds)) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeSeen(userId: string, seen: Seen) {
  try {
    localStorage.setItem(seenKey(userId), JSON.stringify(seen));
  } catch {
    // ignore storage errors
  }
}

// wt:seen only ever grows: level is the max ever seen, badges are a union.
// Untick/retick, Undo, or a goal delete-and-restore can all momentarily lower
// the *current* level or badge set; if that lower snapshot overwrote the
// record, re-crossing the same threshold later would look "new" again and
// replay its celebration.
function updateSeen(userId: string, level: number, badgeIds: string[]) {
  writeSeen(userId, growSeen(readSeen(userId), level, badgeIds));
}

// The moment for going from one level to a higher one: a rank up when the rank
// changed, else a level up.
function levelEvent(fromLevel: number, toLevel: number, xpNow: number): CelebrationEvent {
  const fromRank = rankForLevel(fromLevel);
  const toRank = rankForLevel(toLevel);
  if (fromRank !== toRank) return { kind: 'rankup', fromRank, toRank, level: toLevel, xpNow, from: fromLevel };
  return { kind: 'levelup', from: fromLevel, to: toLevel, rank: toRank, xpNow };
}

// What a change of state earned: a level up or rank up, then the new badges.
function diffCelebrations(before: AppState, after: AppState, today: string): CelebrationEvent[] {
  const beforeIds = new Set(allEarnedBadges(before, today).map((b) => b.id));
  const newBadges = allEarnedBadges(after, today).filter((b) => !beforeIds.has(b.id));
  const events: CelebrationEvent[] = newBadges.map((b) => ({ kind: 'badge', badge: b }));

  const afterXp = totalXp(after, today);
  const beforeLevel = levelForXp(totalXp(before, today));
  const afterLevel = levelForXp(afterXp);
  if (afterLevel > beforeLevel) events.push(levelEvent(beforeLevel, afterLevel, afterXp));
  return orderEvents(events);
}

// "tick at least one set" becomes "Tick at least one set." for showing to people.
function sentence(message: string): string {
  const t = message.trim();
  if (!t) return GENERIC_SAVE_ERROR;
  const s = t.charAt(0).toUpperCase() + t.slice(1);
  return /[.!?]$/.test(s) ? s : `${s}.`;
}

export function xpSnapshot(state: AppState, today: string): XpSnapshot {
  const xp = totalXp(state, today);
  const { current, needed, level } = xpIntoLevel(xp);
  return { xp, level, rank: rankForLevel(level), current, needed };
}

export function ProgressProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AppState>(emptyState());
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const { data: session } = useSession();
  const userId = session?.user?.id ?? null;
  const [toast, setToast] = useState<ToastState>(null);
  const toastId = useRef(0);
  const stateRef = useRef(state);
  stateRef.current = state;
  const userIdRef = useRef(userId);
  userIdRef.current = userId;

  // One promise chain serializes every POST, so two rapid actions can never
  // race a read-modify-write on the server. Each request gets a sequence
  // number; a response only gets applied if no newer request has been queued
  // since (otherwise it would flicker the UI back to stale, in-between data).
  const queueRef = useRef<Promise<unknown>>(Promise.resolve());
  const seqRef = useRef(0);

  const today = useToday();
  const celebration = useCelebration();

  const showToast = useCallback((text: string, actionLabel?: string, onAction?: () => void) => {
    toastId.current += 1;
    setToast({ id: toastId.current, text, actionLabel, onAction });
  }, []);

  const fetchState = useCallback(
    async () => {
      const uid = userIdRef.current;
      if (!uid) return;
      setLoading(true);
      try {
        const res = await fetch('/api/state');
        if (res.status === 401) {
          setAuthorized(false);
          return;
        }
        if (!res.ok) return;
        const data: AppState = await res.json();
        setState(data);
        setAuthorized(true);

        const now = todayStr();
        const xpNow = totalXp(data, now);
        const level = levelForXp(xpNow);
        const badgeIds = allEarnedBadges(data, now).map((b) => b.id);
        const seen = readSeen(uid);
        if (seen === null) {
          writeSeen(uid, { level, badgeIds });
        } else {
          const newBadges = allEarnedBadges(data, now).filter((b) => !seen.badgeIds.includes(b.id));
          const events: CelebrationEvent[] = newBadges.map((b) => ({ kind: 'badge', badge: b }));
          if (level > seen.level) events.push(levelEvent(seen.level, level, xpNow));
          if (events.length) celebration.enqueue(orderEvents(events));
          updateSeen(uid, level, badgeIds);
        }
      } catch {
        // A background refetch (after a failed queued write) failing too is
        // not itself user-actionable beyond the error toast already shown.
      } finally {
        setLoading(false);
      }
    },
    [celebration]
  );

  // Load this user's state whenever the signed-in user changes.
  useEffect(() => {
    if (!userId) {
      setLoading(false);
      setAuthorized(false);
      return;
    }
    fetchState();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const postRaw = useCallback(async (body: Record<string, unknown>): Promise<PostOutcome> => {
    try {
      const res = await fetch('/api/state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (res.status === 401) {
        setAuthorized(false);
        return { ok: false, error: GENERIC_SAVE_ERROR };
      }
      if (!res.ok) {
        const errBody = await res.json().catch(() => null);
        const message = errBody && typeof errBody.error === 'string' ? errBody.error : GENERIC_SAVE_ERROR;
        return { ok: false, error: message };
      }
      return { ok: true, data: (await res.json()) as AppState };
    } catch {
      return { ok: false, error: GENERIC_SAVE_ERROR };
    }
  }, []);

  const post = useCallback(
    async (body: Record<string, unknown>): Promise<AppState | undefined> => {
      const outcome = await postRaw(body);
      return outcome.ok ? outcome.data : undefined;
    },
    [postRaw]
  );

  // Applies a server response: updates state, plays feedback/celebrations for
  // whatever changed between `before` and the new state, and refreshes wt:seen.
  const applyResult = useCallback(
    (before: AppState, after: AppState, celebrate = true) => {
      setState(after);
      const now = todayStr();
      // Only what is new to this person: a level lost to a delete or an edit is not celebrated again on the way back.
      const seen = userIdRef.current ? readSeen(userIdRef.current) : null;
      const events = celebrate ? unseenEvents(diffCelebrations(before, after, now), seen) : [];
      if (events.length) celebration.enqueue(events);
      const level = levelForXp(totalXp(after, now));
      const badgeIds = allEarnedBadges(after, now).map((b) => b.id);
      if (userIdRef.current) updateSeen(userIdRef.current, level, badgeIds);
    },
    [celebration]
  );

  // Serializes one POST behind the queue. `before` is the state snapshot from
  // immediately before this action's own optimistic update, so a failure can
  // roll back to exactly that. If a newer request has already been queued by
  // the time this one settles, we never touch state directly (stale write):
  // on success we simply drop it; on failure we can't safely revert to
  // `before` either (that would clobber whatever was optimistically applied
  // after it), so we refetch the true server state instead of guessing.
  const runQueued = useCallback(
    (body: Record<string, unknown>, before: AppState, onApplied?: (after: AppState) => void): Promise<AppState | undefined> => {
      const mySeq = ++seqRef.current;
      const run = queueRef.current.then(async () => {
        const data = await post(body);
        if (data) {
          if (mySeq === seqRef.current) {
            applyResult(before, data);
            onApplied?.(data);
          }
          return data;
        }
        if (mySeq === seqRef.current) {
          setState(before);
        } else {
          await fetchState();
        }
        showToast(GENERIC_SAVE_ERROR);
        return undefined;
      });
      queueRef.current = run.catch(() => undefined);
      return run;
    },
    [post, applyResult, showToast, fetchState]
  );

  // Same queue, same rollback/refetch rules as runQueued, but for callers
  // (goal add/edit) that need the server's own error message to show inline
  // in a sheet instead of a toast. Resolves to null on success.
  const runQueuedWithError = useCallback(
    (
      body: Record<string, unknown>,
      before: AppState,
      onApplied?: (after: AppState) => void,
      opts?: { celebrate?: boolean }
    ): Promise<string | null> => {
      const mySeq = ++seqRef.current;
      const run = queueRef.current.then(async (): Promise<string | null> => {
        const outcome = await postRaw(body);
        if (outcome.ok) {
          if (mySeq === seqRef.current) {
            applyResult(before, outcome.data, opts?.celebrate !== false);
            onApplied?.(outcome.data);
          }
          return null;
        }
        if (mySeq === seqRef.current) {
          setState(before);
        } else {
          await fetchState();
        }
        return outcome.error;
      });
      queueRef.current = run.catch(() => null);
      return run;
    },
    [postRaw, applyResult, fetchState]
  );

  const logWeight = useCallback(
    (date: string, kg: number) => {
      const before = stateRef.current;
      const optimistic: AppState = { ...before, weights: { ...before.weights, [date]: kg } };
      setState(optimistic);
      runQueued({ action: 'weight', date, kg }, before);
    },
    [runQueued]
  );

  // Both resolve to an error message on failure (shown inline in the goal
  // sheet), or null on success.
  const addGoal = useCallback(
    (goal: Omit<Goal, 'id' | 'createdAt'>): Promise<string | null> => {
      const before = stateRef.current;
      return runQueuedWithError({ action: 'addGoal', goal }, before);
    },
    [runQueuedWithError]
  );

  const updateGoal = useCallback(
    (goal: Goal, patch: GoalPatch): Promise<string | null> => {
      const before = stateRef.current;
      const optimisticGoal: Goal = { ...goal, target: patch.target, deadline: patch.deadline, direction: patch.direction ?? goal.direction };
      const optimistic: AppState = { ...before, goals: before.goals.map((g) => (g.id === goal.id ? optimisticGoal : g)) };
      setState(optimistic);
      return runQueuedWithError(
        { action: 'updateGoal', id: goal.id, target: patch.target, deadline: patch.deadline, direction: patch.direction },
        before
      );
    },
    [runQueuedWithError]
  );

  const deleteGoal = useCallback(
    (goal: Goal) => {
      const before = stateRef.current;
      const optimistic: AppState = { ...before, goals: before.goals.filter((g) => g.id !== goal.id) };
      setState(optimistic);

      runQueued({ action: 'deleteGoal', id: goal.id }, before, () => {
        showToast('Goal deleted', 'Undo', () => {
          const restoreBefore = stateRef.current;
          const optimisticRestore: AppState = { ...restoreBefore, goals: [...restoreBefore.goals, goal] };
          setState(optimisticRestore);
          runQueued({ action: 'restoreGoal', goal }, restoreBefore);
        });
      });
    },
    [runQueued, showToast]
  );

  // ---------------- Routines, workouts, prefs, custom exercises ----------------

  // Runs the same pure action the server runs (lib/routineActions) for an
  // instant optimistic update, then sends it through the queue. A rejection by
  // the pure action (bad input, a duplicate) never leaves the device.
  const runRoutineAction = useCallback(
    async (
      body: Record<string, unknown>,
      opts?: { celebrate?: boolean }
    ): Promise<{ ok: true; before: AppState; after: AppState } | { ok: false; error: string }> => {
      const before = stateRef.current;
      const local = applyRoutineAction(before, body, { today: todayStr() });
      if (!local.ok) return { ok: false, error: sentence(local.error) };
      stateRef.current = local.state;
      setState(local.state);
      const error = await runQueuedWithError(body, before, undefined, opts);
      return error === null ? { ok: true, before, after: local.state } : { ok: false, error };
    },
    [runQueuedWithError]
  );

  const saveRoutine = useCallback(
    async (routine: Routine, opts?: { after?: string }): Promise<string | null> => {
      const r = await runRoutineAction({ action: 'saveRoutine', routine, ...(opts?.after ? { after: opts.after } : {}) });
      return r.ok ? null : r.error;
    },
    [runRoutineAction]
  );

  const deleteRoutine = useCallback(
    async (id: string): Promise<string | null> => {
      const r = await runRoutineAction({ action: 'deleteRoutine', id });
      return r.ok ? null : r.error;
    },
    [runRoutineAction]
  );

  const saveWorkout = useCallback(
    async (workout: WorkoutInput, opts?: { celebrate?: boolean }): Promise<SaveWorkoutResult> => {
      const seen = userIdRef.current ? readSeen(userIdRef.current) : null;
      const r = await runRoutineAction({ action: 'saveWorkout', workout }, opts);
      if (!r.ok) return r;
      const now = todayStr();
      const saved = (r.after.workouts ?? []).find((w) => w.id === workout.id);
      if (!saved) return { ok: false, error: GENERIC_SAVE_ERROR };
      return {
        ok: true,
        workout: saved,
        before: xpSnapshot(r.before, now),
        after: xpSnapshot(r.after, now),
        events: unseenEvents(diffCelebrations(r.before, r.after, now), seen),
      };
    },
    [runRoutineAction]
  );

  const updateWorkout = useCallback(
    async (patch: WorkoutPatchInput): Promise<WorkoutChange> => {
      const r = await runRoutineAction({ action: 'updateWorkout', ...patch });
      if (!r.ok) return r;
      const now = todayStr();
      return { ok: true, before: xpSnapshot(r.before, now), after: xpSnapshot(r.after, now) };
    },
    [runRoutineAction]
  );

  const deleteWorkout = useCallback(
    async (id: string): Promise<WorkoutChange> => {
      const r = await runRoutineAction({ action: 'deleteWorkout', id });
      if (!r.ok) return r;
      const now = todayStr();
      return { ok: true, before: xpSnapshot(r.before, now), after: xpSnapshot(r.after, now) };
    },
    [runRoutineAction]
  );

  const savePrefs = useCallback(
    async (prefs: Prefs): Promise<string | null> => {
      const r = await runRoutineAction({ action: 'savePrefs', prefs });
      return r.ok ? null : r.error;
    },
    [runRoutineAction]
  );

  const dismissRulesNote = useCallback(async (): Promise<string | null> => {
    const r = await runRoutineAction({ action: 'setRulesNote', value: false });
    return r.ok ? null : r.error;
  }, [runRoutineAction]);

  const dismissRulesV3Note = useCallback(async (): Promise<string | null> => {
    const r = await runRoutineAction({ action: 'setRulesV3Note', value: false });
    return r.ok ? null : r.error;
  }, [runRoutineAction]);

  const addCustomExercise = useCallback(
    async (exercise: CustomExerciseInput): Promise<AddCustomExerciseResult> => {
      // The id is picked here so the optimistic copy and the server's agree.
      const id = exercise.id ?? `custom-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
      const r = await runRoutineAction({ action: 'addCustomExercise', exercise: { ...exercise, id } });
      if (!r.ok) return r;
      const saved = (r.after.customExercises ?? []).find((e) => e.id === id);
      return saved ? { ok: true, exercise: saved } : { ok: false, error: GENERIC_SAVE_ERROR };
    },
    [runRoutineAction]
  );

  // With no stored prefs (the owner's migrated progress) the device's own sound and
  // haptics choice in wt:prefs is what they get, so Settings shows what really plays.
  const prefs = useMemo(() => {
    const p = resolvePrefs(state);
    if (state.prefs) return p;
    const device = feedback.getPrefs();
    return { ...p, sound: device.sound, haptic: device.vibrate };
  }, [state]);
  const lookup = useMemo(() => stateLookup(state), [state]);
  const routines = useMemo(() => state.routines ?? [], [state.routines]);
  const workouts = useMemo(() => state.workouts ?? [], [state.workouts]);
  const customExercises = useMemo(() => state.customExercises ?? [], [state.customExercises]);

  // The server's sound and haptic prefs are the source of truth once they exist.
  useEffect(() => {
    if (!state.prefs) return;
    feedback.setSoundEnabled(state.prefs.sound);
    feedback.setVibrateEnabled(state.prefs.haptic);
  }, [state.prefs]);

  const progress = useMemo(() => computeProgress(state, today), [state, today]);

  const value: ProgressContextValue = {
    state,
    progress,
    loading,
    authorized,
    showToast,
    routines,
    workouts,
    prefs,
    customExercises,
    lookup,
    saveRoutine,
    deleteRoutine,
    saveWorkout,
    updateWorkout,
    deleteWorkout,
    savePrefs,
    dismissRulesNote,
    dismissRulesV3Note,
    addCustomExercise,
    logWeight,
    addGoal,
    updateGoal,
    deleteGoal,
  };

  return (
    <ProgressContext.Provider value={value}>
      {children}
      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </ProgressContext.Provider>
  );
}

export function useProgress(): ProgressContextValue {
  const ctx = useContext(ProgressContext);
  if (!ctx) throw new Error('useProgress must be used within ProgressProvider');
  return ctx;
}
