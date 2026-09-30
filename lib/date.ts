export function todayStr(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
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

// "Oct 5" - a date without the weekday, for tight spots.
export function formatMonthDay(date: string): string {
  const d = new Date(`${date}T00:00:00`);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
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

// ---------------- The one date format ----------------
// "Tue 29 Sep · 6:40 pm" everywhere a workout's date is shown. The year is added
// only when it is not the current year. Written by hand so every device reads the same.

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// "6:40 pm" from 24 hour numbers.
export function fmtClock(hour: number, minute: number): string {
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${h12}:${String(minute).padStart(2, '0')} ${hour < 12 ? 'am' : 'pm'}`;
}

// "Tue 29 Sep", plus the year when it is not this year.
export function formatDay(date: string, now: Date = new Date()): string {
  const [y, m, d] = date.slice(0, 10).split('-').map(Number);
  if (!y || !m || !d) return date;
  const wd = WEEKDAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
  return `${wd} ${d} ${MONTHS_SHORT[m - 1]}${y !== now.getFullYear() ? ` ${y}` : ''}`;
}

// "Tue 29 Sep · 6:40 pm" from YYYY-MM-DDTHH:mm. A bare date has no time part.
export function formatWhen(when: string, now: Date = new Date()): string {
  const m = /^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})/.exec(when);
  if (!m) return formatDay(when, now);
  return `${formatDay(m[1], now)} · ${fmtClock(Number(m[2]), Number(m[3]))}`;
}

// YYYY-MM-DDTHH:mm apart and back together.
export function splitWhen(when: string): { date: string; hour: number; minute: number } {
  const m = /^(\d{4}-\d{2}-\d{2})(?:T(\d{2}):(\d{2}))?/.exec(when);
  return { date: m?.[1] ?? todayStr(), hour: Number(m?.[2] ?? 0), minute: Number(m?.[3] ?? 0) };
}

export function joinWhen(date: string, hour: number, minute: number): string {
  return `${date}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

// "Tuesday 29 September 2026", for screen readers.
export function formatDayLong(date: string): string {
  const [y, m, d] = date.slice(0, 10).split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return `${dt.toLocaleDateString('en-GB', { weekday: 'long', timeZone: 'UTC' })} ${d} ${dt.toLocaleDateString('en-GB', { month: 'long', timeZone: 'UTC' })} ${y}`;
}
