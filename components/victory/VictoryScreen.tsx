'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Calendar, ChevronRight, Crown, Share2 } from 'lucide-react';
import { formatWhen } from '@/lib/date';
import { workoutTotals } from '@/lib/routines';
import type { Routine } from '@/lib/routines';
import { RANK_TITLES, rankForLevel } from '@/lib/progress';
import { routineWouldChange, updateRoutineFromWorkout } from '@/lib/routineUpdate';
import { shareCardData } from '@/lib/shareCard';
import { fmtVolume } from '@/lib/units';
import { useCountUp } from '@/lib/useCountUp';
import { useDesktopLayout } from '@/lib/useMediaQuery';
import { useToday } from '@/lib/useToday';
import { xpLines, xpTotal } from '@/lib/victory';
import { maxWorkoutDate, scoreState } from '@/lib/workoutScoring';
import { useCelebration } from '@/components/celebrate/CelebrationProvider';
import { VICTORY_HOLD_MS } from '@/lib/celebrations';
import { useProgress } from '@/components/ProgressProvider';
import type { XpSnapshot } from '@/components/ProgressProvider';
import { RankShield } from '@/components/RankShield';
import { useWorkoutSession } from '@/components/WorkoutSessionProvider';
import { Button } from '@/components/ui/Button';
import { Card, CardHead } from '@/components/ui/Card';
import { DateTimeModal } from '@/components/ui/DatePicker';
import { Field, Input, Textarea } from '@/components/ui/Field';
import { PageHeader } from '@/components/ui/PageHeader';
import { Screen } from '@/components/ui/Screen';
import { XpBar } from '@/components/ui/XpBar';
import { ShareSheet } from './ShareSheet';

const SAVE_DELAY_MS = 700;
const MAX_CROWNS = 10;

const pct = (s: XpSnapshot) => (s.needed > 0 ? (s.current / s.needed) * 100 : 0);

type Patch = { title?: string; when?: string; notes?: string };
type Status = 'idle' | 'saving' | 'saved' | 'error';

/**
 * Victory: the workout is saved and its XP is already counted, so there is no
 * claim step. It shows the banner, the XP lines, the level card, the details you
 * can still edit (title, date and time, notes), the "Save weights to <routine>" switch and
 * Share. Done goes Home.
 *
 * A photo for the workout is not built yet: it needs file storage (Vercel Blob),
 * so the details card has no photo control. The workout still has a `photo` field
 * for when that arrives (the next version).
 */
export function VictoryScreen() {
  const router = useRouter();
  const { lastFinished, ready } = useWorkoutSession();
  // Keep the finished workout for as long as this screen is open, even after Done clears it.
  const [finished] = useState(lastFinished);

  if (!finished) {
    return (
      <Screen header={<PageHeader title="Workout" back="/" />} narrow>
        <Card tone="dashed" className="text-center">
          <p style={{ margin: '0 0 12px' }}>{ready ? 'There is no finished workout to show.' : 'Loading.'}</p>
          <Button onClick={() => router.replace('/')}>Home</Button>
        </Card>
      </Screen>
    );
  }
  return <Victory finished={finished} />;
}

type Finished = NonNullable<ReturnType<typeof useWorkoutSession>['lastFinished']>;

function Victory({ finished }: { finished: Finished }) {
  const router = useRouter();
  const desktop = useDesktopLayout();
  const today = useToday();
  const { clearLastFinished } = useWorkoutSession();
  const { state, workouts, routines, prefs, lookup, progress, updateWorkout, saveRoutine, showToast } = useProgress();
  const celebration = useCelebration();

  // Level-ups, rank-ups and new badges play from here. finish() held them back.
  // The banner, the rolling XP, the crowns and the XP bar play first: the moments
  // start about 1.8 seconds in, or at the first tap if that comes sooner.
  const played = useRef(false);
  useEffect(() => {
    if (played.current) return;
    played.current = true;
    celebration.enqueue(finished.events, { delayMs: VICTORY_HOLD_MS });
  }, [finished, celebration]);

  const saved = finished.workout;
  const live = workouts.find((w) => w.id === saved.id) ?? saved;

  // ---- what is in the details card, saved as you type ----
  const [title, setTitle] = useState(saved.title);
  const [when, setWhen] = useState(saved.when);
  const [dateOpen, setDateOpen] = useState(false);
  const [notes, setNotes] = useState(saved.notes ?? '');
  const [status, setStatus] = useState<Status>('idle');
  const [errors, setErrors] = useState<Partial<Record<keyof Patch, string>>>({});
  const pending = useRef<Patch>({});
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedId = saved.id;

  const flush = useCallback(async (): Promise<boolean> => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    const patch = pending.current;
    pending.current = {};
    if (Object.keys(patch).length === 0) return true;
    setStatus('saving');
    const result = await updateWorkout({ id: savedId, ...patch });
    if (!result.ok) {
      const error = result.error;
      setStatus('error');
      const key: keyof Patch = /title/i.test(error) ? 'title' : /notes/i.test(error) ? 'notes' : 'when';
      setErrors((e) => ({ ...e, [key]: error }));
      return false;
    }
    setStatus('saved');
    setErrors({});
    return true;
  }, [savedId, updateWorkout]);

  const flushRef = useRef(flush);
  flushRef.current = flush;
  // Leaving by any route saves what is waiting.
  useEffect(
    () => () => {
      void flushRef.current();
    },
    []
  );

  function edit(patch: Patch, now = false) {
    pending.current = { ...pending.current, ...patch };
    if (timer.current) clearTimeout(timer.current);
    if (now) void flush();
    else timer.current = setTimeout(() => void flush(), SAVE_DELAY_MS);
  }

  // ---- update routine with today's weights ----
  const routine = saved.routineId ? routines.find((r) => r.id === saved.routineId) : undefined;
  const before = useRef<Routine | null>(routine ?? null);
  const showUpdate = useMemo(() => Boolean(before.current && routineWouldChange(before.current, saved)), [saved]);
  // A workout logged after the fact starts with the switch off and applies nothing: an old
  // workout's weights should not overwrite the routine.
  const logged = Boolean(finished.logged);
  const [updateOn, setUpdateOn] = useState(!logged);
  const appliedFirst = useRef(false);
  useEffect(() => {
    // On by default, like the design: the routine takes today's weights and reps. The switch undoes it.
    if (logged || appliedFirst.current || !showUpdate || !before.current) return;
    appliedFirst.current = true;
    void saveRoutine(updateRoutineFromWorkout(before.current, saved)).then((error) => error && showToast(error));
  }, [logged, showUpdate, saved, saveRoutine, showToast]);

  function toggleUpdate() {
    if (!before.current) return;
    const next = !updateOn;
    setUpdateOn(next);
    void saveRoutine(next ? updateRoutineFromWorkout(before.current, saved) : before.current).then((error) => {
      if (error) {
        setUpdateOn(!next);
        showToast(error);
      } else {
        showToast(next ? `${before.current?.title} updated` : `${before.current?.title} restored`);
      }
    });
  }

  const [sharing, setSharing] = useState(false);

  async function done() {
    // An empty title is not saved. The saved title stays.
    const t = title.trim();
    if (t && t !== live.title) pending.current = { ...pending.current, title: t };
    else delete pending.current.title;
    const ok = await flush();
    if (!ok) {
      showToast("Couldn't save your changes. Fix them, then tap Done.");
      return;
    }
    clearLastFinished();
    router.replace('/');
    showToast('Workout saved');
  }

  const { before: from, after: to } = finished;
  const gained = to.xp - from.xp;
  const score = scoreState(state, today).find((s) => s.id === live.id);
  const lines = xpLines(live, score, lookup, progress.workout.weeklyGoal, prefs.units.weight, prefs.units.distance);
  const { total, other } = xpTotal(lines, gained);
  const totals = workoutTotals(live.items, lookup);
  const span = Date.parse(live.finishedAt) - Date.parse(live.startedAt);
  const minutes = Number.isFinite(span) && span >= 0 ? Math.max(1, Math.round(span / 60000)) : null;
  const rolled = useCountUp(total);
  const crowns = Math.min(MAX_CROWNS, totals.exercises);
  const leveled = to.level > from.level;
  const ranked = leveled && rankForLevel(to.level) !== rankForLevel(from.level);

  // The card shows the workout as the screen shows it now (a renamed title counts), the rank and level right after it.
  const card = useMemo(
    () => shareCardData({ workout: { ...live, title: title.trim() || live.title }, lookup, units: prefs.units, rank: to.rank, level: to.level }),
    [live, title, lookup, prefs.units, to.rank, to.level]
  );

  return (
    <Screen
      header={
        <PageHeader
          title={desktop ? 'Victory' : 'Workout complete'}
          narrow
          actions={
            desktop ? (
              <>
                <Button size="sm" variant="secondary" icon={<Share2 size={16} aria-hidden="true" />} onClick={() => setSharing(true)}>
                  Share
                </Button>
                <Button size="sm" onClick={() => void done()}>
                  Done
                </Button>
              </>
            ) : undefined
          }
        />
      }
      narrow
      footer={
        <Button size="lg" onClick={() => void done()}>
          Done
        </Button>
      }
    >
      <section className="wt-victory" aria-label="Workout complete">
        <div className="wt-v-rays" aria-hidden="true" />
        <h2 className="gt wt-v-title">VICTORY!</h2>
        <div className="wt-v-sub">{live.title} complete</div>
        <div className="gt wt-v-xp" aria-label={`Plus ${total} XP`}>
          +<span data-testid="rolling-xp">{rolled}</span> XP
        </div>
        <div className="wt-crowns" role="img" aria-label={`${totals.exercises} ${totals.exercises === 1 ? 'exercise' : 'exercises'} finished`}>
          {Array.from({ length: crowns }, (_, i) => (
            <span key={i} className="wt-crown" style={{ animationDelay: `${0.5 + i * 0.18}s` }}>
              <Crown size={32} fill="currentColor" aria-hidden="true" />
            </span>
          ))}
        </div>
        <div className="wt-v-stats">
          <div className="wt-stat">
            <small>Sets</small>
            <b>{totals.sets}</b>
          </div>
          {minutes !== null && (
            <div className="wt-stat">
              <small>Time</small>
              <b>{minutes} min</b>
            </div>
          )}
          {totals.volume > 0 && (
            <div className="wt-stat">
              <small>Volume</small>
              <b>{fmtVolume(totals.volume, prefs.units.weight)}</b>
            </div>
          )}
        </div>
      </section>

      <Card aria-label="XP earned">
        {lines.map((l) => (
          <div key={l.key} className="wt-xpl">
            <div>
              <b>{l.title}</b>
              {l.sub && <small>{l.sub}</small>}
            </div>
            <span className="wt-xpv">+{l.xp}</span>
          </div>
        ))}
        {other > 0 && (
          <div className="wt-xpl">
            <div>
              <b>New badge</b>
              <small>Badges pay XP too</small>
            </div>
            <span className="wt-xpv">+{other}</span>
          </div>
        )}
        <div className="wt-xpl total">
          <b>Added to your XP</b>
          <span className="wt-xpv" data-testid="xp-total">
            +{total} XP
          </span>
        </div>
      </Card>

      <Card className="wt-lvcard">
        <RankShield rank={to.rank} level={to.level} size={48} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="wt-lvl-row">
            <b>Level {to.level}</b>
            <small style={{ color: 'var(--muted)' }}>
              {to.current} / {to.needed} XP
            </small>
          </div>
          <XpBar from={leveled ? 0 : pct(from)} value={pct(to)} animate label={`Level ${to.level} progress`} />
          {leveled && (
            <small style={{ display: 'block', marginTop: 8, color: 'var(--link)', fontWeight: 800 }}>
              {ranked ? `Rank up! You're ${RANK_TITLES[to.rank]} now.` : `Level up! Level ${to.level}.`}
            </small>
          )}
        </div>
      </Card>

      <Card>
        <CardHead
          title="Workout details"
          right={
            <small style={{ color: 'var(--muted)' }} aria-live="polite">
              {status === 'saving' ? 'Saving' : status === 'saved' ? 'Saved' : status === 'error' ? 'Not saved' : 'Saved as you type'}
            </small>
          }
        />
        <Field label="Title" error={errors.title}>
          <Input
            value={title}
            maxLength={80}
            autoComplete="off"
            onChange={(e) => {
              const v = e.target.value;
              setTitle(v);
              setErrors((x) => ({ ...x, title: v.trim() ? undefined : 'Give the workout a title.' }));
              if (v.trim()) edit({ title: v.trim() });
            }}
          />
        </Field>
        <div className="wt-stack" style={{ gap: 6 }}>
          <button type="button" className="wt-frow" aria-haspopup="dialog" onClick={() => setDateOpen(true)}>
            <Calendar size={20} aria-hidden="true" />
            <span className="grow">
              <small>Date and time</small>
              {formatWhen(when)}
            </span>
            <ChevronRight size={18} aria-hidden="true" />
          </button>
          {errors.when && (
            <span className="wt-field-error" role="alert">
              {errors.when}
            </span>
          )}
        </div>
        <DateTimeModal
          open={dateOpen}
          value={when}
          max={maxWorkoutDate(today)}
          onCancel={() => setDateOpen(false)}
          onDone={(v) => {
            setDateOpen(false);
            setWhen(v);
            edit({ when: v }, true);
          }}
        />
        {/* A photo for the workout comes with file storage (Vercel Blob) in the next version, so there is no photo control here yet. */}
        <Field label="Notes">
          <Textarea
            value={notes}
            maxLength={1000}
            placeholder="How did it feel?"
            onChange={(e) => {
              setNotes(e.target.value);
              edit({ notes: e.target.value });
            }}
          />
        </Field>
      </Card>

      {before.current && showUpdate && (
        <Card className="wt-switchrow">
          <span id="update-label">
            <b>Save weights to {before.current.title}</b>
            <small>Use today&apos;s weights and reps as next time&apos;s plan.</small>
          </span>
          <button type="button" role="switch" aria-checked={updateOn} aria-labelledby="update-label" className="wt-switch" onClick={toggleUpdate}>
            <i />
          </button>
        </Card>
      )}

      {!desktop && (
        <Button variant="secondary" block icon={<Share2 size={18} aria-hidden="true" />} onClick={() => setSharing(true)}>
          Share workout
        </Button>
      )}

      <ShareSheet open={sharing} onClose={() => setSharing(false)} card={card} />
    </Screen>
  );
}
