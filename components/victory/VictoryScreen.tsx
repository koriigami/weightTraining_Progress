'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Calendar, Check, ChevronRight, Crown, Share2 } from 'lucide-react';
import { anim, reducedMotion, springTo } from '@/lib/anim';
import { formatWhen } from '@/lib/date';
import type { Feel } from '@/lib/feel';
import { centreOf, stars } from '@/lib/fx';
import { VICTORY, victoryTimes } from '@/lib/interactions';
import { SPRINGS } from '@/lib/motion';
import { workoutTotals } from '@/lib/routines';
import type { Routine } from '@/lib/routines';
import { RANK_TITLES, rankForLevel } from '@/lib/progress';
import { afterWorkout } from '@/lib/rewards';
import { stageDelay } from '@/lib/rewardStage';
import { routineWouldChange, updateRoutineFromWorkout } from '@/lib/routineUpdate';
import { shareCardData } from '@/lib/shareCard';
import { fmtVolume } from '@/lib/units';
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
import { Switch } from '@/components/ui/Switch';
import { XpBar } from '@/components/ui/XpBar';
import { cn } from '@/components/ui/cn';
import { HowItFelt } from '@/components/workout/HowItFelt';
import { ShareSheet } from './ShareSheet';
import { useVictoryFx } from './useVictoryFx';

const SAVE_DELAY_MS = 700;
const MAX_CROWNS = 10;

const pct = (s: XpSnapshot) => (s.needed > 0 ? (s.current / s.needed) * 100 : 0);

type Patch = { title?: string; when?: string; notes?: string; feel?: Feel | null; effort?: number | null };
type Status = 'idle' | 'saving' | 'saved' | 'error';

/**
 * Victory: the workout is saved and its XP is already counted, so there is no
 * claim step. It shows the banner, the XP lines, the level card, How did it feel? (a
 * face and an effort, saved on tap), the details you can still edit (title, date and
 * time, notes), the "Save weights to <routine>" switch and Share. Done goes Home.
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

  // A level up inside the same rank plays on Victory's own level bar, so its full-screen moment is not queued.
  const levelUpHere = afterWorkout({
    levelBefore: finished.before.level,
    levelAfter: finished.after.level,
    earned: finished.events.flatMap((e) => (e.kind === 'badge' ? [e.badge] : [])),
  }).levelUpOnVictory;

  const saved = finished.workout;
  const live = workouts.find((w) => w.id === saved.id) ?? saved;

  // ---- what is in the details card, saved as you type ----
  const [title, setTitle] = useState(saved.title);
  const [when, setWhen] = useState(saved.when);
  const [dateOpen, setDateOpen] = useState(false);
  const [notes, setNotes] = useState(saved.notes ?? '');
  const [feel, setFeel] = useState(saved.feel);
  const [effort, setEffort] = useState(saved.effort);
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
      const key: keyof Patch = /title/i.test(error) ? 'title' : /notes/i.test(error) ? 'notes' : /feel/i.test(error) ? 'feel' : /effort/i.test(error) ? 'effort' : 'when';
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
    celebration.release();
    router.replace('/');
    showToast('Workout saved');
  }

  const { before: from, after: to } = finished;
  const gained = to.xp - from.xp;
  const score = scoreState(state, today).find((s) => s.id === live.id);
  const lines = xpLines(live, score, lookup, progress.workout.weeklyGoal, prefs.units.weight, prefs.units.distance, live.date < today);
  const { total, other } = xpTotal(lines, gained);
  const totals = workoutTotals(live.items, lookup);
  const span = Date.parse(live.finishedAt) - Date.parse(live.startedAt);
  const minutes = Number.isFinite(span) && span >= 0 ? Math.max(1, Math.round(span / 60000)) : null;
  const crowns = Math.min(MAX_CROWNS, totals.exercises);
  const leveled = to.level > from.level;
  const ranked = leveled && rankForLevel(to.level) !== rankForLevel(from.level);

  // The parts of Victory play in order: the banner, the crowns, the XP lines with the total rolling, then the level bar.
  const rowXps = [...lines.map((l) => l.xp), ...(other > 0 ? [other] : [])];
  const fx = useVictoryFx({
    rowXps,
    weeklyRow: lines.findIndex((l) => l.key === 'weekly' && l.xp > 0),
    crowns,
    total,
    levelUp: levelUpHere,
    pctFrom: leveled && !levelUpHere ? 0 : pct(from),
    pctTo: pct(to),
    level: to.level,
  });
  const times = victoryTimes(crowns, rowXps.length + 1);

  // The rank up and the chest play from here, finish() held them back. Victory plays
  // first: the banner, the crowns, the XP lines, the total and the level bar (and the
  // level up on it), then it holds for VICTORY_HOLD_MS before the stage starts.
  // Done before then lets them go at once.
  const played = useRef(false);
  useEffect(() => {
    if (played.current) return;
    played.current = true;
    const delayMs = stageDelay({ barEnd: times.barEnd, levelUpMs: levelUpHere ? VICTORY.levelHoldMs + 60 + VICTORY.barFillMs : 0, hold: VICTORY_HOLD_MS, reduced: reducedMotion() });
    celebration.enqueue(levelUpHere ? finished.events.filter((e) => e.kind !== 'levelup') : finished.events, { delayMs });
  }, [finished, celebration, levelUpHere, times.barEnd]);
  const rolled = fx.rolled;
  const shownSnap = fx.level === to.level ? to : from;

  // The entrance: the stage fades in, the banner slams from 240% (bouncy) and stars burst behind it.
  const stage = useRef<HTMLElement>(null);
  const banner = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    void anim(stage.current, [{ opacity: 0 }, { opacity: 1 }], { duration: 240, easing: 'linear' });
    void springTo(banner.current, 2.4, 1, (v) => `scale(${v})`, SPRINGS.bouncy);
    const burst = setTimeout(() => banner.current && stars(centreOf(banner.current), 22, '#fff28f', 160), 180);
    return () => clearTimeout(burst);
  }, []);

  // The total bumps when it lands; the level number and the shield pop on a level up.
  const bigXp = useRef<HTMLDivElement>(null);
  const levelNum = useRef<HTMLElement>(null);
  const shield = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (fx.totalKey > 0) void springTo(bigXp.current, 1.2, 1, (v) => `scale(${v})`, SPRINGS.bouncy);
  }, [fx.totalKey]);
  useEffect(() => {
    if (fx.popKey === 0) return;
    void springTo(levelNum.current, 1.5, 1, (v) => `scale(${v})`, SPRINGS.bouncy);
    void springTo(shield.current, 1.3, 1, (v) => `scale(${v})`, SPRINGS.bouncy);
  }, [fx.popKey]);

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
      <section ref={stage} className="wt-victory" aria-label="Workout complete">
        <div className="wt-v-rays" aria-hidden="true" />
        <h2 ref={banner} className="gt wt-v-title">
          VICTORY!
        </h2>
        <div className="wt-v-sub">{live.title} complete</div>
        <div ref={bigXp} className="gt wt-v-xp" aria-label={`Plus ${total} XP`}>
          +<span data-testid="rolling-xp">{rolled}</span> XP
        </div>
        <div className="wt-crowns" role="img" aria-label={`${totals.exercises} ${totals.exercises === 1 ? 'exercise' : 'exercises'} finished`}>
          {Array.from({ length: crowns }, (_, i) => (
            <span key={i} className="wt-crown" style={{ animationDelay: `${times.crowns[i]}ms` }}>
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
        {lines.map((l, i) => (
          <div key={l.key} className={cn('wt-xpl', i < fx.rowsShown ? 'in' : 'wait')}>
            <div>
              <b>{l.title}</b>
              {l.sub && <small>{l.sub}</small>}
            </div>
            {l.key === 'weekly' && l.xp > 0 && fx.seal && (
              <span className="wt-gseal">
                <i>
                  <Check size={14} strokeWidth={3.4} aria-hidden="true" />
                </i>
                Goal met
              </span>
            )}
            <span className="wt-xpv">+{l.xp}</span>
          </div>
        ))}
        {other > 0 && (
          <div className={cn('wt-xpl', lines.length < fx.rowsShown ? 'in' : 'wait')}>
            <div>
              <b>New badge</b>
              <small>Badges pay XP too</small>
            </div>
            <span className="wt-xpv">+{other}</span>
          </div>
        )}
        <div className={cn('wt-xpl total', rowXps.length < fx.rowsShown ? 'in' : 'wait')}>
          <b>Added to your XP</b>
          <span className="wt-xpv" data-testid="xp-total">
            +{total} XP
          </span>
        </div>
      </Card>

      <Card className={cn('wt-lvcard', fx.flash && 'flash')}>
        <span ref={shield} className="wt-lv-shield">
          <RankShield rank={to.rank} level={fx.level} size={48} />
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="wt-lvl-row">
            <b ref={levelNum}>Level {fx.level}</b>
            <small style={{ color: 'var(--muted)' }}>
              {shownSnap.current} / {shownSnap.needed} XP
            </small>
          </div>
          <XpBar value={fx.barPct} className={cn('wt-vbar', fx.barSnap && 'snap')} label={`Level ${fx.level} progress`} />
          {leveled && fx.level === to.level && (
            <small style={{ display: 'block', marginTop: 8, color: 'var(--link)', fontWeight: 800 }}>
              {ranked ? `Rank up! You're ${RANK_TITLES[to.rank]} now.` : `Level up! Level ${to.level}.`}
            </small>
          )}
        </div>
      </Card>

      <HowItFelt
        feel={feel}
        effort={effort}
        error={errors.feel ?? errors.effort}
        onFeel={(next) => {
          setFeel(next ?? undefined);
          edit({ feel: next }, true);
        }}
        onEffort={(next) => {
          setEffort(next ?? undefined);
          edit({ effort: next }, true);
        }}
      />

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
            placeholder="Anything to remember?"
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
            <small>{logged ? "Use these weights and reps as next time's plan." : <>Use today&apos;s weights and reps as next time&apos;s plan.</>}</small>
          </span>
          <Switch checked={updateOn} labelledBy="update-label" onChange={toggleUpdate} />
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
