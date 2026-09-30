// The routine being edited, as pure functions (the editor keeps one Routine in
// React state). The same rules as the workout in progress in lib/session.ts:
// no exercise twice, at least one set, new sets copy the last one.
import { exerciseById } from '../data/exercises';
import type { ExerciseDef } from '../data/exercises';
import { parseRoutine } from './routineValidation';
import { LIMITS, blankSet, findDuplicateExercise } from './routines';
import type { ExerciseLookup, Routine, RoutineItem, SetPlan } from './routines';
import type { SetPatch } from './session';

export type DraftResult = { ok: true; routine: Routine } | { ok: false; error: string };

const ok = (routine: Routine): DraftResult => ({ ok: true, routine });
const fail = (error: string): DraftResult => ({ ok: false, error });

export function newRoutineId(now: Date = new Date(), rand: () => number = Math.random): string {
  return `r-${now.getTime().toString(36)}-${Math.floor(rand() * 36 ** 5).toString(36).padStart(5, '0')}`;
}

export function blankRoutine(id: string): Routine {
  return { id, title: '', items: [] };
}

// A copy the editor can change without touching the saved routine.
export function draftFrom(routine: Routine): Routine {
  return structuredClone(routine);
}

// "Push A" as "Push A copy". Titles stop at 60 characters, so a long one is cut to fit.
export function copyTitle(title: string): string {
  const suffix = ' copy';
  const base = title.trim();
  return base.length + suffix.length > 60 ? `${base.slice(0, 60 - suffix.length).trimEnd()}${suffix}` : `${base}${suffix}`;
}

// A copy of a saved routine under a new id, ready to save.
export function duplicateRoutine(routine: Routine, id: string): Routine {
  return { ...structuredClone(routine), id, title: copyTitle(routine.title) };
}

// New exercises start with three sets, or one for a single cardio session.
export function newItemSets(e: ExerciseDef): SetPlan[] {
  const count = e.metric === 'distance_time' ? 1 : 3;
  return Array.from({ length: count }, () => ({ ...blankSet(e) }));
}

const nameOf = (title: string) => title.trim() || 'this routine';

// Adds one exercise. It is turned away when the routine already has it.
export function addExercise(routine: Routine, exerciseId: string, lookup: ExerciseLookup = exerciseById): DraftResult {
  const e = lookup(exerciseId);
  if (!e) return fail('That exercise is not available.');
  if (routine.items.some((i) => i.exerciseId === exerciseId)) return fail(`${e.name} is already in ${nameOf(routine.title)}.`);
  if (routine.items.length >= LIMITS.itemsPerList) return fail(`A routine can have up to ${LIMITS.itemsPerList} exercises.`);
  return ok({ ...routine, items: [...routine.items, { exerciseId, sets: newItemSets(e) }] });
}

// Adds several, skipping any that are already there or unknown. Returns the ones added.
export function addExercises(routine: Routine, ids: readonly string[], lookup: ExerciseLookup = exerciseById): { routine: Routine; added: string[]; error: string | null } {
  let cur = routine;
  const added: string[] = [];
  let error: string | null = null;
  for (const id of ids) {
    const r = addExercise(cur, id, lookup);
    if (r.ok) {
      cur = r.routine;
      added.push(id);
    } else {
      error = r.error;
    }
  }
  return { routine: cur, added, error };
}

export type ItemRemoval = { routine: Routine; removed: RoutineItem; index: number };

const within = (items: readonly unknown[], index: number) => Number.isInteger(index) && index >= 0 && index < items.length;

// The removed item comes back so the caller can offer an Undo.
export function removeItem(routine: Routine, index: number): ItemRemoval | null {
  if (!within(routine.items, index)) return null;
  return { routine: { ...routine, items: routine.items.filter((_, i) => i !== index) }, removed: routine.items[index], index };
}

// Undo of removeItem. If the exercise was added again meanwhile, nothing changes.
export function restoreItem(routine: Routine, removed: RoutineItem, index: number): Routine {
  if (routine.items.some((i) => i.exerciseId === removed.exerciseId)) return routine;
  const items = [...routine.items];
  items.splice(Math.max(0, Math.min(index, items.length)), 0, removed);
  return { ...routine, items };
}

export function moveItem(routine: Routine, index: number, direction: -1 | 1): Routine {
  const to = index + direction;
  if (!within(routine.items, index) || !within(routine.items, to)) return routine;
  const items = [...routine.items];
  [items[index], items[to]] = [items[to], items[index]];
  return { ...routine, items };
}

// Swaps one exercise for another and keeps the number of sets.
export function replaceItem(routine: Routine, index: number, exerciseId: string, lookup: ExerciseLookup = exerciseById): DraftResult {
  if (!within(routine.items, index)) return fail('That exercise is no longer in the routine.');
  const old = routine.items[index];
  if (old.exerciseId === exerciseId) return ok(routine);
  const e = lookup(exerciseId);
  if (!e) return fail('That exercise is not available.');
  if (routine.items.some((i, k) => k !== index && i.exerciseId === exerciseId)) return fail(`${e.name} is already in ${nameOf(routine.title)}.`);
  const sets = Array.from({ length: Math.max(1, old.sets.length) }, () => ({ ...blankSet(e) }));
  return ok({ ...routine, items: routine.items.map((it, k) => (k === index ? { exerciseId, sets } : it)) });
}

// A new set is a copy of the last one.
export function addSet(routine: Routine, index: number, lookup: ExerciseLookup = exerciseById): DraftResult {
  if (!within(routine.items, index)) return fail('That exercise is no longer in the routine.');
  const item = routine.items[index];
  if (item.sets.length >= LIMITS.setsPerItem) return fail(`An exercise can have up to ${LIMITS.setsPerItem} sets.`);
  const last = item.sets[item.sets.length - 1];
  const e = lookup(item.exerciseId);
  const next: SetPlan = last ? { ...last } : e ? { ...blankSet(e) } : {};
  return ok({ ...routine, items: routine.items.map((it, k) => (k === index ? { ...it, sets: [...it.sets, next] } : it)) });
}

export function removeSet(routine: Routine, index: number, setIndex: number): DraftResult {
  if (!within(routine.items, index)) return fail('That exercise is no longer in the routine.');
  const item = routine.items[index];
  if (setIndex < 0 || setIndex >= item.sets.length) return ok(routine);
  if (item.sets.length === 1) return fail('An exercise needs at least one set. Remove the exercise instead.');
  return ok({ ...routine, items: routine.items.map((it, k) => (k === index ? { ...it, sets: it.sets.filter((_, j) => j !== setIndex) } : it)) });
}

// Sets the given fields. A value that is not a number (an empty box) clears the field.
export function updateSet(routine: Routine, index: number, setIndex: number, patch: SetPatch): Routine {
  if (!within(routine.items, index) || setIndex < 0 || setIndex >= routine.items[index].sets.length) return routine;
  const items = routine.items.map((it, k) => {
    if (k !== index) return it;
    const sets = it.sets.map((s, j) => {
      if (j !== setIndex) return s;
      const next: SetPlan = { ...s };
      for (const [key, value] of Object.entries(patch) as [keyof SetPlan, number | undefined][]) {
        if (typeof value === 'number' && Number.isFinite(value) && value >= 0) next[key] = value;
        else delete next[key];
      }
      return next;
    });
    return { ...it, sets };
  });
  return { ...routine, items };
}

export function setItemNotes(routine: Routine, index: number, notes: string): Routine {
  if (!within(routine.items, index)) return routine;
  const text = notes.slice(0, 300);
  return {
    ...routine,
    items: routine.items.map((it, k) => {
      if (k !== index) return it;
      const { notes: _old, ...rest } = it;
      return text.trim() ? { ...rest, notes: text } : rest;
    }),
  };
}

export function setTitle(routine: Routine, title: string): Routine {
  return { ...routine, title: title.slice(0, 60) };
}

// undefined means "Any": no weekly target.
export function setTimesPerWeek(routine: Routine, times: number | undefined): Routine {
  const { timesPerWeek: _old, ...rest } = routine;
  return times === undefined ? rest : { ...rest, timesPerWeek: times };
}

// "Routine needs a title of 1 to 60 characters." Uses the same checks and words as
// the API, so what the editor says matches what the server would say.
export function validateRoutine(routine: Routine, lookup: ExerciseLookup = exerciseById): string | null {
  if (findDuplicateExercise(routine.items)) return 'An exercise can only be in a routine once.';
  const parsed = parseRoutine(routine, lookup);
  if (parsed.ok) return null;
  const t = parsed.error.trim();
  const s = t.charAt(0).toUpperCase() + t.slice(1);
  return /[.!?]$/.test(s) ? s : `${s}.`;
}

export function sameRoutine(a: Routine, b: Routine): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}
