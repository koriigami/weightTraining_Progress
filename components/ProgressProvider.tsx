'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  computeProgress,
  emptyState,
  isDayCleared,
  levelForXp,
  planDay,
  rankForLevel,
  totalXp,
} from '@/lib/progress';
import type { AppState, FullProgress, Goal } from '@/lib/progress';
import { allEarnedBadges } from '@/lib/badges';
import { todayStr } from '@/lib/date';
import * as feedback from '@/lib/feedback';
import { useCelebration } from '@/components/celebrate/CelebrationProvider';
import type { CelebrationEvent } from '@/components/celebrate/CelebrationProvider';
import { Snackbar } from '@/components/Snackbar';
import type { SnackbarState } from '@/components/Snackbar';

type ProgressContextValue = {
  state: AppState;
  progress: FullProgress;
  loading: boolean;
  authorized: boolean;
  passcodeError: boolean;
  submitPasscode: (code: string) => void;
  tick: (date: string, key: string, xpAmount: number) => Promise<void>;
  untick: (date: string, key: string, undoLabel: string) => Promise<void>;
  logCardio: (date: string, minutes: number, km: number | undefined, xpAmount: number) => Promise<void>;
  removeCardio: (date: string, undoLabel: string) => Promise<void>;
  completeAll: (date: string) => Promise<void>;
  logWeight: (date: string, kg: number) => Promise<void>;
  addGoal: (goal: Omit<Goal, 'id'>) => Promise<boolean>;
  deleteGoal: (goal: Goal) => Promise<void>;
};

const ProgressContext = createContext<ProgressContextValue | null>(null);

const STORAGE_KEY = 'wt:passcode';
const SEEN_KEY = 'wt:seen';

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
        const data: AppState = await res.json();
        setState(data);
        setAuthorized(true);
        setPasscodeError(false);

        const today = todayStr();
        const xpNow = totalXp(data, today);
        const level = levelForXp(xpNow);
        const badgeIds = allEarnedBadges(data, today).map((b) => b.id);
        const seen = readSeen();
        if (seen === null) {
          writeSeen({ level, badgeIds });
        } else {
          const newBadges = allEarnedBadges(data, today).filter((b) => !seen.badgeIds.includes(b.id));
          const events: CelebrationEvent[] = newBadges.map((b) => ({ kind: 'badge', badge: b }));
          if (level > seen.level) {
            const fromRank = rankForLevel(seen.level);
            const toRank = rankForLevel(level);
            if (fromRank !== toRank) events.push({ kind: 'rankup', fromRank, toRank, level, xpNow });
            else events.push({ kind: 'levelup', from: seen.level, to: level, rank: toRank, xpNow });
          }
          if (events.length) celebration.enqueue(events);
          writeSeen({ level, badgeIds });
        }
      } finally {
        setLoading(false);
      }
    },
    [celebration]
  );

  useEffect(() => {
    if (!checkedStorage) return;
    if (!passcode) {
      setLoading(false);
      return;
    }
    fetchState(passcode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checkedStorage, passcode]);

  const submitPasscode = useCallback((code: string) => {
    try {
      localStorage.setItem(STORAGE_KEY, code);
    } catch {
      // ignore storage errors
    }
    setPasscode(code);
  }, []);

  const post = useCallback(
    async (body: Record<string, unknown>): Promise<AppState | undefined> => {
      if (!passcode) return undefined;
      const res = await fetch('/api/state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-passcode': passcode },
        body: JSON.stringify(body),
      });
      if (res.status === 401) {
        setAuthorized(false);
        setPasscodeError(true);
        return undefined;
      }
      if (!res.ok) return undefined;
      return (await res.json()) as AppState;
    },
    [passcode]
  );

  // Applies a server response: updates state, plays feedback/celebrations for
  // whatever changed between `before` and the new state, and refreshes wt:seen.
  const applyResult = useCallback(
    (before: AppState, after: AppState) => {
      setState(after);
      const today = todayStr();
      const events = diffCelebrations(before, after, today);
      if (events.length) celebration.enqueue(events);
      const level = levelForXp(totalXp(after, today));
      const badgeIds = allEarnedBadges(after, today).map((b) => b.id);
      writeSeen({ level, badgeIds });
    },
    [celebration]
  );

  const tick = useCallback(
    async (date: string, key: string, xpAmount: number) => {
      const before = stateRef.current;
      const day = planDay(date);
      const wasCleared = day ? isDayCleared(day, before.days[date]) : false;
      const optimisticLog = { ...(before.days[date] ?? { items: {} }) };
      optimisticLog.items = { ...optimisticLog.items, [key]: { at: new Date().toISOString() } };
      const optimistic: AppState = { ...before, days: { ...before.days, [date]: optimisticLog } };
      setState(optimistic);
      feedback.tick();

      const data = await post({ action: 'tick', date, key });
      if (!data) return;
      applyResult(before, data);
      const nowCleared = day ? isDayCleared(day, data.days[date]) : false;
      if (!wasCleared && nowCleared) feedback.dayCleared();
      void xpAmount;
    },
    [post, applyResult]
  );

  const untick = useCallback(
    async (date: string, key: string, undoLabel: string) => {
      const before = stateRef.current;
      const optimisticLog = { ...(before.days[date] ?? { items: {} }) };
      optimisticLog.items = { ...optimisticLog.items };
      delete optimisticLog.items[key];
      const optimistic: AppState = { ...before, days: { ...before.days, [date]: optimisticLog } };
      setState(optimistic);

      const data = await post({ action: 'untick', date, key });
      if (!data) return;
      applyResult(before, data);
      showSnackbar(undoLabel, 'Undo', () => {
        tick(date, key, 0);
      });
    },
    [post, applyResult, showSnackbar, tick]
  );

  const logCardio = useCallback(
    async (date: string, minutes: number, km: number | undefined, xpAmount: number) => {
      const before = stateRef.current;
      const optimisticLog = { ...(before.days[date] ?? { items: {} }) };
      optimisticLog.cardio = km !== undefined ? { minutes, km } : { minutes };
      const optimistic: AppState = { ...before, days: { ...before.days, [date]: optimisticLog } };
      setState(optimistic);
      feedback.tick();

      const data = await post({ action: 'logCardio', date, minutes, km });
      if (!data) return;
      applyResult(before, data);
      void xpAmount;
    },
    [post, applyResult]
  );

  const removeCardio = useCallback(
    async (date: string, undoLabel: string) => {
      const before = stateRef.current;
      const prevCardio = before.days[date]?.cardio;
      const optimisticLog = { ...(before.days[date] ?? { items: {} }) };
      delete optimisticLog.cardio;
      const optimistic: AppState = { ...before, days: { ...before.days, [date]: optimisticLog } };
      setState(optimistic);

      const data = await post({ action: 'untick', date, key: 'cardio' });
      if (!data) return;
      applyResult(before, data);
      showSnackbar(undoLabel, 'Undo', () => {
        if (prevCardio) logCardio(date, prevCardio.minutes, prevCardio.km, 0);
      });
    },
    [post, applyResult, showSnackbar, logCardio]
  );

  const completeAll = useCallback(
    async (date: string) => {
      const before = stateRef.current;
      const day = planDay(date);
      const wasCleared = day ? isDayCleared(day, before.days[date]) : false;

      const data = await post({ action: 'completeAll', date });
      if (!data) return;
      applyResult(before, data);
      const nowCleared = day ? isDayCleared(day, data.days[date]) : false;
      if (!wasCleared && nowCleared) feedback.dayCleared();
    },
    [post, applyResult]
  );

  const logWeight = useCallback(
    async (date: string, kg: number) => {
      const before = stateRef.current;
      const optimistic: AppState = { ...before, weights: { ...before.weights, [date]: kg } };
      setState(optimistic);

      const data = await post({ action: 'weight', date, kg });
      if (!data) return;
      applyResult(before, data);
    },
    [post, applyResult]
  );

  const addGoal = useCallback(
    async (goal: Omit<Goal, 'id'>): Promise<boolean> => {
      const before = stateRef.current;
      const data = await post({ action: 'addGoal', goal });
      if (!data) return false;
      applyResult(before, data);
      return true;
    },
    [post, applyResult]
  );

  const deleteGoal = useCallback(
    async (goal: Goal) => {
      const before = stateRef.current;
      const optimistic: AppState = { ...before, goals: before.goals.filter((g) => g.id !== goal.id) };
      setState(optimistic);

      const data = await post({ action: 'deleteGoal', id: goal.id });
      if (!data) return;
      applyResult(before, data);
      showSnackbar('Goal deleted', 'Undo', async () => {
        const restored = await post({ action: 'restoreGoal', goal });
        if (restored) setState(restored);
      });
    },
    [post, applyResult, showSnackbar]
  );

  const progress = useMemo(() => computeProgress(state, todayStr()), [state]);

  const value: ProgressContextValue = {
    state,
    progress,
    loading,
    authorized,
    passcodeError,
    submitPasscode,
    tick,
    untick,
    logCardio,
    removeCardio,
    completeAll,
    logWeight,
    addGoal,
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
