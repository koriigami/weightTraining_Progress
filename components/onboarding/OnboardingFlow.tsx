'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { ChevronLeft, ClipboardList, Compass, Zap } from 'lucide-react';
import { AvoidFields, EquipmentFields, UnitsFields } from '@/components/prefs/PrefsFields';
import { useProgress } from '@/components/ProgressProvider';
import { Button } from '@/components/ui/Button';
import { cn } from '@/components/ui/cn';
import type { Prefs } from '@/lib/routines';

type Start = 'own' | 'template' | 'log';

// Where "How do you want to start?" leads.
export const START_DESTINATION: Record<Start, string> = { own: '/routine/new', template: '/explore', log: '/' };

const STARTS: { id: Start; icon: React.ReactNode; title: string; sub: string }[] = [
  { id: 'own', icon: <ClipboardList size={22} aria-hidden="true" />, title: 'Build my own routine', sub: 'Pick exercises, sets and weights for one day of training.' },
  { id: 'template', icon: <Compass size={22} aria-hidden="true" />, title: 'Pick a ready-made routine', sub: 'Start from a routine and change anything.' },
  { id: 'log', icon: <Zap size={22} aria-hidden="true" />, title: 'Just log as I go', sub: 'Start a custom workout whenever you train.' },
];

const STEPS = 4;

/** "Ketan Damle" as "Ketan". */
export function firstName(name: string | null | undefined): string {
  const first = (name ?? '').trim().split(/\s+/)[0] ?? '';
  return first;
}

/**
 * The first-run flow, four screens: units, what you train with, anything to avoid,
 * and how to start. Phone: full screen with Continue pinned at the bottom.
 * Desktop: a centered 560px dialog over the sky. Prefs are saved when it ends, and
 * when the avoid screen is skipped.
 */
export function OnboardingFlow() {
  const router = useRouter();
  const { data: auth } = useSession();
  const { prefs, savePrefs, showToast, routines } = useProgress();
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<Prefs>(prefs);
  const [start, setStart] = useState<Start>('own');
  const [busy, setBusy] = useState(false);
  const revisiting = useRef(prefs.onboarded).current; // opened again from Settings
  const headRef = useRef<HTMLHeadingElement>(null);
  const first = firstName(auth?.user?.name) || 'there';
  const last = step === STEPS - 1;

  // Each screen starts with its title, so a screen reader hears where it is.
  useEffect(() => {
    if (step > 0) headRef.current?.focus();
  }, [step]);

  async function save(next: Prefs): Promise<boolean> {
    setBusy(true);
    const error = await savePrefs({ ...next, onboarded: true });
    setBusy(false);
    if (error) {
      showToast(error);
      return false;
    }
    return true;
  }

  async function onContinue() {
    if (!last) {
      setStep(step + 1);
      return;
    }
    if (await save(draft)) router.replace(START_DESTINATION[start]);
  }

  async function onSkip() {
    const next = { ...draft, avoid: [], limits: [] };
    setDraft(next);
    if (await save(next)) setStep(step + 1);
  }

  function onBack() {
    if (step > 0) setStep(step - 1);
    else router.push('/settings');
  }

  const title = [`Hi ${first}. Set your units.`, 'What do you train with?', 'Anything to avoid?', 'How do you want to start?'][step];
  const sub = [
    "Four quick questions, then you're in.",
    'This sets the default filter in the exercise list. Nothing is locked.',
    'We hide these from suggestions. You can still add them yourself.',
    routines.length > 0 ? 'Your routines are already saved. Everything here can be changed later in Settings.' : 'Nothing is forced. Everything here can be changed later in Settings.',
  ][step];

  return (
    <div className="wt-ob-page">
      <div className="wt-ob-box" role="region" aria-label="Welcome">
        <div className="wt-ob-top">
          {step > 0 || revisiting ? (
            <button type="button" className="wt-iconbtn" aria-label={step > 0 ? 'Back' : 'Back to Settings'} onClick={onBack}>
              <ChevronLeft size={24} aria-hidden="true" />
            </button>
          ) : (
            <span className="wt-ob-spacer" />
          )}
          <div className="wt-segs" role="progressbar" aria-label="Setup progress" aria-valuemin={1} aria-valuemax={STEPS} aria-valuenow={step + 1} aria-valuetext={`Step ${step + 1} of ${STEPS}`}>
            {Array.from({ length: STEPS }, (_, i) => (
              <i key={i} className={cn(i <= step && 'on')} />
            ))}
          </div>
          {step === 2 ? (
            <button type="button" className="wt-textbtn wt-ob-skip" onClick={onSkip} disabled={busy}>
              Skip
            </button>
          ) : (
            <span className="wt-ob-step" aria-hidden="true">
              {step + 1} of {STEPS}
            </span>
          )}
        </div>

        <div className="wt-ob-body">
          <h1 className="wt-ob-h gt" ref={headRef} tabIndex={-1}>
            {title}
          </h1>
          <p className="wt-ob-p">{sub}</p>

          {step === 0 && <UnitsFields units={draft.units} onChange={(units) => setDraft({ ...draft, units })} />}
          {step === 1 && <EquipmentFields equipment={draft.equipment} unit={draft.units.weight} onChange={(equipment) => setDraft({ ...draft, equipment })} />}
          {step === 2 && <AvoidFields avoid={draft.avoid} limits={draft.limits} onChange={(next) => setDraft({ ...draft, ...next })} />}
          {step === 3 && (
            <div className="wt-opts" role="group" aria-label="How to start">
              {STARTS.map((s) => (
                <button key={s.id} type="button" className="wt-opt" aria-pressed={start === s.id} onClick={() => setStart(s.id)}>
                  <span className="ibox">{s.icon}</span>
                  <span>
                    <b>{s.title}</b>
                    <small>{s.sub}</small>
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="wt-ob-foot">
          <Button block size="lg" loading={busy} onClick={onContinue} disabled={busy}>
            {last ? "Let's go" : 'Continue'}
          </Button>
        </div>
      </div>
    </div>
  );
}
