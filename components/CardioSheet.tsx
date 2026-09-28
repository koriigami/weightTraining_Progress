'use client';

import { useEffect, useRef, useState } from 'react';
import { BottomSheet } from '@/components/BottomSheet';
import { useProgress } from '@/components/ProgressProvider';
import { XP } from '@/lib/progress';
import type { WorkoutDay } from '@/data/plan';

export function CardioSheet({
  open,
  onClose,
  date,
  day,
}: {
  open: boolean;
  onClose: () => void;
  date: string;
  day: WorkoutDay;
}) {
  const { state, logCardio, removeCardio } = useProgress();
  const cardio = day.cardio!;
  const existing = state.days[date]?.cardio;
  const isEditing = Boolean(existing);
  const closeRef = useRef(onClose);

  const [minutes, setMinutes] = useState(cardio.minutes);
  const [km, setKm] = useState('');

  useEffect(() => {
    if (!open) return;
    setMinutes(existing?.minutes ?? cardio.minutes);
    setKm(existing?.km !== undefined ? String(existing.km) : '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, date]);

  const kmValue = km.trim() === '' ? undefined : Number(km);
  const kmValid = kmValue === undefined || (Number.isFinite(kmValue) && kmValue >= 0 && kmValue <= 100);
  const xpAmount = XP.cardio + (kmValue !== undefined ? XP.cardioKmBonus : 0);

  function save() {
    if (!kmValid) return;
    logCardio(date, minutes, kmValue, xpAmount);
    closeRef.current();
  }

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      ariaLabel="Log cardio"
      title="Log cardio"
      closeRef={closeRef}
      cta={{ label: `Save · +${xpAmount} XP`, onClick: save, disabled: !kmValid }}
    >
      <div className="flex flex-col gap-4 pt-2">
        <div className="flex flex-col gap-2">
          <label className="text-[13px] font-semibold" style={{ color: 'var(--muted)' }}>
            {day.cardio!.modality === 'treadmill' ? 'Treadmill' : 'Cycle'} &middot; minutes
          </label>
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              aria-label="Fewer minutes"
              onClick={() => setMinutes((m) => Math.max(1, m - 1))}
              className="flex h-12 w-12 items-center justify-center rounded-full border text-xl font-semibold"
              style={{ borderColor: 'var(--line)', background: 'var(--surface)', color: 'var(--ink)' }}
            >
              &minus;
            </button>
            <output className="font-display text-3xl tabular-nums" style={{ color: 'var(--ink)' }}>
              {minutes}
            </output>
            <button
              type="button"
              aria-label="More minutes"
              onClick={() => setMinutes((m) => Math.min(180, m + 1))}
              className="flex h-12 w-12 items-center justify-center rounded-full border text-xl font-semibold"
              style={{ borderColor: 'var(--line)', background: 'var(--surface)', color: 'var(--ink)' }}
            >
              +
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="cardio-km" className="text-[13px] font-semibold" style={{ color: 'var(--muted)' }}>
            Distance in km (optional)
          </label>
          <input
            id="cardio-km"
            inputMode="decimal"
            value={km}
            onChange={(e) => setKm(e.target.value)}
            placeholder="0.0"
            className="min-h-12 rounded-xl border px-3.5 text-lg font-semibold"
            style={{ borderColor: 'var(--line)', background: 'var(--surface)', color: 'var(--ink)' }}
          />
          {!kmValid && (
            <span className="text-xs" style={{ color: 'var(--bad)' }}>
              Enter a distance between 0 and 100 km.
            </span>
          )}
        </div>

        {isEditing && (
          <button
            type="button"
            onClick={() => {
              removeCardio(date, `${day.cardio!.modality === 'treadmill' ? 'Treadmill' : 'Cycle'} unticked`);
              closeRef.current();
            }}
            className="self-start text-sm font-semibold underline"
            style={{ color: 'var(--muted)' }}
          >
            Remove
          </button>
        )}
      </div>
    </BottomSheet>
  );
}
