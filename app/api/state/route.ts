import { NextRequest, NextResponse } from 'next/server';
import { isAuthorized } from '@/lib/auth';
import { getState, saveState } from '@/lib/store';
import { plan } from '@/data/plan';
import { AppState, Goal } from '@/lib/progress';

function todayPlusOne(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

function isValidDate(date: unknown): date is string {
  return typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date);
}

function findWorkoutDay(date: string) {
  return plan.find((d) => d.date === date && d.dayType !== 'rest' && d.dayType !== 'pre-start');
}

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
    return NextResponse.json({ error: 'invalid body' }, { status: 400 });
  }

  const state: AppState = await getState();
  const maxDate = todayPlusOne();

  switch (body.action) {
    case 'complete': {
      const date = body.date;
      if (!isValidDate(date)) return NextResponse.json({ error: 'invalid date' }, { status: 400 });
      if (date > maxDate) return NextResponse.json({ error: 'date is in the future' }, { status: 400 });
      if (!findWorkoutDay(date)) return NextResponse.json({ error: 'not a workout day' }, { status: 400 });
      state.completions[date] = { at: new Date().toISOString() };
      break;
    }
    case 'uncomplete': {
      const date = body.date;
      if (!isValidDate(date)) return NextResponse.json({ error: 'invalid date' }, { status: 400 });
      delete state.completions[date];
      break;
    }
    case 'weight': {
      const date = body.date;
      const kg = body.kg;
      if (!isValidDate(date)) return NextResponse.json({ error: 'invalid date' }, { status: 400 });
      if (date > maxDate) return NextResponse.json({ error: 'date is in the future' }, { status: 400 });
      if (typeof kg !== 'number' || Number.isNaN(kg) || kg < 40 || kg > 250) {
        return NextResponse.json({ error: 'weight out of range' }, { status: 400 });
      }
      state.weights[date] = kg;
      break;
    }
    case 'addGoal': {
      const goal = body.goal as Goal | undefined;
      if (
        !goal ||
        typeof goal.target !== 'number' ||
        !isValidDate(goal.start) ||
        !isValidDate(goal.deadline) ||
        !['workouts', 'pushups', 'cardio-minutes', 'streak', 'weight'].includes(goal.type)
      ) {
        return NextResponse.json({ error: 'invalid goal' }, { status: 400 });
      }
      const daysOut = Math.round(
        (new Date(`${goal.deadline}T00:00:00Z`).getTime() - new Date(`${goal.start}T00:00:00Z`).getTime()) / 86400000
      );
      if (daysOut <= 0 || daysOut > 90) {
        return NextResponse.json({ error: 'deadline must be within 90 days of start' }, { status: 400 });
      }
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      state.goals.push({ ...goal, id });
      break;
    }
    case 'deleteGoal': {
      const id = body.id;
      if (typeof id !== 'string') return NextResponse.json({ error: 'invalid id' }, { status: 400 });
      state.goals = state.goals.filter((g) => g.id !== id);
      break;
    }
    default:
      return NextResponse.json({ error: 'unknown action' }, { status: 400 });
  }

  await saveState(state);
  return NextResponse.json(state);
}
