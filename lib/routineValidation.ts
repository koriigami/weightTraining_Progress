// Strict input checks for the routine, workout and prefs API actions. Pure, so
// the API route and the tests use the same code. Each parser returns either the
// clean value (only known fields, trimmed strings) or an error message.
import { AVOID_TAGS, EQUIPMENT_ORDER, JOINTS, MUSCLE_ORDER } from '../data/exercises';
import type { AvoidTag, CustomExercise, Equipment, Joint, Metric, Muscle } from '../data/exercises';
import { LIMITS, findDuplicateExercise } from './routines';
import type { ExerciseLookup, LoggedSet, Prefs, Routine, RoutineItem, SetPlan, WorkoutItem, WorkoutLog } from './routines';

export type Parsed<T> = { ok: true; value: T } | { ok: false; error: string };

const ok = <T>(value: T): Parsed<T> => ({ ok: true, value });
const fail = <T>(error: string): Parsed<T> => ({ ok: false, error });

type Obj = Record<string, unknown>;

export function isObj(v: unknown): v is Obj {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

const ID_RE = /^[A-Za-z0-9_-]{1,64}$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const WHEN_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;
const CUSTOM_ID_RE = /^custom-[a-z0-9-]{3,48}$/;

export function isValidId(v: unknown): v is string {
  return typeof v === 'string' && ID_RE.test(v);
}

// A real calendar date, not just the right shape (no 2026-02-31).
export function isValidDate(v: unknown): v is string {
  if (typeof v !== 'string' || !DATE_RE.test(v)) return false;
  const d = new Date(`${v}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v;
}

// YYYY-MM-DDTHH:mm, with a real date and a time of day.
export function isValidWhen(v: unknown): v is string {
  if (typeof v !== 'string' || !WHEN_RE.test(v) || !isValidDate(v.slice(0, 10))) return false;
  const h = Number(v.slice(11, 13));
  const m = Number(v.slice(14, 16));
  return h <= 23 && m <= 59;
}

function isInstant(v: unknown): v is string {
  return typeof v === 'string' && v.length <= 40 && !Number.isNaN(Date.parse(v));
}

function text(v: unknown, min: number, max: number): string | null {
  if (typeof v !== 'string') return null;
  const t = v.trim();
  return t.length >= min && t.length <= max ? t : null;
}

function inRange(v: unknown, min: number, max: number): v is number {
  return typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max;
}

// Optional trimmed text. Absent or empty is fine, too long or not a string is not.
function optText(v: unknown, max: number): Parsed<string | undefined> {
  if (v === undefined || v === null) return ok(undefined);
  if (typeof v !== 'string') return fail('invalid text');
  const t = v.trim();
  if (t.length > max) return fail('text is too long');
  return ok(t === '' ? undefined : t);
}

// ---------------- Sets ----------------

// Which set fields each metric uses, and their allowed range.
const SET_FIELDS: Record<Metric, Record<string, [number, number]>> = {
  weight_reps: { kg: [0, 1000], reps: [0, 1000] },
  reps: { reps: [0, 1000] },
  time: { sec: [0, 7200] },
  distance_time: { min: [0, 1440], km: [0, 1000] },
  intervals: { on: [0, 240], off: [0, 240] },
};

function parseSetFields(metric: Metric, raw: Obj): Parsed<SetPlan> {
  const out: Record<string, number> = {};
  for (const [key, [min, max]] of Object.entries(SET_FIELDS[metric])) {
    const v = raw[key];
    if (v === undefined || v === null) continue;
    if (!inRange(v, min, max)) return fail(`${key} is out of range`);
    if (key === 'reps' && !Number.isInteger(v)) return fail('reps must be a whole number');
    out[key] = v;
  }
  return ok(out as SetPlan);
}

function parsePlannedSets(metric: Metric, raw: unknown): Parsed<SetPlan[]> {
  if (!Array.isArray(raw) || raw.length < 1 || raw.length > LIMITS.setsPerItem) return fail('invalid sets');
  const sets: SetPlan[] = [];
  for (const s of raw) {
    if (!isObj(s)) return fail('invalid set');
    const r = parseSetFields(metric, s);
    if (!r.ok) return r;
    sets.push(r.value);
  }
  return ok(sets);
}

function parseLoggedSets(metric: Metric, raw: unknown): Parsed<LoggedSet[]> {
  if (!Array.isArray(raw) || raw.length < 1 || raw.length > LIMITS.setsPerItem) return fail('invalid sets');
  const sets: LoggedSet[] = [];
  for (const s of raw) {
    if (!isObj(s) || typeof s.done !== 'boolean') return fail('invalid set');
    const r = parseSetFields(metric, s);
    if (!r.ok) return r;
    sets.push({ ...r.value, done: s.done });
  }
  return ok(sets);
}

// ---------------- Routines ----------------

export function parseRoutine(raw: unknown, lookup: ExerciseLookup): Parsed<Routine> {
  if (!isObj(raw)) return fail('invalid routine');
  if (!isValidId(raw.id)) return fail('invalid routine id');
  const title = text(raw.title, 1, 60);
  if (!title) return fail('routine needs a title of 1 to 60 characters');
  const notes = optText(raw.notes, 500);
  if (!notes.ok) return fail('notes are too long');
  let timesPerWeek: number | undefined;
  if (raw.timesPerWeek !== undefined && raw.timesPerWeek !== null) {
    if (!inRange(raw.timesPerWeek, 1, 14) || !Number.isInteger(raw.timesPerWeek)) return fail('times per week must be 1 to 14');
    timesPerWeek = raw.timesPerWeek;
  }
  if (!Array.isArray(raw.items) || raw.items.length < 1 || raw.items.length > LIMITS.itemsPerList) {
    return fail('a routine needs 1 to 40 exercises');
  }
  const items: RoutineItem[] = [];
  for (const it of raw.items) {
    if (!isObj(it) || typeof it.exerciseId !== 'string') return fail('invalid exercise');
    const e = lookup(it.exerciseId);
    if (!e) return fail('unknown exercise');
    const itemNotes = optText(it.notes, 300);
    if (!itemNotes.ok) return fail('exercise notes are too long');
    const sets = parsePlannedSets(e.metric, it.sets);
    if (!sets.ok) return sets;
    items.push({ exerciseId: it.exerciseId, ...(itemNotes.value ? { notes: itemNotes.value } : {}), sets: sets.value });
  }
  if (findDuplicateExercise(items)) return fail('an exercise can only be in a routine once');
  return ok({
    id: raw.id,
    title,
    ...(notes.value ? { notes: notes.value } : {}),
    ...(timesPerWeek !== undefined ? { timesPerWeek } : {}),
    items,
  });
}

// ---------------- Workouts ----------------

// A finished workout as sent by the client. xp and prs are not read: the server
// works them out.
export function parseWorkoutInput(raw: unknown, lookup: ExerciseLookup): Parsed<WorkoutLog> {
  if (!isObj(raw)) return fail('invalid workout');
  if (!isValidId(raw.id)) return fail('invalid workout id');
  if (!isValidDate(raw.date)) return fail('invalid date');
  if (!isValidWhen(raw.when)) return fail('invalid time');
  if (raw.when.slice(0, 10) !== raw.date) return fail('date and time do not match');
  const title = text(raw.title, 1, 80);
  if (!title) return fail('workout needs a title of 1 to 80 characters');
  if (raw.routineId !== undefined && raw.routineId !== null && !isValidId(raw.routineId)) return fail('invalid routine id');
  if (!isInstant(raw.startedAt) || !isInstant(raw.finishedAt)) return fail('invalid start or finish time');
  const span = Date.parse(raw.finishedAt) - Date.parse(raw.startedAt);
  if (span < 0 || span > 24 * 3600 * 1000) return fail('finish must be after the start, within a day');
  const notes = optText(raw.notes, 1000);
  if (!notes.ok) return fail('notes are too long');
  const photo = optText(raw.photo, 2000);
  if (!photo.ok) return fail('photo is too large');
  if (!Array.isArray(raw.items) || raw.items.length < 1 || raw.items.length > LIMITS.itemsPerList) {
    return fail('a workout needs 1 to 40 exercises');
  }
  const items: WorkoutItem[] = [];
  let sets = 0;
  let done = 0;
  for (const it of raw.items) {
    if (!isObj(it) || typeof it.exerciseId !== 'string') return fail('invalid exercise');
    const e = lookup(it.exerciseId);
    if (!e) return fail('unknown exercise');
    const itemNotes = optText(it.notes, 300);
    if (!itemNotes.ok) return fail('exercise notes are too long');
    const parsed = parseLoggedSets(e.metric, it.sets);
    if (!parsed.ok) return parsed;
    sets += parsed.value.length;
    done += parsed.value.filter((s) => s.done).length;
    items.push({ exerciseId: it.exerciseId, ...(itemNotes.value ? { notes: itemNotes.value } : {}), sets: parsed.value });
  }
  if (sets > LIMITS.setsPerWorkout) return fail('too many sets');
  if (findDuplicateExercise(items)) return fail('an exercise can only be in a workout once');
  if (done === 0) return fail('tick at least one set');
  return ok({
    id: raw.id,
    date: raw.date,
    when: raw.when,
    title,
    ...(typeof raw.routineId === 'string' ? { routineId: raw.routineId } : {}),
    startedAt: raw.startedAt,
    finishedAt: raw.finishedAt,
    items,
    xp: 0,
    ...(notes.value ? { notes: notes.value } : {}),
    ...(photo.value ? { photo: photo.value } : {}),
    prs: [],
  });
}

export type WorkoutPatch = {
  id: string;
  title?: string;
  date?: string;
  when?: string;
  notes?: string | null; // null clears
  photo?: string | null; // null clears
};

// Only the title, date and time, notes and photo of a finished workout can change.
export function parseWorkoutPatch(raw: Obj): Parsed<WorkoutPatch> {
  if (!isValidId(raw.id)) return fail('invalid workout id');
  const patch: WorkoutPatch = { id: raw.id };
  if (raw.title !== undefined) {
    const title = text(raw.title, 1, 80);
    if (!title) return fail('workout needs a title of 1 to 80 characters');
    patch.title = title;
  }
  if (raw.date !== undefined) {
    if (!isValidDate(raw.date)) return fail('invalid date');
    patch.date = raw.date;
  }
  if (raw.when !== undefined) {
    if (!isValidWhen(raw.when)) return fail('invalid time');
    patch.when = raw.when;
  }
  if (patch.date !== undefined && patch.when !== undefined && patch.when.slice(0, 10) !== patch.date) {
    return fail('date and time do not match');
  }
  for (const key of ['notes', 'photo'] as const) {
    if (raw[key] === undefined) continue;
    const r = optText(raw[key], key === 'notes' ? 1000 : 2000);
    if (!r.ok) return fail(key === 'notes' ? 'notes are too long' : 'photo is too large');
    patch[key] = r.value ?? null;
  }
  return ok(patch);
}

// ---------------- Prefs ----------------

function pickList(raw: unknown, allowed: string[], max: number): string[] | null {
  if (!Array.isArray(raw) || raw.length > max) return null;
  const out: string[] = [];
  for (const v of raw) {
    if (typeof v !== 'string' || !allowed.includes(v) || out.includes(v)) return null;
    out.push(v);
  }
  return out;
}

export function parsePrefs(raw: unknown): Parsed<Prefs> {
  if (!isObj(raw)) return fail('invalid prefs');
  const units = raw.units;
  if (!isObj(units) || (units.weight !== 'kg' && units.weight !== 'lb') || (units.distance !== 'km' && units.distance !== 'mi')) {
    return fail('invalid units');
  }
  const eq = raw.equipment;
  if (!isObj(eq) || (eq.kind !== 'gym' && eq.kind !== 'home' && eq.kind !== 'none')) return fail('invalid equipment');
  const has = pickList(eq.has, EQUIPMENT_ORDER, EQUIPMENT_ORDER.length);
  if (!has) return fail('invalid equipment list');
  if (!Array.isArray(eq.dumbbellKg) || eq.dumbbellKg.length > 30 || !eq.dumbbellKg.every((n) => inRange(n, 0.5, 200))) {
    return fail('invalid dumbbell weights');
  }
  const avoid = pickList(raw.avoid, Object.keys(AVOID_TAGS), Object.keys(AVOID_TAGS).length);
  if (!avoid) return fail('invalid avoid list');
  const limits = pickList(raw.limits, Object.keys(JOINTS), Object.keys(JOINTS).length);
  if (!limits) return fail('invalid limits');
  if (!inRange(raw.weeklyGoal, 1, 7) || !Number.isInteger(raw.weeklyGoal)) return fail('weekly goal must be 1 to 7');
  if (typeof raw.sound !== 'boolean' || typeof raw.haptic !== 'boolean' || typeof raw.onboarded !== 'boolean') {
    return fail('invalid settings');
  }
  return ok({
    units: { weight: units.weight, distance: units.distance },
    equipment: { kind: eq.kind, has, dumbbellKg: [...(eq.dumbbellKg as number[])] },
    avoid,
    limits,
    weeklyGoal: raw.weeklyGoal,
    sound: raw.sound,
    haptic: raw.haptic,
    onboarded: raw.onboarded,
  });
}

// ---------------- Custom exercises ----------------

const METRICS: Metric[] = ['weight_reps', 'reps', 'time', 'distance_time', 'intervals'];

// A custom exercise. The client may pick the id (so an optimistic save and the
// server agree); it has to start with "custom-". `makeId` fills it in otherwise.
export function parseCustomExercise(raw: unknown, makeId: () => string): Parsed<CustomExercise> {
  if (!isObj(raw)) return fail('invalid exercise');
  let id: string;
  if (raw.id === undefined) id = makeId();
  else if (typeof raw.id === 'string' && CUSTOM_ID_RE.test(raw.id)) id = raw.id;
  else return fail('invalid exercise id');
  const name = text(raw.name, 1, 60);
  if (!name) return fail('exercise needs a name of 1 to 60 characters');
  if (typeof raw.equipment !== 'string' || !EQUIPMENT_ORDER.includes(raw.equipment as Equipment)) return fail('invalid equipment');
  if (typeof raw.primary !== 'string' || !MUSCLE_ORDER.includes(raw.primary as Muscle)) return fail('invalid muscle');
  if (typeof raw.metric !== 'string' || !METRICS.includes(raw.metric as Metric)) return fail('invalid metric');
  const secondary = raw.secondary === undefined ? [] : pickList(raw.secondary, MUSCLE_ORDER, 5);
  if (!secondary || secondary.includes(raw.primary)) return fail('invalid secondary muscles');
  const out: CustomExercise = {
    id,
    name,
    equipment: raw.equipment as Equipment,
    primary: raw.primary as Muscle,
    secondary: secondary as Muscle[],
    metric: raw.metric as Metric,
    custom: true,
  };
  if (raw.avoidTag !== undefined) {
    if (typeof raw.avoidTag !== 'string' || !Object.keys(AVOID_TAGS).includes(raw.avoidTag)) return fail('invalid avoid tag');
    out.avoidTag = raw.avoidTag as AvoidTag;
  }
  if (raw.stresses !== undefined) {
    const stresses = pickList(raw.stresses, Object.keys(JOINTS), Object.keys(JOINTS).length);
    if (!stresses) return fail('invalid joints');
    out.stresses = stresses as Joint[];
  }
  return ok(out);
}
