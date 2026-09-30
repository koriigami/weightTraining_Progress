// The workout in progress, as pure functions. The WorkoutSessionProvider holds
// one Session in React state and saves it to localStorage. Nothing here touches
// React or the browser, so it is all testable.
//
// A Session is a workout that has not been finished: a title, when it started,
// and exercises whose sets carry a done flag. finish turns it into the payload
// of the saveWorkout API action, keeping only the ticked sets.
import { exerciseById } from '../data/exercises';
import type { ExerciseDef } from '../data/exercises';
import { SET_FIELDS } from './routineValidation';
import { LIMITS, blankSet, findDuplicateExercise, workoutItemsFromRoutine, workoutTotals } from './routines';
import type { ExerciseLookup, LoggedSet, PlanItem, Routine, SetPlan, WorkoutItem, WorkoutLog, WorkoutTotals } from './routines';

export type Session = {
  title: string;
  routineId?: string;
  startedAt: string; // ISO instant
  items: WorkoutItem[];
  plan?: PlanItem[]; // what the workout set out to do, taken at Start
};

export type SessionResult = { ok: true; session: Session } | { ok: false; error: string };

// What the saveWorkout action takes. The server works out xp, marks and the plan result itself.
export type WorkoutInput = Omit<WorkoutLog, 'xp' | 'marks' | 'xpParts' | 'planComplete' | 'planMissing' | 'prs'>;

export type CardioKind = 'run' | 'walk' | 'ride';

export const CARDIO_EXERCISE: Record<CardioKind, string> = { run: 'run', walk: 'walk', ride: 'cycle' };
const CARDIO_TITLE: Record<CardioKind, string> = { run: 'Run', walk: 'Walk', ride: 'Ride' };

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

export function newSession(now: Date, opts: { title?: string; routineId?: string; items?: WorkoutItem[]; plan?: PlanItem[] } = {}): Session {
  return {
    title: opts.title ?? defaultTitle(now),
    ...(opts.routineId ? { routineId: opts.routineId } : {}),
    startedAt: now.toISOString(),
    items: opts.items ?? [],
    ...(opts.plan ? { plan: opts.plan } : {}),
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

// A quick log of a run, walk or ride: one distance exercise with one set to fill in.
export function cardioSession(kind: CardioKind, now: Date, lookup: ExerciseLookup = exerciseById): Session {
  const e = lookup(CARDIO_EXERCISE[kind]);
  const items: WorkoutItem[] = e ? [{ exerciseId: e.id, sets: [{ ...blankSet(e), done: false }] }] : [];
  return newSession(now, { title: CARDIO_TITLE[kind], items });
}

// ---------------- Editing ----------------

const ok = (session: Session): SessionResult => ({ ok: true, session });
const fail = (error: string): SessionResult => ({ ok: false, error });

function within(items: WorkoutItem[], index: number): boolean {
  return Number.isInteger(index) && index >= 0 && index < items.length;
}

function freshSets(e: ExerciseDef, count: number): LoggedSet[] {
  return Array.from({ length: Math.max(1, count) }, () => ({ ...blankSet(e), done: false }));
}

// No exercise twice in one workout.
export function addExercise(session: Session, exerciseId: string, lookup: ExerciseLookup = exerciseById): SessionResult {
  const e = lookup(exerciseId);
  if (!e) return fail('That exercise is not available.');
  const items = [...session.items, { exerciseId, sets: freshSets(e, 1) }];
  if (findDuplicateExercise(items)) return fail(`${e.name} is already in ${session.title.trim() || 'this workout'}.`);
  if (items.length > LIMITS.itemsPerList) return fail(`A workout can have up to ${LIMITS.itemsPerList} exercises.`);
  return ok({ ...session, items });
}

export type Removal = { session: Session; removed: WorkoutItem; index: number };

// The removed item comes back so the caller can offer an Undo.
export function removeExercise(session: Session, index: number): Removal | null {
  if (!within(session.items, index)) return null;
  const removed = session.items[index];
  return { session: { ...session, items: session.items.filter((_, i) => i !== index) }, removed, index };
}

// Undo of removeExercise. If the same exercise has been added since, nothing changes.
export function restoreExercise(session: Session, removed: WorkoutItem, index: number): Session {
  if (session.items.some((i) => i.exerciseId === removed.exerciseId)) return session;
  const at = Math.max(0, Math.min(index, session.items.length));
  const items = [...session.items];
  items.splice(at, 0, removed);
  return { ...session, items };
}

// Swap an exercise for another. It keeps the number of sets, with fresh blank sets.
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
  return ok({ ...session, items });
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
export function buildWorkoutInput(session: Session, opts: { now: Date; lookup?: ExerciseLookup; id?: string }): BuildResult {
  const lookup = opts.lookup ?? exerciseById;
  const items: WorkoutItem[] = [];
  let ticked = 0;
  for (const item of session.items) {
    const e = lookup(item.exerciseId);
    const sets = item.sets.filter((s) => s.done).map((s) => cleanSet(e, s));
    if (sets.length === 0) continue;
    ticked += sets.length;
    const notes = item.notes?.trim();
    items.push({ exerciseId: item.exerciseId, ...(notes ? { notes: notes.slice(0, 300) } : {}), sets });
  }
  if (ticked === 0) return { ok: false, error: 'Tick at least one set first.' };
  if (ticked > LIMITS.setsPerWorkout) return { ok: false, error: `A workout can have up to ${LIMITS.setsPerWorkout} sets.` };

  const finishedAt = opts.now;
  let started = Date.parse(session.startedAt);
  if (!Number.isFinite(started) || started > finishedAt.getTime()) started = finishedAt.getTime();
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
  };
}
