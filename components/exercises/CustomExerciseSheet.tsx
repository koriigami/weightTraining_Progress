'use client';

import { useState } from 'react';
import { EQUIPMENT, EQUIPMENT_ORDER, MUSCLES, MUSCLE_ORDER } from '@/data/exercises';
import type { CustomExercise, Equipment, Metric, Muscle } from '@/data/exercises';
import { useProgress } from '@/components/ProgressProvider';
import { Button } from '@/components/ui/Button';
import { Field, Input, Select } from '@/components/ui/Field';
import { Sheet, useSheet } from '@/components/ui/Sheet';

// Distance for cardio, plain reps when there is no weight to load, and weight and
// reps for the rest.
function metricFor(primary: Muscle, equipment: Equipment): Metric {
  if (primary === 'cardio') return 'distance_time';
  if (equipment === 'bodyweight' || equipment === 'band' || equipment === 'pullup-bar') return 'reps';
  return 'weight_reps';
}

function Form({ onCreated }: { onCreated?: (exercise: CustomExercise) => void }) {
  const { addCustomExercise, showToast } = useProgress();
  const { closeThen } = useSheet();
  const [name, setName] = useState('');
  const [equipment, setEquipment] = useState<Equipment>('dumbbell');
  const [primary, setPrimary] = useState<Muscle>('chest');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function create() {
    if (!name.trim()) {
      setError('Give the exercise a name.');
      return;
    }
    setBusy(true);
    const r = await addCustomExercise({ name: name.trim(), equipment, primary, secondary: [], metric: metricFor(primary, equipment) });
    setBusy(false);
    if (!r.ok) {
      setError(r.error);
      return;
    }
    closeThen(() => {
      onCreated?.(r.exercise);
      showToast('Custom exercise created');
    });
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void create();
      }}
    >
      <Field label="Name" error={error}>
        <Input value={name} onChange={(e) => { setName(e.target.value); setError(null); }} placeholder="e.g. Towel Row" maxLength={60} autoComplete="off" />
      </Field>
      <Field label="Equipment">
        <Select value={equipment} onChange={(e) => setEquipment(e.target.value as Equipment)}>
          {EQUIPMENT_ORDER.map((q) => (
            <option key={q} value={q}>
              {EQUIPMENT[q]}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Main muscle">
        <Select value={primary} onChange={(e) => setPrimary(e.target.value as Muscle)}>
          {MUSCLE_ORDER.map((m) => (
            <option key={m} value={m}>
              {MUSCLES[m]}
            </option>
          ))}
        </Select>
      </Field>
      <Button type="submit" block loading={busy}>
        Create exercise
      </Button>
    </form>
  );
}

/** A small form for the person's own exercise. It is saved with their data. */
export function CustomExerciseSheet({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated?: (exercise: CustomExercise) => void }) {
  return (
    <Sheet open={open} onClose={onClose} title="Custom exercise">
      <Form onCreated={onCreated} />
    </Sheet>
  );
}
