'use client';

import { useRef, useState } from 'react';
import { Dice5, Download, Share2, X } from 'lucide-react';
import { ShareCardSvg } from '@/components/share/ShareCardSvg';
import { Button } from '@/components/ui/Button';
import { Sheet, useSheet } from '@/components/ui/Sheet';
import type { ShareCard } from '@/lib/shareCard';
import { useDesktopLayout } from '@/lib/useMediaQuery';

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
 * rolls a new sky, and two buttons, Share image and Save image. The buttons are
 * not wired yet (making the picture is the next step), so both are disabled.
 * Phone: a bottom sheet with the buttons pinned below the picture. Desktop: a
 * dialog with the picture on the left and the title, a line of copy and the
 * buttons on the right.
 */
export function ShareSheet({ open, onClose, card }: { open: boolean; onClose: () => void; card: ShareCard }) {
  const desktop = useDesktopLayout();
  const svgRef = useRef<SVGSVGElement>(null); // the source of the picture, for exporting
  // Every opening starts on roll 0, so the same workout always opens on the same sky.
  const [roll, setRoll] = useState(0);
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) setRoll(0);
  }

  const actions = (
    <div className="wt-share-actions">
      <Button block disabled data-testid="share-image" icon={<Share2 size={18} aria-hidden="true" />}>
        Share image
      </Button>
      <Button block disabled variant="secondary" data-testid="save-image" icon={<Download size={18} aria-hidden="true" />}>
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
          </div>
          <button type="button" className="wt-share-dice" aria-label="New sky" onClick={() => setRoll((r) => r + 1)}>
            <Dice5 size={24} aria-hidden="true" />
          </button>
        </div>
        {desktop && (
          <div className="wt-share-side">
            <SideHead />
            <p>Share the picture to any app, or save it.</p>
            {actions}
          </div>
        )}
      </div>
    </Sheet>
  );
}
