// The workout in progress, as pure functions. The WorkoutSessionProvider holds
// one Session in React state and saves it to localStorage. Nothing here touches
// React or the browser, so it is all testable.
//
// A Session is a workout that has not been finished: a title, when it started,
// and exercises whose sets carry a done flag. finish turns it into the payload
// of the saveWorkout API action, keeping only the ticked sets.
import { exerciseById, isCardioExercise } from '../data/exercises';
import type { ExerciseDef } from '../data/exercises';
import { SET_FIELDS } from './routineValidation';
import { lastWorkoutSets } from './exerciseHistory';
import { LIMITS, blankSet, findDuplicateExercise, workoutItemsFromRoutine, workoutTotals } from './routines';
import type { ExerciseLookup, LoggedSet, PlanItem, Routine, SetPlan, WorkoutItem, WorkoutLog, WorkoutTotals } from './routines';

export type Session = {
  title: string;
  routineId?: string;
  startedAt: string; // ISO instant
  items: WorkoutItem[];
  plan?: PlanItem[]; // what the workout set out to do, taken at Start
  follow?: string[]; // cardio exercises whose Time still follows the clock (until it is typed in)
};

export type SessionResult = { ok: true; session: Session } | { ok: false; error: string };

// What the saveWorkout action takes. The server works out xp, marks and the plan result itself.
export type WorkoutInput = Omit<WorkoutLog, 'xp' | 'marks' | 'xpParts' | 'planComplete' | 'planMissing' | 'prs'>;

// The six activities of the Cardio picker. `title` names the workout.
export const CARDIO_CHOICES = [
  { id: 'run', label: 'Run', title: 'Run' },
  { id: 'walk', label: 'Walk', title: 'Walk' },
  { id: 'cycle', label: 'Ride outside', title: 'Ride' },
  { id: 'bike', label: 'Stationary bike', title: 'Stationary bike' },
  { id: 'treadmill', label: 'Treadmill', title: 'Treadmill' },
  { id: 'rower', label: 'Rowing', title: 'Rowing' },
] as const;

export type CardioId = (typeof CARDIO_CHOICES)[number]['id'];

export const sessionKey = (userId: string) => `wt:session:${userId}`;

const ID_RE = /^[A-Za-z0-9_-]{1,64}$/;
const DAY_MS = 24 * 3600 * 1000;

// ---------------- Clock helpers (device time) ----------------

const pad = (n: number) => String(n).padStart(2, '0');

// YYYY-MM-DD in the device's own time zone.
export function localDate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// YYYY-MM-DDTHH:mm in the device's own time zone.
export function localWhen(d: Date): string {
  return `${localDate(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// "Morning workout", "Evening workout" and so on, from the start time.
export function defaultTitle(d: Date): string {
  const h = d.getHours();
  if (h >= 5 && h < 12) return 'Morning workout';
  if (h >= 12 && h < 17) return 'Afternoon workout';
  if (h >= 17 && h < 21) return 'Evening workout';
  return 'Night workout';
}

// "45s", "12m 05s", "1h 07m".
export function formatElapsed(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ${pad(s % 60)}s`;
  return `${Math.floor(m / 60)}h ${pad(m % 60)}m`;
}

// ---------------- Starting ----------------

const ok = (session: Session): SessionResult => ({ ok: true, session });
const fail = (error: string): SessionResult => ({ ok: false, error });

export function newSession(now: Date, opts: { title?: string; routineId?: string; items?: WorkoutItem[]; plan?: PlanItem[]; follow?: string[] } = {}): Session {
  return {
    title: opts.title ?? defaultTitle(now),
    ...(opts.routineId ? { routineId: opts.routineId } : {}),
    startedAt: now.toISOString(),
    items: opts.items ?? [],
    ...(opts.plan ? { plan: opts.plan } : {}),
    ...(opts.follow && opts.follow.length > 0 ? { follow: opts.follow } : {}),
  };
}

// The plan a set of items stands for: each exercise with its number of sets.
export function planFromItems(items: { exerciseId: string; sets: unknown[] }[]): PlanItem[] {
  return items.filter((i) => i.sets.length > 0).map((i) => ({ exerciseId: i.exerciseId, sets: i.sets.length }));
}

// Sets come prefilled from the routine, none ticked.
export function sessionFromRoutine(routine: Routine, now: Date): Session {
  return newSession(now, { title: routine.title, routineId: routine.id, items: workoutItemsFromRoutine(routine), plan: planFromItems(routine.items) });
}

// A blank set for a new exercise. Distance cardio has no time yet: Time is what
// makes it count, and it follows the clock or is typed in.
function blankFor(e: ExerciseDef): LoggedSet {
  return e.metric === 'distance_time' ? { done: false } : { ...blankSet(e), done: false };
}

// The sets a newly added exercise starts with: last time's, none ticked, or one blank set.
function startingSets(e: ExerciseDef, prefill?: SetPlan[] | null): LoggedSet[] {
  if (prefill && prefill.length > 0) return prefill.slice(0, LIMITS.setsPerItem).map((s) => ({ ...s, done: false }));
  return [blankFor(e)];
}

export type Prefill = (exerciseId: string, e: ExerciseDef) => SetPlan[] | null;

// Prefill from saved workouts: the sets of the most recent workout with the exercise.
export function prefillFrom(workouts: readonly WorkoutLog[]): Prefill {
  return (exerciseId, e) => lastWorkoutSets(workouts, exerciseId, e.metric);
}

// A custom workout: the exercises picked before Start workout, each with its
// sets (last time's when a prefill is given, else one). The plan is a snapshot of
// exactly that. A lone distance exercise has its Time follow the clock.
export function customSession(now: Date, exerciseIds: string[], lookup: ExerciseLookup = exerciseById, opts: { prefill?: Prefill; title?: string } = {}): SessionResult {
  const ids = exerciseIds.filter((id, i) => exerciseIds.indexOf(id) === i);
  if (ids.length === 0) return fail('Pick at least one exercise.');
  if (ids.length > LIMITS.itemsPerList) return fail(`A workout can have up to ${LIMITS.itemsPerList} exercises.`);
  const items: WorkoutItem[] = [];
  const follow: string[] = [];
  for (const id of ids) {
    const e = lookup(id);
    if (!e) return fail('That exercise is not available.');
    const lone = ids.length === 1 && e.metric === 'distance_time';
    if (lone) follow.push(id);
    items.push({ exerciseId: id, sets: startingSets(e, lone ? null : opts.prefill?.(id, e)) });
  }
  return ok(newSession(now, { ...(opts.title ? { title: opts.title } : {}), items, plan: planFromItems(items), follow }));
}

// The Cardio picker's Start: one distance exercise with one set to fill in.
export function cardioSession(exerciseId: string, now: Date, lookup: ExerciseLookup = exerciseById): SessionResult {
  const choice = CARDIO_CHOICES.find((c) => c.id === exerciseId);
  return customSession(now, [exerciseId], lookup, { title: choice?.title });
}

// ---------------- Editing ----------------

function within(items: WorkoutItem[], index: number): boolean {
  return Number.isInteger(index) && index >= 0 && index < items.length;
}

function freshSets(e: ExerciseDef, count: number): LoggedSet[] {
  return Array.from({ length: Math.max(1, count) }, () => blankFor(e));
}

// No exercise twice in one workout. Adding one does not change the plan.
export function addExercise(session: Session, exerciseId: string, lookup: ExerciseLookup = exerciseById, prefill?: Prefill): SessionResult {
  const e = lookup(exerciseId);
  if (!e) return fail('That exercise is not available.');
  const items = [...session.items, { exerciseId, sets: startingSets(e, prefill?.(exerciseId, e)) }];
  if (findDuplicateExercise(items)) return fail(`${e.name} is already in ${session.title.trim() || 'this workout'}.`);
  if (items.length > LIMITS.itemsPerList) return fail(`A workout can have up to ${LIMITS.itemsPerList} exercises.`);
  return ok({ ...session, items });
}

// Where the removed exercise sat in the plan, so an Undo can put it back.
export type Removal = { session: Session; removed: WorkoutItem; index: number; planSlot?: { index: number; item: PlanItem } };

const without = (list: string[] | undefined, id: string): string[] | undefined => {
  const next = list?.filter((x) => x !== id);
  return next && next.length > 0 ? next : undefined;
};

// Drops a key whose value became undefined, so the stored session stays small.
function tidy(session: Session): Session {
  const { plan, follow, ...rest } = session;
  return { ...rest, ...(plan && plan.length > 0 ? { plan } : {}), ...(follow && follow.length > 0 ? { follow } : {}) };
}

// The removed item comes back so the caller can offer an Undo. Removing an
// exercise removes it from the plan too.
export function removeExercise(session: Session, index: number): Removal | null {
  if (!within(session.items, index)) return null;
  const removed = session.items[index];
  const planIndex = session.plan?.findIndex((p) => p.exerciseId === removed.exerciseId) ?? -1;
  const planSlot = planIndex >= 0 && session.plan ? { index: planIndex, item: session.plan[planIndex] } : undefined;
  const next: Session = {
    ...session,
    items: session.items.filter((_, i) => i !== index),
    ...(session.plan ? { plan: session.plan.filter((p) => p.exerciseId !== removed.exerciseId) } : {}),
    follow: without(session.follow, removed.exerciseId),
  };
  return { session: tidy(next), removed, index, ...(planSlot ? { planSlot } : {}) };
}

// Undo of removeExercise. If the same exercise has been added since, nothing changes.
export function restoreExercise(session: Session, removed: WorkoutItem, index: number, planSlot?: Removal['planSlot']): Session {
  if (session.items.some((i) => i.exerciseId === removed.exerciseId)) return session;
  const at = Math.max(0, Math.min(index, session.items.length));
  const items = [...session.items];
  items.splice(at, 0, removed);
  let plan = session.plan;
  if (planSlot && !plan?.some((p) => p.exerciseId === planSlot.item.exerciseId)) {
    plan = [...(plan ?? [])];
    plan.splice(Math.max(0, Math.min(planSlot.index, plan.length)), 0, planSlot.item);
  }
  return { ...session, items, ...(plan ? { plan } : {}) };
}

// Swap an exercise for another. It keeps the number of sets, with fresh blank
// sets, and takes over the old one's slot in the plan.
export function replaceExercise(session: Session, index: number, exerciseId: string, lookup: ExerciseLookup = exerciseById): SessionResult {
  if (!within(session.items, index)) return fail('That exercise is no longer in the workout.');
  const old = session.items[index];
  if (old.exerciseId === exerciseId) return ok(session);
  const e = lookup(exerciseId);
  if (!e) return fail('That exercise is not available.');
  if (session.items.some((i, k) => k !== index && i.exerciseId === exerciseId)) {
    return fail(`${e.name} is already in ${session.title.trim() || 'this workout'}.`);
  }
  const items = session.items.map((it, k) => (k === index ? { exerciseId, sets: freshSets(e, old.sets.length) } : it));
  const plan = session.plan?.map((p) => (p.exerciseId === old.exerciseId ? { ...p, exerciseId } : p));
  return ok(tidy({ ...session, items, ...(plan ? { plan } : {}), follow: without(session.follow, old.exerciseId) }));
}

export function moveExercise(session: Session, index: number, direction: -1 | 1): Session {
  const to = index + direction;
  if (!within(session.items, index) || !within(session.items, to)) return session;
  const items = [...session.items];
  [items[index], items[to]] = [items[to], items[index]];
  return { ...session, items };
}

// A new set starts as a copy of the last one (weight and reps carry over), not ticked.
export function addSet(session: Session, index: number, lookup: ExerciseLookup = exerciseById): SessionResult {
  if (!within(session.items, index)) return fail('That exercise is no longer in the workout.');
  const item = session.items[index];
  if (item.sets.length >= LIMITS.setsPerItem) return fail(`An exercise can have up to ${LIMITS.setsPerItem} sets.`);
  const last = item.sets[item.sets.length - 1];
  const e = lookup(item.exerciseId);
  const next: LoggedSet = last ? { ...last, done: false } : e ? { ...blankSet(e), done: false } : { done: false };
  return ok({ ...session, items: session.items.map((it, k) => (k === index ? { ...it, sets: [...it.sets, next] } : it)) });
}

export function removeSet(session: Session, index: number, setIndex: number): SessionResult {
  if (!within(session.items, index)) return fail('That exercise is no longer in the workout.');
  const item = session.items[index];
  if (setIndex < 0 || setIndex >= item.sets.length) return ok(session);
  if (item.sets.length === 1) return fail('An exercise needs at least one set. Remove the exercise instead.');
  return ok({ ...session, items: session.items.map((it, k) => (k === index ? { ...it, sets: it.sets.filter((_, j) => j !== setIndex) } : it)) });
}

export type SetPatch = { [K in keyof SetPlan]?: number | undefined };

// Sets the given fields. A value that is not a number (an empty box) clears the field.
export function updateSet(session: Session, index: number, setIndex: number, patch: SetPatch): Session {
  if (!within(session.items, index) || setIndex < 0 || setIndex >= session.items[index].sets.length) return session;
  const items = session.items.map((it, k) => {
    if (k !== index) return it;
    const sets = it.sets.map((s, j) => {
      if (j !== setIndex) return s;
      const next: LoggedSet = { ...s };
      for (const [key, value] of Object.entries(patch) as [keyof SetPlan, number | undefined][]) {
        if (typeof value === 'number' && Number.isFinite(value) && value >= 0) next[key] = value;
        else delete next[key];
      }
      return next;
    });
    return { ...it, sets };
  });
  return { ...session, items };
}

export function toggleSet(session: Session, index: number, setIndex: number): Session {
  if (!within(session.items, index) || setIndex < 0 || setIndex >= session.items[index].sets.length) return session;
  return {
    ...session,
    items: session.items.map((it, k) =>
      k === index ? { ...it, sets: it.sets.map((s, j) => (j === setIndex ? { ...s, done: !s.done } : s)) } : it
    ),
  };
}

// The cardio card's fields. Time above zero counts as done (a ticked set), and
// typing a Time takes it off the clock.
export function updateCardio(session: Session, index: number, patch: SetPatch): Session {
  const updated = updateSet(session, index, 0, patch);
  const item = updated.items[index];
  const first = item?.sets[0];
  if (!item || !first) return session;
  const done = (first.min ?? 0) > 0;
  const items = updated.items.map((it, k) => (k === index ? { ...it, sets: [{ ...first, done }, ...it.sets.slice(1)] } : it));
  return tidy({ ...updated, items, ...('min' in patch ? { follow: without(updated.follow, item.exerciseId) } : {}) });
}

// Time on a cardio card that follows the clock: whole minutes since Start, and
// done once there is one. The same session comes back when nothing changed.
export function syncFollow(session: Session, now: Date): Session {
  if (!session.follow || session.follow.length === 0) return session;
  const minutes = Math.floor((now.getTime() - Date.parse(session.startedAt)) / 60_000);
  if (!(minutes >= 1)) return session;
  let changed = false;
  const items = session.items.map((it) => {
    const first = it.sets[0];
    if (!session.follow?.includes(it.exerciseId) || !first || (first.min === minutes && first.done)) return it;
    changed = true;
    return { ...it, sets: [{ ...first, min: minutes, done: true }, ...it.sets.slice(1)] };
  });
  return changed ? { ...session, items } : session;
}

export function setTitle(session: Session, title: string): Session {
  return { ...session, title: title.slice(0, 80) };
}

export function setItemNotes(session: Session, index: number, notes: string): Session {
  if (!within(session.items, index)) return session;
  const text = notes.slice(0, 300);
  return {
    ...session,
    items: session.items.map((it, k) => {
      if (k !== index) return it;
      const { notes: _old, ...rest } = it;
      return text.trim() ? { ...rest, notes: text } : rest;
    }),
  };
}

// ---------------- Numbers ----------------

export function sessionTotals(session: Session, lookup: ExerciseLookup = exerciseById): WorkoutTotals {
  return workoutTotals(session.items, lookup);
}

export function setCounts(session: Session): { done: number; total: number; unticked: number } {
  let done = 0;
  let total = 0;
  for (const item of session.items) {
    for (const s of item.sets) {
      total++;
      if (s.done) done++;
    }
  }
  return { done, total, unticked: total - done };
}

// ---------------- Finishing ----------------

// Only the fields the exercise's metric uses, whole reps, inside the API's ranges.
function cleanSet(e: ExerciseDef | undefined, s: LoggedSet): LoggedSet {
  const out: LoggedSet = { done: true };
  const fields = e ? SET_FIELDS[e.metric] : {};
  for (const [key, [min, max]] of Object.entries(fields)) {
    let v = s[key as keyof SetPlan];
    if (typeof v !== 'number' || !Number.isFinite(v)) continue;
    if (key === 'reps') v = Math.round(v);
    out[key as keyof SetPlan] = Math.min(max, Math.max(min, v));
  }
  return out;
}

export function newWorkoutId(now: Date, rand: () => number = Math.random): string {
  return `w-${now.getTime().toString(36)}-${Math.floor(rand() * 36 ** 5).toString(36).padStart(5, '0')}`;
}

export type BuildResult = { ok: true; workout: WorkoutInput } | { ok: false; error: string };

// The saveWorkout payload. Needs at least one ticked set. Unticked sets are
// dropped, and so is any exercise left with no ticked set. Dates come from the
// device clock at the moment of finishing, and `when` is local time.
// The ticked sets of each exercise, cleaned. An exercise left with none is dropped.
function cleanItems(source: WorkoutItem[], lookup: ExerciseLookup): { items: WorkoutItem[]; ticked: number } {
  const items: WorkoutItem[] = [];
  let ticked = 0;
  for (const item of source) {
    const e = lookup(item.exerciseId);
    const sets = item.sets.filter((s) => s.done).map((s) => cleanSet(e, s));
    if (sets.length === 0) continue;
    ticked += sets.length;
    const notes = item.notes?.trim();
    items.push({ exerciseId: item.exerciseId, ...(notes ? { notes: notes.slice(0, 300) } : {}), sets });
  }
  return { items, ticked };
}

export function buildWorkoutInput(session: Session, opts: { now: Date; lookup?: ExerciseLookup; id?: string }): BuildResult {
  const lookup = opts.lookup ?? exerciseById;
  const { items, ticked } = cleanItems(session.items, lookup);
  if (ticked === 0) return { ok: false, error: 'Tick at least one set first.' };
  if (ticked > LIMITS.setsPerWorkout) return { ok: false, error: `A workout can have up to ${LIMITS.setsPerWorkout} sets.` };

  const finishedAt = opts.now;
  let started = Date.parse(session.startedAt);
  if (!Number.isFinite(started) || started > finishedAt.getTime()) started = finishedAt.getTime();
  // A cardio-only workout lasts at least as long as the minutes logged on it.
  if (items.every((i) => {
    const e = lookup(i.exerciseId);
    return e ? isCardioExercise(e) : false;
  })) {
    const logged = workoutTotals(items, lookup).cardioMinutes * 60_000;
    if (logged > finishedAt.getTime() - started) started = finishedAt.getTime() - logged;
  }
  // The API takes a workout up to a day long. One left open longer is cut to fit.
  if (finishedAt.getTime() - started >= DAY_MS) started = finishedAt.getTime() - (DAY_MS - 60_000);

  const title = session.title.trim().slice(0, 80) || defaultTitle(new Date(started));
  return {
    ok: true,
    workout: {
      id: opts.id ?? newWorkoutId(finishedAt),
      date: localDate(finishedAt),
      when: localWhen(finishedAt),
      title,
      ...(session.routineId && ID_RE.test(session.routineId) ? { routineId: session.routineId } : {}),
      startedAt: new Date(started).toISOString(),
      finishedAt: finishedAt.toISOString(),
      items,
      ...(session.plan && session.plan.length > 0 ? { plan: session.plan } : {}),
    },
  };
}

// ---------------- Editing a saved workout ----------------
// The Edit workout screen works on a Session that is never stored as the running
// workout. It has no clock: the length is a number of minutes, moved in steps.

export const DURATION_STEP_MIN = 5;
const MAX_DURATION_MIN = 24 * 60 - 1;

// A saved workout as an editable session. An old workout with no plan freezes its own
// exercises as the plan, so an exercise added in the editor does not become part of it.
export function sessionFromWorkout(w: WorkoutLog): Session {
  const plan = w.plan ?? planFromItems(w.items.map((i) => ({ exerciseId: i.exerciseId, sets: i.sets.filter((s) => s.done) })));
  return {
    title: w.title,
    ...(w.routineId ? { routineId: w.routineId } : {}),
    startedAt: w.startedAt,
    items: w.items.map((i) => ({ ...i, sets: i.sets.map((s) => ({ ...s })) })),
    ...(plan.length > 0 ? { plan } : {}),
  };
}

// Whole minutes between start and finish, at least one.
export function durationMinutes(startedAt: string, finishedAt: string): number {
  const span = Date.parse(finishedAt) - Date.parse(startedAt);
  return Number.isFinite(span) && span > 0 ? Math.max(1, Math.round(span / 60_000)) : 1;
}

// The minus and plus of the Duration row: five minutes a step, never under one minute or a day or more.
export function stepDuration(minutes: number, direction: -1 | 1): number {
  return Math.min(MAX_DURATION_MIN, Math.max(1, Math.round(minutes) + direction * DURATION_STEP_MIN));
}

export type EditDraft = { session: Session; when: string; minutes: number; notes: string };

// The instant a local YYYY-MM-DDTHH:mm stands for on this device.
function instantOf(when: string): string {
  return new Date(when).toISOString();
}

// What the updateWorkout action takes. Only what changed moves the times: a new
// date and time moves the finish, and a new length moves the start back from it.
export type WorkoutEdit = {
  title: string;
  when: string;
  date: string;
  notes: string | null;
  items: WorkoutItem[];
  plan?: PlanItem[];
  startedAt?: string;
  finishedAt?: string;
};

export type PatchResult = { ok: true; patch: WorkoutEdit } | { ok: false; error: string };

export function buildWorkoutPatch(original: WorkoutLog, draft: EditDraft, lookup: ExerciseLookup = exerciseById): PatchResult {
  const { items, ticked } = cleanItems(draft.session.items, lookup);
  if (ticked === 0) return { ok: false, error: 'Tick at least one set first.' };
  if (ticked > LIMITS.setsPerWorkout) return { ok: false, error: `A workout can have up to ${LIMITS.setsPerWorkout} sets.` };
  const title = draft.session.title.trim().slice(0, 80);
  if (!title) return { ok: false, error: 'Give the workout a title.' };

  const whenChanged = draft.when !== original.when;
  const lengthChanged = draft.minutes !== durationMinutes(original.startedAt, original.finishedAt);
  const patch: WorkoutEdit = { title, when: draft.when, date: draft.when.slice(0, 10), notes: draft.notes.trim() || null, items };
  if (whenChanged || lengthChanged) {
    const finished = whenChanged ? instantOf(draft.when) : original.finishedAt;
    patch.finishedAt = finished;
    patch.startedAt = new Date(Date.parse(finished) - draft.minutes * 60_000).toISOString();
  }
  // The plan only moves when an exercise was removed from it.
  const before = original.plan ?? planFromItems(original.items.map((i) => ({ exerciseId: i.exerciseId, sets: i.sets.filter((s) => s.done) })));
  const after = draft.session.plan ?? [];
  if (JSON.stringify(before) !== JSON.stringify(after)) patch.plan = after;
  return { ok: true, patch };
}

// ---------------- Saving to localStorage ----------------

export function serializeSession(session: Session): string {
  return JSON.stringify(session);
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

// Reads a stored session back, or null when it is missing or does not look right.
export function parseStoredSession(raw: string | null): Session | null {
  if (!raw) return null;
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!isObj(data) || typeof data.title !== 'string' || typeof data.startedAt !== 'string' || !Array.isArray(data.items)) return null;
  if (Number.isNaN(Date.parse(data.startedAt)) || data.items.length > LIMITS.itemsPerList) return null;
  const plan: PlanItem[] = [];
  if (Array.isArray(data.plan)) {
    for (const p of data.plan.slice(0, LIMITS.itemsPerList)) {
      if (isObj(p) && typeof p.exerciseId === 'string' && Number.isInteger(p.sets) && (p.sets as number) >= 1 && (p.sets as number) <= LIMITS.setsPerItem) {
        plan.push({ exerciseId: p.exerciseId, sets: p.sets as number });
      }
    }
  }
  const follow = Array.isArray(data.follow) ? data.follow.filter((id): id is string => typeof id === 'string').slice(0, LIMITS.itemsPerList) : [];
  const items: WorkoutItem[] = [];
  for (const it of data.items) {
    if (!isObj(it) || typeof it.exerciseId !== 'string' || !Array.isArray(it.sets) || it.sets.length > LIMITS.setsPerItem) return null;
    const sets: LoggedSet[] = [];
    for (const s of it.sets) {
      if (!isObj(s) || typeof s.done !== 'boolean') return null;
      const set: LoggedSet = { done: s.done };
      for (const key of ['kg', 'reps', 'sec', 'min', 'km', 'on', 'off'] as const) {
        const v = s[key];
        if (typeof v === 'number' && Number.isFinite(v)) set[key] = v;
      }
      sets.push(set);
    }
    items.push({ exerciseId: it.exerciseId, ...(typeof it.notes === 'string' && it.notes ? { notes: it.notes.slice(0, 300) } : {}), sets });
  }
  return {
    title: data.title.slice(0, 80),
    ...(typeof data.routineId === 'string' && ID_RE.test(data.routineId) ? { routineId: data.routineId } : {}),
    startedAt: data.startedAt,
    items,
    ...(plan.length > 0 ? { plan } : {}),
    ...(follow.length > 0 ? { follow } : {}),
  };
}
