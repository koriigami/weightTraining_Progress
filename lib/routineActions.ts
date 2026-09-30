// The routine, workout, prefs and custom exercise actions of the state API, as a
// pure function of the state. The route calls it, and so can the client for an
// optimistic update, so both end up with the same numbers. Nothing is mutated.
import { EXERCISES, exerciseById } from '../data/exercises';
import { addDaysStr } from './date';
import { LIMITS, stateLookup } from './routines';
import type { WorkoutLog } from './routines';
import type { AppState } from './progress';
import {
  isObj,
  isValidId,
  parseCustomExercise,
  parsePrefs,
  parseRoutine,
  parseWorkoutInput,
  parseWorkoutPatch,
} from './routineValidation';
import { rescoreWorkouts } from './workoutScoring';

export const ROUTINE_ACTIONS = [
  'saveRoutine',
  'deleteRoutine',
  'saveWorkout',
  'updateWorkout',
  'deleteWorkout',
  'savePrefs',
  'addCustomExercise',
  'setRulesNote',
] as const;

export type RoutineAction = (typeof ROUTINE_ACTIONS)[number];

export function isRoutineAction(action: unknown): action is RoutineAction {
  return typeof action === 'string' && (ROUTINE_ACTIONS as readonly string[]).includes(action);
}

export type ActionResult = { ok: true; state: AppState } | { ok: false; error: string };

const fail = (error: string): ActionResult => ({ ok: false, error });

function defaultId(): string {
  return `custom-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

// today is the caller's date (YYYY-MM-DD). A workout can be dated up to
// tomorrow, to allow for time zones, and no later.
export function applyRoutineAction(
  state: AppState,
  body: Record<string, unknown>,
  ctx: { today: string; makeId?: () => string }
): ActionResult {
  const maxDate = addDaysStr(ctx.today, 1);
  const lookup = stateLookup(state);
  const workouts = state.workouts ?? [];
  // The state with fresh workouts: XP, marks and the plan result are worked out again for all of them.
  const withWorkouts = (next: WorkoutLog[], base: AppState = state): AppState => ({
    ...base,
    workouts: rescoreWorkouts(base, next, ctx.today),
  });

  switch (body.action) {
    case 'saveRoutine': {
      const parsed = parseRoutine(body.routine, lookup);
      if (!parsed.ok) return fail(parsed.error);
      // `after` places a new routine right after another (Duplicate). An unknown id just appends.
      if (body.after !== undefined && !isValidId(body.after)) return fail('invalid id');
      const routines = state.routines ?? [];
      const at = routines.findIndex((r) => r.id === parsed.value.id);
      if (at === -1 && routines.length >= LIMITS.routines) return fail('too many routines');
      if (at !== -1) return { ok: true, state: { ...state, routines: routines.map((r, i) => (i === at ? parsed.value : r)) } };
      const anchor = body.after === undefined ? -1 : routines.findIndex((r) => r.id === body.after);
      const next = anchor === -1 ? [...routines, parsed.value] : [...routines.slice(0, anchor + 1), parsed.value, ...routines.slice(anchor + 1)];
      return { ok: true, state: { ...state, routines: next } };
    }
    case 'deleteRoutine': {
      if (!isValidId(body.id)) return fail('invalid id');
      return { ok: true, state: { ...state, routines: (state.routines ?? []).filter((r) => r.id !== body.id) } };
    }
    case 'saveWorkout': {
      const parsed = parseWorkoutInput(body.workout, lookup);
      if (!parsed.ok) return fail(parsed.error);
      const w = parsed.value;
      if (w.date > maxDate) return fail('date is in the future');
      if (workouts.some((x) => x.id === w.id)) return fail('workout already saved');
      if (workouts.length >= LIMITS.workouts) return fail('too many workouts');
      return { ok: true, state: withWorkouts([...workouts, w]) };
    }
    case 'updateWorkout': {
      const parsed = parseWorkoutPatch(body, lookup);
      if (!parsed.ok) return fail(parsed.error);
      const patch = parsed.value;
      const existing = workouts.find((w) => w.id === patch.id);
      if (!existing) return fail('workout not found');
      // A new date moves the day part of `when` with it, and a new `when` sets the date.
      const date = patch.date ?? patch.when?.slice(0, 10) ?? existing.date;
      const when = patch.when ?? `${date}${existing.when.slice(10)}`;
      if (date > maxDate) return fail('date is in the future');
      const updated: WorkoutLog = { ...existing, date, when, title: patch.title ?? existing.title };
      // An edit can change the length: the finish must still come after the start, within a day.
      const startedAt = patch.startedAt ?? existing.startedAt;
      const finishedAt = patch.finishedAt ?? existing.finishedAt;
      const span = Date.parse(finishedAt) - Date.parse(startedAt);
      if (span < 0 || span > 24 * 3600 * 1000) return fail('finish must be after the start, within a day');
      updated.startedAt = startedAt;
      updated.finishedAt = finishedAt;
      if (patch.items) updated.items = patch.items;
      if (patch.plan) {
        if (patch.plan.length > 0) updated.plan = patch.plan;
        else delete updated.plan;
      }
      for (const key of ['notes', 'photo'] as const) {
        if (patch[key] === undefined) continue;
        if (patch[key] === null) delete updated[key];
        else updated[key] = patch[key] as string;
      }
      return { ok: true, state: withWorkouts(workouts.map((w) => (w.id === patch.id ? updated : w))) };
    }
    case 'deleteWorkout': {
      if (!isValidId(body.id)) return fail('invalid id');
      return { ok: true, state: withWorkouts(workouts.filter((w) => w.id !== body.id)) };
    }
    case 'savePrefs': {
      const parsed = parsePrefs(body.prefs);
      if (!parsed.ok) return fail(parsed.error);
      // The weekly goal decides which workout earns the weekly bonus.
      return { ok: true, state: withWorkouts(workouts, { ...state, prefs: parsed.value }) };
    }
    case 'addCustomExercise': {
      if (!isObj(body.exercise)) return fail('invalid exercise');
      const parsed = parseCustomExercise(body.exercise, ctx.makeId ?? defaultId);
      if (!parsed.ok) return fail(parsed.error);
      const e = parsed.value;
      const custom = state.customExercises ?? [];
      if (custom.length >= LIMITS.customExercises) return fail('too many custom exercises');
      if (exerciseById(e.id) || custom.some((c) => c.id === e.id)) return fail('exercise already exists');
      const name = e.name.toLowerCase();
      if (custom.some((c) => c.name.toLowerCase() === name) || isLibraryName(name)) return fail('an exercise with that name already exists');
      return { ok: true, state: { ...state, customExercises: [...custom, e] } };
    }
    case 'setRulesNote': {
      // The note can only be put away here. Only the migration raises it.
      if (body.value !== false) return fail('invalid note flag');
      return { ok: true, state: { ...state, rulesV2Note: false } };
    }
    default:
      return fail('unknown action');
  }
}

const LIBRARY_NAMES = new Set(EXERCISES.map((e) => e.name.toLowerCase()));

function isLibraryName(lowerName: string): boolean {
  return LIBRARY_NAMES.has(lowerName);
}
