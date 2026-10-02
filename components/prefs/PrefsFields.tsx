'use client';

import type { ReactNode } from 'react';
import { Dumbbell, Footprints, House } from 'lucide-react';
import { AVOID_TAGS, JOINTS } from '@/data/exercises';
import type { AvoidTag, Joint } from '@/data/exercises';
import { Segmented } from '@/components/ui/Segmented';
import { Stepper } from '@/components/ui/Stepper';
import { cn } from '@/components/ui/cn';
import { AVOID_CHIPS, HOME_EQUIPMENT, LIMIT_CHIPS, dumbbellChoices, isDumbbellOn, toggleDumbbell, toggleIn } from '@/lib/prefsSummary';
import { fmtNumber } from '@/lib/units';
import type { Prefs } from '@/lib/routines';

// The editors that onboarding and Settings share. Each one edits a piece of Prefs
// and reports the new piece through onChange, so the caller decides when to save.

/** A small pill toggle, green when on. */
export function Pick({ on, onClick, children }: { on: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" className="wt-pick" aria-pressed={on} onClick={onClick}>
      {children}
    </button>
  );
}

export function FieldLabel({ children }: { children: ReactNode }) {
  return <div className="wt-ob-lab">{children}</div>;
}

export function UnitsFields({ units, onChange }: { units: Prefs['units']; onChange: (units: Prefs['units']) => void }) {
  return (
    <>
      <FieldLabel>Weight</FieldLabel>
      <Segmented
        size="lg"
        ariaLabel="Weight unit"
        value={units.weight}
        onChange={(weight) => onChange({ ...units, weight })}
        options={[
          { value: 'kg', label: 'Kg' },
          { value: 'lb', label: 'Lbs' },
        ]}
      />
      <FieldLabel>Distance</FieldLabel>
      <Segmented
        size="lg"
        ariaLabel="Distance unit"
        value={units.distance}
        onChange={(distance) => onChange({ ...units, distance })}
        options={[
          { value: 'km', label: 'Kilometers' },
          { value: 'mi', label: 'Miles' },
        ]}
      />
    </>
  );
}

const KINDS: { kind: Prefs['equipment']['kind']; icon: ReactNode; title: string; sub: string }[] = [
  { kind: 'gym', icon: <Dumbbell size={22} aria-hidden="true" />, title: 'Full gym', sub: 'Barbells, machines, cables, everything.' },
  { kind: 'home', icon: <House size={22} aria-hidden="true" />, title: 'Home setup', sub: 'Pick what you have.' },
  { kind: 'none', icon: <Footprints size={22} aria-hidden="true" />, title: 'No equipment', sub: 'Bodyweight, walking and running.' },
];

export function EquipmentFields({ equipment, unit, onChange }: { equipment: Prefs['equipment']; unit: Prefs['units']['weight']; onChange: (equipment: Prefs['equipment']) => void }) {
  const hasDumbbells = equipment.has.includes('dumbbell');
  return (
    <>
      <div className="wt-opts" role="group" aria-label="What you train with">
        {KINDS.map((k) => (
          <button key={k.kind} type="button" className="wt-opt" aria-pressed={equipment.kind === k.kind} onClick={() => onChange({ ...equipment, kind: k.kind })}>
            <span className="ibox">{k.icon}</span>
            <span>
              <b>{k.title}</b>
              <small>{k.sub}</small>
            </span>
          </button>
        ))}
      </div>
      {equipment.kind === 'home' && (
        <>
          <FieldLabel>Your equipment</FieldLabel>
          <div className="wt-chips" role="group" aria-label="Your equipment">
            {HOME_EQUIPMENT.map((e) => (
              <Pick key={e.id} on={equipment.has.includes(e.id)} onClick={() => onChange({ ...equipment, has: toggleIn(equipment.has, e.id) })}>
                {e.label}
              </Pick>
            ))}
          </div>
          {hasDumbbells && (
            <>
              <FieldLabel>Dumbbell weights ({unit})</FieldLabel>
              <div className="wt-chips" role="group" aria-label={`Dumbbell weights in ${unit}`}>
                {dumbbellChoices(unit, equipment.dumbbellKg).map((n) => (
                  <Pick key={n} on={isDumbbellOn(equipment.dumbbellKg, n, unit)} onClick={() => onChange({ ...equipment, dumbbellKg: toggleDumbbell(equipment.dumbbellKg, n, unit) })}>
                    {fmtNumber(n)}
                  </Pick>
                ))}
              </div>
            </>
          )}
        </>
      )}
    </>
  );
}

export function AvoidFields({ avoid, limits, onChange }: { avoid: string[]; limits: string[]; onChange: (next: { avoid: string[]; limits: string[] }) => void }) {
  return (
    <>
      <FieldLabel>Exercises</FieldLabel>
      <div className="wt-chips" role="group" aria-label="Exercises to avoid">
        {AVOID_CHIPS.map((a: AvoidTag) => (
          <Pick key={a} on={avoid.includes(a)} onClick={() => onChange({ avoid: toggleIn(avoid, a), limits })}>
            {AVOID_TAGS[a]}
          </Pick>
        ))}
      </div>
      <FieldLabel>Go easy on</FieldLabel>
      <div className="wt-chips" role="group" aria-label="Joints to go easy on">
        {LIMIT_CHIPS.map((j: Joint) => (
          <Pick key={j} on={limits.includes(j)} onClick={() => onChange({ avoid, limits: toggleIn(limits, j) })}>
            {JOINTS[j]}
          </Pick>
        ))}
      </div>
    </>
  );
}

export function WeeklyGoalFields({ value, onChange }: { value: number; onChange: (value: number) => void }) {
  return (
    <div className={cn('wt-wgoal')}>
      <Stepper label="Weekly goal" value={value} min={1} max={7} onChange={onChange} format={(v) => `${v} training ${v === 1 ? 'day' : 'days'}`} />
      <p>A week runs Monday to Sunday. A day counts once you have trained for 20 minutes. Reach your goal for +50 XP, and +10 more for each week in a row you reach it, up to +100. Nothing forces a schedule.</p>
    </div>
  );
}
