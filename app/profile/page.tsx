'use client';

import { useEffect, useState } from 'react';
import { useProgress } from '@/components/ProgressProvider';
import { ProgressBar } from '@/components/ProgressBar';
import { RankShield } from '@/components/RankShield';
import { Badge } from '@/components/Badge';
import { todayStr, monthLabel, monthKey } from '@/lib/date';
import { RANK_TITLES, START_WEIGHT, TARGET_WEIGHT, nextRankLevel } from '@/lib/progress';
import { allEarnedBadges } from '@/lib/badges';
import { computeMonthlyProgress } from '@/lib/badges';
import { describeEarnedBadge } from '@/lib/badgeDisplay';
import * as feedback from '@/lib/feedback';

export default function ProfilePage() {
  const { progress, state, logWeight } = useProgress();
  const [today, setToday] = useState<string | null>(null);
  const [weightInput, setWeightInput] = useState('');

  useEffect(() => {
    const t = todayStr();
    setToday(t);
    setWeightInput(state.weights[t] !== undefined ? String(state.weights[t]) : '');
  }, [state.weights]);

  const stats = progress.stats;
  const weightPct = stats.latestWeight
    ? Math.min(100, Math.max(0, ((START_WEIGHT - stats.latestWeight) / (START_WEIGHT - TARGET_WEIGHT)) * 100))
    : 0;

  function submitWeight(e: React.FormEvent) {
    e.preventDefault();
    if (!today) return;
    const kg = Number(weightInput);
    if (Number.isNaN(kg) || kg < 40 || kg > 250) return;
    logWeight(today, kg);
  }

  const nextRank = nextRankLevel(progress.rank);
  const showcase = today
    ? [...allEarnedBadges(state, today)]
        .sort((a, b) => (a.earnedAt < b.earnedAt ? 1 : -1))
        .slice(0, 3)
        .map((b) => ({ badge: b, display: describeEarnedBadge(b) }))
    : [];

  const thisMonth = today ? computeMonthlyProgress(state).find((m) => m.month === monthKey(today)) : undefined;

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border p-5 shadow-sm" style={{ borderColor: 'var(--line)', background: 'var(--surface)' }}>
        <div className="flex items-center gap-4">
          <RankShield rank={progress.rank} level={progress.level} size={96} />
          <div className="min-w-0">
            <div className="font-display text-2xl" style={{ color: 'var(--ink)' }}>
              Level {progress.level}
            </div>
            <div className="text-sm" style={{ color: 'var(--muted)' }}>
              {RANK_TITLES[progress.rank]}
            </div>
            <div className="text-xs" style={{ color: 'var(--muted)' }}>
              {progress.xp.toLocaleString()} total XP
            </div>
          </div>
        </div>
        <div className="mt-3 space-y-1">
          <ProgressBar current={progress.xpIntoLevel.current} total={progress.xpIntoLevel.needed} />
          <div className="flex justify-between text-xs" style={{ color: 'var(--muted)' }}>
            <span>
              {progress.xpIntoLevel.current} / {progress.xpIntoLevel.needed} XP to level {progress.level + 1}
            </span>
            {nextRank !== null && <span>Next rank at level {nextRank}</span>}
          </div>
        </div>
      </div>

      {showcase.length > 0 && (
        <div className="rounded-2xl border p-5 shadow-sm" style={{ borderColor: 'var(--line)', background: 'var(--surface)' }}>
          <h2 className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>
            Showcase
          </h2>
          <div className="mt-3 flex gap-4">
            {showcase.map(({ badge, display }) => (
              <div key={badge.id} className="flex flex-1 flex-col items-center gap-1 text-center">
                <Badge {...display.badgeProps} size={64} />
                <span className="text-xs font-medium" style={{ color: 'var(--ink)' }}>
                  {display.name}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="rounded-2xl border p-5 shadow-sm" style={{ borderColor: 'var(--line)', background: 'var(--surface)' }}>
        <h2 className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>
          Weight
        </h2>
        <form onSubmit={submitWeight} className="mt-2 flex gap-2">
          <input
            type="number"
            step="0.1"
            inputMode="decimal"
            value={weightInput}
            onChange={(e) => setWeightInput(e.target.value)}
            placeholder="kg today"
            className="w-28 rounded-lg border px-3 py-2 text-sm outline-none"
            style={{ borderColor: 'var(--line)', background: 'var(--surface)', color: 'var(--ink)' }}
          />
          <button type="submit" className="rounded-lg px-4 py-2 text-sm font-semibold text-white" style={{ background: 'var(--ink)' }}>
            Log
          </button>
        </form>
        <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
          <div>
            <div style={{ color: 'var(--muted)' }}>Latest</div>
            <div className="font-semibold" style={{ color: 'var(--ink)' }}>
              {stats.latestWeight !== null ? `${stats.latestWeight} kg` : 'Not logged'}
            </div>
          </div>
          <div>
            <div style={{ color: 'var(--muted)' }}>Lost</div>
            <div className="font-semibold" style={{ color: 'var(--ink)' }}>
              {stats.kgLost.toFixed(1)} kg
            </div>
          </div>
        </div>
        <div className="mt-3 space-y-1">
          <ProgressBar current={weightPct} total={100} />
          <div className="flex justify-between text-xs" style={{ color: 'var(--muted)' }}>
            <span>{START_WEIGHT} kg</span>
            <span>{TARGET_WEIGHT} kg</span>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border p-5 shadow-sm" style={{ borderColor: 'var(--line)', background: 'var(--surface)' }}>
        <h2 className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>
          Stats
        </h2>
        <div className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
          <Stat label="Days cleared" value={stats.daysCleared} />
          <Stat label="Current streak" value={stats.currentStreak} />
          <Stat label="Best streak" value={stats.bestStreak} />
          <Stat label="Lifetime pushups" value={stats.lifetimePushups} />
          <Stat label="Cardio minutes" value={stats.cardioMinutes} />
          <Stat label="Treadmill km" value={stats.treadmillKm} />
          <Stat label="Cycle km" value={stats.cycleKm} />
          <Stat label="Weigh-ins" value={stats.weighIns} />
        </div>
      </div>

      {thisMonth && (
        <div className="rounded-2xl border p-5 shadow-sm" style={{ borderColor: 'var(--line)', background: 'var(--surface)' }}>
          <h2 className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>
            This month &middot; {today ? monthLabel(monthKey(today)) : ''}
          </h2>
          <div className="mt-2 space-y-1.5 text-sm">
            <MiniStat label="Days cleared" value={thisMonth.badges['month-clear'].value} target={thisMonth.badges['month-clear'].target} />
            <MiniStat label="Pushups" value={thisMonth.badges['pushup-month'].value} target={thisMonth.badges['pushup-month'].target} />
            <MiniStat label="Cardio minutes" value={thisMonth.badges['cardio-month'].value} target={thisMonth.badges['cardio-month'].target} />
          </div>
        </div>
      )}

      <SettingsCard />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div style={{ color: 'var(--muted)' }}>{label}</div>
      <div className="text-base font-semibold" style={{ color: 'var(--ink)' }}>
        {value}
      </div>
    </div>
  );
}

function MiniStat({ label, value, target }: { label: string; value: number; target: number }) {
  return (
    <div className="flex items-center justify-between">
      <span style={{ color: 'var(--muted)' }}>{label}</span>
      <span className="font-semibold tabular-nums" style={{ color: 'var(--ink)' }}>
        {value} / {target}
      </span>
    </div>
  );
}

function Switch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex min-h-11 items-center gap-2.5 text-sm font-semibold"
      style={{ color: 'var(--ink)' }}
    >
      <span
        className="relative h-8 w-[52px] rounded-full border-2 transition-colors"
        style={{ background: checked ? 'var(--pill-ink)' : 'var(--surface-2)', borderColor: checked ? 'var(--pill-ink)' : 'var(--muted)' }}
      >
        <span
          className="absolute top-0.5 h-6 w-6 rounded-full transition-all"
          style={{ left: checked ? 22 : 2, background: checked ? 'var(--surface)' : 'var(--muted)' }}
        />
      </span>
      {label}
    </button>
  );
}

function SettingsCard() {
  const [sound, setSound] = useState(true);
  const [vibrate, setVibrate] = useState(true);

  useEffect(() => {
    const prefs = feedback.getPrefs();
    setSound(prefs.sound);
    setVibrate(prefs.vibrate);
  }, []);

  return (
    <div className="rounded-2xl border p-5 shadow-sm" style={{ borderColor: 'var(--line)', background: 'var(--surface)' }}>
      <h2 className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>
        Settings
      </h2>
      <div className="mt-2 flex flex-col gap-1">
        <Switch
          checked={sound}
          label="Sound"
          onChange={(v) => {
            setSound(v);
            feedback.setSoundEnabled(v);
            if (v) feedback.warm();
          }}
        />
        <Switch
          checked={vibrate}
          label="Vibration"
          onChange={(v) => {
            setVibrate(v);
            feedback.setVibrateEnabled(v);
          }}
        />
      </div>
    </div>
  );
}
