'use client';

import { useMemo, useRef, useState } from 'react';
import { Dice5, Download, Share2, X } from 'lucide-react';
import { useProgress } from '@/components/ProgressProvider';
import { ShareCardSvg } from '@/components/share/ShareCardSvg';
import { useShareImage } from '@/components/share/useShareImage';
import { Button } from '@/components/ui/Button';
import { Sheet, useSheet } from '@/components/ui/Sheet';
import type { ShareCard } from '@/lib/shareCard';
import { canShareFiles, SHARE_WITH_TEXT, saveImage } from '@/lib/shareImage';
import { useDesktopLayout } from '@/lib/useMediaQuery';

const FAILED_TOAST = "Couldn't make the picture. Try again.";

// The desktop dialog has no title row above the picture: the title sits in the
// right-hand column, so it brings its own close button.
function SideHead() {
  const { close } = useSheet();
  return (
    <div className="wt-sheet-title-row">
      <h2 className="wt-sheet-title gt">Share workout</h2>
      <button type="button" className="wt-iconbtn wt-sheet-close" aria-label="Close" onClick={close}>
        <X size={20} aria-hidden="true" />
      </button>
    </div>
  );
}

/**
 * Share workout: the share card as a live SVG preview, a dice on its corner that
 * rolls a new sky, and two buttons. The picture is made ahead of the tap (see
 * useShareImage) and, once made, shows as an <img> over the SVG, so what you see
 * is the exact file and a long press saves it. Share image (green) opens the
 * phone's share menu with the picture and shows only where the browser can share
 * files; Save image (gold) downloads it and always shows.
 * Phone: a bottom sheet with the buttons pinned below the picture. Desktop: a
 * dialog with the picture on the left and the title, a line of copy and the
 * buttons on the right.
 */
export function ShareSheet({ open, onClose, card }: { open: boolean; onClose: () => void; card: ShareCard }) {
  const { showToast } = useProgress();
  const desktop = useDesktopLayout();
  const svgRef = useRef<SVGSVGElement>(null); // the source of the picture, for exporting
  // Every opening starts on roll 0, so the same workout always opens on the same sky.
  const [roll, setRoll] = useState(0);
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) setRoll(0);
  }

  const { file, url, status } = useShareImage(svgRef, { open, roll, card });
  const shareable = useMemo(canShareFiles, []);
  const sharing = useRef(false); // a share menu is open: a second tap does nothing

  // Every share call starts inside the tap, with no await before it: iPhones refuse one that starts later.
  function onShare() {
    if (sharing.current) return;
    if (!file) {
      if (status === 'failed') fallbackShareText();
      return;
    }
    sharing.current = true;
    navigator
      .share(SHARE_WITH_TEXT ? { files: [file], text: card.text } : { files: [file] })
      .catch(onShareError)
      .finally(() => {
        sharing.current = false;
      });
  }

  function onShareError(e: unknown) {
    const name = (e as { name?: string } | null)?.name; // a DOMException: AbortError, NotAllowedError...
    if (name === 'AbortError') return; // the share menu was closed
    showToast(name === 'NotAllowedError' ? 'Tap Share again.' : "Couldn't share the picture. Try Save image.");
  }

  // The picture could not be made: say so, and share the text line where the browser can.
  function fallbackShareText() {
    showToast(FAILED_TOAST);
    if (typeof navigator.share !== 'function') return;
    sharing.current = true;
    navigator
      .share({ text: card.text })
      .catch(() => undefined)
      .finally(() => {
        sharing.current = false;
      });
  }

  function onSave() {
    if (!file) {
      showToast(FAILED_TOAST);
      return;
    }
    saveImage(file);
    showToast('Image saved.');
  }

  const actions = (
    <div className="wt-share-actions">
      {shareable && (
        <Button block loading={status === 'rendering'} data-testid="share-image" icon={<Share2 size={18} aria-hidden="true" />} onClick={onShare}>
          Share image
        </Button>
      )}
      <Button
        block
        disabled={status === 'rendering'}
        variant="secondary"
        data-testid="save-image"
        icon={<Download size={18} aria-hidden="true" />}
        onClick={onSave}
      >
        Save image
      </Button>
    </div>
  );

  return (
    <Sheet
      open={open}
      onClose={onClose}
      className="wt-share-sheet"
      title={desktop ? undefined : 'Share workout'}
      ariaLabel="Share workout"
      footer={desktop ? undefined : actions}
    >
      <div className="wt-share-grid">
        <div className="wt-share-preview">
          <div className="wt-share-card">
            <ShareCardSvg card={card} roll={roll} ref={svgRef} />
            {url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img className="wt-share-img" src={url} alt={`${card.fullTitle.trim() || 'Workout'} workout card picture`} />
            )}
          </div>
          <button type="button" className="wt-share-dice" aria-label="New sky" onClick={() => setRoll((r) => r + 1)}>
            <Dice5 size={24} aria-hidden="true" />
          </button>
        </div>
        {desktop && (
          <div className="wt-share-side">
            <SideHead />
            <p>{shareable ? 'Share the picture to any app, or save it.' : 'Save the picture, then post it anywhere.'}</p>
            {actions}
          </div>
        )}
      </div>
    </Sheet>
  );
}
