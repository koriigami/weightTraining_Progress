'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  allItemKeys,
  computeProgress,
  emptyState,
  isDayCleared,
  levelForXp,
  planDay,
  rankForLevel,
  totalXp,
} from '@/lib/progress';
import type { AppState, DayLog, FullProgress, Goal, GoalDirection } from '@/lib/progress';
import { allEarnedBadges } from '@/lib/badges';
import { todayStr } from '@/lib/date';
import { useToday } from '@/lib/useToday';
import * as feedback from '@/lib/feedback';
import { useCelebration } from '@/components/celebrate/CelebrationProvider';
import type { CelebrationEvent } from '@/components/celebrate/CelebrationProvider';
import { Snackbar } from '@/components/Snackbar';
import type { SnackbarState } from '@/components/Snackbar';

type GoalPatch = { target: number; deadline: string; direction?: GoalDirection };

type ProgressContextValue = {
  state: AppState;
  progress: FullProgress;
  loading: boolean;
  authorized: boolean;
  passcodeError: boolean;
  snackbarVisible: boolean;
  submitPasscode: (code: string) => void;
  tick: (date: string, key: string, xpAmount: number) => void;
  untick: (date: string, key: string, undoLabel: string) => void;
  logCardio: (date: string, minutes: number, km: number | undefined, xpAmount: number) => void;
  removeCardio: (date: string, undoLabel: string) => void;
  completeAll: (date: string) => void;
  logWeight: (date: string, kg: number) => void;
  addGoal: (goal: Omit<Goal, 'id' | 'createdAt'>) => Promise<string | null>;
  updateGoal: (goal: Goal, patch: GoalPatch) => Promise<string | null>;
  deleteGoal: (goal: Goal) => void;
};

const ProgressContext = createContext<ProgressContextValue | null>(null);

const STORAGE_KEY = 'wt:passcode';
const SEEN_KEY = 'wt:seen';

// "Couldn't save": network failure, 401, or a server-side rejection with no
// message of its own.
const GENERIC_SAVE_ERROR = "Couldn't save. Check your connection.";

type PostOutcome = { ok: true; data: AppState } | { ok: false; error: string };

type Seen = { level: number; badgeIds: string[] };

function readSeen(): Seen | null {
  try {
    const raw = localStorage.getItem(SEEN_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (typeof parsed?.level !== 'number' || !Array.isArray(parsed?.badgeIds)) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeSeen(seen: Seen) {
  try {
    localStorage.setItem(SEEN_KEY, JSON.stringify(seen));
  } catch {
    // ignore storage errors
  }
}

// wt:seen only ever grows: level is the max ever seen, badges are a union.
// Untick/retick, Undo, or a goal delete-and-restore can all momentarily lower
// the *current* level or badge set; if that lower snapshot overwrote the
// record, re-crossing the same threshold later would look "new" again and
// replay its celebration.
function updateSeen(level: number, badgeIds: string[]) {
  const prev = readSeen();
  if (!prev) {
    writeSeen({ level, badgeIds });
    return;
  }
  writeSeen({
    level: Math.max(prev.level, level),
    badgeIds: Array.from(new Set([...prev.badgeIds, ...badgeIds])),
  });
}

// Badges first, level-up / rank-up last, like a chest reveal before the climax.
function diffCelebrations(before: AppState, after: AppState, today: string): CelebrationEvent[] {
  const beforeIds = new Set(allEarnedBadges(before, today).map((b) => b.id));
  const afterBadges = allEarnedBadges(after, today);
  const newBadges = afterBadges.filter((b) => !beforeIds.has(b.id));
  const events: CelebrationEvent[] = newBadges.map((b) => ({ kind: 'badge', badge: b }));

  const afterXp = totalXp(after, today);
  const beforeLevel = levelForXp(totalXp(before, today));
  const afterLevel = levelForXp(afterXp);
  if (afterLevel > beforeLevel) {
    const fromRank = rankForLevel(beforeLevel);
    const toRank = rankForLevel(afterLevel);
    if (fromRank !== toRank) {
      events.push({ kind: 'rankup', fromRank, toRank, level: afterLevel, xpNow: afterXp });
    } else {
      events.push({ kind: 'levelup', from: beforeLevel, to: afterLevel, rank: toRank, xpNow: afterXp });
    }
  }
  return events;
}

export function ProgressProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AppState>(emptyState());
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [passcodeError, setPasscodeError] = useState(false);
  const [passcode, setPasscode] = useState<string | null>(null);
  const [checkedStorage, setCheckedStorage] = useState(false);
  const [snackbar, setSnackbar] = useState<SnackbarState>(null);
  const snackbarId = useRef(0);
  const stateRef = useRef(state);
  stateRef.current = state;
  const passcodeRef = useRef(passcode);
  passcodeRef.current = passcode;

  // One promise chain serializes every POST, so two rapid actions can never
  // race a read-modify-write on the server. Each request gets a sequence
  // number; a response only gets applied if no newer request has been queued
  // since (otherwise it would flicker the UI back to stale, in-between data).
  const queueRef = useRef<Promise<unknown>>(Promise.resolve());
  const seqRef = useRef(0);

  const today = useToday();
  const celebration = useCelebration();

  useEffect(() => {
    let stored: string | null = null;
    try {
      stored = localStorage.getItem(STORAGE_KEY);
    } catch {
      stored = null;
    }
    setPasscode(stored);
    setCheckedStorage(true);
  }, []);

  const showSnackbar = useCallback((text: string, actionLabel?: string, onAction?: () => void) => {
    snackbarId.current += 1;
    setSnackbar({ id: snackbarId.current, text, actionLabel, onAction });
  }, []);

  const fetchState = useCallback(
    async (code: string) => {
      setLoading(true);
      try {
        const res = await fetch('/api/state', { headers: { 'x-passcode': code } });
        if (res.status === 401) {
          setAuthorized(false);
          setPasscodeError(true);
          return;
        }
        if (!res.ok) return;
        const data: AppState = await res.json();
        setState(data);
        setAuthorized(true);
        setPasscodeError(false);

        const now = todayStr();
        const xpNow = totalXp(data, now);
        const level = levelForXp(xpNow);
        const badgeIds = allEarnedBadges(data, now).map((b) => b.id);
        const seen = readSeen();
        if (seen === null) {
          writeSeen({ level, badgeIds });
        } else {
          const newBadges = allEarnedBadges(data, now).filter((b) => !seen.badgeIds.includes(b.id));
          const events: CelebrationEvent[] = newBadges.map((b) => ({ kind: 'badge', badge: b }));
          if (level > seen.level) {
            const fromRank = rankForLevel(seen.level);
            const toRank = rankForLevel(level);
            if (fromRank !== toRank) events.push({ kind: 'rankup', fromRank, toRank, level, xpNow });
            else events.push({ kind: 'levelup', from: seen.level, to: level, rank: toRank, xpNow });
          }
          if (events.length) celebration.enqueue(events);
          updateSeen(level, badgeIds);
        }
      } catch {
        // A background refetch (after a failed queued write) failing too is
        // not itself user-actionable beyond the error snackbar already shown.
      } finally {
        setLoading(false);
      }
    },
    [celebration]
  );

  // Runs once, only for a passcode already in storage from a previous visit.
  useEffect(() => {
    if (!checkedStorage) return;
    if (!passcode) {
      setLoading(false);
      return;
    }
    fetchState(passcode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checkedStorage]);

  const submitPasscode = useCallback(
    (code: string) => {
      try {
        localStorage.setItem(STORAGE_KEY, code);
      } catch {
        // ignore storage errors
      }
      setPasscode(code);
      // Called directly (not left to a passcode-changed effect) so
      // re-submitting the same passcode after a 401 still retries the fetch.
      fetchState(code);
    },
    [fetchState]
  );

  const postRaw = useCallback(async (body: Record<string, unknown>): Promise<PostOutcome> => {
    const code = passcodeRef.current;
    if (!code) return { ok: false, error: GENERIC_SAVE_ERROR };
    try {
      const res = await fetch('/api/state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-passcode': code },
        body: JSON.stringify(body),
      });
      if (res.status === 401) {
        setAuthorized(false);
        setPasscodeError(true);
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
    (before: AppState, after: AppState) => {
      setState(after);
      const now = todayStr();
      const events = diffCelebrations(before, after, now);
      if (events.length) celebration.enqueue(events);
      const level = levelForXp(totalXp(after, now));
      const badgeIds = allEarnedBadges(after, now).map((b) => b.id);
      updateSeen(level, badgeIds);
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
          const code = passcodeRef.current;
          if (code) await fetchState(code);
        }
        showSnackbar(GENERIC_SAVE_ERROR);
        return undefined;
      });
      queueRef.current = run.catch(() => undefined);
      return run;
    },
    [post, applyResult, showSnackbar, fetchState]
  );

  // Same queue, same rollback/refetch rules as runQueued, but for callers
  // (goal add/edit) that need the server's own error message to show inline
  // in a sheet instead of a snackbar. Resolves to null on success.
  const runQueuedWithError = useCallback(
    (body: Record<string, unknown>, before: AppState, onApplied?: (after: AppState) => void): Promise<string | null> => {
      const mySeq = ++seqRef.current;
      const run = queueRef.current.then(async (): Promise<string | null> => {
        const outcome = await postRaw(body);
        if (outcome.ok) {
          if (mySeq === seqRef.current) {
            applyResult(before, outcome.data);
            onApplied?.(outcome.data);
          }
          return null;
        }
        if (mySeq === seqRef.current) {
          setState(before);
        } else {
          const code = passcodeRef.current;
          if (code) await fetchState(code);
        }
        return outcome.error;
      });
      queueRef.current = run.catch(() => null);
      return run;
    },
    [postRaw, applyResult, fetchState]
  );

  const tick = useCallback(
    (date: string, key: string, xpAmount: number) => {
      const before = stateRef.current;
      const day = planDay(date);
      const wasCleared = day ? isDayCleared(day, before.days[date]) : false;
      const optimisticLog = { ...(before.days[date] ?? { items: {} }) };
      optimisticLog.items = { ...optimisticLog.items, [key]: { at: new Date().toISOString() } };
      const optimistic: AppState = { ...before, days: { ...before.days, [date]: optimisticLog } };
      setState(optimistic);
      feedback.tick();
      void xpAmount;

      runQueued({ action: 'tick', date, key }, before, (data) => {
        const nowCleared = day ? isDayCleared(day, data.days[date]) : false;
        if (!wasCleared && nowCleared) feedback.dayCleared();
      });
    },
    [runQueued]
  );

  const untick = useCallback(
    (date: string, key: string, undoLabel: string) => {
      const before = stateRef.current;
      const optimisticLog = { ...(before.days[date] ?? { items: {} }) };
      optimisticLog.items = { ...optimisticLog.items };
      delete optimisticLog.items[key];
      const optimistic: AppState = { ...before, days: { ...before.days, [date]: optimisticLog } };
      setState(optimistic);

      runQueued({ action: 'untick', date, key }, before, () => {
        showSnackbar(undoLabel, 'Undo', () => tick(date, key, 0));
      });
    },
    [runQueued, showSnackbar, tick]
  );

  const logCardio = useCallback(
    (date: string, minutes: number, km: number | undefined, xpAmount: number) => {
      const before = stateRef.current;
      const optimisticLog = { ...(before.days[date] ?? { items: {} }) };
      const at = new Date().toISOString();
      optimisticLog.cardio = km !== undefined ? { minutes, km, at } : { minutes, at };
      const optimistic: AppState = { ...before, days: { ...before.days, [date]: optimisticLog } };
      setState(optimistic);
      feedback.tick();
      void xpAmount;

      runQueued({ action: 'logCardio', date, minutes, km }, before);
    },
    [runQueued]
  );

  const removeCardio = useCallback(
    (date: string, undoLabel: string) => {
      const before = stateRef.current;
      const prevCardio = before.days[date]?.cardio;
      const optimisticLog = { ...(before.days[date] ?? { items: {} }) };
      delete optimisticLog.cardio;
      const optimistic: AppState = { ...before, days: { ...before.days, [date]: optimisticLog } };
      setState(optimistic);

      runQueued({ action: 'untick', date, key: 'cardio' }, before, () => {
        showSnackbar(undoLabel, 'Undo', () => {
          if (prevCardio) logCardio(date, prevCardio.minutes, prevCardio.km, 0);
        });
      });
    },
    [runQueued, showSnackbar, logCardio]
  );

  const completeAll = useCallback(
    (date: string) => {
      const before = stateRef.current;
      const day = planDay(date);
      if (!day) return;
      const prevLog = before.days[date];
      const wasCleared = isDayCleared(day, prevLog);

      const now = new Date().toISOString();
      const optimisticLog: DayLog = { items: { ...(prevLog?.items ?? {}) } };
      for (const key of allItemKeys(day)) {
        if (key === 'cardio') {
          if (!optimisticLog.cardio && day.cardio) optimisticLog.cardio = { minutes: day.cardio.minutes, at: now };
        } else if (!optimisticLog.items[key]) {
          optimisticLog.items[key] = { at: now };
        }
      }
      const optimistic: AppState = { ...before, days: { ...before.days, [date]: optimisticLog } };
      setState(optimistic);
      feedback.tick();

      runQueued({ action: 'completeAll', date }, before, (data) => {
        const nowCleared = isDayCleared(day, data.days[date]);
        if (!wasCleared && nowCleared) feedback.dayCleared();
        showSnackbar('Day completed.', 'Undo', () => {
          const restoreBefore = stateRef.current;
          const optimisticRestore: AppState = { ...restoreBefore, days: { ...restoreBefore.days } };
          if (prevLog) optimisticRestore.days[date] = prevLog;
          else delete optimisticRestore.days[date];
          setState(optimisticRestore);
          runQueued({ action: 'setDayLog', date, log: prevLog ?? { items: {} } }, restoreBefore);
        });
      });
    },
    [runQueued, showSnackbar]
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
        showSnackbar('Goal deleted', 'Undo', () => {
          const restoreBefore = stateRef.current;
          const optimisticRestore: AppState = { ...restoreBefore, goals: [...restoreBefore.goals, goal] };
          setState(optimisticRestore);
          runQueued({ action: 'restoreGoal', goal }, restoreBefore);
        });
      });
    },
    [runQueued, showSnackbar]
  );

  const progress = useMemo(() => computeProgress(state, today), [state, today]);

  const value: ProgressContextValue = {
    state,
    progress,
    loading,
    authorized,
    passcodeError,
    snackbarVisible: snackbar !== null,
    submitPasscode,
    tick,
    untick,
    logCardio,
    removeCardio,
    completeAll,
    logWeight,
    addGoal,
    updateGoal,
    deleteGoal,
  };

  const showPrompt = checkedStorage && !loading && !authorized;

  return (
    <ProgressContext.Provider value={value}>
      {showPrompt ? <PasscodePrompt onSubmit={submitPasscode} error={passcodeError} /> : children}
      <Snackbar snackbar={snackbar} onDismiss={() => setSnackbar(null)} />
    </ProgressContext.Provider>
  );
}

function PasscodePrompt({ onSubmit, error }: { onSubmit: (code: string) => void; error: boolean }) {
  const [value, setValue] = useState('');
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          feedback.warm();
          onSubmit(value);
        }}
        className="w-full max-w-xs space-y-3 rounded-2xl border p-6 text-center shadow-sm"
        style={{ borderColor: 'var(--line)', background: 'var(--surface)' }}
      >
        <h1 className="text-base font-semibold" style={{ color: 'var(--ink)' }}>
          Enter passcode
        </h1>
        <p className="text-xs" style={{ color: 'var(--muted)' }}>
          This app is private. Enter your passcode to continue.
        </p>
        <input
          type="password"
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="w-full rounded-lg border px-3 py-2 text-sm outline-none"
          style={{ borderColor: 'var(--line)', background: 'var(--surface)', color: 'var(--ink)' }}
          placeholder="Passcode"
        />
        {error && (
          <p className="text-xs" style={{ color: 'var(--bad)' }}>
            Wrong passcode. Try again.
          </p>
        )}
        <button type="submit" className="w-full rounded-lg py-2 text-sm font-semibold text-white" style={{ background: 'var(--ink)' }}>
          Continue
        </button>
      </form>
    </div>
  );
}

export function useProgress(): ProgressContextValue {
  const ctx = useContext(ProgressContext);
  if (!ctx) throw new Error('useProgress must be used within ProgressProvider');
  return ctx;
}
