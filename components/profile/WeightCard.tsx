'use client';

import { useEffect, useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import { useProgress } from '@/components/ProgressProvider';
import { Button } from '@/components/ui/Button';
import { Card, SectionLabel } from '@/components/ui/Card';
import { Field, Input } from '@/components/ui/Field';
import { Sheet, useSheet } from '@/components/ui/Sheet';
import { formatMonthDay as shortDate } from '@/lib/date';
import { weightSummary } from '@/lib/profileStats';
import { fmtNumber, kgToUnit, unitToKg } from '@/lib/units';
import type { WeightUnit } from '@/lib/units';
import { useToday } from '@/lib/useToday';

// The server takes a weight from 40 to 250 kg.
const MIN_KG = 40;
const MAX_KG = 250;


function Sparkline({ points, target, unit }: { points: { date: string; kg: number }[]; target: number | null; unit: WeightUnit }) {
  const vals = points.map((p) => p.kg);
  const all = target !== null ? [...vals, target] : vals;
  const lo = Math.min(...all) - 0.4;
  const hi = Math.max(...all) + 0.4;
  const X = (i: number) => (points.length === 1 ? 100 : 12 + (i * 176) / (points.length - 1));
  const Y = (v: number) => 8 + ((hi - v) / (hi - lo)) * 46;
  const line = points.map((p, i) => `${i ? 'L' : 'M'}${X(i).toFixed(1)} ${Y(p.kg).toFixed(1)}`).join(' ');
  const summary = `Weight, last ${points.length} weigh-ins: ${points.map((p) => fmtNumber(kgToUnit(p.kg, unit))).join(', ')} ${unit}${target !== null ? `. Target ${fmtNumber(kgToUnit(target, unit))} ${unit}` : ''}`;
  return (
    <svg viewBox="0 0 200 64" width="100%" className="wt-spark" role="img" aria-label={summary}>
      {target !== null && (
        <>
          <line x1="0" x2="200" y1={Y(target)} y2={Y(target)} stroke="#2BA438" strokeWidth="1.5" strokeDasharray="4 4" />
          <text x="198" y={Y(target) - 4} textAnchor="end" style={{ fontSize: 9, fill: '#1E7A28', fontWeight: 800 }}>
            Target {fmtNumber(kgToUnit(target, unit))} {unit}
          </text>
        </>
      )}
      {points.length > 1 && <path d={line} fill="none" stroke="#C7870A" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />}
      {points.map((p, i) => (
        <circle key={p.date} cx={X(i)} cy={Y(p.kg)} r="3.2" fill="#FFC21A" stroke="#3A230C" strokeWidth="1.2" />
      ))}
    </svg>
  );
}

function SaveWeight({ disabled }: { disabled: boolean }) {
  return (
    <Button type="submit" form="log-weight-form" block disabled={disabled}>
      Save weight
    </Button>
  );
}

function LogWeightSheet({ open, onClose, unit, initialKg }: { open: boolean; onClose: () => void; unit: WeightUnit; initialKg: number | null }) {
  const { logWeight, showToast } = useProgress();
  const today = useToday();
  const [text, setText] = useState('');
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (open) {
      setText(initialKg !== null ? String(kgToUnit(initialKg, unit)) : '');
      setTouched(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const value = Number(text.replace(',', '.'));
  const kg = text.trim() === '' || !Number.isFinite(value) ? null : unitToKg(value, unit);
  const valid = kg !== null && kg >= MIN_KG && kg <= MAX_KG;
  const lo = fmtNumber(kgToUnit(MIN_KG, unit));
  const hi = fmtNumber(kgToUnit(MAX_KG, unit));

  return (
    <Sheet open={open} onClose={onClose} title="Log weight" footer={<SaveWeight disabled={touched && !valid} />}>
      <SheetForm
        onSubmit={(close) => {
          setTouched(true);
          if (!valid || kg === null) return;
          logWeight(today, kg);
          showToast(`Weight logged: ${fmtNumber(kgToUnit(kg, unit))} ${unit}`);
          close();
        }}
      >
        <Field label={`Weight today (${unit})`} error={touched && !valid ? `Enter a weight between ${lo} and ${hi} ${unit}.` : undefined} hint="Logging again today replaces today's weight.">
          <Input type="number" inputMode="decimal" step="0.1" name="weight" value={text} onChange={(e) => setText(e.target.value)} placeholder={unit === 'kg' ? '75.0' : '165.0'} data-autofocus />
        </Field>
      </SheetForm>
    </Sheet>
  );
}

// A form that can close its Sheet once it is submitted.
function SheetForm({ onSubmit, children }: { onSubmit: (close: () => void) => void; children: React.ReactNode }) {
  const { close } = useSheet();
  return (
    <form
      id="log-weight-form"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(close);
      }}
    >
      {children}
    </form>
  );
}

/** Weight: the current weight, the change, a sparkline toward the target, and Log weight. */
export function WeightCard() {
  const { state, prefs } = useProgress();
  const today = useToday();
  const [open, setOpen] = useState(false);
  const unit = prefs.units.weight;
  const w = useMemo(() => weightSummary(state, today), [state, today]);
  const todayKg = state.weights[today] ?? w.current;

  let sub: string;
  if (w.current === null) sub = 'No weight logged yet.';
  else if (w.changeKg === null) sub = `First weigh-in, ${shortDate(w.currentDate!)}`;
  else if (w.changeKg === 0) sub = `No change since ${shortDate(w.since!)}`;
  else sub = `${w.changeKg < 0 ? 'Down' : 'Up'} ${fmtNumber(Math.abs(kgToUnit(w.changeKg, unit)))} ${unit} since ${shortDate(w.since!)}`;

  return (
    <section aria-label="Weight" className="wt-stack">
      <div className="wt-sechead">
        <SectionLabel>Weight</SectionLabel>
      </div>
      <Card>
        <div className="wt-goal-top">
          <div style={{ minWidth: 0 }}>
            {w.current !== null ? (
              <div className="wt-big">
                {fmtNumber(kgToUnit(w.current, unit))} <span style={{ fontSize: 16 }}>{unit}</span>
              </div>
            ) : (
              <div className="wt-big">-- <span style={{ fontSize: 16 }}>{unit}</span></div>
            )}
            <small style={{ color: 'var(--muted)' }}>{sub}</small>
          </div>
          <Button variant="secondary" size="sm" icon={<Plus size={16} aria-hidden="true" />} onClick={() => setOpen(true)}>
            Log weight
          </Button>
        </div>
        {w.points.length > 0 && <Sparkline points={w.points} target={w.target} unit={unit} />}
        {w.current !== null && w.target === null && <small className="wt-chart-note">Set a weight goal to see your target here.</small>}
      </Card>
      <LogWeightSheet open={open} onClose={() => setOpen(false)} unit={unit} initialKg={todayKg} />
    </section>
  );
}
