'use client';

import { useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ClipboardList, Eye, Pencil, Share2, Trash2 } from 'lucide-react';
import { formatDay, formatWhen } from '@/lib/date';
import { workoutSummary, feedTiles } from '@/lib/feed';
import { deleteSentence, deletedToast, setLine, xpBreakdown } from '@/lib/history';
import { musclesOfExercises } from '@/lib/muscles';
import { WORKOUT_XP } from '@/lib/routines';
import type { ExerciseDef } from '@/data/exercises';
import { useDesktopLayout, useWideLayout } from '@/lib/useMediaQuery';
import { useProgress } from '@/components/ProgressProvider';
import { ShareSheet } from '@/components/victory/ShareSheet';
import { Button, ButtonLink } from '@/components/ui/Button';
import { Card, CardHead } from '@/components/ui/Card';
import { GameModal } from '@/components/ui/GameModal';
import { MuscleMap } from '@/components/ui/MuscleMap';
import { PageHeader } from '@/components/ui/PageHeader';
import { Screen } from '@/components/ui/Screen';
import { Thumb } from '@/components/ui/Thumb';
import { DeleteWorkoutDialog } from './DeleteWorkoutDialog';
import { MarkChip } from './ExerciseBlock';
import { WorkoutNotFound } from './WorkoutNotFound';

/** Back to where the workout was opened from, or Home when there is nowhere to go back to. */
export function useLeave(steps = 1): () => void {
  const router = useRouter();
  return () => {
    if (typeof window !== 'undefined' && window.history.length > steps) window.history.go(-steps);
    else router.push('/');
  };
}

/** The XP earned modal: where the workout's XP came from, line by line. */
function XpEarnedModal({ open, onClose, lines, total }: { open: boolean; onClose: () => void; lines: ReturnType<typeof xpBreakdown>['lines']; total: number }) {
  return (
    <GameModal
      open={open}
      title="XP earned"
      cancelLabel="Close"
      onCancel={onClose}
      extra={
        <div className="wt-xpm" data-testid="xp-breakdown">
          {lines.map((l) => (
            <div key={l.key} className="wt-xpl">
              <span>
                {l.title}
                {l.sub && <small>{l.sub}</small>}
              </span>
              <b>+{l.xp}</b>
            </div>
          ))}
          <div className="wt-xpl total">
            <span>Total</span>
            <b className="wt-xpv">+{total} XP</b>
          </div>
        </div>
      }
    />
  );
}

/**
 * A finished workout: title, routine chip and date, the stats (the XP tile has an
 * eye that opens where the XP came from), the muscles, every exercise with its
 * sets and chips, the notes, Share, and Delete. It reads /workout/view?id=.
 * Phone: one column. Wide screens: stats, exercises and Delete on the left,
 * muscles and notes in the side column.
 */
export function WorkoutView() {
  const id = useSearchParams().get('id');
  const leave = useLeave();
  const desktop = useDesktopLayout();
  const wide = useWideLayout();
  const { workouts, routines, lookup, prefs, progress, loading, deleteWorkout, showToast } = useProgress();
  const [xpOpen, setXpOpen] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  // True from the moment Delete is confirmed, so the screen does not flash "can't find that workout".
  const [leaving, setLeaving] = useState(false);

  const w = useMemo(() => workouts.find((x) => x.id === id), [workouts, id]);
  const units = prefs.units;

  const summary = useMemo(() => (w ? workoutSummary(w, lookup, routines) : null), [w, lookup, routines]);
  const breakdown = useMemo(() => (w ? xpBreakdown(w, { lookup, weight: units.weight, distance: units.distance, weeklyGoal: prefs.weeklyGoal }) : null), [w, lookup, units, prefs.weeklyGoal]);

  if (leaving || (loading && !w)) return <Screen header={<PageHeader title="Workout" back />}>{null}</Screen>;
  if (!w || !summary || !breakdown) return <WorkoutNotFound />;

  const editHref = `/workout/edit?id=${encodeURIComponent(w.id)}`;
  const when = formatWhen(w.when);
  const tiles = feedTiles(summary, units);
  const exercises = w.items.map((item) => ({ item, e: lookup(item.exerciseId), sets: item.sets.filter((s) => s.done) })).filter((x): x is { item: typeof x.item; e: ExerciseDef; sets: typeof x.sets } => Boolean(x.e) && x.sets.length > 0);
  const { primary, secondary } = musclesOfExercises(exercises.map((x) => x.e));
  const showMuscles = primary.length > 0 || secondary.length > 0;
  const markOf = (exerciseId: string) => w.marks?.find((m) => m.exerciseId === exerciseId);
  const sentence = deleteSentence({ title: w.title, whenLabel: formatDay(w.date), xp: w.xp, totalXp: progress.xp });

  async function remove() {
    setDeleting(true);
    const r = await deleteWorkout(w!.id);
    setDeleting(false);
    if (!r.ok) {
      setConfirming(false);
      showToast(r.error);
      return;
    }
    setConfirming(false);
    setLeaving(true);
    leave();
    showToast(deletedToast(r.before.level, r.after.level));
  }

  const shareButton = (
    <Button size={desktop ? 'sm' : 'md'} variant="secondary" block={!desktop} icon={<Share2 size={desktop ? 16 : 18} aria-hidden="true" />} onClick={() => setSharing(true)}>
      Share
    </Button>
  );
  const editButton = (
    <ButtonLink href={editHref} size="sm" variant="secondary" icon={<Pencil size={16} aria-hidden="true" />}>
      Edit
    </ButtonLink>
  );

  const head = (
    <>
      {!desktop && <h2 className="wt-dt-title">{w.title}</h2>}
      <div className="wt-metaline">
        {summary.routine && (
          <span className="wt-rchip">
            <ClipboardList size={13} aria-hidden="true" />
            <span>{summary.routine}</span>
          </span>
        )}
        <small>{when}</small>
      </div>
      <div className="wt-dt-stats">
        {tiles.map((t) => (
          <div key={t.key} className="wt-stat">
            <small>{t.label}</small>
            <b>{t.value}</b>
          </div>
        ))}
        <button type="button" className="wt-stat wt-statbtn" aria-label={`XP earned: ${w.xp}. See where it came from`} aria-haspopup="dialog" onClick={() => setXpOpen(true)}>
          <small>
            XP
            <Eye size={13} aria-hidden="true" />
          </small>
          <b className="wt-xpv">+{w.xp}</b>
        </button>
      </div>
    </>
  );

  const muscles = showMuscles && (
    <Card>
      <CardHead title="Muscles" />
      <MuscleMap primary={primary} secondary={secondary} size={80} legend={false} />
    </Card>
  );

  const exerciseCard = (
    <Card style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <CardHead title="Exercises" right={<small style={{ color: 'var(--muted)' }}>{exercises.length}</small>} />
      {exercises.map(({ item, e, sets }) => {
        const mark = markOf(item.exerciseId);
        return (
          <div key={item.exerciseId} className="wt-pvex">
            <div className="wt-pvtop">
              <Thumb exercise={e} size={40} />
              <span className="wt-pvname">{e.name}</span>
              {mark && <MarkChip mark={{ kind: mark.kind, xp: WORKOUT_XP[mark.kind] }} />}
            </div>
            {item.notes && <small style={{ color: 'var(--muted)', fontWeight: 600 }}>{item.notes}</small>}
            <div>
              {sets.map((s, j) => (
                <div key={j} className="wt-setro">
                  <span>{j + 1}</span>
                  <b>{setLine(e.metric, s, units)}</b>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </Card>
  );

  const notes = w.notes?.trim() ? (
    <Card>
      <CardHead title="Notes" />
      <div style={{ overflowWrap: 'anywhere', whiteSpace: 'pre-wrap' }}>{w.notes}</div>
    </Card>
  ) : null;

  const end = (
    <div className="wt-log-end">
      {!desktop && shareButton}
      <div className="wt-danger">
        <Button variant="soft-destructive" size="sm" icon={<Trash2 size={16} aria-hidden="true" />} onClick={() => setConfirming(true)}>
          Delete workout
        </Button>
      </div>
    </div>
  );

  const header = desktop ? (
    <PageHeader
      title={w.title}
      back
      onBack={leave}
      narrow={!wide}
      actions={
        <>
          {shareButton}
          {editButton}
        </>
      }
    />
  ) : (
    <PageHeader title="Workout" back onBack={leave} actions={editButton} />
  );

  return (
    <Screen header={header} narrow={!wide} aside={wide ? <>{muscles}{notes}</> : undefined}>
      {head}
      {!wide && muscles}
      {exerciseCard}
      {!wide && notes}
      {end}

      <XpEarnedModal open={xpOpen} onClose={() => setXpOpen(false)} lines={breakdown.lines} total={breakdown.total} />
      <DeleteWorkoutDialog open={confirming} sentence={sentence} saving={deleting} onKeep={() => setConfirming(false)} onDelete={() => void remove()} />
      <ShareSheet
        open={sharing}
        onClose={() => setSharing(false)}
        data={{
          title: w.title,
          dateLabel: when,
          sets: summary.sets,
          minutes: summary.minutes,
          volumeKg: summary.volumeKg ?? 0,
          xp: w.xp,
          rank: progress.rank,
          level: progress.level,
          weight: units.weight,
        }}
      />
    </Screen>
  );
}
