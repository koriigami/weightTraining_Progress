'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Flag, Trash2 } from 'lucide-react';
import { useProgress } from '@/components/ProgressProvider';
import { useElapsed, useWorkoutSession } from '@/components/WorkoutSessionProvider';
import { ComingCard } from '@/components/ComingCard';
import { useShell } from '@/components/nav/ShellContext';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { GameModal } from '@/components/ui/GameModal';
import { PageHeader } from '@/components/ui/PageHeader';
import { Screen } from '@/components/ui/Screen';
import { Thumb } from '@/components/ui/Thumb';
import { fmtSetSummary } from '@/lib/setSummary';

// A working stand-in for the Log workout screen: enough to tick sets and
// finish, so the whole flow can be used. Stage 3 replaces it with the real log.
export default function WorkoutPage() {
  const router = useRouter();
  const { lookup, showToast } = useProgress();
  const ws = useWorkoutSession();
  const { openStart } = useShell();
  const elapsed = useElapsed(ws.session?.startedAt);
  const [confirm, setConfirm] = useState<'finish' | 'discard' | null>(null);
  const [saving, setSaving] = useState(false);

  if (!ws.ready) return <Screen header={<PageHeader title="Workout" back="/" />}>{null}</Screen>;

  if (!ws.session) {
    return (
      <Screen header={<PageHeader title="Workout" back="/" />}>
        <Card tone="dashed" className="text-center">
          <p style={{ margin: '0 0 12px' }}>
            <b>No workout in progress.</b>
          </p>
          <Button onClick={openStart}>Start a workout</Button>
        </Card>
      </Screen>
    );
  }

  const { session } = ws;

  async function finish() {
    if (ws.counts.done === 0) {
      setConfirm(null);
      showToast('Tick at least one set first.');
      return;
    }
    setSaving(true);
    const result = await ws.finish();
    setSaving(false);
    setConfirm(null);
    if (!result.ok) {
      showToast(result.error);
      return;
    }
    router.replace('/workout/done');
  }

  return (
    <Screen
      header={
        <PageHeader
          title={session.title || 'Workout'}
          back
          actions={
            <>
              <Button className="hidden md:inline-flex" size="sm" variant="soft-destructive" onClick={() => setConfirm('discard')}>
                Discard
              </Button>
              <Button size="sm" onClick={() => (ws.counts.done === 0 ? showToast('Tick at least one set first.') : setConfirm('finish'))}>
                Finish
              </Button>
            </>
          }
        />
      }
    >
      <p style={{ margin: 0, color: 'var(--muted)', fontWeight: 700 }} aria-live="off">
        {elapsed} · {ws.counts.done} of {ws.counts.total} sets · {ws.totals.xp} XP so far
      </p>

      {session.items.map((item, i) => {
        const e = lookup(item.exerciseId);
        if (!e) return null;
        return (
          <Card key={item.exerciseId} tone="calm">
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
              <Thumb exercise={e} size={40} />
              <b style={{ flex: 1, minWidth: 0 }}>{e.name}</b>
            </div>
            <div className="wt-chips">
              {item.sets.map((s, j) => (
                <Chip key={j} pressed={s.done} aria-label={`${e.name} set ${j + 1}: ${fmtSetSummary(e.metric, s)}`} onClick={() => ws.toggleSet(i, j)}>
                  {j + 1}: {fmtSetSummary(e.metric, s)}
                </Chip>
              ))}
            </div>
          </Card>
        );
      })}

      <ComingCard>The full log arrives here: editable weight and reps, notes, the exercise menu, and the library picker. This stand-in only ticks the planned sets.</ComingCard>

      <div className="md:hidden" style={{ display: 'flex', justifyContent: 'center', paddingTop: 16, borderTop: '2px dashed rgba(200,50,42,.2)' }}>
        <Button variant="soft-destructive" size="sm" icon={<Trash2 size={16} aria-hidden="true" />} onClick={() => setConfirm('discard')}>
          Discard workout
        </Button>
      </div>

      <GameModal
        open={confirm === 'discard'}
        strict
        tone="red"
        icon={<Trash2 size={30} aria-hidden="true" />}
        title="Discard workout?"
        cancelLabel="Keep going"
        confirmLabel="Discard"
        onCancel={() => setConfirm(null)}
        onConfirm={() => {
          setConfirm(null);
          ws.discard();
          router.replace('/');
        }}
      >
        {ws.counts.done > 0 ? `You'll lose ${ws.counts.done} ticked ${ws.counts.done === 1 ? 'set' : 'sets'} and ${ws.totals.xp} XP. This can't be undone.` : 'Nothing is ticked yet, so nothing is lost.'}
      </GameModal>

      <GameModal
        open={confirm === 'finish'}
        tone="green"
        icon={<Flag size={30} aria-hidden="true" />}
        title="Finish workout?"
        cancelLabel="Keep logging"
        confirmLabel="Finish"
        confirmLoading={saving}
        onCancel={() => setConfirm(null)}
        onConfirm={finish}
      >
        {ws.counts.unticked > 0
          ? `${ws.counts.unticked} ${ws.counts.unticked === 1 ? 'set is' : 'sets are'} not ticked. ${ws.counts.unticked === 1 ? "It won't" : "They won't"} be saved.`
          : 'Every set is ticked. Nice work.'}
      </GameModal>
    </Screen>
  );
}
