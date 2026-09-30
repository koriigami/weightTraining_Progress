'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent, ReactNode } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { addDaysStr, formatDayLong, formatWhen, joinWhen, splitWhen, todayStr } from '@/lib/date';
import { cn } from './cn';
import { GameModal } from './GameModal';
import { Segmented } from './Segmented';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DOW = ['M', 'T', 'W', 'T', 'F', 'S', 'S']; // Monday first

const pad = (n: number) => String(n).padStart(2, '0');
const iso = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`;

// The month a date sits in, as { y, m } (m is 0 to 11).
function monthOf(date: string): { y: number; m: number } {
  const [y, m] = date.split('-').map(Number);
  return { y, m: m - 1 };
}

// Blank cells before the 1st (Monday first) and the number of days.
function gridOf(y: number, m: number): { lead: number; days: number } {
  const first = new Date(Date.UTC(y, m, 1)).getUTCDay();
  return { lead: (first + 6) % 7, days: new Date(Date.UTC(y, m + 1, 0)).getUTCDate() };
}

export type PickerTime = { hour: number; minute: number }; // 24 hour clock

export type DatePickerProps = {
  /** The chosen day, YYYY-MM-DD. */
  value: string | null;
  onChange: (date: string) => void;
  /** Days outside min and max (inclusive) cannot be picked. */
  min?: string;
  max?: string;
  /** The day that gets the green ring. Defaults to the device's today. */
  today?: string;
  /** Shows the time row (hour, minute, am/pm). */
  time?: PickerTime;
  onTimeChange?: (time: PickerTime) => void;
  /** Text under the grid when there is no time row, such as "Ends Fri 2 Oct". */
  footer?: ReactNode;
  /** No frame of its own: for use inside a modal. */
  flat?: boolean;
  className?: string;
  /** Names the calendar for screen readers. */
  label?: string;
};

// A time box that keeps what is typed and only commits a number in range.
function TimeBox({ label, value, min, max, onCommit }: { label: string; value: number; min: number; max: number; onCommit: (n: number) => void }) {
  const [text, setText] = useState(String(value));
  useEffect(() => setText(String(value)), [value]);
  return (
    <input
      className="wt-dp-time"
      inputMode="numeric"
      autoComplete="off"
      maxLength={2}
      aria-label={label}
      value={text}
      onFocus={(e) => e.target.select()}
      onChange={(e) => {
        const t = e.target.value.replace(/\D/g, '').slice(0, 2);
        setText(t);
        const n = Number(t);
        if (t !== '' && n >= min && n <= max) onCommit(n);
      }}
      onBlur={() => setText(String(value))}
    />
  );
}

/**
 * A month calendar in the game style: a cream panel with a gold border, round
 * gold prev and next buttons, Monday first, today ringed green, the chosen day a
 * gold 3D tile. Every class starts with wt-dp so its today and selected states
 * cannot meet another component's. Arrow keys move between days, Enter picks one.
 */
export function DatePicker({ value, onChange, min, max, today: todayProp, time, onTimeChange, footer, flat, className, label = 'Calendar' }: DatePickerProps) {
  const uid = useId();
  const today = todayProp ?? todayStr();
  const [view, setView] = useState(() => monthOf(value ?? today));
  const [focusDate, setFocusDate] = useState<string | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  // A new value from outside brings its month into view.
  useEffect(() => {
    if (value) setView((v) => (monthOf(value).y === v.y && monthOf(value).m === v.m ? v : monthOf(value)));
  }, [value]);

  // Focus follows a keyboard move once its month is on screen.
  useEffect(() => {
    if (!focusDate) return;
    gridRef.current?.querySelector<HTMLButtonElement>(`[data-date="${focusDate}"]`)?.focus();
    setFocusDate(null);
  }, [focusDate, view]);

  const { lead, days } = useMemo(() => gridOf(view.y, view.m), [view]);
  const off = (d: string) => Boolean((min && d < min) || (max && d > max));
  const firstOfMonth = iso(view.y, view.m, 1);
  const lastOfMonth = iso(view.y, view.m, days);
  const canPrev = !min || addDaysStr(firstOfMonth, -1) >= min;
  const canNext = !max || addDaysStr(lastOfMonth, 1) <= max;
  // One stop in the tab order: the chosen day, else today, else the first day that can be picked.
  const stop = useMemo(() => {
    const inView = (d: string | null) => (d && d.slice(0, 7) === firstOfMonth.slice(0, 7) && !off(d) ? d : null);
    if (inView(value)) return value;
    if (inView(today)) return today;
    for (let d = 1; d <= days; d++) if (!off(iso(view.y, view.m, d))) return iso(view.y, view.m, d);
    return null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, today, view, min, max]);

  function shift(delta: number) {
    setView((v) => {
      const m = v.m + delta;
      return { y: v.y + Math.floor(m / 12), m: ((m % 12) + 12) % 12 };
    });
  }

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    const cur = (e.target as HTMLElement).closest<HTMLElement>('[data-date]')?.dataset.date;
    if (!cur) return;
    const step = e.key === 'ArrowLeft' ? -1 : e.key === 'ArrowRight' ? 1 : e.key === 'ArrowUp' ? -7 : e.key === 'ArrowDown' ? 7 : 0;
    if (!step) return;
    e.preventDefault();
    const next = addDaysStr(cur, step);
    if (off(next)) return;
    setView(monthOf(next));
    setFocusDate(next);
  }

  const hour12 = time ? (time.hour % 12 === 0 ? 12 : time.hour % 12) : 12;
  const pm = time ? time.hour >= 12 : false;
  function setTime(next: Partial<PickerTime> & { pm?: boolean }) {
    if (!time || !onTimeChange) return;
    const isPm = next.pm ?? pm;
    const h12 = next.hour !== undefined ? next.hour : hour12;
    onTimeChange({ hour: (h12 % 12) + (isPm ? 12 : 0), minute: next.minute ?? time.minute });
  }

  return (
    <div className={cn('wt-dp', flat && 'wt-dp-flat', className)}>
      <div className="wt-dp-head">
        <button type="button" className="wt-backbtn wt-dp-nav" aria-label="Previous month" disabled={!canPrev} onClick={() => shift(-1)}>
          <ChevronLeft size={18} strokeWidth={2.4} aria-hidden="true" />
        </button>
        <b id={`${uid}-h`} className="wt-dp-title" aria-live="polite">
          {MONTHS[view.m]} {view.y}
        </b>
        <button type="button" className="wt-backbtn wt-dp-nav" aria-label="Next month" disabled={!canNext} onClick={() => shift(1)}>
          <ChevronRight size={18} strokeWidth={2.4} aria-hidden="true" />
        </button>
      </div>
      <div className="wt-dp-grid" role="group" aria-label={label} aria-labelledby={`${uid}-h`} ref={gridRef} onKeyDown={onKeyDown}>
        {DOW.map((d, i) => (
          <span key={i} className="wt-dp-dow" aria-hidden="true">
            {d}
          </span>
        ))}
        {Array.from({ length: lead }, (_, i) => (
          <span key={`b${i}`} className="wt-dp-cell wt-dp-blank" aria-hidden="true" />
        ))}
        {Array.from({ length: days }, (_, i) => {
          const date = iso(view.y, view.m, i + 1);
          const selected = date === value;
          return (
            <button
              key={date}
              type="button"
              data-date={date}
              className={cn('wt-dp-cell', 'wt-dp-day', date === today && 'wt-dp-today', selected && 'wt-dp-sel')}
              disabled={off(date)}
              tabIndex={date === stop ? 0 : -1}
              aria-pressed={selected}
              aria-current={date === today ? 'date' : undefined}
              aria-label={`${formatDayLong(date)}${date === today ? ', today' : ''}`}
              onClick={() => onChange(date)}
            >
              {i + 1}
            </button>
          );
        })}
      </div>
      {time ? (
        <div className="wt-dp-foot">
          <span>Time</span>
          <span className="wt-dp-tp">
            <TimeBox label="Hour" value={hour12} min={1} max={12} onCommit={(n) => setTime({ hour: n })} />
            <b aria-hidden="true">:</b>
            <TimeBox label="Minutes" value={time.minute} min={0} max={59} onCommit={(n) => setTime({ minute: n })} />
            <Segmented
              ariaLabel="am or pm"
              size="sm"
              value={pm ? 'pm' : 'am'}
              options={[
                { value: 'am', label: 'am' },
                { value: 'pm', label: 'pm' },
              ]}
              onChange={(v) => setTime({ pm: v === 'pm' })}
            />
          </span>
        </div>
      ) : footer ? (
        <div className="wt-dp-foot">{footer}</div>
      ) : null}
    </div>
  );
}

/**
 * "Date and time" in a game modal: the calendar with the time row, a live line
 * saying what is picked, and Cancel and Done. Nothing changes until Done.
 * `value` is YYYY-MM-DDTHH:mm.
 */
export function DateTimeModal({ open, value, min, max, title = 'Date and time', onCancel, onDone }: { open: boolean; value: string; min?: string; max?: string; title?: string; onCancel: () => void; onDone: (when: string) => void }) {
  const [draft, setDraft] = useState(value);
  // Each time it opens it starts from the current value.
  useEffect(() => {
    if (open) setDraft(value);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);
  const { date, hour, minute } = splitWhen(draft);
  return (
    <GameModal open={open} title={title} className="wt-dpm" cancelLabel="Cancel" confirmLabel="Done" onCancel={onCancel} onConfirm={() => onDone(draft)} extra={
      <DatePicker
        flat
        value={date}
        min={min}
        max={max}
        time={{ hour, minute }}
        onChange={(d) => setDraft(joinWhen(d, hour, minute))}
        onTimeChange={(t) => setDraft(joinWhen(date, t.hour, t.minute))}
      />
    }>
      {formatWhen(draft)}
    </GameModal>
  );
}
