'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { AppState, Goal, FullProgress, computeProgress, emptyState, levelForXp, totalXp } from '@/lib/progress';
import { todayStr } from '@/lib/date';

type Toast = { id: number; text: string };

type ProgressContextValue = {
  state: AppState;
  progress: FullProgress;
  loading: boolean;
  authorized: boolean;
  passcodeError: boolean;
  submitPasscode: (code: string) => void;
  complete: (date: string) => void;
  uncomplete: (date: string) => void;
  logWeight: (date: string, kg: number) => void;
  addGoal: (goal: Omit<Goal, 'id'>) => void;
  deleteGoal: (id: string) => void;
  toasts: Toast[];
};

const ProgressContext = createContext<ProgressContextValue | null>(null);

const STORAGE_KEY = 'wt:passcode';
let toastId = 0;

export function ProgressProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AppState>(emptyState());
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [passcodeError, setPasscodeError] = useState(false);
  const [passcode, setPasscode] = useState<string | null>(null);
  const [checkedStorage, setCheckedStorage] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);

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

  const pushToast = useCallback((text: string) => {
    const id = ++toastId;
    setToasts((t) => [...t, { id, text }]);
    setTimeout(() => {
      setToasts((t) => t.filter((x) => x.id !== id));
    }, 3200);
  }, []);

  const fetchState = useCallback(async (code: string) => {
    setLoading(true);
    try {
      const res = await fetch('/api/state', { headers: { 'x-passcode': code } });
      if (res.status === 401) {
        setAuthorized(false);
        setPasscodeError(true);
        return;
      }
      const data = await res.json();
      setState(data);
      setAuthorized(true);
      setPasscodeError(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!checkedStorage) return;
    if (!passcode) {
      setLoading(false);
      return;
    }
    fetchState(passcode);
  }, [checkedStorage, passcode, fetchState]);

  const submitPasscode = useCallback(
    (code: string) => {
      try {
        localStorage.setItem(STORAGE_KEY, code);
      } catch {
        // ignore storage errors
      }
      setPasscode(code);
    },
    []
  );

  const post = useCallback(
    async (body: Record<string, unknown>) => {
      if (!passcode) return;
      const res = await fetch('/api/state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-passcode': passcode },
        body: JSON.stringify(body),
      });
      if (res.status === 401) {
        setAuthorized(false);
        setPasscodeError(true);
        return;
      }
      if (!res.ok) return;
      const data: AppState = await res.json();
      return data;
    },
    [passcode]
  );

  const complete = useCallback(
    async (date: string) => {
      const before = { ...state, achievements: computeProgress(state, todayStr()) };
      const beforeXp = totalXp(state);
      const beforeLevel = levelForXp(beforeXp);
      const beforeUnlocked = new Set(computeProgress(state, todayStr()).achievements.filter((a) => a.unlockedAt).map((a) => a.id));

      const optimistic: AppState = { ...state, completions: { ...state.completions, [date]: { at: new Date().toISOString() } } };
      setState(optimistic);

      const data = await post({ action: 'complete', date });
      if (!data) return;
      setState(data);

      const afterXp = totalXp(data);
      const afterLevel = levelForXp(afterXp);
      const gained = afterXp - beforeXp;
      pushToast(`+${gained} XP`);
      if (afterLevel > beforeLevel) {
        pushToast(`Level up. You're now level ${afterLevel}.`);
      }
      const afterAchievements = computeProgress(data, todayStr()).achievements;
      for (const a of afterAchievements) {
        if (a.unlockedAt && !beforeUnlocked.has(a.id)) {
          pushToast(`Achievement unlocked: ${a.name}`);
        }
      }
      void before;
    },
    [state, post, pushToast]
  );

  const uncomplete = useCallback(
    async (date: string) => {
      const optimistic: AppState = { ...state, completions: { ...state.completions } };
      delete optimistic.completions[date];
      setState(optimistic);
      const data = await post({ action: 'uncomplete', date });
      if (data) setState(data);
    },
    [state, post]
  );

  const logWeight = useCallback(
    async (date: string, kg: number) => {
      const beforeUnlocked = new Set(computeProgress(state, todayStr()).achievements.filter((a) => a.unlockedAt).map((a) => a.id));
      const optimistic: AppState = { ...state, weights: { ...state.weights, [date]: kg } };
      setState(optimistic);
      const data = await post({ action: 'weight', date, kg });
      if (!data) return;
      setState(data);
      pushToast('Weight logged. +10 XP');
      const afterAchievements = computeProgress(data, todayStr()).achievements;
      for (const a of afterAchievements) {
        if (a.unlockedAt && !beforeUnlocked.has(a.id)) {
          pushToast(`Achievement unlocked: ${a.name}`);
        }
      }
    },
    [state, post, pushToast]
  );

  const addGoal = useCallback(
    async (goal: Omit<Goal, 'id'>) => {
      const data = await post({ action: 'addGoal', goal });
      if (data) setState(data);
    },
    [post]
  );

  const deleteGoal = useCallback(
    async (id: string) => {
      const data = await post({ action: 'deleteGoal', id });
      if (data) setState(data);
    },
    [post]
  );

  const progress = useMemo(() => computeProgress(state, todayStr()), [state]);

  const value: ProgressContextValue = {
    state,
    progress,
    loading,
    authorized,
    passcodeError,
    submitPasscode,
    complete,
    uncomplete,
    logWeight,
    addGoal,
    deleteGoal,
    toasts,
  };

  const showPrompt = checkedStorage && !loading && !authorized;

  return (
    <ProgressContext.Provider value={value}>
      {showPrompt ? <PasscodePrompt onSubmit={submitPasscode} error={passcodeError} /> : children}
      <div className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex flex-col items-center gap-2 px-4">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="pointer-events-auto rounded-full bg-neutral-900 px-4 py-2 text-sm font-medium text-white shadow-lg dark:bg-neutral-100 dark:text-neutral-900"
          >
            {t.text}
          </div>
        ))}
      </div>
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
          onSubmit(value);
        }}
        className="w-full max-w-xs space-y-3 rounded-2xl border border-neutral-200 bg-white p-6 text-center shadow-sm dark:border-neutral-800 dark:bg-neutral-900"
      >
        <h1 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">Enter passcode</h1>
        <p className="text-xs text-neutral-500 dark:text-neutral-400">This app is private. Enter your passcode to continue.</p>
        <input
          type="password"
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 outline-none focus:border-neutral-500 dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-100"
          placeholder="Passcode"
        />
        {error && <p className="text-xs text-red-500">Wrong passcode. Try again.</p>}
        <button
          type="submit"
          className="w-full rounded-lg bg-neutral-900 py-2 text-sm font-semibold text-white dark:bg-neutral-100 dark:text-neutral-900"
        >
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
