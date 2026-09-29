'use client';

import { Copy, Share2 } from 'lucide-react';
import { RankShield } from '@/components/RankShield';
import { useProgress } from '@/components/ProgressProvider';
import { Button } from '@/components/ui/Button';
import { Hero } from '@/components/ui/Card';
import { Sheet } from '@/components/ui/Sheet';
import { RANK_TITLES } from '@/lib/progress';
import type { Rank } from '@/lib/progress';
import { shareText } from '@/lib/victory';
import { fmtVolume } from '@/lib/units';
import type { WeightUnit } from '@/lib/units';

export type ShareData = {
  title: string;
  dateLabel: string;
  sets: number;
  minutes: number | null;
  volumeKg: number;
  xp: number;
  rank: Rank;
  level: number;
  weight: WeightUnit;
};

// The Web Share API is there on phones and some desktop browsers.
function canShare(): boolean {
  return typeof navigator !== 'undefined' && typeof navigator.share === 'function';
}

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Older browsers and pages without clipboard access: a hidden box and the copy command.
    try {
      const box = document.createElement('textarea');
      box.value = text;
      box.setAttribute('readonly', '');
      box.style.position = 'fixed';
      box.style.opacity = '0';
      document.body.appendChild(box);
      box.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(box);
      return ok;
    } catch {
      return false;
    }
  }
}

/**
 * Share workout: a preview card (title, stats, rank shield, XP) and a Share
 * button. Share opens the phone's share sheet with the text when the browser can.
 * Without that, and as a second choice, the text can be copied. Making a picture
 * of the card is not built yet.
 */
export function ShareSheet({ open, onClose, data }: { open: boolean; onClose: () => void; data: ShareData }) {
  const { showToast } = useProgress();
  const text = shareText({ title: data.title, sets: data.sets, volumeKg: data.volumeKg, minutes: data.minutes, xp: data.xp, rankTitle: RANK_TITLES[data.rank] }, data.weight);
  const share = canShare();

  async function doShare() {
    try {
      await navigator.share({ title: data.title, text });
    } catch (e) {
      // Closing the share sheet is not an error.
      if (e instanceof DOMException && e.name === 'AbortError') return;
      showToast((await copyText(text)) ? 'Copied to your clipboard.' : "Couldn't share this workout.");
    }
  }

  async function doCopy() {
    showToast((await copyText(text)) ? 'Copied to your clipboard.' : "Couldn't copy. Select the text and copy it.");
  }

  return (
    <Sheet open={open} onClose={onClose} title="Share workout">
      <Hero className="wt-sharecard">
        <RankShield rank={data.rank} level={data.level} size={64} />
        <div className="gt" style={{ fontSize: 26, overflowWrap: 'anywhere' }}>
          {data.title}
        </div>
        <div className="wt-hero-t">{data.dateLabel}</div>
        <div className="sc-stats">
          <div className="wt-stat">
            <small style={{ color: 'var(--hero-sub)' }}>Sets</small>
            <b>{data.sets}</b>
          </div>
          {data.minutes !== null && (
            <div className="wt-stat">
              <small style={{ color: 'var(--hero-sub)' }}>Time</small>
              <b>{data.minutes} min</b>
            </div>
          )}
          {data.volumeKg > 0 && (
            <div className="wt-stat">
              <small style={{ color: 'var(--hero-sub)' }}>Volume</small>
              <b>{fmtVolume(data.volumeKg, data.weight)}</b>
            </div>
          )}
        </div>
        <div className="gt gold" style={{ fontSize: 24 }}>
          +{data.xp} XP
        </div>
        <small style={{ fontWeight: 800, color: 'var(--hero-sub)' }}>Home Workout · {RANK_TITLES[data.rank]}</small>
      </Hero>
      <div className="wt-rc-actions" style={{ marginTop: 14 }}>
        {share ? (
          <>
            <Button variant="secondary" icon={<Copy size={18} aria-hidden="true" />} onClick={() => void doCopy()}>
              Copy text
            </Button>
            <Button className="grow" icon={<Share2 size={18} aria-hidden="true" />} onClick={() => void doShare()}>
              Share
            </Button>
          </>
        ) : (
          <Button block icon={<Copy size={18} aria-hidden="true" />} onClick={() => void doCopy()}>
            Copy text
          </Button>
        )}
      </div>
    </Sheet>
  );
}
