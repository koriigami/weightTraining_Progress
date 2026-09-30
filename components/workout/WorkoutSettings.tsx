'use client';

import Link from 'next/link';
import { Info } from 'lucide-react';
import * as feedback from '@/lib/feedback';
import type { Prefs } from '@/lib/routines';
import { useProgress } from '@/components/ProgressProvider';
import { Card } from '@/components/ui/Card';
import { PageHeader } from '@/components/ui/PageHeader';
import { Screen } from '@/components/ui/Screen';
import { Switch } from '@/components/ui/Switch';

type Key = 'sound' | 'haptic' | 'keepAwake' | 'prefillLast';

const ROWS: { key: Key; label: string; hint: string }[] = [
  { key: 'sound', label: 'Sounds', hint: 'A sound when you tick a set, finish or level up' },
  { key: 'haptic', label: 'Vibration', hint: 'A short buzz when you tick a set' },
  { key: 'keepAwake', label: 'Keep screen on', hint: 'Your phone stays awake while a workout is running' },
  { key: 'prefillLast', label: "Fill in last time's numbers", hint: 'New sets start with the weight and reps from your last workout' },
];

/**
 * The four switches that shape a workout, reached from the log's Settings button.
 * A page of its own, so the workout keeps running (it lives in the session provider).
 */
export function WorkoutSettings() {
  const { prefs, savePrefs, showToast } = useProgress();

  async function set(key: Key, next: boolean) {
    // wt:prefs on this device is what actually plays, so sound and buzz change at once.
    if (key === 'sound') {
      feedback.setSoundEnabled(next);
      if (next) feedback.warm();
    }
    if (key === 'haptic') feedback.setVibrateEnabled(next);
    const error = await savePrefs({ ...prefs, [key]: next } as Prefs);
    if (error) {
      if (key === 'sound') feedback.setSoundEnabled(prefs.sound);
      if (key === 'haptic') feedback.setVibrateEnabled(prefs.haptic);
      showToast(error);
    }
  }

  return (
    <Screen
      header={
        <PageHeader
          title="Workout settings"
          back="/workout"
          backLabel="Back to the workout"
          narrow
          actions={
            <Link href="/workout" className="wt-textbtn">
              Done
            </Link>
          }
        />
      }
      narrow
    >
      <Card className="wt-wscard">
        {ROWS.map((r) => (
          <div key={r.key} className="wt-wsrow">
            <div>
              <b>{r.label}</b>
              <small>{r.hint}</small>
            </div>
            <Switch checked={prefs[r.key]} onChange={(next) => void set(r.key, next)} label={r.label} />
          </div>
        ))}
      </Card>
      <p className="wt-wsnote">
        <Info size={16} aria-hidden="true" />
        <span>These apply to every workout. Units and your weekly goal are in Settings.</span>
      </p>
    </Screen>
  );
}
