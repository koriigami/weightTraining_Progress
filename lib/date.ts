import { plan } from '../data/plan';
import type { WorkoutDay } from '../data/plan';

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

// "Mon, Oct 12" - used for computed streak-goal end dates and sheet copy.
export function formatDateMed(date: string): string {
  const d = new Date(`${date}T00:00:00`);
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

export function addDaysStr(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function daysBetween(start: string, end: string): number {
  const a = new Date(`${start}T00:00:00Z`).getTime();
  const b = new Date(`${end}T00:00:00Z`).getTime();
  return Math.round((b - a) / 86400000);
}

// ISO weekday: Mon=0 ... Sun=6.
function isoDow(date: string): number {
  const d = new Date(`${date}T00:00:00Z`);
  return (d.getUTCDay() + 6) % 7;
}

export function mondayOf(date: string): string {
  return addDaysStr(date, -isoDow(date));
}

export function monthKey(date: string): string {
  return date.slice(0, 7);
}

export function lastDayOfMonth(date: string): string {
  const d = new Date(`${date}T00:00:00Z`);
  const last = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0));
  return last.toISOString().slice(0, 10);
}

export function monthLabel(monthKeyStr: string): string {
  const d = new Date(`${monthKeyStr}-01T00:00:00Z`);
  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });
}

// "OCT 26" style ribbon text for monthly medals.
export function monthRibbon(monthKeyStr: string): string {
  const d = new Date(`${monthKeyStr}-01T00:00:00Z`);
  const mon = d.toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' }).toUpperCase();
  const yr = String(d.getUTCFullYear()).slice(2);
  return `${mon} ${yr}`;
}
