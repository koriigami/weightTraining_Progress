'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Info } from 'lucide-react';
import { useProgress } from '@/components/ProgressProvider';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

/** A one-time note after the XP rules changed. "Got it" puts it away for good. */
export function RulesNote() {
  const { state, dismissRulesNote, showToast } = useProgress();
  const [busy, setBusy] = useState(false);
  if (state.rulesV2Note !== true) return null;

  async function gotIt() {
    setBusy(true);
    const error = await dismissRulesNote();
    setBusy(false);
    if (error) showToast(error);
  }

  return (
    <Card as="section" className="wt-rnote" aria-label="XP rules changed">
      <Info size={20} aria-hidden="true" className="ic" />
      <div className="grow">
        <b>XP was worked out again with the new rules.</b>
        <Link href="/rank" className="wt-textbtn sm">
          See the rules
        </Link>
      </div>
      <Button size="sm" variant="secondary" onClick={gotIt} loading={busy}>
        Got it
      </Button>
    </Card>
  );
}
