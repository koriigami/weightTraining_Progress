'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Field, Input } from '@/components/ui/Field';
import { Sheet, useSheet } from '@/components/ui/Sheet';
import { Stepper } from '@/components/ui/Stepper';
import { useProgress } from '@/components/ProgressProvider';
import { XP } from '@/lib/progress';
import type { WorkoutDay } from '@/data/plan';

function SaveCardio({ disabled, label, onSave }: { disabled: boolean; label: string; onSave: () => void }) {
  const { close } = useSheet();
  return (
    <Button
      block
      disabled={disabled}
      onClick={() => {
        onSave();
        close();
      }}
    >
      {label}
    </Button>
  );
}

function RemoveCardio({ onRemove }: { onRemove: () => void }) {
  const { close } = useSheet();
  return (
    <button
      type="button"
      className="wt-textbtn"
      style={{ alignSelf: 'flex-start', color: 'var(--muted)' }}
      onClick={() => {
        onRemove();
        close();
      }}
    >
      Remove
    </button>
  );
}

/** Logs cardio on a day of the 6-week plan: minutes and an optional distance. */
export function CardioSheet({ open, onClose, date, day }: { open: boolean; onClose: () => void; date: string; day: WorkoutDay }) {
  const { state, logCardio, removeCardio } = useProgress();
  const cardio = day.cardio!;
  const existing = state.days[date]?.cardio;
  const isEditing = Boolean(existing);
  const name = cardio.modality === 'treadmill' ? 'Treadmill' : 'Cycle';

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

  return (
    <Sheet open={open} onClose={onClose} title="Log cardio" footer={<SaveCardio disabled={!kmValid} label={`Save · +${xpAmount} XP`} onSave={() => kmValid && logCardio(date, minutes, kmValue, xpAmount)} />}>
      <div className="wt-form-stack">
        <div className="wt-field">
          <span className="wt-field-label">{name} · minutes</span>
          <Stepper label="Minutes" value={minutes} min={1} max={180} onChange={setMinutes} />
        </div>
        <Field label="Distance in km (optional)" error={!kmValid ? 'Enter a distance between 0 and 100 km.' : undefined}>
          <Input inputMode="decimal" value={km} onChange={(e) => setKm(e.target.value)} placeholder="0.0" />
        </Field>
        {isEditing && <RemoveCardio onRemove={() => removeCardio(date, `${name} unticked`)} />}
      </div>
    </Sheet>
  );
}
