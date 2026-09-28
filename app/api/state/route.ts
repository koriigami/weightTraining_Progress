import { NextRequest, NextResponse } from 'next/server';
import { isAuthorized } from '@/lib/auth';
import { getState, saveState } from '@/lib/store';
import {
  AppState,
  DayLog,
  Goal,
  GoalType,
  allItemKeys,
  isValidItemKey,
  planDay,
} from '@/lib/progress';
import { streakDeadline } from '@/lib/goals';
import { daysBetween } from '@/lib/date';

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

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const state = await getState();
  return NextResponse.json(state);
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  let body: { action: string; [key: string]: unknown };
  try {
    body = await req.json();
  } catch {
    return bad('invalid body');
  }

  const state: AppState = await getState();
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
      log.cardio = typeof km === 'number' ? { minutes, km } : { minutes };
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
          if (!log.cardio && day.cardio) log.cardio = { minutes: day.cardio.minutes };
        } else if (!log.items[key]) {
          log.items[key] = { at: now };
        }
      }
      state.days[date] = log;
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

      let goal: Goal;
      if (raw.type === 'streak') {
        const deadline = streakDeadline(raw.start, raw.target);
        if (!deadline) return bad('not enough workout days left in the plan for that streak length');
        goal = { id: makeId(), type: 'streak', target: raw.target, start: raw.start, deadline };
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
          direction: raw.direction,
          baseline,
        };
      } else {
        if (!isValidDate(raw.deadline)) return bad('invalid deadline');
        const daysOut = daysBetween(raw.start, raw.deadline);
        if (daysOut <= 0 || daysOut > 180) return bad('deadline out of range');
        goal = { id: makeId(), type: raw.type as GoalType, target: raw.target, start: raw.start, deadline: raw.deadline };
      }
      state.goals.push(goal);
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
      if (!state.goals.find((g) => g.id === goal.id)) state.goals.push(goal);
      break;
    }
    default:
      return bad('unknown action');
  }

  await saveState(state);
  return NextResponse.json(state);
}
