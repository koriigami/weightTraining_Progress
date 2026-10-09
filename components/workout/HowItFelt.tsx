'use client';

import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { Plus } from 'lucide-react';
import { anim } from '@/lib/anim';
import { EFFORT_MAX, EFFORT_MIN, EFFORT_START, FEELS, effortReadout } from '@/lib/feel';
import type { Feel } from '@/lib/feel';
import { SYN, buzz } from '@/lib/sound';
import { Button } from '@/components/ui/Button';
import { Card, CardHead } from '@/components/ui/Card';
import { FeelFace } from '@/components/ui/FeelFace';

type Props = {
  feel: Feel | undefined;
  effort: number | undefined;
  /** The face tapped, or null when the picked one was tapped again. */
  onFeel: (next: Feel | null) => void;
  /** An effort from 1 to 10, or null when Remove was tapped. */
  onEffort: (next: number | null) => void;
  /** What the server said when it refused the last change. */
  error?: string;
};

/**
 * How did it feel? Five faces in a row, one tap each (tap the picked one again to
 * clear it), and an optional effort from 1 to 10 under "Add effort". Everything is
 * optional and nothing earns XP. The parent keeps the values and saves each change
 * on its own: Victory and the workout page use this same control.
 */
export function HowItFelt({ feel, effort, onFeel, onEffort, error }: Props) {
  const hasEffort = effort !== undefined;
  // The slider moves one step at a time while a finger drags it. The value shown follows the
  // drag, and the change is saved once, when the drag ends.
  const [draft, setDraft] = useState<number | null>(null);
  const shown = draft ?? effort ?? EFFORT_START;
  const slider = useRef<HTMLInputElement>(null);
  const addButton = useRef<HTMLButtonElement>(null);
  const focusNext = useRef<'slider' | 'add' | null>(null);
  const save = useRef(onEffort);
  save.current = onEffort;

  // The native change event comes when a value is committed: a lifted finger, a key, or
  // a screen reader's adjust. React's onChange fires on every step, so it only sets the draft.
  useEffect(() => {
    const el = slider.current;
    if (!el) return;
    const done = () => {
      setDraft(null);
      save.current(Number(el.value));
    };
    el.addEventListener('change', done);
    return () => el.removeEventListener('change', done);
  }, [hasEffort]);

  // Swapping the Add button for the slider (and back) would drop focus, so it moves with the swap.
  useEffect(() => {
    if (focusNext.current === 'slider') slider.current?.focus();
    if (focusNext.current === 'add') addButton.current?.focus();
    focusNext.current = null;
  }, [hasEffort]);

  return (
    <Card>
      <CardHead title="How did it feel?" />
      <div className="wt-faces" role="group" aria-label="How did it feel?">
        {FEELS.map((f, i) => (
          <button
            key={f.key}
            type="button"
            className="wt-facebtn"
            aria-pressed={feel === f.key}
            onClick={(e) => {
              if (feel !== f.key) {
                // The face squashes to 85% and bounces to 115%, with a note: low for Rough, high for Great.
                void anim(e.currentTarget.querySelector('svg'), [{ transform: 'scale(1)' }, { transform: 'scale(.85)', offset: 0.25 }, { transform: 'scale(1.15)', offset: 0.6 }, { transform: 'scale(1)' }], { duration: 360, easing: 'ease-out' });
                SYN.face(i);
                buzz('light');
              }
              onFeel(feel === f.key ? null : f.key);
            }}
          >
            <FeelFace feel={f.key} />
            {f.label}
          </button>
        ))}
      </div>
      {hasEffort ? (
        <div className="wt-effort">
          <div className="wt-effort-head">
            <b aria-live="polite">{effortReadout(shown)}</b>
            <button
              type="button"
              className="wt-textbtn sm"
              aria-label="Remove effort"
              onClick={() => {
                focusNext.current = 'add';
                setDraft(null);
                onEffort(null);
              }}
            >
              Remove
            </button>
          </div>
          <input
            ref={slider}
            type="range"
            min={EFFORT_MIN}
            max={EFFORT_MAX}
            step={1}
            value={shown}
            aria-label="Effort from 1 to 10"
            aria-valuetext={effortReadout(shown)}
            style={{ '--fill': `${((shown - EFFORT_MIN) / (EFFORT_MAX - EFFORT_MIN)) * 100}%` } as CSSProperties}
            onChange={(e) => setDraft(Number(e.target.value))}
          />
        </div>
      ) : (
        <div className="wt-effort-add">
          <Button
            ref={addButton}
            size="sm"
            variant="tertiary"
            block
            icon={<Plus size={16} aria-hidden="true" />}
            onClick={() => {
              focusNext.current = 'slider';
              onEffort(EFFORT_START);
            }}
          >
            Add effort (1 to 10)
          </Button>
        </div>
      )}
      {error && (
        <span className="wt-field-error wt-feel-err" role="alert">
          {error}
        </span>
      )}
    </Card>
  );
}
