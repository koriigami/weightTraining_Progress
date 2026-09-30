import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getState, saveState } from '@/lib/store';
import {
  AppState,
  DayLog,
  Goal,
  GoalDirection,
  GoalType,
  allItemKeys,
  isValidItemKey,
  planDay,
} from '@/lib/progress';
import { goalStatus, stampAchievedGoals, streakDeadline } from '@/lib/goals';
import { daysBetween, todayStr } from '@/lib/date';
import { applyRoutineAction, isRoutineAction } from '@/lib/routineActions';

function todayPlusOne(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

function isValidDate(date: unknown): date is string {
  return typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date);
}

function findWorkoutDay(date: string) {
  const day = planDay(date);
  if (!day || day.dayType === 'rest' || day.dayType === 'pre-start') return undefined;
  return day;
}

function bad(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

function makeId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

const GOAL_TYPES: GoalType[] = ['streak', 'workouts', 'pushups', 'cardio-minutes', 'cardio-km', 'weight'];

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const state = await getState(session.user.id, session.user.email);
  return NextResponse.json(state);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const userId = session.user.id;

  let body: { action: string; [key: string]: unknown };
  try {
    body = await req.json();
  } catch {
    return bad('invalid body');
  }

  let state: AppState = await getState(userId, session.user.email);
  const maxDate = todayPlusOne();

  switch (body.action) {
    case 'tick': {
      const date = body.date;
      const key = body.key;
      if (!isValidDate(date) || typeof key !== 'string') return bad('invalid input');
      if (date > maxDate) return bad('date is in the future');
      const day = findWorkoutDay(date);
      if (!day) return bad('not a workout day');
      if (key === 'cardio' || !isValidItemKey(day, key)) return bad('invalid item key');
      const log: DayLog = state.days[date] ?? { items: {} };
      log.items[key] = { at: new Date().toISOString() };
      state.days[date] = log;
      break;
    }
    case 'untick': {
      const date = body.date;
      const key = body.key;
      if (!isValidDate(date) || typeof key !== 'string') return bad('invalid input');
      const day = findWorkoutDay(date);
      if (!day || !isValidItemKey(day, key)) return bad('invalid item key');
      const log = state.days[date];
      if (log) {
        if (key === 'cardio') delete log.cardio;
        else delete log.items[key];
      }
      break;
    }
    case 'logCardio': {
      const date = body.date;
      const minutes = body.minutes;
      const km = body.km;
      if (!isValidDate(date)) return bad('invalid date');
      if (date > maxDate) return bad('date is in the future');
      const day = findWorkoutDay(date);
      if (!day || !day.cardio) return bad('no cardio scheduled today');
      if (typeof minutes !== 'number' || Number.isNaN(minutes) || minutes < 1 || minutes > 180) {
        return bad('minutes out of range');
      }
      if (km !== undefined && (typeof km !== 'number' || Number.isNaN(km) || km < 0 || km > 100)) {
        return bad('km out of range');
      }
      const log: DayLog = state.days[date] ?? { items: {} };
      const at = new Date().toISOString();
      log.cardio = typeof km === 'number' ? { minutes, km, at } : { minutes, at };
      state.days[date] = log;
      break;
    }
    case 'completeAll': {
      const date = body.date;
      if (!isValidDate(date)) return bad('invalid date');
      if (date > maxDate) return bad('date is in the future');
      const day = findWorkoutDay(date);
      if (!day) return bad('not a workout day');
      const log: DayLog = state.days[date] ?? { items: {} };
      const now = new Date().toISOString();
      for (const key of allItemKeys(day)) {
        if (key === 'cardio') {
          if (!log.cardio && day.cardio) log.cardio = { minutes: day.cardio.minutes, at: now };
        } else if (!log.items[key]) {
          log.items[key] = { at: now };
        }
      }
      state.days[date] = log;
      break;
    }
    case 'setDayLog': {
      const date = body.date;
      const rawLog = body.log as Partial<DayLog> | undefined;
      if (!isValidDate(date)) return bad('invalid date');
      const day = findWorkoutDay(date);
      if (!day) return bad('not a workout day');
      if (!rawLog || typeof rawLog !== 'object' || typeof rawLog.items !== 'object' || rawLog.items === null) {
        return bad('invalid log');
      }
      const validKeys = new Set(allItemKeys(day).filter((k) => k !== 'cardio'));
      const items: Record<string, { at: string }> = {};
      for (const [key, entry] of Object.entries(rawLog.items)) {
        if (!validKeys.has(key) || !entry || typeof entry.at !== 'string') return bad('invalid log');
        items[key] = { at: entry.at };
      }
      let cardio: DayLog['cardio'];
      if (rawLog.cardio !== undefined) {
        if (!day.cardio) return bad('no cardio scheduled today');
        const { minutes, km, at } = rawLog.cardio;
        if (typeof minutes !== 'number' || Number.isNaN(minutes) || minutes < 1 || minutes > 180) {
          return bad('minutes out of range');
        }
        if (km !== undefined && (typeof km !== 'number' || Number.isNaN(km) || km < 0 || km > 100)) {
          return bad('km out of range');
        }
        cardio = { minutes, at: typeof at === 'string' ? at : new Date().toISOString(), ...(km !== undefined ? { km } : {}) };
      }
      if (Object.keys(items).length === 0 && !cardio) {
        delete state.days[date];
      } else {
        state.days[date] = { items, ...(cardio ? { cardio } : {}) };
      }
      break;
    }
    case 'weight': {
      const date = body.date;
      const kg = body.kg;
      if (!isValidDate(date)) return bad('invalid date');
      if (date > maxDate) return bad('date is in the future');
      if (typeof kg !== 'number' || Number.isNaN(kg) || kg < 40 || kg > 250) {
        return bad('weight out of range');
      }
      state.weights[date] = kg;
      break;
    }
    case 'addGoal': {
      const raw = body.goal as Partial<Goal> | undefined;
      if (
        !raw ||
        typeof raw.type !== 'string' ||
        !GOAL_TYPES.includes(raw.type as GoalType) ||
        typeof raw.target !== 'number' ||
        !Number.isFinite(raw.target) ||
        raw.target <= 0 ||
        !isValidDate(raw.start)
      ) {
        return bad('invalid goal');
      }

      const createdAt = new Date().toISOString();
      let goal: Goal;
      if (raw.type === 'streak') {
        if (!Number.isInteger(raw.target) || raw.target > 26) return bad('a streak is 1 to 26 weeks');
        const deadline = streakDeadline(raw.start, raw.target);
        goal = { id: makeId(), type: 'streak', target: raw.target, start: raw.start, deadline, createdAt };
      } else if (raw.type === 'weight') {
        if (raw.direction !== 'lose' && raw.direction !== 'gain') return bad('direction is required');
        if (!isValidDate(raw.deadline)) return bad('invalid deadline');
        const daysOut = daysBetween(raw.start, raw.deadline);
        if (daysOut <= 0 || daysOut > 180) return bad('deadline out of range');
        const weightDates = Object.keys(state.weights)
          .filter((d) => d <= raw.start!)
          .sort();
        const baseline = weightDates.length ? state.weights[weightDates[weightDates.length - 1]] : null;
        if (baseline === null) return bad('log a weight before setting a weight goal');
        goal = {
          id: makeId(),
          type: 'weight',
          target: raw.target,
          start: raw.start,
          deadline: raw.deadline,
          createdAt,
          direction: raw.direction,
          baseline,
        };
      } else {
        if (!isValidDate(raw.deadline)) return bad('invalid deadline');
        const daysOut = daysBetween(raw.start, raw.deadline);
        if (daysOut <= 0 || daysOut > 180) return bad('deadline out of range');
        goal = { id: makeId(), type: raw.type as GoalType, target: raw.target, start: raw.start, deadline: raw.deadline, createdAt };
      }
      if (goalStatus(goal, state, todayStr()) === 'achieved') {
        return bad("You've already reached that. Pick a bigger target.");
      }
      state.goals.push(goal);
      break;
    }
    case 'updateGoal': {
      const id = body.id;
      const target = body.target;
      const deadline = body.deadline;
      const direction = body.direction as GoalDirection | undefined;
      if (typeof id !== 'string') return bad('invalid id');
      const existing = state.goals.find((g) => g.id === id);
      if (!existing) return bad('goal not found');
      if (goalStatus(existing, state, todayStr()) !== 'active') return bad('only active goals can be edited');
      if (typeof target !== 'number' || !Number.isFinite(target) || target <= 0) return bad('invalid goal');

      let updated: Goal;
      if (existing.type === 'streak') {
        if (!Number.isInteger(target) || target > 26) return bad('a streak is 1 to 26 weeks');
        const newDeadline = streakDeadline(existing.start, target);
        updated = { ...existing, target, deadline: newDeadline };
      } else if (existing.type === 'weight') {
        const dir = direction ?? existing.direction;
        if (dir !== 'lose' && dir !== 'gain') return bad('direction is required');
        if (!isValidDate(deadline)) return bad('invalid deadline');
        const daysOut = daysBetween(existing.start, deadline);
        if (daysOut <= 0 || daysOut > 180) return bad('deadline out of range');
        updated = { ...existing, target, deadline, direction: dir };
      } else {
        if (!isValidDate(deadline)) return bad('invalid deadline');
        const daysOut = daysBetween(existing.start, deadline);
        if (daysOut <= 0 || daysOut > 180) return bad('deadline out of range');
        updated = { ...existing, target, deadline };
      }

      if (goalStatus(updated, state, todayStr()) === 'achieved') {
        return bad("You've already reached that. Pick a bigger target.");
      }
      state.goals = state.goals.map((g) => (g.id === id ? updated : g));
      break;
    }
    case 'deleteGoal': {
      const id = body.id;
      if (typeof id !== 'string') return bad('invalid id');
      state.goals = state.goals.filter((g) => g.id !== id);
      break;
    }
    case 'restoreGoal': {
      const goal = body.goal as Goal | undefined;
      if (!goal || typeof goal.id !== 'string' || !GOAL_TYPES.includes(goal.type)) return bad('invalid goal');
      if (!state.goals.find((g) => g.id === goal.id)) {
        state.goals.push(typeof goal.createdAt === 'string' ? goal : { ...goal, createdAt: `${goal.start}T00:00:00Z` });
      }
      break;
    }
    default: {
      // Routines, workouts, prefs and custom exercises: validated and applied by lib/routineActions.
      if (!isRoutineAction(body.action)) return bad('unknown action');
      const result = applyRoutineAction(state, body, { today: todayStr() });
      if (!result.ok) return bad(result.error);
      state = result.state;
    }
  }

  // A goal that is achieved now stays achieved, even if the workouts behind it change later.
  state = { ...state, goals: stampAchievedGoals(state, new Date().toISOString(), todayStr()) };
  await saveState(userId, state);
  return NextResponse.json(state);
}
