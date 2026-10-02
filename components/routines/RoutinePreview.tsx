'use client';

import { useRouter } from 'next/navigation';
import { Check, Pencil, Play } from 'lucide-react';
import { MUSCLES } from '@/data/exercises';
import { musclesOfExercises } from '@/lib/muscles';
import { fitsEquipment, isStarterAdded } from '@/lib/explore';
import { routineMeta } from '@/lib/routineSummary';
import { fmtSetSummary } from '@/lib/setSummary';
import { availableEquipment } from '@/lib/routines';
import type { Routine } from '@/lib/routines';
import { useWideLayout, useDesktopLayout } from '@/lib/useMediaQuery';
import { useProgress } from '@/components/ProgressProvider';
import { useWorkoutSession } from '@/components/WorkoutSessionProvider';
import { Button, ButtonLink } from '@/components/ui/Button';
import { Card, CardHead, Hero } from '@/components/ui/Card';
import { MuscleMap } from '@/components/ui/MuscleMap';
import { PageHeader } from '@/components/ui/PageHeader';
import { Screen } from '@/components/ui/Screen';
import { Tag } from '@/components/ui/Chip';
import { Thumb } from '@/components/ui/Thumb';
import type { ExerciseDef } from '@/data/exercises';
import { useAddStarter } from './ExploreView';
import { useStartRoutine } from './useStartRoutine';

/**
 * The full preview of a routine: every exercise with every set, a muscle map,
 * and the main action. `kind` is "mine" for a saved routine (Edit, Start routine)
 * or "starter" for a ready-made one (Start, Save routine).
 */
export function RoutinePreview({ routine, kind }: { routine: Routine; kind: 'mine' | 'starter' }) {
  const router = useRouter();
  const { lookup, prefs, routines, showToast } = useProgress();
  const ws = useWorkoutSession();
  const startSaved = useStartRoutine();
  const { add, addingId } = useAddStarter();
  const desktop = useDesktopLayout();
  const wide = useWideLayout();
  const mine = kind === 'mine';
  const back = mine ? '/routines' : '/explore';

  const exercises = routine.items.map((i) => lookup(i.exerciseId)).filter((e): e is ExerciseDef => Boolean(e));
  const { primary, secondary } = musclesOfExercises(exercises);
  const added = !mine && isStarterAdded(routine, routines);
  const fits = !mine && fitsEquipment(routine, availableEquipment(prefs), lookup);

  function tryNow() {
    const error = ws.startTemplate(routine);
    if (error) showToast(error);
    else router.push('/workout');
  }

  const hero = (
    <Hero>
      <div className="wt-ru-k">{mine ? 'My routine' : 'Ready-made routine'}</div>
      <div className="gt" style={{ fontSize: 30, lineHeight: 1.05, marginTop: 4, overflowWrap: 'anywhere' }}>
        {routine.title}
      </div>
      <div className="wt-hero-t" style={{ marginTop: 6 }}>
        {routineMeta(routine.items, lookup)}
      </div>
    </Hero>
  );

  const actions = mine ? (
    <div className="wt-rc-actions">
      <ButtonLink href={`/routine/${routine.id}`} variant="secondary" icon={<Pencil size={18} aria-hidden="true" />}>
        Edit
      </ButtonLink>
      <Button icon={<Play size={16} fill="currentColor" aria-hidden="true" />} onClick={() => startSaved(routine.id)}>
        Start routine
      </Button>
    </div>
  ) : (
    <div className="wt-rc-actions">
      <Button variant="secondary" icon={<Play size={16} fill="currentColor" aria-hidden="true" />} onClick={tryNow}>
        Start
      </Button>
      <Button disabled={added} loading={addingId === routine.id} icon={added ? <Check size={16} aria-hidden="true" /> : undefined} onClick={() => void add(routine)}>
        {added ? 'Added' : 'Save routine'}
      </Button>
    </div>
  );

  const list = (
    <Card>
      {routine.items.map((item) => {
        const e = lookup(item.exerciseId);
        if (!e) return null;
        return (
          <div key={item.exerciseId} className="wt-pv-ex">
            <div className="wt-pv-top">
              <Thumb exercise={e} size={40} />
              <span style={{ flex: 1, minWidth: 0 }}>
                {e.name}
                <small>
                  {MUSCLES[e.primary]}
                  {e.secondary.length > 0 ? ` · also ${e.secondary.map((m) => MUSCLES[m].toLowerCase()).join(', ')}` : ''}
                </small>
              </span>
            </div>
            {item.notes && <small style={{ color: 'var(--muted)' }}>{item.notes}</small>}
            <div>
              {item.sets.map((s, j) => (
                <div key={j} className="wt-pv-set">
                  <span>Set {j + 1}</span>
                  <b>{fmtSetSummary(e.metric, s, prefs.units)}</b>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </Card>
  );

  const map = (
    <Card>
      <CardHead title="Muscles worked" />
      <MuscleMap primary={primary} secondary={secondary} size={88} />
    </Card>
  );

  const notes = routine.notes ? <div className="wt-hint">{routine.notes}</div> : null;
  const header = <PageHeader title={desktop ? routine.title : mine ? 'Routine' : 'Preview'} back={back} narrow={!wide} actions={desktop && fits ? <Tag tone="ok">Fits you</Tag> : undefined} />;

  if (wide) {
    return (
      <Screen
        header={header}
        aside={
          <>
            {hero}
            {actions}
            {map}
          </>
        }
      >
        {notes}
        {list}
      </Screen>
    );
  }

  return (
    <Screen header={header} narrow footer={desktop ? undefined : actions}>
      {hero}
      {desktop && actions}
      {notes}
      {list}
      {map}
    </Screen>
  );
}
