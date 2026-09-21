import { plan, WorkoutDay } from '@/data/plan';

export function todayStr(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function getTodayOrClosest(): { day: WorkoutDay; index: number } {
  const today = todayStr();
  let index = plan.findIndex((d) => d.date === today);

  if (index === -1) {
    index = today < plan[0].date ? 0 : plan.length - 1;
  }

  return { day: plan[index], index };
}

export function formatDateLong(date: string): string {
  const d = new Date(`${date}T00:00:00`);
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
}

export function formatDateShort(date: string): string {
  const d = new Date(`${date}T00:00:00`);
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}
