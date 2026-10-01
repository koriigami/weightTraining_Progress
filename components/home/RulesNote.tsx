'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Info } from 'lucide-react';
import { useProgress } from '@/components/ProgressProvider';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

/**
 * A one-time note after the XP rules changed. "Got it" puts it away for good. When
 * both the v2 and the v3 note are waiting, only the v3 one shows and "Got it"
 * clears both.
 */
export function RulesNote() {
  const { state, dismissRulesNote, dismissRulesV3Note, showToast } = useProgress();
  const [busy, setBusy] = useState(false);
  const v2 = state.rulesV2Note === true;
  const v3 = state.rulesV3Note === true;
  if (!v2 && !v3) return null;

  async function gotIt() {
    setBusy(true);
    let error: string | null = null;
    if (v3) error = await dismissRulesV3Note();
    if (v2) error = (await dismissRulesNote()) ?? error;
    setBusy(false);
    if (error) showToast(error);
  }

  return (
    <Card as="section" className="wt-rnote" aria-label="XP rules changed">
      <Info size={20} aria-hidden="true" className="ic" />
      <div className="grow">
        {v3 ? (
          <b>XP was worked out again with the new daily bonus.</b>
        ) : (
          <>
            <b>XP was worked out again with the new rules.</b>
            <Link href="/rank" className="wt-textbtn sm">
              See the rules
            </Link>
          </>
        )}
      </div>
      <Button size="sm" variant="secondary" onClick={gotIt} loading={busy}>
        Got it
      </Button>
    </Card>
  );
}
