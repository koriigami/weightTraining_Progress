'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { BarChart3, ChevronRight, CircleHelp, Compass, Dumbbell, FileText, LogOut, Mail, Scale, ShieldCheck, Sparkles, Target, Volume2, Vibrate, X } from 'lucide-react';
import { useShell } from '@/components/nav/ShellContext';
import { AvoidFields, EquipmentFields, UnitsFields, WeeklyGoalFields } from '@/components/prefs/PrefsFields';
import { useProgress } from '@/components/ProgressProvider';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Card, SectionLabel } from '@/components/ui/Card';
import { PageHeader } from '@/components/ui/PageHeader';
import { Screen } from '@/components/ui/Screen';
import { Sheet, useSheet } from '@/components/ui/Sheet';
import { Switch } from '@/components/ui/Switch';
import * as feedback from '@/lib/feedback';
import { avoidSummary, equipmentSummary, unitsSummary, weeklyGoalSummary } from '@/lib/prefsSummary';
import type { Prefs } from '@/lib/routines';
import { CONTACT_EMAIL } from '@/lib/legal';

type Editor = 'units' | 'equipment' | 'avoid' | 'goal';

const TITLES: Record<Editor, string> = { units: 'Units', equipment: 'Equipment', avoid: 'Things to avoid', goal: 'Weekly goal' };
const SAVED: Record<Editor, string> = { units: 'Units saved', equipment: 'Equipment saved', avoid: 'Saved', goal: 'Weekly goal saved' };

function SaveButton({ busy, onSave }: { busy: boolean; onSave: (close: () => void) => void }) {
  const { close } = useSheet();
  return (
    <Button block loading={busy} onClick={() => onSave(close)}>
      Save
    </Button>
  );
}

/** The same editors onboarding uses, in a sheet on the phone and a centered dialog on desktop. */
function EditorSheet({ which, onClose }: { which: Editor | null; onClose: () => void }) {
  const { prefs, savePrefs, showToast } = useProgress();
  const [draft, setDraft] = useState<Prefs>(prefs);
  const [busy, setBusy] = useState(false);
  const [openedFor, setOpenedFor] = useState<Editor | null>(null);

  // Start from what is saved each time an editor opens.
  if (which !== openedFor) {
    setOpenedFor(which);
    if (which) setDraft(prefs);
  }

  async function save(close: () => void) {
    if (!which) return;
    setBusy(true);
    const error = await savePrefs(draft);
    setBusy(false);
    if (error) {
      showToast(error);
      return;
    }
    showToast(SAVED[which]);
    close();
  }

  return (
    <Sheet open={which !== null} onClose={onClose} title={which ? TITLES[which] : undefined} ariaLabel="Edit setting" footer={<SaveButton busy={busy} onSave={save} />}>
      <div className="wt-form-stack">
        {which === 'units' && <UnitsFields units={draft.units} onChange={(units) => setDraft({ ...draft, units })} />}
        {which === 'equipment' && <EquipmentFields equipment={draft.equipment} unit={draft.units.weight} onChange={(equipment) => setDraft({ ...draft, equipment })} />}
        {which === 'avoid' && <AvoidFields avoid={draft.avoid} limits={draft.limits} onChange={(next) => setDraft({ ...draft, ...next })} />}
        {which === 'goal' && <WeeklyGoalFields value={draft.weeklyGoal} onChange={(weeklyGoal) => setDraft({ ...draft, weeklyGoal })} />}
      </div>
    </Sheet>
  );
}

function Row({ icon, label, value, onClick }: { icon: React.ReactNode; label: string; value?: string; onClick: () => void }) {
  return (
    <button type="button" className="wt-setrow" onClick={onClick}>
      <span className="ibox">{icon}</span>
      <span>{label}</span>
      {value && <span className="val">{value}</span>}
      <ChevronRight size={18} className="chev" aria-hidden="true" />
    </button>
  );
}

function SwitchRow({ icon, label, checked, onChange }: { icon: React.ReactNode; label: string; checked: boolean; onChange: (next: boolean) => void }) {
  return (
    <div className="wt-setrow">
      <span className="ibox">{icon}</span>
      <span>{label}</span>
      <Switch label={label} checked={checked} onChange={onChange} />
    </div>
  );
}

export default function SettingsPage() {
  const router = useRouter();
  const { data: auth } = useSession();
  const { askSignOut } = useShell();
  const { prefs, progress, savePrefs, showToast } = useProgress();
  const [editor, setEditor] = useState<Editor | null>(null);
  const name = auth?.user?.name || auth?.user?.email || 'You';

  // wt:prefs on this device is what actually plays, so it is set at once, and the same
  // choice is saved to the account.
  async function toggleSound(next: boolean) {
    feedback.setSoundEnabled(next);
    if (next) feedback.warm();
    const error = await savePrefs({ ...prefs, sound: next });
    if (error) {
      feedback.setSoundEnabled(prefs.sound);
      showToast(error);
    }
  }
  async function toggleHaptic(next: boolean) {
    feedback.setVibrateEnabled(next);
    const error = await savePrefs({ ...prefs, haptic: next });
    if (error) {
      feedback.setVibrateEnabled(prefs.haptic);
      showToast(error);
    }
  }

  return (
    <Screen header={<PageHeader title="Settings" back="/profile" narrow />} narrow>
      <Card>
        <div className="wt-acct">
          <Avatar name={name} image={auth?.user?.image} rank={progress.rank} />
          <div>
            <b>{name}</b>
            {auth?.user?.email && <small>{auth.user.email}</small>}
            <small>Signed in with Google</small>
          </div>
        </div>
      </Card>

      <SectionLabel>Training</SectionLabel>
      <Card className="wt-setpanel">
        <Row icon={<Scale size={20} aria-hidden="true" />} label="Units" value={unitsSummary(prefs.units)} onClick={() => setEditor('units')} />
        <Row icon={<Dumbbell size={20} aria-hidden="true" />} label="Equipment" value={equipmentSummary(prefs)} onClick={() => setEditor('equipment')} />
        <Row icon={<X size={20} aria-hidden="true" />} label="Things to avoid" value={avoidSummary(prefs)} onClick={() => setEditor('avoid')} />
        <Row icon={<Target size={20} aria-hidden="true" />} label="Weekly goal" value={weeklyGoalSummary(prefs.weeklyGoal)} onClick={() => setEditor('goal')} />
      </Card>

      <SectionLabel>App</SectionLabel>
      <Card className="wt-setpanel">
        <SwitchRow icon={<Volume2 size={20} aria-hidden="true" />} label="Sounds" checked={prefs.sound} onChange={toggleSound} />
        <SwitchRow icon={<Vibrate size={20} aria-hidden="true" />} label="Haptics" checked={prefs.haptic} onChange={toggleHaptic} />
        <Row icon={<CircleHelp size={20} aria-hidden="true" />} label="How Levl works" onClick={() => router.push('/?guide=1')} />
        <Row icon={<Sparkles size={20} aria-hidden="true" />} label="What's new" onClick={() => router.push('/news')} />
        <Row icon={<Compass size={20} aria-hidden="true" />} label="Setup questions" onClick={() => router.push('/onboarding')} />
        {auth?.user?.isOwner && <Row icon={<BarChart3 size={20} aria-hidden="true" />} label="Insights" onClick={() => router.push('/insights')} />}
      </Card>

      <SectionLabel>About</SectionLabel>
      <Card className="wt-setpanel">
        <Row icon={<ShieldCheck size={20} aria-hidden="true" />} label="Privacy policy" onClick={() => router.push('/privacy')} />
        <Row icon={<FileText size={20} aria-hidden="true" />} label="Terms of use" onClick={() => router.push('/terms')} />
        <Row icon={<Mail size={20} aria-hidden="true" />} label="Contact us" value={CONTACT_EMAIL} onClick={() => (window.location.href = `mailto:${CONTACT_EMAIL}`)} />
      </Card>

      <div className="wt-signout">
        <Button variant="soft-destructive" block icon={<LogOut size={18} aria-hidden="true" />} onClick={askSignOut}>
          Sign out
        </Button>
      </div>

      <EditorSheet which={editor} onClose={() => setEditor(null)} />
    </Screen>
  );
}
