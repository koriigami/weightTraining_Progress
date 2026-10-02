'use client';

import { useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { buildLoggedWorkout, cardioMinutesLogged, defaultLogWhen, logSession, prefillFrom, stepDuration } from '@/lib/session';
import type { LogSource, Session } from '@/lib/session';
import { estimateMinutes } from '@/lib/routines';
import { useProgress } from '@/components/ProgressProvider';
import { useWorkoutSession } from '@/components/WorkoutSessionProvider';
import { Button, ButtonLink } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { PageHeader } from '@/components/ui/PageHeader';
import { Screen } from '@/components/ui/Screen';
import { WorkoutForm, useWorkoutDraft } from './WorkoutForm';
import { useLeave } from './WorkoutView';

function Missing({ lead, detail, href, label }: { lead: string; detail: string; href: string; label: string }) {
  return (
    <Screen header={<PageHeader title="Log workout" back="/" narrow />} narrow>
      <Card tone="dashed" className="text-center">
        <p style={{ margin: '0 0 12px' }}>
          <b>{lead}</b>
          <br />
          {detail}
        </p>
        <ButtonLink href={href}>{label}</ButtonLink>
      </Card>
    </Screen>
  );
}

/**
 * /workout/log?routine=<id>, ?cardio=<exercise id> or ?ex=a,b,c: a workout you already did.
 * Waits for the routine to load, then hands the source to the form. Nothing is saved
 * until Save, and a workout in progress is never touched.
 */
export function LogWorkout() {
  const params = useSearchParams();
  const { routines, loading } = useProgress();
  const routineId = params.get('routine');
  const cardio = params.get('cardio');
  const ex = params.get('ex');

  if (routineId !== null) {
    const routine = routines.find((r) => r.id === routineId);
    if (!routine) {
      if (loading) return <Screen header={<PageHeader title="Log workout" back="/" narrow />}>{null}</Screen>;
      return <Missing lead="We can't find that routine." detail="It may have been deleted." href="/routines" label="Back to routines" />;
    }
    return <LogForm key={`routine:${routine.id}`} source={{ routine }} />;
  }
  if (cardio !== null) return <LogForm key={`cardio:${cardio}`} source={{ cardio }} />;
  if (ex !== null) {
    const exerciseIds = ex.split(',').filter(Boolean);
    return <LogForm key={`ex:${exerciseIds.join(',')}`} source={{ exerciseIds }} />;
  }
  return <Missing lead="Nothing to log here." detail="Pick a routine, a cardio activity or some exercises first." href="/" label="Back home" />;
}

// The draft is made once, from the data as it is when the screen opens.
function LogForm({ source }: { source: LogSource }) {
  const { workouts, lookup, prefs } = useProgress();
  const [made] = useState(() => {
    const now = new Date();
    return { now, result: logSession(source, now, lookup, prefs.prefillLast ? prefillFrom(workouts) : undefined) };
  });
  if (!made.result.ok) return <Missing lead="Nothing to log here." detail={made.result.error} href="/" label="Back home" />;
  return <LogEditor initial={made.result.session} opened={made.now} />;
}

/**
 * Log workout: the Edit workout screen for a workout that is not saved yet. The date and
 * time start an hour ago and are when it finished, the length starts at the routine's
 * estimate (a cardio-only workout follows its cardio Time until the stepper is used),
 * and Save plays the Victory screen like Finish does.
 */
function LogEditor({ initial, opened }: { initial: Session; opened: Date }) {
  const router = useRouter();
  const leave = useLeave();
  const ws = useWorkoutSession();
  const { workouts, lookup, showToast } = useProgress();

  const draft = useWorkoutDraft(() => initial);
  const [when, setWhen] = useState(() => defaultLogWhen(opened));
  const [estimate] = useState(() => estimateMinutes(initial.items, lookup));
  // The length the stepper set, once it has been used. Until then it follows the cardio Time, or the estimate.
  const [stepped, setStepped] = useState<number | null>(null);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [leaving, setLeaving] = useState(false);

  const cardio = cardioMinutesLogged(draft.session, lookup);
  const minutes = stepped ?? (cardio !== null ? Math.max(1, Math.round(cardio)) : estimate);
  const history = useMemo(() => workouts.filter((x) => x.when < when), [workouts, when]);

  if (leaving) return <Screen header={<PageHeader title="Log workout" back />}>{null}</Screen>;

  async function save() {
    if (saving) return;
    const built = buildLoggedWorkout(draft.ref.current, { when, minutes, notes, now: new Date(), lookup });
    if (!built.ok) {
      showToast(built.error);
      return;
    }
    setSaving(true);
    const r = await ws.logWorkout(built.workout);
    if (!r.ok) {
      setSaving(false);
      showToast(r.error);
      return;
    }
    setLeaving(true);
    router.replace('/workout/done');
  }

  return (
    <Screen
      narrow
      header={
        <PageHeader
          title="Log workout"
          narrow
          lead={
            <button type="button" className="wt-textbtn" onClick={leave}>
              Cancel
            </button>
          }
          actions={
            <Button size="sm" loading={saving} onClick={() => void save()}>
              Save
            </Button>
          }
        />
      }
    >
      <WorkoutForm
        draft={draft}
        when={when}
        onWhen={setWhen}
        minutes={minutes}
        onStep={(direction) => setStepped(stepDuration(minutes, direction))}
        notes={notes}
        onNotes={setNotes}
        history={history}
        empty={{ title: 'No exercises yet', text: 'Add what you did, one exercise at a time.' }}
      />
    </Screen>
  );
}
